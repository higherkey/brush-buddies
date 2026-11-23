/* Buddy achievements. Rule keys are stable animal IDs used in saved progress. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BB_ACHIEVEMENTS = factory();
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const milestones = [
    ['dog', 1], ['koala', 5], ['elephant', 15], ['lion', 30], ['horse', 45],
    ['giraffe', 60], ['tiger', 75], ['deer', 100], ['zebra', 125],
    ['hippopotamus', 150], ['rhinoceros', 180], ['camel', 210], ['kangaroo', 240],
    ['bison', 270], ['llama', 300], ['whale', 365], ['gorilla', 400], ['unicorn', 450]
  ].map(([id, goal]) => ({ id, metric: 'brushes', goal, hint: 'Finish ' + goal + (goal === 1 ? ' brush' : ' brushes') + ' in either mode.' }));

  const progress = [
    ['bear', 'adventures', 1, 'Finish your first Adventure.'],
    ['wolf', 'adventures', 10, 'Finish 10 Adventures.'],
    ['moose', 'homes', 5, 'Open 5 home routes. A route opens after 3 trips with its buddy.'],
    ['penguin', 'stickers', 5, 'Find 5 different stickers.'],
    ['leopard', 'trailBuddies', 8, 'Finish Adventures with 8 different buddies.'],
    ['cow', 'simple', 5, 'Finish 5 brushes with the Simple timer.'],
    ['sheep', 'simple', 20, 'Finish 20 brushes with the Simple timer.'],
    ['goat', 'modes', 2, 'Finish a brush in both Simple and Adventure.']
  ].map(([id, metric, goal, hint]) => ({ id, metric, goal, hint }));

  const actions = [
    ['owl', 'camera', 'Try Camera Assist.'],
    ['seal', 'calibrate', 'A friend is waiting near the camera’s practice button.'],
    ['hamster', 'gentle', 'Look for a gentler way for your buddy to move.'],
    ['lizard', 'dark', 'Someone comes out when the lights go down.'],
    ['flamingo', 'story-text', 'Turn on story text to read about each stop.'],
    ['parrot', 'custom-song', 'Can you give the trails a tune of your own?'],
    ['donkey', 'long-break', 'Who likes the longest breather between stages?'],
    ['eagle', 'footer', 'Look beyond the trail map, down by the credits.'],
    ['turkey', 'moonlight', 'Someone likes a mellow tune after sunset.'],
    ['chicken', 'bubble-song', 'A peep follows the sound of popping bubbles.'],
    ['orangutan', 'electric', 'Which brush makes its own buzz?'],
    ['octopus', 'quiet', 'This friend prefers both sound effects turned off.']
  ].map(([id, action, hint]) => ({ id, action, hint }));

  const encounters = [
    ['frog', 'bunny', .25, 'Bubbles heard a croak partway down the trail.'],
    ['otter', 'frog', .60, 'Watch for another swimmer on Freddie’s trail.'],
    ['beaver', 'bunny', .65, 'Bubbles spotted someone carrying a twig near the end.'],
    ['hedgehog', 'bunny', .45, 'Keep an eye on the low brush when you walk with Bubbles.'],
    ['raccoon', 'cat', .60, 'Two bright eyes peek out late on Tobee’s trail.'],
    ['skunk', 'fox', .25, 'Finn noticed a stripe vanish into the undergrowth.'],
    ['badger', 'fox', .65, 'A little snout peeks out near the end of Finn’s walk.'],
    ['sloth', 'koala', .50, 'Look up halfway through Koko’s walk.'],
    ['bat', 'owl', .55, 'Ollie has a neighbor who only comes out after dark.', 'dark'],
    ['snail', 'bear', .75, 'A slow friend peeks out when Benny stops to rest near the end.', 'rest'],
    ['butterfly', 'bunny', .15, 'Something flutters near the start of Bubbles’ walk.'],
    ['ladybug', 'cat', .20, 'Look low on the trail early in Tobee’s walk.'],
    ['snake', 'elephant', .45, 'Ellie can hear something sliding through the grass.'],
    ['squid', 'octopus', .50, 'Look for another ink cloud on Ocho’s trail.'],
    ['dolphin', 'penguin', .50, 'The water on Pebble’s trail holds a playful surprise.'],
    ['crocodile', 'otter', .55, 'What looks like a log halfway down Olive’s trail?'],
    ['jellyfish', 'dolphin', .75, 'A floating glow appears late in Delphi’s swim.']
  ].map(([id, host, at, hint, condition]) => ({ id, host, at, hint, condition }));

  const collectibles = [
    ['mouse', 'home-cat-yarn', 'Ball of Yarn', 'Tobee’s Yarn Cottage', 'A Blanket for Milo', 'Tobee looped the blue yarn into a tiny blanket. When she carried it into the garden, Milo the Mouse wrapped it around his shoulders and asked if they could watch the stars together.'],
    ['duck', 'home-bunny-clover', 'Lucky Clover', 'Bubbles’ Clover Burrow', 'A Clover on the Water', 'Bubbles floated a lucky clover down a trickle of rainwater. Ducky the Duck paddled it back, and they raced clover boats until the hill dried.'],
    ['squirrel', 'home-dog-ball', 'Bouncy Ball', 'Scout’s Backyard Park', 'The Ball in the Branches', 'Scout’s bouncy ball took one enormous hop and stuck in a fork of the oak. Pip the Squirrel nudged it free, then hurried down for a game of catch.'],
    ['boar', 'home-fox-acorn', 'Little Acorn', 'Finn’s Maple Den', 'An Acorn for Tomorrow', 'Finn found a little acorn under a maple leaf. Boris the Boar showed him a patch of soft earth where they could plant it together.'],
    ['lobster', 'home-penguin-ice', 'Sparkly Ice', 'Pebble’s Ice Caves', 'A Lighthouse of Ice', 'A piece of sparkly ice lit up the shallows as Pebble set it in the sun. Lenny the Lobster followed its flicker to the shore and taught Pebble how to wave with both claws.'],
    ['fox', 'whispering-woods-leaf', 'Golden Leaf', 'the woodland sticker page', 'The Leaf with Two Shadows', 'Scout watched a golden leaf make two shadows on the path. One was his, and the other belonged to Finn the Fox, who had followed the leaf from the next hill.'],
    ['panda', 'home-koala-leaf', 'Minty Leaf', 'Koko’s Eucalyptus Grove', 'A Leaf for the Picnic', 'Koko tucked a minty leaf into the picnic basket. Pippa the Panda brought bamboo and taught him how to fold big leaves into bowls.'],
    ['monkey', 'home-tiger-banana', 'Yummy Banana', 'Tilly’s Jungle Gym', 'One Banana, Two Swings', 'Tilly hung a banana from a low branch so she could practice her swing. Mango the Monkey swung down beside her and broke the banana in two.'],
    ['pig', 'whispering-woods-mushroom', 'Red Mushroom', 'the woodland sticker page', 'The Mushroom Umbrella', 'Scout stopped to sketch a red mushroom. Poppy the Pig was sheltering under its cap, so they waited for the drizzle to pass together.'],
    ['goose', 'bubble-creek-duck', 'Rubber Duck', 'the creek sticker page', 'The Duck That Didn’t Quack', 'Tobee fished a rubber duck out of the creek. Gertie the Goose honked a greeting to it and then laughed when Tobee gave it a squeak.'],
    ['swan', 'sunny-shore-sail', 'Tiny Sailboat', 'the shore sticker page', 'A Wind for the Sailboat', 'Bubbles lost the breeze halfway across the pond. Sylvie the Swan stirred up a little wind with her wings and sent the tiny sailboat home.'],
    ['peacock', 'cloud-castle-rainbow', 'Little Rainbow', 'the cloud sticker page', 'All the Colors', 'Finn found a small rainbow in a puddle after the rain. Percy the Peacock opened his tail beside it and they looked for colors they had in common.'],
    ['dove', 'cloud-castle-kite', 'Flying Kite', 'the cloud sticker page', 'The Kite’s New Route', 'Finn’s kite tangled on the highest branch. Dottie the Dove untied its ribbon and flew alongside until Finn had the string again.'],
    ['shark', 'sunny-shore-fish', 'Rainbow Fish', 'the shore sticker page', 'A Rainbow in the Shallows', 'Bubbles watched a rainbow fish dart under a rock. Shelly the Shark surfaced a little way off and pointed out a whole school catching the light.'],
    ['crab', 'sunny-shore-crab', 'Friendly Crab', 'the shore sticker page', 'A Sideways Hello', 'Two tiny claws appeared at the edge of Bubbles’ sandcastle. Coral the Crab stepped sideways around the moat and asked if she could build a tower too.'],
    ['shrimp', 'bubble-creek-shell', 'Shiny Shell', 'the creek sticker page', 'Borrowed Sparkle', 'Tobee lifted a shiny shell to the light. Saffron the Shrimp popped out from its shadow and asked for a lift back to the cool shallows.'],
    ['turtle', 'starlight-hill-moon', 'Crescent Moon', 'the starlight sticker page', 'A Moon on the Pond', 'Benny tried to touch the crescent moon reflected in the pond. Tuck the Turtle showed him how the reflection came back each time the ripples settled.'],
    ['bee', 'home-bear-honey', 'Honey Pot', 'Benny’s Honey Cave', 'The Honey Pot Visit', 'Benny followed a drop of honey back to the pot. Bumble the Bee was buzzing by the lid, so Benny fetched two small spoons and offered to share.']
  ].map(([id, sticker, item, place, title, story]) => ({
    id, sticker, title, story, hint: 'Find ' + item + ' on ' + place + '.'
  }));

  const rules = [...milestones, ...progress, ...actions, ...encounters, ...collectibles];
  const byId = new Map(rules.map(rule => [rule.id, rule]));
  function earned(metric, stickers) {
    return rules.filter(rule => rule.metric ? metric[rule.metric] >= rule.goal : rule.sticker && stickers[rule.sticker] > 0);
  }
  function encounter(host, progress, unlocked, conditions) {
    return encounters.find(rule => rule.host === host && progress >= rule.at &&
      (!rule.condition || conditions[rule.condition]) && !unlocked(rule.id));
  }
  return { rules, milestones, get: id => byId.get(id), earned, encounter,
    forAction: action => actions.find(rule => rule.action === action) };
}));
