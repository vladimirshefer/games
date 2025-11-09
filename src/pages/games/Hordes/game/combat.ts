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

  reset() {
    this.weapons.forEach((it) => it.reset())
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
    this.originalStats['pistol'] = weapon
    const configured = this.withModifiers(weapon)
    this.setWeapon(new Pistol(this.scene, this.context, configured, this.damageEnemyWithStats('pistol')))
  }

  private damageEnemyWithStats = (weapon: string) => (e: EnemySprite, a: number, s: MobStats) => {
    STATS_FOR_RUN.weapon_damage[weapon] = (STATS_FOR_RUN.weapon_damage[weapon] ?? 0) + a
    this.damageEnemy(e, a, s)
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
