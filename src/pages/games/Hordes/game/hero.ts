import Phaser from 'phaser'
import type { HeroState } from './types.ts'
import { HERO_BASE_HP, HERO_BASE_RADIUS, MOB_BASE_RADIUS } from './constants.ts'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from './sprite.ts'
import { getUnlockedPerks } from './save.ts'

export const AURA_RADIUS = MOB_BASE_RADIUS * 2

export interface HeroAppearanceOptions {
  frame?: number
  tint?: number
}

export function createHero(scene: Phaser.Scene, appearance?: HeroAppearanceOptions): HeroState {
  const frame = appearance?.frame ?? ONE_BIT_PACK_KNOWN_FRAMES.hero
  const sprite = scene.add.sprite(0, 0, ONE_BIT_PACK.key, frame)
  sprite.setOrigin(0.5)
  sprite.setDisplaySize(HERO_BASE_RADIUS * 2, HERO_BASE_RADIUS * 2)
  sprite.setTint(appearance?.tint ?? 0x4caf50)
  sprite.setDepth(0.2)
  sprite.setData('radius', HERO_BASE_RADIUS)

  return {
    sprite,
    radius: HERO_BASE_RADIUS,
    maxHp: HERO_BASE_HP,
    hp: HERO_BASE_HP,
    upgrades: [...getUnlockedPerks()],
    weaponIds: [],
    direction: new Phaser.Math.Vector2(0, 0),
    areaMultiplier: 1,
    damageMultiplier: 1
  }
}

export function moveHero(hero: HeroState, direction: Phaser.Math.Vector2, speed: number, dt: number) {
  hero.sprite.x += direction.x * speed * dt
  hero.sprite.y += direction.y * speed * dt
  if (direction.lengthSq() > 0.0001) {
    hero.direction.copy(direction)
  }
}

export function damageHero(hero: HeroState, amount: number) {
  hero.hp = Math.max(0, hero.hp - amount)
  return hero.hp
}

export function healHero(hero: HeroState, amount: number) {
  hero.hp = Math.min(hero.maxHp, hero.hp + amount)
  return hero.hp
}
