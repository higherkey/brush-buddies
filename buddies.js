/* Standalone buddy collection and habitat destinations. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.BB_BUDDIES = factory(root);
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const key = 'brushBuddiesCollectionV1';
  const storageKey = () => key + (root.BB_PROFILE_SCOPE ? ':' + root.BB_PROFILE_SCOPE : '');
  const starters = Object.freeze(['cat', 'bunny']);
  const catalog = [
    ['cat', '🐱', 'Cat', 'meow', 'cottage'],
    ['bunny', '🐰', 'Bunny', 'squeak', 'meadow'],
    ['koala', '🐨', 'Koala', 'koala', 'eucalyptus'],
    ['dog', '🐶', 'Dog', 'woof', 'cottage'],
    ['fox', '🦊', 'Fox', 'yip', 'forest'],
    ['bear', '🐻', 'Bear', 'growl', 'forest'],
    ['panda', '🐼', 'Panda', 'growl', 'bamboo'],
    ['penguin', '🐧', 'Penguin', 'chirp', 'polar'],
    ['owl', '🦉', 'Owl', 'hoot', 'forest'],
    ['lion', '🦁', 'Lion', 'roar', 'savanna'],
    ['frog', '🐸', 'Frog', 'ribbit', 'wetland'],
    ['tiger', '🐯', 'Tiger', 'roar', 'jungle'],
    ['elephant', '🐘', 'Elephant', 'trumpet', 'savanna'],
    ['unicorn', '🦄', 'Unicorn', 'magic', 'rainbow'],
    ['mouse', '🐭', 'Mouse', 'squeak', 'meadow'],
    ['hamster', '🐹', 'Hamster', 'squeak', 'cottage'],
    ['wolf', '🐺', 'Wolf', 'growl', 'forest'],
    ['raccoon', '🦝', 'Raccoon', 'squeak', 'forest'],
    ['deer', '🦌', 'Deer', 'squeak', 'forest'],
    ['moose', '🫎', 'Moose', 'growl', 'forest'],
    ['squirrel', '🐿️', 'Squirrel', 'squeak', 'forest'],
    ['hedgehog', '🦔', 'Hedgehog', 'squeak', 'meadow'],
    ['badger', '🦡', 'Badger', 'growl', 'forest'],
    ['skunk', '🦨', 'Skunk', 'squeak', 'forest'],
    ['beaver', '🦫', 'Beaver', 'squeak', 'wetland'],
    ['otter', '🦦', 'Otter', 'squeak', 'wetland'],
    ['bat', '🦇', 'Bat', 'squeak', 'cave'],
    ['sloth', '🦥', 'Sloth', 'squeak', 'jungle'],
    ['monkey', '🐒', 'Monkey', 'squeak', 'jungle'],
    ['gorilla', '🦍', 'Gorilla', 'growl', 'jungle'],
    ['orangutan', '🦧', 'Orangutan', 'growl', 'jungle'],
    ['leopard', '🐆', 'Leopard', 'roar', 'savanna'],
    ['zebra', '🦓', 'Zebra', 'yip', 'savanna'],
    ['giraffe', '🦒', 'Giraffe', 'squeak', 'savanna'],
    ['rhinoceros', '🦏', 'Rhinoceros', 'growl', 'savanna'],
    ['hippopotamus', '🦛', 'Hippopotamus', 'growl', 'wetland'],
    ['camel', '🐪', 'Camel', 'growl', 'desert'],
    ['kangaroo', '🦘', 'Kangaroo', 'squeak', 'savanna'],
    ['horse', '🐴', 'Horse', 'yip', 'meadow'],
    ['donkey', '🫏', 'Donkey', 'yip', 'meadow'],
    ['cow', '🐮', 'Cow', 'growl', 'meadow'],
    ['pig', '🐷', 'Pig', 'squeak', 'meadow'],
    ['sheep', '🐑', 'Sheep', 'squeak', 'meadow'],
    ['goat', '🐐', 'Goat', 'squeak', 'mountain'],
    ['llama', '🦙', 'Llama', 'squeak', 'mountain'],
    ['bison', '🦬', 'Bison', 'growl', 'savanna'],
    ['boar', '🐗', 'Boar', 'growl', 'forest'],
    ['duck', '🦆', 'Duck', 'chirp', 'wetland'],
    ['goose', '🪿', 'Goose', 'chirp', 'wetland'],
    ['swan', '🦢', 'Swan', 'chirp', 'wetland'],
    ['flamingo', '🦩', 'Flamingo', 'chirp', 'wetland'],
    ['parrot', '🦜', 'Parrot', 'chirp', 'jungle'],
    ['peacock', '🦚', 'Peacock', 'chirp', 'jungle'],
    ['eagle', '🦅', 'Eagle', 'chirp', 'mountain'],
    ['turkey', '🦃', 'Turkey', 'chirp', 'forest'],
    ['chicken', '🐔', 'Chicken', 'chirp', 'meadow'],
    ['dove', '🕊️', 'Dove', 'chirp', 'forest'],
    ['seal', '🦭', 'Seal', 'woof', 'polar'],
    ['dolphin', '🐬', 'Dolphin', 'squeak', 'ocean'],
    ['whale', '🐋', 'Whale', 'magic', 'ocean'],
    ['shark', '🦈', 'Shark', 'magic', 'ocean'],
    ['octopus', '🐙', 'Octopus', 'magic', 'ocean'],
    ['squid', '🦑', 'Squid', 'magic', 'ocean'],
    ['crab', '🦀', 'Crab', 'squeak', 'shore'],
    ['lobster', '🦞', 'Lobster', 'squeak', 'ocean'],
    ['shrimp', '🦐', 'Shrimp', 'squeak', 'ocean'],
    ['jellyfish', '🪼', 'Jellyfish', 'magic', 'ocean'],
    ['turtle', '🐢', 'Turtle', 'squeak', 'wetland'],
    ['crocodile', '🐊', 'Crocodile', 'growl', 'wetland'],
    ['snake', '🐍', 'Snake', 'squeak', 'jungle'],
    ['lizard', '🦎', 'Lizard', 'squeak', 'desert'],
    ['butterfly', '🦋', 'Butterfly', 'magic', 'meadow'],
    ['bee', '🐝', 'Bee', 'squeak', 'meadow'],
    ['ladybug', '🐞', 'Ladybug', 'squeak', 'meadow'],
    ['snail', '🐌', 'Snail', 'squeak', 'meadow']
  ].map(function (row) {
    return Object.freeze({ id: row[0], emoji: row[1], name: row[2], sound: row[3], habitat: row[4] });
  });
  Object.freeze(catalog);
  const byId = new Map(catalog.map(function (buddy) { return [buddy.id, buddy]; }));
  let state, loadedScope;

  function get(id) { return byId.get(id); }
  function sessionValid(id) { return typeof id === 'string' && id.trim().length > 0 && id.length <= 200; }
  function validate(value) {
    const clean = { visits: {}, daily: { date: '', buddy: '' }, completed: [] };
    if (!value || typeof value !== 'object') return clean;
    if (value.visits && typeof value.visits === 'object') {
      catalog.forEach(function (buddy) {
        const count = value.visits[buddy.id];
        if (Object.prototype.hasOwnProperty.call(value.visits, buddy.id) && Number.isSafeInteger(count) && count >= 0) {
          clean.visits[buddy.id] = count;
        }
      });
    }
    if (value.daily && /^\d{4}-\d{2}-\d{2}$/.test(value.daily.date) && get(value.daily.buddy)) {
      const date = new Date(value.daily.date + 'T12:00:00Z');
      if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.daily.date) {
        clean.daily = { date: value.daily.date, buddy: value.daily.buddy };
      }
    }
    if (Array.isArray(value.completed)) clean.completed = Array.from(new Set(value.completed.filter(sessionValid)));
    if (value.credits && typeof value.credits === 'object') clean.credits = Object.fromEntries(Object.entries(value.credits).filter(function (entry) { return sessionValid(entry[0]) && get(entry[1]); }));
    return clean;
  }
  function load() {
    if (loadedScope !== storageKey()) { state = undefined; loadedScope = storageKey(); }
    try {
      state = validate(JSON.parse(root.localStorage.getItem(storageKey())));
      const daily = JSON.parse(root.localStorage.getItem(storageKey() + 'Daily'));
      if (daily) state.daily = validate({ daily: daily }).daily;
    }
    catch (_) { state = state || validate(null); }
    return state;
  }
  function current() { return state || load(); }
  function save(value) {
    state = validate(value === undefined ? current() : value);
    try { root.localStorage.setItem(storageKey(), JSON.stringify(state)); } catch (_) { /* Keep progress in memory when storage is unavailable. */ }
    return state;
  }
  function homeUnlocked(id) { return !!get(id) && (current().visits[id] || 0) >= 3; }
  function unlocked(id) { return !!get(id) && (starters.includes(id) || homeUnlocked(id)); }
  function available() { return catalog.filter(function (buddy) { return unlocked(buddy.id); }).map(function (buddy) { return buddy.id; }); }
  function daily() {
    const now = new Date();
    const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const collection = load();
    if (collection.daily.date !== date) {
      const locked = catalog.filter(function (buddy) { return !unlocked(buddy.id); });
      const pool = locked.length ? locked : catalog;
      collection.daily = { date: date, buddy: pool[Math.floor(Math.random() * pool.length)].id };
      // Daily selection has a separate record so rollover cannot overwrite earned visits.
      try { root.localStorage.setItem(storageKey() + 'Daily', JSON.stringify(collection.daily)); } catch (_) {}
    }
    return current().daily.buddy;
  }
  function complete(sessionId, buddyId) {
    if (!sessionValid(sessionId) || !get(buddyId)) return null;
    const collection = current();
    if (!collection.completed.includes(sessionId)) {
      collection.visits[buddyId] = Math.min(Number.MAX_SAFE_INTEGER, (collection.visits[buddyId] || 0) + 1);
      collection.completed.push(sessionId);
      collection.credits = { ...collection.credits, [sessionId]: buddyId };
      save(collection);
    }
    return { buddy: buddyId, visits: current().visits[buddyId] || 0, unlocked: unlocked(buddyId), homeUnlocked: homeUnlocked(buddyId) };
  }
  function completeInScope(sessionId, buddyId, scope) {
    const previous = root.BB_PROFILE_SCOPE;
    try {
      root.BB_PROFILE_SCOPE = scope;
      load();
      return complete(sessionId, buddyId);
    } finally {
      root.BB_PROFILE_SCOPE = previous;
      load();
    }
  }

  // Habitat templates use the scene vocabulary understood by Adventure Mode.
  const habitats = {
    cottage: ['meadow', '🏡', ['🌳', '🌸', '🏡'], [['Cozy Nook', '🛋️'], ['Garden Path', '🌼'], ['Sunny Window', '🪟'], ['Play Corner', '🧸']]],
    meadow: ['meadow', '🌼', ['🌿', '🌼', '🍀'], [['Clover Patch', '🍀'], ['Grassy Trail', '🌱'], ['Flower Bed', '🌼'], ['Sheltered Nook', '🍃']]],
    eucalyptus: ['forest', '🌿', ['🌳', '🌿', '🍃'], [['Gum Tree', '🌳'], ['Leafy Branch', '🌿'], ['Shady Fork', '🍃'], ['Treetop Nap', '💤']]],
    forest: ['forest', '🌲', ['🌳', '🍄', '🍂'], [['Woodland Trail', '🍂'], ['Hollow Tree', '🪵'], ['Mossy Rock', '🪨'], ['Leafy Clearing', '🌳']]],
    bamboo: ['jungle', '🎋', ['🎋', '🎍', '🌿'], [['Bamboo Grove', '🎋'], ['Leafy Snack', '🍃'], ['Shady Rock', '🪨'], ['Bamboo Trail', '🎍']]],
    polar: ['snow', '🧊', ['❄️', '🧊', '🌊'], [['Ice Shelf', '🧊'], ['Ocean Dip', '🌊'], ['Snowy Rest', '❄️'], ['Fish Cove', '🐟']]],
    savanna: ['desert', '🌅', ['🌾', '🌳', '☀️'], [['Grassland Trail', '🌾'], ['Watering Hole', '💦'], ['Shady Tree', '🌳'], ['Sunny Plain', '☀️']]],
    wetland: ['jungle', '🪷', ['🌿', '🪷', '💧'], [['Reed Bed', '🌾'], ['Pond Edge', '💧'], ['Lily Pool', '🪷'], ['Muddy Bank', '🪨']]],
    jungle: ['jungle', '🌴', ['🌴', '🌿', '🌺'], [['Leafy Trail', '🌿'], ['Tall Canopy', '🌴'], ['Rain Pool', '💧'], ['Shaded Clearing', '🍃']]],
    rainbow: ['sky', '🌈', ['☁️', '🌈', '✨'], [['Rainbow Bridge', '🌈'], ['Cloud Meadow', '☁️'], ['Sparkle Pool', '✨'], ['Starry Rest', '⭐']]],
    cave: ['night', '🦇', ['🌙', '🪨', '⭐'], [['Cave Entrance', '🪨'], ['Roosting Nook', '💤'], ['Moonlit Flight', '🌙'], ['Starry Ledge', '⭐']]],
    desert: ['desert', '🏜️', ['🌵', '🪨', '☀️'], [['Sandy Trail', '🏜️'], ['Warm Rock', '🪨'], ['Oasis', '🌴'], ['Shady Shelter', '🌵']]],
    mountain: ['snow', '🏔️', ['⛰️', '🌾', '☁️'], [['Rocky Trail', '🪨'], ['Alpine Meadow', '🌾'], ['Mountain Stream', '💧'], ['Sheltered Ledge', '⛰️']]],
    ocean: ['beach', '🌊', ['🌊', '🪸', '🐚'], [['Coral Reef', '🪸'], ['Seaweed Garden', '🌿'], ['Sandy Seabed', '🐚'], ['Open Water', '🌊']]],
    shore: ['beach', '🏖️', ['🌊', '🐚', '🪨'], [['Tide Pool', '💧'], ['Sandy Burrow', '🕳️'], ['Shell Beach', '🐚'], ['Rocky Shore', '🪨']]]
  };
  function home(id) {
    const buddy = get(id);
    if (!buddy) return undefined;
    const habitat = habitats[buddy.habitat];
    return {
      id: 'home-' + id, name: buddy.name + "'s Home", emoji: habitat[1], scene: habitat[0],
      backdrop: habitat[2].slice(),
      stops: habitat[3].map(function (stop) { return { name: stop[0], icon: stop[1] }; }),
      stickers: habitat[3].slice(0, 3).map(function (stop, index) {
        return { id: 'home-' + id + '-' + index, emoji: stop[1], name: stop[0] };
      })
    };
  }
  return { catalog: catalog, starters: starters, get: get, load: load, save: save, unlocked: unlocked,
    available: available, daily: daily, complete: complete, completeInScope: completeInScope, homeUnlocked: homeUnlocked, home: home };
}));
