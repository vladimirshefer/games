import Phaser from 'phaser'
import type {EnemySprite, HeroState, SimpleMob} from './types'
import {EnemyManager} from './enemies.ts'
import {HERO_BASE_SPEED, MOB_BASE_DAMAGE, MOB_BASE_HP, MOB_BASE_RADIUS, MOB_BASE_SPEED} from "./game/constants.ts";

interface WaveHooks {
  getHero(): HeroState
  onEnemySpawned(enemy: EnemySprite, mob: SimpleMob): void
  onWaveAdvanced(wave: number): void
}

export class WaveManager {
  private scene: Phaser.Scene
  private enemyManager: EnemyManager
  private hooks: WaveHooks
  private readonly spawnBuffer: number
  private wave = 0
  private running = false
  private waveTimer?: Phaser.Time.TimerEvent

  constructor(
    scene: Phaser.Scene,
    enemyManager: EnemyManager,
    spawnBuffer: number,
    hooks: WaveHooks,
  ) {
    this.scene = scene
    this.enemyManager = enemyManager
    this.spawnBuffer = spawnBuffer
    this.hooks = hooks
  }

  start() {
    if (this.running) return
    this.running = true
    this.spawnWave()
    this.waveTimer = this.scene.time.addEvent({
      delay: 5000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true,
      startAt: 0,
    })
  }

  stop() {
    if (!this.running) return
    this.running = false
    this.waveTimer?.remove()
    this.waveTimer = undefined
    this.wave = 0
  }

  isRunning() {
    return this.running
  }

  destroy() {
    this.stop()
  }

  private spawnWave = () => {
    const hero = this.hooks.getHero()
    if (!hero) return

    this.wave += 1
    this.hooks.onWaveAdvanced(this.wave)

    const count = Math.max(20 + this.wave, 10)
    const edge = Phaser.Math.Between(0, 3)

    this.spawnEnemy(1, hero)
    this.spawnEnemy(1, hero)
    this.spawnEnemy(2, hero)
    this.spawnEnemy(2, hero)
    this.spawnEnemy(3, hero)
    this.spawnEnemy(3, hero)
    this.spawnEnemy(4, hero)
    this.spawnEnemy(4, hero)

    for (let i = 0; i < count - 8; i += 1) {
      this.spawnEnemy(edge, hero)
    }
  }

  private spawnEnemy(edge: number, hero: HeroState) {
    const powerMultiplier = 1 + this.wave / 20
    const mob = this.generateMobStats(powerMultiplier)
    const mobDamageRelative = (mob.damage / MOB_BASE_DAMAGE) * powerMultiplier
    const color = grbToHex(
      0.5 + mobDamageRelative / 2,
      0.4,
      0.5 + (1 - mobDamageRelative) / 2,
    )

    const camera = this.scene.cameras.main
    const spawnContext = {
      heroX: hero.sprite.x,
      heroY: hero.sprite.y,
      halfWidth: camera.width / 2,
      halfHeight: camera.height / 2,
      buffer: this.spawnBuffer,
    }

    const enemy = this.enemyManager.spawn(edge, mob, color, spawnContext)
    this.hooks.onEnemySpawned(enemy, mob)
  }

  private generateMobStats(powerMultiplier: number): SimpleMob {
    const MAX_SPEED = Math.min(MOB_BASE_SPEED * powerMultiplier, HERO_BASE_SPEED)
    const MAX_HEALTH = MOB_BASE_HP * powerMultiplier
    const MAX_DAMAGE = MOB_BASE_DAMAGE * powerMultiplier
    const minRelativeDamage = 0.1
    const minRelativeHealth = 0.1
    const minRelativeSpeed = 0.3
    const relativeDamage = Phaser.Math.FloatBetween(minRelativeDamage, 1)
    const relativeHealth = Phaser.Math.FloatBetween(
      minRelativeHealth,
      Math.max(0.3, 1 - relativeDamage),
    )
    const relativeSpeed = Math.max(
      minRelativeSpeed,
      1 + minRelativeDamage + minRelativeHealth - relativeHealth - relativeDamage,
    )

    const speed = Math.round(relativeSpeed * MAX_SPEED)
    const health = Math.round(relativeHealth * MAX_HEALTH)
    const damage = Math.round(relativeDamage * MAX_DAMAGE)

    const mob: SimpleMob = {
      size: MOB_BASE_RADIUS * 2,
      speed,
      health,
      xp: 0,
      damage,
    }

    const mobStrength =
      mob.health / MAX_HEALTH + mob.speed / MAX_SPEED + mob.damage / MAX_DAMAGE
    mob.xp = Math.round(mobStrength) + 1
    const additionalSize = isNaN(Math.sqrt(mob.health)) ? 0 : Math.round(Math.sqrt(mob.health));
    mob.size = mob.size + additionalSize
    return mob
  }
}

function grbToHex(r1: number, g1: number, b1: number) {
  const r = 0xff * Math.min(Math.max(r1, 0.0), 1.0)
  const g = 0xff * Math.min(Math.max(g1, 0.0), 1.0)
  const b = 0xff * Math.min(Math.max(b1, 0.0), 1.0)
  return ((r * 0x10000) & 0xff0000) | ((g * 0x100) & 0xff00) | b
}
