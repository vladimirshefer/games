import Phaser from 'phaser'
import { CombatSystem } from './combat'
import { createHero, damageHero, moveHero } from './hero'
import type { InputController } from './input'
import { createInputController } from './input'
import type { EnemySprite, HeroState } from './types'
import { XpCrystalManager } from './xpCrystals.ts'
import { EnemyManager, type MobStats } from './enemies.ts'
import { WaveManager } from './waves.ts'
import { UpgradeManager } from './upgradeManager.ts'
import { PickupManager } from './pickups.ts'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from './game/sprite.ts'
import { HERO_BASE_SPEED, LEVEL_BASE_PROGRESSION, LEVEL_BASE_XP, WORLD_BOUNDS } from './game/constants.ts'
import { WeaponHud } from './game/view/hud/WeaponHud.ts'
import { GameOverHud } from './game/view/hud/GameOverHud.ts'
import { DEFAULT_HERO, getHeroById, type HeroDefinition } from './heroes.ts'
import { HORDES_SCENE_KEY } from './sceneKeys.ts'
import { HeroHpBar } from './heroHpBar.ts'
import { HeroXpBar } from './heroXpBar.ts'

interface ExitStats {
  kills: number
  waves: number
}

/**
 * Core Phaser scene for the Hordes mode: handles hero state, enemy waves,
 * auto-shooting, and camera-following infinite background.
 */
export class HordesScene extends Phaser.Scene {
  private static exitHandler?: (stats: ExitStats) => void
  private hero!: HeroState
  private inputController!: InputController
  private enemies: EnemySprite[] = []
  private background!: Phaser.GameObjects.TileSprite
  private worldBounds = WORLD_BOUNDS
  private heroHpBar!: HeroHpBar
  private heroXpBar!: HeroXpBar
  private infoText!: Phaser.GameObjects.Text
  private weaponHud!: WeaponHud
  private kills: number = 0
  private wave: number = 0
  private combat!: CombatSystem
  private xpManager!: XpCrystalManager
  private enemyManager!: EnemyManager
  private waveManager!: WaveManager
  private pickupManager!: PickupManager
  private upgradeManager!: UpgradeManager
  private pauseButton!: Phaser.GameObjects.Text
  private pauseExitButton!: Phaser.GameObjects.Text
  private isPaused: boolean = false
  private totalXp: number = 0
  private level: number = 1
  private nextLevelXp: number = 100
  private pendingLevelUps: number = 0
  private currentLevelXpBase: number = 0
  private supportTimersStarted = false
  private pickupTimers: Phaser.Time.TimerEvent[] = []
  private wavesOver: boolean = false
  private isGameOver: boolean = false
  private exitHandled: boolean = false
  private gameOverHud?: GameOverHud
  private heroDefinition: HeroDefinition = DEFAULT_HERO

  constructor() {
    super(HORDES_SCENE_KEY)
  }

  static registerExitHandler(handler?: (stats: ExitStats) => void) {
    HordesScene.exitHandler = handler
  }

  init(data?: { heroId?: string }) {
    this.heroDefinition = getHeroById(data?.heroId)
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

  /**
   * Bootstraps the scene: build background, hero, input, camera, and the first wave timer.
   */
  create() {
    const { width, height } = this.scale
    this.isGameOver = false
    this.exitHandled = false
    if (!this.gameOverHud) {
      this.gameOverHud = new GameOverHud(this)
    }
    this.gameOverHud.clear()
    this.cameras.main.setBackgroundColor('#101014')
    this.time.timeScale = 1
    this.isPaused = false

    if (!this.textures.exists('hordes-grid')) {
      const graphics = this.add.graphics()
      graphics.setVisible(false)
      graphics.fillStyle(0x11111d, 1)
      graphics.fillRect(0, 0, 96, 96)
      graphics.lineStyle(2, 0x1d1d2c, 0.6)
      graphics.strokeRect(0, 0, 96, 96)
      graphics.lineStyle(1, 0x1f253c, 0.5)
      graphics.beginPath()
      graphics.moveTo(48, 0)
      graphics.lineTo(48, 96)
      graphics.moveTo(0, 48)
      graphics.lineTo(96, 48)
      graphics.strokePath()
      graphics.generateTexture('hordes-grid', 96, 96)
      graphics.destroy()
    }

    this.background = this.add.tileSprite(width / 2, height / 2, width, height, 'hordes-grid')
    this.background.setOrigin(0.5)
    this.background.setScrollFactor(0)
    this.background.setDepth(-2)

    const heroDefinition = this.heroDefinition ?? DEFAULT_HERO
    this.hero = createHero(this, { frame: heroDefinition.spriteFrame, tint: heroDefinition.tint })
    this.heroDefinition = heroDefinition
    this.heroHpBar = new HeroHpBar(this, this.hero)
    this.heroXpBar = new HeroXpBar(this, this.hero)

    this.enemies = []
    this.xpManager = new XpCrystalManager(this)
    this.pickupManager = new PickupManager(this, this.xpManager, {
      getHero: () => this.hero,
      onHeroHealed: () => this.updateHud(),
      onMagnetActivated: () => {
        this.showMagnetPickup()
        this.updateHud()
      }
    })
    this.enemyManager = new EnemyManager(this, this.enemies)
    this.waveManager = new WaveManager(this, this.enemyManager, {
      getHero: () => this.hero,
      onWaveAdvanced: (newWave) => {
        this.wave = newWave
      }
    })
    this.ensureEnemyWalkAnimation()
    this.kills = 0
    this.wave = 0
    this.totalXp = 0
    this.level = 1
    this.nextLevelXp = this.getNextLevelXp(this.level)
    this.pendingLevelUps = 0
    this.currentLevelXpBase = 0
    this.hero.hasAura = false
    this.hero.aura.setVisible(false)

    this.inputController = createInputController(this)
    this.combat = new CombatSystem(this, {
      hero: this.hero,
      getEnemies: () => this.enemies,
      onEnemyKilled: (enemy, mob) => {
        this.kills += 1
        this.xpManager.spawn(enemy.x, enemy.y, mob.xp)
      }
    })

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.combat.reset()
      this.inputController.destroy()
      this.xpManager.destroyAll()
      this.upgradeManager.destroy()
      this.heroHpBar.destroy()
      this.heroXpBar.destroy()
      this.pickupManager.destroy()
      this.waveManager.destroy()
      this.clearSupportTimers()
      this.weaponHud?.destroy(true)
    })

    const camera = this.cameras.main
    camera.setBounds(-this.worldBounds, -this.worldBounds, this.worldBounds * 2, this.worldBounds * 2)
    camera.startFollow(this.hero.sprite, true, 1, 1)
    camera.centerOn(0, 0)

    this.infoText = this.add
      .text(16, 16, 'Wave 0', {
        color: '#f5f5f5',
        fontFamily: 'monospace',
        fontSize: '18px'
      })
      .setDepth(2)
    this.infoText.setScrollFactor(0)

    this.weaponHud = new WeaponHud(this, this.infoText, this.hero)

    this.updateHud()

    this.upgradeManager = new UpgradeManager(this, this.hero, this.combat, {
      onMenuOpened: () => this.pauseForUpgrade(),
      onMenuClosed: () => this.onUpgradeMenuClosed(),
      onUpgradeApplied: () => this.updateHud(),
      onShowMessage: (message) => this.showWeaponUpgrade(message)
    })

    this.upgradeManager.applyUpgrade(heroDefinition.startingUpgradeId)

    this.pauseButton = this.add
      .text(width - 16, 16, 'Pause', {
        color: '#f5f5f5',
        fontFamily: 'monospace',
        fontSize: '18px',
        backgroundColor: '#30304888',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(1, 0)
      .setDepth(2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
    this.pauseButton.on('pointerdown', () => this.togglePause())

    this.pauseExitButton = this.add
      .text(width - 16, this.pauseButton.y + this.pauseButton.displayHeight + 12, 'Exit', {
        color: '#ff8a80',
        fontFamily: 'monospace',
        fontSize: '18px',
        backgroundColor: '#30304888',
        padding: { x: 8, y: 4 }
      })
      .setOrigin(1, 0)
      .setDepth(2)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true })
    this.pauseExitButton.on('pointerdown', () => this.handleExit())
    this.hidePauseHud()

    if (this.hero.weaponIds.length === 0) {
      this.pendingLevelUps = Math.max(this.pendingLevelUps, 1)
      this.tryOpenUpgradeMenu()
    }

    this.maybeStartWaves()

    this.game.events.on('wavesOver', () => (this.wavesOver = true))

    // Wave timers start after the player picks a starting weapon.
  }

  /**
   * Per-frame update loop that moves entities, resolves collisions, and fires bullets.
   */
  update(_time: number, delta: number) {
    const dt = delta / 1000
    if (this.isPaused) {
      return
    }

    const direction = this.inputController.getDirection()
    moveHero(this.hero, direction, HERO_BASE_SPEED, dt)
    const camera = this.cameras.main
    this.background.tilePositionX = camera.scrollX
    this.background.tilePositionY = camera.scrollY
    this.heroHpBar.syncPosition()
    this.heroXpBar.syncPosition()

    const view = this.cameras.main.worldView

    this.enemies = this.enemyManager.update(this.hero, dt, view, (enemy, mob) => {
      this.handleHeroHit(enemy, mob)
    })

    if (this.enemies.length === 0 && this.wavesOver) {
      this.showGameOverHud('complete')
    }

    this.combat.update(dt, view)

    this.xpManager.update(this.hero.sprite.x, this.hero.sprite.y, view, (xp) => this.awardXp(xp))

    this.pickupManager.update(view)

    this.enemyManager.resolveOverlaps()
  }

  private maybeStartWaves() {
    this.waveManager.start()
    this.startSupportTimers()
  }

  private startSupportTimers() {
    if (this.supportTimersStarted) return
    this.supportTimersStarted = true

    const healTimer = this.time.addEvent({
      delay: 10000,
      callback: () => this.pickupManager.spawnHealPack(this.cameras.main.worldView),
      loop: true,
      startAt: 4000
    })

    const magnetTimer = this.time.addEvent({
      delay: 60000,
      callback: () => this.pickupManager.spawnMagnetPickup(this.cameras.main.worldView),
      loop: true,
      startAt: 0
    })

    this.pickupTimers.push(healTimer, magnetTimer)
  }

  private clearSupportTimers() {
    this.pickupTimers.forEach((timer) => timer.remove())
    this.pickupTimers = []
    this.supportTimersStarted = false
  }

  /**
   * Applies damage from an enemy to the hero with per-enemy cooldown and restarts on death.
   */
  private handleHeroHit(enemy: EnemySprite, mob: MobStats) {
    if (this.hero.hp <= 0) return

    const now = this.time.now
    const lastHit = enemy.getData('lastHit') as number | undefined
    if (lastHit && now - lastHit < 1000) {
      return
    }

    enemy.setData('lastHit', now)
    const damage = mob.damage
    const hp = damageHero(this.hero, damage)
    this.cameras.main.flash(120, 255, 64, 64, false)
    this.updateHud()

    if (hp <= 0) {
      this.cameras.main.shake(250, 0.02)
      this.time.delayedCall(260, () => this.showGameOverHud('killed'))
    }
  }

  private awardXp(amount: number) {
    if (amount > 0) {
      this.totalXp += amount
      while (this.totalXp >= this.nextLevelXp) {
        const previousThreshold = this.nextLevelXp
        this.level += 1
        this.pendingLevelUps += 1
        this.showLevelUp()
        this.currentLevelXpBase = previousThreshold
        this.nextLevelXp += this.getNextLevelXp(this.level)
      }
      this.tryOpenUpgradeMenu()
    }
    this.updateHud()
  }

  private tryOpenUpgradeMenu() {
    if (this.pendingLevelUps <= 0) return
    if (this.upgradeManager.isActive()) return

    const opened = this.upgradeManager.openMenu()
    if (!opened) {
      this.pendingLevelUps = 0
      return
    }

    this.pendingLevelUps -= 1
  }

  private handleExit() {
    if (this.exitHandled) return
    this.exitHandled = true
    this.pauseExitButton?.disableInteractive()
    this.gameOverHud?.clear()
    const handler = HordesScene.exitHandler
    if (handler) {
      handler({
        kills: this.kills,
        waves: this.wave + 1
      })
    }
  }

  private pauseForUpgrade() {
    this.isPaused = true
    this.time.timeScale = 0
    if (this.pauseButton) {
      this.pauseButton.disableInteractive()
      this.pauseButton.setText('Upgrade')
    }
    this.hidePauseHud()
  }

  private resumeFromUpgrade() {
    this.isPaused = false
    this.time.timeScale = 1
    if (this.pauseButton) {
      this.pauseButton.setText('Pause')
      this.pauseButton.setInteractive({ useHandCursor: true })
    }
    this.hidePauseHud()
  }

  private onUpgradeMenuClosed() {
    this.resumeFromUpgrade()
    if (this.pendingLevelUps > 0) {
      this.tryOpenUpgradeMenu()
    }
  }

  private showLevelUp() {
    const text = this.add
      .text(this.scale.width / 2, 96, `Level ${this.level}!`, {
        color: '#ffe082',
        fontFamily: 'monospace',
        fontSize: '24px',
        backgroundColor: '#1a1a25bb',
        padding: { x: 12, y: 6 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5)

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 32,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    })

    this.cameras.main.flash(160, 140, 220, 80, false)
  }

  private showWeaponUpgrade(message: string) {
    const text = this.add
      .text(this.scale.width / 2, 140, message, {
        color: '#ffab40',
        fontFamily: 'monospace',
        fontSize: '20px',
        backgroundColor: '#222234dd',
        padding: { x: 10, y: 4 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5)

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 28,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    })
  }

  private showMagnetPickup() {
    const text = this.add
      .text(this.scale.width / 2, 180, 'Magnet activated!', {
        color: '#8c9eff',
        fontFamily: 'monospace',
        fontSize: '20px',
        backgroundColor: '#1f1f32dd',
        padding: { x: 10, y: 4 }
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(5)

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 24,
      duration: 900,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    })
  }

  private showGameOverHud(result: 'killed' | 'complete') {
    if (this.isGameOver) return

    this.isGameOver = true
    this.isPaused = true
    this.time.timeScale = 0

    if (this.pauseButton) {
      this.pauseButton.disableInteractive()
      this.pauseButton.setVisible(false)
    }
    if (this.pauseExitButton) {
      this.pauseExitButton.setVisible(false)
      this.pauseExitButton.disableInteractive()
    }

    if (!this.gameOverHud) {
      this.gameOverHud = new GameOverHud(this)
    }
    this.gameOverHud.show(result, this.wave + 1, this.kills, () => this.handleExit())
  }

  private showPauseHud() {
    if (!this.pauseExitButton || this.isGameOver) return
    this.pauseExitButton.setVisible(true)
    this.pauseExitButton.setInteractive({ useHandCursor: true })
  }

  private hidePauseHud() {
    if (!this.pauseExitButton || this.isGameOver) return
    this.pauseExitButton.setVisible(false)
    this.pauseExitButton.disableInteractive()
  }

  private getNextLevelXp(level: number) {
    return Math.ceil(LEVEL_BASE_XP * Math.pow(LEVEL_BASE_PROGRESSION, level - 1))
  }

  private togglePause() {
    if (this.upgradeManager.isActive() || this.isGameOver) return
    this.isPaused = !this.isPaused
    this.pauseButton.setText(this.isPaused ? 'Resume' : 'Pause')
    this.time.timeScale = this.isPaused ? 0 : 1
    if (this.isPaused) {
      this.showPauseHud()
    } else {
      this.hidePauseHud()
    }
  }

  /**
   * Writes the latest wave, level, and weapon values to the HUD text element.
   */
  private updateHud() {
    this.infoText.setText(`Wave ${this.wave + 1} | LVL ${this.level}\nKills ${this.kills}`)
    this.weaponHud.refresh()
    this.heroHpBar.updateValue(this.hero.hp, this.hero.maxHp)
    const xpForLevel = this.nextLevelXp - this.currentLevelXpBase
    const xpIntoLevel = this.totalXp - this.currentLevelXpBase
    const ratio = xpForLevel > 0 ? xpIntoLevel / xpForLevel : 0
    this.heroXpBar.updateValue(ratio)
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
