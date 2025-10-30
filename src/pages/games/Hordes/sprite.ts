import enemySpritesheetUrl from '../../../assets/kenney.nl/1-bit-pack/Tilesheet/monochrome-transparent.png'

export const ENEMY_SPRITESHEET_KEY = 'enemy-kenney'
export const ENEMY_SPRITESHEET_URL = enemySpritesheetUrl
export const ENEMY_SPRITESHEET_FRAME_WIDTH = 16
export const ENEMY_SPRITESHEET_FRAME_HEIGHT = 16
export const ENEMY_SPRITESHEET_SPACING = 1
export const ENEMY_SPRITESHEET_COLUMNS = 49

export const HERO_FRAME_INDEX =
  4 * ENEMY_SPRITESHEET_COLUMNS + 30 // 5th row (0-indexed), 19th from the right

export const BOMB_FRAME_INDEX =
  9 * ENEMY_SPRITESHEET_COLUMNS + 45 // 10th row (0-indexed), 4th from the right

export const HEAL_POTION_FRAME_INDEX =
  13 * ENEMY_SPRITESHEET_COLUMNS + 32 // 14th row (0-indexed), 17th from the right

// Used instead of magnet icon
export const PORTAL_OPENS_FRAME_INDEX =
  2 * ENEMY_SPRITESHEET_COLUMNS + 45 // 3rd row (0-indexed), 4th from the right

export const MOB_WALK_FRAME_INDICES = [
  7 * ENEMY_SPRITESHEET_COLUMNS + 18, // 8th row (0-indexed), 19th column
  7 * ENEMY_SPRITESHEET_COLUMNS + 19, // 8th row (0-indexed), 20th column
]

export const ENEMY_WALK_ANIMATION_KEY = 'enemy-walk'
