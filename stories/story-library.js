/* Storybook progression. Depends on buddies.js, adventure-data.js and stories/characters.js.
   Unlocks are derived from per-buddy completed visits, never separately stored. */
(function (root, factory) {
  const create = factory();
  if (typeof module === 'object' && module.exports) module.exports = create;
  else root.BB_STORYBOOK = create(root.BB_BUDDIES, root.BB_ADVENTURE_DATA, root.BB_CHARACTERS);
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const routes = Object.freeze({
    cottage: 'Garden Brook', meadow: 'Clover Creek', eucalyptus: 'Gumtree Gully',
    forest: 'Woodland Creek', bamboo: 'Bamboo Brook', polar: 'Ice Floe Crossing',
    savanna: 'Savanna Stream', wetland: 'Lily Lagoon', jungle: 'Rainforest River',
    rainbow: 'Rainbow Run', cave: 'Moonlit Creek', desert: 'Oasis Trail',
    mountain: 'Alpine Stream', ocean: 'Coral Crossing', shore: 'Tidepool Trail'
  });
  // Add future chapters here with unlockAfter: 2, 3, 5, etc. A chapter becomes
  // available after that buddy's Nth completed adventure, never before.
  // 'trail' chapters must match a trail route; 'home' chapters start on visit 4+.
  const authoredChapters = Object.freeze({
    cat: [{ path: '01-kitty-yarn-cottage.md', title: 'Kitty and the Runaway Ball of Yarn', goal: 'Ball of Yarn', kind: 'home', unlockAfter: 4 }],
    bunny: [{ path: '02-bubbles-clover-burrow.md', title: 'Bubbles and the Lucky Clover', goal: 'Lucky Clover', kind: 'home', unlockAfter: 4 }],
    dog: [{ path: '03-scout-backyard-park.md', title: 'Scout and the Bouncy Ball Mystery', goal: 'Bouncy Ball', kind: 'home', unlockAfter: 4 }],
    fox: [{ path: '04-finn-maple-den.md', title: 'Finn and the Little Acorn', goal: 'Little Acorn', kind: 'home', unlockAfter: 4 }],
    penguin: [{ path: '05-pebble-ice-caves.md', title: 'Pebble and the Sparkly Ice', goal: 'Sparkly Ice', kind: 'home', unlockAfter: 4 }]
  });
  const companions = {
    cottage: 'a curious mouse', meadow: 'a young field mouse', eucalyptus: 'a shy tree frog',
    forest: 'a little robin', bamboo: 'a gentle beetle', polar: 'a seal pup',
    savanna: 'a young antelope', wetland: 'a tiny dragonfly', jungle: 'a little tree frog',
    rainbow: 'a cloud bird', cave: 'a fluttering moth', desert: 'a small desert mouse',
    mountain: 'a mountain sparrow', ocean: 'a silver fish', shore: 'a sandpiper'
  };
  const stopBeats = [
    [
      'A sudden breeze swept across the path, turning the easy crossing into a puzzle. It would have been tempting to rush. Instead, they took a moment to listen to the sounds around them, and noticed the gentler way through.',
      'There was a small obstacle right where the path bent. The visitor wanted to turn back, but they experimented with one careful step, then another. The difficulty did not disappear all at once; it became smaller with every thoughtful try.',
      'Something bright flashed in the distance, and for a moment they thought the search was over. On closer inspection it was only sunlight. They laughed together, because a mistaken clue could still make the day feel full of wonder.',
      'The path here was narrower than expected. The visitor asked for help, and a clever idea made room for both travelers. It felt good to discover that asking and offering could be two parts of the same brave thing.'
    ],
    [
      'They found a trail of tiny marks leading away from the main path. Following the marks seemed exciting, but the visitor looked uncertain. Together they made a little sign so they could find their way back, then explored with care.',
      'A soft rustling sound came from behind the nearest leaves. Nobody was in danger: a neighbor had simply dropped a bundle of supplies. They helped gather every piece, even though it made the search take longer.',
      'The ground changed beneath their feet, and the next step required patience. They counted slowly together and practiced once before crossing. When they reached the other side, both felt taller than they had a moment before.',
      'A nearby traveler had spotted the same mysterious glimmer. Rather than race to reach it first, they compared what each had seen. Two different views gave them one much better clue.'
    ],
    [
      'A little voice called out from the edge of the trail. Someone needed directions. They stopped to explain, tracing the turns in the earth until the newcomer could follow them confidently.',
      'Here the wind scattered leaves over an old sign. The visitor held the sign upright while they brushed the leaves away. Underneath was an arrow pointing farther along the trail.',
      'They paused to admire the changing light. In the quiet, a faint shape stood out that neither had noticed while moving quickly. Sometimes the best discovery begins by looking again.',
      'The last part of the path was slippery. They found a steady place to stand and offered a hand. The crossing became easy when nobody had to do it alone.'
    ]
  ];
  function make(COLLECTION, DATA, CHARACTERS) {
    if (!COLLECTION || !DATA || !CHARACTERS) throw new TypeError('Storybook needs buddy, destination and character data');
    const catalog = COLLECTION.catalog;
    const byId = new Map(catalog.map(a => [a.id, a]));
    if (catalog.length !== CHARACTERS.all.length || catalog.some(a => !CHARACTERS.get(a.id)))
      throw new TypeError('Storybook character profiles must match the buddy catalog');
    function homeFor(id) {
      const animal = byId.get(id);
      if (!animal) return null;
      const base = DATA.homes[id] || COLLECTION.home(id);
      return { ...base, habitat: animal.habitat };
    }
    function destinationFor(id, visits) {
      const animal = byId.get(id);
      if (!animal) return null;
      const home = homeFor(id);
      if (visits >= 3) return home;
      const index = catalog.findIndex(a => a.id === id);
      const shared = DATA.shared[index % DATA.shared.length];
      return { ...home, id: 'trail-' + id, name: routes[animal.habitat],
        stickers: shared.stickers };
    }
    function firstName(id) {
      return byId.get(id).name.split(' ')[0];
    }
    function trailStory(id) {
      const animal = byId.get(id);
      const person = CHARACTERS.get(id);
      const place = destinationFor(id, 0);
      const goal = place.stickers[0].name;
      const name = firstName(id);
      const companion = companions[animal.habitat];
      const idx = catalog.findIndex(a => a.id === id);
      const beats = stopBeats[idx % stopBeats.length];
      const paragraphs = [];
      paragraphs.push(`At dawn, ${name} looked out on ${person.environment.charAt(0).toLowerCase() + person.environment.slice(1)} Today even the smallest things seemed to whisper, "Come and look!"\n\n${name} was known for one special quality: ${person.personality.charAt(0).toLowerCase() + person.personality.slice(1)} ${person.background}\n\n${person.motivation} Someone had spotted a ${goal} along ${place.name}. ${name} decided to find it and draw it in the Field Journal. A snack went into the bag, and the adventure began.`);
      paragraphs.push(`Along the way, ${name} met ${companion}. "May I join?" asked the visitor. "I sometimes lose my way."\n\n"We can help each other," said ${name}. They agreed to stop whenever either friend needed a rest. Together, they set off toward their first landmark.`);
      place.stops.forEach((stop, i) => {
        const beat = beats[i % beats.length];
        const extra = i === 0
          ? `"${stop.name}!" said ${name}. "That's our first landmark." The visitor repeated the name so they would remember it. They searched around it for the ${goal}, but there were many interesting shapes and none was quite right.`
          : i === place.stops.length - 1
            ? `At ${stop.name}, the last landmark, the visitor stopped and looked back. They had come farther than either expected. "${name}, even if we don't find the ${goal}, I'm glad we came," the visitor said.`
            : `When they reached ${stop.name}, they found more signs of life than they had expected. It was tempting to investigate every little thing, but ${name} remembered the purpose of the trip and chose one clue to follow.`;
        paragraphs.push(`Their next stop was **${stop.name}**. ${extra}\n\n${beat}\n\n${name} remembered one difficult truth: ${person.challenge} Today was a good day to try something different. Then the two friends continued.`);
      });
      paragraphs.push(`Just beyond the last stop, something gleamed near the path. The visitor gasped. There it was: a **${goal}**! Not a rumor or a mistaken flash, but the very thing they had hoped to find.\n\nSome treasures are meant to be carried home. Others are best admired where they belong. ${name} made a drawing for the Field Journal, and the friends sat together to share their snack.\n\n"I thought I was looking for only one special thing," said ${name}.\n\n"And you found it!" said the visitor.\n\n"Yes," said ${name}, "but I also learned that a hard moment gets easier when someone listens, helps, and tries again."\n\nThey followed the landmarks back home, naming each stop as they passed. In ${person.environment.charAt(0).toLowerCase() + person.environment.slice(1)} ${name} placed the drawing in the Field Journal and smiled at the new sticker beside it.\n\nTomorrow might bring another adventure. This one would always belong to two friends who had made the journey together.`);
      return paragraphs.join('\n\n');
    }
    const chapterCache = new Map();
    function chaptersFor(id) {
      if (!byId.has(id)) return [];
      if (chapterCache.has(id)) return chapterCache.get(id);
      const trail = destinationFor(id, 0);
      const first = { id: 'trail-' + id + '-1', buddyId: id, title: firstName(id) + ' and the ' + trail.stickers[0].name,
        unlockAfter: 1, destination: trail.name, destinationId: trail.id,
        stops: trail.stops.map(s => s.name), goal: trail.stickers[0].name,
        text: trailStory(id), kind: 'trail' };
      const extra = (authoredChapters[id] || []).map((entry, index) => {
        const destination = entry.kind === 'home' ? homeFor(id) : destinationFor(id, 0);
        if (!destination.stickers.some(st => st.name === entry.goal))
          throw new Error('Chapter goal does not exist on route: ' + id + ' / ' + entry.title);
        if (entry.kind === 'home' && entry.unlockAfter < 4)
          throw new Error('Home story cannot unlock before first home adventure: ' + id);
        return { id: entry.kind + '-' + id + '-' + (index + 1), buddyId: id, title: entry.title,
          unlockAfter: entry.unlockAfter, destination: destination.name, destinationId: destination.id,
          stops: destination.stops.map(st => st.name), goal: entry.goal,
          path: 'stories/' + entry.path, kind: entry.kind };
      });
      const all = [first, ...extra].sort((a, b) => a.unlockAfter - b.unlockAfter);
      if (new Set(all.map(ch => ch.unlockAfter)).size !== all.length)
        throw new Error('Only one story can unlock at each visit count for ' + id);
      chapterCache.set(id, all);
      return all;
    }
    function unlockedAt(id, visits) {
      return chaptersFor(id).filter(ch => ch.unlockAfter === visits);
    }
    function unlocked(id, visits) {
      return chaptersFor(id).filter(ch => visits >= ch.unlockAfter);
    }
    function rewardFor(id, newVisits, destination) {
      const chapter = unlockedAt(id, newVisits).find(ch => ch.destinationId === destination?.id);
      return chapter && destination.stickers.find(st => st.name === chapter.goal) || null;
    }
    return Object.freeze({ characters: CHARACTERS, catalog, destinationFor, homeFor, chaptersFor,
      unlockedAt, unlocked, rewardFor });
  }
  return make;
});
