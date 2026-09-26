// Core visualizer: trace interpreter, canvas renderer, playback transport and theme.
// No React, no bundler-specific APIs — safe to import from any browser context.

export { SimpleEngine } from './engine/SimpleEngine';
export { SimpleRenderer } from './engine/SimpleRenderer';
export type { Command, Chunk } from './engine/types';

export {
    engine,
    loadCommands,
    play,
    pause,
    isPlaying,
    stepForward,
    stepBackward,
    reset,
    setSpeed,
    subscribe,
    subscribeToPlaying,
    getEngine,
} from './visualizerEngine';

export { theme, DEFAULT_THEME, applyThemeOverrides, resetTheme } from './theme';
export type { Theme, ThemeOverrides } from './theme';
