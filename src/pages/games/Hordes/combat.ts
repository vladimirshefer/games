import Phaser from 'phaser'
import type {Bullet, EnemySprite, HeroState, SimpleMob} from './types'
import type {Weapon} from "./weapons.ts";

export interface CombatConfig {
  bulletSpeed: number
  bulletWeapon: Weapon
  auraWeapon?: Weapon | null
  bombWeapon?: Weapon | null
  enemyBaseHp: number
}

export interface CombatContext {
  hero: HeroState
  getEnemies(): EnemySprite[]
  onEnemyKilled(enemy: EnemySprite, mob: SimpleMob): void
}

const BOMB_FUSE_DELAY = 2000;

export class CombatSystem {
  private bullets: Bullet[] = []
  private shootElapsed = 0
  private bombElapsed = 0
  private scene: Phaser.Scene
  private config: CombatConfig
  private context: CombatContext
  private bombs: {
    sprite: Phaser.GameObjects.Arc
    detonateAt: number
    weapon: Weapon
  }[] = []

  constructor(scene: Phaser.Scene, config: CombatConfig, context: CombatContext) {
    this.scene = scene
    this.config = config
    this.context = context
  }

  reset() {
    this.bullets.forEach((bullet) => bullet.sprite.destroy())
    this.bullets = []
    this.shootElapsed = 0
    this.bombElapsed = 0
    this.bombs.forEach((bomb) => bomb.sprite.destroy())
    this.bombs = []
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

    this.updateBombs(dt, enemies)

    if (this.context.hero.hp > 0) {
      this.tickAutoFire(dt)
    }
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
      piercesLeft: this.config.bulletWeapon.pierce,
      hitEnemies: new Set<EnemySprite>(),
    })
  }

  applyAuraDamage(
    enemy: EnemySprite,
    distanceToHero: number,
    mob: SimpleMob,
  ): boolean {
    const auraWeapon = this.config.auraWeapon
    if (!auraWeapon) return false

    if (distanceToHero > auraWeapon.area + mob.size / 2) return false

    const now = this.scene.time.now
    const lastTick = enemy.getData('lastAuraTick') as number | undefined
    const cooldownMs = auraWeapon.cooldown * 1000
    if (lastTick && now - lastTick < cooldownMs) {
      return false
    }

    enemy.setData('lastAuraTick', now)
    const killed = this.damageEnemy(enemy, auraWeapon.damage, mob)
    if (!killed) {
      const heroSprite = this.context.hero.sprite
      const dx = enemy.x - heroSprite.x
      const dy = enemy.y - heroSprite.y
      const length = Math.hypot(dx, dy) || 1
      const knockback =
        (enemy.getData('auraKnockback') as number | undefined) ?? 40
      const nextKnockback = Math.max(knockback / 2, 5)
      enemy.setData('auraKnockback', nextKnockback)
      enemy.x += (dx / length) * knockback
      enemy.y += (dy / length) * knockback

      const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
      if (hpText && hpText.active) {
        hpText.setPosition(enemy.x, enemy.y - mob.size / 2 - 8)
      }
    }
    return killed
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
    this.config.auraWeapon = weapon ?? null
  }

  setBombWeapon(weapon: Weapon | null | undefined) {
    this.config.bombWeapon = weapon ?? null
    this.bombElapsed = 0
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

  private updateBombs(dt: number, enemies: EnemySprite[]) {
    const bombWeapon = this.config.bombWeapon ?? null
    if (bombWeapon) {
      this.bombElapsed += dt
      while (this.bombElapsed >= bombWeapon.cooldown) {
        this.bombElapsed -= bombWeapon.cooldown
        this.spawnBomb(bombWeapon)
      }
    }

    const now = this.scene.time.now
    this.bombs = this.bombs.filter((bomb) => {
      if (!bomb.sprite.active) {
        bomb.sprite.destroy()
        return false
      }

      const { detonateAt } = bomb
      const timeRemaining = detonateAt - now
      const fuseMs = BOMB_FUSE_DELAY
      if (timeRemaining <= 0) {
        this.detonateBomb(bomb, enemies)
        return false
      }

      const progress = 1 - timeRemaining / fuseMs
      bomb.sprite.setScale(1 + progress * 0.4)
      bomb.sprite.setAlpha(0.6 + Math.sin(progress * Math.PI * 4) * 0.2)
      return true
    })
  }

  private spawnBomb(weapon: Weapon) {
    const { sprite } = this.context.hero
    const bombCircle = this.scene.add.circle(sprite.x, sprite.y, 14, 0xff7043, 0.9)
    bombCircle.setDepth(-0.5)
    const detonateAt = this.scene.time.now + BOMB_FUSE_DELAY;
    this.bombs.push({
      sprite: bombCircle,
      detonateAt,
      weapon,
    })
  }

  private detonateBomb(
    bomb: { sprite: Phaser.GameObjects.Arc; weapon: Weapon },
    enemies: EnemySprite[],
  ) {
    const { sprite, weapon } = bomb
    const explosion = this.scene.add.circle(sprite.x, sprite.y, weapon.area, 0xffab40, 0.35)
    explosion.setDepth(-0.4)
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: 1.4,
      duration: 320,
      onComplete: () => explosion.destroy(),
    })

    const radius = weapon.area
    const damage = weapon.damage
    for (const enemy of enemies) {
      const mob = enemy.getData('mob') as SimpleMob | undefined
      if (!enemy.active || !mob) continue

      const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y)
      if (dist <= radius + mob.size / 2) {
        this.damageEnemy(enemy, damage, mob)
      }
    }

    sprite.destroy()
  }
}
