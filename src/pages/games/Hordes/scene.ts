import Phaser from 'phaser'
import {CombatSystem} from './combat'
import {createHero, damageHero, healHero, HERO_SPEED, moveHero} from './hero'
import type {InputController} from './input'
import {createInputController} from './input'
import type {EnemySprite, HeroState, SimpleMob} from './types'
import {
  AURA_MK2_WEAPON,
  AURA_MK3_WEAPON,
  AURA_MK4_WEAPON,
  AURA_MK5_WEAPON,
  AURA_WEAPON,
  BOMB_MK2_WEAPON,
  BOMB_MK3_WEAPON,
  BOMB_WEAPON,
  PISTOL_MK2_WEAPON,
  PISTOL_MK3_WEAPON,
  PISTOL_MK4_WEAPON,
  PISTOL_MK5_WEAPON,
  PISTOL_WEAPON,
  SWORD_MK2_WEAPON,
  SWORD_MK3_WEAPON,
  SWORD_MK4_WEAPON,
  SWORD_MK5_WEAPON,
  SWORD_WEAPON,
  type UpgradeOption,
  upgrades,
  type Weapon,
  type SwordWeapon,
} from "./weapons.ts";
import {XpCrystalManager} from "./xpCrystals.ts";
import {EnemyManager} from "./enemies.ts";
import {
    ENEMY_SPRITESHEET_FRAME_HEIGHT,
    ENEMY_SPRITESHEET_FRAME_WIDTH,
    ENEMY_SPRITESHEET_KEY,
    ENEMY_SPRITESHEET_SPACING,
    ENEMY_SPRITESHEET_URL,
    HEAL_POTION_FRAME_INDEX,
    PORTAL_OPENS_FRAME_INDEX,
    MOB_WALK_FRAME_INDICES,
    ENEMY_WALK_ANIMATION_KEY
} from "./sprite.ts";

const MOB_MAX_DAMAGE = 16;
export const PICKUP_DEFAULT_SIZE = 28

interface ExitStats {
  kills: number
  waves: number
}

const DEFAULT_MOB: SimpleMob = {
    health: 16,
    damage: 2,
    speed: 90,
    xp: 2,
    size: 20,
}

function grbToHex(r1: number, g1: number, b1: number) {
    const r = 0xff * Math.min(Math.max(r1, 0.0), 1.0);
    const g = 0xff * Math.min(Math.max(g1, 0.0), 1.0);
    const b = 0xff * Math.min(Math.max(b1, 0.0), 1.0);
    return (r * 0x10000 & 0xff0000) | (g * 0x100 & 0xff00) | b;
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
  private healPacks: Phaser.GameObjects.Image[] = []
  private magnetPickups: Phaser.GameObjects.Image[] = []
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
  private pauseButton!: Phaser.GameObjects.Text
  private exitButton!: Phaser.GameObjects.Text
    private isPaused = false
    private totalXp = 0
    private level = 1
    private nextLevelXp = 100
    private pendingLevelUps = 0
  private upgradeOverlay: Phaser.GameObjects.GameObject[] = []
  private upgradeInProgress = false

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
        this.healPacks = []
        this.magnetPickups = []
        this.xpManager = new XpCrystalManager(this, this.cleanupPadding)
        this.enemyManager = new EnemyManager(this, this.enemies)
        this.ensureEnemyWalkAnimation()
        this.kills = 0
        this.wave = 0
        this.totalXp = 0
        this.level = 1
        this.nextLevelXp = this.getNextLevelXp(this.level)
        this.pendingLevelUps = 0
        this.upgradeOverlay = []
        this.upgradeInProgress = false
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

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.combat.reset()
            this.inputController.destroy()
            this.xpManager.destroyAll()
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

        this.spawnWave()
        this.time.addEvent({
            delay: 5000,
            callback: this.spawnWave,
            callbackScope: this,
            loop: true,
            startAt: 0,
        })
        this.time.addEvent({
            delay: 10000,
            callback: this.spawnHealPack,
            callbackScope: this,
            loop: true,
            startAt: 4000,
        })
        this.time.addEvent({
            delay: 60000, // every minute
            callback: this.spawnMagnetPickup,
            callbackScope: this,
            loop: true,
            startAt: 0,
        })
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

        this.healPacks = this.healPacks.filter((pack) => {
            if (!pack.active) return false

            if (
                Phaser.Math.Distance.Between(pack.x, pack.y, heroX, heroY) <
                (pack.getData('radius') as number) + heroRadius
            ) {
                this.collectHealPack(pack)
                return false
            }

            if (
                pack.x < view.left - this.cleanupPadding ||
                pack.x > view.right + this.cleanupPadding ||
                pack.y < view.top - this.cleanupPadding ||
                pack.y > view.bottom + this.cleanupPadding
            ) {
                pack.destroy()
                return false
            }

            return true
        })

        this.magnetPickups = this.magnetPickups.filter((pickup) => {
            if (!pickup.active) return false

            if (
                Phaser.Math.Distance.Between(pickup.x, pickup.y, heroX, heroY) <
                (pickup.getData('radius') as number) + heroRadius
            ) {
                this.collectMagnetPickup(pickup)
                return false
            }

            if (
                pickup.x < view.left - this.cleanupPadding ||
                pickup.x > view.right + this.cleanupPadding ||
                pickup.y < view.top - this.cleanupPadding ||
                pickup.y > view.bottom + this.cleanupPadding
            ) {
                pickup.destroy()
                return false
            }

            return true
        })

        this.enemyManager.resolveOverlaps()

    }

    /**
     * Increments the wave counter and spawns the next batch of enemies.
     */
    private spawnWave() {
        this.wave += 1
        this.updateHud()
        const count = Math.max(2 + this.wave, 10)
        const edge = Phaser.Math.Between(0, 3)
        // to make it feel like enemies are spawned from different directions, while main amount is still from one direction.
        this.spawnEnemy(1)
        this.spawnEnemy(1)
        this.spawnEnemy(2)
        this.spawnEnemy(2)
        this.spawnEnemy(3)
        this.spawnEnemy(3)
        this.spawnEnemy(4)
        this.spawnEnemy(4)
        for (let i = 0; i < count-8; i += 1) {
            this.spawnEnemy(edge)
        }
    }

    /**
     * @param powerMultiplier between 0 and +infinity. usually between 1 and 10.
     */
    private generateMobStats(powerMultiplier: number): SimpleMob {
        const MAX_SPEED = HERO_SPEED + 0.9;
        const MAX_HEALTH = 100 * powerMultiplier;
        const MAX_DAMAGE = MOB_MAX_DAMAGE * powerMultiplier;
        const min_relative_damage = 0.1;
        const min_relative_health = 0.1;
        const min_relative_speed = 0.3;
        const relativeDamage = Phaser.Math.FloatBetween(min_relative_damage, 1);
        const relativeHealth = Phaser.Math.FloatBetween(min_relative_health, Math.max(0.3, 1 - relativeDamage));
        const relativeSpeed = Math.max(min_relative_speed, 1 + min_relative_damage + min_relative_health - relativeHealth - relativeDamage);
        const speed = Math.round(relativeSpeed * MAX_SPEED);
        const health = Math.round(relativeHealth * MAX_HEALTH);
        const damage = Math.round(relativeDamage * MAX_DAMAGE);
        const mob: SimpleMob = {
            size: DEFAULT_MOB.size,
            speed: speed,
            health: health,
            xp: 0,
            damage: damage
        }
        const mobStrength = mob.health / MAX_HEALTH + mob.speed / MAX_SPEED + mob.damage / MAX_DAMAGE;
        mob.xp = Math.round(mobStrength) + 1;
        mob.size = mob.size + (mob.health / 4);
        return mob;
    }

    /**
     * Spawns a single enemy just outside the camera viewport on a random edge.
     */
    private spawnEnemy(edge: number) {
        const powerMultiplier = 1 + (this.wave / 10);
        const mob = this.generateMobStats(powerMultiplier);
        const mobDamageRelative = mob.damage / MOB_MAX_DAMAGE * powerMultiplier;
        const color = grbToHex(0.7 + (mobDamageRelative / 3), 0.4, 0.7 + ((1 - mobDamageRelative) / 3));

        const spawnContext = {
            heroX: this.hero.sprite.x,
            heroY: this.hero.sprite.y,
            halfWidth: this.cameras.main.width / 2,
            halfHeight: this.cameras.main.height / 2,
            buffer: this.spawnBuffer,
        }

        const enemy = this.enemyManager.spawn(edge, mob, color, spawnContext)

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
     * Drops a healing pickup within the current camera view, restoring hero HP on contact.
     */
    private spawnHealPack() {
        if (this.hero.hp >= this.hero.maxHp) return

        const view = this.cameras.main.worldView
        const margin = 60
        const x = Phaser.Math.FloatBetween(view.left + margin, view.right - margin)
        const y = Phaser.Math.FloatBetween(view.top + margin, view.bottom - margin)

        const diameter = PICKUP_DEFAULT_SIZE
        const pack = this.add.image(x, y, ENEMY_SPRITESHEET_KEY, HEAL_POTION_FRAME_INDEX)
        pack.setDisplaySize(diameter, diameter)
        pack.setTint(0xff7603)
        pack.setData('radius', diameter / 2)
        this.healPacks.push(pack)
    }

    private spawnMagnetPickup() {
        if (this.magnetPickups.some((pickup) => pickup.active)) return

        const view = this.cameras.main.worldView
        const margin = 60
        const x = Phaser.Math.FloatBetween(view.left + margin, view.right - margin)
        const y = Phaser.Math.FloatBetween(view.top + margin, view.bottom - margin)

        const diameter = PICKUP_DEFAULT_SIZE
        const pickup = this.add.image(x, y, ENEMY_SPRITESHEET_KEY, PORTAL_OPENS_FRAME_INDEX)
        pickup.setDisplaySize(diameter, diameter)
        pickup.setTint(0x42a5f5)
        pickup.setData('radius', diameter / 2)
        pickup.setDepth(0.2)
        this.magnetPickups.push(pickup)
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

    /**
     * Applies a heal pack effect and removes it from the scene.
     */
    private collectHealPack(pack: Phaser.GameObjects.Image) {
        const healAmount = 30
        healHero(this.hero, healAmount)
        this.cameras.main.flash(100, 80, 180, 255, false)
        this.updateHud()
        pack.destroy()
    }

    private collectMagnetPickup(pickup: Phaser.GameObjects.Image) {
        this.xpManager.activateMagnet()
        this.showMagnetPickup()
        this.cameras.main.flash(140, 120, 200, 255, false)
        pickup.destroy()
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
        if (this.upgradeInProgress) return
        if (this.pendingLevelUps <= 0) return

        const options = this.getAvailableUpgrades()
        this.pendingLevelUps -= 1

        if (!options.length) {
            this.tryOpenUpgradeMenu()
            return
        }

        this.upgradeInProgress = true
        this.openUpgradeMenu(options)
    }

    private getAvailableUpgrades(): UpgradeOption[] {
        return upgrades.filter(option => {
            if (this.hero.upgrades.includes(option.id)) return false
            if (option.requires && !option.requires.every(req => this.hero.upgrades.includes(req))) {
                return false
            }
            return true
        })
    }

    private openUpgradeMenu(options: UpgradeOption[]) {
        this.clearUpgradeOverlay()
        this.pauseForUpgrade()

        const {width, height} = this.scale
        const centerX = width / 2
        const centerY = height / 2
        const panelWidth = Math.min(width - 80, 420)
        const optionHeight = 84
        const panelHeight = options.length * optionHeight + 140

        const backdrop = this.add
            .rectangle(centerX, centerY, width, height, 0x000000, 0.55)
            .setScrollFactor(0)
            .setDepth(10)
            .setInteractive()
        this.upgradeOverlay.push(backdrop)

        const panel = this.add
            .rectangle(centerX, centerY, panelWidth, panelHeight, 0x23233a, 0.96)
            .setScrollFactor(0)
            .setDepth(11)
            .setStrokeStyle(2, 0xffeb3b, 0.5)
        this.upgradeOverlay.push(panel)

        const title = this.add
            .text(centerX, centerY - panelHeight / 2 + 40, 'Choose Upgrade', {
                color: '#ffe082',
                fontFamily: 'monospace',
                fontSize: '22px',
            })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(12)
        this.upgradeOverlay.push(title)

        options.forEach((option, index) => {
            const optionY = centerY - panelHeight / 2 + 88 + index * optionHeight
            const button = this.add
                .text(centerX, optionY, option.label, {
                    color: '#f5f5f5',
                    fontFamily: 'monospace',
                    fontSize: '20px',
                    backgroundColor: '#30304a',
                    padding: {x: 16, y: 10},
                })
                .setOrigin(0.5)
                .setScrollFactor(0)
                .setDepth(12)
                .setInteractive({useHandCursor: true})

            button.on('pointerover', () => button.setStyle({backgroundColor: '#3d3d5c'}))
            button.on('pointerout', () => button.setStyle({backgroundColor: '#30304a'}))
            button.on('pointerdown', () => this.applyUpgrade(option.id))
            this.upgradeOverlay.push(button)

            const description = this.add
                .text(centerX, optionY + 28, option.description, {
                    color: '#b0bec5',
                    fontFamily: 'monospace',
                    fontSize: '16px',
                })
                .setOrigin(0.5, 0)
                .setScrollFactor(0)
                .setDepth(12)
            this.upgradeOverlay.push(description)
        })
    }

    private applyUpgrade(id: string) {
        this.hero.upgrades.push(id)
        switch (id) {
            case 'aura': {
                this.handleAuraUpgrade(AURA_WEAPON, 'Aura weapon activated!')
                break
            }
            case 'auraMk2': {
                this.handleAuraUpgrade(AURA_MK2_WEAPON, 'Aura Mk II empowered!')
                break
            }
            case 'auraMk3': {
                this.handleAuraUpgrade(AURA_MK3_WEAPON, 'Aura Mk III intensified!')
                break
            }
            case 'auraMk4': {
                this.handleAuraUpgrade(AURA_MK4_WEAPON, 'Aura Mk IV radiates farther!')
                break
            }
            case 'auraMk5': {
                this.handleAuraUpgrade(AURA_MK5_WEAPON, 'Aura Mk V unleashed!')
                break
            }
            case 'pistolMk2': {
                this.handlePistolUpgrade(PISTOL_MK2_WEAPON, 'Pistol Mk II ready!')
                break
            }
            case 'pistolMk3': {
                this.handlePistolUpgrade(PISTOL_MK3_WEAPON, 'Pistol Mk III ready!')
                break
            }
            case 'pistolMk4': {
                this.handlePistolUpgrade(PISTOL_MK4_WEAPON, 'Pistol Mk IV ready!')
                break
            }
            case 'pistolMk5': {
                this.handlePistolUpgrade(PISTOL_MK5_WEAPON, 'Pistol Mk V ready!')
                break
            }
            case 'bomb': {
                this.handleBombUpgrade(BOMB_WEAPON, 'Bomb launcher deployed!')
                break
            }
            case 'bombMk2': {
                this.handleBombUpgrade(BOMB_MK2_WEAPON, 'Bombs Mk II primed!')
                break
            }
            case 'bombMk3': {
                this.handleBombUpgrade(BOMB_MK3_WEAPON, 'Bombs Mk III unleashed!')
                break
            }
            case 'sword': {
                this.handleSwordUpgrade(SWORD_WEAPON, 'Sword technique mastered!')
                break
            }
            case 'swordMk2': {
                this.handleSwordUpgrade(SWORD_MK2_WEAPON, 'Sword Mk II swings wider!')
                break
            }
            case 'swordMk3': {
                this.handleSwordUpgrade(SWORD_MK3_WEAPON, 'Sword Mk III hits harder!')
                break
            }
            case 'swordMk4': {
                this.handleSwordUpgrade(SWORD_MK4_WEAPON, 'Sword Mk IV extends reach!')
                break
            }
            case 'swordMk5': {
                this.handleSwordUpgrade(SWORD_MK5_WEAPON, 'Sword Mk V slices everything!')
                break
            }
            default:
                break
        }

        this.updateHud()
        this.finishUpgradeSelection()
    }

    private handleAuraUpgrade(weapon: Weapon, message: string) {
        this.hero.hasAura = true
        if (!this.hero.weaponIds.includes('aura')) {
            this.hero.weaponIds.push('aura')
        }
        this.hero.aura.setVisible(true)
        this.hero.aura.setRadius(weapon.area)
        this.combat.setAuraWeapon(weapon)
        this.showWeaponUpgrade(message)
    }

    private handlePistolUpgrade(weapon: Weapon, message: string) {
        this.combat.setBulletWeapon(weapon)
        this.showWeaponUpgrade(message)
    }

    private handleBombUpgrade(weapon: Weapon, message: string) {
        if (!this.hero.weaponIds.includes('bomb')) {
            this.hero.weaponIds.push('bomb')
        }
        this.combat.setBombWeapon(weapon)
        this.showWeaponUpgrade(message)
    }

    private handleSwordUpgrade(weapon: SwordWeapon, message: string) {
        if (!this.hero.weaponIds.includes('sword')) {
            this.hero.weaponIds.push('sword')
        }
        this.combat.setSwordWeapon(weapon)
        this.showWeaponUpgrade(message)
    }

  private finishUpgradeSelection() {
    this.clearUpgradeOverlay()
    this.resumeFromUpgrade()
    this.upgradeInProgress = false
    this.tryOpenUpgradeMenu()
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

    private clearUpgradeOverlay() {
        this.upgradeOverlay.forEach((obj) => obj.destroy())
        this.upgradeOverlay = []
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
        if (this.upgradeInProgress) return
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
