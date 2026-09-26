import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { TraceCommand } from '../protocol';
import { parseTrace } from './parseTrace';
import { spawnCapture } from './spawnCapture';

export type PythonRunRequest = {
    source: string;
    /** Directory the run owns; the buffer is copied here. */
    scratchDir: string;
    pythonPath: string;
    /** Directory containing `engine/runner.py`. */
    engineDir: string;
    /** Directory the user's file lives in, so its own imports resolve. */
    userFileDir: string;
    timeoutMs: number;
    maxTraceBytes: number;
};

export type PythonRunResult =
    | { ok: true; commands: TraceCommand[] }
    | { ok: false; kind: 'runtime' | 'timeout' | 'no-trace' | 'truncated'; message: string };

export function runnerScript(engineDir: string): string {
    return join(engineDir, 'engine', 'runner.py');
}

/**
 * Run the Python engine over the user's buffer.
 *
 * The buffer is copied to a scratch file rather than run in place, so unsaved edits
 * work exactly as they do for Java. No line mapping is needed: the AST rewriter keeps
 * line numbers, and there is no package to rewrite.
 */
export async function runPython(request: PythonRunRequest): Promise<PythonRunResult> {
    const { scratchDir, timeoutMs, maxTraceBytes } = request;

    mkdirSync(scratchDir, { recursive: true });
    const scriptPath = join(scratchDir, 'solution.py');
    writeFileSync(scriptPath, request.source, 'utf-8');

    const result = await spawnCapture(
        request.pythonPath,
        [runnerScript(request.engineDir), scriptPath],
        {
            // `runner.py` bootstraps its own sys.path, so cwd is free: point it at the
            // user's directory so their sibling imports resolve.
            cwd: request.userFileDir,
            timeoutMs,
            maxBytes: maxTraceBytes,
        },
    );

    if (result.timedOut) {
        return {
            ok: false,
            kind: 'timeout',
            // No ready marker here: the Python engine has no equivalent of the Java
            // agent's multi-second install, so the whole budget is the program's already.
            message: `The program ran longer than ${timeoutMs}ms and was stopped. Look for an infinite loop, or raise algoflow.execution.timeoutMs if it is simply a long run.`,
        };
    }
    if (result.truncated) {
        return {
            ok: false,
            kind: 'truncated',
            message: `The trace is larger than ${maxTraceBytes} bytes. Reduce the input size or raise algoflow.execution.maxTraceBytes.`,
        };
    }
    if (result.code !== 0) {
        return { ok: false, kind: 'runtime', message: cleanPythonError(result.stderr, result.code) };
    }
    if (result.stdout.trim() === '') {
        return {
            ok: false,
            kind: 'no-trace',
            message: 'No trace was produced. Add a tracer to the code you want to see.',
        };
    }

    return { ok: true, commands: parseTrace(result.stdout) };
}

/** The engine wraps user exceptions in a Java-style prefix; drop it. */
export function cleanPythonError(stderr: string, exitCode: number | null): string {
    const cleaned = stderr.replace(/^Exception in thread "main"\s*/m, '').trim();
    return cleaned || `Python exited with ${exitCode}.`;
}
