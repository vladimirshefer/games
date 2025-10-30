import {AURA_RADIUS} from "./hero.ts";
import {MOB_BASE_HP} from "./game/constants.ts";

export interface Weapon {
    damage: number
    cooldown: number
    area: number
    pierce: number
}

export interface SwordWeapon extends Weapon {
    sectorAngle: number
}

export const PISTOL_WEAPON: Weapon = {damage: MOB_BASE_HP * 0.5, cooldown: 0.3, pierce: 1, area: 6}
export const PISTOL_MK2_WEAPON: Weapon = {damage: MOB_BASE_HP * 0.8, cooldown: 0.28, pierce: 2, area: 8}
export const PISTOL_MK3_WEAPON: Weapon = {damage: MOB_BASE_HP * 1.1, cooldown: 0.26, pierce: 3, area: 9}
export const PISTOL_MK4_WEAPON: Weapon = {damage: MOB_BASE_HP * 1.3, cooldown: 0.24, pierce: 5, area: 10}
export const PISTOL_MK5_WEAPON: Weapon = {damage: MOB_BASE_HP * 2.0, cooldown: 0.22, pierce: 8, area: 12}

export const AURA_WEAPON: Weapon = { damage: MOB_BASE_HP * 0.5, cooldown: 0.5, pierce: 1, area: AURA_RADIUS }
export const AURA_MK2_WEAPON: Weapon = {damage: MOB_BASE_HP * 0.8, cooldown: 0.45, pierce: 1, area: AURA_RADIUS * 1.2}
export const AURA_MK3_WEAPON: Weapon = {damage: MOB_BASE_HP * 1.1, cooldown: 0.42, pierce: 1, area: AURA_RADIUS * 1.4}
export const AURA_MK4_WEAPON: Weapon = {damage: MOB_BASE_HP * 1.3, cooldown: 0.38, pierce: 1, area: AURA_RADIUS * 1.7}
export const AURA_MK5_WEAPON: Weapon = {damage: MOB_BASE_HP * 2.0, cooldown: 0.35, pierce: 1, area: AURA_RADIUS * 2.0}

export const BOMB_WEAPON: Weapon = {cooldown: 5, damage: MOB_BASE_HP * 2, area: 100, pierce: 0}
export const BOMB_MK2_WEAPON: Weapon = {cooldown: 3, damage: MOB_BASE_HP * 4, area: 150, pierce: 0}
export const BOMB_MK3_WEAPON: Weapon = {cooldown: 2, damage: MOB_BASE_HP * 6, area: 200, pierce: 0}

export const SWORD_WEAPON: SwordWeapon = {cooldown: 2, damage: MOB_BASE_HP * 1.2, area: 50, pierce: 0, sectorAngle: 120}
export const SWORD_MK2_WEAPON: SwordWeapon = {cooldown: 1.8, damage: MOB_BASE_HP * 1.5, area: 60, pierce: 0, sectorAngle: 130}
export const SWORD_MK3_WEAPON: SwordWeapon = {cooldown: 1.6, damage: MOB_BASE_HP * 1.7, area: 70, pierce: 0, sectorAngle: 140}
export const SWORD_MK4_WEAPON: SwordWeapon = {cooldown: 1.4, damage: MOB_BASE_HP * 2.0, area: 80, pierce: 0, sectorAngle: 150}
export const SWORD_MK5_WEAPON: SwordWeapon = {cooldown: 1.2, damage: MOB_BASE_HP * 2.5, area: 90, pierce: 0, sectorAngle: 160}

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
        id: 'pistol',
        label: 'Equip Pistol',
        description: 'Basic ranged damage with moderate fire rate.',
    },
    {
        id: 'pistolMk2',
        label: 'Pistol Mk II',
        description: 'Increase bullet damage and pierce.',
        requires: ['pistol'],
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
        id: 'sword',
        label: 'Equip Sword',
        description: 'Unlock a melee sword slash in your movement direction.',
    },
    {
        id: 'swordMk2',
        label: 'Sword Mk II',
        description: 'Sword swings faster and further.',
        requires: ['sword'],
    },
    {
        id: 'swordMk3',
        label: 'Sword Mk III',
        description: 'More sword damage with a wider arc.',
        requires: ['swordMk2'],
    },
    {
        id: 'swordMk4',
        label: 'Sword Mk IV',
        description: 'Sword reaches farther and swings quicker.',
        requires: ['swordMk3'],
    },
    {
        id: 'swordMk5',
        label: 'Sword Mk V',
        description: 'Maximum sword damage, arc, and speed.',
        requires: ['swordMk4'],
    },
    {
        id: 'area1',
        label: "Area +10%",
        description: 'Increase area of effect by 10%',
    }
]
