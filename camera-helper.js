/* Camera transport only. Vision and pixels stay in camera-worker.js. */
(function () {
  "use strict";
  class BrushCamera {
    constructor(onResult, onError) {
      this.onResult = onResult;
      this.onError = onError;
      this.options = {};
      this.generation = 0;
      this.revision = 0;
    }

    configure(options) {
      this.revision++;
      this.options = { ...options };
      this.worker?.postMessage({ type: "reset" });
    }

    async start(video) {
      this.stop();
      const generation = this.generation;
      this.video = video;
      this.worker = new Worker("./camera-worker.js?v=0.7.0");
      try {
        await new Promise((resolve, reject) => {
          this.rejectStart = reject;
          this.initTimeout = setTimeout(() => reject(new Error("Camera helper took too long to load.")), 30000);
          this.worker.onmessage = ({ data }) => {
            if (generation !== this.generation) return;
            if (data.type === "ready") {
              clearTimeout(this.initTimeout);
              this.rejectStart = null;
              resolve();
            } else if (data.type === "result") {
              clearTimeout(this.frameTimeout);
              this.busy = false;
              if (this.frameRevision !== this.revision) return;
              this.lastResult = performance.now();
              const latency = Math.round(performance.now() - data.now);
              this.onResult(latency > 750
                ? { ...data, active: false, state: "uncertain", reason: "stale-frame", latency }
                : { ...data, latency });
            } else if (data.type === "error") {
              const error = new Error(data.message || "Camera helper could not read this frame.");
              if (this.rejectStart) reject(error);
              else this.fail(error);
            }
          };
          this.worker.onerror = () => {
            if (generation !== this.generation) return;
            const error = new Error("Camera helper could not load. Reload the app and try again.");
            if (this.rejectStart) reject(error);
            else this.fail(error);
          };
          this.worker.postMessage({ type: "init" });
        });
      } catch (error) {
        if (generation === this.generation) this.stop();
        throw error;
      }
      if (generation !== this.generation) return;
      this.lastResult = performance.now();
      this.watchdog = setInterval(() => {
        if (performance.now() - this.lastResult > 1500) {
          this.onResult({ state: "uncertain", active: false, score: 0, faceFound: false,
            calibration: "none", reason: "Waiting for fresh video. Check the camera or test clip." });
        }
      }, 500);
      this.loop(generation);
    }

    async loop(generation) {
      if (generation !== this.generation) return;
      this.raf = requestAnimationFrame(() => this.loop(generation));
      const now = performance.now();
      if (this.busy || now - (this.lastSample || 0) < 100 ||
          this.video.readyState < 2 || this.video.currentTime === this.lastVideoTime) return;
      this.busy = true;
      this.lastSample = now;
      this.lastVideoTime = this.video.currentTime;
      let bitmap;
      try {
        bitmap = await createImageBitmap(this.video);
        if (generation !== this.generation) { bitmap.close(); return; }
        this.frameRevision = this.revision;
        this.frameTimeout = setTimeout(() => this.fail(new Error("Camera tracking stopped responding. Please try again.")), 8000);
        this.worker.postMessage({ type: "frame", bitmap, now, options: this.options }, [bitmap]);
      } catch (error) {
        bitmap?.close();
        if (generation === this.generation) this.fail(error);
      }
    }

    calibrate() { this.revision++; this.worker?.postMessage({ type: "calibrate", now: performance.now() }); }
    reset() { this.revision++; this.worker?.postMessage({ type: "reset" }); }
    fail(error) { if (!this.worker) return; this.stop(); this.onError(error); }

    stop() {
      this.generation++;
      if (this.rejectStart) this.rejectStart(new Error("Camera startup canceled."));
      this.rejectStart = null;
      clearTimeout(this.initTimeout);
      clearTimeout(this.frameTimeout);
      clearInterval(this.watchdog);
      cancelAnimationFrame(this.raf);
      this.worker?.terminate();
      this.worker = null;
      this.busy = false;
      this.lastVideoTime = -1;
      this.lastSample = 0;
    }
  }
  window.BrushCamera = BrushCamera;
})();
