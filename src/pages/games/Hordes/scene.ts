import Phaser from 'phaser'
import {CombatSystem} from './combat'
import {createHero, damageHero, healHero, HERO_SPEED, moveHero} from './hero'
import type {InputController} from './input'
import {createInputController} from './input'
import type {HeroState, SimpleMob} from './types'
import {AURA_WEAPON, PISTOL_MK2_WEAPON, PISTOL_WEAPON, type UpgradeOption, upgrades} from "./weapons.ts";

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
    private hero!: HeroState
    private inputController!: InputController
    private enemies: Phaser.GameObjects.Arc[] = []
    private healPacks: Phaser.GameObjects.Arc[] = []
    private spawnBuffer = 60
    private cleanupPadding = 260
    private background!: Phaser.GameObjects.TileSprite
    private worldBounds = 20000
    private infoText!: Phaser.GameObjects.Text
    private kills = 0
    private wave = 0
    private combat!: CombatSystem
    private pauseButton!: Phaser.GameObjects.Text
    private isPaused = false
    private totalXp = 0
    private level = 1
    private nextLevelXp = 100
    private pendingLevelUps = 0
    private upgradeOverlay: Phaser.GameObjects.GameObject[] = []
    private upgradeInProgress = false

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
                enemyBaseHp: DEFAULT_MOB.health,
            },
            {
                hero: this.hero,
                getEnemies: () => this.enemies,
                onEnemyKilled: (_enemy, mob) => {
                    this.kills += 1
                    this.awardXp(mob.xp)
                },
            },
        )

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.combat.reset()
            this.inputController.destroy()
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

        this.time.addEvent({
            delay: 1700,
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

        this.spawnWave()
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

        this.combat.update(dt, view, this.cleanupPadding)

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

    }

    /**
     * Increments the wave counter and spawns the next batch of enemies.
     */
    private spawnWave() {
        if (this.hasLivingEnemies()) {
            return
        }

        this.wave += 1
        this.updateHud()
        const count = Math.max(2 + this.wave, 10)
        for (let i = 0; i < count; i += 1) {
            this.spawnEnemy()
        }
    }

    private hasLivingEnemies() {
        return this.enemies.some((enemy) => enemy.active)
    }

    /**
     * Spawns a single enemy just outside the camera viewport on a random edge.
     */
    private spawnEnemy() {
        const heroX = this.hero.sprite.x
        const heroY = this.hero.sprite.y
        const halfWidth = this.cameras.main.width / 2
        const halfHeight = this.cameras.main.height / 2
        const buffer = this.spawnBuffer
        const MAX_DAMAGE = 16;
        const MAX_SPEED = HERO_SPEED - 10;
        const MAX_HEALTH = 100;
        const mob: SimpleMob = {
            size: DEFAULT_MOB.size,
            speed: Phaser.Math.Between(MAX_SPEED / 3, MAX_SPEED),
            health: Phaser.Math.Between(5, MAX_HEALTH),
            xp: 0,
            damage: Phaser.Math.Between(1, MAX_DAMAGE)
        }
        const mobStrength = mob.health / MAX_HEALTH + mob.speed / MAX_SPEED + mob.damage / MAX_DAMAGE;
        mob.xp = Math.round(mobStrength) + 1;
        mob.size = mob.size + (mob.health / 4);
        const mobDamageRelative = mob.damage / MAX_DAMAGE;
        const color = grbToHex(0.7 + (mobDamageRelative / 3), 0.4, 0.7 + ((1 - mobDamageRelative) / 3));

        const edge = Phaser.Math.Between(0, 3)
        let x = 0
        let y = 0

        switch (edge) {
            case 0: {
                x = heroX + Phaser.Math.FloatBetween(-halfWidth, halfWidth)
                y = heroY - halfHeight - buffer
                break
            }
            case 1: {
                x = heroX + halfWidth + buffer
                y = heroY + Phaser.Math.FloatBetween(-halfHeight, halfHeight)
                break
            }
            case 2: {
                x = heroX + Phaser.Math.FloatBetween(-halfWidth, halfWidth)
                y = heroY + halfHeight + buffer
                break
            }
            default: {
                x = heroX - halfWidth - buffer
                y = heroY + Phaser.Math.FloatBetween(-halfHeight, halfHeight)
                break
            }
        }

        const enemy = this.add.circle(x, y, mob.size / 2, color)
        enemy.setActive(true)
        enemy.setData('lastHit', 0)
        enemy.setData('mob', mob)
        enemy.setData('hp', mob.health)
        enemy.setData('lastAuraTick', 0)
        this.enemies.push(enemy)
    }

    /**
     * Drops a healing pickup within the current camera view, restoring hero HP on contact.
     */
    private spawnHealPack() {
        if (this.hero.hp >= this.hero.maxHp) return

        const view = this.cameras.main.worldView
        const margin = 60
        const packRadius = 10
        const x = Phaser.Math.FloatBetween(view.left + margin, view.right - margin)
        const y = Phaser.Math.FloatBetween(view.top + margin, view.bottom - margin)

        const pack = this.add.circle(x, y, packRadius, 0x4fc3f7)
        pack.setStrokeStyle(2, 0xffffff, 0.8)
        pack.setData('radius', packRadius)
        this.healPacks.push(pack)
    }

    /**
     * Applies damage from an enemy to the hero with per-enemy cooldown and restarts on death.
     */
    private handleHeroHit(enemy: Phaser.GameObjects.Arc, mob: SimpleMob) {
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
            this.time.delayedCall(260, () => this.scene.restart())
        }
    }

    /**
     * Applies a heal pack effect and removes it from the scene.
     */
    private collectHealPack(pack: Phaser.GameObjects.Arc) {
        const healAmount = 30
        healHero(this.hero, healAmount)
        this.cameras.main.flash(100, 80, 180, 255, false)
        this.updateHud()
        pack.destroy()
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
        return upgrades.filter(it => !this.hero.upgrades.includes(it.id))
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
                this.hero.hasAura = true
                this.hero.weaponIds.push('aura')
                this.hero.aura.setVisible(true)
                this.combat.setAuraWeapon(AURA_WEAPON)
                this.showWeaponUpgrade('Aura weapon activated!')
                break
            }
            case 'pistolMk2': {
                this.combat.setBulletWeapon(PISTOL_MK2_WEAPON)
                this.showWeaponUpgrade('Pistol Mk II ready!')
                break
            }
            default:
                break
        }

        this.updateHud()
        this.finishUpgradeSelection()
    }

    private finishUpgradeSelection() {
        this.clearUpgradeOverlay()
        this.resumeFromUpgrade()
        this.upgradeInProgress = false
        this.tryOpenUpgradeMenu()
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

    private getNextLevelXp(level: number) {
        return level * 100
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
}
