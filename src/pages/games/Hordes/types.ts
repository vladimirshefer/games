import Phaser from 'phaser'

export interface Bullet {
  sprite: Phaser.GameObjects.Arc
  vx: number
  vy: number
  radius: number
  piercesLeft: number
}

export interface HeroState {
  sprite: Phaser.GameObjects.Arc
  aura: Phaser.GameObjects.Arc
  radius: number
  auraRadius: number
  maxHp: number
  hp: number
  hasAura: boolean,
  upgrades: string[],
}

export interface SimpleMob {
  health: number
  damage: number
  speed: number
  xp: number
  size: number
}

