import Phaser from 'phaser'

export type EnemySprite = Phaser.GameObjects.Sprite

export interface Bullet {
  sprite: Phaser.GameObjects.Arc
  vx: number
  vy: number
  radius: number
  piercesLeft: number
  hitEnemies: Set<EnemySprite>
}

export interface HeroState {
  sprite: Phaser.GameObjects.Arc
  aura: Phaser.GameObjects.Arc
  radius: number
  maxHp: number
  hp: number
  hasAura: boolean,
  upgrades: string[],
  weaponIds: string[],
}

export interface SimpleMob {
  health: number
  damage: number
  speed: number
  xp: number
  size: number
}
