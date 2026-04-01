import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import { loadCommands, play, reset, subscribe } from "./visualizer/visualizerEngine";
import { executeJavaCode, fetchProblems } from "./api/backend";
import type { Problem } from "./api/backend";
import { DEFAULT_JAVA_CODE, ALGORITHMS, CATEGORIES, TEMPLATES, TEMPLATE_CATEGORIES } from "./constants/algorithms";
import { getCategories } from "./constants/problems";
import { registerJavaCompletions } from "./constants/javaCompletions";
import { engine } from "./visualizer/visualizerEngine";

const CODE_KEY = 'algoflow-code';
const PROBLEM_KEY = 'algopad-problem';

const DIFF_COLORS: Record<string, string> = { Easy: "#4CAF50", Medium: "#f57c00", Hard: "#f44336" };

function ProblemPanel({ problems, problem, onSelect }: { problems: Problem[]; problem: Problem | null; onSelect: (p: Problem) => void }) {
    const categories = getCategories(problems);
    const [expanded, setExpanded] = useState<string | null>(problem?.category ?? categories[0] ?? null);

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#1a1a1a" }}>
            {/* Problem list */}
            <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
                {categories.map(cat => (
                    <div key={cat}>
                        <div
                            onClick={() => setExpanded(expanded === cat ? null : cat)}
                            style={{ padding: "6px 16px", fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                        >
                            <span style={{ fontSize: 9, color: "#555" }}>{expanded === cat ? "▼" : "▶"}</span>
                            {cat}
                            <span style={{ fontSize: 10, color: "#444", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>({problems.filter(p => p.category === cat).length})</span>
                        </div>
                        {expanded === cat && problems.filter(p => p.category === cat).map(p => (
                            <div
                                key={p.id}
                                onClick={() => onSelect(p)}
                                style={{
                                    padding: "7px 16px 7px 32px", fontSize: 13, cursor: "pointer",
                                    color: problem?.id === p.id ? "#fff" : "#bbb",
                                    background: problem?.id === p.id ? "#2a2a2a" : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    borderLeft: problem?.id === p.id ? "2px solid #4CAF50" : "2px solid transparent",
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

            {/* Selected problem description */}
            {problem && (
                <div style={{ borderTop: "1px solid #333", padding: "12px 16px", overflow: "auto", flex: 1, minHeight: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#eee" }}>
                            {problem.id}. {problem.title}
                        </h3>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            <a
                                href={problem.leetcodeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: 10, color: "#f89f1b", textDecoration: "none", border: "1px solid #f89f1b", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}
                            >
                                LeetCode ↗
                            </a>
                            <span style={{ fontSize: 10, color: DIFF_COLORS[problem.difficulty], fontWeight: 700, border: `1px solid ${DIFF_COLORS[problem.difficulty]}`, padding: "1px 6px", borderRadius: 3 }}>
                                {problem.difficulty}
                            </span>
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, margin: "8px 0" }}>{problem.description}</p>
                    {problem.examples.map((ex, i) => (
                        <div key={i} style={{ background: "#111", borderRadius: 4, padding: "6px 10px", marginBottom: 4, fontFamily: "monospace", fontSize: 11, color: "#ccc", lineHeight: 1.5 }}>
                            {ex}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function JavaEditor({ mode, onLoadingChange }: { mode?: string; onLoadingChange?: (loading: boolean) => void }) {
    const isPractice = mode === "practice";

    const [problems, setProblems] = useState<Problem[]>([]);
    const [problemsError, setProblemsError] = useState<string | null>(null);
    const [problem, setProblem] = useState<Problem | null>(null);

    const [code, setCode] = useState(() => {
        if (isPractice) return ""; // will be set after problems load
        try { const v = localStorage.getItem(CODE_KEY); return v || DEFAULT_JAVA_CODE; } catch { return DEFAULT_JAVA_CODE; }
    });
    const [loading, setLoading] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [menuOpen, setMenuOpen] = useState<'algorithms' | 'templates' | null>(null);
    const editorRef = useRef<any>(null);
    const monacoRef = useRef<any>(null);
    const decorationsRef = useRef<any>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const runRef = useRef<(() => void) | undefined>(undefined);
    const [activeTab, setActiveTab] = useState<'problem' | 'code'>('problem');
    const [langOpen, setLangOpen] = useState(false);

    // Fetch problems from backend in practice mode
    useEffect(() => {
        if (!isPractice) return;
        fetchProblems().then(list => {
            setProblems(list);
            try {
                const savedId = localStorage.getItem(PROBLEM_KEY);
                const saved = savedId ? list.find(p => p.id === Number(savedId)) : null;
                if (saved) { setProblem(saved); setCode(saved.starterCode); setTimeout(foldMain, 300); }
            } catch {}
        }).catch(e => setProblemsError(e.message));
    }, [isPractice]);

    const handleMount = (editor: any, monaco: any) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        registerJavaCompletions(monaco);
        setEditorReady(true);
    };

    useEffect(() => {
        if (!menuOpen && !langOpen) return;
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null);
            setLangOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [menuOpen, langOpen]);

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

    const foldMain = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const model = editor.getModel();
        if (!model) return;
        const lines = model.getLinesContent();
        let mainLine = 0;
        for (let i = 0; i < lines.length; i++) {
            if (/public\s+static\s+void\s+main\s*\(/.test(lines[i])) { mainLine = i + 1; break; }
        }
        if (!mainLine) return;
        editor.trigger('fold', 'editor.fold', { selectionLines: [mainLine] });
        editor.setPosition({ lineNumber: 1, column: 1 });
    };

    const selectProblem = (p: Problem) => {
        setProblem(p);
        setCode(p.starterCode);
        reset();
        setTimeout(foldMain, 100);
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


    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <style>{`.highlighted-line { background: rgba(255, 213, 79, 0.15); }`}</style>

            {/* Toolbar — only in playground mode */}
            {!isPractice && (
                <div ref={menuRef} style={{ padding: "4px 10px", backgroundColor: "#1e1e1e", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative" }}>
                    <div style={{ position: "relative" }}>
                        <button data-tour="templates" onClick={() => setMenuOpen(menuOpen === 'templates' ? null : 'templates')} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", background: "transparent", color: "#aaa", border: "1px solid #444", borderRadius: 3 }}>
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
                        <button data-tour="examples" onClick={() => setMenuOpen(menuOpen === 'algorithms' ? null : 'algorithms')} style={{ padding: "4px 10px", fontSize: 12, cursor: "pointer", background: "transparent", color: "#aaa", border: "1px solid #444", borderRadius: 3 }}>
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

            {/* Tab bar (practice mode) */}
            {isPractice && (
                <div style={{ display: "flex", background: "#1e1e1e", borderBottom: "1px solid #333", flexShrink: 0 }}>
                    {([['problem', '📋 Problem'], ['code', `</> ${problem ? problem.title : 'Code'}`]] as const).map(([key, label]) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                background: activeTab === key ? "#2a2a2a" : "transparent",
                                color: activeTab === key ? "#fff" : "#888",
                                border: "none", borderBottom: activeTab === key ? "2px solid #4CAF50" : "2px solid transparent",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}

            {/* Main content */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
                {/* Problem panel (practice mode) */}
                {isPractice && activeTab === 'problem' && (
                    <div style={{ flex: 1, overflow: "auto" }}>
                        {problemsError ? (
                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#f44336", fontSize: 13 }}>
                                {problemsError}
                            </div>
                        ) : problems.length === 0 ? (
                            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1a1a1a", color: "#555", fontSize: 13 }}>
                                Loading problems…
                            </div>
                        ) : (
                            <ProblemPanel problems={problems} problem={problem} onSelect={selectProblem} />
                        )}
                    </div>
                )}

                {/* Editor */}
                <div style={{ flex: 1, minHeight: 0, position: "relative", display: isPractice && activeTab === 'problem' ? 'none' : 'flex', flexDirection: 'column' }}>
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
                {isPractice && activeTab === 'problem' ? (
                    <button
                        onClick={() => setActiveTab('code')}
                        style={{
                            padding: "6px 16px", fontSize: 14, cursor: "pointer", marginLeft: "auto",
                            background: "#4CAF50", color: "#fff", border: "none", borderRadius: 4,
                            fontWeight: 600, transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#43a047'}
                        onMouseLeave={e => e.currentTarget.style.background = '#4CAF50'}
                    >
                        Start Coding →
                    </button>
                ) : (
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ position: "relative" }}>
                                <button
                                    onClick={() => setLangOpen(!langOpen)}
                                    style={{ fontSize: 12, color: "#aaa", background: "transparent", border: "1px solid #444", borderRadius: 3, padding: "3px 8px", fontWeight: 600, cursor: "pointer" }}
                                >
                                    ☕ Java 25 ▾
                                </button>
                                {langOpen && (
                                    <div style={{ position: "absolute", bottom: "100%", left: 0, background: "#252526", border: "1px solid #444", borderRadius: 4, marginBottom: 4, zIndex: 10, minWidth: 120 }}>
                                        <div style={{ padding: "6px 12px", fontSize: 12, color: "#fff", background: "#2a2a2a", cursor: "default" }}>
                                            ☕ Java 25
                                        </div>
                                    </div>
                                )}
                            </div>
                            {isPractice && problem && (
                                <a
                                    href={problem.leetcodeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ fontSize: 11, color: "#f89f1b", textDecoration: "none", border: "1px solid #f89f1b", padding: "2px 8px", borderRadius: 3, fontWeight: 700 }}
                                >
                                    LeetCode ↗
                                </a>
                            )}
                        </div>
                        <button
                            data-tour="run"
                            onClick={handleRun}
                            disabled={loading}
                            title={`Run (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter)`}
                            style={{
                                padding: "6px 16px", fontSize: 14, cursor: loading ? "not-allowed" : "pointer",
                                background: loading ? '#333' : '#4CAF50', color: '#fff', border: 'none', borderRadius: 4,
                                fontWeight: 600, transition: 'background 0.15s', marginLeft: isPractice ? 'auto' : undefined,
                            }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#43a047'; }}
                            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#4CAF50'; }}
                        >
                            {loading ? "Running…" : "▶ Run"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
