import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
import JavaEditor, { ProblemSidebar } from "./JavaEditor";
import type { JavaEditorHandle } from "./JavaEditor";
import AlgorithmVisualizerPane from "./visualizer/AlgorithmVisualizerPane";
import Tour, { useTour } from "./Tour";
import LandingPage from "./LandingPage";
import { parseLessonFromURL, buildLessonURL, detectLanguage } from "./lesson/lessonStore";
import type { Lesson } from "./lesson/lessonStore";
import { subscribe, getEngine, loadCommands } from "./visualizer/visualizerEngine";
import NavBar from "./NavBar";

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
    const appRef = useRef<HTMLDivElement>(null);

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
        const language = editorRef.current?.getLang?.() ?? 'java';
        const lesson: Lesson = { code, annotations, language };
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
        loadCommands([]);
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
        loadCommands([]);
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
        <div ref={appRef} style={{ ...wrapStyle, display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
            <NavBar
                badge={modeBadge}
                onLogoClick={goHome}
                onTourClick={startTour}
            />

            {/* Main content */}
            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, position: 'relative' }}>
                    <div data-tour="editor" style={{ height: "50%" }}><JavaEditor ref={editorRef} mode={mode} onLoadingChange={setExecuting} onOpenSidebar={() => setSidebarOpen(true)} onProblemsLoaded={onProblemsLoaded} readOnly={!!viewingLesson} initialCode={viewingLesson?.code} initialLanguage={viewingLesson ? (viewingLesson.language ?? detectLanguage(viewingLesson.code)) : undefined} /></div>
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
                            appContainer={appRef.current}
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
                    <div data-tour="editor" style={{ width: `${splitPercent}%` }}><JavaEditor ref={editorRef} mode={mode} onLoadingChange={setExecuting} onOpenSidebar={() => setSidebarOpen(true)} onProblemsLoaded={onProblemsLoaded} readOnly={!!viewingLesson} initialCode={viewingLesson?.code} initialLanguage={viewingLesson ? (viewingLesson.language ?? detectLanguage(viewingLesson.code)) : undefined} /></div>
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
                            appContainer={appRef.current}
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
