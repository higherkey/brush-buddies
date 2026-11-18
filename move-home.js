/* Toothpaws now lives at eight1fivedesign.com/toothpaws.
   A visit to the old GitHub Pages address hands this device's guest progress
   (settings, buddies, journal) to the new address once, then forwards there.
   Browser storage belongs to one website, so without this the move would start
   children over. Signed-in profiles sync from the account service instead.
   Loaded first and synchronously, before any script reads storage. */
(() => {
  "use strict";
  const HOME = "https://eight1fivedesign.com/toothpaws/";
  const KEYS = ["brushBuddiesSettingsV2", "brushBuddiesAdventureV1", "brushBuddiesCollectionV1", "brushBuddiesCollectionV1Daily"];
  try {
    if (location.hostname === "higherkey.github.io") {
      const data = {};
      for (const key of KEYS) {
        const value = localStorage.getItem(key);
        if (value !== null) data[key] = value;
      }
      const payload = JSON.stringify(data);
      location.replace(HOME + (payload.length > 2 && payload.length < 200000 ? "#move=" + encodeURIComponent(payload) : ""));
      return;
    }
    const match = /^#move=(.+)$/.exec(location.hash);
    if (!match) return;
    // Never overwrite progress that already exists at the new address.
    const data = JSON.parse(decodeURIComponent(match[1]));
    for (const key of KEYS) {
      if (typeof data[key] === "string" && localStorage.getItem(key) === null) localStorage.setItem(key, data[key]);
    }
    history.replaceState(null, "", location.pathname + location.search);
  } catch (_) {
    /* Storage blocked or a damaged link: the app still starts normally. */
  }
})();
