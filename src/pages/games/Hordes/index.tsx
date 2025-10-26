import {useEffect, useRef} from 'react'
import Phaser from 'phaser'
import {HordesScene} from './scene'
import {useNavigate} from "react-router";

const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#101014',
    scene: HordesScene,
    fps: {
        target: 60,
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
}

const HordesPage = () => {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        const parent = containerRef.current
        if (!parent) return undefined

        HordesScene.registerExitHandler(() => navigate('/'))

        const game = new Phaser.Game({
            parent,
            ...GAME_CONFIG,
        })

        const resizeGame = () => {
            const width = parent.clientWidth
            const height = parent.clientHeight
            if (width && height) {
                game.scale.resize(width, height)
            }
        }

        resizeGame()

        const observer = new ResizeObserver(resizeGame)
        observer.observe(parent)

        return () => {
            HordesScene.registerExitHandler(undefined)
            observer.disconnect()
            game.destroy(true)
        }
    }, [navigate])

    return (
        <div
            ref={containerRef}
            style={{
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
            }}
        />
    )
}

export default HordesPage
