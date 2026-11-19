/* Adventure scene renderer. The parent owns narration and brushing progress.
   Habitat worlds (sky, horizon, landmark, props, home) come from
   adventure-habitats.js; this file draws the path and its steps, places the
   animal and moves the camera. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const DEFAULT_POINTS = [[92, 322], [194, 306], [296, 285], [398, 294], [500, 320], [602, 336], [704, 320], [806, 290], [908, 278]];
  let svg, avatar, emoji, flags, backdrop, destinationId, layers;
  let points = DEFAULT_POINTS;
  let worldKey = "";
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

  // A smooth curve through the points, run in from the left edge and out past the right.
  function curve(list, dy = 0) {
    const pts = [[-60, list[0][1] + dy], ...list.map(([x, y]) => [x, y + dy]), [1060, list[list.length - 1][1] + dy]];
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function place(progress) {
    position = progress;
    const step = progress * (points.length - 1);
    const index = Math.min(Math.floor(step), points.length - 2);
    const fraction = step - index;
    const [x, y] = points[index];
    const [nextX, nextY] = points[index + 1];
    const animalX = x + (nextX - x) * fraction;
    const animalY = y + (nextY - y) * fraction - 12;
    avatar.setAttribute("transform", `translate(${animalX} ${animalY})`);
    // Follow the animal on portrait screens instead of cropping the ends of its path.
    const aspect = backdrop.clientHeight > 0 && backdrop.clientWidth > 0 ? backdrop.clientWidth / backdrop.clientHeight : 2;
    const width = Math.min(1000, 500 * aspect);
    const height = Math.min(500, 1000 / aspect);
    const cameraX = Math.max(0, Math.min(1000 - width, animalX - width / 2));
    const cameraY = Math.max(0, Math.min(500 - height, animalY - 36 - height / 2));
    svg.setAttribute("viewBox", `${cameraX} ${cameraY} ${width} ${height}`);
  }

  /* ---------- The path ---------- */

  function drawPath(g, kind) {
    if (kind === "creek") {
      path(curve(points, 8), "route-bank", g);
      path(curve(points, 8), "route-water", g);
      path(curve(points, 8), "route-ripple", g);
    } else if (kind === "trail" || kind === "track") {
      path(curve(points, 6), "route-edge", g);
      path(curve(points, 6), "route-dirt", g);
      if (kind === "track") {
        path(curve(points, -6), "route-rut", g);
        path(curve(points, 18), "route-rut", g);
      }
    } else if (kind === "branch") {
      path(curve(points, 14), "route-branch", g);
      path(curve(points, 8), "route-branch-light", g);
    } else if (kind === "bridge") {
      // A rope bridge: planks along the deck, ropes above.
      const deck = curve(points, 4);
      path(deck, "route-rope-under", g);
      for (let i = 0; i < points.length - 1; i++) {
        const [x1, y1] = points[i];
        const [x2, y2] = points[i + 1];
        for (let k = 0; k < 4; k++) {
          const t = k / 4;
          const x = x1 + (x2 - x1) * t;
          const y = y1 + (y2 - y1) * t + 4;
          const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
          element("rect", { x: -9, y: -14, width: 18, height: 28, rx: 3, class: "route-plank", transform: `translate(${x} ${y}) rotate(${angle})` }, g);
        }
      }
      path(curve(points, -42), "route-rope", g);
      for (const [x, y] of [points[0], points[points.length - 1]]) path(`M${x} ${y + 10}V${y - 52}`, "route-post", g);
    }
  }

  function drawStep(g, kind, x, y, i) {
    if (kind === "stone") {
      element("ellipse", { cx: x, cy: y + 12, rx: 39, ry: 13, class: "creek-stone-shadow" }, g);
      element("ellipse", { cx: x, cy: y, rx: 33, ry: 17, class: "creek-stone" }, g);
      path(`M${x - 19} ${y - 5}q17-9 34-1`, "creek-stone-glint", g);
    } else if (kind === "square") {
      element("rect", { x: x - 30, y: y - 10, width: 60, height: 28, rx: 6, class: "creek-stone-shadow" }, g);
      element("rect", { x: x - 28, y: y - 16, width: 56, height: 26, rx: 6, class: "creek-stone" }, g);
      path(`M${x - 18} ${y - 10}h30`, "creek-stone-glint", g);
    } else if (kind === "pad") {
      path(`M${x} ${y}m-40 0a40 15 0 1 0 80 0a40 15 0 1 0-80 0Z`, "step-pad-shadow", g).setAttribute("transform", "translate(0 6)");
      path(`M${x} ${y}L${x + 30} ${y - 9}A40 15 0 1 1 ${x + 34} ${y + 4}Z`, "step-pad", g);
      path(`M${x} ${y}L${x - 26} ${y - 6}M${x} ${y}L${x - 10} ${y + 12}M${x} ${y}L${x + 18} ${y + 11}`, "step-pad-vein", g);
      if (i % 3 === 1) {
        element("circle", { cx: x - 18, cy: y - 8, r: 7, class: "step-blossom" }, g);
        element("circle", { cx: x - 18, cy: y - 8, r: 3, class: "step-blossom-heart" }, g);
      }
    } else if (kind === "floe") {
      path(`M${x - 42} ${y + 4}L${x - 30} ${y - 12}L${x + 8} ${y - 16}L${x + 40} ${y - 6}L${x + 36} ${y + 10}L${x - 10} ${y + 16}Z`, "step-floe-side", g).setAttribute("transform", "translate(0 7)");
      path(`M${x - 42} ${y + 4}L${x - 30} ${y - 12}L${x + 8} ${y - 16}L${x + 40} ${y - 6}L${x + 36} ${y + 10}L${x - 10} ${y + 16}Z`, "step-floe", g);
      path(`M${x - 26} ${y - 6}L${x + 4} ${y - 9}`, "creek-stone-glint", g);
    } else if (kind === "cloud") {
      for (const [dx, dy, rx, ry] of [[-22, 4, 24, 14], [0, -4, 28, 18], [24, 4, 22, 13], [0, 8, 40, 12]]) {
        element("ellipse", { cx: x + dx, cy: y + dy, rx, ry, class: "step-cloud" }, g);
      }
    } else if (kind === "paver") {
      element("ellipse", { cx: x, cy: y + 4, rx: 30, ry: 13, class: "step-paver-shadow" }, g);
      element("ellipse", { cx: x, cy: y, rx: 28, ry: 12, class: "step-paver" }, g);
    } else if (kind === "stump") {
      path(`M${x - 30} ${y}V${y + 16}A30 10 0 0 0 ${x + 30} ${y + 16}V${y}Z`, "step-stump-side", g);
      element("ellipse", { cx: x, cy: y, rx: 30, ry: 11, class: "step-stump" }, g);
      element("ellipse", { cx: x, cy: y, rx: 18, ry: 6, class: "step-stump-ring" }, g);
      element("ellipse", { cx: x, cy: y, rx: 7, ry: 2.5, class: "step-stump-ring" }, g);
    } else if (kind === "print") {
      const p = element("g", { transform: `translate(${x} ${y + 6}) rotate(${i % 2 ? 12 : -12}) scale(.9)`, class: "step-print" }, g);
      element("ellipse", { cx: 0, cy: 6, rx: 13, ry: 10 }, p);
      for (const [dx, dy] of [[-15, -8], [-5, -14], [6, -14], [16, -8]]) element("ellipse", { cx: dx, cy: dy, rx: 5, ry: 6 }, p);
    } else if (kind === "flatrock") {
      element("ellipse", { cx: x, cy: y + 9, rx: 36, ry: 11, class: "creek-stone-shadow" }, g);
      path(`M${x - 34} ${y + 4}Q${x - 30} ${y - 12} ${x - 4} ${y - 14}Q${x + 30} ${y - 14} ${x + 34} ${y + 2}Q${x + 20} ${y + 12} ${x - 34} ${y + 4}Z`, "step-flatrock", g);
      path(`M${x - 18} ${y - 6}q14-6 30-2`, "creek-stone-glint", g);
    } else if (kind === "leafpad") {
      for (const angle of [-30, 0, 30]) {
        path(`M${x} ${y + 4}q-10-14 0-30q10 16 0 30Z`, "step-leaf", g).setAttribute("transform", `rotate(${angle} ${x} ${y + 4})`);
      }
    } else if (kind === "crystal") {
      element("ellipse", { cx: x, cy: y + 2, rx: 40, ry: 16, class: "step-glow" }, g);
      path(`M${x - 30} ${y}L${x - 16} ${y - 12}H${x + 16}L${x + 30} ${y}L${x + 16} ${y + 12}H${x - 16}Z`, "step-crystal", g);
      path(`M${x - 16} ${y - 12}L${x} ${y}L${x + 16} ${y - 12}M${x} ${y}V${y + 12}`, "step-crystal-line", g);
    } else if (kind === "shell") {
      element("ellipse", { cx: x, cy: y + 6, rx: 30, ry: 10, class: "step-paver-shadow" }, g);
      element("ellipse", { cx: x, cy: y, rx: 28, ry: 12, class: "step-sanddollar" }, g);
      path(`M${x} ${y - 8}V${y - 1}M${x - 8} ${y - 3}L${x - 2} ${y}M${x + 8} ${y - 3}L${x + 2} ${y}M${x - 5} ${y + 6}L${x - 1} ${y + 1}M${x + 5} ${y + 6}L${x + 1} ${y + 1}`, "step-sanddollar-line", g);
    } else if (kind === "tiderock") {
      element("ellipse", { cx: x, cy: y + 12, rx: 40, ry: 12, class: "creek-stone-shadow" }, g);
      path(`M${x - 38} ${y + 8}Q${x - 40} ${y - 16} ${x - 10} ${y - 18}Q${x + 30} ${y - 22} ${x + 38} ${y + 4}Q${x + 20} ${y + 16} ${x - 38} ${y + 8}Z`, "step-tiderock", g);
      path(`M${x - 24} ${y + 8}q-6-10 0-18M${x + 26} ${y + 6}q6-9 0-16`, "step-seaweed", g);
    }
  }

  /* ---------- Building the scene ---------- */

  function create(host) {
    backdrop = host;
    svg = element("svg", { class: "creek-scene", viewBox: "0 0 1000 500", "aria-hidden": "true", focusable: "false", preserveAspectRatio: "xMidYMid meet" });
    const defs = element("defs", {}, svg);
    const gradient = element("linearGradient", { id: "scene-sky", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    element("stop", { offset: 0, class: "scene-sky-top" }, gradient);
    element("stop", { offset: 1, class: "scene-sky-bottom" }, gradient);
    element("rect", { width: 1000, height: 500, class: "creek-sky", fill: "url(#scene-sky)" }, svg);
    layers = {
      sky: element("g", { class: "scene-sky" }, svg),
      far: element("g", { class: "scene-far" }, svg),
      home: element("g", { class: "scene-home" }, svg),
      route: element("g", { class: "scene-route" }, svg),
      details: element("g", { class: "creek-habitat-details", "aria-hidden": "true" }, svg)
    };
    flags = element("g", { class: "creek-flags" }, svg);
    avatar = element("g", { class: "creek-avatar" }, svg);
    element("ellipse", { cx: 0, cy: 9, rx: 22, ry: 6, class: "creek-avatar-shadow" }, avatar);
    emoji = element("image", { x: -32, y: -60, width: 64, height: 64, class: "creek-buddy" }, avatar);
    worldKey = "";
    host.replaceChildren(svg);
    build("meadow", false, "");
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

  // Draw the world for this habitat, as a trail or as the buddy's home.
  function build(habitat, home, buddy) {
    const key = habitat + "|" + home + "|" + buddy;
    if (key === worldKey) return false;
    worldKey = key;
    for (const layer of Object.values(layers)) layer.replaceChildren();
    const habitats = window.BB_HABITATS;
    const world = habitats?.draw
      ? habitats.draw(layers, habitat, seedFor(buddy), home)
      : { points: DEFAULT_POINTS, path: "creek", token: "stone" };
    points = world.points || DEFAULT_POINTS;
    svg.dataset.habitat = habitat;
    svg.dataset.home = home ? "true" : "false";
    svg.dataset.time = world.time || "noon";
    drawPath(layers.route, world.path);
    if (world.token !== "plank") points.forEach(([x, y], i) => drawStep(layers.route, world.token, x, y, i));
    return true;
  }

  function render(snapshot, destination) {
    const host = document.getElementById("adv-backdrop");
    if (!host) return;
    const fresh = backdrop !== host || svg?.parentNode !== host;
    if (fresh) create(host);
    const habitat = destination.habitat || { forest: "forest", jungle: "jungle", snow: "polar", beach: "shore", desert: "desert", night: "cave", sky: "rainbow" }[destination.scene] || "meadow";
    const home = String(destination.id || "").startsWith("home-");
    const rebuilt = build(habitat, home, snapshot.buddy);
    const changed = fresh || rebuilt || destinationId !== destination.id;
    destinationId = destination.id;
    svg.dataset.scene = destination.scene || "meadow";
    const animalId = /^[a-z-]+$/.test(snapshot.buddy || '') ? snapshot.buddy : 'cat';
    emoji.setAttribute('href', 'animals/' + animalId + '.svg');
    if (changed) {
      flags.replaceChildren();
      const stops = destination.stops || [];
      stops.forEach((stop, index) => {
        const stone = points[Math.round((index + 1) / Math.max(stops.length, 1) * (points.length - 1))];
        const flag = element("g", { transform: `translate(${stone[0]} ${stone[1] - 34})` }, flags);
        path("M0 17v-49", "creek-flagpole", flag);
        path("M1-32h29l-7 10 7 10H1Z", "creek-flag", flag);
        element("text", { x: 12, y: -17, class: "creek-flag-number", "text-anchor": "middle" }, flag, index + 1);
      });
    }
    const progress = Number.isFinite(snapshot.progress) ? Math.max(0, Math.min(1, snapshot.progress)) : 0;
    const running = snapshot.phase === "running";
    const calm = snapshot.calm || snapshot.animations === false || snapshot.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const paused = snapshot.phase === "paused" || snapshot.phase === "motion-paused";
    if (!changed && paused) {
      cancelAnimationFrame(frame);
      frame = null;
      return;
    }
    if (changed || calm || !running) {
      cancelAnimationFrame(frame);
      frame = null;
      target = progress;
      place(progress);
      return;
    }
    if (target === progress && (frame !== null || position === progress)) return;
    cancelAnimationFrame(frame);
    target = progress;
    const from = position;
    const start = performance.now();
    function advance(now) {
      const fraction = Math.max(0, Math.min(1, (now - start) / 400));
      place(from + (target - from) * fraction);
      frame = fraction < 1 ? requestAnimationFrame(advance) : null;
    }
    frame = requestAnimationFrame(advance);
  }

  window.BB_SCENE = { render };
})();
