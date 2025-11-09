import Phaser from 'phaser'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../../sprite.ts'
import type { HeroState } from '../../types.ts'

export class WeaponHud extends Phaser.GameObjects.Container {
  private static readonly frames: Record<string, number | undefined> = {
    sword: ONE_BIT_PACK_KNOWN_FRAMES.sword1,
    pistol: ONE_BIT_PACK_KNOWN_FRAMES.pistol1,
    bomb: ONE_BIT_PACK_KNOWN_FRAMES.bomb,
    aura: ONE_BIT_PACK_KNOWN_FRAMES.aura
  }

  private static readonly upgradeChains: Record<string, string[]> = {
    aura: ['aura', 'auraMk2', 'auraMk3', 'auraMk4', 'auraMk5'],
    pistol: ['pistol', 'pistolMk2', 'pistolMk3', 'pistolMk4', 'pistolMk5'],
    bomb: ['bomb', 'bombMk2', 'bombMk3'],
    sword: ['sword', 'swordMk2', 'swordMk3', 'swordMk4', 'swordMk5']
  }

  private readonly hero: HeroState
  private readonly infoText: Phaser.GameObjects.Text

  constructor(scene: Phaser.Scene, infoText: Phaser.GameObjects.Text, hero: HeroState) {
    super(scene, 16, infoText.y + infoText.height + 12)
    this.hero = hero
    this.infoText = infoText
    this.setDepth(2)
    this.setScrollFactor(0)
    scene.add.existing(this)
  }

  refresh() {
    this.removeAll(true)
    this.setPosition(16, this.infoText.y + this.infoText.height + 12)
    const ICON_SIZE = 20

    this.hero.weaponIds.forEach((weaponId, index) => {
      const frame = WeaponHud.frames[weaponId]
      if (frame === undefined) return

      const level = this.getWeaponLevel(weaponId)
      const item = new Phaser.GameObjects.Container(this.scene, index * ICON_SIZE * 1.5, 0)

      const background = new Phaser.GameObjects.Rectangle(this.scene, 0, 0, ICON_SIZE, ICON_SIZE, 0x1a1a2b, 0.65)
        .setOrigin(0)
        .setStrokeStyle(1, 0xffffff, 0.2)

      const WHITE = 0xffffff
      const GREEN = 0x55ff55
      const BLUE = 0x5555ff
      const YELLOW = 0xffff55
      const RED = 0xff5555
      const tint = level === 1 ? WHITE : level === 2 ? YELLOW : level === 3 ? GREEN : level === 4 ? BLUE : RED
      const icon = new Phaser.GameObjects.Sprite(this.scene, ICON_SIZE / 2, ICON_SIZE / 2, ONE_BIT_PACK.key, frame)
        .setOrigin(0.5)
        .setDisplaySize(ICON_SIZE, ICON_SIZE)
        .setTint(tint)

      item.add([background, icon])
      this.add(item)
    })
  }

  override destroy(fromScene?: boolean) {
    this.removeAll(true)
    super.destroy(fromScene)
  }

  private getWeaponLevel(weaponId: string): number {
    const chain = WeaponHud.upgradeChains[weaponId]
    if (!chain) return 1

    for (let index = chain.length - 1; index >= 0; index -= 1) {
      if (this.hero.upgrades.includes(chain[index])) {
        return index + 1
      }
    }

    return 1
  }
}
