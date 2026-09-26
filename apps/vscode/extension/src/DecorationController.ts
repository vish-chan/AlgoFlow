import * as vscode from 'vscode';
import type { ActiveRun } from './RunController';

/**
 * Highlights the trace's current line in the user's real document.
 *
 * Colors are `ThemeColor` references, never literals: the web app's
 * `rgba(255,213,79,0.15)` is invisible on Light+, and a hardcoded color would also
 * ignore the user's own theme customizations.
 */
export class DecorationController implements vscode.Disposable {
    private readonly decoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        backgroundColor: new vscode.ThemeColor('editor.rangeHighlightBackground'),
        overviewRulerColor: new vscode.ThemeColor(
            'editorOverviewRuler.rangeHighlightForeground',
        ),
        overviewRulerLane: vscode.OverviewRulerLane.Full,
    });

    private run: ActiveRun | undefined;
    /** Last line drawn, so a 340-step trace does not cause 340 `setDecorations` calls. */
    private lastLine: number | null = null;

    private readonly disposables: vscode.Disposable[] = [];

    constructor() {
        // A trace can outlive the editor it was run from: redraw when it comes back.
        this.disposables.push(
            vscode.window.onDidChangeVisibleTextEditors(() => this.redraw()),
        );
    }

    setRun(run: ActiveRun | undefined): void {
        this.run = run;
        this.lastLine = null;
        if (!run) this.clear();
    }

    /**
     * `line` is 1-based and comes from the trace; `null` means the step has no source
     * line (layout commands do not). Returns whether anything was redrawn.
     */
    show(runId: number, line: number | null): boolean {
        if (!this.run || this.run.runId !== runId) return false;
        if (!this.enabled) {
            this.clear();
            return false;
        }
        if (line === this.lastLine) return false;
        this.lastLine = line;

        if (line === null) {
            this.clear();
            return false;
        }
        return this.redraw();
    }

    private redraw(): boolean {
        const run = this.run;
        const line = this.lastLine;
        if (!run || line === null || !this.enabled) return false;

        const editors = vscode.window.visibleTextEditors.filter(
            editor => editor.document.uri.toString() === run.uri.toString(),
        );
        if (editors.length === 0) return false;

        for (const editor of editors) {
            // The document may have shrunk since the run; clamp rather than throw.
            const index = Math.min(Math.max(line - 1, 0), Math.max(editor.document.lineCount - 1, 0));
            const range = editor.document.lineAt(index).range;
            editor.setDecorations(this.decoration, [range]);

            if (this.followCursor) {
                editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            }
        }
        return true;
    }

    clear(): void {
        for (const editor of vscode.window.visibleTextEditors) {
            editor.setDecorations(this.decoration, []);
        }
    }

    private get enabled(): boolean {
        return vscode.workspace.getConfiguration('algoflow').get<boolean>('highlight.enabled', true);
    }

    private get followCursor(): boolean {
        return vscode.workspace
            .getConfiguration('algoflow')
            .get<boolean>('highlight.followCursor', true);
    }

    dispose(): void {
        this.clear();
        this.decoration.dispose();
        while (this.disposables.length) this.disposables.pop()?.dispose();
    }
}
