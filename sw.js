"use strict";

const CACHE_NAME = "brush-buddies-shell-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=0.7.0",
  "./adventure-data.js?v=0.6.0",
  "./adventure.js?v=0.6.0",
  "./app.js?v=0.7.0",
  "./camera-helper.js?v=0.7.0",
  "./camera-worker.js?v=0.7.0",
  "./camera-motion.js",
  "./vendor/mediapipe/vision_bundle.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("brush-buddies-shell-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-origin GET requests. Camera streams and all external
  // requests are deliberately left untouched.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request, { cache: "no-cache" })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          // Keep large model/WASM writes alive after their response is delivered.
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {}));
        }
        return response;
      })
      .catch(async () => {
        return (await caches.match(request)) ||
          (request.mode === "navigate" ? await caches.match("./index.html") : Response.error());
      })
  );
});
