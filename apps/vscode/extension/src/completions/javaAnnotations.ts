import * as vscode from 'vscode';

/**
 * Completions for AlgoFlow's Java field annotations, with the import added for you.
 *
 * Only the annotations: keywords, types and generic snippets are deliberately left out
 * because `redhat.java` already provides those, and duplicating them would just make its
 * suggestions harder to find. Ported from the web app's `javaCompletions.ts`.
 */

const IMPORT_ROOT = 'com.algoflow.annotation';

type Annotation = {
    label: string;
    insertText: string;
    /** Simple name of the annotation type to import. */
    type: string;
    detail: string;
};

const ANNOTATIONS: Annotation[] = [
    { label: '@Graph', insertText: '@Graph', type: 'Graph', detail: 'Visualize int[][] as a graph' },
    {
        label: '@Graph(directed)',
        insertText: '@Graph(directed = true)',
        type: 'Graph',
        detail: 'Directed graph visualization',
    },
    {
        label: '@Graph(weighted)',
        insertText: '@Graph(directed = true, weighted = true)',
        type: 'Graph',
        detail: 'Directed weighted graph',
    },
    { label: '@Tree', insertText: '@Tree', type: 'Tree', detail: 'Visualize a TreeNode field as a tree' },
    { label: '@Chart', insertText: '@Chart', type: 'Chart', detail: 'Visualize int[] as a bar chart' },
    {
        label: '@LinkedList',
        insertText: '@LinkedList',
        type: 'LinkedList',
        detail: 'Visualize a ListNode field as a linked list',
    },
];

export function registerJavaAnnotationCompletions(): vscode.Disposable {
    return vscode.languages.registerCompletionItemProvider(
        { language: 'java', scheme: '*' },
        {
            provideCompletionItems(document, position) {
                return ANNOTATIONS.map(annotation => {
                    const item = new vscode.CompletionItem(
                        annotation.label,
                        vscode.CompletionItemKind.Snippet,
                    );
                    item.insertText = new vscode.SnippetString(annotation.insertText);
                    item.detail = annotation.detail;
                    item.documentation = new vscode.MarkdownString(
                        `${annotation.detail}\n\nImports \`${IMPORT_ROOT}.${annotation.type}\`.`,
                    );

                    const edit = importEdit(document, annotation.type);
                    if (edit) item.additionalTextEdits = [edit];

                    // Completion is triggered on `@`, which is already in the document.
                    const at = document.getText(
                        new vscode.Range(position.translate(0, -1), position),
                    );
                    if (at === '@') {
                        item.range = new vscode.Range(position.translate(0, -1), position);
                    }
                    return item;
                });
            },
        },
        '@',
    );
}

/**
 * An edit adding the import, or `undefined` if it is already there.
 *
 * The import goes immediately after the package declaration when there is one, and at the
 * very top otherwise — the same rule the web app uses, so the two agree on placement.
 */
function importEdit(
    document: vscode.TextDocument,
    type: string,
): vscode.TextEdit | undefined {
    const statement = `import ${IMPORT_ROOT}.${type};`;
    const text = document.getText();
    if (text.includes(statement)) return undefined;

    let line = 0;
    for (let i = 0; i < document.lineCount; i++) {
        if (document.lineAt(i).text.trimStart().startsWith('package ')) {
            line = i + 1;
            break;
        }
    }
    return vscode.TextEdit.insert(new vscode.Position(line, 0), `${statement}\n`);
}
