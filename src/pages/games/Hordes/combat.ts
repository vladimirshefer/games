import Phaser from 'phaser'
import type {EnemySprite, HeroState, SimpleMob} from './types'
import type {SwordWeapon, Weapon} from "./weapons.ts";
import {Sword} from "./game/weapons/sword.ts";
import {Bomb} from "./game/weapons/bomb.ts";
import {Aura} from "./game/weapons/aura.ts";
import {Pistol} from "./game/weapons/pistol.ts";

export interface CombatConfig {
  pistolWeapon: Weapon
  auraWeapon?: Weapon | null
  bombWeapon?: Weapon | null
  swordWeapon?: SwordWeapon | null
  enemyBaseHp: number
}

export interface CombatContext {
  hero: HeroState
  getEnemies(): EnemySprite[]
  onEnemyKilled(enemy: EnemySprite, mob: SimpleMob): void
}

export class CombatSystem {
  private readonly scene: Phaser.Scene
  private readonly config: CombatConfig
  private readonly context: CombatContext
  private sword: Sword | null = null
  private bomb: Bomb | null = null
  private aura: Aura | null = null
  private pistol: Pistol | null = null

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

  update(dt: number, worldView: Phaser.Geom.Rectangle, cleanupPadding: number) {
    const enemies = this.context.getEnemies()
    this.pistol?.update(dt, enemies, worldView, cleanupPadding)
    this.bomb?.update(dt, enemies)
    this.sword?.update(dt, enemies)
    this.aura?.update(dt, enemies)
  }

  private damageEnemy(enemy: EnemySprite, amount: number, mob: SimpleMob) {
    if (!enemy.active) return false

    const currentHp =
      (enemy.getData('hp') as number | undefined) ?? mob.health
    const nextHp = currentHp - amount
    enemy.setData('hp', nextHp)

    const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
    if (hpText && hpText.active) {
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

  setPistolWeapon(weapon: Weapon) {
    this.pistol?.reset()
    this.config.pistolWeapon = weapon
    if (weapon) {
      this.pistol = new Pistol(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.pistol = null
    }
    this.pistol?.reset()
  }

  setAuraWeapon(weapon: Weapon | null | undefined) {
    this.aura?.reset()
    this.config.auraWeapon = weapon ?? null
    if (weapon) {
      this.aura = new Aura(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.aura = null
    }
    this.aura?.reset()
  }

  setBombWeapon(weapon: Weapon | null) {
    this.bomb?.reset()
    this.config.bombWeapon = weapon ?? null
    if (weapon) {
      this.bomb = new Bomb(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.bomb = null
    }
    this.bomb?.reset()
  }

  setSwordWeapon(weapon: SwordWeapon | null) {
    this.sword?.reset()
    this.config.swordWeapon = weapon
    if (weapon) {
      this.sword = new Sword(this.scene, this.context, weapon, this.damageEnemy)
    } else {
      this.sword = null
    }
    this.sword?.reset()
  }

}
