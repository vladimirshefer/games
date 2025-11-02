import Phaser from 'phaser'
import type { EnemySprite, HeroState } from './types'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from './game/sprite.ts'
import { CLEANUP_PADDING, MOB_BASE_RADIUS } from './game/constants.ts'

export interface SpawnContext {
  heroX: number
  heroY: number
  halfWidth: number
  halfHeight: number
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
   * Spawns a new enemy at the specified edge of the screen
   * @param edge Screen edge index (0: top, 1: right, 2: bottom, 3: left)
   * @param mob Enemy stats and properties
   * @param color Tint color to apply to the enemy sprite
   * @param context Spawn position calculation context
   * @returns The newly created enemy sprite
   */
  spawn(edge: number, mob: MobStats, color: number, context: SpawnContext): EnemySprite

  /**
   * Creates and tracks the floating HP label for an enemy.
   */
  attachHpLabel(enemy: EnemySprite, mob: MobStats): void

  /**
   * Resolves collisions between enemies by pushing them apart
   */
  resolveOverlaps(): void

  /**
   * Moves living enemies, cleans up off-screen units, and reports hero collisions.
   */
  update(
    hero: HeroState,
    dt: number,
    view: Phaser.Geom.Rectangle,
    onHeroHit: (enemy: EnemySprite, mob: MobStats) => void
  ): EnemySprite[]
}

export class EnemyManager implements IEnemyManager {
  private scene: Phaser.Scene
  private enemies: EnemySprite[]
  private readonly spawnBuffer: number = MOB_BASE_RADIUS * 6

  constructor(scene: Phaser.Scene, enemies: EnemySprite[]) {
    this.scene = scene
    this.enemies = enemies
  }

  spawn(edge: number, mob: MobStats, color: number) {
    const radius = mob.size / 2
    const { x, y } = this.findSpawnPosition(edge, radius)

    const enemy = this.scene.add.sprite(x, y, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1)
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
    this.attachHpLabel(enemy, mob)
    return enemy
  }

  attachHpLabel(enemy: EnemySprite, mob: MobStats) {
    EnemyHpLabel.create(this.scene, enemy, mob)
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
          EnemyHpLabel.update(enemyA, mobA)
          EnemyHpLabel.update(enemyB, mobB)
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
          EnemyHpLabel.update(enemyA, mobA)
          EnemyHpLabel.update(enemyB, mobB)
        }
      }
    }
  }

  update(
    hero: HeroState,
    dt: number,
    view: Phaser.Geom.Rectangle,
    onHeroHit: (enemy: EnemySprite, mob: MobStats) => void
  ) {
    this.enemies = this.enemies.filter((enemy) => this.updateEnemyState(enemy, hero, dt, view, onHeroHit))

    return this.enemies
  }

  private updateEnemyState(
    enemy: EnemySprite,
    hero: HeroState,
    dt: number,
    view: Phaser.Geom.Rectangle,
    onHeroHit: (enemy: EnemySprite, mob: MobStats) => void
  ) {
    const mob = enemy.getData('mob') as MobStats | undefined
    if (!enemy.active || !mob) return false

    const distance = this.moveEnemyTowardsHero(enemy, mob, hero, dt)
    EnemyHpLabel.update(enemy, mob)

    // if enemy touches hero collision
    if (distance < hero.radius + mob.size / 2) {
      onHeroHit(enemy, mob)
    }

    if (this.shouldCullEnemy(enemy, mob.size / 2, view)) {
      enemy.destroy()
      return false
    }

    return enemy.active
  }

  private moveEnemyTowardsHero(enemy: EnemySprite, mob: MobStats, hero: HeroState, dt: number) {
    const dx = hero.sprite.x - enemy.x
    const dy = hero.sprite.y - enemy.y
    const distance = Math.hypot(dx, dy) || 0.001
    const speed = mob.speed

    enemy.x += (dx / distance) * speed * dt
    enemy.y += (dy / distance) * speed * dt
    if (dx !== 0) {
      enemy.setFlipX(dx < 0)
    }

    return distance
  }
  private shouldCullEnemy(enemy: EnemySprite, enemyRadius: number, view: Phaser.Geom.Rectangle) {
    const offscreenPadding = CLEANUP_PADDING + enemyRadius
    return (
      enemy.x < view.left - offscreenPadding ||
      enemy.x > view.right + offscreenPadding ||
      enemy.y < view.top - offscreenPadding ||
      enemy.y > view.bottom + offscreenPadding
    )
  }

  private findSpawnPosition(edge: number, radius: number) {
    const camera = this.scene.cameras.main
    const worldView = camera.worldView
    let position = { x: worldView.centerX, y: worldView.y }
    const attempts = 12

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      let x = 0
      let y = 0
      switch (edge) {
        case 0:
          x = worldView.centerX + Phaser.Math.FloatBetween(-worldView.width / 2, worldView.width / 2)
          y = worldView.top - this.spawnBuffer
          break
        case 1:
          x = worldView.right + this.spawnBuffer
          y = worldView.centerY + Phaser.Math.FloatBetween(-worldView.height / 2, worldView.height / 2)
          break
        case 2:
          x = worldView.centerX + Phaser.Math.FloatBetween(-worldView.width / 2, worldView.width / 2)
          y = worldView.bottom + this.spawnBuffer
          break
        default:
          x = worldView.left - this.spawnBuffer
          y = worldView.centerY + Phaser.Math.FloatBetween(-worldView.height / 2, worldView.height / 2)
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
}

class EnemyHpLabel {
  private static readonly DATA_KEY = 'hpText'

  static create(scene: Phaser.Scene, enemy: EnemySprite, mob: MobStats) {
    const hpText = scene.add
      .text(enemy.x, enemy.y, `${mob.health}`, {
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '12px'
      })
      .setOrigin(0.5)
      .setDepth(1)

    enemy.setData(EnemyHpLabel.DATA_KEY, hpText)
    enemy.once('destroy', () => hpText.destroy())
    EnemyHpLabel.update(enemy, mob)
  }

  static update(enemy: EnemySprite, mob: MobStats) {
    const label = EnemyHpLabel.get(enemy)
    if (!label || !label.active) return
    label.setPosition(enemy.x, enemy.y - mob.size / 2 - 8)
  }

  private static get(enemy: EnemySprite) {
    return enemy.getData(EnemyHpLabel.DATA_KEY) as Phaser.GameObjects.Text | undefined
  }
}
