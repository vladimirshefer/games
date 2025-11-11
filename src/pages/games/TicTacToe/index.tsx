import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router'

type CellValue = 'X' | 'O' | null
type GameStatus = 'playing' | 'draw' | 'won'

interface GameState {
  board: CellValue[]
  isXNext: boolean
  status: GameStatus
}

const TicTacToe = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array<CellValue>(9).fill(null),
    isXNext: true,
    status: 'playing'
  })

  const checkWinner = useCallback((board: CellValue[]): CellValue => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8], // rows
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8], // columns
      [0, 4, 8],
      [2, 4, 6] // diagonals
    ]

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a]
      }
    }
    return null
  }, [])

  const getBestMove = useCallback(
    (board: CellValue[]): number | null => {
      const available = board
        .map((cell, index) => (cell === null ? index : null))
        .filter((index): index is number => index !== null)

      const tryCompleteLine = (player: CellValue) => {
        for (const index of available) {
          const testBoard = [...board]
          testBoard[index] = player
          if (checkWinner(testBoard) === player) {
            return index
          }
        }
        return null
      }

      const winningMove = tryCompleteLine('O')
      if (winningMove !== null) return winningMove

      const blockMove = tryCompleteLine('X')
      if (blockMove !== null) return blockMove

      const preferredOrder = [4, 0, 2, 6, 8, 1, 3, 5, 7]
      for (const index of preferredOrder) {
        if (available.includes(index)) return index
      }

      return available.length ? available[0] : null
    },
    [checkWinner]
  )

  const handleClick = (index: number) => {
    setGameState((prev) => {
      if (prev.board[index] || prev.status !== 'playing' || !prev.isXNext) return prev

      const newBoard = [...prev.board]
      newBoard[index] = 'X'

      const winner = checkWinner(newBoard)
      const isDraw = !winner && newBoard.every((cell) => cell !== null)

      return {
        board: newBoard,
        isXNext: !prev.isXNext,
        status: winner ? 'won' : isDraw ? 'draw' : 'playing'
      }
    })
  }

  useEffect(() => {
    if (gameState.isXNext || gameState.status !== 'playing') return

    const move = getBestMove(gameState.board)
    if (move === null) return

    setGameState((prev) => {
      if (prev.isXNext || prev.status !== 'playing' || prev.board[move] !== null) return prev

      const newBoard = [...prev.board]
      newBoard[move] = 'O'

      const winner = checkWinner(newBoard)
      const isDraw = !winner && newBoard.every((cell) => cell !== null)

      return {
        board: newBoard,
        isXNext: !prev.isXNext,
        status: winner ? 'won' : isDraw ? 'draw' : 'playing'
      }
    })
  }, [gameState, getBestMove, checkWinner])

  const resetGame = () => {
    setGameState({
      board: Array<CellValue>(9).fill(null),
      isXNext: true,
      status: 'playing'
    })
  }

  const getStatusMessage = () => {
    if (gameState.status === 'won') {
      return `Winner: ${!gameState.isXNext ? 'X' : 'O'}`
    }
    if (gameState.status === 'draw') {
      return 'Game Draw!'
    }
    return `Next player: ${gameState.isXNext ? 'X' : 'O'}`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-2xl shadow-black/40 flex flex-col items-center gap-6">
        <div className="text-2xl font-semibold text-teal-300">{getStatusMessage()}</div>
        <div className="grid grid-cols-3 gap-3">
          {gameState.board.map((value, index) => (
            <button
              key={index}
              className="w-24 h-24 bg-gray-800 border border-gray-700 text-4xl font-bold flex items-center justify-center rounded-lg text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 transition-colors disabled:opacity-50"
              onClick={() => handleClick(index)}
              disabled={value !== null || gameState.status !== 'playing' || !gameState.isXNext}
            >
              {value}
            </button>
          ))}
        </div>
        <button
          className="w-full px-4 py-2 bg-teal-500 text-gray-900 font-semibold rounded-lg hover:bg-teal-400 transition-colors disabled:opacity-70"
          onClick={resetGame}
        >
          Reset Game
        </button>
        <Link className="text-sm text-teal-300 hover:text-teal-200 transition-colors" to={'/'}>
          Back
        </Link>
      </div>
    </div>
  )
}

export default TicTacToe
