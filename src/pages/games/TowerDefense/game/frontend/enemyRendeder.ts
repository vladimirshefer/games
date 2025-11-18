import type { Enemy } from '../../scene.ts'
import type { MapRenderer } from './mapRenderer.ts'
import type { EnemyId } from '../../towers.ts'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../../../Hordes/game/sprite.ts'

export interface EnemyRenderer {
  setEnemyPosition(enemy: Enemy, pointTiles: Phaser.Math.Vector2): boolean
  destroyEnemy(id: EnemyId): void
  spawnEnemy(enemy: Enemy): void
  setEnemyTint(enemyId: EnemyId, tint: number): void
}

export class EnemyRendererImpl implements EnemyRenderer {
  private mapRenderer: MapRenderer
  private enemySprites: { [key: string]: Phaser.GameObjects.Sprite | undefined } = {}
  private gameObjectFactory: Phaser.GameObjects.GameObjectFactory
  private animationManager: Phaser.Animations.AnimationManager

  constructor(
    mapRenderer: MapRenderer,
    gameObjectFactory: Phaser.GameObjects.GameObjectFactory,
    animationManager: Phaser.Animations.AnimationManager
  ) {
    this.mapRenderer = mapRenderer
    this.gameObjectFactory = gameObjectFactory
    this.animationManager = animationManager
  }

  spawnEnemy(enemy: Enemy): void {
    const tileSize = this.mapRenderer.getTileSizePx()
    const enemySize = tileSize * 0.7
    const baseTint = 0xdd5577
    const sprite = this.gameObjectFactory
      .sprite(enemy.xTiles * tileSize, enemy.yTiles * tileSize, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1)
      .setOrigin(0.5)
      .setDisplaySize(enemySize, enemySize)
      .setTint(baseTint)
      .setDepth(6)
    if (this.animationManager.exists('enemy-walk')) {
      sprite.play('enemy-walk')
      sprite.anims.setProgress(Math.random())
    }
    enemy.sprite = sprite
    this.enemySprites[enemy.id] = sprite
  }

  setEnemyPosition(enemy: Enemy, pointTiles: Phaser.Math.Vector2) {
    const positionPx = this.mapRenderer.tileToPixels(pointTiles.x, pointTiles.y)
    const sprite = this.enemySprites[enemy.id]
    if (!sprite) {
      console.error(`No sprite exist for ${enemy.id}`)
      return false
    }
    sprite.setPosition(positionPx.x, positionPx.y)
    return true
  }

  setEnemyTint(enemyId: EnemyId, tint: number): void {
    const enemySprite = this.enemySprites[enemyId]
    if (!enemySprite) {
      console.error(`No sprite exist for ${enemyId}`)
      return
    }
    if (enemySprite.tint != tint) enemySprite.setTint(tint)
  }

  destroyEnemy(id: EnemyId): void {
    this.enemySprites[id]?.destroy()
    this.enemySprites[id] = undefined
  }
}
