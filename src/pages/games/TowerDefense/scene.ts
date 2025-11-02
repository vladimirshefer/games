import Phaser from 'phaser'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../Hordes/game/sprite.ts'
import {
  BASE_HP,
  ENEMY_BASE_HP,
  ENEMY_BASE_REWARD,
  ENEMY_BASE_SPEED,
  ENEMIES_PER_WAVE,
  ENEMIES_PER_WAVE_GROWTH,
  ENEMY_REWARD_PER_WAVE,
  ENEMY_SPEED_PER_WAVE,
  ENEMY_HP_PER_WAVE,
  MIN_SPAWN_DELAY,
  TOWER_COST,
  TOWER_DAMAGE,
  TOWER_RANGE,
  TOWER_FIRE_RATE,
  STARTING_COINS,
  WAVE_BREAK
} from './game/constants.ts'

type ExitStats = {
  waves: number
  leaks: number
  coinsEarned: number
}

type BuildSpot = {
  id: number
  col: number
  row: number
  occupied: boolean
  marker: Phaser.GameObjects.Sprite
}

type Tower = {
  spotId: number
  sprite: Phaser.GameObjects.Sprite
  range: number
  fireRate: number
  cooldown: number
  damage: number
}

type Enemy = {
  sprite: Phaser.GameObjects.Sprite
  distance: number
  speed: number
  hp: number
  maxHp: number
  reward: number
  leakDamage: number
}

// Grid dimensions (columns x rows).
const GRID_COLS = 12
const GRID_ROWS = 8

type TileType = 'road' | 'build' | 'obstacle'

type Direction = 'up' | 'down' | 'left' | 'right'

// Layout of every tile on the board.
const GRID_MAP: TileType[][] = [
  [
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle'
  ],
  [
    'obstacle',
    'build',
    'build',
    'build',
    'obstacle',
    'build',
    'build',
    'build',
    'obstacle',
    'build',
    'build',
    'obstacle'
  ],
  ['road', 'road', 'road', 'road', 'road', 'road', 'obstacle', 'road', 'road', 'road', 'road', 'road'],
  ['obstacle', 'build', 'build', 'obstacle', 'build', 'road', 'road', 'road', 'obstacle', 'build', 'build', 'obstacle'],
  [
    'obstacle',
    'build',
    'build',
    'obstacle',
    'build',
    'obstacle',
    'obstacle',
    'build',
    'obstacle',
    'build',
    'build',
    'obstacle'
  ],
  [
    'obstacle',
    'build',
    'build',
    'obstacle',
    'build',
    'build',
    'build',
    'build',
    'obstacle',
    'build',
    'build',
    'obstacle'
  ],
  [
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'build',
    'build',
    'build',
    'obstacle',
    'build',
    'build',
    'obstacle'
  ],
  [
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle',
    'obstacle'
  ]
]

// Ordered cells the mobs traverse.
const PATH_SEQUENCE = [
  { col: 0, row: 2 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 4, row: 2 },
  { col: 5, row: 2 },
  { col: 5, row: 3 },
  { col: 6, row: 3 },
  { col: 7, row: 3 },
  { col: 7, row: 2 },
  { col: 8, row: 2 },
  { col: 9, row: 2 },
  { col: 10, row: 2 },
  { col: 11, row: 2 }
]

// Frames used to visualize the grid tiles.
const TILE_FRAME_POOL = [
  ONE_BIT_PACK_KNOWN_FRAMES.portalOpens,
  ONE_BIT_PACK_KNOWN_FRAMES.aura,
  ONE_BIT_PACK_KNOWN_FRAMES.healPotion
]

/**
 * Lightweight Phaser scene implementing a simple tower defence loop.
 */
export class TowerDefenseScene extends Phaser.Scene {
  private static exitHandler?: (stats: ExitStats) => void

  private buildSpots: BuildSpot[] = []
  private towers: Tower[] = []
  private enemies: Enemy[] = []
  private path!: Phaser.Curves.Path
  private pathLength = 0
  private pathIndexByCell = new Map<string, number>()
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
  private exitButton!: Phaser.GameObjects.Text
  private baseMarker!: Phaser.GameObjects.Rectangle
  private runEnded = false
  private gridTileSize = 0
  private gridOriginX = 0
  private gridOriginY = 0
  private tileSprites: Phaser.GameObjects.Sprite[] = []
  private tileSpriteLookup = new Map<string, Phaser.GameObjects.Sprite>()

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
    // const {width, height} = this.scale
    this.cameras.main.setBackgroundColor('#0b0f19')
    this.ensureEnemyWalkAnimation()

    this.enemyOverlay = this.add.graphics().setDepth(5)
    this.towerOverlay = this.add.graphics().setDepth(4)

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
    this.refreshGridTiles()
    const firstPoint = this.gridToWorldCenter(PATH_SEQUENCE[0].col, PATH_SEQUENCE[0].row)
    this.path = new Phaser.Curves.Path(firstPoint.x, firstPoint.y)
    this.pathIndexByCell.clear()
    this.pathIndexByCell.set(this.cellKey(PATH_SEQUENCE[0].col, PATH_SEQUENCE[0].row), 0)
    for (let i = 1; i < PATH_SEQUENCE.length; i += 1) {
      const point = this.gridToWorldCenter(PATH_SEQUENCE[i].col, PATH_SEQUENCE[i].row)
      this.path.lineTo(point.x, point.y)
      this.pathIndexByCell.set(this.cellKey(PATH_SEQUENCE[i].col, PATH_SEQUENCE[i].row), i)
    }
    this.pathLength = this.path.getLength()
  }

  // Draws the goal/base tile.
  private createBaseMarker() {
    this.baseMarker?.destroy()
    const target = PATH_SEQUENCE[PATH_SEQUENCE.length - 1]
    const endPoint = this.gridToWorldCenter(target.col, target.row)
    const size = this.gridTileSize * 0.9
    this.baseMarker = this.add
      .rectangle(endPoint.x, endPoint.y, size, size, 0x14222f)
      .setStrokeStyle(2, 0x3ad0ff, 0.6)
      .setDepth(2)
  }

  // Spawns clickable tower pads.
  private createBuildSpots() {
    this.buildSpots = []
    let index = 0
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        if (GRID_MAP[row][col] !== 'build') continue
        const marker = this.tileSpriteLookup.get(this.cellKey(col, row))
        if (!marker) continue
        const spot: BuildSpot = {
          id: index,
          col,
          row,
          occupied: false,
          marker
        }
        this.buildSpots.push(spot)
        this.applyBuildSpotTint(spot)
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
    this.exitButton?.destroy()

    this.hudWave = this.add.text(16, 16, '', this.hudStyle())
    this.hudHp = this.add.text(16, 44, '', this.hudStyle())
    this.hudCoins = this.add.text(16, 72, '', this.hudStyle())
    this.hudLeaks = this.add.text(16, 100, '', this.hudStyle())
    this.exitButton = this.add
      .text(this.scale.width - 20, 16, 'Exit', { ...this.hudStyle(), color: '#f87171' })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.endRun())
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 24,
        'Click any build tile to place a tower. Towers fire automatically.',
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
    this.input.keyboard?.on('keydown-ESC', () => this.endRun())
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.runEnded) return
      const spot = this.buildSpots.find((candidate) => {
        if (candidate.occupied) return false
        const bounds = candidate.marker.getBounds()
        return bounds.contains(pointer.worldX, pointer.worldY)
      })
      if (!spot) {
        return
      }
      if (this.coins < TOWER_COST) {
        this.showFloatingText(pointer.worldX, pointer.worldY, 'Not enough coins')
        return
      }
      this.placeTower(spot)
    })
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
    const enemySize = this.gridTileSize * 0.7
    const sprite = this.add
      .sprite(startPoint.x, startPoint.y, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1)
      .setOrigin(0.5)
      .setDisplaySize(enemySize, enemySize)
      .setTint(0xdc5c72)
      .setDepth(6)
    if (this.anims.exists('enemy-walk')) {
      sprite.play('enemy-walk')
      sprite.anims.setProgress(Math.random())
    }
    this.enemies.push({
      sprite,
      distance: 0,
      speed,
      hp,
      maxHp: hp,
      reward,
      leakDamage: 1
    })
  }

  // Places a tower on the chosen pad.
  private placeTower(spot: BuildSpot) {
    const size = this.gridTileSize * 0.6
    const towerSprite = this.add
      .sprite(spot.marker.x, spot.marker.y, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.tower1)
      .setDisplaySize(size, size)
      .setDepth(7)
    towerSprite.setTint(0xf1f5f9)
    this.towers.push({
      spotId: spot.id,
      sprite: towerSprite,
      range: TOWER_RANGE,
      fireRate: TOWER_FIRE_RATE,
      cooldown: 0,
      damage: TOWER_DAMAGE
    })
    spot.occupied = true
    this.applyBuildSpotTint(spot)
    this.coins -= TOWER_COST
    this.refreshHud()
    const offset = Math.max(24, this.gridTileSize * 0.5)
    this.showFloatingText(towerSprite.x, towerSprite.y - offset, 'Tower ready')
  }

  // Advances enemies along the path.
  private updateEnemies(deltaSeconds: number) {
    const point = new Phaser.Math.Vector2()
    const remaining: Enemy[] = []
    for (const enemy of this.enemies) {
      enemy.distance += enemy.speed * deltaSeconds
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
    const deltaMs = delta
    this.towerOverlay?.clear()
    for (const tower of this.towers) {
      tower.cooldown = Math.max(0, tower.cooldown - deltaMs)
      const target = this.findTargetForTower(tower)
      if (!target || tower.cooldown > 0) {
        continue
      }
      tower.cooldown = tower.fireRate
      target.hp -= tower.damage
      this.towerOverlay
        ?.lineStyle(3, 0xfacc15, 0.6)
        .beginPath()
        .moveTo(tower.sprite.x, tower.sprite.y)
        .lineTo(target.sprite.x, target.sprite.y)
        .strokePath()
      if (target.hp <= 0) {
        this.handleKill(target)
      }
    }
  }

  // Redraws enemy HP bars.
  private renderOverlays() {
    if (!this.enemyOverlay) return
    this.enemyOverlay.clear()
    this.enemyOverlay.fillStyle(0x1f2937, 0.8)
    const barWidth = Math.max(24, this.gridTileSize * 0.7)
    const barHeight = Math.max(4, this.gridTileSize * 0.12)
    for (const enemy of this.enemies) {
      const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1)
      const offsetY = enemy.sprite.displayHeight / 2 + Math.max(6, this.gridTileSize * 0.15)
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

  // Chooses the furthest enemy within range.
  private findTargetForTower(tower: Tower) {
    let selection: Enemy | undefined
    let selectionProgress = -Infinity
    for (const enemy of this.enemies) {
      const distSq = Phaser.Math.Distance.Squared(tower.sprite.x, tower.sprite.y, enemy.sprite.x, enemy.sprite.y)
      if (distSq > tower.range * tower.range) {
        continue
      }
      const progress = enemy.distance
      if (progress > selectionProgress) {
        selection = enemy
        selectionProgress = progress
      }
    }
    return selection
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
    const offset = Math.max(18, this.gridTileSize * 0.45)
    this.showFloatingText(x, y - offset, `+${enemy.reward}`, '#34d399')
  }

  // Updates HUD stats each frame.
  private refreshHud() {
    this.hudWave.setText(`Wave ${this.wave}`)
    this.hudHp.setText(`Base HP: ${this.baseHp}`)
    this.hudCoins.setText(`Coins: ${this.coins}`)
    this.hudLeaks.setText(`Leaks: ${this.leaks}`)
    if (this.baseMarker) {
      this.baseMarker.setFillStyle(this.baseHp > 5 ? 0x14222f : 0x3f1d2b, 1)
    }
  }

  // Repositions everything when the canvas resizes.
  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize
    if (!width || !height) return
    const previousLength = this.pathLength
    this.createPath()
    this.createBaseMarker()
    this.buildSpots.forEach((spot) => {
      const world = this.gridToWorldCenter(spot.col, spot.row)
      const tower = this.towers.find((candidate) => candidate.spotId === spot.id)
      if (tower) {
        tower.sprite.setPosition(world.x, world.y).setDisplaySize(this.gridTileSize * 0.6, this.gridTileSize * 0.6)
      }
      this.applyBuildSpotTint(spot)
    })
    const enemySize = this.gridTileSize * 0.7
    const point = new Phaser.Math.Vector2()
    for (const enemy of this.enemies) {
      const progress = previousLength > 0 ? enemy.distance / previousLength : 0
      enemy.distance = progress * this.pathLength
      this.path.getPoint(progress, point)
      enemy.sprite.setPosition(point.x, point.y).setDisplaySize(enemySize, enemySize)
    }
    this.exitButton.setPosition(width - 20, 16)
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
    const travel = Math.max(28, this.gridTileSize * 0.5)
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

  // Derives tile size/origin based on viewport.
  private recalculateGridMetrics(width: number, height: number) {
    const tileWidth = width / GRID_COLS
    const tileHeight = height / GRID_ROWS
    this.gridTileSize = Math.min(tileWidth, tileHeight)
    const mapWidth = this.gridTileSize * GRID_COLS
    const mapHeight = this.gridTileSize * GRID_ROWS
    this.gridOriginX = (width - mapWidth) / 2
    this.gridOriginY = (height - mapHeight) / 2
  }

  // Keeps tile sprites aligned to the viewport.
  private refreshGridTiles() {
    const { width, height } = this.scale
    this.recalculateGridMetrics(width, height)
    if (!this.textures.exists(ONE_BIT_PACK.key)) {
      return
    }
    const displaySize = this.gridTileSize * 0.98
    for (let row = 0; row < GRID_ROWS; row += 1) {
      for (let col = 0; col < GRID_COLS; col += 1) {
        const type = GRID_MAP[row][col]
        const key = this.cellKey(col, row)
        const center = this.gridToWorldCenter(col, row)
        const appearance = this.appearanceForTile(col, row, type)
        const depth = type === 'obstacle' ? 2 : 0
        let sprite = this.tileSpriteLookup.get(key)
        if (!sprite) {
          sprite = this.add
            .sprite(center.x, center.y, ONE_BIT_PACK.key, appearance.frame)
            .setOrigin(0.5)
            .setDisplaySize(displaySize, displaySize)
            .setDepth(depth)
          sprite.setAngle(appearance.angle)
          sprite.setTint(this.tintForTile(type))
          this.tileSpriteLookup.set(key, sprite)
          this.tileSprites.push(sprite)
        } else {
          sprite
            .setPosition(center.x, center.y)
            .setDisplaySize(displaySize, displaySize)
            .setFrame(appearance.frame)
            .setDepth(depth)
            .setAngle(appearance.angle)
          const buildSpot = this.findBuildSpot(col, row)
          if (!buildSpot) {
            sprite.setTint(this.tintForTile(type))
          } else if (buildSpot.occupied) {
            this.applyBuildSpotTint(buildSpot)
          }
        }
      }
    }
  }

  // Deterministic frame pick per tile.
  private appearanceForTile(col: number, row: number, type: TileType) {
    if (type === 'road') {
      return this.roadAppearance(col, row)
    }
    const offsets: Record<Exclude<TileType, 'road'>, number> = {
      build: 1,
      obstacle: 2
    }
    return {
      frame: TILE_FRAME_POOL[offsets[type]],
      angle: 0
    }
  }

  private roadAppearance(col: number, row: number) {
    const key = this.cellKey(col, row)
    const index = this.pathIndexByCell.get(key)
    if (index === undefined) {
      return {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.roadStraight,
        angle: 0
      }
    }
    const prev = index > 0 ? PATH_SEQUENCE[index - 1] : undefined
    const next = index < PATH_SEQUENCE.length - 1 ? PATH_SEQUENCE[index + 1] : undefined
    const connections = new Set<Direction>()
    if (prev) {
      connections.add(this.oppositeDirection(this.directionBetween(prev, PATH_SEQUENCE[index])))
    }
    if (next) {
      connections.add(this.directionBetween(PATH_SEQUENCE[index], next))
    }
    const connectsUp = connections.has('up')
    const connectsDown = connections.has('down')
    const connectsLeft = connections.has('left')
    const connectsRight = connections.has('right')

    if ((connectsUp || connectsDown) && (connectsLeft || connectsRight)) {
      return {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.roadTurn,
        angle: this.cornerAngle(connectsUp, connectsDown, connectsLeft, connectsRight)
      }
    }
    if (connectsLeft || connectsRight) {
      return {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.roadStraight,
        angle: 90
      }
    }
    return {
      frame: ONE_BIT_PACK_KNOWN_FRAMES.roadStraight,
      angle: 0
    }
  }

  private cornerAngle(
    connectsUp: boolean,
    connectsDown: boolean,
    connectsLeft: boolean,
    connectsRight: boolean
  ) {
    if (connectsDown && connectsRight) return 0
    if (connectsUp && connectsRight) return -90
    if (connectsUp && connectsLeft) return 180
    if (connectsDown && connectsLeft) return 90
    return 0
  }

  private directionBetween(
    from: { col: number; row: number },
    to: { col: number; row: number }
  ): Direction {
    if (to.col > from.col) return 'right'
    if (to.col < from.col) return 'left'
    if (to.row > from.row) return 'down'
    return 'up'
  }

  private oppositeDirection(direction: Direction): Direction {
    switch (direction) {
      case 'up':
        return 'down'
      case 'down':
        return 'up'
      case 'left':
        return 'right'
      case 'right':
      default:
        return 'left'
    }
  }

  // Base tint per tile type.
  private tintForTile(type: TileType) {
    if (type === 'road') return 0xffffff
    if (type === 'build') return 0xbcd7ff
    return 0x6b7280
  }

  // Highlights build tiles based on occupancy.
  private applyBuildSpotTint(spot: BuildSpot) {
    const tint = spot.occupied ? 0x2563eb : 0x60a5fa
    spot.marker.setTint(tint)
  }

  // Compact key for tile lookups.
  private cellKey(col: number, row: number) {
    return `${col},${row}`
  }

  // Returns the build spot for a grid cell if present.
  private findBuildSpot(col: number, row: number) {
    return this.buildSpots.find((spot) => spot.col === col && spot.row === row)
  }

  // Converts a grid cell to pixel coordinates.
  private gridToWorldCenter(col: number, row: number): Phaser.Math.Vector2 {
    const x = this.gridOriginX + col * this.gridTileSize + this.gridTileSize / 2
    const y = this.gridOriginY + row * this.gridTileSize + this.gridTileSize / 2
    return new Phaser.Math.Vector2(x, y)
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
