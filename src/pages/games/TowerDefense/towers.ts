import Phaser from 'phaser'

import { ONE_BIT_PACK_KNOWN_FRAMES } from '../Hordes/game/sprite.ts'
import { TOWER_COST, TOWER_RANGE, TOWER_FIRE_RATE, TOWER_DAMAGE } from './game/constants.ts'

export type TowerTypeKey = 'regular' | 'scatter' | 'bomber' | 'freezer'

export interface TowerLevelStats {
  cost: number
  range: number
  fireRate: number
  damage: number
  projectileCount?: number
  aoeRadius?: number
  slowFactor?: number
  slowDurationMs?: number
}

export interface TowerDefinition {
  key: TowerTypeKey
  label: string
  shortcut: string
  spriteFrame: number
  levelTints?: number[]
  description: string
  levels: [TowerLevelStats, TowerLevelStats, TowerLevelStats]
}

export const DEFAULT_TOWER_LEVEL_TINTS: [number, number, number] = [0xf1f5f9, 0xfacc15, 0xf97316]

export const TOWER_DEFINITIONS: TowerDefinition[] = [
  {
    key: 'regular',
    label: 'Regular',
    shortcut: '1',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.tower1,
    description: 'Balanced single-target tower.',
    levels: [
      {
        cost: TOWER_COST,
        range: TOWER_RANGE,
        fireRate: TOWER_FIRE_RATE,
        damage: TOWER_DAMAGE
      },
      {
        cost: TOWER_COST + 10,
        range: TOWER_RANGE + 25,
        fireRate: Math.max(450, TOWER_FIRE_RATE - 80),
        damage: Math.round(TOWER_DAMAGE * 1.6)
      },
      {
        cost: TOWER_COST + 25,
        range: TOWER_RANGE + 50,
        fireRate: Math.max(360, TOWER_FIRE_RATE - 160),
        damage: Math.round(TOWER_DAMAGE * 2.4)
      }
    ]
  },
  {
    key: 'scatter',
    label: 'Scatter',
    shortcut: '2',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.sword1,
    description: 'Short-range burst in 8 directions.',
    levels: [
      {
        cost: TOWER_COST + 5,
        range: Math.round(TOWER_RANGE * 0.65),
        fireRate: TOWER_FIRE_RATE + 150,
        damage: Math.round(TOWER_DAMAGE * 0.6),
        projectileCount: 8
      },
      {
        cost: TOWER_COST + 20,
        range: Math.round(TOWER_RANGE * 0.7),
        fireRate: TOWER_FIRE_RATE + 60,
        damage: Math.round(TOWER_DAMAGE * 0.75),
        projectileCount: 8
      },
      {
        cost: TOWER_COST + 35,
        range: Math.round(TOWER_RANGE * 0.78),
        fireRate: Math.max(500, TOWER_FIRE_RATE - 40),
        damage: Math.round(TOWER_DAMAGE * 0.95),
        projectileCount: 8
      }
    ]
  },
  {
    key: 'bomber',
    label: 'Bomber',
    shortcut: '3',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.bomb,
    description: 'Heavy projectile with splash damage.',
    levels: [
      {
        cost: TOWER_COST + 10,
        range: TOWER_RANGE + 30,
        fireRate: TOWER_FIRE_RATE + 300,
        damage: Math.round(TOWER_DAMAGE * 1.8),
        aoeRadius: 70
      },
      {
        cost: TOWER_COST + 25,
        range: TOWER_RANGE + 60,
        fireRate: TOWER_FIRE_RATE + 200,
        damage: Math.round(TOWER_DAMAGE * 2.4),
        aoeRadius: 90
      },
      {
        cost: TOWER_COST + 45,
        range: TOWER_RANGE + 80,
        fireRate: TOWER_FIRE_RATE + 100,
        damage: Math.round(TOWER_DAMAGE * 3),
        aoeRadius: 110
      }
    ]
  },
  {
    key: 'freezer',
    label: 'Freezer',
    shortcut: '4',
    spriteFrame: ONE_BIT_PACK_KNOWN_FRAMES.aura,
    levelTints: [0x38bdf8, 0x0ea5e9, 0x0284c7],
    description: 'Slows enemies in range.',
    levels: [
      {
        cost: TOWER_COST + 5,
        range: TOWER_RANGE - 10,
        fireRate: TOWER_FIRE_RATE + 120,
        damage: Math.round(TOWER_DAMAGE * 0.4),
        slowFactor: 0.65,
        slowDurationMs: 2000
      },
      {
        cost: TOWER_COST + 18,
        range: TOWER_RANGE + 10,
        fireRate: TOWER_FIRE_RATE + 40,
        damage: Math.round(TOWER_DAMAGE * 0.55),
        slowFactor: 0.5,
        slowDurationMs: 2600
      },
      {
        cost: TOWER_COST + 32,
        range: TOWER_RANGE + 25,
        fireRate: Math.max(480, TOWER_FIRE_RATE - 40),
        damage: Math.round(TOWER_DAMAGE * 0.7),
        slowFactor: 0.4,
        slowDurationMs: 3200
      }
    ]
  }
]

export interface Tower {
  spotId: number
  sprite: Phaser.GameObjects.Sprite
  definition: TowerDefinition
  level: number
  cooldown: number
  stats: TowerLevelStats
}

export interface TowerEnemy {
  sprite: Phaser.GameObjects.Sprite
  distance: number
  slowFactor: number
  slowUntil: number
  hp: number
  maxHp: number
  reward: number
  leakDamage: number
  baseTint: number
}

export interface TowerControllerDeps<TEnemy extends TowerEnemy = TowerEnemy> {
  getEnemies: () => TEnemy[]
  getOverlay?: () => Phaser.GameObjects.Graphics | undefined
  getCurrentTime: () => number
  onKill: (enemy: TEnemy) => void
}

interface BombProjectile {
  startX: number
  startY: number
  targetX: number
  targetY: number
  aoeRadius: number
  damage: number
  travelTime: number
  elapsed: number
  explosionDuration: number
  explosionElapsed: number
  state: 'flying' | 'exploding'
}

export class TowerController<TEnemy extends TowerEnemy = TowerEnemy> {
  private static readonly BOMB_SPEED_PX_PER_MS = 0.45
  private static readonly BOMB_EXPLOSION_DURATION_MS = 350

  private readonly deps: TowerControllerDeps<TEnemy>
  private activeBombs: BombProjectile[] = []

  constructor(deps: TowerControllerDeps<TEnemy>) {
    this.deps = deps
  }

  update(towers: Tower[], deltaMs: number) {
    const overlay = this.deps.getOverlay?.()
    overlay?.clear()
    this.updateBombProjectiles(deltaMs, overlay)
    for (const tower of towers) {
      tower.cooldown = Math.max(0, tower.cooldown - deltaMs)
      if (tower.cooldown > 0) continue
      if (this.performTowerAttack(tower, overlay)) {
        tower.cooldown = tower.stats.fireRate
      }
    }
  }

  private performTowerAttack(tower: Tower, overlay?: Phaser.GameObjects.Graphics) {
    switch (tower.definition.key) {
      case 'scatter':
        return this.fireScatterTower(tower, overlay)
      case 'bomber':
        return this.fireBomberTower(tower, overlay)
      case 'freezer':
        return this.fireFreezerTower(tower, overlay)
      case 'regular':
      default:
        return this.fireRegularTower(tower, overlay)
    }
  }

  private fireRegularTower(tower: Tower, overlay?: Phaser.GameObjects.Graphics) {
    const target = this.findTargetForTower(tower)
    if (!target) return false
    overlay
      ?.lineStyle(3, 0xfacc15, 0.6)
      .beginPath()
      .moveTo(tower.sprite.x, tower.sprite.y)
      .lineTo(target.sprite.x, target.sprite.y)
      .strokePath()
    this.applyDamage(target, tower.stats.damage)
    return true
  }

  private fireScatterTower(tower: Tower, overlay?: Phaser.GameObjects.Graphics) {
    const towerX = tower.sprite.x
    const towerY = tower.sprite.y
    const tileSize = Math.max(tower.sprite.displayWidth, tower.sprite.displayHeight, 32)
    const projectileRange = tileSize * 3
    if (projectileRange <= 0) return false
    const enemiesInRange = this.enemiesWithinCircle(towerX, towerY, projectileRange)
    if (enemiesInRange.length === 0) return false
    const directions = [
      0,
      Math.PI / 4,
      Math.PI / 2,
      (3 * Math.PI) / 4,
      Math.PI,
      (-3 * Math.PI) / 4,
      -Math.PI / 2,
      -Math.PI / 4
    ]
    const hitEnemies = new Set<TEnemy>()
    for (const angle of directions) {
      const dirX = Math.cos(angle)
      const dirY = Math.sin(angle)
      overlay
        ?.lineStyle(2, 0xfcd34d, 0.55)
        .beginPath()
        .moveTo(towerX, towerY)
        .lineTo(towerX + dirX * projectileRange, towerY + dirY * projectileRange)
        .strokePath()
      let closestEnemy: TEnemy | undefined
      let closestProjection = Infinity
      for (const enemy of enemiesInRange) {
        const vecX = enemy.sprite.x - towerX
        const vecY = enemy.sprite.y - towerY
        const projection = vecX * dirX + vecY * dirY
        if (projection <= 0 || projection > projectileRange) continue
        const perpendicular = Math.abs(dirX * vecY - dirY * vecX)
        const enemySize = Math.max(enemy.sprite.displayWidth || 0, enemy.sprite.displayHeight || 0, tileSize * 0.5, 12)
        const hitWidth = Math.max(6, enemySize * 0.3)
        if (perpendicular > hitWidth) continue
        if (projection < closestProjection) {
          closestProjection = projection
          closestEnemy = enemy
        }
      }
      if (closestEnemy && !hitEnemies.has(closestEnemy)) {
        hitEnemies.add(closestEnemy)
      }
    }
    for (const enemy of hitEnemies) {
      this.applyDamage(enemy, tower.stats.damage)
    }
    return true
  }

  private fireBomberTower(tower: Tower, overlay?: Phaser.GameObjects.Graphics) {
    const aoeRadius = tower.stats.aoeRadius
    if (!aoeRadius) return false
    const target = this.findTargetForTower(tower)
    if (!target) return false
    overlay?.lineStyle(2, 0xfbbf24, 0.4).lineBetween(tower.sprite.x, tower.sprite.y, target.sprite.x, target.sprite.y)
    this.spawnBombProjectile(tower, target, aoeRadius)
    return true
  }

  private fireFreezerTower(tower: Tower, overlay?: Phaser.GameObjects.Graphics) {
    const slowFactor = tower.stats.slowFactor ?? 1
    const slowDuration = tower.stats.slowDurationMs ?? 0
    const inRange = this.enemiesWithinCircle(tower.sprite.x, tower.sprite.y, tower.stats.range)
    if (inRange.length === 0) return false
    overlay?.lineStyle(2, 0x38bdf8, 0.65).strokeCircle(tower.sprite.x, tower.sprite.y, tower.stats.range)
    if (slowFactor < 1 && slowDuration > 0) {
      this.applySlow(inRange, slowFactor, slowDuration)
    }
    if (tower.stats.damage > 0) {
      for (const enemy of inRange) {
        this.applyDamage(enemy, tower.stats.damage)
      }
    }
    return true
  }

  private enemiesWithinCircle(x: number, y: number, radius: number) {
    const radiusSq = radius * radius
    return this.deps.getEnemies().filter((enemy) => {
      const distSq = Phaser.Math.Distance.Squared(x, y, enemy.sprite.x, enemy.sprite.y)
      return distSq <= radiusSq
    })
  }

  private findTargetForTower(tower: Tower) {
    let selection: TEnemy | undefined
    let selectionProgress = -Infinity
    for (const enemy of this.deps.getEnemies()) {
      const distSq = Phaser.Math.Distance.Squared(tower.sprite.x, tower.sprite.y, enemy.sprite.x, enemy.sprite.y)
      if (distSq > tower.stats.range * tower.stats.range) {
        continue
      }
      if (enemy.distance > selectionProgress) {
        selection = enemy
        selectionProgress = enemy.distance
      }
    }
    return selection
  }

  private applyDamage(enemy: TEnemy, amount: number) {
    if (amount <= 0 || !this.deps.getEnemies().includes(enemy)) return
    enemy.hp -= amount
    if (enemy.hp <= 0) {
      this.deps.onKill(enemy)
    }
  }

  private applySlow(enemies: TEnemy[], factor: number, durationMs: number) {
    const clampedFactor = Phaser.Math.Clamp(factor, 0.1, 1)
    const now = this.deps.getCurrentTime()
    for (const enemy of enemies) {
      if (!this.deps.getEnemies().includes(enemy)) continue
      enemy.slowFactor = Math.min(enemy.slowFactor, clampedFactor)
      enemy.slowUntil = Math.max(enemy.slowUntil, now + durationMs)
      enemy.sprite.setTint(0x60a5fa)
    }
  }

  private spawnBombProjectile(tower: Tower, target: TEnemy, aoeRadius: number) {
    const startX = tower.sprite.x
    const startY = tower.sprite.y
    const targetX = target.sprite.x
    const targetY = target.sprite.y
    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY)
    const travelTime = Math.max(180, distance / TowerController.BOMB_SPEED_PX_PER_MS)
    this.activeBombs.push({
      startX,
      startY,
      targetX,
      targetY,
      aoeRadius,
      damage: tower.stats.damage,
      travelTime,
      elapsed: 0,
      explosionDuration: TowerController.BOMB_EXPLOSION_DURATION_MS,
      explosionElapsed: 0,
      state: 'flying'
    })
  }

  private updateBombProjectiles(deltaMs: number, overlay?: Phaser.GameObjects.Graphics) {
    if (this.activeBombs.length === 0) return
    const remaining: BombProjectile[] = []
    for (const bomb of this.activeBombs) {
      if (bomb.state === 'flying') {
        bomb.elapsed += deltaMs
        const progress = Phaser.Math.Clamp(bomb.elapsed / bomb.travelTime, 0, 1)
        const currentX = Phaser.Math.Linear(bomb.startX, bomb.targetX, progress)
        const currentY = Phaser.Math.Linear(bomb.startY, bomb.targetY, progress)
        overlay?.fillStyle(0xf97316, 0.7).fillCircle(currentX, currentY, 6)
        overlay?.lineStyle(2, 0x78350f, 0.4).strokeCircle(currentX, currentY, 8)
        if (progress >= 1) {
          bomb.state = 'exploding'
          bomb.explosionElapsed = 0
          this.resolveBombExplosion(bomb)
        }
      }
      if (bomb.state === 'exploding') {
        bomb.explosionElapsed += deltaMs
        const fade = Phaser.Math.Clamp(1 - bomb.explosionElapsed / bomb.explosionDuration, 0, 1)
        overlay?.fillStyle(0xf97316, 0.12 * fade).fillCircle(bomb.targetX, bomb.targetY, bomb.aoeRadius)
        overlay?.lineStyle(4, 0xf97316, 0.7 * fade).strokeCircle(bomb.targetX, bomb.targetY, bomb.aoeRadius)
      }
      if (bomb.state === 'flying' || bomb.explosionElapsed < bomb.explosionDuration) {
        remaining.push(bomb)
      }
    }
    this.activeBombs = remaining
  }

  private resolveBombExplosion(bomb: BombProjectile) {
    const affected = this.enemiesWithinCircle(bomb.targetX, bomb.targetY, bomb.aoeRadius)
    for (const enemy of affected) {
      this.applyDamage(enemy, bomb.damage)
    }
  }
}
