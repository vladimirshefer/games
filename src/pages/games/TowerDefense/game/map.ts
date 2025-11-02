export type TileType = 'road' | 'build' | 'obstacle'

export type PathNode = { col: number; row: number }

export type GameMap = {
  cols: number
  rows: number
  tiles: TileType[][]
  path: PathNode[]
}

export class TowerDefenseMapGenerator {
  private readonly map: GameMap

  constructor() {
    const tiles: TileType[][] = [
      [
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle'
      ],
      [
        'obstacle',
        'build',
        'build',
        'build',
        'obstacle',
        'build',
        'build',
        'build',
        'obstacle',
        'build',
        'build',
        'obstacle'
      ],
      ['road', 'road', 'road', 'road', 'road', 'road', 'obstacle', 'road', 'road', 'road', 'road', 'road'],
      [
        'obstacle',
        'build',
        'build',
        'obstacle',
        'build',
        'road',
        'road',
        'road',
        'obstacle',
        'build',
        'build',
        'obstacle'
      ],
      [
        'obstacle',
        'build',
        'build',
        'obstacle',
        'build',
        'obstacle',
        'obstacle',
        'build',
        'obstacle',
        'build',
        'build',
        'obstacle'
      ],
      [
        'obstacle',
        'build',
        'build',
        'obstacle',
        'build',
        'build',
        'build',
        'build',
        'obstacle',
        'build',
        'build',
        'obstacle'
      ],
      [
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'build',
        'build',
        'build',
        'obstacle',
        'build',
        'build',
        'obstacle'
      ],
      [
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle',
        'obstacle'
      ]
    ]

    const path: PathNode[] = [
      { col: 0, row: 2 },
      { col: 1, row: 2 },
      { col: 2, row: 2 },
      { col: 3, row: 2 },
      { col: 4, row: 2 },
      { col: 5, row: 2 },
      { col: 5, row: 3 },
      { col: 6, row: 3 },
      { col: 7, row: 3 },
      { col: 7, row: 2 },
      { col: 8, row: 2 },
      { col: 9, row: 2 },
      { col: 10, row: 2 },
      { col: 11, row: 2 }
    ]

    this.map = {
      cols: tiles[0]?.length ?? 0,
      rows: tiles.length,
      tiles,
      path
    }
  }

  getMap(): GameMap {
    return {
      cols: this.map.cols,
      rows: this.map.rows,
      tiles: this.map.tiles.map((row) => [...row]),
      path: this.map.path.map((node) => ({ ...node }))
    }
  }
}
