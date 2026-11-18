// City generation: road grid, buildings, trees, lamps, collision
import { BLOCK, ROAD, CITY_COLS, CITY_ROWS, WORLD_W, WORLD_H, DISTRICTS } from './config.js';
import { mulberry32, randRange, randInt, pick } from './random.js';

export class City {
  constructor() {
    const rng = mulberry32(20261118);
    this.buildings = []; this.trees = []; this.lamps = []; this.plazas = [];
    this.roadXs = []; this.roadYs = [];
    for (let c = 0; c <= CITY_COLS; c++) this.roadXs.push(c * BLOCK - ROAD / 2);
    for (let r = 0; r <= CITY_ROWS; r++) this.roadYs.push(r * BLOCK - ROAD / 2);
    const palette = ['#f2d5a0','#e8a87c','#c38d9e','#85cdd8','#f9ed69','#e07a5f','#81b29a','#f2cc8f','#a8dadc','#ffb4a2','#b5838d','#6d6875'];
    for (let c = 0; c < CITY_COLS; c++) {
      for (let r = 0; r < CITY_ROWS; r++) {
        const bx = c * BLOCK + ROAD / 2, by = r * BLOCK + ROAD / 2;
        const bw = BLOCK - ROAD, bh = BLOCK - ROAD;
        const district = DISTRICTS[(c + r * 2) % DISTRICTS.length];
        if ((c === 4 && r === 3) || (c === 1 && r === 6)) {
          this.plazas.push({ x: bx, y: by, w: bw, h: bh, name: district.name });
          continue;
        }
        // 1-4 buildings per block
        const n = randInt(rng, 1, 3);
        for (let i = 0; i < n; i++) {
          const w = randRange(rng, 60, bw / (n > 1 ? 1.8 : 1.05));
          const h = randRange(rng, 60, bh / (n > 1 ? 1.8 : 1.05));
          const x = bx + randRange(rng, 4, Math.max(5, bw - w - 4));
          const y = by + randRange(rng, 4, Math.max(5, bh - h - 4));
          this.buildings.push({ x, y, w, h, color: pick(rng, palette), roof: pick(rng, palette), district: district.name, floors: randInt(rng, 2, 9) });
        }
        for (let i = 0; i < 3; i++) this.trees.push({ x: bx + randRange(rng, 8, bw - 8), y: by + randRange(rng, 8, bh - 8), r: randRange(rng, 7, 12) });
      }
    }
    // lamps along roads
    for (let c = 0; c <= CITY_COLS; c++) for (let r = 0; r < CITY_ROWS; r++) this.lamps.push({ x: c * BLOCK, y: r * BLOCK + BLOCK / 2 });
    for (let r = 0; r <= CITY_ROWS; r++) for (let c = 0; c < CITY_COLS; c++) this.lamps.push({ x: c * BLOCK + BLOCK / 2, y: r * BLOCK });
    this.districtLabels = [
      { name: 'MARINA', x: 300, y: WORLD_H - 200 }, { name: 'PORTSIDE', x: WORLD_W - 500, y: 220 },
      { name: 'PALMS DISTRICT', x: 500, y: 300 }, { name: 'OLD MARKET', x: WORLD_W / 2, y: WORLD_H / 2 },
      { name: 'DOWNTOWN', x: WORLD_W - 700, y: WORLD_H - 400 },
    ];
  }
  isRoad(x, y) {
    const mx = ((x % BLOCK) + BLOCK) % BLOCK, my = ((y % BLOCK) + BLOCK) % BLOCK;
    return mx < ROAD / 2 || mx > BLOCK - ROAD / 2 || my < ROAD / 2 || my > BLOCK - ROAD / 2;
  }
  collides(x, y, r) {
    if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
    for (const b of this.buildings) {
      if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
    }
    return false;
  }
  nearestRoadPoint(x, y) {
    const cx = Math.round(x / BLOCK) * BLOCK, cy = Math.round(y / BLOCK) * BLOCK;
    return { x: Math.max(20, Math.min(WORLD_W - 20, cx)), y: Math.max(20, Math.min(WORLD_H - 20, cy)) };
  }
  // lane helpers: horizontal roads are at y = k*BLOCK, vertical at x = k*BLOCK
  laneOffset(dir) { return 24; }
}
export { WORLD_W, WORLD_H };
