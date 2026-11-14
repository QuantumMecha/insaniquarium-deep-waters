'use strict';
// ---- All procedural art. Everything is drawn facing RIGHT around (0,0). ----
const OUT = '#15202b';
const ART = { fish: {}, alien: {}, pet: {}, coin: {} };

function outl(ctx, w = 2.4) { ctx.lineWidth = w; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
function vgrad(ctx, y1, y2, c1, c2) { const g = ctx.createLinearGradient(0, y1, 0, y2); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }
function radg(ctx, x, y, r, c1, c2) { const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }
function shine(ctx, x, y, rx, ry, a = 0.5, rot = -0.25) {
  ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); ctx.fill(); ctx.restore();
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, TAU); }

function drawEye(ctx, x, y, r, o = {}) {
  circle(ctx, x, y, r); ctx.fillStyle = o.white || '#fff'; ctx.fill(); outl(ctx, Math.max(1.4, r * 0.22));
  if (o.dead) {
    ctx.beginPath(); ctx.moveTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.5, y + r * 0.5);
    ctx.moveTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x - r * 0.5, y + r * 0.5); outl(ctx, r * 0.25); return;
  }
  const lx = (o.lx == null ? 0.5 : o.lx) * r * 0.38, ly = (o.ly || 0) * r * 0.38;
  circle(ctx, x + lx, y + ly, r * (o.pupil || 0.52)); ctx.fillStyle = o.iris || '#111'; ctx.fill();
  circle(ctx, x + lx - r * 0.18, y + ly - r * 0.2, r * 0.17); ctx.fillStyle = '#fff'; ctx.fill();
  if (o.angry) {
    ctx.beginPath(); ctx.moveTo(x - r * 1.1, y - r * 1.25); ctx.lineTo(x + r * 1.0, y - r * 0.6);
    ctx.lineWidth = Math.max(2, r * 0.42); ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke();
  }
  if (o.lid) { // sleepy / sad lid
    ctx.save(); circle(ctx, x, y, r); ctx.clip();
    ctx.fillStyle = o.lidCol || '#888'; ctx.fillRect(x - r, y - r, r * 2, r * o.lid * 1.2); ctx.restore();
    circle(ctx, x, y, r); outl(ctx, Math.max(1.4, r * 0.22));
  }
}

function fishMouth(ctx, x, y, type, s, open) {
  if (open > 0) {
    ctx.beginPath(); ctx.ellipse(x - s * 0.05, y, s * 0.09, s * 0.13 * open + 1, 0, 0, TAU);
    ctx.fillStyle = '#4a0c18'; ctx.fill(); outl(ctx, 1.6); return;
  }
  ctx.beginPath();
  if (type === 'teeth' || type === 'under') {
    ctx.moveTo(x, y - s * 0.05); ctx.lineTo(x - s * 0.32, y + s * 0.08);
    outl(ctx, 2);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const tx = x - s * 0.06 - i * s * 0.07, ty = y - s * 0.035 + i * s * 0.03;
      ctx.beginPath();
      if (type === 'under') { ctx.moveTo(tx - 2, ty + 1); ctx.lineTo(tx, ty - s * 0.09); ctx.lineTo(tx + 2, ty + 1); }
      else { ctx.moveTo(tx - 2, ty - 1); ctx.lineTo(tx, ty + s * 0.09); ctx.lineTo(tx + 2, ty - 1); }
      ctx.closePath(); ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUT; ctx.stroke();
    }
  } else if (type === 'o') {
    ctx.ellipse(x - 1, y, 2.5, 3, 0, 0, TAU); ctx.fillStyle = '#4a0c18'; ctx.fill(); outl(ctx, 1.4);
  } else {
    ctx.arc(x - s * 0.12, y - s * 0.08, s * 0.12, 0.3, 1.4); outl(ctx, 1.8);
  }
}

// Generic cartoon fish
function fishBody(ctx, o) {
  const L = o.L, Hh = o.H, t = o.t || 0, hv = o.hv || 0;
  const c1 = mix(o.c1, '#a8a8a8', hv * 0.65), c2 = mix(o.c2, '#5c5c5c', hv * 0.65), fin = mix(o.fin, '#a4a4a4', hv * 0.5);
  const wag = Math.sin(t * (o.wagSpeed || 9)) * Hh * 0.14;
  ctx.fillStyle = fin;
  // tail
  ctx.beginPath();
  if (o.tail === 'fork') {
    ctx.moveTo(-L * 0.4, 0);
    ctx.lineTo(-L * 0.72, -Hh * 0.62 + wag); ctx.lineTo(-L * 0.6, wag * 0.4); ctx.lineTo(-L * 0.72, Hh * 0.62 + wag);
    ctx.closePath();
  } else {
    ctx.moveTo(-L * 0.38, 0);
    ctx.quadraticCurveTo(-L * 0.55, -Hh * 0.1, -L * (o.tailLen || 0.72), -Hh * 0.5 + wag);
    ctx.quadraticCurveTo(-L * 0.6, wag * 0.6, -L * (o.tailLen || 0.72), Hh * 0.5 + wag);
    ctx.quadraticCurveTo(-L * 0.55, Hh * 0.1, -L * 0.38, 0);
  }
  ctx.fill(); outl(ctx);
  // dorsal
  if (o.dorsal !== false) {
    ctx.beginPath();
    if (o.dorsal === 'tri') { ctx.moveTo(-L * 0.18, -Hh * 0.4); ctx.lineTo(-L * 0.08, -Hh * 1.05); ctx.lineTo(L * 0.12, -Hh * 0.42); }
    else if (o.dorsal === 'spiky') { ctx.moveTo(-L * 0.25, -Hh * 0.36); for (let i = 0; i < 4; i++) { ctx.lineTo(-L * 0.2 + i * L * 0.1, -Hh * 0.82); ctx.lineTo(-L * 0.15 + i * L * 0.1, -Hh * 0.45); } }
    else { ctx.moveTo(-L * 0.24, -Hh * 0.36); ctx.quadraticCurveTo(-L * 0.08, -Hh * 0.98, L * 0.14, -Hh * 0.42); }
    ctx.closePath(); ctx.fillStyle = fin; ctx.fill(); outl(ctx);
  }
  // anal fin
  ctx.beginPath(); ctx.moveTo(-L * 0.16, Hh * 0.4); ctx.quadraticCurveTo(-L * 0.08, Hh * 0.78, L * 0.05, Hh * 0.42);
  ctx.closePath(); ctx.fillStyle = fin; ctx.fill(); outl(ctx);
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, L / 2, Hh / 2, 0, 0, TAU);
  ctx.fillStyle = vgrad(ctx, -Hh / 2, Hh / 2, c1, c2); ctx.fill();
  if (o.belly || o.pattern) {
    ctx.save(); ctx.clip();
    if (o.belly) { ctx.beginPath(); ctx.ellipse(L * 0.06, Hh * 0.36, L * 0.42, Hh * 0.28, 0, 0, TAU); ctx.fillStyle = mix(o.belly, '#c4c4c4', hv * 0.5); ctx.fill(); }
    if (o.pattern) o.pattern(ctx, L, Hh);
    ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, L / 2, Hh / 2, 0, 0, TAU); outl(ctx, o.lw || 2.6);
  shine(ctx, -L * 0.04, -Hh * 0.24, L * 0.22, Hh * 0.09);
  // pectoral fin
  ctx.save(); ctx.translate(-L * 0.02, Hh * 0.1); ctx.rotate(0.5 + Math.sin(t * 10) * 0.3);
  ctx.beginPath(); ctx.ellipse(-L * 0.08, 0, L * 0.12, Hh * 0.1, 0, 0, TAU); ctx.fillStyle = fin; ctx.fill(); outl(ctx, 1.8);
  ctx.restore();
  drawEye(ctx, L * (o.eyeX || 0.24), -Hh * 0.12, o.eyeR || Hh * 0.2, { angry: o.angry, dead: o.dead, iris: o.iris, lid: hv > 0.5 ? 0.45 : 0, lidCol: c1 });
  fishMouth(ctx, L * 0.47, Hh * 0.12, o.mouth, Hh, o.open);
}

function crown(ctx, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(-9, 4); ctx.lineTo(-10, -6); ctx.lineTo(-5, -1); ctx.lineTo(0, -9); ctx.lineTo(5, -1); ctx.lineTo(10, -6); ctx.lineTo(9, 4); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -9, 4, '#fff27a', '#e0a010'); ctx.fill(); outl(ctx, 1.8);
  circle(ctx, 0, -1, 1.8); ctx.fillStyle = '#ff3a6a'; ctx.fill();
  ctx.restore();
}

// ================= FISH =================
ART.fish.guppy = (ctx, f, hv) => {
  const king = f.stage === 3;
  fishBody(ctx, { L: 40, H: 26, t: f.t, hv, open: f.eatT > 0 ? 1 : 0, mouth: 'smile',
    c1: king ? '#fff09a' : '#c4f774', c2: king ? '#e09a14' : '#3c9a2a', fin: king ? '#ff7a2a' : '#ffb43a', belly: king ? '#fff6c8' : '#efffb0' });
  if (king) crown(ctx, 2, -17);
};
ART.fish.breeder = (ctx, f, hv) => {
  const preg = f.stage ? clamp(1 - (f.birthT || 20) / 20, 0, 1) : 0;
  fishBody(ctx, { L: 46, H: 32 * (1 + preg * 0.28), t: f.t, hv, open: f.eatT > 0 ? 1 : 0, mouth: 'smile',
    c1: '#ffc2e8', c2: '#d0509c', fin: '#ffe2f6', belly: '#fff0f8', eyeR: 7 });
  // bow
  ctx.save(); ctx.translate(-2, -16 * (1 + preg * 0.28)); ctx.fillStyle = '#ff3d8b';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -5); ctx.lineTo(-8, 5); ctx.closePath(); ctx.fill(); outl(ctx, 1.5);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(8, -5); ctx.lineTo(8, 5); ctx.closePath(); ctx.fill(); outl(ctx, 1.5);
  circle(ctx, 0, 0, 3); ctx.fill(); outl(ctx, 1.5); ctx.restore();
};
ART.fish.carnivore = (ctx, f, hv) => {
  fishBody(ctx, { L: 62, H: 44, t: f.t, hv, angry: true, eyeR: 8, mouth: 'teeth', open: f.eatT > 0 ? 1.4 : 0,
    c1: '#a898ff', c2: '#3a2894', fin: '#e0d6ff', belly: '#cfc6ff', dorsal: 'spiky' });
};
ART.fish.ultravore = (ctx, f, hv) => {
  fishBody(ctx, { L: 112, H: 46, t: f.t, hv, angry: true, eyeR: 6, eyeX: 0.28, mouth: 'teeth', open: f.eatT > 0 ? 1.5 : 0, wagSpeed: 6,
    c1: '#b3c2d4', c2: '#4b5a70', fin: '#7d8ca3', belly: '#f4f4f4', dorsal: 'tri', tail: 'fork',
    pattern: (c, L, Hh) => { c.strokeStyle = 'rgba(30,40,60,.6)'; c.lineWidth = 2; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(L * 0.12 - i * 6, -Hh * 0.18); c.quadraticCurveTo(L * 0.09 - i * 6, 0, L * 0.12 - i * 6, Hh * 0.15); c.stroke(); } } });
};
ART.fish.starcatcher = (ctx, f, hv) => {
  const b = Math.sin(f.t * 4) * 1.5, open = f.eatT > 0 ? 1 : 0;
  const c1 = mix('#ff9ce0', '#a8a8a8', hv * 0.6), c2 = mix('#9b2c8a', '#5c5c5c', hv * 0.6);
  ctx.fillStyle = '#7a1e6a';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 14 + Math.sin(f.t * 8 + s) * 2, 16, 7, 4, 0, 0, TAU); ctx.fill(); outl(ctx, 2); }
  ctx.beginPath(); ctx.ellipse(0, b * 0.3, 27, 21 + b * 0.3, 0, 0, TAU); ctx.fillStyle = radg(ctx, 0, 0, 30, c1, c2); ctx.fill(); outl(ctx, 2.6);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (const [x, y, r] of [[-15, 4, 3], [16, 8, 2.5], [-8, 13, 2], [11, -6, 2]]) { circle(ctx, x, y, r); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, -13, 14, 6 + open * 5, 0, 0, TAU); ctx.fillStyle = '#4a0a2a'; ctx.fill(); outl(ctx, 2.2);
  ctx.beginPath(); ctx.ellipse(0, -11 + open * 2, 7, 3, 0, 0, TAU); ctx.fillStyle = '#ff5f8f'; ctx.fill();
  drawEye(ctx, -10, 3, 6.5, { lx: 0, ly: -0.6, lid: hv > 0.5 ? 0.45 : 0, lidCol: c1 });
  drawEye(ctx, 10, 3, 6.5, { lx: 0, ly: -0.6, lid: hv > 0.5 ? 0.45 : 0, lidCol: c1 });
  shine(ctx, -8, -4, 7, 3, 0.4);
};
ART.fish.wrasse = (ctx, f, hv) => {
  fishBody(ctx, { L: 44, H: 18, t: f.t, hv, eyeR: 4.5, open: f.eatT > 0 ? 1 : 0, mouth: 'smile', wagSpeed: 12,
    c1: '#7fdcff', c2: '#1d62c8', fin: '#ffe14d',
    pattern: (c, L, Hh) => { c.fillStyle = '#ffe14d'; c.fillRect(-L / 2, -Hh / 2, L, Hh * 0.28); c.fillStyle = '#10204a'; c.fillRect(-L / 2, -Hh * 0.08, L * 0.9, Hh * 0.18); } });
};
ART.fish.puffer = (ctx, f, hv) => {
  const p = f.puff || 0, r = 16 + p * 13;
  const c1 = mix('#fff08a', '#a8a8a8', hv * 0.6), c2 = mix('#e09a20', '#5c5c5c', hv * 0.6);
  const wag = Math.sin(f.t * 10) * 3;
  ctx.beginPath(); ctx.moveTo(-r + 2, 0); ctx.lineTo(-r - 11, -8 + wag); ctx.lineTo(-r - 11, 8 + wag); ctx.closePath(); ctx.fillStyle = '#f6c443'; ctx.fill(); outl(ctx, 2);
  if (p > 0.15) {
    ctx.fillStyle = '#fff6c0';
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * TAU, s = r + 7 * p;
      ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.12) * r, Math.sin(a - 0.12) * r); ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s); ctx.lineTo(Math.cos(a + 0.12) * r, Math.sin(a + 0.12) * r);
      ctx.closePath(); ctx.fill(); outl(ctx, 1.4);
    }
  }
  circle(ctx, 0, 0, r); ctx.fillStyle = radg(ctx, 0, 0, r, c1, c2); ctx.fill();
  ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(2, r * 0.55, r * 0.9, r * 0.5, 0, 0, TAU); ctx.fillStyle = '#fffbe0'; ctx.fill();
  ctx.fillStyle = 'rgba(120,70,20,.55)'; for (const [x, y] of [[-6, -8], [-11, 2], [2, -12], [-2, -3]]) { circle(ctx, x * r / 16, y * r / 16, 2.2 * r / 16); ctx.fill(); }
  ctx.restore(); circle(ctx, 0, 0, r); outl(ctx, 2.6);
  shine(ctx, -r * 0.2, -r * 0.45, r * 0.4, r * 0.16);
  drawEye(ctx, r * 0.42, -r * 0.2, 5 + p * 2, { angry: p > 0.5, lid: hv > 0.5 ? 0.45 : 0, lidCol: c1 });
  fishMouth(ctx, r * 0.95, r * 0.15, p > 0.5 ? 'o' : 'smile', 18, f.eatT > 0 ? 1 : 0);
  ctx.save(); ctx.translate(-2, r * 0.25); ctx.rotate(0.6 + Math.sin(f.t * 12) * 0.4);
  ctx.beginPath(); ctx.ellipse(-4, 0, 6, 3, 0, 0, TAU); ctx.fillStyle = '#f6c443'; ctx.fill(); outl(ctx, 1.5); ctx.restore();
};
ART.fish.piranha = (ctx, f, hv) => {
  fishBody(ctx, { L: 36, H: 28, t: f.t, hv, angry: true, eyeR: 5.5, mouth: 'under', open: f.eatT > 0 ? 1.3 : 0, wagSpeed: 14,
    c1: '#a8b8c8', c2: '#ff3d2e', fin: '#5f6f83', dorsal: 'spiky' });
};
ART.fish.seahorse = (ctx, f, hv) => {
  const c1 = mix('#ffbe5c', '#a8a8a8', hv * 0.6), c2 = mix('#e0571c', '#5c5c5c', hv * 0.6);
  const bob = Math.sin(f.t * 3) * 1.5;
  ctx.save(); ctx.translate(0, bob);
  // tail curl
  ctx.beginPath(); ctx.moveTo(-2, 8); ctx.quadraticCurveTo(-4, 22, -12, 22); ctx.quadraticCurveTo(-18, 20, -15, 14); ctx.quadraticCurveTo(-12, 11, -9, 15);
  ctx.lineWidth = 9; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 5.5; ctx.strokeStyle = c2; ctx.stroke();
  // dorsal fin flutter
  ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-16 + Math.sin(f.t * 20) * 2, 0, -7, 6); ctx.closePath(); ctx.fillStyle = '#ffe0a0'; ctx.fill(); outl(ctx, 1.6);
  // body
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 13, 0.15, 0, TAU); ctx.fillStyle = vgrad(ctx, -13, 13, c1, c2); ctx.fill(); outl(ctx, 2.4);
  ctx.strokeStyle = 'rgba(120,40,0,.45)'; ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(1, i * 4); ctx.lineTo(7, i * 4 + 1); ctx.stroke(); }
  // head + snout
  ctx.beginPath(); ctx.moveTo(4, -17); ctx.lineTo(16, -15); ctx.lineTo(16, -11); ctx.lineTo(5, -10); ctx.closePath(); ctx.fillStyle = c1; ctx.fill(); outl(ctx, 2);
  circle(ctx, 2, -15, 8); ctx.fillStyle = vgrad(ctx, -23, -7, c1, c2); ctx.fill(); outl(ctx, 2.4);
  ctx.fillStyle = c2; for (const x of [-3, 1, 5]) { ctx.beginPath(); ctx.moveTo(x - 2, -21); ctx.lineTo(x, -27); ctx.lineTo(x + 2, -21); ctx.closePath(); ctx.fill(); outl(ctx, 1.3); }
  drawEye(ctx, 4, -16, 4.5, { lid: hv > 0.5 ? 0.45 : 0, lidCol: c1 });
  shine(ctx, -2, -4, 2.5, 6, 0.4, 0.1);
  ctx.restore();
};
ART.fish.eel = (ctx, f, hv) => {
  const N = 12, pts = [];
  for (let i = 0; i < N; i++) pts.push([10 - i * 6.5, Math.sin(f.t * 6 - i * 0.7) * (1.5 + i * 0.7)]);
  const c = mix('#d6f04a', '#a8a8a8', hv * 0.6), dark = mix('#5c8a1a', '#5c5c5c', hv * 0.6);
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < N - 1; i++) {
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      const w = 16 - i * 0.9;
      ctx.lineWidth = pass === 0 ? w + 5 : w; ctx.strokeStyle = pass === 0 ? OUT : (i % 2 ? c : mix('#d6f04a', '#7ab82a', 0.35)); ctx.stroke();
    }
  }
  ctx.beginPath(); for (let i = 1; i < N - 1; i++) { const p = pts[i]; i === 1 ? ctx.moveTo(p[0], p[1] - 4 + i * 0.3) : ctx.lineTo(p[0], p[1] - 4 + i * 0.3); }
  ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.stroke();
  const tl = pts[N - 1];
  ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tl[0] - 10, tl[1] - 7); ctx.lineTo(tl[0] - 8, tl[1] + 7); ctx.closePath(); ctx.fillStyle = dark; ctx.fill(); outl(ctx, 2);
  ctx.beginPath(); ctx.ellipse(16, 0, 13, 9.5, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -9, 9, c, dark); ctx.fill(); outl(ctx, 2.5);
  drawEye(ctx, 20, -3, 4.5, { angry: true, iris: '#ff2', pupil: 0.4 });
  ctx.beginPath(); ctx.moveTo(29, 3); ctx.lineTo(20, 5); outl(ctx, 1.8);
  if ((f.charge || 0) > 0.75) {
    ctx.strokeStyle = '#fffd8a'; ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const i = randi(1, N - 2), p = pts[i]; ctx.beginPath(); ctx.moveTo(p[0], p[1]);
      ctx.lineTo(p[0] + rand(-8, 8), p[1] + rand(-14, -6)); ctx.lineTo(p[0] + rand(-8, 8), p[1] + rand(-22, -12)); ctx.stroke();
    }
  }
};
ART.fish.jelly = (ctx, f) => {
  const s = f.stage ? 1 : 0.65, p = Math.sin(f.t * 3);
  ctx.save(); ctx.scale(s, s);
  const glow = f.glow > 0;
  ctx.strokeStyle = glow ? 'rgba(255,240,120,.8)' : 'rgba(255,150,220,.75)'; ctx.lineWidth = 2.2;
  for (let k = 0; k < 5; k++) {
    const x = -10 + k * 5; ctx.beginPath(); ctx.moveTo(x, 3);
    for (let j = 1; j <= 5; j++) ctx.lineTo(x + Math.sin(f.t * 4 + k + j) * 3, 3 + j * 5 + p);
    ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-19 - p * 2, 4); ctx.bezierCurveTo(-19, -24, 19, -24, 19 + p * 2, 4); ctx.quadraticCurveTo(0, 10, -19 - p * 2, 4);
  ctx.globalAlpha = 0.85; ctx.fillStyle = glow ? radg(ctx, 0, -6, 22, '#fffbd0', '#ffcf3a') : radg(ctx, 0, -6, 22, '#ffe6f7', '#ff8ad0'); ctx.fill(); ctx.globalAlpha = 1; outl(ctx, 2.2);
  ctx.strokeStyle = glow ? '#d48a00' : '#e05aa8'; ctx.lineWidth = 1.5;
  for (const x of [-7, 0, 7]) { circle(ctx, x, -6, 3); ctx.stroke(); }
  drawEye(ctx, -5, -2, 2.8, { lx: 0 }); drawEye(ctx, 5, -2, 2.8, { lx: 0 });
  shine(ctx, -8, -13, 5, 2.5, 0.6);
  ctx.restore();
};
ART.fish.turtle = (ctx, f, hv) => {
  const fl = Math.sin(f.t * 4) * 0.55;
  const g1 = mix('#8fd65a', '#a8a8a8', hv * 0.6), g2 = mix('#2f7a2a', '#5c5c5c', hv * 0.6);
  ctx.fillStyle = '#b8e690';
  for (const [x, y, r] of [[-20, 14, 0.6 + fl], [-20, -14, -0.6 - fl], [14, 16, 0.9 - fl], [14, -16, -0.9 + fl]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.beginPath(); ctx.ellipse(0, y > 0 ? 8 : -8, 6, 12, 0, 0, TAU); ctx.fill(); outl(ctx, 2); ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(34, -2, 12, 10, 0, 0, TAU); ctx.fillStyle = '#c4ec9c'; ctx.fill(); outl(ctx, 2.4);
  drawEye(ctx, 37, -5, 4.5, { lid: 0.3, lidCol: '#c4ec9c' });
  ctx.beginPath(); ctx.arc(38, 1, 4, 0.3, 1.5); outl(ctx, 1.6);
  ctx.beginPath(); ctx.ellipse(0, 0, 31, 22, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -22, 22, g1, g2); ctx.fill(); outl(ctx, 2.8);
  ctx.save(); ctx.clip(); ctx.strokeStyle = 'rgba(20,60,20,.55)'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(200,255,150,.25)';
  for (const [x, y] of [[0, -4], [-15, -2], [15, -2], [-7, 9], [7, 9], [-7, -15], [7, -15]]) {
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7); } ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore(); shine(ctx, -6, -11, 14, 5, 0.4);
};
ART.fish.koi = (ctx, f, hv) => {
  fishBody(ctx, { L: 60, H: 26, t: f.t, hv, eyeR: 5.5, open: f.eatT > 0 ? 1 : 0, mouth: 'smile', tailLen: 0.85, wagSpeed: 6,
    c1: '#fffdf4', c2: '#ffe2b0', fin: '#ffcf6a',
    pattern: (c, L, Hh) => { c.fillStyle = '#ff7a12'; for (const [x, y, r] of [[-10, -6, 8], [8, -8, 6], [-20, 6, 5], [14, 5, 4]]) { circle(c, x, y, r); c.fill(); } c.fillStyle = '#ffd84a'; circle(c, 0, 2, 4); c.fill(); } });
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(29, 5); ctx.quadraticCurveTo(36, 10 + Math.sin(f.t * 3) * 3, 33, 16); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(28, 6); ctx.quadraticCurveTo(32, 14, 26, 18 + Math.sin(f.t * 3 + 1) * 3); ctx.stroke();
  if (Math.sin(f.t * 5) > 0.7) { ctx.fillStyle = '#fff'; star(ctx, rand(-20, 20), rand(-10, 10), 3, 1.2); ctx.fill(); }
};
ART.fish.angler = (ctx, f, hv) => {
  fishBody(ctx, { L: 52, H: 42, t: f.t, hv, eyeR: 6, mouth: 'teeth', open: f.eatT > 0 ? 1.2 : 0, iris: '#ffe14d',
    c1: '#86705c', c2: '#2b1d15', fin: '#5d4838', belly: '#a68c74' });
  const sway = Math.sin(f.t * 2) * 3;
  ctx.beginPath(); ctx.moveTo(4, -19); ctx.quadraticCurveTo(14, -44, 32 + sway, -30); outl(ctx, 3.5);
  ctx.beginPath(); ctx.moveTo(4, -19); ctx.quadraticCurveTo(14, -44, 32 + sway, -30); ctx.lineWidth = 1.6; ctx.strokeStyle = '#86705c'; ctx.stroke();
  const pulse = 0.75 + Math.sin(f.t * 4) * 0.25;
  const g = ctx.createRadialGradient(32 + sway, -28, 1, 32 + sway, -28, 22 * pulse);
  g.addColorStop(0, 'rgba(255,255,200,.9)'); g.addColorStop(1, 'rgba(255,240,120,0)');
  ctx.fillStyle = g; circle(ctx, 32 + sway, -28, 22 * pulse); ctx.fill();
  circle(ctx, 32 + sway, -28, 5); ctx.fillStyle = '#fffbb0'; ctx.fill(); outl(ctx, 1.8);
};

// ================= ALIENS =================
function monster(ctx, a, o) {
  const r = o.r, chomp = a.chewT > 0 ? Math.abs(Math.sin(a.t * 18)) : 0.25 + 0.15 * Math.sin(a.t * 3);
  const flash = a.flash > 0;
  // arms
  ctx.fillStyle = o.c2;
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(-r * 0.1, s * r * 0.55); ctx.rotate(s * (0.6 + Math.sin(a.t * 6) * 0.3));
    ctx.beginPath(); ctx.ellipse(0, s * r * 0.3, r * 0.14, r * 0.32, 0, 0, TAU); ctx.fill(); outl(ctx, 2.4); ctx.restore();
  }
  if (o.horns) {
    ctx.fillStyle = '#f6eed8';
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-r * 0.25 + s * r * 0.3, -r * 0.75); ctx.quadraticCurveTo(s * r * 0.75, -r * 1.35, s * r * 0.85 - r * 0.2, -r * 1.25); ctx.quadraticCurveTo(s * r * 0.4 - r * 0.1, -r * 1, s * r * 0.05 - r * 0.15, -r * 0.85); ctx.closePath(); ctx.fill(); outl(ctx, 2.2); }
  }
  circle(ctx, 0, 0, r); ctx.fillStyle = flash ? '#fff' : radg(ctx, 0, 0, r, o.c1, o.c2); ctx.fill(); outl(ctx, 3);
  ctx.save(); circle(ctx, 0, 0, r); ctx.clip();
  ctx.beginPath(); ctx.ellipse(r * 0.25, r * 0.3, r * 0.62, r * (0.12 + chomp * 0.38), 0, 0, TAU); ctx.fillStyle = '#4a0612'; ctx.fill(); outl(ctx, 2.4);
  ctx.beginPath(); ctx.ellipse(r * 0.3, r * 0.3 + r * chomp * 0.25, r * 0.3, r * 0.12 * chomp + 1, 0, 0, TAU); ctx.fillStyle = '#e04a6a'; ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 7; i++) {
    const x = -r * 0.28 + i * r * 0.17, yt = r * 0.3 - r * (0.12 + chomp * 0.38) * Math.sqrt(1 - Math.pow((x - r * 0.25) / (r * 0.62), 2)) * 0.95;
    const yb = r * 0.6 - (yt - r * 0.3) * -1 - r * 0.3;
    ctx.beginPath(); ctx.moveTo(x - r * 0.06, yt - 2); ctx.lineTo(x, yt + r * 0.13); ctx.lineTo(x + r * 0.06, yt - 2); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.06, yb + 2); ctx.lineTo(x, yb - r * 0.12); ctx.lineTo(x + r * 0.06, yb + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  shine(ctx, -r * 0.3, -r * 0.45, r * 0.32, r * 0.14);
  const blind = a.blindT > 0;
  for (const ex of o.eyes || [-0.05, 0.38]) drawEye(ctx, r * ex, -r * 0.35, r * 0.2, { angry: true, iris: o.iris || '#111', lx: 0.6, dead: a.downT > 0 });
  if (blind) { ctx.fillStyle = 'rgba(20,10,30,.85)'; ctx.beginPath(); ctx.ellipse(r * 0.15, -r * 0.35, r * 0.55, r * 0.25, 0, 0, TAU); ctx.fill(); }
}
ART.alien.gnasher = (ctx, a) => monster(ctx, a, { r: 40, c1: '#7fc8ff', c2: '#1a4aa0' });
ART.alien.brute = (ctx, a) => monster(ctx, a, { r: 50, c1: '#ff8a7a', c2: '#9a1414', horns: true, iris: '#ffdd00' });
ART.alien.twins = (ctx, a) => {
  const c = a.twin ? ['#ffd07a', '#c0600a'] : ['#a6ff9a', '#1e8a2e'];
  if (a.downT > 0) { ctx.globalAlpha = 0.6; ctx.rotate(a.t * 4); }
  monster(ctx, a, { r: 32, c1: a.downT > 0 ? '#bbbbbb' : c[0], c2: a.downT > 0 ? '#555' : c[1], eyes: [0.15] });
  ctx.globalAlpha = 1;
};
ART.alien.gorger = (ctx, a) => {
  const r = 45 + (a.fed || 0) * 1.0, chomp = a.chewT > 0 ? Math.abs(Math.sin(a.t * 18)) : 0.3 + 0.2 * Math.sin(a.t * 4);
  ctx.save(); ctx.scale(1, 0.92);
  circle(ctx, 0, 0, r); ctx.fillStyle = a.flash > 0 ? '#fff' : radg(ctx, 0, 0, r, '#e4b0ff', '#6a1aa0'); ctx.fill(); outl(ctx, 3);
  ctx.beginPath(); ctx.ellipse(-r * 0.1, r * 0.35, r * 0.6, r * 0.45, 0, 0, TAU); ctx.fillStyle = 'rgba(255,220,255,.35)'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.45, r * 0.05, r * 0.42, r * (0.1 + chomp * 0.3), 0, 0, TAU); ctx.fillStyle = '#3a0420'; ctx.fill(); outl(ctx, 2.4);
  ctx.beginPath(); ctx.ellipse(r * 0.55, r * 0.1 + chomp * r * 0.15, r * 0.2, r * 0.08, 0, 0, TAU); ctx.fillStyle = '#ff6a9a'; ctx.fill();
  shine(ctx, -r * 0.35, -r * 0.45, r * 0.3, r * 0.12);
  drawEye(ctx, r * 0.1, -r * 0.55, r * 0.15, { lx: 0.6 }); drawEye(ctx, r * 0.42, -r * 0.48, r * 0.13, { lx: 0.6 });
  ctx.restore();
  // hunger meter
  const need = a.need || 20, frac = clamp((a.fed || 0) / need, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,.5)'; rr(ctx, -30, -r - 22, 60, 9, 4); ctx.fill();
  ctx.fillStyle = '#ffb3f0'; rr(ctx, -29, -r - 21, 58 * frac, 7, 3); ctx.fill();
};
ART.alien.destroyer = (ctx, a) => {
  const step = Math.sin(a.t * 8) * 4;
  ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.lineCap = 'round';
  for (const [x, s] of [[-26, 1], [-12, -1], [12, 1], [26, -1]]) { ctx.beginPath(); ctx.moveTo(x * 0.6, 4); ctx.lineTo(x, 14 + s * step * 0.3); ctx.lineTo(x * 1.25, 30); ctx.stroke(); }
  ctx.strokeStyle = '#8a96a8'; ctx.lineWidth = 3;
  for (const [x, s] of [[-26, 1], [-12, -1], [12, 1], [26, -1]]) { ctx.beginPath(); ctx.moveTo(x * 0.6, 4); ctx.lineTo(x, 14 + s * step * 0.3); ctx.lineTo(x * 1.25, 30); ctx.stroke(); }
  ctx.save(); ctx.translate(0, -16); ctx.rotate(a.aim || -Math.PI / 2);
  ctx.fillStyle = '#5c6878'; ctx.fillRect(0, -7, 38, 14); ctx.strokeStyle = OUT; ctx.lineWidth = 2.5; ctx.strokeRect(0, -7, 38, 14);
  ctx.fillStyle = '#333'; ctx.fillRect(34, -9, 8, 18); ctx.strokeRect(34, -9, 8, 18); ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, 0, 38, 30, 0, Math.PI, 0); ctx.closePath(); ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, -30, 0, '#dfe6ee', '#5c6878'); ctx.fill(); outl(ctx, 3);
  ctx.fillStyle = '#3a4250'; ctx.fillRect(-38, -4, 76, 10); ctx.strokeRect(-38, -4, 76, 10);
  ctx.beginPath(); ctx.ellipse(0, -14, 20, 7, 0, 0, TAU); ctx.fillStyle = '#220'; ctx.fill(); outl(ctx, 2);
  const eg = ctx.createRadialGradient(Math.cos(a.t * 2) * 10, -14, 1, Math.cos(a.t * 2) * 10, -14, 10);
  eg.addColorStop(0, '#fff'); eg.addColorStop(0.3, '#ff3030'); eg.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(0, -14, 19, 6, 0, 0, TAU); ctx.fill();
  for (let i = 0; i < 5; i++) { circle(ctx, -28 + i * 14, 1, 2.5); ctx.fillStyle = (Math.floor(a.t * 4) + i) % 2 ? '#ffde3a' : '#644'; ctx.fill(); }
  shine(ctx, -14, -22, 10, 4, 0.6);
};
ART.alien.psychosquid = (ctx, a) => {
  const red = a.mode === 'red';
  const c1 = red ? '#ff9aaa' : '#9ad0ff', c2 = red ? '#b0102a' : '#1b4ab0';
  if (red || a.switchT < 1) {
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, 80);
    g.addColorStop(0, red ? 'rgba(255,40,60,.45)' : 'rgba(60,150,255,.3)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; circle(ctx, 0, 0, 80); ctx.fill();
  }
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = -22 + i * 9; ctx.beginPath(); ctx.moveTo(x, 10);
    ctx.quadraticCurveTo(x + Math.sin(a.t * 5 + i) * 12, 35, x + Math.sin(a.t * 4 + i * 2) * 8, 58);
    ctx.lineWidth = 11; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 7; ctx.strokeStyle = c2; ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(-30, 14); ctx.bezierCurveTo(-40, -30, -12, -62, 0, -64); ctx.bezierCurveTo(12, -62, 40, -30, 30, 14); ctx.quadraticCurveTo(0, 24, -30, 14);
  ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, -64, 20, c1, c2); ctx.fill(); outl(ctx, 3);
  shine(ctx, -10, -40, 8, 14, 0.4, 0.2);
  drawEye(ctx, -12, -2, 10, { angry: true, lx: 0, iris: red ? '#f00' : '#111' }); drawEye(ctx, 12, -2, 10, { angry: false, lx: 0, iris: red ? '#f00' : '#111' });
  ctx.beginPath(); ctx.moveTo(-23, -14); ctx.lineTo(-2, -8); ctx.moveTo(23, -14); ctx.lineTo(2, -8); outl(ctx, 4);
  ctx.fillStyle = '#fff'; ctx.font = '900 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(red ? 'HEALS!' : 'SHOOT!', 0, -72);
};
ART.alien.leechqueen = (ctx, a) => {
  const w = Math.sin(a.t * 3) * 3;
  ctx.beginPath(); ctx.moveTo(-58, 10); ctx.quadraticCurveTo(-50, -38 + w, 0, -36); ctx.quadraticCurveTo(46, -36, 52, 0); ctx.quadraticCurveTo(46, 32, 0, 30); ctx.quadraticCurveTo(-50, 32 - w, -58, 10);
  ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, -36, 30, '#d2558f', '#4a0a2a'); ctx.fill(); outl(ctx, 3);
  ctx.strokeStyle = 'rgba(40,0,20,.4)'; ctx.lineWidth = 2;
  for (let i = -3; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 14, -32); ctx.quadraticCurveTo(i * 14 - 4, 0, i * 14, 28); ctx.stroke(); }
  circle(ctx, 46, 2, 15); ctx.fillStyle = '#2a0010'; ctx.fill(); outl(ctx, 2.5);
  ctx.fillStyle = '#fff'; for (let i = 0; i < 10; i++) { const an = i / 10 * TAU + a.t; ctx.beginPath(); ctx.moveTo(46 + Math.cos(an) * 14, 2 + Math.sin(an) * 14); ctx.lineTo(46 + Math.cos(an) * 7, 2 + Math.sin(an) * 7); ctx.lineTo(46 + Math.cos(an + 0.3) * 14, 2 + Math.sin(an + 0.3) * 14); ctx.fill(); }
  drawEye(ctx, 18, -18, 7, { angry: true, iris: '#ff0' }); drawEye(ctx, 2, -22, 6, { angry: true, iris: '#ff0' }); drawEye(ctx, 30, -6, 5, { iris: '#ff0' });
  crown(ctx, -6, -40, 1.6);
  shine(ctx, -20, -22, 18, 5, 0.35);
};
ART.alien.leech = (ctx, l) => {
  const w = Math.sin(l.t * 12) * 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 9 + w * 0.3, 4.5, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -4, 4, '#a3307a', '#3a0626'); ctx.fill(); outl(ctx, 1.8);
  circle(ctx, 8, 0, 3); ctx.fillStyle = '#200'; ctx.fill();
  circle(ctx, 3, -2, 1.3); ctx.fillStyle = '#ff0'; ctx.fill();
};
ART.alien.phantom = (ctx, a) => {
  const v = a.vis == null ? 1 : a.vis;
  ctx.globalAlpha = 0.15 + v * 0.8;
  const g = ctx.createRadialGradient(0, -10, 5, 0, 0, 60); g.addColorStop(0, 'rgba(200,220,255,.5)'); g.addColorStop(1, 'rgba(200,220,255,0)');
  ctx.fillStyle = g; circle(ctx, 0, 0, 60); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-34, 30); ctx.lineTo(-34, -6); ctx.bezierCurveTo(-34, -52, 34, -52, 34, -6); ctx.lineTo(34, 30);
  for (let i = 0; i < 6; i++) { const x = 34 - (i + 0.5) * (68 / 6); ctx.quadraticCurveTo(x + 6, 38 + Math.sin(a.t * 6 + i) * 6, x - 5.6, 30); }
  ctx.closePath(); ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, -50, 36, '#ffffff', '#a7b4e8'); ctx.fill(); outl(ctx, 3);
  ctx.fillStyle = '#1a1030';
  ctx.beginPath(); ctx.ellipse(-12, -12, 7, 11, 0.1, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(12, -12, 7, 11, -0.1, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff4a8a'; circle(ctx, -12, -9, 2.5); ctx.fill(); circle(ctx, 12, -9, 2.5); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 12, 8, 10 + Math.sin(a.t * 4) * 3, 0, 0, TAU); ctx.fillStyle = '#1a1030'; ctx.fill();
  ctx.globalAlpha = 1;
};
ART.alien.hoarder = (ctx, a) => {
  const flap = Math.sin(a.t * 5) * 14;
  const sack = 12 + Math.min(24, Math.sqrt(a.stolen || 0) * 0.6);
  ctx.beginPath(); ctx.moveTo(-36, 0); ctx.lineTo(-78, 12); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#a07010'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(40, 0); ctx.quadraticCurveTo(10, -30 - flap, -10, -60 - flap); ctx.quadraticCurveTo(-20, -20, -40, 0); ctx.quadraticCurveTo(-20, 20, -10, 60 + flap); ctx.quadraticCurveTo(10, 30 + flap, 40, 0);
  ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, -60, 60, '#fff1a0', '#b07a10'); ctx.fill(); outl(ctx, 3);
  ctx.beginPath(); ctx.ellipse(0, 0, 32, 18, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -18, 18, '#ffe066', '#c08a1a'); ctx.fill(); outl(ctx, 2.4);
  // sack
  circle(ctx, -14, -18 - sack * 0.4, sack); ctx.fillStyle = vgrad(ctx, -40, 0, '#c99a5a', '#7a5020'); ctx.fill(); outl(ctx, 2.4);
  ctx.fillStyle = '#ffe14d'; ctx.font = `900 ${sack}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$', -14, -16 - sack * 0.4);
  ctx.strokeStyle = OUT; ctx.lineWidth = 1; ctx.strokeText('$', -14, -16 - sack * 0.4); ctx.textBaseline = 'alphabetic';
  drawEye(ctx, 20, -6, 6, { angry: true, iris: '#0a0' }); drawEye(ctx, 20, 7, 6, { angry: false, iris: '#0a0' });
  ctx.beginPath(); ctx.arc(30, 0, 6, -1, 1); outl(ctx, 2);
};
ART.alien.krakenHead = (ctx, a) => {
  const r = 70, bob = Math.sin(a.t * 2) * 4;
  ctx.save(); ctx.translate(0, bob);
  ctx.beginPath(); ctx.moveTo(-r, 30); ctx.bezierCurveTo(-r, -r * 1.4, r, -r * 1.4, r, 30); ctx.closePath();
  ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, -r, 30, '#ff7aa2', '#6a1438'); ctx.fill(); outl(ctx, 3.5);
  ctx.fillStyle = 'rgba(255,255,255,.25)'; for (const [x, y, s] of [[-30, -40, 8], [25, -55, 6], [40, -20, 5], [-45, -5, 6]]) { circle(ctx, x, y, s); ctx.fill(); }
  drawEye(ctx, -26, -5, 17, { angry: true, iris: '#ffcc00', pupil: 0.4 }); drawEye(ctx, 26, -5, 17, { angry: false, iris: '#ffcc00', pupil: 0.4 });
  ctx.beginPath(); ctx.moveTo(-34, -28); ctx.lineTo(-10, -18); ctx.moveTo(34, -28); ctx.lineTo(10, -18); outl(ctx, 6);
  shine(ctx, -20, -65, 25, 8, 0.4);
  ctx.restore();
};
function drawTentacle(ctx, tn, t, flash) {
  const pts = tentaclePoints(tn, t);
  ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < pts.length - 1; i++) {
      const w = 26 - i * 2.2;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      if (pass === 0) { ctx.lineWidth = w + 6; ctx.strokeStyle = OUT; }
      else if (pass === 1) { ctx.lineWidth = w; ctx.strokeStyle = flash ? '#fff' : (tn.hp <= 0 ? '#777' : '#d2507a'); }
      else { ctx.lineWidth = w * 0.3; ctx.strokeStyle = 'rgba(255,200,220,.35)'; }
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#ffd0dc';
  for (let i = 1; i < pts.length - 1; i += 1) { circle(ctx, pts[i][0] + 6 - i * 0.5, pts[i][1], 3.5 - i * 0.25); ctx.fill(); outl(ctx, 1); }
}
function tentaclePoints(tn, t) {
  const N = 9, pts = [], h = tn.h; // h: 0..1 extension
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1);
    const sway = Math.sin(t * 2 + tn.phase + f * 3) * 40 * f;
    pts.push([tn.x + sway + (tn.reach || 0) * f * f, FLOOR + 30 - f * h * tn.len]);
  }
  return pts;
}
ART.alien.voidmaw = (ctx, a) => {
  const r = 55;
  for (let k = 0; k < 3; k++) {
    ctx.save(); ctx.rotate(a.t * (1 + k * 0.4) * (k % 2 ? -1 : 1)); ctx.globalAlpha = 0.5 - k * 0.12;
    ctx.strokeStyle = ['#b06aff', '#6a2aff', '#ff4aff'][k]; ctx.lineWidth = 6 - k;
    for (let j = 0; j < 5; j++) { ctx.rotate(TAU / 5); ctx.beginPath(); for (let s = 0; s < 30; s++) { const rr2 = r + s * 4 + k * 10, an = s * 0.12; ctx.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); } ctx.stroke(); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  circle(ctx, 0, 0, r); ctx.fillStyle = a.flash > 0 ? '#fff' : radg(ctx, 0, 0, r, '#5a2a8a', '#05000c'); ctx.fill(); outl(ctx, 3.5);
  ctx.fillStyle = '#f2f0ff';
  for (let i = 0; i < 16; i++) { const an = i / 16 * TAU - a.t * 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(an - 0.15) * r, Math.sin(an - 0.15) * r); ctx.lineTo(Math.cos(an) * (r - 14), Math.sin(an) * (r - 14)); ctx.lineTo(Math.cos(an + 0.15) * r, Math.sin(an + 0.15) * r); ctx.fill(); }
  drawEye(ctx, 0, 0, 16, { iris: '#ff2a8a', pupil: 0.45, lx: Math.cos(a.t), ly: Math.sin(a.t * 1.3) });
};
ART.alien.overlord = (ctx, a) => {
  const shielded = a.orbs && a.orbs.some(o => o.hp > 0);
  ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40, 15); ctx.lineTo(s * 70, 40 + Math.sin(a.t * 3 + s) * 8); ctx.lineTo(s * 60, 70); ctx.stroke(); }
  ctx.strokeStyle = '#9aa6b8'; ctx.lineWidth = 3.5;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 40, 15); ctx.lineTo(s * 70, 40 + Math.sin(a.t * 3 + s) * 8); ctx.lineTo(s * 60, 70); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(0, 18, 82, 22, 0, 0, TAU); ctx.fillStyle = a.flash > 0 ? '#fff' : vgrad(ctx, 0, 40, '#e6ecf4', '#4c5668'); ctx.fill(); outl(ctx, 3);
  for (let i = 0; i < 8; i++) { circle(ctx, -63 + i * 18, 22, 4); ctx.fillStyle = (Math.floor(a.t * 6) + i) % 3 === 0 ? '#5affea' : '#2a4a5a'; ctx.fill(); outl(ctx, 1.4); }
  // brain
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, -16, 46, 40, 0, Math.PI, 0); ctx.lineTo(46, 10); ctx.lineTo(-46, 10); ctx.closePath(); ctx.clip();
  ctx.beginPath(); ctx.ellipse(0, -8, 38, 30, 0, 0, TAU); ctx.fillStyle = a.flash > 0 ? '#fff' : radg(ctx, 0, -8, 38, '#ffc4dc', '#d0507e'); ctx.fill(); outl(ctx, 2.5);
  ctx.strokeStyle = '#a0305a'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-30 + i * 11, -30); ctx.bezierCurveTo(-24 + i * 11, -18, -36 + i * 11, -6, -28 + i * 11, 8); ctx.stroke(); }
  drawEye(ctx, 0, -8, 13, { angry: true, iris: '#7a00ff' });
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, -16, 46, 40, 0, Math.PI, 0); ctx.lineTo(46, 10); ctx.lineTo(-46, 10); ctx.closePath();
  ctx.fillStyle = shielded ? 'rgba(120,240,255,.28)' : 'rgba(200,230,255,.15)'; ctx.fill(); outl(ctx, 3);
  shine(ctx, -18, -40, 14, 6, 0.6);
  if (shielded) { ctx.strokeStyle = `rgba(120,240,255,${0.4 + Math.sin(a.t * 8) * 0.2})`; ctx.lineWidth = 4; circle(ctx, 0, 0, 100); ctx.stroke(); }
};
function drawOrb(ctx, x, y, t, flash) {
  const g = ctx.createRadialGradient(x, y, 2, x, y, 26); g.addColorStop(0, 'rgba(120,255,240,.8)'); g.addColorStop(1, 'rgba(120,255,240,0)');
  ctx.fillStyle = g; circle(ctx, x, y, 26); ctx.fill();
  circle(ctx, x, y, 13); ctx.fillStyle = flash ? '#fff' : radg(ctx, x, y, 13, '#e0fffb', '#1aa8a0'); ctx.fill(); outl(ctx, 2.4);
  shine(ctx, x - 3, y - 5, 4, 2, 0.8);
}
function drawMissile(ctx, m) {
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(m.vy, m.vx));
  ctx.fillStyle = `rgba(255,${150 + Math.random() * 100},0,.9)`; ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(-24 - Math.random() * 8, 0); ctx.lineTo(-14, 4); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-18, -10); ctx.lineTo(-8, -5); ctx.moveTo(-14, 5); ctx.lineTo(-18, 10); ctx.lineTo(-8, 5); ctx.fillStyle = '#c33'; ctx.fill(); outl(ctx, 1.5);
  ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(8, -5); ctx.quadraticCurveTo(16, 0, 8, 5); ctx.lineTo(-14, 5); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -5, 5, '#eee', '#888'); ctx.fill(); outl(ctx, 2);
  ctx.fillStyle = '#e22'; ctx.fillRect(2, -5, 3, 10);
  ctx.restore();
}

// ================= PETS =================
ART.pet.sluggo = (ctx, p) => {
  const st = Math.sin(p.t * 6) * 2;
  ctx.beginPath(); ctx.moveTo(-20, 8); ctx.quadraticCurveTo(-22, -2, -10, 0); ctx.lineTo(16 + st * 0.5, -2); ctx.quadraticCurveTo(24, -2, 22, 8); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -4, 8, '#c4f07a', '#6a9a2a'); ctx.fill(); outl(ctx, 2);
  ctx.beginPath(); ctx.moveTo(16, -2); ctx.lineTo(18, -14); ctx.moveTo(20, -2); ctx.lineTo(24, -12); outl(ctx, 2);
  drawEye(ctx, 18, -15, 3.5, { lx: 0.4, lid: 0.35, lidCol: '#9ac850' }); drawEye(ctx, 24, -13, 3.5, { lx: 0.4, lid: 0.35, lidCol: '#9ac850' });
  circle(ctx, -4, -8, 13); ctx.fillStyle = radg(ctx, -4, -8, 13, '#ffd08a', '#b0601a'); ctx.fill(); outl(ctx, 2.4);
  ctx.beginPath(); for (let i = 0; i < 40; i++) { const an = i * 0.3, r2 = 11 - i * 0.26; ctx.lineTo(-4 + Math.cos(an) * r2, -8 + Math.sin(an) * r2); } ctx.lineWidth = 1.6; ctx.strokeStyle = '#6a3410'; ctx.stroke();
};
ART.pet.chef = (ctx, p) => {
  const w = Math.sin(p.t * 10) * 3;
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 6, 6); ctx.lineTo(-10 + i * 6 + w * (i % 2 ? 1 : -1), 14); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.lineTo(-30, -7 + w); ctx.lineTo(-30, 7 + w); ctx.closePath(); ctx.fillStyle = '#ff9a7a'; ctx.fill(); outl(ctx, 1.8);
  ctx.beginPath(); ctx.ellipse(0, 0, 24, 9, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -9, 9, '#ffb59a', '#e0502a'); ctx.fill(); outl(ctx, 2.2);
  ctx.strokeStyle = 'rgba(150,30,0,.5)'; for (let i = -2; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 8, -8); ctx.quadraticCurveTo(i * 8 + 3, 0, i * 8, 8); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(20, -4); ctx.quadraticCurveTo(34, -24, 44, -16); ctx.moveTo(20, -2); ctx.quadraticCurveTo(36, -14, 42, -6); outl(ctx, 1.2);
  drawEye(ctx, 15, -6, 4.5, {});
  ctx.fillStyle = '#fff'; ctx.fillRect(4, -18, 14, 8); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.strokeRect(4, -18, 14, 8);
  circle(ctx, 6, -21, 5); ctx.fill(); ctx.stroke(); circle(ctx, 11, -24, 6); ctx.fill(); ctx.stroke(); circle(ctx, 16, -21, 5); ctx.fill(); ctx.stroke();
  ctx.fillRect(5, -20, 12, 8);
};
ART.pet.clam = (ctx, p) => {
  const open = p.open || 0;
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(0, 18, 24, 0); ctx.closePath(); ctx.fillStyle = vgrad(ctx, 0, 14, '#d8b4ff', '#7a4ab0'); ctx.fill(); outl(ctx, 2.4);
  if (open > 0.1) { ctx.beginPath(); ctx.ellipse(0, 0, 20, 5 * open, 0, 0, TAU); ctx.fillStyle = '#ffc4e0'; ctx.fill(); }
  ctx.save(); ctx.rotate(-open * 0.6); ctx.translate(0, 0);
  ctx.beginPath(); ctx.moveTo(-24, 0); ctx.quadraticCurveTo(-24, -22, 0, -22); ctx.quadraticCurveTo(24, -22, 24, 0); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -22, 0, '#efdcff', '#9a6ad0'); ctx.fill(); outl(ctx, 2.4);
  ctx.strokeStyle = 'rgba(80,30,120,.5)'; ctx.lineWidth = 1.5; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(i * 9, -19); ctx.stroke(); }
  drawEye(ctx, -7, -9, 4, { lx: 0, lid: open > 0.5 ? 0 : 0.4, lidCol: '#d0b0f0' }); drawEye(ctx, 7, -9, 4, { lx: 0, lid: open > 0.5 ? 0 : 0.4, lidCol: '#d0b0f0' });
  ctx.restore();
};
ART.pet.siren = (ctx, p) => {
  const sw = Math.sin(p.t * 3);
  ctx.beginPath(); ctx.moveTo(-4, 6); ctx.quadraticCurveTo(-16, 22, -30, 18 + sw * 4); ctx.lineTo(-40, 10 + sw * 6); ctx.lineTo(-38, 26 + sw * 6); ctx.lineTo(-30, 20 + sw * 4); ctx.quadraticCurveTo(-8, 28, 6, 8); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, 6, 28, '#5ae8c8', '#1a8a8a'); ctx.fill(); outl(ctx, 2.2);
  ctx.beginPath(); ctx.ellipse(1, -2, 7, 11, 0.1, 0, TAU); ctx.fillStyle = '#ffd6b8'; ctx.fill(); outl(ctx, 2);
  ctx.fillStyle = '#ff6ab0'; circle(ctx, -2, -4, 3); ctx.fill(); outl(ctx, 1); circle(ctx, 4, -4, 3); ctx.fill(); outl(ctx, 1);
  ctx.beginPath(); ctx.moveTo(-6, -22); ctx.quadraticCurveTo(-26 + sw * 3, -14, -22, 8 + sw * 3); ctx.quadraticCurveTo(-10, -4, -4, -12); ctx.closePath(); ctx.fillStyle = '#ff6a3a'; ctx.fill(); outl(ctx, 2);
  circle(ctx, 2, -20, 9); ctx.fillStyle = '#ffd6b8'; ctx.fill(); outl(ctx, 2.2);
  ctx.beginPath(); ctx.arc(1, -22, 10, Math.PI, TAU * 0.96); ctx.fillStyle = '#ff6a3a'; ctx.fill(); outl(ctx, 2);
  drawEye(ctx, 6, -20, 3, {}); ctx.beginPath(); ctx.arc(7, -16, 2.5, 0.2, 2.8); outl(ctx, 1.4);
  if (p.singT > 0) { ctx.fillStyle = '#fff'; ctx.font = '900 16px sans-serif'; ctx.fillText('♪', 14 + Math.sin(p.t * 5) * 4, -30); ctx.fillText('♫', -10, -40 + Math.sin(p.t * 4) * 4); }
};
ART.pet.nurse = (ctx, p) => {
  ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(-40, -9 + Math.sin(p.t * 5) * 3); ctx.lineTo(-40, 9 + Math.sin(p.t * 5) * 3); ctx.closePath(); ctx.fillStyle = '#8ab4d8'; ctx.fill(); outl(ctx, 2);
  ctx.beginPath(); ctx.moveTo(24, -6); ctx.lineTo(52, -10); ctx.lineTo(24, -1); ctx.closePath(); ctx.fillStyle = '#fff6d8'; ctx.fill(); outl(ctx, 1.8);
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 15, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -15, 15, '#c4ddf2', '#5a86b0'); ctx.fill(); outl(ctx, 2.4);
  ctx.save(); ctx.clip(); ctx.fillStyle = 'rgba(40,70,110,.35)'; for (const [x, y] of [[-12, -6], [-2, -9], [-18, 2], [6, -4]]) { circle(ctx, x, y, 2.5); ctx.fill(); } ctx.restore();
  drawEye(ctx, 15, -4, 4.5, {}); ctx.beginPath(); ctx.arc(20, 4, 4, 0.3, 1.6); outl(ctx, 1.5);
  ctx.fillStyle = '#fff'; ctx.fillRect(-4, -20, 16, 8); ctx.strokeStyle = OUT; ctx.lineWidth = 1.8; ctx.strokeRect(-4, -20, 16, 8);
  ctx.fillStyle = '#e22'; ctx.fillRect(2, -19, 4, 6); ctx.fillRect(0, -17, 8, 2);
};
// Scrubby: striped cleaner shrimp
ART.pet.scrub = (ctx, p) => {
  const w = Math.sin(p.t * 12) * 3;
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-8 + i * 6, 5); ctx.lineTo(-10 + i * 6 + w * (i % 2 ? 1 : -1), 12); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-27, -6 + w); ctx.lineTo(-27, 6 + w); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); outl(ctx, 1.8);
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, TAU); ctx.fillStyle = '#fff3e0'; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = '#e8402a'; for (let i = -3; i <= 3; i += 2) ctx.fillRect(i * 4, -9, 4, 18); ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, TAU); outl(ctx, 2.2);
  ctx.beginPath(); ctx.moveTo(16, -4); ctx.quadraticCurveTo(28, -22, 40, -18); ctx.moveTo(16, -2); ctx.quadraticCurveTo(30, -10, 38, -4); ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  drawEye(ctx, 13, -5, 4, {});
  ctx.fillStyle = '#7ad0ff'; ctx.beginPath(); ctx.ellipse(-2, -12, 6, 3, 0, 0, TAU); ctx.fill(); outl(ctx, 1.4);
};
ART.pet.crabby = (ctx, p) => {
  const w = Math.sin(p.t * 10) * 2;
  ctx.strokeStyle = OUT; ctx.lineWidth = 3;
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * 10, 4); ctx.lineTo(s * (18 + i * 3), 8 + i * 2 + (i % 2 ? w : -w)); ctx.lineTo(s * (20 + i * 4), 16); ctx.stroke(); }
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 20, -10); ctx.rotate(s * (0.4 + (p.jump > 0 ? 0.6 : Math.sin(p.t * 3) * 0.2)));
    ctx.beginPath(); ctx.ellipse(0, -6, 7, 9, 0, 0, TAU); ctx.fillStyle = '#ff5a3a'; ctx.fill(); outl(ctx, 2);
    ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(0, -6); ctx.lineTo(3, -14); outl(ctx, 2); ctx.restore();
  }
  ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -12, 12, '#ff8a6a', '#c02a1a'); ctx.fill(); outl(ctx, 2.4);
  ctx.beginPath(); ctx.moveTo(-5, -10); ctx.lineTo(-6, -18); ctx.moveTo(5, -10); ctx.lineTo(6, -18); outl(ctx, 2);
  drawEye(ctx, -6, -19, 4, { lx: 0, angry: true }); drawEye(ctx, 6, -19, 4, { lx: 0 });
  ctx.beginPath(); ctx.arc(0, 2, 5, 0.3, 2.8); outl(ctx, 1.6);
  shine(ctx, -5, -5, 6, 2.5, 0.5);
};
ART.pet.inky = (ctx, p) => {
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const x = -12 + i * 5; ctx.beginPath(); ctx.moveTo(x, 6);
    ctx.quadraticCurveTo(x + Math.sin(p.t * 5 + i) * 8, 16, x + Math.sin(p.t * 4 + i * 2) * 6, 26);
    ctx.lineWidth = 7; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#9a5ae0'; ctx.stroke();
  }
  ctx.beginPath(); ctx.ellipse(0, -6, 18, 17, 0, 0, TAU); ctx.fillStyle = radg(ctx, 0, -6, 18, '#d8b4ff', '#6a2ab0'); ctx.fill(); outl(ctx, 2.4);
  drawEye(ctx, -6, -4, 5, { lx: 0.3 }); drawEye(ctx, 7, -4, 5, { lx: 0.3 });
  ctx.beginPath(); ctx.arc(0, 4, 4, 0.2, 2.9); outl(ctx, 1.6);
  shine(ctx, -6, -16, 6, 3, 0.5);
};
ART.pet.midas = (ctx, p) => {
  fishBody(ctx, { L: 34, H: 24, t: p.t, c1: '#fff6a0', c2: '#e0a010', fin: '#ffd23a', belly: '#fffbe0', eyeR: 4.5, mouth: 'smile' });
  crown(ctx, 0, -15, 0.8);
  if (Math.sin(p.t * 4) > 0.5) { ctx.fillStyle = '#fff'; star(ctx, rand(-14, 14), rand(-10, 10), 3, 1.2); ctx.fill(); }
};
ART.pet.momma = (ctx, p) => {
  ctx.save(); ctx.scale(1.25, 1.25);
  ART.fish.seahorse(ctx, { t: p.t }, 0);
  ctx.restore();
  ctx.save(); ctx.translate(-4, -30); ctx.fillStyle = '#ff3d8b';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -5); ctx.lineTo(-7, 5); ctx.closePath(); ctx.fill(); outl(ctx, 1.4);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7, -5); ctx.lineTo(7, 5); ctx.closePath(); ctx.fill(); outl(ctx, 1.4); ctx.restore();
  ctx.beginPath(); ctx.ellipse(4, 2, 9, 11, 0, 0, TAU); ctx.fillStyle = 'rgba(255,200,230,.6)'; ctx.fill();
};
ART.pet.remy = (ctx, p) => {
  fishBody(ctx, { L: 44, H: 16, t: p.t, c1: '#b8c4cc', c2: '#4a5864', fin: '#7a8894', eyeR: 4, mouth: 'smile', wagSpeed: 12,
    pattern: (c, L) => { c.fillStyle = 'rgba(20,30,40,.6)'; c.fillRect(-L / 2, -1, L, 3); } });
  ctx.beginPath(); ctx.ellipse(2, -8, 10, 3, 0, 0, TAU); ctx.fillStyle = '#e0e6ea'; ctx.fill(); outl(ctx, 1.4);
  ctx.strokeStyle = '#7a8894'; ctx.lineWidth = 1; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(2 + i * 2.5, -10); ctx.lineTo(2 + i * 2.5, -6); ctx.stroke(); }
};
ART.pet.zippy = (ctx, p) => {
  fishBody(ctx, { L: 34, H: 20, t: p.t, c1: '#7a8cff', c2: '#1a1a6a', fin: '#5a6aff', eyeR: 5, mouth: 'smile', iris: '#0ff',
    pattern: (c) => { c.fillStyle = '#9ffcff'; for (let i = 0; i < 4; i++) { circle(c, -10 + i * 6, 6, 1.6); c.fill(); } } });
  const g = ctx.createRadialGradient(8, -16, 1, 8, -16, 14); g.addColorStop(0, 'rgba(160,255,255,.9)'); g.addColorStop(1, 'rgba(160,255,255,0)');
  ctx.fillStyle = g; circle(ctx, 8, -16, 14); ctx.fill();
  circle(ctx, 8, -16, 4); ctx.fillStyle = '#dff'; ctx.fill(); outl(ctx, 1.4);
};
ART.pet.nimbus = (ctx, p) => {
  const w = Math.sin(p.t * 3) * 4;
  ctx.beginPath(); ctx.moveTo(-26, 0); ctx.quadraticCurveTo(-36, -4, -42, -14 + w); ctx.quadraticCurveTo(-36, -2, -44, 6 + w); ctx.quadraticCurveTo(-34, 4, -26, 4); ctx.fillStyle = '#5a9ae0'; ctx.fill(); outl(ctx, 2);
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 19, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -19, 19, '#8ac4ff', '#2a5ab0'); ctx.fill();
  ctx.save(); ctx.clip(); ctx.beginPath(); ctx.ellipse(6, 14, 26, 10, 0, 0, TAU); ctx.fillStyle = '#e6f2ff'; ctx.fill();
  ctx.strokeStyle = 'rgba(80,120,180,.5)'; ctx.lineWidth = 1.5; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14 + i * 7, 6); ctx.lineTo(-12 + i * 7, 18); ctx.stroke(); } ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 19, 0, 0, TAU); outl(ctx, 2.4);
  drawEye(ctx, 16, -4, 4.5, {}); ctx.beginPath(); ctx.arc(22, 4, 5, 0.3, 1.8); outl(ctx, 1.6);
  ctx.strokeStyle = 'rgba(200,240,255,.8)'; ctx.lineWidth = 2; circle(ctx, 4, -26 + Math.sin(p.t * 2) * 2, 4); ctx.stroke(); circle(ctx, -2, -34, 2.5); ctx.stroke();
  shine(ctx, -6, -10, 10, 4, 0.5);
};

// ================= COINS / ITEMS =================
function star(ctx, x, y, r, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * inner : r; ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath();
}
function coinDisc(ctx, r, c1, c2, sym) {
  circle(ctx, 0, 0, r); ctx.fillStyle = radg(ctx, 0, 0, r, c1, c2); ctx.fill(); outl(ctx, 2.2);
  circle(ctx, 0, 0, r * 0.68); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.stroke();
  if (sym) { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.font = `900 ${r * 1.1}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sym, 0, 1); ctx.textBaseline = 'alphabetic'; }
  shine(ctx, -r * 0.3, -r * 0.4, r * 0.35, r * 0.18, 0.8);
}
ART.coin.silver = (ctx, c) => { ctx.scale(Math.cos(c.t * 3) * 0.3 + 0.7, 1); coinDisc(ctx, 11, '#ffffff', '#8a96a8', '$'); };
ART.coin.gold = (ctx, c) => { ctx.scale(Math.cos(c.t * 3) * 0.3 + 0.7, 1); coinDisc(ctx, 12, '#fff8b0', '#d08a10', '$'); };
ART.coin.star = (ctx, c) => {
  ctx.rotate(Math.sin(c.t * 3) * 0.3);
  star(ctx, 0, 0, 15); ctx.fillStyle = radg(ctx, 0, 0, 15, '#fffbd0', '#ffb800'); ctx.fill(); outl(ctx, 2.2);
  drawEye(ctx, -4, -2, 2.4, { lx: 0 }); drawEye(ctx, 4, -2, 2.4, { lx: 0 });
  ctx.beginPath(); ctx.arc(0, 2, 3, 0.3, 2.8); outl(ctx, 1.4);
};
ART.coin.goldbar = (ctx) => {
  ctx.beginPath(); ctx.moveTo(-15, 7); ctx.lineTo(-10, -7); ctx.lineTo(10, -7); ctx.lineTo(15, 7); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -7, 7, '#fff4a0', '#d08a10'); ctx.fill(); outl(ctx, 2.2);
  ctx.beginPath(); ctx.moveTo(-10, -7); ctx.lineTo(-7, -2); ctx.lineTo(7, -2); ctx.lineTo(10, -7); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.stroke();
  shine(ctx, -3, -5, 6, 1.5, 0.9, 0);
};
function gem(ctx, r, c1, c2) {
  ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(-r * 0.55, -r * 0.85); ctx.lineTo(r * 0.55, -r * 0.85); ctx.lineTo(r, -r * 0.3); ctx.lineTo(0, r); ctx.closePath();
  ctx.fillStyle = vgrad(ctx, -r, r, c1, c2); ctx.fill(); outl(ctx, 2.2);
  ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(r, -r * 0.3); ctx.moveTo(-r * 0.3, -r * 0.3); ctx.lineTo(0, r); ctx.lineTo(r * 0.3, -r * 0.3);
  ctx.moveTo(-r * 0.55, -r * 0.85); ctx.lineTo(-r * 0.3, -r * 0.3); ctx.moveTo(r * 0.55, -r * 0.85); ctx.lineTo(r * 0.3, -r * 0.3);
  ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
  shine(ctx, -r * 0.4, -r * 0.55, r * 0.25, r * 0.1, 0.9, 0);
}
ART.coin.diamond = (ctx, c) => { gem(ctx, 13, '#e8ffff', '#2ab0e0'); if (Math.sin(c.t * 6) > 0.8) { ctx.fillStyle = '#fff'; star(ctx, 7, -9, 5, 0.25); ctx.fill(); } };
ART.coin.emerald = (ctx, c) => { gem(ctx, 13, '#d8ffd0', '#18a040'); if (Math.sin(c.t * 6) > 0.8) { ctx.fillStyle = '#fff'; star(ctx, 7, -9, 5, 0.25); ctx.fill(); } };
ART.coin.pearl = (ctx, c) => {
  circle(ctx, 0, 0, 12); const g = ctx.createRadialGradient(-4, -4, 1, 0, 0, 12);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, `hsl(${(c.t * 60) % 360},80%,92%)`); g.addColorStop(1, '#c0b0d8');
  ctx.fillStyle = g; ctx.fill(); outl(ctx, 2); shine(ctx, -4, -5, 4, 2.5, 0.9);
};
ART.coin.chest = (ctx) => {
  ctx.fillStyle = vgrad(ctx, -4, 14, '#b0702a', '#5a3010'); ctx.fillRect(-20, -4, 40, 18); ctx.strokeStyle = OUT; ctx.lineWidth = 2.4; ctx.strokeRect(-20, -4, 40, 18);
  ctx.beginPath(); ctx.moveTo(-20, -4); ctx.quadraticCurveTo(-20, -18, 0, -18); ctx.quadraticCurveTo(20, -18, 20, -4); ctx.closePath(); ctx.fillStyle = vgrad(ctx, -18, -4, '#d08a3a', '#8a4a1a'); ctx.fill(); outl(ctx, 2.4);
  ctx.fillStyle = '#ffd23a'; ctx.fillRect(-20, -6, 40, 4); ctx.fillRect(-14, -17, 4, 31); ctx.fillRect(10, -17, 4, 31);
  ctx.fillRect(-4, -8, 8, 9); ctx.strokeRect(-4, -8, 8, 9);
  ctx.fillStyle = 'rgba(255,240,150,.8)'; ctx.fillRect(-18, -5, 36, 1.5);
};
ART.coin.shell = (ctx, c) => {
  ctx.rotate(c.t * 0.5);
  circle(ctx, 0, 0, 15); ctx.fillStyle = radg(ctx, 0, 0, 15, '#fff6e6', '#d8b88a'); ctx.fill(); outl(ctx, 2.2);
  ctx.fillStyle = 'rgba(150,100,50,.55)';
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i / 5 * TAU); ctx.beginPath(); ctx.ellipse(0, -7, 2.2, 5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  circle(ctx, 0, 0, 2); ctx.fill();
};
function drawFood(ctx, f) {
  ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.y * 0.03);
  switch (f.q) {
    case 1: ctx.beginPath(); ctx.ellipse(0, 0, 5, 4, 0, 0, TAU); ctx.fillStyle = radg(ctx, 0, 0, 5, '#d8a060', '#7a4a1a'); ctx.fill(); outl(ctx, 1.4); break;
    case 2: ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(2, -5); ctx.lineTo(6, 1); ctx.lineTo(-2, 5); ctx.closePath(); ctx.fillStyle = '#ff7a3a'; ctx.fill(); outl(ctx, 1.4); ctx.fillStyle = '#ffd03a'; circle(ctx, 0, 0, 1.5); ctx.fill(); break;
    case 3: ctx.beginPath(); ctx.ellipse(0, -2, 7, 3.5, 0, Math.PI, 0); ctx.fillStyle = '#e8a050'; ctx.fill(); outl(ctx, 1.4);
      ctx.fillStyle = '#4ac84a'; ctx.fillRect(-7, -2, 14, 2); ctx.fillStyle = '#8a3a1a'; ctx.fillRect(-6, 0, 12, 2.5);
      ctx.beginPath(); ctx.ellipse(0, 3, 7, 2.5, 0, 0, Math.PI); ctx.fillStyle = '#e8a050'; ctx.fill(); outl(ctx, 1.4); break;
    default: star(ctx, 0, 0, 7, 0.5); ctx.fillStyle = `hsl(${(performance.now() / 4) % 360},90%,65%)`; ctx.fill(); outl(ctx, 1.4);
  }
  ctx.restore();
}
function drawWaste(ctx, w) {
  ctx.save(); ctx.translate(w.x, w.y);
  ctx.fillStyle = '#6a5a2a';
  ctx.beginPath(); ctx.ellipse(0, 0, 5, 3.2, 0, 0, TAU); ctx.fill(); outl(ctx, 1.2);
  ctx.beginPath(); ctx.ellipse(1, -3, 3.5, 2.5, 0, 0, TAU); ctx.fill(); outl(ctx, 1.2);
  ctx.restore();
}
function drawHeart(ctx, x, y, s, a = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-12, -4, -6, -12, 0, -5); ctx.bezierCurveTo(6, -12, 12, -4, 0, 5);
  ctx.fillStyle = '#ff4a8a'; ctx.fill(); outl(ctx, 1.6); shine(ctx, -4, -6, 2.5, 1.5, 0.8);
  ctx.restore();
}
function drawCaptain(ctx, x, y, t) {
  ctx.save(); ctx.translate(x, y);
  // claws
  for (const s of [-1, 1]) { ctx.save(); ctx.translate(s * 26, 8); ctx.rotate(s * (0.3 + Math.sin(t * 4) * 0.15)); ctx.beginPath(); ctx.ellipse(0, -6, 8, 11, 0, 0, TAU); ctx.fillStyle = '#ff6a3a'; ctx.fill(); outl(ctx, 2); ctx.beginPath(); ctx.moveTo(-3, -16); ctx.lineTo(0, -6); ctx.lineTo(3, -16); outl(ctx, 2); ctx.restore(); }
  ctx.beginPath(); ctx.ellipse(0, 8, 24, 17, 0, 0, TAU); ctx.fillStyle = vgrad(ctx, -9, 25, '#ff9a6a', '#c0301a'); ctx.fill(); outl(ctx, 2.4);
  drawEye(ctx, -8, -8, 6, { lx: 0.2 }); drawEye(ctx, 8, -8, 6, { lx: 0.2 });
  ctx.beginPath(); ctx.moveTo(-12, 10); ctx.quadraticCurveTo(-6, 4, 0, 9); ctx.quadraticCurveTo(6, 4, 12, 10); ctx.quadraticCurveTo(6, 14, 0, 11); ctx.quadraticCurveTo(-6, 14, -12, 10);
  ctx.fillStyle = '#fff'; ctx.fill(); outl(ctx, 1.5);
  // captain hat
  ctx.beginPath(); ctx.ellipse(0, -16, 22, 5, 0, 0, TAU); ctx.fillStyle = '#1a1a2a'; ctx.fill(); outl(ctx, 2);
  ctx.beginPath(); ctx.moveTo(-16, -17); ctx.quadraticCurveTo(-14, -34, 0, -33); ctx.quadraticCurveTo(14, -34, 16, -17); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); outl(ctx, 2);
  ctx.fillStyle = '#1a1a2a'; ctx.fillRect(-15, -22, 30, 5); ctx.fillStyle = '#ffd23a'; circle(ctx, 0, -26, 3.5); ctx.fill(); outl(ctx, 1.2);
  ctx.restore();
}

// ================= BACKGROUNDS =================
const BG_CACHE = {};
function getBackground(theme) {
  if (BG_CACHE[theme]) return BG_CACHE[theme];
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const T = {
    shallows:   { w1: '#7fdcff', w2: '#1e78c0', sand1: '#ffe2a0', sand2: '#d8a85a' },
    kelp:       { w1: '#6fd8b8', w2: '#0f4a58', sand1: '#d8c68a', sand2: '#8a7a4a' },
    trench:     { w1: '#2a4a8a', w2: '#050a20', sand1: '#5a5478', sand2: '#24203a' },
    mothership: { w1: '#8a5ad0', w2: '#1a0838', sand1: '#8a94a8', sand2: '#3a4050' },
  }[theme];
  x.fillStyle = vgrad(x, HUD_H, H, T.w1, T.w2); x.fillRect(0, 0, W, H);
  // distant silhouettes
  x.fillStyle = 'rgba(0,30,60,.18)';
  x.beginPath(); x.moveTo(0, FLOOR); for (let i = 0; i <= W; i += 40) x.lineTo(i, FLOOR - 60 - Math.sin(i * 0.013) * 40 - Math.sin(i * 0.05) * 15); x.lineTo(W, FLOOR); x.fill();
  if (theme === 'mothership') {
    // panels & windows
    x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 2;
    for (let i = 0; i < W; i += 120) { x.beginPath(); x.moveTo(i, HUD_H); x.lineTo(i, FLOOR); x.stroke(); }
    for (let i = 0; i < 4; i++) { const wx = 120 + i * 230; x.fillStyle = 'rgba(0,0,0,.35)'; rr(x, wx, 160, 90, 60, 30); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; for (let s = 0; s < 12; s++) { circle(x, wx + rand(10, 80), 160 + rand(8, 52), rand(0.5, 1.5)); x.fill(); } x.strokeStyle = '#9aa6c0'; x.lineWidth = 4; rr(x, wx, 160, 90, 60, 30); x.stroke(); }
    for (const tx of [40, 920]) { x.fillStyle = vgrad(x, HUD_H, FLOOR, 'rgba(90,255,220,.5)', 'rgba(90,255,220,.15)'); x.fillRect(tx - 12, HUD_H, 24, FLOOR - HUD_H); x.strokeStyle = 'rgba(200,255,255,.5)'; x.strokeRect(tx - 12, HUD_H, 24, FLOOR - HUD_H); }
  }
  if (theme === 'trench') {
    x.fillStyle = 'rgba(255,255,255,.5)';
    for (let i = 0; i < 60; i++) { circle(x, rand(0, W), rand(HUD_H, FLOOR), rand(0.5, 1.5)); x.fill(); }
  }
  // sand
  x.beginPath(); x.moveTo(0, FLOOR + 8); for (let i = 0; i <= W; i += 20) x.lineTo(i, FLOOR + 2 + Math.sin(i * 0.02) * 6); x.lineTo(W, H); x.lineTo(0, H); x.closePath();
  x.fillStyle = vgrad(x, FLOOR - 5, H, T.sand1, T.sand2); x.fill(); x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.25)'; x.stroke();
  if (theme === 'mothership') { x.strokeStyle = 'rgba(0,0,0,.3)'; x.lineWidth = 2; for (let i = 0; i < W; i += 64) { x.beginPath(); x.moveTo(i, FLOOR + 6); x.lineTo(i, H); x.stroke(); } x.fillStyle = '#ffd23a'; for (let i = 0; i < W; i += 64) { circle(x, i + 32, FLOOR + 22, 2.5); x.fill(); } }
  else { for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${pick(['0,0,0', '255,255,255'])},${rand(0.05, 0.18)})`; circle(x, rand(0, W), rand(FLOOR + 10, H), rand(1, 3)); x.fill(); } }
  // rocks / decorations
  const rock = (rx, ry, rw, rh, col) => { x.beginPath(); x.ellipse(rx, ry, rw, rh, 0, Math.PI, 0); x.closePath(); x.fillStyle = vgrad(x, ry - rh, ry, col[0], col[1]); x.fill(); outl(x, 2.5); shine(x, rx - rw * 0.3, ry - rh * 0.6, rw * 0.3, rh * 0.15, 0.35, 0); };
  if (theme === 'shallows') {
    rock(90, FLOOR + 10, 60, 45, ['#c0b8a8', '#6a6050']); rock(850, FLOOR + 10, 80, 55, ['#c0b8a8', '#6a6050']); rock(140, FLOOR + 12, 30, 22, ['#b0a898', '#5a5040']);
    coral(x, 200, FLOOR + 6, '#ff6a8a', 1); coral(x, 780, FLOOR + 6, '#ffa03a', 1.2); coral(x, 470, FLOOR + 8, '#c86aff', 0.8); coral(x, 610, FLOOR + 6, '#ff6a8a', 0.7);
    starfish(x, 320, FLOOR + 22, '#ff7a4a'); starfish(x, 700, FLOOR + 30, '#ffd03a');
  } else if (theme === 'kelp') {
    rock(100, FLOOR + 10, 70, 50, ['#8a9a7a', '#3a4a30']); rock(870, FLOOR + 10, 70, 45, ['#8a9a7a', '#3a4a30']);
    coral(x, 520, FLOOR + 6, '#e0a03a', 0.8); starfish(x, 380, FLOOR + 24, '#ff7a4a');
  } else if (theme === 'trench') {
    rock(80, FLOOR + 10, 80, 70, ['#4a4a6a', '#14142a']); rock(880, FLOOR + 10, 90, 80, ['#4a4a6a', '#14142a']); rock(480, FLOOR + 12, 50, 30, ['#4a4a6a', '#14142a']);
    for (const [cx, cs] of [[200, 1], [700, 1.3], [560, 0.7]]) crystal(x, cx, FLOOR + 6, cs);
  } else {
    for (const px of [150, 480, 800]) { x.fillStyle = vgrad(x, FLOOR - 40, FLOOR + 10, '#c0c8d8', '#4a5468'); rr(x, px - 30, FLOOR - 30, 60, 40, 6); x.fill(); outl(x, 2.5); x.fillStyle = '#5affea'; for (let i = 0; i < 3; i++) { circle(x, px - 15 + i * 15, FLOOR - 15, 4); x.fill(); } }
  }
  // treasure chest bubbler decoration
  x.save(); x.translate(theme === 'kelp' ? 680 : 380, FLOOR + 6); ART.coin.chest(x, { t: 0 }); x.restore();
  return (BG_CACHE[theme] = c);
}
function coral(x, cx, cy, col, s) {
  x.save(); x.translate(cx, cy); x.scale(s, s);
  const br = (len, ang, w, d) => {
    if (d > 3) return; x.save(); x.rotate(ang);
    x.beginPath(); x.moveTo(0, 0); x.lineTo(0, -len); x.lineWidth = w + 4; x.strokeStyle = OUT; x.lineCap = 'round'; x.stroke(); x.lineWidth = w; x.strokeStyle = col; x.stroke();
    x.translate(0, -len); br(len * 0.7, -0.5, w * 0.75, d + 1); br(len * 0.7, 0.55, w * 0.75, d + 1); x.restore();
  };
  br(30, 0, 12, 0); x.restore();
}
function starfish(x, cx, cy, col) { x.save(); x.translate(cx, cy); x.rotate(rand(0, 1)); star(x, 0, 0, 14, 0.45); x.fillStyle = col; x.fill(); outl(x, 2); x.restore(); }
function crystal(x, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.scale(s, s);
  for (const [dx, h, a] of [[-12, 40, -0.3], [0, 60, 0], [12, 35, 0.35]]) {
    x.save(); x.rotate(a); x.beginPath(); x.moveTo(dx - 7, 0); x.lineTo(dx - 7, -h); x.lineTo(dx, -h - 12); x.lineTo(dx + 7, -h); x.lineTo(dx + 7, 0); x.closePath();
    x.fillStyle = vgrad(x, -h, 0, 'rgba(160,255,255,.9)', 'rgba(60,120,255,.6)'); x.fill(); outl(x, 2); x.restore();
  }
  x.restore();
}
// animated background bits (kelp sway, rays, glow)
function drawBgAnim(ctx, theme, t) {
  if (theme === 'shallows' || theme === 'kelp') {
    ctx.save(); ctx.globalAlpha = 0.09; ctx.fillStyle = '#fff';
    for (let i = 0; i < 5; i++) {
      const bx = 100 + i * 200 + Math.sin(t * 0.3 + i) * 40;
      ctx.beginPath(); ctx.moveTo(bx, HUD_H); ctx.lineTo(bx + 60, HUD_H); ctx.lineTo(bx - 60 + 120, FLOOR); ctx.lineTo(bx - 140, FLOOR); ctx.fill();
    }
    ctx.restore();
  }
  if (theme === 'kelp') {
    for (const [kx, kh, ph] of [[60, 380, 0], [170, 300, 1], [300, 250, 2], [610, 330, 3], [760, 420, 4], [910, 300, 5], [460, 200, 6]]) {
      ctx.beginPath(); ctx.moveTo(kx, FLOOR + 10);
      for (let i = 1; i <= 10; i++) ctx.lineTo(kx + Math.sin(t * 1.2 + ph + i * 0.5) * i * 2.5, FLOOR + 10 - kh * i / 10);
      ctx.lineWidth = 16; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 11; ctx.strokeStyle = '#3a9a3a'; ctx.stroke();
      ctx.fillStyle = '#5ac84a';
      for (let i = 2; i <= 9; i += 2) {
        const lx = kx + Math.sin(t * 1.2 + ph + i * 0.5) * i * 2.5, ly = FLOOR + 10 - kh * i / 10, s = i % 4 ? 1 : -1;
        ctx.beginPath(); ctx.ellipse(lx + s * 12, ly, 14, 5, s * 0.5, 0, TAU); ctx.fill(); outl(ctx, 1.8);
      }
    }
  }
  if (theme === 'trench') {
    for (const [mx, my, c] of [[260, FLOOR - 4, '#5affb0'], [640, FLOOR - 2, '#ff6aff'], [820, FLOOR - 8, '#5ac8ff']]) {
      const p = 0.6 + Math.sin(t * 2 + mx) * 0.4;
      const g = ctx.createRadialGradient(mx, my - 10, 1, mx, my - 10, 40 * p); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.5; ctx.fillStyle = g; circle(ctx, mx, my - 10, 40 * p); ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.ellipse(mx, my - 12, 12, 8, 0, Math.PI, 0); ctx.fillStyle = c; ctx.fill(); outl(ctx, 2);
      ctx.fillStyle = '#ddd'; ctx.fillRect(mx - 3, my - 12, 6, 12);
    }
  }
}
// Render any art function to a small standalone canvas (for menus/encyclopedia)
function renderIcon(drawFn, size = 80, scale = 1) {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d'); x.translate(size / 2, size / 2); x.scale(scale, scale);
  try { drawFn(x); } catch (e) { console.warn(e); }
  return c;
}
