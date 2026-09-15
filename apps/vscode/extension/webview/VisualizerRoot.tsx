import { VisualizerCanvas } from '@algoflow/visualizer/react';
import ExtControls from './ExtControls';

// Fork of the web app's AlgorithmVisualizerPane, minus the lesson banner/annotation
// layer. Keeps the "Executing…" overlay: local runs take a second or two.

interface Props {
    loading?: boolean;
    /** Shown in place of the canvas before the first trace arrives. */
    placeholder?: string;
    speedMs: number;
    onSpeedChange: (speedMs: number) => void;
    hasTrace: boolean;
    /** Changing this remounts the canvas, which is how a theme switch repaints. */
    themeVersion: number;
}

export default function VisualizerRoot({
    loading,
    placeholder,
    speedMs,
    onSpeedChange,
    hasTrace,
    themeVersion,
}: Props) {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                position: 'relative',
            }}
        >
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0, position: 'relative' }}>
                {hasTrace ? (
                    <VisualizerCanvas key={themeVersion} />
                ) : (
                    <div className="algoflow-placeholder">
                        <strong>AlgoFlow</strong>
                        <span>{placeholder ?? 'Run a Java or Python file to visualize it.'}</span>
                    </div>
                )}
            </div>
            <ExtControls speed={speedMs} onSpeedChange={onSpeedChange} />
            {loading && (
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 5,
                    }}
                >
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    <div style={{ textAlign: 'center' }}>
                        <div
                            style={{
                                width: 28,
                                height: 28,
                                border: '3px solid var(--border-light)',
                                borderTopColor: 'var(--accent)',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                                margin: '0 auto 10px',
                            }}
                        />
                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Executing…</div>
                    </div>
                </div>
            )}
        </div>
    );
}
