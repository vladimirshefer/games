# Hordes Mini Game

## Game Design

- Single-player, offline survival shooter.
- Hero auto-fires at the nearest enemy while staying centered on an infinite arena.
- Waves spawn from the screen edges; each hit costs 1 HP with a per-enemy damage cooldown.
- Objective: stay alive as long as possible while clearing ever-growing hordes.

## Tech Notes

- Built with Phaser inside React (`index.tsx`).
- Scene code lives in `scene.ts`; adjust constants there for balance.
