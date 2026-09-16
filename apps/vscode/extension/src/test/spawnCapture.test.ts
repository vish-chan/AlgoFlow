import { describe, expect, it } from 'vitest';
import { tmpdir } from 'node:os';
import { spawnCapture } from '../exec/spawnCapture';

const base = { cwd: tmpdir(), timeoutMs: 5000, maxBytes: 64 * 1024 * 1024 };

describe('spawnCapture', () => {
    it('captures output far larger than the OS pipe buffer', async () => {
        // The regression test for the backend's bug: waiting on the process before
        // draining stdout deadlocks past ~64KB and reports a bogus timeout.
        const result = await spawnCapture(
            process.execPath,
            ['-e', 'process.stdout.write("x".repeat(4e6))'],
            { ...base, timeoutMs: 2000 },
        );

        expect(result.timedOut).toBe(false);
        expect(result.truncated).toBe(false);
        expect(result.code).toBe(0);
        expect(result.stdout.length).toBe(4_000_000);
    });

    it('reports stderr and the exit code for a failing process', async () => {
        const result = await spawnCapture(
            process.execPath,
            ['-e', 'process.stderr.write("boom"); process.exit(3)'],
            base,
        );

        expect(result.code).toBe(3);
        expect(result.stderr).toBe('boom');
    });

    it('times out and kills the whole process tree', async () => {
        const script = `
            const { spawn } = require('node:child_process');
            spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
            setInterval(() => {}, 1000);
        `;
        const started = Date.now();
        const result = await spawnCapture(process.execPath, ['-e', script], {
            ...base,
            timeoutMs: 400,
        });

        expect(result.timedOut).toBe(true);
        expect(Date.now() - started).toBeLessThan(4000);
    });

    // Chunk size divides the cap exactly, so the cap is reached rather than straddled —
    // the case that used to run to the timeout instead of truncating.
    it('truncates instead of buffering an unbounded trace', async () => {
        const result = await spawnCapture(
            process.execPath,
            ['-e', 'setInterval(() => process.stdout.write("y".repeat(1024)), 1)'],
            { ...base, maxBytes: 4096, timeoutMs: 4000 },
        );

        expect(result.truncated).toBe(true);
        expect(result.timedOut).toBe(false);
        expect(result.stdout.length).toBeLessThanOrEqual(4096);
    });

    it('does not report truncation for output that exactly fills the cap', async () => {
        const result = await spawnCapture(
            process.execPath,
            ['-e', 'process.stdout.write("z".repeat(4096))'],
            { ...base, maxBytes: 4096 },
        );

        expect(result.truncated).toBe(false);
        expect(result.stdout.length).toBe(4096);
    });

    it('does not hang on a process that reads stdin', async () => {
        const result = await spawnCapture(
            process.execPath,
            ['-e', 'process.stdin.on("end", () => process.stdout.write("eof")); process.stdin.resume()'],
            { ...base, timeoutMs: 3000 },
        );

        expect(result.timedOut).toBe(false);
        expect(result.stdout).toBe('eof');
    });

    /*
     * The Java agent retransforms JDK classes before user code runs — cheap on an idle
     * machine, seconds on a loaded one. Charging that to `timeoutMs` made finite programs
     * report an infinite loop, so the clock starts at the marker instead.
     */
    describe('readyMarker', () => {
        it('does not charge startup time to the timeout', async () => {
            // 600ms of "startup", then the marker, then 200ms of "work" — under a 400ms
            // budget that only fits if the clock restarts at the marker.
            const script = `
                setTimeout(() => {
                    process.stderr.write("[VisualizerAgent] Agent installed\\n");
                    setTimeout(() => process.stdout.write("done"), 200);
                }, 600);
            `;
            const result = await spawnCapture(process.execPath, ['-e', script], {
                ...base,
                timeoutMs: 400,
                readyMarker: '[VisualizerAgent] Agent installed',
                readyTimeoutMs: 5000,
            });

            expect(result.timedOut).toBe(false);
            expect(result.ready).toBe(true);
            expect(result.stdout).toBe('done');
        });

        it('still enforces the timeout on work done after the marker', async () => {
            const script = `
                process.stderr.write("ready\\n");
                setInterval(() => {}, 1000);
            `;
            const result = await spawnCapture(process.execPath, ['-e', script], {
                ...base,
                timeoutMs: 400,
                readyMarker: 'ready',
                readyTimeoutMs: 10_000,
            });

            expect(result.timedOut).toBe(true);
            // `ready` is what tells the runner to blame the program rather than startup.
            expect(result.ready).toBe(true);
        });

        it('bounds a process that never reaches the marker', async () => {
            const result = await spawnCapture(
                process.execPath,
                ['-e', 'setInterval(() => {}, 1000)'],
                { ...base, timeoutMs: 60_000, readyMarker: 'never printed', readyTimeoutMs: 400 },
            );

            expect(result.timedOut).toBe(true);
            expect(result.ready).toBe(false);
        });

        it('finds a marker split across two chunks', async () => {
            // Two writes with a tick between them: the marker spans the chunk boundary,
            // which a naive per-chunk `includes` would miss.
            const script = `
                process.stderr.write("[VisualizerAgent] Agent ins");
                setTimeout(() => {
                    process.stderr.write("talled\\n");
                    setTimeout(() => process.stdout.write("done"), 200);
                }, 500);
            `;
            const result = await spawnCapture(process.execPath, ['-e', script], {
                ...base,
                timeoutMs: 400,
                readyMarker: '[VisualizerAgent] Agent installed',
                readyTimeoutMs: 5000,
            });

            expect(result.ready).toBe(true);
            expect(result.timedOut).toBe(false);
            expect(result.stdout).toBe('done');
        });

        it('reports ready for a run with no marker requested', async () => {
            const result = await spawnCapture(process.execPath, ['-e', ''], base);
            expect(result.ready).toBe(true);
        });
    });

    it('rejects when the command does not exist', async () => {
        await expect(
            spawnCapture('algoflow-definitely-not-a-real-binary', [], base),
        ).rejects.toThrow();
    });
});
