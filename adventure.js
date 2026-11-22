/* Adventure Mode: turns a brushing session into a short trip.
   app.js stays in charge of the timer; this file only listens to its
   bb:render, bb:reset and bb:finish events and draws on top. */
(() => {
  "use strict";

  const DATA = window.BB_ADVENTURE_DATA;
  const COLLECTION = window.BB_BUDDIES;
  const STORIES = window.BB_STORYBOOK;
  if (!DATA) return;

  const KEY = "brushBuddiesAdventureV1";
  const storageKey = (scope = window.BB_PROFILE_SCOPE) => KEY + (scope ? ':' + scope : '');
  const HOME_CHANCE = 0.25;
  const RARE_CHANCE = 0.1;
  const RARE = Object.freeze({ id: "rare-star", emoji: "🌟", name: "Shooting Star" });
  const destinations = new Map();
  [...DATA.shared, ...Object.values(DATA.homes), ...(COLLECTION ? COLLECTION.catalog.map(a => COLLECTION.home(a.id)) : [])].forEach(d => {
    const existing = destinations.get(d.id);
    destinations.set(d.id, existing ? { ...existing, stickers: [...existing.stickers, ...d.stickers] } : d); // Preserve named home metadata; keep previously earned legacy stickers.
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
  let lastAwardStory = null;
  let readerTicket = 0;
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
    return COLLECTION?.nickname(s.buddy) || String(s.buddyName || "Buddy").split(" ")[0];
  }

  function fill(line, s) {
    return line.replace(/\{buddy\}/g, firstName(s)).replace(/\{place\}/g, trip.dest.name);
  }

  function chooseDestination(buddy) {
    if (COLLECTION) {
      if (STORIES) return STORIES.destinationFor(buddy, COLLECTION.load().visits[buddy] || 0);
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
          : visits + '/3 trips · Complete 3 to ' + (COLLECTION.unlocked(s.buddy) ? 'unlock ' + firstName(s) + '’s home.' : 'keep ' + firstName(s) + ' and unlock their home.') + (visiting ? ' A new visitor arrives tomorrow.' : '');
      }
      document.querySelectorAll(".zone").forEach((button, i) => {
        if (!button.dataset.baseLabel) button.dataset.baseLabel = button.getAttribute("aria-label");
        button.setAttribute("aria-label", button.dataset.baseLabel + (s.storyText ? " Stop: " + stopFor(i).name + "." : ""));
      });
      narrate(s);
      updateJournalBadge();
      if (pendingTreasure && !treasureTimer) showTreasure(pendingTreasure);
    } else {
      renderSimpleProgress();
      document.querySelectorAll(".zone[data-base-label]").forEach(button => button.setAttribute("aria-label", button.dataset.baseLabel));
    }
  }

  function onReset() {
    clearTimeout(treasureTimer);
    treasureTimer = null;
    pendingTreasure = null;
    lastAwardStory = null;
    trip = null;
  }

  function renderSimpleProgress() {
    const next = COLLECTION?.nextSimpleBuddy();
    $("buddy-status").textContent = next
      ? "Next buddy: " + next.name + " · " + COLLECTION.simpleBrushes(next.id) + "/" + COLLECTION.simpleGoal + " brushes"
      : COLLECTION ? "All buddies unlocked!" : "";
  }

  function saveReward(s, sessionId, buddyId, stickerId) {
    document.dispatchEvent(new CustomEvent('bb:reward', { detail: { session_id: sessionId, buddy_id: buddyId, sticker_id: stickerId, profile_scope: s.profileScope } }));
  }

  function award(dest, s) {
    store = loadStore(s.profileScope); // Profile scope captured before an asynchronous finish.
    // Reward the same item named in the newly unlocked story, then retain the usual sticker pool.
    const progress = COLLECTION?.completeInScope(s.sessionId, s.buddy, s.profileScope);
    const newStory = progress && STORIES?.unlockedAt(s.buddy, progress.visits)
      .find(chapter => chapter.destinationId === dest.id) || null;
    const storySticker = newStory && dest.stickers.find(st => st.name === newStory.goal);
    const missing = dest.stickers.filter(st => !store.stickers[st.id]);
    const sticker = storySticker || (Math.random() < RARE_CHANCE ? RARE : missing.length ? missing[0] : pick(dest.stickers));
    store.stickers[sticker.id] = (store.stickers[sticker.id] || 0) + 1;
    store.sessions += 1;
    store.last = dest.id;
    persist(s.profileScope);
    saveReward(s, s.sessionId, s.buddy, sticker.id);
    return { sticker, count: store.stickers[sticker.id], newStory, buddyId: s.buddy, profileScope: s.profileScope };
  }

  function awardSimple(s) {
    const reward = COLLECTION?.completeSimpleInScope(s.sessionId, s.profileScope);
    if (reward) saveReward(s, reward.creditId, reward.buddy.id, 'simple-brush');
    return reward;
  }

  // Redoing a stage or switching experiences after finishing can't earn a second reward.
  async function onFinish(e) {
    const s = e.detail;
    const adventure = s.experience === "adventure";
    if (rewardedSessions.has(s.sessionId) || (adventure && (!trip || trip.awarded))) return;
    rewardedSessions.add(s.sessionId);
    const finishedTrip = trip;
    if (adventure) finishedTrip.awarded = true;
    const reward = () => adventure ? award(finishedTrip.dest, s) : awardSimple(s);
    const found = navigator.locks
      ? await navigator.locks.request(KEY, reward)
      : reward();
    if (!adventure) {
      const current = api()?.snapshot();
      if (current?.experience !== "simple" || current.profileScope !== s.profileScope) return;
      renderSimpleProgress();
      if (found?.unlocked && current.sessionId === s.sessionId && current.phase === "done") {
        api()?.say("You unlocked " + found.buddy.name + "! Choose your new buddy in Buddy settings.");
      }
      return;
    }
    updateJournalBadge();
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
    lastAwardStory = found.newStory && found.profileScope === (window.BB_PROFILE_SCOPE || "") ? found.newStory : null;
    $("treasure-story").hidden = !lastAwardStory;
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

  function stickerTotals() {
    const total = ALL.reduce((n, d) => n + d.stickers.length, 0);
    const found = ALL.reduce((n, d) => n + d.stickers.filter(st => store.stickers[st.id]).length, 0);
    return { found, total };
  }

  // The Journal button shows how many stickers have been found, so it reads as a collection worth opening.
  function updateJournalBadge() {
    const { found } = stickerTotals();
    $("journal-badge").textContent = found ? String(found) : "";
    $("journal-open").setAttribute("aria-label", "Journal, " + found + (found === 1 ? " sticker" : " stickers") + " found");
  }

  function showJournalTab(tab) {
    const buddies = tab === "buddies", stories = tab === "stories" && !!STORIES;
    $("journal-tab-buddies").setAttribute("aria-selected", String(buddies));
    $("journal-tab-stickers").setAttribute("aria-selected", String(!buddies && !stories));
    $("journal-tab-stories").setAttribute("aria-selected", String(stories));
    $("journal-buddies").hidden = !buddies;
    $("journal-list").hidden = buddies || stories;
    $("journal-stories").hidden = !stories;
    $("journal-summary").hidden = buddies || stories;
  }
  function storyParagraphs(text) {
    const parent = $("story-reader-body");
    parent.replaceChildren(...text.split(/\n\s*\n/).filter(Boolean).map(part => {
      const p = document.createElement("p");
      p.textContent = part.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\n/g, " ");
      return p;
    }));
  }
  async function openStory(chapter) {
    const visits = COLLECTION.load().visits[chapter.buddyId] || 0;
    if (visits < chapter.unlockAfter) return;
    const scope = window.BB_PROFILE_SCOPE || "";
    const ticket = ++readerTicket;
    const dialog = $("story-reader-dialog");
    if ($("journal-dialog").open) $("journal-dialog").close();
    $("story-reader-title").textContent = chapter.title;
    $("story-reader-route").textContent = chapter.destination + " · " + chapter.stops.join(" → ") + " · " + chapter.goal;
    storyParagraphs(chapter.text || "Opening this chapter…");
    if (!dialog.open) dialog.showModal();
    if (!chapter.path) return;
    try {
      const response = await fetch(chapter.path, { cache: "no-cache" });
      if (!response.ok) throw new Error("Story unavailable");
      const markdown = await response.text();
      if (ticket !== readerTicket || !dialog.open || scope !== (window.BB_PROFILE_SCOPE || "")) return;
      const marker = markdown.indexOf("**Read-aloud time:**");
      const bodyStart = marker < 0 ? 0 : markdown.indexOf("\n\n", marker);
      storyParagraphs(bodyStart < 0 ? markdown : markdown.slice(bodyStart).trim());
    } catch (_) {
      if (ticket === readerTicket && dialog.open) storyParagraphs("This story is not available offline yet. Connect to the internet, then try opening it again.");
    }
  }
  function renderStories() {
    const container = $("journal-stories");
    if (!STORIES) {
      container.textContent = "Stories are not available on this version of Toothpaws.";
      return;
    }
    const counts = COLLECTION.load().visits;
    const intro = document.createElement("p");
    intro.className = "panel-intro";
    intro.textContent = "Every buddy has a first story after one completed adventure. New chapters appear here when they are written and earned. Tap any unlocked story to read it again.";
    const current = api()?.snapshot()?.buddy;
    const ordered = COLLECTION.catalog.slice().sort((a, b) => {
      const ax = STORIES.unlocked(a.id, counts[a.id] || 0).length, bx = STORIES.unlocked(b.id, counts[b.id] || 0).length;
      return bx - ax || Number(b.id === current) - Number(a.id === current);
    });
    const entries = ordered.map(animal => {
      const visits = counts[animal.id] || 0, chapters = STORIES.chaptersFor(animal.id);
      const available = chapters.filter(ch => visits >= ch.unlockAfter);
      const section = document.createElement("details");
      section.className = "storybook-buddy";
      section.open = animal.id === current && available.length > 0;
      const summary = document.createElement("summary");
      summary.textContent = animal.emoji + " " + animal.name + " · " + available.length + "/" + chapters.length + " stories";
      section.append(summary);
      const profile = STORIES.characters.get(animal.id);
      const profileText = document.createElement("p");
      profileText.className = "storybook-biography";
      profileText.textContent = profile.personality + " " + profile.background + " " + profile.environment;
      section.append(profileText);
      chapters.forEach(ch => {
        const button = document.createElement("button");
        const earned = visits >= ch.unlockAfter;
        button.type = "button";
        button.className = "quick-button storybook-chapter";
        button.disabled = !earned;
        button.textContent = earned ? "📖 " + ch.title : "🔒 Chapter unlocks after adventure " + ch.unlockAfter;
        if (earned) button.addEventListener("click", () => { void openStory(ch); });
        section.append(button);
      });
      return section;
    });
    container.replaceChildren(intro, ...entries);
    $("journal-story-count").textContent = String(ordered.reduce((count, animal) =>
      count + STORIES.unlocked(animal.id, counts[animal.id] || 0).length, 0));
  }

  function buddyCard(a, current, visitor) {
    const unlocked = COLLECTION.unlocked(a.id);
    const choosable = unlocked || a.id === visitor;
    const visits = Math.min(3, COLLECTION.load().visits[a.id] || 0);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "buddy-card" + (a.id === current ? " current" : "") + (a.id === visitor ? " visitor" : "") + (choosable ? "" : " locked");
    button.disabled = !choosable;
    button.setAttribute("aria-pressed", String(a.id === current));
    const art = document.createElement("img");
    art.src = "animals/" + a.id + ".svg";
    art.alt = "";
    art.width = 48;
    art.height = 48;
    const name = document.createElement("strong");
    name.textContent = a.name;
    const note = document.createElement("small");
    note.textContent = a.id === current ? "Brushing with you"
      : a.id === visitor ? "Today's visitor · tap to brush together"
      : unlocked ? (COLLECTION.homeUnlocked(a.id) ? "Home unlocked" : COLLECTION.starters.includes(a.id) ? "Starter buddy" : "Unlocked")
      : visits + " of 3 trips";
    const trips = document.createElement("span");
    trips.className = "buddy-trips";
    trips.setAttribute("aria-hidden", "true");
    if (!unlocked) for (let i = 0; i < 3; i++) {
      const dot = document.createElement("i");
      if (i < visits) dot.className = "on";
      trips.append(dot);
    }
    const text = document.createElement("span");
    text.className = "buddy-card-text";
    text.append(name, note);
    if (!unlocked) text.append(trips);
    button.append(art, text);
    button.addEventListener("click", () => {
      $("journal-dialog").close();
      document.dispatchEvent(new CustomEvent("bb:choose", { detail: a.id }));
    });
    return button;
  }

  function renderBuddies() {
    const current = api()?.snapshot().buddy;
    const visitor = COLLECTION.daily();
    const rank = a => a.id === visitor ? 0 : COLLECTION.unlocked(a.id) ? 1 : 2;
    const ordered = COLLECTION.catalog.slice().sort((x, y) => rank(x) - rank(y));
    const help = document.createElement("p");
    help.className = "panel-intro";
    help.textContent = "Finish 3 Simple timer brushes to meet the next buddy, or take 3 adventures with a visitor to keep them and unlock their home.";
    const grid = document.createElement("div");
    grid.className = "collection-grid";
    grid.append(...ordered.map(a => buddyCard(a, current, visitor)));
    $("journal-buddies").replaceChildren(help, grid);
    $("journal-buddy-count").textContent = COLLECTION.available().length + "/" + COLLECTION.catalog.length;
  }

  function openJournal(tab) {
    store = loadStore();
    if (COLLECTION) COLLECTION.load();
    const buddy = api()?.snapshot().buddy;
    // Shared places, then homes the child has visited or the current buddy's home.
    const pages = ALL.filter(d => !d.id.startsWith("home-") || d.id === "home-" + buddy || d.stickers.some(st => store.stickers[st.id]));
    const list = pages.map(d => journalPage(d.emoji + " " + d.name, d.stickers));
    if (store.stickers[RARE.id]) list.push(journalPage("✨ Lucky finds", [RARE]));
    $("journal-list").replaceChildren(...list);
    $("journal-tab-buddies").hidden = !COLLECTION;
    if (COLLECTION) renderBuddies();
    renderStories();

    const { found, total } = stickerTotals();
    $("journal-sticker-count").textContent = found + "/" + total;
    $("journal-summary").textContent =
      found + " of " + total + " stickers found · " + store.sessions + (store.sessions === 1 ? " trip" : " trips");
    // Refreshing an open journal keeps the tab the child is looking at.
    if (!tab && $("journal-dialog").open) tab = ["stories", "buddies", "stickers"].find(name =>
      $("journal-tab-" + name).getAttribute("aria-selected") === "true") || "stickers";
    showJournalTab(tab === "buddies" && COLLECTION ? "buddies" : tab === "stories" ? "stories" : "stickers");
    if (!$("journal-dialog").open) $("journal-dialog").showModal();
  }

  document.addEventListener("bb:render", onRender);
  document.addEventListener("bb:reset", onReset);
  document.addEventListener("bb:finish", onFinish);

  // Defer scripts run in order, so the markup exists by now.
  $("journal-open").addEventListener("click", () => openJournal());
  $("journal-tab-stickers").addEventListener("click", () => showJournalTab("stickers"));
  $("journal-tab-buddies").addEventListener("click", () => showJournalTab("buddies"));
  $("journal-tab-stories").addEventListener("click", () => { renderStories(); showJournalTab("stories"); });
  $("journal-dialog").addEventListener("keydown", e => {
    if (!e.target.classList.contains("journal-tab") || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    const tabs = ["stickers", "buddies", "stories"];
    const current = e.target.id.replace("journal-tab-", "");
    const next = tabs[(tabs.indexOf(current) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    e.preventDefault();
    if (next === "stories") renderStories();
    showJournalTab(next);
    $("journal-tab-" + next).focus();
  });
  $("journal-close").addEventListener("click", () => $("journal-dialog").close());
  $("journal-dialog").addEventListener("close", () => $("journal-open").focus());
  $("treasure-dialog").addEventListener("close", () => {
    if (!$("journal-dialog").open) $("start-button").focus();
  });
  $("treasure-close").addEventListener("click", () => $("treasure-dialog").close());
  $("treasure-story").addEventListener("click", () => {
    const chapter = lastAwardStory;
    $("treasure-dialog").close();
    if (chapter) void openStory(chapter);
  });
  $("story-reader-close").addEventListener("click", () => $("story-reader-dialog").close());
  $("story-reader-done").addEventListener("click", () => $("story-reader-dialog").close());
  $("story-reader-dialog").addEventListener("close", () => {
    readerTicket++;
    openJournal("stories");
  });
  $("story-reader-dialog").addEventListener("click", e => {
    if (e.target === $("story-reader-dialog")) $("story-reader-dialog").close();
  });
  $("treasure-journal").addEventListener("click", () => {
    $("treasure-dialog").close();
    openJournal("stickers");
  });
  ["journal-dialog", "treasure-dialog"].forEach(id => {
    $(id).addEventListener("click", e => {
      if (e.target === $(id)) $(id).close();
    });
  });
  $("adv-scene").addEventListener("animationend", () => $("adv-scene").classList.remove("departing"));
})();
