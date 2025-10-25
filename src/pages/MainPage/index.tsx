import {Link} from "react-router";

function MainPage() {
    return <>
        Hello!
        <ul>
            <li>
                <Link to={"/games/tic-tac-toe"}>Tic-Tac-Toe</Link>
            </li>
        </ul>
    </>
}

export default MainPage;