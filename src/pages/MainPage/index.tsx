import { Link } from 'react-router'
import hordesArt from '../../assets/game-art/hordes.svg'
import ticTacToeArt from '../../assets/game-art/tic-tac-toe.svg'
import towerDefenceArt from '../../assets/game-art/tower-defence.svg'

type GameCard = {
  title: string
  tagline: string
  route: string
  image: string
  imageAlt: string
}

const games: GameCard[] = [
  {
    title: 'Tic-Tac-Toe',
    tagline: 'Classic grid duel, stay sharp and claim three in a row.',
    route: '/games/tic-tac-toe',
    image: ticTacToeArt,
    imageAlt: 'Stylised tic-tac-toe board with X and O pieces'
  },
  {
    title: 'Hordes',
    tagline: 'Command the village and beat back waves of mischievous foes.',
    route: '/games/hordes',
    image: hordesArt,
    imageAlt: 'Hero facing down a crowd of glowing monsters'
  },
  {
    title: 'Tower Defence',
    tagline: 'Build smart towers and funnel monsters through your kill zone.',
    route: '/games/tower-defence',
    image: towerDefenceArt,
    imageAlt: 'Laser turret guarding a winding path'
  }
]

function MainPage() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 text-slate-100 md:px-10 lg:py-20">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Pick a game and jump straight into the action
          </h1>
          <p className="mt-4 text-lg text-slate-300 sm:text-xl">
            Each game has a quick snapshot so you know exactly what experience you are choosing.
          </p>
        </header>

        <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.title}
              to={game.route}
              className="group flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 transition duration-200 hover:-translate-y-1 hover:border-slate-400/60 hover:text-white hover:shadow-2xl"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900">
                <img
                  src={game.image}
                  alt={game.imageAlt}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10" />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-6 p-6">
                <div>
                  <h2 className="text-2xl font-semibold sm:text-3xl">{game.title}</h2>
                  <p className="mt-3 text-sm text-slate-300 sm:text-base">{game.tagline}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition-colors group-hover:text-emerald-300">
                  Start playing
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  )
}

export default MainPage
