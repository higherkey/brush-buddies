/* Decorative creek renderer. The parent owns narration and brushing progress. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const stones = [[92, 322], [194, 306], [296, 285], [398, 294], [500, 320], [602, 336], [704, 320], [806, 290], [908, 278]];
  let svg, avatar, emoji, flags, backdrop, destinationId;
  let frame = null;
  let position = 0;
  let target = 0;

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

  function place(progress) {
    position = progress;
    const step = progress * (stones.length - 1);
    const index = Math.min(Math.floor(step), stones.length - 2);
    const fraction = step - index;
    const [x, y] = stones[index];
    const [nextX, nextY] = stones[index + 1];
    avatar.setAttribute("transform", `translate(${x + (nextX - x) * fraction} ${y + (nextY - y) * fraction - 12})`);
  }

  function create(host) {
    backdrop = host;
    svg = element("svg", { class: "creek-scene", viewBox: "0 0 1000 500", "aria-hidden": "true", focusable: "false", preserveAspectRatio: "xMidYMid slice" });
    element("rect", { width: 1000, height: 500, class: "creek-sky" }, svg);
    element("circle", { cx: 822, cy: 83, r: 55, class: "creek-sun-halo" }, svg);
    element("circle", { cx: 822, cy: 83, r: 34, class: "creek-sun" }, svg);
    path("M115 89c0-17 24-27 37-13 6-28 49-28 55 1 27-8 42 22 22 32H118c-17 0-20-16-3-20ZM482 61c5-20 32-24 43-5 21-14 49 2 45 21h-91c-14-1-13-15 3-16Z", "creek-cloud");
    path("M0 215Q110 85 248 188Q365 58 528 191Q694 89 833 174Q930 108 1000 182V500H0Z", "creek-hill-far");
    path("M0 242Q155 167 320 230T640 221T1000 205V500H0Z", "creek-hill");
    path("M0 302C180 338 220 217 395 238S601 346 780 265 932 252 1000 247V399C853 345 811 365 711 397S499 424 367 361 158 425 0 401Z", "creek-bank");
    path("M0 316C180 352 220 231 395 252S601 360 780 279 932 266 1000 261V382C853 328 811 348 711 380S499 407 367 344 158 408 0 384Z", "creek-water");
    path("M0 330Q98 350 167 311M257 279Q325 250 389 269M450 297Q543 357 622 351M747 310Q845 257 912 279M30 369Q117 385 169 359M342 319l45 13M655 369l39-8M852 316l54-9", "creek-ripple");

    const forest = element("g", { class: "creek-forest" }, svg);
    for (const [x, y, scale] of [[56, 208, 1], [150, 227, 0.7], [890, 216, 1.1], [953, 231, 0.8]]) {
      const tree = element("g", { transform: `translate(${x} ${y}) scale(${scale})` }, forest);
      path("M-5 0V-85H5V0Z", "creek-trunk", tree);
      path("M0-142l-41 63h18l-31 48H54L23-79h18Z", "creek-tree", tree);
      path("M0-142l-24 37h48ZM-23-79l-15 24h76L23-79Z", "creek-snowcap", tree);
    }
    const beach = element("g", { class: "creek-beach" }, svg);
    path("M117 255q27-65 9-120l12-2q20 67-6 126Z", "creek-trunk", beach);
    path("M132 144q-55-69-88-8 43-18 88 8-65-5-60 43 24-32 60-43 46-68 88-21-50-8-88 21 58-17 69 29-38-28-69-29Z", "creek-tree", beach);
    path("M855 438q-32-29 0-42 32 13 0 42Zm-14-29 14 29 14-29", "creek-shell", beach);
    const night = element("g", { class: "creek-night" }, svg);
    path("M832 49a34 34 0 1 0 22 59 38 38 0 0 1-22-59Z", "creek-moon", night);
    for (const [cx, cy, r] of [[90, 52, 3], [330, 85, 4], [580, 37, 3], [717, 109, 4], [934, 51, 3], [447, 130, 2]]) {
      element("circle", { cx, cy, r, class: "creek-star" }, night);
    }
    const snow = element("g", { class: "creek-snow" }, svg);
    path("M206 163l42 25 47-35-29 7-18-17-15 20ZM433 160l45 15 50 16-48-46-20 20Z", "creek-snowcap", snow);
    for (const [cx, cy] of [[215, 70], [385, 115], [610, 95], [700, 170], [920, 127]]) {
      path(`M${cx - 5} ${cy}h10m-5-5v10`, "creek-snowflake", snow);
    }

    for (const [x, y] of stones) {
      element("ellipse", { cx: x, cy: y + 12, rx: 39, ry: 13, class: "creek-stone-shadow" }, svg);
      element("ellipse", { cx: x, cy: y, rx: 33, ry: 17, class: "creek-stone" }, svg);
      path(`M${x - 19} ${y - 5}q17-9 34-1`, "creek-stone-glint");
    }
    flags = element("g", { class: "creek-flags" }, svg);
    for (const [x, y, flip] of [[25, 447, 1], [200, 437, -1], [740, 465, 1], [965, 432, -1]]) {
      const reeds = element("g", { transform: `translate(${x} ${y}) scale(${flip} 1)` }, svg);
      path("M0 0q-3-43-24-59M0 0q4-65 19-89M0 0q18-44 40-48M0 0v-75", "creek-reed", reeds);
      path("M0-76v-18M19-88l5-15", "creek-cattail", reeds);
    }
    path("M290 437q32-18 63-5M465 466q57-21 100-6M815 419q26-12 46-2", "creek-grass");
    for (const [cx, cy] of [[244, 449], [378, 422], [635, 448], [916, 469]]) {
      element("circle", { cx, cy, r: 7, class: "creek-flower" }, svg);
      element("circle", { cx, cy, r: 3, class: "creek-flower-heart" }, svg);
    }
    avatar = element("g", { class: "creek-avatar" }, svg);
    element("ellipse", { cx: 0, cy: 9, rx: 22, ry: 6, class: "creek-avatar-shadow" }, avatar);
    emoji = element("text", { x: 0, y: 0, "text-anchor": "middle", class: "creek-buddy" }, avatar);
    host.replaceChildren(svg);
    place(0);
  }

  function render(snapshot, destination) {
    const host = document.getElementById("adv-backdrop");
    if (!host) return;
    const fresh = backdrop !== host || svg?.parentNode !== host;
    if (fresh) create(host);
    const changed = fresh || destinationId !== destination.id;
    destinationId = destination.id;
    svg.dataset.scene = destination.scene || "meadow";
    emoji.textContent = snapshot.buddyEmoji || "🐾";
    if (changed) {
      flags.replaceChildren();
      const stops = destination.stops || [];
      stops.forEach((stop, index) => {
        const stone = stones[Math.round((index + 1) / Math.max(stops.length, 1) * (stones.length - 1))];
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
