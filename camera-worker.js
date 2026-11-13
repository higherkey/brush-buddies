/* Camera pixels and landmarks remain in this worker; only motion scores and ROI bounds leave it. */
'use strict';

let landmarker;
let detector;
let initialization;
let importFailure;
try {
  // The pinned npm bundle is CommonJS; expose its exports to a classic worker.
  self.exports = {};
  importScripts('./vendor/mediapipe/vision_bundle.js', './camera-motion.js');
  self.vision = self.exports;
} catch (error) {
  importFailure = error;
}

const WIDTH = 128;
const HEIGHT = 96;
let canvas;
let context;
let tracked = null;
let lastVideoTime = -1;
let lastFrameTime = -1;
let previousOptions = '';
let calibrationInProgress = false;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

async function initialize() {
  if (landmarker) return;
  if (!initialization) {
    initialization = (async () => {
      if (importFailure) throw importFailure;
      // Official API: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js
      const files = await self.vision.FilesetResolver.forVisionTasks(new URL('./vendor/mediapipe/wasm', self.location.href).href);
      const model = await self.vision.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: new URL('./vendor/mediapipe/face_landmarker.task', self.location.href).href, delegate: 'CPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
      try {
        canvas = new OffscreenCanvas(WIDTH, HEIGHT);
        context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Camera crop canvas is unavailable.');
        detector = new self.BrushMotion.Detector();
        landmarker = model;
      } catch (error) {
        model.close();
        throw error;
      }
    })().catch(error => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

function resetDetector() {
  if (!detector) return;
  detector.reset();
  if (calibrationInProgress) detector.calibrate();
}

function resetTracking() {
  tracked = null;
  lastFrameTime = -1;
  previousOptions = '';
  resetDetector();
  // MediaPipe VIDEO timestamps must remain increasing even after a detector reset.
}

function readOptions(input = {}) {
  const number = (key, fallback) => {
    if (input[key] === undefined) return fallback;
    if (!Number.isFinite(input[key])) throw new Error(`Invalid camera option: ${key}.`);
    return clamp(input[key], 0, 1);
  };
  if (input.target !== undefined && !['auto', 'manual'].includes(input.target)) throw new Error('Invalid camera target.');
  if (input.region !== undefined && !['center', 'wide'].includes(input.region)) throw new Error('Invalid camera region.');
  if (input.sensitivity !== undefined && !['low', 'medium', 'high'].includes(input.sensitivity)) throw new Error('Invalid camera sensitivity.');
  return {
    sensitivity: input.sensitivity || 'medium',
    brushType: input.brushType,
    target: input.target || 'auto',
    region: input.region || 'center',
    targetX: number('targetX', 0.5),
    targetY: number('targetY', 0.6),
    targetSize: number('targetSize', 0.35)
  };
}

function facePose(points, width, height) {
  const indices = [33, 263, 168, 13, 14];
  if (!points || !indices.every(i => points[i] && Number.isFinite(points[i].x) && Number.isFinite(points[i].y))) return null;
  const point = i => ({ x: points[i].x * width, y: points[i].y * height });
  const left = point(33), right = point(263), nose = point(168);
  const dx = right.x - left.x, dy = right.y - left.y;
  const scale = Math.hypot(dx, dy);
  if (scale < 12) return null;
  return {
    x: (left.x + right.x) * 0.4 + nose.x * 0.2,
    y: (left.y + right.y) * 0.4 + nose.y * 0.2,
    scale,
    angle: Math.atan2(dy, dx),
    mouthX: (points[13].x + points[14].x) * width / 2,
    mouthY: (points[13].y + points[14].y) * height / 2,
    sourceWidth: width,
    sourceHeight: height
  };
}

function autoCrop(pose, options, now) {
  const discontinuity = !tracked || tracked.sourceWidth !== pose.sourceWidth || tracked.sourceHeight !== pose.sourceHeight ||
    now - lastFrameTime > 500 || Math.hypot(pose.x - tracked.x, pose.y - tracked.y) > tracked.scale * 0.25 ||
    Math.abs(Math.log(pose.scale / tracked.scale)) > 0.2 || Math.abs(angleDifference(pose.angle, tracked.angle)) > 0.3;
  if (discontinuity) {
    resetDetector();
    const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle);
    const dx = pose.mouthX - pose.x, dy = pose.mouthY - pose.y;
    tracked = { ...pose, mouthOffsetX: (dx * cos + dy * sin) / pose.scale, mouthOffsetY: (-dx * sin + dy * cos) / pose.scale };
  } else {
    // Follow upper-face pose while suppressing small landmark jitter. Lip landmarks
    // are never used again during this track, so opening the mouth cannot drag the ROI.
    const alpha = 0.65;
    tracked.x += alpha * (pose.x - tracked.x);
    tracked.y += alpha * (pose.y - tracked.y);
    tracked.scale += alpha * (pose.scale - tracked.scale);
    tracked.angle += alpha * angleDifference(pose.angle, tracked.angle);
  }
  const cos = Math.cos(tracked.angle), sin = Math.sin(tracked.angle);
  const width = tracked.scale * (options.region === 'wide' ? 2.35 : 1.8);
  return {
    x: tracked.x + tracked.scale * (tracked.mouthOffsetX * cos - tracked.mouthOffsetY * sin),
    y: tracked.y + tracked.scale * (tracked.mouthOffsetX * sin + tracked.mouthOffsetY * cos),
    width, height: width * HEIGHT / WIDTH, angle: tracked.angle
  };
}

function fitCrop(crop, width, height) {
  const cos = Math.abs(Math.cos(crop.angle)), sin = Math.abs(Math.sin(crop.angle));
  const boundWidth = crop.width * cos + crop.height * sin;
  const boundHeight = crop.width * sin + crop.height * cos;
  const fit = Math.min(1, width / boundWidth, height / boundHeight);
  crop.width *= fit;
  crop.height *= fit;
  const bw = boundWidth * fit, bh = boundHeight * fit;
  crop.x = clamp(crop.x, bw / 2, width - bw / 2);
  crop.y = clamp(crop.y, bh / 2, height - bh / 2);
  return { x: crop.x - bw / 2, y: crop.y - bh / 2, width: bw, height: bh };
}

function cropCorners(crop) {
  const cos = Math.cos(crop.angle), sin = Math.sin(crop.angle);
  // Clockwise from the sampled image's top-left, in source pixel coordinates.
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({
    x: crop.x + x * crop.width * cos / 2 - y * crop.height * sin / 2,
    y: crop.y + x * crop.width * sin / 2 + y * crop.height * cos / 2
  }));
}

function frame(message) {
  const { bitmap, now } = message;
  if (!bitmap || !Number.isFinite(bitmap.width) || !Number.isFinite(bitmap.height) || bitmap.width < 1 || bitmap.height < 1) throw new Error('Invalid camera frame.');
  if (!Number.isFinite(now) || now < 0) throw new Error('Invalid camera frame time.');
  if (now <= lastFrameTime) throw new Error('Camera frame time must increase.');
  const options = readOptions(message.options);
  const key = JSON.stringify(options);
  if (previousOptions && previousOptions !== key) resetTracking();
  previousOptions = key;
  const videoTime = Math.max(now, lastVideoTime + 0.001);
  const faces = landmarker.detectForVideo(bitmap, videoTime);
  lastVideoTime = videoTime;
  const pose = facePose(faces.faceLandmarks[0], bitmap.width, bitmap.height);
  let crop;
  if (options.target === 'manual') {
    const width = Math.max(8, options.targetSize * Math.min(bitmap.width, bitmap.height));
    crop = { x: options.targetX * bitmap.width, y: options.targetY * bitmap.height, width, height: width * HEIGHT / WIDTH, angle: 0 };
    tracked = null;
    if (lastFrameTime >= 0 && now - lastFrameTime > 500) resetDetector();
  } else if (pose) {
    crop = autoCrop(pose, options, now);
  } else {
    resetTracking();
    lastFrameTime = now;
    const result = detector.update(null, WIDTH, HEIGHT, now, { valid: false });
    return { type: 'result', now, ...result, active: false, state: 'uncertain', faceFound: false, region: null, corners: [], reason: 'no-face' };
  }
  const region = fitCrop(crop, bitmap.width, bitmap.height);
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, WIDTH, HEIGHT);
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.scale(WIDTH / crop.width, HEIGHT / crop.height);
  context.rotate(-crop.angle);
  context.translate(-crop.x, -crop.y);
  context.drawImage(bitmap, 0, 0);
  context.setTransform(1, 0, 0, 1, 0, 0);
  const pixels = context.getImageData(0, 0, WIDTH, HEIGHT).data;
  const gray = new Uint8Array(WIDTH * HEIGHT);
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4;
    gray[i] = (77 * pixels[p] + 150 * pixels[p + 1] + 29 * pixels[p + 2]) >> 8;
  }
  const result = detector.update(gray, WIDTH, HEIGHT, now, options);
  if (result.calibration === 'complete' || result.calibration === 'failed') calibrationInProgress = false;
  lastFrameTime = now;
  return {
    type: 'result', now, active: result.active, score: result.score,
    state: result.state, calibration: result.calibration, noise: result.noise,
    faceFound: Boolean(pose), region, corners: cropCorners(crop), reason: options.target === 'manual' ? 'manual-target' : 'face-tracked'
  };
}

// Serialize asynchronous initialization and controls with inference. Every transferred
// bitmap is closed even when initialization, validation, or inference fails.
let queue = Promise.resolve();
self.onmessage = event => {
  const message = event.data || {};
  queue = queue.then(async () => {
    try {
      if (!['init', 'frame', 'calibrate', 'reset'].includes(message.type)) throw new Error('Unknown camera worker message.');
      await initialize();
      if (message.type === 'frame') self.postMessage(frame(message));
      else if (message.type === 'calibrate') {
        if (!Number.isFinite(message.now) || message.now < 0) throw new Error('Invalid calibration time.');
        detector.calibrate(message.now);
        calibrationInProgress = true;
        self.postMessage({ type: 'calibrating', now: message.now });
      } else {
        if (message.type === 'reset') {
          calibrationInProgress = false;
          resetTracking();
        }
        self.postMessage({ type: message.type === 'reset' ? 'reset' : 'ready' });
      }
    } catch (error) {
      resetTracking();
      self.postMessage({ type: 'error', now: message.now, message: error instanceof Error ? error.message : 'Camera processing failed.' });
    } finally {
      if (message.bitmap && typeof message.bitmap.close === 'function') message.bitmap.close();
    }
  });
};
