// Pedestrians: stroll on sidewalks, flee danger
import { BLOCK, WORLD_W, WORLD_H, PED_NAMES } from './config.js';
import { mulberry32, pick, randRange, clamp, dist } from './random.js';

export class Ped {
  constructor(x, y, rng) {
    this.x = x; this.y = y; this.angle = rng() * Math.PI * 2;
    this.speed = randRange(rng, 28, 52); this.health = 30; this.dead = false;
    this.color = pick(rng, ['#ffadad','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#ffc6ff','#ffffff']);
    this.name = pick(rng, PED_NAMES); this.state = 'stroll'; this.fleeTimer = 0;
    this.wanderTimer = randRange(rng, 1, 4); this.isCop = false;
  }
  update(dt, city, danger) {
    if (this.dead) return;
    this.wanderTimer -= dt;
    let fleeing = false;
    if (danger) {
      const d = dist(this.x, this.y, danger.x, danger.y);
      if (d < 150 && danger.level > 0) { fleeing = true; this.fleeTimer = 1.5; }
    }
    if (this.fleeTimer > 0) { this.fleeTimer -= dt; fleeing = true; }
    if (fleeing && danger) {
      this.angle = Math.atan2(this.y - danger.y, this.x - danger.x);
      this.state = 'flee';
    } else {
      this.state = 'stroll';
      if (this.wanderTimer <= 0) { this.wanderTimer = randRange(Math.random, 1.5, 4); this.angle += randRange(Math.random, -1.2, 1.2); }
      // prefer sidewalks: steer toward nearest block edge path
      const mx = ((this.x % BLOCK) + BLOCK) % BLOCK, my = ((this.y % BLOCK) + BLOCK) % BLOCK;
      if (mx > 60 && mx < BLOCK - 60 && my > 60 && my < BLOCK - 60) {
        // inside a block: head to nearest edge
        this.angle = Math.atan2(my < BLOCK / 2 ? -1 : 1, 0) + (Math.random() - 0.5);
      }
    }
    const sp = fleeing ? 120 : this.speed;
    const nx = this.x + Math.cos(this.angle) * sp * dt;
    const ny = this.y + Math.sin(this.angle) * sp * dt;
    if (!city.collides(nx, ny, 8)) { this.x = nx; this.y = ny; }
    else this.angle += 1.8 * dt;
    this.x = clamp(this.x, 12, WORLD_W - 12); this.y = clamp(this.y, 12, WORLD_H - 12);
  }
}

export function spawnPeds(city) {
  const rng = mulberry32(4242);
  const peds = [];
  for (let i = 0; i < 42; i++) {
    const x = randRange(rng, 40, WORLD_W - 40), y = randRange(rng, 40, WORLD_H - 40);
    if (city.collides(x, y, 10)) continue;
    peds.push(new Ped(x, y, rng));
  }
  return peds;
}
