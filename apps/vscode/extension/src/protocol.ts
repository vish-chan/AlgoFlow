// Message contract between the extension host and the webview.
//
// Compiled by both tsconfig.json (host, Node, no DOM) and tsconfig.webview.json
// (browser). Keep it free of imports so neither side drags in the other's lib:
// in particular `TraceCommand` mirrors @algoflow/visualizer's `Command` structurally
// rather than importing it, because that module's type graph references DOM types.

/** One entry in an engine trace. A step boundary is `{key:null, method:'delay', args:[]}`. */
export type TraceCommand = {
    key: string | null;
    method: string;
    args: unknown[];
};

export type Language = 'java' | 'python';

/**
 * Flat `group -> key -> css color` overrides for the visualizer theme, derived from
 * the active VS Code color theme. Deliberately JSON-shaped: it crosses postMessage.
 */
export type ThemeTokens = Record<string, Record<string, string>>;

export type TransportAction =
    | 'play'
    | 'pause'
    /** Toggle — only the webview knows whether playback is running. */
    | 'playPause'
    | 'stepForward'
    | 'stepBackward'
    | 'reset'
    | 'setCursor'
    | 'setSpeed';

export type HostToWebview =
    | { type: 'init'; speedMs: number; theme: ThemeTokens }
    | { type: 'status'; phase: 'idle' | 'running' | 'error'; text?: string }
    | {
          type: 'trace';
          runId: number;
          language: Language;
          commands: TraceCommand[];
          autoPlay: boolean;
      }
    | { type: 'errorTrace'; runId: number; message: string }
    | { type: 'transport'; action: TransportAction; value?: number }
    | { type: 'theme'; theme: ThemeTokens };

export type WebviewToHost =
    | { type: 'ready' }
    | { type: 'step'; runId: number; cursor: number; total: number; line: number | null }
    | { type: 'playState'; playing: boolean }
    | { type: 'speedChanged'; speedMs: number }
    | { type: 'requestRun' };

/** Persisted via the webview's `setState` so a restored panel can explain itself. */
export type WebviewPersistedState = {
    runId: number;
    cursor: number;
};
