import Phaser from 'phaser'
import type { EnemySprite, HeroState } from './types.ts'
import { normalizeWeapon, type WeaponStats } from './weapons.ts'
import { Sword } from './weapons/sword.ts'
import { Bomb } from './weapons/bomb.ts'
import { Aura } from './weapons/aura.ts'
import { Pistol } from './weapons/pistol.ts'
import type { Weapon } from './weapons/weapon.ts'
import type { MobStats } from './enemies.ts'
import { STATS_FOR_RUN } from './profile.ts'

export interface CombatContext {
  hero: HeroState
  getEnemies(): EnemySprite[]
  onEnemyKilled(enemy: EnemySprite, mob: MobStats): void
}

export class CombatSystem {
  private readonly scene: Phaser.Scene
  private readonly context: CombatContext

  private weapons: Weapon[] = []
  private originalStats: { [key: string]: WeaponStats | undefined } = {}

  constructor(scene: Phaser.Scene, context: CombatContext) {
    this.scene = scene
    this.context = context
  }

  destroy() {
    this.weapons.forEach((it) => it.destroy())
  }

  update(dt: number, worldView: Phaser.Geom.Rectangle) {
    const enemies = this.context.getEnemies()
    this.weapons.forEach((it) => it.update(dt, enemies, worldView))
  }

  refreshWeapons() {
    this.setPistolWeapon(this.originalStats['pistol'] ?? null)
    this.setBombWeapon(this.originalStats['bomb'] ?? null)
    this.setSwordWeapon(this.originalStats['sword'] ?? null)
    this.setAuraWeapon(this.originalStats['aura'] ?? null)
  }

  private damageEnemy(enemy: EnemySprite, amount: number, mob: MobStats, weaponId: string) {
    if (!enemy.active) return false

    const currentHp = (enemy.getData('hp') as number | undefined) ?? mob.health
    const nextHp = currentHp - amount
    enemy.setData('hp', nextHp)

    const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
    if (hpText?.active) {
      hpText.setText(`${Math.max(nextHp, 0)}`)
    }

    const actualDamage = currentHp - nextHp
    STATS_FOR_RUN.weapon_damage[weaponId] = (STATS_FOR_RUN.weapon_damage[weaponId] ?? 0) + actualDamage

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
    this.originalStats['pistol'] = weapon
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Pistol(this.scene, this.context, configured, this.damageEnemyWithStats('pistol')))
  }

  private damageEnemyWithStats = (weapon: string) => (enemy: EnemySprite, damageAmount: number, mobStats: MobStats) => {
    this.damageEnemy(enemy, damageAmount, mobStats, weapon)
  }

  setAuraWeapon(weapon: WeaponStats | null) {
    if (!weapon) {
      this.unsetWeapon('aura')
      return
    }
    this.originalStats['aura'] = weapon
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Aura(this.scene, this.context, configured, this.damageEnemyWithStats('aura')))
  }

  setBombWeapon(weapon: WeaponStats | null) {
    if (!weapon) {
      this.unsetWeapon('bomb')
      return
    }
    this.originalStats['bomb'] = weapon
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Bomb(this.scene, this.context, configured, this.damageEnemyWithStats('bomb')))
  }

  setSwordWeapon(weapon: WeaponStats | null) {
    if (!weapon) {
      this.unsetWeapon('sword')
      return
    }
    this.originalStats['sword'] = weapon
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Sword(this.scene, this.context, configured, this.damageEnemyWithStats('sword')))
  }

  setWeaponStats(weaponId: string, weaponStats: WeaponStats | null) {
    if (!weaponStats) {
      this.unsetWeapon(weaponId)
      return
    }
    this.originalStats[weaponId] = weaponStats
    const configured = this.withModifiers(weaponStats)
    this.setWeapon(this.createWeapon(weaponId, configured))
  }

  private createWeapon(weaponId: string, weaponStats: WeaponStats): Weapon {
    const damageEnemy = this.damageEnemyWithStats(weaponId)
    if (weaponId == 'sword') return new Sword(this.scene, this.context, weaponStats, damageEnemy)
    if (weaponId == 'aura') return new Aura(this.scene, this.context, weaponStats, damageEnemy)
    if (weaponId == 'bomb') return new Bomb(this.scene, this.context, weaponStats, damageEnemy)
    if (weaponId == 'pistol') return new Pistol(this.scene, this.context, weaponStats, damageEnemy)
    throw new Error(`Unknown weapon id ${weaponId}`)
  }

  private setWeapon(weapon: Weapon) {
    const index = this.weapons.findIndex((it) => it.id() === weapon.id())
    if (index >= 0) {
      const weapon1 = this.weapons[index]
      weapon1.destroy()
      this.weapons[index] = weapon
    } else {
      this.weapons.push(weapon)
    }
  }

  unsetWeapon(id: string) {
    const index = this.weapons.findIndex((it) => it.id() === id)
    if (index >= 0) {
      const weapon1 = this.weapons[index]
      weapon1.destroy()
      this.weapons.splice(index, 1)
      this.originalStats[id] = undefined
    }
  }

  private withModifiers(base: WeaponStats): WeaponStats {
    const hero = this.context.hero
    const areaMultiplier = hero.areaMultiplier
    const damageMultiplier = hero.damageMultiplier

    return normalizeWeapon({
      ...base,
      area: base.area * areaMultiplier,
      damage: base.damage * damageMultiplier
    })
  }
}
