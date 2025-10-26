
export interface Weapon {
    damage: number
    cooldown: number
    area: number
    pierce?: number
}

export const PISTOL_WEAPON: Weapon = { damage: 30, cooldown: 0.3, pierce: 2, area: 6 }
export const PISTOL_MK2_WEAPON: Weapon = { damage: 50, cooldown: 0.3, pierce: 5, area: 8 }
export const AURA_WEAPON: Weapon = { damage: 5, cooldown: 0.5, pierce: 1, area: 50 }
