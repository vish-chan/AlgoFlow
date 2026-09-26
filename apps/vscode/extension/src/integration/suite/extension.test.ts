import * as assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import * as vscode from 'vscode';
import type { AlgoFlowApi } from '../../extension';
import manifest from '../../../package.json';

/*
 * Derived, not hardcoded: `publisher` is the kind of field that changes once, at publish
 * time, and a stale literal here fails with "not installed" rather than pointing at the
 * rename.
 */
const EXTENSION_ID = `${manifest.publisher}.${manifest.name}`;

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

    test('editing the document pauses playback and invalidates the highlight', async () => {
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

        /*
         * Rewind before playing, or the pause assertion below passes vacuously: the previous
         * test's auto-play has likely reached the end of this short trace, and `play()` from
         * the end is a no-op — it flips `playing` true and straight back to false in the same
         * tick, because its first `engine.next()` returns false.
         */
        await vscode.commands.executeCommand('algoflow.reset');
        await vscode.commands.executeCommand('algoflow.playPause');
        for (let attempt = 0; attempt < 30 && !api.isPlaying; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal(api.isPlaying, true, 'precondition: playback should be running');

        const edit = new vscode.WorkspaceEdit();
        edit.insert(uri, new vscode.Position(0, 0), '// touched by the integration test\n');
        await vscode.workspace.applyEdit(edit);

        await invalidated;
        assert.equal(api.activeRun, undefined);

        /*
         * The pause is the webview's to perform, so it lands a round trip after the edit:
         * host posts `transport: pause`, webview stops its timer and reports `playState`.
         */
        for (let attempt = 0; attempt < 50 && api.isPlaying; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal(api.isPlaying, false, 'playback kept running against a stale highlight');

        /*
         * And again after a manual resume. This is the regression: the handler used to be
         * keyed on the active run, which the first edit clears, so a second edit reached a
         * handler that no longer had anything to compare against and playback ran on.
         */
        await vscode.commands.executeCommand('algoflow.reset');
        await vscode.commands.executeCommand('algoflow.playPause');
        for (let attempt = 0; attempt < 30 && !api.isPlaying; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal(api.isPlaying, true, 'precondition: playback should have resumed');

        const second = new vscode.WorkspaceEdit();
        second.insert(uri, new vscode.Position(0, 0), '// touched again\n');
        await vscode.workspace.applyEdit(second);

        for (let attempt = 0; attempt < 50 && api.isPlaying; attempt++) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        assert.equal(api.isPlaying, false, 'a second edit did not pause playback');

        // Leave the fixture as it was found.
        await vscode.commands.executeCommand('undo');
        await vscode.commands.executeCommand('undo');
    });
});
