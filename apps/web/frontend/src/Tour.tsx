import { useState, useEffect, useCallback } from "react";

const TOUR_KEY = "algoflow-tour-seen";

interface Step {
    target: string;
    title: string;
    body: string;
    position: "bottom" | "top" | "left" | "right";
}

const STEPS: Step[] = [
    { target: "[data-tour='editor']", title: "Code Editor", body: "Write your Java code here. Arrays, graphs, and trees are auto-visualized.", position: "right" },
    { target: "[data-tour='run']", title: "Run", body: "Click Run or press ⌘/Ctrl+Enter to execute and visualize.", position: "top" },
    { target: "[data-tour='visualizer']", title: "Visualizer", body: "Your algorithm animates here — arrays, graphs, trees, and more.", position: "left" },
    { target: "[data-tour='controls']", title: "Playback Controls", body: "Play, pause, step through, scrub, and adjust speed.", position: "top" },
];

export function useTour() {
    const [seen, setSeen] = useState(() => {
        try { return localStorage.getItem(TOUR_KEY) === "1"; } catch { return false; }
    });
    const start = useCallback(() => setSeen(false), []);
    const finish = useCallback(() => {
        setSeen(true);
        try { localStorage.setItem(TOUR_KEY, "1"); } catch {}
    }, []);
    return { showTour: !seen, startTour: start, finishTour: finish };
}

export default function Tour({ onFinish }: { onFinish: () => void }) {
    const [step, setStep] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);

    const updateRect = useCallback(() => {
        const el = document.querySelector(STEPS[step].target);
        if (el) setRect(el.getBoundingClientRect());
    }, [step]);

    useEffect(() => {
        // Clear previous rect immediately so we don't flash at the old position
        setRect(null);
        const t = setTimeout(updateRect, 150);
        window.addEventListener("resize", updateRect);
        return () => { clearTimeout(t); window.removeEventListener("resize", updateRect); };
    }, [updateRect]);

    const next = () => {
        if (step < STEPS.length - 1) setStep(step + 1);
        else onFinish();
    };

    const skip = () => onFinish();

    if (!rect) return null;

    const s = STEPS[step];
    const pad = 6;
    const tipW = 260;
    const tipH = 120;

    // Position tooltip relative to highlighted element
    let tipX = 0, tipY = 0;
    if (s.position === "right") { tipX = rect.right + 12; tipY = rect.top + rect.height / 2 - tipH / 2; }
    else if (s.position === "left") { tipX = rect.left - tipW - 12; tipY = rect.top + rect.height / 2 - tipH / 2; }
    else if (s.position === "bottom") { tipX = rect.left + rect.width / 2 - tipW / 2; tipY = rect.bottom + 12; }
    else { tipX = rect.left + rect.width / 2 - tipW / 2; tipY = rect.top - tipH - 12; }

    // Clamp to viewport
    tipX = Math.max(8, Math.min(window.innerWidth - tipW - 8, tipX));
    tipY = Math.max(8, Math.min(window.innerHeight - tipH - 8, tipY));

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
            {/* Backdrop with cutout */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <defs>
                    <mask id="tour-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                            x={rect.left - pad} y={rect.top - pad}
                            width={rect.width + pad * 2} height={rect.height + pad * 2}
                            rx={6} fill="black"
                        />
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
            </svg>

            {/* Highlight border */}
            <div style={{
                position: "absolute",
                left: rect.left - pad, top: rect.top - pad,
                width: rect.width + pad * 2, height: rect.height + pad * 2,
                border: "2px solid #4CAF50",
                borderRadius: 6,
                pointerEvents: "none",
                boxShadow: "0 0 0 4px rgba(76,175,80,0.2)",
            }} />

            {/* Tooltip with arrow */}
            <div style={{
                position: "absolute",
                left: tipX, top: tipY,
                width: tipW,
                background: "#1e1e1e",
                border: "1px solid #4CAF50",
                borderRadius: 8,
                padding: "14px 16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}>
                {/* Arrow */}
                <div style={{
                    position: "absolute",
                    width: 0, height: 0,
                    ...(s.position === "right" ? {
                        left: -8, top: "50%", transform: "translateY(-50%)",
                        borderTop: "8px solid transparent", borderBottom: "8px solid transparent",
                        borderRight: "8px solid #4CAF50",
                    } : s.position === "left" ? {
                        right: -8, top: "50%", transform: "translateY(-50%)",
                        borderTop: "8px solid transparent", borderBottom: "8px solid transparent",
                        borderLeft: "8px solid #4CAF50",
                    } : s.position === "bottom" ? {
                        top: -8, left: "50%", transform: "translateX(-50%)",
                        borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
                        borderBottom: "8px solid #4CAF50",
                    } : {
                        bottom: -8, left: "50%", transform: "translateX(-50%)",
                        borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
                        borderTop: "8px solid #4CAF50",
                    }),
                }} />
                <div style={{ color: "#4CAF50", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                    {step + 1}/{STEPS.length} — {s.title}
                </div>
                <div style={{ color: "#ccc", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
                    {s.body}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                        onClick={skip}
                        style={{ background: "none", border: "none", color: "#666", fontSize: 11, cursor: "pointer", padding: 0 }}
                    >
                        Skip tour
                    </button>
                    <button
                        onClick={next}
                        style={{
                            background: "#4CAF50", color: "#fff", border: "none",
                            borderRadius: 4, padding: "5px 14px", fontSize: 12,
                            fontWeight: 600, cursor: "pointer",
                        }}
                    >
                        {step < STEPS.length - 1 ? "Next" : "Got it!"}
                    </button>
                </div>
            </div>
        </div>
    );
}
