import { tmpdir } from 'node:os';
import { spawnCapture } from '../exec/spawnCapture';

/** The engine's AST rewriter relies on 3.10+ syntax. */
export const MIN_PYTHON_VERSION: readonly [number, number] = [3, 10];

export type Python = {
    command: string;
    version: [number, number];
};

export type PythonRejection = {
    command: string;
    reason: 'not-runnable' | 'too-old';
    detail: string;
};

/** Candidates tried in order when nothing more specific is configured. */
export const PATH_CANDIDATES = ['python3', 'python'] as const;

/** Validate an interpreter by asking it its version, rather than parsing its path. */
export async function validatePython(command: string): Promise<Python | PythonRejection> {
    let stdout: string;
    try {
        const result = await spawnCapture(
            command,
            ['-c', 'import sys; print(sys.version_info[0], sys.version_info[1])'],
            { cwd: tmpdir(), timeoutMs: 10_000, maxBytes: 64 * 1024 },
        );
        if (result.code !== 0) {
            return {
                command,
                reason: 'not-runnable',
                detail: `${command} exited with ${result.code}: ${result.stderr.trim()}`,
            };
        }
        stdout = result.stdout;
    } catch (error) {
        return {
            command,
            reason: 'not-runnable',
            detail: error instanceof Error ? error.message : String(error),
        };
    }

    const parts = stdout.trim().split(/\s+/).map(Number);
    if (parts.length < 2 || parts.some(Number.isNaN)) {
        return { command, reason: 'not-runnable', detail: `Unexpected version output "${stdout.trim()}".` };
    }

    const version: [number, number] = [parts[0], parts[1]];
    if (!atLeast(version, MIN_PYTHON_VERSION)) {
        return {
            command,
            reason: 'too-old',
            detail: `Found Python ${version.join('.')}; AlgoFlow needs ${MIN_PYTHON_VERSION.join('.')} or newer.`,
        };
    }

    return { command, version };
}

export function isPython(result: Python | PythonRejection): result is Python {
    return 'version' in result;
}

function atLeast(found: readonly [number, number], minimum: readonly [number, number]): boolean {
    return found[0] !== minimum[0] ? found[0] > minimum[0] : found[1] >= minimum[1];
}
