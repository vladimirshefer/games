import {AURA_RADIUS} from "./hero.ts";

export interface Weapon {
    damage: number
    cooldown: number
    area: number
    pierce: number
}

export const PISTOL_WEAPON: Weapon = { damage: 30, cooldown: 0.3, pierce: 2, area: 6 }
export const PISTOL_MK2_WEAPON: Weapon = { damage: 50, cooldown: 0.28, pierce: 4, area: 8 }
export const PISTOL_MK3_WEAPON: Weapon = { damage: 70, cooldown: 0.26, pierce: 5, area: 9 }
export const PISTOL_MK4_WEAPON: Weapon = { damage: 95, cooldown: 0.24, pierce: 6, area: 10 }
export const PISTOL_MK5_WEAPON: Weapon = { damage: 120, cooldown: 0.22, pierce: 7, area: 12 }

export const AURA_WEAPON: Weapon = { damage: 5, cooldown: 0.5, pierce: 1, area: AURA_RADIUS }
export const AURA_MK2_WEAPON: Weapon = { damage: 10, cooldown: 0.45, pierce: 1, area: AURA_RADIUS + 10 }
export const AURA_MK3_WEAPON: Weapon = { damage: 20, cooldown: 0.42, pierce: 2, area: AURA_RADIUS + 20 }
export const AURA_MK4_WEAPON: Weapon = { damage: 40, cooldown: 0.38, pierce: 2, area: AURA_RADIUS + 30 }
export const AURA_MK5_WEAPON: Weapon = { damage: 80, cooldown: 0.35, pierce: 3, area: AURA_RADIUS + 40 }

export interface UpgradeOption {
    id: string
    label: string
    description: string
    requires?: string[]
}

export const upgrades: UpgradeOption[] = [
    {
        id: 'aura',
        label: 'Unlock Aura',
        description: 'Activate a damaging circle around you.',
    },
    {
        id: 'auraMk2',
        label: 'Aura Mk II',
        description: 'Aura deals more damage and ticks faster.',
        requires: ['aura'],
    },
    {
        id: 'auraMk3',
        label: 'Aura Mk III',
        description: 'Further improve aura damage and size.',
        requires: ['auraMk2'],
    },
    {
        id: 'auraMk4',
        label: 'Aura Mk IV',
        description: 'Aura grows stronger and covers more ground.',
        requires: ['auraMk3'],
    },
    {
        id: 'auraMk5',
        label: 'Aura Mk V',
        description: 'Maximum aura damage and reach.',
        requires: ['auraMk4'],
    },
    {
        id: 'pistolMk2',
        label: 'Pistol Mk II',
        description: 'Increase bullet damage and pierce.',
        requires: ['pistolMk1'],
    },
    {
        id: 'pistolMk3',
        label: 'Pistol Mk III',
        description: 'Boost pistol power with extra pierce.',
        requires: ['pistolMk2'],
    },
    {
        id: 'pistolMk4',
        label: 'Pistol Mk IV',
        description: 'Fires faster with heavier rounds.',
        requires: ['pistolMk3'],
    },
    {
        id: 'pistolMk5',
        label: 'Pistol Mk V',
        description: 'Ultimate pistol damage and pierce.',
        requires: ['pistolMk4'],
    },
    {
        id: 'area1',
        label: "Area +10%",
        description: 'Increase area of effect by 10%',
    }
]
