// Wanted system and police pursuit
import { WORLD_W, WORLD_H } from './config.js';
import { clamp, dist } from './random.js';
import { Car } from './vehicles.js';

export class Wanted {
  constructor() { this.stars = 0; this.heat = 0; this.lastSeenTimer = 0; this.bust = 0; this.seenByPolice = false; }
  commitCrime(points, witnessed) {
    if (witnessed === false && points < 2) return;
    this.heat += points;
    while (this.heat >= 3 && this.stars < 5) { this.stars++; this.heat -= 3; }
    if (this.stars === 0 && this.heat > 0.5) this.stars = 1;
    this.lastSeenTimer = 0;
  }
  update(dt, playerSeen) {
    this.seenByPolice = playerSeen;
    if (playerSeen) this.lastSeenTimer = 0; else this.lastSeenTimer += dt;
    if (this.lastSeenTimer > 9 && this.stars > 0) {
      this.stars--; this.lastSeenTimer = 0; this.heat = 0;
    }
  }
  clear() { this.stars = 0; this.heat = 0; this.bust = 0; }
}

export function desiredPoliceCount(stars) { return stars === 0 ? 0 : 1 + stars; }

export function spawnPolice(existing, stars, player) {
  const want = desiredPoliceCount(stars);
  const current = existing.filter((c) => c.isPolice && !c.dead);
  const out = [...existing];
  for (let i = current.length; i < want; i++) {
    const a = Math.random() * Math.PI * 2;
    const x = clamp(player.x + Math.cos(a) * 520, 40, WORLD_W - 40);
    const y = clamp(player.y + Math.sin(a) * 520, 40, WORLD_H - 40);
    const c = new Car(x, y, a + Math.PI, 0, '#111318', { police: true });
    c.label = 'POLICE';
    out.push(c);
  }
  return out;
}

export function updatePoliceCar(car, dt, player, inCar) {
  const targetX = player.x, targetY = player.y;
  const d = dist(car.x, car.y, targetX, targetY);
  const desired = Math.atan2(targetY - car.y, targetX - car.x);
  car.aiAngle = desired;
  car.targetSpeed = d > 90 ? 300 : 140;
  // ram: when close, aim slightly ahead
  if (d < 200 && inCar) car.targetSpeed = 330;
  return d;
}
