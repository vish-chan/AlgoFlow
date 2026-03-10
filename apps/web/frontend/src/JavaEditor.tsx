import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { loadCommands, play, subscribe } from "./visualizer/visualizerEngine";
import { executeJavaCode } from "./api/backend";
import { DEFAULT_JAVA_CODE, ALGORITHMS, CATEGORIES, TEMPLATES, TEMPLATE_CATEGORIES } from "./constants/algorithms";
import { engine } from "./visualizer/visualizerEngine";

export default function JavaEditor() {
    const [code, setCode] = useState(DEFAULT_JAVA_CODE);
    const [loading, setLoading] = useState(false);
    const [menuOpen, setMenuOpen] = useState<'algorithms' | 'templates' | null>(null);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<any>(null);

    const handleMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
    };

    useEffect(() => {
        return subscribe(() => {
            const line = engine.getHighlightedLine();
            const editor = editorRef.current;
            const monaco = monacoRef.current;
            if (!editor || !monaco) return;

            if (!line) {
                decorationsRef.current?.clear();
                return;
            }

            const newDecorations = [{
                range: new monaco.Range(line, 1, line, 1),
                options: { isWholeLine: true, className: 'highlighted-line' },
            }];

            if (decorationsRef.current) {
                decorationsRef.current.set(newDecorations);
            } else {
                decorationsRef.current = editor.createDecorationsCollection(newDecorations);
            }

            editor.revealLineInCenterIfOutsideViewport(line);
        });
    }, []);

    const handleRun = async () => {
        setLoading(true);
        
        try {
            const result = await executeJavaCode(code);
            if (result.code) setCode(result.code);
            loadCommands(result.commands);
            play();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Execution failed';
            console.error('Execution error:', err);
            loadCommands([
                {"key":"log","method":"LogTracer","args":["Error"]},
                {"key":null,"method":"setRoot","args":["log"]},
                {"key":"log","method":"println","args":[msg]},
                {"key":null,"method":"delay","args":[]},
            ]);
            play();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <style>{`.highlighted-line { background: rgba(255, 213, 79, 0.15); }`}</style>
            <div style={{ flex: 1 }}>
                <Editor
                    width="100%"
                    height="100%"
                    language="java"
                    theme="vs-dark"
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    onMount={handleMount}
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        wordWrap: "on",
                    }}
                />
            </div>

            <div
                style={{
                    padding: "10px",
                    backgroundColor: "#1e1e1e",
                    borderTop: "1px solid #444",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <div style={{ position: "relative", display: "flex", gap: 4 }}>
                    <button
                        onClick={() => setMenuOpen(menuOpen === 'algorithms' ? null : 'algorithms')}
                        style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
                    >
                        📚 Algorithms ▾
                    </button>
                    <button
                        onClick={() => setMenuOpen(menuOpen === 'templates' ? null : 'templates')}
                        style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
                    >
                        📝 Templates ▾
                    </button>
                    {menuOpen && (
                        <div
                            style={{
                                position: "absolute",
                                bottom: "100%",
                                left: 0,
                                background: "#252526",
                                border: "1px solid #444",
                                borderRadius: 4,
                                width: 220,
                                maxHeight: 350,
                                overflowY: "auto",
                                zIndex: 10,
                                marginBottom: 4,
                            }}
                        >
                            {menuOpen === "algorithms" ? (
                                CATEGORIES.map(cat => (
                                    <div key={cat}>
                                        <div style={{ padding: "6px 10px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{cat}</div>
                                        {ALGORITHMS.filter(a => a.category === cat).map(a => (
                                            <div
                                                key={a.name}
                                                onClick={() => { setCode(a.code); setMenuOpen(null); }}
                                                style={{ padding: "6px 16px", fontSize: 13, color: "#ddd", cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "#333")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                            >
                                                {a.name}
                                            </div>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                TEMPLATE_CATEGORIES.map(cat => (
                                    <div key={cat}>
                                        <div style={{ padding: "6px 10px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{cat}</div>
                                        {TEMPLATES.filter(t => t.category === cat).map(t => (
                                            <div
                                                key={t.name}
                                                onClick={() => { setCode(t.code); setMenuOpen(null); }}
                                                style={{ padding: "6px 16px", fontSize: 13, color: "#ddd", cursor: "pointer" }}
                                                onMouseEnter={e => (e.currentTarget.style.background = "#333")}
                                                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                                            >
                                                <div>{t.name}</div>
                                                <div style={{ fontSize: 11, color: "#666" }}>{t.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                <div style={{ flex: 1 }} />
                <button
                    onClick={handleRun}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        fontSize: 14,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "Running..." : "Run"}
                </button>
            </div>
        </div>
    );
}
