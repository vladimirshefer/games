import Phaser from 'phaser'
import {healHero} from './hero.ts'
import type {HeroState} from './types'
import {XpCrystalManager} from './xpCrystals.ts'
import {ENEMY_SPRITESHEET_KEY, HEAL_POTION_FRAME_INDEX, PORTAL_OPENS_FRAME_INDEX} from './sprite.ts'
import {HERO_BASE_HP, MOB_BASE_RADIUS, PICKUP_DEFAULT_SIZE} from "./game/constants.ts";


interface PickupHooks {
  getHero(): HeroState
  onHeroHealed(): void
  onMagnetActivated(): void
}

const HEAL_AMOUNT = HERO_BASE_HP * 0.3
const MAGNET_FLASH = { duration: 100, r: 120, g: 200, b: 255 }
const HEAL_FLASH = { duration: 100, r: 80, g: 180, b: 255 }
const SPAWN_MARGIN = MOB_BASE_RADIUS * 3

export class PickupManager {
  private scene: Phaser.Scene
  private xpManager: XpCrystalManager
  private cleanupPadding: number
  private hooks: PickupHooks
  private healPacks: Phaser.GameObjects.Image[] = []
  private magnetPickups: Phaser.GameObjects.Image[] = []

  constructor(
    scene: Phaser.Scene,
    xpManager: XpCrystalManager,
    cleanupPadding: number,
    hooks: PickupHooks,
  ) {
    this.scene = scene
    this.xpManager = xpManager
    this.cleanupPadding = cleanupPadding
    this.hooks = hooks
  }

  spawnHealPack(view: Phaser.Geom.Rectangle) {
    const x = Phaser.Math.FloatBetween(view.left + SPAWN_MARGIN, view.right - SPAWN_MARGIN)
    const y = Phaser.Math.FloatBetween(view.top + SPAWN_MARGIN, view.bottom - SPAWN_MARGIN)

    const diameter = PICKUP_DEFAULT_SIZE
    const pack = this.scene.add.image(x, y, ENEMY_SPRITESHEET_KEY, HEAL_POTION_FRAME_INDEX)
    pack.setDisplaySize(diameter, diameter)
    pack.setTint(0xf06040)
    pack.setData('radius', diameter / 2)
    this.healPacks.push(pack)
  }

  spawnMagnetPickup(view: Phaser.Geom.Rectangle) {
    if (this.magnetPickups.some((pickup) => pickup.active)) return

    const x = Phaser.Math.FloatBetween(view.left + SPAWN_MARGIN, view.right - SPAWN_MARGIN)
    const y = Phaser.Math.FloatBetween(view.top + SPAWN_MARGIN, view.bottom - SPAWN_MARGIN)

    const diameter = PICKUP_DEFAULT_SIZE
    const pickup = this.scene.add.image(x, y, ENEMY_SPRITESHEET_KEY, PORTAL_OPENS_FRAME_INDEX)
    pickup.setDisplaySize(diameter, diameter)
    pickup.setTint(0x42a5f5)
    pickup.setData('radius', diameter / 2)
    pickup.setDepth(0.2)
    this.magnetPickups.push(pickup)
  }

  update(view: Phaser.Geom.Rectangle) {
    const hero = this.hooks.getHero()
    const heroSprite = hero.sprite
    const heroRadius = hero.radius
    const heroX = heroSprite.x
    const heroY = heroSprite.y

    this.healPacks = this.healPacks.filter((pack) => {
      if (!pack.active) {
        pack.destroy()
        return false
      }

      const radius = (pack.getData('radius') as number | undefined) ?? PICKUP_DEFAULT_SIZE / 2
      if (Phaser.Math.Distance.Between(pack.x, pack.y, heroX, heroY) < radius + heroRadius) {
        this.collectHealPack(pack)
        return false
      }

      if (this.isOutOfBounds(pack.x, pack.y, view)) {
        pack.destroy()
        return false
      }

      return true
    })

    this.magnetPickups = this.magnetPickups.filter((pickup) => {
      if (!pickup.active) {
        pickup.destroy()
        return false
      }

      const radius = (pickup.getData('radius') as number | undefined) ?? PICKUP_DEFAULT_SIZE / 2
      if (Phaser.Math.Distance.Between(pickup.x, pickup.y, heroX, heroY) < radius + heroRadius) {
        this.collectMagnetPickup(pickup)
        return false
      }

      if (this.isOutOfBounds(pickup.x, pickup.y, view)) {
        pickup.destroy()
        return false
      }

      return true
    })
  }

  destroy() {
    this.healPacks.forEach((pack) => pack.destroy())
    this.healPacks = []
    this.magnetPickups.forEach((pickup) => pickup.destroy())
    this.magnetPickups = []
  }

  private collectHealPack(pack: Phaser.GameObjects.Image) {
    const hero = this.hooks.getHero()
    healHero(hero, HEAL_AMOUNT)
    this.scene.cameras.main.flash(
      HEAL_FLASH.duration,
      HEAL_FLASH.r,
      HEAL_FLASH.g,
      HEAL_FLASH.b,
      false,
    )
    pack.destroy()
    this.hooks.onHeroHealed()
  }

  private collectMagnetPickup(pickup: Phaser.GameObjects.Image) {
    this.xpManager.activateMagnet()
    this.scene.cameras.main.flash(
      MAGNET_FLASH.duration,
      MAGNET_FLASH.r,
      MAGNET_FLASH.g,
      MAGNET_FLASH.b,
      false,
    )
    pickup.destroy()
    this.hooks.onMagnetActivated()
  }

  private isOutOfBounds(x: number, y: number, view: Phaser.Geom.Rectangle) {
    const padding = this.cleanupPadding
    return (
      x < view.left - padding ||
      x > view.right + padding ||
      y < view.top - padding ||
      y > view.bottom + padding
    )
  }
}
