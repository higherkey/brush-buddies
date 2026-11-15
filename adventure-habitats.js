/* Decorative habitat details; the scene owns stones, animals and progress. */
(() => {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  function element(parent, tag, attributes) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }

  function path(parent, d, color) {
    return element(parent, "path", { d, class: `habitat-${color}` });
  }

  function circle(parent, cx, cy, r, color) {
    return element(parent, "circle", { cx, cy, r, class: `habitat-${color}` });
  }

  function group(parent, x, y, scale = 1) {
    return element(parent, "g", { transform: `translate(${x} ${y}) scale(${scale})` });
  }

  function flower(g) {
    path(g, "M0 0V-44M0-12Q-29-34-23-10ZM0-23Q27-45 24-20Z", "leaf");
    for (let i = 0; i < 5; i++) {
      const petal = group(g, 0, -49);
      petal.setAttribute("transform", `translate(0 -49) rotate(${i * 72})`);
      element(petal, "ellipse", { cx: 0, cy: -13, rx: 10, ry: 17, class: "habitat-petal" });
    }
    circle(g, 0, -49, 9, "gold");
  }

  function tuft(g) {
    path(g, "M-25 0Q-30-22-37-28Q-14-24-11-5Q-14-40-4-48L3-8Q14-36 27-37L13-5Q31-18 36-12L26 0Z", "leaf");
  }

  function fern(g) {
    path(g, "M0 0Q-1-40-20-64M-4-15Q-40-10-39-31Q-16-34-4-15M-9-32Q-43-30-41-48Q-20-48-9-32M-16-49Q-40-48-35-63ZM-3-16Q23-39 29-24Q28-8-3-16M-8-33Q10-57 18-44Q21-28-8-33Z", "leaf");
  }

  function cane(g) {
    path(g, "M-5 0L-9-110H1L6 0Z", "leaf");
    path(g, "M-9-28H4M-10-56H3M-10-84H2", "light-line");
    path(g, "M-4-65Q-42-101-41-71Q-27-55-4-65M-4-90Q30-120 35-97Q24-77-4-90M0-35Q26-62 36-44Q24-26 0-35Z", "hill");
  }

  function reeds(g) {
    path(g, "M-13 0L-19-63M0 0V-76M12 0L24-58M-4-4Q-40-41-38-49M5-3Q40-34 38-43", "stem");
    path(g, "M-19-61L-22-79M0-73V-94M24-57L29-74", "reed-head");
  }

  function broadleaf(g) {
    path(g, "M0 0Q-18-22-13-53Q14-48 0 0M-2-3Q-55-5-50-38Q-16-43-2-3M0-3Q17-49 49-35Q45-1 0-3Z", "leaf");
    path(g, "M0 0L-13-42M-2-3L-40-31M0-3L38-29", "light-line");
  }

  function cactus(g) {
    path(g, "M-10 0V-29H-23Q-36-29-36-42V-62Q-36-73-26-73Q-17-73-17-62V-48H-10V-88Q-10-104 4-104Q18-104 18-88V-58H26V-76Q26-88 36-88Q46-88 46-76V-51Q46-37 31-37H18V0Z", "leaf");
    path(g, "M3-87V-8M-26-61V-42M36-76V-52", "light-line");
  }

  function crystal(g) {
    path(g, "M-25 0L-35-33-21-49-8-31-3-67 14-85 30-64 23-18 38-41 51-25 43 0Z", "crystal");
    path(g, "M-3-67L10-52 14-85 30-64 10-52 8 0M-35-33L-21-24-21-49M23-18L34-11 38-41", "light-line");
  }

  function coral(g) {
    path(g, "M0 0V-48M0-20Q-28-20-28-42V-53M-28-38L-42-49V-62M0-35Q22-35 22-57V-70M22-47Q39-47 39-63", "coral");
  }

  function shell(g) {
    path(g, "M0 0Q-48-22-32-43Q-20-56-9-46Q0-64 11-47Q27-57 35-40Q46-20 0 0Z", "sand");
    path(g, "M0-2L-26-37M0-2L-8-41M0-2L10-41M0-2L29-35", "shell-line");
  }

  // Keep all planting outside the stepping-stone corridor.
  function scatter(root, seed, draw, scale = 1) {
    for (let i = 0; i < 8; i++) {
      const jitter = ((seed >>> (i * 3)) % 31) - 15;
      const foreground = i >= 4;
      const x = 85 + (i % 4) * 265 + jitter;
      draw(group(root, x, foreground ? 490 : 240, scale * (foreground ? 0.65 : 1)));
    }
  }

  const habitats = {
    cottage(root, seed) {
      const home = group(root, 330, 115);
      path(home, "M0 122V43H136V122Z", "sand");
      path(home, "M-15 46L67-22 151 46Z", "roof");
      path(home, "M100 2V-20H117V17Z", "bark");
      path(home, "M55 122V75Q70 61 85 75V122Z", "bark");
      path(home, "M15 66H42V91H15ZM98 66H125V91H98Z", "water");
      path(home, "M28 66V91M15 78H42M111 66V91M98 78H125", "light-line");
      path(root, "M520 228H900M520 211H900M540 240V193M585 240V193M630 240V193M675 240V193M720 240V193M765 240V193M810 240V193M855 240V193M900 240V193", "fence");
      path(root, "M50 243Q170 213 280 243ZM300 488Q480 446 655 488Z", "soil");
      scatter(root, seed, flower, 0.65);
    },
    meadow(root, seed) {
      scatter(root, seed, flower, 1.5);
      for (const x of [180, 460, 740]) tuft(group(root, x, 490));
    },
    eucalyptus(root, seed) {
      for (const x of [150, 440, 775]) {
        const tree = group(root, x, 240);
        path(tree, "M-9 0L-5-108H7L13 0ZM0-47L-36-89-29-94 6-65 34-104 41-98 8-42Z", "bark");
        for (const [cx, cy, r] of [[-31, -98, 29], [29, -108, 35], [0, -121, 28]]) circle(tree, cx, cy, r, "gum");
        circle(tree, -24, -111, 12, "hill");
      }
      scatter(root, seed, tuft, 0.6);
    },
    forest(root, seed) {
      path(root, "M337 205H523V240H337Z", "bark");
      element(root, "ellipse", { cx: 523, cy: 222, rx: 14, ry: 18, class: "habitat-sand" });
      element(root, "ellipse", { cx: 523, cy: 222, rx: 7, ry: 10, class: "habitat-bark" });
      path(root, "M350 205Q390 183 426 205Z", "leaf");
      scatter(root, seed, fern);
      for (const [x, y] of [[275, 238], [650, 240], [370, 485]]) {
        const mushroom = group(root, x, y);
        path(mushroom, "M-6 0L-4-26H6L9 0Z", "light");
        path(mushroom, "M-26-22Q0-65 26-22Z", "petal");
        circle(mushroom, -8, -31, 4, "light");
        circle(mushroom, 10, -30, 3, "light");
      }
    },
    bamboo(root, seed) {
      scatter(root, seed, cane);
      cane(group(root, 390, 240, 1.25));
      cane(group(root, 420, 240, 1.1));
    },
    polar(root) {
      path(root, "M140 239L213 163 249 179 290 95 348 174 391 161 468 239Z", "ice");
      path(root, "M290 95L274 206 249 179 213 163 260 223 348 174Z", "light");
      path(root, "M559 227L615 205 699 213 728 237 643 244ZM61 461L120 425 226 432 258 471 161 490ZM603 460L661 426 782 420 862 459 802 490 660 486Z", "ice");
      path(root, "M74 461L162 475 242 468M622 459L716 472 846 459M579 228L648 234 710 230", "light-line");
    },
    savanna(root, seed) {
      for (const [x, s] of [[245, 1], [740, 0.85]]) {
        const tree = group(root, x, 240, s);
        path(tree, "M-9 0L-5-61-58-99-51-105 2-77 57-112 64-106 8-62 13 0Z", "bark");
        path(tree, "M-110-92Q-111-119-78-117Q-60-143-31-126Q-2-155 27-129Q60-147 78-121Q114-128 119-99Q16-78-110-92Z", "leaf");
      }
      const grass = element(root, "g", { class: "habitat-golden-grass" });
      scatter(grass, seed, tuft, 0.8);
    },
    wetland(root, seed) {
      scatter(root, seed, reeds);
      for (const [x, y] of [[320, 235], [620, 231], [470, 482]]) {
        const lotus = group(root, x, y);
        path(lotus, "M-43 0A43 10 0 1 1 3 9L0 0Z", "leaf");
        path(lotus, "M0-3Q-39-13-25-30Q-11-29 0-3Q-18-26 0-44Q19-25 0-3Q12-34 29-29Q33-8 0-3Z", "petal");
        circle(lotus, 0, -10, 5, "gold");
      }
    },
    jungle(root, seed) {
      path(root, "M100 93Q161 140 118 188T163 240M760 91Q704 148 765 188T730 242M907 96Q849 133 894 172T874 237", "vine");
      scatter(root, seed, broadleaf, 1.35);
      broadleaf(group(root, 480, 235, 1.8));
    },
    rainbow(root, seed) {
      const arch = group(root, 490, 240);
      for (const [i, color] of ["petal", "gold", "hill", "water", "crystal"].entries()) {
        const radius = 145 - i * 17;
        path(arch, `M${-radius} 0A${radius} ${radius} 0 0 1 ${radius} 0h-17A${radius - 17} ${radius - 17} 0 0 0 ${17 - radius} 0Z`, color);
      }
      path(root, "M294 241Q275 220 298 209Q296 187 322 192Q341 172 357 195Q386 184 392 212Q417 224 399 241ZM590 241Q572 223 594 211Q590 188 617 192Q635 172 652 196Q680 185 686 213Q712 226 692 241Z", "light");
      scatter(root, seed, flower, 0.8);
    },
    cave(root, seed) {
      path(root, "M280 243L306 172 365 103 455 91 536 131 585 243Z", "rock");
      path(root, "M344 243L357 185 390 151 445 139 492 179 514 243Z", "cave");
      path(root, "M365 103L390 151 357 185 306 172M455 91L445 139 492 179 536 131", "facet");
      scatter(root, seed, crystal, 0.75);
    },
    desert(root, seed) {
      path(root, "M30 242Q177 115 349 213Q502 124 673 224Q834 147 969 240Z", "sand");
      path(root, "M30 242Q196 162 349 213M381 229Q524 175 673 224", "shell-line");
      scatter(root, seed, cactus);
    },
    mountain(root, seed) {
      path(root, "M30 243L151 107 209 171 286 92 389 240ZM493 243L615 95 680 170 736 110 868 242Z", "rock");
      path(root, "M151 107L130 168 151 155 171 175 180 140ZM286 92L253 151 281 140 299 162 314 128ZM615 95L581 153 611 139 631 160 644 129ZM736 110L710 153 735 144 754 162 762 137Z", "light");
      path(root, "M151 155L118 242H209ZM281 140L258 241H389ZM611 139L590 243H680ZM735 144L712 242H868Z", "facet");
      scatter(root, seed, tuft, 0.5);
    },
    ocean(root, seed) {
      scatter(root, seed, coral);
      for (const [x, y] of [[260, 240], [670, 241], [350, 491], [740, 490]]) {
        const weed = group(root, x, y);
        path(weed, "M0 0Q-25-25-8-45T-12-85Q18-72 5-48T14 0ZM18 0Q40-28 26-49T40-75Q33-50 43-31T34 0Z", "leaf");
      }
      for (const [x, y, r] of [[195, 120, 9], [220, 151, 5], [570, 182, 12], [591, 151, 6], [838, 112, 8], [878, 183, 14], [535, 437, 8]]) circle(root, x, y, r, "bubble");
    },
    shore(root, seed) {
      path(root, "M30 241Q200 205 340 241ZM30 491Q410 435 970 490Z", "sand");
      const castle = group(root, 650, 240);
      path(castle, "M-73 0V-66H-80V-88H-67V-77H-54V-88H-41V-66H-48V-37H45V-66H38V-88H51V-77H64V-88H77V-66H70V0ZM-27-37V-99H-34V-120H-19V-109H-5V-120H10V-109H24V-120H39V-99H32V-37Z", "sand");
      path(castle, "M-12 0V-21Q0-40 13-21V0ZM-63-55H-55V-40H-63ZM52-55H61V-40H52ZM-5-87H7V-68H-5Z", "bark");
      path(castle, "M-80 0H78M-32-35H36", "shell-line");
      scatter(root, seed, shell, 0.65);
    }
  };

  function render(svg, habitat, buddyId) {
    let details = svg.querySelector("g.creek-habitat-details");
    if (!details) details = element(svg, "g", { class: "creek-habitat-details", "aria-hidden": "true" });
    const variant = String(habitat) + ':' + String(buddyId);
    if (details.dataset.variant === variant) return;
    details.dataset.variant = variant;
    let seed = 2166136261;
    for (const char of String(buddyId ?? "")) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
    const name = Object.hasOwn(habitats, habitat) ? habitat : "meadow";
    const content = document.createDocumentFragment();
    habitats[name](content, seed);
    details.replaceChildren(content);
  }

  window.BB_HABITATS = { render };
})();
