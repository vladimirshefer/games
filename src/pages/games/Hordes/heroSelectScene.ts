import Phaser from 'phaser'
import { HERO_ROSTER, type HeroDefinition, type HeroId } from './heroes.ts'
import { HERO_SELECT_SCENE_KEY, HORDES_SCENE_KEY } from './sceneKeys.ts'
import { ONE_BIT_PACK } from './game/sprite.ts'

const HERO_CARD_WIDTH = 200
const HERO_CARD_HEIGHT = 260
const DRAG_THRESHOLD = 6

export class HeroSelectScene extends Phaser.Scene implements Phaser.Types.Scenes.CreateSceneFromObjectConfig {
  private hasChosen = false
  private heroListContainer?: Phaser.GameObjects.Container
  private heroListBounds = { minY: 0, maxY: 0 }
  private heroViewportTop = 0
  private heroViewportHeight = 0
  private isDraggingHeroList = false
  private dragStartPointerY = 0
  private dragStartListY = 0
  private scrollPointerId: number | null = null
  private heroSelectionLocked = false

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

    this.heroViewportTop = 190
    this.heroViewportHeight = height - this.heroViewportTop - 40
    const viewportWidth = Math.min(width - 40, HERO_CARD_WIDTH * 2 + 120)
    const maskShape = this.add
      .rectangle(
        width / 2,
        this.heroViewportTop + this.heroViewportHeight / 2,
        viewportWidth,
        this.heroViewportHeight,
        0x000000,
        0
      )
      .setVisible(false)

    this.heroListContainer = this.add.container(width / 2, 0)
    this.heroListContainer.setMask(maskShape.createGeometryMask())

    const columns = 2
    const horizontalOffset = HERO_CARD_WIDTH / 2 + 5
    const verticalSpacing = HERO_CARD_HEIGHT + 5
    let contentTop = Number.POSITIVE_INFINITY
    let contentBottom = Number.NEGATIVE_INFINITY

    HERO_ROSTER.forEach((hero, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const card = this.createHeroCard(hero)
      const cardX = column === 0 ? -horizontalOffset : horizontalOffset
      const cardY = this.heroViewportTop + HERO_CARD_HEIGHT / 2 + row * verticalSpacing
      card.setPosition(cardX, cardY)
      this.heroListContainer!.add(card)
      contentTop = Math.min(contentTop, cardY - HERO_CARD_HEIGHT / 2)
      contentBottom = Math.max(contentBottom, cardY + HERO_CARD_HEIGHT / 2)
    })

    if (contentTop === Number.POSITIVE_INFINITY) {
      contentTop = this.heroViewportTop
      contentBottom = this.heroViewportTop
    }

    const viewportBottom = this.heroViewportTop + this.heroViewportHeight
    const minY = Math.min(viewportBottom - contentBottom, 0)
    this.heroListBounds = { minY, maxY: 0 }
    this.heroListContainer.setY(0)

    this.setupHeroListInput()
  }

  private createHeroCard(hero: HeroDefinition) {
    const container = this.add.container(0, 0)
    container.setSize(HERO_CARD_WIDTH, HERO_CARD_HEIGHT)

    const background = this.add
      .rectangle(0, 0, HERO_CARD_WIDTH, HERO_CARD_HEIGHT, 0x1b1b2b, 0.92)
      .setStrokeStyle(2, 0xffffff, 0.15)
      .setOrigin(0.5)

    const sprite = this.add
      .sprite(0, -HERO_CARD_HEIGHT / 2 + 70, ONE_BIT_PACK.key, hero.spriteFrame)
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
        wordWrap: { width: HERO_CARD_WIDTH - 40 }
      })
      .setOrigin(0.5, 0)

    container.add([background, sprite, nameText, weaponText, description])

    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, HERO_CARD_WIDTH, HERO_CARD_HEIGHT),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    })
    container.on('pointerover', () => background.setStrokeStyle(2, 0xffeb3b, 0.9))
    container.on('pointerout', () => background.setStrokeStyle(2, 0xffffff, 0.15))
    container.on('pointerup', () => {
      if (this.heroSelectionLocked) return
      this.handleHeroPick(hero.id)
    })
    return container
  }

  private setupHeroListInput() {
    this.input.on('wheel', (_pointer: any, _objects: any, _dx: number, dy: number) => this.adjustHeroListPosition(-dy))
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isPointerInHeroViewport(pointer)) return
      this.scrollPointerId = pointer.id
      this.isDraggingHeroList = false
      this.heroSelectionLocked = false
      this.dragStartPointerY = pointer.y
      this.dragStartListY = this.heroListContainer?.y ?? 0
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || pointer.id !== this.scrollPointerId) return
      const delta = pointer.y - this.dragStartPointerY
      if (!this.isDraggingHeroList && Math.abs(delta) >= DRAG_THRESHOLD) {
        this.isDraggingHeroList = true
        this.heroSelectionLocked = true
      }
      if (this.isDraggingHeroList) {
        this.setHeroListPosition(this.dragStartListY + delta)
      }
    })
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => this.endHeroListDrag(pointer))
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => this.endHeroListDrag(pointer))
  }

  private adjustHeroListPosition(delta: number) {
    if (!this.heroListContainer || delta === 0) return
    this.setHeroListPosition(this.heroListContainer.y + delta)
  }

  private setHeroListPosition(value: number) {
    if (!this.heroListContainer) return
    const { minY, maxY } = this.heroListBounds
    const clamped = Phaser.Math.Clamp(value, minY, maxY)
    this.heroListContainer.setY(clamped)
  }

  private isPointerInHeroViewport(pointer: Phaser.Input.Pointer) {
    const top = this.heroViewportTop
    const bottom = top + this.heroViewportHeight
    return pointer.y >= top && pointer.y <= bottom
  }

  private endHeroListDrag(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.scrollPointerId) return
    const unlockSelection = this.isDraggingHeroList
    this.isDraggingHeroList = false
    this.scrollPointerId = null
    if (unlockSelection) {
      this.time.delayedCall(0, () => {
        this.heroSelectionLocked = false
      })
    }
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
