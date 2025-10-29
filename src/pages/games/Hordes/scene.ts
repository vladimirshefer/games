import Phaser from 'phaser'
import {CombatSystem} from './combat'
import {createHero, damageHero, HERO_SPEED, moveHero} from './hero'
import type {InputController} from './input'
import {createInputController} from './input'
import type {EnemySprite, HeroState, SimpleMob} from './types'
import {XpCrystalManager} from "./xpCrystals.ts";
import {EnemyManager} from "./enemies.ts";
import {DEFAULT_MOB, WaveManager} from "./waves.ts";
import {UpgradeManager} from "./upgradeManager.ts";
import {PickupManager} from "./pickups.ts";
import {PISTOL_WEAPON} from "./weapons.ts";
import {
    ENEMY_SPRITESHEET_FRAME_HEIGHT,
    ENEMY_SPRITESHEET_FRAME_WIDTH,
    ENEMY_SPRITESHEET_KEY,
    ENEMY_SPRITESHEET_SPACING,
    ENEMY_SPRITESHEET_URL,
    MOB_WALK_FRAME_INDICES,
    ENEMY_WALK_ANIMATION_KEY
} from "./sprite.ts";

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
  private spawnBuffer = 60
  private cleanupPadding = 260
    private background!: Phaser.GameObjects.TileSprite
    private worldBounds = 20000
  private infoText!: Phaser.GameObjects.Text
  private kills = 0
  private wave = 0
  private combat!: CombatSystem
  private xpManager!: XpCrystalManager
  private enemyManager!: EnemyManager
  private waveManager!: WaveManager
  private pickupManager!: PickupManager
  private upgradeManager!: UpgradeManager
  private pauseButton!: Phaser.GameObjects.Text
  private exitButton!: Phaser.GameObjects.Text
    private isPaused = false
    private totalXp = 0
    private level = 1
    private nextLevelXp = 100
    private pendingLevelUps = 0
  private supportTimersStarted = false
  private pickupTimers: Phaser.Time.TimerEvent[] = []

  static registerExitHandler(handler?: (stats: ExitStats) => void) {
    HordesScene.exitHandler = handler
  }

    preload() {
        if (!this.textures.exists(ENEMY_SPRITESHEET_KEY)) {
            this.load.spritesheet(ENEMY_SPRITESHEET_KEY, ENEMY_SPRITESHEET_URL, {
                frameWidth: ENEMY_SPRITESHEET_FRAME_WIDTH,
                frameHeight: ENEMY_SPRITESHEET_FRAME_HEIGHT,
                spacing: ENEMY_SPRITESHEET_SPACING,
            })
        }
    }

    /**
     * Bootstraps the scene: build background, hero, input, camera, and the first wave timer.
     */
    create() {
        const {width, height} = this.scale
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

        this.hero = createHero(this)

        this.enemies = []
        this.xpManager = new XpCrystalManager(this, this.cleanupPadding)
        this.pickupManager = new PickupManager(this, this.xpManager, this.cleanupPadding, {
            getHero: () => this.hero,
            onHeroHealed: () => this.updateHud(),
            onMagnetActivated: () => {
                this.showMagnetPickup()
                this.updateHud()
            },
        })
        this.enemyManager = new EnemyManager(this, this.enemies)
        this.waveManager = new WaveManager(this, this.enemyManager, this.spawnBuffer, {
            getHero: () => this.hero,
            onEnemySpawned: (enemy, mob) => this.attachEnemyHpOverlay(enemy, mob),
            onWaveAdvanced: (newWave) => {
                this.wave = newWave
                this.updateHud()
            },
        })
        this.ensureEnemyWalkAnimation()
        this.kills = 0
        this.wave = 0
        this.totalXp = 0
        this.level = 1
        this.nextLevelXp = this.getNextLevelXp(this.level)
        this.pendingLevelUps = 0
        this.hero.hasAura = false
        this.hero.aura.setVisible(false)

        this.inputController = createInputController(this)
        this.combat = new CombatSystem(
            this,
            {
                bulletSpeed: 480,
                bulletWeapon: PISTOL_WEAPON,
                auraWeapon: null,
                bombWeapon: null,
                swordWeapon: null,
                enemyBaseHp: DEFAULT_MOB.health,
            },
            {
                hero: this.hero,
                getEnemies: () => this.enemies,
                onEnemyKilled: (enemy, mob) => {
                    this.kills += 1
                    this.xpManager.spawn(enemy.x, enemy.y, mob.xp)
                },
            },
        )
        this.upgradeManager = new UpgradeManager(this, this.hero, this.combat, {
            onMenuOpened: () => this.pauseForUpgrade(),
            onMenuClosed: () => this.onUpgradeMenuClosed(),
            onUpgradeApplied: () => this.updateHud(),
            onShowMessage: (message) => this.showWeaponUpgrade(message),
        })

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.combat.reset()
            this.inputController.destroy()
            this.xpManager.destroyAll()
            this.upgradeManager.destroy()
            this.pickupManager.destroy()
            this.waveManager.destroy()
            this.clearSupportTimers()
        })

        const camera = this.cameras.main
        camera.setBounds(
            -this.worldBounds,
            -this.worldBounds,
            this.worldBounds * 2,
            this.worldBounds * 2,
        )
        camera.startFollow(this.hero.sprite, true, 1, 1)
        camera.centerOn(0, 0)

        this.infoText = this.add
            .text(16, 16, 'Wave 0', {
                color: '#f5f5f5',
                fontFamily: 'monospace',
                fontSize: '18px',
            })
            .setDepth(2)
        this.infoText.setScrollFactor(0)
        this.updateHud()

        this.pauseButton = this.add
            .text(width - 16, 16, 'Pause', {
                color: '#f5f5f5',
                fontFamily: 'monospace',
                fontSize: '18px',
                backgroundColor: '#30304888',
                padding: {x: 8, y: 4},
            })
            .setOrigin(1, 0)
            .setDepth(2)
            .setScrollFactor(0)
            .setInteractive({useHandCursor: true})
        this.pauseButton.on('pointerdown', () => this.togglePause())

        this.exitButton = this.add
            .text(width - 16, this.pauseButton.y + this.pauseButton.displayHeight + 12, 'Exit', {
                color: '#ff8a80',
                fontFamily: 'monospace',
                fontSize: '18px',
                backgroundColor: '#30304888',
                padding: {x: 8, y: 4},
            })
            .setOrigin(1, 0)
            .setDepth(2)
            .setScrollFactor(0)
            .setInteractive({useHandCursor: true})
        this.exitButton.on('pointerdown', () => this.handleExit())

        if (this.hero.weaponIds.length === 0) {
            this.pendingLevelUps = Math.max(this.pendingLevelUps, 1)
            this.tryOpenUpgradeMenu()
        } else {
            this.maybeStartWaves()
        }

        // Wave timers start after the player picks a starting weapon.
    }

    /**
     * Per-frame update loop that moves entities, resolves collisions, and fires bullets.
     */
    update(_time: number, delta: number) {
        const dt = delta / 1000
        const heroRadius = this.hero.radius

        if (this.isPaused) {
            return
        }

        const direction = this.inputController.getDirection()
        moveHero(this.hero, direction, HERO_SPEED, dt)
        const camera = this.cameras.main
        this.background.tilePositionX = camera.scrollX
        this.background.tilePositionY = camera.scrollY

        const heroX = this.hero.sprite.x
        const heroY = this.hero.sprite.y
        const view = this.cameras.main.worldView

        this.enemies = this.enemies.filter((enemy) => {
            const mob = enemy.getData('mob') as SimpleMob | undefined
            if (!enemy.active || !mob) return false

            const enemyRadius = mob.size / 2
            const dx = heroX - enemy.x
            const dy = heroY - enemy.y
            const dist = Math.hypot(dx, dy) || 0.001

            if (this.combat.applyAuraDamage(enemy, dist, mob)) {
                return false
            }

            const speed = mob.speed
            enemy.x += (dx / dist) * speed * dt
            enemy.y += (dy / dist) * speed * dt
            if (dx !== 0) {
                enemy.setFlipX(dx < 0)
            }
            this.positionEnemyHpText(enemy, mob)

            if (dist < heroRadius + enemyRadius) {
                this.handleHeroHit(enemy, mob)
            }

            const offscreenPadding = this.cleanupPadding + enemyRadius
            if (
                enemy.x < view.left - offscreenPadding ||
                enemy.x > view.right + offscreenPadding ||
                enemy.y < view.top - offscreenPadding ||
                enemy.y > view.bottom + offscreenPadding
            ) {
                enemy.destroy()
                return false
            }

            return enemy.active
        })
        this.enemyManager.sync(this.enemies)

        this.combat.update(dt, view, this.cleanupPadding)

        this.xpManager.update(heroX, heroY, view, (xp) => this.awardXp(xp))

        this.pickupManager.update(view)

        this.enemyManager.resolveOverlaps()

    }

    private maybeStartWaves() {
        if (this.hero.weaponIds.length === 0) return
        if (this.waveManager.isRunning()) return
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
            startAt: 4000,
        })

        const magnetTimer = this.time.addEvent({
            delay: 60000,
            callback: () => this.pickupManager.spawnMagnetPickup(this.cameras.main.worldView),
            loop: true,
            startAt: 0,
        })

        this.pickupTimers.push(healTimer, magnetTimer)
    }

    private clearSupportTimers() {
        this.pickupTimers.forEach((timer) => timer.remove())
        this.pickupTimers = []
        this.supportTimersStarted = false
    }

    private attachEnemyHpOverlay(enemy: EnemySprite, mob: SimpleMob) {
        const hpText = this.add
            .text(enemy.x, enemy.y, `${mob.health}`, {
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '12px',
            })
            .setOrigin(0.5)
            .setDepth(1)
        enemy.setData('hpText', hpText)
        enemy.once('destroy', () => hpText.destroy())
        this.positionEnemyHpText(enemy, mob)
    }

    private positionEnemyHpText(enemy: EnemySprite, mob: SimpleMob) {
        const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
        if (!hpText || !hpText.active) return
        hpText.setPosition(enemy.x, enemy.y - mob.size / 2 - 8)
    }

    /**
     * Applies damage from an enemy to the hero with per-enemy cooldown and restarts on death.
     */
    private handleHeroHit(enemy: EnemySprite, mob: SimpleMob) {
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
            this.time.delayedCall(260, () => this.handleExit())
        }
    }

    private awardXp(amount: number) {
        if (amount > 0) {
            this.totalXp += amount
            while (this.totalXp >= this.nextLevelXp) {
                this.level += 1
                this.pendingLevelUps += 1
                this.showLevelUp()
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
    const handler = HordesScene.exitHandler
    if (handler) {
      handler({
        kills: this.kills,
        waves: this.wave,
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
    }

    private resumeFromUpgrade() {
        this.isPaused = false
        this.time.timeScale = 1
        if (this.pauseButton) {
            this.pauseButton.setText('Pause')
            this.pauseButton.setInteractive({useHandCursor: true})
        }
    }

    private onUpgradeMenuClosed() {
        this.resumeFromUpgrade()
        if (this.pendingLevelUps > 0) {
            this.tryOpenUpgradeMenu()
        }
        if (!this.upgradeManager.isActive()) {
            this.maybeStartWaves()
        }
    }

    private showLevelUp() {
        const text = this.add
            .text(this.scale.width / 2, 96, `Level ${this.level}!`, {
                color: '#ffe082',
                fontFamily: 'monospace',
                fontSize: '24px',
                backgroundColor: '#1a1a25bb',
                padding: {x: 12, y: 6},
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
            onComplete: () => text.destroy(),
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
                padding: {x: 10, y: 4},
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
            onComplete: () => text.destroy(),
        })
    }

    private showMagnetPickup() {
        const text = this.add
            .text(this.scale.width / 2, 180, 'Magnet activated!', {
                color: '#8c9eff',
                fontFamily: 'monospace',
                fontSize: '20px',
                backgroundColor: '#1f1f32dd',
                padding: {x: 10, y: 4},
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
            onComplete: () => text.destroy(),
        })
    }

    private getNextLevelXp(level: number) {
        const baseXp = 40
        const growthRate = 1.3
        return Math.ceil(baseXp * Math.pow(growthRate, level - 1))
    }

    private togglePause() {
        if (this.upgradeManager.isActive()) return
        this.isPaused = !this.isPaused
        this.pauseButton.setText(this.isPaused ? 'Resume' : 'Pause')
        this.time.timeScale = this.isPaused ? 0 : 1
    }

    /**
     * Writes the latest wave and HP values to the HUD text element.
     */
    private updateHud() {
        this.infoText.setText(
            `Wave ${this.wave} | HP ${this.hero.hp} | LVL ${this.level} (${this.totalXp}/${this.nextLevelXp})\n` +
            `Weapons: ${this.hero.weaponIds} | Kills ${this.kills}`,
        )
    }

    private ensureEnemyWalkAnimation() {
        if (!this.textures.exists(ENEMY_SPRITESHEET_KEY)) return
        if (this.anims.exists(ENEMY_WALK_ANIMATION_KEY)) return
        const frames = MOB_WALK_FRAME_INDICES.map((frame) => ({
            key: ENEMY_SPRITESHEET_KEY,
            frame,
        }))
        this.anims.create({
            key: ENEMY_WALK_ANIMATION_KEY,
            frames,
            frameRate: 6,
            repeat: -1,
        })
    }
}
