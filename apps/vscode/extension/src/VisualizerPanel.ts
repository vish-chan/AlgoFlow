import * as vscode from 'vscode';
import { randomBytes } from 'node:crypto';
import type { HostToWebview, WebviewToHost } from './protocol';

export const VIEW_TYPE = 'algoflow.visualizer';

/**
 * The visualizer webview. One panel per window, revealed beside the editor.
 *
 * Playback state lives in the webview (see `visualizerEngine` in @algoflow/visualizer),
 * so the panel is created with `retainContextWhenHidden` — otherwise switching tabs
 * would silently reset the cursor to 0.
 */
export class VisualizerPanel {
    private static current: VisualizerPanel | undefined;

    private readonly disposables: vscode.Disposable[] = [];
    private readonly onMessageEmitter = new vscode.EventEmitter<WebviewToHost>();
    private readonly onDisposeEmitter = new vscode.EventEmitter<void>();

    /** Messages from the webview. */
    readonly onMessage = this.onMessageEmitter.event;
    /** Fires once, when the user closes the panel. */
    readonly onDispose = this.onDisposeEmitter.event;

    private constructor(
        private readonly panel: vscode.WebviewPanel,
        private readonly extensionUri: vscode.Uri,
    ) {
        this.panel.webview.html = this.render();

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
        this.panel.webview.onDidReceiveMessage(
            (message: WebviewToHost) => this.onMessageEmitter.fire(message),
            null,
            this.disposables,
        );
    }

    static get active(): VisualizerPanel | undefined {
        return VisualizerPanel.current;
    }

    /**
     * Reveal the panel, creating it if needed. `preserveFocus` keeps the caret in the
     * user's editor so the transport keybindings keep working without clicking back.
     */
    static createOrShow(extensionUri: vscode.Uri): VisualizerPanel {
        if (VisualizerPanel.current) {
            VisualizerPanel.current.panel.reveal(vscode.ViewColumn.Beside, true);
            return VisualizerPanel.current;
        }

        const panel = vscode.window.createWebviewPanel(
            VIEW_TYPE,
            'AlgoFlow',
            { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
            VisualizerPanel.options(extensionUri),
        );

        VisualizerPanel.current = new VisualizerPanel(panel, extensionUri);
        return VisualizerPanel.current;
    }

    /** Rehydrate a panel VS Code restored across a window reload. */
    static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri): VisualizerPanel {
        panel.webview.options = VisualizerPanel.options(extensionUri);
        VisualizerPanel.current?.dispose();
        VisualizerPanel.current = new VisualizerPanel(panel, extensionUri);
        return VisualizerPanel.current;
    }

    private static options(extensionUri: vscode.Uri): vscode.WebviewPanelOptions &
        vscode.WebviewOptions {
        return {
            enableScripts: true,
            // Playback state and SimpleEngine's replay-from-0 seek live in the webview.
            retainContextWhenHidden: true,
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        };
    }

    post(message: HostToWebview): void {
        void this.panel.webview.postMessage(message);
    }

    reveal(): void {
        this.panel.reveal(vscode.ViewColumn.Beside, true);
    }

    setTitle(title: string): void {
        this.panel.title = title;
    }

    dispose(): void {
        if (VisualizerPanel.current === this) {
            VisualizerPanel.current = undefined;
        }
        this.onDisposeEmitter.fire();

        this.panel.dispose();
        while (this.disposables.length) {
            this.disposables.pop()?.dispose();
        }
        this.onMessageEmitter.dispose();
        this.onDisposeEmitter.dispose();
    }

    private render(): string {
        const { webview } = this.panel;
        const media = vscode.Uri.joinPath(this.extensionUri, 'media', 'webview');
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(media, 'webview.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(media, 'webview.css'));
        const nonce = randomBytes(16).toString('base64');

        // 'unsafe-inline' for styles is required: VisualizerCanvas and the controls
        // inject <style> tags and use inline style objects. Scripts stay nonce-gated.
        const csp = [
            `default-src 'none'`,
            `img-src ${webview.cspSource} data: blob:`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `font-src ${webview.cspSource}`,
            `script-src 'nonce-${nonce}'`,
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="${styleUri}" rel="stylesheet">
<title>AlgoFlow</title>
</head>
<body>
<div id="root"></div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}
