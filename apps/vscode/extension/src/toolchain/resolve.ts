import * as vscode from 'vscode';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { findMonorepoRoot } from '../monorepo';
import { isJdk, MIN_JAVA_VERSION, validateJdk, type Jdk, type JdkRejection } from './jdk';
import { isPython, PATH_CANDIDATES, validatePython, type Python, type PythonRejection } from './python';

// Candidate gathering lives here because it reads settings and other extensions' APIs;
// the validation it delegates to is vscode-free and unit-tested.

export type Toolchain = {
    jdk: Jdk;
    engineJarPath: string;
};

export type PythonToolchain = {
    python: Python;
    engineDir: string;
};

export class ToolchainError extends Error {
    constructor(
        message: string,
        /** Offered to the user as a button. */
        readonly action?: { title: string; run: () => unknown },
    ) {
        super(message);
        this.name = 'ToolchainError';
    }
}

let cachedJdk: Jdk | undefined;
let cachedPython: Python | undefined;

/** Discovery runs subprocesses, so results are memoized until something changes. */
export function registerToolchainInvalidation(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(event => {
            if (event.affectsConfiguration('algoflow') || event.affectsConfiguration('java')) {
                cachedJdk = undefined;
                cachedPython = undefined;
            }
        }),
    );

    // A venv or conda switch changes the interpreter under us.
    void pythonExtensionApi().then(api => {
        const onChange = api?.environments?.onDidChangeActiveEnvironmentPath;
        if (typeof onChange === 'function') {
            context.subscriptions.push(onChange(() => (cachedPython = undefined)));
        }
    });
}

function config() {
    return vscode.workspace.getConfiguration('algoflow');
}

function openSettings(query: string) {
    return {
        title: 'Open Settings',
        run: () => vscode.commands.executeCommand('workbench.action.openSettings', query),
    };
}

/* ------------------------------------------------------------------ JDK ------ */

export async function resolveJdk(): Promise<Jdk> {
    if (cachedJdk) return cachedJdk;

    const rejections: JdkRejection[] = [];
    for (const home of jdkCandidates()) {
        const result = await validateJdk(home);
        if (isJdk(result)) {
            cachedJdk = result;
            return result;
        }
        rejections.push(result);
    }

    const jreOnly = rejections.find(r => r.reason === 'javac-missing');
    if (jreOnly) {
        throw new ToolchainError(
            `AlgoFlow needs a full JDK ${MIN_JAVA_VERSION}+, not a JRE: ${jreOnly.detail}`,
            openSettings('algoflow.java.home'),
        );
    }
    const tooOld = rejections.find(r => r.reason === 'too-old');
    if (tooOld) {
        throw new ToolchainError(tooOld.detail, openSettings('algoflow.java.home'));
    }
    throw new ToolchainError(
        `No JDK ${MIN_JAVA_VERSION}+ found. Set algoflow.java.home, or put javac on your PATH.`,
        openSettings('algoflow.java.home'),
    );
}

/** First hit wins: explicit setting, then the Java extension's, then the environment. */
function jdkCandidates(): (string | undefined)[] {
    const candidates: (string | undefined)[] = [];
    const push = (value: unknown) => {
        if (typeof value === 'string' && value.trim() !== '') candidates.push(value);
    };

    push(config().get<string>('java.home'));

    const java = vscode.workspace.getConfiguration('java');
    push(java.get<string>('jdt.ls.java.home'));

    // redhat.java's runtimes: prefer the one marked default, else the newest.
    const runtimes = java.get<{ name?: string; path?: string; default?: boolean }[]>(
        'configuration.runtimes',
        [],
    );
    const byVersion = [...runtimes].sort(
        (a, b) => runtimeVersion(b.name) - runtimeVersion(a.name),
    );
    push(runtimes.find(r => r.default)?.path);
    for (const runtime of byVersion) {
        if (runtimeVersion(runtime.name) >= MIN_JAVA_VERSION) push(runtime.path);
    }

    push(process.env.JAVA_HOME);

    // `undefined` means "whatever is on PATH", always worth a try last.
    candidates.push(undefined);
    return dedupe(candidates);
}

/** `JavaSE-21` -> 21. */
function runtimeVersion(name: string | undefined): number {
    const match = /(\d+)/.exec(name ?? '');
    return match ? Number(match[1]) : 0;
}

/* -------------------------------------------------------------- Java engine -- */

const JAR_NAME = 'algo-transformer.jar';
const MONOREPO_JAR_DIR = join('packages', 'java', 'engine', 'target');

export async function resolveJavaEngine(context: vscode.ExtensionContext): Promise<string> {
    const configured = config().get<string>('java.enginePath');
    if (configured && configured.trim() !== '') {
        if (!existsSync(configured)) {
            throw new ToolchainError(
                `algoflow.java.enginePath points at ${configured}, which does not exist.`,
                openSettings('algoflow.java.enginePath'),
            );
        }
        return configured;
    }

    const bundled = join(context.extensionUri.fsPath, 'engine', JAR_NAME);
    if (existsSync(bundled)) return bundled;

    const root = monorepoRoot(context);
    if (root) {
        const built = findBuiltJar(join(root, MONOREPO_JAR_DIR));
        if (built) return built;

        // The normal state of a fresh clone: target/ is gitignored.
        throw new ToolchainError(
            'The Java engine has not been built yet.',
            {
                title: 'Build it now (~1 min)',
                run: () => buildJavaEngine(root),
            },
        );
    }

    throw new ToolchainError(
        `Could not find ${JAR_NAME}. Set algoflow.java.enginePath to a built engine jar.`,
        openSettings('algoflow.java.enginePath'),
    );
}

/** The Maven build stamps a version into the name, so match on the prefix. */
function findBuiltJar(targetDir: string): string | undefined {
    let entries: string[];
    try {
        entries = readdirSync(targetDir);
    } catch {
        return undefined;
    }
    const jar = entries
        .filter(e => e.startsWith('algo-transformer') && e.endsWith('.jar'))
        .filter(e => !e.endsWith('-sources.jar') && !e.endsWith('-javadoc.jar'))
        .sort()
        .at(-1);
    return jar ? join(targetDir, jar) : undefined;
}

export async function buildJavaEngine(monorepoRoot: string): Promise<void> {
    const task = new vscode.Task(
        { type: 'algoflow', task: 'build-engine' },
        vscode.TaskScope.Workspace,
        'Build AlgoFlow Java engine',
        'AlgoFlow',
        new vscode.ShellExecution('mvn -q clean install', {
            cwd: join(monorepoRoot, 'packages', 'java', 'engine'),
        }),
    );
    await vscode.tasks.executeTask(task);
}

/* ----------------------------------------------------------------- Python ---- */

export async function resolvePython(resource?: vscode.Uri): Promise<Python> {
    if (cachedPython) return cachedPython;

    const rejections: PythonRejection[] = [];
    for (const command of await pythonCandidates(resource)) {
        const result = await validatePython(command);
        if (isPython(result)) {
            cachedPython = result;
            return result;
        }
        rejections.push(result);
    }

    const tooOld = rejections.find(r => r.reason === 'too-old');
    throw new ToolchainError(
        tooOld?.detail ?? 'No Python 3.10+ interpreter found. Set algoflow.python.interpreterPath.',
        openSettings('algoflow.python.interpreterPath'),
    );
}

/**
 * The Python extension's active environment comes first: it is what makes venvs,
 * conda environments and pyenv shims work without any AlgoFlow-specific setup.
 */
async function pythonCandidates(resource?: vscode.Uri): Promise<string[]> {
    const candidates: string[] = [];

    const api = await pythonExtensionApi();
    const environments = api?.environments;
    if (environments) {
        try {
            const active = environments.getActiveEnvironmentPath(resource);
            const resolved = active ? await environments.resolveEnvironment(active) : undefined;
            const executable = resolved?.executable?.uri?.fsPath ?? active?.path;
            if (typeof executable === 'string' && executable !== '') candidates.push(executable);
        } catch {
            // Older API shape, or no environment selected yet.
        }
    }

    const configured = config().get<string>('python.interpreterPath');
    if (configured && configured.trim() !== '') candidates.push(configured);

    candidates.push(...PATH_CANDIDATES);
    return dedupe(candidates);
}

type PythonEnvironmentsApi = {
    environments?: {
        getActiveEnvironmentPath(resource?: vscode.Uri): { path?: string } | undefined;
        resolveEnvironment(path: unknown): Promise<{ executable?: { uri?: vscode.Uri } } | undefined>;
        onDidChangeActiveEnvironmentPath?: vscode.Event<unknown>;
    };
};

async function pythonExtensionApi(): Promise<PythonEnvironmentsApi | undefined> {
    const extension = vscode.extensions.getExtension<PythonEnvironmentsApi>('ms-python.python');
    if (!extension) return undefined;
    if (!extension.isActive) {
        try {
            await extension.activate();
        } catch {
            return undefined;
        }
    }
    return extension.exports;
}

const MONOREPO_PYTHON_ENGINE = join('packages', 'python', 'engine');

export function resolvePythonEngine(context: vscode.ExtensionContext): string {
    const configured = config().get<string>('python.enginePath');
    if (configured && configured.trim() !== '') {
        if (!existsSync(join(configured, 'engine', 'runner.py'))) {
            throw new ToolchainError(
                `algoflow.python.enginePath must contain engine/runner.py; ${configured} does not.`,
                openSettings('algoflow.python.enginePath'),
            );
        }
        return configured;
    }

    const bundled = join(context.extensionUri.fsPath, 'engine', 'python');
    if (existsSync(join(bundled, 'engine', 'runner.py'))) return bundled;

    const root = monorepoRoot(context);
    if (root) {
        const inRepo = join(root, MONOREPO_PYTHON_ENGINE);
        if (existsSync(join(inRepo, 'engine', 'runner.py'))) return inRepo;
    }

    throw new ToolchainError(
        'Could not find the Python engine. Set algoflow.python.enginePath.',
        openSettings('algoflow.python.enginePath'),
    );
}

/* ------------------------------------------------------------------ shared --- */

export function monorepoRoot(context: vscode.ExtensionContext): string | undefined {
    return findMonorepoRoot([
        context.extensionUri.fsPath,
        ...(vscode.workspace.workspaceFolders ?? []).map(folder => folder.uri.fsPath),
    ]);
}

function dedupe<T>(values: T[]): T[] {
    return [...new Set(values)];
}
