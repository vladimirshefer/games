import {AURA_RADIUS} from "./hero.ts";

export interface Weapon {
    damage: number
    cooldown: number
    area: number
    pierce: number
}

export const PISTOL_WEAPON: Weapon = { damage: 30, cooldown: 0.3, pierce: 2, area: 6 }
export const PISTOL_MK2_WEAPON: Weapon = { damage: 50, cooldown: 0.3, pierce: 5, area: 8 }
export const AURA_WEAPON: Weapon = { damage: 5, cooldown: 0.5, pierce: 1, area: AURA_RADIUS }

export interface UpgradeOption {
    id: string
    label: string
    description: string
}

export const upgrades: UpgradeOption[] = [
    {
        id: 'aura',
        label: 'Unlock Aura',
        description: 'Activate a damaging circle around you.',
    },
    {
        id: 'pistolMk2',
        label: 'Pistol Mk II',
        description: 'Increase bullet damage and pierce.',
    },
    {
        id: 'area1',
        label: "Area +10%",
        description: 'Increase area of effect by 10%',
    }
]
