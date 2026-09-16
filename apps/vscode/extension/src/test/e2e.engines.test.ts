import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runJava } from '../exec/javaRunner';
import { runPython } from '../exec/pythonRunner';
import { SimpleEngine } from '@algoflow/visualizer';
import type { TraceCommand } from '../protocol';

// test -> src -> extension -> vscode -> apps -> repo root
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');

const JAVA_EXAMPLES = join(REPO_ROOT, 'packages/java/engine/src/test/snapshot/examples');
const PYTHON_EXAMPLES = join(REPO_ROOT, 'packages/python/engine/test/snapshot/examples');
const PYTHON_ENGINE = join(REPO_ROOT, 'packages/python/engine');

function findEngineJar(): string | undefined {
    const target = join(REPO_ROOT, 'packages/java/engine/target');
    if (!existsSync(target)) return undefined;
    const jar = readdirSync(target).find(
        name => name.startsWith('algo-transformer') && name.endsWith('.jar'),
    );
    return jar ? join(target, jar) : undefined;
}

const engineJarPath = findEngineJar();
const pythonRunnerExists = existsSync(join(PYTHON_ENGINE, 'engine', 'runner.py'));

const scratchRoot = mkdtempSync(join(tmpdir(), 'algoflow-e2e-'));
afterAll(() => rmSync(scratchRoot, { recursive: true, force: true }));

/**
 * The line numbers the extension highlights come from `StackWalker` on the *compiled*
 * class, while the decoration lands in the user's untouched document. Nothing else in
 * the suite catches an off-by-two between those two, so this walks a real trace from a
 * real engine and checks every line against the real source.
 */
function collectHighlightedLines(commands: TraceCommand[]): (number | null)[] {
    const engine = new SimpleEngine();
    engine.loadCommands(commands as never);

    const lines: (number | null)[] = [engine.getHighlightedLine()];
    while (engine.next()) {
        lines.push(engine.getHighlightedLine());
    }
    return lines;
}

/** A highlight is only useful if it lands on something the user can read as a step. */
function assertLinesPointAtStatements(sourceLines: string[], highlighted: (number | null)[]): void {
    const real = highlighted.filter((line): line is number => line !== null);
    expect(real.length).toBeGreaterThan(0);

    for (const line of real) {
        expect(line).toBeGreaterThanOrEqual(1);
        expect(line).toBeLessThanOrEqual(sourceLines.length);
    }

    const first = sourceLines[real[0] - 1].trim();
    expect(first).not.toBe('');
    expect(first.startsWith('package ')).toBe(false);
    expect(first.startsWith('import ')).toBe(false);
    expect(first.startsWith('//')).toBe(false);
    expect(first.startsWith('#')).toBe(false);
}

describe.skipIf(!engineJarPath)('java engine end to end', () => {
    it('highlights only lines that exist in the user\'s file', async () => {
        const sourcePath = join(JAVA_EXAMPLES, 'binary_search.java');
        const source = readFileSync(sourcePath, 'utf-8');

        const result = await runJava({
            source,
            scratchDir: join(scratchRoot, 'java'),
            javaPath: 'java',
            javacPath: 'javac',
            engineJarPath: engineJarPath!,
            vmArgs: ['-Xmx512m'],
            timeoutMs: 120_000,
            maxTraceBytes: 64 * 1024 * 1024,
        });

        if (!result.ok) expect.fail(`${result.kind}: ${result.message}`);

        // The normalizer is line-preserving, so the map must be the identity.
        expect(result.lineMap.toUser(7)).toBe(7);
        assertLinesPointAtStatements(source.split(/\r?\n/), collectHighlightedLines(result.commands));
    }, 180_000);

    /*
     * There is deliberately no test here for the timeout clock starting at the agent's
     * ready marker. Any version of it is a race: on an idle machine the whole run finishes
     * in under a second, so a budget small enough to prove the point is small enough to
     * fail spuriously. `src/test/spawnCapture.test.ts` pins the behaviour with scripted
     * startup delays instead, and `javaRunner.args.test.ts` pins the marker string.
     */
});

describe.skipIf(!pythonRunnerExists)('python engine end to end', () => {
    it('highlights only lines that exist in the user\'s file', async () => {
        const sourcePath = join(PYTHON_EXAMPLES, 'binary_search.py');
        const source = readFileSync(sourcePath, 'utf-8');

        const result = await runPython({
            source,
            scratchDir: join(scratchRoot, 'python'),
            pythonPath: 'python3',
            engineDir: PYTHON_ENGINE,
            userFileDir: PYTHON_EXAMPLES,
            timeoutMs: 120_000,
            maxTraceBytes: 64 * 1024 * 1024,
        });

        if (!result.ok) expect.fail(`${result.kind}: ${result.message}`);

        assertLinesPointAtStatements(source.split(/\r?\n/), collectHighlightedLines(result.commands));
    }, 180_000);

    // The backend deadlocks here: it calls waitFor() before draining stdout, so any
    // trace bigger than the pipe buffer is misreported as an infinite loop. This one is
    // ~636 KB, roughly ten times the buffer.
    it('captures a trace far larger than the OS pipe buffer', async () => {
        const source = readFileSync(join(PYTHON_EXAMPLES, 'n_queens.py'), 'utf-8');

        const result = await runPython({
            source,
            scratchDir: join(scratchRoot, 'python-large'),
            pythonPath: 'python3',
            engineDir: PYTHON_ENGINE,
            userFileDir: PYTHON_EXAMPLES,
            timeoutMs: 120_000,
            maxTraceBytes: 64 * 1024 * 1024,
        });

        if (!result.ok) expect.fail(`${result.kind}: ${result.message}`);
        expect(result.commands.length).toBeGreaterThan(1000);
    }, 180_000);
});
