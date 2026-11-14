'use strict';
// ---- Core simulation. G holds the whole run and is plain JSON (so it can be saved). ----
let G = null;
const FX = { parts: [], texts: [], bolts: [], bubbles: [], banners: [], cbubbles: [], rings: [] }; // transient visuals
const Input = { x: W / 2, y: H / 2 };

const nid = () => G.nextId++;
const level = () => (G.cfg ? G.cfg : G.endless ? null : LEVELS[G.level]);
const combo = id => !!(G && G.combos && G.combos.includes(id));
const M = () => (G && G.mods) || baseMods();
const hasPet = type => G.pets.some(p => p.type === type);
const countFish = kind => G.fish.reduce((n, f) => n + (!f.dead && f.kind === kind ? 1 : 0), 0);
const MAX_FISH = 60;

// ================= RUN SETUP =================
// levelArg: campaign index, 'endless', or an Expedition stage config object
function newRun(levelArg, opts = {}) {
  const endless = levelArg === 'endless';
  const exp = typeof levelArg === 'object';
  const L = endless ? null : exp ? levelArg : LEVELS[levelArg];
  const up = id => Save.up(id);
  const boons = opts.boons || [];
  const pets = (opts.pets || []).map(p => (typeof p === 'string' ? { type: p, lv: 1 } : p));
  const nSlots = exp ? expPetSlots({ boons }) : Save.petSlots();
  const usePets = pets.slice(0, nSlots), types = petTypes(usePets);
  const mods = computeMods(boons, Save.p.relicEquip, types);
  G = {
    v: 2, level: endless ? -1 : exp ? -2 : levelArg, endless, mode: endless ? 'endless' : exp ? 'expedition' : 'campaign', cfg: exp ? L : null,
    diff: endless ? 0 : exp ? L.diff : levelArg,
    theme: endless ? 'shallows' : TANKS[L.tank].theme,
    mods, boons, combos: activeCombos(types), forms: activeForms(types),
    money: (endless ? 400 : L.start) + up('startCash') * 150 + mods.startMoney,
    foodQ: Math.min(4, (up('foodStart') ? 2 : 1) + mods.foodQ), foodMax: Math.min(FOOD_COUNT_MAX, 1 + mods.foodMax),
    laser: Math.min(LASER_MAX, 1 + up('laserStart') + (endless ? 0 : L.tank)), eggs: 0,
    eggCost: endless ? 2500 : Math.round(L.egg * (1 - 0.08 * up('eggDiscount')) * mods.egg / 5) * 5,
    time: 0, nextId: 1,
    slots: ['guppy', 'foodq', 'foodn', ...padSlots(endless ? opts.fish || [] : L.slots), 'laser', 'egg'],
    fish: [], foods: [], coins: [], aliens: [], pets: [], wastes: [], hearts: [], missiles: [], leeches: [], corpses: [],
    alienT: (endless ? 75 : (L.alienFirst || 120)) + mods.alienDelay, waveIdx: 0, warned: false, portal: null, bossDefeated: false,
    waveLosses: 0,
    waste: endless ? true : !!L.waste, eventsOn: endless ? true : L.events, maxEventTank: endless ? 3 : L.tank,
    eventT: rand(50, 80), event: null, treasure: null,
    bountyT: 45 / Math.min(1.6, mods.bounty), bounty: null, bountiesOn: endless || exp || levelArg >= 2,
    captain: null, track: { maxOwn: {}, lost: 0, eaten: 0, bounties: 0, maxMoney: 0, king: false, maxGrime: 0, wishes: 0 },
    wave: 0, shellBuys: 0, done: false, saveT: 0, achT: 0, overT: 0,
    starT: mods.starfall, interestT: 30, loveT: 25, windsLeft: mods.secondWind,
  };
  const n = 2 + up('startGuppy');
  for (let i = 0; i < n; i++) spawnFish('guppy', rand(200, W - 200), rand(200, 400), { stage: 0, hunger: 6 });
  for (let i = 0; i < mods.largeGuppy; i++) spawnFish('guppy', rand(200, W - 200), rand(200, 400), { stage: 2, growth: 9, hunger: 0 });
  G.fish.slice(0, mods.startShields).forEach(f => { f.shield = true; });
  for (const p of usePets) spawnPet(p.type, p.lv);
  if (!endless) say(L.intro, 9);
  else say('ENDLESS MODE! Aliens never stop coming and get tougher every wave. Buy Shell Troves to turn cash into sand dollars. How long can you last?', 9);
  for (const k of G.slots) if (FISH[k]) Save.seeFish(k);
  if (G.combos.length >= 3) unlockAch('combo3');
  if (G.forms.length) unlockAch('transform');
  return G;
}
function padSlots(list) { const s = list.slice(0, 4); while (s.length < 4) s.push(null); return s; }

function makeDemo() {
  G = newRun(0, {});
  G.mods = baseMods(); G.combos = []; G.forms = [];
  G.demo = true; G.captain = null; G.theme = pick(['shallows', 'kelp', 'trench', 'mothership']);
  G.fish = [];
  for (const k of ['guppy', 'guppy', 'guppy', 'carnivore', 'koi', 'seahorse', 'jelly', 'eel', 'puffer', 'wrasse', 'angler', 'starcatcher', 'turtle'])
    spawnFish(k, rand(100, W - 100), rand(180, 480), { stage: k === 'guppy' ? randi(1, 3) : 1 });
}

// ================= SPAWNING =================
function spawnFish(kind, x, y, o = {}) {
  const def = FISH[kind];
  const f = Object.assign({
    id: nid(), kind, x, y, vx: 0, vy: 0, dir: Math.random() < 0.5 ? 1 : -1, face: 1, hunger: rand(0, 4), t: rand(0, 10),
    wx: x, wy: y, wt: 0, dropT: def.dropInt ? rand(...def.dropInt) : rand(10, 14), stage: 0, growth: 0, meals: 0, eatT: 0, love: 0,
    shield: false, puff: 0,
  }, o);
  if (kind === 'breeder') f.birthT = 20;
  if (kind === 'eel') f.charge = 0;
  if (kind === 'jelly') { if (o.stage == null) f.stage = 1; f.budT = rand(35, 50); f.growT = 20; f.stingCD = 0; f.glow = 0; }
  if (kind === 'seahorse') f.heartT = rand(3, 7);
  if (kind === 'starcatcher') f.y = FLOOR - 18;
  f.face = f.dir;
  G.fish.push(f);
  return f;
}
function buyFishArrive(kind) {
  const f = spawnFish(kind, rand(80, W - 80), SURFACE + 4, { vy: 90, hunger: 0, stage: kind === 'breeder' ? 0 : 0 });
  if (kind === 'starcatcher') { f.y = SURFACE + 4; f.dropping = true; }
  if (M().shieldBuy) f.shield = true;
  splash(f.x);
  return f;
}
function spawnPet(type, lv = 1) {
  const p = { id: nid(), kind: 'pet', type, lv, x: rand(100, W - 100), y: rand(200, 400), vx: 0, vy: 0, t: rand(0, 10), dir: 1, face: 1, wx: 0, wy: 0, wt: 0, timer: 0, cd: 0 };
  if (['sluggo', 'scrub', 'crabby'].includes(type)) p.y = FLOOR - 10;
  if (type === 'clam') { p.x = W - 170; p.y = FLOOR - 4; p.timer = 30; p.open = 0; }
  if (type === 'siren') p.timer = 30;
  if (type === 'momma') p.timer = 40;
  if (type === 'nimbus') p.timer = 15;
  if (type === 'chef') p.timer = 2;
  G.pets.push(p);
}
function spawnCoin(type, x, y, o = {}) {
  if (G.demo) return;
  const midas = G.pets.find(p => p.type === 'midas');
  if (COIN_UP[type] && Math.random() < (midas ? 0.1 + 0.05 * midas.lv : 0) + M().coinUp) { type = COIN_UP[type]; sparkle(x, y, '#ffe14d', 6); }
  const c = Object.assign({ id: nid(), type, x: clamp(x, 20, W - 20), y: clamp(y, SURFACE, FLOOR - 4), vy: COINS[type].fast ? 85 : 42, rest: -1, t: rand(0, 6) }, o);
  G.coins.push(c);
  return c;
}
function spawnValue(amount, x, y) { // break an amount into coins
  const order = [['chest', 2000], ['emerald', 400], ['diamond', 200], ['gold', 35]];
  let n = 0;
  for (const [type, v] of order) while (amount >= v && n < 30) { spawnCoin(type, x + rand(-40, 40), y + rand(-30, 30)); amount -= v; n++; }
}
// food from pets/events is flagged `bonus` and doesn't use up your food limit
const playerFood = () => G.foods.reduce((n, f) => n + (f.bonus ? 0 : 1), 0);
function dropFood(x, y, free) {
  if (playerFood() >= G.foodMax) return false;
  const isFree = free || M().freeFood || (G.event && G.event.type === 'frenzy');
  if (!isFree) { if (G.money < 5) { Sfx.play('nope'); return false; } G.money -= 5; }
  G.foods.push({ id: nid(), x: clamp(x, 15, W - 15), y: Math.max(y, SURFACE + 2), q: G.foodQ, vy: 50, rest: -1 });
  Sfx.play('drop');
  return true;
}
function spawnAlien(type, hpMult = 1, at, extra = {}) {
  const def = ALIENS[type];
  const p = at || G.portal || { x: rand(150, W - 150), y: rand(180, 320) };
  hpMult *= M().alienHp;
  const a = Object.assign({ id: nid(), type, x: p.x, y: p.y, vx: 0, vy: 0, hp: def.hp * hpMult, maxHp: def.hp * hpMult, storm: M().stormSpawn, r: def.r, t: 0, dir: 1, face: 1,
    chewT: 0, flash: 0, stunT: 0, blindT: 0, tgt: null, retarget: 0, spawnT: 1, wx: p.x, wy: p.y, wt: 0 }, extra);
  switch (type) {
    case 'gorger': a.fed = 0; a.need = Math.round(12 * hpMult); break;
    case 'destroyer': a.y = FLOOR - 30; a.fireT = 3; a.aim = -Math.PI / 2; a.wx = a.x; break;
    case 'psychosquid': a.mode = 'blue'; a.switchT = 4.5; break;
    case 'leechqueen': a.leechT = 2; break;
    case 'phantom': a.vis = 1; a.phase = 0; break;
    case 'hoarder': a.stolen = 0; break;
    case 'kraken':
      a.x = W / 2; a.y = FLOOR + 100; a.headUp = 0;
      a.tentacles = [140, 330, 630, 820].map((x, i) => ({ x, h: 0, len: rand(320, 400), phase: i * 1.7, hp: 95 * hpMult, maxHp: 95 * hpMult, state: 'rise', held: null, reach: 0, regrow: 0, flash: 0 }));
      a.regrowT = 14; break;
    case 'voidmaw': a.x = W / 2; a.y = 320; a.spitT = 12; break;
    case 'overlord': a.x = W / 2; a.y = 240; a.fireT = 5; a.summonT = 10; a.orbRegenT = 0;
      a.orbs = [0, 1, 2].map(i => ({ ang: i * TAU / 3, hp: 120 * hpMult, maxHp: 120 * hpMult, flash: 0 })); break;
  }
  G.aliens.push(a);
  Save.seeAlien(type);
  burst(a.x, a.y, '#c87aff', 30, 200);
  if (hasPet('inky')) { const ink = G.pets.find(p => p.type === 'inky'); ink.timer = Math.min(ink.timer, 2); }
  return a;
}

// ================= FX HELPERS =================
function addText(x, y, text, col = '#7aff5a', size = 18) { FX.texts.push({ x, y, text, col, size, life: 1.2, max: 1.2 }); }
function burst(x, y, col, n = 12, spd = 120) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), s = rand(spd * 0.3, spd); FX.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.4, 0.9), col, r: rand(2, 5) }); } }
function sparkle(x, y, col, n = 6) { for (let i = 0; i < n; i++) FX.parts.push({ x: x + rand(-10, 10), y: y + rand(-10, 10), vx: rand(-20, 20), vy: rand(-60, -20), life: rand(0.4, 0.8), col, r: rand(1.5, 3), star: true }); }
function splash(x) { Sfx.play('splash'); for (let i = 0; i < 14; i++) FX.parts.push({ x: x + rand(-10, 10), y: SURFACE, vx: rand(-80, 80), vy: rand(-160, -40), life: rand(0.4, 0.7), col: '#e0f8ff', r: rand(2, 4), grav: 400 }); }
function banner(text, col = '#ffe14d', sub = '') { FX.banners.push({ text, col, sub, life: 2.8, max: 2.8 }); }
function say(msg, t = 7) { if (G && !G.demo) G.captain = { msg, t }; }
function bolt(x1, y1, x2, y2, col = '#fffd8a') { FX.bolts.push({ x1, y1, x2, y2, col, life: 0.25, seed: Math.random() }); }

// ================= MONEY / COINS =================
function coinMult() { return (1 + 0.08 * Save.up('coinValue')) * M().coin * (G.event && G.event.type === 'goldrush' ? 2 : 1); }
function addMoney(v) {
  G.money += v;
  Save.p.stats.money += v;
  if (G.money > G.track.maxMoney) G.track.maxMoney = G.money;
  if (G.bounty && G.bounty.type === 'earn') G.bounty.prog += v;
}
function collectCoin(c, how, bonus = 1) {
  if (c.dead) return;
  c.dead = true;
  const def = COINS[c.type];
  if (c.type === 'shell') {
    Save.p.shells += 1; addText(c.x, c.y - 10, '+1 Sand Dollar', '#ffe6b0', 18); Sfx.play('bigcoin'); sparkle(c.x, c.y, '#fff', 10);
  } else {
    const v = Math.round(def.v * coinMult() * bonus * (how === 'magnet' ? 0.75 : 1));
    addMoney(v);
    addText(c.x, c.y - 10, '+' + fmt(v), def.v >= 200 ? '#7affff' : '#7aff5a', def.v >= 200 ? 22 : 17);
    Sfx.play(def.v >= 200 ? 'bigcoin' : 'coin');
    if (def.v >= 200) sparkle(c.x, c.y, '#fff', 8);
  }
  Save.p.stats.coins++;
  if (G.bounty && G.bounty.type === 'collect') G.bounty.prog++;
  unlockAch('firstcoin');
}

// ================= FISH LOGIC =================
function fishScale(f) {
  if (f.kind === 'guppy') return [0.6, 0.85, 1.05, 1.2][f.stage];
  if (f.kind === 'breeder') return f.stage ? 1 : 0.72;
  return 1;
}
const fishR = f => FISH[f.kind].r * fishScale(f);
function hungerMult() {
  let m = (1 - 0.1 * Save.up('hunger')) * M().hunger;
  const e = G.event && G.event.type;
  if (e === 'redtide') m *= 2; if (e === 'frenzy') m *= 2.2; if (e === 'plankton') m *= 0.3;
  if (isSick()) m *= 1.3;
  return m;
}
function hungerVis(f) {
  const d = FISH[f.kind]; if (d.diet === 'none' || f.hunger < d.hungerAt) return 0;
  return 0.55 + 0.45 * clamp((f.hunger - d.hungerAt) / (d.dieAt - d.hungerAt), 0, 1);
}
// 0 = fine, then 0..1 over the last stretch before starving (used for the red warning flash)
function starveDanger(f) {
  const d = FISH[f.kind]; if (d.diet === 'none') return 0;
  const k = (f.hunger - d.hungerAt) / (d.dieAt - d.hungerAt);
  return k < 0.55 ? 0 : clamp((k - 0.55) / 0.45, 0, 1);
}
const isPeckish = f => f.hunger > FISH[f.kind].hungerAt * 0.45;
const isSick = () => grime() > 6 && !combo('cleanbill');
function grime() { let n = 0; for (const w of G.wastes) if (w.rest >= 0) n++; return n; }

function moveTo(o, tx, ty, spd, dt, acc = 3) {
  const dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1;
  const s = Math.min(spd, d * 2.5);
  const k = Math.min(1, acc * dt);
  o.vx += ((dx / d) * s - o.vx) * k;
  o.vy += ((dy / d) * s - o.vy) * k;
}
function wander(o, dt, spd, yMin = SURFACE + 30, yMax = FLOOR - 30) {
  o.wt -= dt;
  if (o.wt <= 0 || d2(o.x, o.y, o.wx, o.wy) < 500) { o.wx = rand(40, W - 40); o.wy = rand(yMin, yMax); o.wt = rand(2, 6); }
  moveTo(o, o.wx, o.wy, spd, dt, 1.4);
}
function integrate(o, dt, r = 14, floorY) {
  o.x += o.vx * dt; o.y += o.vy * dt;
  o.x = clamp(o.x, 22, W - 22);
  if (floorY != null) o.y = floorY;
  else o.y = clamp(o.y, SURFACE + 14, FLOOR - Math.max(10, r * 0.7));
  if (Math.abs(o.vx) > 8) o.dir = o.vx > 0 ? 1 : -1;
  o.face += (o.dir - o.face) * Math.min(1, dt * 7);
}

function eat(f, q = 1) {
  f.hunger = 0; f.eatT = 0.35; f.meals++;
  Sfx.play('eat');
  if (G.waste && f.kind !== 'wrasse' && Math.random() < 0.3) G.wastes.push({ id: nid(), x: f.x - f.dir * 12, y: f.y, vy: 28, rest: -1 });
  if (f.kind === 'guppy') {
    f.growth += q + M().growth;
    const need = [3, 9, 70][f.stage];
    if (f.stage < 3 && f.growth >= need) {
      f.stage++; burst(f.x, f.y, '#fff', 10, 80); Sfx.play('birth');
      if (f.stage === 3) { banner('KING GUPPY!', '#ffe14d'); G.track.king = true; unlockAch('king'); }
      if (f.stage === 1 || f.stage === 2) f.dropT = Math.min(f.dropT, rand(4, 8));
    }
  }
  if (f.kind === 'breeder' && f.stage === 0 && f.meals >= 3) { f.stage = 1; burst(f.x, f.y, '#ffb0e0', 10, 80); }
  if (f.kind === 'koi' && f.meals % 8 === 0) koiWish(f);
}

function fishDropType(f, bonus) {
  if (f.kind === 'guppy') return [null, 'silver', 'gold', 'diamond'][f.stage];
  if (bonus) { if (f.kind === 'jelly') return 'gold'; if (FISH[f.kind].drop || f.kind === 'breeder' || f.kind === 'seahorse' || f.kind === 'eel' || f.kind === 'angler') return 'gold'; return null; }
  return FISH[f.kind].drop || null;
}
function bonusDrop(f) { const t = fishDropType(f, true); if (t) spawnCoin(t, f.x, f.y); return !!t; }

function killFish(f, cause) {
  if (f.dead) return;
  f.dead = true;
  if (f.held) releaseHeld(f);
  const lostCauses = ['starve', 'eaten', 'missile', 'tentacle', 'void', 'piranha'];
  if (lostCauses.includes(cause)) { G.track.lost++; G.waveLosses++; if (G.bounty && G.bounty.type === 'survive') failBounty(); }
  if (['eaten', 'missile', 'tentacle', 'void'].includes(cause)) { G.track.eaten++; if (G.bounty && G.bounty.type === 'protect') failBounty(); }
  if (cause === 'starve') { G.corpses.push({ id: nid(), kind: f.kind, x: f.x, y: f.y, dir: f.dir, stage: f.stage, t: 0 }); Sfx.play('die'); addText(f.x, f.y - 20, 'Starved!', '#ff8a8a', 16); }
  else if (cause !== 'food') burst(f.x, f.y, '#ff6a6a', 14, 140);
}
function releaseHeld(f) {
  for (const a of G.aliens) if (a.tentacles) for (const tn of a.tentacles) if (tn.held === f.id) tn.held = null;
  f.held = null;
}
function tryNurse(f) {
  const n = G.pets.find(p => p.type === 'nurse');
  if (!n || n.cd > 0) return false;
  n.cd = 45; f.hunger = 0;
  bolt(n.x, n.y, f.x, f.y, '#ff8aa0'); addText(f.x, f.y - 20, 'Saved by Doc!', '#ff9ab0', 16); Sfx.play('heart');
  for (let i = 0; i < 4; i++) G.hearts.push({ x: f.x + rand(-15, 15), y: f.y, life: 1.5, vy: -40, fx: true });
  return true;
}

function koiWish(f) {
  const wishes = [
    ['GOLD RAIN!', () => { for (let i = 0; i < 12; i++) spawnCoin('gold', rand(60, W - 60), SURFACE + rand(0, 60)); for (let i = 0; i < 3; i++) spawnCoin('diamond', rand(60, W - 60), SURFACE); }],
    ['GROWTH SPURT!', () => { for (const g of G.fish) { if (g.kind === 'guppy' && g.stage < 2) { g.stage++; g.growth = Math.max(g.growth, [0, 3, 9][g.stage]); } if (g.kind === 'breeder') g.stage = 1; } }],
    ['FULL BELLIES!', () => { for (const g of G.fish) g.hunger = 0; }],
    ['LASER BOOST!', () => { if (G.laser < LASER_MAX) G.laser++; else addMoney(1500); }],
    ['EGG DISCOUNT!', () => { G.eggCost = Math.round(G.eggCost * 0.75 / 5) * 5; }],
    ['SAND DOLLARS!', () => { for (let i = 0; i < 3; i++) spawnCoin('shell', f.x + rand(-30, 30), f.y); }],
    ['FREE FISH!', () => { for (let i = 0; i < 3; i++) buyFishArrive('guppy').stage = 1; }],
  ];
  const [name, fn] = pick(wishes);
  fn();
  banner('KOI WISH: ' + name, '#ffe14d', 'The Golden Koi grants your wish!');
  Sfx.play('wish'); sparkle(f.x, f.y, '#fff8a0', 25);
  G.track.wishes++; Save.p.stats.wishes++; unlockAch('wish');
}

function eelZap(e) {
  e.charge = 0; Save.p.stats.zaps++; Sfx.play('zap');
  if (Save.p.stats.zaps >= 100) unlockAch('zap100');
  const targets = G.fish.filter(f => f !== e && !f.dead && d2(f.x, f.y, e.x, e.y) < 230 * 230).sort((a, b) => d2(a.x, a.y, e.x, e.y) - d2(b.x, b.y, e.x, e.y)).slice(0, 5);
  let px = e.x, py = e.y;
  for (const f of targets) {
    bolt(px, py, f.x, f.y); px = f.x; py = f.y;
    if (f.kind === 'jelly') { f.glow = 6; spawnCoin('gold', f.x, f.y); }
    else bonusDrop(f);
  }
  for (const a of G.aliens) {
    if (a.spawnT > 0 || d2(a.x, a.y, e.x, e.y) > 320 * 320) continue;
    bolt(e.x, e.y, a.x, a.y, '#aaf6ff');
    hitAlien(a, a.type === 'voidmaw' ? 120 : 40, e.x, e.y, 'zap');
    a.stunT = Math.max(a.stunT, 1.5);
  }
  burst(e.x, e.y, '#fffd8a', 16, 160);
}

// returns true if handled movement
const FISH_AI = {
  guppy(f, dt, def) {
    if (isPeckish(f)) {
      const food = nearest(G.foods, f.x, f.y);
      if (food) { moveTo(f, food.x, food.y, def.speed * 1.25, dt, 4); if (d2(f.x, f.y, food.x, food.y) < (fishR(f) + 8) ** 2) { food.dead = true; eat(f, food.q); foodEaten(); } return; }
    }
    wander(f, dt, def.speed * 0.45);
  },
  breeder(f, dt, def) {
    FISH_AI.guppy(f, dt, def);
    if (f.stage === 1 && f.hunger < def.hungerAt) {
      f.birthT -= dt * (f.love > 0 ? 2 : 1) * M().breed;
      if (f.birthT <= 0) {
        f.birthT = rand(18, 24);
        if (G.fish.length < MAX_FISH) { spawnFish('guppy', f.x - f.dir * 14, f.y + 6, { stage: 0, hunger: 3 }); Sfx.play('birth'); burst(f.x, f.y, '#ffd0ef', 8, 60); }
      }
    }
  },
  carnivore(f, dt, def) {
    // guard dog: bites nearby aliens
    f.biteCD = (f.biteCD || 0) - dt;
    const a = nearest(G.aliens, f.x, f.y, a => a.spawnT <= 0 && isHittable(a) && a.type !== 'kraken', 170);
    if (a && f.hunger < def.dieAt * 0.8) {
      moveTo(f, a.x, a.y, def.speed * 1.3, dt, 4);
      if (f.biteCD <= 0 && d2(f.x, f.y, a.x, a.y) < (a.r + 28) ** 2) { f.biteCD = 0.7; f.eatT = 0.25; hitAlien(a, 10, f.x, f.y, 'carnivore'); if (Math.random() < 0.3) addText(f.x, f.y - 24, 'CHOMP!', '#c9b8ff', 14); }
      return;
    }
    predator(f, dt, def, g => g.kind === 'guppy' && g.stage === 0 && !g.held);
  },
  ultravore(f, dt, def) { predator(f, dt, def, g => g.kind === 'carnivore' && !g.held); },
  turtle(f, dt, def) { predator(f, dt, def, g => g.kind === 'jelly' && g.stage === 1, true); },
  starcatcher(f, dt, def) {
    if (f.dropping) { f.vy = 120; f.y += f.vy * dt; if (f.y >= FLOOR - 18) { f.y = FLOOR - 18; f.dropping = false; } return true; }
    let tx = null;
    if (isPeckish(f)) {
      const s = nearest(G.coins, f.x, f.y - 14, c => c.type === 'star');
      if (s) {
        tx = s.x;
        if (d2(f.x, f.y, s.x, s.y) < 240 * 240) { const k = Math.min(1, dt * 1.2); s.x += (f.x - s.x) * k; s.y += (f.y - 16 - s.y) * k * 0.7; }
        if (d2(f.x, f.y - 16, s.x, s.y) < 36 * 36) { s.dead = true; eat(f); }
      }
    }
    if (tx == null) { f.wt -= dt; if (f.wt <= 0) { f.wx = rand(40, W - 40); f.wt = rand(2, 5); } tx = f.wx; }
    const dx = tx - f.x; f.vx += (clamp(dx * 3, -def.speed * (isPeckish(f) ? 1.3 : 0.5), def.speed * (isPeckish(f) ? 1.3 : 0.5)) - f.vx) * Math.min(1, dt * 4); f.vy = 0;
    integrate(f, dt, 20, FLOOR - 18);
    return true;
  },
  wrasse(f, dt, def) {
    const leech = nearest(G.leeches, f.x, f.y, l => l.host != null);
    if (leech) {
      moveTo(f, leech.x, leech.y, def.speed * 1.3, dt, 4);
      if (d2(f.x, f.y, leech.x, leech.y) < 22 * 22) { leech.dead = true; eat(f); addText(leech.x, leech.y - 10, 'Plucked!', '#ffd0f0', 14); }
      return;
    }
    // cleaners clean steadily (one pile every ~5s), no poop of their own
    f.cleanCD = (f.cleanCD || 0) - dt;
    const w = f.cleanCD <= 0 && nearest(G.wastes, f.x, f.y);
    if (w) {
      moveTo(f, w.x, w.y - 6, def.speed * 1.35, dt, 5);
      if (d2(f.x, f.y, w.x, w.y) < 26 * 26) {
        w.dead = true; f.hunger = 0; f.eatT = 0.3; f.cleanCD = 4; Sfx.play('eat'); // ~1 wrasse per 5 fish
        f.cleaned = (f.cleaned || 0) + 1;
        if (f.cleaned % 4 === 0) { spawnCoin('silver', f.x, f.y); sparkle(f.x, f.y, '#bfffbf', 4); }
      }
      return;
    }
    if (f.hunger > def.hungerAt) return FISH_AI.guppy(f, dt, def);
    wander(f, dt, def.speed * 0.45, FLOOR - 120, FLOOR - 20);
  },
  puffer(f, dt, def) {
    const a = nearest(G.aliens, f.x, f.y, a => a.spawnT <= 0 && a.type !== 'kraken' && isHittable(a));
    if (a) {
      const d = dist(f.x, f.y, a.x, a.y);
      moveTo(f, a.x, a.y, def.speed * 1.4, dt, 3);
      f.puff = clamp(f.puff + (d < (a.r || 40) + 90 ? dt * 3 : -dt * 2), 0, 1);
      if (f.puff > 0.6 && d < (a.r || 40) + 26) { hitAlien(a, 18 * dt, f.x, f.y, 'puffer'); if (Math.random() < dt * 6) sparkle(f.x, f.y, '#fff6c0', 1); }
      return;
    }
    f.puff = Math.max(0, f.puff - dt * 1.5);
    FISH_AI.guppy(f, dt, def);
  },
  piranha(f, dt, def) {
    f.biteCD = (f.biteCD || 0) - dt;
    const pack = countFish('piranha') >= 3;
    const a = pack ? nearest(G.aliens, f.x, f.y, a => a.spawnT <= 0 && isHittable(a)) : null;
    if (a) {
      const tx = a.x + Math.cos(f.t * 3 + f.id) * (a.r * 0.6), ty = a.y + Math.sin(f.t * 3 + f.id) * (a.r * 0.6);
      moveTo(f, tx, ty, def.speed * 1.4, dt, 5);
      if (f.biteCD <= 0 && d2(f.x, f.y, a.x, a.y) < (a.r + 18) ** 2) { f.biteCD = 0.55; f.eatT = 0.2; hitAlien(a, 5, f.x, f.y, 'piranha'); }
      return;
    }
    const corpse = nearest(G.corpses, f.x, f.y, null, 300);
    if (corpse) { moveTo(f, corpse.x, corpse.y, def.speed * 1.3, dt, 4); if (d2(f.x, f.y, corpse.x, corpse.y) < 20 * 20) { corpse.dead = true; f.hunger *= 0.4; f.eatT = 0.35; spawnCoin('gold', corpse.x, corpse.y); addText(corpse.x, corpse.y - 14, 'Scavenged!', '#ffcf6a', 14); burst(corpse.x, corpse.y, '#c8c8c8', 8, 60); } return; }
    FISH_AI.guppy(f, dt, def);
  },
  seahorse(f, dt, def) {
    const pair = countFish('seahorse') >= 2;
    if (!G.demo && f.hunger < def.hungerAt) {
      f.heartT -= dt * (pair ? 2 : 1);
      if (f.heartT <= 0) { f.heartT = rand(7, 10); G.hearts.push({ x: f.x + f.dir * 14, y: f.y - 14, vy: -14, life: 9, ph: rand(0, 6) }); Sfx.play('heart'); }
    }
    FISH_AI.guppy(f, dt, def);
  },
  eel(f, dt, def) {
    if (!G.demo && f.hunger < def.hungerAt) { f.charge += dt / 10 * M().eelCharge; if (f.charge >= 1) eelZap(f); }
    FISH_AI.guppy(f, dt, def);
  },
  jelly(f, dt, def) {
    f.stingCD -= dt; if (f.glow > 0) f.glow -= dt;
    if (f.stage === 0) { f.growT -= dt; if (f.growT <= 0) f.stage = 1; }
    f.budT -= dt * (G.event && G.event.type === 'plankton' ? 3 : 1);
    if (f.budT <= 0 && !G.demo) { f.budT = rand(25, 35); if (countFish('jelly') < 10 && f.stage === 1 && G.fish.length < MAX_FISH) { spawnFish('jelly', f.x + rand(-20, 20), f.y + 10, { stage: 0 }); sparkle(f.x, f.y, '#ffb3e6', 6); } }
    if (f.stingCD <= 0) {
      const g = nearest(G.fish, f.x, f.y + 10, g => g.kind === 'guppy' && g.stage <= 1, 24);
      if (g) { g.hunger += 5; f.stingCD = 3; bolt(f.x, f.y + 8, g.x, g.y, '#ff9ae0'); addText(g.x, g.y - 12, 'Stung!', '#ff9ae0', 13); }
    }
    f.wt -= dt;
    if (f.wt <= 0) { f.wx = clamp(f.x + rand(-200, 200), 40, W - 40); f.wy = rand(SURFACE + 40, FLOOR - 60); f.wt = rand(4, 8); }
    const pulse = Math.max(0, Math.sin(f.t * 3)) * 1.2;
    moveTo(f, f.wx, f.wy, def.speed * (0.4 + pulse), dt, 1);
  },
  koi(f, dt, def) { FISH_AI.guppy(f, dt, def); },
  angler(f, dt, def) {
    FISH_AI.guppy(f, dt, def);
    const [lx, ly] = lurePos(f);
    for (const c of G.coins) {
      if (c.dead || c.type === 'shell') continue;
      const d = d2(c.x, c.y, lx, ly);
      if (d < 150 * 150) { const k = Math.min(1, dt * 1.6); c.x += (lx - c.x) * k; c.y += (ly - c.y) * k * 0.5; }
      if (d < 18 * 18) { collectCoin(c, 'angler'); sparkle(lx, ly, '#fffbb0', 4); }
    }
  },
};
function lurePos(f) { return [f.x + f.face * 32, f.y - 30]; }
function predator(f, dt, def, preyFilter, slow) {
  if (f.hunger > def.hungerAt * 0.75) {
    const prey = nearest(G.fish, f.x, f.y, g => g !== f && preyFilter(g));
    if (prey) {
      moveTo(f, prey.x, prey.y, def.speed * (slow ? 1 : 1.25), dt, 4);
      if (d2(f.x + f.dir * fishR(f) * 0.5, f.y, prey.x, prey.y) < (fishR(f) * 0.6 + fishR(prey)) ** 2) {
        if (prey.kind === 'jelly') { prey.stage = 0; prey.growT = 20; addText(prey.x, prey.y - 16, 'Nibble!', '#ffb3e6', 14); } // jelly survives and regrows
        else { killFish(prey, 'food'); if (f.kind === 'carnivore') spawnCoin('diamond', f.x, f.y + 8); }
        eat(f); Sfx.play('chomp');
      }
      return;
    }
  }
  wander(f, dt, def.speed * 0.4);
}
function foodEaten() { if (G.bounty && G.bounty.type === 'nowaste') G.bounty.prog++; }

function updateFish(f, dt) {
  const def = FISH[f.kind];
  f.t += dt; if (f.eatT > 0) f.eatT -= dt; if (f.love > 0) f.love -= dt;
  if (f.held) { // held by kraken tentacle
    const a = G.aliens.find(a => a.id === f.held && !a.dead);
    const tn = a && a.tentacles && a.tentacles.find(t => t.held === f.id);
    if (!tn) f.held = null; else { const pts = tentaclePoints(tn, a.t); const tip = pts[pts.length - 1]; f.x = tip[0]; f.y = tip[1]; return; }
  }
  if (def.diet !== 'none' && !G.demo) {
    f.hunger += dt * hungerMult() * (f.leeched ? 2.5 : 1);
    if (f.hunger >= def.dieAt && !tryNurse(f)) { killFish(f, 'starve'); return; }
  }
  // fleeing a nearby alien (small fish only)
  const handled = (FISH_AI[f.kind] || FISH_AI.guppy)(f, dt, def);
  if (!handled) {
    if (G.aliens.length && f.kind !== 'puffer' && f.kind !== 'piranha' && f.kind !== 'turtle') {
      const a = nearest(G.aliens, f.x, f.y, a => a.spawnT <= 0 && !ALIENS[a.type].floor && a.type !== 'kraken', 140);
      if (a) { const d = dist(f.x, f.y, a.x, a.y) || 1; f.vx += (f.x - a.x) / d * 160 * dt; f.vy += (f.y - a.y) / d * 160 * dt; }
    }
    integrate(f, dt, fishR(f));
  }
  if (G.demo) return;
  // coin drops
  const dt2 = def.drop || f.kind === 'guppy' ? fishDropType(f) : null;
  if (dt2 && f.hunger < def.hungerAt) {
    f.dropT -= dt * (f.love > 0 ? 2 : 1) * (isSick() ? 0.6 : 1) * M().dropRate;
    if (f.dropT <= 0) {
      let type = dt2;
      if (f.kind === 'guppy' && f.stage >= 2 && Math.random() < (f.stage === 2 ? 0.25 : 0.15)) type = 'star';
      spawnCoin(type, f.x, f.y + 6);
      if (Math.random() < M().coinDouble) spawnCoin(type, f.x + 8, f.y + 2);
      f.dropT = f.kind === 'guppy' ? (f.stage === 3 ? rand(20, 26) : rand(11, 15)) : rand(...def.dropInt);
    }
  }
}

// ================= ALIENS =================
const alienEdible = f => !f.dead && !f.held && f.kind !== 'turtle' && !(f.kind === 'puffer' && f.puff > 0.5);
function isHittable(a) {
  if (a.dead || a.spawnT > 0.5) return false;
  if (a.type === 'phantom') return a.vis > 0.5 || anglerLight();
  if (a.downT > 0) return false;
  return true;
}
const anglerLight = () => G.fish.some(f => f.kind === 'angler' && !f.dead);

function bite(a, f) {
  if (f.shield) {
    f.shield = false; burst(f.x, f.y, '#bff3ff', 16, 140); Sfx.play('pop'); addText(f.x, f.y - 20, 'Bubble saved it!', '#bff3ff', 15);
    const d = dist(a.x, a.y, f.x, f.y) || 1; a.vx = (a.x - f.x) / d * 300; a.vy = (a.y - f.y) / d * 300; a.chewT = 0.6;
    if (combo('stormbubbles')) { bolt(f.x, f.y, a.x, a.y, '#bff3ff'); hitAlien(a, (40 + G.laser * 8) * M().petDmg, f.x, f.y, 'bubble'); a.stunT = Math.max(a.stunT, 1.5); addText(a.x, a.y - 40, 'STORM BUBBLE!', '#9ffcff', 16); }
    return;
  }
  if (f.kind === 'puffer' && f.puff > 0.3) { hitAlien(a, 25, f.x, f.y, 'puffer'); a.chewT = 0.8; addText(a.x, a.y - 40, 'OUCH!', '#fff6c0', 18); return; }
  killFish(f, 'eaten'); a.chewT = ALIENS[a.type].chew || 1; Sfx.play('chomp');
}
function chase(a, dt, spdMult = 1) {
  const def = ALIENS[a.type];
  a.retarget -= dt;
  if (a.chewT > 0 || a.blindT > 0) {
    if (a.blindT > 0) wander(a, dt, def.speed * 0.5, SURFACE + 60, FLOOR - 60);
    else { a.vx *= 1 - dt * 3; a.vy *= 1 - dt * 3; }
  } else {
    let tgt = a.tgt && G.fish.find(f => f.id === a.tgt && alienEdible(f));
    if (!tgt || a.retarget <= 0) { tgt = nearest(G.fish, a.x, a.y, alienEdible); a.tgt = tgt ? tgt.id : null; a.retarget = 1.5; }
    if (tgt) {
      moveTo(a, tgt.x, tgt.y, def.speed * spdMult * M().alienSpeed, dt, 1.6);
      if (d2(a.x, a.y, tgt.x, tgt.y) < (a.r * 0.75 + fishR(tgt)) ** 2) bite(a, tgt);
    } else wander(a, dt, def.speed * 0.5, SURFACE + 60, FLOOR - 60);
  }
  a.x += a.vx * dt; a.y += a.vy * dt;
  a.x = clamp(a.x, a.r, W - a.r); a.y = clamp(a.y, SURFACE + a.r * 0.6, FLOOR - a.r * 0.6);
  if (Math.abs(a.vx) > 6) a.dir = a.vx > 0 ? 1 : -1;
  a.face += (a.dir - a.face) * Math.min(1, dt * 6);
  // puffed puffers hurt on contact
}
const ALIEN_AI = {
  gnasher(a, dt) { a.r = 40; chase(a, dt); },
  brute(a, dt) { a.r = 50; chase(a, dt); },
  twins(a, dt) {
    a.r = 32;
    if (a.downT != null && a.downT > 0) {
      a.downT -= dt; a.vy = -10; a.y += a.vy * dt;
      if (a.downT <= 0) {
        const partner = G.aliens.find(b => b.id === a.partner && !b.dead);
        if (partner && !(partner.downT > 0)) { a.hp = a.maxHp * 0.5; a.downT = null; addText(a.x, a.y - 40, 'REVIVED!', '#ff5a5a', 20); burst(a.x, a.y, '#a6ff9a', 20); }
        else alienDie(a);
      }
      return;
    }
    chase(a, dt);
  },
  gorger(a, dt) {
    a.r = 45 + a.fed;
    for (const fd of G.foods) if (d2(fd.x, fd.y, a.x, a.y) < 170 * 170) { fd.x += (a.x - fd.x) * dt * 2; fd.y += (a.y - fd.y) * dt * 2; }
    const food = nearest(G.foods, a.x, a.y);
    if (food && a.chewT <= 0) {
      moveTo(a, food.x, food.y, 90, dt, 3);
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (d2(a.x, a.y, food.x, food.y) < (a.r * 0.8) ** 2) {
        food.dead = true; a.fed += food.q; a.chewT = 0.15; Sfx.play('eat'); addText(a.x, a.y - a.r - 10, 'GULP', '#ffb3f0', 15);
        if (a.fed >= a.need) { addText(a.x, a.y, 'POP!', '#fff', 30); alienDie(a); }
      }
      a.x = clamp(a.x, a.r, W - a.r); a.y = clamp(a.y, SURFACE + a.r * 0.6, FLOOR - a.r * 0.6);
      return;
    }
    chase(a, dt);
  },
  destroyer(a, dt) {
    a.r = 38;
    a.wt -= dt;
    if (a.wt <= 0 || Math.abs(a.x - a.wx) < 5) { a.wx = rand(80, W - 80); a.wt = rand(3, 6); }
    a.vx += (clamp((a.wx - a.x) * 2, -50, 50) - a.vx) * Math.min(1, dt * 2); a.x += a.vx * dt;
    a.y = FLOOR - 30;
    const tgt = nearest(G.fish, a.x, a.y - 100, alienEdible);
    if (tgt) { const want = Math.atan2(tgt.y - (a.y - 16), tgt.x - a.x); a.aim += (want - a.aim) * Math.min(1, dt * 3); }
    a.fireT -= dt * (a.blindT > 0 ? 0 : 1);
    if (a.fireT <= 0 && tgt) {
      a.fireT = rand(3.2, 4.5);
      const mx = a.x + Math.cos(a.aim) * 42, my = a.y - 16 + Math.sin(a.aim) * 42;
      G.missiles.push({ id: nid(), x: mx, y: my, vx: Math.cos(a.aim) * 80, vy: Math.sin(a.aim) * 80, tgt: tgt.id, life: 9 });
      Sfx.play('laser'); burst(mx, my, '#ffa040', 8, 80);
    }
  },
  psychosquid(a, dt) {
    a.r = 40;
    a.switchT -= dt;
    if (a.switchT <= 0) { a.mode = a.mode === 'blue' ? 'red' : 'blue'; a.switchT = a.mode === 'red' ? 3 : 4.5; burst(a.x, a.y, a.mode === 'red' ? '#ff4a6a' : '#4aa0ff', 16); }
    chase(a, dt);
  },
  leechqueen(a, dt) {
    a.r = 46;
    a.leechT -= dt;
    if (a.leechT <= 0) { a.leechT = 3.8; if (G.leeches.length < 6) { G.leeches.push({ id: nid(), x: a.x + a.dir * 40, y: a.y, vx: 0, vy: 0, host: null, ox: 0, oy: 0, t: 0 }); } }
    chase(a, dt, 0.8);
  },
  phantom(a, dt) {
    a.r = 38;
    a.phase = (a.phase + dt) % 6;
    const p = a.phase;
    a.vis = p < 2.5 ? 1 : p < 3 ? 1 - (p - 2.5) * 2 : p < 5.5 ? 0 : (p - 5.5) * 2;
    chase(a, dt);
  },
  hoarder(a, dt) {
    a.r = 42;
    wander(a, dt, 60, SURFACE + 60, FLOOR - 120);
    a.x += a.vx * dt; a.y += a.vy * dt;
    a.x = clamp(a.x, 60, W - 60); a.y = clamp(a.y, SURFACE + 50, FLOOR - 60);
    if (a.blindT <= 0) {
      const s = Math.min(G.money, Math.min(60, 20 + G.money * 0.01) * dt);
      G.money -= s; a.stolen += s;
      if (Math.random() < dt * 3) addText(a.x, a.y - 50, '-$', '#ff5a5a', 14);
      for (const c of G.coins) {
        if (c.dead || c.type === 'shell') continue;
        const d = d2(c.x, c.y, a.x, a.y);
        if (d < 220 * 220) { c.x += (a.x - c.x) * dt * 1.2; c.y += (a.y - c.y) * dt * 1.2; if (d < 30 * 30) { c.dead = true; a.stolen += COINS[c.type].v; } }
      }
    }
    if (Math.abs(a.vx) > 6) a.dir = a.vx > 0 ? 1 : -1;
    a.face += (a.dir - a.face) * Math.min(1, dt * 6);
  },
  kraken(a, dt) {
    a.r = 70;
    let alive = 0;
    for (const tn of a.tentacles) {
      if (tn.flash > 0) tn.flash -= dt;
      if (tn.state === 'dead') { tn.h = Math.max(0, tn.h - dt * 0.8); continue; }
      alive++;
      const pts = tentaclePoints(tn, a.t), tip = pts[pts.length - 1];
      if (tn.state === 'rise') { tn.h = Math.min(1, tn.h + dt * 0.7); if (tn.h >= 1) tn.state = 'idle'; }
      else if (tn.state === 'idle') {
        const prey = nearest(G.fish, tip[0], tip[1], alienEdible, 260);
        if (prey) tn.reach += (clamp(prey.x - tn.x, -160, 160) - tn.reach) * dt * 0.8;
        if (a.blindT <= 0) {
          const grab = nearest(G.fish, tip[0], tip[1], alienEdible, 34);
          if (grab) { if (grab.shield) bite(a, grab); else { tn.state = 'grab'; tn.held = grab.id; grab.held = a.id; Sfx.play('chomp'); addText(tip[0], tip[1] - 20, 'GRABBED!', '#ff5a8a', 16); } }
        }
      } else if (tn.state === 'grab') {
        tn.h -= dt * 0.3;
        if (!G.fish.some(f => f.id === tn.held && !f.dead)) { tn.held = null; tn.state = 'rise'; }
        else if (tn.h <= 0.12) { const f = G.fish.find(f => f.id === tn.held); f.held = null; killFish(f, 'tentacle'); tn.held = null; tn.state = 'rise'; Sfx.play('chomp'); }
      }
    }
    if (alive === 0) {
      a.headUp = Math.min(1, a.headUp + dt * 0.5);
      a.regrowT -= dt;
      if (a.regrowT <= 0 && a.headUp >= 1) {
        a.regrowT = 13;
        const tn = pick(a.tentacles); tn.state = 'rise'; tn.hp = tn.maxHp * 0.6; tn.h = 0; tn.reach = 0; addText(tn.x, FLOOR - 40, 'REGROWING!', '#ff5a8a', 18);
      }
    } else a.headUp = Math.max(0, a.headUp - dt * 0.6);
    a.y = FLOOR + 60 - a.headUp * 130;
  },
  voidmaw(a, dt) {
    a.r = 55;
    wander(a, dt, 25, 220, 420);
    a.x += a.vx * dt; a.y += a.vy * dt;
    a.x = clamp(a.x, 200, W - 200);
    for (const f of G.fish) {
      if (f.dead || f.held) continue;
      const d = dist(f.x, f.y, a.x, a.y) || 1;
      if (d < 330) {
        const pull = 70 * (1 - d / 330) * (a.blindT > 0 ? 0.3 : 1);
        f.x += (a.x - f.x) / d * pull * dt; f.y += (a.y - f.y) / d * pull * dt;
        if (d < a.r * 0.8) { if (f.kind === 'turtle') { f.x += (f.x - a.x) / d * 60; } else killFish(f, 'void'); }
      }
    }
    for (const c of G.coins) {
      if (c.dead) continue;
      const d = dist(c.x, c.y, a.x, a.y) || 1;
      if (d < 260) { c.x += (a.x - c.x) / d * 60 * dt; c.y += (a.y - c.y) / d * 60 * dt; c.rest = -1; if (d < a.r) { c.dead = true; sparkle(c.x, c.y, '#c87aff', 3); } }
    }
    a.spitT -= dt;
    if (a.spitT <= 0) { a.spitT = 16; if (G.aliens.length < 4) { spawnAlien('gnasher', 0.6, { x: a.x, y: a.y }, { minion: true }); addText(a.x, a.y - 70, 'MINION!', '#c87aff', 18); } }
  },
  overlord(a, dt) {
    a.r = 70;
    a.wt -= dt;
    if (a.wt <= 0) { a.wx = rand(200, W - 200); a.wy = rand(200, 300); a.wt = rand(3, 5); }
    moveTo(a, a.wx, a.wy, 40, dt, 1); a.x += a.vx * dt; a.y += a.vy * dt;
    for (const o of a.orbs) { o.ang += dt * 1.1; if (o.flash > 0) o.flash -= dt; }
    if (!a.orbs.some(o => o.hp > 0)) {
      a.orbRegenT -= dt;
      if (a.orbRegenT <= 0) { for (const o of a.orbs) o.hp = o.maxHp; banner('SHIELDS RESTORED!', '#7affff'); }
    }
    const enraged = a.hp < a.maxHp / 2;
    a.fireT -= dt;
    if (a.fireT <= 0) {
      a.fireT = enraged ? 2.8 : 4.5;
      const tgt = pick(G.fish.filter(alienEdible));
      if (tgt) { G.missiles.push({ id: nid(), x: a.x, y: a.y + 30, vx: 0, vy: 80, tgt: tgt.id, life: 9 }); Sfx.play('laser'); }
    }
    a.summonT -= dt;
    if (a.summonT <= 0) { a.summonT = enraged ? 11 : 16; if (G.aliens.length < 3) spawnAlien('gnasher', 0.6, { x: a.x, y: a.y + 40 }, { minion: true }); }
  },
};
function updateAlien(a, dt) {
  a.t += dt; if (a.flash > 0) a.flash -= dt; if (a.chewT > 0) a.chewT -= dt; if (a.blindT > 0) a.blindT -= dt;
  if (a.spawnT > 0) { a.spawnT -= dt; return; }
  if (a.storm > 0) { a.storm = 0; bolt(a.x, SURFACE, a.x, a.y, '#fffd8a'); bolt(a.x + 20, SURFACE, a.x, a.y, '#ffffff'); hitAlien(a, 70 * M().stormSpawn, a.x, a.y, 'zap'); a.stunT = Math.max(a.stunT, 2); Sfx.play('zap'); addText(a.x, a.y - 50, 'STRUCK!', '#fffd8a', 18); }
  if (a.stunT > 0) {
    a.stunT -= dt; a.vx *= 1 - dt * 4; a.vy *= 1 - dt * 4;
    if (!['kraken', 'destroyer'].includes(a.type)) { a.x = clamp(a.x + a.vx * dt, 40, W - 40); a.y = clamp(a.y + a.vy * dt, SURFACE + 30, FLOOR - 30); }
    return;
  }
  ALIEN_AI[a.type](a, dt);
}

// Which part of an alien is at (x,y)?
function alienHitTest(a, x, y) {
  if (a.dead) return null;
  if (a.type === 'kraken') {
    for (const tn of a.tentacles) {
      if (tn.state === 'dead' || tn.h < 0.2) continue;
      for (const p of tentaclePoints(tn, a.t)) if (d2(x, y, p[0], p[1]) < 26 * 26) return { part: 'tentacle', tn };
    }
    if (a.headUp > 0.8 && d2(x, y, a.x, a.y - 20) < 75 * 75) return { part: 'body' };
    return null;
  }
  if (a.type === 'overlord') {
    for (const o of a.orbs) if (o.hp > 0) { const [ox, oy] = orbPos(a, o); if (d2(x, y, ox, oy) < 24 * 24) return { part: 'orb', orb: o }; }
  }
  if (!isHittable(a)) return null;
  const r = a.type === 'hoarder' ? 50 : a.type === 'destroyer' ? 42 : a.r + 6;
  const cy = a.type === 'destroyer' ? a.y - 10 : a.type === 'psychosquid' ? a.y - 20 : a.y;
  if (d2(x, y, a.x, cy) < r * r) return { part: 'body' };
  return null;
}
const orbPos = (a, o) => [a.x + Math.cos(o.ang) * 115, a.y + Math.sin(o.ang) * 70];

// Non-laser attacks (eels, pets, piranhas) automatically pick a sensible part to hit
function autoHit(a) {
  if (a.orbs) { const o = a.orbs.find(o => o.hp > 0); if (o) return { part: 'orb', orb: o }; }
  if (a.tentacles && a.headUp < 0.8) { const tn = a.tentacles.find(t => t.state !== 'dead' && t.h > 0.3); return tn ? { part: 'tentacle', tn } : null; }
  return { part: 'body' };
}
function hitAlien(a, dmg, x, y, src, hit) {
  if (a.dead || a.spawnT > 0.6) return;
  hit = hit || autoHit(a);
  if (!hit) return;
  if (hit.part === 'tentacle') {
    const tn = hit.tn; tn.hp -= dmg; tn.flash = 0.08;
    if (tn.hp <= 0 && tn.state !== 'dead') {
      tn.state = 'dead'; burst(x, y, '#d2507a', 20, 160); Sfx.play('boom'); addText(x, y - 20, 'TENTACLE DOWN!', '#ffd84a', 18);
      if (tn.held) { const f = G.fish.find(f => f.id === tn.held); if (f) f.held = null; tn.held = null; }
    }
    return;
  }
  if (hit.part === 'orb') {
    const o = hit.orb; o.hp -= dmg; o.flash = 0.08;
    if (o.hp <= 0) { const [ox, oy] = orbPos(a, o); burst(ox, oy, '#7affff', 20, 160); Sfx.play('boom'); if (!a.orbs.some(o => o.hp > 0)) { a.orbRegenT = 14; banner('SHIELDS DOWN! HIT THE BRAIN!', '#7affff'); } }
    return;
  }
  if (a.type === 'overlord' && a.orbs.some(o => o.hp > 0)) { if (src === 'laser' && Math.random() < 0.3) addText(a.x, a.y - 80, 'SHIELDED!', '#7affff', 16); return; }
  if (a.type === 'gorger' && src !== 'eat') { if (src === 'laser') { a.vx += (a.x - x) * 2; a.vy += (a.y - y) * 2; if (Math.random() < 0.3) addText(a.x, a.y - a.r - 20, 'FEED ME!', '#ffb3f0', 16); } return; }
  if (a.type === 'twins' && a.downT > 0) return;
  if (a.type === 'psychosquid' && a.mode === 'red' && src === 'laser') {
    a.hp = Math.min(a.maxHp, a.hp + dmg); addText(x, y - 10, '+' + Math.round(dmg), '#ff5a5a', 16); return;
  }
  a.hp -= dmg; a.flash = 0.08;
  if (src === 'laser' && !ALIENS[a.type].boss && !ALIENS[a.type].floor) {
    const d = dist(a.x, a.y, x, y) || 1;
    a.vx += (a.x - x) / d * 90; a.vy += (a.y - y) / d * 90;
  }
  if (a.hp <= 0) {
    if (a.type === 'twins') {
      const partner = G.aliens.find(b => b.id === a.partner && !b.dead);
      if (partner && !(partner.downT > 0)) { a.downT = 4; a.hp = 0; addText(a.x, a.y - 40, 'DOWN! Kill the other!', '#ffd84a', 16); return; }
      if (partner && partner.downT > 0) alienDie(partner);
    }
    alienDie(a);
  }
}

function alienDie(a) {
  if (a.dead) return;
  a.dead = true;
  const def = ALIENS[a.type];
  Sfx.play('boom'); burst(a.x, a.y, '#ffd84a', 40, 260); burst(a.x, a.y, '#ffffff', 20, 160);
  if (!a.minion) for (const d of def.drop) spawnCoin(d, a.x + rand(-30, 30), a.y + rand(-20, 20));
  for (let i = 0; i < M().killBonus; i++) spawnCoin('diamond', a.x + rand(-30, 30), a.y + rand(-20, 20));
  if (M().killPearl) spawnCoin('pearl', a.x, a.y);
  else spawnCoin('gold', a.x, a.y);
  if (a.type === 'hoarder' && a.stolen > 0) { spawnValue(a.stolen * 1.5, a.x, a.y); addText(a.x, a.y - 40, 'Refund: ' + fmt(a.stolen * 1.5), '#ffe14d', 22); }
  if (a.type === 'leechqueen') for (const l of G.leeches) l.dead = true;
  if (a.type === 'kraken') for (const tn of a.tentacles) if (tn.held) { const f = G.fish.find(f => f.id === tn.held); if (f) f.held = null; }
  if (a.type === 'overlord') for (const b of G.aliens) if (b.minion) alienDie(b);
  if (def.boss) {
    banner(def.name.toUpperCase() + ' DEFEATED!', '#7aff5a', G.endless ? '' : 'The egg shop is open!');
    const L = level();
    if (L && L.boss && L.aliens[L.aliens.length - 1] === a.type) G.bossDefeated = true;
    if (a.type === 'kraken' && G.level === 4) unlockAch('tank1');
    if (a.type === 'leechqueen' && G.level === 9) unlockAch('tank2');
    if (a.type === 'voidmaw' && G.level === 14) unlockAch('tank3');
    if (a.type === 'overlord') unlockAch('tank4');
  }
  Save.p.stats.aliens++;
  unlockAch('firstkill'); if (Save.p.stats.aliens >= 25) unlockAch('kill25');
}

function updateMissile(m, dt) {
  m.life -= dt;
  let tgt = G.fish.find(f => f.id === m.tgt && alienEdible(f));
  if (!tgt) { tgt = nearest(G.fish, m.x, m.y, alienEdible); m.tgt = tgt ? tgt.id : null; }
  if (tgt) {
    const d = dist(m.x, m.y, tgt.x, tgt.y) || 1;
    m.vx += ((tgt.x - m.x) / d * 120 - m.vx) * Math.min(1, dt * 1.5);
    m.vy += ((tgt.y - m.y) / d * 120 - m.vy) * Math.min(1, dt * 1.5);
    if (d < fishR(tgt) + 8) {
      m.dead = true; Sfx.play('boom'); burst(m.x, m.y, '#ffa040', 20, 160);
      if (tgt.shield) { tgt.shield = false; addText(tgt.x, tgt.y - 20, 'Bubble saved it!', '#bff3ff', 15); }
      else if (tgt.kind === 'turtle') addText(tgt.x, tgt.y - 20, 'CLANK!', '#fff', 16);
      else killFish(tgt, 'missile');
    }
  }
  m.x += m.vx * dt; m.y += m.vy * dt;
  if (m.life <= 0 || m.y > FLOOR) { m.dead = true; burst(m.x, m.y, '#aaa', 10, 80); }
}
function updateLeech(l, dt) {
  l.t += dt;
  if (l.host != null) {
    const h = G.fish.find(f => f.id === l.host && !f.dead);
    if (!h) { l.host = null; }
    else { l.x = h.x + l.ox; l.y = h.y + l.oy; h.leeched = true; return; }
  }
  const prey = nearest(G.fish, l.x, l.y, f => !f.dead && f.kind !== 'turtle' && f.kind !== 'jelly');
  if (prey) {
    const d = dist(l.x, l.y, prey.x, prey.y) || 1;
    l.x += (prey.x - l.x) / d * 75 * dt; l.y += (prey.y - l.y) / d * 75 * dt; l.dir = prey.x > l.x ? 1 : -1;
    if (d < fishR(prey)) {
      if (prey.shield) { prey.shield = false; l.dead = true; burst(l.x, l.y, '#bff3ff', 10); return; }
      l.host = prey.id; l.ox = rand(-0.6, 0.6) * fishR(prey); l.oy = rand(-0.5, 0.5) * fishR(prey); Sfx.play('eat');
    }
  }
}

// ================= PETS =================
// ps = how fast a pet acts (level + boons), pd = how hard it hits
const petSpeed = p => M().petSpeed * (1 + 0.4 * ((p.lv || 1) - 1));
const petDmg = p => M().petDmg * (1 + 0.5 * ((p.lv || 1) - 1));
function shieldFish(f, from) { if (!f) return; f.shield = true; if (from) bolt(from.x, from.y, f.x, f.y, '#bff3ff'); Sfx.play('pop'); }
function bestUnshielded() {
  return G.fish.filter(f => !f.dead && !f.shield && f.kind !== 'jelly' && f.kind !== 'turtle')
    .sort((a, b) => (FISH[b.kind].cost + b.stage * 100) - (FISH[a.kind].cost + a.stage * 100))[0];
}
const PET_AI = {
  sluggo(p, dt) {
    floorCollector(p, dt, 55 * (1 + 0.25 * ((p.lv || 1) - 1)), combo('golddigger') ? 2 : 1);
    if (combo('treasurehunt')) { p.findT = (p.findT ?? 6) - dt * petSpeed(p); if (p.findT <= 0) { p.findT = 6; spawnCoin('gold', p.x, p.y - 20); sparkle(p.x, p.y, '#7affb0', 4); } }
  },
  crabby(p, dt) {
    p.cd -= dt * petSpeed(p);
    if (p.jump > 0) {
      p.vy += 900 * dt; p.y += p.vy * dt; p.x = clamp(p.x + p.vx * dt, 20, W - 20);
      for (const a of G.aliens) {
        if (!p.hitDone && isHittable(a) && d2(p.x, p.y, a.x, a.y) < (a.r + 24) ** 2) {
          const inked = a.blindT > 0 && combo('inktrap');
          hitAlien(a, (20 + G.laser * 4) * petDmg(p) * (inked ? 3 : 1), p.x, p.y, 'crab'); p.hitDone = true;
          addText(p.x, p.y - 20, inked ? 'INK TRAP!' : 'PINCH!', '#ff8a6a', 18);
          if (combo('shockandawe')) a.stunT = Math.max(a.stunT, 1.5);
          if (combo('pearldiver')) spawnCoin('pearl', a.x, a.y);
        }
      }
      if (p.y >= FLOOR - 10) { p.y = FLOOR - 10; p.jump = 0; p.vy = 0; p.vx = 0; }
      return;
    }
    const trap = combo('inktrap') && nearest(G.aliens, p.x, p.y, a => isHittable(a) && a.blindT > 0 && a.type !== 'kraken');
    const a = trap || nearest(G.aliens, p.x, p.y, a => isHittable(a) && a.y > FLOOR - 260 && a.type !== 'kraken');
    if (a && p.cd <= 0 && (trap || Math.abs(a.x - p.x) < 180)) {
      p.jump = 1; p.hitDone = false; p.cd = 2;
      p.vy = -Math.sqrt(2 * 900 * Math.max(40, FLOOR - 10 - a.y + 10));
      const tUp = -p.vy / 900; p.vx = (a.x - p.x) / tUp;
      Sfx.play('pop'); return;
    }
    floorCollector(p, dt, 40 * (1 + 0.25 * ((p.lv || 1) - 1)));
  },
  scrub(p, dt) {
    const w = nearest(G.wastes, p.x, p.y, w => w.rest >= 0);
    p.y = FLOOR - 8;
    const spd = 60 * petSpeed(p);
    if (w) {
      p.vx += (clamp((w.x - p.x) * 3, -spd, spd) - p.vx) * Math.min(1, dt * 4);
      if (Math.abs(w.x - p.x) < 14) {
        w.dead = true; sparkle(w.x, w.y, '#bfffbf', 3);
        p.eaten = (p.eaten || 0) + 1;
        if (combo('bubblebath') && p.eaten % 3 === 0) { const nb = G.pets.find(q => q.type === 'nimbus'); shieldFish(bestUnshielded(), nb); addText(p.x, p.y - 20, 'Bubble Bath!', '#bff3ff', 14); }
      }
    } else { p.wt -= dt; if (p.wt <= 0) { p.wx = rand(40, W - 40); p.wt = rand(3, 6); } p.vx += (clamp((p.wx - p.x), -30, 30) - p.vx) * Math.min(1, dt * 2); }
    p.x = clamp(p.x + p.vx * dt, 20, W - 20); if (Math.abs(p.vx) > 4) p.dir = p.vx > 0 ? 1 : -1;
    p.face += (p.dir - p.face) * Math.min(1, dt * 7);
  },
  chef(p, dt) {
    wander(p, dt, 50, SURFACE + 20, SURFACE + 110); integrate(p, dt);
    p.timer -= dt * petSpeed(p);
    if (p.timer <= 0) {
      p.timer = 2.5;
      if (G.foods.length === 0 && G.fish.some(f => FISH[f.kind].diet === 'pellet' && f.hunger > FISH[f.kind].hungerAt * 0.6)) {
        G.foods.push({ id: nid(), x: p.x, y: p.y + 10, q: Math.min(4, G.foodQ + (combo('hotmeal') ? 1 : 0)), vy: 50, rest: -1, bonus: true }); Sfx.play('drop');
      }
    }
  },
  clam(p, dt) {
    p.timer -= dt * petSpeed(p) * (combo('pearldiver') ? 2 : 1); p.open = Math.max(0, p.open - dt * 0.4);
    if (p.timer <= 0) {
      p.timer = 40; p.open = 1;
      spawnCoin(combo('royaltreasury') && Math.random() < 0.34 ? 'emerald' : 'pearl', p.x, p.y - 10, { rest: 0, vy: 0 }); Sfx.play('pop');
    }
  },
  siren(p, dt) {
    wander(p, dt, 40); integrate(p, dt); p.timer -= dt * petSpeed(p); if (p.singT > 0) p.singT -= dt;
    if (p.timer <= 0) {
      p.timer = 30; p.singT = 2.5; Sfx.play('sing');
      let n = 0; for (const f of G.fish) if (!f.dead && bonusDrop(f)) n++;
      if (n) addText(p.x, p.y - 30, 'La la la~', '#aaffee', 18);
      if (combo('dinnershow')) { for (let i = 0; i < 5; i++) G.foods.push({ id: nid(), x: rand(80, W - 80), y: SURFACE + rand(5, 40), q: 4, vy: 50, rest: -1, bonus: true }); addText(W / 2, SURFACE + 60, 'DINNER IS SERVED!', '#ffcf6a', 20); }
      if (combo('lullaby')) { let k = 0; for (const f of G.fish) if (f.kind === 'guppy' && f.stage === 0) { f.stage = 1; f.growth = Math.max(f.growth, 3); k++; } if (k) addText(p.x, p.y - 50, 'Lullaby! ' + k + ' grew up', '#ffb3e6', 15); }
    }
  },
  nurse(p, dt) { wander(p, dt, 45); integrate(p, dt); p.cd -= dt * petSpeed(p) * (combo('fieldhospital') ? 2 : 1); },
  inky(p, dt) {
    wander(p, dt, 50); integrate(p, dt);
    if (G.aliens.length) {
      p.timer -= dt * petSpeed(p) * (combo('inkstorm') ? 2 : 1);
      if (p.timer <= 0) {
        p.timer = 12;
        const a = nearest(G.aliens, p.x, p.y, a => a.spawnT <= 0 && !a.dead && !(a.blindT > 0));
        if (a) { a.blindT = 3; for (let i = 0; i < 26; i++) FX.parts.push({ x: a.x + rand(-30, 30), y: a.y + rand(-30, 30), vx: rand(-30, 30), vy: rand(-30, 30), life: rand(1, 2.5), col: '#1a1028', r: rand(8, 18), ink: true }); addText(a.x, a.y - 50, 'INKED!', '#c8a0ff', 18); Sfx.play('splash'); }
      }
    } else p.timer = Math.max(p.timer, 2);
  },
  midas(p, dt) { wander(p, dt, 45); integrate(p, dt); },
  momma(p, dt) {
    wander(p, dt, 30); integrate(p, dt); p.timer -= dt * petSpeed(p) * M().breed * (combo('hotmeal') ? 2 : 1);
    if (p.timer <= 0) {
      p.timer = 40;
      if (G.fish.length < MAX_FISH) { const b = spawnFish('guppy', p.x, p.y + 10, { stage: 0, hunger: 3 }); if (combo('fieldhospital')) b.shield = true; Sfx.play('birth'); sparkle(p.x, p.y, '#ffc0e0', 8); }
    }
  },
  remy(p, dt) {
    const ty = clamp(Input.y, SURFACE + 20, FLOOR - 15);
    moveTo(p, Input.x, ty, 150 * petSpeed(p), dt, 3); integrate(p, dt);
    const r = 26 + 6 * ((p.lv || 1) - 1);
    for (const c of G.coins) if (!c.dead && d2(c.x, c.y, p.x, p.y) < r * r) {
      if (combo('stickyfingers') && COIN_UP[c.type] && Math.random() < 0.35) { c.type = COIN_UP[c.type]; sparkle(c.x, c.y, '#ffe14d', 6); }
      collectCoin(c, 'remy');
    }
    if (combo('treasurehunt')) { p.findT = (p.findT ?? 6) - dt * petSpeed(p); if (p.findT <= 0) { p.findT = 6; spawnCoin('gold', p.x, p.y); } }
  },
  zippy(p, dt) {
    wander(p, dt, 50); integrate(p, dt);
    p.timer -= dt * petSpeed(p);
    if (p.timer <= 0) {
      const a = nearest(G.aliens, p.x, p.y, isHittable);
      p.timer = a && a.stunT > 0 && combo('shockandawe') ? 0.3 : 0.6;
      if (a) {
        const hit = autoHit(a);
        const [tx, ty] = hit && hit.part === 'orb' ? orbPos(a, hit.orb) : [a.x, a.y];
        const inked = a.blindT > 0 && combo('inkstorm');
        bolt(p.x, p.y, tx, ty, inked ? '#c8a0ff' : '#9ffcff');
        hitAlien(a, (2 + G.laser * 2) * petDmg(p) * (inked ? 3 : 1), p.x, p.y, 'zippy', hit);
      }
    }
  },
  nimbus(p, dt) {
    wander(p, dt, 40); integrate(p, dt); p.timer -= dt * petSpeed(p);
    if (p.timer <= 0) { p.timer = 22; shieldFish(bestUnshielded(), p); }
  },
};
function floorCollector(p, dt, spd, bonus = 1) {
  p.y = FLOOR - 10;
  const c = nearest(G.coins, p.x, p.y, c => c.rest >= 0 || c.y > FLOOR - 30);
  if (c) { p.vx += (clamp((c.x - p.x) * 3, -spd, spd) - p.vx) * Math.min(1, dt * 4); if (Math.abs(c.x - p.x) < 16 && c.y > FLOOR - 30) collectCoin(c, 'pet', bonus); }
  else { p.wt -= dt; if (p.wt <= 0) { p.wx = rand(40, W - 40); p.wt = rand(3, 6); } p.vx += (clamp(p.wx - p.x, -spd * 0.4, spd * 0.4) - p.vx) * Math.min(1, dt * 2); }
  p.x = clamp(p.x + p.vx * dt, 20, W - 20); if (Math.abs(p.vx) > 4) p.dir = p.vx > 0 ? 1 : -1;
  p.face += (p.dir - p.face) * Math.min(1, dt * 7);
}

// ================= WAVES / EVENTS / BOUNTIES =================
function updateWaves(dt) {
  if (G.aliens.length > 0) return;
  const L = level();
  if (L && !L.aliens.length) return;
  G.alienT -= dt;
  if (G.alienT <= 5 && !G.warned) {
    G.warned = true; G.portal = { x: rand(160, W - 160), y: rand(190, 330) };
    banner('ALIENS APPROACHING!', '#ff5a5a'); Sfx.play('alarm');
  }
  if (G.alienT <= 0) spawnWave();
}
function spawnWave() {
  G.warned = false;
  let types, hpMult;
  if (G.endless) {
    G.wave++;
    const n = G.wave;
    const pool = ['gnasher', 'gnasher', 'brute', 'gorger', 'destroyer', 'twins', 'psychosquid', 'phantom', 'hoarder'].slice(0, Math.min(9, 3 + n));
    if (n % 5 === 0) types = [pick(n >= 15 ? ['kraken', 'leechqueen', 'voidmaw', 'overlord'] : ['kraken', 'leechqueen', 'voidmaw'])];
    else { types = []; const cnt = 1 + Math.floor(n / 4); for (let i = 0; i < cnt; i++) types.push(pick(pool)); }
    hpMult = 1 + n * 0.12;
    banner('WAVE ' + n, '#ff8a5a');
    if (n >= 10) unlockAch('endless10');
    if (n % 3 === 1) G.theme = TANKS[Math.floor((n - 1) / 3) % 4].theme;
  } else {
    const L = level(), list = L.aliens;
    let idx = G.waveIdx;
    let entry = list[idx % list.length];
    if (L.boss && G.bossDefeated && entry === list[list.length - 1]) { G.waveIdx++; entry = list[G.waveIdx % list.length]; }
    types = entry.split('+');
    hpMult = 1 + G.diff * 0.03 + Math.floor(G.waveIdx / list.length) * 0.15;
    G.waveIdx++;
  }
  if (!G.portal) G.portal = { x: rand(160, W - 160), y: rand(190, 330) };
  types.forEach((t, i) => {
    const at = { x: clamp(G.portal.x + i * 120 - (types.length - 1) * 60, 100, W - 100), y: G.portal.y };
    if (t === 'twins') {
      const a = spawnAlien('twins', hpMult, at, { twin: 0 }), b = spawnAlien('twins', hpMult, { x: at.x + 70, y: at.y + 30 }, { twin: 1 });
      a.partner = b.id; b.partner = a.id; 
    } else spawnAlien(t, hpMult, at);
    if (ALIENS[t].boss) banner(ALIENS[t].name.toUpperCase(), '#ff5a5a', ALIENS[t].desc.replace('BOSS. ', '').replace('FINAL BOSS. ', ''));
  });
  G.waveLosses = 0;
  if (!G.bounty && G.bountiesOn && Math.random() < 0.5 && G.fish.length >= 3) startBounty('protect');
  else if (!G.endless && types.length === 1 && !ALIENS[types[0]].boss) say(ALIENS[types[0]].name + '! ' + ALIENS[types[0]].desc, 6);
}
function onWaveCleared() {
  const n = G.endless ? G.wave : 0;
  G.alienT = (G.endless ? Math.max(35, 75 - n * 3) : rand(95, 130)) / M().alienFreq;
  if (G.bounty && G.bounty.type === 'protect') completeBounty();
  G.portal = null;
}

function updateEvents(dt) {
  if (!G.eventsOn) return;
  const e = G.event;
  if (e) {
    e.t -= dt; e.tick = (e.tick || 0) - dt;
    if (e.type === 'meteor' && e.tick <= 0) { e.tick = 0.45; spawnCoin('star', rand(40, W - 40), SURFACE + 2, { vy: 140 }); }
    if (e.type === 'bubbles' && e.tick <= 0) { e.tick = 0.35; FX.cbubbles.push({ x: rand(40, W - 40), y: FLOOR, r: rand(14, 22), vy: rand(-70, -40), ph: rand(0, 6), val: randi(2, 6) * 5 }); }
    if (e.t <= 0) { G.event = null; G.treasure = null; }
    return;
  }
  G.eventT -= dt;
  if (G.eventT <= 0 && G.aliens.length === 0 && !G.warned) {
    G.eventT = rand(70, 110);
    const pool = Object.keys(EVENTS).filter(k => EVENTS[k].tank <= G.maxEventTank);
    const type = pick(pool), ev = EVENTS[type];
    G.event = { type, t: ev.dur };
    banner(ev.name, ev.col, ev.desc); Sfx.play('event');
    if (type === 'treasure') G.treasure = { x: -40, y: rand(200, 420), clicks: 12, t: 0 };
    if (type === 'frenzy') for (const f of G.fish) f.hunger = Math.max(f.hunger, FISH[f.kind].hungerAt * 0.8 || 0);
  }
}

function startBounty(force) {
  const L = level();
  const fishKinds = G.slots.filter(s => FISH[s]);
  const reward = Math.round((G.endless ? 300 + G.wave * 120 : 250 + G.diff * 70) * M().bounty / 10) * 10;
  let b = null;
  const type = force || pick(BOUNTY_TYPES);
  switch (type) {
    case 'collect': { const n = randi(12, 20); b = { desc: `Collect ${n} coins`, n, t: 45 }; break; }
    case 'earn': { const n = Math.round((800 + (G.endless ? G.wave : G.diff) * 160) / 50) * 50; b = { desc: `Earn ${fmt(n)}`, n, t: 60 }; break; }
    case 'own': { const k = pick(fishKinds); const n = countFish(k) + randi(2, 3); b = { desc: `Own ${n} ${FISH[k].name}s`, n, k, t: 60 }; break; }
    case 'nowaste': b = { desc: 'Feed 8 food, none may hit the floor', n: 8, t: 60 }; break;
    case 'survive': b = { desc: 'Don\'t lose a fish for 75 seconds', n: 1, t: 75 }; break;
    case 'king': if (!G.fish.some(f => f.kind === 'guppy' && f.stage === 2) || G.fish.some(f => f.kind === 'guppy' && f.stage === 3)) return; b = { desc: 'Grow a King Guppy', n: 1, t: 150 }; break;
    case 'clean': if (!G.waste || grime() < 6) return; b = { desc: 'Clean the tank (waste below 2)', n: 1, t: 50 }; break;
    case 'pop': b = { desc: 'Pop 10 bubbles (click them)', n: 10, t: 30, pop: true }; break;
    case 'protect': b = { desc: 'Beat this attack without losing a fish', n: 1, t: 999 }; break;
  }
  if (!b) return;
  G.bounty = Object.assign(b, { type, prog: 0, reward, max: b.t });
  say('BOUNTY! ' + b.desc + '. Reward: ' + fmt(reward) + ' + 1 Sand Dollar', 6);
  Sfx.play('quest');
}
function updateBounty(dt) {
  if (!G.bountiesOn) return;
  const b = G.bounty;
  if (!b) {
    G.bountyT -= dt;
    if (G.bountyT <= 0) { G.bountyT = rand(35, 55) / Math.min(1.6, M().bounty); startBounty(); }
    return;
  }
  if (b.type !== 'protect') b.t -= dt;
  if (b.pop && Math.random() < dt * 2.5) FX.cbubbles.push({ x: rand(40, W - 40), y: FLOOR, r: rand(16, 22), vy: rand(-60, -40), ph: rand(0, 6), val: 5, bounty: true });
  let done = false;
  switch (b.type) {
    case 'collect': case 'earn': case 'nowaste': case 'pop': done = b.prog >= b.n; break;
    case 'own': b.prog = countFish(b.k); done = b.prog >= b.n; break;
    case 'king': done = G.fish.some(f => f.kind === 'guppy' && f.stage === 3); break;
    case 'clean': b.prog = grime(); done = b.prog < 2; break;
    case 'survive': done = b.t <= 0; break;
  }
  if (done) return completeBounty();
  if (b.t <= 0) failBounty();
}
function completeBounty() {
  const b = G.bounty; if (!b) return;
  G.bounty = null; G.bountyT = rand(35, 55);
  addMoney(b.reward); spawnCoin('shell', W / 2, SURFACE + 20);
  G.track.bounties++; Save.p.stats.bounties++;
  banner('BOUNTY COMPLETE!', '#7aff5a', '+' + fmt(b.reward) + ' and a Sand Dollar');
  say('Nice work! Grab that sand dollar before it sinks away!', 4);
  Sfx.play('quest');
  if (Save.p.stats.bounties >= 10) unlockAch('bounty10');
}
function failBounty() {
  const b = G.bounty; if (!b) return;
  G.bounty = null; G.bountyT = rand(35, 55);
  say('Bounty failed: ' + b.desc + '. Better luck next time.', 4);
  Sfx.play('nope');
}

// ================= SHOP (HUD SLOTS) =================
function slotInfo(i) {
  const s = G.slots[i];
  if (s == null) return { id: null, label: '', price: null, can: false };
  if (FISH[s]) { const price = Math.round(FISH[s].cost * M().fishCost / 5) * 5; return { id: s, label: FISH[s].name, desc: FISH[s].desc, price, can: G.money >= price && G.fish.length < MAX_FISH }; }
  if (s === 'foodq') {
    if (G.foodQ >= 4) return { id: s, label: 'Food: ' + FOOD_NAMES[4], desc: 'Best food in the sea. Fish grow fastest on this.', price: null, max: true };
    return { id: s, label: 'Upgrade to ' + FOOD_NAMES[G.foodQ + 1], desc: 'Better food makes guppies grow faster. Current: ' + FOOD_NAMES[G.foodQ], price: FOOD_COSTS[G.foodQ], can: G.money >= FOOD_COSTS[G.foodQ] };
  }
  if (s === 'foodn') {
    if (G.foodMax >= FOOD_COUNT_MAX) return { id: s, label: 'Food Count', desc: 'Max food at once reached.', price: null, max: true };
    return { id: s, label: 'More Food (' + G.foodMax + ' → ' + (G.foodMax + 1) + ')', desc: 'Drop more food pellets at the same time. Each drop costs $5.', price: FOOD_COUNT_COST, can: G.money >= FOOD_COUNT_COST };
  }
  if (s === 'laser') {
    if (G.laser >= LASER_MAX) return { id: s, label: 'Laser MAX', desc: 'Your laser is fully upgraded.', price: null, max: true };
    return { id: s, label: 'Laser Lv ' + (G.laser + 1), desc: `Stronger alien zapper. Damage ${laserDmg(G.laser)} → ${laserDmg(G.laser + 1)}`, price: laserCost(G.laser), can: G.money >= laserCost(G.laser) };
  }
  if (s === 'egg') {
    if (G.endless) { const c = Math.round(2500 * Math.pow(1.6, G.shellBuys) / 50) * 50; return { id: s, label: 'Shell Trove', desc: 'Trade cash for 5 Sand Dollars (permanent currency). Price rises each time.', price: c, can: G.money >= c }; }
    const L = level();
    if (L.boss && !G.bossDefeated) return { id: s, label: 'Egg Piece (LOCKED)', desc: 'Defeat this tank\'s boss first!', price: G.eggCost, can: false, locked: true };
    return { id: s, label: `Egg Piece ${G.eggs + 1}/3`, desc: 'Buy all 3 pieces to finish the level and hatch your reward!', price: G.eggCost, can: G.money >= G.eggCost };
  }
}
function buySlot(i) {
  const info = slotInfo(i);
  if (!info || !info.id) return;
  if (info.max) return;
  if (!info.can) {
    Sfx.play('nope');
    if (info.locked) say('The egg is locked! Defeat the boss first.', 3);
    else if (G.fish.length >= MAX_FISH && FISH[info.id]) say('The tank is full!', 3);
    return;
  }
  G.money -= info.price;
  Sfx.play('buy');
  const s = info.id;
  if (FISH[s]) { buyFishArrive(s); trackOwn(); }
  else if (s === 'foodq') { G.foodQ++; banner(FOOD_NAMES[G.foodQ] + '!', '#ffcf6a'); }
  else if (s === 'foodn') G.foodMax++;
  else if (s === 'laser') { G.laser++; banner('LASER LEVEL ' + G.laser, '#7affff'); }
  else if (s === 'egg') {
    if (G.endless) { G.shellBuys++; Save.p.shells += 5; banner('+5 SAND DOLLARS', '#ffe6b0'); Save.write(); }
    else { G.eggs++; burst(eggSlotX(), 40, '#fff6d0', 20, 120); if (G.eggs >= 3) winLevel(); else banner('EGG PIECE ' + G.eggs + '/3', '#fff6d0'); }
  }
}
function trackOwn() {
  const counts = {};
  for (const f of G.fish) if (!f.dead) counts[f.kind] = (counts[f.kind] || 0) + 1;
  for (const k in counts) if ((G.track.maxOwn[k] || 0) < counts[k]) G.track.maxOwn[k] = counts[k];
  if (G.fish.length >= 30) unlockAch('crowd');
  if (counts.breeder && counts.carnivore && counts.ultravore) unlockAch('chain');
}

// ================= ACHIEVEMENTS =================
function unlockAch(id, force) {
  if (Save.p.ach[id] || (G && G.demo && !force)) return;
  const a = ACHIEVEMENTS[id]; if (!a) return;
  Save.p.ach[id] = Date.now(); Save.p.shells += a.shells;
  if (typeof UI !== 'undefined') UI.toast('🏆 ' + a.name, a.desc + ' (+' + a.shells + ' sand dollars)');
  Save.write();
}
function checkAchievements() {
  if (Save.p.stats.money >= 250000) unlockAch('rich');
  if (Save.p.stats.coins >= 1000) unlockAch('coins1000');
  if (Object.keys(PETS).every(k => Save.p.pets.includes(k))) unlockAch('allpets');
}

// ================= MAIN UPDATE =================
function updateGame(dt) {
  if (!G || G.done) return;
  G.time += G.demo ? 0 : dt;
  for (const f of G.fish) f.leeched = false;
  for (const l of G.leeches) if (!l.dead) updateLeech(l, dt);
  for (const f of G.fish) if (!f.dead) updateFish(f, dt);
  if (G.demo) { G.fish = G.fish.filter(f => !f.dead); return; }
  for (const p of G.pets) { p.t += dt; (PET_AI[p.type] || PET_AI.midas)(p, dt); }
  const hadAliens = G.aliens.length > 0;
  for (const a of G.aliens) if (!a.dead) updateAlien(a, dt);
  for (const m of G.missiles) if (!m.dead) updateMissile(m, dt);
  // food
  for (const f of G.foods) {
    if (f.rest < 0) { f.y += f.vy * dt; f.x += Math.sin(f.y * 0.05) * 6 * dt; if (f.y >= FLOOR - 4) { f.y = FLOOR - 4; f.rest = 0; } }
    else { f.rest += dt; if (f.rest > 2) { f.dead = true; if (G.bounty && G.bounty.type === 'nowaste') failBounty(); } }
  }
  // coins
  const magnet = Save.up('magnet');
  for (const c of G.coins) {
    c.t += dt;
    if (c.rest < 0) { c.y += c.vy * dt; if (c.y >= FLOOR - 6) { c.y = FLOOR - 6; c.rest = 0; } }
    else {
      c.rest += dt;
      if (M().autoCollect && c.rest > M().autoCollect) { collectCoin(c, 'vacuum'); sparkle(c.x, c.y, '#7affb0', 3); }
      else if (magnet && c.rest > 2.5 && c.type !== 'shell') collectCoin(c, 'magnet');
      if (c.rest > (COINS[c.type].stay || 9)) { c.dead = true; sparkle(c.x, c.y, '#ffffff', 3); }
    }
  }
  // waste
  let gr = 0;
  for (const w of G.wastes) { if (w.rest < 0) { w.y += w.vy * dt; if (w.y >= FLOOR - 3) { w.y = FLOOR - 3 + rand(-2, 4); w.rest = 0; } } else { gr++; if (M().noWaste && (w.rest += dt) > 3) { w.dead = true; sparkle(w.x, w.y, '#bfffbf', 2); } } }
  if (gr > G.track.maxGrime) G.track.maxGrime = gr;
  // hearts (seahorse love)
  for (const h of G.hearts) {
    h.life -= dt; h.y += h.vy * dt; h.x += Math.sin((h.ph || 0) + h.life * 2) * 12 * dt;
    if (!h.fx) for (const f of G.fish) if (!f.dead && f.kind !== 'seahorse' && d2(f.x, f.y, h.x, h.y) < (fishR(f) + 8) ** 2) { f.love = 10; h.life = 0; sparkle(h.x, h.y, '#ff8ab0', 5); break; }
    if (h.y < SURFACE) h.life = 0;
  }
  // corpses
  for (const c of G.corpses) { c.t += dt; if (c.y < FLOOR - 10) c.y += 25 * dt; if (c.t > 8) c.dead = true; }
  // treasure event
  if (G.treasure) { const tr = G.treasure; tr.t += dt; tr.x += 55 * dt; tr.y += Math.sin(tr.t * 2) * 15 * dt; if (tr.x > W + 50) G.treasure = null; }
  // cleanup
  for (const k of ['fish', 'foods', 'coins', 'aliens', 'missiles', 'leeches', 'wastes', 'corpses']) if (G[k].some(e => e.dead)) G[k] = G[k].filter(e => !e.dead);
  G.hearts = G.hearts.filter(h => h.life > 0);
  if (hadAliens && G.aliens.length === 0) onWaveCleared();

  updateWaves(dt); updateEvents(dt); updateBounty(dt);
  updateBoons(dt);
  if (G.captain) { G.captain.t -= dt; if (G.captain.t <= 0) G.captain = null; }
  if (G.money > G.track.maxMoney) G.track.maxMoney = G.money;
  G.achT -= dt; if (G.achT <= 0) { G.achT = 1; trackOwn(); checkAchievements(); }
  // game over?
  if (G.fish.length === 0 && G.windsLeft > 0) {
    G.windsLeft--; for (let i = 0; i < 4; i++) buyFishArrive('guppy').stage = 1;
    banner('SECOND WIND!', '#ff8aa0', 'Fresh guppies to the rescue');
  }
  if (G.fish.length === 0 && !G.pets.some(p => p.type === 'momma')) {
    const pending = G.coins.reduce((s, c) => s + COINS[c.type].v, 0);
    if (G.money + pending < FISH.guppy.cost) { G.overT += dt; if (G.overT > 2) loseLevel(); } else G.overT = 0;
  } else G.overT = 0;
  // autosave
  G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 4; Save.p.run = G; Save.write(); }
}

// Timed effects from boons/relics
function updateBoons(dt) {
  const m = M();
  if (m.starfall) { G.starT -= dt; if (G.starT <= 0) { G.starT = m.starfall; spawnCoin('star', rand(60, W - 60), SURFACE + 2, { vy: 100 }); } }
  if (m.interest) { G.interestT -= dt; if (G.interestT <= 0) { G.interestT = 30; const v = Math.min(300, Math.round(G.money * m.interest)); if (v > 0) { addMoney(v); addText(W - 90, HUD_H + 60, '+' + fmt(v) + ' interest', '#ffe14d', 15); } } }
  if (m.lovePotion) { G.loveT -= dt; if (G.loveT <= 0) { G.loveT = 25; for (const f of G.fish) f.love = 8; sparkle(W / 2, 300, '#ff8ab0', 20); addText(W / 2, 300, 'LOVE IS IN THE WATER!', '#ff8ab0', 22); Sfx.play('heart'); } }
}

// ================= CLICK HANDLING =================
function tankClick(x, y) {
  if (!G || G.done) return;
  // treasure chest event
  if (G.treasure && d2(x, y, G.treasure.x, G.treasure.y) < 34 * 34) {
    const tr = G.treasure; tr.clicks--; burst(x, y, '#ffd84a', 6, 100); Sfx.play('hit');
    if (tr.clicks <= 0) { spawnValue(500 + (G.endless ? G.wave * 150 : G.diff * 120), tr.x, tr.y); if (Math.random() < 0.5) spawnCoin('shell', tr.x, tr.y); banner('TREASURE!', '#ffd84a'); G.treasure = null; Sfx.play('bigcoin'); }
    return;
  }
  for (const b of FX.cbubbles) if (!b.dead && d2(x, y, b.x, b.y) < (b.r + 6) ** 2) {
    b.dead = true; burst(b.x, b.y, '#dff8ff', 10, 90); Sfx.play('pop');
    const v = Math.round(b.val * coinMult()); addMoney(v); addText(b.x, b.y, '+' + fmt(v), '#bff3ff', 15);
    if (G.bounty && G.bounty.pop && b.bounty) G.bounty.prog++;
    return;
  }
  let best = null, bd = 34 * 34;
  for (const c of G.coins) { const d = d2(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
  if (best) { collectCoin(best, 'click'); return; }
  for (const l of G.leeches) if (d2(x, y, l.x, l.y) < 18 * 18) { l.dead = true; burst(l.x, l.y, '#a3307a', 8, 80); Sfx.play('pop'); addText(l.x, l.y - 10, 'Flick!', '#ffb0e0', 14); return; }
  for (const m of G.missiles) if (d2(x, y, m.x, m.y) < 26 * 26) { m.dead = true; burst(m.x, m.y, '#ffa040', 14, 120); Sfx.play('boom'); return; }
  // aliens
  for (let i = G.aliens.length - 1; i >= 0; i--) {
    const a = G.aliens[i]; if (ALIENS[a.type].feed) continue;
    const hit = alienHitTest(a, x, y);
    if (hit) {
      laserFx(x, y);
      let dmg = laserDmg(G.laser) * M().laser;
      if (Math.random() < M().crit) { dmg *= 3; addText(x, y - 24, 'CRIT!', '#ff5aff', 20); burst(x, y, '#ff9aff', 10, 140); }
      hitAlien(a, dmg, x, y, 'laser', hit); Sfx.play('hit'); return;
    }
  }
  if (G.aliens.some(a => !ALIENS[a.type].feed)) { laserFx(x, y); Sfx.play('laser'); return; }
  if (y < FLOOR - 4) {
    dropFood(x, y);
  }
}
function laserFx(x, y) { FX.rings.push({ x, y, life: 0.25 }); for (let i = 0; i < 6; i++) FX.parts.push({ x, y, vx: rand(-150, 150), vy: rand(-150, 150), life: 0.25, col: '#aaffff', r: 2 }); }

// ================= WIN / LOSE =================
function evalObjective(o) {
  const t = G.track;
  switch (o.t) {
    case 'time': return G.time <= o.n;
    case 'lost': return t.lost <= o.n;
    case 'own': return (t.maxOwn[o.k] || 0) >= o.n;
    case 'bounties': return t.bounties >= o.n;
    case 'noeaten': return t.eaten === 0;
    case 'king': return t.king;
    case 'money': return t.maxMoney >= o.n;
    case 'grime': return t.maxGrime <= o.n;
    case 'wishes': return t.wishes >= o.n;
  }
  return false;
}
function objProgress(o) {
  const t = G.track;
  switch (o.t) {
    case 'time': return fmtTime(G.time) + ' / ' + fmtTime(o.n);
    case 'lost': return t.lost + ' lost';
    case 'own': return (t.maxOwn[o.k] || 0) + '/' + o.n;
    case 'bounties': return t.bounties + '/' + o.n;
    case 'noeaten': return t.eaten ? 'failed' : 'so far so good';
    case 'king': return t.king ? 'done' : '';
    case 'money': return fmt(t.maxMoney) + ' best';
    case 'grime': return 'worst: ' + t.maxGrime;
    case 'wishes': return t.wishes + '/' + o.n;
  }
  return '';
}
function winLevel() {
  if (G.mode === 'expedition') return Exp.stageWon();
  trackOwn();
  G.done = true;
  const p = Save.p, idx = G.level, L = LEVELS[idx];
  const prev = p.levels[idx] || { done: false, obj: [false, false, false], best: null };
  const res = { idx, objs: [], shells: 0, first: !prev.done, reward: L.reward, time: G.time };
  L.obj.forEach((o, i) => {
    const ok = evalObjective(o), newly = ok && !prev.obj[i];
    if (newly) res.shells += 3;
    res.objs.push({ text: OBJ_TEXT(o), ok, newly, was: prev.obj[i] });
    prev.obj[i] = prev.obj[i] || ok;
  });
  if (res.first) {
    res.shells += 5;
    if (L.reward.pet && !p.pets.includes(L.reward.pet)) { p.pets.push(L.reward.pet); if (p.chosenPets.length < Save.petSlots() + (L.reward.petSlot ? 1 : 0)) p.chosenPets.push(L.reward.pet); }
    if (L.reward.shells) res.shells += L.reward.shells;
    if (L.reward.trophy) p.trophy = true;
  }
  prev.done = true; prev.best = prev.best == null ? G.time : Math.min(prev.best, G.time);
  p.levels[idx] = prev;
  p.unlocked = Math.max(p.unlocked, Math.min(LEVELS.length - 1, idx + 1));
  p.shells += res.shells;
  p.stats.perfect = Object.values(p.levels).filter(l => l.obj.every(Boolean)).length;
  if (p.stats.perfect >= 5) unlockAch('perfect5');
  checkAchievements();
  p.run = null; Save.write();
  Sfx.play('win');
  setTimeout(() => UI.showResult(res), 900);
}
function loseLevel() {
  if (G.mode === 'expedition') return Exp.lost();
  G.done = true;
  Save.p.run = null;
  if (G.endless) {
    const e = Save.p.endless; const res = { wave: G.wave, time: G.time, newBest: G.wave > e.bestWave };
    e.bestWave = Math.max(e.bestWave, G.wave); e.bestTime = Math.max(e.bestTime, G.time);
    Save.write(); Sfx.play('lose'); setTimeout(() => UI.showEndlessOver(res), 900); return;
  }
  Save.write(); Sfx.play('lose');
  setTimeout(() => UI.showGameOver(), 900);
}
