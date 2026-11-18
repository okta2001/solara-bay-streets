// HUD and minimap drawn on canvas
import { WORLD_W, WORLD_H, BLOCK } from './config.js';
import { clamp } from './random.js';

export function drawHUD(ctx, W, H, game) {
  const p = game.player;
  ctx.save();
  // health bar
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(14, 14, 224, 52);
  ctx.fillStyle = '#222'; ctx.fillRect(22, 22, 200, 14);
  ctx.fillStyle = p.health > 30 ? '#4ade80' : '#ef4444';
  ctx.fillRect(22, 22, 200 * clamp(p.health, 0, 100) / 100, 14);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`$${p.cash}`, 22, 58);
  ctx.fillStyle = '#ffd166'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(p.car ? `Speed ${Math.abs(Math.round(p.car.speed * 0.36))} km/h` : 'On foot', 110, 58);
  // wanted stars top-right
  ctx.font = '26px system-ui, sans-serif'; ctx.textAlign = 'right';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < game.wanted.stars ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', W - 16 - (4 - i) * 30, 40);
  }
  ctx.textAlign = 'left';
  // bust meter
  if (game.wanted.bust > 0.02) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - 110, 64, 220, 20);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(W / 2 - 106, 68, 212 * clamp(game.wanted.bust, 0, 1), 12);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('BUSTED?', W / 2, 60); ctx.textAlign = 'left';
  }
  // objective bar bottom-center
  const obj = game.missions.objectiveText();
  ctx.font = '15px system-ui, sans-serif';
  const tw = Math.min(W - 40, ctx.measureText(obj).width + 32);
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect((W - tw) / 2, H - 44, tw, 30);
  ctx.fillStyle = '#ffe8a3'; ctx.textAlign = 'center'; ctx.fillText(obj, W / 2, H - 24); ctx.textAlign = 'left';
  // mission message toast
  if (game.missions.msgTimer > 0 && game.missions.message) {
    ctx.font = 'bold 17px system-ui, sans-serif';
    const mw = Math.min(W - 40, ctx.measureText(game.missions.message).width + 36);
    ctx.fillStyle = 'rgba(10,20,40,0.85)'; ctx.fillRect((W - mw) / 2, 92, mw, 36);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(game.missions.message, W / 2, 116); ctx.textAlign = 'left';
  }
  // briefing panel
  const m = game.missions.current;
  if (m && game.missions.phase === 'brief' && game.state === 'playing') {
    ctx.fillStyle = 'rgba(8,12,28,0.82)'; ctx.fillRect(W / 2 - 300, H - 190, 600, 130);
    ctx.strokeStyle = '#2ec4b6'; ctx.strokeRect(W / 2 - 300, H - 190, 600, 130);
    ctx.fillStyle = '#2ec4b6'; ctx.font = 'bold 16px system-ui'; ctx.fillText(`MISSION ${m.id} — ${m.title}  ($${m.reward})`, W / 2 - 284, H - 162);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '14px system-ui';
    wrapText(ctx, m.brief, W / 2 - 284, H - 136, 568, 19);
  }
  // interact prompt
  if (game.prompt) {
    ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; const pw = ctx.measureText(game.prompt).width + 30;
    ctx.fillRect(W / 2 - pw / 2, H - 92, pw, 28);
    ctx.fillStyle = '#fff'; ctx.fillText(game.prompt, W / 2, H - 72); ctx.textAlign = 'left';
  }
  drawMinimap(ctx, W, H, game);
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' '); let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawMinimap(ctx, W, H, game) {
  const S = 168, x0 = W - S - 14, y0 = H - S - 56;
  const sx = S / WORLD_W, sy = S / WORLD_H;
  ctx.save();
  ctx.fillStyle = 'rgba(20,26,38,0.88)'; ctx.fillRect(x0 - 4, y0 - 4, S + 8, S + 8);
  ctx.fillStyle = '#3d4a3a'; ctx.fillRect(x0, y0, S, S);
  // roads
  ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 3; ctx.beginPath();
  for (let c = 0; c <= 10; c++) { ctx.moveTo(x0 + c * BLOCK * sx, y0); ctx.lineTo(x0 + c * BLOCK * sx, y0 + S); }
  for (let r = 0; r <= 8; r++) { ctx.moveTo(x0, y0 + r * BLOCK * sy); ctx.lineTo(x0 + S, y0 + r * BLOCK * sy); }
  ctx.stroke();
  // police blips
  for (const c of game.cars) {
    if (!c.isPolice || c.dead) continue;
    ctx.fillStyle = (Math.floor(performance.now() / 300) % 2) ? '#3b82f6' : '#ef4444';
    ctx.fillRect(x0 + c.x * sx - 2, y0 + c.y * sy - 2, 5, 5);
  }
  // mission marker
  const mk = game.missions.marker();
  if (mk) {
    ctx.fillStyle = '#ffd60a'; ctx.beginPath();
    ctx.arc(x0 + mk.x * sx, y0 + mk.y * sy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.stroke();
  }
  // player arrow
  const p = game.player; const px = x0 + p.x * sx, py = y0 + p.y * sy;
  ctx.translate(px, py); ctx.rotate(p.angle);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
}
