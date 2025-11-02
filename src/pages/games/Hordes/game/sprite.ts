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
  empty: 0,
  tree1: ENEMY_SPRITESHEET_COLUMNS + 0,
  tree2: ENEMY_SPRITESHEET_COLUMNS + 1,
  tree3: ENEMY_SPRITESHEET_COLUMNS + 2,
  tree4: ENEMY_SPRITESHEET_COLUMNS + 3,
  tree5: ENEMY_SPRITESHEET_COLUMNS + 4,
  tree6: ENEMY_SPRITESHEET_COLUMNS + 5,
  portalOpens: 2 * ENEMY_SPRITESHEET_COLUMNS + 45, // 3rd row (0-indexed), 4th from the right
  roadStraight: 4 * ENEMY_SPRITESHEET_COLUMNS + 8, // Top to bottom.
  roadTurn: 4 * ENEMY_SPRITESHEET_COLUMNS + 9, // Bottom to right turn.
  hero: 4 * ENEMY_SPRITESHEET_COLUMNS + 30,
  mobWalk1: 7 * ENEMY_SPRITESHEET_COLUMNS + 18, // 8th row (0-indexed), 19th column
  mobWalk2: 7 * ENEMY_SPRITESHEET_COLUMNS + 19, // 8th row (0-indexed), 20th column
  sword1: 7 * ENEMY_SPRITESHEET_COLUMNS + 32,
  pistol1: 9 * ENEMY_SPRITESHEET_COLUMNS + 37,
  bomb: 9 * ENEMY_SPRITESHEET_COLUMNS + 45, // 10th row (0-indexed), 4th from the right
  aura: 12 * ENEMY_SPRITESHEET_COLUMNS + 27,
  healPotion: 13 * ENEMY_SPRITESHEET_COLUMNS + 32, // 14th row (0-indexed), 17th from the right
  tower1: 19 * ENEMY_SPRITESHEET_COLUMNS + 2
}
