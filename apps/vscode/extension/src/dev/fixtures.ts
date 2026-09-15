import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Language, TraceCommand } from '../protocol';
import { parseTrace } from '../exec/parseTrace';

// Development helper: replay one of the engines' golden traces without running any
// code. Lets the webview be exercised on a machine with no JDK or Python, and gives
// every visualization type a reproducible smoke test.
//
// Deliberately free of `vscode` imports so the unit tests can use it as a fixture
// index; the quick pick that wraps it lives in extension.ts.

const TRACE_DIRS: Record<Language, string> = {
    java: join('packages', 'java', 'engine', 'src', 'test', 'snapshot', 'snapshots'),
    python: join('packages', 'python', 'engine', 'test', 'snapshot', 'snapshots'),
};

export type Fixture = {
    label: string;
    language: Language;
    path: string;
};

export function listFixtures(monorepoRoot: string): Fixture[] {
    const fixtures: Fixture[] = [];
    for (const language of Object.keys(TRACE_DIRS) as Language[]) {
        const dir = join(monorepoRoot, TRACE_DIRS[language]);
        let entries: string[];
        try {
            entries = readdirSync(dir);
        } catch {
            continue;
        }
        for (const entry of entries.sort()) {
            if (!entry.endsWith('.json')) continue;
            fixtures.push({
                label: `${language}: ${entry.replace(/\.json$/, '')}`,
                language,
                path: join(dir, entry),
            });
        }
    }
    return fixtures;
}

export function readFixture(fixture: Fixture): TraceCommand[] {
    return parseTrace(readFileSync(fixture.path, 'utf-8'));
}
