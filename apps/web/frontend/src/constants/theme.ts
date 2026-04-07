export const theme = {
    bg: { base: '#0a0a0a', surface: '#121212', elevated: '#1e1e1e', hover: '#252525', active: '#2a2a2a' },
    border: { default: '#262626', light: '#333' },
    text: { primary: '#e0e0e0', secondary: '#a0a0a0', muted: '#737373', faint: '#4a4a4a' },
    accent: { default: '#4CAF50', hover: '#43a047', dark: '#2a4a3a', darker: '#1a3a25', explored: '#2E7D32' },
    status: { error: '#f44336', errorDark: '#b71c1c', errorLight: '#ff8a80', warning: '#f89f1b', info: '#2196F3', weight: '#ffab40' },
    difficulty: { easy: '#4CAF50', medium: '#f57c00', hard: '#f44336' },
    cell: { default: '#2a2a2a', selected: '#2196F3', patched: '#f44336' },
    node: { default: '#2a2a2a', active: '#4CAF50', explored: '#2E7D32' },
    edge: { default: '#4a4a4a', visited: '#4CAF50', active: '#FF8F00' },
} as const;
