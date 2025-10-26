import {AURA_RADIUS} from "./hero.ts";

export interface Weapon {
    damage: number
    cooldown: number
    area: number
    pierce: number
}

export const PISTOL_WEAPON: Weapon = {damage: 10, cooldown: 0.3, pierce: 1, area: 6}
export const PISTOL_MK2_WEAPON: Weapon = {damage: 20, cooldown: 0.28, pierce: 2, area: 8}
export const PISTOL_MK3_WEAPON: Weapon = {damage: 30, cooldown: 0.26, pierce: 3, area: 9}
export const PISTOL_MK4_WEAPON: Weapon = {damage: 50, cooldown: 0.24, pierce: 5, area: 10}
export const PISTOL_MK5_WEAPON: Weapon = {damage: 70, cooldown: 0.22, pierce: 8, area: 12}

export const AURA_WEAPON: Weapon = { damage: 5, cooldown: 0.5, pierce: 1, area: AURA_RADIUS }
export const AURA_MK2_WEAPON: Weapon = {damage: 10, cooldown: 0.45, pierce: 1, area: AURA_RADIUS * 1.2}
export const AURA_MK3_WEAPON: Weapon = {damage: 20, cooldown: 0.42, pierce: 1, area: AURA_RADIUS * 1.4}
export const AURA_MK4_WEAPON: Weapon = {damage: 30, cooldown: 0.38, pierce: 1, area: AURA_RADIUS * 1.7}
export const AURA_MK5_WEAPON: Weapon = {damage: 50, cooldown: 0.35, pierce: 1, area: AURA_RADIUS * 2.0}

export const BOMB_WEAPON: Weapon = {cooldown: 5, damage: 40, area: 40, pierce: 0}
export const BOMB_MK2_WEAPON: Weapon = {cooldown: 3, damage: 60, area: 60, pierce: 0}
export const BOMB_MK3_WEAPON: Weapon = {cooldown: 2, damage: 80, area: 100, pierce: 0}

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
        id: 'bomb',
        label: 'Deploy Bombs',
        description: 'Drop timed explosives dealing area damage.',
    },
    {
        id: 'bombMk2',
        label: 'Bombs Mk II',
        description: 'Bombs spawn faster with bigger blasts.',
        requires: ['bomb'],
    },
    {
        id: 'bombMk3',
        label: 'Bombs Mk III',
        description: 'Maximum bomb power and frequency.',
        requires: ['bombMk2'],
    },
    {
        id: 'area1',
        label: "Area +10%",
        description: 'Increase area of effect by 10%',
    }
]
