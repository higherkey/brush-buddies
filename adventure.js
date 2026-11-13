/* Adventure Mode: turns a brushing session into a short trip.
   app.js stays in charge of the timer; this file only listens to its
   bb:render, bb:reset and bb:finish events and draws on top. */
(() => {
  "use strict";

  const DATA = window.BB_ADVENTURE_DATA;
  if (!DATA) return;

  const KEY = "brushBuddiesAdventureV1";
  const BUGS_PER_STAGE = 3;
  const HOME_CHANCE = 0.25;
  const RARE_CHANCE = 0.1;
  const RARE = Object.freeze({ id: "rare-star", emoji: "🌟", name: "Shooting Star" });
  const ALL = [...DATA.shared, ...Object.values(DATA.homes)];
  const BUDDY_HOME = Object.fromEntries(Object.entries(DATA.homes).map(([k, d]) => [d.id, k]));

  const $ = id => document.getElementById(id);
  const pick = list => list[Math.floor(Math.random() * list.length)];

  function emptyStore() {
    return { v: 1, stickers: {}, sessions: 0, last: "" };
  }

  // Journal progress lives under its own key so "Reset settings" never wipes it.
  function loadStore() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "{}");
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
  let trip = null; // { dest, started, bugKey, spokenStage, restKey, awarded }
  let treasureTimer = null;
  let pendingTreasure = null; // shown when Adventure Mode is next on screen

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(store));
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
    if (backdrop.dataset.dest !== trip.dest.id) {
      backdrop.dataset.dest = trip.dest.id;
      backdrop.replaceChildren(...trip.dest.backdrop.map((e, i) => {
        const span = document.createElement("span");
        span.className = "adv-deco deco-" + (i + 1);
        span.textContent = e;
        return span;
      }));
    }

    // A fresh set of sugar bugs for each stage; they fade as the stage timer runs down.
    const bugs = $("adv-bugs");
    const key = trip.dest.id + ":" + s.stageIndex;
    if (trip.bugKey !== key) {
      trip.bugKey = key;
      bugs.replaceChildren(...Array.from({ length: BUGS_PER_STAGE }, (_, i) => {
        const bug = document.createElement("span");
        bug.className = "adv-bug bug-" + (i + 1);
        bug.textContent = "🦠";
        return bug;
      }));
    }
    const ratio = s.phase === "done" ? 1 : s.stageSeconds ? 1 - s.stageLeft / s.stageSeconds : 0;
    const cleaned = trip.started ? Math.min(BUGS_PER_STAGE, Math.ceil(ratio * BUGS_PER_STAGE - 1e-9)) : 0;
    let newlyCleaned = 0;
    bugs.querySelectorAll(".adv-bug").forEach((bug, i) => {
      const gone = i < cleaned;
      if (gone && !bug.classList.contains("cleaned")) newlyCleaned++;
      bug.classList.toggle("cleaned", gone);
    });
    if (newlyCleaned && s.phase === "running") api()?.tone(1046, 0.09, "triangle", 0.03);

    const stop = stopFor(s.stageIndex);
    $("adv-place").textContent =
      s.phase === "done" ? trip.dest.emoji + " " + trip.dest.name + " · 🎉" :
      scene.classList.contains("resting") ? "🍎 " + trip.dest.name :
      trip.dest.emoji + " " + trip.dest.name + " · " + stop.icon + (s.storyText ? " " + stop.name : "");
  }

  // Speak once per stage and once per break, keyed on what was already said,
  // so pausing, resuming or the camera helper never repeats a line.
  function narrate(s) {
    const say = s.storyText ? api()?.say : null;
    if (s.phase === "break") {
      if (trip.restKey === s.stageIndex) return;
      trip.restKey = s.stageIndex;
      if (say) say(fill(pick(DATA.restLines), s));
    } else if (s.phase === "running" && trip.spokenStage !== s.stageIndex) {
      const first = trip.spokenStage === null && s.sessionElapsed === 0;
      trip.spokenStage = s.stageIndex;
      if (!say) return;
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
      if (!trip || (!trip.started && trip.buddy !== s.buddy)) trip = { dest: chooseDestination(s.buddy), buddy: s.buddy, started: false, bugKey: "", spokenStage: null, restKey: null, awarded: false };
      const starting = !trip.started && sessionStarted(s);
      if (starting) {
        trip.started = true;
        $("adv-scene").classList.remove("departing");
        void $("adv-scene").offsetWidth; // restart the arrival animation
        $("adv-scene").classList.add("departing");
      }
      renderScene(s);
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

  function award(dest) {
    store = loadStore(); // pick up stickers saved by another open tab first
    const missing = dest.stickers.filter(st => !store.stickers[st.id]);
    const sticker = Math.random() < RARE_CHANCE ? RARE : missing.length ? missing[0] : pick(dest.stickers);
    store.stickers[sticker.id] = (store.stickers[sticker.id] || 0) + 1;
    store.sessions += 1;
    store.last = dest.id;
    persist();
    return { sticker, count: store.stickers[sticker.id] };
  }

  // One sticker per session: jumping back to a stage after finishing does not earn another.
  async function onFinish(e) {
    const s = e.detail;
    if (s.experience !== "adventure" || !trip || trip.awarded) return;
    const finishedTrip = trip;
    finishedTrip.awarded = true;
    const found = navigator.locks
      ? await navigator.locks.request(KEY, () => award(finishedTrip.dest))
      : award(finishedTrip.dest);
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
    const buddy = api()?.snapshot().buddy;
    // Shared places, then homes the child has visited or the current buddy's home.
    const pages = ALL.filter(d => !BUDDY_HOME[d.id] || BUDDY_HOME[d.id] === buddy || d.stickers.some(st => store.stickers[st.id]));
    const list = pages.map(d => journalPage(d.emoji + " " + d.name, d.stickers));
    if (store.stickers[RARE.id]) list.push(journalPage("✨ Lucky finds", [RARE]));
    $("journal-list").replaceChildren(...list);

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
