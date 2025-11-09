import Phaser from 'phaser'

export type EnemySprite = Phaser.GameObjects.Sprite

export interface HeroState {
  sprite: Phaser.GameObjects.Sprite
  radius: number
  maxHp: number
  hp: number
  upgrades: string[]
  weaponIds: string[]
  direction: Phaser.Math.Vector2
  areaMultiplier: number
  damageMultiplier: number
}
