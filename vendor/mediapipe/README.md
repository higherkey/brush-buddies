# Bundled camera dependencies

- Runtime: `@mediapipe/tasks-vision` **0.10.32**, from https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-0.10.32.tgz
- Package integrity (SHA-512 SRI) is recorded in `package-source.json` and was verified before use. `package-metadata.json` is the upstream package metadata.
- `vision_bundle.js` is the unmodified upstream `vision_bundle.cjs`, renamed for static hosting. The classic worker supplies a CommonJS `exports` object. Source maps are not shipped.
- Both upstream WASM variants and their loaders are unmodified in `wasm/`.
- Face model: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
- Model SHA-256: `64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff`
- Apache-2.0 project license: `LICENSE`, from https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE

These files are served by the app's own origin. Camera data never goes to these upstream URLs. Keep dependency upgrades explicit and rerun the real browser tests after changing the runtime, WASM, or model.

The test-only portrait at `tests/fixtures/portrait.jpg` comes from https://storage.googleapis.com/mediapipe-assets/portrait.jpg. It is used for face inference verification, not training.
