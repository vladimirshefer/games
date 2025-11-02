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
  STARTING_COINS
} from './game/constants.ts'

type ExitStats = {
  waves: number
  leaks: number
  coinsEarned: number
}

type BuildSpot = {
  id: number
  rx: number
  ry: number
  occupied: boolean
  marker: Phaser.GameObjects.Arc
}

type Tower = {
  spotId: number
  sprite: Phaser.GameObjects.Rectangle
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

const PATH_POINTS = [
  { x: 0.08, y: 0.78 },
  { x: 0.32, y: 0.78 },
  { x: 0.32, y: 0.28 },
  { x: 0.64, y: 0.28 },
  { x: 0.64, y: 0.62 },
  { x: 0.9, y: 0.62 }
]

const SPOT_FRACTIONS = [
  { x: 0.18, y: 0.48 },
  { x: 0.24, y: 0.18 },
  { x: 0.44, y: 0.52 },
  { x: 0.52, y: 0.16 },
  { x: 0.74, y: 0.44 },
  { x: 0.78, y: 0.86 }
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
  private pathGraphics?: Phaser.GameObjects.Graphics
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

  update(_: number, delta: number) {
    if (this.runEnded) return
    const deltaSeconds = delta / 1000
    this.updateEnemies(deltaSeconds)
    this.updateTowers(delta)
    this.renderOverlays()
  }

  private createPath() {
    this.pathGraphics?.destroy()
    const { width, height } = this.scale
    const firstPoint = this.toWorldPoint(PATH_POINTS[0], width, height)
    this.path = new Phaser.Curves.Path(firstPoint.x, firstPoint.y)
    for (let i = 1; i < PATH_POINTS.length; i += 1) {
      const point = this.toWorldPoint(PATH_POINTS[i], width, height)
      this.path.lineTo(point.x, point.y)
    }
    this.pathLength = this.path.getLength()
    this.pathGraphics = this.add.graphics({ lineStyle: { color: 0x243046, width: 12 } })
    this.path.draw(this.pathGraphics, 64)
    this.pathGraphics.setDepth(1)
  }

  private createBaseMarker() {
    this.baseMarker?.destroy()
    const endPoint = new Phaser.Math.Vector2()
    this.path.getPoint(1, endPoint)
    this.baseMarker = this.add
      .rectangle(endPoint.x, endPoint.y, 48, 48, 0x14222f)
      .setStrokeStyle(2, 0x3ad0ff, 0.6)
      .setDepth(2)
  }

  private createBuildSpots() {
    this.buildSpots.forEach((spot) => spot.marker.destroy())
    this.buildSpots = []
    SPOT_FRACTIONS.forEach((fraction, index) => {
      const { width, height } = this.scale
      const world = this.toWorldPoint(fraction, width, height)
      const marker = this.add
        .arc(world.x, world.y, 22, 0, 360, false, 0x1e2c40, 0.45)
        .setStrokeStyle(2, 0x4fd4ff, 0.55)
        .setDepth(3)
      this.buildSpots.push({
        id: index,
        rx: fraction.x,
        ry: fraction.y,
        occupied: false,
        marker
      })
    })
  }

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
        'Click glowing pads to build towers. Towers fire automatically.',
        {
          ...this.hudStyle(),
          fontSize: '14px',
          color: '#9ca3af'
        }
      )
      .setOrigin(0.5, 1)
    this.refreshHud()
  }

  private configureInput() {
    this.input.keyboard?.on('keydown-ESC', () => this.endRun())
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.runEnded) return
      const spot = this.buildSpots.find(
        (candidate) =>
          !candidate.occupied &&
          Phaser.Math.Distance.Squared(pointer.worldX, pointer.worldY, candidate.marker.x, candidate.marker.y) < 34 * 34
      )
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

  private startNextWave() {
    if (this.runEnded) return
    this.wave += 1
    this.refreshHud()

    const enemiesThisWave = ENEMIES_PER_WAVE + Math.max(0, this.wave - 1) * ENEMIES_PER_WAVE_GROWTH
    const spawnDelay = Math.max(MIN_SPAWN_DELAY, 900 - this.wave * 40)
    let _spawned = 0

    const timer = this.time.addEvent({
      delay: spawnDelay,
      repeat: enemiesThisWave - 1,
      callback: () => {
        _spawned += 1
        this.spawnEnemy()
      }
      // onComplete: () => {
      //     this.timers = this.timers.filter((current) => current !== timer)
      //     this.time.delayedCall(WAVE_BREAK, () => this.startNextWave())
      // },
    })
    this.timers.push(timer)
    this.spawnEnemy()
  }

  private spawnEnemy() {
    const hp = ENEMY_BASE_HP + (this.wave - 1) * ENEMY_HP_PER_WAVE
    const speed = ENEMY_BASE_SPEED + (this.wave - 1) * ENEMY_SPEED_PER_WAVE
    const reward = ENEMY_BASE_REWARD + (this.wave - 1) * ENEMY_REWARD_PER_WAVE
    const startPoint = new Phaser.Math.Vector2()
    this.path.getPoint(0, startPoint)
    const sprite = this.add
      .sprite(startPoint.x, startPoint.y, ONE_BIT_PACK.key, ONE_BIT_PACK_KNOWN_FRAMES.mobWalk1)
      .setOrigin(0.5)
      .setDisplaySize(28, 28)
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

  private placeTower(spot: BuildSpot) {
    const towerSprite = this.add
      .rectangle(spot.marker.x, spot.marker.y, 24, 24, 0x4fd4ff, 0.9)
      .setStrokeStyle(2, 0xffffff, 0.7)
      .setDepth(7)
    this.towers.push({
      spotId: spot.id,
      sprite: towerSprite,
      range: TOWER_RANGE,
      fireRate: TOWER_FIRE_RATE,
      cooldown: 0,
      damage: TOWER_DAMAGE
    })
    spot.occupied = true
    spot.marker.setStrokeStyle(2, 0x3b82f6, 0.45).setFillStyle(0x1d4ed8, 0.35)
    this.coins -= TOWER_COST
    this.refreshHud()
    this.showFloatingText(towerSprite.x, towerSprite.y - 26, 'Tower ready')
  }

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

  private renderOverlays() {
    if (!this.enemyOverlay) return
    this.enemyOverlay.clear()
    this.enemyOverlay.fillStyle(0x1f2937, 0.8)
    const barWidth = 28
    const barHeight = 4
    for (const enemy of this.enemies) {
      const ratio = Phaser.Math.Clamp(enemy.hp / enemy.maxHp, 0, 1)
      const offsetY = enemy.sprite.displayHeight / 2 + 6
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

  private handleLeak(enemy: Enemy) {
    this.baseHp = Math.max(0, this.baseHp - enemy.leakDamage)
    this.leaks += 1
    this.refreshHud()
    this.showFloatingText(this.baseMarker.x, this.baseMarker.y, 'Leak!', '#f87171')
    if (this.baseHp <= 0) {
      this.endRun()
    }
  }

  private handleKill(enemy: Enemy) {
    const { x, y } = enemy.sprite
    enemy.sprite.destroy()
    this.enemies = this.enemies.filter((candidate) => candidate !== enemy)
    this.coins += enemy.reward
    this.coinsEarned += enemy.reward
    this.refreshHud()
    this.showFloatingText(x, y - 18, `+${enemy.reward}`, '#34d399')
  }

  private refreshHud() {
    this.hudWave.setText(`Wave ${this.wave}`)
    this.hudHp.setText(`Base HP: ${this.baseHp}`)
    this.hudCoins.setText(`Coins: ${this.coins}`)
    this.hudLeaks.setText(`Leaks: ${this.leaks}`)
    if (this.baseMarker) {
      this.baseMarker.setFillStyle(this.baseHp > 5 ? 0x14222f : 0x3f1d2b, 1)
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize
    if (!width || !height) return
    this.pathGraphics?.destroy()
    this.createPath()
    this.createBaseMarker()
    this.buildSpots.forEach((spot) => {
      const world = this.toWorldPoint({ x: spot.rx, y: spot.ry }, width, height)
      spot.marker.setPosition(world.x, world.y)
      const tower = this.towers.find((candidate) => candidate.spotId === spot.id)
      if (tower) {
        tower.sprite.setPosition(world.x, world.y)
      }
    })
    this.exitButton.setPosition(width - 20, 16)
  }

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

  private showFloatingText(x: number, y: number, message: string, color = '#fbbf24') {
    const text = this.add
      .text(x, y, message, { ...this.hudStyle(), fontSize: '14px', color })
      .setOrigin(0.5, 1)
      .setDepth(10)
    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    })
  }

  private hudStyle(): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f8fafc'
    }
  }

  private toWorldPoint(fraction: { x: number; y: number }, width: number, height: number): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(fraction.x * width, fraction.y * height)
  }

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
