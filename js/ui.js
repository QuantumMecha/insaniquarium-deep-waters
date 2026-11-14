'use strict';
// ---- DOM menus layered over the canvas ----
const _iconCache = {};
function iconURL(key, fn, size = 90) {
  if (_iconCache[key]) return _iconCache[key];
  return (_iconCache[key] = renderIcon(fn, size).toDataURL());
}
const FAKE = () => ({ t: 0.6, stage: 1, eatT: 0, puff: 0, charge: 0, birthT: 20, glow: 0, face: 1, open: 0.4, hp: 1, maxHp: 1, fed: 0, need: 20, vis: 1, mode: 'blue', switchT: 5, stolen: 200, orbs: [], chewT: 0, flash: 0, blindT: 0, headUp: 1, singT: 0 });
function fishImg(k, size = 90) {
  return iconURL('f_' + k + size, x => { const s = (ICON_SCALE[k] || 1) * 1.15 * size / 90; x.scale(s, s); if (k === 'eel') x.translate(12, 0); if (k === 'angler') x.translate(-6, 10); if (k === 'ultravore') x.translate(14, 0); ART.fish[k](x, Object.assign(FAKE(), { stage: k === 'guppy' ? 2 : 1 }), 0); }, size);
}
function alienImg(k, size = 100) {
  const sc = { gnasher: 0.95, brute: 0.75, gorger: 0.8, destroyer: 0.95, twins: 1.1, psychosquid: 0.65, leechqueen: 0.7, phantom: 0.9, hoarder: 0.6, kraken: 0.55, voidmaw: 0.55, overlord: 0.48 }[k] || 0.8;
  return iconURL('a_' + k, x => {
    x.scale(sc * size / 100, sc * size / 100);
    if (k === 'kraken') { x.translate(0, 20); ART.alien.krakenHead(x, FAKE()); }
    else { if (k === 'psychosquid') x.translate(0, 10); ART.alien[k](x, FAKE()); }
  }, size);
}
function petImg(k, size = 80) {
  return iconURL('p_' + k, x => { x.scale(size / 70, size / 70); if (k === 'momma') x.translate(0, 6); ART.pet[k](x, FAKE()); }, size);
}

const UI = {
  el: document.getElementById('ui'),
  show(html) { this.el.innerHTML = html; this.el.classList.add('open'); this.el.scrollTop = 0; },
  hide() { this.el.innerHTML = ''; this.el.classList.remove('open'); },
  toast(title, text) {
    const t = document.createElement('div'); t.className = 'toast';
    t.innerHTML = `<b>${title}</b><span>${text}</span>`;
    const box = document.getElementById('toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.classList.add('gone'), 3800); setTimeout(() => t.remove(), 4400);
  },
  confirm(msg, yes) {
    const d = document.createElement('div'); d.className = 'modal';
    d.innerHTML = `<div class="panel small"><p>${msg}</p><div class="row"><button class="btn red" data-y>Yes</button><button class="btn blue" data-n>No</button></div></div>`;
    this.el.appendChild(d); this.el.classList.add('open');
    d.querySelector('[data-y]').onclick = () => { d.remove(); yes(); };
    d.querySelector('[data-n]').onclick = () => { d.remove(); if (!this.el.children.length) this.hide(); };
  },

  // ---------- screens ----------
  title() {
    const p = Save.p, run = p.run;
    const runName = !run ? '' : run.mode === 'expedition' ? `Expedition · ${run.cfg.name}` : run.endless ? `Endless · Wave ${run.wave}` : `Level ${run.level + 1}: ${LEVELS[run.level].name}`;
    const endlessOk = p.levels[4] && p.levels[4].done;
    const expOk = p.levels[2] && p.levels[2].done;
    const claims = pendingRelicClaims().length;
    this.show(`<div class="screen title">
      <div class="logo"><div class="l1">INSANIQUARIUM</div><div class="l2">~ DEEP WATERS ~</div></div>
      <div class="menu">
        ${run ? `<button class="btn gold big" data-a="resume">▶ Continue<small>${runName}</small></button>`
          : p.exp ? `<button class="btn gold big" data-a="expNext">▶ Continue Expedition<small>Tank ${p.exp.tank + 1} · stage ${p.exp.stage + 1}</small></button>` : ''}
        ${claims ? `<button class="btn gold glow" data-a="claim">🏺 Claim your relic!<small>${claims} unclaimed</small></button>` : ''}
        <button class="btn big" data-a="levels">Adventure</button>
        <div class="row">
          <button class="btn red" data-a="expSetup" ${expOk ? '' : 'disabled'}>Expedition<small>${expOk ? 'roguelike runs' : 'beat level 3'}</small></button>
          <button class="btn blue" data-a="endless" ${endlessOk ? '' : 'disabled'}>Endless<small>${endlessOk ? 'best wave ' + p.endless.bestWave : 'beat level 5'}</small></button>
        </div>
        <div class="row">
          <button class="btn purple" data-a="shop">Shell Shop<small>🐚 ${p.shells}</small></button>
          <button class="btn purple" data-a="relics">Relics<small>${p.relicEquip.length}/${Save.relicSlots()} equipped</small></button>
        </div>
        <div class="row small3">
          <button class="btn purple" data-a="pedia">Fishopedia</button>
          <button class="btn purple" data-a="trophies">Trophies<small>${Object.keys(p.ach).length}/${Object.keys(ACHIEVEMENTS).length}</small></button>
          <button class="btn purple" data-a="settings">Settings</button>
        </div>
      </div>
      <div class="foot">${p.trophy ? '🏆 Savior of the Seas · ' : ''}Your progress saves automatically, even mid-level.</div>
    </div>`);
  },
  levels() {
    const p = Save.p;
    let html = '<div class="screen"><div class="panel wide"><h1>Adventure</h1><div class="tanks">';
    TANKS.forEach((tank, ti) => {
      html += `<div class="tank t-${tank.theme}"><h2>Tank ${ti + 1}: ${tank.name}</h2><div class="lvls">`;
      for (let i = ti * 5; i < ti * 5 + 5; i++) {
        const L = LEVELS[i], st = p.levels[i], locked = i > p.unlocked;
        const stars = st ? st.obj.map(o => `<i class="${o ? 'on' : ''}">★</i>`).join('') : '<i>★</i><i>★</i><i>★</i>';
        html += `<button class="lvl ${locked ? 'locked' : ''} ${st && st.done ? 'done' : ''} ${L.boss ? 'boss' : ''}" data-a="pre" data-arg="${i}" ${locked ? 'disabled' : ''}>
          <span class="num">${locked ? '🔒' : i + 1}</span><span class="nm">${L.name}</span><span class="stars">${stars}</span></button>`;
      }
      html += '</div></div>';
    });
    html += '</div><div class="row"><button class="btn blue" data-a="title">Back</button></div></div></div>';
    this.show(html);
  },
  prelevel(idx) {
    const L = LEVELS[idx], p = Save.p, st = p.levels[idx];
    const fishList = ['guppy', ...L.slots];
    const aliens = [...new Set(L.aliens.flatMap(a => a.split('+')))];
    this.show(`<div class="screen"><div class="panel wide">
      <h1>${idx + 1}. ${L.name}</h1>
      <p class="intro">${L.intro}</p>
      <div class="cols">
        <div class="col">
          <h3>Fish in the shop</h3>
          <div class="icons">${fishList.map(k => `<div class="ic" title="${FISH[k].desc}"><img src="${fishImg(k)}"><span>${FISH[k].name}</span></div>`).join('')}</div>
          <h3>Threats</h3>
          <div class="icons">${aliens.length ? aliens.map(k => `<div class="ic ${ALIENS[k].boss ? 'bossic' : ''}" title="${ALIENS[k].desc}"><img src="${alienImg(k)}"><span>${p.seenAliens.includes(k) ? ALIENS[k].name : '???'}</span></div>`).join('') : '<p class="dim">None. Enjoy the calm!</p>'}</div>
        </div>
        <div class="col">
          <h3>Objectives <small>(+3 🐚 each)</small></h3>
          <ul class="objs">${L.obj.map((o, i) => `<li class="${st && st.obj[i] ? 'ok' : ''}">${st && st.obj[i] ? '✔' : '○'} ${OBJ_TEXT(o)}</li>`).join('')}</ul>
          <p class="dim">Egg piece: ${fmt(L.egg)} × 3 · Reward: ${L.reward.pet ? 'new pet ' + PETS[L.reward.pet].name : L.reward.shells + ' sand dollars'}${st && st.best ? ' · Best: ' + fmtTime(st.best) : ''}</p>
          ${this.petPicker()}
          ${relicRow()}
        </div>
      </div>
      <div class="row"><button class="btn big" data-a="start" data-arg="${idx}">Dive In!</button><button class="btn blue" data-a="levels">Back</button></div>
    </div></div>`);
  },
  petPicker() {
    const p = Save.p, slots = Save.petSlots();
    p.chosenPets = p.chosenPets.filter(k => p.pets.includes(k)).slice(0, slots);
    if (!p.pets.length) return '<h3>Pets</h3><p class="dim">Beat levels to unlock helper pets!</p>';
    const chosen = p.chosenPets, have = activeCombos(chosen);
    return `<h3>Pets <small>${chosen.length}/${slots} chosen · hover for combos</small></h3><div class="icons pets">${p.pets.map(k => {
      const sel = chosen.includes(k);
      const adds = !sel && chosen.length < slots && activeCombos([...chosen, k]).some(c => !have.includes(c));
      return `<button class="ic pet ${sel ? 'sel' : ''}" data-a="togglePet" data-arg="${k}" title="${petTitle(k)}"><img src="${petImg(k)}"><span>${PETS[k].name}</span>${tagDots(k)}${adds ? '<em class="cb">COMBO!</em>' : ''}</button>`;
    }).join('')}</div>${synergyBox(chosen)}`;
  },
  endlessSetup() {
    const p = Save.p;
    const avail = Object.keys(FISH).filter(k => k !== 'guppy' && p.seenFish.includes(k));
    p.endlessFish = (p.endlessFish || avail.slice(0, 4)).filter(k => avail.includes(k)).slice(0, 4);
    this.show(`<div class="screen"><div class="panel wide">
      <h1>Endless Mode</h1>
      <p class="intro">Survive as many alien waves as you can. Every 5th wave is a boss. Best: wave ${p.endless.bestWave} (${fmtTime(p.endless.bestTime)}).</p>
      <h3>Pick up to 4 fish for your shop <small>${p.endlessFish.length}/4</small></h3>
      <div class="icons">${avail.map(k => `<button class="ic pet ${p.endlessFish.includes(k) ? 'sel' : ''}" data-a="toggleEF" data-arg="${k}" title="${FISH[k].desc}"><img src="${fishImg(k)}"><span>${FISH[k].name}</span></button>`).join('')}</div>
      ${this.petPicker()}
      <div class="row"><button class="btn big" data-a="startEndless">Start!</button><button class="btn blue" data-a="title">Back</button></div>
    </div></div>`);
  },
  shop() {
    const p = Save.p;
    this.show(`<div class="screen"><div class="panel wide">
      <h1>Shell Shop <span class="shells">🐚 ${p.shells}</span></h1>
      <p class="intro">Sand dollars come from objectives, bounties, bosses and trophies. Upgrades are permanent.</p>
      <div class="shop">${Object.entries(SHOP).map(([id, s]) => {
        const lv = Save.up(id), max = lv >= s.costs.length, cost = s.costs[lv];
        return `<div class="item"><div><b>${s.name}</b><span>${s.desc}</span><div class="pips">${s.costs.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
          <button class="btn ${max ? 'blue' : ''}" data-a="buyUp" data-arg="${id}" ${max || p.shells < cost ? 'disabled' : ''}>${max ? 'MAX' : '🐚 ' + cost}</button></div>`;
      }).join('')}</div>
      <div class="row"><button class="btn blue" data-a="title">Back</button></div>
    </div></div>`);
  },
  pedia(tab = 'fish') {
    const p = Save.p;
    let cards = '';
    if (tab === 'fish') cards = Object.keys(FISH).map(k => p.seenFish.includes(k) ? `<div class="card"><img src="${fishImg(k)}"><b>${FISH[k].name}</b><small>${fmt(FISH[k].cost)}</small><span>${FISH[k].desc}</span></div>` : `<div class="card unk"><b>???</b><span>Not discovered yet.</span></div>`).join('');
    if (tab === 'aliens') cards = Object.keys(ALIENS).map(k => p.seenAliens.includes(k) ? `<div class="card"><img src="${alienImg(k)}"><b>${ALIENS[k].name}</b><span>${ALIENS[k].desc}</span></div>` : `<div class="card unk"><b>???</b><span>Not encountered yet.</span></div>`).join('');
    if (tab === 'pets') cards = Object.keys(PETS).map(k => p.pets.includes(k) ? `<div class="card"><img src="${petImg(k)}"><b>${PETS[k].name}</b><small>${PETS[k].kind}</small><span>${PETS[k].desc}</span></div>` : `<div class="card unk"><b>???</b><span>Unlock by beating levels.</span></div>`).join('');
    if (tab === 'combos') cards = [
      ...Object.values(FORMS).map((f, i) => `<div class="card tip"><b>✦ ${f.name}</b><span>${f.desc}</span><small>${Object.keys(PET_TAGS).filter(k => PET_TAGS[k].includes(Object.keys(FORMS)[i])).map(k => PETS[k].name).join(', ')}</small></div>`),
      ...Object.values(COMBOS).map(c => `<div class="card tip"><b>⚡ ${c.name}</b><small>${c.pets.map(k => PETS[k].name).join(' + ')}</small><span>${c.desc}</span></div>`),
    ].join('');
    if (tab === 'tips') cards = [
      ['Food chain', 'Breeder → baby guppies → Carnivore → Megachomp. Large guppies drop stars → Starcatcher. Jellies → Sea Turtle (nibbles, never kills).'],
      ['Love', 'Seahorse hearts double coin drops and make Breeders breed twice as fast.'],
      ['Electricity', 'Volt Eels zap nearby fish for an instant coin each. Put eels near jellies for gold.'],
      ['Hygiene', 'In later tanks fish poop. Over 6 piles = dirty tank: hungrier fish, slower coins. Wrasses and Scrubby fix this.'],
      ['Defense', 'Puffers puff up and hurt aliens. 3+ Piranhas swarm. Turtles can\'t be eaten. Nimbus bubbles absorb a bite.'],
      ['Pet strategy', 'Pets come in 4 families (coloured dots). Pairs of specific pets make combos; 3 of one family makes a transformation. See the Combos tab.'],
      ['Relics', 'Beat a tank boss to choose a permanent relic. You can equip 3, so build a loadout for the level ahead.'],
      ['Expedition', 'Read the "Up next" line before drafting: take Inky or Zippy against heavy aliens, money boons when the shop is pricey.'],
      ['Shortcuts', 'Number keys 1–9 buy from the shop bar. Esc or P pauses.'],
    ].map(([a, b]) => `<div class="card tip"><b>${a}</b><span>${b}</span></div>`).join('');
    this.show(`<div class="screen"><div class="panel wide"><h1>Fishopedia</h1>
      <div class="tabs">${['fish', 'aliens', 'pets', 'combos', 'tips'].map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-a="pedia" data-arg="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      <div class="cards">${cards}</div>
      <div class="row"><button class="btn blue" data-a="title">Back</button></div></div></div>`);
  },
  trophies() {
    const p = Save.p, s = p.stats;
    this.show(`<div class="screen"><div class="panel wide"><h1>Trophies</h1>
      <div class="stats"><span>Coins: ${s.coins.toLocaleString()}</span><span>Earned: ${fmt(s.money)}</span><span>Aliens: ${s.aliens}</span><span>Bounties: ${s.bounties}</span><span>Zaps: ${s.zaps}</span><span>Wishes: ${s.wishes}</span><span>Endless best: wave ${p.endless.bestWave}</span></div>
      <div class="cards">${Object.entries(ACHIEVEMENTS).map(([id, a]) => `<div class="card ach ${p.ach[id] ? 'got' : ''}"><b>${p.ach[id] ? '🏆' : '🔒'} ${a.name}</b><span>${a.desc}</span><small>+${a.shells} 🐚</small></div>`).join('')}</div>
      <div class="row"><button class="btn blue" data-a="title">Back</button></div></div></div>`);
  },
  settings() {
    const s = Save.p.settings;
    this.show(`<div class="screen"><div class="panel small"><h1>Settings</h1>
      <button class="btn ${s.sfx ? '' : 'red'}" data-a="toggle" data-arg="sfx">Sound effects: ${s.sfx ? 'ON' : 'OFF'}</button>
      <button class="btn ${s.music ? '' : 'red'}" data-a="toggle" data-arg="music">Music: ${s.music ? 'ON' : 'OFF'}</button>
      <button class="btn red" data-a="reset">Erase all progress</button>
      <div class="row"><button class="btn blue" data-a="title">Back</button></div></div></div>`);
  },
  pause() {
    const L = level(), s = Save.p.settings, exp = G.mode === 'expedition';
    const objs = L && L.obj.length ? `<h3>Objectives</h3><ul class="objs">${L.obj.map(o => { const ok = evalObjective(o); return `<li class="${ok ? 'ok' : ''}">${ok ? '✔' : '○'} ${OBJ_TEXT(o)} <small>${objProgress(o)}</small></li>`; }).join('')}</ul>` : `<p>${exp ? L.name : 'Wave ' + G.wave} · ${fmtTime(G.time)}</p>`;
    const types = G.pets.map(p => p.type);
    this.show(`<div class="screen"><div class="panel small"><h1>Paused</h1>${objs}
      ${loadoutHtml(types, G.boons || [], Save.p.relicEquip, G.pets)}
      <button class="btn big" data-a="unpause">Resume</button>
      <div class="row"><button class="btn ${s.sfx ? 'blue' : 'red'}" data-a="ptoggle" data-arg="sfx">SFX ${s.sfx ? 'ON' : 'OFF'}</button><button class="btn ${s.music ? 'blue' : 'red'}" data-a="ptoggle" data-arg="music">Music ${s.music ? 'ON' : 'OFF'}</button></div>
      ${exp ? '' : '<button class="btn purple" data-a="restart">Restart level</button>'}
      <button class="btn gold" data-a="quit">Save &amp; quit to menu</button></div></div>`);
  },
  showResult(res) {
    const L = LEVELS[res.idx], last = res.idx === LEVELS.length - 1;
    const rw = res.first ? (L.reward.pet ? `<div class="reward"><img src="${petImg(L.reward.pet)}"><div><b>New pet: ${PETS[L.reward.pet].name} the ${PETS[L.reward.pet].kind}!</b><span>${PETS[L.reward.pet].desc}</span>${L.reward.petSlot ? '<span class="hl">+1 pet slot!</span>' : ''}</div></div>` : `<div class="reward"><div><b>${L.reward.shells} bonus sand dollars!</b>${L.reward.trophy ? '<span class="hl">🏆 You defeated the Overlord and saved the seas! Endless mode awaits.</span>' : ''}</div></div>`) : '';
    this.show(`<div class="screen"><div class="panel small">
      <h1 class="win">${last ? 'YOU SAVED THE SEAS!' : 'LEVEL COMPLETE!'}</h1>
      <p>${L.name} · ${fmtTime(res.time)}</p>
      <ul class="objs">${res.objs.map(o => `<li class="${o.ok || o.was ? 'ok' : 'no'}">${o.ok || o.was ? '✔' : '✘'} ${o.text} ${o.newly ? '<em>+3 🐚</em>' : ''}</li>`).join('')}</ul>
      ${rw}
      <p class="shells">+${res.shells} 🐚 sand dollars (total ${Save.p.shells})</p>
      <div class="row">${pendingRelicClaims().length ? '<button class="btn gold big glow" data-a="claim">🏺 Claim Relic!</button>' : !last ? `<button class="btn big" data-a="pre" data-arg="${res.idx + 1}">Next Level</button>` : ''}<button class="btn blue" data-a="levels">Levels</button><button class="btn purple" data-a="title">Menu</button></div>
    </div></div>`);
  },
  showGameOver() {
    this.show(`<div class="screen"><div class="panel small"><h1 class="lose">GAME OVER</h1><p>All your fish are gone and you can't afford a new guppy.</p>
      <div class="row"><button class="btn big" data-a="pre" data-arg="${G.level}">Try Again</button><button class="btn blue" data-a="title">Menu</button></div></div></div>`);
  },
  showEndlessOver(res) {
    this.show(`<div class="screen"><div class="panel small"><h1 class="lose">TANK OVERRUN</h1><p>You survived to wave ${res.wave} (${fmtTime(res.time)}).</p>${res.newBest ? '<p class="shells">NEW BEST!</p>' : ''}
      <div class="row"><button class="btn big" data-a="endless">Again</button><button class="btn blue" data-a="title">Menu</button></div></div></div>`);
  },

  relics() {
    const p = Save.p, slots = Save.relicSlots();
    const cards = Object.keys(RELICS).map(id => {
      const own = p.relics.includes(id), eq = p.relicEquip.includes(id);
      return own ? `<button class="card relic ${eq ? 'eq' : ''}" data-a="equipRelic" data-arg="${id}"><i class="ri">${RELICS[id].icon}</i><b>${RELICS[id].name}</b><span>${RELICS[id].desc}</span><small>${eq ? '✔ EQUIPPED' : 'click to equip'}</small></button>`
        : `<div class="card unk"><b>??? Relic</b><span>Beat tank bosses (campaign or Expedition) to find relics.</span></div>`;
    }).join('');
    this.show(`<div class="screen"><div class="panel wide"><h1>Relic Cabinet</h1>
      <p class="intro">Relics are permanent treasures from beaten tank bosses. They work in every mode. Equipped: <b>${p.relicEquip.length}/${slots}</b>. Pick a loadout that fits your strategy!</p>
      <div class="cards">${cards}</div>
      <div class="row"><button class="btn blue" data-a="title">Back</button></div></div></div>`);
  },
  relicDraft(source) {
    const cards = relicDraftCards(source);
    if (!cards) return this.title();
    const sub = source === 'exp' ? 'You conquered the tank! Choose a relic to keep FOREVER.' : `You beat ${TANKS[pendingRelicClaims()[0]].name}! Choose a relic to keep forever.`;
    this.show(`<div class="screen"><div class="panel wide"><h1 class="win">Relic Found!</h1><p class="intro">${sub} Relics work in every mode. You can equip ${Save.relicSlots()} at once.</p>
      <div class="draft">${cards.map((c, i) => c.kind === 'shells'
        ? `<button class="dcard" data-a="pickRelic" data-arg="${source}:${i}"><i class="ri">🐚</i><b>Sand Dollar Stash</b><span>+${c.n} sand dollars (you own every relic!)</span></button>`
        : `<button class="dcard relic" data-a="pickRelic" data-arg="${source}:${i}"><i class="ri">${RELICS[c.id].icon}</i><b>${RELICS[c.id].name}</b><span>${RELICS[c.id].desc}</span><em>PERMANENT</em></button>`).join('')}</div></div></div>`);
  },
  expSetup() {
    const p = Save.p;
    if (p.exp) return Exp.next();
    const pool = p.pets.length ? p.pets : ['sluggo', 'chef', 'zippy'];
    this.show(`<div class="screen"><div class="panel wide"><h1>Expedition</h1>
      <p class="intro">A roguelike dive through all 4 tanks: 3 random stages + a boss in each. After every stage, draft a <b>boon</b> or a <b>pet</b>. Draft a pet you already have to level it up (★★★). Beat a tank boss to win a <b>permanent relic</b>. Lose a stage and the run is over, but sand dollars and relics are yours to keep.</p>
      <h3>Pick your starting pet</h3>
      <div class="icons pets">${pool.map(k => `<button class="ic pet" data-a="expStart" data-arg="${k}" title="${petTitle(k)}"><img src="${petImg(k)}"><span>${PETS[k].name}</span>${tagDots(k)}</button>`).join('')}</div>
      ${relicRow()}
      <p class="dim">Best run: ${p.expBest.depth} stages cleared · Expeditions won: ${p.expBest.wins}</p>
      <div class="row"><button class="btn blue" data-a="title">Back</button></div></div></div>`);
  },
  expMap() {
    const e = Save.p.exp; if (!e) return this.title();
    const c = e.cfg, aliens = [...new Set(c.aliens.flatMap(a => a.split('+')))];
    const map = TANKS.map((t, ti) => `<div class="mrow t-${t.theme}"><span>${t.name}</span>${[0, 1, 2, 3].map(si => {
      const done = ti < e.tank || (ti === e.tank && si < e.stage), cur = ti === e.tank && si === e.stage;
      return `<i class="node ${done ? 'done' : ''} ${cur ? 'cur' : ''} ${si === 3 ? 'boss' : ''}">${done ? '✔' : si === 3 ? '☠' : si + 1}</i>`;
    }).join('')}</div>`).join('');
    this.show(`<div class="screen"><div class="panel wide"><h1>Expedition</h1>
      <div class="cols">
        <div class="col"><div class="map">${map}</div>
          <h3>Next: ${c.name}</h3>
          <div class="icons">${['guppy', ...c.slots].map(k => `<div class="ic sm" title="${FISH[k].desc}"><img src="${fishImg(k)}"><span>${FISH[k].name}</span></div>`).join('')}</div>
          <h3>Threats</h3>
          <div class="icons">${aliens.map(k => `<div class="ic sm ${ALIENS[k].boss ? 'bossic' : ''}" title="${ALIENS[k].desc}"><img src="${alienImg(k)}"><span>${ALIENS[k].name}</span></div>`).join('')}</div>
        </div>
        <div class="col">${loadoutHtml(petTypes(e.pets), e.boons, Save.p.relicEquip, e.pets, expPetSlots(e))}</div>
      </div>
      <div class="row"><button class="btn big" data-a="expDive">Dive In!</button><button class="btn blue" data-a="title">Menu</button><button class="btn red" data-a="expAbandon">Abandon run</button></div></div></div>`);
  },
  expDraft() {
    const e = Save.p.exp, slots = expPetSlots(e), types = petTypes(e.pets);
    const c = e.cfg, aliens = [...new Set(c.aliens.flatMap(a => a.split('+')))];
    this.show(`<div class="screen"><div class="panel wide"><h1>Choose a Reward</h1>
      <p class="dim" style="text-align:center">Pets: ${e.pets.map(p => PETS[p.type].name + ' ' + '★'.repeat(p.lv)).join(', ') || 'none'} (${e.pets.length}/${slots} slots) · Boons: ${e.boons.length}</p>
      <div class="draft">${e.draft.map((d, i) => draftCard(d, i, e, types, slots)).join('')}</div>
      <div class="preview"><b>Up next: ${c.name}</b> · Shop: ${c.slots.map(k => FISH[k].name).join(', ')} · Threats: ${aliens.map(k => ALIENS[k].name).join(', ')}</div>
      <div class="row"><button class="btn blue" data-a="expSkip">Skip (+2 🐚)</button></div></div></div>`);
  },
  expReplace(i) {
    const e = Save.p.exp, c = e.draft[i];
    this.show(`<div class="screen"><div class="panel small"><h1>Pets are full!</h1><p>Release a pet to make room for <b>${PETS[c.id].name}</b>:</p>
      <div class="icons pets" style="justify-content:center">${e.pets.map(p => `<button class="ic pet" data-a="expReplace" data-arg="${i}:${p.type}" title="${petTitle(p.type)}"><img src="${petImg(p.type)}"><span>${PETS[p.type].name} ${'★'.repeat(p.lv)}</span></button>`).join('')}</div>
      <button class="btn blue" data-a="expBackDraft">Never mind</button></div></div>`);
  },
  expOver(e, won) {
    this.show(`<div class="screen"><div class="panel small"><h1 class="${won ? 'win' : 'lose'}">${won ? 'EXPEDITION COMPLETE!' : 'EXPEDITION OVER'}</h1>
      <p>${won ? 'You conquered all four tanks!' : `Your run ended in Tank ${e.tank + 1}, stage ${e.stage + 1}.`}</p>
      <p>Stages cleared: <b>${e.depth}</b> · Best ever: ${Save.p.expBest.depth}</p>
      <p class="shells">+${e.shells} 🐚 sand dollars earned</p>
      ${e.relicsWon.length ? `<p>Relics found: ${e.relicsWon.map(r => RELICS[r].icon + ' ' + RELICS[r].name).join(', ')}</p>` : ''}
      <p class="dim">Boons: ${e.boons.map(b => BOONS[b].icon + ' ' + BOONS[b].name).join(', ') || 'none'}</p>
      <div class="row"><button class="btn big" data-a="expSetup">New Run</button><button class="btn blue" data-a="title">Menu</button></div></div></div>`);
  },
};


// ---------- shared bits for combos / loadouts ----------
function tagDots(k) { return `<span class="tags">${(PET_TAGS[k] || []).map(t => `<i style="background:${TAG_INFO[t].col}" title="${TAG_INFO[t].name}"></i>`).join('')}</span>`; }
function petTitle(k) {
  const partners = Object.values(COMBOS).filter(c => c.pets.includes(k)).map(c => `${c.name} (with ${PETS[c.pets.find(x => x !== k)].name}): ${c.desc}`);
  return `${PETS[k].desc}\nFamily: ${(PET_TAGS[k] || []).map(t => TAG_INFO[t].name).join(' + ')}\nCombos:\n• ${partners.join('\n• ')}`.replace(/"/g, '&quot;');
}
function synergyBox(types) {
  const combos = activeCombos(types), forms = activeForms(types), counts = tagCounts(types);
  const fam = Object.keys(TAG_INFO).map(t => `<span class="fam" style="border-color:${TAG_INFO[t].col}">${TAG_INFO[t].name} ${counts[t] || 0}/3</span>`).join('');
  const list = [...forms.map(f => `<li class="form">✦ <b>${FORMS[f].name}</b> ${FORMS[f].desc}</li>`), ...combos.map(c => `<li>⚡ <b>${COMBOS[c].name}</b> ${COMBOS[c].desc}</li>`)].join('');
  return `<div class="synergy"><div class="fams">${fam}</div>${list ? `<ul>${list}</ul>` : '<p class="dim">No combos yet. Pair the right pets (hover a pet to see its partners), or collect 3 of one family for a transformation.</p>'}</div>`;
}
function relicRow() {
  const eq = Save.p.relicEquip;
  return `<div class="relicrow"><b>Relics:</b> ${eq.length ? eq.map(r => `<span title="${RELICS[r].desc}">${RELICS[r].icon} ${RELICS[r].name}</span>`).join('') : '<span class="dim">none equipped</span>'} <button class="tab" data-a="relics">Change</button></div>`;
}
function loadoutHtml(types, boons, relics, petObjs, slots) {
  const pets = (petObjs || []).map(p => `<div class="ic sm" title="${petTitle(p.type)}"><img src="${petImg(p.type)}"><span>${PETS[p.type].name}${p.lv > 1 ? ' ' + '★'.repeat(p.lv) : ''}</span>${tagDots(p.type)}</div>`).join('');
  return `<h3>Pets ${slots ? `<small>${petObjs.length}/${slots} slots</small>` : ''}</h3><div class="icons">${pets || '<p class="dim">No pets.</p>'}</div>${synergyBox(types)}
    ${boons.length ? `<h3>Boons</h3><div class="chips">${boons.map(b => `<span class="chip ${BOONS[b].curse ? 'curse' : ''}" title="${BOONS[b].desc}">${BOONS[b].icon} ${BOONS[b].name}</span>`).join('')}</div>` : ''}
    ${relics.length ? `<h3>Relics</h3><div class="chips">${relics.map(r => `<span class="chip relicchip" title="${RELICS[r].desc}">${RELICS[r].icon} ${RELICS[r].name}</span>`).join('')}</div>` : ''}`;
}
function draftCard(d, i, e, types, slots) {
  if (d.kind === 'boon') {
    const b = BOONS[d.id];
    return `<button class="dcard ${b.curse ? 'curse' : ''}" data-a="expPick" data-arg="${i}"><i class="ri">${b.icon}</i><b>${b.name}</b><span>${b.desc}</span><em>${b.curse ? 'CURSED BOON' : 'BOON'}${e.boons.includes(d.id) ? ' · stacks' : ''}</em></button>`;
  }
  const own = e.pets.find(p => p.type === d.id);
  const newCombos = own ? [] : activeCombos([...types, d.id]).filter(c => !activeCombos(types).includes(c));
  const newForms = own ? [] : activeForms([...types, d.id]).filter(f => !activeForms(types).includes(f));
  const counts = tagCounts(types);
  const famHint = own ? '' : (PET_TAGS[d.id] || []).map(t => `${TAG_INFO[t].name} ${(counts[t] || 0) + 1}/3`).join(' · ');
  return `<button class="dcard pet" data-a="expPick" data-arg="${i}" title="${petTitle(d.id)}"><img src="${petImg(d.id)}"><b>${PETS[d.id].name}${own ? ' ★' + (own.lv + 1) : ''}</b>
    <span>${own ? `LEVEL UP! Acts 40% faster and hits 50% harder.` : PETS[d.id].desc}</span>
    ${newForms.map(f => `<span class="hl">✦ Transformation: ${FORMS[f].name}!</span>`).join('')}
    ${newCombos.map(c => `<span class="hl">⚡ Combo: ${COMBOS[c].name}!</span>`).join('')}
    <em>${own ? 'PET UPGRADE' : 'NEW PET' + (e.pets.length >= slots ? ' · replaces one' : '')}${famHint ? ' · ' + famHint : ''}</em></button>`;
}

UI.actions = {
  title: () => UI.title(),
  levels: () => { if (App.state !== 'menu') toMenu(true); UI.levels(); },
  pre: i => { if (App.state !== 'menu') toMenu(true); UI.prelevel(+i); },
  start: i => startLevel(+i),
  resume: () => resumeRun(),
  endless: () => { if (App.state !== 'menu') toMenu(true); UI.endlessSetup(); },
  startEndless: () => startLevel('endless'),
  shop: () => UI.shop(),
  pedia: t => UI.pedia(t),
  trophies: () => UI.trophies(),
  settings: () => UI.settings(),
  togglePet: k => {
    const p = Save.p, i = p.chosenPets.indexOf(k);
    if (i >= 0) p.chosenPets.splice(i, 1); else if (p.chosenPets.length < Save.petSlots()) p.chosenPets.push(k); else { Sfx.play('nope'); return; }
    Save.write(); refreshPicker();
  },
  toggleEF: k => {
    const p = Save.p, i = p.endlessFish.indexOf(k);
    if (i >= 0) p.endlessFish.splice(i, 1); else if (p.endlessFish.length < 4) p.endlessFish.push(k); else { Sfx.play('nope'); return; }
    Save.write(); UI.endlessSetup();
  },
  buyUp: id => {
    const s = SHOP[id], lv = Save.up(id), cost = s.costs[lv];
    if (lv >= s.costs.length || Save.p.shells < cost) return;
    Save.p.shells -= cost; Save.p.up[id] = lv + 1; Save.write(); Sfx.play('buy'); UI.shop();
  },
  toggle: k => { Save.p.settings[k] = !Save.p.settings[k]; Save.write(); UI.settings(); },
  ptoggle: k => { Save.p.settings[k] = !Save.p.settings[k]; Save.write(); UI.pause(); },
  reset: () => UI.confirm('Erase ALL progress, pets and sand dollars? This cannot be undone.', () => { Save.reset(); UI.title(); }),
  unpause: () => unpause(),
  restart: () => UI.confirm('Restart this level from scratch?', () => { const lv = G.endless ? 'endless' : G.level; Save.p.run = null; startLevel(lv, true); }),
  quit: () => toMenu(),
  relics: () => { if (App.state !== 'menu') toMenu(true); UI.relics(); },
  equipRelic: id => {
    const eq = Save.p.relicEquip, i = eq.indexOf(id);
    if (i >= 0) eq.splice(i, 1); else if (eq.length < Save.relicSlots()) eq.push(id); else { Sfx.play('nope'); UI.toast('Relic slots full', 'Unequip one first.'); return; }
    Save.write(); UI.relics();
  },
  claim: () => { if (App.state !== 'menu') toMenu(true); UI.relicDraft('campaign'); },
  pickRelic: a => { const [src, i] = a.split(':'); claimRelic(src, +i); },
  expSetup: () => { if (App.state !== 'menu') toMenu(true); UI.expSetup(); },
  expStart: k => Exp.start(k),
  expNext: () => Exp.next(),
  expDive: () => Exp.dive(),
  expPick: i => Exp.pick(+i),
  expReplace: a => { const [i, t] = a.split(':'); Exp.replace(+i, t); },
  expBackDraft: () => UI.expDraft(),
  expSkip: () => Exp.skip(),
  expAbandon: () => UI.confirm('Abandon this Expedition? You keep the sand dollars and relics you already earned.', () => Exp.abandon()),
};
function refreshPicker() {
  const scr = document.querySelector('.screen');
  if (!scr) return;
  const pre = scr.querySelector('[data-a="start"]');
  if (pre) UI.prelevel(+pre.dataset.arg); else UI.endlessSetup();
}
UI.el.addEventListener('click', e => {
  const b = e.target.closest('[data-a]');
  if (!b || b.disabled) return;
  Sfx.init(); Sfx.play('click');
  const fn = UI.actions[b.dataset.a];
  if (fn) fn(b.dataset.arg);
});
