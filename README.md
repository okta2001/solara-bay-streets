# Solara Bay Streets

[![Make GTA 6 bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/okta2001/solara-bay-streets/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/okta2001/solara-bay-streets/reward.svg)](https://make.fun/bounty/gta6-01)

**Solara Bay Streets** is an original open-world crime game that plays offline in a desktop browser from static files. Explore a sun-soaked coastal city — Marina, Old Market, the Palms District, Portside, Downtown and Coral Heights — on foot and by car.

You are **Ren Calloway**, a courier who knows every shortcut in Solara Bay. Fixer **Mara Voss** has five jobs for you: deliver her sedan to the docks, beat the clock with a package, steal a sports car from the Palms, shake a three-star wanted level after a pickup goes wrong, and make a final timed getaway to the Marina under heavy police pressure. Finish the story, then keep earning with repeatable parcel side jobs. Every name, street, story beat and sound in the game is an original invention.

## Features

- Procedurally laid-out city with roads, blocks, buildings, plazas, palm trees, lamps and building collision
- Driving with acceleration, braking/reverse, speed-sensitive steering and handbrake drifts, plus parked cars and moving traffic that follows the road network
- Pedestrians who stroll the sidewalks and flee reckless driving
- A 0–5 star wanted system: police spawn, pursue and ram; get caught slow or on foot and the bust meter fills
- Melee and mouse-aimed pistol combat with tracers, muzzle flash, particles, screen shake and skid marks
- Five story missions plus a repeatable parcel side job, with briefings, world and minimap markers, timers and fail states
- HUD with health, cash, wanted stars, speed, objective text and a live minimap (roads, player arrow, police blips, mission marker)
- Start screen, pause, and localStorage saving (cash, mission progress, position) with Continue
- Day-cycle lighting, building shadows, and fully synthesized WebAudio sound — engine, sirens, gunshots, punches, chimes and a looping bassline. No audio files, no network requests, no libraries.

## Controls

- **WASD / Arrow keys** — walk / drive
- **Shift** — sprint
- **E** — enter / exit (steal) a car
- **Space** — handbrake drift
- **Mouse** — aim pistol, **click** — shoot
- **F** — melee attack
- **Q** — take a parcel side job (after mission 2)
- **Esc / P** — pause, **M** — mute

## Run it

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. The game also works from any static file server pointed at the `game/` directory.

Tip: add `?scene=chase`, `?scene=drive`, `?scene=foot` or `?scene=mission` to the URL to jump straight into a posed scene.

---

Built for the [make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01) · [make.fun](https://make.fun/?ref=ttsnb1g1)
