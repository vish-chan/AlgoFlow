import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    applyThemeOverrides,
    getEngine,
    isPlaying,
    loadCommands,
    pause,
    play,
    reset,
    setSpeed,
    stepBackward,
    stepForward,
    subscribe,
    subscribeToPlaying,
} from '@algoflow/visualizer';
import type { ThemeOverrides } from '@algoflow/visualizer';
import type { HostToWebview, ThemeTokens, TraceCommand } from '../src/protocol';
import VisualizerRoot from './VisualizerRoot';
import { onHostMessage, post, vscodeApi } from './vscodeApi';
import { readVsCodeTheme, watchVsCodeTheme } from './theme';
import './styles.css';

/** Render a message through the visualizer's own log pane, so errors use one code path. */
function errorCommands(message: string): TraceCommand[] {
    return [
        { key: 'log', method: 'LogTracer', args: ['Error'] },
        { key: null, method: 'setRoot', args: ['log'] },
        { key: 'log', method: 'println', args: [message] },
        { key: null, method: 'delay', args: [] },
    ];
}

// ThemeTokens is the JSON-shaped form of ThemeOverrides: the protocol cannot import
// the visualizer's types, because the host compiles it without the DOM lib.
function asThemeOverrides(tokens: ThemeTokens): ThemeOverrides {
    return tokens as ThemeOverrides;
}

function App() {
    const [speedMs, setSpeedMs] = useState(500);
    const [hasTrace, setHasTrace] = useState(false);
    const [loading, setLoading] = useState(false);
    const [placeholder, setPlaceholder] = useState<string | undefined>(undefined);
    // Bumped on every theme change and passed to the canvas as a React `key`, which
    // remounts it. SimpleEngine's `notify` is private, so remounting is the only way to
    // force a repaint from outside — and theme switches are rare enough not to care.
    const [themeVersion, setThemeVersion] = useState(0);
    const runIdRef = useRef(0);

    useEffect(() => {
        const syncTheme = () => {
            applyThemeOverrides(readVsCodeTheme());
            setThemeVersion(version => version + 1);
        };
        syncTheme();
        return watchVsCodeTheme(syncTheme);
    }, []);

    useEffect(() => {
        const unsubscribeHost = onHostMessage((message: HostToWebview) => {
            switch (message.type) {
                case 'init':
                    setSpeedMs(message.speedMs);
                    setSpeed(message.speedMs);
                    applyThemeOverrides(asThemeOverrides(message.theme));
                    break;

                case 'theme':
                    applyThemeOverrides(asThemeOverrides(message.theme));
                    break;

                case 'status':
                    setLoading(message.phase === 'running');
                    setPlaceholder(message.text);
                    break;

                case 'trace':
                    runIdRef.current = message.runId;
                    loadCommands(message.commands);
                    setHasTrace(true);
                    setLoading(false);
                    if (message.autoPlay) play();
                    break;

                case 'errorTrace':
                    runIdRef.current = message.runId;
                    loadCommands(errorCommands(message.message));
                    setHasTrace(true);
                    setLoading(false);
                    play();
                    break;

                case 'transport':
                    switch (message.action) {
                        case 'play': play(); break;
                        case 'pause': pause(); break;
                        // Only this side knows whether playback is running, which is why
                        // the toggle is resolved here rather than in the host.
                        case 'playPause': isPlaying() ? pause() : play(); break;
                        case 'stepForward': stepForward(); break;
                        case 'stepBackward': stepBackward(); break;
                        case 'reset': reset(); break;
                        case 'setCursor':
                            pause();
                            if (message.value !== undefined) getEngine().setCursor(message.value);
                            break;
                        case 'setSpeed':
                            if (message.value !== undefined) {
                                setSpeedMs(message.value);
                                setSpeed(message.value);
                            }
                            break;
                    }
                    break;
            }
        });

        // The host drives editor decorations off these, and persists the cursor so a
        // restored panel can explain itself rather than showing a blank canvas.
        const unsubscribeEngine = subscribe(() => {
            const engine = getEngine();
            const cursor = engine.getCursor();
            post({
                type: 'step',
                runId: runIdRef.current,
                cursor,
                total: engine.getLength(),
                line: engine.getHighlightedLine(),
            });
            vscodeApi.setState({ runId: runIdRef.current, cursor });
        });
        const unsubscribePlaying = subscribeToPlaying(playing => post({ type: 'playState', playing }));

        post({ type: 'ready' });

        return () => {
            unsubscribeHost();
            unsubscribeEngine();
            unsubscribePlaying();
        };
    }, []);

    return (
        <VisualizerRoot
            themeVersion={themeVersion}
            loading={loading}
            placeholder={placeholder}
            speedMs={speedMs}
            hasTrace={hasTrace}
            onSpeedChange={ms => {
                setSpeedMs(ms);
                setSpeed(ms);
                post({ type: 'speedChanged', speedMs: ms });
            }}
        />
    );
}

const container = document.getElementById('root');
if (container) {
    createRoot(container).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
