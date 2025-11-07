import Phaser from 'phaser'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../Hordes/game/sprite.ts'
import { type GameMap, printGameMap, TowerDefenseMapGenerator } from './game/map.ts'
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
  type TowerDefinition
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

/**
 * Lightweight Phaser scene implementing a simple tower defence loop.
 */
export class TowerDefenseScene extends Phaser.Scene {
  private static exitHandler?: (stats: ExitStats) => void

  private readonly mapGenerator = new TowerDefenseMapGenerator({
    height: MAP_HEIGHT,
    width: MAP_WIDTH,
    roadLength: MAP_ROAD_LENGTH
  })
  private readonly gameMap: GameMap = this.mapGenerator.getMap()
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

  static registerExitHandler(handler?: (stats: ExitStats) => void) {
    TowerDefenseScene.exitHandler = handler
  }

  // Loads shared sprite sheet when needed.
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

  // Scene setup entry point.
  create() {
    printGameMap(this.gameMap)
    // const {width, height} = this.scale
    this.cameras.main.setBackgroundColor('#0b0f19')
    this.ensureEnemyWalkAnimation()

    this.enemyOverlay = this.add.graphics().setDepth(5)
    this.towerOverlay = this.add.graphics().setDepth(4)
    this.towerController = new TowerController<Enemy>({
      getEnemies: () => this.enemies,
      getOverlay: () => this.towerOverlay,
      getCurrentTime: () => this.time.now,
      onKill: (enemy) => this.handleKill(enemy)
    })

    this.mapRenderer = new MapRenderer(this, this.gameMap)
    this.mapRenderer.render()

    this.createPath()
    this.createBaseMarker()
    this.createBuildSpots()
    this.createHud()
    this.configureInput()

    this.scale.on('resize', this.handleResize, this)
    this.time.delayedCall(600, () => this.startNextWave())
  }

  // Frame update loop.
  update(_: number, delta: number) {
    if (this.runEnded) return
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
    this.hudHint = this.add.text(16, 154, this.selectedTowerDefinition.description, {
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
      .text(this.scale.width / 2, this.scale.height - 24, 'Press 1-4 to swap. Click tower to upgrade.', {
        ...this.hudStyle(),
        fontSize: '14px',
        color: '#9ca3af'
      })
      .setOrigin(0.5, 1)
    this.refreshHud()
  }

  // Wires pointer and keyboard input.
  private configureInput() {
    const keyboard = this.input.keyboard
    keyboard?.on('keydown-ESC', () => this.endRun())
    keyboard?.on('keydown-ONE', () => this.selectTowerByShortcut('1'))
    keyboard?.on('keydown-TWO', () => this.selectTowerByShortcut('2'))
    keyboard?.on('keydown-THREE', () => this.selectTowerByShortcut('3'))
    keyboard?.on('keydown-FOUR', () => this.selectTowerByShortcut('4'))
    keyboard?.on('keydown-NUMPAD_ONE', () => this.selectTowerByShortcut('1'))
    keyboard?.on('keydown-NUMPAD_TWO', () => this.selectTowerByShortcut('2'))
    keyboard?.on('keydown-NUMPAD_THREE', () => this.selectTowerByShortcut('3'))
    keyboard?.on('keydown-NUMPAD_FOUR', () => this.selectTowerByShortcut('4'))
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.runEnded) return
      const spot = this.buildSpots.find((candidate) => {
        const bounds = candidate.marker.getBounds()
        return bounds.contains(pointer.worldX, pointer.worldY)
      })
      if (!spot) return
      if (spot.occupied) {
        this.tryUpgradeTower(spot, pointer.worldX, pointer.worldY)
        return
      }
      const cost = this.selectedTowerDefinition.levels[0].cost
      if (this.coins < cost) {
        this.showFloatingText(pointer.worldX, pointer.worldY, 'Not enough coins')
        return
      }
      this.placeTower(spot)
    })
  }

  private selectTowerByShortcut(shortcut: string) {
    const definition = TOWER_DEFINITIONS.find((candidate) => candidate.shortcut === shortcut)
    if (!definition || definition === this.selectedTowerDefinition) return
    this.selectedTowerDefinition = definition
    this.refreshHud()
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
      }
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
  private placeTower(spot: BuildSpot) {
    if (!this.mapRenderer) return
    const towerSprite = spot.marker
    const definition = this.selectedTowerDefinition
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
      this.hudTower.setText(
        `Building: ${this.selectedTowerDefinition.label} [${this.selectedTowerDefinition.shortcut}] - ${stats.cost}c`
      )
    }
    this.hudHint?.setText(this.selectedTowerDefinition.description)
    if (this.baseMarker) {
      this.baseMarker.setFillStyle(this.baseHp > 5 ? 0x14222f : 0x3f1d2b, 1)
    }
  }

  // Repositions everything when the canvas resizes.
  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize
    if (!width || !height || !this.mapRenderer) return
    const previousLength = this.pathLength
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
  }

  // Stops the scene and reports results.
  private endRun() {
    if (this.runEnded) return
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
