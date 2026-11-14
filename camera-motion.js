(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BrushMotion = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function Detector() { this.reset(); }
  Detector.prototype.reset = function () {
    this.frames = [];
    this.motionSince = null;
    this.noise = 0;
    this.threshold = null;
    this.calibration = 'none';
    this.phaseElapsed = 0;
    this.samples = [];
  };
  Detector.prototype.result = function (state, score, active) {
    return { active: !!active, score: Math.max(0, Math.min(1, score || 0)), state: state,
      calibration: this.calibration, noise: this.noise };
  };
  Detector.prototype.calibrate = function () {
    this.reset();
    this.calibration = 'quiet';
    return this.result('calibrating', 0, false);
  };
  Detector.prototype.clearHistory = function () {
    this.frames = [];
    this.motionSince = null;
    // A disconnected calibration phase must be observed again in full.
    this.phaseElapsed = 0;
    this.samples = [];
  };
  function percentile(values, fraction) {
    const sorted = values.slice().sort(function (a, b) { return a - b; });
    return sorted[Math.floor((sorted.length - 1) * fraction)] || 0;
  }
  function difference(current, previous, width, height) {
    const sums = new Float64Array(48);
    const counts = new Uint32Array(48);
    let covariance = 0;
    let variance = 0;
    for (let index = 0; index < current.length; index++) {
      covariance += current[index] * previous[index];
      variance += previous[index] * previous[index];
    }
    // Remove uniform camera exposure gain as well as the offset removed below.
    const gain = variance > current.length ? Math.max(0.5, Math.min(2, covariance / variance)) : 1;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const tile = Math.floor(y * 6 / height) * 8 + Math.floor(x * 8 / width);
      sums[tile] += Math.abs(current[index] - previous[index] * gain);
      counts[tile]++;
    }
    const ranked = Array.from(sums, function (sum, tile) { return sum / counts[tile] / 255; })
      .sort(function (a, b) { return b - a; });
    // A small moving patch matters even when most of the mouth crop is still.
    return ranked[0] * 0.7 + ranked[1] * 0.3;
  }
  Detector.prototype.update = function (gray, width, height, now, options) {
    options = options || {};
    const calibrating = this.calibration === 'quiet' || this.calibration === 'brushing';
    if (options.valid === false || !(gray instanceof Uint8Array) ||
        !Number.isInteger(width) || !Number.isInteger(height) || width < 8 || height < 8 ||
        gray.length !== width * height || !Number.isFinite(now)) {
      this.clearHistory();
      return this.result(calibrating ? 'calibrating' : 'uncertain', 0, false);
    }
    let previous = this.frames[this.frames.length - 1];
    if (previous && (now <= previous.time || now - previous.time > 500 ||
        previous.width !== width || previous.height !== height)) {
      this.clearHistory();
      previous = null;
    }
    let mean = 0;
    for (let index = 0; index < gray.length; index++) mean += gray[index];
    mean /= gray.length;
    const normalized = new Float32Array(gray.length);
    for (let index = 0; index < gray.length; index++) normalized[index] = gray[index] - mean;
    let shortFrame = null;
    let longFrame = null;
    for (const frame of this.frames) {
      const age = now - frame.time;
      if (age >= 60 && age <= 180 && (!shortFrame || Math.abs(age - 100) < Math.abs(now - shortFrame.time - 100))) shortFrame = frame;
      if (age >= 200 && age <= 420 && (!longFrame || Math.abs(age - 300) < Math.abs(now - longFrame.time - 300))) longFrame = frame;
    }
    const score = Math.max(shortFrame ? difference(normalized, shortFrame.pixels, width, height) : 0,
      longFrame ? difference(normalized, longFrame.pixels, width, height) : 0);
    this.frames = this.frames.filter(function (frame) { return now - frame.time <= 420; });
    this.frames.push({ time: now, pixels: normalized, width: width, height: height });
    if (calibrating) {
      if (previous && (shortFrame || longFrame)) {
        this.phaseElapsed += Math.min(250, now - previous.time);
        this.samples.push(score);
      }
      const quiet = this.calibration === 'quiet';
      if (this.phaseElapsed >= (quiet ? 2000 : 3000) && this.samples.length >= (quiet ? 12 : 18)) {
        if (quiet) {
          this.noise = percentile(this.samples, 0.9);
          this.calibration = 'brushing';
        } else {
          const brush = percentile(this.samples, 0.5);
          if (brush >= Math.max(0.006, this.noise * 2.5) && brush - this.noise >= 0.004) {
            this.threshold = Math.max(0.004, this.noise + (brush - this.noise) * 0.35);
            this.calibration = 'complete';
          } else this.calibration = 'failed';
        }
        this.clearHistory();
      }
      // Even the frame completing calibration cannot earn timer credit.
      return this.result('calibrating', score, false);
    }
    if (!shortFrame && !longFrame) {
      this.motionSince = null;
      return this.result('uncertain', 0, false);
    }
    const factor = options.sensitivity === 'high' ? 0.55 : options.sensitivity === 'low' ? 1.7 : 1;
    const threshold = Math.max(this.threshold || 0.012, this.noise * 2.5) * factor;
    if (score >= threshold) {
      if (this.motionSince === null) this.motionSince = now;
    } else this.motionSince = null;
    const active = this.motionSince !== null && now - this.motionSince >= 300;
    return this.result(active ? 'brushing' : score >= threshold * 0.7 ? 'uncertain' : 'idle', score, active);
  };
  return { Detector: Detector };
}));
