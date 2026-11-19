/* Habitat worlds for Adventure Mode.
   Each habitat has its own sky, horizon, landmark, kind of path and props, and
   a home version of the same place: golden light, the buddy's home on the
   horizon, bunting and warm lights. The scene (adventure-scene.js) owns the
   camera, the path and the animal; this file only says what each world looks
   like. Everything is drawn in a 1000 x 500 box, with the path kept in the
   middle band (y 280-420) so props never cover the animal. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  function el(parent, tag, attributes) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }
  const P = (g, d, cls) => el(g, "path", { d, class: "h-" + cls });
  const C = (g, cx, cy, r, cls) => el(g, "circle", { cx, cy, r, class: "h-" + cls });
  const E = (g, cx, cy, rx, ry, cls) => el(g, "ellipse", { cx, cy, rx, ry, class: "h-" + cls });
  const R = (g, x, y, width, height, cls, rx = 0) => el(g, "rect", { x, y, width, height, rx, class: "h-" + cls });
  const G = (g, x, y, s = 1) => el(g, "g", { transform: `translate(${x} ${y}) scale(${s})` });

  /* ---------- Shared pieces ---------- */

  function sun(g, x = 822, y = 83, r = 34) {
    C(g, x, y, r * 1.65, "sun-halo");
    C(g, x, y, r, "sun");
  }
  function clouds(g, list) {
    for (const [x, y, s] of list) {
      const c = G(g, x, y, s);
      P(c, "M0 0c0-17 24-27 37-13 6-28 49-28 55 1 27-8 42 22 22 32H3c-17 0-20-16-3-20Z", "cloud");
    }
  }
  function stars(g, list) {
    for (const [x, y, r] of list) C(g, x, y, r, "star");
  }
  function moon(g, x = 820, y = 80) {
    C(g, x, y, 54, "moon-halo");
    P(g, `M${x + 10} ${y - 34}a34 34 0 1 0 22 59 38 38 0 0 1-22-59Z`, "moon");
  }
  function hills(g, far, near) {
    P(g, far, "far");
    P(g, near, "hill");
  }
  // The ground below the horizon, behind the path.
  function ground(g, d = "M0 236Q250 214 500 232T1000 226V500H0Z") {
    P(g, d, "ground");
  }

  function flower(g, x, y, s = 1) {
    const f = G(g, x, y, s);
    P(f, "M0 0V-30", "stem");
    for (let i = 0; i < 5; i++) E(G(f, 0, -34), 0, -8, 6, 10, "petal").setAttribute("transform", `rotate(${i * 72})`);
    C(f, 0, -34, 6, "gold");
  }
  function tuft(g, x, y, s = 1, cls = "leaf") {
    P(G(g, x, y, s), "M-25 0Q-30-22-37-28Q-14-24-11-5Q-14-40-4-48L3-8Q14-36 27-37L13-5Q31-18 36-12L26 0Z", cls);
  }
  function pine(g, x, y, s = 1, cls = "pine") {
    const t = G(g, x, y, s);
    R(t, -5, -30, 10, 30, "bark");
    P(t, "M0-150L-38-92H-22L-50-48H-28L-60 0H60L28-48H50L22-92H38Z", cls);
  }
  function roundTree(g, x, y, s = 1) {
    const t = G(g, x, y, s);
    P(t, "M-6 0L-4-50H4L6 0Z", "bark");
    C(t, -18, -62, 24, "leaf");
    C(t, 16, -66, 26, "leaf");
    C(t, 0, -84, 24, "leaf2");
  }
  function reeds(g, x, y, s = 1) {
    const r = G(g, x, y, s);
    P(r, "M-13 0L-19-63M0 0V-76M12 0L24-58M-4-4Q-40-41-38-49M5-3Q40-34 38-43", "stem");
    P(r, "M-19-61L-22-79M0-73V-94M24-57L29-74", "cattail");
  }
  function rock(g, x, y, s = 1) {
    const r = G(g, x, y, s);
    P(r, "M-34 0Q-38-26-14-34Q8-46 28-28Q42-14 36 0Z", "rock");
    P(r, "M-14-34Q-4-22 6-30", "rock-line");
  }

  // Home trimmings: bunting across the home, fireflies and a welcome sign.
  function bunting(g, x1, y1, x2, y2) {
    const sag = 26;
    P(g, `M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}`, "string");
    const n = 7;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
      const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * (Math.max(y1, y2) + sag) + t * t * y2;
      P(g, `M${x - 8} ${y}L${x + 8} ${y}L${x} ${y + 15}Z`, "pennant-" + (i % 3));
    }
  }
  function fireflies(g, seed) {
    for (let i = 0; i < 9; i++) {
      const x = 60 + ((seed >>> (i % 24)) % 880 + i * 97) % 900;
      const y = 120 + ((seed >>> ((i * 5) % 24)) % 120 + i * 41) % 150;
      C(g, x, y, 7, "firefly-glow");
      C(g, x, y, 2.5, "firefly");
    }
  }
  function welcomeSign(g, x, y) {
    const s = G(g, x, y);
    P(s, "M-3 0V-46H3V0Z", "bark");
    R(s, -30, -64, 60, 26, "sign", 6);
    P(s, "M0-54c-5-7-14-3-11 3 2 5 11 9 11 9s9-4 11-9c3-6-6-10-11-3Z", "heart");
  }

  // Keep decorations out of the path band and, at home, off the house.
  function band(g, seed, draw, { y = 244, count = 4, skipMiddle = false } = {}) {
    for (let i = 0; i < count; i++) {
      const jitter = ((seed >>> (i * 3)) % 31) - 15;
      const x = 85 + i * (830 / Math.max(1, count - 1)) + jitter;
      if (skipMiddle && x > 340 && x < 660) continue;
      draw(g, x, y, i);
    }
  }
  function frontBand(g, seed, draw) {
    for (let i = 0; i < 5; i++) {
      const jitter = ((seed >>> (i * 4 + 1)) % 41) - 20;
      draw(g, 70 + i * 215 + jitter, 492, i);
    }
  }

  /* ---------- Worlds ----------
     points: nine path positions the animal walks through (left to right).
     path:   how the route is drawn (creek, trail, pond, bridge, branch, none).
     token:  what each step looks like.
     sky / horizon / props: the trail scene. home: the building on the horizon. */

  const worlds = {
    meadow: {
      sky: "day",
      homeScale: 1.3,
      points: [[92, 322], [194, 306], [296, 285], [398, 294], [500, 320], [602, 336], [704, 320], [806, 290], [908, 278]],
      path: "creek", token: "stone",
      horizon(g) {
        hills(g, "M0 200Q120 120 260 180Q380 110 520 176Q680 104 830 170Q930 130 1000 168V500H0Z",
          "M0 236Q160 176 330 222T660 214T1000 205V500H0Z");
        ground(g);
      },
      landmark(g) {
        // A windmill on the far hill.
        const w = G(g, 560, 196, 0.9);
        P(w, "M-18 0L-11-92H11L18 0Z", "wall");
        P(w, "M-14-92L0-112 14-92Z", "roof");
        const sails = G(w, 0, -96);
        for (let i = 0; i < 4; i++) P(sails, "M0 0L-7-70H7Z", "sail").setAttribute("transform", `rotate(${20 + i * 90})`);
        C(w, 0, -96, 5, "bark");
        R(w, -6, -26, 12, 26, "door", 6);
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => flower(g2, x, 244, 1.1), { count: 6, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? tuft(g2, x, y, 0.9) : flower(g2, x, y, 1.4)));
      },
      home(g) {
        // Clover burrow: a grassy mound with a round door and a carrot patch.
        P(g, "M340 246Q360 120 500 112Q640 120 660 246Z", "mound");
        P(g, "M360 246Q380 150 500 140Q620 150 640 246", "mound-line");
        C(g, 500, 205, 34, "door-frame");
        P(g, "M470 246V208A30 30 0 0 1 530 208V246Z", "door");
        C(g, 519, 222, 4, "gold");
        C(g, 420, 190, 14, "window");
        C(g, 580, 190, 14, "window");
        for (const x of [395, 415, 585, 605]) {
          P(g, `M${x} 246l-5-14h10Z`, "carrot");
          P(g, `M${x} 232l-6-12M${x} 232l0-14M${x} 232l6-12`, "stem");
        }
        for (const [x, y] of [[440, 122], [520, 114], [600, 140]]) {
          const c = G(g, x, y, 0.7);
          for (let i = 0; i < 3; i++) C(c, Math.cos(i * 2.1) * 7, Math.sin(i * 2.1) * 7, 7, "leaf2");
        }
      }
    },

    cottage: {
      sky: "day",
      points: [[90, 392], [190, 372], [290, 352], [395, 345], [500, 350], [605, 344], [708, 330], [810, 314], [910, 300]],
      path: "trail", token: "paver",
      horizon(g) {
        hills(g, "M0 206Q150 160 300 196T620 186T1000 190V500H0Z", "M0 240Q200 210 420 232T1000 228V500H0Z");
        // A village on the far hill.
        for (const [x, w, h] of [[120, 46, 34], [180, 38, 28], [760, 44, 32], [820, 36, 26], [880, 48, 36]]) {
          R(g, x, 196 - h, w, h, "wall-far");
          P(g, `M${x - 4} ${196 - h}L${x + w / 2} ${176 - h}L${x + w + 4} ${196 - h}Z`, "roof-far");
        }
        ground(g);
        // Hedgerows.
        P(g, "M0 250Q60 230 120 250T240 250T360 250V262H0ZM640 250Q700 230 760 250T880 250T1000 250V262H640Z", "hedge");
      },
      landmark(g) {
        // A little church spire in the village.
        const ch = G(g, 520, 196);
        R(ch, -30, -40, 60, 40, "wall-far");
        P(ch, "M-36-40L0-66 36-40Z", "roof-far");
        R(ch, -10, -96, 20, 56, "wall-far");
        P(ch, "M-14-96L0-126 14-96Z", "roof-far");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => roundTree(g2, x, 248, 0.9), { count: 4, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => {
          for (let k = -1; k <= 1; k++) flower(g2, x + k * 22, y, 1);
          if (i % 2) P(g2, `M${x - 40} ${y}H${x + 40}M${x - 32} ${y + 4}V${y - 26}M${x} ${y + 4}V${y - 26}M${x + 32} ${y + 4}V${y - 26}M${x - 40} ${y - 16}H${x + 40}`, "fence");
        });
      },
      home(g) {
        const h = G(g, 500, 248);
        R(h, -80, -86, 160, 86, "wall");
        P(h, "M-96-82L0-150 96-82Z", "roof");
        R(h, 44, -150, 18, 40, "chimney");
        P(h, "M53-156q-12-14 4-24 14-10 4-26", "smoke");
        P(h, "M-16 0V-46Q0-62 16-46V0Z", "door");
        for (const x of [-60, 32]) {
          R(h, x, -66, 28, 26, "window", 3);
          P(h, `M${x + 14} -66V-40M${x} -53H${x + 28}`, "window-line");
        }
        P(h, "M-120 0H-90M90 0H120M-116 0V-26M-104 0V-26M104 0V-26M116 0V-26M-120-14H-90M90-14H120", "fence");
      }
    },

    forest: {
      sky: "dappled",
      points: [[90, 330], [190, 350], [290, 334], [395, 356], [500, 340], [605, 360], [710, 342], [812, 358], [910, 340]],
      path: "trail", token: "stump",
      horizon(g) {
        for (const [y, cls, s] of [[208, "far2", 0.8], [228, "far", 1]]) {
          for (let x = -30; x < 1060; x += 62 * s) pine(g, x + (y % 17), y, s * (0.85 + ((x * 7) % 5) / 20), cls);
        }
        ground(g, "M0 238Q300 226 520 240T1000 232V500H0Z");
        // Sunbeams through the trees.
        P(g, "M300 0L360 0 520 330 440 330ZM640 0L680 0 780 330 730 330Z", "beam");
      },
      landmark(g) {
        // An old giant tree.
        const t = G(g, 520, 240);
        P(t, "M-26 0Q-20-60-30-120H30Q20-60 26 0ZM-26 0Q-44 4-56 8M26 0Q44 4 56 8", "bark");
        C(t, -50, -140, 46, "leaf");
        C(t, 50, -146, 50, "leaf");
        C(t, 0, -178, 52, "leaf2");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x, y, i) => (i % 2 ? pine(g2, x, 252, 0.7) : mushroom(g2, x, 250)), { count: 5, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? fern(g2, x, y) : mushroom(g2, x, y, 1.2)));
      },
      home(g) {
        // A hollow tree with a round door, roots and a lantern.
        const t = G(g, 500, 248);
        P(t, "M-70 0Q-60-70-64-150Q0-176 64-150Q60-70 70 0ZM-70 0Q-96 2-110 10M70 0Q96 2 110 10M-40 0Q-50 6-62 14M40 0Q50 6 62 14", "bark");
        C(t, -70, -190, 62, "leaf");
        C(t, 70, -196, 66, "leaf");
        C(t, 0, -228, 66, "leaf2");
        P(t, "M-26 0V-52A26 26 0 0 1 26-52V0Z", "door");
        C(t, 14, -26, 3, "gold");
        C(t, 0, -110, 16, "window");
        P(t, "M44-60V-80M38-80H50L46-96H42Z", "lantern");
        C(t, 44, -88, 12, "glow");
      }
    },

    eucalyptus: {
      sky: "warm",
      points: [[90, 384], [190, 368], [290, 352], [395, 340], [500, 332], [605, 324], [710, 316], [810, 308], [910, 300]],
      path: "branch", token: "leafpad",
      horizon(g) {
        hills(g, "M0 214Q200 190 400 206T1000 200V500H0Z", "M0 240Q240 218 500 236T1000 232V500H0Z");
        ground(g, "M0 246Q300 230 600 244T1000 240V500H0Z");
      },
      landmark(g) {
        // A big red rock on the horizon.
        P(g, "M380 214Q384 168 430 160L590 156Q634 162 640 214Z", "redrock");
        P(g, "M430 160Q440 186 432 214M500 158Q506 186 500 214M570 157Q578 186 572 214", "redrock-line");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => gumTree(g2, x, 250, 0.8), { count: 4, skipMiddle: home });
        frontBand(g, seed, (g2, x, y) => tuft(g2, x, y, 1, "grass-gold"));
      },
      home(g) {
        // A big gum tree with a cosy nest and a hammock.
        gumTree(g, 500, 250, 1.5);
        E(g, 470, 140, 40, 16, "nest");
        P(g, "M434 138Q470 152 506 138", "nest-line");
        P(g, "M540 160Q570 190 610 170", "hammock");
      }
    },

    bamboo: {
      sky: "mist",
      points: [[90, 300], [190, 318], [290, 340], [395, 356], [500, 360], [605, 352], [710, 334], [812, 312], [910, 298]],
      path: "creek", token: "square",
      horizon(g) {
        // Misty karst peaks.
        for (const [x, w, h, cls] of [[60, 90, 150, "far2"], [190, 70, 120, "far2"], [700, 80, 140, "far2"], [860, 100, 170, "far2"], [120, 80, 100, "far"], [780, 90, 110, "far"]]) {
          P(g, `M${x - w / 2} 230Q${x - w / 2} ${230 - h} ${x} ${230 - h}Q${x + w / 2} ${230 - h} ${x + w / 2} 230Z`, cls);
        }
        ground(g);
      },
      landmark(g) {
        // A red arched bridge over the brook, far away.
        P(g, "M420 232Q500 170 580 232", "bridge-arch");
        P(g, "M430 214V232M465 196V226M500 190V222M535 196V226M570 214V232M424 214Q500 160 576 214", "bridge-rail");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => { for (let k = -1; k <= 1; k++) cane(g2, x + k * 16, 250, 0.9 + k * 0.08); }, { count: 4, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? cane(g2, x, y, 0.8) : lantern(g2, x, y)));
      },
      home(g) {
        // A pagoda pavilion.
        const p = G(g, 500, 248);
        R(p, -60, -60, 120, 60, "wall");
        P(p, "M-96-58Q-80-70-60-80H60Q80-70 96-58Q60-66 0-66T-96-58Z", "roof");
        R(p, -40, -106, 80, 30, "wall");
        P(p, "M-70-104Q-56-114-40-122H40Q56-114 70-104Q40-110 0-110T-70-104Z", "roof");
        P(p, "M0-122V-140", "stem");
        P(p, "M-14 0V-40H14V0Z", "door");
        for (const x of [-46, 30]) R(p, x, -48, 16, 20, "window", 2);
        for (const x of [-84, 84]) { P(p, `M${x}-58V-46`, "stem"); C(p, x, -38, 9, "lantern-red"); }
      }
    },

    polar: {
      sky: "aurora",
      points: [[90, 330], [190, 300], [290, 336], [392, 306], [495, 340], [598, 310], [700, 344], [805, 312], [910, 336]],
      path: "pond", token: "floe",
      horizon(g) {
        // Icebergs on a cold sea.
        P(g, "M40 240L110 160 150 180 200 120 260 190 300 240ZM700 240L760 180 800 196 860 140 930 240Z", "ice");
        P(g, "M200 120L186 210 150 180 110 160 160 220M860 140L846 216 800 196", "ice-shade");
        P(g, "M0 238H1000V500H0Z", "water");
      },
      landmark(g) {
        // A great ice arch.
        P(g, "M400 240Q402 150 500 140Q598 150 600 240H560Q560 182 500 180Q440 182 440 240Z", "ice");
        P(g, "M440 240Q440 182 500 180", "ice-line");
      },
      props(g, seed) {
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? E(g2, x, y - 6, 54, 14, "ice") : E(g2, x, y - 4, 40, 10, "ice-shade")));
      },
      home(g) {
        // An igloo with a glowing doorway.
        const h = G(g, 500, 246);
        P(h, "M-90 0A90 84 0 0 1 90 0Z", "igloo");
        P(h, "M-88-20H88M-80-44H80M-62-66H62M-40 0V-20M10 0V-20M60-20V-44M-20-20V-44M-60-20V-44M30-44V-66M-30-44V-66", "igloo-line");
        P(h, "M60 0V-34Q60-50 80-50H96Q116-50 116-34V0Z", "igloo");
        P(h, "M72 0V-26Q72-38 88-38Q104-38 104-26V0Z", "glow-door");
      }
    },

    savanna: {
      sky: "hot",
      points: [[90, 384], [195, 362], [300, 346], [405, 336], [510, 332], [615, 332], [720, 337], [820, 347], [920, 362]],
      path: "track", token: "print",
      horizon(g) {
        P(g, "M0 226H1000V500H0Z", "far");
        for (const [x, s] of [[120, 0.5], [860, 0.6]]) acacia(g, x, 228, s, "far2");
        ground(g, "M0 236Q260 228 520 236T1000 232V500H0Z");
      },
      landmark(g) {
        // A flat-topped mountain far away.
        P(g, "M360 228L420 170H600L660 228Z", "far2");
        P(g, "M420 170L440 186 470 176 500 190 540 174 580 184 600 170Z", "snowcap");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x, y, i) => (i % 2 ? acacia(g2, x, 252, 0.7, "tree") : tuft(g2, x, 250, 1.2, "grass-gold")), { count: 4, skipMiddle: home });
        frontBand(g, seed, (g2, x, y) => tuft(g2, x, y, 1.3, "grass-gold"));
      },
      home(g) {
        // Pride rock.
        P(g, "M360 248Q362 200 400 190L470 176Q520 150 600 160L640 156Q656 170 630 186Q620 220 640 248Z", "rock");
        P(g, "M470 176Q520 168 600 170L640 156", "rock-line");
        P(g, "M520 248V214Q540 196 560 214V248Z", "cave");
        acacia(g, 380, 196, 0.5, "tree");
      }
    },

    wetland: {
      sky: "day",
      homeScale: 1.15,
      points: [[90, 330], [190, 300], [286, 342], [386, 306], [486, 346], [586, 310], [690, 350], [795, 314], [905, 340]],
      path: "pond", token: "pad",
      horizon(g) {
        hills(g, "M0 212Q200 180 420 204T1000 196V500H0Z", "M0 236Q260 218 520 232T1000 228V500H0Z");
        P(g, "M0 250Q500 236 1000 250V500H0Z", "water");
        P(g, "M60 280H160M300 300H380M620 290H720M820 300H920M180 420H280M520 440H640", "ripple");
      },
      landmark(g) {
        // A weeping willow.
        const w = G(g, 540, 240);
        P(w, "M-6 0L-4-70H6L8 0Z", "bark");
        P(w, "M-70-40Q-60-120 0-124Q60-120 70-40Q64 0 56-6Q50-40 40-70Q30-30 26 0Q20-50 10-90Q0-40-4-4Q-14-50-24-86Q-36-30-40 0Q-52-40-56-60Q-62-20-70-40Z", "leaf");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => reeds(g2, x, 252, 1), { count: 5, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? reeds(g2, x, y, 1.1) : lotus(g2, x, y - 6)));
      },
      home(g) {
        // A cosy stick lodge in the pond.
        P(g, "M380 252Q400 150 500 140Q600 150 620 252Z", "lodge");
        P(g, "M396 212L470 150M420 232L540 150M470 246L600 178M560 150L610 230M400 180L604 210M392 236L612 240", "lodge-line");
        P(g, "M470 252V224Q500 204 530 224V252Z", "door");
        C(g, 460, 190, 10, "window");
      }
    },

    jungle: {
      sky: "dappled",
      points: [[90, 300], [190, 318], [290, 332], [395, 340], [500, 343], [605, 340], [710, 332], [810, 318], [910, 300]],
      path: "bridge", token: "plank",
      horizon(g) {
        // Dense canopy and a river gorge below the bridge.
        for (const [x, r, cls] of [[40, 80, "far2"], [160, 70, "far"], [260, 80, "far2"], [740, 76, "far2"], [850, 84, "far"], [960, 70, "far2"]]) C(g, x, 200, r, cls);
        P(g, "M0 260Q500 240 1000 260V500H0Z", "gorge");
        P(g, "M0 420Q250 400 500 416T1000 410V500H0Z", "water");
        P(g, "M80 440H180M400 452H520M700 440H820", "ripple");
      },
      landmark(g) {
        // A waterfall down the cliff.
        P(g, "M380 260L400 110H600L620 260Z", "cliff");
        P(g, "M470 110H530V420H470Z", "fall");
        P(g, "M480 120V400M500 130V410M520 120V400", "fall-line");
        E(g, 500, 420, 70, 14, "foam");
      },
      props(g, seed, home) {
        P(g, "M100 0Q160 60 120 110T160 190M760 0Q700 70 760 120T730 200M910 0Q850 50 900 100", "vine");
        frontBand(g, seed, (g2, x, y) => broadleaf(g2, x, y, 1.3));
      },
      home(g) {
        // A treehouse with a ladder.
        const t = G(g, 500, 252);
        P(t, "M-16 0L-12-140H12L16 0Z", "bark");
        C(t, -60, -200, 56, "leaf");
        C(t, 60, -206, 60, "leaf");
        C(t, 0, -236, 58, "leaf2");
        R(t, -70, -160, 140, 14, "plank");
        R(t, -54, -226, 108, 66, "wall");
        P(t, "M-66-226L0-262 66-226Z", "roof");
        P(t, "M-12-160V-198H12V-160Z", "door");
        R(t, 22, -210, 22, 20, "window", 3);
        P(t, "M30-146L36 0M52-146L58 0M32-120H54M33-90H55M34-60H56M35-30H57", "ladder");
      }
    },

    rainbow: {
      sky: "pastel",
      points: [[90, 360], [190, 334], [290, 350], [395, 320], [500, 336], [605, 306], [710, 322], [810, 296], [910, 312]],
      path: "none", token: "cloud",
      horizon(g) {
        P(g, "M0 250Q80 220 160 246T320 240T480 250T640 238T800 248T1000 240V500H0Z", "cloudsea");
        P(g, "M0 300Q120 276 240 296T480 290T720 300T1000 292", "cloud-line");
        // Floating islands.
        for (const [x, y, s] of [[150, 160, 0.8], [860, 140, 1]]) {
          const i = G(g, x, y, s);
          P(i, "M-50 0H50L20 40H-20Z", "island");
          P(i, "M-52 0Q0-14 52 0Z", "hill");
        }
      },
      landmark(g) {
        const arch = G(g, 500, 250);
        for (const [i, cls] of ["band-1", "band-2", "band-3", "band-4", "band-5"].entries()) {
          const r = 150 - i * 16;
          P(arch, `M${-r} 0A${r} ${r} 0 0 1 ${r} 0h-16A${r - 16} ${r - 16} 0 0 0 ${16 - r} 0Z`, cls);
        }
      },
      props(g, seed) {
        stars(g, [[80, 60, 4], [300, 40, 3], [700, 70, 4], [940, 40, 3], [420, 110, 3]]);
        frontBand(g, seed, (g2, x, y) => E(g2, x, y - 10, 70, 26, "cloud"));
      },
      home(g) {
        // A cloud castle.
        const c = G(g, 500, 250);
        E(c, 0, -4, 140, 30, "cloud");
        R(c, -70, -110, 140, 100, "castle");
        for (const x of [-90, 70]) { R(c, x, -150, 30, 140, "castle"); P(c, `M${x - 4}-150L${x + 15}-186 ${x + 34}-150Z`, "roof-pink"); }
        R(c, -20, -170, 40, 60, "castle");
        P(c, "M-24-170L0-206 24-170Z", "roof-pink");
        P(c, "M0-206V-226L18-220 0-214", "flag");
        P(c, "M-18-10V-46Q0-64 18-46V-10Z", "door");
        for (const x of [-50, 34]) R(c, x, -86, 16, 22, "window", 8);
      }
    },

    cave: {
      sky: "cave",
      points: [[90, 340], [190, 360], [290, 345], [390, 368], [495, 350], [600, 372], [705, 352], [810, 370], [910, 350]],
      path: "creek", token: "crystal",
      horizon(g) {
        // Cave walls and a ceiling of stalactites.
        P(g, "M0 0H1000V60Q960 90 930 70T860 110T780 70T700 96T620 64T540 104T460 66T380 100T300 70T220 110T140 72T60 100T0 80Z", "ceiling");
        P(g, "M130 70L140 150 150 74M380 98L392 170 402 100M620 66L628 130 636 66M860 108L870 190 880 110", "stalactite");
        P(g, "M0 240Q250 210 500 236T1000 226V500H0Z", "ground");
      },
      landmark(g) {
        // A beam of moonlight through a hole in the roof.
        P(g, "M470 0H530L600 240H400Z", "moonbeam");
        C(g, 500, 30, 22, "moon");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => crystal(g2, x, 248, 0.8), { count: 5, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? crystal(g2, x, y, 0.9) : glowShroom(g2, x, y)));
      },
      home(g) {
        // A crystal grotto with lanterns.
        crystal(g, 500, 250, 2);
        crystal(g, 420, 250, 1.2);
        crystal(g, 585, 250, 1.3);
        P(g, "M440 250V214Q500 170 560 214V250Z", "cave-mouth");
        for (const x of [430, 570]) { P(g, `M${x} 60V140`, "string"); C(g, x, 150, 12, "glow"); C(g, x, 150, 6, "gold"); }
      }
    },

    desert: {
      sky: "hot",
      points: [[90, 352], [190, 322], [295, 336], [400, 310], [500, 330], [600, 306], [700, 326], [805, 302], [910, 318]],
      path: "trail", token: "flatrock",
      horizon(g) {
        P(g, "M0 228Q160 150 330 210Q480 140 660 214Q820 156 1000 222V500H0Z", "far");
        P(g, "M0 228Q160 150 330 210M480 140Q560 170 660 214", "dune-line");
        ground(g, "M0 240Q250 214 520 238T1000 232V500H0Z");
      },
      landmark(g) {
        // A tall butte.
        P(g, "M440 230V140Q440 126 456 124H560Q576 126 576 140V230Z", "butte");
        P(g, "M440 160H576M440 196H576", "butte-line");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => cactus(g2, x, 250, 0.8), { count: 4, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? cactus(g2, x, y, 0.7) : rock(g2, x, y, 0.9)));
      },
      home(g) {
        // An oasis with palms and an adobe house.
        E(g, 500, 244, 130, 16, "water");
        const h = G(g, 500, 236);
        R(h, -60, -70, 120, 70, "adobe", 10);
        R(h, -40, -100, 80, 34, "adobe", 8);
        P(h, "M-14 0V-36Q0-52 14-36V0Z", "door");
        for (const x of [-46, 30]) R(h, x, -54, 16, 16, "window", 8);
        for (const [x, s] of [[390, 1], [610, 0.9]]) palm(g, x, 244, s);
      }
    },

    mountain: {
      sky: "alpine",
      points: [[90, 410], [196, 388], [300, 402], [404, 368], [504, 384], [604, 346], [704, 362], [806, 322], [910, 304]],
      path: "trail", token: "flatrock",
      horizon(g) {
        P(g, "M0 230L120 110 200 170 300 70 420 200 520 90 640 190 760 60 880 170 1000 100V500H0Z", "far");
        P(g, "M120 110L100 140 120 132 140 146ZM300 70L276 110 300 100 322 116ZM520 90L498 126 520 116 540 130ZM760 60L734 104 760 94 784 108Z", "snowcap");
        ground(g, "M0 250Q240 230 500 248T1000 240V500H0Z");
      },
      landmark(g) {
        // The tallest peak, right behind the trail.
        P(g, "M360 240L500 40 640 240Z", "peak");
        P(g, "M500 40L466 92 490 84 504 100 520 82 536 92Z", "snowcap");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => pine(g2, x, 256, 0.55), { count: 5, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? rock(g2, x, y) : flower(g2, x, y, 1)));
      },
      home(g) {
        // An alpine cabin with smoke from the chimney.
        const h = G(g, 500, 250);
        R(h, -70, -70, 140, 70, "logs");
        P(h, "M-70-14H70M-70-28H70M-70-42H70M-70-56H70", "log-line");
        P(h, "M-92-66L0-130 92-66Z", "roof");
        P(h, "M-80-70L0-124 80-70", "snow-roof");
        R(h, 36, -130, 16, 40, "chimney");
        P(h, "M44-136q-12-14 4-24 14-10 4-26", "smoke");
        P(h, "M-14 0V-44H14V0Z", "door");
        for (const x of [-56, 30]) R(h, x, -52, 26, 22, "window", 3);
      }
    },

    ocean: {
      sky: "underwater",
      points: [[90, 362], [195, 374], [300, 360], [400, 382], [500, 370], [600, 386], [705, 372], [810, 386], [910, 370]],
      path: "trail", token: "shell",
      horizon(g) {
        P(g, "M120 0L180 0 330 320 240 320ZM520 0L560 0 640 320 580 320ZM800 0L850 0 920 320 860 320Z", "light-ray");
        P(g, "M0 250Q150 230 300 250T600 244T1000 250V500H0Z", "seabed-far");
        ground(g, "M0 270Q250 254 500 268T1000 262V500H0Z");
      },
      landmark(g) {
        // A sunken ship.
        const s = G(g, 520, 250, 0.9);
        P(s, "M-120-10Q-110 30-60 34H80Q120 30 130-20Z", "wreck");
        P(s, "M-10-20V-150M-10-140L60-90H-10ZM-10-130L-70-90H-10Z", "mast");
        for (const x of [-70, -20, 30, 80]) C(s, x, 8, 8, "porthole");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x, y, i) => (i % 2 ? coral(g2, x, 272) : kelp(g2, x, 272)), { count: 5, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? kelp(g2, x, y) : coral(g2, x, y)));
        for (const [x, y, r] of [[195, 120, 9], [220, 151, 5], [570, 182, 12], [591, 151, 6], [838, 112, 8], [878, 183, 14], [80, 200, 7]]) C(g, x, y, r, "bubble");
      },
      home(g) {
        // A spiral shell house.
        const h = G(g, 500, 266);
        P(h, "M-90 0Q-110-90-20-120Q70-140 96-60Q110 0 80 0Z", "shellhouse");
        P(h, "M-50 0Q-70-70-10-86Q50-96 62-46M-20 0Q-30-46 6-54Q34-58 36-30", "shell-swirl");
        P(h, "M-14 0V-30Q0-44 14-30V0Z", "door");
        C(h, 44, -70, 12, "porthole");
        C(h, -54, -64, 10, "porthole");
      }
    },

    shore: {
      sky: "day",
      points: [[90, 346], [190, 324], [292, 346], [395, 320], [500, 342], [605, 318], [708, 340], [810, 314], [910, 334]],
      path: "none", token: "tiderock",
      horizon(g) {
        P(g, "M0 206H1000V250H0Z", "sea");
        P(g, "M40 222q20-8 40 0t40 0M260 230q20-8 40 0t40 0M620 220q20-8 40 0t40 0M820 232q20-8 40 0t40 0", "wave");
        // A sailboat far out.
        const b = G(g, 200, 204, 0.6);
        P(b, "M-30 0H30L22 10H-22Z", "bark");
        P(b, "M0 0V-60L30-6H0ZM-4-50L-24-6H-4Z", "sail");
        ground(g, "M0 246Q250 236 500 248T1000 244V500H0Z");
        for (const [x, y] of [[180, 300], [460, 300], [760, 290], [320, 420], [640, 430]]) E(g, x, y, 60, 12, "pool");
      },
      landmark(g) {
        // A lighthouse on the point.
        const l = G(g, 520, 216);
        P(l, "M-60 0Q-50-20 0-22Q50-20 60 0Z", "rock");
        P(l, "M-16-18L-12-110H12L16-18Z", "lighthouse");
        P(l, "M-14-40H14M-13-64H13M-12-88H12", "stripe");
        R(l, -12, -128, 24, 18, "glow-door", 3);
        P(l, "M-16-128L0-144 16-128Z", "roof");
      },
      props(g, seed, home) {
        band(g, seed, (g2, x) => palm(g2, x, 252, 0.6), { count: 3, skipMiddle: home });
        frontBand(g, seed, (g2, x, y, i) => (i % 2 ? shellProp(g2, x, y) : starfish(g2, x, y)));
      },
      home(g) {
        // A striped beach hut on stilts.
        const h = G(g, 500, 252);
        P(h, "M-56 0V-40M56 0V-40M-20 0V-40M20 0V-40", "stilt");
        R(h, -66, -46, 132, 10, "plank");
        R(h, -56, -116, 112, 70, "hut");
        P(h, "M-40-116V-46M-24-116V-46M-8-116V-46M8-116V-46M24-116V-46M40-116V-46", "hut-stripe");
        P(h, "M-72-112L0-160 72-112Z", "roof");
        P(h, "M-12-46V-90H12V-46Z", "door");
        P(h, "M-80-40L-40 0H-56L-90-34Z", "plank");
      }
    }
  };

  /* ---------- Alternative landmarks ----------
     Animals that share a habitat get different landmarks, picked by name. */
  const altLandmarks = {
    meadow: [
      function barn(g) {
        const b = G(g, 540, 200, 0.9);
        R(b, -50, -60, 100, 60, "barn");
        P(b, "M-58-58L0-100 58-58Z", "roof");
        P(b, "M-18 0V-34H18V0ZM-18-34L18 0M18-34L-18 0", "barn-door");
        R(b, -10, -84, 20, 16, "window", 2);
      },
      function balloon(g) {
        const b = G(g, 560, 120);
        P(b, "M0-60C-40-60-48-14-14 18H14C48-14 40-60 0-60Z", "roof");
        P(b, "M0-60C-14-60-18-14-6 18H6C18-14 14-60 0-60Z", "gold-fill");
        P(b, "M-12 18L-10 34M12 18L10 34", "string");
        R(b, -12, 34, 24, 16, "barn-door", 3);
      }
    ],
    forest: [
      function tower(g) {
        const t = G(g, 530, 240);
        P(t, "M-30 0L-16-130M30 0L16-130M-26-30H26M-22-70H22M-26-30L22-70M26-30L-22-70", "tower-leg");
        R(t, -30, -160, 60, 30, "plank");
        P(t, "M-38-160L0-188 38-160Z", "roof");
      }
    ],
    wetland: [
      function boathouse(g) {
        const h = G(g, 540, 250);
        P(h, "M-80 0V-14M-40 0V-14M0 0V-14M40 0V-14M80 0V-14", "stilt-line");
        R(h, -86, -20, 172, 8, "plank");
        R(h, -60, -76, 120, 56, "wall");
        P(h, "M-72-74L0-112 72-74Z", "roof");
        P(h, "M-24-20V-52H24V-20Z", "door");
      }
    ],
    savanna: [
      function baobab(g) {
        const t = G(g, 520, 236);
        P(t, "M-30 0Q-36-60-22-110H22Q36-60 30 0Z", "bark");
        P(t, "M-22-110L-60-140M-10-112L-20-156M10-112L20-158M22-110L62-136", "branch-line");
        for (const [x, y, r] of [[-62, -146, 18], [-22, -164, 18], [20, -166, 20], [62, -142, 18]]) C(t, x, y, r, "acacia");
      }
    ],
    ocean: [
      function treasure(g) {
        P(g, "M420 270Q410 170 500 160Q590 170 580 270H540Q546 210 500 206Q454 210 460 270Z", "rock");
        const c = G(g, 500, 266);
        R(c, -30, -26, 60, 26, "chest", 4);
        P(c, "M-30-26Q0-46 30-26Z", "chest");
        P(c, "M-30-18H30M0-36V-8", "chest-band");
        C(c, 0, -14, 4, "gold");
      }
    ],
    jungle: [
      function temple(g) {
        const t = G(g, 500, 260);
        for (const [w, y] of [[200, 0], [160, -34], [120, -64], [80, -92]]) R(t, -w / 2, y - 30, w, 30, "temple");
        P(t, "M-90-14H90M-70-48H70M-50-78H50", "temple-line");
        P(t, "M-14 0V-30H14V0Z", "door");
        P(t, "M-100-30Q-120-60-90-90M100-40Q124-70 96-110", "vine");
      }
    ]
  };

  /* ---------- Small drawings used above ---------- */

  function mushroom(g, x, y, s = 1) {
    const m = G(g, x, y, s);
    P(m, "M-6 0L-4-24H6L9 0Z", "stalk");
    P(m, "M-26-20Q0-62 26-20Z", "cap");
    C(m, -8, -30, 4, "spot");
    C(m, 10, -28, 3, "spot");
  }
  function fern(g, x, y) {
    P(G(g, x, y), "M0 0Q-1-40-20-64M-4-15Q-40-10-39-31Q-16-34-4-15M-9-32Q-43-30-41-48Q-20-48-9-32M-16-49Q-40-48-35-63ZM-3-16Q23-39 29-24Q28-8-3-16M-8-33Q10-57 18-44Q21-28-8-33Z", "leaf");
  }
  function gumTree(g, x, y, s = 1) {
    const t = G(g, x, y, s);
    P(t, "M-9 0L-5-108H7L13 0ZM0-47L-36-89-29-94 6-65 34-104 41-98 8-42Z", "gumbark");
    for (const [cx, cy, r] of [[-31, -98, 29], [29, -108, 35], [0, -121, 28]]) C(t, cx, cy, r, "gum");
  }
  function cane(g, x, y, s = 1) {
    const c = G(g, x, y, s);
    P(c, "M-5 0L-8-120H2L5 0Z", "cane");
    P(c, "M-8-30H4M-8-60H3M-8-90H2", "cane-line");
    P(c, "M-4-70Q-40-100-38-74Q-26-60-4-70M-4-96Q28-124 34-102Q24-84-4-96", "leaf");
  }
  function lantern(g, x, y) {
    const l = G(g, x, y);
    P(l, "M0 0V-40", "stem");
    E(l, 0, -54, 12, 16, "lantern-red");
    P(l, "M-6-70H6M-6-38H6", "bark-line");
  }
  function acacia(g, x, y, s = 1, cls = "tree") {
    const t = G(g, x, y, s);
    P(t, "M-9 0L-5-61-58-99-51-105 2-77 57-112 64-106 8-62 13 0Z", cls === "far2" ? "far2" : "bark");
    P(t, "M-110-92Q-111-119-78-117Q-60-143-31-126Q-2-155 27-129Q60-147 78-121Q114-128 119-99Q16-78-110-92Z", cls === "far2" ? "far2" : "acacia");
  }
  function lotus(g, x, y) {
    const l = G(g, x, y);
    E(l, 0, 0, 40, 10, "pad");
    P(l, "M0-3Q-39-13-25-30Q-11-29 0-3Q-18-26 0-44Q19-25 0-3Q12-34 29-29Q33-8 0-3Z", "petal");
    C(l, 0, -10, 5, "gold");
  }
  function broadleaf(g, x, y, s = 1) {
    const b = G(g, x, y, s);
    P(b, "M0 0Q-18-22-13-53Q14-48 0 0M-2-3Q-55-5-50-38Q-16-43-2-3M0-3Q17-49 49-35Q45-1 0-3Z", "leaf");
    P(b, "M0 0L-13-42M-2-3L-40-31M0-3L38-29", "leaf-line");
  }
  function crystal(g, x, y, s = 1) {
    const c = G(g, x, y, s);
    P(c, "M-25 0L-35-33-21-49-8-31-3-67 14-85 30-64 23-18 38-41 51-25 43 0Z", "crystal");
    P(c, "M-3-67L10-52 14-85 30-64 10-52 8 0M-35-33L-21-24-21-49M23-18L34-11 38-41", "crystal-line");
  }
  function glowShroom(g, x, y) {
    const m = G(g, x, y);
    C(m, 0, -26, 22, "glow");
    P(m, "M-4 0L-3-20H4L5 0Z", "stalk");
    P(m, "M-20-16Q0-48 20-16Z", "glow-cap");
  }
  function cactus(g, x, y, s = 1) {
    const c = G(g, x, y, s);
    P(c, "M-10 0V-29H-23Q-36-29-36-42V-62Q-36-73-26-73Q-17-73-17-62V-48H-10V-88Q-10-104 4-104Q18-104 18-88V-58H26V-76Q26-88 36-88Q46-88 46-76V-51Q46-37 31-37H18V0Z", "cactus");
    P(c, "M3-87V-8M-26-61V-42M36-76V-52", "leaf-line");
  }
  function palm(g, x, y, s = 1) {
    const p = G(g, x, y, s);
    P(p, "M-4 0Q8-60-6-120l10-2Q24-60 8 0Z", "bark");
    P(p, "M0-120q-55-29-88 8 43-18 88-8-65 5-60 43 24-32 60-43 46-38 88 9-50-8-88-9 58 3 69 39-38-28-69-39Z", "leaf");
  }
  function coral(g, x, y) {
    P(G(g, x, y), "M0 0V-48M0-20Q-28-20-28-42V-53M-28-38L-42-49V-62M0-35Q22-35 22-57V-70M22-47Q39-47 39-63", "coral");
  }
  function kelp(g, x, y) {
    P(G(g, x, y), "M0 0Q-25-25-8-45T-12-85Q18-72 5-48T14 0ZM18 0Q40-28 26-49T40-75Q33-50 43-31T34 0Z", "kelp");
  }
  function shellProp(g, x, y) {
    const s = G(g, x, y);
    P(s, "M0 0Q-48-22-32-43Q-20-56-9-46Q0-64 11-47Q27-57 35-40Q46-20 0 0Z", "shell");
    P(s, "M0-2L-26-37M0-2L-8-41M0-2L10-41M0-2L29-35", "shell-line");
  }
  function starfish(g, x, y) {
    const s = G(g, x, y - 16);
    P(s, "M0-20L6-6 21-6 9 3 14 18 0 9-14 18-9 3-21-6-6-6Z", "starfish");
  }

  /* ---------- Sky ---------- */

  function sky(g, kind, home, seed) {
    switch (kind) {
      case "aurora":
        P(g, "M0 120Q200 40 400 110T800 90T1000 110V150Q800 120 600 150T200 140T0 170Z", "aurora-1");
        P(g, "M0 80Q250 10 500 70T1000 50V90Q750 70 500 100T0 110Z", "aurora-2");
        stars(g, [[90, 40, 3], [330, 30, 2], [580, 24, 3], [717, 60, 2], [934, 30, 3]]);
        break;
      case "cave":
        break;
      case "underwater":
        for (let i = 0; i < 6; i++) C(g, 80 + i * 170, 40 + (i % 3) * 30, 6 + (i % 2) * 4, "bubble");
        break;
      case "pastel":
        sun(g, 840, 80, 30);
        clouds(g, [[100, 90, 1], [430, 60, 0.8], [700, 120, 0.7]]);
        break;
      case "mist":
        sun(g, 820, 86, 30);
        P(g, "M0 170Q250 150 500 172T1000 166V200H0Z", "mist");
        break;
      case "hot":
        sun(g, 820, 96, 44);
        break;
      default:
        sun(g);
        clouds(g, [[115, 89, 1], [482, 61, 0.8]]);
    }
    if (home && kind !== "cave" && kind !== "underwater") fireflies(g, seed);
  }

  function draw(layers, habitat, seed, home) {
    const world = Object.hasOwn(worlds, habitat) ? worlds[habitat] : worlds.meadow;
    sky(layers.sky, world.sky, home, seed);
    world.horizon(layers.far);
    // At home the house takes the landmark's place in the middle distance.
    if (home) {
      // Some homes are drawn small; scale them up around their doorstep.
      const scale = world.homeScale || 1;
      world.home(scale === 1 ? layers.home : el(layers.home, "g", { transform: `translate(500 248) scale(${scale}) translate(-500 -248)` }));
      bunting(layers.home, 390, 150, 610, 150);
      welcomeSign(layers.home, 930, 300);
    } else {
      const options = [world.landmark, ...(altLandmarks[habitat] || [])];
      options[(seed >>> 3) % options.length](layers.far);
    }
    world.props(layers.details, seed, home);
    extras(layers.sky, world.sky, seed);
    // Each animal's path wiggles a little differently, so animals sharing a habitat
    // still get their own trail. The first and last steps stay put.
    const points = world.points.map(([x, y], i) => [x, i === 0 || i === world.points.length - 1 ? y : y + (((seed >>> (i * 3)) % 25) - 12)]);
    // Open-sky trails come in a few times of day (homes are always golden hour).
    const times = ["noon", "morning", "breezy"];
    return { ...world, points, time: home ? "golden" : times[(seed >>> 5) % times.length] };
  }

  // A per-animal touch of life in the sky, chosen from what suits the habitat.
  function extras(g, kind, seed) {
    if (kind === "cave" || kind === "underwater") return;
    const options = kind === "aurora" ? ["birds", "none"] : kind === "dappled" ? ["butterflies", "leaves", "birds"] : ["birds", "butterflies", "kite", "clouds"];
    const pick = options[(seed >>> 7) % options.length];
    const shift = (seed >>> 11) % 200;
    if (pick === "birds") {
      for (const [x, y] of [[300, 70], [330, 90], [360, 64]]) P(g, `M${x + shift - 10} ${y}q10-8 10 0q0-8 10 0`, "bird");
    } else if (pick === "butterflies") {
      for (const [x, y] of [[260, 160], [640, 140]]) {
        const b = G(g, x + shift, y);
        E(b, -6, -2, 6, 8, "petal");
        E(b, 6, -2, 6, 8, "petal");
        P(b, "M0-8V6", "bark-line");
      }
    } else if (pick === "kite") {
      const k = G(g, 300 + shift, 70);
      P(k, "M0-22L16 0 0 26-16 0Z", "roof");
      P(k, "M0-22V26M-16 0H16", "window-line");
      P(k, "M0 26q-12 20 4 36t-6 40", "string");
    } else if (pick === "leaves") {
      for (const [x, y, r] of [[240, 120, 20], [420, 180, -30], [700, 150, 50]]) {
        P(G(g, x + shift / 2, y), "M0 0q-8-10 0-20q8 10 0 20Z", "falling-leaf").setAttribute("transform", `translate(${x + shift / 2} ${y}) rotate(${r})`);
      }
    } else if (pick === "clouds") {
      clouds(g, [[260 + shift, 130, 0.6], [640 + shift / 2, 40, 0.5]]);
    }
  }

  function world(habitat) {
    return Object.hasOwn(worlds, habitat) ? worlds[habitat] : worlds.meadow;
  }

  window.BB_HABITATS = { draw, world, names: Object.keys(worlds) };
})();
