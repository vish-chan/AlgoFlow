#!/usr/bin/env node
// Copies the Java and Python engines into `engine/` so they ship inside the .vsix.
//
// Runs as `prepackage`. The `algoflow.java.enginePath` / `algoflow.python.enginePath`
// settings remain the escape hatch for engine development; this is what a user who just
// installs the extension gets.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXTENSION_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
// extension -> vscode -> apps -> repo root
const REPO_ROOT = join(EXTENSION_DIR, '..', '..', '..');

const JAVA_ENGINE = join(REPO_ROOT, 'packages', 'java', 'engine');
const PYTHON_ENGINE = join(REPO_ROOT, 'packages', 'python', 'engine');
const OUT = join(EXTENSION_DIR, 'engine');

function fail(message) {
    console.error(`bundle-engines: ${message}`);
    process.exit(1);
}

/** The shade plugin also leaves `original-algo-transformer-*.jar`; that is not the fat jar. */
function findFatJar() {
    const target = join(JAVA_ENGINE, 'target');
    if (!existsSync(target)) return undefined;
    const jar = readdirSync(target)
        .filter(name => name.startsWith('algo-transformer') && name.endsWith('.jar'))
        .filter(name => !name.endsWith('-sources.jar') && !name.endsWith('-javadoc.jar'))
        .sort()
        .at(-1);
    return jar ? join(target, jar) : undefined;
}

function bundleJava() {
    let jar = findFatJar();
    if (!jar) {
        console.log('bundle-engines: no jar found, running mvn -q clean install…');
        execFileSync('mvn', ['-q', 'clean', 'install'], { cwd: JAVA_ENGINE, stdio: 'inherit' });
        jar = findFatJar();
    }
    if (!jar) fail(`could not find a built jar under ${join(JAVA_ENGINE, 'target')}.`);

    // A stale jar shipping silently would be worse than a build failure.
    const size = statSync(jar).size;
    if (size < 1_000_000) {
        fail(`${jar} is only ${size} bytes — that is not the shaded fat jar.`);
    }

    cpSync(jar, join(OUT, 'algo-transformer.jar'));
    console.log(`bundle-engines: java  ${(size / 1e6).toFixed(1)} MB from ${jar}`);
}

function bundlePython() {
    const dest = join(OUT, 'python');
    // `engine/` is the runner and rewriter; `algorithm_visualizer/` is the tracer library
    // the rewritten user code imports. `test/` is not shipped.
    for (const name of ['engine', 'algorithm_visualizer']) {
        const from = join(PYTHON_ENGINE, name);
        if (!existsSync(from)) fail(`${from} does not exist.`);
        cpSync(from, join(dest, name), {
            recursive: true,
            filter: source => !source.includes('__pycache__') && !source.endsWith('.pyc'),
        });
    }
    if (!existsSync(join(dest, 'engine', 'runner.py'))) {
        fail('engine/runner.py is missing from the copy.');
    }
    console.log(`bundle-engines: python -> ${dest}`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
bundleJava();
bundlePython();
