import {lazy, Suspense} from 'react';
import {HashRouter, Route, Routes} from 'react-router';
import './App.css'
import TicTacToe from "./pages/games/TicTacToe";
import MainPage from "./pages/MainPage";

const HordesPage = lazy(() => import('./pages/games/Hordes'));

function App() {
  return (
    <>
        <HashRouter>
            <Suspense fallback={<>{"Loading..."}</>}>
                <Routes>
                    <Route path={"/"} element={<MainPage/>}/>
                    <Route path={"/games/tic-tac-toe"} element={<TicTacToe/>}/>
                    <Route path={"/games/hordes"} element={<HordesPage/>}/>
                    <Route path={"/*"} element={<>{"404 Not Found!"}</>}/>
                </Routes>
            </Suspense>
        </HashRouter>
    </>
  )
}

export default App
