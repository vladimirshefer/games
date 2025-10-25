import {HashRouter, Route, Routes} from 'react-router';
import './App.css'
import TicTacToe from "./pages/games/TicTacToe";
import MainPage from "./pages/MainPage";

function App() {
  return (
    <>
        <HashRouter>
            <Routes>
                <Route path={"/"} element={<MainPage/>}/>
                <Route path={"/games/tic-tac-toe"} element={<TicTacToe/>}/>
                <Route path={"/**"} element={<>{"404 Not Found!"}</>}/>
            </Routes>
        </HashRouter>
    </>
  )
}

export default App
