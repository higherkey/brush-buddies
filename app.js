(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const LEGACY_ANIMALS = {
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

  const COLLECTION = window.BB_BUDDIES;
  const ANIMALS = COLLECTION ? Object.fromEntries(COLLECTION.catalog.map(a => [a.id, [a.emoji, a.name, a.sound]])) : LEGACY_ANIMALS;

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
    },
    moonlight: {
      name: "Moonlight Mellow",
      tempo: 210,
      bassRoot: [110, 87, 131, 98], // A2, F2, C3, G2
      melody: [
        659, 0, 784, 659, 523, 0, 659, 523,
        698, 0, 880, 698, 587, 0, 698, 587,
        784, 0, 988, 784, 659, 0, 784, 659,
        587, 659, 698, 659, 587, 523, 494, 523
      ]
    },
    robot: {
      name: "Robo Groove",
      tempo: 145,
      bassRoot: [82, 82, 98, 110], // E2, E2, G2, A2
      melody: [
        330, 330, 659, 330, 494, 330, 659, 494,
        330, 330, 659, 330, 587, 330, 659, 587,
        392, 392, 784, 392, 587, 392, 784, 587,
        440, 440, 880, 440, 659, 494, 440, 330
      ]
    }
  };

  /* Custom melody: note names like "C5 E5 G5 - E5" (`-` is a rest). A4 = 440 Hz. */
  const CUSTOM_TEMPOS = { slow: 220, normal: 175, fast: 140 };
  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

  function parseMelody(text) {
    const tokens = String(text || "").trim().split(/[\s,]+/).filter(Boolean);
    if (tokens.length < 4) return { error: "Add at least 4 notes, like C5 E5 G5 E5." };
    if (tokens.length > 64) return { error: "Use 64 notes or fewer." };
    const melody = [];
    for (const t of tokens) {
      if (t === "-" || t === "_") {
        melody.push(0);
        continue;
      }
      const m = /^([A-Ga-g])([#b]?)([1-7])$/.exec(t);
      if (!m) return { error: "'" + t.slice(0, 8) + "' isn't a note. Try C5, F#4, Bb3 or - for a rest." };
      const midi = 12 * (Number(m[3]) + 1) + SEMITONES[m[1].toUpperCase()] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
      melody.push(Math.round(440 * Math.pow(2, (midi - 69) / 12) * 100) / 100);
    }
    if (!melody.some(Boolean)) return { error: "Add at least one note, not only rests." };
    return { melody };
  }

  function customSong() {
    const parsed = parseMelody(settings.customMelody);
    if (parsed.error) return null;
    const roots = [];
    for (let i = 0; i < parsed.melody.length; i += 8) {
      const f = parsed.melody.slice(i, i + 8).find(Boolean);
      if (f) roots.push(Math.max(40, f / 4));
    }
    return {
      name: "My Melody",
      tempo: CUSTOM_TEMPOS[settings.customTempo] || CUSTOM_TEMPOS.normal,
      bassRoot: roots.length ? roots : [131],
      melody: parsed.melody
    };
  }

  function getSong(key) {
    if (key === "custom") return customSong() || SONGS.sparkle;
    return SONGS[key] || SONGS.sparkle;
  }

  /* A stage may override the default music: "" = default, "silent" = none, or a song key. */
  function stageSongKey() {
    const o = settings.stages[stageIndex]?.sound || "";
    return o && o !== "silent" ? o : settings.song;
  }

  function stageIsSilent() {
    return settings.stages[stageIndex]?.sound === "silent";
  }

  function songOptions() {
    const list = [["", "Use default music"], ["silent", "🔇 No music this stage"]];
    Object.keys(SONGS).forEach(k => list.push([k, SONGS[k].name]));
    list.push(["custom", "🎹 My Melody"]);
    return list;
  }

  const DEFAULTS = {
    theme: "random",
    song: "sparkle",
    customMelody: "C5 E5 G5 E5 C5 E5 G5 C6",
    customTempo: "normal",
    breakSeconds: 3,
    animalSounds: true,
    uiSounds: true,
    musicOn: true,
    appearance: "auto",
    animations: true,
    reducedMotion: false,
    motionSensitivity: "medium",
    motionRegion: "center",
    motionTarget: "auto",
    motionTargetX: 0.5,
    motionTargetY: 0.6,
    motionTargetSize: 0.5,
    motionAutoPause: false,
    motionBrushType: "manual",
    experience: "adventure",
    storyText: false,
    stages: DEFAULT_STAGES
  };

  const KEY = "brushBuddiesSettingsV2";
  const CIRC = 2 * Math.PI * 99;
  const GRACE = 2500;

  function cloneStages(a) {
    return a.map((s, i) => ({
      id: String(s.id || "stage" + i),
      name: String(s.name || "Stage " + (i + 1)),
      icon: String(s.icon || "✨"),
      tip: String(s.tip || "Keep going!"),
      seconds: Math.max(5, Math.min(180, Number(s.seconds) || 30)),
      sound: String(s.sound || "")
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
  let selected = settings.experience === "adventure" && COLLECTION ? COLLECTION.daily() : settings.theme === "random" ? randomTheme() : settings.theme;
  if (COLLECTION && settings.experience === "simple" && !COLLECTION.unlocked(selected)) selected = "cat";
  let sessionId = crypto.randomUUID();
  let stageIndex = 0;
  let stageLeft = 0;
  let breakLeft = 0;
  let phase = "ready";
  let pausedFrom = "running";
  let clock = null;
  let audio = null;
  let sessionElapsed = 0;
  const stageProgress = {}; // seconds left per stage id, so switching stages never loses progress
  let musicTimer = null;
  let musicStep = 0;

  let stream = null;
  let cameraStarting = false;
  let motionOn = false;
  let motionArmed = false;
  let motionActive = false;
  let lastMove = 0;
  let cameraHelper = null;
  let cameraGeneration = 0;
  let replayURL = null;
  let cameraStatus = "";
  let cameraCalibrating = false;
  const video = $("motion-preview");
  const overlay = $("motion-overlay");

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

  /* Appearance: "auto" follows the device, otherwise force light or dark. */
  const darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function applyAppearance() {
    const dark = settings.appearance === "dark" || (settings.appearance !== "light" && Boolean(darkQuery?.matches));
    document.documentElement.dataset.scheme = dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#172625" : "#fff5f7");
  }

  function randomTheme() {
    const a = COLLECTION ? COLLECTION.available() : Object.keys(ANIMALS);
    return a[Math.floor(Math.random() * a.length)];
  }

  function animal() {
    return ANIMALS[selected] || ANIMALS.cat;
  }

  function total() {
    return settings.stages.reduce((n, s) => n + s.seconds, 0);
  }

  /* Seconds left in stage i: its saved progress, or its full time if untouched. */
  function leftOf(i) {
    const s = settings.stages[i];
    const saved = stageProgress[s.id];
    return saved === undefined ? s.seconds : Math.min(saved, s.seconds);
  }

  function saveStageLeft() {
    const s = settings.stages[stageIndex];
    if (!s) return;
    // A finished stage that was revisited but not brushed stays finished.
    if (stageProgress[s.id] === 0 && stageLeft === s.seconds) return;
    stageProgress[s.id] = stageLeft;
  }

  /* Next stage, in order and wrapping around, that still has time left (-1 if none). */
  function nextPending() {
    const n = settings.stages.length;
    for (let k = 1; k < n; k++) {
      const i = (stageIndex + k) % n;
      if (leftOf(i) > 0) return i;
    }
    return -1;
  }

  function remaining() {
    return settings.stages.reduce((n, s, i) => n + (i === stageIndex ? stageLeft : leftOf(i)), 0);
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

  /* Adventure Mode listens to these events; Simple mode ignores them. */
  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent("bb:" + name, { detail }));
  }

  function snapshot() {
    return {
      phase,
      pausedFrom,
      stageIndex,
      stageLeft,
      stageSeconds: settings.stages[stageIndex]?.seconds || 0,
      stageCount: settings.stages.length,
      stage: settings.stages[stageIndex] ? { ...settings.stages[stageIndex] } : null,
      sessionElapsed,
      buddy: selected,
      buddyName: animal()[1],
      buddyEmoji: animal()[0],
      sessionId,
      profileScope: window.BB_PROFILE_SCOPE || '',
      progress: total() ? Math.max(0, Math.min(1, 1 - settings.stages.reduce((sum, stage, i) => sum + (i === stageIndex ? stageLeft : leftOf(i)), 0) / total())) : 0,
      experience: settings.experience,
      storyText: settings.storyText,
      calm: !settings.animations || settings.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };
  }

  function renderModeButton() {
    const on = settings.experience === "adventure";
    $("mode-toggle").setAttribute("aria-pressed", String(on));
    $("mode-toggle").classList.toggle("enabled", on);
  }

  function setExperience(mode) {
    settings.experience = mode === "adventure" ? "adventure" : "simple";
    if (COLLECTION) {
      selected = settings.experience === "adventure" ? COLLECTION.daily() : COLLECTION.unlocked(settings.theme) ? settings.theme : "cat";
      applyTheme();
    }
    save();
    $("app").dataset.mode = settings.experience;
    $("experience-select").value = settings.experience;
    renderModeButton();
    render();
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
  const MUSIC_CEILING = 880;
  let musicBus = null;

  /* One shared low-pass filter keeps the square-wave highs from getting piercing. */
  function getMusicBus(ctx) {
    if (!musicBus || musicBus.context !== ctx) {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2000;
      filter.Q.value = 0.4;
      filter.connect(ctx.destination);
      musicBus = filter;
    }
    return musicBus;
  }

  function shouldPlayMusic() {
    return settings.musicOn && !stageIsSilent() && (phase === "running" || phase === "break");
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
      const activeSong = getSong(stageSongKey());
      const step = musicStep % activeSong.melody.length;
      const now = ctx.currentTime;

      // Everything (melody, bass, harmony, percussion) shares one key shift so the
      // parts stay in tune with each other. Stages move the key up a little; breaks drop it.
      const semitoneShift = isBreak ? -2 : [0, 0, 2, 4][stageIndex % 4];
      const keyRatio = Math.pow(2, semitoneShift / 12);

      // Loop number and variation: the arrangement changes each pass so it never gets stale.
      const loop = Math.floor(musicStep / activeSong.melody.length);
      const variation = loop % 4;

      const baseMelody = activeSong.melody[step];
      const rest = !baseMelody;
      // Fold high notes down an octave so the lead never gets piercing.
      const fold = f => {
        let x = f;
        while (x > MUSIC_CEILING) x /= 2;
        return x;
      };
      const melodyFreq = fold(baseMelody * keyRatio * (isBreak ? 0.5 : 1));
      const bassRoots = activeSong.bassRoot;
      const bassBase = bassRoots[Math.floor(step / 8) % bassRoots.length] * keyRatio;
      const bassFreq = variation % 2 === 1 ? bassBase * 2 : bassBase;

      const bus = getMusicBus(ctx);
      const note = (freq, duration, wave, volume, delay = 0) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const at = now + delay;
        o.type = wave;
        o.frequency.setValueAtTime(freq, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(volume, at + 0.012);
        g.gain.setValueAtTime(volume * 0.72, at + duration * 0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        o.connect(g);
        g.connect(bus);
        o.start(at);
        o.stop(at + duration + 0.01);
      };

      // Lead voice: softer timbres on alternate passes.
      const leadWave = isBreak ? "sine" : variation === 1 ? "triangle" : "square";
      const leadVol = isBreak ? 0.016 : variation === 1 ? 0.034 : variation === 3 ? 0.02 : 0.022;
      if (!rest) note(melodyFreq, 0.145, leadWave, leadVol);

      // Variation 3 doubles the lead with a warm triangle an octave below.
      if (variation === 3 && !rest && !isBreak) note(melodyFreq / 2, 0.145, "triangle", 0.02);

      // Harmony on even beats: a fifth or an octave, both consonant with any note.
      if (step % 2 === 0 && !isBreak && !rest && variation !== 2) {
        const harmonyMult = loop % 2 === 0 ? 2 : 1.5;
        note(fold(melodyFreq * harmonyMult), 0.075, "triangle", 0.011, 0.018);
      }

      // Bass on chord changes, busier on variation 2.
      const bassEvery = variation === 2 ? 2 : 4;
      if (step % bassEvery === 0) {
        note(bassFreq, isBreak ? 0.35 : 0.25, "triangle", isBreak ? 0.024 : 0.032);
      }

      // Soft, low percussion tick on backbeats (skipped on variations 1 and 2 for breathing room).
      if (step % 8 === 4 && !isBreak && (variation === 0 || variation === 3)) {
        note(bassBase * 4, 0.05, "triangle", 0.012, 0.025);
      }
    } catch {}

    musicStep++;
    const baseTempo = getSong(stageSongKey()).tempo || 175;
    const currentTempo = isBreak ? baseTempo + 50 : baseTempo;
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
    $("app").dataset.mode = settings.experience;
    renderModeButton();
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

  /* Touching the buddy makes it bounce and make its sound. */
  function pokeBuddy() {
    const buddy = $("buddy");
    if (settings.animations) {
      buddy.classList.remove("poked");
      void buddy.offsetWidth; // restart the animation on rapid taps
      buddy.classList.add("poked");
    }
    animalSound();
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
      b.classList.toggle("done", phase === "done" || (i !== stageIndex && stageProgress[settings.stages[i].id] === 0));
    });

    $("start-button").hidden = !["ready", "done"].includes(phase);
    $("pause-button").hidden = !["running", "break", "paused", "motion-wait", "motion-paused"].includes(phase);

    const waitingForStart = phase === "motion-wait" && !motionArmed;
    const canPause = ["running", "break"].includes(phase) || (phase === "motion-wait" && motionArmed);
    $("pause-button-icon").textContent = canPause ? "Ⅱ" : "▶";
    $("pause-button-label").textContent = waitingForStart ? "Start brushing" : canPause ? "Pause" : "Resume";
    $("timer-ring").setAttribute("aria-label",
      canPause ? "Pause brushing" : waitingForStart || ["ready", "done"].includes(phase) ? "Start brushing" : "Resume brushing");
    $("pause-button").setAttribute("aria-label", waitingForStart ? "Start brushing" : canPause ? "Pause brushing" : "Resume brushing");

    $("motion-toggle").classList.toggle("enabled", motionOn);
    $("motion-toggle").setAttribute("aria-pressed", String(motionOn));
    $("motion-toggle-label").textContent = motionOn ? "Camera on" : "Camera off";
    $("camera-view").hidden = !motionOn;
    $("camera-view").dataset.region = settings.motionRegion;
    syncMusic();
    emit("render", snapshot());
  }

  function stopClock() {
    if (clock !== null) clearInterval(clock);
    clock = null;
  }

  function reset() {
    sessionId = crypto.randomUUID();
    stopClock();
    sessionElapsed = 0;
    Object.keys(stageProgress).forEach(k => delete stageProgress[k]);
    stageIndex = 0;
    stageLeft = settings.stages[0].seconds;
    breakLeft = 0;
    phase = motionOn && cameraPauses() ? "motion-wait" : "ready";
    motionArmed = false;
    dance(false);
    $("buddy-area").classList.remove("celebrate");
    emit("reset", null);
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
    emit("finish", snapshot());
  }

  function advance() {
    if (nextPending() < 0) {
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
    const next = nextPending();
    if (next < 0) {
      finish();
      return;
    }
    stageIndex = next;
    stageLeft = leftOf(next);
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
      if (stageLeft <= 0) stageLeft = 0;
      saveStageLeft();
      if (stageLeft === 0) {
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
      pausedFrom = breakLeft > 0 ? "break" : "running";
      phase = "paused";
      stopClock();
      dance(false);
      say("Paused. Press the big button when you're ready!");
      render();
      return;
    }
    if (["ready", "paused", "motion-paused", "motion-wait"].includes(phase)) {
      if (motionOn) motionArmed = true;
      if (motionOn && cameraPauses()) {
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
      motionArmed = false;
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
    saveStageLeft();
    stageIndex = i;
    stageLeft = leftOf(i) > 0 ? leftOf(i) : settings.stages[i].seconds;
    breakLeft = 0;
    phase = motionOn && cameraPauses() ? "motion-wait" : was ? "running" : "ready";
    if (was && !(motionOn && cameraPauses())) {
      speakStage();
      clock = setInterval(tick, 1000);
    } else {
      const partial = stageLeft < settings.stages[i].seconds;
      say("Jumped to " + settings.stages[i].name + (partial ? ". " + fmt(stageLeft) + " left to go." : "."));
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
        '<div class="stage-edit-heading"><span class="stage-drag-handle" role="button" tabindex="0" aria-label="Hold and drag to reorder stage">⠿</span><span class="stage-edit-number"></span><button class="text-button remove-stage" type="button">Remove</button></div>' +
        '<div class="stage-fields"><label>Picture<input class="stage-icon-input" maxlength="4"></label><label>Stage name<input class="stage-name-input" maxlength="28"></label><label>Seconds<input class="stage-seconds-input" type="number" min="5" max="180" step="5"></label></div>' +
        '<label class="tip-field">Reminder<textarea class="stage-tip-input" rows="2" maxlength="140"></textarea></label>' +
        '<label class="tip-field">Music for this stage<select class="select-control stage-sound-input"></select></label>';
      card.querySelector(".stage-edit-number").textContent = "Stage " + (i + 1);

      const icon = card.querySelector(".stage-icon-input");
      const name = card.querySelector(".stage-name-input");
      const sec = card.querySelector(".stage-seconds-input");
      const tip = card.querySelector(".stage-tip-input");
      const sound = card.querySelector(".stage-sound-input");
      songOptions().forEach(([value, label]) => sound.appendChild(new Option(label, value)));
      sound.value = songOptions().some(o => o[0] === s.sound) ? s.sound : "";

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
        delete stageProgress[s.id];
        e.target.value = s.seconds;
        persistStagePlan();
      });
      tip.addEventListener("input", e => {
        s.tip = e.target.value;
        persistStagePlan();
      });
      sound.addEventListener("change", e => {
        s.sound = e.target.value;
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
    if (COLLECTION) {
      const select = $("theme-select");
      select.replaceChildren(new Option("Surprise me (unlocked buddies)", "random"));
      COLLECTION.catalog.forEach(a => {
        const option = new Option(a.name + (COLLECTION.unlocked(a.id) ? "" : " — complete 3 adventures to unlock"), a.id);
        option.disabled = !COLLECTION.unlocked(a.id);
        select.add(option);
      });
    }
    $("theme-select").value = settings.theme;
    $("song-select").value = settings.song || "sparkle";
    $("custom-melody").value = settings.customMelody;
    $("custom-tempo").value = settings.customTempo;
    checkCustomMelody();
    $("appearance-select").value = settings.appearance;
    $("break-select").value = String(settings.breakSeconds);
    $("animal-sounds").checked = settings.animalSounds;
    $("ui-sounds").checked = settings.uiSounds;
    $("animations").checked = settings.animations;
    $("reduced-motion").checked = settings.reducedMotion;
    $("experience-select").value = settings.experience;
    $("story-text").checked = settings.storyText;
    $("motion-sensitivity").value = settings.motionSensitivity;
    $("motion-region").value = settings.motionRegion;
    $("motion-target").value = settings.motionTarget;
    $("motion-target-x").value = String(Math.round((1 - settings.motionTargetX) * 100));
    $("motion-target-y").value = String(Math.round(settings.motionTargetY * 100));
    $("motion-target-size").value = String(Math.round(settings.motionTargetSize * 100));
    $("motion-auto-pause").checked = settings.motionAutoPause;
    $("motion-brush-type").value = settings.motionBrushType;
    $("manual-target-controls").hidden = settings.motionTarget !== "manual";
    $("motion-auto-pause").disabled = settings.motionBrushType === "electric";
    renderEditor();
  }

  function checkCustomMelody() {
    const r = parseMelody($("custom-melody").value);
    const help = $("custom-melody-help");
    help.textContent = r.error || "Looks good! " + r.melody.length + " steps. Pick My Melody as your music or for a stage.";
    help.classList.toggle("error-text", Boolean(r.error));
    return !r.error;
  }

  let settingsBeforeDialog = "";

  function sessionSettings() {
    const { experience, storyText, ...rest } = settings;
    return JSON.stringify(rest);
  }

  function saveUI() {
    const old = settings.theme;
    settings.theme = $("theme-select").value;
    settings.song = $("song-select").value;
    if (checkCustomMelody()) settings.customMelody = $("custom-melody").value.trim();
    settings.customTempo = $("custom-tempo").value;
    settings.appearance = $("appearance-select").value;
    settings.breakSeconds = Number($("break-select").value);
    settings.animalSounds = $("animal-sounds").checked;
    settings.uiSounds = $("ui-sounds").checked;
    settings.animations = $("animations").checked;
    settings.reducedMotion = $("reduced-motion").checked;
    settings.experience = $("experience-select").value === "adventure" ? "adventure" : "simple";
    settings.storyText = $("story-text").checked;
    settings.motionSensitivity = $("motion-sensitivity").value;
    settings.motionRegion = $("motion-region").value;
    readCameraSettings();
    settings.stages = cloneStages(settings.stages);
    settings.totalSeconds = total();
    save();
    if (old !== settings.theme) selected = settings.theme === "random" ? randomTheme() : COLLECTION && !COLLECTION.unlocked(settings.theme) ? "cat" : settings.theme;
    applyTheme();
    renderStages();
    if (sessionSettings() !== settingsBeforeDialog) reset();
    else render();
  }

  function openSettings(tab = "buddy-panel") {
    settingsBeforeDialog = sessionSettings();
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

  function cameraPauses() {
    return settings.motionAutoPause && settings.motionBrushType !== "electric";
  }

  function cameraOptions() {
    return { sensitivity: settings.motionSensitivity, region: settings.motionRegion,
      target: settings.motionTarget, targetX: settings.motionTargetX,
      targetY: settings.motionTargetY, targetSize: settings.motionTargetSize,
      brushType: settings.motionBrushType };
  }

  function readCameraSettings() {
    settings.motionSensitivity = $("motion-sensitivity").value;
    settings.motionRegion = $("motion-region").value;
    settings.motionTarget = $("motion-target").value;
    settings.motionTargetX = 1 - Number($("motion-target-x").value) / 100;
    settings.motionTargetY = Number($("motion-target-y").value) / 100;
    settings.motionTargetSize = Number($("motion-target-size").value) / 100;
    settings.motionAutoPause = $("motion-auto-pause").checked;
    settings.motionBrushType = $("motion-brush-type").value;
    $("manual-target-controls").hidden = settings.motionTarget !== "manual";
    $("motion-auto-pause").disabled = settings.motionBrushType === "electric";
  }

  function stopLoop() {
    cameraHelper?.stop();
    cameraHelper = null;
  }

  function cameraMessage(key, message) {
    if (key !== cameraStatus) {
      cameraStatus = key;
      $("motion-status").textContent = message;
    }
  }

  function stopCamera(resumeTimer = false) {
    cameraGeneration++;
    const wasWaiting = phase === "motion-wait";
    const wasMotionPaused = phase === "motion-paused";
    stopLoop();
    dance(false);
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    video.removeAttribute("src");
    video.load();
    if (replayURL) URL.revokeObjectURL(replayURL);
    replayURL = null;
    motionOn = false;
    motionArmed = false;
    if (["motion-wait", "motion-paused"].includes(pausedFrom)) pausedFrom = "running";
    cameraStarting = false;
    cameraCalibrating = false;
    $("motion-toggle").disabled = false;
    $("motion-calibrate").disabled = true;
    $("motion-replay").value = "";
    overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
    cameraMessage("off", "Camera is off. Nothing is being watched.");
    if (resumeTimer === true && (wasWaiting || wasMotionPaused)) {
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
      phase = breakLeft > 0 ? "break" : "running";
      say("There you go! Keep those brushing moves going!");
      if (clock === null) clock = setInterval(tick, 1000);
      render();
    }
  }

  function cameraResult(result) {
    if (!motionOn || document.hidden) return;
    const context = overlay.getContext("2d");
    if (overlay.width !== video.videoWidth || overlay.height !== video.videoHeight) {
      overlay.width = video.videoWidth || 640;
      overlay.height = video.videoHeight || 480;
    }
    context.clearRect(0, 0, overlay.width, overlay.height);
    if (result.region) {
      const r = result.region;
      context.strokeStyle = result.active ? "#9df1b5" : "#ffe16b";
      context.lineWidth = Math.max(2, overlay.width / 160);
      if (result.corners) {
        context.beginPath();
        result.corners.forEach((point, index) => index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y));
        context.closePath();
        context.stroke();
      } else context.strokeRect(r.x, r.y, r.width, r.height);
    }
    $("motion-strength").value = Math.round((result.score || 0) * 100);
    $("motion-diagnostics").textContent =
      (result.faceFound ? "Face tracked" : settings.motionTarget === "manual" ? "Adjustable target" : "Face not found") +
      " · Motion " + Math.round((result.score || 0) * 100) + "% · " +
      (result.state || "uncertain") + " · " + (result.latency || 0) + " ms processing · Up to 10 samples/sec" +
      (replayURL ? " · Local test video" : "");
    const calibrationFinished = ["complete", "failed"].includes(result.calibration);
    const calibrating = cameraCalibrating || result.state === "calibrating" || ["quiet", "brushing"].includes(result.calibration);
    if (calibrating) {
      if (cameraPauses() && phase === "running") pauseNoMotion();
      dance(false);
      lastMove = performance.now();
      if (calibrationFinished) {
        cameraCalibrating = false;
        cameraMessage("calibration-" + result.calibration, result.calibration === "complete"
          ? "Calibration complete. Brush normally to move your buddy."
          : "Calibration could not separate brushing from stillness. Try again with better lighting or a smaller target.");
        return;
      }
      cameraMessage("calibration-" + result.calibration, result.calibration === "brushing"
        ? "Now brush normally for three seconds. Keep your face in view."
        : "Learning the camera noise. Hold still for two seconds and keep your face in view.");
      return;
    }
    if (result.active) {
      lastMove = Number.isFinite(result.now) ? result.now : performance.now();
      if (cameraPauses()) resumeMotion();
      dance(phase === "running");
      cameraMessage("brushing", "Brushing movement detected. Keep going!");
    } else {
      dance(false);
      if (cameraPauses() && phase === "running" && performance.now() - lastMove > GRACE) pauseNoMotion();
      if (result.calibration === "failed") {
        cameraMessage("calibration-failed", "Calibration could not separate brushing from stillness. Try again with better lighting or a smaller target.");
      } else if (result.state === "uncertain") {
        cameraMessage("uncertain", result.reason === "no-face"
          ? "Bring your face into view, or choose an adjustable target in Camera settings."
          : "Tracking is uncertain. Check the video and keep the mouth area visible.");
      } else if (settings.motionBrushType === "electric") {
        cameraMessage("electric", "Electric brush: the timer keeps running. Tiny vibrations may not be visible to the camera.");
      } else {
        cameraMessage("idle-" + result.calibration, result.calibration === "complete"
          ? "Calibration saved for this camera session. Brush normally to move your buddy."
          : cameraPauses() ? "Waiting for brushing movement. Keep the brush near your mouth inside the target."
            : "Camera Assist is watching for movement. Your timer runs normally after Start.");
      }
    }
  }

  async function startCamera(file = null) {
    if (cameraStarting || motionOn) return;
    if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap ||
        (!file && !navigator.mediaDevices?.getUserMedia)) {
      $("camera-view").hidden = false;
      cameraMessage("unsupported", "Camera tracking needs a current browser on HTTPS or localhost. The regular timer still works.");
      return;
    }
    const generation = ++cameraGeneration;
    cameraStarting = true;
    $("motion-toggle").disabled = true;
    $("camera-view").hidden = false;
    cameraMessage("loading", file ? "Opening your local test video…" : "Opening your camera and loading face tracking…");
    try {
      if (file) {
        replayURL = URL.createObjectURL(file);
        video.src = replayURL;
        video.loop = true;
      } else {
        const opened = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 30 } },
          audio: false
        });
        if (generation !== cameraGeneration) { opened.getTracks().forEach(t => t.stop()); return; }
        stream = opened;
        video.srcObject = stream;
        stream.getVideoTracks()[0].addEventListener("ended", () => {
          if (generation === cameraGeneration) cameraFailure(new Error("The camera disconnected."));
        }, { once: true });
      }
      await video.play();
      if (generation !== cameraGeneration) return;
      cameraHelper = new window.BrushCamera(cameraResult, cameraFailure);
      cameraHelper.configure(cameraOptions());
      await cameraHelper.start(video);
      if (generation !== cameraGeneration) return;
      cameraStarting = false;
      $("motion-toggle").disabled = false;
      $("motion-calibrate").disabled = false;
      motionOn = true;
      motionArmed = phase === "running" || phase === "break";
      lastMove = performance.now();
      if (cameraPauses() && (phase === "ready" || phase === "paused")) phase = "motion-wait";
      render();
      cameraMessage("ready", "Face tracking is ready. Press Start to brush, or Calibrate to learn your movement.");
    } catch (error) {
      if (generation !== cameraGeneration) return;
      cameraFailure(error);
    }
  }

  function cameraFailure(error) {
    const strict = cameraPauses();
    const wasRunning = phase === "running" || phase === "break";
    stopCamera();
    if (strict && wasRunning) {
      stopClock();
      pausedFrom = phase;
      phase = "paused";
      render();
    }
    $("camera-view").hidden = false;
    cameraMessage("error", error?.name === "NotAllowedError"
      ? "Camera permission was denied. The regular timer still works."
      : "Camera tracking could not start or stopped. Reload and try again; the regular timer still works.");
  }

  function gestures() {
    let activeContainer = null;
    let activeItem = null;
    let activePointer = null;
    let startX = 0;
    let startY = 0;
    let dragStarted = false;
    let suppressClick = false;

    const HOLD_MS = 380; // press and hold this long before a stage can be dragged
    const HOLD_SLOP = 10; // moving further than this (px) before the hold finishes cancels it

    const clearHold = () => {
      if (hold !== null) clearTimeout(hold);
      hold = null;
    };

    // Nothing is captured on a plain tap, so taps and scrolling keep working normally.
    const begin = (e, container, item) => {
      if (e.button !== undefined && e.button !== 0) return;
      clearHold();
      activeContainer = container;
      activeItem = item;
      activePointer = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      dragStarted = false;
      dragIndex = Number(item.dataset.index);
      hold = setTimeout(() => {
        hold = null;
        if (!activeContainer) return;
        dragStarted = true;
        dragging = true;
        suppressClick = true;
        activeItem.classList.add("dragging");
        try {
          activeContainer.setPointerCapture(activePointer);
        } catch {}
        if (navigator.vibrate) navigator.vibrate(15);
        say("Picked up " + (settings.stages[dragIndex]?.name || "stage") + ". Drag to move it.");
      }, HOLD_MS);
    };

    const reorderAt = e => {
      if (!activeContainer || activePointer !== e.pointerId) return;
      if (!dragStarted) {
        // Moved before the hold finished: this is a swipe or scroll, not a drag.
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > HOLD_SLOP) {
          clearHold();
          activeContainer = null;
          activeItem = null;
          activePointer = null;
        }
        return;
      }
      const selector = activeContainer.id === "zone-track" ? ".zone" : ".stage-edit-card";
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(selector);
      if (!over || !activeContainer.contains(over)) return;
      const next = Number(over.dataset.index);
      if (Number.isInteger(next) && next !== dragIndex) {
        moveStage(dragIndex, next);
        dragIndex = next;
        activeItem = activeContainer.querySelector(selector + '[data-index="' + next + '"]');
        if (activeItem) activeItem.classList.add("dragging");
      }
    };

    const finish = () => {
      if (!activeContainer) return;
      clearHold();
      document.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
      if (dragStarted) {
        setTimeout(() => {
          suppressClick = false;
        }, 180);
      }
      activeContainer = null;
      activeItem = null;
      activePointer = null;
      dragStarted = false;
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
    // Once a drag has started, stop the page from scrolling under the finger.
    document.addEventListener("touchmove", e => {
      if (dragging) e.preventDefault();
    }, { passive: false });
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
    cameraCalibrating = false;
    cameraHelper?.configure(cameraOptions());
    applyAppearance();
    applyTheme();
    renderStages();
    reset();
  });

  $("custom-melody").addEventListener("input", () => {
    if (checkCustomMelody()) {
      settings.customMelody = $("custom-melody").value.trim();
      save();
    }
  });
  $("custom-tempo").addEventListener("change", () => {
    settings.customTempo = $("custom-tempo").value;
    save();
  });

  $("appearance-select").addEventListener("change", () => {
    settings.appearance = $("appearance-select").value;
    save();
    applyAppearance();
  });
  if (darkQuery) darkQuery.addEventListener("change", applyAppearance);

  // Mode and story text apply at once, without resetting the timer.
  $("experience-select").addEventListener("change", () => setExperience($("experience-select").value));
  $("story-text").addEventListener("change", () => {
    settings.storyText = $("story-text").checked;
    save();
    render();
  });
  $("mode-toggle").addEventListener("click", () => {
    setExperience(settings.experience === "adventure" ? "simple" : "adventure");
    say(settings.experience === "adventure" ? "Adventure mode! Let's explore while we brush." : "Simple timer mode.");
  });

  $("add-stage").addEventListener("click", () => {
    settings.stages.push({
      id: "new-" + Date.now(),
      name: "New stage",
      icon: "✨",
      tip: "You're doing great! Keep going!",
      seconds: 30,
      sound: ""
    });
    persistStagePlan();
    renderEditor();
  });

  $("buddy-quick").addEventListener("click", () => {
    const keys = COLLECTION ? COLLECTION.available() : Object.keys(ANIMALS);
    selected = keys[(keys.indexOf(selected) + 1) % keys.length];
    settings.theme = selected;
    $("theme-select").value = selected;
    save();
    applyTheme();
    say("Hello! I'm " + animal()[1] + "!");
    render();
  });

  document.addEventListener("bb:choose", event => {
    if (!COLLECTION?.unlocked(event.detail)) return;
    selected = event.detail;
    settings.theme = selected;
    save();
    applyTheme();
    render();
  });

  $("start-button").addEventListener("click", start);
  $("pause-button").addEventListener("click", start);
  /* The clock itself is a play/pause control, same as the buttons. */
  $("timer-ring").addEventListener("click", start);
  $("timer-ring").addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      start();
    }
  });
  $("reset-button").addEventListener("click", reset);
  $("music-toggle").addEventListener("click", toggleMusic);
  $("buddy").addEventListener("pointerdown", pokeBuddy);
  $("buddy").addEventListener("animationend", e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove("poked");
  });
  $("motion-toggle").addEventListener("click", () => (motionOn ? stopCamera(true) : startCamera()));
  $("motion-calibrate").addEventListener("click", () => {
    if (!motionOn) return;
    cameraCalibrating = true;
    if (cameraPauses() && phase === "running") pauseNoMotion();
    cameraHelper?.calibrate();
    cameraMessage("calibration-quiet", "Hold still for two seconds, then brush when prompted. Calibration stays on this device.");
  });
  for (const id of ["motion-sensitivity", "motion-region", "motion-target", "motion-target-x", "motion-target-y", "motion-target-size", "motion-auto-pause", "motion-brush-type"]) {
    $(id).addEventListener("change", () => {
      readCameraSettings();
      save();
      cameraCalibrating = false;
      cameraHelper?.configure(cameraOptions());
      lastMove = performance.now();
      if (cameraPauses() && ["running", "break"].includes(phase)) motionArmed = true;
      if (!cameraPauses() && ["motion-wait", "motion-paused"].includes(phase)) {
        const resume = phase === "motion-paused" || motionArmed;
        phase = resume ? (breakLeft > 0 ? "break" : "running") : "ready";
        if (resume && clock === null) clock = setInterval(tick, 1000);
      }
      render();
    });
  }
  $("motion-replay").addEventListener("change", () => {
    const file = $("motion-replay").files[0];
    if (!file) return;
    stopCamera();
    $("settings-dialog").close();
    startCamera(file);
  });

  $("settings-dialog").addEventListener("click", e => {
    if (e.target === $("settings-dialog")) $("settings-dialog").close();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && (motionOn || cameraStarting)) stopCamera();
    if (document.hidden && ["running", "break"].includes(phase)) {
      pausedFrom = phase;
      stopClock();
      phase = "paused";
      dance(false);
      render();
      say("Paused while you were away. Ready when you are!");
    }
  });

  window.addEventListener("pagehide", () => stopCamera());

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  gestures();
  if (!navigator.mediaDevices?.getUserMedia) $("motion-toggle").disabled = true;

  function refreshCollection() {
    COLLECTION.load();
    selected = settings.experience === 'adventure' ? COLLECTION.daily() : COLLECTION.unlocked(settings.theme) ? settings.theme : 'cat';
    applyTheme();
    reset();
  }
  window.BrushBuddies = Object.freeze({ snapshot, say, tone, refreshCollection });
  settings.totalSeconds = total();
  applyAppearance();
  applyTheme();
  renderStages();
  stageLeft = settings.stages[0].seconds;
  populate();
  render();
  renderMusicButton();
  save();
  say("Ready, little superstar? Pick up your toothbrush!");
})();
