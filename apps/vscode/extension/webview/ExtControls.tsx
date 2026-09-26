import { useCallback, useEffect, useState } from 'react';
import {
    play,
    pause,
    stepForward,
    stepBackward,
    reset,
    subscribeToPlaying,
    subscribe,
    getEngine,
} from '@algoflow/visualizer';

// Fork of the web app's visualizer/Controls.tsx, minus the GIF recorder, the lesson
// annotate/share buttons, and the `.monaco-editor` keyboard guard (no Monaco here).
//
// Speed is controlled by the parent rather than held locally: it is seeded from a
// setting via the host's `init` message, which can arrive after this mounts.

interface Props {
    speed: number;
    onSpeedChange: (speedMs: number) => void;
}

export default function ExtControls({ speed, onSpeedChange }: Props) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [cursor, setCursor] = useState(0);
    const [total, setTotal] = useState(0);

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

    const handlePlayPause = useCallback(() => {
        if (isPlaying) pause();
        else play();
    }, [isPlaying]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = e.target as HTMLElement | null;
            if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return;
            if (e.key === ' ') {
                e.preventDefault();
                handlePlayPause();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                stepForward();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                stepBackward();
            } else if (e.key === 'Home') {
                e.preventDefault();
                reset();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handlePlayPause]);

    const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSpeedChange(2100 - Number(e.target.value));
    };

    const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
        pause();
        getEngine().setCursor(Number(e.target.value));
    };

    const trackColor = done ? 'var(--text-secondary)' : 'var(--accent)';

    return (
        <div
            style={{
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border-light)',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}
        >
            <style>{`
                .ctrl-btn { background: none; color: var(--text-secondary); border: none; padding: 4px 6px; cursor: pointer; font-size: 14px; transition: color 0.15s; display: flex; align-items: center; }
                .ctrl-btn:hover { color: var(--text-primary); }
                .ctrl-btn:active { color: var(--accent); }
                .ctrl-btn svg { width: 16px; height: 16px; fill: currentColor; }
                .ctrl-btn.play-btn svg { width: 20px; height: 20px; }
                .progress-track { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; border-radius: 2px; outline: none; cursor: pointer; margin: 0; }
                .progress-track::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--track-color, var(--accent)) 0%, var(--track-color, var(--accent)) var(--pct), var(--border-light) var(--pct), var(--border-light) 100%); }
                .progress-track::-moz-range-track { height: 4px; border-radius: 2px; background: var(--border-light); }
                .progress-track::-moz-range-progress { height: 4px; border-radius: 2px; background: var(--accent); }
                .progress-track::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--text-primary); border: 2px solid var(--accent); margin-top: -4px; cursor: pointer; transition: transform 0.1s; }
                .progress-track::-webkit-slider-thumb:hover { transform: scale(1.3); }
                .progress-track::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--text-primary); border: 2px solid var(--accent); cursor: pointer; }
            `}</style>
            {total > 0 && (
                <input
                    className="progress-track"
                    type="range"
                    min={0}
                    max={total}
                    value={cursor}
                    onChange={handleScrub}
                    style={
                        {
                            '--pct': `${(cursor / total) * 100}%`,
                            '--track-color': trackColor,
                        } as React.CSSProperties
                    }
                />
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                <span
                    style={{
                        color: done ? 'var(--text-secondary)' : 'var(--text-muted)',
                        fontSize: 12,
                        fontFamily: 'monospace',
                    }}
                >
                    {cursor}
                    <span style={{ color: 'var(--text-faint)' }}>/</span>
                    {total}
                    {done ? ' ✓' : ''}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                        style={{
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace',
                            minWidth: 28,
                            textAlign: 'right',
                        }}
                    >
                        {speedMultiplier}
                    </span>
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
