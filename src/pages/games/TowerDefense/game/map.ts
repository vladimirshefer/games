export type TileType = 'road' | 'build' | 'obstacle'

export interface PathNode {
  col: number
  row: number
}

export interface GameMap {
  cols: number
  rows: number
  tiles: TileType[][]
  path: PathNode[]
}

const TILE_PRINT_LOOKUP: Record<TileType, string> = {
  obstacle: 'X',
  road: '#',
  build: '_'
}

export interface MapGeneratorConfig {
  height: number
  width: number
  roadLength?: number
}

interface NormalizedMapConfig {
  height: number
  width: number
  roadLength: number
}

export class TowerDefenseMapGenerator {
  private readonly map: GameMap

  constructor(config: MapGeneratorConfig = { height: 8, width: 12 }) {
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

  private normalizeConfig(config: MapGeneratorConfig): NormalizedMapConfig {
    const height = Math.max(3, Math.floor(config.height))
    const width = Math.max(3, Math.floor(config.width))
    const maxRoadLength = height * width
    const defaultRoadLength = (height + width) * 2
    const requestedLength = Math.floor(config.roadLength ?? defaultRoadLength)
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
          continue
        }
        const randomObstacleChance = 0.12
        if (Math.random() < randomObstacleChance) {
          tiles[row][col] = 'obstacle'
        }
      }
    }
  }

  private generatePath(rows: number, cols: number, roadLength: number): PathNode[] {
    const edgeCells = this.shuffle(this.collectEdgeCells(rows, cols))
    for (const start of edgeCells) {
      const path = this.buildPath(start, rows, cols, roadLength)
      if (path) {
        return path
      }
    }

    throw new Error('Failed to generate a valid path with the provided configuration.')
  }

  private buildPath(start: PathNode, rows: number, cols: number, roadLength: number): PathNode[] | undefined {
    const path: PathNode[] = [start]
    const visited = new Set<string>([this.cellKey(start.col, start.row)])
    if (roadLength === 1) {
      return this.isEdge(start, rows, cols) ? path : undefined
    }
    const success = this.extendPath(path, visited, rows, cols, roadLength)
    return success ? path : undefined
  }

  private extendPath(path: PathNode[], visited: Set<string>, rows: number, cols: number, roadLength: number): boolean {
    if (path.length === roadLength) {
      const last = path[path.length - 1]
      return this.isEdge(last, rows, cols)
    }

    const current = path[path.length - 1]
    const candidates = this.shuffle(
      this.neighbors(current, rows, cols).filter((node) => !visited.has(this.cellKey(node.col, node.row)))
    )
    const remainingSteps = roadLength - path.length

    for (const candidate of candidates) {
      const distanceToEdge = this.distanceToEdge(candidate, rows, cols)
      if (distanceToEdge > remainingSteps - 1) {
        continue
      }

      const nextRemaining = remainingSteps - 1
      const candidateIsEdge = this.isEdge(candidate, rows, cols)
      if (nextRemaining > 0 && candidateIsEdge) {
        continue
      }
      if (nextRemaining === 0 && !candidateIsEdge) {
        continue
      }

      const key = this.cellKey(candidate.col, candidate.row)
      path.push(candidate)
      visited.add(key)

      if (this.violatesSpacing(candidate, visited, rows, cols)) {
        visited.delete(key)
        path.pop()
        continue
      }

      if (this.extendPath(path, visited, rows, cols, roadLength)) {
        return true
      }

      visited.delete(key)
      path.pop()
    }

    return false
  }

  private neighbors(node: PathNode, rows: number, cols: number): PathNode[] {
    const deltas = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 }
    ]
    const neighbors: PathNode[] = []
    for (const delta of deltas) {
      const col = node.col + delta.col
      const row = node.row + delta.row
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        neighbors.push({ col, row })
      }
    }
    return neighbors
  }

  private collectEdgeCells(rows: number, cols: number): PathNode[] {
    const cells: PathNode[] = []
    for (let col = 0; col < cols; col += 1) {
      cells.push({ col, row: 0 })
    }
    for (let row = 1; row < rows; row += 1) {
      cells.push({ col: cols - 1, row })
    }
    for (let col = cols - 2; col >= 0; col -= 1) {
      if (rows > 1) {
        cells.push({ col, row: rows - 1 })
      }
    }
    for (let row = rows - 2; row > 0; row -= 1) {
      if (cols > 1) {
        cells.push({ col: 0, row })
      }
    }
    return cells
  }

  private distanceToEdge(node: PathNode, rows: number, cols: number) {
    const distanceRow = Math.min(node.row, rows - 1 - node.row)
    const distanceCol = Math.min(node.col, cols - 1 - node.col)
    return Math.min(distanceRow, distanceCol)
  }

  private isEdge(node: PathNode, rows: number, cols: number) {
    return node.row === 0 || node.row === rows - 1 || node.col === 0 || node.col === cols - 1
  }

  private violatesSpacing(candidate: PathNode, visited: Set<string>, rows: number, cols: number): boolean {
    const limit = 4
    if (this.countRoadNeighbors(candidate, visited, rows, cols) > limit) {
      return true
    }

    const neighborOffsets = [
      { col: -1, row: -1 },
      { col: 0, row: -1 },
      { col: 1, row: -1 },
      { col: -1, row: 0 },
      { col: 1, row: 0 },
      { col: -1, row: 1 },
      { col: 0, row: 1 },
      { col: 1, row: 1 }
    ]

    for (const offset of neighborOffsets) {
      const col = candidate.col + offset.col
      const row = candidate.row + offset.row
      if (col < 0 || col >= cols || row < 0 || row >= rows) {
        continue
      }
      const key = this.cellKey(col, row)
      if (!visited.has(key)) {
        continue
      }
      if (this.countRoadNeighbors({ col, row }, visited, rows, cols) > limit) {
        return true
      }
    }

    return false
  }

  private countRoadNeighbors(node: PathNode, visited: Set<string>, rows: number, cols: number) {
    let count = 0
    for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) continue
        const col = node.col + colOffset
        const row = node.row + rowOffset
        if (col < 0 || col >= cols || row < 0 || row >= rows) {
          continue
        }
        const key = this.cellKey(col, row)
        if (visited.has(key)) {
          count += 1
        }
      }
    }
    return count
  }

  private cellKey(col: number, row: number) {
    return `${col},${row}`
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = items[i]
      items[i] = items[j]
      items[j] = temp
    }
    return items
  }
}

export function printGameMap(map: GameMap) {
  const lines = map.tiles.map((row) => row.map((tile) => TILE_PRINT_LOOKUP[tile]).join(''))
  console.log('Generated Tower Defense map:')
  lines.forEach((line) => console.log(line))
}
