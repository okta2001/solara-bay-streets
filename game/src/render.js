// World rendering: city, cars, peds, effects, day-cycle lighting
import { BLOCK, ROAD, WORLD_W, WORLD_H } from './config.js';

export function dayPalette(t) {
  // t in [0,1) over ~4 minutes; returns sky tint + darkness overlay alpha
  const phase = t * Math.PI * 2;
  const day = Math.max(0, Math.sin(phase - 0.4)); // 0 night .. 1 noon
  return { darkness: 0.42 * (1 - day), warm: Math.max(0, 1 - Math.abs(day - 0.35) * 3) };
}

export function drawWorld(ctx, game, W, H) {
  const cam = game.camera;
  const shakeX = (Math.random() - 0.5) * game.combat.shake;
  const shakeY = (Math.random() - 0.5) * game.combat.shake;
  const ox = -cam.x + W / 2 + shakeX, oy = -cam.y + H / 2 + shakeY;
  ctx.save(); ctx.translate(ox, oy);
  const vx0 = cam.x - W / 2 - 80, vy0 = cam.y - H / 2 - 80, vx1 = cam.x + W / 2 + 80, vy1 = cam.y + H / 2 + 80;
  // ground
  ctx.fillStyle = '#5d8a4a'; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // water hint at south edge (the bay)
  ctx.fillStyle = '#2a9d8f'; ctx.fillRect(vx0, WORLD_H - 30, vx1 - vx0, 60);
  // blocks / sidewalks
  ctx.fillStyle = '#b8b2a7';
  for (let c = 0; c < 10; c++) for (let r = 0; r < 8; r++) {
    const x = c * BLOCK + ROAD / 2 - 8, y = r * BLOCK + ROAD / 2 - 8;
    if (x > vx1 || y > vy1 || x + BLOCK > vx1 + 9999) { /* still draw nearby */ }
    if (x + BLOCK < vx0 || y + BLOCK < vy0 || x > vx1 || y > vy1) continue;
    ctx.fillRect(x, y, BLOCK - ROAD + 16, BLOCK - ROAD + 16);
  }
  // plazas
  for (const pl of game.city.plazas) {
    ctx.fillStyle = '#d9c9a3'; ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
    ctx.fillStyle = '#2ec4b6'; ctx.beginPath(); ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, 26, 0, Math.PI * 2); ctx.fill();
  }
  // roads
  ctx.fillStyle = '#3a3f44';
  for (let c = 0; c <= 10; c++) ctx.fillRect(c * BLOCK - ROAD / 2, Math.max(0, vy0), ROAD, vy1 - vy0);
  for (let r = 0; r <= 8; r++) ctx.fillRect(Math.max(0, vx0), r * BLOCK - ROAD / 2, vx1 - vx0, ROAD);
  // lane dashes
  ctx.strokeStyle = 'rgba(255,214,10,0.55)'; ctx.lineWidth = 3; ctx.setLineDash([22, 26]); ctx.beginPath();
  for (let c = 0; c <= 10; c++) { ctx.moveTo(c * BLOCK, vy0); ctx.lineTo(c * BLOCK, vy1); }
  for (let r = 0; r <= 8; r++) { ctx.moveTo(vx0, r * BLOCK); ctx.lineTo(vx1, r * BLOCK); }
  ctx.stroke(); ctx.setLineDash([]);
  // skid marks
  ctx.fillStyle = 'rgba(20,20,20,0.5)';
  for (const s of game.combat.skids) ctx.fillRect(s.x - 3, s.y - 3, 6, 6);
  // building shadows then buildings
  for (const b of game.city.buildings) {
    if (b.x > vx1 || b.y > vy1 || b.x + b.w < vx0 || b.y + b.h < vy0) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(b.x + 9, b.y + 11, b.w, b.h);
  }
  for (const b of game.city.buildings) {
    if (b.x > vx1 || b.y > vy1 || b.x + b.w < vx0 || b.y + b.h < vy0) continue;
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(b.x, b.y, b.w, 7);
    ctx.fillStyle = 'rgba(255,255,220,0.5)';
    const cols = Math.max(1, Math.floor(b.w / 22)), rows = Math.max(1, Math.floor(b.h / 22));
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      if ((i * 7 + j * 13 + b.floors) % 3 === 0) ctx.fillRect(b.x + 6 + i * 22, b.y + 10 + j * 22, 9, 9);
    }
  }
  // trees (palms)
  for (const t of game.city.trees) {
    if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
    ctx.strokeStyle = '#7a5c3e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + 3, t.y - 6); ctx.stroke();
    ctx.fillStyle = '#2e933c'; ctx.beginPath(); ctx.arc(t.x + 3, t.y - 8, t.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3fa34d'; ctx.beginPath(); ctx.arc(t.x - 3, t.y - 4, t.r * 0.7, 0, Math.PI * 2); ctx.fill();
  }
  // lamps
  ctx.fillStyle = '#ffd60a';
  for (const l of game.city.lamps) { if (l.x < vx0 || l.x > vx1 || l.y < vy0 || l.y > vy1) continue; ctx.fillRect(l.x - 2, l.y - 2, 4, 4); }
  // district labels
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
  for (const d of game.city.districtLabels) ctx.fillText(d.name, d.x, d.y);
  ctx.textAlign = 'left';
  // mission marker beam
  const mk = game.missions.marker();
  if (mk) {
    const pulse = 1 + Math.sin(performance.now() / 220) * 0.15;
    ctx.fillStyle = 'rgba(255,214,10,0.25)'; ctx.beginPath(); ctx.arc(mk.x, mk.y, 46 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.arc(mk.x, mk.y, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', mk.x, mk.y + 5); ctx.textAlign = 'left';
  }
  // cars
  for (const c of game.cars) drawCar(ctx, c, game);
  // peds
  for (const p of game.peds) {
    if (p.dead) { ctx.fillStyle = 'rgba(120,20,20,0.7)'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); continue; }
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(p.x + 2, p.y + 3, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2c99a'; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 4.5, 0, Math.PI * 2); ctx.fill();
    if (p.state === 'flee') { ctx.fillStyle = '#fff'; ctx.font = 'bold 12px system-ui'; ctx.fillText('!', p.x - 2, p.y - 14); }
  }
  // player (on foot)
  const pl = game.player;
  if (!pl.car) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(pl.x + 2, pl.y + 4, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#264653'; ctx.beginPath(); ctx.arc(pl.x, pl.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.arc(pl.x, pl.y, 6, 0, Math.PI * 2); ctx.fill();
    // aim line + gun
    const aim = pl.aimAngle;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(pl.x, pl.y); ctx.lineTo(pl.x + Math.cos(aim) * 18, pl.y + Math.sin(aim) * 18); ctx.stroke();
    if (game.combat.muzzle > 0) {
      ctx.fillStyle = '#ffd60a'; ctx.beginPath();
      ctx.arc(pl.x + Math.cos(aim) * 24, pl.y + Math.sin(aim) * 24, 7, 0, Math.PI * 2); ctx.fill();
    }
  }
  // bullets
  ctx.strokeStyle = '#ffe08a'; ctx.lineWidth = 2;
  for (const b of game.combat.bullets) { ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016); ctx.stroke(); }
  // particles
  for (const p of game.combat.particles) { ctx.globalAlpha = Math.max(0, p.life * 2); ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  ctx.globalAlpha = 1;
  ctx.restore();
  // day-cycle lighting overlay
  const pal = dayPalette(game.dayTime);
  if (pal.darkness > 0.02) { ctx.fillStyle = `rgba(8,10,40,${pal.darkness.toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  if (pal.warm > 0.05) { ctx.fillStyle = `rgba(255,140,50,${(pal.warm * 0.13).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
}

export function drawCar(ctx, c, game) {
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.angle);
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-c.w / 2 + 3, -c.h / 2 + 4, c.w, c.h);
  ctx.fillStyle = c.dead ? '#333' : c.color; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
  if (c.isPolice) {
    ctx.fillStyle = '#f8f9fa'; ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    ctx.fillStyle = '#111318'; ctx.fillRect(-6, -c.h / 2, 14, c.h);
    const flash = Math.floor(performance.now() / 220 + c.sirenPhase) % 2 === 0;
    ctx.fillStyle = flash ? '#ef476f' : '#4361ee';
    ctx.fillRect(-4, -5, 9, 10);
    ctx.fillStyle = flash ? '#4361ee' : '#ef476f';
    ctx.fillRect(-13, -5, 7, 10);
  }
  ctx.fillStyle = 'rgba(140,220,255,0.85)';
  ctx.fillRect(2, -c.h / 2 + 4, 10, c.h - 8); // windshield
  ctx.fillRect(-c.w / 2 + 6, -c.h / 2 + 4, 7, c.h - 8); // rear window
  ctx.fillStyle = '#151515';
  ctx.fillRect(-c.w / 2 + 3, -c.h / 2 - 2, 9, 5); ctx.fillRect(-c.w / 2 + 3, c.h / 2 - 3, 9, 5);
  ctx.fillRect(c.w / 2 - 12, -c.h / 2 - 2, 9, 5); ctx.fillRect(c.w / 2 - 12, c.h / 2 - 3, 9, 5);
  if (c.health < 45) { ctx.fillStyle = 'rgba(60,60,60,0.6)'; ctx.beginPath(); ctx.arc(0, 0, 10 + (45 - c.health) * 0.2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  if (c.isMissionCar) {
    ctx.fillStyle = '#ffd60a'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('▼ MARA\'S CAR' , c.x, c.y - 26); ctx.textAlign = 'left';
  }
}
