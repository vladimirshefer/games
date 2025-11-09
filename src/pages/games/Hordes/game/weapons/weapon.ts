import type { EnemySprite } from '../types.ts'

export interface Weapon {
  id(): string
  update(_dt: number, enemies: EnemySprite[], worldView: Phaser.Geom.Rectangle): void
  reset(): void
}
