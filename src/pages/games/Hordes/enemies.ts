import Phaser from 'phaser'
import type {EnemySprite} from './types'
import {ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES} from './game/sprite.ts'

export interface SpawnContext {
  heroX: number
  heroY: number
  halfWidth: number
  halfHeight: number
  buffer: number
}

export interface MobStats {
  health: number
  damage: number
  speed: number
  xp: number
  size: number
}

export interface IEnemyManager {
  /**
   * Updates the internal list of enemies managed by this manager
   * @param enemies New list of enemies to manage
   */
  sync(enemies: EnemySprite[]): void

  /**
   * Spawns a new enemy at the specified edge of the screen
   * @param edge Screen edge index (0: top, 1: right, 2: bottom, 3: left)
   * @param mob Enemy stats and properties
   * @param color Tint color to apply to the enemy sprite
   * @param context Spawn position calculation context
   * @returns The newly created enemy sprite
   */
  spawn(edge: number, mob: MobStats, color: number, context: SpawnContext): EnemySprite

  /**
   * Resolves collisions between enemies by pushing them apart
   */
  resolveOverlaps(): void
}

export class EnemyManager implements IEnemyManager {
  private scene: Phaser.Scene
  private enemies: EnemySprite[]

  constructor(scene: Phaser.Scene, enemies: EnemySprite[]) {
    this.scene = scene
    this.enemies = enemies
  }

  sync(enemies: EnemySprite[]) {
    this.enemies = enemies
  }

  spawn(edge: number, mob: MobStats, color: number, context: SpawnContext) {
    const radius = mob.size / 2
    const { x, y } = this.findSpawnPosition(edge, radius, context)

    const frameIndex = ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1

    const enemy = this.scene.add.sprite(x, y, ONE_BIT_PACK.key, frameIndex)
    enemy.setOrigin(0.5)
    enemy.setDisplaySize(mob.size, mob.size)
    enemy.setTint(color)
    enemy.setDepth(0.1)
    enemy.setActive(true)
    enemy.setData('mob', mob)
    enemy.setData('hp', mob.health)
    enemy.setData('lastHit', 0)
    enemy.setData('lastAuraTick', 0)
    enemy.setData('auraKnockback', 40)
    enemy.setData('radius', radius)
    if (this.scene.anims.exists('enemy-walk')) {
      enemy.play('enemy-walk')
      enemy.anims.setProgress(Math.random())
    }

    this.enemies.push(enemy)
    return enemy
  }

  resolveOverlaps() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemyA = this.enemies[i]
      if (!enemyA.active) continue
      const mobA = enemyA.getData('mob') as MobStats | undefined
      if (!mobA) continue
      const radiusA = mobA.size / 2

      for (let j = i + 1; j < this.enemies.length; j += 1) {
        const enemyB = this.enemies[j]
        if (!enemyB.active) continue
        const mobB = enemyB.getData('mob') as MobStats | undefined
        if (!mobB) continue
        const radiusB = mobB.size / 2

        const dx = enemyB.x - enemyA.x
        const dy = enemyB.y - enemyA.y
        const dist = Math.hypot(dx, dy)
        const minDistance = radiusA + radiusB + 2

        if (dist === 0) {
          const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
          enemyA.x += Math.cos(angle)
          enemyA.y += Math.sin(angle)
          enemyB.x -= Math.cos(angle)
          enemyB.y -= Math.sin(angle)
          this.updateHpLabel(enemyA, mobA)
          this.updateHpLabel(enemyB, mobB)
          continue
        }

        if (dist < minDistance) {
          const overlap = (minDistance - dist) / 2
          const nx = dx / dist
          const ny = dy / dist
          enemyA.x -= nx * overlap
          enemyA.y -= ny * overlap
          enemyB.x += nx * overlap
          enemyB.y += ny * overlap
          this.updateHpLabel(enemyA, mobA)
          this.updateHpLabel(enemyB, mobB)
        }
      }
    }
  }

  private findSpawnPosition(edge: number, radius: number, context: SpawnContext) {
    const { heroX, heroY, halfWidth, halfHeight, buffer } = context
    let position = { x: heroX, y: heroY }
    const attempts = 12

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let x = 0
      let y = 0
      switch (edge) {
        case 0:
          x = heroX + Phaser.Math.FloatBetween(-halfWidth, halfWidth)
          y = heroY - halfHeight - buffer
          break
        case 1:
          x = heroX + halfWidth + buffer
          y = heroY + Phaser.Math.FloatBetween(-halfHeight, halfHeight)
          break
        case 2:
          x = heroX + Phaser.Math.FloatBetween(-halfWidth, halfWidth)
          y = heroY + halfHeight + buffer
          break
        default:
          x = heroX - halfWidth - buffer
          y = heroY + Phaser.Math.FloatBetween(-halfHeight, halfHeight)
          break
      }

      x += Phaser.Math.FloatBetween(-radius, radius)
      y += Phaser.Math.FloatBetween(-radius, radius)
      position = { x, y }

      if (this.isPositionClear(x, y, radius)) {
        break
      }
    }

    return position
  }

  private isPositionClear(x: number, y: number, radius: number) {
    const SPACING = 6
    for (const enemy of this.enemies) {
      if (!enemy.active) continue
      const mob = enemy.getData('mob') as MobStats | undefined
      if (!mob) continue
      const otherRadius = mob.size / 2
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y)
      if (dist < radius + otherRadius + SPACING) {
        return false
      }
    }
    return true
  }

  private updateHpLabel(enemy: EnemySprite, mob: MobStats) {
    const label = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
    if (!label || !label.active) return
    label.setPosition(enemy.x, enemy.y - mob.size / 2 - 8)
  }
}
