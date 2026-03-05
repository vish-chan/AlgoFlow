import { useState, useEffect } from "react";
import {
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    subscribeToPlaying,
    subscribe,
    getEngine,
    setSpeed,
} from "./visualizerEngine";

export default function Controls() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [cursor, setCursor] = useState(0);
    const [total, setTotal] = useState(0);
    const [speed, setSpeedState] = useState(500);

    useEffect(() => {
        const unsubscribePlaying = subscribeToPlaying(setIsPlaying);
        const unsubscribe = subscribe(() => {
            const engine = getEngine();
            setCursor(engine.getCursor());
            setTotal(engine.getLength());
        });
        return () => {
            unsubscribePlaying();
            unsubscribe();
        };
    }, []);

    const handlePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSpeed = 2100 - Number(e.target.value);
        setSpeedState(newSpeed);
        setSpeed(newSpeed);
    };

    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                padding: 10,
                background: "#1e1e1e",
                borderTop: "1px solid #333",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <button onClick={reset}>⏮</button>
            <button onClick={stepBackward}>⏪</button>
            <button onClick={handlePlayPause}>{isPlaying ? "⏸" : "▶"}</button>
            <button onClick={stepForward}>⏩</button>
            <span style={{ marginLeft: 16, color: "#aaa", fontSize: 14 }}>
                {cursor} / {total}
            </span>
            <div style={{ marginLeft: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#aaa", fontSize: 12 }}>Speed:</span>
                <input
                    type="range"
                    min="100"
                    max="2000"
                    step="100"
                    value={2100 - speed}
                    onChange={handleSpeedChange}
                    style={{ width: 100 }}
                />
                <span style={{ color: "#aaa", fontSize: 12, width: 40 }}>{speed}ms</span>
            </div>
        </div>
    );
}
