import Phaser from 'phaser'
import type { HeroState } from './types.ts'
import type { EnemyManager, MobStats } from './enemies.ts'
import type { EnemySprite } from './types.ts'
import type { HeroRescueConfig } from './heroUnlocks.ts'
import { unlockHero } from './save.ts'

interface RescueEncounterOptions {
  scene: Phaser.Scene
  hero: HeroState
  enemyManager: EnemyManager
  config: HeroRescueConfig
}

export class RescueEncounter {
  private readonly scene: Phaser.Scene
  private readonly hero: HeroState
  private readonly enemyManager: EnemyManager
  private readonly config: HeroRescueConfig
  private readonly beaconPosition: Phaser.Math.Vector2
  private beaconCircle?: Phaser.GameObjects.Arc
  private beaconMarker?: Phaser.GameObjects.Graphics
  private beaconLabel?: Phaser.GameObjects.Text
  private beaconTween?: Phaser.Tweens.Tween
  private boss?: EnemySprite
  private enteredArea = false
  private completed = false
  private pointer?: Phaser.GameObjects.Triangle

  constructor({ scene, hero, enemyManager, config }: RescueEncounterOptions) {
    this.scene = scene
    this.hero = hero
    this.enemyManager = enemyManager
    this.config = config
    this.beaconPosition = this.pickBeaconPosition()
    this.createBeacon()
    this.createPointer()
    this.showToast(config.hint, '#ffd54f')
  }

  update() {
    if (this.completed) return
    this.checkHeroDistance()
    this.updatePointer()
  }

  handleEnemyKilled(enemy: EnemySprite) {
    if (!this.boss || enemy !== this.boss || this.completed) return
    this.completed = true
    unlockHero(this.config.heroId)
    this.showToast(this.config.rewardText, '#8bc34a')
    this.clearBeacon()
    this.pointer?.setVisible(false)
    this.boss = undefined
  }

  destroy() {
    this.clearBeacon()
    this.pointer?.destroy()
    this.pointer = undefined
    this.boss = undefined
  }

  private checkHeroDistance() {
    if (this.completed) return
    const dx = this.hero.sprite.x - this.beaconPosition.x
    const dy = this.hero.sprite.y - this.beaconPosition.y
    const distance = Math.hypot(dx, dy)
    if (!this.enteredArea && distance <= this.config.areaRadius) {
      this.enteredArea = true
      this.showToast(`${this.config.beaconLabel} reached`, '#ffeb3b')
      this.spawnBoss()
    }
  }

  private spawnBoss() {
    if (this.boss) return
    const boss = this.enemyManager.spawnAt(
      this.beaconPosition.x,
      this.beaconPosition.y,
      this.ensureBossStats(this.config.boss.stats),
      this.config.boss.appearance
    )
    boss.setData('rescueHeroId', this.config.heroId)
    this.boss = boss
    this.showToast(this.config.boss.introText, '#ff8a80')
  }

  private ensureBossStats(stats: MobStats): MobStats {
    return {
      ...stats,
      size: stats.size ?? 64
    }
  }

  private createBeacon() {
    const { areaRadius, beaconLabel } = this.config
    this.beaconCircle = this.scene.add
      .circle(this.beaconPosition.x, this.beaconPosition.y, areaRadius, 0xffc107, 0.12)
      .setStrokeStyle(2, 0xfff176, 0.9)
      .setDepth(-0.5)
    this.beaconMarker = this.scene.add.graphics()
    this.beaconMarker.lineStyle(2, 0xfff176, 0.9)
    this.beaconMarker.strokeCircle(0, 0, 14)
    this.beaconMarker.lineBetween(-16, 0, 16, 0)
    this.beaconMarker.lineBetween(0, -16, 0, 16)
    this.beaconMarker.setPosition(this.beaconPosition.x, this.beaconPosition.y)
    this.beaconMarker.setDepth(-0.2)
    this.beaconLabel = this.scene.add
      .text(this.beaconPosition.x, this.beaconPosition.y - areaRadius - 24, beaconLabel, {
        color: '#fff9c4',
        fontFamily: 'monospace',
        fontSize: '18px',
        backgroundColor: '#1d1a1588',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(0.5)
      .setDepth(-0.2)

    this.beaconTween = this.scene.tweens.add({
      targets: this.beaconCircle,
      alpha: { from: 0.12, to: 0.3 },
      duration: 1200,
      yoyo: true,
      loop: -1
    })
  }

  private clearBeacon() {
    this.beaconCircle?.destroy()
    this.beaconMarker?.destroy()
    this.beaconLabel?.destroy()
    this.beaconTween?.stop()
    this.beaconCircle = undefined
    this.beaconMarker = undefined
    this.beaconLabel = undefined
    this.beaconTween = undefined
  }

  private createPointer() {
    this.pointer = this.scene.add
      .triangle(this.scene.scale.width / 2, 32, 0, -18, 12, 12, -12, 12, 0xfff59d)
      .setStrokeStyle(2, 0xffc107, 1)
      .setDepth(6)
      .setScrollFactor(0)
      .setVisible(false)
  }

  private updatePointer() {
    const pointer = this.pointer
    if (!pointer || this.completed || this.enteredArea) {
      pointer?.setVisible(false)
      return
    }

    const dir = new Phaser.Math.Vector2(
      this.beaconPosition.x - this.hero.sprite.x,
      this.beaconPosition.y - this.hero.sprite.y
    )
    if (dir.lengthSq() < 0.001) {
      pointer.setVisible(false)
      return
    }
    dir.normalize()

    const halfWidth = this.scene.scale.width / 2 - 36
    const halfHeight = this.scene.scale.height / 2 - 36
    const xFactor = dir.x === 0 ? Number.POSITIVE_INFINITY : halfWidth / Math.abs(dir.x)
    const yFactor = dir.y === 0 ? Number.POSITIVE_INFINITY : halfHeight / Math.abs(dir.y)
    const distance = Math.min(xFactor, yFactor)
    const screenX = this.scene.scale.width / 2 + dir.x * distance
    const screenY = this.scene.scale.height / 2 + dir.y * distance

    pointer.setPosition(screenX, screenY)
    pointer.setRotation(Math.atan2(dir.y, dir.x) + Math.PI / 2)
    pointer.setVisible(true)
  }

  private pickBeaconPosition() {
    const radius = Phaser.Math.FloatBetween(900, 1300)
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
    return new Phaser.Math.Vector2(Math.cos(angle) * radius, Math.sin(angle) * radius)
  }

  private showToast(message: string, color: string) {
    const text = this.scene.add
      .text(this.scene.scale.width / 2, 160, message, {
        color,
        fontFamily: 'monospace',
        fontSize: '18px',
        backgroundColor: '#11111dcc',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5)

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 24,
      duration: 1600,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    })
  }
}
