import type { Enemy } from '../../scene.ts'
import type { MapRenderer } from './mapRenderer.ts'

export interface EnemyRenderer {
  setEnemyPosition(enemy: Enemy, pointTiles: Phaser.Math.Vector2): boolean
}

export class EnemyRendererImpl implements EnemyRenderer {
  private mapRenderer: MapRenderer

  constructor(mapRenderer: MapRenderer) {
    this.mapRenderer = mapRenderer
  }

  setEnemyPosition(enemy: Enemy, pointTiles: Phaser.Math.Vector2) {
    const positionPx = this.mapRenderer.tileToPixels(pointTiles.x, pointTiles.y)
    enemy.sprite.setPosition(positionPx.x, positionPx.y)
    return true
  }
}
