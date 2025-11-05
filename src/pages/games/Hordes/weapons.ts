import { AURA_RADIUS } from './hero.ts'
import { HERO_BASE_DAMAGE } from './game/constants.ts'

export interface WeaponStats {
  damage: number
  cooldown: number
  area: number
  pierce: number
  sectorAngle: number
}

function w(stats: Partial<WeaponStats>): WeaponStats {
  return {
    damage: Math.ceil(stats.damage ?? HERO_BASE_DAMAGE),
    cooldown: stats.cooldown ?? 2,
    area: Math.ceil(stats.area ?? 0),
    pierce: Math.ceil(stats.pierce ?? 0),
    sectorAngle: Math.ceil(stats.sectorAngle ?? 120)
  }
}

export const PISTOL_WEAPON: WeaponStats = w({
  damage: HERO_BASE_DAMAGE,
  cooldown: 0.5,
  pierce: 1,
  area: 6
})
const pistolUpgrade = (weapon: WeaponStats) =>
  w({ ...weapon, damage: weapon.damage * 1.1, cooldown: weapon.cooldown * 0.9, pierce: weapon.pierce + 1 })
export const PISTOL_MK2_WEAPON: WeaponStats = pistolUpgrade(PISTOL_WEAPON)
export const PISTOL_MK3_WEAPON: WeaponStats = pistolUpgrade(PISTOL_MK2_WEAPON)
export const PISTOL_MK4_WEAPON: WeaponStats = pistolUpgrade(PISTOL_MK3_WEAPON)
export const PISTOL_MK5_WEAPON: WeaponStats = pistolUpgrade(PISTOL_MK4_WEAPON)

export const AURA_WEAPON: WeaponStats = w({
  damage: HERO_BASE_DAMAGE,
  cooldown: 1.0,
  area: AURA_RADIUS
})
const auraUpgrade = (weapon: WeaponStats) =>
  w({ ...weapon, damage: weapon.damage * 1.1, cooldown: weapon.cooldown * 0.9, area: weapon.area * 1.2 })
export const AURA_MK2_WEAPON: WeaponStats = auraUpgrade(AURA_WEAPON)
export const AURA_MK3_WEAPON: WeaponStats = auraUpgrade(AURA_MK2_WEAPON)
export const AURA_MK4_WEAPON: WeaponStats = auraUpgrade(AURA_MK3_WEAPON)
export const AURA_MK5_WEAPON: WeaponStats = auraUpgrade(AURA_MK4_WEAPON)

export const BOMB_WEAPON: WeaponStats = w({ cooldown: 5, damage: HERO_BASE_DAMAGE * 4, area: 100 })
const bombUpgrade = (weapon: WeaponStats) =>
  w({ ...weapon, damage: weapon.damage * 1.3, cooldown: weapon.cooldown * 0.7, area: weapon.area + 50 })
export const BOMB_MK2_WEAPON: WeaponStats = bombUpgrade(BOMB_WEAPON)
export const BOMB_MK3_WEAPON: WeaponStats = bombUpgrade(BOMB_MK2_WEAPON)

export const SWORD_WEAPON: WeaponStats = w({ cooldown: 2, damage: HERO_BASE_DAMAGE * 2.0, area: 50, sectorAngle: 120 })
const swordUpgrade = (weapon: WeaponStats) =>
  w({
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
}

export const upgrades: UpgradeOption[] = [
  {
    id: 'aura',
    label: 'Unlock Aura',
    description: 'Activate a damaging circle around you.',
    category: 'WEAPON_NEW'
  },
  {
    id: 'auraMk2',
    label: 'Aura Mk II',
    description: 'Aura deals more damage and ticks faster.',
    requires: ['aura'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'auraMk3',
    label: 'Aura Mk III',
    description: 'Further improve aura damage and size.',
    requires: ['auraMk2'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'auraMk4',
    label: 'Aura Mk IV',
    description: 'Aura grows stronger and covers more ground.',
    requires: ['auraMk3'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'auraMk5',
    label: 'Aura Mk V',
    description: 'Maximum aura damage and reach.',
    requires: ['auraMk4'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'pistol',
    label: 'Equip Pistol',
    description: 'Basic ranged damage with moderate fire rate.',
    category: 'WEAPON_NEW'
  },
  {
    id: 'pistolMk2',
    label: 'Pistol Mk II',
    description: 'Increase bullet damage and pierce.',
    requires: ['pistol'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'pistolMk3',
    label: 'Pistol Mk III',
    description: 'Boost pistol power with extra pierce.',
    requires: ['pistolMk2'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'pistolMk4',
    label: 'Pistol Mk IV',
    description: 'Fires faster with heavier rounds.',
    requires: ['pistolMk3'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'pistolMk5',
    label: 'Pistol Mk V',
    description: 'Ultimate pistol damage and pierce.',
    requires: ['pistolMk4'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'bomb',
    label: 'Deploy Bombs',
    description: 'Drop timed explosives dealing area damage.',
    category: 'WEAPON_NEW'
  },
  {
    id: 'bombMk2',
    label: 'Bombs Mk II',
    description: 'Bombs spawn faster with bigger blasts.',
    requires: ['bomb'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'bombMk3',
    label: 'Bombs Mk III',
    description: 'Maximum bomb power and frequency.',
    requires: ['bombMk2'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'sword',
    label: 'Equip Sword',
    description: 'Unlock a melee sword slash in your movement direction.',
    category: 'WEAPON_NEW'
  },
  {
    id: 'swordMk2',
    label: 'Sword Mk II',
    description: 'Sword swings faster and further.',
    requires: ['sword'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'swordMk3',
    label: 'Sword Mk III',
    description: 'More sword damage with a wider arc.',
    requires: ['swordMk2'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'swordMk4',
    label: 'Sword Mk IV',
    description: 'Sword reaches farther and swings quicker.',
    requires: ['swordMk3'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'swordMk5',
    label: 'Sword Mk V',
    description: 'Maximum sword damage, arc, and speed.',
    requires: ['swordMk4'],
    category: 'WEAPON_UPGRADE'
  },
  {
    id: 'area1',
    label: 'Area +10%',
    description: 'Increase area of effect by 10%',
    category: 'PASSIVE_NEW'
  },
  {
    id: 'damage1',
    label: 'Damage +10%',
    description: 'Increase all weapon damage by 10%.',
    category: 'PASSIVE_NEW'
  }
]
