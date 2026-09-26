import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Marker that identifies the AlgoFlow monorepo rather than any parent directory. */
const MARKER = join('packages', 'java', 'engine', 'pom.xml');

/**
 * Walk up from each candidate directory looking for the AlgoFlow checkout.
 *
 * Used for two things: locating engine sources when the extension runs from source
 * (`--extensionDevelopmentPath`), and locating the golden traces the fixture command
 * loads. Returns `undefined` for an installed `.vsix`, which is the normal case — the
 * caller falls back to the bundled engine.
 */
export function findMonorepoRoot(startDirs: readonly string[]): string | undefined {
    for (const start of startDirs) {
        let dir = start;
        for (;;) {
            if (existsSync(join(dir, MARKER))) return dir;
            const parent = dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }
    return undefined;
}
