export const WORLD_BOUNDS = 20000
export const HERO_BASE_SPEED = 100
export const HERO_BASE_RADIUS = 14
export const HERO_BASE_HP = 100
export const HERO_BASE_DAMAGE = 5
export const MOB_BASE_SPEED = HERO_BASE_SPEED * 0.4
export const MOB_BASE_RADIUS = HERO_BASE_RADIUS
export const MOB_BASE_HP = 5
export const MOB_BASE_DAMAGE = HERO_BASE_HP * 0.05
export const WAVE_BASE_AMOUNT = 20
export const MOB_BASE_XP = 2
// Pixels. E.g. Heal potions, Bombs.
export const PICKUP_DEFAULT_SIZE = HERO_BASE_RADIUS * 2
// Pixels. When pickup or projectile is out of player view more than this distance, destroy/cleanup from the world.
export const CLEANUP_PADDING = 260
// Experience points required to get the first level up.
export const LEVEL_BASE_XP = WAVE_BASE_AMOUNT * MOB_BASE_XP
// Each next level takes X times more XP to upgrade.
export const LEVEL_BASE_PROGRESSION = 1.3
