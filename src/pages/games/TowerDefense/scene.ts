import Phaser from 'phaser'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../Hordes/game/sprite.ts'
import { type GameMap, printGameMap, type TileType, TowerDefenseMapGenerator } from './game/map.ts'
import { MapRenderer } from './game/mapRenderer.ts'
import {
  BASE_HP,
  ENEMIES_PER_WAVE,
  ENEMIES_PER_WAVE_GROWTH,
  ENEMY_BASE_HP,
  ENEMY_BASE_REWARD,
  ENEMY_BASE_SPEED,
  ENEMY_HP_PER_WAVE,
  ENEMY_REWARD_PER_WAVE,
  ENEMY_SPEED_PER_WAVE,
  MAP_HEIGHT,
  MAP_ROAD_LENGTH,
  MAP_WIDTH,
  MIN_SPAWN_DELAY,
  STARTING_COINS,
  WAVE_BREAK
} from './game/constants.ts'
import {
  DEFAULT_TOWER_LEVEL_TINTS,
  type Tower,
  TOWER_DEFINITIONS,
  TowerController,
  type TowerDefinition,
  type TowerTypeKey
} from './towers.ts'

interface ExitStats {
  waves: number
  leaks: number
  coinsEarned: number
}

interface BuildSpot {
  id: number
  col: number
  row: number
  occupied: boolean
  marker: Phaser.GameObjects.Sprite
}

interface Enemy {
  sprite: Phaser.GameObjects.Sprite
  distance: number
  baseSpeed: number
  slowFactor: number
  slowUntil: number
  hp: number
  maxHp: number
  reward: number
  leakDamage: number
  baseTint: number
}

interface TowerSidebarEntry {
  definition: TowerDefinition
  container: Phaser.GameObjects.Container
  background: Phaser.GameObjects.Rectangle
  costText: Phaser.GameObjects.Text
  icon: Phaser.GameObjects.Sprite
}

interface DragState {
  definition: TowerDefinition
  pointerId: number
  sprite: Phaser.GameObjects.Sprite
}

/**
 * Lightweight Phaser scene implementing a simple tower defence loop.
 */
export class TowerDefenseScene extends Phaser.Scene implements Phaser.Types.Scenes.CreateSceneFromObjectConfig {
  private static exitHandler?: (stats: ExitStats) => void

  private readonly mapGenerator = new TowerDefenseMapGenerator({
    height: MAP_HEIGHT,
    width: MAP_WIDTH,
    roadLength: MAP_ROAD_LENGTH
  })
  private gameMap!: GameMap
  private mapRenderer!: MapRenderer
  private buildSpots: BuildSpot[] = []
  private towers: Tower[] = []
  private towerController?: TowerController<Enemy>
  private enemies: Enemy[] = []
  private selectedTowerDefinition: TowerDefinition = TOWER_DEFINITIONS[0]
  private path!: Phaser.Curves.Path
  private pathLength = 0
  private enemyOverlay?: Phaser.GameObjects.Graphics
  private towerOverlay?: Phaser.GameObjects.Graphics
  private timers: Phaser.Time.TimerEvent[] = []
  private wave = 0
  private leaks = 0
  private baseHp = BASE_HP
  private coins = STARTING_COINS
  private coinsEarned = 0
  private hudWave!: Phaser.GameObjects.Text
  private hudHp!: Phaser.GameObjects.Text
  private hudCoins!: Phaser.GameObjects.Text
  private hudLeaks!: Phaser.GameObjects.Text
  private hudTower!: Phaser.GameObjects.Text
  private hudHint!: Phaser.GameObjects.Text
  private exitButton!: Phaser.GameObjects.Text
  private baseMarker!: Phaser.GameObjects.Rectangle
  private runEnded = false
  private mapRotatedForVerticalMode = false
  private sidebarContainer?: Phaser.GameObjects.Container
  private sidebarEntries = new Map<TowerTypeKey, TowerSidebarEntry>()
  private sidebarWidth = 0
  private placementOverlay?: Phaser.GameObjects.Graphics
  private dragState?: DragState
  private isHudPaused = false
  private towerDetailsHud?: { definition: TowerDefinition; container: Phaser.GameObjects.Container }

  static registerExitHandler(handler?: (stats: ExitStats) => void) {
    TowerDefenseScene.exitHandler = handler
  }

  preload() {
    this.load.setPath('')
    if (!this.textures.exists(ONE_BIT_PACK.key)) {
      this.load.spritesheet(ONE_BIT_PACK.key, ONE_BIT_PACK.url, {
        frameWidth: ONE_BIT_PACK.frameWidth,
        frameHeight: ONE_BIT_PACK.frameHeight,
        spacing: ONE_BIT_PACK.spacing
      })
    }
  }

  private resetState() {
    this.timers.forEach((timer) => timer.remove())
    this.timers = []
    this.time.removeAllEvents()
    this.towerController = undefined
    this.towerDetailsHud?.container.destroy(true)
    this.towerDetailsHud = undefined
    this.dragState?.sprite.destroy()
    this.dragState = undefined
    this.placementOverlay?.destroy()
    this.placementOverlay = undefined
    this.enemyOverlay?.destroy()
    this.enemyOverlay = undefined
    this.towerOverlay?.destroy()
    this.towerOverlay = undefined
    this.sidebarEntries.clear()
    this.gameMap = this.mapGenerator.getMap()
    this.buildSpots = []
    this.towers = []
    this.enemies = []
    this.selectedTowerDefinition = TOWER_DEFINITIONS[0]
    this.pathLength = 0
    this.wave = 0
    this.leaks = 0
    this.baseHp = BASE_HP
    this.coins = STARTING_COINS
    this.coinsEarned = 0
    this.runEnded = false
    this.isHudPaused = false
    this.mapRotatedForVerticalMode = false
  }

  // Scene setup entry point.
  create() {
    this.resetState()
    this.rotateMapForVerticalStartIfNeeded()
    printGameMap(this.gameMap)
    // const {width, height} = this.scale
    this.cameras.main.setBackgroundColor('#0b0f19')
    this.ensureEnemyWalkAnimation()

    this.enemyOverlay = this.add.graphics().setDepth(5)
    this.towerOverlay = this.add.graphics().setDepth(4)
    this.placementOverlay = this.add.graphics().setDepth(16)
    this.towerController = new TowerController<Enemy>({
      getEnemies: () => this.enemies,
      getOverlay: () => this.towerOverlay,
      getCurrentTime: () => this.time.now,
      onKill: (enemy) => this.handleKill(enemy)
    })

    this.sidebarWidth = this.computeSidebarWidth()
    this.mapRenderer = new MapRenderer(this, this.gameMap)
    this.mapRenderer.setViewportPadding({
      left: 16,
      right: this.sidebarWidth + 24,
      top: 16,
      bottom: 24
    })
    this.mapRenderer.render()

    this.createPath()
    this.createBaseMarker()
    this.createBuildSpots()
    this.createHud()
    this.createSidebar()
    this.configureInput()

    this.scale.on('resize', this.handleResize, this)
    this.time.delayedCall(600, () => this.startNextWave())
  }

  // Frame update loop.
  update(_: number, delta: number) {
    if (this.runEnded || this.isHudPaused) return
    const deltaSeconds = delta / 1000
    this.updateEnemies(deltaSeconds)
    this.updateTowers(delta)
    this.renderOverlays()
  }

  // Builds the grid visuals and path curve.
  private createPath() {
    const path = this.gameMap.path
    if (path.length === 0 || !this.mapRenderer) return
    const firstPoint = this.mapRenderer.gridToWorldCenter(path[0].col, path[0].row)
    this.path = new Phaser.Curves.Path(firstPoint.x, firstPoint.y)
    for (let i = 1; i < path.length; i += 1) {
      const point = this.mapRenderer.gridToWorldCenter(path[i].col, path[i].row)
      this.path.lineTo(point.x, point.y)
    }
    this.pathLength = this.path.getLength()
  }

  // Draws the goal/base tile.
  private createBaseMarker() {
    this.baseMarker?.destroy()
    const path = this.gameMap.path
    if (path.length === 0 || !this.mapRenderer) return
    const target = path[path.length - 1]
    const endPoint = this.mapRenderer.gridToWorldCenter(target.col, target.row)
    const tileSize = this.mapRenderer.getTileSize()
    const size = tileSize * 0.9
    this.baseMarker = this.add
      .rectangle(endPoint.x, endPoint.y, size, size, 0x14222f)
      .setStrokeStyle(2, 0x3ad0ff, 0.6)
      .setDepth(2)
  }

  // Spawns clickable tower pads.
  private createBuildSpots() {
    if (!this.mapRenderer) return
    this.buildSpots = []
    let index = 0
    for (let row = 0; row < this.gameMap.rows; row += 1) {
      for (let col = 0; col < this.gameMap.cols; col += 1) {
        if (this.gameMap.tiles[row][col] !== 'build') continue
        const marker = this.mapRenderer.getTileSprite(col, row)
        if (!marker) continue
        const spot: BuildSpot = {
          id: index,
          col,
          row,
          occupied: false,
          marker
        }
        this.buildSpots.push(spot)
        this.applyBuildSpotAppearance(spot)
        index += 1
      }
    }
  }

  // Initializes HUD labels/tooltips.
  private createHud() {
    this.hudWave?.destroy()
    this.hudHp?.destroy()
    this.hudCoins?.destroy()
    this.hudLeaks?.destroy()
    this.hudTower?.destroy()
    this.hudHint?.destroy()
    this.exitButton?.destroy()

    this.hudWave = this.add.text(16, 16, '', this.hudStyle())
    this.hudHp = this.add.text(16, 44, '', this.hudStyle())
    this.hudCoins = this.add.text(16, 72, '', this.hudStyle())
    this.hudLeaks = this.add.text(16, 100, '', this.hudStyle())
    this.hudTower = this.add.text(16, 128, '', {
      ...this.hudStyle(),
      fontSize: '16px',
      color: '#7dd3fc'
    })
    this.hudHint = this.add.text(16, 154, 'Drag towers from the sidebar. Tap a placed tower to upgrade.', {
      ...this.hudStyle(),
      fontSize: '14px',
      color: '#94a3b8'
    })
    this.exitButton = this.add
      .text(this.scale.width - 20, 16, 'Exit', { ...this.hudStyle(), color: '#f87171' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.endRun())
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 24,
        'Drag towers from the sidebar • Info buttons pause the game.',
        {
          ...this.hudStyle(),
          fontSize: '14px',
          color: '#9ca3af'
        }
      )
      .setOrigin(0.5, 1)
    this.refreshHud()
  }

  // Wires pointer and keyboard input.
  private configureInput() {
    const keyboard = this.input.keyboard
    keyboard?.on('keydown-ESC', () => this.endRun())
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.runEnded || this.isHudPaused || this.dragState) return
      if (pointer.event?.defaultPrevented) return
      const spot = this.getBuildSpotAt(pointer.worldX, pointer.worldY)
      if (!spot || !spot.occupied) return
      this.tryUpgradeTower(spot, pointer.worldX, pointer.worldY)
    })
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragState || pointer.id !== this.dragState.pointerId) return
      this.updateTowerDrag(pointer)
    })
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragState || pointer.id !== this.dragState.pointerId) return
      this.completeTowerDrag(pointer)
    })
    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragState || pointer.id !== this.dragState.pointerId) return
      this.cancelTowerDrag()
    })
  }

  private createSidebar() {
    this.sidebarContainer?.destroy(true)
    this.sidebarEntries.clear()
    const width = this.sidebarWidth
    const height = this.scale.height
    const container = this.add.container(this.scale.width - width, 0).setDepth(12)
    this.sidebarContainer = container
    const background = this.add
      .rectangle(width / 2, height / 2, width, height, 0x050a11, 0.92)
      .setOrigin(0.5)
      .setInteractive()
    background.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event?.stopPropagation()
      pointer.event?.preventDefault()
    })
    container.add(background)

    const title = this.add
      .text(width / 2, 16, 'Towers', {
        ...this.hudStyle(),
        fontSize: '20px',
        color: '#f8fafc'
      })
      .setOrigin(0.5, 0)
    container.add(title)

    const cardWidth = width - 24
    const cardHeight = 76
    let offsetY = 56

    for (const definition of TOWER_DEFINITIONS) {
      const card = this.add.container(12, offsetY)
      const cardBg = this.add
        .rectangle(0, 0, cardWidth, cardHeight, 0x111827, 0.9)
        .setOrigin(0)
        .setStrokeStyle(1, 0x1f2937, 0.8)
        .setInteractive({ useHandCursor: true })
      const startDrag = (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation()
        pointer.event?.preventDefault()
        if (pointer.event && 'button' in pointer.event && pointer.event.button !== 0) return
        this.startTowerDrag(definition, pointer)
      }
      cardBg.on('pointerdown', startDrag)

      const iconSize = Math.min(48, cardHeight - 20)
      const icon = this.add
        .sprite(18, cardHeight / 2, ONE_BIT_PACK.key, definition.spriteFrame)
        .setOrigin(0, 0.5)
        .setDisplaySize(iconSize, iconSize)
        .setTint(definition.levelTints?.[0] ?? DEFAULT_TOWER_LEVEL_TINTS[0])
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', startDrag)

      const label = this.add
        .text(icon.x + iconSize + 10, cardHeight / 2 - 16, definition.label, {
          ...this.hudStyle(),
          fontSize: '16px'
        })
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', startDrag)

      const helper = this.add.text(icon.x + iconSize + 10, cardHeight / 2 + 6, 'Drag to build', {
        ...this.hudStyle(),
        fontSize: '12px',
        color: '#94a3b8'
      })

      const costIcon = this.add
        .sprite(cardWidth - 76, cardHeight / 2, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.dollar)
        .setOrigin(0, 0.5)
        .setDisplaySize(18, 18)
        .setTint(0xfacc15)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', startDrag)

      const costText = this.add
        .text(costIcon.x + 20, cardHeight / 2, `${definition.levels[0].cost}`, {
          ...this.hudStyle(),
          fontSize: '16px',
          color: '#facc15'
        })
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', startDrag)

      const infoButton = this.add
        .sprite(cardWidth - 24, cardHeight / 2, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.arrowRightOutline)
        .setOrigin(0.5)
        .setDisplaySize(20, 20)
        .setTint(0x7dd3fc)
        .setInteractive({ useHandCursor: true })
      infoButton.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation()
        pointer.event?.preventDefault()
        this.openTowerDetails(definition)
      })

      card.add([cardBg, icon, label, helper, costIcon, costText, infoButton])
      container.add(card)
      this.sidebarEntries.set(definition.key, {
        definition,
        container: card,
        background: cardBg,
        costText,
        icon
      })
      offsetY += cardHeight + 16
    }

    this.refreshTowerCardsAffordability()
  }

  private computeSidebarWidth() {
    const width = this.scale.width
    if (width < 640) {
      return Math.max(140, Math.round(width * 0.38))
    }
    if (width < 960) {
      return 180
    }
    return 240
  }

  private startTowerDrag(definition: TowerDefinition, pointer: Phaser.Input.Pointer) {
    if (this.runEnded || this.isHudPaused) return
    if (this.dragState) {
      this.cancelTowerDrag()
    }
    this.selectedTowerDefinition = definition
    const tileSize = Math.max(this.mapRenderer?.getTileSize() ?? 64, 32)
    const sprite = this.add
      .sprite(pointer.worldX, pointer.worldY, ONE_BIT_PACK.key, definition.spriteFrame)
      .setOrigin(0.5)
      .setDisplaySize(tileSize * 0.6, tileSize * 0.6)
      .setTint(definition.levelTints?.[0] ?? DEFAULT_TOWER_LEVEL_TINTS[0])
      .setDepth(25)
      .setAlpha(0.9)
    this.dragState = {
      definition,
      pointerId: pointer.id,
      sprite
    }
    this.updatePlacementOverlay(pointer.worldX, pointer.worldY, this.getBuildSpotAt(pointer.worldX, pointer.worldY))
    this.refreshHud()
  }

  private updateTowerDrag(pointer: Phaser.Input.Pointer) {
    if (!this.dragState) return
    this.dragState.sprite.setPosition(pointer.worldX, pointer.worldY)
    const spot = this.getBuildSpotAt(pointer.worldX, pointer.worldY)
    this.updatePlacementOverlay(pointer.worldX, pointer.worldY, spot)
  }

  private completeTowerDrag(pointer: Phaser.Input.Pointer) {
    if (!this.dragState) return
    const { definition } = this.dragState
    const spot = this.getBuildSpotAt(pointer.worldX, pointer.worldY)
    if (!spot || spot.occupied) {
      this.showFloatingText(pointer.worldX, pointer.worldY, 'Pick a free build pad')
      this.cancelTowerDrag()
      return
    }
    const cost = definition.levels[0].cost
    if (this.coins < cost) {
      this.showFloatingText(pointer.worldX, pointer.worldY, `Need ${cost} coins`)
      this.cancelTowerDrag()
      return
    }
    this.placeTower(spot, definition)
    this.cancelTowerDrag()
  }

  private cancelTowerDrag() {
    if (!this.dragState) return
    const { sprite } = this.dragState
    sprite.destroy()
    this.dragState = undefined
    this.placementOverlay?.clear()
  }

  private getBuildSpotAt(worldX: number, worldY: number) {
    return this.buildSpots.find((candidate) => candidate.marker.getBounds().contains(worldX, worldY))
  }

  private updatePlacementOverlay(worldX: number, worldY: number, hoveredSpot?: BuildSpot) {
    if (!this.placementOverlay || !this.dragState) return
    this.placementOverlay.clear()
    const stats = this.dragState.definition.levels[0]
    const affordable = this.coins >= stats.cost
    if (hoveredSpot && this.mapRenderer) {
      const tileCenter = this.mapRenderer.gridToWorldCenter(hoveredSpot.col, hoveredSpot.row)
      const tileSize = this.mapRenderer.getTileSize()
      const valid = !hoveredSpot.occupied && affordable
      const fillColor = valid ? 0x22c55e : 0xf87171
      this.placementOverlay.fillStyle(fillColor, 0.28)
      this.placementOverlay.fillRoundedRect(
        tileCenter.x - tileSize / 2,
        tileCenter.y - tileSize / 2,
        tileSize,
        tileSize,
        8
      )
    }
    if (stats.range > 0) {
      const radiusColor = affordable ? 0x38bdf8 : 0xf87171
      this.placementOverlay.lineStyle(2, radiusColor, 0.85).strokeCircle(worldX, worldY, stats.range)
    }
  }

  private openTowerDetails(definition: TowerDefinition, preservePause = false) {
    if (this.towerDetailsHud) return
    this.cancelTowerDrag()
    if (!preservePause) {
      this.setHudPause(true)
    }
    const width = this.scale.width
    const height = this.scale.height
    const panelWidth = Math.min(420, width - 80)
    const panelHeight = Math.min(380, height - 80)
    const centerX = width / 2
    const centerY = height / 2
    const container = this.add.container(0, 0).setDepth(30)
    const scrim = this.add
      .rectangle(centerX, centerY, width, height, 0x020617, 0.65)
      .setInteractive()
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation()
        pointer.event?.preventDefault()
      })
    const panel = this.add
      .rectangle(centerX, centerY, panelWidth, panelHeight, 0x0f172a, 0.96)
      .setStrokeStyle(2, 0x38bdf8, 0.45)

    const title = this.add.text(
      centerX - panelWidth / 2 + 24,
      centerY - panelHeight / 2 + 24,
      `${definition.label} Tower`,
      {
        ...this.hudStyle(),
        fontSize: '20px'
      }
    )

    const spriteSize = Math.min(80, panelHeight / 4)
    const sprite = this.add
      .sprite(centerX - panelWidth / 2 + 60, centerY - panelHeight / 2 + 90, ONE_BIT_PACK.key, definition.spriteFrame)
      .setDisplaySize(spriteSize, spriteSize)
      .setTint(definition.levelTints?.[0] ?? DEFAULT_TOWER_LEVEL_TINTS[0])

    const stats = definition.levels[0]
    const statsText = this.add.text(centerX - panelWidth / 2 + 120, centerY - panelHeight / 2 + 64, '', {
      ...this.hudStyle(),
      fontSize: '16px'
    })
    const cooldownSeconds = (stats.fireRate / 1000).toFixed(1)
    const radiusTiles = this.getRangeInTiles(stats.range)
    statsText.setText(`Damage: ${stats.damage}\nCooldown: ${cooldownSeconds}s\nRadius: ${radiusTiles} tiles`)

    const description = this.add.text(
      centerX - panelWidth / 2 + 24,
      centerY - panelHeight / 2 + 160,
      definition.description,
      {
        ...this.hudStyle(),
        fontSize: '14px',
        wordWrap: { width: panelWidth - 48 }
      }
    )

    const closeButton = this.add
      .text(centerX, centerY + panelHeight / 2 - 32, 'Close HUD', {
        ...this.hudStyle(),
        fontSize: '16px',
        color: '#fbbf24'
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        pointer.event?.stopPropagation()
        pointer.event?.preventDefault()
        this.closeTowerDetails()
      })

    container.add([scrim, panel, title, sprite, statsText, description, closeButton])
    this.towerDetailsHud = { definition, container }
  }

  private closeTowerDetails(resume = true) {
    if (!this.towerDetailsHud) return
    this.towerDetailsHud.container.destroy(true)
    this.towerDetailsHud = undefined
    if (resume) {
      this.setHudPause(false)
    }
  }

  private setHudPause(paused: boolean) {
    if (this.isHudPaused === paused) return
    this.isHudPaused = paused
    this.time.timeScale = paused ? 0 : 1
  }

  private getRangeInTiles(range: number) {
    const tileSize = this.mapRenderer ? this.mapRenderer.getTileSize() : 1
    if (tileSize <= 0) {
      return Math.max(1, Math.floor(range / 60))
    }
    return Math.max(1, Math.floor(range / tileSize))
  }

  private tryUpgradeTower(spot: BuildSpot, worldX: number, worldY: number) {
    const tower = this.towers.find((candidate) => candidate.spotId === spot.id)
    if (!tower) return
    const nextLevelIndex = tower.level + 1
    if (nextLevelIndex >= tower.definition.levels.length) {
      this.showFloatingText(worldX, worldY, 'Max level')
      return
    }
    const cost = tower.definition.levels[nextLevelIndex].cost
    if (this.coins < cost) {
      this.showFloatingText(worldX, worldY, `Need ${cost} coins`)
      return
    }
    this.coins -= cost
    tower.level = nextLevelIndex
    tower.stats = { ...tower.definition.levels[nextLevelIndex] }
    tower.cooldown = 0
    this.applyBuildSpotAppearance(spot)
    this.refreshHud()
    const tileSize = this.mapRenderer ? this.mapRenderer.getTileSize() : 0
    const offset = Math.max(24, tileSize * 0.5)
    this.showFloatingText(tower.sprite.x, tower.sprite.y - offset, `Lvl ${tower.level + 1}`, '#facc15')
  }

  // Begins the next wave timer.
  private startNextWave() {
    if (this.runEnded) return
    this.wave += 1
    this.refreshHud()

    const enemiesThisWave = ENEMIES_PER_WAVE + Math.max(0, this.wave - 1) * ENEMIES_PER_WAVE_GROWTH
    const spawnDelay = Math.max(MIN_SPAWN_DELAY, 900 - this.wave * 40)
    const timer = this.time.addEvent({
      delay: spawnDelay,
      repeat: enemiesThisWave - 1,
      callback: () => {
        this.spawnEnemy()
      },
      callbackScope: this
    })
    this.timers.push(timer)
    this.spawnEnemy()
    const totalSpawnTime = spawnDelay * Math.max(enemiesThisWave - 1, 0)
    // Schedule downtime before the next wave.
    const breakTimer = this.time.delayedCall(totalSpawnTime + WAVE_BREAK, () => {
      this.timers = this.timers.filter((current) => current !== breakTimer)
      if (this.runEnded) return
      this.startNextWave()
    })
    this.timers.push(breakTimer)
  }

  // Spawns a new enemy at the path start.
  private spawnEnemy() {
    const hp = ENEMY_BASE_HP + (this.wave - 1) * ENEMY_HP_PER_WAVE
    const speed = ENEMY_BASE_SPEED + (this.wave - 1) * ENEMY_SPEED_PER_WAVE
    const reward = ENEMY_BASE_REWARD + (this.wave - 1) * ENEMY_REWARD_PER_WAVE
    const startPoint = new Phaser.Math.Vector2()
    this.path.getPoint(0, startPoint)
    const tileSize = this.mapRenderer ? this.mapRenderer.getTileSize() : 64
    const enemySize = tileSize * 0.7
    const baseTint = 0xdc5c72
    const sprite = this.add
      .sprite(startPoint.x, startPoint.y, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1)
      .setOrigin(0.5)
      .setDisplaySize(enemySize, enemySize)
      .setTint(baseTint)
      .setDepth(6)
    if (this.anims.exists('enemy-walk')) {
      sprite.play('enemy-walk')
      sprite.anims.setProgress(Math.random())
    }
    this.enemies.push({
      sprite,
      distance: 0,
      baseSpeed: speed,
      slowFactor: 1,
      slowUntil: 0,
      hp,
      maxHp: hp,
      reward,
      leakDamage: 1,
      baseTint
    })
  }

  // Places a tower on the chosen pad.
  private placeTower(spot: BuildSpot, definition: TowerDefinition = this.selectedTowerDefinition) {
    if (!this.mapRenderer) return
    const towerSprite = spot.marker
    const stats = { ...definition.levels[0] }
    const tower: Tower = {
      spotId: spot.id,
      sprite: towerSprite,
      definition,
      level: 0,
      cooldown: 0,
      stats
    }
    this.towers.push(tower)
    this.coins -= stats.cost
    this.applyBuildSpotAppearance(spot)
    this.selectedTowerDefinition = definition
    this.refreshHud()
    const tileSize = this.mapRenderer.getTileSize()
    const offset = Math.max(24, tileSize * 0.5)
    this.showFloatingText(towerSprite.x, towerSprite.y - offset, `${definition.label} ready`)
  }

  // Advances enemies along the path.
  private updateEnemies(deltaSeconds: number) {
    const point = new Phaser.Math.Vector2()
    const remaining: Enemy[] = []
    const now = this.time.now
    for (const enemy of this.enemies) {
      if (enemy.slowUntil <= now && enemy.slowFactor < 1) {
        enemy.slowFactor = 1
        enemy.sprite.setTint(enemy.baseTint)
      }
      const speed = enemy.baseSpeed * enemy.slowFactor
      enemy.distance += speed * deltaSeconds
      const progress = enemy.distance / this.pathLength
      if (progress >= 1) {
        this.handleLeak(enemy)
        enemy.sprite.destroy()
        continue
      }
      this.path.getPoint(progress, point)
      enemy.sprite.setPosition(point.x, point.y)
      remaining.push(enemy)
    }
    this.enemies = remaining
  }

  // Handles tower cooldowns and attacks.
  private updateTowers(delta: number) {
    this.towerController?.update(this.towers, delta)
  }

  // Redraws enemy HP bars.
  private renderOverlays() {
    if (!this.enemyOverlay || !this.mapRenderer) return
    this.enemyOverlay.clear()
    this.enemyOverlay.fillStyle(0x1f2937, 0.8)
    const tileSize = this.mapRenderer.getTileSize()
    const barWidth = Math.max(24, tileSize * 0.7)
    const barHeight = Math.max(4, tileSize * 0.12)
    for (const enemy of this.enemies) {
      const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1)
      const offsetY = enemy.sprite.displayHeight / 2 + Math.max(6, tileSize * 0.15)
      this.enemyOverlay.fillRect(enemy.sprite.x - barWidth / 2, enemy.sprite.y - offsetY, barWidth, barHeight)
      this.enemyOverlay.fillStyle(0xf97316, 0.9)
      this.enemyOverlay.fillRect(
        enemy.sprite.x - barWidth / 2 + 1,
        enemy.sprite.y - offsetY + 1,
        (barWidth - 2) * ratio,
        barHeight - 2
      )
      this.enemyOverlay.fillStyle(0x1f2937, 0.8)
    }
  }

  // Processes enemies reaching the base.
  private handleLeak(enemy: Enemy) {
    this.baseHp = Math.max(0, this.baseHp - enemy.leakDamage)
    this.leaks += 1
    this.refreshHud()
    this.showFloatingText(this.baseMarker.x, this.baseMarker.y, 'Leak!', '#f87171')
    if (this.baseHp <= 0) {
      this.endRun()
    }
  }

  // Rewards the player for a kill.
  private handleKill(enemy: Enemy) {
    const { x, y } = enemy.sprite
    enemy.sprite.destroy()
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy)
    this.coins += enemy.reward
    this.coinsEarned += enemy.reward
    this.refreshHud()
    const tileSize = this.mapRenderer.getTileSize()
    const offset = Math.max(18, tileSize * 0.45)
    this.showFloatingText(x, y - offset, `+${enemy.reward}`, '#34d399')
  }

  // Updates HUD stats each frame.
  private refreshHud() {
    this.hudWave.setText(`Wave ${this.wave}`)
    this.hudHp.setText(`Base HP: ${this.baseHp}`)
    this.hudCoins.setText(`Coins: ${this.coins}`)
    this.hudLeaks.setText(`Leaks: ${this.leaks}`)
    if (this.hudTower) {
      const stats = this.selectedTowerDefinition.levels[0]
      this.hudTower.setText(`Last dragged: ${this.selectedTowerDefinition.label} - ${stats.cost}c`)
    }
    if (this.baseMarker) {
      this.baseMarker.setFillStyle(this.baseHp > 5 ? 0x14222f : 0x3f1d2b, 1)
    }
    this.refreshTowerCardsAffordability()
  }

  private refreshTowerCardsAffordability() {
    const baseColor = 0x111827
    this.sidebarEntries.forEach((entry) => {
      const affordable = this.coins >= entry.definition.levels[0].cost
      entry.background.setFillStyle(baseColor, affordable ? 0.9 : 0.45)
      entry.icon.setAlpha(affordable ? 1 : 0.5)
      entry.costText.setColor(affordable ? '#facc15' : '#f87171')
    })
  }

  // Repositions everything when the canvas resizes.
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize
    if (!width || !height || !this.mapRenderer) return
    const openDefinition = this.towerDetailsHud?.definition
    if (openDefinition) {
      this.closeTowerDetails(false)
    }
    this.cancelTowerDrag()
    const previousLength = this.pathLength
    this.sidebarWidth = this.computeSidebarWidth()
    this.mapRenderer.setViewportPadding({
      left: 16,
      right: this.sidebarWidth + 24,
      top: 16,
      bottom: 24
    })
    this.mapRenderer.render()
    const tileSize = this.mapRenderer.getTileSize()
    this.createPath()
    this.createBaseMarker()
    this.buildSpots.forEach((spot) => {
      const world = this.mapRenderer.gridToWorldCenter(spot.col, spot.row)
      const tower = this.towers.find((candidate) => candidate.spotId === spot.id)
      if (tower) {
        const size = tileSize * 0.6
        tower.sprite.setPosition(world.x, world.y).setDisplaySize(size, size)
      }
      this.applyBuildSpotAppearance(spot)
    })
    const enemySize = tileSize * 0.7
    const point = new Phaser.Math.Vector2()
    for (const enemy of this.enemies) {
      const progress = previousLength > 0 ? enemy.distance / previousLength : 0
      enemy.distance = progress * this.pathLength
      this.path.getPoint(progress, point)
      enemy.sprite.setPosition(point.x, point.y).setDisplaySize(enemySize, enemySize)
    }
    this.exitButton?.setPosition(width - 20, 16)
    this.createSidebar()
    if (openDefinition) {
      this.openTowerDetails(openDefinition, true)
    }
  }

  // Stops the scene and reports results.
  private endRun() {
    if (this.runEnded) return
    this.cancelTowerDrag()
    this.closeTowerDetails()
    this.setHudPause(false)
    this.runEnded = true
    this.timers.forEach((timer) => timer.remove())
    this.timers = []
    this.time.removeAllEvents()
    const stats: ExitStats = {
      waves: this.wave,
      leaks: this.leaks,
      coinsEarned: this.coinsEarned
    }
    TowerDefenseScene.exitHandler?.(stats)
    this.scene.stop()
  }

  // Creates a short-lived floating label.
  private showFloatingText(x: number, y: number, message: string, color = '#fbbf24') {
    const tileSize = this.mapRenderer ? this.mapRenderer.getTileSize() : 0
    const travel = Math.max(28, tileSize * 0.5)
    const text = this.add
      .text(x, y, message, { ...this.hudStyle(), fontSize: '14px', color })
      .setOrigin(0.5, 1)
      .setDepth(10)
    this.tweens.add({
      targets: text,
      y: y - travel,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    })
  }

  // Shared HUD text styling.
  private hudStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f8fafc'
    }
  }

  // Highlights build tiles based on occupancy.
  private applyBuildSpotAppearance(spot: BuildSpot) {
    if (!this.mapRenderer) return
    const tower = this.towers.find((candidate) => candidate.spotId === spot.id)
    const occupied = Boolean(tower)
    spot.occupied = occupied
    if (!occupied || !tower) {
      this.mapRenderer.applyBuildSpotAppearance(spot.marker, false)
      return
    }
    const tintPalette = tower.definition.levelTints ?? DEFAULT_TOWER_LEVEL_TINTS
    const tint = tintPalette[Math.min(tower.level, tintPalette.length - 1)]
    this.mapRenderer.applyBuildSpotAppearance(spot.marker, true, tower.definition.spriteFrame, tint)
  }

  private rotateMapForVerticalStartIfNeeded() {
    if (this.mapRotatedForVerticalMode) return
    const isPortrait =
      this.scale.orientation === Phaser.Scale.Orientation.PORTRAIT || this.scale.height > this.scale.width
    if (!isPortrait) {
      return
    }
    this.rotateGameMapClockwise()
    this.mapRotatedForVerticalMode = true
  }

  private rotateGameMapClockwise() {
    const originalRows = this.gameMap.rows
    const originalCols = this.gameMap.cols
    const rotatedTiles: TileType[][] = Array.from({ length: originalCols }, () => new Array<TileType>(originalRows))
    for (let row = 0; row < originalRows; row += 1) {
      for (let col = 0; col < originalCols; col += 1) {
        const newRow = col
        const newCol = originalRows - 1 - row
        rotatedTiles[newRow][newCol] = this.gameMap.tiles[row][col]
      }
    }
    this.gameMap.tiles = rotatedTiles
    this.gameMap.rows = originalCols
    this.gameMap.cols = originalRows
    this.gameMap.path = this.gameMap.path.map(({ col, row }) => ({
      col: originalRows - 1 - row,
      row: col
    }))
  }

  // Registers the shared mob walk animation.
  private ensureEnemyWalkAnimation() {
    if (!this.textures.exists(ONE_BIT_PACK.key)) return
    if (this.anims.exists('enemy-walk')) return
    const frames = [ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1, ONE_BIT_PACK_KNOWN_FRAMES.mobWalk2].map((frame) => ({
      key: ONE_BIT_PACK.key,
      frame
    }))
    this.anims.create({
      key: 'enemy-walk',
      frames,
      frameRate: 6,
      repeat: -1
    })
  }
}

export type { ExitStats }
