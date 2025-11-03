import Phaser from 'phaser'
import type { EnemySprite, HeroState } from './types'
import type { WeaponStats } from './weapons.ts'
import { Sword } from './game/weapons/sword.ts'
import { Bomb } from './game/weapons/bomb.ts'
import { Aura } from './game/weapons/aura.ts'
import { Pistol } from './game/weapons/pistol.ts'
import type { Weapon } from './game/weapons/weapon.ts'
import type { MobStats } from './enemies.ts'

export interface CombatConfig {
  pistolWeapon?: WeaponStats | null
  auraWeapon?: WeaponStats | null
  bombWeapon?: WeaponStats | null
  swordWeapon?: WeaponStats | null
}

export interface CombatContext {
  hero: HeroState
  getEnemies(): EnemySprite[]
  onEnemyKilled(enemy: EnemySprite, mob: MobStats): void
}

export class CombatSystem {
  private readonly scene: Phaser.Scene
  private readonly config: CombatConfig
  private readonly context: CombatContext
  private sword: Weapon | null = null
  private bomb: Weapon | null = null
  private aura: Weapon | null = null
  private pistol: Weapon | null = null

  constructor(scene: Phaser.Scene, config: CombatConfig, context: CombatContext) {
    this.scene = scene
    this.config = config
    this.context = context
    this.setSwordWeapon(this.config.swordWeapon ?? null)
    this.setBombWeapon(this.config.bombWeapon ?? null)
    this.setAuraWeapon(this.config.auraWeapon ?? null)
    this.setPistolWeapon(this.config.pistolWeapon ?? null)
  }

  reset() {
    this.sword?.reset()
    this.bomb?.reset()
    this.aura?.reset()
    this.pistol?.reset()
  }

  update(dt: number, worldView: Phaser.Geom.Rectangle) {
    const enemies = this.context.getEnemies()
    this.pistol?.update(dt, enemies, worldView)
    this.bomb?.update(dt, enemies, worldView)
    this.sword?.update(dt, enemies, worldView)
    this.aura?.update(dt, enemies, worldView)
  }

  refreshWeapons() {
    this.setPistolWeapon(this.config.pistolWeapon ?? null)
    this.setBombWeapon(this.config.bombWeapon ?? null)
    this.setSwordWeapon(this.config.swordWeapon ?? null)
    this.setAuraWeapon(this.config.auraWeapon ?? null)
  }

  private damageEnemy(enemy: EnemySprite, amount: number, mob: MobStats) {
    if (!enemy.active) return false

    const currentHp = (enemy.getData('hp') as number | undefined) ?? mob.health
    const nextHp = currentHp - amount
    enemy.setData('hp', nextHp)

    const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
    if (hpText?.active) {
      hpText.setText(`${Math.max(nextHp, 0)}`)
    }

    if (nextHp <= 0) {
      this.context.onEnemyKilled(enemy, mob)
      enemy.setActive(false)
      enemy.destroy()
      return true
    }

    return false
  }

  setPistolWeapon(weapon: WeaponStats | null) {
    this.pistol?.reset()
    this.config.pistolWeapon = weapon
    if (weapon) {
      const configured = this.withModifiers(weapon)
      this.pistol = new Pistol(this.scene, this.context, configured, this.damageEnemy)
    } else {
      this.pistol = null
    }
    this.pistol?.reset()
  }

  setAuraWeapon(weapon: WeaponStats | null) {
    this.aura?.reset()
    this.config.auraWeapon = weapon ?? null
    if (weapon) {
      const configured = this.withModifiers(weapon)
      this.aura = new Aura(this.scene, this.context, configured, this.damageEnemy)
      this.context.hero.aura.setRadius(configured.area)
    } else {
      this.aura = null
      this.context.hero.aura.setRadius(0)
    }
    this.aura?.reset()
  }

  setBombWeapon(weapon: WeaponStats | null) {
    this.bomb?.reset()
    this.config.bombWeapon = weapon ?? null
    if (weapon) {
      const configured = this.withModifiers(weapon)
      this.bomb = new Bomb(this.scene, this.context, configured, this.damageEnemy)
    } else {
      this.bomb = null
    }
    this.bomb?.reset()
  }

  setSwordWeapon(weapon: WeaponStats | null) {
    this.sword?.reset()
    this.config.swordWeapon = weapon
    if (weapon) {
      const configured = this.withModifiers(weapon)
      this.sword = new Sword(this.scene, this.context, configured, this.damageEnemy)
    } else {
      this.sword = null
    }
    this.sword?.reset()
  }

  private withModifiers(base: WeaponStats): WeaponStats {
    const hero = this.context.hero
    const areaMultiplier = hero.areaMultiplier ?? 1
    const damageMultiplier = hero.damageMultiplier ?? 1

    return {
      ...base,
      area: base.area * areaMultiplier,
      damage: base.damage * damageMultiplier
    }
  }
}
