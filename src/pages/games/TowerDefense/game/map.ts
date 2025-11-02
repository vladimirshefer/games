export type TileType = 'road' | 'build' | 'obstacle'

export type PathNode = { col: number; row: number }

export type GameMap = {
  cols: number
  rows: number
  tiles: TileType[][]
  path: PathNode[]
}

export type MapGeneratorConfig = {
  height: number
  width: number
  roadLength: number
}

export class TowerDefenseMapGenerator {
  private readonly map: GameMap

  constructor(config: MapGeneratorConfig = { height: 8, width: 12, roadLength: 14 }) {
    const normalized = this.normalizeConfig(config)
    this.map = this.generateMap(normalized.height, normalized.width, normalized.roadLength)
  }

  getMap(): GameMap {
    return {
      cols: this.map.cols,
      rows: this.map.rows,
      tiles: this.map.tiles.map((row) => [...row]),
      path: this.map.path.map((node) => ({ ...node }))
    }
  }

  private normalizeConfig(config: MapGeneratorConfig): MapGeneratorConfig {
    const height = Math.max(3, Math.floor(config.height))
    const width = Math.max(3, Math.floor(config.width))
    const maxRoadLength = height * width
    const requestedLength = Math.floor(config.roadLength)
    const roadLength = Math.min(Math.max(2, requestedLength), maxRoadLength)
    return { height, width, roadLength }
  }

  private generateMap(height: number, width: number, roadLength: number): GameMap {
    const tiles: TileType[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => 'build'))

    this.applyObstacles(tiles)
    const path = this.generatePath(height, width, roadLength)
    path.forEach(({ col, row }) => {
      tiles[row][col] = 'road'
    })

    return {
      cols: width,
      rows: height,
      tiles,
      path
    }
  }

  private applyObstacles(tiles: TileType[][]) {
    const rows = tiles.length
    const cols = tiles[0]?.length ?? 0
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const isBorder = row === 0 || row === rows - 1 || col === 0 || col === cols - 1
        if (isBorder) {
          tiles[row][col] = 'obstacle'
        }
      }
    }
  }

  private generatePath(rows: number, cols: number, roadLength: number): PathNode[] {
    const serpentine: PathNode[] = []
    for (let row = 0; row < rows; row += 1) {
      const leftToRight = row % 2 === 0
      if (leftToRight) {
        for (let col = 0; col < cols; col += 1) {
          serpentine.push({ col, row })
        }
      } else {
        for (let col = cols - 1; col >= 0; col -= 1) {
          serpentine.push({ col, row })
        }
      }
    }

    if (roadLength > serpentine.length) {
      throw new Error('Road length exceeds available tiles for map size.')
    }

    return serpentine.slice(0, roadLength)
  }
}
