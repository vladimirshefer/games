import { Link } from 'react-router'

function MainPage() {
  return (
    <>
      Hello!
      <ul>
        <li>
          <Link to={'/games/tic-tac-toe'}>Tic-Tac-Toe</Link>
        </li>
        <li>
          <Link to={'/games/hordes'}>Hordes</Link>
        </li>
        <li>
          <Link to={'/games/tower-defence'}>Tower Defence</Link>
        </li>
      </ul>
    </>
  )
}

export default MainPage
