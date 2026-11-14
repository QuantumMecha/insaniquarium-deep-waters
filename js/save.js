'use strict';
// ---- Persistent profile (localStorage) ----
const SAVE_KEY = 'insaniquariumDeepWaters_v1';

function newProfile() {
  return {
    v: 1,
    unlocked: 0,            // highest level index you may play
    levels: {},             // idx -> { done, obj:[b,b,b], best }
    shells: 0,
    up: {},                 // shop id -> level
    pets: [],               // unlocked pet ids
    chosenPets: [],
    seenFish: ['guppy'],
    seenAliens: [],
    ach: {},
    trophy: false,
    stats: { coins: 0, money: 0, aliens: 0, bounties: 0, zaps: 0, wishes: 0, perfect: 0 },
    endless: { bestWave: 0, bestTime: 0 },
    relics: [], relicEquip: [], relicClaims: [],
    exp: null,              // Expedition run between stages
    expBest: { depth: 0, wins: 0 },
    settings: { sfx: true, music: true },
    run: null,              // in-progress level snapshot
  };
}

const Save = {
  p: null,
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        this.p = Object.assign(newProfile(), data);
        this.p.stats = Object.assign(newProfile().stats, data.stats || {});
        this.p.settings = Object.assign(newProfile().settings, data.settings || {});
        this.p.endless = Object.assign(newProfile().endless, data.endless || {});
        this.p.expBest = Object.assign(newProfile().expBest, data.expBest || {});
        return;
      }
    } catch (e) { console.warn('Save load failed', e); }
    this.p = newProfile();
  },
  write() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.p, (k, v) => (k[0] === '_' ? undefined : v)));
    } catch (e) { console.warn('Save failed', e); }
  },
  reset() { this.p = newProfile(); this.write(); },
  up(id) { return this.p.up[id] || 0; },
  petSlots() {
    let n = 1;
    if (this.p.levels[2] && this.p.levels[2].done) n++;
    if (this.p.levels[7] && this.p.levels[7].done) n++;
    return Math.max(1, n + this.up('petSlot') + slotBonus([]));
  },
  relicSlots() { return 3 + this.up('relicSlot'); },
  seeFish(k) { if (!this.p.seenFish.includes(k)) this.p.seenFish.push(k); },
  seeAlien(k) { if (!this.p.seenAliens.includes(k)) this.p.seenAliens.push(k); },
};
