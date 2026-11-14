'use strict';
// ---- Roguelike layer: pet tags & combos, transformations, boons (run-only), relics (permanent), Expedition stages ----

// Each pet belongs to one or two "families". Three pets of the same family = a transformation.
const PET_TAGS = {
  sluggo: ['collector'], chef: ['nurturer'], clam: ['treasure'], siren: ['nurturer'], nurse: ['nurturer'],
  scrub: ['nurturer'], crabby: ['collector', 'guardian'], inky: ['guardian'], midas: ['treasure'],
  momma: ['nurturer'], remy: ['collector', 'treasure'], zippy: ['guardian'], nimbus: ['guardian'],
};
const TAG_INFO = {
  collector: { name: 'Collector', col: '#7affb0' },
  guardian: { name: 'Guardian', col: '#ff8a7a' },
  nurturer: { name: 'Nurturer', col: '#ffb3e6' },
  treasure: { name: 'Treasure', col: '#ffe14d' },
};
const FORMS = {
  collector: { name: 'Vacuum Squad', desc: '3 Collectors: every coin auto-collects 1.5s after it lands, at full value.', fx: m => { m.autoCollect = 1.5; } },
  guardian: { name: 'Strike Team', desc: '3 Guardians: pets deal double damage and aliens move 20% slower.', fx: m => { m.petDmg *= 2; m.alienSpeed *= 0.8; } },
  nurturer: { name: 'Daycare', desc: '3 Nurturers: fish starve 25% slower and guppies grow +1 extra per meal.', fx: m => { m.hunger *= 0.75; m.growth += 1; } },
  treasure: { name: 'Dragon\'s Hoard', desc: '3 Treasure pets: coins +25% and every alien kill drops a pearl.', fx: m => { m.coin *= 1.25; m.killPearl = true; } },
};
// Two specific pets together = a combo
const COMBOS = {
  golddigger:    { name: 'Gold Digger', pets: ['sluggo', 'midas'], desc: 'Coins Sluggo picks up are worth double.' },
  dinnershow:    { name: 'Dinner Show', pets: ['chef', 'siren'], desc: 'When Siren sings, Chef serves a feast: 5 free Cosmic Chow pellets.' },
  fieldhospital: { name: 'Field Hospital', pets: ['nurse', 'momma'], desc: 'Doc\'s cooldown is halved, and Momma\'s babies are born in bubble shields.' },
  pearldiver:    { name: 'Pearl Diver', pets: ['clam', 'crabby'], desc: 'Pearl works twice as fast. Pinchy\'s pinches knock pearls out of aliens.' },
  inkstorm:      { name: 'Ink Storm', pets: ['inky', 'zippy'], desc: 'Inky inks twice as often. Zippy does triple damage to inked aliens.' },
  bubblebath:    { name: 'Bubble Bath', pets: ['nimbus', 'scrub'], desc: 'Every 3rd waste Scrubby eats, Nimbus bubbles a fish.' },
  stickyfingers: { name: 'Sticky Fingers', pets: ['remy', 'midas'], desc: 'Coins Remy grabs upgrade a tier 35% of the time.' },
  lullaby:       { name: 'Lullaby', pets: ['siren', 'momma'], desc: 'Siren\'s song grows every baby guppy up a stage.' },
  shockandawe:   { name: 'Shock & Awe', pets: ['zippy', 'crabby'], desc: 'Pinchy\'s pinches stun aliens. Zippy fires twice as fast at stunned aliens.' },
  cleanbill:     { name: 'Clean Bill of Health', pets: ['scrub', 'nurse'], desc: 'A dirty tank never makes your fish sick.' },
  stormbubbles:  { name: 'Storm Bubbles', pets: ['nimbus', 'zippy'], desc: 'When a bubble blocks an alien bite it explodes: big damage + stun.' },
  royaltreasury: { name: 'Royal Treasury', pets: ['clam', 'midas'], desc: 'One in three of Pearl\'s pearls is an emerald instead.' },
  inktrap:       { name: 'Ink Trap', pets: ['inky', 'crabby'], desc: 'Pinchy can leap at inked aliens anywhere in the tank for triple damage.' },
  hotmeal:       { name: 'Hot Meal', pets: ['chef', 'momma'], desc: 'Chef\'s food is one tier better, and Momma gives birth twice as often.' },
  treasurehunt:  { name: 'Treasure Hunt', pets: ['sluggo', 'remy'], desc: 'Sluggo and Remy each find a free coin every 6 seconds.' },
};

function baseMods() {
  return {
    coin: 1, hunger: 1, laser: 1, crit: 0, growth: 0, freeFood: false, fishCost: 1, egg: 1, startMoney: 0, foodMax: 0, foodQ: 0,
    alienHp: 1, alienSpeed: 1, alienDelay: 0, alienFreq: 1, coinUp: 0, coinDouble: 0, petSpeed: 1, petSlots: 0, petDmg: 1,
    shieldBuy: false, interest: 0, starfall: 0, noWaste: false, lovePotion: false, secondWind: 0, killBonus: 0, killPearl: false,
    bounty: 1, eelCharge: 1, breed: 1, largeGuppy: 0, stormSpawn: 0, autoCollect: 0, dropRate: 1, startShields: 0,
  };
}

// Run-only items for Expedition. curse = big upside with a downside.
const BOONS = {
  luckypenny:  { name: 'Lucky Penny', icon: '🪙', desc: 'Coins are worth +15%.', stack: true, fx: m => { m.coin *= 1.15; } },
  ironstomach: { name: 'Iron Stomach', icon: '🍖', desc: 'Fish starve 20% slower.', stack: true, fx: m => { m.hunger *= 0.8; } },
  overclock:   { name: 'Overclock', icon: '🔋', desc: 'Laser damage +35%.', stack: true, fx: m => { m.laser *= 1.35; } },
  prism:       { name: 'Prism Lens', icon: '💎', desc: 'Laser shots have a 20% chance to CRIT for triple damage.', fx: m => { m.crit += 0.2; } },
  fertilizer:  { name: 'Fertilizer', icon: '🌱', desc: 'Guppies get +1 extra growth per meal.', fx: m => { m.growth += 1; } },
  freelunch:   { name: 'Free Lunch', icon: '🍱', desc: 'Dropping food costs nothing.', fx: m => { m.freeFood = true; } },
  bulkbuyer:   { name: 'Bulk Buyer', icon: '🏷️', desc: 'Fish cost 20% less.', fx: m => { m.fishCost *= 0.8; } },
  goldenyolk:  { name: 'Golden Yolk', icon: '🥚', desc: 'Egg pieces cost 20% less.', fx: m => { m.egg *= 0.8; } },
  doubledip:   { name: 'Double Dip', icon: '✌️', desc: 'Fish have a 15% chance to drop two coins at once.', stack: true, fx: m => { m.coinDouble += 0.15; } },
  petwhistle:  { name: 'Pet Whistle', icon: '📯', desc: 'Pets act 30% faster.', stack: true, fx: m => { m.petSpeed *= 1.3; } },
  kennel:      { name: 'Extra Kennel', icon: '🏠', desc: '+1 pet slot for this expedition.', stack: true, fx: m => { m.petSlots += 1; } },
  sonar:       { name: 'Sonar', icon: '📡', desc: 'The first alien attack of each stage comes 40s later.', fx: m => { m.alienDelay += 40; } },
  thickshell:  { name: 'Thick Shells', icon: '🛡️', desc: 'Every fish you buy arrives inside a bubble shield.', fx: m => { m.shieldBuy = true; } },
  piggybank:   { name: 'Piggy Bank', icon: '🐷', desc: '+$300 at stage start, plus 3% interest every 30s (max $300).', fx: m => { m.startMoney += 300; m.interest += 0.03; } },
  starfall:    { name: 'Wishing Star', icon: '🌠', desc: 'A star falls from the sky every 8 seconds. Starcatchers love this.', fx: m => { m.starfall = 8; } },
  cleanfreak:  { name: 'Clean Freak', icon: '🧽', desc: 'Waste dissolves by itself. The tank never gets dirty.', fx: m => { m.noWaste = true; } },
  lovepotion:  { name: 'Love Potion', icon: '💘', desc: 'Every 25s all fish fall in love for 8s (double coin speed, double breeding).', fx: m => { m.lovePotion = true; } },
  slowmo:      { name: 'Molasses Water', icon: '🍯', desc: 'Aliens move 25% slower.', fx: m => { m.alienSpeed *= 0.75; } },
  secondwind:  { name: 'Second Wind', icon: '❤️', desc: 'Once per stage, if every fish dies, 4 medium guppies appear.', fx: m => { m.secondWind += 1; } },
  wanted:      { name: 'Wanted Poster', icon: '📜', desc: 'Bounties come faster and pay double cash.', fx: m => { m.bounty *= 2; } },
  feedingtube: { name: 'Feeding Tube', icon: '🧪', desc: 'Start each stage with +2 food count and one tier better food.', fx: m => { m.foodMax += 2; m.foodQ += 1; } },
  trophyhunt:  { name: 'Trophy Hunter', icon: '🎯', desc: 'Aliens drop 2 extra diamonds when killed.', stack: true, fx: m => { m.killBonus += 2; } },
  stormbottle: { name: 'Storm in a Bottle', icon: '⛈️', desc: 'Every alien is struck by lightning the moment it arrives (heavy damage + stun).', stack: true, fx: m => { m.stormSpawn += 1; } },
  // cursed
  glasscannon: { name: 'Glass Cannon', icon: '💥', curse: true, desc: 'Laser damage ×2. BUT fish starve 30% faster.', fx: m => { m.laser *= 2; m.hunger *= 1.3; } },
  bloodmoney:  { name: 'Blood Money', icon: '🩸', curse: true, desc: 'Coins worth +40%. BUT aliens have +35% HP.', fx: m => { m.coin *= 1.4; m.alienHp *= 1.35; } },
  loanshark:   { name: 'Loan Shark', icon: '🦈', curse: true, desc: 'Start every stage with +$1500. BUT fish cost 25% more.', fx: m => { m.startMoney += 1500; m.fishCost *= 1.25; } },
  frenzyheart: { name: 'Frenzied Heart', icon: '😈', curse: true, desc: 'Pets act 60% faster. BUT you lose a pet slot.', fx: m => { m.petSpeed *= 1.6; m.petSlots -= 1; } },
  hungryhorde: { name: 'Hungry Horde', icon: '👹', curse: true, desc: 'Fish drop coins 35% faster. BUT aliens attack 25% more often.', fx: m => { m.dropRate *= 1.35; m.alienFreq *= 1.25; } },
};

// Permanent relics. Earned by beating a tank boss (campaign or Expedition). Equip a few at a time.
const RELICS = {
  doubloon:    { name: 'Ancient Doubloon', icon: '🪙', desc: 'Coins are worth +10%.', fx: m => { m.coin *= 1.1; } },
  krakentooth: { name: 'Kraken Tooth', icon: '🦷', desc: 'Laser damage +25%.', fx: m => { m.laser *= 1.25; } },
  fossilegg:   { name: 'Fossil Egg', icon: '🦕', desc: 'Start every level with a Large guppy.', fx: m => { m.largeGuppy += 1; } },
  compass:     { name: 'Sunken Compass', icon: '🧭', desc: 'The first alien attack arrives 30s later.', fx: m => { m.alienDelay += 30; } },
  tidalcharm:  { name: 'Tidal Charm', icon: '🌊', desc: 'Fish starve 15% slower.', fx: m => { m.hunger *= 0.85; } },
  necklace:    { name: 'Pearl Necklace', icon: '📿', desc: '+$300 starting cash.', fx: m => { m.startMoney += 300; } },
  captainslog: { name: 'Captain\'s Log', icon: '📘', desc: 'Bounties pay +50% and come more often.', fx: m => { m.bounty *= 1.5; } },
  clover:      { name: 'Sea Clover', icon: '🍀', desc: '10% of dropped coins upgrade a tier.', fx: m => { m.coinUp += 0.1; } },
  mermaidscale:{ name: 'Mermaid Scale', icon: '🧜', desc: '+1 pet slot.', fx: m => { m.petSlots += 1; } },
  stormglass:  { name: 'Storm Glass', icon: '⚡', desc: 'Volt Eels charge 40% faster. Pets deal +50% damage.', fx: m => { m.eelCharge *= 1.4; m.petDmg *= 1.5; } },
  voidshard:   { name: 'Void Shard', icon: '🔮', desc: 'Aliens have 15% less HP.', fx: m => { m.alienHp *= 0.85; } },
  cradle:      { name: 'Breeder\'s Cradle', icon: '🍼', desc: 'Breeders and Momma give birth 35% faster.', fx: m => { m.breed *= 1.35; } },
  goldengills: { name: 'Golden Gills', icon: '🐠', desc: 'Egg pieces cost 10% less.', fx: m => { m.egg *= 0.9; } },
  conch:       { name: 'Conch of Calling', icon: '🐚', desc: 'Pets act 20% faster.', fx: m => { m.petSpeed *= 1.2; } },
  prismshard:  { name: 'Prism Shard', icon: '💠', desc: 'Laser shots crit 12% of the time (triple damage).', fx: m => { m.crit += 0.12; } },
  bubblewand:  { name: 'Bubble Wand', icon: '🫧', desc: 'Your first 3 fish start every level inside bubble shields.', fx: m => { m.startShields += 3; } },
};

function petTypes(list) { return (list || []).map(p => (typeof p === 'string' ? p : p.type)); }
function activeCombos(types) { return Object.keys(COMBOS).filter(k => COMBOS[k].pets.every(p => types.includes(p))); }
function tagCounts(types) { const c = {}; for (const t of types) for (const tag of PET_TAGS[t] || []) c[tag] = (c[tag] || 0) + 1; return c; }
function activeForms(types) { const c = tagCounts(types); return Object.keys(FORMS).filter(k => (c[k] || 0) >= 3); }
function computeMods(boons, relics, types) {
  const m = baseMods();
  for (const id of relics || []) if (RELICS[id]) RELICS[id].fx(m);
  for (const id of boons || []) if (BOONS[id]) BOONS[id].fx(m);
  for (const f of activeForms(types || [])) FORMS[f].fx(m);
  return m;
}
// Pet slot bonuses only come from relics/boons (not from pets themselves)
function slotBonus(boons) { return computeMods(boons, Save.p.relicEquip, []).petSlots; }

// ---------------- Expedition ----------------
const EXP_FISH = [
  ['carnivore', 'breeder', 'starcatcher', 'puffer', 'piranha'],
  ['carnivore', 'breeder', 'starcatcher', 'puffer', 'piranha', 'wrasse', 'seahorse', 'eel', 'jelly', 'turtle'],
  ['carnivore', 'breeder', 'puffer', 'piranha', 'wrasse', 'seahorse', 'eel', 'jelly', 'turtle', 'angler', 'koi', 'ultravore', 'starcatcher'],
  Object.keys(FISH).filter(k => k !== 'guppy'),
];
const EXP_ALIENS = [
  ['gnasher', 'gnasher', 'gorger', 'brute'],
  ['gnasher', 'brute', 'destroyer', 'twins', 'hoarder', 'gorger'],
  ['brute', 'destroyer', 'twins', 'psychosquid', 'phantom', 'hoarder', 'gnasher'],
  ['brute', 'twins', 'psychosquid', 'phantom', 'destroyer', 'hoarder', 'gorger'],
];
const EXP_BOSS = ['kraken', 'leechqueen', 'voidmaw', 'overlord'];
const STAGE_WORDS = [['Coral', 'Sunny', 'Bubble', 'Sandy', 'Turtle', 'Starfish'], ['Kelp', 'Murky', 'Mossy', 'Tangled', 'Seagrass', 'Otter'], ['Abyssal', 'Glowing', 'Pitch-Black', 'Crushing', 'Lantern', 'Hollow'], ['Saucer', 'Laser', 'Probe', 'Hangar', 'Reactor', 'Brig']];
const STAGE_NOUNS = ['Cove', 'Reef', 'Shelf', 'Grotto', 'Drift', 'Lagoon', 'Shoals', 'Hollow', 'Rift', 'Deck'];

function genStage(tank, stage) {
  const boss = stage === 3;
  let slots = shuffle(EXP_FISH[tank].slice()).slice(0, 4);
  const need = (has, dep) => { if (slots.includes(has) && !slots.includes(dep)) { const i = slots.findIndex(k => k !== has && k !== 'carnivore' && k !== 'breeder'); slots[i >= 0 ? i : 3] = dep; } };
  need('ultravore', 'carnivore'); need('turtle', 'jelly'); if (Math.random() < 0.75) need('carnivore', 'breeder');
  slots = [...new Set(slots)];
  const waves = [];
  const n = 2 + (tank >= 2 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    let w = pick(EXP_ALIENS[tank]);
    if (tank >= 1 && i > 0 && Math.random() < 0.25 + tank * 0.2) w += '+' + pick(EXP_ALIENS[tank].filter(x => x !== 'gorger'));
    waves.push(w);
  }
  if (boss) waves.push(EXP_BOSS[tank]);
  const name = boss ? ALIENS[EXP_BOSS[tank]].name + '\'s Lair' : pick(STAGE_WORDS[tank]) + ' ' + pick(STAGE_NOUNS);
  return {
    name, tank, stage, exp: true, boss, slots, aliens: waves, alienFirst: 100, events: true, waste: tank >= 1,
    egg: Math.round([550, 1100, 1800, 2700][tank] * (1 + stage * 0.15) / 50) * 50,
    start: [300, 450, 600, 800][tank], diff: tank * 5 + stage * 1.25, obj: [],
    intro: boss ? `BOSS STAGE! ${ALIENS[EXP_BOSS[tank]].name} guards this tank. The egg stays locked until it falls.` : `Expedition: Tank ${tank + 1}, stage ${stage + 1} of 4. Buy 3 egg pieces to move on.`,
  };
}
const expPetSlots = exp => Math.max(1, 2 + slotBonus(exp.boons));

function genDraft(exp) {
  const boonPool = Object.keys(BOONS).filter(b => BOONS[b].stack || !exp.boons.includes(b));
  const petPool = Object.keys(PETS).filter(p => { const o = exp.pets.find(x => x.type === p); return !o || o.lv < 3; });
  const cards = [];
  const used = new Set();
  const addPet = () => { const opts = petPool.filter(p => !used.has('p' + p)); if (!opts.length) return false; const id = pick(opts); used.add('p' + id); cards.push({ kind: 'pet', id }); return true; };
  const addBoon = (curse) => { const opts = boonPool.filter(b => !used.has('b' + b) && !!BOONS[b].curse === curse); if (!opts.length) return false; const id = pick(opts); used.add('b' + id); cards.push({ kind: 'boon', id }); return true; };
  addPet();
  if (Math.random() < 0.35) addBoon(true);
  while (cards.length < 3) { if (!(Math.random() < 0.3 ? addPet() : addBoon(false))) if (!addBoon(false) && !addPet()) break; }
  return shuffle(cards);
}
function genRelicDraft() {
  const pool = Object.keys(RELICS).filter(r => !Save.p.relics.includes(r));
  const cards = shuffle(pool).slice(0, 3).map(id => ({ kind: 'relic', id }));
  while (cards.length < 3) cards.push({ kind: 'shells', id: 'shells', n: 10 });
  return cards;
}
// Tanks whose boss is beaten in the campaign but whose relic hasn't been claimed yet
function pendingRelicClaims() {
  return [4, 9, 14, 19].map((lv, t) => (Save.p.levels[lv] && Save.p.levels[lv].done && !Save.p.relicClaims.includes(t) ? t : -1)).filter(t => t >= 0);
}
