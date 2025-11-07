import Phaser, { type Scene } from 'phaser'

export class GameOverHud {
  private gameObjects: Phaser.GameObjects.GameObject[] = []

  private readonly scene: Scene

  constructor(scene: Scene) {
    this.scene = scene
  }

  show(result: 'killed' | 'complete', wave: number, kills: number) {
    const title = result === 'killed' ? 'Game Over' : 'Complete'
    const titleColor = result === 'killed' ? '#ff5252' : '#69f0ae'
    const { width, height } = this.scene.scale

    this.clear()

    this.gameObjects.push(
      this.scene.add
        .text(width / 2, height / 2 - 48, title, {
          color: titleColor,
          fontFamily: 'monospace',
          fontSize: '36px',
          backgroundColor: '#1a1a25ee',
          padding: { x: 18, y: 10 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(6)
    )

    this.gameObjects.push(
      this.scene.add
        .text(width / 2, height / 2 + 4, `Wave ${wave} | Kills ${kills}`, {
          color: '#f5f5f5',
          fontFamily: 'monospace',
          fontSize: '20px',
          backgroundColor: '#1a1a25cc',
          padding: { x: 14, y: 6 }
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(6)
    )
  }

  clear() {
    this.gameObjects.forEach((it) => it.destroy())
    this.gameObjects = []
  }
}
