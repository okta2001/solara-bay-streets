// Solara Bay Streets - state machine and main loop
import { WORLD_W, WORLD_H, BLOCK, STORY_INTRO, CONTROLS_TEXT } from './config.js';
import { clamp, dist, mulberry32 } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { City } from './city.js';
import { Car, spawnParkedAndTraffic, updateTraffic } from './vehicles.js';
import { spawnPeds } from './pedestrians.js';
import { Wanted, spawnPolice, updatePoliceCar } from './police.js';
import { MissionSystem, SPOTS } from './missions.js';
import { Combat } from './combat.js';
import { drawWorld } from './render.js';
import { drawHUD } from './hud.js';
import { saveGame, loadGame, hasSave } from './save.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 1280, H = 800;
function resize() {
  W = Math.min(window.innerWidth, 1600); H = Math.min(window.innerHeight, 1000);
  canvas.width = W; canvas.height = H;
}
window.addEventListener('resize', resize); resize();

const params = new URLSearchParams(location.search);
const scene = params.get('scene');

class Game {
  constructor() {
    this.input = new Input(canvas);
    this.audio = new AudioSys();
    this.city = new City();
    this.combat = new Combat();
    this.wanted = new Wanted();
    this.missions = new MissionSystem();
    this.cars = spawnParkedAndTraffic(this.city);
    this.peds = spawnPeds(this.city);
    this.player = { x: SPOTS.start.x, y: SPOTS.start.y + 40, angle: 0, aimAngle: 0, health: 100, cash: 120, car: null, speedWalk: 150 };
    this.camera = { x: this.player.x, y: this.player.y };
    this.state = 'menu'; // menu | playing | paused | busted | dead | complete
    this.dayTime = 0.32; this.time = 0; this.prompt = '';
    this.missionCar = null; this.rng = mulberry32(99);
    this.shootCooldown = 0; this.meleeCooldown = 0; this.overlayMsg = '';
    this.setupMissionCar();
    if (scene) this.applyScene(scene);
  }
  setupMissionCar() {
    // Mara's sedan near start, and later the Palms sports car / depot car are re-purposed
    if (this.missionCar) { const i = this.cars.indexOf(this.missionCar); if (i >= 0) this.cars.splice(i, 1); }
    const idx = this.missions.index;
    if (idx === 0) {
      this.missionCar = new Car(SPOTS.maraCar.x, SPOTS.maraCar.y, 0, 0, '#457b9d', { missionCar: true });
    } else if (idx === 2) {
      this.missionCar = new Car(SPOTS.palms.x + 24, SPOTS.palms.y, 0, 2, '#e63946', { missionCar: true });
    } else if (idx === 4) {
      this.missionCar = new Car(SPOTS.depot.x + 24, SPOTS.depot.y, 0, 2, '#fee440', { missionCar: true });
    } else this.missionCar = null;
    if (this.missionCar) this.cars.push(this.missionCar);
  }
  applyScene(name) {
    this.state = 'playing';
    if (name === 'chase') {
      this.dayTime = 0.36;
      const car = new Car(BLOCK * 3, BLOCK * 2 + 24, 0, 2, '#e63946', {});
      car.speed = 250; this.cars.push(car); this.player.car = car;
      this.player.x = car.x; this.player.y = car.y;
      this.wanted.stars = 3;
      for (let i = 0; i < 2; i++) {
        const pc = new Car(car.x - 170 - i * 110, car.y + (i ? 30 : -28), 0, 0, '#111318', { police: true });
        pc.speed = 230; this.cars.push(pc);
      }
      this.missions.index = 1; this.missions.phase = 'go'; this.missions.timer = 60;
    } else if (name === 'drive') {
      this.dayTime = 0.3;
      const car = new Car(BLOCK * 5, BLOCK * 4 + 24, 0, 0, '#2a9d8f', {});
      car.speed = 150; this.cars.push(car); this.player.car = car;
      this.player.x = car.x; this.player.y = car.y;
    } else if (name === 'foot') {
      this.dayTime = 0.34;
      this.player.x = BLOCK * 4 + 160; this.player.y = BLOCK * 3 + 160;
      for (let i = 0; i < 8; i++) {
        const p = this.peds[i]; if (p) { p.x = this.player.x + (i - 4) * 36; p.y = this.player.y + ((i % 3) - 1) * 44; }
      }
    } else if (name === 'mission') {
      this.dayTime = 0.52; // sunset
      const car = new Car(BLOCK * 6, BLOCK * 5, -0.5, 0, '#f4a261', {});
      car.speed = 170; this.cars.push(car); this.player.car = car;
      this.player.x = car.x; this.player.y = car.y;
      this.missions.index = 0; this.missions.phase = 'go';
    }
    this.camera.x = this.player.x; this.camera.y = this.player.y;
  }
  newGame() {
    const g = new Game();
    Object.assign(this, g);
    this.state = 'playing'; this.audio.ensure();
  }
  continueGame() {
    const s = loadGame();
    if (s) {
      this.player.cash = s.cash ?? 120;
      this.missions.index = s.missionIndex ?? 0;
      this.missions.complete = !!s.complete;
      if (this.missions.index >= 5) this.missions.complete = true;
      this.player.x = s.x ?? SPOTS.start.x; this.player.y = s.y ?? SPOTS.start.y;
      this.setupMissionCar();
    }
    this.state = 'playing'; this.audio.ensure();
  }
  saveNow() {
    saveGame({ cash: this.player.cash, missionIndex: this.missions.index, complete: this.missions.complete, x: Math.round(this.player.x), y: Math.round(this.player.y) });
  }
  failMission(reason) {
    this.overlayMsg = 'MISSION FAILED — ' + reason + ' Press Enter to retry.';
    this.state = 'failed';
    this.wanted.clear();
  }
  onStoryComplete() {
    this.overlayMsg = 'STORY COMPLETE! Ren paid Mara in full and kept the sunset. Free roam unlocked — side jobs pay cash.';
    this.state = 'complete';
  }
  addWanted(points, witnessed) { this.wanted.commitCrime(points, witnessed); }
  witnessesNear(x, y, range) {
    for (const p of this.peds) if (!p.dead && dist(x, y, p.x, p.y) < range) return true;
    for (const c of this.cars) if (c.isPolice && dist(x, y, c.x, c.y) < range + 80) return true;
    return false;
  }

  update(dt) {
    this.time += dt;
    this.dayTime = (this.dayTime + dt / 240) % 1;
    const p = this.player, input = this.input;
    this.shootCooldown -= dt; this.meleeCooldown -= dt;
    this.prompt = '';
    // --- traffic ---
    const obstacles = this.cars;
    for (const c of this.cars) {
      if (c.isPolice || c === p.car || c.isParked || c.dead) continue;
      if (c.isTraffic) { updateTraffic(c, dt, this.rng); c.update(dt, this.city, obstacles); }
    }
    // --- police spawning / pursuit ---
    this.cars = spawnPolice(this.cars, this.wanted.stars, p);
    let policeSees = false, nearestPolice = 9999;
    for (const c of this.cars) {
      if (!c.isPolice || c.dead) continue;
      const d = updatePoliceCar(c, dt, p, !!p.car);
      c.update(dt, this.city, obstacles);
      nearestPolice = Math.min(nearestPolice, d);
      if (d < 330) policeSees = true;
      // ram damage to player car / player
      if (p.car && dist(c.x, c.y, p.car.x, p.car.y) < 34 && Math.abs(c.speed) > 60) {
        p.car.health -= 12 * dt * 4; this.combat.crashFx(p.car.x, p.car.y, 120); this.audio.crash();
        if (this.rng() < dt * 2) this.addWanted(0.4, true);
      }
      if (!p.car && d < 26) { p.health -= 20 * dt; }
    }
    // remove far excess police when wanted drops
    if (this.wanted.stars === 0) this.cars = this.cars.filter((c) => !c.isPolice || dist(c.x, c.y, p.x, p.y) < 700);
    this.wanted.update(dt, policeSees);
    // bust meter
    const slowOrFoot = !p.car || Math.abs(p.car.speed) < 25;
    if (this.wanted.stars > 0 && nearestPolice < 95 && slowOrFoot) this.wanted.bust += dt / 2.2;
    else this.wanted.bust = Math.max(0, this.wanted.bust - dt * 1.4);
    if (this.wanted.bust >= 1) { this.state = 'busted'; this.audio.crash(); return; }
    // --- player ---
    if (p.car) {
      const fx = { skid: (car) => this.combat.skid(car), crash: (car, sp) => { this.combat.crashFx(car.x, car.y, sp); this.audio.crash(); if (sp > 170) this.addWanted(1, this.witnessesNear(car.x, car.y, 200)); } };
      p.car.drive(dt, input, this.city, fx);
      p.x = p.car.x; p.y = p.car.y; p.angle = p.car.angle;
      // hitting peds / cars while driving
      for (const ped of this.peds) {
        if (ped.dead) continue;
        if (dist(p.car.x, p.car.y, ped.x, ped.y) < 24 && Math.abs(p.car.speed) > 40) {
          ped.health -= 40; if (ped.health <= 0) ped.dead = true;
          this.combat.burst(ped.x, ped.y, '#ef476f', 10); this.audio.crash();
          this.addWanted(3, true);
        }
      }
      for (const c of this.cars) {
        if (c === p.car || c.dead) continue;
        if (dist(p.car.x, p.car.y, c.x, c.y) < 32 && Math.abs(p.car.speed) > 50) {
          c.health -= 14; this.combat.crashFx(c.x, c.y, Math.abs(p.car.speed));
          if (this.rng() < 0.3) this.addWanted(1, this.witnessesNear(c.x, c.y, 220));
          p.car.speed *= 0.55;
        }
      }
      if (input.pressed('KeyE')) {
        const doorX = p.car.x - Math.sin(p.car.angle) * 26, doorY = p.car.y + Math.cos(p.car.angle) * 26;
        if (!this.city.collides(doorX, doorY, 9)) { p.x = doorX; p.y = doorY; }
        p.car.isParked = true; p.car.targetSpeed = 0; p.car = null;
      }
      if (p.car && p.car.health <= 0) { p.car.dead = true; p.health -= 15; const cc = p.car; p.x = cc.x + 30; p.y = cc.y; p.car = null; }
    } else {
      const sprint = input.down('ShiftLeft') || input.down('ShiftRight');
      const sp = p.speedWalk * (sprint ? 1.65 : 1);
      const mx = input.axisX(), my = input.axisY();
      if (mx || my) {
        const len = Math.hypot(mx, my); const vx = (mx / len) * sp, vy = (my / len) * sp;
        if (!this.city.collides(p.x + vx * dt, p.y, 9)) p.x += vx * dt;
        if (!this.city.collides(p.x, p.y + vy * dt, 9)) p.y += vy * dt;
        p.angle = Math.atan2(my, mx);
      }
      p.x = clamp(p.x, 12, WORLD_W - 12); p.y = clamp(p.y, 12, WORLD_H - 12);
      // nearest car prompt
      let best = null, bd = 52;
      for (const c of this.cars) { if (c.dead) continue; const d = dist(p.x, p.y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
      if (best) {
        this.prompt = best.isPolice ? '[E] Steal police car' : '[E] Steal / enter car';
        if (input.pressed('KeyE')) {
          const wasParked = best.isParked || !best.isTraffic;
          p.car = best; best.isParked = false; best.isTraffic = false;
          if (best.isMissionCar) { /* expected */ }
          else if (wasParked || best.isPolice) this.addWanted(2, this.witnessesNear(p.x, p.y, 190));
          this.audio.pickup();
        }
      }
      // combat on foot
      p.aimAngle = Math.atan2(input.mouse.y - H / 2, input.mouse.x - W / 2);
      if (input.mouse.down && this.shootCooldown <= 0) {
        this.shootCooldown = 0.22;
        this.combat.shoot(p.x, p.y, p.aimAngle, this.audio);
        this.addWanted(2, this.witnessesNear(p.x, p.y, 260));
      }
      if (input.pressed('KeyF') && this.meleeCooldown <= 0) {
        this.meleeCooldown = 0.35;
        const targets = [...this.peds, ...this.cars.filter((c) => c.isPolice)];
        this.combat.melee(p.x, p.y, p.aimAngle, targets, this.audio, (t) => {
          this.addWanted(t.isPolice ? 2 : 1, this.witnessesNear(p.x, p.y, 180));
        });
      }
      // ped attacks back rarely if player is wanted and close to police on foot handled above
    }
    // bullets vs targets
    const targets = [...this.peds, ...this.cars];
    this.combat.update(dt, this.city, targets, (t) => {
      if (t.isPolice) this.addWanted(3, true);
      else if (t.health !== undefined && t.name !== undefined) this.addWanted(3, true);
    });
    // fx helpers for driving crashes
    this.fx = { skid: (car) => this.combat.skid(car), crash: (car, sp) => this.combat.crashFx(car.x, car.y, sp) };
    // peds update
    const danger = { x: p.x, y: p.y, level: (p.car && Math.abs(p.car.speed) > 130) || this.wanted.stars > 0 ? 1 : 0 };
    for (const ped of this.peds) ped.update(dt, this.city, danger);
    // missions
    this.missions.update(dt, this);
    if (this.missionCar && this.missions.phase === 'brief') { /* marker handles guidance */ }
    const prevIdx = this._lastMissionIdx;
    if (prevIdx !== undefined && prevIdx !== this.missions.index) this.setupMissionCar();
    this._lastMissionIdx = this.missions.index;
    // side job trigger: press Q near depot after mission 2
    if (this.missions.sideJobsUnlocked && !this.missions.sideJob && !this.missions.current === false) { /* passive */ }
    if (this.missions.sideJobsUnlocked && !this.missions.sideJob && input.pressed('KeyQ')) {
      this.missions.startSideJob(this.rng);
    }
    if (this.missions.sideJobsUnlocked && !this.missions.sideJob) this.prompt = this.prompt || '[Q] Take a parcel side job';
    // health / death
    if (p.health <= 0) { this.state = 'dead'; return; }
    p.health = Math.min(100, p.health + dt * 1.2);
    // camera
    this.camera.x += (p.x - this.camera.x) * Math.min(1, dt * 5);
    this.camera.y += (p.y - this.camera.y) * Math.min(1, dt * 5);
    // audio
    const sr = p.car ? Math.abs(p.car.speed) / 360 : 0;
    this.audio.update(dt, sr, nearestPolice < 420 && this.wanted.stars > 0, true);
  }

  render() {
    ctx.fillStyle = '#87b5d6'; ctx.fillRect(0, 0, W, H);
    if (this.state === 'menu') { this.renderWorldBehindMenu(); this.drawMenu(); return; }
    drawWorld(ctx, this, W, H);
    drawHUD(ctx, W, H, this);
    if (this.state === 'paused') this.drawOverlay('PAUSED', 'Esc / P to resume. Your progress auto-saves at mission milestones.');
    if (this.state === 'busted') this.drawOverlay('BUSTED', `The Solara Bay police got Ren. Fine paid: $${Math.min(this.player.cash, 200 + this.wanted.stars * 100)}. Press Enter to continue.`);
    if (this.state === 'dead') this.drawOverlay('WASTED — HOSPITAL', 'Ren woke up at Solara General. Fee: $150. Press Enter to respawn.');
    if (this.state === 'failed') this.drawOverlay('MISSION FAILED', this.overlayMsg);
    if (this.state === 'complete') this.drawOverlay('STORY COMPLETE', this.overlayMsg + ' Press Enter to free roam.');
  }
  renderWorldBehindMenu() {
    this.camera.x = BLOCK * 3; this.camera.y = BLOCK * 3;
    drawWorld(ctx, this, W, H);
  }
  drawOverlay(title, text) {
    ctx.fillStyle = 'rgba(4,8,20,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 44px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(title, W / 2, H / 2 - 30);
    ctx.font = '17px system-ui'; ctx.fillStyle = '#dbeafe';
    wrapLines(ctx, text, W / 2, H / 2 + 12, 640);
    ctx.textAlign = 'left';
  }
  drawMenu() {
    ctx.fillStyle = 'rgba(6,10,26,0.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 58px system-ui';
    ctx.fillText('SOLARA BAY', W / 2, 130);
    ctx.fillStyle = '#2ec4b6'; ctx.font = 'bold 40px system-ui';
    ctx.fillText('S T R E E T S', W / 2, 178);
    ctx.fillStyle = '#f1faee'; ctx.font = '16px system-ui';
    wrapLines(ctx, STORY_INTRO, W / 2, 226, 620);
    ctx.font = '15px system-ui'; ctx.fillStyle = '#cfe8ff';
    CONTROLS_TEXT.forEach((line, i) => ctx.fillText(line, W / 2, 330 + i * 22));
    // buttons
    this.buttons = [
      { label: '▶  NEW GAME', x: W / 2 - 130, y: 520, w: 260, h: 48, action: 'new' },
      { label: hasSave() ? '↻  CONTINUE' : '↻  CONTINUE (no save)', x: W / 2 - 130, y: 582, w: 260, h: 48, action: 'continue' },
    ];
    for (const b of this.buttons) {
      const hover = this.input.mouse.x >= b.x && this.input.mouse.x <= b.x + b.w && this.input.mouse.y >= b.y && this.input.mouse.y <= b.y + b.h;
      ctx.fillStyle = hover ? '#2ec4b6' : 'rgba(46,196,182,0.25)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#2ec4b6'; ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 18px system-ui';
      ctx.fillText(b.label, W / 2, b.y + 31);
    }
    ctx.font = '13px system-ui'; ctx.fillStyle = '#9fb3c8';
    ctx.fillText('An original game — every name, street and sound invented for Solara Bay.', W / 2, H - 28);
    ctx.textAlign = 'left';
  }
  handleClick() {
    if (this.state !== 'menu' || !this.buttons) return;
    for (const b of this.buttons) {
      const m = this.input.mouse;
      if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) {
        if (b.action === 'new') this.newGame(); else this.continueGame();
      }
    }
  }
}

function wrapLines(c, text, cx, y, maxW) {
  const words = text.split(' '); let line = '', yy = y;
  c.textAlign = 'center';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) { c.fillText(line, cx, yy); line = w; yy += 22; }
    else line = test;
  }
  if (line) c.fillText(line, cx, yy);
  c.textAlign = 'left';
}

const game = new Game();
window.__game = game;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  const input = game.input;
  if (input.mouse.clicked) { game.audio.ensure(); game.handleClick(); }
  if (game.state === 'playing') {
    if (input.pressed('Escape') || input.pressed('KeyP')) game.state = 'paused';
    else game.update(dt);
  } else if (game.state === 'paused') {
    if (input.pressed('Escape') || input.pressed('KeyP')) game.state = 'playing';
  } else if (game.state === 'busted' && input.pressed('Enter')) {
    const fine = Math.min(game.player.cash, 200 + game.wanted.stars * 100);
    game.player.cash -= fine; game.wanted.clear();
    game.cars = game.cars.filter((c) => !c.isPolice);
    game.player.car = null; game.player.health = 80;
    game.player.x = SPOTS.start.x; game.player.y = SPOTS.start.y;
    if (game.missions.current && game.missions.current.id !== 4) { /* arrest during a mission fails it except the scripted one */ }
    game.state = 'playing'; game.saveNow();
  } else if (game.state === 'dead' && input.pressed('Enter')) {
    game.player.cash = Math.max(0, game.player.cash - 150);
    game.player.health = 100; game.wanted.clear();
    game.cars = game.cars.filter((c) => !c.isPolice);
    game.player.car = null; game.player.x = SPOTS.start.x; game.player.y = SPOTS.start.y;
    game.state = 'playing'; game.saveNow();
  } else if ((game.state === 'failed' || game.state === 'complete') && input.pressed('Enter')) {
    if (game.state === 'failed') { game.missions.phase = 'brief'; game.setupMissionCar(); }
    game.state = 'playing';
  }
  if (input.pressed('KeyM')) { game.audio.ensure(); game.audio.setMuted(!game.audio.muted); }
  game.render();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
