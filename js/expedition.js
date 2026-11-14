'use strict';
// ---- Expedition (roguelike) run flow + relic claiming ----
const Exp = {
  start(startPet) {
    Save.p.exp = { tank: 0, stage: 0, boons: [], pets: startPet ? [{ type: startPet, lv: 1 }] : [], cfg: genStage(0, 0), depth: 0, shells: 0, queue: [], draft: null, relicDraft: null, relicsWon: [] };
    Save.write(); UI.expMap();
  },
  dive() {
    const e = Save.p.exp; if (!e) return;
    clearFx();
    newRun(e.cfg, { pets: e.pets, boons: e.boons });
    App.state = 'play'; App.paused = false;
    Save.p.run = G; Save.write(); UI.hide(); Sfx.init();
  },
  stageWon() {
    const e = Save.p.exp;
    G.done = true; Save.p.run = null;
    const boss = e.cfg.boss, sh = boss ? 6 : 2;
    e.depth++; e.shells += sh; Save.p.shells += sh;
    Save.p.expBest.depth = Math.max(Save.p.expBest.depth, e.depth);
    if (boss) { e.tank++; e.stage = 0; } else e.stage++;
    e.queue = [];
    if (boss) { e.queue.push('relic'); e.relicDraft = genRelicDraft(); }
    if (e.tank >= 4) e.queue.push('victory');
    else { e.cfg = genStage(e.tank, e.stage); e.draft = genDraft(e); e.queue.push('draft'); }
    Save.write(); Sfx.play('win');
    banner(boss ? 'TANK CLEARED!' : 'STAGE CLEARED!', '#7aff5a', '+' + sh + ' sand dollars');
    setTimeout(() => Exp.next(), 1100);
  },
  next() {
    const e = Save.p.exp;
    if (!e) return UI.title();
    if (App.state !== 'menu') toMenu(true);
    const q = e.queue[0];
    if (q === 'relic') UI.relicDraft('exp');
    else if (q === 'draft') UI.expDraft();
    else if (q === 'victory') Exp.victory();
    else UI.expMap();
  },
  pick(i) {
    const e = Save.p.exp, c = e.draft[i];
    if (c.kind === 'boon') { e.boons.push(c.id); if (BOONS[c.id].fx && c.id === 'frenzyheart') e.pets = e.pets.slice(0, expPetSlots(e)); }
    else {
      const own = e.pets.find(p => p.type === c.id);
      if (own) own.lv = Math.min(3, own.lv + 1);
      else if (e.pets.length < expPetSlots(e)) e.pets.push({ type: c.id, lv: 1 });
      else return UI.expReplace(i);
    }
    Exp.done();
  },
  replace(i, oldType) {
    const e = Save.p.exp, c = e.draft[i];
    e.pets = e.pets.filter(p => p.type !== oldType);
    e.pets.push({ type: c.id, lv: 1 });
    Exp.done();
  },
  skip() { const e = Save.p.exp; e.shells += 2; Save.p.shells += 2; Exp.done(); },
  done() { const e = Save.p.exp; if (e.queue.shift() === 'draft') e.draft = null; Save.write(); Exp.next(); },
  lost() {
    const e = Save.p.exp;
    G.done = true; Save.p.run = null; Save.p.exp = null; Save.write(); Sfx.play('lose');
    setTimeout(() => UI.expOver(e, false), 1000);
  },
  victory() {
    const e = Save.p.exp;
    Save.p.expBest.wins++; Save.p.shells += 20; e.shells += 20;
    Save.p.exp = null; Save.write();
    unlockAch('expedition', true);
    UI.expOver(e, true);
  },
  abandon() {
    Save.p.exp = null;
    if (Save.p.run && Save.p.run.mode === 'expedition') Save.p.run = null;
    Save.write(); toMenu();
  },
};

// Relic draft: source 'exp' (after an Expedition boss) or 'campaign' (unclaimed tank clear)
function relicDraftCards(source) {
  if (source === 'exp') return Save.p.exp.relicDraft;
  const t = pendingRelicClaims()[0];
  if (t == null) return null;
  if (!Save.p.relicDraftCache || Save.p.relicDraftCache.tank !== t) { Save.p.relicDraftCache = { tank: t, cards: genRelicDraft() }; Save.write(); }
  return Save.p.relicDraftCache.cards;
}
function claimRelic(source, i) {
  const cards = relicDraftCards(source); if (!cards) return;
  const c = cards[i];
  if (c.kind === 'shells') Save.p.shells += c.n;
  else {
    if (!Save.p.relics.includes(c.id)) Save.p.relics.push(c.id);
    if (Save.p.relicEquip.length < Save.relicSlots()) Save.p.relicEquip.push(c.id);
    if (Save.p.exp && source === 'exp') Save.p.exp.relicsWon.push(c.id);
    if (Save.p.relics.length >= 5) unlockAch('relics5', true);
  }
  Sfx.play('wish');
  if (source === 'exp') { Save.p.exp.relicDraft = null; Exp.done(); }
  else {
    Save.p.relicClaims.push(Save.p.relicDraftCache.tank); Save.p.relicDraftCache = null; Save.write();
    pendingRelicClaims().length ? UI.relicDraft('campaign') : UI.relics();
  }
}
