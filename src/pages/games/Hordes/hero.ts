import Phaser from 'phaser'
import type { HeroState } from './types'
import { HERO_BASE_HP, HERO_BASE_RADIUS } from './game/constants.ts'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from './game/sprite.ts'

export const AURA_RADIUS = 50

export function createHero(scene: Phaser.Scene): HeroState {
  const sprite = scene.add.sprite(0, 0, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.hero)
  sprite.setOrigin(0.5)
  sprite.setDisplaySize(HERO_BASE_RADIUS * 2, HERO_BASE_RADIUS * 2)
  sprite.setTint(0x4caf50)
  sprite.setDepth(0.2)
  sprite.setData('radius', HERO_BASE_RADIUS)

  const aura = scene.add.circle(sprite.x, sprite.y, AURA_RADIUS, 0xffeb3b, 0.1)
  aura.setDepth(-1)
  aura.setVisible(false)

  return {
    sprite,
    aura,
    radius: HERO_BASE_RADIUS,
    maxHp: HERO_BASE_HP,
    hp: HERO_BASE_HP,
    hasAura: false,
    upgrades: [],
    weaponIds: [],
    direction: new Phaser.Math.Vector2(0, 0),
    areaMultiplier: 1,
    damageMultiplier: 1
  }
}

export function resetHeroState(hero: HeroState) {
  hero.sprite.setPosition(0, 0)
  hero.aura.setPosition(0, 0)
  hero.aura.setVisible(hero.weaponIds.includes('aura'))
  hero.hp = hero.maxHp
  hero.direction.set(0, 0)
}

export function moveHero(hero: HeroState, direction: Phaser.Math.Vector2, speed: number, dt: number) {
  hero.sprite.x += direction.x * speed * dt
  hero.sprite.y += direction.y * speed * dt
  hero.aura.setPosition(hero.sprite.x, hero.sprite.y)
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
