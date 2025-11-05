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

  private weapons: Weapon[] = []

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
    this.weapons.forEach((it) => it.reset())
  }

  update(dt: number, worldView: Phaser.Geom.Rectangle) {
    const enemies = this.context.getEnemies()
    this.weapons.forEach((it) => it.update(dt, enemies, worldView))
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
    if (!weapon) {
      this.unsetWeapon('pistol')
      return
    }
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Pistol(this.scene, this.context, configured, this.damageEnemy))
  }

  setAuraWeapon(weapon: WeaponStats | null) {
    if (!weapon) {
      this.unsetWeapon('aura')
      return
    }
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Aura(this.scene, this.context, configured, this.damageEnemy))
  }

  setBombWeapon(weapon: WeaponStats | null) {
    if (!weapon) {
      this.unsetWeapon('bomb')
      return
    }
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Bomb(this.scene, this.context, configured, this.damageEnemy))
  }

  setSwordWeapon(weapon: WeaponStats | null) {
    if (!weapon) {
      this.unsetWeapon('sword')
      return
    }
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Sword(this.scene, this.context, configured, this.damageEnemy))
  }

  setWeapon(weapon: Weapon) {
    const index = this.weapons.findIndex((it) => it.id() === weapon.id())
    if (index >= 0) {
      const weapon1 = this.weapons[index]
      weapon1.reset()
      this.weapons[index] = weapon
    } else {
      this.weapons.push(weapon)
    }
    weapon.reset()
  }

  unsetWeapon(id: string) {
    const index = this.weapons.findIndex((it) => it.id() === id)
    if (index >= 0) {
      const weapon1 = this.weapons[index]
      weapon1.reset()
      this.weapons.splice(index, 1)
    }
  }

  private withModifiers(base: WeaponStats): WeaponStats {
    const hero = this.context.hero
    const areaMultiplier = hero.areaMultiplier
    const damageMultiplier = hero.damageMultiplier

    return {
      ...base,
      area: base.area * areaMultiplier,
      damage: base.damage * damageMultiplier
    }
  }
}
