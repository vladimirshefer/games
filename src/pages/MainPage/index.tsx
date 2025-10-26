import {Link} from "react-router";

function MainPage() {
    return <>
        Hello!
        <ul>
            <li>
                <Link to={"/games/tic-tac-toe"}>Tic-Tac-Toe</Link>
                <Link to={"/games/hordes"}>Hordes</Link>
            </li>
        </ul>
    </>
}

export default MainPage;