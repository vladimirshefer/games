import Phaser, { type Scene } from 'phaser'
import { STATS_FOR_RUN } from '../../profile.ts'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../../sprite.ts'

export class GameOverHud {
  private container?: Phaser.GameObjects.Container

  private readonly scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  show(result: 'killed' | 'complete', wave: number, kills: number) {
    const title = result === 'killed' ? 'Game Over' : 'Complete'
    const titleColor = result === 'killed' ? '#ff5252' : '#69f0ae'
    const { width, height } = this.scene.scale

    this.clear()

    const container = this.scene.add
      .container(width / 2, height / 2)
      .setScrollFactor(0)
      .setDepth(6)

    const titleText = this.scene.add
      .text(0, -96, title, {
        color: titleColor,
        fontFamily: 'monospace',
        fontSize: '36px',
        backgroundColor: '#1a1a25ee',
        padding: { x: 18, y: 10 }
      })
      .setOrigin(0.5)

    const statsText = this.scene.add
      .text(0, -32, `Wave ${wave} | Kills ${kills}`, {
        color: '#f5f5f5',
        fontFamily: 'monospace',
        fontSize: '20px',
        backgroundColor: '#1a1a25cc',
        padding: { x: 14, y: 6 }
      })
      .setOrigin(0.5)

    container.add([titleText, statsText])

    const damageTable = this.createDamageTable(statsText.y + statsText.height / 2 + 32)
    if (damageTable) {
      container.add(damageTable)
    }

    this.container = container
  }

  clear() {
    this.container?.destroy()
    this.container = undefined
  }

  private createDamageTable(offsetY: number) {
    const entries = Object.entries(STATS_FOR_RUN.weapon_damage ?? {})
    if (!entries.length) return undefined

    entries.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))

    const tableWidth = 320
    const padding = 16
    const rowHeight = 40
    const headerHeight = 28
    const rows = entries.length
    const tableHeight = padding * 2 + headerHeight + rows * rowHeight

    const table = this.scene.add.container(0, offsetY + tableHeight / 2).setScrollFactor(0)

    table.setSize(tableWidth, tableHeight)

    const background = this.scene.add
      .rectangle(0, 0, tableWidth, tableHeight, 0x11111f, 0.92)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0xffffff, 0.2)
    table.add(background)

    const header = this.scene.add
      .text(0, -tableHeight / 2 + padding, 'Damage dealt', {
        color: '#f5f5f5',
        fontFamily: 'monospace',
        fontSize: '18px'
      })
      .setOrigin(0.5, 0)
    table.add(header)

    entries.forEach(([weaponId, rawDamage], index) => {
      const damage = Math.round(rawDamage ?? 0)
      const rowTop = -tableHeight / 2 + padding + headerHeight + index * rowHeight
      const rowCenterY = rowTop + rowHeight / 2

      const rowBackground = this.scene.add
        .rectangle(0, rowCenterY, tableWidth - padding * 2, rowHeight - 6, 0xffffff, 0.05)
        .setOrigin(0.5)
      table.add(rowBackground)

      const iconSize = 28
      const icon = createWeaponIcon(this.scene, weaponId)
      icon.setPosition(-tableWidth / 2 + padding, rowTop + (rowHeight - iconSize) / 2)
      table.add(icon)

      const damageText = this.scene.add
        .text(-tableWidth / 2 + padding + iconSize + 12, rowCenterY, damage.toLocaleString(), {
          color: '#ffffff',
          fontFamily: 'monospace',
          fontSize: '18px'
        })
        .setOrigin(0, 0.5)
      table.add(damageText)
    })

    return table
  }
}

const WEAPON_ICON_FRAMES: Record<string, number | undefined> = {
  sword: ONE_BIT_PACK_KNOWN_FRAMES.sword1,
  pistol: ONE_BIT_PACK_KNOWN_FRAMES.pistol1,
  bomb: ONE_BIT_PACK_KNOWN_FRAMES.bomb,
  aura: ONE_BIT_PACK_KNOWN_FRAMES.aura
}

function createWeaponIcon(scene: Phaser.Scene, weaponId: string) {
  const container = scene.add.container(0, 0).setSize(20, 20)

  const background = new Phaser.GameObjects.Rectangle(scene, 0, 0, 20, 20, 0x1a1a2b, 0.65)
    .setOrigin(0)
    .setStrokeStyle(1, 0xffffff, 0.2)

  const frame = WEAPON_ICON_FRAMES[weaponId]

  if (frame !== undefined) {
    const icon = new Phaser.GameObjects.Sprite(scene, 20 / 2, 20 / 2, ONE_BIT_PACK.key, frame)
      .setOrigin(0.5)
      .setDisplaySize(20, 20)
      .setTint(0xffffff)

    container.add([background, icon])
  } else {
    const placeholder = new Phaser.GameObjects.Text(scene, 20 / 2, 20 / 2, weaponId.slice(0, 1).toUpperCase(), {
      color: '#e0e0e0',
      fontFamily: 'monospace',
      fontSize: `${20 * 0.6}px`
    }).setOrigin(0.5)

    container.add([background, placeholder])
  }

  return container
}
