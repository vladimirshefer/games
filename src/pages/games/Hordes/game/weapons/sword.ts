import type { EnemySprite } from '../types.ts'
import Phaser from 'phaser'
import type { CombatContext } from '../combat.ts'
import type { WeaponStats } from '../weapons.ts'
import type { Weapon } from './weapon.ts'
import type { MobStats } from '../enemies.ts'

const STRIKE_DURATION = 0.8
const PREP_DURATION = 0.3

export class Sword implements Weapon {
  id = () => 'sword'
  swordElapsed = 0
  private activeSwordSwing: ActiveSwordSwing | null = null
  private scene: Phaser.Scene
  private context: CombatContext
  private damageEnemy: (enemy: EnemySprite, amount: number, mob: MobStats) => void
  private stats: WeaponStats

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

  update(_dt: number, enemies: EnemySprite[], _worldView: Phaser.Geom.Rectangle): void {
    if (this.activeSwordSwing) {
      this.updateActiveSwordSwing(_dt, enemies)
    }

    const hero = this.context.hero
    if (hero.hp <= 0) return

    this.swordElapsed += _dt
    if (this.activeSwordSwing) return
    if (this.swordElapsed < this.stats.cooldown) return

    const direction = hero.direction
    if (!direction || direction.lengthSq() < 0.0001) return

    this.swordElapsed = 0
    const normalized = direction.clone().normalize()
    const swingAngleDeg = Phaser.Math.RadToDeg(Math.atan2(normalized.y, normalized.x))
    const swing: ActiveSwordSwing = {
      prepGfx: null,
      strikeGfx: null,
      angleDeg: swingAngleDeg,
      prepRemaining: PREP_DURATION,
      strikeRemaining: STRIKE_DURATION,
      hitEnemies: new Set(),
      cleanup: () => {
        if (swing.cleaned) return
        swing.cleaned = true
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, swing.followHero)
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, swing.cleanup)
        swing.prepGfx?.destroy()
        swing.strikeGfx?.destroy()
        if (this.activeSwordSwing === swing) {
          this.activeSwordSwing = null
        }
      },
      followHero: () => {
        const heroSprite = this.context.hero.sprite
        swing.prepGfx?.setPosition(heroSprite.x, heroSprite.y)
        swing.strikeGfx?.setPosition(heroSprite.x, heroSprite.y)
      },
      cleaned: false
    }

    // Keep visuals aligned with the hero while the swing is active.
    this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, swing.followHero)
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, swing.cleanup)

    this.activeSwordSwing = swing
    this.spawnPrepGraphics(swing)
  }

  reset() {
    this.swordElapsed = 0
    if (this.activeSwordSwing) {
      this.activeSwordSwing.cleanup()
      this.activeSwordSwing = null
    }
  }

  private updateActiveSwordSwing(dt: number, enemies: EnemySprite[]) {
    const swing = this.activeSwordSwing
    if (!swing) return

    let availableTime = dt

    if (swing.prepRemaining > 0) {
      const direction = this.context.hero.direction
      if (direction && direction.lengthSq() > 0.0001) {
        swing.angleDeg = Phaser.Math.RadToDeg(Math.atan2(direction.y, direction.x))
        this.updatePrepGraphics(swing)
      }
      const prepSpent = Math.min(swing.prepRemaining, availableTime)
      swing.prepRemaining -= prepSpent
      availableTime -= prepSpent
      if (swing.prepRemaining <= 0 && !swing.strikeGfx) {
        this.beginStrikePhase(swing)
      }
      if (availableTime <= 0) {
        return
      }
    } else if (!swing.strikeGfx) {
      this.beginStrikePhase(swing)
    }

    swing.strikeRemaining -= availableTime
    if (swing.strikeRemaining <= 0) {
      swing.cleanup()
      this.activeSwordSwing = null
      return
    }

    const hero = this.context.hero
    const origin = hero.sprite

    for (const enemy of enemies) {
      if (swing.hitEnemies.has(enemy)) continue

      const mob = enemy.getData('mob') as MobStats | undefined
      if (!enemy.active || !mob) continue

      const dx = enemy.x - origin.x
      const dy = enemy.y - origin.y
      const distance = Math.hypot(dx, dy)
      if (distance > this.stats.area + mob.size / 2) continue

      const enemyAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx))
      const diff = Phaser.Math.Angle.ShortestBetween(swing.angleDeg, enemyAngle)
      if (Math.abs(diff) > this.stats.sectorAngle / 2) continue

      swing.hitEnemies.add(enemy)
      this.damageEnemy(enemy, this.stats.damage, mob)
    }
  }

  private spawnPrepGraphics(swing: ActiveSwordSwing) {
    const heroSprite = this.context.hero.sprite
    const prepGfx = this.scene.add.graphics({ x: heroSprite.x, y: heroSprite.y })
    prepGfx.setDepth(-0.35)
    prepGfx.setAlpha(0.8)
    prepGfx.fillStyle(0xffffff, 0.5)
    prepGfx.beginPath()
    const halfSector = Phaser.Math.DegToRad(this.stats.sectorAngle / 2)
    prepGfx.slice(0, 0, this.stats.area, -halfSector, halfSector, false)
    prepGfx.fillPath()
    prepGfx.setScale(0.25)
    prepGfx.rotation = Phaser.Math.DegToRad(swing.angleDeg)

    swing.prepGfx = prepGfx
    swing.followHero()

    this.scene.tweens.add({
      targets: prepGfx,
      scaleX: 1,
      scaleY: 1,
      alpha: 0.1,
      ease: 'Sine.easeOut',
      duration: PREP_DURATION * 1000
    })
  }

  private updatePrepGraphics(swing: ActiveSwordSwing) {
    const prepGfx = swing.prepGfx
    if (!prepGfx || swing.cleaned) return

    prepGfx.rotation = Phaser.Math.DegToRad(swing.angleDeg)
  }

  private beginStrikePhase(swing: ActiveSwordSwing) {
    swing.prepGfx?.destroy()
    swing.prepGfx = null

    const heroSprite = this.context.hero.sprite
    const strikeGfx = this.scene.add.graphics({ x: heroSprite.x, y: heroSprite.y })
    strikeGfx.setDepth(-0.3)
    strikeGfx.setAlpha(0.6)
    strikeGfx.fillStyle(0xffd54f, 0.35)
    strikeGfx.beginPath()
    const halfSector = Phaser.Math.DegToRad(this.stats.sectorAngle / 2)
    strikeGfx.slice(0, 0, this.stats.area, -halfSector, halfSector, false)
    strikeGfx.fillPath()
    strikeGfx.rotation = Phaser.Math.DegToRad(swing.angleDeg)

    swing.strikeGfx = strikeGfx
    swing.followHero()

    this.scene.tweens.add({
      targets: strikeGfx,
      alpha: 0,
      scale: 1.05,
      duration: STRIKE_DURATION * 1000,
      onComplete: () => swing.cleanup()
    })
  }
}

interface ActiveSwordSwing {
  prepGfx: Phaser.GameObjects.Graphics | null
  strikeGfx: Phaser.GameObjects.Graphics | null
  angleDeg: number
  prepRemaining: number
  strikeRemaining: number
  hitEnemies: Set<EnemySprite>
  cleanup: () => void
  followHero: () => void
  cleaned: boolean
}
