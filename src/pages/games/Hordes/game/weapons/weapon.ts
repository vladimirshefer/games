import type { EnemySprite } from '../../types.ts'

export interface Weapon {
  update(_dt: number, enemies: EnemySprite[], worldView: Phaser.Geom.Rectangle): void
  reset(): void
}
