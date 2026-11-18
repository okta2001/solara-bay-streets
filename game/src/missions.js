// Story missions from Mara Voss + repeatable parcel side job
import { WORLD_W, WORLD_H, BLOCK } from './config.js';
import { dist } from './random.js';

// World anchor points (on road junctions)
export const SPOTS = {
  start: { x: BLOCK * 1, y: BLOCK * 6 },
  maraCar: { x: BLOCK * 1 + 30, y: BLOCK * 6 },
  portside: { x: BLOCK * 9, y: BLOCK * 1 },
  market: { x: BLOCK * 5, y: BLOCK * 4 },
  palms: { x: BLOCK * 2, y: BLOCK * 1 },
  chopshop: { x: BLOCK * 8, y: BLOCK * 6 },
  marina: { x: BLOCK * 1, y: BLOCK * 7 },
  depot: { x: BLOCK * 7, y: BLOCK * 2 },
};

export const MISSIONS = [
  { id: 1, title: 'First Run', from: 'Mara Voss', brief: 'Mara: "Ren, take my sedan and drive it to the Portside docks. No scratches, no detours." Get in the marked sedan, then reach the docks.', reward: 250 },
  { id: 2, title: 'Against the Clock', from: 'Mara Voss', brief: 'Mara: "A package for the Old Market. The clock is already running — move!" Deliver before the timer ends.', reward: 400, time: 75 },
  { id: 3, title: 'Palms Prize', from: 'Mara Voss', brief: 'Mara: "A cherry-red sports car is parked in the Palms District. Bring it to the chop shop — intact-ish."', reward: 650 },
  { id: 4, title: 'Hot Pickup', from: 'Mara Voss', brief: 'Mara: "The pickup went wrong. You are hot — lose the heat, then call it in." Shake a 3-star wanted level.', reward: 500 },
  { id: 5, title: 'Last Tide', from: 'Mara Voss', brief: 'Mara: "Final job. Grab the car at the depot and get to the Marina before time runs out. Every cop in Solara Bay will be waiting."', reward: 1200, time: 95 },
];

export class MissionSystem {
  constructor() {
    this.index = 0; // 0..4 active story mission, 5 = story complete
    this.phase = 'brief'; // brief -> go -> done
    this.timer = 0; this.message = ''; this.msgTimer = 0;
    this.sideJob = null; this.complete = false;
  }
  get current() { return this.index < MISSIONS.length ? MISSIONS[this.index] : null; }
  objectiveText() {
    if (this.sideJob) return `Side job: deliver the parcel — $${this.sideJob.reward} on delivery`;
    const m = this.current;
    if (!m) return this.complete ? 'Story complete — free roam Solara Bay. Side jobs pay cash.' : 'Free roam';
    if (this.phase === 'brief') return `${m.title}: read the briefing, then head to the marker`;
    switch (m.id) {
      case 1: return 'Mission 1: Drive Mara\'s sedan to the Portside docks';
      case 2: return `Mission 2: Deliver the package to Old Market (${Math.max(0, Math.ceil(this.timer))}s)`;
      case 3: return 'Mission 3: Steal the red sports car in Palms and deliver it to the chop shop';
      case 4: return 'Mission 4: Lose your wanted level completely';
      case 5: return `Finale: Get to the Marina! (${Math.max(0, Math.ceil(this.timer))}s)`;
      default: return m.title;
    }
  }
  marker() {
    if (this.sideJob) return this.sideJob.target;
    const m = this.current; if (!m) return null;
    if (this.phase === 'brief') {
      if (m.id === 1) return SPOTS.maraCar;
      if (m.id === 3) return SPOTS.palms;
      if (m.id === 5) return SPOTS.depot;
      if (m.id === 2) return SPOTS.start;
      return SPOTS.market;
    }
    switch (m.id) {
      case 1: return SPOTS.portside;
      case 2: return SPOTS.market;
      case 3: return this.phase === 'go' && this._hasCar ? SPOTS.chopshop : SPOTS.palms;
      case 4: return null;
      case 5: return SPOTS.marina;
      default: return null;
    }
  }
  startSideJob(rng) {
    const spots = [SPOTS.market, SPOTS.portside, SPOTS.marina, SPOTS.depot, SPOTS.chopshop];
    const target = spots[Math.floor(rng() * spots.length)];
    this.sideJob = { target, reward: 120 + Math.floor(rng() * 120) };
    this.message = 'Parcel pickup: follow the yellow marker to deliver.';
    this.msgTimer = 4;
  }
  update(dt, game) {
    this.msgTimer = Math.max(0, this.msgTimer - dt);
    const m = this.current;
    if (this.sideJob) {
      if (dist(game.player.x, game.player.y, this.sideJob.target.x, this.sideJob.target.y) < 55) {
        game.player.cash += this.sideJob.reward;
        game.audio.pickup();
        this.message = `Parcel delivered! +$${this.sideJob.reward}`;
        this.msgTimer = 4; this.sideJob = null;
        game.saveNow();
      }
      return;
    }
    if (!m) return;
    if (m.time && this.phase === 'go') {
      this.timer -= dt;
      if (this.timer <= 0) { game.failMission('Time ran out. Mara is not pleased.'); return; }
    }
    const mk = this.marker();
    if (this.phase === 'brief') {
      // reaching / interacting near brief marker advances (mission 4 auto-starts hot)
      if (m.id === 4) { this.phase = 'go'; game.wanted.stars = 3; game.wanted.heat = 0; this.message = 'The pickup went wrong — lose the heat!'; this.msgTimer = 4; return; }
      if (mk && dist(game.player.x, game.player.y, mk.x, mk.y) < 70) {
        this.phase = 'go';
        if (m.time) this.timer = m.time;
        this.message = m.title + ' — go!';
        this.msgTimer = 3;
      }
      return;
    }
    if (this.phase === 'go') {
      if (m.id === 3) this._hasCar = !!(game.player.car && game.player.car.isMissionCar);
      if (m.id === 4) {
        if (game.wanted.stars === 0) this.succeed(game);
        return;
      }
      if (m.id === 1 && !(game.player.car && game.player.car.isMissionCar) && dist(game.player.x, game.player.y, SPOTS.portside.x, SPOTS.portside.y) > 60) {
        // must arrive in Mara's sedan
      } else if (mk && dist(game.player.x, game.player.y, mk.x, mk.y) < 60) {
        if (m.id === 1 && !(game.player.car && game.player.car.isMissionCar)) {
          this.message = 'You need to arrive in Mara\'s sedan!';
          this.msgTimer = 2; return;
        }
        if (m.id === 3 && !(game.player.car && game.player.car.isMissionCar)) {
          this.message = 'Bring the sports car itself!';
          this.msgTimer = 2; return;
        }
        this.succeed(game);
      }
      // fail: mission car wrecked
      if ((m.id === 1 || m.id === 3 || m.id === 5) && game.missionCar && game.missionCar.health <= 5) {
        game.failMission('The car was wrecked.');
      }
    }
  }
  succeed(game) {
    const m = this.current; if (!m) return;
    game.player.cash += m.reward;
    game.audio.jingle();
    this.message = `${m.title} complete! +$${m.reward} — Mara: "Good work, Ren."`;
    this.msgTimer = 5;
    this.index++; this.phase = 'brief'; this._hasCar = false;
    if (this.index >= MISSIONS.length) { this.complete = true; game.onStoryComplete(); }
    if (this.index === 2) { /* side jobs unlock after mission 2 (index passes 1) */ }
    game.saveNow();
  }
  get sideJobsUnlocked() { return this.index >= 2; }
}
export { dist };
