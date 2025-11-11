import Phaser from 'phaser'
import { ONE_BIT_PACK, ONE_BIT_PACK_KNOWN_FRAMES } from '../../Hordes/game/sprite.ts'
import type { GameMap, TileType } from './map.ts'

type Direction = 'up' | 'down' | 'left' | 'right'

interface TileAppearance {
  frame: number
  angle: number
}

const OBSTACLE_TILE_FRAME_POOL = [
  ONE_BIT_PACK_KNOWN_FRAMES.tree1,
  ONE_BIT_PACK_KNOWN_FRAMES.tree2,
  ONE_BIT_PACK_KNOWN_FRAMES.tree3,
  ONE_BIT_PACK_KNOWN_FRAMES.tree4,
  ONE_BIT_PACK_KNOWN_FRAMES.tree5,
  ONE_BIT_PACK_KNOWN_FRAMES.tree6
]

export class MapRenderer {
  private readonly scene: Phaser.Scene
  private readonly map: GameMap
  private readonly tileSpriteLookup = new Map<string, Phaser.GameObjects.Sprite>()
  private readonly pathIndexByCell = new Map<string, number>()
  private viewportPadding = { top: 0, right: 0, bottom: 0, left: 0 }
  private gridTileSize = 0
  private gridOriginX = 0
  private gridOriginY = 0

  constructor(scene: Phaser.Scene, map: GameMap) {
    this.scene = scene
    this.map = map
    this.map.path.forEach((node, index) => {
      this.pathIndexByCell.set(this.cellKey(node.col, node.row), index)
    })
  }

  setViewportPadding(padding: Partial<typeof this.viewportPadding>) {
    this.viewportPadding = {
      ...this.viewportPadding,
      ...padding
    }
  }

  render() {
    const { width, height } = this.scene.scale
    this.updateMetrics(width, height)
    if (!this.scene.textures.exists(ONE_BIT_PACK.key)) {
      return
    }
    const displaySize = this.gridTileSize * 0.98
    for (let row = 0; row < this.map.rows; row += 1) {
      for (let col = 0; col < this.map.cols; col += 1) {
        const type = this.map.tiles[row][col]
        const key = this.cellKey(col, row)
        const center = this.gridToWorldCenter(col, row)
        const appearance = this.appearanceForTile(col, row, type)
        let sprite = this.tileSpriteLookup.get(key)
        if (!sprite) {
          sprite = this.scene.add
            .sprite(center.x, center.y, ONE_BIT_PACK.key, appearance.frame)
            .setOrigin(0.5)
            .setDisplaySize(displaySize, displaySize)
          sprite.setAngle(appearance.angle)
          sprite.setTint(this.tintForTile(type))
          this.tileSpriteLookup.set(key, sprite)
        } else {
          sprite
            .setPosition(center.x, center.y)
            .setDisplaySize(displaySize, displaySize)
            .setFrame(appearance.frame)
            .setAngle(appearance.angle)
          sprite.setTint(this.tintForTile(type))
        }
      }
    }
  }

  getTileSprite(col: number, row: number) {
    return this.tileSpriteLookup.get(this.cellKey(col, row))
  }

  getTileSize() {
    return this.gridTileSize
  }

  gridToWorldCenter(col: number, row: number) {
    const x = this.gridOriginX + col * this.gridTileSize + this.gridTileSize / 2
    const y = this.gridOriginY + row * this.gridTileSize + this.gridTileSize / 2
    return new Phaser.Math.Vector2(x, y)
  }

  applyBuildSpotAppearance(sprite: Phaser.GameObjects.Sprite, occupied: boolean, frame?: number, tint?: number) {
    if (occupied) {
      const size = this.gridTileSize * 0.6
      sprite
        .setFrame(frame ?? ONE_BIT_PACK_KNOWN_FRAMES.tower1)
        .setDisplaySize(size, size)
        .setDepth(7)
        .setTint(tint ?? 0xf1f5f9)
        .setAngle(0)
      return
    }
    const size = this.gridTileSize * 0.98
    sprite
      .setFrame(ONE_BIT_PACK_KNOWN_FRAMES.empty)
      .setDisplaySize(size, size)
      .setDepth(0)
      .setTint(0x60a5fa)
      .setAngle(0)
  }

  private updateMetrics(width: number, height: number) {
    const usableWidth = Math.max(0, width - this.viewportPadding.left - this.viewportPadding.right)
    const usableHeight = Math.max(0, height - this.viewportPadding.top - this.viewportPadding.bottom)
    const tileWidth = usableWidth / this.map.cols
    const tileHeight = usableHeight / this.map.rows
    this.gridTileSize = Math.min(tileWidth, tileHeight)
    const mapWidth = this.gridTileSize * this.map.cols
    const mapHeight = this.gridTileSize * this.map.rows
    const extraWidth = Math.max(0, usableWidth - mapWidth)
    const extraHeight = Math.max(0, usableHeight - mapHeight)
    this.gridOriginX = this.viewportPadding.left + extraWidth / 2
    this.gridOriginY = this.viewportPadding.top + extraHeight / 2
  }

  private appearanceForTile(col: number, row: number, type: TileType): TileAppearance {
    if (type === 'road') {
      return this.roadAppearance(col, row)
    }
    if (type === 'obstacle') {
      return {
        frame: OBSTACLE_TILE_FRAME_POOL[Phaser.Math.Between(0, OBSTACLE_TILE_FRAME_POOL.length - 1)],
        angle: 0
      }
    }
    return {
      frame: ONE_BIT_PACK_KNOWN_FRAMES.empty,
      angle: 0
    }
  }

  private roadAppearance(col: number, row: number): TileAppearance {
    const key = this.cellKey(col, row)
    const index = this.pathIndexByCell.get(key)
    if (index === undefined) {
      return {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.roadStraight,
        angle: 0
      }
    }
    const path = this.map.path
    const current = path[index]
    const prev = index > 0 ? path[index - 1] : undefined
    const next = index < path.length - 1 ? path[index + 1] : undefined
    const connections = new Set<Direction>()
    if (prev) {
      connections.add(this.oppositeDirection(this.directionBetween(prev, current)))
    }
    if (next) {
      connections.add(this.directionBetween(current, next))
    }
    const connectsUp = connections.has('up')
    const connectsDown = connections.has('down')
    const connectsLeft = connections.has('left')
    const connectsRight = connections.has('right')

    if ((connectsUp || connectsDown) && (connectsLeft || connectsRight)) {
      return {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.roadTurn,
        angle: this.cornerAngle(connectsUp, connectsDown, connectsLeft, connectsRight)
      }
    }
    if (connectsLeft || connectsRight) {
      return {
        frame: ONE_BIT_PACK_KNOWN_FRAMES.roadStraight,
        angle: 90
      }
    }
    return {
      frame: ONE_BIT_PACK_KNOWN_FRAMES.roadStraight,
      angle: 0
    }
  }

  private cornerAngle(connectsUp: boolean, connectsDown: boolean, connectsLeft: boolean, connectsRight: boolean) {
    if (connectsDown && connectsRight) return 0
    if (connectsUp && connectsRight) return -90
    if (connectsUp && connectsLeft) return 180
    if (connectsDown && connectsLeft) return 90
    return 0
  }

  private directionBetween(from: { col: number; row: number }, to: { col: number; row: number }): Direction {
    if (to.col > from.col) return 'right'
    if (to.col < from.col) return 'left'
    if (to.row > from.row) return 'down'
    return 'up'
  }

  private oppositeDirection(direction: Direction): Direction {
    switch (direction) {
      case 'up':
        return 'down'
      case 'down':
        return 'up'
      case 'left':
        return 'right'
      case 'right':
      default:
        return 'left'
    }
  }

  private tintForTile(type: TileType) {
    if (type === 'road') return 0xccccaa
    if (type === 'build') return 0xc0d0ff
    return 0x607080
  }

  private cellKey(col: number, row: number) {
    return `${col},${row}`
  }
}
