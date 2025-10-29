import Phaser from "phaser";
import type {CombatContext} from "../../combat.ts";
import type {Weapon} from "../../weapons.ts";
import type {Bullet, EnemySprite, SimpleMob} from "../../types.ts";

export class Pistol {
    private readonly scene: Phaser.Scene;
    private readonly context: CombatContext;
    private readonly stats: Weapon;
    private readonly damageEnemy: (enemy: EnemySprite, amount: number, mob: SimpleMob) => void;

    private bullets: Bullet[] = []
    private shootElapsed = 0

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

    update(dt: number, enemies: EnemySprite[], worldView: Phaser.Geom.Rectangle, cleanupPadding: number) {
        this.bullets = this.bullets.filter((bullet) => {
            const sprite = bullet.sprite
            if (!sprite.active) return false

            sprite.x += bullet.vx * dt
            sprite.y += bullet.vy * dt

            if (
                sprite.x < worldView.left - cleanupPadding ||
                sprite.x > worldView.right + cleanupPadding ||
                sprite.y < worldView.top - cleanupPadding ||
                sprite.y > worldView.bottom + cleanupPadding
            ) {
                sprite.destroy()
                return false
            }

            for (const enemy of enemies) {
                const mob = enemy.getData('mob') as SimpleMob | undefined
                if (!enemy.active || !mob) continue
                if (bullet.hitEnemies.has(enemy)) continue
                if (
                    Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y) <
                    mob.size / 2 + bullet.radius
                ) {
                    bullet.hitEnemies.add(enemy)
                    this.damageEnemy(enemy, this.stats.damage, mob)
                    sprite.x += bullet.vx * dt * 0.3
                    sprite.y += bullet.vy * dt * 0.3
                    bullet.piercesLeft -= 1

                    if (bullet.piercesLeft <= 0) {
                        sprite.destroy()
                        return false
                    }
                }
            }

            return true
        })

        if (this.context.hero.hp > 0) {
            this.tickAutoFire(dt)
        }
    }

    tickAutoFire(dt: number) {
        const enemies = this.context.getEnemies()
        if (!enemies.some((enemy) => enemy.active)) return
        if (!this.context.hero.weaponIds.includes('pistol')) return

        this.shootElapsed += dt
        if (this.shootElapsed < this.stats.cooldown) return

        this.shootElapsed = 0
        const nearest = this.findNearestEnemy()
        if (!nearest) return

        const {sprite} = this.context.hero
        const dx = nearest.x - sprite.x
        const dy = nearest.y - sprite.y
        const length = Math.hypot(dx, dy)
        if (!length) return

        const radius = this.stats.area
        const bulletSprite = this.scene.add.circle(sprite.x, sprite.y, radius, 0xffeb3b)
        const vx = (dx / length) * BULLET_SPEED
        const vy = (dy / length) * BULLET_SPEED

        this.bullets.push({
            sprite: bulletSprite,
            vx,
            vy,
            radius,
            piercesLeft: this.stats.pierce,
            hitEnemies: new Set<EnemySprite>(),
        })
    }

    private findNearestEnemy() {
        const {sprite} = this.context.hero
        const enemies = this.context.getEnemies()
        let nearest: EnemySprite | undefined
        let nearestDist = Number.POSITIVE_INFINITY

        for (const enemy of enemies) {
            if (!enemy.active) continue
            const dist = Phaser.Math.Distance.Between(sprite.x, sprite.y, enemy.x, enemy.y)
            if (dist < nearestDist) {
                nearest = enemy
                nearestDist = dist
            }
        }

        return nearest
    }

    reset() {
        this.bullets.forEach((bullet) => bullet.sprite.destroy())
        this.bullets = []
        this.shootElapsed = 0
    }
}

const BULLET_SPEED = 480;
