'use strict';
// ---- Game content: coins, fish, aliens, pets, levels, upgrades, achievements ----

const COINS = {
  silver:  { v: 15,   r: 11, name: 'Silver Coin' },
  gold:    { v: 35,   r: 12, name: 'Gold Coin' },
  star:    { v: 40,   r: 14, name: 'Star', fast: true },
  goldbar: { v: 120,  r: 14, name: 'Gold Bar' },
  diamond: { v: 200,  r: 13, name: 'Diamond' },
  pearl:   { v: 250,  r: 12, name: 'Pearl', stay: 25 },
  emerald: { v: 400,  r: 13, name: 'Emerald' },
  chest:   { v: 2000, r: 20, name: 'Treasure Chest', stay: 20 },
  shell:   { v: 0,    r: 15, name: 'Sand Dollar', stay: 30 },
};
// Midas pet upgrade path
const COIN_UP = { silver: 'gold', gold: 'goldbar', star: 'diamond', goldbar: 'diamond', diamond: 'pearl', pearl: 'emerald' };

const FOOD_NAMES = ['', 'Pellets', 'Flakes', 'Kelp Burgers', 'Cosmic Chow'];
const FOOD_COSTS = [0, 200, 500, 1200]; // cost to upgrade FROM level i
const FOOD_COUNT_COST = 300, FOOD_COUNT_MAX = 10;
const LASER_MAX = 10;
const laserCost = lv => 1000 * lv;
const laserDmg = lv => 6 + (lv - 1) * 5;

// diet: what the fish hunts. drop: periodic coin while not hungry.
const FISH = {
  guppy: { name: 'Guppy', cost: 100, r: 16, speed: 62, hungerAt: 14, dieAt: 38, diet: 'pellet',
    desc: 'The classic. Grows Baby → Medium (silver) → Large (gold). Feed a Large one a LOT and it becomes a rare KING (slow diamonds). Large guppies sometimes drop stars.' },
  carnivore: { name: 'Carnivore', cost: 1000, r: 26, speed: 78, hungerAt: 18, dieAt: 46, diet: 'baby', drop: 'diamond', dropInt: [10, 13],
    desc: 'Eats BABY guppies and spits out a diamond with every meal, plus more diamonds while fed. Pair with Breeders for a diamond factory. Also bites aliens that get close!' },
  breeder: { name: 'Breeder', cost: 800, r: 20, speed: 45, hungerAt: 14, dieAt: 36, diet: 'pellet',
    desc: 'Once grown, gives birth to baby guppies. Love hearts make her twice as fertile. Perfect carnivore farm.' },
  starcatcher: { name: 'Starcatcher', cost: 750, r: 22, speed: 55, hungerAt: 30, dieAt: 70, diet: 'star', drop: 'diamond', dropInt: [18, 24], floor: true,
    desc: 'Lives on the sand and slurps falling stars toward its mouth (stars come from large guppies and meteor showers). Drops diamonds.' },
  puffer: { name: 'Puffer Guard', cost: 600, r: 17, speed: 58, hungerAt: 15, dieAt: 38, diet: 'pellet', drop: 'silver', dropInt: [18, 24],
    desc: 'Rushes aliens and PUFFS UP: spiky, uneatable, and it hurts aliens that touch it.' },
  piranha: { name: 'Piranha', cost: 250, r: 13, speed: 95, hungerAt: 10, dieAt: 30, diet: 'pellet', drop: 'silver', dropInt: [15, 20],
    desc: 'Packs of 3+ swarm and bite aliens. They also scavenge dead fish for gold.' },
  wrasse: { name: 'Cleaner Wrasse', cost: 400, r: 15, speed: 72, hungerAt: 16, dieAt: 40, diet: 'waste', drop: 'gold', dropInt: [13, 17],
    desc: 'Cleans steadily: one wrasse keeps about 5 fish clean (dirty tanks make fish sick and lazy). Pays a silver coin per 4 piles and plucks leeches off other fish.' },
  seahorse: { name: 'Seahorse', cost: 500, r: 15, speed: 36, hungerAt: 15, dieAt: 38, diet: 'pellet',
    desc: 'Blows love hearts. Fish that touch one drop coins twice as fast. Pairs make hearts twice as often.' },
  eel: { name: 'Volt Eel', cost: 1500, r: 20, speed: 55, hungerAt: 16, dieAt: 40, diet: 'pellet',
    desc: 'Charges up, then ZAPS: shocked fish instantly drop a coin, jellies glow and drop gold, aliens get fried & stunned.' },
  jelly: { name: 'Moon Jelly', cost: 300, r: 16, speed: 20, diet: 'none',
    desc: 'Never needs food and slowly multiplies. Stings small guppies (makes them hungry). Sea turtles love to eat them.' },
  turtle: { name: 'Sea Turtle', cost: 2500, r: 28, speed: 42, hungerAt: 28, dieAt: 66, diet: 'jelly', drop: 'emerald', dropInt: [16, 21],
    desc: 'Nibbles on grown jellyfish (they shrink back to babies and regrow) and drops emeralds. Its shell is alien-proof: aliens can\'t eat turtles.' },
  koi: { name: 'Golden Koi', cost: 5000, r: 22, speed: 50, hungerAt: 14, dieAt: 38, diet: 'pellet', drop: 'goldbar', dropInt: [15, 19],
    desc: 'Drops gold bars. Every 8 meals it grants a WISH: gold rain, growth spurts, free upgrades and more.' },
  angler: { name: 'Angler', cost: 2000, r: 22, speed: 45, hungerAt: 18, dieAt: 45, diet: 'pellet',
    desc: 'Its glowing lure pulls in nearby coins and collects them for you. Lights up blackouts and reveals invisible aliens.' },
  ultravore: { name: 'Megachomp', cost: 8000, r: 40, speed: 66, hungerAt: 40, dieAt: 85, diet: 'carnivore', drop: 'chest', dropInt: [28, 34],
    desc: 'Top of the food chain. Eats carnivores, drops treasure chests worth $2000.' },
};

// feed: must be killed by feeding instead of laser. boss: big fight.
const ALIENS = {
  gnasher: { name: 'Gnasher', hp: 100, r: 40, speed: 70, chew: 1.2, drop: ['diamond'],
    desc: 'Big blue mouth with a bad attitude. Shoot it with your laser by clicking it.' },
  brute: { name: 'Brute', hp: 320, r: 50, speed: 85, chew: 0.5, drop: ['diamond', 'diamond', 'diamond'],
    desc: 'Tougher, faster and never full. Upgrade your laser!' },
  gorger: { name: 'Gorger', hp: 30, r: 45, speed: 55, chew: 1.5, feed: true, drop: ['diamond', 'diamond'],
    desc: 'Lasers just tickle it. FEED it food until it pops! (Click to drop food while it is around.)' },
  destroyer: { name: 'Destroyer', hp: 240, r: 38, speed: 40, drop: ['diamond', 'diamond'], floor: true,
    desc: 'Walks the sea floor launching homing missiles at your fish. Click missiles to pop them.' },
  twins: { name: 'Twin Terror', hp: 130, r: 32, speed: 80, chew: 1.0, drop: ['diamond'],
    desc: 'Always comes in pairs. If one goes down, the other revives it after 4 seconds. Kill both quickly!' },
  psychosquid: { name: 'Psychosquid', hp: 260, r: 40, speed: 65, chew: 1.0, drop: ['diamond', 'diamond'],
    desc: 'Flips between BLUE (shoot it!) and RED (shooting heals it). Watch its colour.' },
  leechqueen: { name: 'Leech Queen', hp: 450, r: 46, speed: 45, chew: 1.0, boss: true, drop: ['chest', 'shell'],
    desc: 'Spawns leeches that latch onto fish and make them starve fast. Click leeches to flick them off. Wrasses eat them!' },
  phantom: { name: 'Phantom', hp: 200, r: 38, speed: 70, chew: 1.0, drop: ['diamond', 'diamond'],
    desc: 'Fades in and out. Can only be hit while visible... unless an Angler\'s light reveals it.' },
  hoarder: { name: 'Hoarder', hp: 260, r: 42, speed: 60, drop: [], noEat: true,
    desc: 'A greedy ray that steals your money and vacuums coins. Kill it to get everything back with interest.' },
  kraken: { name: 'The Kraken', hp: 650, r: 70, speed: 0, boss: true, drop: ['chest', 'chest', 'shell'],
    desc: 'BOSS. Tentacles burst from the sand and drag fish under. Destroy every tentacle to expose the head.' },
  voidmaw: { name: 'The Void Maw', hp: 1300, r: 55, speed: 25, boss: true, drop: ['chest', 'chest', 'shell', 'shell'],
    desc: 'BOSS. A living whirlpool that sucks in fish and coins and spits out minions. Volt Eels deal triple damage.' },
  overlord: { name: 'The Overlord', hp: 2000, r: 70, speed: 40, boss: true, drop: ['chest', 'chest', 'chest', 'shell', 'shell', 'shell'],
    desc: 'FINAL BOSS. Protected by orbiting shield orbs. Fires missiles and summons minions.' },
};

const PETS = {
  sluggo: { name: 'Sluggo', kind: 'Snail', desc: 'Slides along the sand collecting coins for you.' },
  chef:   { name: 'Chef Prawn', kind: 'Shrimp', desc: 'Drops free food when fish are hungry and none is in the tank.' },
  clam:   { name: 'Pearl', kind: 'Clam', desc: 'Makes a $250 pearl every 40 seconds.' },
  siren:  { name: 'Siren', kind: 'Mermaid', desc: 'Sings every 30s. Every fish that can drop a coin drops one.' },
  nurse:  { name: 'Doc Narwhal', kind: 'Narwhal', desc: 'Saves a starving fish from death (once every 45s).' },
  scrub:  { name: 'Scrubby', kind: 'Cleaner Shrimp', desc: 'Eats waste off the floor, keeping the tank clean.' },
  crabby: { name: 'Pinchy', kind: 'Crab', desc: 'Collects coins and leaps up to pinch aliens that come near the floor.' },
  inky:   { name: 'Inky', kind: 'Octopus', desc: 'Squirts ink at aliens, blinding them so they can\'t eat for 3 seconds.' },
  midas:  { name: 'Midas', kind: 'Goldfish', desc: 'Touch of gold: 15% of dropped coins get upgraded a tier.' },
  momma:  { name: 'Momma Hippo', kind: 'Seahorse', desc: 'Gives birth to a free baby guppy every 40 seconds.' },
  remy:   { name: 'Remy', kind: 'Remora', desc: 'Follows your cursor and grabs any coin it swims past.' },
  zippy:  { name: 'Zippy', kind: 'Lanternfish', desc: 'Auto-fires bolts at aliens. Damage scales with your laser.' },
  nimbus: { name: 'Nimbus', kind: 'Bubble Whale', desc: 'Blows protective bubbles around fish. A bubbled fish survives one alien bite.' },
};

const TANKS = [
  { name: 'Sunny Shallows', theme: 'shallows' },
  { name: 'Kelp Forest', theme: 'kelp' },
  { name: 'Midnight Trench', theme: 'trench' },
  { name: 'Alien Mothership', theme: 'mothership' },
];

// objective types: time (finish under s), lost (lose <= n fish), own (have n kind at once),
// bounties (complete n), noeaten (no fish eaten by aliens), king, money (hold $n), grime (max grime <= n), wishes
const LEVELS = [
  // ---- Tank 1: Sunny Shallows
  { name: 'First Splash', tank: 0, slots: [], egg: 500, start: 200, aliens: [], events: false,
    intro: 'Welcome aboard, rookie! Click the water to drop food. Fed guppies grow and drop coins. Click coins to collect them. Buy 3 egg pieces to win!',
    obj: [{ t: 'time', n: 300 }, { t: 'own', k: 'guppy', n: 6 }, { t: 'lost', n: 0 }], reward: { pet: 'sluggo' } },
  { name: 'Teeth in the Water', tank: 0, slots: ['carnivore'], egg: 750, start: 250, aliens: ['gnasher'], alienFirst: 140, events: false,
    intro: 'Carnivores eat baby guppies and drop diamonds. And watch out: something nasty is coming. When an alien shows up, click it to zap it!',
    obj: [{ t: 'own', k: 'carnivore', n: 2 }, { t: 'noeaten' }, { t: 'time', n: 480 }], reward: { pet: 'chef' } },
  { name: 'Family Planning', tank: 0, slots: ['carnivore', 'breeder'], egg: 1000, start: 300, aliens: ['gnasher'], alienFirst: 120, events: false,
    intro: 'Breeders pop out free baby guppies. Babies grow up... or become carnivore snacks. Captain Barnacle will start posting bounties too!',
    obj: [{ t: 'own', k: 'breeder', n: 2 }, { t: 'king' }, { t: 'bounties', n: 1 }], reward: { pet: 'clam', petSlot: true } },
  { name: 'Star Struck', tank: 0, slots: ['carnivore', 'breeder', 'starcatcher', 'puffer'], egg: 1250, start: 300, aliens: ['gnasher', 'gorger'], alienFirst: 120, events: true,
    intro: 'Large guppies drop stars. Starcatchers eat them for diamonds. Puffer Guards fight aliens. Random EVENTS start happening now!',
    obj: [{ t: 'own', k: 'starcatcher', n: 2 }, { t: 'own', k: 'puffer', n: 2 }, { t: 'bounties', n: 2 }], reward: { pet: 'siren' } },
  { name: 'The Kraken Rises', tank: 0, boss: true, slots: ['carnivore', 'breeder', 'starcatcher', 'piranha'], egg: 1500, start: 400, aliens: ['gnasher', 'brute', 'kraken'], alienFirst: 110, events: true,
    intro: 'BOSS LEVEL! Something huge lurks under the sand. The egg shop stays locked until the Kraken is beaten. Piranha packs can help.',
    obj: [{ t: 'own', k: 'piranha', n: 5 }, { t: 'lost', n: 3 }, { t: 'time', n: 780 }], reward: { pet: 'nurse' } },
  // ---- Tank 2: Kelp Forest (waste!)
  { name: 'Something Smells Fishy', tank: 1, waste: true, slots: ['wrasse', 'carnivore', 'breeder', 'puffer'], egg: 1500, start: 400, aliens: ['brute', 'gnasher'], alienFirst: 130, events: true,
    intro: 'In the Kelp Forest fish POOP. A dirty tank makes fish hungry and lazy. Cleaner Wrasses eat waste and drop gold.',
    obj: [{ t: 'own', k: 'wrasse', n: 3 }, { t: 'grime', n: 8 }, { t: 'bounties', n: 2 }], reward: { pet: 'scrub' } },
  { name: 'Love is in the Water', tank: 1, waste: true, slots: ['wrasse', 'seahorse', 'breeder', 'carnivore'], egg: 1750, start: 400, aliens: ['destroyer', 'gnasher'], alienFirst: 130, events: true,
    intro: 'Seahorses blow love hearts that double coin drops. Lovestruck breeders breed twice as fast. Also: the Destroyer shoots missiles. Click them!',
    obj: [{ t: 'own', k: 'seahorse', n: 3 }, { t: 'money', n: 5000 }, { t: 'lost', n: 2 }], reward: { pet: 'crabby' } },
  { name: 'Shock Therapy', tank: 1, waste: true, slots: ['wrasse', 'eel', 'piranha', 'starcatcher'], egg: 2000, start: 450, aliens: ['twins', 'brute'], alienFirst: 120, events: true,
    intro: 'Volt Eels zap nearby fish so they drop coins instantly, and fry aliens. Twin Terrors revive each other: kill both fast!',
    obj: [{ t: 'own', k: 'eel', n: 2 }, { t: 'noeaten' }, { t: 'bounties', n: 3 }], reward: { pet: 'inky', petSlot: true } },
  { name: 'Jelly Jam', tank: 1, waste: true, slots: ['jelly', 'turtle', 'eel', 'wrasse'], egg: 2250, start: 500, aliens: ['hoarder', 'gorger', 'destroyer'], alienFirst: 120, events: true,
    intro: 'Jellies are free-range turtle food that multiplies on its own. Turtles nibble them (the jelly shrinks and regrows) and drop emeralds. Zapped jellies drop gold! Kill Hoarders fast: they steal your cash.',
    obj: [{ t: 'own', k: 'jelly', n: 6 }, { t: 'own', k: 'turtle', n: 2 }, { t: 'time', n: 900 }], reward: { pet: 'midas' } },
  { name: 'Queen of Leeches', tank: 1, boss: true, waste: true, slots: ['wrasse', 'breeder', 'carnivore', 'puffer'], egg: 2500, start: 500, aliens: ['twins', 'leechqueen'], alienFirst: 120, events: true,
    intro: 'BOSS LEVEL! The Leech Queen covers fish in leeches. Click leeches off or let Wrasses eat them. Egg locked until she falls.',
    obj: [{ t: 'own', k: 'wrasse', n: 4 }, { t: 'lost', n: 3 }, { t: 'bounties', n: 3 }], reward: { pet: 'momma' } },
  // ---- Tank 3: Midnight Trench (blackouts)
  { name: 'Lights Out', tank: 2, waste: true, slots: ['angler', 'carnivore', 'breeder', 'puffer'], egg: 2500, start: 500, aliens: ['phantom', 'gnasher'], alienFirst: 120, events: true,
    intro: 'Down here the lights go out. Anglers glow, collect coins with their lure, and reveal invisible Phantoms.',
    obj: [{ t: 'own', k: 'angler', n: 2 }, { t: 'bounties', n: 3 }, { t: 'lost', n: 2 }], reward: { pet: 'remy' } },
  { name: 'Wishing Well', tank: 2, waste: true, slots: ['koi', 'seahorse', 'wrasse', 'starcatcher'], egg: 3000, start: 600, aliens: ['psychosquid', 'hoarder'], alienFirst: 120, events: true,
    intro: 'The Golden Koi grants a wish every 8 meals. Psychosquids heal when they glow RED. Only shoot when they are BLUE!',
    obj: [{ t: 'wishes', n: 1 }, { t: 'money', n: 10000 }, { t: 'time', n: 960 }], reward: { pet: 'zippy' } },
  { name: 'Apex Predators', tank: 2, waste: true, slots: ['carnivore', 'ultravore', 'breeder', 'puffer'], egg: 3500, start: 600, aliens: ['brute', 'destroyer', 'twins'], alienFirst: 110, events: true,
    intro: 'The full food chain: breeders → babies → carnivores → MEGACHOMP → treasure chests.',
    obj: [{ t: 'own', k: 'ultravore', n: 1 }, { t: 'own', k: 'carnivore', n: 4 }, { t: 'noeaten' }], reward: { pet: 'nimbus' } },
  { name: 'Deep Pressure', tank: 2, waste: true, slots: ['eel', 'jelly', 'turtle', 'angler'], egg: 4000, start: 700, aliens: ['phantom', 'phantom+gnasher', 'psychosquid', 'leechqueen'], alienFirst: 110, events: true,
    intro: 'Aliens start arriving in groups now. Stay sharp.',
    obj: [{ t: 'own', k: 'eel', n: 3 }, { t: 'own', k: 'turtle', n: 3 }, { t: 'bounties', n: 3 }], reward: { shells: 15 } },
  { name: 'The Void Maw', tank: 2, boss: true, waste: true, slots: ['breeder', 'carnivore', 'ultravore', 'eel'], egg: 4500, start: 800, aliens: ['psychosquid', 'brute+gnasher', 'voidmaw'], alienFirst: 110, events: true,
    intro: 'BOSS LEVEL! A hungry hole in the universe. It drags in fish AND coins. Volt Eels do triple damage to it.',
    obj: [{ t: 'lost', n: 4 }, { t: 'time', n: 1200 }, { t: 'bounties', n: 4 }], reward: { shells: 20 } },
  // ---- Tank 4: Alien Mothership
  { name: 'Abducted!', tank: 3, waste: true, slots: ['breeder', 'piranha', 'puffer', 'eel'], egg: 4500, start: 800, aliens: ['brute', 'gnasher+brute', 'destroyer+twins'], alienFirst: 100, events: true,
    intro: 'You\'ve been beamed aboard the alien mothership. Their home turf, their rules: expect double trouble. Your laser starts pre-charged from here on.',
    obj: [{ t: 'own', k: 'piranha', n: 8 }, { t: 'lost', n: 6 }, { t: 'bounties', n: 3 }], reward: { shells: 15 } },
  { name: 'Gold Fever', tank: 3, waste: true, slots: ['koi', 'angler', 'starcatcher', 'seahorse'], egg: 5000, start: 800, aliens: ['hoarder', 'phantom', 'hoarder+gnasher', 'gorger+phantom'], alienFirst: 100, events: true,
    intro: 'Get rich or get eaten trying.',
    obj: [{ t: 'money', n: 20000 }, { t: 'wishes', n: 2 }, { t: 'lost', n: 3 }], reward: { shells: 15 } },
  { name: 'Total Ecosystem', tank: 3, waste: true, slots: ['breeder', 'carnivore', 'ultravore', 'wrasse'], egg: 5500, start: 900, aliens: ['psychosquid', 'leechqueen', 'psychosquid+destroyer'], alienFirst: 100, events: true,
    intro: 'Keep the whole food chain alive under fire.',
    obj: [{ t: 'own', k: 'ultravore', n: 2 }, { t: 'grime', n: 8 }, { t: 'bounties', n: 4 }], reward: { shells: 20 } },
  { name: 'Last Stand', tank: 3, waste: true, slots: ['puffer', 'piranha', 'eel', 'breeder'], egg: 6000, start: 900, aliens: ['brute', 'twins+brute', 'phantom+psychosquid', 'kraken'], alienFirst: 100, events: true,
    intro: 'The Kraken followed you up here. Build an army.',
    obj: [{ t: 'own', k: 'puffer', n: 4 }, { t: 'noeaten' }, { t: 'time', n: 1200 }], reward: { shells: 20 } },
  { name: 'The Overlord', tank: 3, boss: true, waste: true, slots: ['breeder', 'carnivore', 'koi', 'eel'], egg: 7000, start: 1000, aliens: ['brute', 'brute+gnasher', 'overlord'], alienFirst: 100, events: true,
    intro: 'FINAL BOSS. The Overlord itself. Shoot its shield orbs first, then hit the brain. Save the ocean, captain!',
    obj: [{ t: 'lost', n: 5 }, { t: 'bounties', n: 4 }, { t: 'time', n: 1500 }], reward: { shells: 50, trophy: true } },
];

const OBJ_TEXT = o => {
  switch (o.t) {
    case 'time': return `Finish in under ${fmtTime(o.n)}`;
    case 'lost': return o.n === 0 ? 'Don\'t lose a single fish' : `Lose ${o.n} fish or fewer`;
    case 'own': return `Own ${o.n} ${FISH[o.k].name}${o.n > 1 ? 's' : ''} at once`;
    case 'bounties': return `Complete ${o.n} bount${o.n > 1 ? 'ies' : 'y'}`;
    case 'noeaten': return 'No fish eaten by aliens';
    case 'king': return 'Grow a King Guppy';
    case 'money': return `Hold ${fmt(o.n)} at once`;
    case 'grime': return `Never let waste pile above ${o.n}`;
    case 'wishes': return `Get ${o.n} Koi wish${o.n > 1 ? 'es' : ''}`;
  }
  return '?';
};

const EVENTS = {
  goldrush:  { name: 'GOLD RUSH!', desc: 'All coins worth double!', dur: 20, tank: 0, col: '#ffd84a' },
  frenzy:    { name: 'FEEDING FRENZY!', desc: 'Food is free, but everyone is starving!', dur: 18, tank: 0, col: '#ff9a3c' },
  meteor:    { name: 'METEOR SHOWER!', desc: 'Stars are falling! Click them or feed starcatchers.', dur: 16, tank: 0, col: '#fff27a' },
  treasure:  { name: 'TREASURE CURRENT!', desc: 'A chest is drifting by. Click it 12 times to crack it open!', dur: 14, tank: 1, col: '#ffcc66' },
  redtide:   { name: 'RED TIDE!', desc: 'Fish get hungry twice as fast!', dur: 20, tank: 1, col: '#ff5a5a' },
  plankton:  { name: 'PLANKTON BLOOM!', desc: 'Fish barely get hungry. Jellies multiply!', dur: 20, tank: 1, col: '#8affc1' },
  blackout:  { name: 'BLACKOUT!', desc: 'The lights are out! Your cursor is a flashlight.', dur: 22, tank: 2, col: '#9ab0ff' },
  bubbles:   { name: 'BUBBLE STORM!', desc: 'Pop bubbles for cash!', dur: 14, tank: 0, col: '#bff3ff' },
};

// Meta upgrades bought with sand dollars (shells)
const SHOP = {
  startCash:   { name: 'Deep Pockets', desc: '+$150 starting cash per level.', costs: [5, 10, 15, 20, 25] },
  coinValue:   { name: 'Shiny Coins', desc: '+8% value on every coin.', costs: [8, 12, 16, 20, 25] },
  laserStart:  { name: 'Pre-charged Laser', desc: 'Start each level with +1 laser level.', costs: [10, 20, 30] },
  hunger:      { name: 'Hearty Fish', desc: 'Fish starve 10% slower.', costs: [10, 15, 20] },
  startGuppy:  { name: 'Starter School', desc: '+1 free guppy at level start.', costs: [6, 12] },
  foodStart:   { name: 'Gourmet Start', desc: 'Start every level with Flakes.', costs: [15] },
  eggDiscount: { name: 'Egg Haggler', desc: 'Egg pieces cost 8% less.', costs: [10, 15, 20] },
  magnet:      { name: 'Coin Magnet', desc: 'Coins on the floor auto-collect after a few seconds.', costs: [25] },
  petSlot:     { name: 'Pet Hotel', desc: '+1 pet slot.', costs: [40] },
  relicSlot:   { name: 'Relic Case', desc: '+1 relic slot.', costs: [35] },
};

const ACHIEVEMENTS = {
  firstcoin:  { name: 'Ka-ching!', desc: 'Collect your first coin.', shells: 1 },
  firstkill:  { name: 'Alien Buster', desc: 'Defeat an alien.', shells: 2 },
  king:       { name: 'Long Live the King', desc: 'Grow a King Guppy.', shells: 3 },
  kill25:     { name: 'Exterminator', desc: 'Defeat 25 aliens.', shells: 5 },
  rich:       { name: 'Fat Wallet', desc: 'Earn $250,000 total.', shells: 5 },
  tank1:      { name: 'Shallows Champion', desc: 'Beat the Kraken.', shells: 5 },
  tank2:      { name: 'Kelp King', desc: 'Beat the Leech Queen.', shells: 5 },
  tank3:      { name: 'Trench Diver', desc: 'Beat the Void Maw.', shells: 5 },
  tank4:      { name: 'Savior of the Seas', desc: 'Beat the Overlord.', shells: 10 },
  crowd:      { name: 'Packed Tank', desc: 'Have 30 fish at once.', shells: 3 },
  bounty10:   { name: 'Bounty Hunter', desc: 'Complete 10 bounties.', shells: 4 },
  wish:       { name: 'Wish Upon a Fish', desc: 'Get a Koi wish.', shells: 2 },
  zap100:     { name: 'Electrician', desc: 'Volt Eels zap 100 times.', shells: 3 },
  coins1000:  { name: 'Coin Hoarder', desc: 'Collect 1,000 coins.', shells: 3 },
  perfect5:   { name: 'Perfectionist', desc: 'Get all 3 objectives on 5 levels.', shells: 5 },
  endless10:  { name: 'Survivor', desc: 'Reach wave 10 in Endless mode.', shells: 5 },
  chain:      { name: 'Circle of Life', desc: 'Have a breeder, carnivore and Megachomp at the same time.', shells: 3 },
  allpets:    { name: 'Pet Collector', desc: 'Unlock every pet.', shells: 5 },
  combo3:     { name: 'Combo Breaker', desc: 'Have 3 pet combos active at once.', shells: 4 },
  transform:  { name: 'Transformation!', desc: 'Activate a 3-pet family transformation.', shells: 3 },
  expedition: { name: 'Deep Diver', desc: 'Complete an Expedition.', shells: 15 },
  relics5:    { name: 'Curator', desc: 'Own 5 relics.', shells: 4 },
};

const BOUNTY_TYPES = ['collect', 'earn', 'own', 'nowaste', 'survive', 'king', 'clean', 'pop'];
