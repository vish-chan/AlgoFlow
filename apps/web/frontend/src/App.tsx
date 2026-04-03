import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import JavaEditor, { ProblemSidebar } from "./JavaEditor";
import type { JavaEditorHandle } from "./JavaEditor";
import AlgorithmVisualizerPane from "./visualizer/AlgorithmVisualizerPane";
import Tour, { useTour } from "./Tour";
import LandingPage from "./LandingPage";
import { parseLessonFromURL, buildLessonURL } from "./lesson/lessonStore";
import type { Lesson } from "./lesson/lessonStore";
import { subscribe, getEngine } from "./visualizer/visualizerEngine";

type Mode = "landing" | "playground" | "practice";

const MOBILE_BREAKPOINT = 768;

function parseHash(): Mode {
    const h = window.location.hash.slice(1).split('?')[0];
    if (h === "playground" || h === "practice") return h;
    return "landing";
}

export default function App() {
    const [mode, setMode] = useState<Mode>(parseHash);
    const [splitPercent, setSplitPercent] = useState(40);
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const dragging = useRef(false);
    const [executing, setExecuting] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarProblems, setSidebarProblems] = useState<import("./api/backend").Problem[]>([]);
    const editorRef = useRef<JavaEditorHandle>(null);

    // Lesson state
    const [lessonChecked, setLessonChecked] = useState(false);
    const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
    const [annotating, setAnnotating] = useState(false);
    const [annotations, setAnnotations] = useState<Record<number, string>>({});
    const [cursor, setCursor] = useState(0);
    const [total, setTotal] = useState(0);
    const tourMode = viewingLesson ? 'lesson' : mode;
    const { showTour, startTour, finishTour } = useTour(tourMode);

    useEffect(() => {
        parseLessonFromURL().then(lesson => {
            if (lesson) {
                setViewingLesson(lesson);
                setAnnotations(lesson.annotations);
            }
            setLessonChecked(true);
        });
    }, []);

    useEffect(() => {
        const unsub = subscribe(() => {
            const eng = getEngine();
            setCursor(eng.getCursor());
            setTotal(eng.getLength());
        });
        return () => { unsub(); };
    }, []);

    const handleAnnotationChange = useCallback((step: number, text: string) => {
        setAnnotations(prev => {
            const next = { ...prev };
            if (text) next[step] = text;
            else delete next[step];
            return next;
        });
    }, []);

    const handleShare = useCallback(async () => {
        const code = editorRef.current?.getCode?.() ?? "";
        if (!code.trim()) return;
        const lesson: Lesson = { code, annotations };
        const url = await buildLessonURL(lesson);
        await navigator.clipboard.writeText(url);
        alert("Lesson URL copied to clipboard!");
    }, [annotations]);


    const onProblemsLoaded = useCallback((list: import("./api/backend").Problem[]) => {
        setSidebarProblems(list);

    }, [mode]);

    const [fadeKey, setFadeKey] = useState(0);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        const onHash = () => setMode(parseHash());
        window.addEventListener("hashchange", onHash);
        return () => window.removeEventListener("hashchange", onHash);
    }, []);

    useEffect(() => {
        const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const navigate = useCallback((m: "playground" | "practice", opts?: { annotate?: boolean }) => {
        setOpacity(0);
        setTimeout(() => {
            window.location.hash = m;
            setMode(m);
            setViewingLesson(null);
            setAnnotations({});
            setAnnotating(!!opts?.annotate);
            setFadeKey(k => k + 1);
        }, 250);
    }, []);

    const goHome = useCallback(() => {
        setOpacity(0);
        setTimeout(() => {
            window.location.hash = "";
            setMode("landing");
            setViewingLesson(null);
            setAnnotations({});
            setAnnotating(false);
            setFadeKey(k => k + 1);
        }, 250);
    }, []);

    useEffect(() => {
        setOpacity(0);
        const raf = requestAnimationFrame(() => setOpacity(1));
        return () => cancelAnimationFrame(raf);
    }, [fadeKey]);

    const onMouseDown = useCallback(() => {
        dragging.current = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        const onMouseMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const pct = (e.clientX / window.innerWidth) * 100;
            setSplitPercent(Math.min(70, Math.max(20, pct)));
        };
        const onMouseUp = () => {
            dragging.current = false;
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    }, []);

    const wrapStyle: CSSProperties = { opacity, transition: "opacity 0.3s ease", background: "var(--bg-base)" };

    if (mode === "landing") {
        return <div style={wrapStyle}><LandingPage onNavigate={navigate} /></div>;
    }

    if (!lessonChecked) return null;

    const modeBadge = viewingLesson
        ? { label: "LESSON", bg: "var(--warning)" }
        : mode === "practice"
            ? { label: "LEETCODE", bg: "var(--medium)" }
            : { label: "PLAYGROUND", bg: "var(--info)" };

    return (
        <div style={{ ...wrapStyle, display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
            {/* Top bar */}
            <div style={{
                background: "var(--bg-surface)", padding: "0 16px", height: 40, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid var(--border)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span
                        onClick={goHome}
                        style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: 0.9, transition: "opacity 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.9"}
                        title="Back to home"
                    >
                        <img src="/logo-dark.svg" alt="" width={18} height={18} />
                        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.8, color: "var(--text-primary)" }}>AlgoPad</span>
                    </span>
                    <div style={{ width: 1, height: 16, background: "var(--border)" }} />
                    <span style={{
                        fontSize: 10, background: modeBadge.bg, color: "#fff",
                        padding: "2px 8px", borderRadius: 3, fontWeight: 600, letterSpacing: 0.5,
                    }}>
                        {modeBadge.label}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                        onClick={startTour}
                        title="Show tour"
                        style={{
                            background: "none", border: "1px solid var(--border)", color: "var(--text-muted)",
                            borderRadius: 4, width: 24, height: 24, fontSize: 12, cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                            fontWeight: 600, transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-light)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >?</button>
                    <a
                        href="https://github.com/vish-chan/AlgoFlow" target="_blank" rel="noopener noreferrer"
                        style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", padding: 4, borderRadius: 4, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                        title="View on GitHub"
                    >
                        <svg height="15" width="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    </a>
                </div>
            </div>

            {/* Main content */}
            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: 'relative' }}>
                    <div data-tour="editor" style={{ height: "50%" }}><JavaEditor ref={editorRef} mode={mode} onLoadingChange={setExecuting} onOpenSidebar={() => setSidebarOpen(true)} onProblemsLoaded={onProblemsLoaded} readOnly={!!viewingLesson} initialCode={viewingLesson?.code} /></div>
                    <div style={{ height: 3, background: "var(--border)", flexShrink: 0 }} />
                    <div data-tour="visualizer" style={{ flex: 1, minHeight: 0 }}>
                        <AlgorithmVisualizerPane
                            loading={executing}
                            annotating={!viewingLesson && annotating}
                            onAnnotatingChange={!viewingLesson ? setAnnotating : undefined}
                            annotations={annotations}
                            onAnnotationChange={handleAnnotationChange}
                            lessonViewing={!!viewingLesson}
                            onShare={handleShare}
                            cursor={cursor}
                            total={total}
                        />
                    </div>
                    {mode === 'practice' && (
                        <ProblemSidebar
                            problems={sidebarProblems}
                            problem={editorRef.current?.getProblem() ?? null}
                            onSelect={p => editorRef.current?.selectProblem(p)}
                            open={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />
                    )}
                </div>
            ) : (
                <div style={{ display: "flex", flex: 1, minHeight: 0, position: 'relative' }}>
                    <div data-tour="editor" style={{ width: `${splitPercent}%` }}><JavaEditor ref={editorRef} mode={mode} onLoadingChange={setExecuting} onOpenSidebar={() => setSidebarOpen(true)} onProblemsLoaded={onProblemsLoaded} readOnly={!!viewingLesson} initialCode={viewingLesson?.code} /></div>
                    <div
                        onMouseDown={onMouseDown}
                        style={{
                            width: 5, cursor: "col-resize", flexShrink: 0, position: "relative",
                            background: "var(--border)", transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--accent)"}
                        onMouseLeave={e => { if (!dragging.current) e.currentTarget.style.background = "var(--border)"; }}
                    />
                    <div data-tour="visualizer" style={{ flex: 1, minWidth: 0 }}>
                        <AlgorithmVisualizerPane
                            loading={executing}
                            annotating={!viewingLesson && annotating}
                            onAnnotatingChange={!viewingLesson ? setAnnotating : undefined}
                            annotations={annotations}
                            onAnnotationChange={handleAnnotationChange}
                            lessonViewing={!!viewingLesson}
                            onShare={handleShare}
                            cursor={cursor}
                            total={total}
                        />
                    </div>
                    {mode === 'practice' && (
                        <ProblemSidebar
                            problems={sidebarProblems}
                            problem={editorRef.current?.getProblem() ?? null}
                            onSelect={p => editorRef.current?.selectProblem(p)}
                            open={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                        />
                    )}
                </div>
            )}
            {showTour && (mode !== 'practice' || sidebarProblems.length > 0) && <Tour mode={tourMode} onFinish={finishTour} />}
        </div>
    );
}
