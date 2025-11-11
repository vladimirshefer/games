import Phaser from 'phaser'
import type { HeroState } from './types.ts'
import { EnemyManager, type MobStats } from './enemies.ts'
import {
  HERO_BASE_HP,
  HERO_BASE_SPEED,
  MOB_BASE_DAMAGE,
  MOB_BASE_HP,
  MOB_BASE_RADIUS,
  MOB_BASE_SPEED,
  MOB_BASE_XP,
  WAVE_BASE_AMOUNT
} from './constants.ts'
import { ONE_BIT_PACK_KNOWN_FRAMES } from './sprite.ts'

interface WaveHooks {
  getHero(): HeroState
  onWaveAdvanced(wave: number): void
}

export class WaveManager {
  private scene: Phaser.Scene
  private enemyManager: EnemyManager
  private hooks: WaveHooks
  private wave = 0
  private running = false
  private waveTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene, enemyManager: EnemyManager, hooks: WaveHooks) {
    this.scene = scene
    this.enemyManager = enemyManager
    this.hooks = hooks
  }

  start() {
    if (this.running) return
    this.running = true
    this.waveTimer = this.scene.time.addEvent({
      delay: 5000,
      callback: this.spawnWave,
      callbackScope: this,
      loop: true,
      startAt: 4500
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
    const wave = WAVES[this.wave]
    const edge = Phaser.Math.Between(0, 3)
    // 50% spawns at the designated edge.
    // 30% to near edge.
    // 10% to other edges.
    for (const mobPack of wave.mobs) {
      const count = mobPack.amount
      const stats = mobPack.stats
      const appearance = mobPack.appearance
      for (let i = 0; i < count; i += 1) {
        if (i < count * 0.1) {
          this.spawnEnemy(edge + 1, stats, appearance)
          continue
        }
        if (i < count * 0.2) {
          this.spawnEnemy(edge + 2, stats, appearance)
          continue
        }
        if (i < count * 0.5) {
          this.spawnEnemy(edge + 3, stats, appearance)
          continue
        }
        this.spawnEnemy(edge, stats, appearance)
      }
    }
  }

  private spawnEnemy(edge: number, stats: MobStats, appearance: MobAppearance) {
    edge = edge % 4
    this.enemyManager.spawn(edge, stats, appearance)
  }

  private gameover() {
    this.stop()
    this.scene.game.events.emit('wavesOver')
  }
}

interface Wave {
  mobs: {
    stats: MobStats
    appearance: MobAppearance
    amount: number
  }[]
}

export interface MobAppearance {
  /** The index of the frame in sprite list of 1-bit pack */
  frame: number
  color: number
}

export const KNOWN_MOB_APPEARANCE: { [key: string]: MobAppearance } = {
  default: {
    frame: ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1,
    color: 0x50c040
  },
  strong: {
    frame: ONE_BIT_PACK_KNOWN_FRAMES.enemy1,
    color: 0xc05040
  },
  elite: {
    frame: ONE_BIT_PACK_KNOWN_FRAMES.enemy2,
    color: 0x70c010
  },
  reaper: {
    frame: ONE_BIT_PACK_KNOWN_FRAMES.scull,
    color: 0xd03040
  }
}

const KNOWN_MOB_STATS: { [key: string]: MobStats } = {
  default: {
    size: MOB_BASE_RADIUS * 2,
    speed: MOB_BASE_SPEED,
    health: MOB_BASE_HP,
    xp: MOB_BASE_XP,
    damage: MOB_BASE_DAMAGE
  },
  strong: {
    size: MOB_BASE_RADIUS * 2.5,
    speed: MOB_BASE_SPEED,
    health: MOB_BASE_HP * 3,
    xp: MOB_BASE_XP * 2,
    damage: MOB_BASE_DAMAGE * 1.5
  },
  elite: {
    size: MOB_BASE_RADIUS * 3,
    speed: MOB_BASE_SPEED,
    health: MOB_BASE_HP * 5,
    xp: MOB_BASE_XP * 4,
    damage: MOB_BASE_DAMAGE * 2.5
  },
  reaper: {
    size: MOB_BASE_RADIUS * 3,
    speed: HERO_BASE_SPEED * 2,
    health: 10000,
    xp: 0,
    damage: HERO_BASE_HP / 2
  }
}

export const WAVES: Wave[] = [
  {
    mobs: [] // first wave is empty
  },
  ...repeat(10, {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      }
    ]
  }),
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT / 5
      }
    ]
  },
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT / 4
      }
    ]
  },
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT / 3
      }
    ]
  },
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT / 2
      }
    ]
  },
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT
      }
    ]
  },
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['elite'],
        appearance: KNOWN_MOB_APPEARANCE['elite'],
        amount: WAVE_BASE_AMOUNT / 4
      }
    ]
  },
  ...repeat(20, {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: WAVE_BASE_AMOUNT / 2
      },
      {
        stats: KNOWN_MOB_STATS['strong'],
        appearance: KNOWN_MOB_APPEARANCE['strong'],
        amount: WAVE_BASE_AMOUNT
      },
      {
        stats: KNOWN_MOB_STATS['elite'],
        appearance: KNOWN_MOB_APPEARANCE['elite'],
        amount: WAVE_BASE_AMOUNT / 2
      }
    ]
  }),
  ...repeat(3, {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['default'],
        appearance: KNOWN_MOB_APPEARANCE['default'],
        amount: 10
      }
    ]
  }),
  {
    mobs: [
      {
        stats: KNOWN_MOB_STATS['reaper'],
        appearance: KNOWN_MOB_APPEARANCE['reaper'],
        amount: 3
      }
    ]
  }
]

function repeat<T>(amount: number, value: T): T[] {
  const result: T[] = []
  for (let i = 0; i < amount; i += 1) {
    result.push(value)
  }
  return result
}
