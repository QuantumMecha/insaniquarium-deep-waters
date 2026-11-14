'use strict';
// ---- App flow, input, main loop ----
const App = { state: 'menu', paused: false };
const GAME_SPEED = 1.2; // whole simulation runs 20% faster than real time
const wrap = document.getElementById('wrap');

function clearFx() { for (const k in FX) FX[k] = []; }
function toMenu(silent) {
  if (App.state === 'play' && G && !G.demo && !G.done) { Save.p.run = G; Save.write(); }
  App.state = 'menu'; App.paused = false; clearFx(); makeDemo();
  if (!silent) UI.title();
}
function startLevel(idx, force) {
  const go = () => {
    clearFx();
    newRun(idx, { pets: Save.p.chosenPets.slice(0, Save.petSlots()), fish: Save.p.endlessFish || [] });
    App.state = 'play'; App.paused = false;
    Save.p.run = G; Save.write(); UI.hide(); Sfx.init();
  };
  if (Save.p.run && !force) UI.confirm('You have a saved game in progress. Abandon it and start this one?', go);
  else go();
}
function resumeRun() {
  if (!Save.p.run) return;
  G = Save.p.run; G.done = false;
  App.state = 'play'; App.paused = false; clearFx(); UI.hide();
  say(G.endless ? 'Welcome back! The aliens waited for you.' : 'Welcome back, captain! Right where you left off.', 4);
}
function pauseGame() {
  if (App.state !== 'play' || !G || G.done || App.paused) return;
  App.paused = true; Save.p.run = G; Save.write(); UI.pause();
}
function unpause() { App.paused = false; UI.hide(); }

// ---------- input ----------
function toGame(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  Sfx.init();
  const [x, y] = toGame(e);
  Input.x = x; Input.y = y;
  if (App.state !== 'play' || App.paused || !G || G.done) return;
  if (y < HUD_H) {
    for (let i = 0; i < 9; i++) if (x >= slotX(i) && x <= slotX(i) + SLOT_W) { buySlot(i); return; }
    return;
  }
  if (x >= MENU_BTN.x && x <= MENU_BTN.x + MENU_BTN.w && y >= MENU_BTN.y && y <= MENU_BTN.y + MENU_BTN.h) { pauseGame(); return; }
  tankClick(x, y);
});
canvas.addEventListener('pointermove', e => {
  const [x, y] = toGame(e);
  Input.x = x; Input.y = y;
  hoverSlot = -1; hoverMenu = false;
  if (App.state !== 'play' || !G || G.demo) return;
  if (y < HUD_H) { for (let i = 0; i < 9; i++) if (x >= slotX(i) && x <= slotX(i) + SLOT_W && y >= SLOT_Y && y <= SLOT_Y + SLOT_H) hoverSlot = i; }
  hoverMenu = x >= MENU_BTN.x && x <= MENU_BTN.x + MENU_BTN.w && y >= MENU_BTN.y && y <= MENU_BTN.y + MENU_BTN.h;
  canvas.style.cursor = hoverSlot >= 0 || hoverMenu ? 'pointer' : G.aliens.length ? 'crosshair' : 'default';
});
canvas.addEventListener('pointerleave', () => { hoverSlot = -1; hoverMenu = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (App.state !== 'play' || !G || G.done) return;
  if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') { App.paused ? unpause() : pauseGame(); e.preventDefault(); return; }
  if (App.paused) return;
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) buySlot(n - 1);
});
// save when leaving / hiding the page
function saveNow() { if (App.state === 'play' && G && !G.demo && !G.done) Save.p.run = G; Save.write(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { saveNow(); pauseGame(); } });
window.addEventListener('pagehide', saveNow);
window.addEventListener('beforeunload', saveNow);

function fit() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  wrap.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);

// ---------- loop ----------
let last = performance.now(), T = 0;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; T += dt;
  try {
    if (!(App.state === 'play' && App.paused)) { if (G) updateGame(dt * GAME_SPEED); updateFx(dt * GAME_SPEED); }
    render(T);
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}

Save.load();
fit();
makeDemo();
UI.title();
requestAnimationFrame(frame);
