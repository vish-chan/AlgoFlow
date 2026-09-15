import { spawn } from 'node:child_process';

export type SpawnResult = {
    /** Exit code, or `null` if the process was killed by a signal. */
    code: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
    /** The timeout elapsed and we killed the process tree. */
    timedOut: boolean;
    /** Output exceeded `maxBytes`; the captured text is cut short. */
    truncated: boolean;
};

export type SpawnCaptureOptions = {
    cwd: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs: number;
    /** Cap per stream. Prevents a runaway trace from exhausting the host's heap. */
    maxBytes: number;
};

/** Grace period between asking a process tree to stop and forcing it. */
const KILL_GRACE_MS = 1500;

/**
 * Run a command and capture its output.
 *
 * The one thing this must not do is what the backend does: `ProcessBuilder.waitFor()`
 * before reading the pipes deadlocks as soon as the child writes more than the ~64KB
 * OS pipe buffer, which for a Python trace surfaces as a bogus "execution timed out".
 * So the `data` handlers are attached before anything can await, and the promise
 * settles on `close` (all stdio drained) rather than `exit`.
 */
export function spawnCapture(
    command: string,
    args: readonly string[],
    options: SpawnCaptureOptions,
): Promise<SpawnResult> {
    return new Promise<SpawnResult>((resolve, reject) => {
        const child = spawn(command, [...args], {
            cwd: options.cwd,
            env: options.env,
            // stdin closed, so user code that reads input gets EOF instead of hanging.
            stdio: ['ignore', 'pipe', 'pipe'],
            // Own process group, so a timeout can take the whole tree (a forked JVM
            // child outliving `kill(pid)` is how the backend leaks processes).
            detached: process.platform !== 'win32',
        });

        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let truncated = false;
        let timedOut = false;
        let settled = false;

        const collect = (chunks: Buffer[], getBytes: () => number, addBytes: (n: number) => void) =>
            (chunk: Buffer) => {
                const remaining = options.maxBytes - getBytes();
                if (remaining <= 0) {
                    // Output continued past a cap already filled exactly: that is still
                    // truncation, and without tripping here nothing would kill the
                    // process — it would run to the timeout while we discarded its data.
                    truncated = true;
                    stop();
                    return;
                }
                if (chunk.length > remaining) {
                    chunks.push(chunk.subarray(0, remaining));
                    addBytes(remaining);
                    truncated = true;
                    stop();
                    return;
                }
                chunks.push(chunk);
                addBytes(chunk.length);
            };

        // Attached before any await: this is the deadlock fix.
        child.stdout.on('data', collect(stdout, () => stdoutBytes, n => (stdoutBytes += n)));
        child.stderr.on('data', collect(stderr, () => stderrBytes, n => (stderrBytes += n)));

        let forceTimer: NodeJS.Timeout | undefined;
        const stop = () => {
            killTree(child.pid, 'SIGTERM');
            forceTimer ??= setTimeout(() => killTree(child.pid, 'SIGKILL'), KILL_GRACE_MS);
            forceTimer.unref?.();
        };

        const timer = setTimeout(() => {
            timedOut = true;
            stop();
        }, options.timeoutMs);

        const cleanup = () => {
            clearTimeout(timer);
            if (forceTimer) clearTimeout(forceTimer);
        };

        child.on('error', error => {
            if (settled) return;
            settled = true;
            cleanup();
            reject(error);
        });

        // 'close', not 'exit': 'exit' can fire while stdio is still buffered.
        child.on('close', (code, signal) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve({
                code,
                signal,
                stdout: Buffer.concat(stdout).toString('utf-8'),
                stderr: Buffer.concat(stderr).toString('utf-8'),
                timedOut,
                truncated,
            });
        });
    });
}

/**
 * Kill a process and everything it spawned. `spawn` gives us a process group on POSIX,
 * so a negative pid signals the group; Windows has no groups, hence `taskkill /T`.
 */
function killTree(pid: number | undefined, signal: NodeJS.Signals): void {
    if (pid === undefined) return;
    try {
        if (process.platform === 'win32') {
            // /T = tree, /F = force. Windows has no SIGTERM equivalent to try first.
            spawn('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' }).unref();
        } else {
            process.kill(-pid, signal);
        }
    } catch {
        // Already gone, or the group vanished between the check and the signal.
    }
}
