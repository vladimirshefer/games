import { ONE_BIT_PACK_KNOWN_FRAMES } from './sprite.ts'

export type HeroWeaponId = 'bomb' | 'aura' | 'pistol' | 'sword'

export interface HeroDefinition {
  id: HeroId
  name: string
  spriteFrame: number
  startingUpgradeId: HeroWeaponId
  description: string
  tint?: number
}

export type HeroId = 'baldYrev' | 'holyShepard' | 'lawfulUmar' | 'vanPiercing'

export const HERO_ROSTER: HeroDefinition[] = [
  {
    id: 'baldYrev',
    name: 'Bald Yrev',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.miner,
    startingUpgradeId: 'bomb',
    description: 'Demolition expert that begins with bombs.',
    tint: 0xf9a825
  },
  {
    id: 'holyShepard',
    name: 'Holy Shepard',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.king,
    startingUpgradeId: 'aura',
    description: 'Brave king radiating a protective aura.',
    tint: 0xffecb3
  },
  {
    id: 'lawfulUmar',
    name: 'Lawful Umar',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.hero,
    startingUpgradeId: 'pistol',
    description: 'Disciplined ranger with a reliable pistol.',
    tint: 0x81d4fa
  },
  {
    id: 'vanPiercing',
    name: 'Van Piercing',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.swordsman,
    startingUpgradeId: 'sword',
    description: 'Blade virtuoso cleaving foes with a sword.',
    tint: 0xff8a65
  }
]

export const DEFAULT_HERO = HERO_ROSTER[0]

export function getHeroById(id?: HeroId | string) {
  return HERO_ROSTER.find((hero) => hero.id === id) ?? DEFAULT_HERO
}
