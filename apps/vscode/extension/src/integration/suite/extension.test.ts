import * as assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import type { AlgoFlowApi } from '../../extension';

const EXTENSION_ID = 'algoflow.algoflow-vscode';

/** Every command the manifest contributes; activation must register all of them. */
const CONTRIBUTED_COMMANDS = [
    'algoflow.visualize',
    'algoflow.stepForward',
    'algoflow.stepBackward',
    'algoflow.playPause',
    'algoflow.reset',
    'algoflow.openPanel',
    'algoflow.buildJavaEngine',
    'algoflow.revealScratchDir',
    'algoflow.loadFixture',
];

async function activate(): Promise<AlgoFlowApi> {
    const extension = vscode.extensions.getExtension<AlgoFlowApi>(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is not installed in this instance.`);
    return extension.isActive ? extension.exports : await extension.activate();
}

function repoRoot(): string {
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, 'The test instance was launched without a workspace folder.');
    return folder.uri.fsPath;
}

suite('activation', () => {
    test('registers every contributed command', async () => {
        await activate();
        const registered = new Set(await vscode.commands.getCommands(true));
        for (const command of CONTRIBUTED_COMMANDS) {
            assert.ok(registered.has(command), `${command} was not registered.`);
        }
    });
});

suite('visualize', () => {
    test('produces a run bound to the open document, and opens the panel', async () => {
        const root = repoRoot();
        const jar = join(root, 'packages/java/engine/target/algo-transformer-1.0-SNAPSHOT.jar');
        if (!existsSync(jar)) {
            // Skipping loudly: a silent pass here would be worse than no test.
            console.warn(`skipping: build the Java engine first (${jar} is missing).`);
            return;
        }

        const api = await activate();
        const fixture = vscode.Uri.file(
            join(root, 'packages/java/engine/src/test/snapshot/examples/binary_search.java'),
        );
        const document = await vscode.workspace.openTextDocument(fixture);
        await vscode.window.showTextDocument(document);

        await vscode.commands.executeCommand('algoflow.visualize');

        const run = api.activeRun;
        assert.ok(run, 'No active run after visualize — the trace did not load.');
        assert.equal(run.uri.toString(), document.uri.toString());
        assert.equal(run.language, 'java');
        // The normalizer must not move lines, or the editor highlight lands off by two.
        assert.equal(run.lineMap.toUser(11), 11);

        const webviewTabs = vscode.window.tabGroups.all
            .flatMap(group => group.tabs)
            .filter(tab => tab.input instanceof vscode.TabInputWebview);
        assert.ok(webviewTabs.length > 0, 'The visualizer panel did not open.');
    });

    test('editing the document invalidates the highlight', async () => {
        const api = await activate();
        if (!api.activeRun) {
            console.warn('skipping: the previous test did not leave a run to invalidate.');
            return;
        }

        const uri = api.activeRun.uri;
        const invalidated = new Promise<void>(resolvePromise => {
            const subscription = api.onDidChangeActiveRun(run => {
                if (!run) {
                    subscription.dispose();
                    resolvePromise();
                }
            });
        });

        const edit = new vscode.WorkspaceEdit();
        edit.insert(uri, new vscode.Position(0, 0), '// touched by the integration test\n');
        await vscode.workspace.applyEdit(edit);

        await invalidated;
        assert.equal(api.activeRun, undefined);

        // Leave the fixture as it was found.
        await vscode.commands.executeCommand('undo');
    });
});
