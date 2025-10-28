import Phaser from 'phaser'
import type {EnemySprite, SimpleMob} from './types'

interface SpawnContext {
  heroX: number
  heroY: number
  halfWidth: number
  halfHeight: number
  buffer: number
}

export class EnemyManager {
  private scene: Phaser.Scene
  private enemies: EnemySprite[]

  constructor(scene: Phaser.Scene, enemies: EnemySprite[]) {
    this.scene = scene
    this.enemies = enemies
  }

  sync(enemies: EnemySprite[]) {
    this.enemies = enemies
  }

  spawn(edge: number, mob: SimpleMob, color: number, context: SpawnContext) {
    const radius = mob.size / 2
    const { x, y } = this.findSpawnPosition(edge, radius, context)

    const enemy = this.scene.add.circle(x, y, radius, color)
    enemy.setActive(true)
    enemy.setData('mob', mob)
    enemy.setData('hp', mob.health)
    enemy.setData('lastHit', 0)
    enemy.setData('lastAuraTick', 0)
    enemy.setData('auraKnockback', 40)
    enemy.setData('radius', radius)

    this.enemies.push(enemy)
    return enemy
  }

  resolveOverlaps() {
    for (let i = 0; i < this.enemies.length; i += 1) {
      const enemyA = this.enemies[i]
      if (!enemyA.active) continue
      const mobA = enemyA.getData('mob') as SimpleMob | undefined
      if (!mobA) continue
      const radiusA = mobA.size / 2

      for (let j = i + 1; j < this.enemies.length; j += 1) {
        const enemyB = this.enemies[j]
        if (!enemyB.active) continue
        const mobB = enemyB.getData('mob') as SimpleMob | undefined
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
      const mob = enemy.getData('mob') as SimpleMob | undefined
      if (!mob) continue
      const otherRadius = mob.size / 2
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y)
      if (dist < radius + otherRadius + SPACING) {
        return false
      }
    }
    return true
  }

  private updateHpLabel(enemy: EnemySprite, mob: SimpleMob) {
    const label = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
    if (!label || !label.active) return
    label.setPosition(enemy.x, enemy.y - mob.size / 2 - 8)
  }
}
