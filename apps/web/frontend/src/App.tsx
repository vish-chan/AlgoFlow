import { useState, useCallback, useRef, useEffect } from "react";
import JavaEditor from "./JavaEditor";
import AlgorithmVisualizerPane from "./visualizer/AlgorithmVisualizerPane";
import Tour, { useTour } from "./Tour";
import LandingPage from "./LandingPage";

type Mode = "landing" | "playground" | "practice";

const MOBILE_BREAKPOINT = 768;

function parseHash(): Mode {
    const h = window.location.hash.slice(1);
    if (h === "playground" || h === "practice") return h;
    return "landing";
}

export default function App() {
    const [mode, setMode] = useState<Mode>(parseHash);
    const [splitPercent, setSplitPercent] = useState(40);
    const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);
    const dragging = useRef(false);
    const { showTour, startTour, finishTour } = useTour();
    const [executing, setExecuting] = useState(false);

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

    const navigate = useCallback((m: "playground" | "practice") => {
        window.location.hash = m;
        setMode(m);
    }, []);

    const goHome = useCallback(() => {
        window.location.hash = "";
        setMode("landing");
    }, []);

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

    if (mode === "landing") {
        return <LandingPage onNavigate={navigate} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100vw", height: "100vh" }}>
            <div style={{ background: "#1a1a1a", color: "#fff", padding: "4px 12px", fontSize: 12, fontWeight: 600, letterSpacing: 0.5, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #333" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span onClick={goHome} style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }} title="Back to home">AlgoPad</span>
                    <span style={{ fontSize: 9, background: mode === "practice" ? "#f57c00" : "#2196F3", color: "#fff", padding: "1px 6px", borderRadius: 3, fontWeight: 600, letterSpacing: 0.5 }}>
                        {mode === "practice" ? "BLIND 75" : "PLAYGROUND"}
                    </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={startTour} title="Show tour" style={{ background: "none", border: "1px solid #444", color: "#888", borderRadius: "50%", width: 20, height: 20, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, fontWeight: 700 }}>?</button>
                    <a href="https://github.com/vish-chan/AlgoFlow" target="_blank" rel="noopener noreferrer" style={{ color: "#888", display: "inline-flex", alignItems: "center" }} title="View on GitHub">
                        <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    </a>
                </div>
            </div>
            {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                    <div data-tour="editor" style={{ height: "50%" }}><JavaEditor mode={mode} onLoadingChange={setExecuting} /></div>
                    <div style={{ height: 3, background: "#333", flexShrink: 0 }} />
                    <div data-tour="visualizer" style={{ flex: 1, minHeight: 0 }}><AlgorithmVisualizerPane loading={executing} /></div>
                </div>
            ) : (
                <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                    <div data-tour="editor" style={{ width: `${splitPercent}%` }}><JavaEditor mode={mode} onLoadingChange={setExecuting} /></div>
                    <div onMouseDown={onMouseDown} style={{ width: 4, cursor: "col-resize", background: "#333", flexShrink: 0 }} />
                    <div data-tour="visualizer" style={{ flex: 1, minWidth: 0 }}><AlgorithmVisualizerPane loading={executing} /></div>
                </div>
            )}
            {showTour && <Tour onFinish={finishTour} />}
        </div>
    );
}
