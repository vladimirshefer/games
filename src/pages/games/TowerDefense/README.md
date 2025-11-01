# Tower Defence Mini Game

## Game Design
- Single-player tower defence prototype with endless waves.
- Build towers on the map edges; towers auto-target the nearest creep in range.
- Creeps follow a fixed path toward the base; each leak costs 1 base HP.
- Survive as many waves as possible while managing coins earned from kills.

## Tech Notes
- Built with Phaser inside React (`index.tsx`).
- Core gameplay loop lives in `scene.ts`; tweak spawn timings, tower stats, or path points there.
