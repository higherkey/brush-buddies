(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const ANIMALS = {
    cat: ["🐱", "Kitty the Cat", "meow"],
    bunny: ["🐰", "Bubbles the Bunny", "squeak"],
    koala: ["🐨", "Koko the Koala", "koala"],
    dog: ["🐶", "Scout the Puppy", "woof"],
    fox: ["🦊", "Finn the Fox", "yip"],
    bear: ["🐻", "Benny the Bear", "growl"],
    panda: ["🐼", "Pippa the Panda", "chirp"],
    penguin: ["🐧", "Pebble the Penguin", "squeak"],
    owl: ["🦉", "Ollie the Owl", "hoot"],
    lion: ["🦁", "Leo the Lion", "roar"],
    frog: ["🐸", "Freddie the Frog", "ribbit"],
    tiger: ["🐯", "Tilly the Tiger", "growl"],
    elephant: ["🐘", "Ellie the Elephant", "trumpet"],
    unicorn: ["🦄", "Star the Unicorn", "magic"]
  };

  const DEFAULT_STAGES = [
    { id: "top", name: "Top teeth", icon: "🌸", tip: "Reach those top teeth with gentle little circles.", seconds: 30 },
    { id: "bottom", name: "Bottom teeth", icon: "🌷", tip: "Give those bottom teeth some love.", seconds: 30 },
    { id: "front", name: "Front teeth", icon: "😁", tip: "Brush the front, gently and carefully.", seconds: 30 },
    { id: "tongue", name: "Tongue", icon: "👅", tip: "Give your tongue a gentle brush.", seconds: 30 }
  ];

  /* Chiptune Song Library with Multiple Themes */
  const SONGS = {
    sparkle: {
      name: "Sparkle March",
      tempo: 175,
      bassRoot: [131, 147, 165, 196], // C3, D3, E3, G3
      // 32-step melody base
      melody: [
        659, 784, 988, 784, 523, 659, 784, 659,
        587, 740, 880, 740, 494, 587, 740, 587,
        523, 659, 784, 1047, 988, 784, 659, 523,
        587, 740, 880, 1175, 1047, 880, 740, 587
      ]
    },
    adventure: {
      name: "Adventure Stomp",
      tempo: 160,
      bassRoot: [110, 131, 147, 165], // A2, C3, D3, E3
      melody: [
        440, 523, 659, 523, 440, 659, 587, 523,
        494, 587, 740, 587, 494, 740, 659, 587,
        523, 659, 784, 880, 784, 659, 587, 523,
        659, 587, 523, 494, 440, 523, 659, 880
      ]
    },
    bubble: {
      name: "Bubble Pop",
      tempo: 190,
      bassRoot: [147, 165, 175, 196], // D3, E3, F3, G3
      melody: [
        587, 880, 784, 659, 698, 880, 988, 880,
        784, 1047, 988, 880, 698, 784, 880, 698,
        587, 740, 880, 740, 587, 880, 1047, 880,
        784, 698, 659, 587, 659, 784, 880, 1047
      ]
    }
  };

  const DEFAULTS = {
    theme: "random",
    song: "sparkle",
    breakSeconds: 3,
    animalSounds: true,
    uiSounds: true,
    musicOn: true,
    animations: true,
    reducedMotion: false,
    motionSensitivity: "medium",
    motionRegion: "center",
    stages: DEFAULT_STAGES
  };

  const KEY = "brushBuddiesSettingsV2";
  const CIRC = 2 * Math.PI * 99;
  const MW = 96;
  const MH = 72;
  const GRACE = 1800;

  function cloneStages(a) {
    return a.map((s, i) => ({
      id: String(s.id || "stage" + i),
      name: String(s.name || "Stage " + (i + 1)),
      icon: String(s.icon || "✨"),
      tip: String(s.tip || "Keep going!"),
      seconds: Math.max(5, Math.min(180, Number(s.seconds) || 30))
    }));
  }

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        ...DEFAULTS,
        ...v,
        stages: cloneStages(v.stages || DEFAULT_STAGES)
      };
    } catch {
      return { ...DEFAULTS, stages: cloneStages(DEFAULT_STAGES) };
    }
  }

  let settings = load();
  let selected = settings.theme === "random" ? randomTheme() : settings.theme;
  let stageIndex = 0;
  let stageLeft = 0;
  let breakLeft = 0;
  let phase = "ready";
  let pausedFrom = "running";
  let clock = null;
  let audio = null;
  let sessionElapsed = 0;
  let musicTimer = null;
  let musicStep = 0;

  let stream = null;
  let cameraStarting = false;
  let motionOn = false;
  let motionArmed = false;
  let motionActive = false;
  let prev = null;
  let raf = null;
  let lastMove = 0;
  let lastVideoTime = -1;
  const video = $("motion-preview");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let hold = null;
  let dragging = false;
  let dragIndex = null;

  function getAudioContext() {
    if (!audio) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audio = new AudioCtx();
    }
    if (audio && audio.state === "suspended") {
      audio.resume().catch(() => {});
    }
    return audio;
  }

  function randomTheme() {
    const a = Object.keys(ANIMALS);
    return a[Math.floor(Math.random() * a.length)];
  }

  function animal() {
    return ANIMALS[selected] || ANIMALS.cat;
  }

  function total() {
    return settings.stages.reduce((n, s) => n + s.seconds, 0);
  }

  function remaining() {
    return settings.stages.slice(stageIndex).reduce((n, s, i) => n + (i === 0 ? stageLeft : s.seconds), 0);
  }

  function fmt(n) {
    return Math.floor(n / 60) + ":" + String(n % 60).padStart(2, "0");
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {}
  }

  function say(t) {
    $("message").textContent = t;
    $("announcer").textContent = t;
  }

  function tone(f, d = 0.13, type = "sine", v = 0.04) {
    if (!settings.uiSounds) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime;
      o.type = type;
      o.frequency.value = f;
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + d);
    } catch {}
  }

  function victorySound() {
    if (!settings.uiSounds) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98, 2093];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const t = now + i * 0.105;
        o.type = i < 4 ? "triangle" : "square";
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(i < 4 ? 0.075 : 0.045, t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.36);
      });
      const sparkle = ctx.createOscillator();
      const sg = ctx.createGain();
      sparkle.type = "sine";
      sparkle.frequency.setValueAtTime(1760, now + 0.48);
      sparkle.frequency.exponentialRampToValueAtTime(2640, now + 0.82);
      sg.gain.setValueAtTime(0.0001, now + 0.48);
      sg.gain.exponentialRampToValueAtTime(0.055, now + 0.53);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      sparkle.connect(sg);
      sg.connect(ctx.destination);
      sparkle.start(now + 0.48);
      sparkle.stop(now + 0.92);
    } catch {}
  }

  function renderMusicButton() {
    const b = $("music-toggle");
    if (!b) return;
    b.setAttribute("aria-pressed", String(settings.musicOn));
    b.textContent = settings.musicOn ? "♫ Music on" : "♫ Music off";
    b.classList.toggle("enabled", settings.musicOn);
  }

  /* Dynamic Chiptune Engine with Stage Awareness */
  function shouldPlayMusic() {
    return settings.musicOn && (phase === "running" || phase === "break");
  }

  function stopMusic() {
    if (musicTimer !== null) clearTimeout(musicTimer);
    musicTimer = null;
  }

  /* Music follows the timer: plays while brushing or on a break, silent otherwise. */
  function syncMusic() {
    if (shouldPlayMusic()) {
      if (musicTimer === null) {
        musicStep = 0;
        musicTick();
      }
    } else {
      stopMusic();
    }
  }

  function musicTick() {
    if (!shouldPlayMusic()) {
      musicTimer = null;
      return;
    }
    const ctx = getAudioContext();
    if (!ctx) return;

    // Declared outside try so the tempo calculation at the end of the function can use it.
    const isBreak = phase === "break" || (phase === "paused" && pausedFrom === "break");

    try {
      const activeSong = SONGS[settings.song] || SONGS.sparkle;
      const step = musicStep % activeSong.melody.length;
      const now = ctx.currentTime;

      // Stage-based variations:
      // Stage 0 (Top): Pure natural melody
      // Stage 1 (Bottom): Lower octave accent + rich bass drive
      // Stage 2 (Front): Transposed +2 semitones + bouncy high arpeggios
      // Stage 3 (Tongue): Transposed +4 semitones + syncopated sparkles
      // Break: Gentle mellow tempo & muted octave
      const semitoneShift = isBreak ? -2 : (stageIndex % 4 === 2 ? 2 : stageIndex % 4 === 3 ? 4 : 0);
      const pitchRatio = Math.pow(2, semitoneShift / 12);

      const baseMelody = activeSong.melody[step];
      const melodyFreq = isBreak ? baseMelody * 0.5 : baseMelody * pitchRatio;
      const bassRoots = activeSong.bassRoot;
      const bassFreq = bassRoots[Math.floor(step / 8) % bassRoots.length] * (isBreak ? 0.75 : 1);

      const note = (freq, duration, wave, volume, delay = 0) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const at = now + delay;
        o.type = wave;
        o.frequency.setValueAtTime(freq, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(volume, at + 0.008);
        g.gain.setValueAtTime(volume * 0.72, at + duration * 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(at);
        o.stop(at + duration + 0.01);
      };

      // Main melody line
      const vol = isBreak ? 0.018 : 0.026;
      note(melodyFreq, 0.145, isBreak ? "sine" : "square", vol);

      // Harmony note every other beat (stage variations add octave or thirds)
      if (step % 2 === 0 && !isBreak) {
        const harmonyMult = stageIndex % 2 === 1 ? 1.25 : 2; // Major third or octave
        note(melodyFreq * harmonyMult, 0.075, "triangle", 0.012, 0.018);
      }

      // Bass beat on chord changes
      if (step % 4 === 0) {
        note(bassFreq, isBreak ? 0.35 : 0.25, "triangle", isBreak ? 0.025 : 0.035);
      }

      // Snappy high percussion sparkle on backbeats
      if (step % 8 === 4 && !isBreak) {
        const percPitch = stageIndex % 4 === 2 ? 2340 : 1960;
        note(percPitch, 0.045, "square", 0.009, 0.025);
      }
    } catch {}

    musicStep++;
    const currentTempo = isBreak ? (SONGS[settings.song]?.tempo || 175) + 50 : (SONGS[settings.song]?.tempo || 175);
    musicTimer = setTimeout(musicTick, currentTempo);
  }

  function toggleMusic() {
    settings.musicOn = !settings.musicOn;
    save();
    renderMusicButton();
    syncMusic();
    say(settings.musicOn ? "♪ Music will play while you brush!" : "Music off. Nice and quiet!");
  }

  function animalSound() {
    if (!settings.animalSounds) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const kind = animal()[2];

      const voice = (start, duration, from, to, wave = "triangle", volume = 0.055, filter = 2400) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const toneFilter = ctx.createBiquadFilter();
        osc.type = wave;
        osc.frequency.setValueAtTime(Math.max(35, from), start);
        osc.frequency.exponentialRampToValueAtTime(Math.max(35, to), start + duration);
        toneFilter.type = "lowpass";
        toneFilter.frequency.setValueAtTime(filter, start);
        toneFilter.frequency.exponentialRampToValueAtTime(Math.max(180, filter * 0.55), start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(toneFilter);
        toneFilter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
      };

      const chirp = (f1, f2, d = 0.12, delay = 0, wave = "triangle", v = 0.045) =>
        voice(now + delay, d, f1, f2, wave, v);

      const noise = (delay, duration, volume = 0.025, cutoff = 1100) => {
        const length = Math.ceil(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
        const src = ctx.createBufferSource();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        const start = now + delay;
        filter.type = "bandpass";
        filter.frequency.value = cutoff;
        filter.Q.value = 0.7;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        src.buffer = buffer;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        src.start(start);
        src.stop(start + duration);
      };

      switch (kind) {
        case "meow":
          voice(now, 0.34, 780, 360, "sawtooth", 0.035, 1500);
          voice(now + 0.12, 0.22, 1050, 520, "triangle", 0.018, 2100);
          break;
        case "squeak":
          chirp(1150, 1750, 0.09, 0);
          chirp(1450, 980, 0.12, 0.1);
          chirp(1050, 1500, 0.08, 0.24);
          break;
        case "koala":
          voice(now, 0.42, 210, 145, "sawtooth", 0.035, 650);
          voice(now + 0.22, 0.25, 165, 230, "triangle", 0.025, 850);
          break;
        case "woof":
          noise(0, 0.12, 0.035, 520);
          chirp(185, 105, 0.14, 0.01, "sawtooth", 0.04);
          noise(0.17, 0.1, 0.025, 420);
          break;
        case "yip":
          chirp(520, 980, 0.1);
          chirp(760, 1180, 0.09, 0.13);
          chirp(620, 850, 0.13, 0.26);
          break;
        case "growl":
          voice(now, 0.34, 145, 72, "sawtooth", 0.045, 420);
          voice(now + 0.18, 0.28, 105, 68, "square", 0.018, 300);
          break;
        case "chirp":
          chirp(900, 1450, 0.08);
          chirp(1250, 1750, 0.07, 0.1);
          chirp(1000, 1550, 0.1, 0.2);
          break;
        case "hoot":
          voice(now, 0.3, 430, 300, "sine", 0.055, 900);
          voice(now + 0.24, 0.32, 350, 245, "sine", 0.05, 800);
          break;
        case "roar":
          noise(0, 0.34, 0.045, 360);
          voice(now, 0.4, 155, 75, "sawtooth", 0.045, 500);
          noise(0.3, 0.22, 0.03, 520);
          break;
        case "ribbit":
          voice(now, 0.12, 190, 310, "square", 0.035, 900);
          voice(now + 0.14, 0.1, 260, 170, "square", 0.03, 850);
          voice(now + 0.29, 0.13, 190, 285, "square", 0.035, 900);
          break;
        case "trumpet":
          voice(now, 0.2, 260, 520, "sawtooth", 0.04, 1200);
          voice(now + 0.16, 0.24, 410, 680, "sawtooth", 0.035, 1500);
          noise(0.02, 0.28, 0.012, 1700);
          break;
        case "magic":
          chirp(660, 990, 0.18);
          chirp(990, 1320, 0.18, 0.13);
          chirp(1320, 1760, 0.22, 0.26, "sine", 0.035);
          break;
      }
    } catch {}
  }

  function applyTheme() {
    const a = animal();
    $("buddy-emoji").textContent = a[0];
    $("quick-buddy-emoji").textContent = a[0];
    $("buddy-name").textContent = a[1];
    $("app").dataset.theme = selected;
    $("buddy").setAttribute("aria-label", a[1]);
    $("app").classList.toggle("animations-on", settings.animations);
    $("app").classList.toggle("reduced-motion", settings.reducedMotion);
    if (!settings.animations || settings.reducedMotion) {
      $("buddy").classList.remove("is-dancing");
    } else if (motionActive) {
      $("buddy").classList.add("is-dancing");
    }
  }

  function dance(on) {
    motionActive = on;
    $("buddy").classList.toggle("is-dancing", on && settings.animations && !settings.reducedMotion);
  }

  function renderStages() {
    const host = $("zone-track");
    host.innerHTML = "";
    settings.stages.forEach((s, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "zone" + (i === stageIndex ? " active" : "") + (i < stageIndex ? " done" : "");
      b.dataset.index = i;
      b.innerHTML = '<span class="zone-icon"></span>';
      b.querySelector(".zone-icon").textContent = s.icon;
      b.setAttribute("aria-label", "Stage " + (i + 1) + ": " + s.name + ", " + fmt(s.seconds) + ". Drag to reorder.");
      b.title = s.name;
      host.appendChild(b);
    });
  }

  function render() {
    const br = phase === "break" || (phase === "paused" && pausedFrom === "break");
    const left = remaining();
    const all = total();
    const s = settings.stages[stageIndex];

    $("time").textContent = fmt(br ? breakLeft : stageLeft);
    $("total-time").textContent = fmt(left) + " left";
    $("status-text").textContent = "Adventure time " + fmt(sessionElapsed);

    // CSS Custom Property update instead of inline style attribute mutation
    const strokeOffset = CIRC * (1 - (all ? Math.max(0, all - left) / all : 0));
    document.documentElement.style.setProperty("--stroke-dashoffset", String(strokeOffset));

    $("time-caption").textContent =
      phase === "done" ? "ALL DONE!" :
      br ? "TINY BREAK" :
      phase === "motion-wait" ? "WAITING TO BRUSH" :
      phase === "motion-paused" ? "PAUSED — BRUSHING STOPPED" :
      phase === "paused" ? "PAUSED" :
      phase === "ready" ? "READY TO BRUSH" : "THIS STAGE";

    $("zone-title").textContent =
      phase === "done" ? "You did it! Sparkling smile!" :
      br ? "Paws up! A tiny breather…" :
      (s?.name || "Brushing time");

    document.querySelectorAll(".zone").forEach((b, i) => {
      b.classList.toggle("active", i === stageIndex && phase !== "done");
      b.classList.toggle("done", i < stageIndex || phase === "done");
    });

    $("start-button").hidden = !["ready", "done"].includes(phase);
    $("pause-button").hidden = !["running", "break", "paused", "motion-wait", "motion-paused"].includes(phase);

    const canPause = ["running", "break", "motion-wait"].includes(phase);
    $("pause-button-icon").textContent = canPause ? "Ⅱ" : "▶";
    $("pause-button").setAttribute("aria-label", canPause ? "Pause brushing" : "Resume brushing");

    $("motion-toggle").classList.toggle("enabled", motionOn);
    $("motion-toggle").setAttribute("aria-pressed", String(motionOn));
    $("motion-toggle-label").textContent = motionOn ? "Camera on" : "Camera off";
    $("camera-view").hidden = !motionOn;
    $("camera-view").dataset.region = settings.motionRegion;
    syncMusic();
  }

  function stopClock() {
    if (clock !== null) clearInterval(clock);
    clock = null;
  }

  function reset() {
    stopClock();
    sessionElapsed = 0;
    stageIndex = 0;
    stageLeft = settings.stages[0].seconds;
    breakLeft = 0;
    phase = motionOn ? "motion-wait" : "ready";
    motionArmed = false;
    dance(false);
    $("buddy-area").classList.remove("celebrate");
    render();
    say(motionOn ? "Camera helper is ready. Press Start, then brush to begin." : "Ready, little superstar? Pick up your toothbrush!");
  }

  function speakStage() {
    const s = settings.stages[stageIndex];
    say(s.tip);
    animalSound();
    tone(600);
  }

  function finish() {
    stopClock();
    phase = "done";
    stageLeft = 0;
    dance(false);
    render();
    say("Hooray! You finished brushing. High paw, " + animal()[1].split(" ")[0] + "!");
    $("buddy-area").classList.add("celebrate");
    animalSound();
    victorySound();
  }

  function advance() {
    if (stageIndex >= settings.stages.length - 1) {
      finish();
      return;
    }
    if (settings.breakSeconds) {
      phase = "break";
      breakLeft = settings.breakSeconds;
      say("Tiny break! Wiggle your fingers, then let's go again.");
      render();
    } else {
      nextStage();
    }
  }

  function nextStage() {
    stageIndex++;
    stageLeft = settings.stages[stageIndex].seconds;
    phase = "running";
    speakStage();
    render();
  }

  function tick() {
    if (phase === "running" || phase === "break") {
      sessionElapsed++;
    }
    if (phase === "running") {
      stageLeft--;
      if (stageLeft <= 0) {
        stageLeft = 0;
        advance();
      } else {
        render();
      }
    } else if (phase === "break") {
      breakLeft--;
      if (breakLeft <= 0) {
        breakLeft = 0;
        nextStage();
      } else {
        render();
      }
    }
  }

  function start() {
    if (phase === "done") reset();
    if (motionOn && phase === "motion-wait" && motionArmed) {
      motionArmed = false;
      pausedFrom = "motion-wait";
      phase = "paused";
      stopClock();
      dance(false);
      say("Paused. Press the big button when you're ready!");
      render();
      return;
    }
    if (["ready", "paused", "motion-paused", "motion-wait"].includes(phase)) {
      if (motionOn) {
        motionArmed = true;
        phase = "motion-wait";
        say("Ready! Brush back and forth to wake your buddy.");
        render();
      } else {
        if (phase === "ready") {
          phase = "running";
          speakStage();
        } else {
          phase = pausedFrom;
          say("Welcome back! You've got this!");
        }
        render();
        clock = setInterval(tick, 1000);
      }
    } else if (["running", "break"].includes(phase)) {
      pausedFrom = phase;
      stopClock();
      phase = "paused";
      dance(false);
      say("Taking a tiny break? Press start when you're ready.");
      render();
    }
  }

  function jump(i) {
    if (i < 0 || i >= settings.stages.length) return;
    const was = phase === "running";
    stopClock();
    stageIndex = i;
    stageLeft = settings.stages[i].seconds;
    breakLeft = 0;
    phase = motionOn ? "motion-wait" : was ? "running" : "ready";
    if (was && !motionOn) {
      speakStage();
      clock = setInterval(tick, 1000);
    } else {
      say("Jumped to " + settings.stages[i].name + ".");
    }
    render();
  }

  function switchTab(id) {
    document.querySelectorAll(".settings-tab").forEach(b => b.classList.toggle("active", b.dataset.panel === id));
    document.querySelectorAll(".settings-panel").forEach(p => p.classList.toggle("active", p.id === id));
  }

  function persistStagePlan() {
    settings.totalSeconds = total();
    save();
    render();
  }

  function renderEditor() {
    const host = $("stage-editor");
    host.innerHTML = "";
    settings.stages.forEach((s, i) => {
      const card = document.createElement("div");
      card.className = "stage-edit-card";
      card.dataset.index = i;
      card.innerHTML =
        '<div class="stage-edit-heading"><span class="stage-drag-handle" role="button" tabindex="0" aria-label="Drag to reorder stage">⠿</span><span class="stage-edit-number"></span><button class="text-button remove-stage" type="button">Remove</button></div>' +
        '<div class="stage-fields"><label>Picture<input class="stage-icon-input" maxlength="4"></label><label>Stage name<input class="stage-name-input" maxlength="28"></label><label>Seconds<input class="stage-seconds-input" type="number" min="5" max="180" step="5"></label></div>' +
        '<label class="tip-field">Reminder<textarea class="stage-tip-input" rows="2" maxlength="140"></textarea></label>';
      card.querySelector(".stage-edit-number").textContent = "Stage " + (i + 1);

      const icon = card.querySelector(".stage-icon-input");
      const name = card.querySelector(".stage-name-input");
      const sec = card.querySelector(".stage-seconds-input");
      const tip = card.querySelector(".stage-tip-input");

      icon.value = s.icon;
      name.value = s.name;
      sec.value = s.seconds;
      tip.value = s.tip;

      icon.addEventListener("input", e => {
        s.icon = e.target.value || "✨";
        persistStagePlan();
      });
      name.addEventListener("input", e => {
        s.name = e.target.value || "New stage";
        persistStagePlan();
      });
      sec.addEventListener("change", e => {
        s.seconds = Math.max(5, Math.min(180, Number(e.target.value) || 30));
        e.target.value = s.seconds;
        persistStagePlan();
      });
      tip.addEventListener("input", e => {
        s.tip = e.target.value;
        persistStagePlan();
      });
      card.querySelector(".remove-stage").addEventListener("click", () => {
        if (settings.stages.length < 2) return;
        settings.stages.splice(i, 1);
        stageIndex = Math.min(stageIndex, settings.stages.length - 1);
        persistStagePlan();
        renderEditor();
      });
      host.appendChild(card);
    });
  }

  function populate() {
    $("theme-select").value = settings.theme;
    $("song-select").value = settings.song || "sparkle";
    $("break-select").value = String(settings.breakSeconds);
    $("animal-sounds").checked = settings.animalSounds;
    $("ui-sounds").checked = settings.uiSounds;
    $("animations").checked = settings.animations;
    $("reduced-motion").checked = settings.reducedMotion;
    $("motion-sensitivity").value = settings.motionSensitivity;
    $("motion-region").value = settings.motionRegion;
    renderEditor();
  }

  function saveUI() {
    const old = settings.theme;
    settings.theme = $("theme-select").value;
    settings.song = $("song-select").value;
    settings.breakSeconds = Number($("break-select").value);
    settings.animalSounds = $("animal-sounds").checked;
    settings.uiSounds = $("ui-sounds").checked;
    settings.animations = $("animations").checked;
    settings.reducedMotion = $("reduced-motion").checked;
    settings.motionSensitivity = $("motion-sensitivity").value;
    settings.motionRegion = $("motion-region").value;
    settings.stages = cloneStages(settings.stages);
    settings.totalSeconds = total();
    save();
    if (old !== settings.theme) selected = settings.theme === "random" ? randomTheme() : settings.theme;
    applyTheme();
    renderStages();
    reset();
  }

  function openSettings(tab = "buddy-panel") {
    populate();
    switchTab(tab);
    $("settings-dialog").showModal();
  }

  function moveStage(from, to) {
    if (from === to || to < 0 || to >= settings.stages.length) return;
    const [s] = settings.stages.splice(from, 1);
    settings.stages.splice(to, 0, s);
    if (stageIndex === from) stageIndex = to;
    else if (from < stageIndex && to >= stageIndex) stageIndex--;
    else if (from > stageIndex && to <= stageIndex) stageIndex++;
    persistStagePlan();
    renderStages();
    renderEditor();
    render();
  }

  function stopLoop() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    prev = null;
    lastVideoTime = -1;
  }

  function stopCamera(resumeTimer = false) {
    const wasWaiting = phase === "motion-wait";
    const wasMotionPaused = phase === "motion-paused";
    stopLoop();
    dance(false);
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    video.srcObject = null;
    motionOn = false;
    motionArmed = false;
    cameraStarting = false;
    lastVideoTime = -1;
    $("camera-view").hidden = true;
    $("motion-status").textContent = "Camera is off. Nothing is being watched.";
    if (resumeTimer && (wasWaiting || wasMotionPaused)) {
      phase = wasMotionPaused ? "running" : "ready";
      if (wasMotionPaused && clock === null) clock = setInterval(tick, 1000);
      say(wasMotionPaused ? "Camera helper off. Your timer is running normally again." : "Camera helper off. Press Start to brush normally.");
    } else if (wasWaiting || wasMotionPaused) {
      stopClock();
      phase = "paused";
    }
    render();
  }

  function pauseNoMotion() {
    if (phase === "running") {
      stopClock();
      phase = "motion-paused";
      dance(false);
      say("I can't see brushing movement. Your timer is paused—let's get brushing again!");
      $("motion-status").textContent = "No movement detected — timer paused.";
      render();
    }
  }

  function resumeMotion() {
    if (motionArmed && ["motion-wait", "motion-paused"].includes(phase)) {
      phase = "running";
      say("There you go! Keep those brushing moves going!");
      if (clock === null) clock = setInterval(tick, 1000);
      render();
    }
  }

  function grayFrame() {
    ctx.drawImage(video, 0, 0, MW, MH);
    const p = ctx.getImageData(0, 0, MW, MH).data;
    const g = new Uint8Array(MW * MH);
    for (let i = 0, j = 0; i < p.length; i += 4, j++) {
      g[j] = (p[i] * 0.299 + p[i + 1] * 0.587 + p[i + 2] * 0.114) | 0;
    }
    return g;
  }

  function frameChange(a, b) {
    const lim = settings.motionRegion === "center" ? { x0: 18, x1: 78, y0: 10, y1: 62 } : { x0: 4, x1: 92, y0: 4, y1: 68 };
    let changed = 0;
    let sum = 0;
    let count = 0;
    for (let y = lim.y0; y < lim.y1; y += 2) {
      for (let x = lim.x0; x < lim.x1; x += 2) {
        const d = Math.abs(a[y * MW + x] - b[y * MW + x]);
        sum += d;
        count++;
        if (d > 13) changed++;
      }
    }
    return { ratio: changed / count, average: sum / count };
  }

  function sample() {
    if (!stream || !motionOn) return;
    if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      try {
        const frame = grayFrame();
        if (prev) {
          const limits = {
            low: { ratio: 0.045, average: 8 },
            medium: { ratio: 0.03, average: 6 },
            high: { ratio: 0.018, average: 4 }
          };
          const threshold = limits[settings.motionSensitivity] || limits.medium;
          const result = frameChange(prev, frame);
          const active = result.ratio >= threshold.ratio && result.average >= threshold.average;
          if (active) {
            lastMove = performance.now();
            resumeMotion();
            dance(phase === "running");
            $("motion-status").textContent = "Brushing movement detected · " + Math.round(result.ratio * 100) + "% of the target changed";
          } else if (phase === "running" && performance.now() - lastMove > GRACE) {
            pauseNoMotion();
          }
        }
        prev = frame;
      } catch {
        $("motion-status").textContent = "Camera is on, but this browser could not read the video frame.";
      }
    }
    raf = requestAnimationFrame(sample);
  }

  async function startCamera() {
    if (cameraStarting || motionOn) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      $("motion-status").textContent = "Camera needs HTTPS or localhost in this browser.";
      return;
    }
    cameraStarting = true;
    $("motion-toggle").disabled = true;
    $("camera-view").hidden = false;
    $("motion-status").textContent = "Opening your camera…";
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 30 } },
        audio: false
      });
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      canvas.width = MW;
      canvas.height = MH;
      cameraStarting = false;
      $("motion-toggle").disabled = false;
      motionOn = true;
      $("camera-view").hidden = false;
      $("camera-view").dataset.region = settings.motionRegion;
      motionArmed = phase === "running" || phase === "break";
      lastMove = performance.now();
      prev = null;
      lastVideoTime = -1;
      $("motion-status").textContent = "Camera ready. Press Start, then brush inside the target.";
      if (phase === "ready" || phase === "paused") phase = "motion-wait";
      else if (motionArmed) $("motion-status").textContent = "Keep brushing inside the target to keep the timer running.";
      render();
      $("camera-view").hidden = false;
      raf = requestAnimationFrame(sample);
    } catch (e) {
      stopCamera();
      $("motion-toggle").disabled = false;
      $("camera-view").hidden = true;
      $("motion-status").textContent =
        e?.name === "NotAllowedError" ? "Camera permission was denied. The regular timer still works." : "Couldn't start the camera. Check browser permissions.";
    }
  }

  function gestures() {
    let activeContainer = null;
    let activeItem = null;
    let activePointer = null;
    let startX = 0;
    let startY = 0;
    let dragStarted = false;
    let suppressClick = false;

    const begin = (e, container, item) => {
      if (e.button !== undefined && e.button !== 0) return;
      activeContainer = container;
      activeItem = item;
      activePointer = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragStarted = false;
      try {
        container.setPointerCapture(e.pointerId);
      } catch {}
      dragIndex = Number(item.dataset.index);
      clearTimeout(hold);
    };

    const reorderAt = e => {
      if (!activeContainer || activePointer !== e.pointerId) return;
      if (!dragStarted && Math.hypot(e.clientX - startX, e.clientY - startY) < 7) return;
      if (!dragStarted) {
        dragStarted = true;
        dragging = true;
        suppressClick = true;
        activeItem.classList.add("dragging");
      }
      const selector = activeContainer.id === "zone-track" ? ".zone" : ".stage-edit-card";
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(selector);
      if (!over || !activeContainer.contains(over)) return;
      const next = Number(over.dataset.index);
      if (Number.isInteger(next) && next !== dragIndex) {
        moveStage(dragIndex, next);
        dragIndex = next;
      }
    };

    const finish = () => {
      if (!activeContainer) return;
      clearTimeout(hold);
      if (activeItem) activeItem.classList.remove("dragging");
      if (dragStarted) {
        setTimeout(() => {
          suppressClick = false;
        }, 180);
      }
      activeContainer = null;
      activeItem = null;
      activePointer = null;
      dragging = false;
      dragIndex = null;
    };

    $("zone-track").addEventListener("click", e => {
      const b = e.target.closest(".zone");
      if (!b) return;
      if (suppressClick) {
        e.preventDefault();
        return;
      }
      jump(Number(b.dataset.index));
    });

    $("zone-track").addEventListener("pointerdown", e => {
      const b = e.target.closest(".zone");
      if (b) begin(e, $("zone-track"), b);
    });

    $("stage-editor").addEventListener("pointerdown", e => {
      const handle = e.target.closest(".stage-drag-handle");
      if (!handle) return;
      const card = handle.closest(".stage-edit-card");
      if (card) begin(e, $("stage-editor"), card);
    });

    document.addEventListener("pointermove", reorderAt);
    document.addEventListener("pointerup", finish);
    document.addEventListener("pointercancel", finish);
    $("zone-track").addEventListener("contextmenu", e => e.preventDefault());
    $("stage-editor").addEventListener("contextmenu", e => {
      if (e.target.closest(".stage-drag-handle")) e.preventDefault();
    });
  }

  $("settings-open").addEventListener("click", () => openSettings());
  $("settings-close").addEventListener("click", () => $("settings-dialog").close());
  $("settings-save").addEventListener("click", () => {
    $("settings-dialog").close();
    saveUI();
  });
  document.querySelectorAll(".settings-tab").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.panel)));

  $("settings-reset").addEventListener("click", () => {
    settings = { ...DEFAULTS, stages: cloneStages(DEFAULT_STAGES) };
    selected = randomTheme();
    save();
    populate();
    applyTheme();
    renderStages();
    reset();
  });

  $("add-stage").addEventListener("click", () => {
    settings.stages.push({
      id: "new-" + Date.now(),
      name: "New stage",
      icon: "✨",
      tip: "You're doing great! Keep going!",
      seconds: 30
    });
    persistStagePlan();
    renderEditor();
  });

  $("buddy-quick").addEventListener("click", () => {
    const keys = Object.keys(ANIMALS);
    selected = keys[(keys.indexOf(selected) + 1) % keys.length];
    settings.theme = selected;
    $("theme-select").value = selected;
    save();
    applyTheme();
    say("Hello! I'm " + animal()[1] + "!");
  });

  $("start-button").addEventListener("click", start);
  $("pause-button").addEventListener("click", start);
  $("reset-button").addEventListener("click", reset);
  $("music-toggle").addEventListener("click", toggleMusic);
  $("motion-toggle").addEventListener("click", () => (motionOn ? stopCamera(true) : startCamera()));

  $("settings-dialog").addEventListener("click", e => {
    if (e.target === $("settings-dialog")) $("settings-dialog").close();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && ["running", "break"].includes(phase)) {
      pausedFrom = phase;
      stopClock();
      phase = "paused";
      dance(false);
      render();
      say("Paused while you were away. Ready when you are!");
    }
  });

  window.addEventListener("pagehide", stopCamera);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  gestures();
  if (!navigator.mediaDevices?.getUserMedia) $("motion-toggle").disabled = true;

  settings.totalSeconds = total();
  applyTheme();
  renderStages();
  stageLeft = settings.stages[0].seconds;
  populate();
  render();
  renderMusicButton();
  save();
  say("Ready, little superstar? Pick up your toothbrush!");
})();
