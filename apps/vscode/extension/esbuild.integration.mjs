import { build } from 'esbuild';

// Bundles the opt-in integration harness. Separate from esbuild.host.mjs because these
// entry points are never shipped — `.vscodeignore` excludes `dist/integration/`.

await build({
    entryPoints: {
        runTest: 'src/integration/runTest.ts',
        'suite/index': 'src/integration/suite/index.ts',
    },
    outdir: 'dist/integration',
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    sourcemap: true,
    // `vscode` is injected by the extension host; mocha and test-electron are resolved
    // from node_modules at runtime.
    external: ['vscode', 'mocha', '@vscode/test-electron'],
});

console.log('built dist/integration');
