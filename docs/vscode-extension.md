# The VS Code extension

`apps/vscode/extension` (`algoflow-vscode`) brings the AlgoFlow visualizer into the editor. This document is about how it is built; [its README](../apps/vscode/extension/README.md) is about using it.

## Shape

```
apps/vscode/extension/
  src/                  extension host — Node, no DOM
    extension.ts        activation, commands, context keys
    RunController.ts    editor -> runner -> panel
    VisualizerPanel.ts  the webview, its HTML and CSP
    DecorationController.ts
    StatusBar.ts
    protocol.ts         the only file both builds compile
    exec/               engine invocation; no vscode imports
    toolchain/          jdk.ts / python.ts validate, resolve.ts gathers candidates
    completions/
    dev/fixtures.ts     golden traces, for development
  webview/              React + the shared visualizer — browser
  scripts/bundle-engines.mjs
  engine/               bundled engines (gitignored, produced by prepackage)
  media/webview/        built webview bundle (gitignored)
```

Two builds, two tsconfigs:

| | Entry | Bundler | Output |
|---|---|---|---|
| Host | `src/extension.ts` | esbuild, CJS, node20, `external: ['vscode']` | `dist/extension.js` |
| Webview | `webview/main.tsx` | Vite, IIFE lib mode | `media/webview/webview.{js,css}` |

`npm run typecheck` runs three configs: `tsconfig.json` (host — `lib` omits DOM on purpose, so a stray `window` in host code is a compile error), `tsconfig.webview.json`, and `tsconfig.test.json` (tests need DOM because they drive the real `SimpleEngine`).

## Rules that are load-bearing

**`src/exec/**` and `src/toolchain/jdk.ts`/`python.ts` must not import `vscode`.** They take plain values, which is what makes them unit-testable outside an extension host. `src/toolchain/resolve.ts` is where VS Code enters the picture.

**`src/protocol.ts` must stay import-free.** It is compiled by both tsconfigs; an import of the visualizer's types would drag DOM types into the host build. `TraceCommand` therefore mirrors `Command` structurally rather than importing it.

**Vite lib mode does not inject `process.env.NODE_ENV`.** `vite.webview.config.ts` defines it explicitly. Without that, React's development build ships and `process is not defined` throws as soon as the webview loads.

**`ALGORITHM_VISUALIZER=true` on every traced JVM.** Unset, the upstream tracers-java `Commander` installs a shutdown hook that POSTs the trace to `algorithm-visualizer.org` and opens a browser tab. This is a privacy control, and `src/test/javaRunner.args.test.ts` asserts it.

**Playback state lives in the webview.** `visualizerEngine` in `@algoflow/visualizer` already *is* that state. The host contributes commands and mirrors the cursor; it does not clock playback. Consequently the host ships raw `Command[]` and never interpreted layout state, which contains `Set`s and `Map`s that `postMessage`'s structured clone would mangle.

## The Java line problem

The trace's line numbers come from `StackWalker` on the *compiled* class, but the decoration lands in the user's untouched document. The tracing agent only instruments classes under `com.algoflow.runner`, so the source must be rewritten — and a rewrite that moves lines would need an offset table.

`src/exec/javaNormalize.ts` avoids the offset entirely: it blanks the existing `package …;` span with spaces of equal length (keeping the newlines inside it, so both line count and columns survive) and prefixes line 1 with `package com.algoflow.runner; ` and no newline. `LineMap.toUser`/`toNormalized` are the identity; only `col1Delta` is non-zero, for `javac` diagnostics on line 1.

The scan is a state machine, not a regex. The backend's `replaceFirst("^\\s*package…")` only matches when `package` is the very first token, so a file with a license header above its package declaration ends up with two package declarations and a compile error. `src/test/javaNormalize.test.ts` covers that case and ten others.

## The execution timeout does not start at spawn

Installing the tracing agent takes a fixed stretch before the user's `main` runs: it retransforms ~50 already-loaded `java.util` classes plus `PrintStream` (`VisualizerAgent.java:134-223`). On an idle Apple silicon Mac that is cheap — `System.out.println("hi")` takes 0.65 s under the agent against 0.04 s without it, and `binary_search.java` runs end to end in 0.73 s, `n_queens.java` in 1.5 s.

It is also the part of a run that degrades worst, because it is CPU-bound and the user cannot make it smaller. Measured on the *same* machine while a build and a test suite were running, every one of those numbers grew by 6-10x: hello-world under the agent hit 3.7-6.0 s, `binary_search` 7.3 s, `n_queens` 9.4 s. Against the old single 10 s budget that is a timeout on a finite program, reported as an infinite loop.

(If you are re-measuring any of this: do it on an idle machine, and do not trust a number taken while the repo is building. The first version of these figures was collected that way and was wrong by an order of magnitude.)

So `spawnCapture` takes a `readyMarker`, and `javaRunner` passes the agent's last startup line (`AGENT_READY_MARKER`, `[VisualizerAgent] Agent installed`, printed after `installOn` returns). Until the marker appears, `readyTimeoutMs` applies — 60 s, bounded separately so a JVM that never initializes still dies; after it, `timeoutMs` measures the user's program alone. `SpawnResult.ready` distinguishes the two, so "the agent never installed" and "your program is looping" are different messages.

Two things to know if you touch this:

- **The marker is a log line, so it is a coupling.** `src/test/javaRunner.args.test.ts` asserts the constant still appears verbatim in `VisualizerAgent.java`. Rename the line without that test and every Java run silently waits out the 60 s install budget instead.
- **Marker detection spans chunk boundaries.** stderr arrives in arbitrary pieces, so `spawnCapture` keeps a `marker.length - 1` tail between chunks; there is a test that splits the marker in two.

Python gets no marker: its engine has no comparable startup, so the whole budget is already the program's.

## Bugs deliberately not ported from the backend

`apps/api/backend/.../ExecutionController.java` is the spec for `src/exec/`, with three exceptions:

1. It calls `waitFor()` before draining stdout/stderr, so any trace larger than the pipe buffer (~64 KB) deadlocks and is misreported as an infinite loop. `spawnCapture.ts` attaches `'data'` handlers before any await and resolves on `'close'`. Two tests pin this: a 4 MB synthetic write, and the real `n_queens.py` trace at ~636 KB.
2. It hardcodes `:` as the classpath separator. `runArgs` uses `path.delimiter`.
3. `destroyForcibly()` leaks grandchildren. `spawnCapture` spawns `detached` on POSIX and kills the process group, and uses `taskkill /T /F` on Windows.

## Working on it

```bash
npm install                                  # from the repo root
npm run build -w algoflow-vscode
code apps/vscode/extension                   # then F5
```

**AlgoFlow: Load Golden Trace** replays a recorded trace from `packages/{java,python}/engine/.../snapshots` and needs neither a JDK nor Python — the fastest way to work on the webview. It only appears inside the monorepo (`algoflow.inMonorepo`).

`npm run watch` rebuilds the host; `npm run watch:webview` rebuilds the webview. Reload the extension host window after a host change; reload the webview (Developer: Reload Webviews) after a webview change.

### Tests

```bash
npm test -w algoflow-vscode        # unit + end-to-end, ~1.5s
npm run typecheck -w algoflow-vscode
```

`src/test/e2e.engines.test.ts` runs the real engines and asserts every highlighted line falls inside the user's file and that the first one is a real statement rather than the `package`/`import` block. It skips itself when the jar or `python3` is missing, so a fresh clone still gets a green suite — but it is the test that actually proves the feature, so build the Java engine (`mvn -q clean install` in `packages/java/engine`) before trusting a pass.

```bash
npm run test:integration -w algoflow-vscode    # downloads a VS Code build on first run
```

The integration suite is opt-in and not part of `npm test`: it downloads ~300 MB into `.vscode-test/` and needs a JDK. It launches a real extension host over the repo root and checks that every contributed command is registered, that `algoflow.visualize` on `binary_search.java` yields an `ActiveRun` bound to the open document with an identity `lineMap` and an open webview tab, and that editing the document invalidates the run.

Two things about the harness are easy to break:

- **`@vscode/test-electron` must be 3.x.** VS Code 1.110+ renamed the macOS launcher from `Contents/MacOS/Electron` to the product name, so 2.x resolves a path that no longer exists and fails with `spawn … /Contents/MacOS/Electron ENOENT`.
- **Mocha's TDD globals must exist before the test module evaluates.** The suite is bundled into one file, so `src/integration/suite/index.ts` emits `EVENT_FILE_PRE_REQUIRE` on `mocha.suite` and then `require`s the test module, instead of importing it at the top. `ui` is `'tdd'` to match the `suite`/`test` style.

### Packaging

```bash
npm run package -w algoflow-vscode
```

`prepackage` builds both bundles and runs `scripts/bundle-engines.mjs`, which copies the shaded jar to `engine/algo-transformer.jar` and the Python engine (`engine/` plus `algorithm_visualizer/`, minus `__pycache__` and tests) to `engine/python/`. It refuses a jar under 1 MB, since that would mean the pre-shade artifact was picked up.

It also copies `LICENSE`, `NOTICE` and `THIRD-PARTY-NOTICES.md` in from the repo root, and the extension's `.gitignore` ignores those copies. **This is not cosmetic.** The shaded jar redistributes tracers.java (MIT), Byte Buddy and Gson to every user who installs the extension, so their license texts have to travel inside the `.vsix`. Keeping one copy at the root and treating the extension's as a build artifact is what stops the two from drifting.

`media/icon.png` is committed, not generated at build time. `scripts/make-icon.py` redraws it from the visualizer's own theme colors; run it only to change the artwork.

### Publishing

```bash
npm run package -w algoflow-vscode          # produces the .vsix
npx vsce publish --no-dependencies -p "$VSCE_PAT"
```

The publisher is `vish-chan`. Publishing needs that publisher registered on the Marketplace and an Azure DevOps personal access token scoped to **Marketplace → Manage**; `vsce login vish-chan` stores it if you would rather not pass `-p`.

A published version number can never be reused — only unpublished — so bump `version` in `package.json` and add a matching `CHANGELOG.md` heading in the same commit as the release.

Note that `"private": true` stays in the manifest. `vsce` never reads that field; it is there to make an accidental `npm publish` fail.
