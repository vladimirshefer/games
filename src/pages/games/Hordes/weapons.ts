import { AURA_RADIUS } from './hero.ts'
import { HERO_BASE_DAMAGE } from './game/constants.ts'

export interface WeaponStats {
  damage: number
  cooldown: number
  area: number
  pierce: number
  sectorAngle: number
}

export function normalizeWeapon(stats: Partial<WeaponStats>): WeaponStats {
  return {
    damage: Math.ceil(stats.damage ?? HERO_BASE_DAMAGE),
    cooldown: Math.ceil((stats.cooldown ?? 2) * 10) / 10,
    area: Math.ceil(stats.area ?? 0),
    pierce: Math.ceil(stats.pierce ?? 0),
    sectorAngle: Math.ceil(stats.sectorAngle ?? 120)
  }
}

export const PISTOL_WEAPON: WeaponStats = normalizeWeapon({
  damage: HERO_BASE_DAMAGE,
  cooldown: 0.5,
  pierce: 1,
  area: 6
})
const pistolUpgrade = (weapon: WeaponStats) =>
  normalizeWeapon({
    ...weapon,
    damage: weapon.damage * 1.1,
    cooldown: weapon.cooldown * 0.9,
    pierce: weapon.pierce + 1
  })
export const PISTOL_MK2_WEAPON: WeaponStats = pistolUpgrade(PISTOL_WEAPON)
export const PISTOL_MK3_WEAPON: WeaponStats = pistolUpgrade(PISTOL_MK2_WEAPON)
export const PISTOL_MK4_WEAPON: WeaponStats = pistolUpgrade(PISTOL_MK3_WEAPON)
export const PISTOL_MK5_WEAPON: WeaponStats = pistolUpgrade(PISTOL_MK4_WEAPON)

export const AURA_WEAPON: WeaponStats = normalizeWeapon({
  damage: HERO_BASE_DAMAGE,
  cooldown: 1.0,
  area: AURA_RADIUS
})
const auraUpgrade = (weapon: WeaponStats) =>
  normalizeWeapon({ ...weapon, damage: weapon.damage * 1.1, cooldown: weapon.cooldown * 0.9, area: weapon.area * 1.2 })
export const AURA_MK2_WEAPON: WeaponStats = auraUpgrade(AURA_WEAPON)
export const AURA_MK3_WEAPON: WeaponStats = auraUpgrade(AURA_MK2_WEAPON)
export const AURA_MK4_WEAPON: WeaponStats = auraUpgrade(AURA_MK3_WEAPON)
export const AURA_MK5_WEAPON: WeaponStats = auraUpgrade(AURA_MK4_WEAPON)

export const BOMB_WEAPON: WeaponStats = normalizeWeapon({ cooldown: 5, damage: HERO_BASE_DAMAGE * 4, area: 100 })
const bombUpgrade = (weapon: WeaponStats) =>
  normalizeWeapon({ ...weapon, damage: weapon.damage * 1.3, cooldown: weapon.cooldown * 0.7, area: weapon.area * 1.2 })
export const BOMB_MK2_WEAPON: WeaponStats = bombUpgrade(BOMB_WEAPON)
export const BOMB_MK3_WEAPON: WeaponStats = bombUpgrade(BOMB_MK2_WEAPON)

export const SWORD_WEAPON: WeaponStats = normalizeWeapon({
  cooldown: 2,
  damage: HERO_BASE_DAMAGE * 2.0,
  area: 50,
  sectorAngle: 120
})
const swordUpgrade = (weapon: WeaponStats) =>
  normalizeWeapon({
    ...weapon,
    damage: weapon.damage * 1.1,
    cooldown: weapon.cooldown * 0.9,
    area: weapon.area + 10,
    sectorAngle: weapon.sectorAngle + 10
  })
export const SWORD_MK2_WEAPON: WeaponStats = swordUpgrade(SWORD_WEAPON)
export const SWORD_MK3_WEAPON: WeaponStats = swordUpgrade(SWORD_MK2_WEAPON)
export const SWORD_MK4_WEAPON: WeaponStats = swordUpgrade(SWORD_MK3_WEAPON)
export const SWORD_MK5_WEAPON: WeaponStats = swordUpgrade(SWORD_MK4_WEAPON)

export interface UpgradeOption {
  id: string
  label: string
  description: string
  requires?: string[]
  category?: 'WEAPON_NEW' | 'WEAPON_UPGRADE' | 'PASSIVE_NEW' | 'PASSIVE_UPGRADE'
  weaponId?: string
  level?: number
}

export const upgrades: UpgradeOption[] = [
  {
    id: 'aura',
    label: 'Unlock Aura',
    description: 'Activate a damaging circle around you.',
    category: 'WEAPON_NEW',
    weaponId: 'aura',
    level: 1
  },
  {
    id: 'auraMk2',
    label: 'Aura Mk II',
    description: statsDiffMessage(AURA_WEAPON, AURA_MK2_WEAPON),
    requires: ['aura'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'aura',
    level: 2
  },
  {
    id: 'auraMk3',
    label: 'Aura Mk III',
    description: statsDiffMessage(AURA_MK2_WEAPON, AURA_MK3_WEAPON),
    requires: ['auraMk2'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'aura',
    level: 3
  },
  {
    id: 'auraMk4',
    label: 'Aura Mk IV',
    description: statsDiffMessage(AURA_MK3_WEAPON, AURA_MK4_WEAPON),
    requires: ['auraMk3'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'aura',
    level: 4
  },
  {
    id: 'auraMk5',
    label: 'Aura Mk V',
    description: statsDiffMessage(AURA_MK4_WEAPON, AURA_MK5_WEAPON),
    requires: ['auraMk4'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'aura',
    level: 5
  },
  {
    id: 'pistol',
    label: 'Equip Pistol',
    description: 'Basic ranged damage with moderate fire rate.',
    category: 'WEAPON_NEW',
    weaponId: 'pistol',
    level: 1
  },
  {
    id: 'pistolMk2',
    label: 'Pistol Mk II',
    description: statsDiffMessage(PISTOL_WEAPON, PISTOL_MK2_WEAPON),
    requires: ['pistol'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'pistol',
    level: 2
  },
  {
    id: 'pistolMk3',
    label: 'Pistol Mk III',
    description: statsDiffMessage(PISTOL_MK2_WEAPON, PISTOL_MK3_WEAPON),
    requires: ['pistolMk2'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'pistol',
    level: 3
  },
  {
    id: 'pistolMk4',
    label: 'Pistol Mk IV',
    description: statsDiffMessage(PISTOL_MK3_WEAPON, PISTOL_MK4_WEAPON),
    requires: ['pistolMk3'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'pistol',
    level: 4
  },
  {
    id: 'pistolMk5',
    label: 'Pistol Mk V',
    description: statsDiffMessage(PISTOL_MK4_WEAPON, PISTOL_MK5_WEAPON),
    requires: ['pistolMk4'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'pistol',
    level: 5
  },
  {
    id: 'bomb',
    label: 'Deploy Bombs',
    description: 'Drop timed explosives dealing area damage.',
    category: 'WEAPON_NEW',
    weaponId: 'bomb',
    level: 1
  },
  {
    id: 'bombMk2',
    label: 'Bombs Mk II',
    description: statsDiffMessage(BOMB_WEAPON, BOMB_MK2_WEAPON),
    requires: ['bomb'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'bomb',
    level: 2
  },
  {
    id: 'bombMk3',
    label: 'Bombs Mk III',
    description: statsDiffMessage(BOMB_MK2_WEAPON, BOMB_MK3_WEAPON),
    requires: ['bombMk2'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'bomb',
    level: 3
  },
  {
    id: 'sword',
    label: 'Equip Sword',
    description: 'Unlock a melee sword slash in your movement direction.',
    category: 'WEAPON_NEW',
    weaponId: 'sword',
    level: 1
  },
  {
    id: 'swordMk2',
    label: 'Sword Mk II',
    description: statsDiffMessage(SWORD_WEAPON, SWORD_MK2_WEAPON),
    requires: ['sword'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'sword',
    level: 2
  },
  {
    id: 'swordMk3',
    label: 'Sword Mk III',
    description: statsDiffMessage(SWORD_MK2_WEAPON, SWORD_MK3_WEAPON),
    requires: ['swordMk2'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'sword',
    level: 3
  },
  {
    id: 'swordMk4',
    label: 'Sword Mk IV',
    description: statsDiffMessage(SWORD_MK3_WEAPON, SWORD_MK4_WEAPON),
    requires: ['swordMk3'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'sword',
    level: 4
  },
  {
    id: 'swordMk5',
    label: 'Sword Mk V',
    description: statsDiffMessage(SWORD_MK4_WEAPON, SWORD_MK5_WEAPON),
    requires: ['swordMk4'],
    category: 'WEAPON_UPGRADE',
    weaponId: 'sword',
    level: 5
  },
  {
    id: 'area1',
    label: 'Area +10%',
    description: 'Increase area of effect by 10%',
    category: 'PASSIVE_NEW',
    level: 1
  },
  {
    id: 'damage1',
    label: 'Damage +10%',
    description: 'Increase all weapon damage by 10%.',
    category: 'PASSIVE_NEW',
    level: 1
  }
]

function statsDiffMessage(before: WeaponStats, after: WeaponStats): string {
  return [
    before.damage !== after.damage && `DMG ${before.damage}→${after.damage}`,
    before.cooldown !== after.cooldown && `Cooldown ${before.cooldown}→${after.cooldown}`,
    before.area !== after.area && `Area ${before.area}→${after.area}`,
    before.pierce !== after.pierce && `Pierce ${before.pierce}→${after.pierce}`,
    before.sectorAngle !== after.sectorAngle && `Angle ${before.sectorAngle}→${after.sectorAngle}`
  ]
    .filter(Boolean)
    .reduce((acc, cur) => (cur ? `${acc} ${cur}` : acc), '') as string
}
