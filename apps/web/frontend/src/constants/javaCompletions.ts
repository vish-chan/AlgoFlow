export function registerJavaCompletions(monaco: any) {
    monaco.languages.registerCompletionItemProvider('java', {
        provideCompletionItems(model: any, position: any) {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const keyword = (label: string) => ({
                label,
                kind: monaco.languages.CompletionItemKind.Keyword,
                insertText: label,
                range,
            });

            const type = (label: string) => ({
                label,
                kind: monaco.languages.CompletionItemKind.Class,
                insertText: label,
                range,
            });

            const snippet = (label: string, insertText: string, doc?: string) => ({
                label,
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: doc,
                range,
            });

            const content = model.getValue();

            const autoImport = (label: string, insertText: string, importLine: string, doc?: string) => {
                const item: any = {
                    label,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: doc,
                    range,
                };
                if (!content.includes(importLine)) {
                    const lines = content.split('\n');
                    let insertLine = 0;
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].trimStart().startsWith('package ')) { insertLine = i + 1; break; }
                    }
                    item.additionalTextEdits = [{
                        range: { startLineNumber: insertLine + 1, startColumn: 1, endLineNumber: insertLine + 1, endColumn: 1 },
                        text: `\nimport ${importLine};\n`,
                    }];
                }
                return item;
            };

            return {
                suggestions: [
                    // Keywords
                    ...['public', 'private', 'protected', 'static', 'final', 'abstract',
                        'class', 'interface', 'extends', 'implements', 'import', 'package',
                        'new', 'return', 'void', 'if', 'else', 'for', 'while', 'do',
                        'switch', 'case', 'break', 'continue', 'default', 'try', 'catch',
                        'finally', 'throw', 'throws', 'this', 'super', 'null', 'true', 'false',
                        'instanceof', 'enum', 'assert', 'synchronized', 'volatile', 'transient',
                    ].map(keyword),

                    // Primitive types
                    ...['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short'].map(type),

                    // Common types
                    ...['String', 'Integer', 'Long', 'Double', 'Boolean', 'Object',
                        'ArrayList', 'LinkedList', 'HashMap', 'HashSet', 'TreeMap', 'TreeSet',
                        'Queue', 'Stack', 'PriorityQueue', 'LinkedHashMap', 'LinkedHashSet',
                        'List', 'Map', 'Set', 'Collection', 'Collections', 'Arrays',
                        'Math', 'System', 'StringBuilder',
                    ].map(type),

                    // AlgoFlow annotations (with auto-import)
                    autoImport('@Graph', '@Graph', 'com.algoflow.annotation.Graph', 'Visualize int[][] as a graph'),
                    autoImport('@Graph(directed)', '@Graph(directed = true)', 'com.algoflow.annotation.Graph', 'Directed graph visualization'),
                    autoImport('@Graph(weighted)', '@Graph(directed = true, weighted = true)', 'com.algoflow.annotation.Graph', 'Directed weighted graph'),
                    autoImport('@Tree', '@Tree', 'com.algoflow.annotation.Tree', 'Visualize TreeNode field as a tree'),

                    // Common snippets
                    snippet('main', 'public static void main(String[] args) {\n\t${0}\n}', 'Main method'),
                    snippet('sout', 'System.out.println(${0});', 'Print line'),
                    snippet('fori', 'for (int ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n\t${0}\n}', 'For loop'),
                    snippet('foreach', 'for (${1:int} ${2:item} : ${3:collection}) {\n\t${0}\n}', 'For-each loop'),
                    snippet('while', 'while (${1:condition}) {\n\t${0}\n}', 'While loop'),
                    snippet('ifelse', 'if (${1:condition}) {\n\t${2}\n} else {\n\t${0}\n}', 'If-else'),
                    snippet('trycatch', 'try {\n\t${1}\n} catch (${2:Exception} ${3:e}) {\n\t${0}\n}', 'Try-catch'),
                    snippet('TreeNode', 'static class TreeNode {\n\tint val;\n\tTreeNode left;\n\tTreeNode right;\n\tTreeNode(int val) { this.val = val; }\n}', 'TreeNode inner class'),
                ],
            };
        },
    });
}
