import Editor from "@monaco-editor/react";
import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { loadCommands, play, reset, subscribe } from "./visualizer/visualizerEngine";
import { executeJavaCode, fetchProblems } from "./api/backend";
import type { Problem } from "./api/backend";
import { DEFAULT_JAVA_CODE, ALGORITHMS, CATEGORIES, TEMPLATES, TEMPLATE_CATEGORIES } from "./constants/algorithms";
import { getCategories } from "./constants/problems";
import { registerJavaCompletions } from "./constants/javaCompletions";
import { engine } from "./visualizer/visualizerEngine";

const CODE_KEY = 'algoflow-code';
const PROBLEM_KEY = 'algopad-problem';

const DIFF_COLORS: Record<string, string> = { Easy: "var(--easy)", Medium: "var(--medium)", Hard: "var(--hard)" };

const dropdownStyle: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 4px)",
    background: "var(--bg-elevated)", border: "1px solid var(--border-light)", borderRadius: 6,
    width: 240, maxHeight: 380, overflowY: "auto", zIndex: 10,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
};

const dropdownItemStyle: React.CSSProperties = {
    padding: "7px 14px", fontSize: 13, color: "var(--text-primary)", cursor: "pointer",
    transition: "background 0.1s",
};

const toolbarBtnStyle: React.CSSProperties = {
    padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 500,
    background: "var(--bg-active)", color: "var(--text-secondary)",
    border: "1px solid var(--border)", borderRadius: 4,
    transition: "all 0.15s", display: "inline-flex", alignItems: "center", gap: 4,
};

export function ProblemSidebar({ problems, problem, onSelect, open, onClose }: { problems: Problem[]; problem: Problem | null; onSelect: (p: Problem) => void; open: boolean; onClose: () => void }) {
    const categories = getCategories(problems);
    const [expanded, setExpanded] = useState<string | null>(problem?.category ?? categories[0] ?? null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [open, onClose]);

    return (
        <div ref={panelRef} style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, width: 260, zIndex: 20,
            background: 'var(--bg-elevated)', borderRight: '1px solid var(--border-light)',
            boxShadow: open ? '4px 0 24px rgba(0,0,0,0.4)' : 'none',
            transform: open ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.2s ease', display: 'flex', flexDirection: 'column',
        }}>
            <div style={{ padding: '8px 12px', fontSize: 11, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', fontSize: 10, color: 'var(--text-secondary)' }}>Problems</span>
                <span onClick={onClose} style={{ fontSize: 14, color: 'var(--text-muted)', cursor: 'pointer', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >×</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
                {categories.map(cat => (
                    <div key={cat}>
                        <div
                            onClick={() => setExpanded(expanded === cat ? null : cat)}
                            style={{ padding: '5px 12px', fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{expanded === cat ? '▼' : '▶'}</span>
                            {cat}
                            <span style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>({problems.filter(p => p.category === cat).length})</span>
                        </div>
                        {expanded === cat && problems.filter(p => p.category === cat).map(p => (
                            <div
                                key={p.id}
                                onClick={() => { onSelect(p); onClose(); }}
                                style={{
                                    padding: '5px 10px 5px 24px', fontSize: 12, cursor: 'pointer',
                                    color: problem?.id === p.id ? '#fff' : 'var(--text-primary)',
                                    background: problem?.id === p.id ? 'var(--bg-active)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                                    borderLeft: problem?.id === p.id ? '2px solid var(--accent)' : '2px solid transparent',
                                }}
                                onMouseEnter={e => { if (problem?.id !== p.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
                                onMouseLeave={e => { if (problem?.id !== p.id) e.currentTarget.style.background = 'transparent'; }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                                <span style={{ fontSize: 9, color: DIFF_COLORS[p.difficulty], fontWeight: 700, flexShrink: 0 }}>{p.difficulty}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProblemDescription({ problem, onOpenList }: { problem: Problem; onOpenList: () => void }) {
    const [collapsed, setCollapsed] = useState(false);
    return (
        <div data-tour="problem-desc" style={{ borderBottom: "1px solid var(--border)", borderLeft: '3px solid var(--accent)', flexShrink: 0 }}>
            <div
                onClick={() => setCollapsed(!collapsed)}
                style={{ padding: "7px 12px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: 'rgba(76,175,80,0.04)' }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span data-tour="problems-btn" onClick={e => { e.stopPropagation(); onOpenList(); }} style={{ cursor: 'pointer', fontSize: 10, color: 'var(--accent)', background: 'rgba(76,175,80,0.1)', border: '1px solid var(--accent)', borderRadius: 3, padding: '2px 8px', fontWeight: 700, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(76,175,80,0.1)'; }}
                    >☰ Problems</span>
                    <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{collapsed ? "▶" : "▼"}</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 12 }}>{problem.id}. {problem.title}</span>
                    <span style={{ fontSize: 10, color: DIFF_COLORS[problem.difficulty], fontWeight: 700, border: `1px solid ${DIFF_COLORS[problem.difficulty]}`, padding: '0px 5px', borderRadius: 3 }}>{problem.difficulty}</span>
                </div>
                <a href={problem.leetcodeUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 10, color: "var(--warning)", textDecoration: "none", border: "1px solid var(--warning)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>LeetCode ↗</a>
            </div>
            {!collapsed && (
                <div style={{ padding: "10px 14px", maxHeight: 180, overflow: "auto", background: 'rgba(76,175,80,0.02)' }}>
                    <p style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 8px" }}>{problem.description}</p>
                    {problem.examples.map((ex, i) => (
                        <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: 4, padding: "6px 10px", marginBottom: 4, fontFamily: "monospace", fontSize: 11, color: "var(--text-primary)", lineHeight: 1.5, border: '1px solid var(--border)' }}>{ex}</div>
                    ))}
                </div>
            )}
        </div>
    );
}

export interface JavaEditorHandle {
    getProblems: () => Problem[];
    getProblem: () => Problem | null;
    selectProblem: (p: Problem) => void;
}

const JavaEditor = forwardRef<JavaEditorHandle, { mode?: string; onLoadingChange?: (loading: boolean) => void; onOpenSidebar?: () => void; onProblemsLoaded?: (problems: Problem[]) => void }>(function JavaEditor({ mode, onLoadingChange, onOpenSidebar, onProblemsLoaded }, ref) {
    const isPractice = mode === "practice";

    const [problems, setProblems] = useState<Problem[]>([]);
    const [problemsError, setProblemsError] = useState<string | null>(null);
    const [problem, setProblem] = useState<Problem | null>(null);

    const [code, setCode] = useState(() => {
        if (isPractice) return "";
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
    const [langOpen, setLangOpen] = useState(false);

    useEffect(() => {
        if (!isPractice) return;
        fetchProblems().then(list => {
            setProblems(list);
            onProblemsLoaded?.(list);
            try {
                const savedId = localStorage.getItem(PROBLEM_KEY);
                const saved = savedId ? list.find(p => p.id === Number(savedId)) : null;
                const pick = saved ?? list[0] ?? null;
                if (pick) { setProblem(pick); setCode(pick.starterCode); }
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

    useImperativeHandle(ref, () => ({ getProblems: () => problems, getProblem: () => problem, selectProblem }), [problems, problem]);

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

    const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <style>{`.highlighted-line { background: rgba(255, 213, 79, 0.15); }`}</style>

            {/* Toolbar — playground mode */}
            {!isPractice && (
                <div ref={menuRef} style={{
                    padding: "6px 12px", backgroundColor: "var(--bg-elevated)",
                    borderBottom: "1px solid var(--border)", display: "flex",
                    justifyContent: "space-between", alignItems: "center", position: "relative",
                }}>
                    <div style={{ position: "relative" }}>
                        <button
                            data-tour="templates"
                            onClick={() => setMenuOpen(menuOpen === 'templates' ? null : 'templates')}
                            style={toolbarBtnStyle}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                            📝 Templates <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
                        </button>
                        {menuOpen === 'templates' && (
                            <div style={{ ...dropdownStyle, left: 0 }}>
                                {TEMPLATE_CATEGORIES.map(cat => (
                                    <div key={cat}>
                                        <div style={{ padding: "8px 14px 4px", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{cat}</div>
                                        {TEMPLATES.filter(t => t.category === cat).map(t => (
                                            <div
                                                key={t.name}
                                                onClick={() => { persistCode(t.code); setMenuOpen(null); reset(); }}
                                                style={dropdownItemStyle}
                                                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
                                                <div>{t.name}</div>
                                                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{t.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ position: "relative" }}>
                        <button
                            data-tour="examples"
                            onClick={() => setMenuOpen(menuOpen === 'algorithms' ? null : 'algorithms')}
                            style={toolbarBtnStyle}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        >
                            📚 Examples <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
                        </button>
                        {menuOpen === 'algorithms' && (
                            <div style={{ ...dropdownStyle, right: 0 }}>
                                {CATEGORIES.map(cat => (
                                    <div key={cat}>
                                        <div style={{ padding: "8px 14px 4px", fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{cat}</div>
                                        {ALGORITHMS.filter(a => a.category === cat).map(a => (
                                            <div
                                                key={a.name}
                                                onClick={() => { persistCode(a.code); setMenuOpen(null); reset(); }}
                                                style={dropdownItemStyle}
                                                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                                                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                                            >
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
                {isPractice && problem && <ProblemDescription problem={problem} onOpenList={() => onOpenSidebar?.()} />}
                <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                    {!editorReady && (
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-elevated)', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading editor…</div>
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
            <div style={{
                padding: "8px 12px", backgroundColor: "var(--bg-elevated)",
                borderTop: "1px solid var(--border)", display: "flex",
                justifyContent: "space-between", alignItems: "center", gap: 8,
            }}>
                <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ position: "relative" }}>
                            <button
                                onClick={() => setLangOpen(!langOpen)}
                                style={{
                                    fontSize: 11, color: "var(--text-muted)", background: "transparent",
                                    border: "1px solid var(--border)", borderRadius: 4,
                                    padding: "3px 8px", fontWeight: 600, cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                            >
                                ☕ Java 25 ▾
                            </button>
                            {langOpen && (
                                <div style={{
                                    position: "absolute", bottom: "calc(100% + 4px)", left: 0,
                                    background: "var(--bg-elevated)", border: "1px solid var(--border-light)",
                                    borderRadius: 6, zIndex: 10, minWidth: 120,
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                                }}>
                                    <div style={{ padding: "6px 12px", fontSize: 12, color: "#fff", background: "var(--bg-active)", borderRadius: 5, cursor: "default" }}>
                                        ☕ Java 25
                                    </div>
                                </div>
                            )}
                        </div>
                        {!isPractice && (
                            <button
                                onClick={() => { persistCode(DEFAULT_JAVA_CODE); reset(); }}
                                title="Reset editor"
                                style={{
                                    fontSize: 11, color: "var(--text-muted)", background: "transparent",
                                    border: "1px solid var(--border)", borderRadius: 4,
                                    padding: "3px 8px", fontWeight: 600, cursor: "pointer",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                            >
                                ↺ Reset
                            </button>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "monospace" }}>
                            {isMac ? '⌘' : 'Ctrl'}+Enter
                        </span>
                    </div>
                    <button
                        data-tour="run"
                        onClick={handleRun}
                        disabled={loading}
                        title={`Run (${isMac ? '⌘' : 'Ctrl'}+Enter)`}
                        style={{
                            padding: "6px 20px", fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
                            background: loading ? 'var(--border-light)' : 'var(--accent)', color: '#fff',
                            border: 'none', borderRadius: 5, fontWeight: 600,
                            transition: 'all 0.15s',
                            boxShadow: loading ? 'none' : '0 2px 8px rgba(76,175,80,0.2)',
                        }}
                        onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
                        onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? 'var(--border-light)' : 'var(--accent)'; }}
                    >
                        {loading ? "Running…" : "▶ Run"}
                    </button>
                </>
            </div>
        </div>
    );
});

export default JavaEditor;
