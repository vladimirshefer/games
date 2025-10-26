import {useEffect, useRef} from 'react'
import Phaser from 'phaser'
import {HordesScene} from './scene'
import {Link} from "react-router";

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

    useEffect(() => {
        const parent = containerRef.current
        if (!parent) return undefined

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
            observer.disconnect()
            game.destroy(true)
        }
    }, [])

    return (
        <div
            style={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
            }}
        >
            <Link
                to={"/"}
                style={{
                    position: 'absolute',
                    top: '16px',
                    left: '16px',
                    zIndex: 10,
                    color: '#fff',
                    textDecoration: 'none',
                    background: '#30304888',
                    padding: '8px 12px',
                    borderRadius: '4px',
                }}
            >
                Exit
            </Link>
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                }}
            />
        </div>
    )
}

export default HordesPage
