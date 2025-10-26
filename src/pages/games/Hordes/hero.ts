import Phaser from 'phaser'
import type { HeroState } from './types'

export const HERO_RADIUS = 14
export const HERO_BASE_HP = 100
export const HERO_SPEED = 220
export const AURA_RADIUS = 50

export function createHero(scene: Phaser.Scene): HeroState {
  const sprite = scene.add.circle(0, 0, HERO_RADIUS, 0x4caf50)
  sprite.setData('radius', HERO_RADIUS)

  const aura = scene.add.circle(sprite.x, sprite.y, AURA_RADIUS, 0xffeb3b, 0.1)
  aura.setDepth(-1)
  aura.setVisible(false)

  return {
    sprite,
    aura,
    radius: HERO_RADIUS,
    auraRadius: AURA_RADIUS,
    maxHp: HERO_BASE_HP,
    hp: HERO_BASE_HP,
    hasAura: false,
    upgrades: ["pistolMk1"],
  }
}

export function resetHeroState(hero: HeroState) {
  hero.sprite.setPosition(0, 0)
  hero.aura.setPosition(0, 0)
  hero.aura.setVisible(hero.hasAura)
  hero.hp = hero.maxHp
}

export function moveHero(hero: HeroState, direction: Phaser.Math.Vector2, speed: number, dt: number) {
  hero.sprite.x += direction.x * speed * dt
  hero.sprite.y += direction.y * speed * dt
  hero.aura.setPosition(hero.sprite.x, hero.sprite.y)
}

export function damageHero(hero: HeroState, amount: number) {
  hero.hp = Math.max(0, hero.hp - amount)
  return hero.hp
}

export function healHero(hero: HeroState, amount: number) {
  hero.hp = Math.min(hero.maxHp, hero.hp + amount)
  return hero.hp
}
