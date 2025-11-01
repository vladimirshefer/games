import Phaser from 'phaser'

export type EnemySprite = Phaser.GameObjects.Sprite

export interface HeroState {
  sprite: Phaser.GameObjects.Sprite
  aura: Phaser.GameObjects.Arc
  radius: number
  maxHp: number
  hp: number
  hasAura: boolean,
  upgrades: string[],
  weaponIds: string[],
  direction: Phaser.Math.Vector2
}
