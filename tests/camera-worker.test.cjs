const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const workerSource = fs.readFileSync(path.join(root, 'camera-worker.js'), 'utf8');
const motionSource = fs.readFileSync(path.join(root, 'camera-motion.js'), 'utf8');

function landmarks(angle = 0) {
  const points = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5 }));
  const place = (i, x, y) => {
    points[i] = { x: (320 + x * Math.cos(angle) - y * Math.sin(angle)) / 640,
      y: (240 + x * Math.sin(angle) + y * Math.cos(angle)) / 480 };
  };
  place(33, -80, -60); place(263, 80, -60); place(168, 0, -40);
  place(13, 0, 45); place(14, 0, 55);
  return points;
}

function harness({ importError = false, initError = false, canvasError = false } = {}) {
  const messages = [], timestamps = [], bitmaps = [];
  let points = landmarks(), inferenceError = false, noisy = false, frameIndex = 0;
  let modelClosed = 0, createOptions, wasmPath, drawMatrix;
  let matrix = [1, 0, 0, 1, 0, 0];
  const multiply = n => {
    const [a,b,c,d,e,f] = matrix, [g,h,i,j,k,l] = n;
    matrix = [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];
  };
  const canvasContext = {
    setTransform(...n) { matrix = n; }, clearRect() {},
    translate(x,y) { multiply([1,0,0,1,x,y]); },
    scale(x,y) { multiply([x,0,0,y,0,0]); },
    rotate(a) { multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]); },
    drawImage() { drawMatrix = [...matrix]; },
    getImageData() {
      const data = new Uint8ClampedArray(128 * 96 * 4);
      frameIndex++;
      for (let i = 0; i < 128 * 96; i++) {
        const value = noisy && i % 128 < 24 && Math.floor(i / 128) < 24 ? (frameIndex % 2 ? 220 : 20) : 80;
        data[i*4] = data[i*4+1] = data[i*4+2] = value;
        data[i*4+3] = 255;
      }
      return { data };
    }
  };
  const sandbox = {
    URL, Uint8Array, console, location: { href: 'https://example.test/app/camera-worker.js' },
    OffscreenCanvas: class { getContext() { return canvasError ? null : canvasContext; } },
    postMessage(message) { messages.push(structuredClone(message)); }
  };
  sandbox.self = sandbox;
  const context = vm.createContext(sandbox);
  sandbox.importScripts = (...urls) => {
    assert.deepEqual(urls, ['./vendor/mediapipe/vision_bundle.js', './camera-motion.js']);
    if (importError) throw new Error('Import unavailable');
    sandbox.exports = {
      FilesetResolver: { async forVisionTasks(url) { wasmPath = url; return {}; } },
      FaceLandmarker: { async createFromOptions(_, options) {
        createOptions = options;
        if (initError) throw new Error('Model unavailable');
        return {
          close() { modelClosed++; },
          detectForVideo(_, now) {
            timestamps.push(now);
            if (inferenceError) throw new Error('Inference unavailable');
            return { faceLandmarks: points ? [points] : [] };
          }
        };
      } }
    };
    // The detector itself is real: only MediaPipe and canvas I/O are mocked.
    vm.runInContext(motionSource, context);
  };
  vm.runInContext(workerSource, context);
  return {
    messages, timestamps, bitmaps,
    get options() { return createOptions; }, get wasmPath() { return wasmPath; },
    get modelClosed() { return modelClosed; }, get drawMatrix() { return drawMatrix; },
    set points(value) { points = value; }, get points() { return points; },
    set inferenceError(value) { inferenceError = value; }, set noisy(value) { noisy = value; },
    async send(message) {
      const before = messages.length;
      sandbox.onmessage({ data: message });
      await vm.runInContext('queue', context);
      assert.equal(messages.length, before + 1, 'one response per request');
      return messages.at(-1);
    },
    async frame(now, options, dimensions = {}) {
      const bitmap = { width: 640, height: 480, closed: 0, ...dimensions, close() { this.closed++; } };
      bitmaps.push(bitmap);
      const result = await this.send({ type: 'frame', bitmap, now, options });
      assert.equal(bitmap.closed, 1, 'transferred bitmap closed exactly once');
      return result;
    }
  };
}

test('initializes the pinned classic-worker MediaPipe API with local assets', async () => {
  const h = harness();
  assert.equal((await h.send({ type: 'init' })).type, 'ready');
  assert.equal(h.wasmPath, 'https://example.test/app/vendor/mediapipe/wasm');
  assert.equal(h.options.baseOptions.modelAssetPath, 'https://example.test/app/vendor/mediapipe/face_landmarker.task');
  assert.equal(h.options.baseOptions.delegate, 'CPU');
  assert.equal(h.options.runningMode, 'VIDEO');
  assert.equal(h.options.numFaces, 1);
  assert.equal(h.options.outputFaceBlendshapes, false);
});

test('rotated corners describe the exact sampled crop and lips cannot drag it', async () => {
  const h = harness(); h.points = landmarks(0.24);
  const first = await h.frame(0);
  assert.equal(first.faceFound, true);
  assert.equal(first.corners.length, 4);
  const [a,b,c,d,e,f] = h.drawMatrix;
  const expected = [[0,0],[128,0],[128,96],[0,96]];
  first.corners.forEach((p,i) => {
    assert(Math.abs(a*p.x+c*p.y+e-expected[i][0]) < 1e-8);
    assert(Math.abs(b*p.x+d*p.y+f-expected[i][1]) < 1e-8);
  });
  assert(Math.abs(Math.min(...first.corners.map(p=>p.x))-first.region.x)<1e-8);
  assert(Math.abs(Math.max(...first.corners.map(p=>p.y))-first.region.y-first.region.height)<1e-8);
  h.points[13].y += 0.1; h.points[14].y += 0.1;
  assert.deepEqual((await h.frame(100)).corners, first.corners);
});

test('manual target clamps to source bounds without requiring a face', async () => {
  const h = harness(); h.points = null;
  for (const [targetX,targetY,targetSize] of [[0,0,0],[1,1,1],[-2,4,8]]) {
    const r = await h.frame(h.bitmaps.length*100, { target:'manual', targetX,targetY,targetSize,sensitivity:'high' });
    assert.equal(r.faceFound,false); assert.equal(r.reason,'manual-target');
    assert(r.region.width>0);
    for (const p of r.corners) { assert(p.x>=-1e-8 && p.x<=640+1e-8); assert(p.y>=-1e-8 && p.y<=480+1e-8); }
  }
});

test('no-face response is uncertain and contains no crop or active credit', async () => {
  const h = harness(); await h.frame(0); h.points = null;
  const r = await h.frame(100);
  assert.equal(r.state,'uncertain'); assert.equal(r.active,false); assert.equal(r.faceFound,false);
  assert.equal(r.region,null); assert.deepEqual(r.corners,[]);
});

test('timestamps reject stale frames and stay increasing across reset', async () => {
  const h = harness(); await h.frame(100);
  assert.equal((await h.frame(100)).type,'error');
  assert.equal((await h.send({type:'reset'})).type,'reset');
  assert.equal((await h.frame(0)).type,'result');
  assert(h.timestamps[1]>h.timestamps[0]);
  assert.equal((await h.frame(NaN)).type,'error');
});

test('tracking jump discards detector history and reacquires mouth offset', async () => {
  const h = harness(); await h.frame(0); assert.equal((await h.frame(100)).state,'idle');
  for (const p of h.points) p.x += .15;
  const r = await h.frame(200);
  assert.equal(r.state,'uncertain'); assert.equal(r.active,false);
  assert.equal((await h.send({type:'reset'})).type,'reset');
  assert.equal((await h.frame(300)).state,'uncertain');
});

for (const interrupt of ['gap','invalid','missing-face','jump']) {
  test(`calibration restarts quiet baseline after ${interrupt}`, async () => {
    const h = harness(); h.noisy = true;
    await h.send({type:'calibrate',now:0});
    let r;
    for(let now=0;now<=2100;now+=100) r = await h.frame(now);
    assert.equal(r.calibration,'brushing'); assert(r.noise>0);
    if(interrupt==='gap') r=await h.frame(2800);
    if(interrupt==='invalid') { assert.equal((await h.frame(NaN)).type,'error'); r=await h.frame(2200); }
    if(interrupt==='missing-face') { h.points=null; r=await h.frame(2200); }
    if(interrupt==='jump') { for(const p of h.points)p.x+=.15; r=await h.frame(2200); }
    assert.equal(r.calibration,'quiet'); assert.equal(r.noise,0); assert.equal(r.active,false);
  });
}

test('initialization and inference errors close all frame bitmaps and allow recovery', async () => {
  for (const options of [{importError:true},{initError:true},{canvasError:true}]) {
    const h = harness(options);
    assert.equal((await h.send({type:'init'})).type,'error');
    assert.equal((await h.frame(0)).type,'error');
    if(options.canvasError)assert.equal(h.modelClosed,2);
  }
  const h = harness(); h.inferenceError=true;
  assert.equal((await h.frame(0)).type,'error');
  h.inferenceError=false;
  assert.equal((await h.frame(100)).type,'result');
  assert.equal((await h.frame(200, {target:'invalid'})).type,'error');
  assert.equal((await h.frame(300,{}, {width:0})).type,'error');
  assert.equal((await h.send({type:'unknown'})).type,'error');
});
