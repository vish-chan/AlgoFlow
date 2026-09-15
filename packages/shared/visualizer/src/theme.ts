export const DEFAULT_THEME = {
    bg: { base: '#0a0a0a', surface: '#121212', elevated: '#1e1e1e', hover: '#252525', active: '#2a2a2a' },
    border: { default: '#262626', light: '#333' },
    text: { primary: '#e0e0e0', secondary: '#a0a0a0', muted: '#737373', faint: '#4a4a4a' },
    accent: { default: '#4CAF50', hover: '#43a047', dark: '#2a4a3a', darker: '#1a3a25', explored: '#2E7D32' },
    status: { error: '#f44336', errorDark: '#b71c1c', errorLight: '#ff8a80', warning: '#f89f1b', info: '#2196F3', weight: '#ffab40' },
    difficulty: { easy: '#4CAF50', medium: '#f57c00', hard: '#f44336' },
    cell: { default: '#2a2a2a', selected: '#2196F3', patched: '#f44336' },
    node: { default: '#2a2a2a', active: '#4CAF50', explored: '#2E7D32' },
    edge: { default: '#4a4a4a', visited: '#4CAF50', active: '#FF8F00' },
};

export type Theme = typeof DEFAULT_THEME;
export type ThemeOverrides = { [K in keyof Theme]?: Partial<Theme[K]> };

/**
 * The live theme. SimpleRenderer dereferences `theme.<group>.<key>` at draw time,
 * so mutating this object in place repaints with the new colors on the next frame —
 * no renderer changes, no re-instantiation. Consumers that want the stock dark
 * palette can simply leave it alone.
 */
export const theme: Theme = structuredClone(DEFAULT_THEME);

/** Merge partial per-group overrides into the live theme, in place. */
export function applyThemeOverrides(overrides: ThemeOverrides): void {
    for (const group of Object.keys(overrides) as (keyof Theme)[]) {
        Object.assign(theme[group], overrides[group]);
    }
}

/** Restore the stock dark palette, discarding any overrides. */
export function resetTheme(): void {
    Object.assign(theme, structuredClone(DEFAULT_THEME));
}
