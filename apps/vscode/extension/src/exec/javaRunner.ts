import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import type { TraceCommand } from '../protocol';
import { parseTrace } from './parseTrace';
import { spawnCapture } from './spawnCapture';
import { extractClassName, normalizeToRunnerPackage, RUNNER_PACKAGE, type LineMap } from './javaNormalize';

/** Written by the agent, relative to the process's working directory. */
const TRACE_FILE = 'visualization.json';

/**
 * Last line `VisualizerAgent.premain` prints, after `installOn` has returned — so once it
 * appears, every JDK retransformation is done and the next thing to run is the user's
 * `main`. See `VisualizerAgent.java:232`.
 *
 * The extension uses it as the starting gun for the execution timeout. Installing the
 * agent costs 4-6s (it redefines ~50 already-loaded `java.util` classes), which was being
 * charged to the user's program: a 38-step binary search took 7.3s wall clock, and a
 * perfectly finite run was reported as an infinite loop.
 */
export const AGENT_READY_MARKER = '[VisualizerAgent] Agent installed';

/**
 * Ceiling on installing the agent, separate from the execution timeout. Generous — the
 * measured cost is 4-6s but varies with machine load — while still bounded, so a JVM that
 * never gets as far as running anything cannot hang the run forever.
 */
const AGENT_INSTALL_TIMEOUT_MS = 60_000;

export type JavaRunRequest = {
    source: string;
    /** Empty directory the run owns; compiled classes and the trace land here. */
    scratchDir: string;
    javaPath: string;
    javacPath: string;
    engineJarPath: string;
    vmArgs: readonly string[];
    timeoutMs: number;
    maxTraceBytes: number;
};

export type JavaDiagnostic = {
    /** 1-based, in the user's document. */
    line: number;
    /** 1-based, in the user's document. */
    column: number;
    message: string;
};

export type JavaRunResult =
    | { ok: true; commands: TraceCommand[]; lineMap: LineMap; warning?: string }
    | { ok: false; kind: 'compile'; message: string; diagnostics: JavaDiagnostic[] }
    | { ok: false; kind: 'runtime' | 'timeout' | 'no-trace' | 'truncated'; message: string };

export function compileArgs(className: string, engineJarPath: string): string[] {
    return ['-d', '.', '-cp', engineJarPath, '-g', `${className}.java`];
}

/**
 * Argv for the traced JVM. Split out from `runJava` so it can be asserted without
 * spawning anything — the `-javaagent` flag and the runner package are both silent
 * failures when wrong (an unmatched package yields an empty trace, not an error).
 */
export function runArgs(
    className: string,
    engineJarPath: string,
    vmArgs: readonly string[] = ['-Xmx512m'],
): string[] {
    return [
        ...vmArgs,
        `-javaagent:${engineJarPath}`,
        // `path.delimiter`, not ':' — the backend hardcodes ':' and cannot run on Windows.
        '-cp',
        [engineJarPath, '.'].join(delimiter),
        '--add-opens',
        'java.base/java.util=ALL-UNNAMED',
        `${RUNNER_PACKAGE}.${className}`,
    ];
}

/**
 * Environment for the traced JVM.
 *
 * ALGORITHM_VISUALIZER is a privacy control, not a feature flag. Without it, the
 * upstream tracers-java `Commander` installs a shutdown hook that POSTs the trace to
 * algorithm-visualizer.org and opens a browser tab. Nothing in the extension may run
 * user code without it set.
 */
export function runEnv(parentEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
    return { ...parentEnv, ALGORITHM_VISUALIZER: 'true' };
}

export async function runJava(request: JavaRunRequest): Promise<JavaRunResult> {
    const { scratchDir, engineJarPath, timeoutMs, maxTraceBytes } = request;

    const { code, lineMap, warning } = normalizeToRunnerPackage(request.source);
    const className = extractClassName(code);

    prepareScratchDir(scratchDir);
    writeFileSync(join(scratchDir, `${className}.java`), code, 'utf-8');

    const compile = await spawnCapture(
        request.javacPath,
        compileArgs(className, engineJarPath),
        { cwd: scratchDir, timeoutMs, maxBytes: maxTraceBytes },
    );

    if (compile.timedOut) {
        return {
            ok: false,
            kind: 'timeout',
            message: `Compilation exceeded the ${timeoutMs}ms limit. Raise algoflow.execution.timeoutMs if this machine just needs longer.`,
        };
    }
    if (compile.code !== 0) {
        const message = extractUserError(compile.stderr) || compile.stdout;
        return {
            ok: false,
            kind: 'compile',
            message,
            diagnostics: parseJavacDiagnostics(compile.stderr, className, lineMap),
        };
    }

    const run = await spawnCapture(request.javaPath, runArgs(className, engineJarPath, request.vmArgs), {
        cwd: scratchDir,
        env: runEnv(),
        timeoutMs,
        maxBytes: maxTraceBytes,
        // So `timeoutMs` is a budget for the user's program, not for agent installation.
        readyMarker: AGENT_READY_MARKER,
        readyTimeoutMs: AGENT_INSTALL_TIMEOUT_MS,
    });

    const tracePath = join(scratchDir, TRACE_FILE);

    if (run.timedOut) {
        if (!run.ready) {
            // Nothing of the user's ran, so this is never an infinite loop; the JVM never
            // got as far as their `main`.
            return {
                ok: false,
                kind: 'timeout',
                message: `The tracing agent did not finish installing within ${AGENT_INSTALL_TIMEOUT_MS}ms, so the program never started.`,
            };
        }
        // The agent writes the trace from a JVM shutdown hook, which SIGTERM still runs,
        // so a partial trace is often on disk. Show it rather than nothing.
        const partial = tryReadTrace(tracePath, maxTraceBytes);
        if (partial) {
            return {
                ok: true,
                commands: partial,
                lineMap,
                warning: `The program ran longer than ${timeoutMs}ms — showing a partial trace. Look for an infinite loop, or raise algoflow.execution.timeoutMs if it is simply a long run.`,
            };
        }
        return {
            ok: false,
            kind: 'timeout',
            message: `The program ran longer than ${timeoutMs}ms and was stopped. Look for an infinite loop, or raise algoflow.execution.timeoutMs if it is simply a long run.`,
        };
    }

    if (run.code !== 0) {
        const message = extractUserError(run.stderr) || run.stdout.trim() || `Java exited with ${run.code}.`;
        return { ok: false, kind: 'runtime', message };
    }

    if (!existsSync(tracePath)) {
        return {
            ok: false,
            kind: 'no-trace',
            message: run.stdout.trim()
                ? `No trace was produced. Program output:\n${run.stdout.trim()}`
                : 'No trace was produced. Annotate a field with @Graph, @Tree, @Chart or @LinkedList, or add a tracer to the code you want to see.',
        };
    }

    const raw = readFileSync(tracePath, 'utf-8');
    if (Buffer.byteLength(raw) > maxTraceBytes) {
        return {
            ok: false,
            kind: 'truncated',
            message: `The trace is larger than ${maxTraceBytes} bytes. Reduce the input size or raise algoflow.execution.maxTraceBytes.`,
        };
    }

    return { ok: true, commands: parseTrace(raw), lineMap, warning };
}

/**
 * A run must not be able to display the previous run's trace. The backend sidesteps
 * this by making a fresh temp directory each time; we reuse a per-file directory so
 * that scratch state is inspectable, which means clearing it explicitly.
 */
function prepareScratchDir(scratchDir: string): void {
    mkdirSync(scratchDir, { recursive: true });
    for (const entry of readdirSync(scratchDir)) {
        if (entry === TRACE_FILE || entry.endsWith('.class') || entry.endsWith('.java')) {
            rmSync(join(scratchDir, entry), { force: true });
        }
    }
}

function tryReadTrace(tracePath: string, maxBytes: number): TraceCommand[] | undefined {
    try {
        const raw = readFileSync(tracePath, 'utf-8');
        if (Buffer.byteLength(raw) > maxBytes) return undefined;
        const commands = parseTrace(raw);
        return commands.length > 0 ? commands : undefined;
    } catch {
        // A trace truncated mid-write is not JSON. Nothing to show.
        return undefined;
    }
}

const NOISE_PREFIXES = ['[Byte Buddy]', '[VisualizerAgent]', 'OpenJDK', 'WARNING:'] as const;

/** Strip agent and JVM chatter so the user sees only their own exception. */
export function extractUserError(stderr: string): string {
    return stderr
        .split(/\r?\n/)
        .filter(line => !NOISE_PREFIXES.some(prefix => line.startsWith(prefix)))
        .join('\n')
        .trim();
}

/**
 * Turn `Main.java:12: error: ';' expected` into editor diagnostics.
 *
 * Line numbers need no mapping — the normalizer preserves them — but line 1 columns do,
 * because that is the line the package declaration is prefixed onto.
 */
export function parseJavacDiagnostics(
    stderr: string,
    className: string,
    lineMap: LineMap,
): JavaDiagnostic[] {
    const diagnostics: JavaDiagnostic[] = [];
    const lines = stderr.split(/\r?\n/);
    const header = new RegExp(`^${escapeRegExp(className)}\\.java:(\\d+): (?:error|warning): (.*)$`);

    for (let i = 0; i < lines.length; i++) {
        const match = header.exec(lines[i]);
        if (!match) continue;

        const normalizedLine = Number(match[1]);
        const line = lineMap.toUser(normalizedLine);

        // javac points at the column with a caret on the second following line.
        const caret = lines[i + 2] ?? '';
        const caretIndex = caret.indexOf('^');
        let column = caretIndex >= 0 ? caretIndex + 1 : 1;
        if (normalizedLine === 1) column = Math.max(1, column - lineMap.col1Delta);

        diagnostics.push({ line, column, message: match[2] });
    }

    return diagnostics;
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
