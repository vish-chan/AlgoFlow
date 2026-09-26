import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import {
    AGENT_READY_MARKER,
    compileArgs,
    extractUserError,
    parseJavacDiagnostics,
    runArgs,
    runEnv,
} from '../exec/javaRunner';
import { normalizeToRunnerPackage } from '../exec/javaNormalize';

describe('AGENT_READY_MARKER', () => {
    /*
     * The execution timeout starts at this marker, so if the agent ever renames the line
     * the marker silently stops matching: every Java run would then wait out the much
     * longer install budget before reporting a timeout that never mentions the real cause.
     */
    it('matches the line the agent actually prints', () => {
        const agent = join(
            __dirname,
            '../../../../../packages/java/engine/src/main/java/com/algoflow/agent/VisualizerAgent.java',
        );
        if (!existsSync(agent)) {
            // Engine sources are absent from a packaged install; nothing to check against.
            return;
        }
        expect(readFileSync(agent, 'utf-8')).toContain(`println("${AGENT_READY_MARKER}")`);
    });

    it('is filtered out of user-visible errors', () => {
        expect(extractUserError(AGENT_READY_MARKER)).toBe('');
    });
});

describe('runEnv', () => {
    // Not a feature flag: without it the upstream Commander's shutdown hook uploads the
    // user's trace to algorithm-visualizer.org and opens a browser tab.
    it('always sets ALGORITHM_VISUALIZER, which suppresses the upstream trace upload', () => {
        expect(runEnv({}).ALGORITHM_VISUALIZER).toBe('true');
        expect(runEnv({ ALGORITHM_VISUALIZER: 'false' }).ALGORITHM_VISUALIZER).toBe('true');
    });

    it('inherits the rest of the environment', () => {
        expect(runEnv({ PATH: '/usr/bin' }).PATH).toBe('/usr/bin');
    });
});

describe('runArgs', () => {
    const args = runArgs('Solution', '/engine/algo-transformer.jar');

    it('loads the agent', () => {
        expect(args).toContain('-javaagent:/engine/algo-transformer.jar');
    });

    it('opens java.util to the agent', () => {
        expect(args).toContain('--add-opens');
        expect(args).toContain('java.base/java.util=ALL-UNNAMED');
    });

    it('runs the class from the instrumented runner package', () => {
        expect(args.at(-1)).toBe('com.algoflow.runner.Solution');
    });

    it('joins the classpath with the platform delimiter, not a hardcoded colon', () => {
        const classpath = args[args.indexOf('-cp') + 1];
        expect(classpath).toBe(['/engine/algo-transformer.jar', '.'].join(delimiter));
    });

    it('applies the configured VM args', () => {
        expect(runArgs('S', '/j.jar', ['-Xmx1g'])[0]).toBe('-Xmx1g');
    });
});

describe('compileArgs', () => {
    it('compiles into the scratch dir with debug info, which the trace needs for lines', () => {
        expect(compileArgs('Solution', '/engine/algo-transformer.jar')).toEqual([
            '-d', '.', '-cp', '/engine/algo-transformer.jar', '-g', 'Solution.java',
        ]);
    });
});

describe('extractUserError', () => {
    it('strips agent and JVM noise', () => {
        const stderr = [
            '[Byte Buddy] BEFORE_INSTALL',
            '[VisualizerAgent] instrumenting com.algoflow.runner.Main',
            'OpenJDK 64-Bit Server VM warning: whatever',
            'WARNING: A terminally deprecated method has been called',
            'Exception in thread "main" java.lang.NullPointerException',
            '\tat com.algoflow.runner.Main.main(Main.java:7)',
        ].join('\n');

        expect(extractUserError(stderr)).toBe(
            'Exception in thread "main" java.lang.NullPointerException\n\tat com.algoflow.runner.Main.main(Main.java:7)',
        );
    });

    it('returns empty for pure noise', () => {
        expect(extractUserError('[Byte Buddy] x\nWARNING: y\n')).toBe('');
    });
});

describe('parseJavacDiagnostics', () => {
    const { lineMap } = normalizeToRunnerPackage('public class Main {}\n');

    it('maps a diagnostic to the user line and column', () => {
        const stderr = [
            "Main.java:7: error: ';' expected",
            '        int x = 1',
            '                 ^',
            '1 error',
        ].join('\n');

        expect(parseJavacDiagnostics(stderr, 'Main', lineMap)).toEqual([
            { line: 7, column: 18, message: "';' expected" },
        ]);
    });

    it('subtracts the injected package prefix from line 1 columns only', () => {
        const column = 1 + lineMap.col1Delta + 6;
        const stderr = [
            'Main.java:1: error: bad thing',
            'x',
            `${' '.repeat(column - 1)}^`,
            '1 error',
        ].join('\n');

        expect(parseJavacDiagnostics(stderr, 'Main', lineMap)[0]).toEqual({
            line: 1,
            column: 7,
            message: 'bad thing',
        });
    });

    it('reports every diagnostic', () => {
        const stderr = [
            'Main.java:3: error: first',
            'code',
            '  ^',
            'Main.java:9: error: second',
            'code',
            '    ^',
            '2 errors',
        ].join('\n');

        expect(parseJavacDiagnostics(stderr, 'Main', lineMap).map(d => d.line)).toEqual([3, 9]);
    });

    it('ignores diagnostics about other files', () => {
        expect(parseJavacDiagnostics('Other.java:3: error: nope', 'Main', lineMap)).toEqual([]);
    });
});
