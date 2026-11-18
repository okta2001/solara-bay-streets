// Melee and pistol combat, bullets, particles, screen shake, skid marks
import { dist } from './random.js';

export class Combat {
  constructor() {
    this.bullets = []; this.particles = []; this.skids = [];
    this.shake = 0; this.muzzle = 0; this.tracers = [];
  }
  shoot(x, y, angle, audio) {
    this.bullets.push({ x, y, vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900, life: 0.6 });
    this.muzzle = 0.06; this.shake = Math.max(this.shake, 2);
    if (audio) audio.gunshot();
  }
  melee(x, y, angle, targets, audio, onHit) {
    if (audio) audio.punch();
    for (const t of targets) {
      if (t.dead) continue;
      if (dist(x, y, t.x, t.y) < 42) {
        const ta = Math.atan2(t.y - y, t.x - x);
        let diff = Math.abs(ta - angle); if (diff > Math.PI) diff = Math.PI * 2 - diff;
        if (diff < 1.4 || dist(x, y, t.x, t.y) < 24) {
          t.health -= 16; t.x += Math.cos(ta) * 12; t.y += Math.sin(ta) * 12;
          this.burst(t.x, t.y, '#ffd166', 6);
          if (t.health <= 0) t.dead = true;
          if (onHit) onHit(t);
        }
      }
    }
  }
  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.3, color, size: 2 + Math.random() * 3 });
    }
  }
  crashFx(x, y, speed) { this.burst(x, y, '#ffb703', 10); this.burst(x, y, '#adb5bd', 6); this.shake = Math.max(this.shake, Math.min(10, speed / 30)); }
  skid(car) {
    if (this.skids.length > 500) this.skids.shift();
    this.skids.push({ x: car.x - Math.cos(car.angle) * 14, y: car.y - Math.sin(car.angle) * 14, life: 6 });
  }
  update(dt, city, targets, onBulletHit) {
    this.muzzle = Math.max(0, this.muzzle - dt);
    this.shake = Math.max(0, this.shake - dt * 22);
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (city.collides(b.x, b.y, 2)) { b.life = 0; this.burst(b.x, b.y, '#ffe08a', 3); continue; }
      for (const t of targets) {
        if (t.dead) continue;
        const r = t.w !== undefined ? 20 : 11;
        if (dist(b.x, b.y, t.x, t.y) < r) {
          t.health -= 34; b.life = 0; this.burst(t.x, t.y, '#ef476f', 7);
          if (t.health <= 0) { t.dead = true; if (t.speed !== undefined) t.speed = 0; }
          if (onBulletHit) onBulletHit(t);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const s of this.skids) s.life -= dt;
    this.skids = this.skids.filter((s) => s.life > 0);
  }
}
