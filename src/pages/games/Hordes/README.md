# Hordes Mini Game

## Game Design

- Single-player, offline survival shooter.
- Hero auto-fires at the nearest enemy while staying centered on an infinite arena.
- Waves spawn from the screen edges; each hit costs 1 HP with a per-enemy damage cooldown.
- Objective: stay alive as long as possible while clearing ever-growing hordes.

## Player Profile & Progression

- Persistent profile tracks weapon XP, achievements, and unlocked upgrades between runs.
- Each weapon has levels gated by earned XP; players start with Pistol Lv1 and unlock tiers in order.
- Achievements (e.g. “Kill 50 Crawlers”) unlock new systems such as Auras, Bombs, or modifier slots.
- Run summary grants XP based on time survived, kills, difficulty modifiers, and completed achievements.
- Loadout UI shows current weapon levels, locked items with hints, and pending rewards before launching a run.

## Demo Status

- Core loop: hero spawns center, waves advance, run ends on death or wave completion (`scene.ts`).
- Weapons live: sword, aura, pistol, bombs; balance tuning pending for progression tiers.
- UI: single in-game screen with HUD/pause overlay; no menus or loadout yet.
- Visuals: hero/enemy sprites, hero health bar, enemy HP text; all mobs currently share one sprite.
- Audio: absent; add at least basic SFX before publishing.
- Gaps to close: unique mob art, persistence/profile systems, achievement unlock UI, post-run summary.

## Tech Notes

- Built with Phaser inside React (`index.tsx`).
- Scene code lives in `scene.ts`; adjust constants there for balance.
