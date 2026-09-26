import { runTests } from '@vscode/test-electron';
import { join, resolve } from 'node:path';

// Downloads a VS Code build and runs the suite inside it. Opt-in (`npm run
// test:integration`) rather than part of `npm test`, because it needs a JDK, a network
// round trip on first run, and a display.

async function main(): Promise<void> {
    // dist/integration -> dist -> extension. `__dirname` works because esbuild emits CJS.
    const extensionDevelopmentPath = resolve(__dirname, '..', '..');
    const extensionTestsPath = join(__dirname, 'suite', 'index.js');

    // Open the repo root as the workspace so the fixtures and the monorepo-only
    // commands are both reachable.
    const workspace = resolve(extensionDevelopmentPath, '..', '..', '..');

    await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [workspace, '--disable-extensions', '--disable-gpu'],
    });
}

main().catch(error => {
    console.error('integration tests failed:', error);
    process.exit(1);
});
