/* Adventure scene renderer. The parent owns narration and brushing progress.
   - adventure-habitats.js: each habitat's sky, horizon, landmark, scenery, home.
   - adventure-sections.js: one section per brushing stage, built to look like
     its stop, with its own kind of path.
   - adventure-avatar.js: the animal's whole body and its gait.
   This file lays those out in a world wider than the screen, moves the camera
   with the animal (the horizon drifts more slowly behind it) and walks the
   animal along the path as brushing progresses. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const DEFAULT_POINTS = [[92, 322], [194, 306], [296, 285], [398, 294], [500, 320], [602, 336], [704, 320], [806, 290], [908, 278]];
  const GROUND = { polar: "h-water", wetland: "h-water", jungle: "h-gorge", rainbow: "h-cloudsea" };
  let svg, avatar, body, emoji, flags, backdrop, destinationId, layers, track, rig;
  let worldKey = "";
  let avatarId = "";
  let markers = [];
  let reached = 0;
  let cheerTimer = null;
  let frame = null;
  let position = 0;
  let target = 0;
  let resizeObserver;

  function element(tag, attributes, parent, text) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    if (text !== undefined) node.textContent = text;
    parent?.appendChild(node);
    return node;
  }

  function path(d, className, parent = svg) {
    return element("path", { d, class: className }, parent);
  }

  function place(progress, moving = false) {
    position = progress;
    const x = track.start + (track.end - track.start) * progress;
    const lift = track.liftAt ? track.liftAt(x) : 0;
    const y = track.yAt(x) + 4 - lift;
    avatar.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
    rig?.pose(x, moving);
    updateMarkers(x, moving);
    // The camera keeps the next goal in view; the sky stays put and the horizon drifts.
    const aspect = backdrop.clientHeight > 0 && backdrop.clientWidth > 0 ? backdrop.clientWidth / backdrop.clientHeight : 2;
    const width = Math.min(1000, 500 * aspect);
    const height = Math.min(500, 1000 / aspect);
    const cameraX = Math.max(0, Math.min(track.width - width, x - width * 0.32));
    const cameraY = Math.max(0, Math.min(500 - height, y - 60 - height / 2));
    svg.setAttribute("viewBox", `${cameraX.toFixed(1)} ${cameraY.toFixed(1)} ${width.toFixed(1)} ${height.toFixed(1)}`);
    layers.skyHolder.setAttribute("transform", `translate(${(cameraX - (1000 - width) / 2).toFixed(1)} 0)`);
    const span = track.width - width;
    const drift = span > 0 ? cameraX - cameraX * Math.max(0, 1000 - width) / span : cameraX;
    layers.far.setAttribute("transform", `translate(${drift.toFixed(1)} 0)`);
  }

  function create(host) {
    backdrop = host;
    svg = element("svg", { class: "creek-scene", viewBox: "0 0 1000 500", "aria-hidden": "true", focusable: "false", preserveAspectRatio: "xMidYMid meet" });
    const defs = element("defs", {}, svg);
    const gradient = element("linearGradient", { id: "scene-sky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    element("stop", { offset: 0, class: "scene-sky-top" }, gradient);
    element("stop", { offset: 1, class: "scene-sky-bottom" }, gradient);
    const skyHolder = element("g", { class: "scene-sky-holder" }, svg);
    element("rect", { x: -200, width: 1400, height: 500, class: "creek-sky", fill: "url(#scene-sky)" }, skyHolder);
    layers = {
      skyHolder,
      sky: element("g", { class: "scene-sky" }, skyHolder),
      far: element("g", { class: "scene-far" }, svg),
      ground: element("g", { class: "scene-ground" }, svg),
      sections: element("g", { class: "scene-sections" }, svg),
      details: element("g", { class: "creek-habitat-details", "aria-hidden": "true" }, svg),
      home: element("g", { class: "scene-home" }, svg)
    };
    flags = element("g", { class: "creek-flags" }, svg);
    avatar = element("g", { class: "creek-avatar" }, svg);
    // A soft light under the animal keeps it readable in dark worlds.
    element("ellipse", { cx: 0, cy: -20, rx: 52, ry: 44, class: "creek-avatar-glow" }, avatar);
    element("ellipse", { cx: 0, cy: 2, rx: 26, ry: 6, class: "creek-avatar-shadow" }, avatar);
    body = element("g", { class: "creek-avatar-body" }, avatar);
    emoji = element("image", { x: -32, y: -60, width: 64, height: 64, class: "creek-buddy" }, body);
    worldKey = "";
    avatarId = "";
    rig = null;
    host.replaceChildren(svg);
    build("meadow", false, "", [], 4);
    place(0);
    resizeObserver?.disconnect();
    if (window.ResizeObserver) {
      resizeObserver = new window.ResizeObserver(() => place(position));
      resizeObserver.observe(host);
    }
  }

  function seedFor(text) {
    let seed = 2166136261;
    for (const char of String(text ?? "")) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
    return seed;
  }

  // Without the section builder (or in a minimal test DOM), fall back to a simple creek.
  function simpleTrack(layer) {
    const ys = x => {
      if (x <= DEFAULT_POINTS[0][0]) return DEFAULT_POINTS[0][1];
      for (let i = 0; i < DEFAULT_POINTS.length - 1; i++) {
        const [x1, y1] = DEFAULT_POINTS[i], [x2, y2] = DEFAULT_POINTS[i + 1];
        if (x <= x2) return y1 + (y2 - y1) * (x - x1) / (x2 - x1);
      }
      return DEFAULT_POINTS[DEFAULT_POINTS.length - 1][1];
    };
    path("M-60 330C200 300 300 280 500 330S800 300 1060 280", "route-water", layer);
    for (const [x, y] of DEFAULT_POINTS) element("ellipse", { cx: x, cy: y, rx: 33, ry: 17, class: "creek-stone" }, layer);
    return { width: 1000, start: DEFAULT_POINTS[0][0], end: DEFAULT_POINTS[DEFAULT_POINTS.length - 1][0], yAt: ys, goals: DEFAULT_POINTS.slice(1).map(([x, y]) => [x, y]) };
  }

  // Draw the world for this habitat and walk, as a trail or as the buddy's home.
  function build(habitat, home, buddy, stops, count) {
    const key = [habitat, home, buddy, count, stops.map(s => s.name).join(",")].join("|");
    if (key === worldKey) return false;
    worldKey = key;
    for (const [name, layer] of Object.entries(layers)) if (name !== "skyHolder") layer.replaceChildren();
    const seed = seedFor(buddy);
    const sections = window.BB_SECTIONS;
    track = sections?.build
      ? sections.build(layers.sections, { stops, count, habitat, seed: home ? (seed ^ 0x9e3779b9) >>> 0 : seed, home, waterGround: habitat === "polar" || habitat === "wetland" })
      : simpleTrack(layers.sections);
    // Ground under the whole walk, with a soft horizon line.
    let ground = "M-200 500V256";
    for (let x = -200; x <= track.width + 200; x += 250) ground += `Q${x + 125} ${248 + (x / 250 % 2) * 10} ${x + 250} 256`;
    path(ground + "V500Z", GROUND[habitat] || "h-ground", layers.ground);
    const habitats = window.BB_HABITATS;
    if (habitats?.draw) {
      const end = track.goals[track.goals.length - 1];
      // The home sits at the end of the path, so the last goal is the front door.
      layers.home.setAttribute("transform", `translate(${(end[0] + 150 - 500).toFixed(1)} ${(end[1] + 16 - 248).toFixed(1)})`);
      habitats.draw(layers, habitat, seed, home, { tiles: Math.ceil(track.width / 1000) + 1 });
    }
    svg.dataset.habitat = habitat;
    svg.dataset.home = home ? "true" : "false";
    svg.dataset.time = habitats?.timeOf ? habitats.timeOf(seed, home) : "noon";
    return true;
  }

  function updateMarkers(x, moving) {
    let count = 0;
    markers.forEach((marker, index) => {
      const done = x >= marker.x - 2;
      if (done) count = index + 1;
      const state = done ? "reached" : index === count ? "next" : "";
      if (state !== marker.state) {
        marker.state = state;
        marker.node.setAttribute("class", "goal-marker" + (state ? " " + state : ""));
      }
    });
    // Arriving at a goal is a moment: the animal cheers.
    if (reached >= 0 && count > reached && moving && svg && typeof setTimeout === "function") {
      svg.dataset.cheer = "true";
      clearTimeout(cheerTimer);
      cheerTimer = setTimeout(() => { if (svg) svg.dataset.cheer = "false"; }, 900);
    }
    reached = count;
  }

  function render(snapshot, destination) {
    const host = document.getElementById("adv-backdrop");
    if (!host) return;
    const fresh = backdrop !== host || svg?.parentNode !== host;
    if (fresh) create(host);
    const habitat = destination.habitat || { forest: "forest", jungle: "jungle", snow: "polar", beach: "shore", desert: "desert", night: "cave", sky: "rainbow" }[destination.scene] || "meadow";
    const home = String(destination.id || "").startsWith("home-");
    const stops = Array.isArray(destination.stops) ? destination.stops : [];
    const count = Number.isFinite(snapshot.stageCount) && snapshot.stageCount > 0 ? snapshot.stageCount : stops.length || 4;
    const rebuilt = build(habitat, home, snapshot.buddy, stops, count);
    const changed = fresh || rebuilt || destinationId !== destination.id;
    destinationId = destination.id;
    svg.dataset.scene = destination.scene || "meadow";
    svg.dataset.phase = snapshot.phase || "ready";
    const animalId = /^[a-z-]+$/.test(snapshot.buddy || '') ? snapshot.buddy : 'cat';
    emoji.setAttribute('href', 'animals/' + animalId + '.svg');
    if (animalId !== avatarId) {
      avatarId = animalId;
      rig = window.BB_AVATAR?.build ? window.BB_AVATAR.build(body, animalId, emoji) : null;
    }
    if (changed) {
      // A numbered sign at each goal; it turns into a gold star once reached,
      // and the next goal shows its name.
      flags.replaceChildren();
      markers = track.goals.map(([x, y, , , name], index) => {
        const marker = element("g", { class: "goal-marker", transform: `translate(${x} ${y - 20})` }, flags);
        // Sized to stay readable on a phone, where the scene draws at about half size.
        path("M0 20V-46", "creek-flagpole", marker);
        element("circle", { cx: 0, cy: -70, r: 26, class: "goal-sign" }, marker);
        path("M0-94l7 15 16 2-12 11 4 16-15-8-15 8 4-16-12-11 16-2Z", "goal-star", marker);
        element("text", { x: 0, y: -61, class: "creek-flag-number goal-number", "text-anchor": "middle" }, marker, index + 1);
        const label = element("g", { class: "goal-label" }, marker);
        const text = String(name || "").slice(0, 20);
        const w = Math.max(90, text.length * 13.5 + 32);
        element("rect", { x: -w / 2, y: -150, width: w, height: 40, rx: 20, class: "goal-label-bg" }, label);
        element("text", { x: 0, y: -122, class: "goal-label-text", "text-anchor": "middle" }, label, text);
        return { node: marker, x, state: "" };
      });
      reached = -1;
    }
    const progress = Number.isFinite(snapshot.progress) ? Math.max(0, Math.min(1, snapshot.progress)) : 0;
    const running = snapshot.phase === "running";
    const calm = snapshot.calm || snapshot.animations === false || snapshot.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paused = snapshot.phase === "paused" || snapshot.phase === "motion-paused";
    if (!changed && paused) {
      cancelAnimationFrame(frame);
      frame = null;
      place(position, false);
      return;
    }
    if (changed || calm || !running) {
      cancelAnimationFrame(frame);
      frame = null;
      target = progress;
      place(progress, false);
      return;
    }
    if (target === progress && (frame !== null || position === progress)) return;
    cancelAnimationFrame(frame);
    target = progress;
    const from = position;
    const start = performance.now();
    // Progress arrives about once a second; walk steadily until the next update.
    function advance(now) {
      const fraction = Math.max(0, Math.min(1, (now - start) / 1000));
      place(from + (target - from) * fraction, true);
      frame = fraction < 1 ? requestAnimationFrame(advance) : null;
      if (frame === null) place(target, false);
    }
    frame = requestAnimationFrame(advance);
  }

  window.BB_SCENE = { render };
})();
