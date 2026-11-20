/* Trail sections for Adventure Mode.
   The walk is split into one section per brushing stage. Each section is built
   to look like the stop it leads to: a "Sheltered Nook" dips into a cosy
   overhang, a "Watering Hole" crosses a pool, a "Ledge" climbs stone steps, a
   "Leafy Branch" climbs onto a big tree. The path changes form and height from
   one section to the next, so no two parts of the walk look the same.
   Coordinates are world units: sections sit side by side after a short lead-in,
   with the path kept between y 285 and 410. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const LEAD = 110;
  const SECTION = 560;
  const TOP = 285;
  const BOTTOM = 410;

  function el(parent, tag, attributes) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }
  const P = (g, d, cls) => el(g, "path", { d, class: cls });
  const C = (g, cx, cy, r, cls) => el(g, "circle", { cx, cy, r, class: cls });
  const E = (g, cx, cy, rx, ry, cls) => el(g, "ellipse", { cx, cy, rx, ry, class: cls });
  const R = (g, x, y, width, height, cls, rx = 0) => el(g, "rect", { x, y, width, height, rx, class: cls });
  const G = (g, x, y, s = 1) => el(g, "g", { transform: `translate(${x} ${y}) scale(${s})` });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- What each stop looks like ---------- */

  const KINDS = [
    [/ledge/i, "ledge"],
    [/nook|shelter|rest|nap|roost/i, "nook"],
    [/bridge/i, "bridge"],
    [/flight/i, "flight"],
    [/reef|seaweed|seabed|open water/i, "sea"],
    [/pool|hole|dip|stream|cove|oasis|edge/i, "water"],
    [/canopy|branch|fork|tree/i, "tree"],
    [/rock|shore|entrance|shelf/i, "rock"],
    [/reed|bank/i, "marsh"],
    [/beach|burrow/i, "beach"],
    [/window|corner/i, "house"],
    [/snack|grove/i, "grove"],
    [/patch|bed|meadow|garden|clearing/i, "flowers"],
    [/plain|trail|path/i, "trail"]
  ];
  function kindOf(name) {
    for (const [pattern, kind] of KINDS) if (pattern.test(name)) return kind;
    return "trail";
  }

  // How the path rises or falls across a section of each kind.
  const PROFILES = {
    nook: { rise: 50, bump: 0, wiggle: 6 }, ledge: { rise: -90, bump: 0, wiggle: 0 },
    bridge: { rise: 0, bump: -80, wiggle: 0 }, flight: { rise: -10, bump: -100, wiggle: 0 },
    water: { rise: 0, bump: 40, wiggle: 0 }, tree: { rise: -80, bump: 0, wiggle: 4 },
    rock: { rise: -10, bump: -60, wiggle: 0 }, marsh: { rise: 14, bump: 0, wiggle: 10 },
    sea: { rise: 0, bump: 0, wiggle: 20 }, beach: { rise: 22, bump: 0, wiggle: 14 },
    house: { rise: -26, bump: 0, wiggle: 8 }, grove: { rise: 0, bump: -26, wiggle: 12 },
    flowers: { rise: 28, bump: 0, wiggle: 20 }, trail: { rise: -34, bump: 0, wiggle: 22 }
  };

  // The kind of path for a section, by stop kind and habitat.
  function formFor(kind, habitat, name) {
    const ground = { polar: "snow", ocean: "sand", rainbow: "clouds", cave: "crystals", shore: "sand", desert: "sand" }[habitat] || "dirt";
    switch (kind) {
      case "water":
        if (habitat === "polar") return "floes";
        if (habitat === "rainbow") return "clouds";
        if (habitat === "ocean") return "bubbles";
        if (/stream/i.test(name)) return "log";
        if (habitat === "wetland" || habitat === "jungle" || /lily/i.test(name)) return "pads";
        return "stones";
      case "ledge": return "steps";
      case "bridge": return "rainbow";
      case "flight": return "flight";
      case "tree": return "branch";
      case "rock": return habitat === "polar" ? "floes" : "rocks";
      case "marsh": return "boardwalk";
      case "sea": return /open water/i.test(name) ? "bubbles" : "sand";
      case "beach": return "sand";
      case "house": return "pavers";
      case "flowers": return habitat === "rainbow" ? "clouds" : ground === "dirt" ? "pavers" : ground;
      default: return ground;
    }
  }
  const ALTERNATES = { boardwalk: "pads", steps: "rocks", log: "stones", rainbow: "clouds", flight: "clouds", branch: "dirt", dirt: "pavers", pavers: "dirt", snow: "floes", floes: "snow", clouds: "pavers", crystals: "rocks", stones: "rocks", rocks: "steps", pads: "stones", bubbles: "sand" };
  // A different path when two sections in a row would match, suited to the habitat.
  function alternate(form, habitat) {
    if (form === "sand") return habitat === "ocean" ? "bubbles" : "rocks";
    if (form === "clouds" && habitat === "rainbow") return "rainbow";
    const next = ALTERNATES[form];
    return next && next !== form ? next : form === "dirt" ? "pavers" : "dirt";
  }
  // The plain path at either end of the walk.
  function endClass(habitat) {
    return { polar: "route-snow", cave: "route-cave", ocean: "route-sand", desert: "route-sand", shore: "route-sand", rainbow: "route-snow" }[habitat] || "route-dirt";
  }

  /* ---------- Layout ---------- */

  function layout(stops, count, habitat, seed, home) {
    const n = clamp(Math.round(count) || stops.length || 4, 1, 8);
    const sections = [];
    let y = 360;
    let previousForm = "";
    const seen = {};
    for (let i = 0; i < n; i++) {
      const stop = stops.length ? stops[i % stops.length] : { name: "Trail" };
      const kind = kindOf(stop.name);
      const profile = PROFILES[kind];
      // Each animal gets its own amount of rise and wiggle.
      const jitter = (((seed >>> (i * 4)) % 9) - 4) * 4;
      let y1 = y + profile.rise + jitter;
      // Keep room for the dip of a bump and for the next climb.
      if (y1 < TOP + 10 || y1 > BOTTOM - 10) y1 = y - profile.rise * 0.6;
      y1 = clamp(y1, TOP + 10, BOTTOM - 10);
      let form = formFor(kind, habitat, stop.name);
      if (form === previousForm) form = alternate(form, habitat);
      previousForm = form;
      const x0 = LEAD + i * SECTION;
      const variant = seen[kind] = (seen[kind] ?? -1) + 1;
      sections.push({ i, stop, kind, form, variant, x0, x1: x0 + SECTION, y0: y, y1, bump: profile.bump, wiggle: profile.wiggle + ((seed >>> (i * 2 + 5)) % 7), phase: (seed >>> (i + 3)) % 7 });
      y = y1;
    }
    const width = LEAD + n * SECTION + (home ? 300 : 170);
    return { sections, width, start: LEAD, end: LEAD + n * SECTION };
  }

  function yIn(s, x) {
    const t = clamp((x - s.x0) / (s.x1 - s.x0), 0, 1);
    const ease = t * t * (3 - 2 * t);
    const y = s.y0 + (s.y1 - s.y0) * ease + s.bump * Math.sin(Math.PI * t) + s.wiggle * Math.sin(Math.PI * 2 * t + s.phase) * Math.sin(Math.PI * t);
    return clamp(y, TOP - 20, BOTTOM);
  }

  function makeY(plan) {
    return x => {
      const { sections } = plan;
      if (x <= sections[0].x0) return sections[0].y0;
      const last = sections[sections.length - 1];
      if (x >= last.x1) return last.y1;
      const s = sections[Math.min(sections.length - 1, Math.floor((x - sections[0].x0) / SECTION))];
      return yIn(s, x);
    };
  }

  function sample(fn, x0, x1, step = 14) {
    const pts = [];
    for (let x = x0; x < x1; x += step) pts.push([x, fn(x)]);
    pts.push([x1, fn(x1)]);
    return pts;
  }
  const line = pts => "M" + pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L");

  /* ---------- Path forms ---------- */

  function stepsAlong(g, s, yAt, spacing, draw, from = 0.08, to = 0.96) {
    const span = s.x1 - s.x0;
    let k = 0;
    for (let x = s.x0 + span * from; x <= s.x0 + span * to; x += spacing) draw(g, x, yAt(x), k++);
  }

  function ribbon(g, pts, edge, fill, width) {
    el(g, "path", { d: line(pts), class: edge, "stroke-width": width + 12 });
    el(g, "path", { d: line(pts), class: fill, "stroke-width": width });
  }

  const STEP = {
    stone(g, x, y) { E(g, x, y + 11, 36, 12, "creek-stone-shadow"); E(g, x, y, 30, 15, "creek-stone"); P(g, `M${x - 17} ${y - 5}q15-8 30-1`, "creek-stone-glint"); },
    pad(g, x, y, k) {
      P(g, `M${x} ${y}L${x + 30} ${y - 9}A40 15 0 1 1 ${x + 34} ${y + 4}Z`, "step-pad");
      P(g, `M${x} ${y}L${x - 26} ${y - 6}M${x} ${y}L${x - 10} ${y + 12}M${x} ${y}L${x + 18} ${y + 11}`, "step-pad-vein");
      if (k % 2) { C(g, x - 18, y - 8, 7, "step-blossom"); C(g, x - 18, y - 8, 3, "step-blossom-heart"); }
    },
    floe(g, x, y) {
      const d = `M${x - 40} ${y + 4}L${x - 28} ${y - 12}L${x + 8} ${y - 15}L${x + 38} ${y - 6}L${x + 34} ${y + 10}L${x - 10} ${y + 15}Z`;
      P(g, d, "step-floe-side").setAttribute("transform", "translate(0 7)");
      P(g, d, "step-floe");
    },
    cloud(g, x, y) { for (const [dx, dy, rx, ry] of [[-20, 4, 22, 13], [0, -4, 26, 16], [22, 4, 20, 12], [0, 8, 38, 11]]) E(g, x + dx, y + dy, rx, ry, "step-cloud"); },
    paver(g, x, y) { E(g, x, y + 4, 28, 12, "step-paver-shadow"); E(g, x, y, 26, 11, "step-paver"); },
    rock(g, x, y) {
      E(g, x, y + 14, 40, 12, "creek-stone-shadow");
      P(g, `M${x - 38} ${y + 10}Q${x - 40} ${y - 18} ${x - 8} ${y - 22}Q${x + 32} ${y - 24} ${x + 38} ${y + 6}Q${x + 20} ${y + 18} ${x - 38} ${y + 10}Z`, "step-flatrock");
      P(g, `M${x - 20} ${y - 10}q14-7 30-3`, "creek-stone-glint");
    },
    crystal(g, x, y) {
      E(g, x, y + 2, 38, 15, "step-glow");
      P(g, `M${x - 28} ${y}L${x - 15} ${y - 11}H${x + 15}L${x + 28} ${y}L${x + 15} ${y + 11}H${x - 15}Z`, "step-crystal");
    },
    bubble(g, x, y, k) { C(g, x, y - 6, 6 + (k % 3) * 3, "step-bubble"); C(g, x + 14, y - 26, 4, "step-bubble"); },
    sparkle(g, x, y, k) { P(g, `M${x} ${y - 10}l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z`, k % 2 ? "step-sparkle" : "step-sparkle-2"); },
    shell(g, x, y) { E(g, x, y, 22, 9, "step-sanddollar"); P(g, `M${x} ${y - 6}V${y}M${x - 6} ${y - 2}L${x} ${y}M${x + 6} ${y - 2}L${x} ${y}`, "step-sanddollar-line"); }
  };

  function drawForm(g, s, yAt, habitat, waterGround) {
    const pts = sample(yAt, s.x0, s.x1);
    switch (s.form) {
      case "dirt": ribbon(g, pts, "route-edge", "route-dirt", 54); break;
      case "sand": ribbon(g, pts, "route-edge", "route-sand", 54); stepsAlong(g, s, yAt, 130, STEP.shell, 0.2, 0.9); break;
      case "snow": ribbon(g, pts, "route-snow-edge", "route-snow", 54); break;
      case "pavers": ribbon(g, pts, "route-edge", "route-dirt", 46); stepsAlong(g, s, yAt, 62, STEP.paver); break;
      case "stones": case "pads": case "floes":
        if (!waterGround) ribbon(g, pts, "route-bank-s", "route-water-s", 92);
        stepsAlong(g, s, yAt, s.form === "stones" ? 86 : 92, s.form === "stones" ? STEP.stone : s.form === "pads" ? STEP.pad : STEP.floe);
        break;
      case "rocks": stepsAlong(g, s, yAt, 92, STEP.rock); break;
      case "crystals": ribbon(g, pts, "route-cave-edge", "route-cave", 50); stepsAlong(g, s, yAt, 90, STEP.crystal); break;
      case "clouds": stepsAlong(g, s, yAt, 84, STEP.cloud); break;
      case "bubbles": stepsAlong(g, s, yAt, 70, STEP.bubble); break;
      case "flight": stepsAlong(g, s, yAt, 46, STEP.sparkle); break;
      case "boardwalk": {
        for (let x = s.x0; x <= s.x1; x += 22) {
          const y = yAt(x);
          R(g, x - 9, y - 6, 18, 24, "route-plank", 3);
        }
        el(g, "path", { d: line(sample(x => yAt(x) - 30, s.x0, s.x1, 20)), class: "route-rope" });
        for (let x = s.x0 + 40; x < s.x1; x += 110) P(g, `M${x} ${yAt(x) + 18}V${yAt(x) - 34}`, "route-post");
        break;
      }
      case "steps": {
        for (let x = s.x0 + 20; x <= s.x1; x += 44) {
          const y = yAt(x);
          R(g, x - 26, y - 6, 52, 20, "step-stair", 4);
          R(g, x - 26, y + 12, 52, 34, "step-stair-side", 4);
        }
        break;
      }
      case "branch": {
        // A raised branch on forked supports, with its shadow on the ground.
        E(g, (s.x0 + s.x1) / 2, 470, (s.x1 - s.x0) / 2, 12, "creek-stone-shadow");
        for (let x = s.x0 + 90; x < s.x1 - 40; x += 180) P(g, `M${x - 14} 480L${x} ${yAt(x) + 22}L${x + 14} 480M${x} ${yAt(x) + 60}L${x - 26} ${yAt(x) + 30}`, "route-support");
        el(g, "path", { d: line(pts.map(([x, y]) => [x, y + 16])), class: "route-branch" });
        el(g, "path", { d: line(pts.map(([x, y]) => [x, y + 9])), class: "route-branch-light" });
        stepsAlong(g, s, yAt, 120, (g2, x, y) => { for (const r of [-30, 20]) P(g2, `M${x} ${y + 26}q-8-12 0-26q8 14 0 26Z`, "step-leaf").setAttribute("transform", `rotate(${r} ${x} ${y + 26})`); }, 0.15, 0.9);
        break;
      }
      case "log": {
        // A stream crossing the path, with a log across it.
        const mid = (s.x0 + s.x1) / 2;
        P(g, `M${mid - 70} 250Q${mid - 90} 330 ${mid - 60} 500H${mid + 80}Q${mid + 50} 330 ${mid + 70} 250Z`, "route-stream");
        P(g, `M${mid - 40} 300v24M${mid + 20} 380v24M${mid} 440v20`, "route-ripple-v");
        const left = sample(yAt, s.x0, mid - 90);
        const right = sample(yAt, mid + 90, s.x1);
        ribbon(g, left, "route-edge", "route-dirt", 54);
        ribbon(g, right, "route-edge", "route-dirt", 54);
        const ly = yAt(mid);
        R(g, mid - 110, ly - 4, 220, 22, "step-log", 11);
        E(g, mid + 110, ly + 7, 7, 11, "step-log-end");
        break;
      }
      case "rainbow": {
        ["h-band-1", "h-band-2", "h-band-3", "h-band-4", "h-band-5"].forEach((cls, k) => {
          el(g, "path", { d: line(pts.map(([x, y]) => [x, y + 2 + k * 7])), class: "route-band " + cls });
        });
        break;
      }
      default: ribbon(g, pts, "route-edge", "route-dirt", 54);
    }
  }

  /* ---------- Set pieces: what each goal looks like ---------- */

  function material(habitat) {
    if (["mountain", "desert", "savanna", "shore", "cave"].includes(habitat)) return "rock";
    if (habitat === "polar") return "ice";
    if (habitat === "rainbow") return "cloud";
    if (habitat === "ocean") return "coral";
    return "leaf";
  }

  const PIECES = {
    nook(g, s, yAt, habitat) {
      // An overhang over a soft bed at the goal, with a lantern.
      const x = s.x1, y = s.y1;
      const m = material(habitat);
      const cls = { rock: "h-rock", ice: "h-ice", cloud: "h-cloudsea", coral: "h-shellhouse", leaf: "h-leaf" }[m];
      P(g, `M${x - 120} ${y + 24}Q${x - 140} ${y - 120} ${x - 10} ${y - 150}Q${x + 130} ${y - 150} ${x + 120} ${y + 24}Z`, cls);
      if (m === "leaf") for (const [dx, dy, r] of [[-90, -110, 34], [-20, -150, 40], [60, -130, 36], [100, -80, 26]]) C(g, x + dx, y + dy, r, "h-leaf2");
      P(g, `M${x - 86} ${y + 24}Q${x - 90} ${y - 84} ${x} ${y - 98}Q${x + 90} ${y - 84} ${x + 86} ${y + 24}Z`, "piece-hollow");
      E(g, x + 26, y + 6, 46, 12, "piece-bed");
      P(g, `M${x - 40} ${y - 96}V${y - 60}`, "h-string");
      C(g, x - 40, y - 52, 13, "h-glow");
      C(g, x - 40, y - 52, 6, "h-gold");
      if (/rest|nap/i.test(s.stop.name)) for (const [dx, dy, r] of [[50, -58, 6], [64, -74, 8]]) C(g, x + dx, y + dy, r, "piece-zz");
    },
    ledge(g, s, yAt, habitat) {
      const x = s.x1, y = s.y1;
      P(g, `M${x - 160} 500L${x - 130} ${y + 30}Q${x - 100} ${y + 8} ${x - 40} ${y + 14}H${x + 110}L${x + 140} 500Z`, "h-rock");
      P(g, `M${x - 120} ${y + 60}l40 30M${x + 60} ${y + 50}l-30 50M${x - 20} ${y + 110}l50 20`, "h-rock-line");
      for (const [dx, dy] of [[-60, -120], [10, -160], [90, -110]]) P(g, `M${x + dx} ${y + dy - 9}l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z`, "step-sparkle");
      if (habitat !== "cave") for (const dx of [-30, 70]) P(g, `M${x + dx} ${y + 14}l-8-18M${x + dx} ${y + 14}l8-16`, "h-stem");
    },
    water(g, s, yAt, habitat, ctx) {
      const mid = (s.x0 + s.x1) / 2;
      const y = yAt(mid);
      // On a lagoon or sea the whole ground is already water.
      if (!ctx.waterGround) {
        E(g, mid, y + 8, 250, 60, "piece-pool-rim");
        E(g, mid, y + 8, 236, 50, "h-water");
      }
      P(g, `M${mid - 160} ${y + 20}h60M${mid + 70} ${y - 8}h70M${mid - 40} ${y + 40}h50`, "h-ripple");
      const name = s.stop.name;
      if (/oasis/i.test(name)) for (const dx of [-210, 200]) palm(g, mid + dx, y - 20, 0.9);
      else if (/fish|dip/i.test(name)) for (const dx of [-120, 90]) fish(g, mid + dx, y - 34);
      else if (/sparkle/i.test(name)) for (const dx of [-150, -40, 80, 170]) P(g, `M${mid + dx} ${y - 50}l4 9 9 4-9 4-4 9-4-9-9-4 9-4Z`, "step-sparkle");
      else if (/rain/i.test(name)) for (const dx of [-160, -70, 40, 140]) { P(g, `M${mid + dx} ${y - 120}q-6 10 0 14q6-4 0-14Z`, "piece-drop"); E(g, mid + dx, y + 10, 16, 5, "h-ripple"); }
      else if (/hole/i.test(name)) { for (const dx of [-230, 220]) reedClump(g, mid + dx, y + 40); E(g, mid + 150, y + 54, 50, 10, "piece-mud"); }
      else for (const dx of [-200, 210]) reedClump(g, mid + dx, y + 30);
    },
    tree(g, s, yAt, habitat) {
      const x = s.x1 + 40, base = 470, y = s.y1;
      const leaf = habitat === "eucalyptus" ? "h-gum" : habitat === "savanna" ? "h-acacia" : "h-leaf";
      P(g, `M${x - 34} ${base}Q${x - 26} ${y + 40} ${x - 22} ${y - 120}H${x + 22}Q${x + 26} ${y + 40} ${x + 34} ${base}Z`, "h-bark");
      P(g, `M${x - 34} ${base}q-30 6-46 16M${x + 34} ${base}q30 6 46 16`, "h-lodge-line");
      for (const [dx, dy, r] of [[-90, -150, 70], [70, -160, 74], [-10, -210, 76], [120, -100, 46]]) C(g, x + dx, y + dy, r, leaf);
      if (/fork/i.test(s.stop.name)) P(g, `M${x} ${y - 100}L${x - 60} ${y - 160}M${x} ${y - 100}L${x + 50} ${y - 170}`, "h-branch-line");
      if (/hollow/i.test(s.stop.name)) E(g, x, y - 50, 16, 24, "piece-hollow");
      if (/nap|canopy/i.test(s.stop.name) || s.variant === 2) P(g, `M${x - 120} ${y - 80}Q${x - 70} ${y - 50} ${x - 30} ${y - 82}`, "h-hammock");
      if (s.variant === 1) {
        // A nest with eggs in the fork.
        E(g, x - 40, y - 96, 30, 11, "h-nest");
        for (const dx of [-50, -38, -26]) E(g, x + dx, y - 104, 6, 8, "piece-egg");
      }
    },
    rock(g, s, yAt, habitat) {
      const x = s.x1 + 10, y = s.y1;
      const name = s.stop.name;
      if (/entrance/i.test(name)) {
        P(g, `M${x - 130} ${y + 30}Q${x - 140} ${y - 150} ${x} ${y - 170}Q${x + 140} ${y - 150} ${x + 130} ${y + 30}Z`, "h-rock");
        P(g, `M${x - 70} ${y + 30}Q${x - 74} ${y - 100} ${x} ${y - 108}Q${x + 74} ${y - 100} ${x + 70} ${y + 30}Z`, "h-cave");
        return;
      }
      const cls = habitat === "polar" ? "h-ice" : /warm/i.test(name) ? "piece-warmrock" : "h-rock";
      P(g, `M${x - 110} ${y + 30}Q${x - 120} ${y - 70} ${x - 30} ${y - 90}Q${x + 80} ${y - 100} ${x + 110} ${y + 30}Z`, cls);
      P(g, `M${x - 70} ${y - 60}q30-20 70-10`, "h-rock-line");
      if (/mossy/i.test(name)) for (const [dx, dy, r] of [[-60, -76, 20], [-20, -92, 24], [30, -90, 20]]) C(g, x + dx, y + dy, r, "h-leaf2");
      if (/warm/i.test(name)) for (const dx of [-40, 10, 60]) P(g, `M${x + dx} ${y - 120}q-8-10 0-20t0-20`, "h-smoke");
      if (/shore/i.test(name)) for (const dx of [-140, 130]) E(g, x + dx, y + 40, 40, 9, "h-pool");
    },
    marsh(g, s, yAt) {
      for (let x = s.x0 + 30; x < s.x1; x += 70) { reedClump(g, x, yAt(x) - 14, 1.1); reedClump(g, x + 30, yAt(x + 30) + 64, 1.2); }
      if (/bank|mud/i.test(s.stop.name)) for (let x = s.x0 + 80; x < s.x1; x += 150) E(g, x, yAt(x) + 46, 46, 10, "piece-mud");
    },
    sea(g, s, yAt) {
      const x = s.x1, y = s.y1;
      const name = s.stop.name;
      if (/reef/i.test(name)) {
        P(g, `M${x - 120} ${y + 30}Q${x - 110} ${y - 140} ${x} ${y - 150}Q${x + 110} ${y - 140} ${x + 120} ${y + 30}H${x + 70}Q${x + 70} ${y - 90} ${x} ${y - 94}Q${x - 70} ${y - 90} ${x - 70} ${y + 30}Z`, "h-coral-fill");
        for (const dx of [-100, -40, 30, 90]) P(g, `M${x + dx} ${y - 120}v-30m0 14l-12-12m12 6l12-14`, "h-coral");
      } else if (/seaweed|garden/i.test(name)) {
        for (let k = s.x0 + 40; k < s.x1; k += 60) kelp(g, k, yAt(k) - 10, 1.2);
      } else if (/open/i.test(name)) {
        for (let k = 0; k < 6; k++) fish(g, x - 160 + k * 46, y - 120 + (k % 2) * 26);
      } else {
        for (let k = s.x0 + 30; k < s.x1; k += 46) P(g, `M${k} ${yAt(k) + 40}q12-6 24 0`, "piece-ripple-sand");
        for (const dx of [-80, 0, 70]) E(g, x + dx, y + 30, 14, 6, "step-sanddollar");
      }
    },
    beach(g, s, yAt) {
      const x = s.x1, y = s.y1;
      if (/burrow/i.test(s.stop.name)) {
        P(g, `M${x - 90} ${y + 20}Q${x} ${y - 90} ${x + 90} ${y + 20}Z`, "piece-sandmound");
        E(g, x, y + 4, 30, 22, "h-cave");
      }
      for (let k = s.x0 + 60; k < s.x1; k += 120) { E(g, k, yAt(k) + 50, 12, 6, "h-shell"); P(g, `M${k + 40} ${yAt(k + 40) - 50}l0-10l6 4z`, "h-starfish"); }
    },
    house(g, s, yAt) {
      const x = s.x1, y = s.y1;
      if (/corner|play/i.test(s.stop.name)) {
        // A playground: swing frame, swing and sandbox.
        P(g, `M${x - 90} ${y + 20}L${x - 60} ${y - 130}L${x - 30} ${y + 20}M${x + 50} ${y + 20}L${x + 80} ${y - 130}L${x + 110} ${y + 20}M${x - 66} ${y - 128}H${x + 86}`, "piece-swing-frame");
        P(g, `M${x - 10} ${y - 128}V${y - 40}M${x + 30} ${y - 128}V${y - 40}`, "h-string");
        R(g, x - 18, y - 42, 56, 10, "h-plank", 3);
        R(g, x - 200, y - 6, 110, 30, "piece-sandbox", 6);
        E(g, x - 145, y - 2, 46, 10, "piece-sandmound");
        C(g, x + 150, y, 20, "piece-ball");
        P(g, `M${x + 130} ${y}h40M${x + 150} ${y - 20}v40`, "piece-ball-line");
        return;
      }
      R(g, x - 110, y - 170, 220, 190, "h-wall");
      P(g, `M${x - 130} ${y - 168}L${x} ${y - 240} ${x + 130} ${y - 168}Z`, "h-roof");
      if (/window/i.test(s.stop.name)) {
        R(g, x - 50, y - 130, 100, 70, "h-window", 6);
        P(g, `M${x} ${y - 130}V${y - 60}M${x - 50} ${y - 95}H${x + 50}`, "h-window-line");
        R(g, x - 60, y - 60, 120, 18, "h-plank");
        for (const dx of [-40, -10, 20, 45]) { C(g, x + dx, y - 66, 8, "h-petal"); C(g, x + dx, y - 66, 3, "h-gold"); }
        for (const a of [-40, -20, 0]) P(g, `M${x + 150} ${y - 230}l${-60 * Math.cos(a / 57)} ${60 * Math.sin(-a / 57)}`, "piece-ray");
      } else {
        P(g, `M${x - 30} ${y + 20}V${y - 60}Q${x} ${y - 90} ${x + 30} ${y - 60}V${y + 20}Z`, "h-door");
      }
    },
    grove(g, s, yAt, habitat) {
      for (let k = s.x1 - 160; k < s.x1 + 160; k += 26) cane(g, k, yAt(Math.min(k, s.x1)) - 30 + ((k / 26) % 2) * 6, 1.3);
      if (/snack/i.test(s.stop.name)) for (const dx of [-50, -20, 10]) P(g, `M${s.x1 + dx} ${s.y1 + 10}q-14-20 0-40q14 20 0 40Z`, "h-leaf2");
      if (s.variant === 1 || /grove/i.test(s.stop.name)) P(g, `M${s.x1 - 150} ${s.y1 + 10}Q${s.x1 - 150} ${s.y1 - 170} ${s.x1} ${s.y1 - 180}Q${s.x1 + 150} ${s.y1 - 170} ${s.x1 + 150} ${s.y1 + 10}`, "piece-arch-leaves");
    },
    flowers(g, s, yAt, habitat) {
      const name = s.stop.name;
      for (let k = s.x0 + 40; k < s.x1; k += 54) {
        const y = yAt(k);
        if (/clover/i.test(name)) { clover(g, k, y - 42); clover(g, k + 20, y + 56); }
        else if (/clearing/i.test(name)) { fern(g, k, y - 30); fern(g, k + 26, y + 70); }
        else { flower(g, k, y - 34, 1); flower(g, k + 24, y + 70, 1.1); }
      }
      if (/clearing/i.test(name)) P(g, `M${s.x1 - 120} 0L${s.x1 - 40} 0 ${s.x1 + 80} 420 ${s.x1 - 60} 420Z`, "h-beam");
      if (/bed|garden/i.test(name)) { R(g, s.x1 - 60, s.y1 - 26, 120, 14, "h-plank", 4); for (const dx of [-50, 46]) R(g, s.x1 + dx, s.y1 - 12, 8, 22, "h-plank"); }
      // One big focal piece per flower stop, different in each habitat.
      const fx = s.x1 + 60, fy = s.y1;
      if (habitat === "mountain") {
        P(g, `M${fx - 60} ${fy + 20}Q${fx - 64} ${fy - 50} ${fx} ${fy - 60}Q${fx + 64} ${fy - 50} ${fx + 60} ${fy + 20}Z`, "h-rock");
        for (const [dx, dy] of [[-20, -66], [16, -70]]) { for (let k = 0; k < 6; k++) el(g, "ellipse", { cx: fx + dx, cy: fy + dy - 9, rx: 4, ry: 9, class: "piece-edelweiss", transform: `rotate(${k * 60} ${fx + dx} ${fy + dy})` }); C(g, fx + dx, fy + dy, 4, "h-gold"); }
      } else if (habitat === "cottage") {
        R(g, fx - 70, fy - 30, 140, 46, "piece-planter", 6);
        for (const dx of [-46, -16, 14, 44]) { P(g, `M${fx + dx} ${fy - 30}l-6-26M${fx + dx} ${fy - 30}l6-24`, "h-stem"); C(g, fx + dx, fy - 36, 9, dx < 0 ? "piece-cabbage" : "h-carrot"); }
      } else if (habitat === "rainbow") {
        for (let k = 0; k < 6; k++) el(g, "ellipse", { cx: fx, cy: fy - 104, rx: 18, ry: 34, class: k % 2 ? "h-band-2" : "h-band-1", transform: `rotate(${k * 60} ${fx} ${fy - 74})` });
        C(g, fx, fy - 74, 16, "h-gold");
        P(g, `M${fx} ${fy + 10}V${fy - 60}`, "h-stem");
      } else if (habitat === "meadow" || habitat === "cottage") {
        P(g, `M${fx} ${fy + 20}V${fy - 60}`, "piece-post");
        P(g, `M${fx - 30} ${fy - 60}Q${fx - 34} ${fy - 116} ${fx} ${fy - 120}Q${fx + 34} ${fy - 116} ${fx + 30} ${fy - 60}Z`, "piece-hive");
        P(g, `M${fx - 30} ${fy - 74}H${fx + 30}M${fx - 32} ${fy - 90}H${fx + 32}M${fx - 26} ${fy - 106}H${fx + 26}`, "piece-hive-line");
        E(g, fx, fy - 66, 8, 6, "h-door");
        for (const [dx, dy] of [[44, -110], [58, -88]]) { E(g, fx + dx, fy + dy, 6, 4, "h-gold"); P(g, `M${fx + dx - 2} ${fy + dy - 2}l-4-6M${fx + dx + 2} ${fy + dy - 2}l4-6`, "piece-wing"); }
      }
    },
    trail(g, s, yAt, habitat) {
      const x = s.x1 + 30, y = s.y1;
      // A signpost at the goal.
      P(g, `M${x} ${y + 20}V${y - 80}`, "piece-post");
      P(g, `M${x - 6} ${y - 78}h56l14 12-14 12h-56Z`, "h-sign");
      P(g, `M${x + 6} ${y - 50}h-50l-14 12 14 12h50Z`, "h-sign");
      const name = s.stop.name;
      if (/sunny|plain/i.test(name)) for (let k = s.x0 + 30; k < s.x1; k += 46) tuft(g, k, yAt(k) - 26, 1.2, "h-grass-gold");
      else if (/grass/i.test(name)) for (let k = s.x0 + 30; k < s.x1; k += 40) tuft(g, k, yAt(k) + 50, 1.3, habitat === "savanna" ? "h-grass-gold" : "h-leaf2");
      else if (/woodland|leafy/i.test(name)) for (let k = s.x0 + 40; k < s.x1; k += 60) fern(g, k, yAt(k) - 28);
      else if (/bamboo/i.test(name)) for (let k = s.x0 + 30; k < s.x1; k += 50) cane(g, k, yAt(k) - 34, 1);
      else if (/sandy|rocky/i.test(name)) for (let k = s.x0 + 50; k < s.x1; k += 110) E(g, k, yAt(k) + 52, 26, 10, "h-rock");
    },
    bridge(g, s) {
      for (const dx of [s.x0 + 20, s.x1 - 20]) for (const [ox, r] of [[-26, 26], [0, 34], [28, 24]]) C(g, dx + ox, s.y0 + 40, r, "h-cloud");
    },
    flight(g, s, yAt) {
      const mid = (s.x0 + s.x1) / 2;
      C(g, mid, 70, 40, "h-moon-halo");
      C(g, mid, 70, 26, "h-moon");
      for (const [dx, dy] of [[-200, 40], [-120, 100], [130, 60], [210, 120]]) C(g, mid + dx, dy, 3, "h-star");
    }
  };

  // Small drawings.
  function flower(g, x, y, s = 1) {
    const f = G(g, x, y, s);
    P(f, "M0 0V-26", "h-stem");
    for (let i = 0; i < 5; i++) el(f, "ellipse", { cx: 0, cy: -38, rx: 5, ry: 9, class: "h-petal", transform: `rotate(${i * 72} 0 -30)` });
    C(f, 0, -30, 5, "h-gold");
  }
  function clover(g, x, y) { for (let i = 0; i < 3; i++) C(g, x + Math.cos(i * 2.1) * 7, y + Math.sin(i * 2.1) * 7, 8, "h-leaf2"); }
  function fern(g, x, y) { P(G(g, x, y), "M0 0Q-1-40-20-64M-4-15Q-40-10-39-31Q-16-34-4-15M-9-32Q-43-30-41-48Q-20-48-9-32ZM-3-16Q23-39 29-24Q28-8-3-16", "h-leaf"); }
  function tuft(g, x, y, s, cls) { P(G(g, x, y, s), "M-25 0Q-30-22-37-28Q-14-24-11-5Q-14-40-4-48L3-8Q14-36 27-37L13-5Q31-18 36-12L26 0Z", cls); }
  function cane(g, x, y, s = 1) { const c = G(g, x, y, s); P(c, "M-5 0L-8-120H2L5 0Z", "h-cane"); P(c, "M-8-30H4M-8-60H3M-8-90H2", "h-cane-line"); P(c, "M-4-70Q-40-100-38-74Q-26-60-4-70", "h-leaf"); }
  function reedClump(g, x, y, s = 1) { const r = G(g, x, y, s); P(r, "M-10 0L-15-60M0 0V-72M10 0L20-56", "h-stem"); P(r, "M-15-58L-18-74M0-70V-90M20-55L24-70", "h-cattail"); }
  function palm(g, x, y, s) { const p = G(g, x, y, s); P(p, "M-4 0Q8-60-6-120l10-2Q24-60 8 0Z", "h-bark"); P(p, "M0-120q-55-29-88 8 43-18 88-8-65 5-60 43 24-32 60-43 46-38 88 9-50-8-88-9 58 3 69 39-38-28-69-39Z", "h-leaf"); }
  function fish(g, x, y) { const f = G(g, x, y); E(f, 0, 0, 14, 8, "piece-fish"); P(f, "M-12 0l-10-8v16Z", "piece-fish"); C(f, 6, -2, 2, "h-door"); }
  function kelp(g, x, y, s) { P(G(g, x, y, s), "M0 0Q-25-25-8-45T-12-85Q18-72 5-48T14 0Z", "h-kelp"); }

  /* ---------- Build ---------- */

  function build(layer, { stops = [], count = 4, habitat = "meadow", seed = 0, home = false, waterGround = false } = {}) {
    layer.replaceChildren();
    const plan = layout(stops, count, habitat, seed, home);
    const yAt = makeY(plan);
    const back = el(layer, "g", { class: "section-back" });
    const path = el(layer, "g", { class: "section-path" });
    // Lead-in and lead-out so the path starts and ends off the edges.
    const first = plan.sections[0];
    const last = plan.sections[plan.sections.length - 1];
    const leadForm = first.form === "flight" || first.form === "rainbow" || first.form === "clouds" ? "clouds" : "lead";
    if (leadForm === "lead") ribbon(path, [[-40, first.y0], [first.x0, first.y0]], "route-edge", endClass(habitat), 54);
    const zones = el(layer, "g", { class: "section-zones" });
    layer.insertBefore(zones, back);
    for (const s of plan.sections) {
      // A tinted patch of ground marks each section as its own place.
      const top = Math.min(s.y0, s.y1) - 70;
      P(zones, `M${s.x0 - 20} 520C${s.x0 - 40} ${top + 120} ${s.x0 + 30} ${top + 10} ${s.x0 + 120} ${top + 6}Q${(s.x0 + s.x1) / 2} ${top - 16} ${s.x1 - 100} ${top + 8}C${s.x1 + 10} ${top + 14} ${s.x1 + 50} ${top + 130} ${s.x1 + 30} 520Z`, "section-zone section-zone-" + s.kind);
      // At home the house replaces the last stop's set piece.
      if (!(home && s === last)) PIECES[s.kind](back, s, yAt, habitat, { waterGround });
      drawForm(path, s, yAt, habitat, waterGround);
      if (home && s === last) {
        // A lantern-lit welcome lane up to the front door.
        for (let x = (s.x0 + s.x1) / 2; x <= s.x1 + 80; x += 90) {
          const y = yAt(Math.min(x, s.x1));
          P(back, `M${x} ${y - 30}V${y - 110}`, "piece-post");
          C(back, x, y - 116, 14, "h-glow");
          C(back, x, y - 116, 7, "h-gold");
        }
      }
    }
    ribbon(path, [[last.x1, last.y1], [plan.width + 40, last.y1]], "route-edge", endClass(habitat), 54);
    return {
      width: plan.width,
      start: plan.start,
      end: plan.end,
      yAt,
      goals: plan.sections.map(s => [s.x1, s.y1, s.kind, s.form, s.stop.name]),
      forms: plan.sections.map(s => s.form),
      kinds: plan.sections.map(s => s.kind),
      // How far above the path the animal floats in each section (flying or swimming spots).
      liftAt(x) {
        const s = plan.sections.find(sec => x >= sec.x0 && x <= sec.x1);
        if (!s) return 0;
        const t = (x - s.x0) / (s.x1 - s.x0);
        return s.form === "flight" || s.form === "bubbles" ? 30 * Math.sin(Math.PI * t) : 0;
      }
    };
  }

  window.BB_SECTIONS = { build, kindOf };
})();
