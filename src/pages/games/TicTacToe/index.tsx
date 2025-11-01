import { useState, useCallback } from 'react'
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
    board: Array(9).fill(null),
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

  const handleClick = (index: number) => {
    if (gameState.board[index] || gameState.status !== 'playing') return

    const newBoard = [...gameState.board]
    newBoard[index] = gameState.isXNext ? 'X' : 'O'

    const winner = checkWinner(newBoard)
    const isDraw = !winner && newBoard.every((cell) => cell !== null)

    setGameState({
      board: newBoard,
      isXNext: !gameState.isXNext,
      status: winner ? 'won' : isDraw ? 'draw' : 'playing'
    })
  }

  const resetGame = () => {
    setGameState({
      board: Array(9).fill(null),
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
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="text-2xl font-bold mb-4">{getStatusMessage()}</div>
      <div className="grid grid-cols-3 gap-2">
        {gameState.board.map((value, index) => (
          <button
            key={index}
            className="w-20 h-20 bg-gray-200 text-4xl font-bold flex items-center justify-center hover:bg-gray-300"
            onClick={() => handleClick(index)}
          >
            {value}
          </button>
        ))}
      </div>
      <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={resetGame}>
        Reset Game
      </button>
      <Link to={'/'}>Back</Link>
    </div>
  )
}

export default TicTacToe
