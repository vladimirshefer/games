import Phaser, { type Scene } from 'phaser'
import type { HeroState } from './types.ts'

export class HeroHpBar {
  private readonly width
  private readonly height = 6
  private readonly padding = 1
  private bg: Phaser.GameObjects.Rectangle
  private fill: Phaser.GameObjects.Rectangle

  private hero: HeroState

  constructor(scene: Scene, hero: HeroState) {
    this.hero = hero
    const offsetY = this.getOffsetY()
    this.width = hero.sprite.displayWidth

    this.bg = scene.add
      .rectangle(hero.sprite.x, hero.sprite.y - offsetY, this.width, this.height, 0x000000, 0.7)
      .setOrigin(0.5)
      .setDepth(1)

    this.fill = scene.add
      .rectangle(
        hero.sprite.x - this.width / 2 + this.padding,
        this.bg.y,
        this.width - this.padding * 2,
        this.height - this.padding * 2,
        0x4caf50
      )
      .setOrigin(0, 0.5)
      .setDepth(1.1)

    this.updateValue(hero.hp, hero.maxHp)
  }

  syncPosition() {
    const x = this.hero.sprite.x
    const y = this.hero.sprite.y + this.getOffsetY()
    const leftEdge = x - this.width / 2 + this.padding

    this.bg.setPosition(x, y)
    this.fill.setPosition(leftEdge, y)
  }

  updateValue(currentHp: number, maxHp: number) {
    const ratio = Phaser.Math.Clamp(maxHp === 0 ? 0 : currentHp / maxHp, 0, 1)
    const innerWidth = Math.max(0, this.width - this.padding * 2)
    this.fill.displayWidth = innerWidth * ratio

    if (ratio > 0.6) {
      this.fill.setFillStyle(0x4caf50)
    } else if (ratio > 0.3) {
      this.fill.setFillStyle(0xffc107)
    } else {
      this.fill.setFillStyle(0xff5252)
    }
  }

  destroy() {
    this.bg.destroy()
    this.fill.destroy()
  }

  private getOffsetY() {
    return this.hero.sprite.displayHeight / 2 + 4
  }
}
