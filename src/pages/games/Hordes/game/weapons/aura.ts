import Phaser from "phaser";
import type {CombatContext} from "../../combat.ts";
import type {Weapon} from "../../weapons.ts";
import type {EnemySprite, SimpleMob} from "../../types.ts";

export class Aura {
    private readonly scene: Phaser.Scene;
    private readonly context: CombatContext;
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

    update(_dt: number, enemies: EnemySprite[]) {
        enemies.forEach((enemy) => {
            const mob = enemy.getData('mob') as SimpleMob | undefined
            if (!enemy.active || !mob) return false

            const dx = this.context.hero.sprite.x - enemy.x
            const dy = this.context.hero.sprite.y - enemy.y
            const dist = Math.hypot(dx, dy) || 0.001

            this.applyAuraDamage(enemy, dist, mob)
        });
    }

    applyAuraDamage(
        enemy: EnemySprite,
        distanceToHero: number,
        mob: SimpleMob,
    ) {
        if (distanceToHero > this.stats.area + mob.size / 2) return false

        const now = this.scene.time.now
        const lastTick = enemy.getData('lastAuraTick') as number | undefined
        const cooldownMs = this.stats.cooldown * 1000
        if (lastTick && now - lastTick < cooldownMs) {
            return false
        }

        enemy.setData('lastAuraTick', now)
        this.damageEnemy(enemy, this.stats.damage, mob)
        const heroSprite = this.context.hero.sprite
        const dx = enemy.x - heroSprite.x
        const dy = enemy.y - heroSprite.y
        const length = Math.hypot(dx, dy) || 1
        const knockback =
            (enemy.getData('auraKnockback') as number | undefined) ?? 40
        const nextKnockback = Math.max(knockback / 2, 5)
        enemy.setData('auraKnockback', nextKnockback)
        enemy.x += (dx / length) * knockback
        enemy.y += (dy / length) * knockback

        const hpText = enemy.getData('hpText') as Phaser.GameObjects.Text | undefined
        if (hpText && hpText.active) {
            hpText.setPosition(enemy.x, enemy.y - mob.size / 2 - 8)
        }
    }

    reset() {

    }
}