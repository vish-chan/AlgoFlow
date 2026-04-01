import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { loadCommands, play, reset, subscribe } from "./visualizer/visualizerEngine";
import { executeJavaCode } from "./api/backend";
import { DEFAULT_JAVA_CODE, ALGORITHMS, CATEGORIES, TEMPLATES, TEMPLATE_CATEGORIES } from "./constants/algorithms";
import { PROBLEMS, PROBLEM_CATEGORIES } from "./constants/problems";
import type { Problem } from "./constants/problems";
import { registerJavaCompletions } from "./constants/javaCompletions";
import { engine } from "./visualizer/visualizerEngine";

const CODE_KEY = 'algoflow-code';
const PROBLEM_KEY = 'algopad-problem';

const DIFF_COLORS: Record<string, string> = { Easy: "#4CAF50", Medium: "#f57c00", Hard: "#f44336" };

function ProblemPanel({ problem, onSelect }: { problem: Problem | null; onSelect: (p: Problem) => void }) {
    const [listOpen, setListOpen] = useState(!problem);

    if (listOpen || !problem) {
        return (
            <div style={{ height: "100%", overflow: "auto", background: "#1a1a1a", borderBottom: "1px solid #333" }}>
                <div style={{ padding: "10px 14px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ccc" }}>Blind 75 Problems</span>
                    {problem && (
                        <button onClick={() => setListOpen(false)} style={{ background: "none", border: "1px solid #444", color: "#888", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>
                            ← Back
                        </button>
                    )}
                </div>
                {PROBLEM_CATEGORIES.map(cat => (
                    <div key={cat}>
                        <div style={{ padding: "8px 14px 4px", fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{cat}</div>
                        {PROBLEMS.filter(p => p.category === cat).map(p => (
                            <div
                                key={p.id}
                                onClick={() => { onSelect(p); setListOpen(false); }}
                                style={{
                                    padding: "6px 14px 6px 20", fontSize: 13, color: problem?.id === p.id ? "#fff" : "#bbb",
                                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                                    background: problem?.id === p.id ? "#2a2a2a" : "transparent",
                                }}
                                onMouseEnter={e => { if (problem?.id !== p.id) e.currentTarget.style.background = "#222"; }}
                                onMouseLeave={e => { if (problem?.id !== p.id) e.currentTarget.style.background = "transparent"; }}
                            >
                                <span>{p.title}</span>
                                <span style={{ fontSize: 10, color: DIFF_COLORS[p.difficulty], fontWeight: 700 }}>{p.difficulty}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div style={{ height: "100%", overflow: "auto", background: "#1a1a1a", borderBottom: "1px solid #333" }}>
            <div style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <button onClick={() => setListOpen(true)} style={{ background: "none", border: "1px solid #444", color: "#888", borderRadius: 3, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>
                        ☰ Problems
                    </button>
                    <span style={{ fontSize: 10, color: DIFF_COLORS[problem.difficulty], fontWeight: 700, border: `1px solid ${DIFF_COLORS[problem.difficulty]}`, padding: "1px 8px", borderRadius: 3 }}>
                        {problem.difficulty}
                    </span>
                </div>
                <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#eee" }}>
                    {problem.id}. {problem.title}
                </h3>
                <span style={{ fontSize: 10, color: "#666", textTransform: "uppercase", letterSpacing: 1 }}>{problem.category}</span>
                <p style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, margin: "12px 0" }}>{problem.description}</p>
                <div style={{ fontSize: 12, color: "#888" }}>
                    {problem.examples.map((ex, i) => (
                        <div key={i} style={{ background: "#111", borderRadius: 4, padding: "6px 10px", marginBottom: 6, fontFamily: "monospace", fontSize: 11, color: "#ccc", lineHeight: 1.5 }}>
                            {ex}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function JavaEditor({ mode, onLoadingChange }: { mode?: string; onLoadingChange?: (loading: boolean) => void }) {
    const isPractice = mode === "practice";

    const [problem, setProblem] = useState<Problem | null>(() => {
        if (!isPractice) return null;
        try { const id = localStorage.getItem(PROBLEM_KEY); return id ? PROBLEMS.find(p => p.id === Number(id)) || null : null; } catch { return null; }
    });

    const [code, setCode] = useState(() => {
        if (isPractice && problem) return problem.starterCode;
        try { const v = localStorage.getItem(CODE_KEY); return v || DEFAULT_JAVA_CODE; } catch { return DEFAULT_JAVA_CODE; }
    });
    const [loading, setLoading] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [menuOpen, setMenuOpen] = useState<'algorithms' | 'templates' | null>(null);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const runRef = useRef<() => void>();
    const [problemPanelPct, setProblemPanelPct] = useState(40);

    const handleMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        registerJavaCompletions(monaco);
        setEditorReady(true);
    };

    useEffect(() => {
        if (!menuOpen) return;
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [menuOpen]);

    useEffect(() => { runRef.current = handleRun; });
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runRef.current?.(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        const unsubscribe = subscribe(() => {
            const line = engine.getHighlightedLine();
            const editor = editorRef.current;
            const monaco = monacoRef.current;
            if (!editor || !monaco) return;
            if (!line) { decorationsRef.current?.clear(); return; }
            const newDecorations = [{ range: new monaco.Range(line, 1, line, 1), options: { isWholeLine: true, className: 'highlighted-line' } }];
            if (decorationsRef.current) decorationsRef.current.set(newDecorations);
            else decorationsRef.current = editor.createDecorationsCollection(newDecorations);
            editor.revealLineInCenterIfOutsideViewport(line);
        });
        return () => { unsubscribe(); };
    }, []);

    const selectProblem = (p: Problem) => {
        setProblem(p);
        setCode(p.starterCode);
        reset();
        try { localStorage.setItem(PROBLEM_KEY, String(p.id)); } catch {}
    };

    const setLoadingState = (v: boolean) => { setLoading(v); onLoadingChange?.(v); };

    const persistCode = (c: string) => {
        setCode(c);
        if (!isPractice) { try { localStorage.setItem(CODE_KEY, c); } catch {} }
    };

    const handleRun = async () => {
        setLoadingState(true);
        try {
            const result = await executeJavaCode(code);
            if (result.code) setCode(result.code);
            loadCommands(result.commands);
            play();
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Execution failed';
            loadCommands([
                {"key":"log","method":"LogTracer","args":["Error"]},
                {"key":null,"method":"setRoot","args":["log"]},
                {"key":"log","method":"println","args":[msg]},
                {"key":null,"method":"delay","args":[]},
            ]);
            play();
        } finally { setLoadingState(false); }
    };

    const onProblemDragDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const container = (e.target as HTMLElement).parentElement!;
        const startY = e.clientY;
        const startPct = problemPanelPct;
        const totalH = container.offsetHeight;
        const onMove = (ev: MouseEvent) => {
            const dy = ev.clientY - startY;
            setProblemPanelPct(Math.min(70, Math.max(15, startPct + (dy / totalH) * 100)));
        };
        const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; };
        document.body.style.cursor = "row-resize";
        document.body.style.userSelect = "none";
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <style>{`.highlighted-line { background: rgba(255, 213, 79, 0.15); }`}</style>

            {/* Toolbar — only in playground mode */}
            {!isPractice && (
                <div ref={menuRef} style={{ padding: "4px 10px", backgroundColor: "#1e1e1e", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                    <div style={{ position: "relative" }}>
                        <button onClick={() => setMenuOpen(menuOpen === 'templates' ? null : 'templates')} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", background: "transparent", color: "#aaa", border: "1px solid #444", borderRadius: 3 }}>
                            📝 Templates ▾
                        </button>
                        {menuOpen === 'templates' && (
                            <div style={{ position: "absolute", top: "100%", left: 0, background: "#252526", border: "1px solid #444", borderRadius: 4, width: 220, maxHeight: 350, overflowY: "auto", zIndex: 10, marginTop: 4 }}>
                                {TEMPLATE_CATEGORIES.map(cat => (
                                    <div key={cat}>
                                        <div style={{ padding: "6px 10px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{cat}</div>
                                        {TEMPLATES.filter(t => t.category === cat).map(t => (
                                            <div key={t.name} onClick={() => { persistCode(t.code); setMenuOpen(null); reset(); }} style={{ padding: "6px 16px", fontSize: 13, color: "#ddd", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#333")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                                <div>{t.name}</div>
                                                <div style={{ fontSize: 11, color: "#666" }}>{t.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ position: "relative" }}>
                        <button onClick={() => setMenuOpen(menuOpen === 'algorithms' ? null : 'algorithms')} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", background: "transparent", color: "#aaa", border: "1px solid #444", borderRadius: 3 }}>
                            📚 Examples ▾
                        </button>
                        {menuOpen === 'algorithms' && (
                            <div style={{ position: "absolute", top: "100%", right: 0, background: "#252526", border: "1px solid #444", borderRadius: 4, width: 220, maxHeight: 350, overflowY: "auto", zIndex: 10, marginTop: 4 }}>
                                {CATEGORIES.map(cat => (
                                    <div key={cat}>
                                        <div style={{ padding: "6px 10px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{cat}</div>
                                        {ALGORITHMS.filter(a => a.category === cat).map(a => (
                                            <div key={a.name} onClick={() => { persistCode(a.code); setMenuOpen(null); reset(); }} style={{ padding: "6px 16px", fontSize: 13, color: "#ddd", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#333")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                                {a.name}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                {/* Problem panel (practice mode) */}
                {isPractice && (
                    <>
                        <div style={{ height: `${problemPanelPct}%`, minHeight: 60, flexShrink: 0 }}>
                            <ProblemPanel problem={problem} onSelect={selectProblem} />
                        </div>
                        <div onMouseDown={onProblemDragDown} style={{ height: 5, cursor: "row-resize", background: "#333", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div style={{ display: "flex", gap: 3 }}>
                                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#555" }} />
                                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#555" }} />
                                <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#555" }} />
                            </div>
                        </div>
                    </>
                )}

                {/* Editor */}
                <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                    {!editorReady && (
                        <div style={{ position: 'absolute', inset: 0, background: '#1e1e1e', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ color: '#555', fontSize: 13 }}>Loading editor…</div>
                        </div>
                    )}
                    <Editor
                        width="100%"
                        height="100%"
                        language="java"
                        theme="vs-dark"
                        value={code}
                        onChange={(v) => { persistCode(v ?? ""); reset(); }}
                        onMount={handleMount}
                        options={{ fontSize: 14, minimap: { enabled: false }, automaticLayout: true, wordWrap: "on" }}
                    />
                </div>
            </div>

            {/* Bottom bar */}
            <div style={{ padding: "10px", backgroundColor: "#1e1e1e", borderTop: "1px solid #444", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "#aaa", background: "transparent", border: "1px solid #444", borderRadius: 3, padding: "3px 8px", fontWeight: 600 }}>☕ Java 25</span>
                <button
                    data-tour="run"
                    onClick={handleRun}
                    disabled={loading}
                    title={`Run (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter)`}
                    style={{
                        padding: "6px 16px", fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                        background: loading ? '#333' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 4,
                        fontWeight: 600, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#43a047'; }}
                    onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#4CAF50'; }}
                >
                    {loading ? "Running…" : "▶ Run"}
                </button>
            </div>
        </div>
    );
}
