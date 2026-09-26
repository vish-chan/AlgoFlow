import type { ThemeOverrides } from '@algoflow/visualizer';

/**
 * Derive visualizer colors from the active VS Code color theme.
 *
 * The canvas cannot read CSS variables — `fillStyle` needs a concrete color string — so
 * the `--vscode-*` custom properties VS Code injects on `<body>` are resolved here and
 * handed to `applyThemeOverrides`. `getPropertyValue` returns them already resolved to
 * `rgb()`/`rgba()`, which `fillStyle` accepts directly.
 *
 * This lives in the extension, not in `@algoflow/visualizer`: the visualizer has no
 * business knowing what VS Code is.
 */

/** `group.key` in the visualizer theme -> the `--vscode-*` property that best matches. */
const MAPPING: Record<string, Record<string, string>> = {
    bg: {
        base: 'editor-background',
        surface: 'sideBar-background',
        elevated: 'editorWidget-background',
        hover: 'list-hoverBackground',
        active: 'list-activeSelectionBackground',
    },
    border: {
        default: 'panel-border',
        light: 'widget-border',
    },
    text: {
        primary: 'editor-foreground',
        secondary: 'descriptionForeground',
        muted: 'disabledForeground',
    },
    accent: {
        default: 'charts-green',
        hover: 'textLink-activeForeground',
    },
    status: {
        error: 'charts-red',
        warning: 'charts-yellow',
        info: 'charts-blue',
    },
    cell: {
        selected: 'charts-blue',
    },
    node: {
        active: 'charts-green',
    },
    edge: {
        visited: 'charts-green',
    },
};

/**
 * Read the mapped colors off `document.body`. Anything VS Code does not define is left
 * out of the result, so `applyThemeOverrides` keeps the stock dark value for it — a theme
 * that omits `charts-*`, for instance, still renders.
 */
export function readVsCodeTheme(): ThemeOverrides {
    const computed = getComputedStyle(document.body);
    const overrides: Record<string, Record<string, string>> = {};

    for (const [group, keys] of Object.entries(MAPPING)) {
        for (const [key, property] of Object.entries(keys)) {
            const value = computed.getPropertyValue(`--vscode-${property}`).trim();
            if (value === '') continue;
            (overrides[group] ??= {})[key] = value;
        }
    }

    return overrides as ThemeOverrides;
}

/**
 * Call `onChange` whenever the user switches color theme.
 *
 * VS Code swaps `body`'s class and inline custom properties in place rather than
 * reloading the webview, so there is no event to listen for — only the attribute change.
 */
export function watchVsCodeTheme(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
}
