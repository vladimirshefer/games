import Phaser from 'phaser'
import type { CombatContext } from '../combat.ts'
import type { WeaponStats } from '../weapons.ts'
import type { EnemySprite } from '../types.ts'
import { CLEANUP_PADDING, HERO_BASE_SPEED } from '../constants.ts'
import type { Weapon } from './weapon.ts'
import type { MobStats } from '../enemies.ts'

export class Pistol implements Weapon {
  id = () => 'pistol'
  private readonly scene: Phaser.Scene
  private readonly context: CombatContext
  private readonly stats: WeaponStats
  private readonly damageEnemy: (enemy: EnemySprite, amount: number, mob: MobStats) => void

  private bullets: Bullet[] = []
  private shootElapsed = 0

  constructor(
    scene: Phaser.Scene,
    context: CombatContext,
    stats: WeaponStats,
    damageEnemy: (enemy: EnemySprite, amount: number, mob: MobStats) => void
  ) {
    this.scene = scene
    this.context = context
    this.stats = stats
    this.damageEnemy = damageEnemy
  }

  update(dt: number, enemies: EnemySprite[], worldView: Phaser.Geom.Rectangle) {
    this.bullets = this.bullets.filter((bullet) => {
      const sprite = bullet.sprite
      if (!sprite.active) return false

      sprite.x += bullet.vx * dt
      sprite.y += bullet.vy * dt

      if (
        sprite.x < worldView.left - CLEANUP_PADDING ||
        sprite.x > worldView.right + CLEANUP_PADDING ||
        sprite.y < worldView.top - CLEANUP_PADDING ||
        sprite.y > worldView.bottom + CLEANUP_PADDING
      ) {
        sprite.destroy()
        return false
      }

      for (const enemy of enemies) {
        const mob = enemy.getData('mob') as MobStats | undefined
        if (!enemy.active || !mob) continue
        if (bullet.hitEnemies.has(enemy)) continue
        if (Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y) < mob.size / 2 + bullet.radius) {
          bullet.hitEnemies.add(enemy)
          this.damageEnemy(enemy, this.stats.damage, mob)
          sprite.x += bullet.vx * dt * 0.3
          sprite.y += bullet.vy * dt * 0.3
          bullet.piercesLeft -= 1

          if (bullet.piercesLeft <= 0) {
            sprite.destroy()
            return false
          }
        }
      }

      return true
    })

    if (this.context.hero.hp > 0) {
      this.tickAutoFire(dt)
    }
  }

  tickAutoFire(dt: number) {
    const enemies = this.context.getEnemies()
    if (!enemies.some((enemy) => enemy.active)) return

    this.shootElapsed += dt
    if (this.shootElapsed < this.stats.cooldown) return

    this.shootElapsed = 0
    const nearest = this.findNearestEnemy()
    if (!nearest) return

    const { sprite } = this.context.hero
    const dx = nearest.x - sprite.x
    const dy = nearest.y - sprite.y
    const length = Math.hypot(dx, dy)
    if (!length) return

    const radius = this.stats.area
    const bulletSprite = this.scene.add.circle(sprite.x, sprite.y, radius, 0xaaaaaa)
    const vx = (dx / length) * BULLET_SPEED
    const vy = (dy / length) * BULLET_SPEED

    this.bullets.push({
      sprite: bulletSprite,
      vx,
      vy,
      radius,
      piercesLeft: this.stats.pierce,
      hitEnemies: new Set<EnemySprite>()
    })
  }

  private findNearestEnemy() {
    const { sprite } = this.context.hero
    const enemies = this.context.getEnemies()
    let nearest: EnemySprite | undefined
    let nearestDist = Number.POSITIVE_INFINITY

    for (const enemy of enemies) {
      if (!enemy.active) continue
      const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y)
      if (dist < nearestDist) {
        nearest = enemy
        nearestDist = dist
      }
    }

    return nearest
  }

  destroy() {
    this.bullets.forEach((bullet) => bullet.sprite.destroy())
    this.bullets = []
    this.shootElapsed = 0
  }
}

const BULLET_SPEED = HERO_BASE_SPEED * 3

export interface Bullet {
  sprite: Phaser.GameObjects.Arc
  vx: number
  vy: number
  radius: number
  piercesLeft: number
  hitEnemies: Set<EnemySprite>
}
