import Phaser from 'phaser'
import { HERO_ROSTER, type HeroDefinition, type HeroId } from './heroes.ts'
import { HERO_SELECT_SCENE_KEY, HORDES_SCENE_KEY } from './sceneKeys.ts'
import { ONE_BIT_PACK } from './game/sprite.ts'

export class HeroSelectScene extends Phaser.Scene implements Phaser.Types.Scenes.CreateSceneFromObjectConfig {
  private hasChosen = false

  constructor() {
    super(HERO_SELECT_SCENE_KEY)
  }

  preload() {
    if (!this.textures.exists(ONE_BIT_PACK.key)) {
      this.load.spritesheet(ONE_BIT_PACK.key, ONE_BIT_PACK.url, {
        frameWidth: ONE_BIT_PACK.frameWidth,
        frameHeight: ONE_BIT_PACK.frameHeight,
        spacing: ONE_BIT_PACK.spacing
      })
    }
  }

  create() {
    this.cameras.main.setBackgroundColor('#101014')
    const { width, height } = this.scale

    this.add
      .text(width / 2, 90, 'Choose your hero', {
        color: '#f5f5f5',
        fontFamily: 'monospace',
        fontSize: '30px'
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, 130, 'Each hero starts the battle with their own weapon.', {
        color: '#b0bec5',
        fontFamily: 'monospace',
        fontSize: '18px'
      })
      .setOrigin(0.5)

    const spacing = 220
    const startX = width / 2 - ((HERO_ROSTER.length - 1) * spacing) / 2

    HERO_ROSTER.forEach((hero, index) => {
      const cardX = startX + index * spacing
      this.createHeroCard(hero, cardX, height / 2 + 40)
    })
  }

  private createHeroCard(hero: HeroDefinition, x: number, y: number) {
    const cardWidth = 200
    const cardHeight = 260
    const container = this.add.container(x, y)
    container.setSize(cardWidth, cardHeight)

    const background = this.add
      .rectangle(0, 0, cardWidth, cardHeight, 0x1b1b2b, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.15)
      .setOrigin(0.5)

    const sprite = this.add
      .sprite(0, -cardHeight / 2 + 70, ONE_BIT_PACK.key, hero.spriteFrame)
      .setDisplaySize(56, 56)
      .setOrigin(0.5)
      .setTint(hero.tint ?? 0xffffff)

    const nameText = this.add
      .text(0, sprite.y + 48, hero.name, {
        color: '#ffe082',
        fontFamily: 'monospace',
        fontSize: '18px'
      })
      .setOrigin(0.5)

    const weaponText = this.add
      .text(0, nameText.y + 28, `Weapon: ${formatWeapon(hero.startingUpgradeId)}`, {
        color: '#8c9eff',
        fontFamily: 'monospace',
        fontSize: '16px'
      })
      .setOrigin(0.5)

    const description = this.add
      .text(0, weaponText.y + 26, hero.description, {
        color: '#cfd8dc',
        fontFamily: 'monospace',
        fontSize: '14px',
        wordWrap: { width: cardWidth - 40 }
      })
      .setOrigin(0.5, 0)

    container.add([background, sprite, nameText, weaponText, description])

    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, cardWidth, cardHeight),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    })
    container.on('pointerover', () => background.setStrokeStyle(2, 0xffeb3b, 0.9))
    container.on('pointerout', () => background.setStrokeStyle(2, 0xffffff, 0.15))
    container.on('pointerdown', () => this.handleHeroPick(hero.id))
  }

  private handleHeroPick(heroId: HeroId) {
    if (this.hasChosen) return
    this.hasChosen = true
    this.cameras.main.fadeOut(200, 0, 0, 0, (_: any, progress: number) => {
      if (progress === 1) {
        this.scene.start(HORDES_SCENE_KEY, { heroId })
      }
    })
  }
}

function formatWeapon(weaponId: HeroDefinition['startingUpgradeId']) {
  switch (weaponId) {
    case 'bomb':
      return 'Bombs'
    case 'aura':
      return 'Aura'
    case 'pistol':
      return 'Pistol'
    case 'sword':
      return 'Sword'
    default:
      return weaponId
  }
}
