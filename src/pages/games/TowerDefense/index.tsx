import { useCallback, useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { TowerDefenseScene, type ExitStats } from './scene'

const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 640,
  backgroundColor: '#0b0f19',
  scene: TowerDefenseScene,
  fps: { target: 60 },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
}

type HighScore = ExitStats & { timestamp: number }

const STORAGE_KEY = 'towerDefenseHighScores'
const MAX_HIGH_SCORES = 5

const readHighScores = (): HighScore[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HighScore[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (score) =>
          typeof score?.waves === 'number' &&
          typeof score?.leaks === 'number' &&
          typeof score?.coinsEarned === 'number' &&
          typeof score?.timestamp === 'number'
      )
      .sort((a, b) => {
        if (b.waves !== a.waves) return b.waves - a.waves
        if (a.leaks !== b.leaks) return a.leaks - b.leaks
        return b.coinsEarned - a.coinsEarned
      })
      .slice(0, MAX_HIGH_SCORES)
  } catch (error) {
    console.warn('Failed to read tower defence high scores', error)
    return []
  }
}

const persistHighScores = (scores: HighScore[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores))
  } catch (error) {
    console.warn('Failed to store tower defence high scores', error)
  }
}

const mergeHighScores = (current: HighScore[], stats: ExitStats): HighScore[] => {
  const next = [
    ...current,
    {
      ...stats,
      timestamp: Date.now()
    }
  ]
  next.sort((a, b) => {
    if (b.waves !== a.waves) return b.waves - a.waves
    if (a.leaks !== b.leaks) return a.leaks - b.leaks
    return b.coinsEarned - a.coinsEarned
  })
  return next.slice(0, MAX_HIGH_SCORES)
}

const TowerDefensePage = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [lastStats, setLastStats] = useState<ExitStats | null>(null)
  const [highScores, setHighScores] = useState<HighScore[]>([])

  useEffect(() => {
    setHighScores(readHighScores())
  }, [])

  const handleExit = useCallback((stats: ExitStats) => {
    setLastStats(stats)
    setIsPlaying(false)
    setHighScores((prev) => {
      const updated = mergeHighScores(prev, stats)
      persistHighScores(updated)
      return updated
    })
  }, [])

  useEffect(() => {
    if (!isPlaying) {
      TowerDefenseScene.registerExitHandler(undefined)
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
      return undefined
    }

    const parent = containerRef.current
    if (!parent) return undefined

    TowerDefenseScene.registerExitHandler(handleExit)
    const game = new Phaser.Game({
      parent,
      ...GAME_CONFIG
    })
    gameRef.current = game

    const resizeGame = () => {
      const width = parent.clientWidth
      const height = parent.clientHeight
      if (width && height) {
        game.scale.resize(width, height)
      }
    }

    resizeGame()

    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(resizeGame)
      observer.observe(parent)
    }

    return () => {
      TowerDefenseScene.registerExitHandler(undefined)
      observer?.disconnect()
      game.destroy(true)
      gameRef.current = null
    }
  }, [handleExit, isPlaying])

  const handlePlayClick = useCallback(() => {
    setLastStats(null)
    setIsPlaying(true)
  }, [])

  if (isPlaying) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-[#0b0f19] text-slate-100">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-slate-950 px-6 py-6 text-slate-100">
      <h1 className="mb-4 text-3xl font-semibold">Tower Defence</h1>
      <div className="flex w-full max-w-[1100px] flex-col gap-6 lg:flex-row">
        <div className="flex-1 rounded-lg border border-white/10 bg-slate-900/60 p-5">
          <h2 className="mb-3 text-xl font-semibold">High Scores</h2>
          {highScores.length === 0 ? (
            <p className="text-sm opacity-70">No waves cleared yet. Place some towers!</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left">
                  <th className="px-1 py-1">#</th>
                  <th className="px-1 py-1">Waves</th>
                  <th className="px-1 py-1">Leaks</th>
                  <th className="px-1 py-1">Coins</th>
                  <th className="px-1 py-1">Date</th>
                </tr>
              </thead>
              <tbody>
                {lastStats && (
                  <tr>
                    <td className="px-1 py-1">Last</td>
                    <td className="px-1 py-1">{lastStats.waves}</td>
                    <td className="px-1 py-1">{lastStats.leaks}</td>
                    <td className="px-1 py-1">{lastStats.coinsEarned}</td>
                    <td className="px-1 py-1">—</td>
                  </tr>
                )}
                {highScores.map((score, index) => (
                  <tr key={`${score.timestamp}-${index}`} className="border-b border-white/5">
                    <td className="px-1 py-2">{index + 1}</td>
                    <td className="px-1 py-2">{score.waves}</td>
                    <td className="px-1 py-2">{score.leaks}</td>
                    <td className="px-1 py-2">{score.coinsEarned}</td>
                    <td className="px-1 py-2">{new Date(score.timestamp).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button
            onClick={handlePlayClick}
            className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-base font-semibold
            text-white transition hover:bg-blue-500"
          >
            Play
          </button>
        </div>
        <div
          className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-white/10
        bg-slate-900/60 p-5 text-sm"
        >
          <h2 className="text-xl font-semibold">How to Play</h2>
          <ul className="list-disc space-y-1 pl-5 opacity-80">
            <li>Click a glowing pad to spend 25 coins on a tower.</li>
            <li>Towers auto-target creeps closest to your base.</li>
            <li>Kills drop coins; leaks damage the base.</li>
            <li>Survive as long as you can — waves keep scaling.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TowerDefensePage
