import * as vscode from 'vscode';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { rmSync } from 'node:fs';
import { runJava, type JavaDiagnostic } from './exec/javaRunner';
import { runPython } from './exec/pythonRunner';
import type { LineMap } from './exec/javaNormalize';
import { VisualizerPanel } from './VisualizerPanel';
import type { Language, TraceCommand } from './protocol';
import {
    resolveJavaEngine,
    resolveJdk,
    resolvePython,
    resolvePythonEngine,
    ToolchainError,
} from './toolchain/resolve';

/** What the panel is currently showing, so decorations know which document to mark. */
export type ActiveRun = {
    runId: number;
    uri: vscode.Uri;
    /** Document version at run start; a later version means the highlight is lying. */
    version: number;
    language: Language;
    lineMap: LineMap;
};

/** Python is run as written: no package rewrite, so no columns are added either. */
const PYTHON_LINE_MAP: LineMap = {
    toUser: line => line,
    toNormalized: line => line,
    col1Delta: 0,
};

export function isSupported(languageId: string): languageId is Language {
    return languageId === 'java' || languageId === 'python';
}

export class RunController implements vscode.Disposable {
    private runIdCounter = 0;
    private running = false;
    private readonly diagnostics = vscode.languages.createDiagnosticCollection('algoflow');
    private readonly changed = new vscode.EventEmitter<ActiveRun | undefined>();
    private readonly busyChanged = new vscode.EventEmitter<boolean>();

    /** Fires when a run finishes or is invalidated. */
    readonly onDidChangeActiveRun = this.changed.event;
    /** Fires `true` when execution starts and `false` when it settles. */
    readonly onDidChangeBusy = this.busyChanged.event;

    private active: ActiveRun | undefined;

    /**
     * The document the loaded trace was recorded from, which outlives `active`.
     *
     * `invalidate` drops `active` on the first edit, so anything keyed on `active` stops
     * reacting to the second one — that is how editing used to pause playback once and
     * then never again after a manual resume.
     */
    private traced: vscode.Uri | undefined;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly wire: (panel: VisualizerPanel) => VisualizerPanel,
    ) {}

    get activeRun(): ActiveRun | undefined {
        return this.active;
    }

    /** The document behind the trace in the panel, whether or not it is still in sync. */
    get tracedUri(): vscode.Uri | undefined {
        return this.traced;
    }

    /** Called when the traced document is edited: the highlight can no longer be trusted. */
    invalidate(): void {
        if (!this.active) return;
        this.active = undefined;
        this.changed.fire(undefined);
    }

    /**
     * Called when the panel stops showing a document's trace — it was closed, or a fixture
     * replaced it. Editing the old document must not then reach into unrelated playback.
     */
    forget(): void {
        this.traced = undefined;
        this.invalidate();
    }

    nextRunId(): number {
        return ++this.runIdCounter;
    }

    async visualize(editor: vscode.TextEditor): Promise<void> {
        const document = editor.document;
        if (!isSupported(document.languageId)) {
            void vscode.window.showWarningMessage(
                'AlgoFlow can visualize Java and Python files. This file is neither.',
            );
            return;
        }
        if (this.running) {
            void vscode.window.showInformationMessage('AlgoFlow is already running a trace.');
            return;
        }

        const language = document.languageId;
        const runId = this.nextRunId();
        const panel = this.wire(VisualizerPanel.createOrShow(this.context.extensionUri));
        panel.setTitle(`AlgoFlow — ${basename(document.uri)}`);
        panel.post({ type: 'status', phase: 'running', text: 'Executing…' });

        this.running = true;
        this.busyChanged.fire(true);
        this.diagnostics.delete(document.uri);
        try {
            const result = await this.run(document, language);

            if (result.ok) {
                this.traced = document.uri;
                this.active = {
                    runId,
                    uri: document.uri,
                    version: document.version,
                    language,
                    lineMap: result.lineMap,
                };
                this.changed.fire(this.active);
                panel.post({
                    type: 'trace',
                    runId,
                    language,
                    commands: result.commands,
                    autoPlay: this.setting<boolean>('playback.autoPlayOnRun', true),
                });
                if (result.warning) void vscode.window.showWarningMessage(`AlgoFlow: ${result.warning}`);
                return;
            }

            // The panel now shows an error, not this document's trace.
            this.traced = undefined;
            this.active = undefined;
            this.changed.fire(undefined);
            if (result.diagnostics?.length) {
                this.publishDiagnostics(document, result.diagnostics);
            }
            panel.post({ type: 'errorTrace', runId, message: result.message });
        } catch (error) {
            this.traced = undefined;
            this.active = undefined;
            this.changed.fire(undefined);
            panel.post({ type: 'status', phase: 'idle' });
            await this.reportToolchainError(error);
        } finally {
            this.running = false;
            this.busyChanged.fire(false);
        }
    }

    private async run(
        document: vscode.TextDocument,
        language: Language,
    ): Promise<
        | { ok: true; commands: TraceCommand[]; lineMap: LineMap; warning?: string }
        | { ok: false; message: string; diagnostics?: JavaDiagnostic[] }
    > {
        const source = document.getText();
        const scratchDir = this.scratchDir(document.uri);
        // Fallback must track the manifest default, or the two disagree when the setting
        // is unset in a fresh install.
        const timeoutMs = this.setting<number>('execution.timeoutMs', 30_000);
        const maxTraceBytes = this.setting<number>('execution.maxTraceBytes', 64 * 1024 * 1024);

        if (language === 'java') {
            const jdk = await resolveJdk();
            const engineJarPath = await resolveJavaEngine(this.context);
            const result = await runJava({
                source,
                scratchDir,
                javaPath: jdk.java,
                javacPath: jdk.javac,
                engineJarPath,
                vmArgs: this.setting<string[]>('java.vmArgs', ['-Xmx512m']),
                timeoutMs,
                maxTraceBytes,
            });
            this.cleanScratch(scratchDir);
            return result.ok
                ? result
                : {
                      ok: false,
                      message: result.message,
                      diagnostics: result.kind === 'compile' ? result.diagnostics : undefined,
                  };
        }

        const python = await resolvePython(document.uri);
        const engineDir = resolvePythonEngine(this.context);
        const result = await runPython({
            source,
            scratchDir,
            pythonPath: python.command,
            engineDir,
            userFileDir: dirname(document.uri.fsPath),
            timeoutMs,
            maxTraceBytes,
        });
        this.cleanScratch(scratchDir);
        // Python line numbers are 1:1 with the user's file — the rewriter preserves them.
        return result.ok
            ? { ...result, lineMap: PYTHON_LINE_MAP }
            : { ok: false, message: result.message };
    }

    /** A URI can be untitled or remote, so hash it rather than mirroring its path. */
    private scratchDir(uri: vscode.Uri): string {
        const key = createHash('sha1').update(uri.toString()).digest('hex').slice(0, 16);
        return join(this.context.globalStorageUri.fsPath, 'runs', key);
    }

    private cleanScratch(scratchDir: string): void {
        if (this.setting<boolean>('trace.keepScratchDir', false)) return;
        try {
            rmSync(scratchDir, { recursive: true, force: true });
        } catch {
            // Best effort: the next run clears it again before writing.
        }
    }

    private publishDiagnostics(document: vscode.TextDocument, found: JavaDiagnostic[]): void {
        const diagnostics = found.map(item => {
            // Diagnostics are 1-based; VS Code positions are 0-based. Clamp so a stale
            // line number cannot throw.
            const line = Math.min(Math.max(item.line - 1, 0), Math.max(document.lineCount - 1, 0));
            const range = document.lineAt(line).range;
            const start = range.start.translate(0, Math.min(item.column - 1, range.end.character));
            const diagnostic = new vscode.Diagnostic(
                new vscode.Range(start, range.end),
                item.message,
                vscode.DiagnosticSeverity.Error,
            );
            diagnostic.source = 'AlgoFlow';
            return diagnostic;
        });
        this.diagnostics.set(document.uri, diagnostics);
    }

    private async reportToolchainError(error: unknown): Promise<void> {
        if (!(error instanceof ToolchainError)) {
            void vscode.window.showErrorMessage(
                `AlgoFlow: ${error instanceof Error ? error.message : String(error)}`,
            );
            return;
        }
        if (!error.action) {
            void vscode.window.showErrorMessage(`AlgoFlow: ${error.message}`);
            return;
        }
        const picked = await vscode.window.showErrorMessage(
            `AlgoFlow: ${error.message}`,
            { modal: true },
            error.action.title,
        );
        if (picked === error.action.title) await error.action.run();
    }

    private setting<T>(key: string, fallback: T): T {
        return vscode.workspace.getConfiguration('algoflow').get<T>(key, fallback);
    }

    dispose(): void {
        this.diagnostics.dispose();
        this.changed.dispose();
        this.busyChanged.dispose();
    }
}

function basename(uri: vscode.Uri): string {
    return uri.path.split('/').pop() || uri.toString();
}
