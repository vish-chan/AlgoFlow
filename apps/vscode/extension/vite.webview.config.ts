import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// The webview bundle. No index.html: the extension host generates the HTML so the
// CSP nonce is minted per panel, server-side. IIFE because a webview loads one
// classic script tag, not an ES module graph.
export default defineConfig({
    plugins: [react()],
    // Lib mode does not inject this, so React's `process.env.NODE_ENV` checks survive
    // the bundle. A webview has no `process`, so leaving them would throw on load —
    // and would ship React's development build.
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        outDir: 'media/webview',
        emptyOutDir: true,
        cssCodeSplit: false,
        lib: {
            entry: fileURLToPath(new URL('webview/main.tsx', import.meta.url)),
            formats: ['iife'],
            name: 'AlgoFlowWebview',
            fileName: () => 'webview.js',
        },
        rollupOptions: {
            output: { assetFileNames: 'webview.css' },
        },
    },
});
