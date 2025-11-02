import Phaser from 'phaser'
import type { HeroState } from './types'
import type { CombatSystem } from './combat'
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
  type WeaponStats
} from './weapons.ts'

const STARTER_UPGRADES = new Set(['pistol', 'sword', 'aura', 'bomb'])

interface UpgradeHooks {
  onMenuOpened(): void
  onMenuClosed(): void
  onUpgradeApplied(): void
  onShowMessage(message: string): void
}

export class UpgradeManager {
  private scene: Phaser.Scene
  private hero: HeroState
  private combat: CombatSystem
  private hooks: UpgradeHooks
  private overlay: Phaser.GameObjects.GameObject[] = []
  private active = false

  constructor(scene: Phaser.Scene, hero: HeroState, combat: CombatSystem, hooks: UpgradeHooks) {
    this.scene = scene
    this.hero = hero
    this.combat = combat
    this.hooks = hooks
  }

  isActive() {
    return this.active
  }

  openMenu(): boolean {
    if (this.active) return true

    const options = this.getAvailableUpgrades()
    if (!options.length) {
      return false
    }

    this.active = true
    this.hooks.onMenuOpened()

    this.clearOverlay()
    const { width, height } = this.scene.scale
    const centerX = width / 2
    const centerY = height / 2
    const panelWidth = Math.min(width - 80, 420)
    const optionHeight = 84
    const panelHeight = options.length * optionHeight + 140

    const backdrop = this.scene.add
      .rectangle(centerX, centerY, width, height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(10)
      .setInteractive()
    this.overlay.push(backdrop)

    const panel = this.scene.add
      .rectangle(centerX, centerY, panelWidth, panelHeight, 0x23233a, 0.96)
      .setScrollFactor(0)
      .setDepth(11)
      .setStrokeStyle(2, 0xffeb3b, 0.5)
    this.overlay.push(panel)

    const needsStarter = this.hero.weaponIds.length === 0
    const titleText = needsStarter ? 'Choose Starting Weapon' : 'Choose Upgrade'
    const title = this.scene.add
      .text(centerX, centerY - panelHeight / 2 + 40, titleText, {
        color: '#ffe082',
        fontFamily: 'monospace',
        fontSize: '22px'
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(12)
    this.overlay.push(title)

    options.forEach((option, index) => {
      const optionY = centerY - panelHeight / 2 + 88 + index * optionHeight
      const button = this.scene.add
        .text(centerX, optionY, option.label, {
          color: '#f5f5f5',
          fontFamily: 'monospace',
          fontSize: '20px',
          backgroundColor: '#30304a',
          padding: { x: 16, y: 10 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(12)
        .setInteractive({ useHandCursor: true })

      button.on('pointerover', () => button.setStyle({ backgroundColor: '#3d3d5c' }))
      button.on('pointerout', () => button.setStyle({ backgroundColor: '#30304a' }))
      button.on('pointerdown', () => this.applyUpgrade(option.id))
      this.overlay.push(button)

      const description = this.scene.add
        .text(centerX, optionY + 28, option.description, {
          color: '#b0bec5',
          fontFamily: 'monospace',
          fontSize: '16px'
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(12)
      this.overlay.push(description)
    })

    return true
  }

  destroy() {
    this.clearOverlay()
  }

  private applyUpgrade(id: string) {
    if (!this.hero.upgrades.includes(id)) {
      this.hero.upgrades.push(id)
    }

    switch (id) {
      case 'aura':
        this.handleAuraUpgrade(AURA_WEAPON, 'Aura weapon activated!')
        break
      case 'auraMk2':
        this.handleAuraUpgrade(AURA_MK2_WEAPON, 'Aura Mk II empowered!')
        break
      case 'auraMk3':
        this.handleAuraUpgrade(AURA_MK3_WEAPON, 'Aura Mk III intensified!')
        break
      case 'auraMk4':
        this.handleAuraUpgrade(AURA_MK4_WEAPON, 'Aura Mk IV radiates farther!')
        break
      case 'auraMk5':
        this.handleAuraUpgrade(AURA_MK5_WEAPON, 'Aura Mk V unleashed!')
        break
      case 'pistol':
        this.handlePistolUpgrade(PISTOL_WEAPON, 'Pistol ready!')
        break
      case 'pistolMk2':
        this.handlePistolUpgrade(PISTOL_MK2_WEAPON, 'Pistol Mk II ready!')
        break
      case 'pistolMk3':
        this.handlePistolUpgrade(PISTOL_MK3_WEAPON, 'Pistol Mk III ready!')
        break
      case 'pistolMk4':
        this.handlePistolUpgrade(PISTOL_MK4_WEAPON, 'Pistol Mk IV ready!')
        break
      case 'pistolMk5':
        this.handlePistolUpgrade(PISTOL_MK5_WEAPON, 'Pistol Mk V ready!')
        break
      case 'bomb':
        this.handleBombUpgrade(BOMB_WEAPON, 'Bomb launcher deployed!')
        break
      case 'bombMk2':
        this.handleBombUpgrade(BOMB_MK2_WEAPON, 'Bombs Mk II primed!')
        break
      case 'bombMk3':
        this.handleBombUpgrade(BOMB_MK3_WEAPON, 'Bombs Mk III unleashed!')
        break
      case 'sword':
        this.handleSwordUpgrade(SWORD_WEAPON, 'Sword technique mastered!')
        break
      case 'swordMk2':
        this.handleSwordUpgrade(SWORD_MK2_WEAPON, 'Sword Mk II swings wider!')
        break
      case 'swordMk3':
        this.handleSwordUpgrade(SWORD_MK3_WEAPON, 'Sword Mk III hits harder!')
        break
      case 'swordMk4':
        this.handleSwordUpgrade(SWORD_MK4_WEAPON, 'Sword Mk IV extends reach!')
        break
      case 'swordMk5':
        this.handleSwordUpgrade(SWORD_MK5_WEAPON, 'Sword Mk V slices everything!')
        break
      case 'area1':
        this.applyAreaUpgrade()
        break
      case 'damage1':
        this.applyDamageUpgrade()
        break
      default:
        break
    }

    this.hooks.onUpgradeApplied()
    this.closeMenu()
  }

  private closeMenu() {
    this.clearOverlay()
    this.active = false
    this.hooks.onMenuClosed()
  }

  private clearOverlay() {
    this.overlay.forEach((entry) => entry.destroy())
    this.overlay = []
  }

  private getAvailableUpgrades(): UpgradeOption[] {
    const needsStarter = this.hero.weaponIds.length === 0
    return upgrades.filter((option) => {
      if (this.hero.upgrades.includes(option.id)) return false
      if (option.requires && !option.requires.every((req) => this.hero.upgrades.includes(req))) {
        return false
      }
      if (needsStarter) {
        return STARTER_UPGRADES.has(option.id)
      }
      return true
    })
  }

  private handleAuraUpgrade(weapon: WeaponStats, message: string) {
    this.hero.hasAura = true
    if (!this.hero.weaponIds.includes('aura')) {
      this.hero.weaponIds.push('aura')
    }
    this.hero.aura.setVisible(true)
    this.hero.aura.setRadius(weapon.area * this.hero.areaMultiplier)
    this.combat.setAuraWeapon(weapon)
    this.hooks.onShowMessage(message)
  }

  private handlePistolUpgrade(weapon: WeaponStats, message: string) {
    if (!this.hero.weaponIds.includes('pistol')) {
      this.hero.weaponIds.push('pistol')
    }
    this.combat.setPistolWeapon(weapon)
    this.hooks.onShowMessage(message)
  }

  private handleBombUpgrade(weapon: WeaponStats, message: string) {
    if (!this.hero.weaponIds.includes('bomb')) {
      this.hero.weaponIds.push('bomb')
    }
    this.combat.setBombWeapon(weapon)
    this.hooks.onShowMessage(message)
  }

  private handleSwordUpgrade(weapon: WeaponStats, message: string) {
    if (!this.hero.weaponIds.includes('sword')) {
      this.hero.weaponIds.push('sword')
    }
    this.combat.setSwordWeapon(weapon)
    this.hooks.onShowMessage(message)
  }

  private applyAreaUpgrade() {
    this.hero.areaMultiplier *= 1.1
    this.combat.refreshWeapons()
    this.hooks.onShowMessage('Area increased by 10%!')
  }

  private applyDamageUpgrade() {
    this.hero.damageMultiplier *= 1.1
    this.combat.refreshWeapons()
    this.hooks.onShowMessage('Damage increased by 10%!')
  }
}
