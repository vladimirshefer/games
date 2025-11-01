import enemySpritesheetUrl from '../../../../assets/kenney.nl/1-bit-pack/Tilesheet/monochrome-transparent.png'

export const ENEMY_SPRITESHEET_COLUMNS = 49

export const ONE_BIT_PACK = {
  key: 'enemy-kenney',
  url: enemySpritesheetUrl,
  frameWidth: 16,
  frameHeight: 16,
  spacing: 1,
  columns: 49,
  knownFrames: {}
}

export const ONE_BIT_PACK_KNOWN_FRAMES = {
  portalOpens: 2 * ENEMY_SPRITESHEET_COLUMNS + 45, // 3rd row (0-indexed), 4th from the right
  hero: 4 * ENEMY_SPRITESHEET_COLUMNS + 30,
  mobWalk1: 7 * ENEMY_SPRITESHEET_COLUMNS + 18, // 8th row (0-indexed), 19th column
  mobWalk2: 7 * ENEMY_SPRITESHEET_COLUMNS + 19, // 8th row (0-indexed), 20th column
  bomb: 9 * ENEMY_SPRITESHEET_COLUMNS + 45, // 10th row (0-indexed), 4th from the right
  healPotion: 13 * ENEMY_SPRITESHEET_COLUMNS + 32 // 14th row (0-indexed), 17th from the right
}
