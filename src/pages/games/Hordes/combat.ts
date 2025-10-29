import Phaser from 'phaser'
import type {Bullet, EnemySprite, HeroState, SimpleMob} from './types'
import type {SwordWeapon, Weapon} from "./weapons.ts";
import {Sword} from "./game/weapons/sword.ts";
import {Bomb} from "./game/weapons/bomb.ts";
import {Aura} from "./game/weapons/aura.ts";

export interface CombatConfig {
  bulletSpeed: number
  bulletWeapon: Weapon
  auraWeapon?: Weapon | null
  bombWeapon?: Weapon | null
  swordWeapon?: SwordWeapon | null
  enemyBaseHp: number
}

export interface CombatContext {
  hero: HeroState
  getEnemies(): EnemySprite[]
  onEnemyKilled(enemy: EnemySprite, mob: SimpleMob): void
}

export class CombatSystem {
  private bullets: Bullet[] = []
  private shootElapsed = 0
  private readonly scene: Phaser.Scene
  private readonly config: CombatConfig
  private readonly context: CombatContext
  private sword: Sword | null = null
  private bomb: Bomb | null = null
  private aura: Aura | null = null

  constructor(scene: Phaser.Scene, config: CombatConfig, context: CombatContext) {
    this.scene = scene
    this.config = config
    this.context = context
    this.setSwordWeapon(this.config.swordWeapon ?? null)
    this.setBombWeapon(this.config.bombWeapon ?? null)
    this.setAuraWeapon(this.config.auraWeapon ?? null)
  }

  reset() {
    this.bullets.forEach((bullet) => bullet.sprite.destroy())
    this.bullets = []
    this.shootElapsed = 0
    this.sword?.reset()
    this.bomb?.reset()
    this.aura?.reset()
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
        if (bullet.hitEnemies.has(enemy)) continue
        if (
          Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y) <
          mob.size / 2 + bullet.radius
        ) {
          bullet.hitEnemies.add(enemy)
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

    this.bomb?.update(dt, enemies)
    this.sword?.update(dt, enemies)
    this.aura?.update(dt, enemies)

    if (this.context.hero.hp > 0) {
      this.tickAutoFire(dt)
    }
  }

  tickAutoFire(dt: number) {
    const enemies = this.context.getEnemies()
    if (!enemies.some((enemy) => enemy.active)) return
    if (!this.context.hero.weaponIds.includes('pistol')) return

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
      piercesLeft: this.config.bulletWeapon.pierce,
      hitEnemies: new Set<EnemySprite>(),
    })
  }


  private damageEnemy(enemy: EnemySprite, amount: number, mob: SimpleMob) {
    if (!enemy.active) return false

    const currentHp =
      (enemy.getData('hp') as number | undefined) ?? mob.health
    const nextHp = currentHp - amount
    enemy.setData('hp', nextHp)

    const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
    if (hpText && hpText.active) {
      hpText.setText(`${Math.max(nextHp, 0)}`)
    }

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
    this.aura?.reset()
    this.config.auraWeapon = weapon ?? null
    if (weapon) {
      this.aura = new Aura(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.aura = null
    }
    this.aura?.reset()
  }

  setBombWeapon(weapon: Weapon | null) {
    this.bomb?.reset()
    this.config.bombWeapon = weapon ?? null
    if (weapon) {
      this.bomb = new Bomb(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.bomb = null
    }
    this.bomb?.reset()
  }

  setSwordWeapon(weapon: SwordWeapon | null) {
    this.sword?.reset()
    this.config.swordWeapon = weapon
    if (weapon) {
      this.sword = new Sword(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.sword = null
    }
    this.sword?.reset()
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

}
