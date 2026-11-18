// Car physics, parked cars and traffic AI
import { BLOCK, WORLD_W, WORLD_H, CAR_COLORS, CAR_TYPES } from './config.js';
import { mulberry32, pick, randRange, clamp, angleLerp } from './random.js';

let nextId = 1;
export class Car {
  constructor(x, y, angle, typeIdx, color, opts = {}) {
    this.id = nextId++;
    const t = CAR_TYPES[typeIdx % CAR_TYPES.length];
    this.type = t; this.x = x; this.y = y; this.angle = angle;
    this.vx = 0; this.vy = 0; this.speed = 0; this.color = color;
    this.health = 100; this.isPolice = !!opts.police; this.isTraffic = !!opts.traffic;
    this.isParked = !!opts.parked; this.driver = opts.driver || null;
    this.targetSpeed = 0; this.steer = 0; this.sirenPhase = Math.random() * 6;
    this.honk = 0; this.dead = false; this.isMissionCar = !!opts.missionCar;
    this.label = opts.label || '';
  }
  get w() { return this.type.w; }
  get h() { return this.type.h; }
  update(dt, city, obstacles) {
    if (this.dead) return;
    // traffic / police set targetSpeed & desired angle externally via this.aiAngle
    if (this.aiAngle !== undefined && this.aiAngle !== null) {
      let diff = this.aiAngle - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += clamp(diff, -1.8 * dt, 1.8 * dt);
    }
    const accel = this.type.accel;
    if (this.speed < this.targetSpeed) this.speed = Math.min(this.targetSpeed, this.speed + accel * dt);
    else this.speed = Math.max(this.targetSpeed, this.speed - accel * 1.4 * dt);
    // brake for obstacle ahead
    if (obstacles) {
      const fx = this.x + Math.cos(this.angle) * 55, fy = this.y + Math.sin(this.angle) * 55;
      for (const o of obstacles) {
        if (o === this) continue;
        const dx = o.x - fx, dy = o.y - fy;
        if (dx * dx + dy * dy < 900) { this.speed = Math.max(0, this.speed - 300 * dt); break; }
      }
    }
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.x = clamp(this.x, 20, WORLD_W - 20); this.y = clamp(this.y, 20, WORLD_H - 20);
    if (city.collides(this.x, this.y, 16)) {
      this.x -= Math.cos(this.angle) * this.speed * dt;
      this.y -= Math.sin(this.angle) * this.speed * dt;
      this.speed *= 0.4; this.health -= 2;
    }
  }
  // player driving
  drive(dt, input, city, fx) {
    const up = input.down('KeyW') || input.down('ArrowUp');
    const dn = input.down('KeyS') || input.down('ArrowDown');
    const lf = input.down('KeyA') || input.down('ArrowLeft');
    const rt = input.down('KeyD') || input.down('ArrowRight');
    const hb = input.down('Space');
    const boost = input.down('ShiftLeft') || input.down('ShiftRight');
    const maxF = this.type.maxSpeed * (boost ? 1.25 : 1);
    if (up) this.speed += this.type.accel * dt;
    else if (dn) this.speed -= (this.speed > 5 ? this.type.accel * 1.6 : this.type.accel * 0.7) * dt;
    else this.speed -= this.speed * 0.6 * dt;
    if (hb) this.speed -= this.speed * 1.8 * dt;
    this.speed = clamp(this.speed, -110, maxF);
    const steerAmt = (lf ? -1 : 0) + (rt ? 1 : 0);
    const grip = hb ? 2.2 : 1.35;
    if (Math.abs(this.speed) > 4) {
      this.angle += steerAmt * grip * dt * clamp(this.speed / 120, -1.4, 1.4) * (this.speed < 0 ? -1 : 1);
      if (hb && Math.abs(steerAmt) > 0 && Math.abs(this.speed) > 90 && fx) fx.skid(this);
    }
    const nx = this.x + Math.cos(this.angle) * this.speed * dt;
    const ny = this.y + Math.sin(this.angle) * this.speed * dt;
    if (city.collides(nx, ny, 15)) {
      if (Math.abs(this.speed) > 90 && fx) { fx.crash(this, Math.abs(this.speed)); }
      this.health -= Math.abs(this.speed) * 0.03; this.speed *= -0.25;
    } else { this.x = nx; this.y = ny; }
    this.x = clamp(this.x, 20, WORLD_W - 20); this.y = clamp(this.y, 20, WORLD_H - 20);
  }
}

export function spawnParkedAndTraffic(city) {
  const rng = mulberry32(777);
  const cars = [];
  // parked cars along roads
  for (let i = 0; i < 26; i++) {
    const horiz = rng() > 0.5;
    const gx = Math.floor(rng() * 10) * BLOCK, gy = Math.floor(rng() * 8) * BLOCK;
    const x = horiz ? gx + randRange(rng, -260, 260) : gx + 26;
    const y = horiz ? gy + 26 : gy + randRange(rng, -260, 260);
    const c = new Car(clamp(x, 40, WORLD_W - 40), clamp(y, 40, WORLD_H - 40), horiz ? 0 : Math.PI / 2, Math.floor(rng() * 5), pick(rng, CAR_COLORS), { parked: true });
    cars.push(c);
  }
  // moving traffic: assign each a road route (grid following)
  for (let i = 0; i < 16; i++) {
    const gx = Math.floor(rng() * 10) * BLOCK, gy = Math.floor(rng() * 8) * BLOCK;
    const horiz = rng() > 0.5;
    const c = new Car(gx + (horiz ? 0 : 24), gy + (horiz ? 24 : 0), horiz ? 0 : Math.PI / 2, Math.floor(rng() * 5), pick(rng, CAR_COLORS), { traffic: true });
    c.targetSpeed = randRange(rng, 90, 140);
    c.routeDir = horiz ? (rng() > 0.5 ? 0 : Math.PI) : (rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2);
    c.aiAngle = c.routeDir; c.angle = c.routeDir;
    cars.push(c);
  }
  return cars;
}

export function updateTraffic(car, dt, rng) {
  // Follow grid: drive straight; at junctions sometimes turn. Right-hand lane offset.
  const nearJunctionX = Math.abs(((car.x % BLOCK) + BLOCK) % BLOCK) < 14 || Math.abs(((car.x % BLOCK) + BLOCK) % BLOCK - BLOCK) < 14;
  const nearJunctionY = Math.abs(((car.y % BLOCK) + BLOCK) % BLOCK) < 14 || Math.abs(((car.y % BLOCK) + BLOCK) % BLOCK - BLOCK) < 14;
  if (nearJunctionX && nearJunctionY && !car._turnCooldown) {
    car._turnCooldown = 1.2;
    if (rng() < 0.4) {
      const dirs = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      car.routeDir = dirs[Math.floor(rng() * dirs.length)];
    }
  }
  car._turnCooldown = Math.max(0, (car._turnCooldown || 0) - dt);
  // lane target: offset perpendicular to travel direction
  const off = 24;
  let tx = car.x, ty = car.y;
  if (car.routeDir === 0) ty = Math.round(car.y / BLOCK) * BLOCK + off;
  if (car.routeDir === Math.PI) ty = Math.round(car.y / BLOCK) * BLOCK - off;
  if (car.routeDir === Math.PI / 2) tx = Math.round(car.x / BLOCK) * BLOCK - off;
  if (car.routeDir === -Math.PI / 2) tx = Math.round(car.x / BLOCK) * BLOCK + off;
  const desired = Math.atan2((ty + Math.sin(car.routeDir) * 200) - car.y, (tx + Math.cos(car.routeDir) * 200) - car.x);
  car.aiAngle = desired;
  car.targetSpeed = 120;
  // keep in world: turn around at edges
  if (car.x < 60 && Math.cos(car.routeDir) < 0) car.routeDir = 0;
  if (car.x > WORLD_W - 60 && Math.cos(car.routeDir) > 0) car.routeDir = Math.PI;
  if (car.y < 60 && Math.sin(car.routeDir) < 0) car.routeDir = Math.PI / 2;
  if (car.y > WORLD_H - 60 && Math.sin(car.routeDir) > 0) car.routeDir = -Math.PI / 2;
}
