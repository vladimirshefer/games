import type {EnemySprite, SimpleMob} from "../../types.ts";
import Phaser from "phaser";
import type {CombatContext} from "../../combat.ts";
import type {SwordWeaponStats} from "../../weapons.ts";
import type {Weapon} from "./weapon.ts";

export class Sword implements Weapon {
    swordElapsed = 0
    private activeSwordSwing: ActiveSwordSwing | null = null
    private scene: Phaser.Scene;
    private context: CombatContext;
    private damageEnemy: (enemy: EnemySprite, amount: number, mob: SimpleMob) => void;
    private stats: SwordWeaponStats;

    constructor(
        scene: Phaser.Scene,
        context: CombatContext,
        stats: SwordWeaponStats,
        damageEnemy: (enemy: EnemySprite, amount: number, mob: SimpleMob) => void
    ) {
        this.scene = scene
        this.context = context
        this.stats = stats
        this.damageEnemy = damageEnemy
    }

    update(_dt: number, enemies: EnemySprite[], _worldView: Phaser.Geom.Rectangle): void {
        if (this.activeSwordSwing) {
            this.updateActiveSwordSwing(_dt, enemies)
        }

        const hero = this.context.hero
        if (hero.hp <= 0) return
        if (!hero.weaponIds.includes('sword')) return

        this.swordElapsed += _dt
        if (this.activeSwordSwing) return
        if (this.swordElapsed < this.stats.cooldown) return

        const direction = hero.direction
        if (!direction || direction.lengthSq() < 0.0001) return

        this.swordElapsed = 0
        const origin = hero.sprite
        const normalized = direction.clone().normalize()
        const swingAngleDeg = Phaser.Math.RadToDeg(Math.atan2(normalized.y, normalized.x))
        const halfArc = this.stats.sectorAngle / 2

        const gfx = this.scene.add.graphics({x: origin.x, y: origin.y})
        const followHero = () => {
            gfx.setPosition(origin.x, origin.y)
        }
        let cleaned = false
        const cleanup = () => {
            if (cleaned) return
            cleaned = true
            this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, followHero)
            this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, cleanup)
            gfx.destroy()
            if (this.activeSwordSwing && this.activeSwordSwing.gfx === gfx) {
                this.activeSwordSwing = null
            }
        }

        followHero()
        // Keep the slash effect aligned with the hero for the duration of the tween.
        this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, followHero)
        this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup)
        gfx.setDepth(-0.3)
        gfx.fillStyle(0xffd54f, 0.35)
        gfx.beginPath()
        gfx.slice(
            0,
            0,
            this.stats.area,
            Phaser.Math.DegToRad(swingAngleDeg - halfArc),
            Phaser.Math.DegToRad(swingAngleDeg + halfArc),
            false,
        )
        gfx.fillPath()
        this.scene.tweens.add({
            targets: gfx,
            alpha: 0,
            scale: 1.05,
            duration: 500,
            onComplete: cleanup,
        })

        this.activeSwordSwing = {
            gfx,
            angleDeg: swingAngleDeg,
            halfArc,
            radius: this.stats.area,
            damage: this.stats.damage,
            remaining: 0.5,
            hitEnemies: new Set(),
            cleanup,
        }
        this.updateActiveSwordSwing(0, enemies)
    }

    reset() {
        this.swordElapsed = 0
        if (this.activeSwordSwing) {
            this.activeSwordSwing.cleanup()
            this.activeSwordSwing = null
        }
    }

    private updateActiveSwordSwing(dt: number, enemies: EnemySprite[]) {
        const swing = this.activeSwordSwing
        if (!swing) return

        swing.remaining -= dt
        if (swing.remaining <= 0) {
            swing.cleanup()
            this.activeSwordSwing = null
            return
        }

        const hero = this.context.hero
        const origin = hero.sprite

        for (const enemy of enemies) {
            if (swing.hitEnemies.has(enemy)) continue

            const mob = enemy.getData('mob') as SimpleMob | undefined
            if (!enemy.active || !mob) continue

            const dx = enemy.x - origin.x
            const dy = enemy.y - origin.y
            const distance = Math.hypot(dx, dy)
            if (distance > swing.radius + mob.size / 2) continue

            const enemyAngle = Phaser.Math.RadToDeg(Math.atan2(dy, dx))
            const diff = Phaser.Math.Angle.ShortestBetween(swing.angleDeg, enemyAngle)
            if (Math.abs(diff) > swing.halfArc) continue

            swing.hitEnemies.add(enemy)
            this.damageEnemy(enemy, swing.damage, mob)
        }
    }
}

type ActiveSwordSwing = {
    gfx: Phaser.GameObjects.Graphics
    angleDeg: number
    halfArc: number
    radius: number
    damage: number
    remaining: number
    hitEnemies: Set<EnemySprite>
    cleanup: () => void
}