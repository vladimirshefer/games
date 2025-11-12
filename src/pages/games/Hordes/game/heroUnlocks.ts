import {
  HERO_BASE_HP,
  HERO_BASE_SPEED,
  MOB_BASE_DAMAGE,
  MOB_BASE_HP,
  MOB_BASE_RADIUS,
  MOB_BASE_SPEED,
  MOB_BASE_XP
} from './constants.ts'
import type { MobAppearance } from './waves.ts'
import type { MobStats } from './enemies.ts'
import type { HeroId } from './heroes.ts'
import { ONE_BIT_PACK_KNOWN_FRAMES } from './sprite.ts'

export const STARTER_HERO_ID: HeroId = 'lawfulUmar'
export const BASE_UNLOCKED_HEROES: HeroId[] = [STARTER_HERO_ID]

export interface RescueBossConfig {
  stats: MobStats
  appearance: MobAppearance
  introText: string
}

export interface HeroRescueConfig {
  heroId: HeroId
  beaconLabel: string
  hint: string
  areaRadius: number
  boss: RescueBossConfig
  rewardText: string
}

const DEFAULT_BOSS_STATS: MobStats = {
  size: MOB_BASE_RADIUS * 2.5,
  speed: MOB_BASE_SPEED * 0.8,
  health: MOB_BASE_HP * 40,
  xp: MOB_BASE_XP * 20,
  damage: MOB_BASE_DAMAGE * 3
}

export const HERO_RESCUES: { [key in HeroId]?: HeroRescueConfig } = {
  baldYrev: {
    heroId: 'baldYrev',
    beaconLabel: 'Collapsed Mine',
    hint: 'Rescue Bald Yrev by clearing the Collapsed Mine and crushing the Drilling Behemoth.',
    areaRadius: 220,
    boss: {
      stats: {
        ...DEFAULT_BOSS_STATS,
        health: HERO_BASE_HP * 20,
        damage: MOB_BASE_DAMAGE * 3,
        speed: MOB_BASE_SPEED * 0.6
      },
      appearance: {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.miner,
        color: 0xffc107
      },
      introText: 'Drilling Behemoth bursts through!'
    },
    rewardText: 'Bald Yrev rescued! Available next run.'
  },
  holyShepard: {
    heroId: 'holyShepard',
    beaconLabel: 'Whispering Chapel',
    hint: 'Rescue Holy Shepard by breaching the Whispering Chapel and defeating the Bound Warden.',
    areaRadius: 240,
    boss: {
      stats: {
        ...DEFAULT_BOSS_STATS,
        health: HERO_BASE_HP * 25,
        damage: MOB_BASE_DAMAGE * 4
      },
      appearance: {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.king,
        color: 0xf44336
      },
      introText: 'Bound Warden emerges!'
    },
    rewardText: 'Holy Shepard rescued! Available next run.'
  },
  vanPiercing: {
    heroId: 'vanPiercing',
    beaconLabel: "Hunter's Vigil",
    hint: "Rescue Van Piercing by purging Hunter's Vigil and dueling the Crimson Shade.",
    areaRadius: 260,
    boss: {
      stats: {
        ...DEFAULT_BOSS_STATS,
        health: HERO_BASE_HP * 30,
        speed: HERO_BASE_SPEED * 1.1,
        damage: MOB_BASE_DAMAGE * 4.5
      },
      appearance: {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.swordsman,
        color: 0xff5252
      },
      introText: 'Crimson Shade challenges you!'
    },
    rewardText: 'Van Piercing rescued! Available next run.'
  }
}

export function getRescueConfig(heroId: HeroId) {
  return HERO_RESCUES[heroId]
}
