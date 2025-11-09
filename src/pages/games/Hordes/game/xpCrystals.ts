import Phaser from 'phaser'
import { CLEANUP_PADDING, HERO_BASE_SPEED, PICKUP_DEFAULT_SIZE } from './constants.ts'

const MAGNET_TRIGGER_RADIUS = PICKUP_DEFAULT_SIZE * 4
const MAGNET_COLLECT_RADIUS = PICKUP_DEFAULT_SIZE
const MAGNET_SPEED = HERO_BASE_SPEED * 1.5
const MAX_CRYSTALS = 100
const BASE_SIZE = PICKUP_DEFAULT_SIZE * 0.5

export class XpCrystalManager {
  private scene: Phaser.Scene
  private crystals: Phaser.GameObjects.Polygon[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  spawn(x: number, y: number, amount: number) {
    const xp = Math.max(1, Math.round(amount))
    const offsetX = Phaser.Math.FloatBetween(-6, 6)
    const offsetY = Phaser.Math.FloatBetween(-6, 6)
    const crystal = this.scene.add.polygon(
      x + offsetX,
      y + offsetY,
      [0, -BASE_SIZE, BASE_SIZE, 0, 0, BASE_SIZE, -BASE_SIZE, 0],
      0x64b5f6,
      0.7
    )
    crystal.setOrigin(0.5)
    crystal.setDepth(-0.2)
    crystal.setStrokeStyle(1.2, 0xffffff, 0.5)
    crystal.setData('xp', xp)
    crystal.setData('baseSize', BASE_SIZE)
    crystal.setData('magnetized', false)
    crystal.setData('magnetSpeed', MAGNET_SPEED)
    this.updateCrystalVisual(crystal)
    this.crystals.push(crystal)
  }

  update(heroX: number, heroY: number, view: Phaser.Geom.Rectangle, onCollect: (xp: number) => void) {
    const dt = Phaser.Math.Clamp(this.scene.game.loop.delta, 8, 48) / 1000
    this.crystals = this.crystals.filter((crystal) => {
      if (!crystal.active) {
        crystal.destroy()
        return false
      }

      const isMagnetized: boolean | null = crystal.getData('magnetized')

      if (!isMagnetized) {
        const triggerDist = Phaser.Math.Distance.Between(crystal.x, crystal.y, heroX, heroY)
        if (triggerDist <= MAGNET_TRIGGER_RADIUS) {
          crystal.setData('magnetized', true)
        }
      }

      const magnetized = crystal.getData('magnetized')

      if (magnetized) {
        const magnetSpeed = (crystal.getData('magnetSpeed') as number | undefined) ?? MAGNET_SPEED
        const dx = heroX - crystal.x
        const dy = heroY - crystal.y
        const dist = Math.hypot(dx, dy) || 0.0001
        const step = magnetSpeed * dt
        crystal.x += (dx / dist) * step
        crystal.y += (dy / dist) * step
      }

      const dist = Phaser.Math.Distance.Between(crystal.x, crystal.y, heroX, heroY)
      if (magnetized && dist <= MAGNET_COLLECT_RADIUS) {
        const xp = Math.max(1, Math.round((crystal.getData('xp') as number | undefined) ?? 0))
        crystal.destroy()
        if (xp > 0) onCollect(xp)
        return false
      }

      return true
    })

    this.mergeOutOfBounds(view, heroX, heroY)
  }

  destroyAll() {
    this.crystals.forEach((crystal) => crystal.destroy())
    this.crystals = []
  }

  activateMagnet() {
    this.crystals.forEach((crystal) => {
      if (!crystal.active) return
      crystal.setData('magnetized', true)
    })
  }

  private mergeOutOfBounds(view: Phaser.Geom.Rectangle, heroX: number, heroY: number) {
    if (this.crystals.length <= MAX_CRYSTALS) return

    const padding = CLEANUP_PADDING
    let safety = 0
    while (this.crystals.length > MAX_CRYSTALS && safety < 20) {
      const offscreen = this.crystals.filter(
        (crystal) =>
          crystal.x < view.left - padding ||
          crystal.x > view.right + padding ||
          crystal.y < view.top - padding ||
          crystal.y > view.bottom + padding
      )

      if (offscreen.length < 2) break

      offscreen.sort((a, b) => {
        const distA = Phaser.Math.Distance.Between(heroX, heroY, a.x, a.y)
        const distB = Phaser.Math.Distance.Between(heroX, heroY, b.x, b.y)
        return distB - distA
      })

      const primary = offscreen[0]
      const secondary = offscreen[1]

      if (!primary.active || !secondary.active) {
        ;[primary, secondary].forEach((crystal) => {
          if (!crystal.active) {
            crystal.destroy()
            this.crystals = this.crystals.filter((entry) => entry !== crystal)
          }
        })
        safety += 1
        continue
      }

      const xpPrimary = Math.max(0, Math.round((primary.getData('xp') as number | undefined) ?? 0))
      const xpSecondary = Math.max(0, Math.round((secondary.getData('xp') as number | undefined) ?? 0))
      primary.setData('xp', xpPrimary + xpSecondary)
      primary.setPosition((primary.x + secondary.x) / 2, (primary.y + secondary.y) / 2)
      this.updateCrystalVisual(primary)

      secondary.destroy()
      this.crystals = this.crystals.filter((entry) => entry !== secondary)
      safety += 1
    }
  }

  private updateCrystalVisual(crystal: Phaser.GameObjects.Polygon) {
    const xp = (crystal.getData('xp') as number | undefined) ?? 0
    const baseSize = (crystal.getData('baseSize') as number | undefined) ?? BASE_SIZE
    const radius = Phaser.Math.Clamp(6 + Math.sqrt(xp) * 1.1, 6, 28)
    const scale = radius / baseSize
    crystal.setScale(scale)
    crystal.setData('radius', radius)
    const alpha = Phaser.Math.Clamp(0.45 + xp / 180, 0.45, 0.9)
    crystal.setFillStyle(0x64b5f6, alpha)
    crystal.setStrokeStyle(1.2, 0xffffff, 0.45 + Math.min(0.4, xp / 120))
  }
}
