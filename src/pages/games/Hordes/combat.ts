import Phaser from 'phaser'
import type {Bullet, HeroState, SimpleMob} from './types'
import type {Weapon} from "./weapons.ts";

export interface CombatConfig {
  bulletSpeed: number
  bulletWeapon: Weapon
  auraWeapon?: Weapon | null
  enemyBaseHp: number
}

export interface CombatContext {
  hero: HeroState
  getEnemies(): Phaser.GameObjects.Arc[]
  onEnemyKilled(enemy: Phaser.GameObjects.Arc, mob: SimpleMob): void
}

export class CombatSystem {
  private bullets: Bullet[] = []
  private shootElapsed = 0
  private scene: Phaser.Scene
  private config: CombatConfig
  private context: CombatContext

  constructor(scene: Phaser.Scene, config: CombatConfig, context: CombatContext) {
    this.scene = scene
    this.config = config
    this.context = context
  }

  reset() {
    this.bullets.forEach((bullet) => bullet.sprite.destroy())
    this.bullets = []
    this.shootElapsed = 0
  }

  update(dt: number, worldView: Phaser.Geom.Rectangle, cleanupPadding: number) {
    const { damage: bulletDamage } = this.config.bulletWeapon
    const enemies = this.context.getEnemies()

    this.bullets = this.bullets.filter((bullet) => {
      const sprite = bullet.sprite
      if (!sprite.active) return false

      sprite.x += bullet.vx * dt
      sprite.y += bullet.vy * dt

      if (
        sprite.x < worldView.left - cleanupPadding ||
        sprite.x > worldView.right + cleanupPadding ||
        sprite.y < worldView.top - cleanupPadding ||
        sprite.y > worldView.bottom + cleanupPadding
      ) {
        sprite.destroy()
        return false
      }

      for (const enemy of enemies) {
        const mob = enemy.getData('mob') as SimpleMob | undefined
        if (!enemy.active || !mob) continue
        if (
          Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y) <
          mob.size + bullet.radius
        ) {
          const killed = this.damageEnemy(enemy, bulletDamage, mob)
          if (!killed) {
            sprite.x += bullet.vx * dt * 0.3
            sprite.y += bullet.vy * dt * 0.3
          }
          bullet.piercesLeft -= 1

          if (bullet.piercesLeft <= 0) {
            sprite.destroy()
            return false
          }
        }
      }

      return true
    })
  }

  tickAutoFire(dt: number) {
    const enemies = this.context.getEnemies()
    if (!enemies.some((enemy) => enemy.active)) return

    this.shootElapsed += dt
    if (this.shootElapsed < this.config.bulletWeapon.cooldown) return

    this.shootElapsed = 0
    const nearest = this.findNearestEnemy()
    if (!nearest) return

    const { sprite } = this.context.hero
    const dx = nearest.x - sprite.x
    const dy = nearest.y - sprite.y
    const length = Math.hypot(dx, dy)
    if (!length) return

    const radius = this.config.bulletWeapon?.area
    const bulletSprite = this.scene.add.circle(sprite.x, sprite.y, radius, 0xffeb3b)
    const vx = (dx / length) * this.config.bulletSpeed
    const vy = (dy / length) * this.config.bulletSpeed

    this.bullets.push({
      sprite: bulletSprite,
      vx,
      vy,
      radius,
      piercesLeft: this.config.bulletWeapon.pierce ?? 1,
    })
  }

  applyAuraDamage(
    enemy: Phaser.GameObjects.Arc,
    enemyRadius: number,
    distanceToHero: number,
    mob: SimpleMob,
  ) {
    const auraWeapon = this.config.auraWeapon
    if (!auraWeapon) return false

    if (distanceToHero > this.context.hero.auraRadius + enemyRadius) return false

    const now = this.scene.time.now
    const lastTick = enemy.getData('lastAuraTick') as number | undefined
    const cooldownMs = auraWeapon.cooldown * 1000
    if (lastTick && now - lastTick < cooldownMs) {
      return false
    }

    enemy.setData('lastAuraTick', now)
    return this.damageEnemy(enemy, auraWeapon.damage, mob)
  }

  private damageEnemy(enemy: Phaser.GameObjects.Arc, amount: number, mob: SimpleMob) {
    if (!enemy.active) return false

    const currentHp =
      (enemy.getData('hp') as number | undefined) ?? mob.health
    const nextHp = currentHp - amount
    enemy.setData('hp', nextHp)

    if (nextHp <= 0) {
      this.context.onEnemyKilled(enemy, mob)
      enemy.setActive(false)
      enemy.destroy()
      return true
    }

    return false
  }

  setBulletWeapon(weapon: Weapon) {
    this.config.bulletWeapon = weapon
    this.shootElapsed = 0
  }

  setAuraWeapon(weapon: Weapon | null | undefined) {
    this.config.auraWeapon = weapon ?? null
  }

  private findNearestEnemy() {
    const { sprite } = this.context.hero
    const enemies = this.context.getEnemies()
    let nearest: Phaser.GameObjects.Arc | undefined
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
}
