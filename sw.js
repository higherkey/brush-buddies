"use strict";

const CACHE_NAME = "brush-buddies-shell-v16";
const APP_SHELL = [
  "./home.css?v=0.8.3",
  "./brand.css?v=0.9.0",
  "./move-home.js?v=0.9.1",
  "./fonts/fredoka-latin-wght.woff2",
  "./fonts/nunito-latin-wght.woff2",
  "./progress-tools.js?v=0.8.3",
  "./progress-tools.css?v=0.8.3",
  "./",
  "./index.html",
  "./animals/cat.svg",
  "./animals/bunny.svg",
  "./animals/koala.svg",
  "./animals/dog.svg",
  "./animals/fox.svg",
  "./animals/bear.svg",
  "./animals/panda.svg",
  "./animals/penguin.svg",
  "./animals/owl.svg",
  "./animals/lion.svg",
  "./animals/frog.svg",
  "./animals/tiger.svg",
  "./animals/elephant.svg",
  "./animals/unicorn.svg",
  "./animals/mouse.svg",
  "./animals/hamster.svg",
  "./animals/wolf.svg",
  "./animals/raccoon.svg",
  "./animals/deer.svg",
  "./animals/moose.svg",
  "./animals/squirrel.svg",
  "./animals/hedgehog.svg",
  "./animals/badger.svg",
  "./animals/skunk.svg",
  "./animals/beaver.svg",
  "./animals/otter.svg",
  "./animals/bat.svg",
  "./animals/sloth.svg",
  "./animals/monkey.svg",
  "./animals/gorilla.svg",
  "./animals/orangutan.svg",
  "./animals/leopard.svg",
  "./animals/zebra.svg",
  "./animals/giraffe.svg",
  "./animals/rhinoceros.svg",
  "./animals/hippopotamus.svg",
  "./animals/camel.svg",
  "./animals/kangaroo.svg",
  "./animals/horse.svg",
  "./animals/donkey.svg",
  "./animals/cow.svg",
  "./animals/pig.svg",
  "./animals/sheep.svg",
  "./animals/goat.svg",
  "./animals/llama.svg",
  "./animals/bison.svg",
  "./animals/boar.svg",
  "./animals/duck.svg",
  "./animals/goose.svg",
  "./animals/swan.svg",
  "./animals/flamingo.svg",
  "./animals/parrot.svg",
  "./animals/peacock.svg",
  "./animals/eagle.svg",
  "./animals/turkey.svg",
  "./animals/chicken.svg",
  "./animals/dove.svg",
  "./animals/seal.svg",
  "./animals/dolphin.svg",
  "./animals/whale.svg",
  "./animals/shark.svg",
  "./animals/octopus.svg",
  "./animals/squid.svg",
  "./animals/crab.svg",
  "./animals/lobster.svg",
  "./animals/shrimp.svg",
  "./animals/jellyfish.svg",
  "./animals/turtle.svg",
  "./animals/crocodile.svg",
  "./animals/snake.svg",
  "./animals/lizard.svg",
  "./animals/butterfly.svg",
  "./animals/bee.svg",
  "./animals/ladybug.svg",
  "./animals/snail.svg",
  "./adventure-habitats.js?v=0.11.0",
  "./adventure-habitats.css?v=0.11.0",
  "./account-progress.js?v=0.8.0",
  "./neon-config.js?v=0.8.0",
  "./neon-api.js?v=0.8.3",
  "./accounts.js?v=0.9.0",
  "./buddies.js?v=0.8.3",
  "./adventure-avatar.js?v=0.11.0",
  "./adventure-sections.js?v=0.11.0",
  "./adventure-scene.js?v=0.11.0",
  "./adventure-scene.css?v=0.11.0",
  "./expedition.css?v=0.8.2",
  "./collection-backup.js?v=0.9.0",
  "./styles.css?v=0.8.2",
  "./adventure-data.js?v=0.6.0",
  "./adventure.js?v=0.8.3",
  "./app.js?v=0.9.0",
  "./camera-helper.js?v=0.8.0",
  "./camera-worker.js?v=0.8.0",
  "./camera-motion.js",
  "./vendor/mediapipe/vision_bundle.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-180.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png"
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
