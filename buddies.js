/* Standalone buddy collection and habitat destinations. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(root);
  else root.BB_BUDDIES = factory(root);
}(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const key = 'brushBuddiesCollectionV1';
  const storageKey = () => key + (root.BB_PROFILE_SCOPE ? ':' + root.BB_PROFILE_SCOPE : '');
  const simplePrefix = 'simple:';
  const simpleGoal = 3;
  const starters = Object.freeze(['cat', 'bunny']);
  const catalog = [
    ['cat', '🐱', 'Toebean the Cat', 'meow', 'cottage'],
    ['bunny', '🐰', 'Bubbles the Bunny', 'squeak', 'meadow'],
    ['koala', '🐨', 'Koko the Koala', 'koala', 'eucalyptus'],
    ['dog', '🐶', 'Scout the Puppy', 'woof', 'cottage'],
    ['fox', '🦊', 'Finn the Fox', 'yip', 'forest'],
    ['bear', '🐻', 'Benny the Bear', 'growl', 'forest'],
    ['panda', '🐼', 'Pippa the Panda', 'growl', 'bamboo'],
    ['penguin', '🐧', 'Pebble the Penguin', 'chirp', 'polar'],
    ['owl', '🦉', 'Ollie the Owl', 'hoot', 'forest'],
    ['lion', '🦁', 'Leo the Lion', 'roar', 'savanna'],
    ['frog', '🐸', 'Freddie the Frog', 'ribbit', 'wetland'],
    ['tiger', '🐯', 'Tilly the Tiger', 'roar', 'jungle'],
    ['elephant', '🐘', 'Ellie the Elephant', 'trumpet', 'savanna'],
    ['unicorn', '🦄', 'Star the Unicorn', 'magic', 'rainbow'],
    ['mouse', '🐭', 'Milo the Mouse', 'squeak', 'meadow'],
    ['hamster', '🐹', 'Hazel the Hamster', 'squeak', 'cottage'],
    ['wolf', '🐺', 'Willow the Wolf', 'growl', 'forest'],
    ['raccoon', '🦝', 'Rory the Raccoon', 'squeak', 'forest'],
    ['deer', '🦌', 'Daisy the Deer', 'squeak', 'forest'],
    ['moose', '🫎', 'Maple the Moose', 'growl', 'forest'],
    ['squirrel', '🐿️', 'Pip the Squirrel', 'squeak', 'forest'],
    ['hedgehog', '🦔', 'Hugo the Hedgehog', 'squeak', 'meadow'],
    ['badger', '🦡', 'Bramble the Badger', 'growl', 'forest'],
    ['skunk', '🦨', 'Clover the Skunk', 'squeak', 'forest'],
    ['beaver', '🦫', 'Brook the Beaver', 'squeak', 'wetland'],
    ['otter', '🦦', 'Olive the Otter', 'squeak', 'wetland'],
    ['bat', '🦇', 'Echo the Bat', 'squeak', 'cave'],
    ['sloth', '🦥', 'Sunny the Sloth', 'squeak', 'jungle'],
    ['monkey', '🐒', 'Mango the Monkey', 'squeak', 'jungle'],
    ['gorilla', '🦍', 'Gus the Gorilla', 'growl', 'jungle'],
    ['orangutan', '🦧', 'Orla the Orangutan', 'growl', 'jungle'],
    ['leopard', '🐆', 'Luna the Leopard', 'roar', 'savanna'],
    ['zebra', '🦓', 'Ziggy the Zebra', 'yip', 'savanna'],
    ['giraffe', '🦒', 'Gemma the Giraffe', 'squeak', 'savanna'],
    ['rhinoceros', '🦏', 'Rocky the Rhinoceros', 'growl', 'savanna'],
    ['hippopotamus', '🦛', 'Holly the Hippopotamus', 'growl', 'wetland'],
    ['camel', '🐪', 'Coco the Camel', 'growl', 'desert'],
    ['kangaroo', '🦘', 'Kiki the Kangaroo', 'squeak', 'savanna'],
    ['horse', '🐴', 'Honey the Horse', 'yip', 'meadow'],
    ['donkey', '🫏', 'Doodle the Donkey', 'yip', 'meadow'],
    ['cow', '🐮', 'Maisie the Cow', 'growl', 'meadow'],
    ['pig', '🐷', 'Poppy the Pig', 'squeak', 'meadow'],
    ['sheep', '🐑', 'Woolly the Sheep', 'squeak', 'meadow'],
    ['goat', '🐐', 'Gilly the Goat', 'squeak', 'mountain'],
    ['llama', '🦙', 'Lola the Llama', 'squeak', 'mountain'],
    ['bison', '🦬', 'Beau the Bison', 'growl', 'savanna'],
    ['boar', '🐗', 'Boris the Boar', 'growl', 'forest'],
    ['duck', '🦆', 'Ducky the Duck', 'chirp', 'wetland'],
    ['goose', '🪿', 'Gertie the Goose', 'chirp', 'wetland'],
    ['swan', '🦢', 'Sylvie the Swan', 'chirp', 'wetland'],
    ['flamingo', '🦩', 'Flora the Flamingo', 'chirp', 'wetland'],
    ['parrot', '🦜', 'Polly the Parrot', 'chirp', 'jungle'],
    ['peacock', '🦚', 'Percy the Peacock', 'chirp', 'jungle'],
    ['eagle', '🦅', 'Ember the Eagle', 'chirp', 'mountain'],
    ['turkey', '🦃', 'Gobbles the Turkey', 'chirp', 'forest'],
    ['chicken', '🐔', 'Chickpea the Chicken', 'chirp', 'meadow'],
    ['dove', '🕊️', 'Dottie the Dove', 'chirp', 'forest'],
    ['seal', '🦭', 'Splash the Seal', 'woof', 'polar'],
    ['dolphin', '🐬', 'Delphi the Dolphin', 'squeak', 'ocean'],
    ['whale', '🐋', 'Wally the Whale', 'magic', 'ocean'],
    ['shark', '🦈', 'Shelly the Shark', 'magic', 'ocean'],
    ['octopus', '🐙', 'Ocho the Octopus', 'magic', 'ocean'],
    ['squid', '🦑', 'Squiggle the Squid', 'magic', 'ocean'],
    ['crab', '🦀', 'Coral the Crab', 'squeak', 'shore'],
    ['lobster', '🦞', 'Lenny the Lobster', 'squeak', 'ocean'],
    ['shrimp', '🦐', 'Saffron the Shrimp', 'squeak', 'ocean'],
    ['jellyfish', '🪼', 'Jules the Jellyfish', 'magic', 'ocean'],
    ['turtle', '🐢', 'Tuck the Turtle', 'squeak', 'wetland'],
    ['crocodile', '🐊', 'Crispin the Crocodile', 'growl', 'wetland'],
    ['snake', '🐍', 'Sage the Snake', 'squeak', 'jungle'],
    ['lizard', '🦎', 'Lizzy the Lizard', 'squeak', 'desert'],
    ['butterfly', '🦋', 'Flutter the Butterfly', 'magic', 'meadow'],
    ['bee', '🐝', 'Bumble the Bee', 'squeak', 'meadow'],
    ['ladybug', '🐞', 'Ruby the Ladybug', 'squeak', 'meadow'],
    ['snail', '🐌', 'Sandy the Snail', 'squeak', 'meadow']
  ].map(function (row) {
    return Object.freeze({ id: row[0], emoji: row[1], name: row[2], sound: row[3], habitat: row[4] });
  });
  Object.freeze(catalog);
  const byId = new Map(catalog.map(function (buddy) { return [buddy.id, buddy]; }));
  let state, loadedScope;

  function get(id) { return byId.get(id); }
  function nickname(id) { return id === 'cat' ? 'Tobee' : get(id)?.name.split(' ')[0]; }
  function isSimpleCredit(id) { return id.startsWith(simplePrefix); }
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
  function simpleBrushes(id, collection = current()) {
    let count = 0;
    for (const [session, buddy] of Object.entries(collection.credits || {})) {
      if (buddy === id && isSimpleCredit(session)) count++;
    }
    return count;
  }
  function unlocked(id, collection = current()) {
    return !!get(id) && (starters.includes(id) || (collection.visits[id] || 0) >= 3 || simpleBrushes(id, collection) >= simpleGoal);
  }
  function nextSimpleBuddy() { return catalog.find(buddy => !unlocked(buddy.id)); }
  function available() { return catalog.filter(function (buddy) { return unlocked(buddy.id); }).map(function (buddy) { return buddy.id; }); }
  function daily() {
    const now = new Date();
    const date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const collection = load();
    if (collection.daily.date !== date) {
      const locked = catalog.filter(function (buddy) { return !unlocked(buddy.id); });
      const candidates = locked.length ? locked : catalog;
      const different = candidates.filter(function (buddy) { return buddy.id !== collection.daily.buddy; });
      const pool = different.length ? different : candidates;
      collection.daily = { date: date, buddy: pool[Math.floor(Math.random() * pool.length)].id };
      // Daily selection has a separate record so rollover cannot overwrite earned visits.
      try { root.localStorage.setItem(storageKey() + 'Daily', JSON.stringify(collection.daily)); } catch (_) {}
    }
    return current().daily.buddy;
  }
  function setDaily(id) {
    if (!get(id)) throw new TypeError('Choose a valid animal.');
    daily();
    const value = { date: current().daily.date, buddy: id };
    root.localStorage.setItem(storageKey() + 'Daily', JSON.stringify(value));
    current().daily = value;
  }
  function complete(sessionId, buddyId) {
    if (!sessionValid(sessionId) || isSimpleCredit(sessionId) || !get(buddyId)) return null;
    const collection = current();
    if (!collection.completed.includes(sessionId) && !collection.completed.includes(simplePrefix + sessionId)) {
      collection.visits[buddyId] = Math.min(Number.MAX_SAFE_INTEGER, (collection.visits[buddyId] || 0) + 1);
      collection.completed.push(sessionId);
      collection.credits = { ...collection.credits, [sessionId]: buddyId };
      save(collection);
    }
    return { buddy: buddyId, visits: current().visits[buddyId] || 0, unlocked: unlocked(buddyId), homeUnlocked: homeUnlocked(buddyId) };
  }
  function inScope(scope, work) {
    const previous = root.BB_PROFILE_SCOPE;
    try {
      root.BB_PROFILE_SCOPE = scope;
      load();
      return work();
    } finally {
      root.BB_PROFILE_SCOPE = previous;
      load();
    }
  }
  function completeInScope(sessionId, buddyId, scope) {
    return inScope(scope, () => complete(sessionId, buddyId));
  }
  function completeSimpleInScope(sessionId, scope) {
    if (!sessionValid(sessionId) || isSimpleCredit(sessionId)) return null;
    const creditId = simplePrefix + sessionId;
    if (!sessionValid(creditId)) return null;
    return inScope(scope, () => {
      const collection = current();
      if (collection.completed.includes(sessionId) || collection.completed.includes(creditId)) return null;
      const buddy = nextSimpleBuddy();
      if (!buddy) return null;
      // Use the collection's session ledger so repeat finishes and backup imports count once.
      collection.completed.push(creditId);
      collection.credits = { ...collection.credits, [creditId]: buddy.id };
      save(collection);
      const brushes = simpleBrushes(buddy.id);
      return { buddy, creditId, brushes, unlocked: brushes >= simpleGoal };
    });
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
      id: 'home-' + id, name: nickname(id) + "'s Home", emoji: habitat[1], scene: habitat[0],
      backdrop: habitat[2].slice(),
      stops: habitat[3].map(function (stop) { return { name: stop[0], icon: stop[1] }; }),
      stickers: habitat[3].slice(0, 3).map(function (stop, index) {
        return { id: 'home-' + id + '-' + index, emoji: stop[1], name: stop[0] };
      })
    };
  }
  return { catalog: catalog, starters: starters, get: get, load: load, save: save, unlocked: unlocked,
    available: available, daily: daily, setDaily: setDaily, complete: complete, completeInScope: completeInScope, homeUnlocked: homeUnlocked, home: home,
    nickname, isSimpleCredit, simpleGoal, simpleBrushes, nextSimpleBuddy, completeSimpleInScope };
}));
