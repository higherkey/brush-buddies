/* Adventure Mode: turns a brushing session into a short trip.
   app.js stays in charge of the timer; this file only listens to its
   bb:render, bb:reset and bb:finish events and draws on top. */
(() => {
  "use strict";

  const DATA = window.BB_ADVENTURE_DATA;
  const COLLECTION = window.BB_BUDDIES;
  if (!DATA) return;

  const KEY = "brushBuddiesAdventureV1";
  const storageKey = (scope = window.BB_PROFILE_SCOPE) => KEY + (scope ? ':' + scope : '');
  const HOME_CHANCE = 0.25;
  const RARE_CHANCE = 0.1;
  const RARE = Object.freeze({ id: "rare-star", emoji: "🌟", name: "Shooting Star" });
  const destinations = new Map();
  [...DATA.shared, ...Object.values(DATA.homes), ...(COLLECTION ? COLLECTION.catalog.map(a => COLLECTION.home(a.id)) : [])].forEach(d => {
    const existing = destinations.get(d.id);
    destinations.set(d.id, existing ? { ...d, stickers: [...existing.stickers, ...d.stickers] } : d);
  });
  const ALL = [...destinations.values()];

  const $ = id => document.getElementById(id);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function emptyStore() {
    return { v: 1, stickers: {}, sessions: 0, last: "" };
  }

  // Journal progress lives under its own key so "Reset settings" never wipes it.
  function loadStore(scope = window.BB_PROFILE_SCOPE) {
    try {
      const v = JSON.parse(localStorage.getItem(storageKey(scope)) || "{}");
      const out = emptyStore();
      if (v && typeof v.stickers === "object" && v.stickers) {
        for (const [id, n] of Object.entries(v.stickers)) {
          if (Number.isInteger(n) && n > 0) out.stickers[id] = n;
        }
      }
      if (Number.isInteger(v?.sessions) && v.sessions > 0) out.sessions = v.sessions;
      if (typeof v?.last === "string") out.last = v.last;
      return out;
    } catch {
      return emptyStore();
    }
  }

  let store = loadStore();
  let trip = null; // { dest, started, spokenStage, restKey, awarded }
  let treasureTimer = null;
  let pendingTreasure = null; // shown when Adventure Mode is next on screen
  const rewardedSessions = new Set();

  function persist(scope = window.BB_PROFILE_SCOPE) {
    try {
      localStorage.setItem(storageKey(scope), JSON.stringify(store));
    } catch {}
  }

  function api() {
    return window.BrushBuddies;
  }

  function firstName(s) {
    return String(s.buddyName || "Buddy").split(" ")[0];
  }

  function fill(line, s) {
    return line.replace(/\{buddy\}/g, firstName(s)).replace(/\{place\}/g, trip.dest.name);
  }

  function chooseDestination(buddy) {
    if (COLLECTION) {
      const animal = COLLECTION.get(buddy);
      const home = { ...COLLECTION.home(buddy), habitat: animal.habitat };
      if (COLLECTION.homeUnlocked(buddy)) return home;
      const routes = { cottage: 'Garden Brook', meadow: 'Clover Creek', eucalyptus: 'Gumtree Gully', forest: 'Woodland Creek', bamboo: 'Bamboo Brook', polar: 'Ice Floe Crossing', savanna: 'Savanna Stream', wetland: 'Lily Lagoon', jungle: 'Rainforest River', rainbow: 'Rainbow Run', cave: 'Moonlit Creek', desert: 'Oasis Trail', mountain: 'Alpine Stream', ocean: 'Coral Crossing', shore: 'Tidepool Trail' };
      const index = COLLECTION.catalog.findIndex(a => a.id === buddy);
      return { ...home, stickers: DATA.shared[index % DATA.shared.length].stickers, id: "trail-" + buddy, name: routes[animal.habitat] };
    }
    const home = DATA.homes[buddy];
    if (home && home.id !== store.last && Math.random() < HOME_CHANCE) return home;
    const pool = DATA.shared.filter(d => d.id !== store.last);
    return pick(pool.length ? pool : DATA.shared);
  }

  function stopFor(index) {
    const stops = trip.dest.stops;
    return stops[index % stops.length];
  }

  function sessionStarted(s) {
    return s.phase === "running" || s.phase === "break" || s.sessionElapsed > 0;
  }

  function renderScene(s) {
    const scene = $("adv-scene");
    scene.dataset.scene = trip.dest.scene;
    scene.classList.toggle("resting", s.phase === "break" || (s.phase === "paused" && s.pausedFrom === "break"));

    const backdrop = $("adv-backdrop");
    if (window.BB_SCENE) window.BB_SCENE.render(s, trip.dest);
    else if (backdrop.dataset.dest !== trip.dest.id) {
      backdrop.dataset.dest = trip.dest.id;
      backdrop.replaceChildren(...trip.dest.backdrop.map((e, i) => {
        const span = document.createElement("span");
        span.className = "adv-deco deco-" + (i + 1);
        span.textContent = e;
        return span;
      }));
    }

    const stop = stopFor(s.stageIndex);
    $("adv-place").textContent = trip.dest.name + (s.storyText ? ' · ' + stop.name : '');
  }

  // Speak once per stage and once per break, keyed on what was already said,
  // so pausing, resuming or the camera helper never repeats a line.
  function narrate(s) {
    const say = s.storyText ? api()?.say : null;
    if (!say) return;
    if (s.phase === "break") {
      if (trip.restKey === s.stageIndex) return;
      trip.restKey = s.stageIndex;
      say(fill(pick(DATA.restLines), s));
    } else if (s.phase === "running" && trip.spokenStage !== s.stageIndex) {
      const first = trip.spokenStage === null && s.sessionElapsed === 0;
      trip.spokenStage = s.stageIndex;
      const stop = stopFor(s.stageIndex);
      const lead = first ? fill(pick(DATA.departLines), s) : stop.icon + " " + stop.name + "!";
      say(lead + (s.stage?.tip ? " " + s.stage.tip : ""));
    }
  }

  function onRender(e) {
    const s = e.detail;
    const on = s.experience === "adventure";
    $("adv-scene").hidden = !on;
    $("adv-bar").hidden = !on;
    if (on) {
      if (!trip || trip.buddy !== s.buddy) trip = { dest: chooseDestination(s.buddy), buddy: s.buddy, started: false, spokenStage: null, restKey: null, awarded: false };
      const starting = !trip.started && sessionStarted(s);
      if (starting) {
        trip.started = true;
        $("adv-scene").classList.remove("departing");
        void $("adv-scene").offsetWidth; // restart the arrival animation
        $("adv-scene").classList.add("departing");
      }
      renderScene(s);
      if (COLLECTION) {
        const visits = COLLECTION.load().visits[s.buddy] || 0;
        $("buddy-name").textContent = s.buddyName;
        const visiting = s.buddy === COLLECTION.daily();
        $('visitor-label').textContent = visiting ? "Today's visitor" : 'Your adventure buddy';
        $("buddy-status").textContent = COLLECTION.homeUnlocked(s.buddy)
          ? firstName(s) + " and their home are unlocked. Choose them any time."
          : Math.min(visits, 3) + '/3 trips · Complete 3 to keep ' + firstName(s) + ' and unlock their home.' + (visiting ? ' A new visitor arrives tomorrow.' : '');
      }
      document.querySelectorAll(".zone").forEach((button, i) => {
        if (!button.dataset.baseLabel) button.dataset.baseLabel = button.getAttribute("aria-label");
        button.setAttribute("aria-label", button.dataset.baseLabel + (s.storyText ? " Stop: " + stopFor(i).name + "." : ""));
      });
      narrate(s);
      if (pendingTreasure && !treasureTimer) showTreasure(pendingTreasure);
    } else {
      document.querySelectorAll(".zone[data-base-label]").forEach(button => button.setAttribute("aria-label", button.dataset.baseLabel));
    }
  }

  function onReset() {
    clearTimeout(treasureTimer);
    treasureTimer = null;
    pendingTreasure = null;
    trip = null;
  }

  function award(dest, s) {
    store = loadStore(s.profileScope); // Persist to the owner at completion, even if a profile switch queued first.
    const missing = dest.stickers.filter(st => !store.stickers[st.id]);
    const sticker = Math.random() < RARE_CHANCE ? RARE : missing.length ? missing[0] : pick(dest.stickers);
    store.stickers[sticker.id] = (store.stickers[sticker.id] || 0) + 1;
    store.sessions += 1;
    store.last = dest.id;
    persist(s.profileScope);
    if (COLLECTION) {
      COLLECTION.completeInScope(s.sessionId, s.buddy, s.profileScope);
    }
    document.dispatchEvent(new CustomEvent('bb:reward', { detail: { session_id: s.sessionId, buddy_id: s.buddy, sticker_id: sticker.id, profile_scope: s.profileScope } }));
    return { sticker, count: store.stickers[sticker.id] };
  }

  // One sticker per session: jumping back to a stage after finishing does not earn another.
  async function onFinish(e) {
    const s = e.detail;
    if (s.experience !== "adventure" || !trip || trip.awarded || rewardedSessions.has(s.sessionId)) return;
    rewardedSessions.add(s.sessionId);
    const finishedTrip = trip;
    finishedTrip.awarded = true;
    const found = navigator.locks
      ? await navigator.locks.request(KEY, () => award(finishedTrip.dest, s))
      : award(finishedTrip.dest, s);
    if ($("journal-dialog").open) openJournal();
    if (trip !== finishedTrip) return;
    pendingTreasure = found;
    clearTimeout(treasureTimer);
    treasureTimer = setTimeout(() => {
      treasureTimer = null;
      showTreasure(pendingTreasure);
    }, s.calm ? 300 : 1400);
  }

  function showTreasure(found) {
    const s = api()?.snapshot();
    if (!found || !s || s.experience !== "adventure") return; // waits until Adventure Mode is back
    pendingTreasure = null;
    const { sticker, count } = found;
    $("treasure-dialog").classList.toggle("animate", !s.calm);
    $("treasure-emoji").textContent = sticker.emoji;
    $("treasure-name").textContent = sticker.name + (count > 1 ? " ×" + count : "");
    if (COLLECTION?.homeUnlocked(s.buddy)) $("treasure-name").textContent += " · " + s.buddyName + " and their home are unlocked!";
    $("treasure-dialog").classList.toggle("rare", sticker.id === RARE.id);
    api()?.say(firstName(s) + " found a " + sticker.name + "!");
    api()?.tone(1318, 0.18, "triangle", 0.04);
    if (!$("treasure-dialog").open) $("treasure-dialog").showModal();
  }

  function stickerSlot(st) {
    const li = document.createElement("li");
    const n = store.stickers[st.id] || 0;
    li.className = "sticker" + (n ? " found" : "");
    li.textContent = n ? st.emoji : "?";
    li.setAttribute("aria-label", n ? st.name + (n > 1 ? ", found " + n + " times" : "") : "Not found yet");
    if (n > 1) {
      const badge = document.createElement("span");
      badge.className = "sticker-count";
      badge.setAttribute("aria-hidden", "true");
      badge.textContent = "×" + n;
      li.appendChild(badge);
    }
    return li;
  }

  function journalPage(title, stickers) {
    const page = document.createElement("section");
    page.className = "journal-page";
    const h = document.createElement("h3");
    h.textContent = title;
    const row = document.createElement("ul");
    row.className = "sticker-row";
    row.replaceChildren(...stickers.map(stickerSlot));
    page.append(h, row);
    return page;
  }

  function openJournal() {
    store = loadStore();
    if (COLLECTION) COLLECTION.load();
    const buddy = api()?.snapshot().buddy;
    // Shared places, then homes the child has visited or the current buddy's home.
    const pages = ALL.filter(d => !d.id.startsWith("home-") || d.id === "home-" + buddy || d.stickers.some(st => store.stickers[st.id]));
    const list = pages.map(d => journalPage(d.emoji + " " + d.name, d.stickers));
    if (store.stickers[RARE.id]) list.push(journalPage("✨ Lucky finds", [RARE]));
    $("journal-list").replaceChildren(...list);
    if (COLLECTION) {
      const collection = document.createElement("section");
      collection.className = "animal-collection";
      const heading = document.createElement("h3");
      heading.textContent = "Meet your buddies · " + COLLECTION.available().length + " of " + COLLECTION.catalog.length + " unlocked";
      const help = document.createElement("p");
      help.textContent = "Complete 3 expeditions with a visitor to fill their entry, unlock their home, and choose them any time.";
      collection.append(heading, help);
      const grid = document.createElement("div");
      grid.className = "collection-grid";
      COLLECTION.catalog.forEach(a => {
        const button = document.createElement("button");
        button.type = "button";
        const visits = COLLECTION.load().visits[a.id] || 0;
        button.disabled = !COLLECTION.unlocked(a.id);
        button.textContent = a.name + " · " + (button.disabled ? Math.min(3, visits) + "/3 visits" : COLLECTION.homeUnlocked(a.id) ? "Home unlocked" : "Starter buddy");
        const art = document.createElement('img');
        art.src = 'animals/' + a.id + '.svg';
        art.alt = '';
        art.width = 36;
        art.height = 36;
        button.prepend(art);
        button.addEventListener("click", () => {
          $("journal-dialog").close();
          document.dispatchEvent(new CustomEvent("bb:choose", { detail: a.id }));
        });
        grid.append(button);
      });
      collection.append(grid);
      $("journal-list").prepend(collection);
    }

    const total = ALL.reduce((n, d) => n + d.stickers.length, 0);
    const found = ALL.reduce((n, d) => n + d.stickers.filter(st => store.stickers[st.id]).length, 0);
    $("journal-summary").textContent =
      found + " of " + total + " stickers found · " + store.sessions + (store.sessions === 1 ? " trip" : " trips");
    if (!$("journal-dialog").open) $("journal-dialog").showModal();
  }

  document.addEventListener("bb:render", onRender);
  document.addEventListener("bb:reset", onReset);
  document.addEventListener("bb:finish", onFinish);

  // Defer scripts run in order, so the markup exists by now.
  $("journal-open").addEventListener("click", openJournal);
  $("journal-close").addEventListener("click", () => $("journal-dialog").close());
  $("journal-dialog").addEventListener("close", () => $("journal-open").focus());
  $("treasure-dialog").addEventListener("close", () => {
    if (!$("journal-dialog").open) $("start-button").focus();
  });
  $("treasure-close").addEventListener("click", () => $("treasure-dialog").close());
  $("treasure-journal").addEventListener("click", () => {
    $("treasure-dialog").close();
    openJournal();
  });
  ["journal-dialog", "treasure-dialog"].forEach(id => {
    $(id).addEventListener("click", e => {
      if (e.target === $(id)) $(id).close();
    });
  });
  $("adv-scene").addEventListener("animationend", () => $("adv-scene").classList.remove("departing"));
})();
