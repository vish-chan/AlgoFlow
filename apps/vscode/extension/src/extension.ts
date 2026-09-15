import * as vscode from 'vscode';
import { VIEW_TYPE, VisualizerPanel } from './VisualizerPanel';
import { findMonorepoRoot } from './monorepo';
import { listFixtures, readFixture, type Fixture } from './dev/fixtures';
import { RunController } from './RunController';
import { DecorationController } from './DecorationController';
import { StatusBar } from './StatusBar';
import { registerJavaAnnotationCompletions } from './completions/javaAnnotations';
import { buildJavaEngine, monorepoRoot as findRoot, registerToolchainInvalidation } from './toolchain/resolve';
import type { ActiveRun } from './RunController';
import type { TransportAction, WebviewToHost } from './protocol';

/**
 * Returned from `activate` for the integration tests.
 *
 * Deliberately read-only and minimal: whether a run succeeded and what it bound to is
 * not observable through the VS Code API (decorations cannot be read back), so the
 * extension has to say so itself.
 */
export type AlgoFlowApi = {
    readonly activeRun: ActiveRun | undefined;
    readonly onDidChangeActiveRun: vscode.Event<ActiveRun | undefined>;
};

function config() {
    return vscode.workspace.getConfiguration('algoflow');
}

async function pickFixture(monorepoRoot: string): Promise<Fixture | undefined> {
    const fixtures = listFixtures(monorepoRoot);
    if (fixtures.length === 0) {
        void vscode.window.showWarningMessage(`No golden traces found under ${monorepoRoot}.`);
        return undefined;
    }
    const picked = await vscode.window.showQuickPick(
        fixtures.map(fixture => ({ label: fixture.label, fixture })),
        { title: 'AlgoFlow: load a golden trace' },
    );
    return picked?.fixture;
}

export function activate(context: vscode.ExtensionContext): AlgoFlowApi {
    const monorepoRoot = findMonorepoRoot([
        context.extensionUri.fsPath,
        ...(vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath),
    ]);
    void vscode.commands.executeCommand('setContext', 'algoflow.inMonorepo', !!monorepoRoot);
    // Backs the `resourceLangId in algoflow.supportedLanguages` menu clauses.
    void vscode.commands.executeCommand('setContext', 'algoflow.supportedLanguages', [
        'java',
        'python',
    ]);
    registerToolchainInvalidation(context);

    const decorations = new DecorationController();
    const statusBar = new StatusBar();

    /** Gates the transport keybindings so `alt+arrow` is never shadowed while idle. */
    const setHasTrace = (value: boolean) =>
        void vscode.commands.executeCommand('setContext', 'algoflow.hasTrace', value);
    setHasTrace(false);

    // `createOrShow` returns the existing panel when there is one, so guard against
    // attaching a second set of listeners on every command invocation.
    const wired = new WeakSet<VisualizerPanel>();

    /** Attach the host's side of the protocol to a freshly created or revived panel. */
    function wire(panel: VisualizerPanel): VisualizerPanel {
        if (wired.has(panel)) return panel;
        wired.add(panel);

        const subscription = panel.onMessage((message: WebviewToHost) => {
            switch (message.type) {
                case 'ready':
                    panel.post({
                        type: 'init',
                        speedMs: config().get<number>('playback.speedMs', 500),
                        // Populated from the active color theme in a later milestone.
                        theme: {},
                    });
                    break;

                case 'step':
                    // The webview owns the cursor; the host only mirrors it.
                    decorations.show(message.runId, message.line);
                    statusBar.step(message.cursor, message.total, message.line);
                    break;

                case 'speedChanged':
                    void config().update(
                        'playback.speedMs',
                        message.speedMs,
                        vscode.ConfigurationTarget.Global,
                    );
                    break;

                case 'requestRun':
                    void vscode.commands.executeCommand('algoflow.visualize');
                    break;
            }
        });
        panel.onDispose(() => {
            subscription.dispose();
            decorations.setRun(undefined);
            setHasTrace(false);
            statusBar.idle();
        });
        return panel;
    }

    const runController = new RunController(context, wire);

    const transport = (action: TransportAction) => () => {
        VisualizerPanel.active?.post({ type: 'transport', action });
    };

    context.subscriptions.push(
        runController,
        decorations,
        statusBar,
        registerJavaAnnotationCompletions(),

        runController.onDidChangeBusy(busy => {
            if (busy) statusBar.running();
        }),

        runController.onDidChangeActiveRun(run => {
            decorations.setRun(run);
            setHasTrace(!!run);
            if (!run) statusBar.idle();
        }),

        vscode.commands.registerCommand('algoflow.visualize', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                void vscode.window.showWarningMessage('AlgoFlow: open a Java or Python file first.');
                return;
            }
            await runController.visualize(editor);
        }),

        vscode.commands.registerCommand('algoflow.stepForward', transport('stepForward')),
        vscode.commands.registerCommand('algoflow.stepBackward', transport('stepBackward')),
        vscode.commands.registerCommand('algoflow.playPause', transport('playPause')),
        vscode.commands.registerCommand('algoflow.reset', transport('reset')),

        // A trace recorded against older text would highlight lines that have moved, so
        // stop the highlight. Playback itself keeps working.
        vscode.workspace.onDidChangeTextDocument(event => {
            const active = runController.activeRun;
            if (active && event.document.uri.toString() === active.uri.toString()) {
                runController.invalidate();
                statusBar.stale();
            }
        }),

        vscode.commands.registerCommand('algoflow.openPanel', () => {
            wire(VisualizerPanel.createOrShow(context.extensionUri));
        }),

        vscode.commands.registerCommand('algoflow.buildJavaEngine', async () => {
            const root = findRoot(context);
            if (!root) {
                void vscode.window.showWarningMessage(
                    'AlgoFlow: the Java engine can only be built from the monorepo.',
                );
                return;
            }
            await buildJavaEngine(root);
        }),

        vscode.commands.registerCommand('algoflow.revealScratchDir', async () => {
            await vscode.commands.executeCommand(
                'revealFileInOS',
                vscode.Uri.joinPath(context.globalStorageUri, 'runs'),
            );
        }),

        vscode.commands.registerCommand('algoflow.loadFixture', async () => {
            if (!monorepoRoot) {
                void vscode.window.showWarningMessage(
                    'AlgoFlow: golden traces are only available when running from the monorepo.',
                );
                return;
            }
            const fixture = await pickFixture(monorepoRoot);
            if (!fixture) return;

            const panel = wire(VisualizerPanel.createOrShow(context.extensionUri));
            panel.setTitle(`AlgoFlow — ${fixture.label}`);
            const runId = runController.nextRunId();
            try {
                panel.post({
                    type: 'trace',
                    runId,
                    language: fixture.language,
                    commands: readFixture(fixture),
                    autoPlay: config().get<boolean>('playback.autoPlayOnRun', true),
                });
                // A fixture has no document behind it, so transport works but the
                // highlight has nothing to attach to.
                setHasTrace(true);
                decorations.setRun(undefined);
            } catch (error) {
                panel.post({
                    type: 'errorTrace',
                    runId,
                    message: error instanceof Error ? error.message : String(error),
                });
            }
        }),

        vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
            async deserializeWebviewPanel(panel: vscode.WebviewPanel) {
                wire(VisualizerPanel.revive(panel, context.extensionUri));
            },
        }),
    );

    return {
        get activeRun() {
            return runController.activeRun;
        },
        onDidChangeActiveRun: runController.onDidChangeActiveRun,
    };
}

export function deactivate(): void {
    VisualizerPanel.active?.dispose();
}
