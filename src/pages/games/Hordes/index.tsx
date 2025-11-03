import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import Phaser from 'phaser'
import { HordesScene } from './scene'

const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#101014',
  scene: HordesScene,
  fps: {
    target: 60
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
}

interface ExitStats {
  kills: number
  waves: number
}

type HighScore = ExitStats & { timestamp: number }

const HIGH_SCORE_STORAGE_KEY = 'hordesHighScores'
const MAX_HIGH_SCORES = 5

const readHighScores = (): HighScore[] => {
  try {
    const raw = window.localStorage.getItem(HIGH_SCORE_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HighScore[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (entry) =>
          typeof entry?.kills === 'number' && typeof entry?.waves === 'number' && typeof entry?.timestamp === 'number'
      )
      .sort((a, b) => {
        if (b.kills !== a.kills) return b.kills - a.kills
        if (b.waves !== a.waves) return b.waves - a.waves
        return b.timestamp - a.timestamp
      })
      .slice(0, MAX_HIGH_SCORES)
  } catch (error) {
    console.warn('Failed to read Hordes high scores', error)
    return []
  }
}

const persistHighScores = (scores: HighScore[]) => {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(HIGH_SCORE_STORAGE_KEY, JSON.stringify(scores))
  } catch (error) {
    console.warn('Failed to save Hordes high scores', error)
  }
}

const mergeHighScores = (current: HighScore[], stats: ExitStats): HighScore[] => {
  const next: HighScore[] = [
    ...current,
    {
      ...stats,
      timestamp: Date.now()
    }
  ]
  next.sort((a, b) => {
    if (b.kills !== a.kills) return b.kills - a.kills
    if (b.waves !== a.waves) return b.waves - a.waves
    return b.timestamp - a.timestamp
  })
  return next.slice(0, MAX_HIGH_SCORES)
}

const HordesPage = () => {
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
      HordesScene.registerExitHandler(undefined)
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
      return undefined
    }

    const parent = containerRef.current
    if (!parent) return undefined

    HordesScene.registerExitHandler(handleExit)

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
      HordesScene.registerExitHandler(undefined)
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
      <div className="h-screen w-screen overflow-hidden bg-[#101014] text-gray-100">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    )
  }

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-start bg-gray-900 px-6 py-6 pb-28 text-gray-100">
        <h1 className="mb-4 text-3xl font-semibold">Hordes</h1>
        <div className="flex w-full max-w-[1100px] flex-col gap-6 lg:flex-row">
          <div className="flex-1 rounded-lg border border-[#252545] bg-[#161626] p-5">
            <h2 className="mb-3 text-xl font-semibold">High Scores</h2>
            {highScores.length === 0 ? (
              <p className="text-sm opacity-70">No runs recorded yet. Be the first!</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#2c2c45] text-left">
                    <th className="px-1 py-1">#</th>
                    <th className="px-1 py-1">Kills</th>
                    <th className="px-1 py-1">Waves</th>
                    <th className="px-1 py-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {lastStats && (
                    <tr>
                      <td className="px-1 py-1">Last</td>
                      <td className="px-1 py-1">{lastStats?.kills}</td>
                      <td className="px-1 py-1">{lastStats?.waves}</td>
                    </tr>
                  )}
                  {highScores.map((score, index) => (
                    <tr key={`${score.timestamp}-${index}`} className="border-b border-white/5">
                      <td className="px-1 py-2">{index + 1}</td>
                      <td className="px-1 py-2">{score.kills}</td>
                      <td className="px-1 py-2">{score.waves}</td>
                      <td className="px-1 py-2">{new Date(score.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md border border-slate-600
          bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-700"
        >
          Back to main page
        </Link>
      </div>
      <button
        onClick={handlePlayClick}
        className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 transform rounded-md
        bg-green-600 px-4 py-3 text-base font-semibold text-white shadow-lg transition hover:bg-green-500"
      >
        Play
      </button>
    </>
  )
}

export default HordesPage
