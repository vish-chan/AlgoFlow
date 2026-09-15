import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnCapture } from '../exec/spawnCapture';
import { tmpdir } from 'node:os';

/** `javac` is a subprocess, so a JRE is not enough — this is the minimum the agent needs. */
export const MIN_JAVA_VERSION = 21;

export type Jdk = {
    /** `undefined` when resolved from PATH rather than a JAVA_HOME-style directory. */
    home?: string;
    java: string;
    javac: string;
    majorVersion: number;
};

export type JdkRejection = {
    home?: string;
    reason: 'javac-missing' | 'java-missing' | 'not-runnable' | 'too-old';
    detail: string;
};

const exe = (name: string) => (process.platform === 'win32' ? `${name}.exe` : name);

/**
 * Validate a candidate JDK by running it, not by trusting its path.
 *
 * `home` undefined means "whatever is on PATH". A JRE is rejected explicitly rather
 * than failing later with an opaque compile error.
 */
export async function validateJdk(home?: string): Promise<Jdk | JdkRejection> {
    const java = home ? join(home, 'bin', exe('java')) : exe('java');
    const javac = home ? join(home, 'bin', exe('javac')) : exe('javac');

    if (home) {
        if (!existsSync(java)) {
            return { home, reason: 'java-missing', detail: `${java} does not exist.` };
        }
        if (!existsSync(javac)) {
            return {
                home,
                reason: 'javac-missing',
                detail: `${javac} does not exist — AlgoFlow needs a full JDK ${MIN_JAVA_VERSION}+, not a JRE.`,
            };
        }
    }

    let output: string;
    try {
        const result = await spawnCapture(javac, ['-version'], {
            cwd: tmpdir(),
            timeoutMs: 10_000,
            maxBytes: 64 * 1024,
        });
        // Java 8 wrote `javac -version` to stderr; 9+ writes it to stdout.
        output = `${result.stdout}${result.stderr}`.trim();
        if (result.code !== 0 && output === '') {
            return { home, reason: 'not-runnable', detail: `${javac} exited with ${result.code}.` };
        }
    } catch (error) {
        return {
            home,
            reason: 'not-runnable',
            detail: error instanceof Error ? error.message : String(error),
        };
    }

    const majorVersion = parseJavaMajorVersion(output);
    if (majorVersion === undefined) {
        return { home, reason: 'not-runnable', detail: `Could not read a version from "${output}".` };
    }
    if (majorVersion < MIN_JAVA_VERSION) {
        return {
            home,
            reason: 'too-old',
            detail: `Found Java ${majorVersion}; AlgoFlow needs ${MIN_JAVA_VERSION} or newer.`,
        };
    }

    return { home, java, javac, majorVersion };
}

export function isJdk(result: Jdk | JdkRejection): result is Jdk {
    return 'majorVersion' in result && 'javac' in result;
}

/** `javac 21.0.1` -> 21, and the legacy `javac 1.8.0_402` -> 8. */
export function parseJavaMajorVersion(versionOutput: string): number | undefined {
    const match = /(\d+)(?:\.(\d+))?/.exec(versionOutput);
    if (!match) return undefined;
    const first = Number(match[1]);
    if (first === 1 && match[2] !== undefined) return Number(match[2]);
    return first;
}
