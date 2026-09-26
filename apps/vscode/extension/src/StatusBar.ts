import * as vscode from 'vscode';

/** `$(play) AlgoFlow` when idle, `12/340 · L47` during playback. */
export class StatusBar implements vscode.Disposable {
    private readonly item = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );

    constructor() {
        this.item.command = 'algoflow.visualize';
        this.idle();
    }

    idle(): void {
        this.item.text = '$(play) AlgoFlow';
        this.item.tooltip = 'Visualize this file (AlgoFlow)';
        this.item.show();
    }

    running(): void {
        this.item.text = '$(sync~spin) AlgoFlow';
        this.item.tooltip = 'Running…';
        this.item.show();
    }

    step(cursor: number, total: number, line: number | null): void {
        const at = line === null ? '' : ` · L${line}`;
        this.item.text = `$(debug-step-over) ${cursor + 1}/${total}${at}`;
        this.item.tooltip = 'AlgoFlow playback — click to re-run';
        this.item.show();
    }

    /** The highlight has stopped tracking because the document was edited. */
    stale(): void {
        this.item.text = '$(warning) AlgoFlow — source changed';
        this.item.tooltip = 'The file was edited since this trace was recorded. Re-run to re-sync.';
        this.item.show();
    }

    dispose(): void {
        this.item.dispose();
    }
}
