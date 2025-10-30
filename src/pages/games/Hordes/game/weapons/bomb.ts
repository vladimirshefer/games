import type {Weapon} from "../../weapons.ts";
import {BOMB_FRAME_INDEX, ENEMY_SPRITESHEET_KEY} from "../../sprite.ts";
import {PICKUP_DEFAULT_SIZE} from "../constants.ts";
import Phaser from "phaser";
import type {EnemySprite, SimpleMob} from "../../types.ts";
import type {CombatContext} from "../../combat.ts";

export class Bomb {

    private bombElapsed = 0

    private bombs: {
        sprite: Phaser.GameObjects.Image
        detonateAt: number
        weapon: Weapon
    }[] = []
    private scene: Phaser.Scene;
    private context: CombatContext;
    private readonly stats: Weapon;
    private readonly damageEnemy: (enemy: EnemySprite, amount: number, mob: SimpleMob) => void;

    constructor(
        scene: Phaser.Scene,
        context: CombatContext,
        stats: Weapon,
        damageEnemy: (enemy: EnemySprite, amount: number, mob: SimpleMob) => void
    ) {
        this.scene = scene
        this.context = context
        this.stats = stats
        this.damageEnemy = damageEnemy
    }

    update(dt: number, enemies: EnemySprite[]) {
        this.bombElapsed += dt
        while (this.bombElapsed >= this.stats.cooldown) {
            this.bombElapsed -= this.stats.cooldown
            this.spawnBomb(this.stats)
        }

        const now = this.scene.time.now
        this.bombs = this.bombs.filter((bomb) => {
            if (!bomb.sprite.active) {
                bomb.sprite.destroy()
                return false
            }

            const {detonateAt} = bomb
            const timeRemaining = detonateAt - now
            const fuseMs = BOMB_FUSE_DELAY
            if (timeRemaining <= 0) {
                this.detonateBomb(bomb, enemies)
                return false
            }

            const progress = 1 - timeRemaining / fuseMs
            bomb.sprite.setAlpha(0.6 + Math.sin(progress * Math.PI * 4) * 0.2)
            return true
        })
    }


    private spawnBomb(weapon: Weapon) {
        const {sprite} = this.context.hero
        const bombSprite = this.scene.add.image(sprite.x, sprite.y, ENEMY_SPRITESHEET_KEY, BOMB_FRAME_INDEX)
        bombSprite.setDepth(-0.5)
        bombSprite.setDisplaySize(PICKUP_DEFAULT_SIZE, PICKUP_DEFAULT_SIZE)
        bombSprite.setTint(0xff7043)
        bombSprite.setAlpha(0.9)
        const detonateAt = this.scene.time.now + BOMB_FUSE_DELAY;
        this.bombs.push({
            sprite: bombSprite,
            detonateAt,
            weapon,
        })
    }

    private detonateBomb(
        bomb: { sprite: Phaser.GameObjects.Image; weapon: Weapon },
        enemies: EnemySprite[],
    ) {
        const {sprite, weapon} = bomb
        const explosion = this.scene.add.circle(sprite.x, sprite.y, weapon.area, 0xffab40, 0.35)
        explosion.setDepth(-0.4)
        this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            scale: 1.4,
            duration: 320,
            onComplete: () => explosion.destroy(),
        })

        const radius = weapon.area
        const damage = weapon.damage
        for (const enemy of enemies) {
            const mob = enemy.getData('mob') as SimpleMob | undefined
            if (!enemy.active || !mob) continue

            const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y)
            if (dist <= radius + mob.size / 2) {
                this.damageEnemy(enemy, damage, mob)
            }
        }

        sprite.destroy()
    }

    reset() {
        this.bombElapsed = 0
        this.bombs.forEach((bomb) => bomb.sprite.destroy())
        this.bombs = []
    }

}

const BOMB_FUSE_DELAY = 2000;