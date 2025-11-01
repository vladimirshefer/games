import Phaser from 'phaser'
import type {EnemySprite, HeroState} from './types'
import {EnemyManager, type MobStats} from './enemies.ts'
import {
  MOB_BASE_DAMAGE,
  MOB_BASE_HP,
  MOB_BASE_RADIUS,
  MOB_BASE_SPEED,
  MOB_BASE_XP,
  WAVE_BASE_AMOUNT
} from "./game/constants.ts";

interface WaveHooks {
  getHero(): HeroState
  onEnemySpawned(enemy: EnemySprite, mob: MobStats): void
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
    if (WAVES.length <= this.wave) {
      this.gameover()
      return
    }

    this.hooks.onWaveAdvanced(this.wave)
    const wave = WAVES[this.wave];
    const edge = Phaser.Math.Between(0, 3)
    // 50% spawns at the designated edge.
    // 30% to near edge.
    // 10% to other edges.
    for (const mobPack of wave.mobs) {
      const count = mobPack.amount
      const stats = mobPack.stats;
      for (let i = 0; i < count; i += 1) {
        if (i < count * 0.1) {
          this.spawnEnemy(edge+1, hero, stats)
          continue
        }
        if (i < count * 0.2) {
          this.spawnEnemy(edge+2, hero, stats)
          continue
        }
        if (i < count * 0.5) {
          this.spawnEnemy(edge+3, hero, stats)
          continue
        }
        this.spawnEnemy(edge, hero, stats)
      }
    }
  }

  private spawnEnemy(edge: number, hero: HeroState, stats: MobStats) {
    edge = edge % 4;
    const powerMultiplier = 1 + this.wave / 20
    const mobDamageRelative = (stats.damage / MOB_BASE_DAMAGE) * powerMultiplier
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

    const enemy = this.enemyManager.spawn(edge, stats, color, spawnContext)
    this.hooks.onEnemySpawned(enemy, stats)
  }

  private gameover() {
    this.stop()
    this.scene.game.events.emit('wavesOver')
  }
}

function grbToHex(r1: number, g1: number, b1: number) {
  const r = 0xff * Math.min(Math.max(r1, 0.0), 1.0)
  const g = 0xff * Math.min(Math.max(g1, 0.0), 1.0)
  const b = 0xff * Math.min(Math.max(b1, 0.0), 1.0)
  return ((r * 0x10000) & 0xff0000) | ((g * 0x100) & 0xff00) | b
}

interface Wave {
  mobs: { stats: MobStats, amount: number }[]
}

const DEFAULT_MOB_STATS = {
  size: MOB_BASE_RADIUS * 2,
  speed: MOB_BASE_SPEED,
  health: MOB_BASE_HP,
  xp: MOB_BASE_XP,
  damage: MOB_BASE_DAMAGE,
};

export const WAVES: Wave[] = [
  {
    mobs: [
      {
        stats: DEFAULT_MOB_STATS,
        amount: WAVE_BASE_AMOUNT,
      }
    ]
  },
  {
    mobs: [
      {
        stats: DEFAULT_MOB_STATS,
        amount: WAVE_BASE_AMOUNT,
      }
    ]
  },
  {
    mobs: [
      {
        stats: DEFAULT_MOB_STATS,
        amount: WAVE_BASE_AMOUNT,
      }
    ]
  },
]
