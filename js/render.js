'use strict';
// ---- Rendering: tank, entities, effects, HUD ----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SLOT_X0 = 8, SLOT_W = 84, SLOT_GAP = 4, SLOT_Y = 8, SLOT_H = 68;
const slotX = i => SLOT_X0 + i * (SLOT_W + SLOT_GAP);
const eggSlotX = () => slotX(8) + SLOT_W / 2;
const MENU_BTN = { x: W - 96, y: HUD_H + 8, w: 88, h: 30 };
const ICON_SCALE = { guppy: 1.15, carnivore: 0.72, breeder: 0.85, starcatcher: 0.85, puffer: 1.1, piranha: 1.1, wrasse: 1.0, seahorse: 1.0, eel: 0.85, jelly: 1.0, turtle: 0.62, koi: 0.75, angler: 0.62, ultravore: 0.42 };
let hoverSlot = -1, hoverMenu = false;
const darkCanvas = document.createElement('canvas'); darkCanvas.width = W; darkCanvas.height = H;
const dctx = darkCanvas.getContext('2d');

function textO(str, x, y, size, col, align = 'center', lw) {
  ctx.font = `900 ${size}px "Trebuchet MS", "Arial Rounded MT Bold", sans-serif`;
  ctx.textAlign = align; ctx.lineJoin = 'round';
  ctx.lineWidth = lw || Math.max(3, size / 5); ctx.strokeStyle = '#10161e'; ctx.strokeText(str, x, y);
  ctx.fillStyle = col; ctx.fillText(str, x, y);
}
function wrapText(str, maxW, size) {
  ctx.font = `700 ${size}px "Trebuchet MS", sans-serif`;
  const words = str.split(' '), lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  return lines;
}

// ---------- transient FX update (runs even in menus) ----------
function updateFx(dt) {
  for (const p of FX.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.grav) p.vy += p.grav * dt; else { p.vx *= 1 - dt * 2; p.vy *= 1 - dt * 2; } }
  FX.parts = FX.parts.filter(p => p.life > 0);
  for (const t of FX.texts) { t.life -= dt; t.y -= 40 * dt; }
  FX.texts = FX.texts.filter(t => t.life > 0);
  for (const b of FX.bolts) b.life -= dt; FX.bolts = FX.bolts.filter(b => b.life > 0);
  for (const r of FX.rings) r.life -= dt; FX.rings = FX.rings.filter(r => r.life > 0);
  for (const b of FX.banners) b.life -= dt; FX.banners = FX.banners.filter(b => b.life > 0);
  if (FX.banners.length > 3) FX.banners.splice(0, FX.banners.length - 3);
  for (const b of FX.cbubbles) { b.y += b.vy * dt; b.x += Math.sin(b.ph + b.y * 0.03) * 20 * dt; if (b.y < SURFACE) b.dead = true; }
  FX.cbubbles = FX.cbubbles.filter(b => !b.dead);
  // ambient bubbles
  if (G && Math.random() < dt * 6) { const bx = G.theme === 'kelp' ? 680 : 380; FX.bubbles.push({ x: bx + rand(-12, 12), y: FLOOR - 10, r: rand(2, 6), vy: rand(-80, -40), ph: rand(0, 6) }); }
  if (G && Math.random() < dt * 2 && G.fish.length) { const f = pick(G.fish); FX.bubbles.push({ x: f.x + f.dir * 15, y: f.y - 4, r: rand(1.5, 3.5), vy: rand(-50, -30), ph: rand(0, 6) }); }
  for (const b of FX.bubbles) { b.y += b.vy * dt; b.x += Math.sin(b.ph + b.y * 0.05) * 15 * dt; }
  FX.bubbles = FX.bubbles.filter(b => b.y > SURFACE);
}

// ---------- main render ----------
function render(t) {
  const theme = G ? G.theme : 'shallows';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(getBackground(theme), 0, 0);
  drawBgAnim(ctx, theme, t);
  if (!G) return;

  // surface shimmer
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.moveTo(0, SURFACE); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, SURFACE - 4 + Math.sin(t * 2 + x * 0.03) * 3); ctx.lineTo(W, HUD_H); ctx.lineTo(0, HUD_H); ctx.fill();

  for (const w of G.wastes) drawWaste(ctx, w);
  const gr = grime();
  if (gr > 3) { ctx.fillStyle = `rgba(90,100,30,${Math.min(0.32, (gr - 3) * 0.025)})`; ctx.fillRect(0, HUD_H, W, H - HUD_H); }
  for (const c of G.corpses) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.globalAlpha = Math.max(0, 1 - c.t / 8) * 0.8; ctx.scale(c.dir, -1);
    ctx.scale(fishScale(c), fishScale(c)); ctx.filter = 'grayscale(1)';
    ART.fish[c.kind](ctx, { t: 0, stage: c.stage, eatT: 0, puff: 0, birthT: 20 }, 0.8);
    ctx.filter = 'none'; ctx.restore();
  }
  for (const f of G.foods) drawFood(ctx, f);
  for (const p of G.pets) if (['sluggo', 'scrub', 'crabby', 'clam'].includes(p.type)) drawPet(p);
  // aliens behind fish? kraken tentacles behind, others in front
  for (const a of G.aliens) if (a.type === 'kraken') drawAlien(a);
  for (const f of G.fish) drawFishE(f);
  for (const p of G.pets) if (!['sluggo', 'scrub', 'crabby', 'clam'].includes(p.type)) drawPet(p);
  for (const h of G.hearts) drawHeart(ctx, h.x, h.y, 1 + Math.sin(t * 6 + (h.ph || 0)) * 0.1, Math.min(1, h.life));
  if (G.warned && G.portal) drawPortal(G.portal, t);
  for (const a of G.aliens) if (a.type !== 'kraken') drawAlien(a);
  for (const m of G.missiles) drawMissile(ctx, m);
  for (const l of G.leeches) { ctx.save(); ctx.translate(l.x, l.y); if ((l.dir || 1) < 0) ctx.scale(-1, 1); ART.alien.leech(ctx, l); ctx.restore(); }
  for (const c of G.coins) {
    const stay = COINS[c.type].stay || 9;
    if (c.rest > stay - 2 && Math.floor(c.rest * 8) % 2) continue;
    ctx.save(); ctx.translate(c.x, c.y); ART.coin[c.type](ctx, c); ctx.restore();
  }
  if (G.treasure) {
    const tr = G.treasure; ctx.save(); ctx.translate(tr.x, tr.y); ctx.rotate(Math.sin(tr.t * 3) * 0.1); ctx.scale(1.5, 1.5); ART.coin.chest(ctx, tr); ctx.restore();
    textO('x' + tr.clicks, tr.x, tr.y - 34, 16, '#ffe14d');
  }
  for (const b of FX.cbubbles) {
    circle(ctx, b.x, b.y, b.r); ctx.fillStyle = b.bounty ? 'rgba(255,240,150,.35)' : 'rgba(200,240,255,.3)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); shine(ctx, b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.3, b.r * 0.15, 0.9);
    textO('$', b.x, b.y + 5, 14, b.bounty ? '#ffe14d' : '#bff3ff', 'center', 3);
  }
  ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.3;
  for (const b of FX.bubbles) { circle(ctx, b.x, b.y, b.r); ctx.stroke(); }
  for (const p of FX.parts) {
    ctx.globalAlpha = Math.min(1, p.life * (p.ink ? 0.6 : 2)); ctx.fillStyle = p.col;
    if (p.star) { star(ctx, p.x, p.y, p.r * 1.6); ctx.fill(); } else { circle(ctx, p.x, p.y, p.r); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (const b of FX.bolts) drawBolt(b);
  for (const r of FX.rings) { ctx.strokeStyle = `rgba(170,255,255,${r.life * 4})`; ctx.lineWidth = 3; circle(ctx, r.x, r.y, 26 - r.life * 60); ctx.stroke(); }

  if (G.event && G.event.type === 'blackout') drawBlackout(t);

  for (const tx of FX.texts) { ctx.globalAlpha = Math.min(1, tx.life / tx.max * 2); textO(tx.text, tx.x, tx.y, tx.size, tx.col); }
  ctx.globalAlpha = 1;

  if (!G.demo) { drawHUD(t); drawPanels(t); }
  for (let i = 0; i < FX.banners.length; i++) {
    const b = FX.banners[i], k = b.life / b.max, s = k > 0.9 ? 1 + (k - 0.9) * 5 : 1;
    ctx.save(); ctx.globalAlpha = Math.min(1, b.life * 1.5); ctx.translate(W / 2, 250 + i * 70); ctx.scale(s, s);
    textO(b.text, 0, 0, 40, b.col, 'center', 7);
    if (b.sub) textO(b.sub, 0, 28, 17, '#fff', 'center', 4);
    ctx.restore();
  }
}

function drawFishE(f) {
  const hv = G.demo ? 0 : hungerVis(f);
  const s = fishScale(f);
  ctx.save(); ctx.translate(f.x, f.y + (f.kind === 'starcatcher' ? 0 : Math.sin(f.t * 2.2) * 1.5));
  if (f.kind === 'jelly' || f.kind === 'starcatcher') ctx.scale(s, s);
  else { const fx = Math.abs(f.face) < 0.15 ? 0.15 * Math.sign(f.face || 1) : f.face; ctx.scale(fx * s, s); }
  // about to starve: pulse red, faster as death gets closer
  const danger = G.demo ? 0 : starveDanger(f);
  if (danger > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 1000 * (6 + danger * 14));
    ctx.filter = `sepia(1) saturate(${4 + pulse * 4}) hue-rotate(-45deg) brightness(${0.9 + pulse * 0.35})`;
  }
  ART.fish[f.kind](ctx, f, hv);
  ctx.filter = 'none';
  ctx.restore();
  if (danger > 0) {
    const r = fishR(f), bob = Math.sin(performance.now() / 120) * 2;
    circle(ctx, f.x, f.y - r - 14 + bob, 8); ctx.fillStyle = '#ff2a2a'; ctx.fill(); outl(ctx, 2);
    textO('!', f.x, f.y - r - 9 + bob, 13, '#fff', 'center', 2);
  }
  if (f.shield) {
    const r = fishR(f) + 10;
    circle(ctx, f.x, f.y, r); ctx.fillStyle = 'rgba(190,240,255,.18)'; ctx.fill(); ctx.strokeStyle = 'rgba(220,250,255,.85)'; ctx.lineWidth = 2; ctx.stroke();
    shine(ctx, f.x - r * 0.4, f.y - r * 0.45, r * 0.3, r * 0.12, 0.8);
  }
  if (f.love > 0) drawHeart(ctx, f.x, f.y - fishR(f) - 10 + Math.sin(f.t * 5) * 2, 0.6, Math.min(1, f.love));
  if (f.kind === 'eel' && !G.demo) {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(f.x - 14, f.y + 16, 28, 4);
    ctx.fillStyle = '#fffd5a'; ctx.fillRect(f.x - 14, f.y + 16, 28 * f.charge, 4);
  }
}
function drawPet(p) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.type !== 'clam') ctx.scale(p.face || 1, 1);
  ART.pet[p.type](ctx, p);
  ctx.restore();
  if (p.lv > 1) textO('★'.repeat(p.lv), p.x, p.y - 26, 12, '#ffe14d', 'center', 3);
}
function drawPortal(p, t) {
  const k = clamp(1 - G.alienT / 5, 0, 1);
  ctx.save(); ctx.translate(p.x, p.y);
  for (let i = 0; i < 3; i++) {
    ctx.rotate(t * (2 + i)); ctx.strokeStyle = ['#c87aff', '#ff5aff', '#5a2aff'][i]; ctx.lineWidth = 4;
    ctx.beginPath(); for (let s = 0; s < 40; s++) { const an = s * 0.25, r2 = (s * 1.5) * k; ctx.lineTo(Math.cos(an) * r2, Math.sin(an) * r2); } ctx.stroke();
  }
  ctx.restore();
}
function drawAlien(a) {
  const def = ALIENS[a.type];
  if (a.type === 'kraken') {
    for (const tn of a.tentacles) if (tn.h > 0.02) drawTentacle(ctx, tn, a.t, tn.flash > 0);
    if (a.headUp > 0.05) { ctx.save(); ctx.translate(a.x, a.y); ART.alien.krakenHead(ctx, a); ctx.restore(); }
    for (const tn of a.tentacles) if (tn.state !== 'dead' && tn.h > 0.5) { const pts = tentaclePoints(tn, a.t), mid = pts[3]; hpBar(mid[0], mid[1], tn.hp / tn.maxHp, 40); }
  } else {
    ctx.save(); ctx.translate(a.x, a.y);
    if (a.spawnT > 0) { const k = 1 - a.spawnT; ctx.scale(k, k); ctx.rotate(a.spawnT * 6); }
    if (['gnasher', 'brute', 'twins', 'gorger', 'leechqueen', 'hoarder'].includes(a.type)) ctx.scale(Math.abs(a.face) < 0.2 ? 0.2 * Math.sign(a.face || 1) : a.face, 1);
    ART.alien[a.type](ctx, a);
    ctx.restore();
    if (a.orbs) for (const o of a.orbs) if (o.hp > 0) { const [ox, oy] = orbPos(a, o); ctx.strokeStyle = 'rgba(120,255,240,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ox, oy); ctx.stroke(); drawOrb(ctx, ox, oy, a.t, o.flash > 0); hpBar(ox, oy - 22, o.hp / o.maxHp, 30); }
  }
  if (a.stunT > 0) for (let i = 0; i < 3; i++) { const an = a.t * 5 + i * 2.1; ctx.fillStyle = '#fffd5a'; star(ctx, a.x + Math.cos(an) * 26, a.y - (a.r || 40) - 6 + Math.sin(an) * 6, 6); ctx.fill(); outl(ctx, 1.2); }
  if (!def.boss && a.type !== 'gorger' && a.spawnT <= 0 && !(a.type === 'phantom' && a.vis < 0.3 && !anglerLight())) hpBar(a.x, a.y - (a.r || 40) - 14, Math.max(0, a.hp) / a.maxHp, 60);
}
function hpBar(x, y, k, w) {
  ctx.fillStyle = 'rgba(0,0,0,.55)'; rr(ctx, x - w / 2 - 2, y - 2, w + 4, 9, 4); ctx.fill();
  ctx.fillStyle = k > 0.5 ? '#5aff6a' : k > 0.25 ? '#ffd84a' : '#ff4a4a'; rr(ctx, x - w / 2, y, w * clamp(k, 0, 1), 5, 2.5); ctx.fill();
}
function drawBolt(b) {
  const n = 8; ctx.save(); ctx.globalAlpha = b.life * 4;
  const pts = [[b.x1, b.y1]];
  let seed = b.seed * 1000;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
  for (let i = 1; i < n; i++) pts.push([lerp(b.x1, b.x2, i / n) + rnd() * 24, lerp(b.y1, b.y2, i / n) + rnd() * 24]);
  pts.push([b.x2, b.y2]);
  for (const [w, c] of [[7, 'rgba(255,255,255,.3)'], [3.5, b.col], [1.2, '#fff']]) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.lineWidth = w; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
}
function drawBlackout(t) {
  const k = Math.min(1, (EVENTS.blackout.dur - G.event.t) * 1.5, G.event.t * 1.5);
  dctx.globalCompositeOperation = 'source-over'; dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = `rgba(2,4,14,${0.93 * k})`; dctx.fillRect(0, HUD_H, W, H - HUD_H);
  dctx.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const g = dctx.createRadialGradient(x, y, r * 0.2, x, y, r); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); dctx.fillStyle = g; dctx.beginPath(); dctx.arc(x, y, r, 0, TAU); dctx.fill(); };
  hole(Input.x, Input.y, 120);
  for (const f of G.fish) {
    if (f.kind === 'angler') { const [lx, ly] = lurePos(f); hole(lx, ly, 190); }
    else if (f.kind === 'jelly') hole(f.x, f.y, 55);
    else if (f.kind === 'eel') hole(f.x, f.y, 50 + f.charge * 40);
  }
  for (const p of G.pets) if (p.type === 'zippy') hole(p.x, p.y, 90);
  for (const c of G.coins) hole(c.x, c.y, 20);
  for (const b of FX.bolts) hole(b.x2, b.y2, 80);
  ctx.drawImage(darkCanvas, 0, 0);
}

// ---------- HUD ----------
function drawHUD(t) {
  const g = ctx.createLinearGradient(0, 0, 0, HUD_H);
  g.addColorStop(0, '#4e94a2'); g.addColorStop(0.5, '#25606f'); g.addColorStop(1, '#123744');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, HUD_H);
  ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(0, 0, W, 3);
  ctx.fillStyle = vgrad(ctx, HUD_H - 6, HUD_H, '#ffd36a', '#8a5a10'); ctx.fillRect(0, HUD_H - 6, W, 6);
  for (let i = 0; i < 9; i++) drawSlot(i, t);
  // money box
  const mx = slotX(9), mw = W - mx - 8;
  rr(ctx, mx, SLOT_Y, mw, SLOT_H, 12); ctx.fillStyle = vgrad(ctx, SLOT_Y, SLOT_Y + SLOT_H, '#0a1a22', '#1c3a46'); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffd36a'; ctx.stroke();
  textO(fmt(G.money), mx + mw - 12, SLOT_Y + 42, 26, '#ffe14d', 'right', 5);
  ctx.font = '700 11px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#9fd8e0'; ctx.textAlign = 'right';
  ctx.fillText(FOOD_NAMES[G.foodQ] + ' · ' + G.foodMax + ' max', mx + mw - 12, SLOT_Y + 60);
  ctx.textAlign = 'left'; ctx.fillText('🐚 ' + Save.p.shells, mx + 10, SLOT_Y + 16);
  // tooltip
  if (hoverSlot >= 0) {
    const info = slotInfo(hoverSlot);
    if (info && info.id) {
      const lines = wrapText(info.desc || '', 250, 13);
      const bx = clamp(slotX(hoverSlot) - 40, 6, W - 280), by = HUD_H + 4, bh = 30 + lines.length * 16;
      rr(ctx, bx, by, 272, bh, 10); ctx.fillStyle = 'rgba(10,25,35,.92)'; ctx.fill(); ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2; ctx.stroke();
      textO(info.label, bx + 12, by + 20, 15, '#ffe14d', 'left', 3);
      ctx.font = '700 13px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#e0f4f8'; ctx.textAlign = 'left';
      lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 38 + i * 16));
    }
  }
}
function drawSlot(i, t) {
  const x = slotX(i), y = SLOT_Y, info = slotInfo(i), hover = hoverSlot === i && info.id;
  rr(ctx, x, y, SLOT_W, SLOT_H, 12);
  ctx.fillStyle = !info.id ? 'rgba(10,30,40,.5)' : hover ? vgrad(ctx, y, y + SLOT_H, '#8ae8e8', '#24707e') : vgrad(ctx, y, y + SLOT_H, '#5cbcc4', '#1a4f5c');
  ctx.fill(); ctx.lineWidth = hover ? 3.5 : 2.5; ctx.strokeStyle = hover ? '#ffe14d' : '#0c2630'; ctx.stroke();
  if (!info.id) { textO('?', x + SLOT_W / 2, y + 44, 26, 'rgba(255,255,255,.2)', 'center', 2); return; }
  rr(ctx, x + 6, y + 5, SLOT_W - 12, 44, 9); ctx.fillStyle = 'rgba(180,240,255,.25)'; ctx.fill();
  ctx.save(); rr(ctx, x + 6, y + 5, SLOT_W - 12, 44, 9); ctx.clip();
  ctx.translate(x + SLOT_W / 2, y + 28);
  drawSlotIcon(info, t, hover);
  ctx.restore();
  if (!info.can && !info.max) { rr(ctx, x, y, SLOT_W, SLOT_H, 12); ctx.fillStyle = 'rgba(0,10,20,.4)'; ctx.fill(); }
  const label = info.max ? 'MAX' : fmt(info.price);
  textO(label, x + SLOT_W / 2, y + SLOT_H - 5, 15, info.max ? '#9fd8e0' : info.can ? '#7aff5a' : '#ff8a7a', 'center', 4);
  ctx.font = '900 10px sans-serif'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), x + 6, y + 13);
}
function drawSlotIcon(info, t, hover) {
  const id = info.id;
  if (FISH[id]) {
    const s = ICON_SCALE[id] || 1;
    ctx.scale(s, s);
    if (id === 'turtle') ctx.translate(-8, 0);
    if (id === 'eel') ctx.translate(14, 0);
    if (id === 'angler') ctx.translate(-8, 10);
    if (id === 'ultravore') ctx.translate(14, 0);
    if (id === 'starcatcher') ctx.translate(0, 4);
    ART.fish[id](ctx, { t: hover ? t : 0, stage: id === 'guppy' ? 1 : 1, eatT: 0, puff: 0, charge: 0, birthT: 20, glow: 0, face: 1 }, 0);
  } else if (id === 'foodq') {
    ctx.scale(2.2, 2.2); drawFood(ctx, { x: 0, y: 0, q: Math.min(4, G.foodQ + (info.max ? 0 : 1)) });
  } else if (id === 'foodn') {
    for (const [x, y] of [[-12, 4], [0, -6], [12, 4]]) drawFood(ctx, { x, y, q: G.foodQ });
    textO('+1', 18, 18, 13, '#fff', 'center', 3);
  } else if (id === 'laser') {
    ctx.rotate(-0.3);
    rr(ctx, -22, -9, 30, 16, 6); ctx.fillStyle = vgrad(ctx, -9, 7, '#e0e8f0', '#6a7a8a'); ctx.fill(); outl(ctx, 2.2);
    ctx.fillStyle = '#5a6a7a'; ctx.fillRect(-16, 5, 9, 14); ctx.strokeRect(-16, 5, 9, 14);
    rr(ctx, 6, -5, 18, 8, 3); ctx.fillStyle = '#9aa8b8'; ctx.fill(); outl(ctx, 2);
    const g = ctx.createRadialGradient(26, -1, 1, 26, -1, 10); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#5affff'); g.addColorStop(1, 'rgba(90,255,255,0)');
    ctx.fillStyle = g; circle(ctx, 26, -1, 10); ctx.fill();
    ctx.rotate(0.3); textO('Lv' + G.laser, 0, 18, 12, '#fff', 'center', 3);
  } else if (id === 'egg') {
    if (G.endless) { ctx.scale(1.4, 1.4); ART.coin.shell(ctx, { t: 0 }); return; }
    ctx.beginPath(); ctx.ellipse(0, 2, 15, 19, 0, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fill();
    ctx.save(); ctx.clip();
    for (let k = 0; k < G.eggs; k++) { ctx.fillStyle = ['#fff6d0', '#ffe8a0', '#ffd870'][k]; ctx.fillRect(-16, 21 - (k + 1) * 13, 32, 13.5); }
    ctx.fillStyle = 'rgba(255,120,160,.6)'; for (const [x, y] of [[-6, -6], [5, 4], [-3, 12]]) { circle(ctx, x, y, 3); ctx.fill(); }
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, 2, 15, 19, 0, 0, TAU); outl(ctx, 2.2);
    ctx.beginPath(); ctx.moveTo(-15, -4); ctx.lineTo(-8, 0); ctx.lineTo(-2, -5); ctx.lineTo(5, 0); ctx.lineTo(15, -4); ctx.moveTo(-15, 8); ctx.lineTo(-6, 12); ctx.lineTo(2, 7); ctx.lineTo(9, 12); ctx.lineTo(15, 8); outl(ctx, 1.4);
    if (info.locked) { rr(ctx, -9, -2, 18, 14, 3); ctx.fillStyle = '#c0a040'; ctx.fill(); outl(ctx, 2); ctx.beginPath(); ctx.arc(0, -2, 6, Math.PI, 0); outl(ctx, 2.5); }
    textO(G.eggs + '/3', 22, 20, 11, '#fff', 'center', 3);
  }
}

function drawPanels(t) {
  const L = level();
  // level info
  const title = G.endless ? `Endless · Wave ${G.wave}` : G.cfg ? `Expedition ${G.cfg.tank + 1}-${G.cfg.stage + 1}: ${L.name}` : `${G.level + 1}. ${L.name}`;
  ctx.font = '900 14px "Trebuchet MS", sans-serif';
  const tw = ctx.measureText(title).width + 80;
  rr(ctx, 8, HUD_H + 8, tw, 26, 10); ctx.fillStyle = 'rgba(5,20,30,.55)'; ctx.fill();
  textO(title, 18, HUD_H + 26, 14, '#fff', 'left', 3);
  textO(fmtTime(G.time), 8 + tw - 10, HUD_H + 26, 14, '#9fd8e0', 'right', 3);
  let py = HUD_H + 40;
  const syn = [...(G.forms || []).map(f => '✦ ' + FORMS[f].name), ...(G.combos || []).map(c => '⚡ ' + COMBOS[c].name)];
  if (syn.length) {
    const txt = syn.join('   ');
    ctx.font = '900 12px "Trebuchet MS", sans-serif';
    rr(ctx, 8, py - 2, ctx.measureText(txt).width + 20, 20, 8); ctx.fillStyle = 'rgba(60,10,60,.6)'; ctx.fill();
    textO(txt, 18, py + 12, 12, '#ffb3ff', 'left', 3);
    py += 24;
  }
  // bounty
  if (G.bounty) {
    const b = G.bounty;
    let prog = '';
    if (['collect', 'nowaste', 'pop', 'own'].includes(b.type)) prog = `${b.prog}/${b.n}`;
    else if (b.type === 'earn') prog = `${fmt(b.prog)}/${fmt(b.n)}`;
    else if (b.type === 'clean') prog = `waste: ${b.prog}`;
    ctx.font = '900 12px "Trebuchet MS", sans-serif';
    const bw = Math.max(300, ctx.measureText('BOUNTY: ' + b.desc).width + 28);
    rr(ctx, 8, py, bw, 44, 10); ctx.fillStyle = 'rgba(60,40,5,.7)'; ctx.fill(); ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2; ctx.stroke();
    textO('BOUNTY: ' + b.desc, 16, py + 17, 12, '#ffe14d', 'left', 3);
    textO(prog + '   Reward ' + fmt(b.reward) + ' + 🐚', 16, py + 34, 11, '#fff', 'left', 3);
    if (b.type !== 'protect') { ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(16, py + 38, bw - 16, 3); ctx.fillStyle = '#ffd36a'; ctx.fillRect(16, py + 38, (bw - 16) * clamp(b.t / b.max, 0, 1), 3); }
    py += 50;
  }
  if (G.event) {
    const e = EVENTS[G.event.type];
    textO(e.name + ' ' + Math.ceil(G.event.t) + 's', W / 2, HUD_H + 26, 16, e.col, 'center', 4);
  }
  if (grime() > 6) textO('DIRTY TANK! Fish are sick & lazy', 16, py + 14, 13, '#c8ff5a', 'left', 3);
  if (G.warned) textO('⚠ ALIENS IN ' + Math.ceil(G.alienT) + ' ⚠', W / 2, HUD_H + 50, 20, '#ff5a5a', 'center', 4);
  // boss bar
  const boss = G.aliens.find(a => ALIENS[a.type].boss);
  if (boss) {
    const bw = 380, bx = W / 2 - bw / 2, by = HUD_H + 34;
    rr(ctx, bx - 4, by - 4, bw + 8, 26, 8); ctx.fillStyle = 'rgba(20,0,10,.75)'; ctx.fill(); ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#c0203a'; rr(ctx, bx, by, bw * clamp(boss.hp / boss.maxHp, 0, 1), 18, 6); ctx.fill();
    textO(ALIENS[boss.type].name, W / 2, by + 15, 14, '#fff', 'center', 3);
  }
  // menu button
  rr(ctx, MENU_BTN.x, MENU_BTN.y, MENU_BTN.w, MENU_BTN.h, 10);
  ctx.fillStyle = hoverMenu ? vgrad(ctx, MENU_BTN.y, MENU_BTN.y + MENU_BTN.h, '#ffe88a', '#c08a20') : vgrad(ctx, MENU_BTN.y, MENU_BTN.y + MENU_BTN.h, '#ffd36a', '#8a5a10'); ctx.fill(); outl(ctx, 2.5);
  textO('MENU', MENU_BTN.x + MENU_BTN.w / 2, MENU_BTN.y + 21, 15, '#fff', 'center', 3);
  // captain
  if (G.captain) {
    const c = G.captain, a = Math.min(1, c.t * 2);
    ctx.globalAlpha = a;
    const lines = wrapText(c.msg, 520, 14);
    const bh = 18 + lines.length * 17, by = H - bh - 8;
    rr(ctx, 92, by, 548, bh, 12); ctx.fillStyle = 'rgba(255,250,235,.95)'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(92, H - 30); ctx.lineTo(78, H - 24); ctx.lineTo(92, H - 18); ctx.fillStyle = 'rgba(255,250,235,.95)'; ctx.fill();
    ctx.font = '700 14px "Trebuchet MS", sans-serif'; ctx.fillStyle = '#20303a'; ctx.textAlign = 'left';
    lines.forEach((l, i) => ctx.fillText(l, 104, by + 22 + i * 17));
    drawCaptain(ctx, 44, H - 34, t);
    ctx.globalAlpha = 1;
  }
}
