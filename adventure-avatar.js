/* Whole-body animals for Adventure Mode.
   Each animal is a simple SVG body in one of a few body plans, with its
   Twemoji face on top. Legs, wings, fins and tails follow a gait cycle driven
   by the distance walked, so a bunny hops, a penguin waddles and an owl flaps.
   Local coordinates: facing right, feet on y = 0. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  function el(parent, tag, attributes) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }
  const g = (parent, cls) => el(parent, "g", cls ? { class: cls } : {});
  const set = (node, transform) => node.setAttribute("transform", transform);

  /* id: [plan, body colour, accent colour, scale, extra]
     Plans: quad, heavy, tall, neck, small, low, hop, waddle, wader, fly, flutter,
     swim, ceph, jelly, crab, turtle, snail, snake, ape, seal. */
  const ANIMALS = {
    cat: ["quad", "#f2a541", "#fbd9a0", 1, "tail-up"], dog: ["quad", "#c98b4e", "#f1d7b5", 1, "tail-up"],
    fox: ["quad", "#e8742c", "#fff3e6", 1, "bushy"], wolf: ["quad", "#8e959e", "#e3e6ea", 1.05, "bushy"],
    lion: ["quad", "#e0a540", "#f6d690", 1.1, "tuft"], tiger: ["quad", "#ef8a2e", "#2b2b2b", 1.1, "stripes"],
    leopard: ["quad", "#e7b45a", "#5a4126", 1.05, "spots"], raccoon: ["quad", "#8b8f96", "#3b3d42", 0.95, "ringed"],
    skunk: ["quad", "#2f2f35", "#f4f4f4", 0.9, "skunk"], boar: ["quad", "#6e5545", "#4a382c", 1, "thin"],
    pig: ["quad", "#f4a7b9", "#f8c6d2", 0.95, "curly"], sheep: ["quad", "#f4f1ea", "#3a3a3a", 1, "wool"],
    goat: ["quad", "#e9e2d6", "#8a7a66", 1, "thin"], koala: ["heavy", "#9aa3ad", "#d8dde2", 0.75, "none"],
    unicorn: ["tall", "#f6f0ff", "#f5a6d6", 1, "mane"], horse: ["tall", "#9a5f3a", "#3a2416", 1.05, "mane"],
    donkey: ["tall", "#9b9aa0", "#5a5a60", 1, "thin"], deer: ["tall", "#b8794a", "#f4e6d4", 1, "short"],
    zebra: ["tall", "#f4f4f4", "#2b2b2b", 1.05, "stripes"], llama: ["neck", "#efe3cf", "#c9b79a", 1, "short"],
    camel: ["neck", "#d4a464", "#b88848", 1.1, "hump"], giraffe: ["neck", "#e9b04e", "#9a5a28", 1.15, "spots"],
    bear: ["heavy", "#8a5a3c", "#6b432c", 1.15, "none"], panda: ["heavy", "#f4f4f4", "#2b2b2b", 1.1, "panda"],
    elephant: ["heavy", "#9ea7b3", "#8a939f", 1.3, "thin"], rhinoceros: ["heavy", "#a3a3a8", "#8a8a90", 1.25, "thin"],
    hippopotamus: ["heavy", "#a68aa8", "#c7aec8", 1.25, "thin"], bison: ["heavy", "#6b4a32", "#4a3222", 1.2, "hump"],
    moose: ["heavy", "#6e4b33", "#4e3423", 1.2, "short"], cow: ["heavy", "#f4f4f4", "#2b2b2b", 1.15, "spots"],
    mouse: ["small", "#a9a9b3", "#f2b6c4", 0.75, "long"], hamster: ["small", "#e8b070", "#fbe7cc", 0.75, "none"],
    hedgehog: ["small", "#8a6a4e", "#d9c2a5", 0.8, "spikes"], squirrel: ["small", "#b9653a", "#e9b88a", 0.8, "squirrel"],
    beaver: ["small", "#8a5a35", "#5e3c22", 0.95, "paddle"], badger: ["low", "#6f6f73", "#e8e8e8", 0.95, "short"],
    otter: ["low", "#7a5235", "#c9a27a", 0.95, "long"], crocodile: ["low", "#5c8a4a", "#8fbf6a", 1.2, "croc"],
    lizard: ["low", "#8fbf4a", "#c8e08a", 0.8, "long"],
    bunny: ["hop", "#b8bcc8", "#f1f2f6", 0.9, "puff"], kangaroo: ["hop", "#c08050", "#e6c09a", 1.15, "roo"],
    frog: ["hop", "#6dbb4a", "#c8e88a", 0.8, "none"],
    penguin: ["waddle", "#2b2f3a", "#f4f4f4", 0.95, "none"], duck: ["waddle", "#b08a5a", "#f2a23a", 0.85, "none"],
    goose: ["waddle", "#e3e3e3", "#f2a23a", 0.95, "none"], swan: ["waddle", "#f7f7f7", "#f2a23a", 1, "none"],
    chicken: ["waddle", "#f4f4f4", "#f2a23a", 0.85, "none"], turkey: ["waddle", "#7a5235", "#e2a64b", 1, "fan"],
    peacock: ["waddle", "#2a7fa8", "#3fa66a", 1, "peacock"], flamingo: ["wader", "#f49ac1", "#f7c3da", 1, "none"],
    owl: ["fly", "#9a6a45", "#e8cfa8", 0.9, "none"], eagle: ["fly", "#6b4a32", "#f4f4f4", 1.05, "none"],
    parrot: ["fly", "#e94b3c", "#3c7be9", 0.9, "none"], dove: ["fly", "#e8eef4", "#c9d3dd", 0.85, "none"],
    bat: ["fly", "#5b4a6e", "#3a2e48", 0.9, "bat"],
    butterfly: ["flutter", "#f39c3c", "#6b3c1e", 0.85, "none"], bee: ["flutter", "#f2c230", "#2b2b2b", 0.75, "bee"],
    dolphin: ["swim", "#6d9fc6", "#dce9f4", 1.1, "none"], whale: ["swim", "#4f7aa8", "#c9dbea", 1.4, "none"],
    shark: ["swim", "#8aa0b2", "#eef2f5", 1.2, "fin"], shrimp: ["swim", "#f49b7a", "#fbd1bf", 0.7, "none"],
    octopus: ["ceph", "#e5677d", "#f6a7b5", 1, "none"], squid: ["ceph", "#f2a07b", "#fbd1bf", 1, "none"],
    jellyfish: ["jelly", "#c9a3e8", "#efe1fa", 1, "none"], crab: ["crab", "#e45a3c", "#f3a08a", 0.9, "none"],
    lobster: ["crab", "#d2452e", "#ef8a74", 1, "none"], ladybug: ["crab", "#e0402f", "#2b2b2b", 0.75, "dots"],
    turtle: ["turtle", "#6aa564", "#8a6a3c", 1, "none"], snail: ["snail", "#d7a35a", "#e8c79a", 0.85, "none"],
    snake: ["snake", "#6bb04a", "#b6dd8a", 1, "none"], seal: ["seal", "#8e9aa6", "#c3ccd5", 1.05, "none"],
    monkey: ["ape", "#9a6a45", "#e8c9a6", 0.95, "curl"], gorilla: ["ape", "#3b3b40", "#5b5b62", 1.2, "none"],
    orangutan: ["ape", "#c8642a", "#e8975e", 1.1, "none"], sloth: ["ape", "#a08a6e", "#d4c3a8", 1, "slow"]
  };

  // Gait cycles per second while walking. Brushing moves the animal only a few
  // units a second, so the gait runs on time rather than distance.
  const CADENCE = { quad: 1.7, heavy: 0.9, tall: 1.4, neck: 1.1, small: 2.6, low: 1.8, hop: 1.1, waddle: 2.2, wader: 1.2,
    fly: 1.4, flutter: 2.6, swim: 0.9, ceph: 0.8, jelly: 0.6, crab: 2.4, turtle: 0.9, snail: 0.6, snake: 1.2, ape: 1.3, seal: 1.2 };

  function leg(parent, x, y, length, width, color) {
    const pivot = el(parent, "g", { transform: `translate(${x} ${y})` });
    el(pivot, "rect", { x: -width / 2, y: 0, width, height: length, rx: width / 2, fill: color });
    return pivot;
  }

  function tail(parent, kind, x, y, color, accent) {
    const pivot = el(parent, "g", { transform: `translate(${x} ${y})` });
    const p = d => el(pivot, "path", { d, fill: "none", stroke: color, "stroke-width": 7, "stroke-linecap": "round" });
    if (kind === "bushy") { el(pivot, "path", { d: "M0 0Q-26-6-36-26Q-14-28 0-8Z", fill: color }); el(pivot, "path", { d: "M-30-20Q-36-26-36-26Q-30-26-26-24Z", fill: accent }); }
    else if (kind === "ringed") { p("M0 0Q-24-4-30-24"); for (const t of [[-12, -4], [-22, -12], [-28, -20]]) el(pivot, "circle", { cx: t[0], cy: t[1], r: 3.5, fill: accent }); }
    else if (kind === "skunk") { el(pivot, "path", { d: "M0 0Q-34 0-30-40Q-10-30 0-6Z", fill: color }); el(pivot, "path", { d: "M-6-4Q-24-8-24-32", fill: "none", stroke: accent, "stroke-width": 5, "stroke-linecap": "round" }); }
    else if (kind === "curly") el(pivot, "path", { d: "M0 0q-10-2-10-8t6-4", fill: "none", stroke: accent, "stroke-width": 3 });
    else if (kind === "wool" || kind === "puff" || kind === "none" || kind === "spikes" || kind === "panda" || kind === "short") el(pivot, "circle", { cx: -3, cy: -2, r: kind === "puff" ? 8 : 4, fill: kind === "puff" ? accent : color });
    else if (kind === "tuft") { p("M0 0Q-18 4-24-14"); el(pivot, "circle", { cx: -24, cy: -15, r: 5, fill: "#8a5a28" }); }
    else if (kind === "mane") el(pivot, "path", { d: "M0 0Q-20 4-24 28Q-12 20-2 8Z", fill: accent });
    else if (kind === "long") p("M0 0Q-26 6-40-6");
    else if (kind === "squirrel") el(pivot, "path", { d: "M0 0Q-30 0-28-34Q-24-50-8-46Q-20-30-2-8Z", fill: color });
    else if (kind === "paddle") el(pivot, "ellipse", { cx: -16, cy: 2, rx: 16, ry: 6, fill: accent });
    else if (kind === "roo") el(pivot, "path", { d: "M0 0Q-30 8-46 22L-40 26Q-20 16 2 8Z", fill: color });
    else if (kind === "croc") el(pivot, "path", { d: "M0-6L-50 4 0 6Z", fill: color });
    else if (kind === "curl") p("M0 0Q-20 6-22-12Q-22-24-12-22");
    else p("M0 0Q-18 2-24-12");
    return pivot;
  }

  function markings(parent, kind, cx, cy, rx, ry, accent) {
    if (kind === "stripes") for (const dx of [-0.5, -0.15, 0.2, 0.5]) el(parent, "path", { d: `M${cx + dx * rx} ${cy - ry * 0.9}q4 ${ry * 0.6} 0 ${ry * 1.1}`, fill: "none", stroke: accent, "stroke-width": 4, "stroke-linecap": "round" });
    if (kind === "spots") for (const [dx, dy] of [[-0.5, -0.2], [0, -0.4], [0.35, 0.1], [-0.2, 0.3]]) el(parent, "circle", { cx: cx + dx * rx, cy: cy + dy * ry, r: ry * 0.22, fill: accent });
    if (kind === "panda") el(parent, "path", { d: `M${cx - rx * 0.3} ${cy - ry}h${rx * 0.6}v${ry * 2}h-${rx * 0.6}Z`, fill: accent });
    if (kind === "wool") for (const [dx, dy] of [[-0.6, -0.5], [-0.2, -0.8], [0.2, -0.8], [0.6, -0.5], [0.7, 0.1], [-0.7, 0.1]]) el(parent, "circle", { cx: cx + dx * rx, cy: cy + dy * ry, r: ry * 0.45, fill: "#ffffff" });
    if (kind === "spikes") el(parent, "path", { d: `M${cx - rx} ${cy}l6-14 6 10 6-16 6 12 6-16 6 12 6-14 6 10 6-12 4 18Z`, fill: accent === "#d9c2a5" ? "#5b4330" : accent });
    if (kind === "hump") el(parent, "ellipse", { cx: cx - rx * 0.1, cy: cy - ry * 0.9, rx: rx * 0.45, ry: ry * 0.55, fill: accent });
    if (kind === "dots") for (const [dx, dy] of [[-0.4, -0.2], [0.1, -0.5], [0.3, 0.1], [-0.1, 0.2]]) el(parent, "circle", { cx: cx + dx * rx, cy: cy + dy * ry, r: 3.5, fill: accent });
    if (kind === "bee") for (const dx of [-0.3, 0.1]) el(parent, "rect", { x: cx + dx * rx, y: cy - ry, width: rx * 0.22, height: ry * 2, fill: accent });
  }

  /* Each builder draws the body into `rig` and returns where the head goes and
     how to pose the parts for a gait phase (radians). */
  const PLANS = {
    quad(rig, c, a, extra, o = {}) {
      const legLen = o.legLen ?? 26, rx = o.rx ?? 38, ry = o.ry ?? 18, w = o.legWidth ?? 9;
      const back = g(rig);
      const legs = [leg(back, -rx * 0.55, -legLen - 2, legLen + 2, w, a === "#2b2b2b" ? a : shade(c)), leg(back, rx * 0.55, -legLen - 2, legLen + 2, w, a === "#2b2b2b" ? a : shade(c))];
      const t = tail(rig, extra, -rx + 4, -legLen - ry * 0.6, c, a);
      const body = g(rig);
      el(body, "ellipse", { cx: 0, cy: -legLen - ry + 4, rx, ry, fill: c });
      el(body, "ellipse", { cx: 4, cy: -legLen - ry * 0.4 + 4, rx: rx * 0.7, ry: ry * 0.45, fill: o.belly ?? a, opacity: o.belly ? 1 : 0.35 });
      markings(body, extra, 0, -legLen - ry + 4, rx, ry, a);
      const front = [leg(rig, -rx * 0.45, -legLen - 2, legLen + 2, w, panda(extra, c, a)), leg(rig, rx * 0.65, -legLen - 2, legLen + 2, w, panda(extra, c, a))];
      if (o.neck) el(body, "path", { d: `M${rx * 0.5} ${-legLen - ry}L${rx * 0.9} ${-legLen - ry - o.neck}`, stroke: c, "stroke-width": 16, "stroke-linecap": "round" });
      const amp = o.amp ?? 30;
      return {
        head: [rx * 0.95, -legLen - ry * 2 - (o.neck ?? 0) + 2],
        pose(p) {
          const s = Math.sin(p) * amp;
          set(front[0], `translate(${-rx * 0.45} ${-legLen - 2}) rotate(${s})`);
          set(front[1], `translate(${rx * 0.65} ${-legLen - 2}) rotate(${-s})`);
          set(legs[0], `translate(${-rx * 0.55} ${-legLen - 2}) rotate(${-s})`);
          set(legs[1], `translate(${rx * 0.55} ${-legLen - 2}) rotate(${s})`);
          set(t, `translate(${-rx + 4} ${-legLen - ry * 0.6}) rotate(${Math.sin(p * 0.5) * 12})`);
          return { y: -Math.abs(Math.cos(p)) * (o.bob ?? 2.5), rotate: 0 };
        }
      };
    },
    heavy: (rig, c, a, e) => PLANS.quad(rig, c, a, e, { legLen: 24, rx: 46, ry: 25, legWidth: 11, amp: 14, bob: 3 }),
    tall: (rig, c, a, e) => PLANS.quad(rig, c, a, e, { legLen: 34, rx: 32, ry: 15, legWidth: 7, amp: 26, bob: 3 }),
    neck: (rig, c, a, e) => PLANS.quad(rig, c, a, e, { legLen: 34, rx: 30, ry: 15, legWidth: 7, amp: 24, bob: 2, neck: 30 }),
    small: (rig, c, a, e) => PLANS.quad(rig, c, a, e, { legLen: 12, rx: 28, ry: 15, legWidth: 7, amp: 40, bob: 3 }),
    low: (rig, c, a, e) => {
      const r = PLANS.quad(rig, c, a, e, { legLen: 9, rx: 36, ry: 11, legWidth: 7, amp: 34, bob: 1 });
      return { head: [40, -40], pose: p => ({ ...r.pose(p), rotate: Math.sin(p) * 2 }) };
    },
    hop(rig, c, a, extra) {
      const t = tail(rig, extra, -24, -26, c, a);
      const hind = el(rig, "g", { transform: "translate(-12 -14)" });
      el(hind, "ellipse", { cx: 0, cy: 6, rx: 16, ry: 8, fill: shade(c) });
      el(hind, "ellipse", { cx: 10, cy: 13, rx: 13, ry: 4, fill: shade(c) });
      el(rig, "ellipse", { cx: -2, cy: -30, rx: 24, ry: 20, fill: c });
      el(rig, "ellipse", { cx: 4, cy: -24, rx: 14, ry: 12, fill: a, opacity: 0.6 });
      const front = leg(rig, 14, -20, 18, 6, shade(c));
      return {
        head: [16, -60],
        pose(p) {
          const air = Math.max(0, Math.sin(p));
          set(hind, `translate(-12 -14) rotate(${air * -35})`);
          set(front, `translate(14 -20) rotate(${air * 35 - 10})`);
          set(t, `translate(-24 -26) rotate(${air * 15})`);
          return { y: -air * 26, rotate: (air - 0.4) * -10 };
        }
      };
    },
    waddle(rig, c, a, extra) {
      if (extra === "peacock" || extra === "fan") {
        const fan = el(rig, "g", { transform: "translate(-16 -34)" });
        for (let i = -3; i <= 3; i++) {
          const f = el(fan, "g", { transform: `rotate(${i * 18 - 20})` });
          el(f, "ellipse", { cx: 0, cy: -26, rx: 8, ry: 26, fill: extra === "peacock" ? a : c });
          if (extra === "peacock") el(f, "circle", { cx: 0, cy: -44, r: 5, fill: "#2a7fa8" });
        }
      }
      const feet = [leg(rig, -6, -8, 8, 6, "#f2a23a"), leg(rig, 8, -8, 8, 6, "#f2a23a")];
      el(rig, "ellipse", { cx: 0, cy: -30, rx: 22, ry: 26, fill: c });
      el(rig, "ellipse", { cx: 6, cy: -26, rx: 13, ry: 18, fill: a, opacity: extra === "peacock" || extra === "fan" ? 0 : 0.85 });
      const wing = el(rig, "g", { transform: "translate(-6 -36)" });
      el(wing, "ellipse", { cx: -4, cy: 10, rx: 9, ry: 16, fill: shade(c) });
      return {
        head: [8, -62],
        pose(p) {
          set(feet[0], `translate(-6 -8) rotate(${Math.sin(p) * 25})`);
          set(feet[1], `translate(8 -8) rotate(${-Math.sin(p) * 25})`);
          set(wing, `translate(-6 -36) rotate(${Math.sin(p * 2) * 10})`);
          return { y: -Math.abs(Math.sin(p)) * 3, rotate: Math.sin(p) * 9 };
        }
      };
    },
    wader(rig, c, a) {
      const legs = [leg(rig, -2, -46, 46, 4, "#e27aa8"), leg(rig, 8, -46, 46, 4, "#e27aa8")];
      el(rig, "ellipse", { cx: 0, cy: -54, rx: 24, ry: 14, fill: c });
      el(rig, "path", { d: "M14-58Q28-80 16-96", fill: "none", stroke: c, "stroke-width": 8, "stroke-linecap": "round" });
      return {
        head: [18, -110],
        pose(p) {
          set(legs[0], `translate(-2 -46) rotate(${Math.sin(p) * 22})`);
          set(legs[1], `translate(8 -46) rotate(${-Math.sin(p) * 22})`);
          return { y: -Math.abs(Math.cos(p)) * 2, rotate: 0 };
        }
      };
    },
    fly(rig, c, a, extra) {
      const bat = extra === "bat";
      const far = el(rig, "g", { transform: "translate(0 -60)" });
      wingShape(far, bat ? "#3a2e48" : shade(c), bat);
      el(rig, "ellipse", { cx: 0, cy: -58, rx: 20, ry: 14, fill: c });
      el(rig, "path", { d: "M-18-60l-18-6 4 10Z", fill: bat ? c : shade(c) });
      const near = el(rig, "g", { transform: "translate(0 -60)" });
      wingShape(near, bat ? c : a, bat);
      return {
        head: [14, -80], hover: 40,
        pose(p) {
          const flap = Math.sin(p * 2) * 38;
          set(near, `translate(0 -60) rotate(${-flap - 10})`);
          set(far, `translate(0 -60) rotate(${flap * 0.8 - 20})`);
          return { y: Math.sin(p) * 6, rotate: Math.sin(p) * 3 };
        }
      };
    },
    flutter(rig, c, a, extra) {
      const wings = el(rig, "g", { transform: "translate(0 -54)" });
      for (const [rx, ry, cy, cx] of [[20, 26, -18, -8], [16, 18, 6, -6]]) el(wings, "ellipse", { cx, cy, rx, ry, fill: extra === "bee" ? "#eaf6ff" : c, opacity: extra === "bee" ? 0.8 : 1 });
      el(rig, "ellipse", { cx: 0, cy: -52, rx: extra === "bee" ? 16 : 6, ry: extra === "bee" ? 12 : 18, fill: extra === "bee" ? c : a });
      if (extra === "bee") markings(rig, "bee", 0, -52, 16, 12, a);
      return {
        head: [12, -76], hover: 44,
        pose(p) {
          set(wings, `translate(0 -54) scale(${0.35 + Math.abs(Math.sin(p * 3)) * 0.65} 1)`);
          return { y: Math.sin(p) * 10, rotate: 0 };
        }
      };
    },
    swim(rig, c, a, extra) {
      const fluke = el(rig, "g", { transform: "translate(-34 -34)" });
      el(fluke, "path", { d: "M0 0L-20-14-14 0-20 14Z", fill: c });
      el(rig, "ellipse", { cx: 0, cy: -34, rx: 38, ry: 16, fill: c });
      el(rig, "ellipse", { cx: 6, cy: -28, rx: 26, ry: 8, fill: a });
      if (extra === "fin") el(rig, "path", { d: "M-6-48L4-72 14-48Z", fill: c });
      const flipper = el(rig, "g", { transform: "translate(6 -28)" });
      el(flipper, "ellipse", { cx: -4, cy: 8, rx: 5, ry: 11, fill: shade(c) });
      return {
        head: [34, -46], hover: 30,
        pose(p) {
          set(fluke, `translate(-34 -34) rotate(${Math.sin(p) * 28})`);
          set(flipper, `translate(6 -28) rotate(${Math.sin(p) * 20})`);
          return { y: Math.sin(p) * 8, rotate: Math.cos(p) * 5 };
        }
      };
    },
    ceph(rig, c, a) {
      const arms = [];
      for (let i = 0; i < 6; i++) arms.push(el(rig, "path", { d: "", fill: "none", stroke: c, "stroke-width": 6, "stroke-linecap": "round" }));
      el(rig, "ellipse", { cx: -4, cy: -40, rx: 20, ry: 26, fill: c });
      return {
        head: [0, -50], hover: 24,
        pose(p) {
          arms.forEach((arm, i) => {
            const x = -16 + i * 6;
            const w = Math.sin(p * 2 + i) * 8;
            arm.setAttribute("d", `M${x} -22Q${x - 4 + w} -6 ${x - 10 - w} 6`);
          });
          return { y: Math.sin(p) * 10, rotate: Math.sin(p) * -6 };
        }
      };
    },
    jelly(rig, c, a) {
      const tentacles = [];
      for (let i = 0; i < 4; i++) tentacles.push(el(rig, "path", { d: "", fill: "none", stroke: a, "stroke-width": 4, "stroke-linecap": "round" }));
      const bell = el(rig, "g", { transform: "translate(0 -46)" });
      el(bell, "path", { d: "M-26 0Q-26-30 0-30T26 0Z", fill: c });
      return {
        head: [0, -60], hover: 40,
        pose(p) {
          set(bell, `translate(0 -46) scale(${1 + Math.sin(p * 2) * 0.08} ${1 - Math.sin(p * 2) * 0.1})`);
          tentacles.forEach((t, i) => {
            const x = -15 + i * 10;
            const w = Math.sin(p * 2 + i) * 6;
            t.setAttribute("d", `M${x} -46Q${x + w} -26 ${x - w} -8`);
          });
          return { y: -Math.abs(Math.sin(p)) * 12, rotate: 0 };
        }
      };
    },
    crab(rig, c, a, extra) {
      const legs = [];
      for (let i = 0; i < 3; i++) for (const side of [-1, 1]) legs.push([leg(rig, side * (10 + i * 7), -14, 14, 4, extra === "dots" ? "#2b2b2b" : shade(c)), side, i]);
      if (extra !== "dots") for (const side of [-1, 1]) el(rig, "circle", { cx: side * 30, cy: -30, r: 9, fill: c });
      el(rig, "ellipse", { cx: 0, cy: -20, rx: 26, ry: 14, fill: c });
      markings(rig, extra, 0, -20, 26, 14, a);
      return {
        head: [6, -46],
        pose(p) {
          for (const [node, side, i] of legs) set(node, `translate(${side * (10 + i * 7)} -14) rotate(${side * 20 + Math.sin(p * 2 + i) * 22})`);
          return { y: -Math.abs(Math.sin(p * 2)) * 2, rotate: Math.sin(p) * 3 };
        }
      };
    },
    turtle(rig, c, a) {
      const flips = [leg(rig, -16, -12, 12, 9, c), leg(rig, 16, -12, 12, 9, c)];
      el(rig, "path", { d: "M-30-12Q-28-44 0-44Q28-44 30-12Z", fill: a });
      el(rig, "path", { d: "M-18-14L-10-34H10L18-14M-10-34L0-44 10-34", fill: "none", stroke: shade(a), "stroke-width": 3 });
      return {
        head: [34, -36],
        pose(p) {
          set(flips[0], `translate(-16 -12) rotate(${Math.sin(p) * 25})`);
          set(flips[1], `translate(16 -12) rotate(${-Math.sin(p) * 25})`);
          return { y: 0, rotate: Math.sin(p) * 2 };
        }
      };
    },
    snail(rig, c, a) {
      const foot = el(rig, "g", {});
      el(foot, "path", { d: "M-30 0Q-30-12-10-12H24Q34-12 34 0Z", fill: a });
      el(rig, "circle", { cx: -6, cy: -30, r: 22, fill: c });
      el(rig, "path", { d: "M-6-30m-14 0a14 14 0 1 0 14-14a8 8 0 1 0 6 8", fill: "none", stroke: shade(c), "stroke-width": 4, "stroke-linecap": "round" });
      return {
        head: [30, -36],
        pose(p) {
          set(foot, `scale(${1 + Math.sin(p) * 0.08} 1)`);
          return { y: 0, rotate: 0 };
        }
      };
    },
    snake(rig, c) {
      const body = el(rig, "path", { d: "", fill: "none", stroke: c, "stroke-width": 14, "stroke-linecap": "round", "stroke-linejoin": "round" });
      return {
        head: [30, -34],
        pose(p) {
          let d = "";
          for (let i = 0; i <= 8; i++) {
            const x = -50 + i * 9;
            const y = -10 + Math.sin(p * 2 - i * 0.9) * 7;
            d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
          }
          body.setAttribute("d", d + "L24 -16");
          return { y: 0, rotate: 0 };
        }
      };
    },
    seal(rig, c, a) {
      const body = el(rig, "g", {});
      el(body, "path", { d: "M-40-2Q-40-34 8-40Q30-40 30-14Q30 0 10 0Z", fill: c });
      el(body, "path", { d: "M-40-2L-54-12-50 4Z", fill: shade(c) });
      const flipper = leg(rig, 8, -14, 14, 9, shade(c));
      return {
        head: [26, -50],
        pose(p) {
          set(body, `scale(1 ${1 + Math.sin(p) * 0.08}) translate(0 ${-Math.sin(p) * 2})`);
          set(flipper, `translate(8 -14) rotate(${Math.sin(p) * 30 - 20})`);
          return { y: -Math.abs(Math.sin(p)) * 4, rotate: 0 };
        }
      };
    },
    ape(rig, c, a, extra) {
      const t = extra === "curl" ? tail(rig, "curl", -18, -30, c, a) : null;
      const legs = [leg(rig, -8, -22, 22, 9, shade(c)), leg(rig, 8, -22, 22, 9, shade(c))];
      const back = leg(rig, -4, -50, 30, 8, shade(c));
      el(rig, "ellipse", { cx: 0, cy: -40, rx: 20, ry: 24, fill: c });
      el(rig, "ellipse", { cx: 4, cy: -36, rx: 11, ry: 14, fill: a, opacity: 0.8 });
      const arm = leg(rig, 8, -50, 30, 8, c);
      const amp = extra === "slow" ? 14 : 28;
      return {
        head: [6, -72],
        pose(p) {
          const s = Math.sin(p) * amp;
          set(legs[0], `translate(-8 -22) rotate(${s})`);
          set(legs[1], `translate(8 -22) rotate(${-s})`);
          set(arm, `translate(8 -50) rotate(${s - 25})`);
          set(back, `translate(-4 -50) rotate(${-s - 15})`);
          if (t) set(t, `translate(-18 -30) rotate(${Math.sin(p * 0.5) * 10})`);
          return { y: -Math.abs(Math.cos(p)) * 2, rotate: 6 };
        }
      };
    }
  };

  function wingShape(parent, color, bat) {
    if (bat) el(parent, "path", { d: "M0 0L-10-34-20-22-30-30-36-14-48-16Q-30 4 0 0Z", fill: color });
    else el(parent, "path", { d: "M0 0Q-14-36-42-30Q-30-10 0 0Z", fill: color });
  }
  function panda(extra, c, a) { return extra === "panda" ? a : c; }
  // A darker version of a hex colour for legs and far-side parts.
  function shade(hex) {
    const n = parseInt(String(hex).slice(1), 16);
    if (!Number.isFinite(n)) return hex;
    const f = v => Math.round(v * 0.78).toString(16).padStart(2, "0");
    return "#" + f(n >> 16 & 255) + f(n >> 8 & 255) + f(n & 255);
  }

  /* Build an animal into `group` (cleared first). The head image keeps the
     existing class and 64px size. Returns { pose(distance, moving), hover }. */
  /* Animals whose Twemoji art is only a face get a drawn body (above). The rest
     are already whole animals, so the art itself is the body and moves as one.
     Most whole animals in Twemoji face left; they are mirrored to walk right. */
  const FACES = new Set(["cat", "bunny", "koala", "dog", "fox", "bear", "panda", "lion", "frog", "tiger", "unicorn", "mouse",
    "hamster", "wolf", "raccoon", "deer", "moose", "gorilla", "orangutan", "boar", "cow", "pig", "horse"]);
  const FRONT = new Set(["owl", "penguin", "bat", "chicken", "hedgehog", "peacock", "octopus", "squid", "crab", "lobster",
    "jellyfish", "butterfly", "bee", "ladybug", "sloth", "otter", "dove"]);
  // How a whole-animal sprite moves, by body plan.
  const SPRITE_MOTION = { hop: "hop", waddle: "waddle", wader: "waddle", fly: "fly", flutter: "fly", swim: "swim",
    ceph: "pulse", jelly: "pulse", crab: "shuffle", snake: "slither", snail: "slither", turtle: "walk", seal: "walk" };
  const SPRITE_HOVER = { fly: 40, swim: 26, pulse: 30 };

  function spriteMotion(motion, p) {
    const s = Math.sin(p);
    switch (motion) {
      case "hop": {
        // Crouch, launch, airborne arc, land with a squash, settle.
        const t = ((p / (Math.PI * 2)) % 1 + 1) % 1;
        if (t < 0.15) return { y: 0, rotate: 0, sx: 1.1, sy: 0.88 };
        if (t < 0.25) return { y: -4, rotate: -10, sx: 0.92, sy: 1.12 };
        if (t < 0.75) return { y: -24 * Math.sin(Math.PI * (t - 0.25) / 0.5), rotate: -8 + 16 * (t - 0.25) / 0.5, sx: 1, sy: 1 };
        if (t < 0.85) return { y: 0, rotate: 0, sx: 1.1, sy: 0.9 };
        return { y: 0, rotate: 0, sx: 1, sy: 1 };
      }
      case "waddle": return { y: -Math.abs(s) * 3, rotate: s * 9, sx: 1, sy: 1, pivot: s > 0 ? 8 : -8 };
      case "fly": return { y: Math.sin(p * 0.7) * 7, rotate: Math.sin(p * 0.7) * 3, sx: 1, sy: 1 + Math.sin(p * 2) * 0.06 };
      case "swim": return { y: s * 6, rotate: s * 6, sx: 1, sy: 1 };
      case "pulse": return { y: -Math.abs(s) * 10, rotate: 0, sx: 1 + Math.sin(p * 2) * 0.05, sy: 1 - Math.sin(p * 2) * 0.07 };
      case "shuffle": return { y: -Math.abs(Math.sin(p * 2)) * 2, rotate: Math.sin(p * 2) * 3, sx: 1, sy: 1, dx: Math.sin(p * 2) * 3 };
      case "slither": return { y: 0, rotate: 0, sx: 1 + s * 0.06, sy: 1 - s * 0.03, skew: s * 6 };
      default: return { y: -Math.abs(s) * 4, rotate: s * 3, sx: 1, sy: 1 - Math.abs(Math.cos(p)) * 0.035 };
    }
  }

  /* Build an animal into `group` (cleared first). The head image keeps its
     class and 64px size; whole animals are scaled by a wrapper instead.
     Returns { pose(distance, moving), hover, sprite }. */
  function build(group, id, head) {
    group.replaceChildren();
    const [plan, color, accent, scale, extra] = ANIMALS[id] || ANIMALS.cat;
    const mover = el(group, "g", { class: "avatar-mover" });
    const breathe = el(mover, "g", { class: "avatar-breathe" });
    const cadence = CADENCE[plan] || 1.5;
    let phase = 0;
    let clock = null;
    const advance = moving => {
      const now = typeof performance !== "undefined" ? performance.now() : 0;
      if (moving && clock !== null) phase += Math.min(0.1, (now - clock) / 1000) * cadence * Math.PI * 2;
      clock = moving ? now : null;
    };

    if (!FACES.has(id)) {
      const size = Math.max(0.85, Math.min(1.5, scale * 1.15));
      const motion = SPRITE_MOTION[plan] || "walk";
      const hover = (SPRITE_HOVER[motion] || 0) * size;
      const holder = el(breathe, "g", { class: "avatar-sprite", transform: `scale(${FRONT.has(id) ? size : -size} ${size})` });
      head.setAttribute("x", -32);
      head.setAttribute("y", -62);
      holder.appendChild(head);
      return {
        plan, hover, sprite: true,
        pose(distance, moving) {
          advance(moving);
          const m = spriteMotion(motion, moving || hover ? phase : 0);
          const pivot = (m.pivot || 0) * size;
          set(mover, `translate(${((m.dx || 0) * size).toFixed(1)} ${(-hover + m.y * size).toFixed(1)}) translate(${pivot} 0) rotate(${m.rotate.toFixed(1)}) translate(${-pivot} 0) skewX(${(m.skew || 0).toFixed(1)}) scale(${m.sx.toFixed(3)} ${m.sy.toFixed(3)})`);
        }
      };
    }

    const rig = el(breathe, "g", { class: "avatar-rig", transform: `scale(${scale})` });
    const built = PLANS[plan](rig, color, accent, extra);
    const [hx, hy] = built.head;
    head.setAttribute("x", hx * scale - 32);
    head.setAttribute("y", hy * scale - 38);
    breathe.appendChild(head);
    const hover = (built.hover || 0) * scale;
    return {
      plan, hover, sprite: false,
      pose(distance, moving) {
        advance(moving);
        // Flyers and swimmers keep moving gently even when resting.
        const { y, rotate } = built.pose(moving || built.hover ? phase : 0);
        // Lean into the walk a little.
        set(mover, `translate(0 ${(-hover + y * scale).toFixed(1)}) rotate(${(rotate + (moving ? 2 : 0)).toFixed(1)})`);
      }
    };
  }

  window.BB_AVATAR = { build, plan: id => (ANIMALS[id] || ANIMALS.cat)[0], ids: Object.keys(ANIMALS), faces: [...FACES] };
})();
