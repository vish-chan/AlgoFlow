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
    const [speed, setSpeedState] = useState(() => {
        try { const v = localStorage.getItem('algoflow-speed'); return v ? Number(v) : 500; } catch { return 500; }
    });

    const done = !isPlaying && total > 0 && cursor >= total;
    const speedMultiplier = (500 / speed).toFixed(1) + '×';

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

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;
            if (e.key === ' ') { e.preventDefault(); handlePlayPause(); }
            else if (e.key === 'ArrowRight') { e.preventDefault(); stepForward(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); stepBackward(); }
            else if (e.key === 'Home') { e.preventDefault(); reset(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isPlaying]);

    const handlePlayPause = () => {
        if (isPlaying) pause();
        else play();
    };

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newSpeed = 2100 - Number(e.target.value);
        setSpeedState(newSpeed);
        setSpeed(newSpeed);
    };

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        pause();
        getEngine().setCursor(Number(e.target.value));
    };

    const trackColor = done ? '#888' : '#4CAF50';

    return (
        <div data-tour="controls" style={{ background: "#1a1a1a", borderTop: "1px solid #333", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
            <style>{`
                .ctrl-btn { background: none; color: #999; border: none; padding: 4px 6px; cursor: pointer; font-size: 14px; transition: color 0.15s; display: flex; align-items: center; }
                .ctrl-btn:hover { color: #fff; }
                .ctrl-btn:active { color: #4CAF50; }
                .ctrl-btn svg { width: 16px; height: 16px; fill: currentColor; }
                .ctrl-btn.play-btn svg { width: 20px; height: 20px; }
                .progress-track { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; margin: 0; }
                .progress-track::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--track-color, #4CAF50) 0%, var(--track-color, #4CAF50) var(--pct), #333 var(--pct), #333 100%); }
                .progress-track::-moz-range-track { height: 4px; border-radius: 2px; background: #333; }
                .progress-track::-moz-range-progress { height: 4px; border-radius: 2px; background: #4CAF50; }
                .progress-track::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid #4CAF50; margin-top: -4px; cursor: pointer; transition: transform 0.1s; }
                .progress-track::-webkit-slider-thumb:hover { transform: scale(1.3); }
                .progress-track::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid #4CAF50; cursor: pointer; }
            `}</style>
            {total > 0 && (
                <input
                    className="progress-track"
                    type="range"
                    min={0}
                    max={total}
                    value={cursor}
                    onChange={handleScrub}
                    style={{ '--pct': `${total > 0 ? (cursor / total) * 100 : 0}%`, '--track-color': trackColor } as React.CSSProperties}
                />
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button className="ctrl-btn" onClick={reset} title="Reset (Home)">
                        <svg viewBox="0 0 24 24"><rect x="4" y="5" width="3" height="14" rx="1"/><polygon points="20,5 20,19 9,12"/></svg>
                    </button>
                    <button className="ctrl-btn" onClick={stepBackward} title="Step back (←)">
                        <svg viewBox="0 0 24 24"><rect x="5" y="6" width="2.5" height="12" rx="1"/><polygon points="19,6 19,18 8,12"/></svg>
                    </button>
                    <button className="ctrl-btn play-btn" onClick={handlePlayPause} title="Play/Pause (Space)">
                        {isPlaying
                            ? <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
                            : <svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>
                        }
                    </button>
                    <button className="ctrl-btn" onClick={stepForward} title="Step forward (→)">
                        <svg viewBox="0 0 24 24"><polygon points="5,6 16,12 5,18"/><rect x="16.5" y="6" width="2.5" height="12" rx="1"/></svg>
                    </button>
                </div>
                <span style={{ color: done ? '#888' : '#666', fontSize: 12, fontFamily: "monospace" }}>
                    {cursor}<span style={{ color: '#444' }}>/</span>{total}{done ? ' ✓' : ''}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, color: '#888', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{speedMultiplier}</span>
                    <input
                        className="progress-track"
                        type="range"
                        min="100"
                        max="2000"
                        step="100"
                        value={2100 - speed}
                        onChange={handleSpeedChange}
                        title={`Playback speed: ${speedMultiplier} (${speed}ms delay)`}
                        style={{ width: 70, '--pct': `${((2100 - speed) - 100) / 1900 * 100}%` } as React.CSSProperties}
                    />
                </div>
            </div>
        </div>
    );
}
