import { useEffect, useRef, useState } from "react";
import { theme } from "./constants/theme";

const FEATURES = [
    { icon: "✍️", title: "You write real code", desc: "No pseudocode, no drag-and-drop, no custom APIs. Just standard, compilable code." },
    { icon: "👁", title: "We animate it", desc: "Every array access, tree traversal, and graph edge lights up automatically as your code runs." },
    { icon: "⏯", title: "You control playback", desc: "Step forward, step back, scrub to any point. Understand exactly what happens and when." },
    { icon: "🎯", title: "Then practice for real", desc: "Curated Leetcode problems, or open the playground and run anything you want." },
];

function FloatingNodes({ count }: { count: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        let raf: number;
        const dpr = window.devicePixelRatio || 1;

        const nodes: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
        const resize = () => {
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();
        window.addEventListener("resize", resize);

        for (let i = 0; i < count; i++) {
            nodes.push({
                x: Math.random() * canvas.offsetWidth,
                y: Math.random() * canvas.offsetHeight,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: 3 + Math.random() * 3,
            });
        }

        const draw = () => {
            const w = canvas.offsetWidth, h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 150) {
                        ctx.strokeStyle = `rgba(76,175,80,${0.15 * (1 - dist / 150)})`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        ctx.stroke();
                    }
                }
            }

            for (const n of nodes) {
                n.x += n.vx; n.y += n.vy;
                if (n.x < 0 || n.x > w) n.vx *= -1;
                if (n.y < 0 || n.y > h) n.vy *= -1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(76,175,80,0.3)";
                ctx.fill();
            }
            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
    }, [count]);

    return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

function AlgoPadLogo({ size = 28 }: { size?: number }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <img src="/logo-dark.svg" alt="" width={size} height={size} />
            <span style={{ fontSize: size * 0.75, fontWeight: 800, letterSpacing: 1, color: "var(--text-primary)" }}>AlgoPad</span>
        </span>
    );
}

function TypewriterCode({ onDone }: { onDone: () => void }) {
    const lines = [
        'private int[] arr = {5, 3, 8, 1, 2};',
        '',
        'void sort() {',
        '    for (int i = 0; i < arr.length; i++)',
        '        for (int j = 0; j < arr.length-i-1; j++)',
        '            if (arr[j] > arr[j+1]) swap(j, j+1);',
        '}',
    ];
    const [displayed, setDisplayed] = useState("");
    const full = lines.join("\n");

    useEffect(() => {
        let i = 0;
        const id = setInterval(() => {
            if (i <= full.length) { setDisplayed(full.slice(0, i)); i++; }
            else { clearInterval(id); onDone(); }
        }, 12);
        return () => clearInterval(id);
    }, []);

    return (
        <pre style={{
            background: "var(--bg-elevated)", borderRadius: "0 0 8px 8px", padding: "16px 20px",
            fontSize: 12, lineHeight: 1.6, color: "#d4d4d4", fontFamily: "monospace",
            border: "1px solid var(--border-light)", margin: 0, overflow: "hidden", minHeight: 140,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
        }}>
            <span style={{ color: "#569cd6" }}>class</span>{" "}
            <span style={{ color: "#4ec9b0" }}>BubbleSort</span>{" {\n"}
            {displayed}
            <span style={{ animation: "blink 1s step-end infinite", color: "var(--accent)" }}>▎</span>
            {"\n}"}
        </pre>
    );
}

function AnimatedBars({ active }: { active: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d")!;
        const dpr = window.devicePixelRatio || 1;
        let raf: number;
        const values = [5, 3, 8, 1, 9, 2, 7, 4, 6];
        const targets = [...values].sort((a, b) => a - b);
        const current = values.map(v => v);
        const highlights = new Set<number>();
        let step = 0, frame = 0;

        const resize = () => {
            canvas.width = canvas.offsetWidth * dpr;
            canvas.height = canvas.offsetHeight * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        const swaps: [number, number][] = [];
        const tmp = [...values];
        for (let i = 0; i < tmp.length; i++)
            for (let j = 0; j < tmp.length - i - 1; j++)
                if (tmp[j] > tmp[j + 1]) {
                    [tmp[j], tmp[j + 1]] = [tmp[j + 1], tmp[j]];
                    swaps.push([j, j + 1]);
                }

        const draw = () => {
            const w = canvas.offsetWidth, h = canvas.offsetHeight;
            ctx.clearRect(0, 0, w, h);
            const barW = w / current.length;
            const maxVal = Math.max(...targets);

            for (let i = 0; i < current.length; i++) {
                const barH = (current[i] / maxVal) * (h - 10);
                const x = i * barW + 2;
                ctx.fillStyle = highlights.has(i) ? theme.accent.default : theme.accent.darker;
                ctx.beginPath();
                ctx.roundRect(x, h - barH, barW - 4, barH, 3);
                ctx.fill();
            }

            if (!active) { raf = requestAnimationFrame(draw); return; }

            frame++;
            if (frame % 20 === 0 && step < swaps.length) {
                const [a, b] = swaps[step];
                [current[a], current[b]] = [current[b], current[a]];
                highlights.clear(); highlights.add(a); highlights.add(b);
                step++;
            } else if (step >= swaps.length && frame % 20 === 0) {
                highlights.clear();
                for (let i = 0; i < values.length; i++) current[i] = values[i];
                step = 0;
            }

            raf = requestAnimationFrame(draw);
        };
        draw();
        return () => cancelAnimationFrame(raf);
    }, [active]);

    return <canvas ref={canvasRef} style={{ width: "100%", height: 120, borderRadius: 8 }} />;
}

export default function LandingPage({ onNavigate }: { onNavigate: (mode: "playground" | "practice", opts?: { annotate?: boolean }) => void }) {
    const [visible, setVisible] = useState(false);
    const [codeTyped, setCodeTyped] = useState(false);
    const [runClicked, setRunClicked] = useState(false);
    const [running, setRunning] = useState(false);
    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
    useEffect(() => {
        if (!codeTyped) return;
        const t1 = setTimeout(() => { setRunClicked(true); setRunning(true); }, 200);
        const t2 = setTimeout(() => setRunning(false), 600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [codeTyped]);

    return (
        <div style={{ minHeight: "100vh", background: "var(--bg-base)", color: "var(--text-primary)", overflow: "auto" }}>
            <style>{`
                @keyframes blink { 50% { opacity: 0; } }
                @keyframes glow { 0%, 100% { box-shadow: 0 0 20px var(--accent-glow); } 50% { box-shadow: 0 0 40px var(--accent-glow); } }
                .landing-btn { padding: 14px 32px; font-size: 16px; min-width: 220px; text-align: center; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px; }
                .landing-btn:hover { transform: translateY(-2px); }
                .landing-btn:active { transform: translateY(0); }
                .btn-primary { background: var(--accent); color: #fff; }
                .btn-primary:hover { background: var(--accent-hover); box-shadow: 0 8px 24px var(--accent-glow); }
                .btn-secondary { background: transparent; color: var(--accent); border: 2px solid var(--accent) !important; }
                .btn-secondary:hover { background: rgba(76,175,80,0.1); box-shadow: 0 8px 24px var(--accent-glow); }
                .feature-card { background: var(--bg-surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; transition: all 0.2s; }
                .feature-card:hover { border-color: var(--accent); transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
                @media (max-width: 600px) {
                    .landing-btn { min-width: 0; width: 100%; padding: 14px 20px; font-size: 15px; }
                    .hero-heading { font-size: 32px !important; }
                    .hero-sub { font-size: 15px !important; }
                }
            `}</style>

            {/* Hero */}
            <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <FloatingNodes count={40} />

                <div style={{
                    position: "relative", zIndex: 1, maxWidth: 1100, width: "100%", padding: "40px 16px",
                    display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
                    opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)",
                    transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                    {/* Left — text */}
                    <div style={{ flex: "1 1 320px", maxWidth: 520 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                            <AlgoPadLogo size={28} />
                            <span style={{ fontSize: 10, background: "var(--accent)", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>BETA</span>
                        </div>
                        <h1 className="hero-heading" style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px", letterSpacing: -1 }}>
                            See your algorithms{" "}
                            <span style={{ color: "var(--accent)" }}>come alive</span>
                        </h1>
                        <p className="hero-sub" style={{ fontSize: 17, color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 36px" }}>
                            Write code. Hit run. Watch it animate — common data structures visualized automatically.
                            Not a line-by-line debugger. Not a slideshow. A real-time algorithm visualizer.
                        </p>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            <button className="landing-btn btn-primary" onClick={() => onNavigate("practice")}>
                                🎯 Practice Leetcode
                            </button>
                            <button className="landing-btn btn-secondary" onClick={() => onNavigate("playground")}>
                                ⚡ Playground
                            </button>
                        </div>
                        <button
                            onClick={() => onNavigate("playground", { annotate: true })}
                            style={{
                                marginTop: 14, background: "none", border: "none",
                                color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 6,
                                padding: 0, transition: "color 0.15s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                        >
                            📝 Create a lesson for your students →
                        </button>
                    </div>

                    {/* Right — demo */}
                    <div style={{ flex: "1 1 280px", maxWidth: 440, animation: "glow 3s ease-in-out infinite" }}>
                        <div style={{ background: "var(--bg-elevated)", borderRadius: "8px 8px 0 0", border: "1px solid var(--border-light)", borderBottom: "none", padding: "4px 8px", display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                            <div style={{
                                padding: "2px 10px", fontSize: 11, fontWeight: 600, borderRadius: 3,
                                background: running ? "var(--accent-hover)" : (runClicked ? "var(--accent)" : (codeTyped ? "var(--accent)" : "var(--border-light)")),
                                color: running ? "#fff" : (codeTyped ? "#fff" : "var(--text-faint)"),
                                transition: "all 0.2s",
                                transform: runClicked && !running ? "scale(1)" : (running ? "scale(0.95)" : "scale(1)"),
                            }}>
                                {running ? "▶" : (runClicked ? "⏸" : "▶")}
                            </div>
                        </div>
                        <TypewriterCode onDone={() => setCodeTyped(true)} />
                        <div style={{ marginTop: 8, background: "var(--bg-surface)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Visualization</div>
                            <AnimatedBars active={runClicked && !running} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 16px 48px" }}>
                <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 32 }}>Why AlgoPad?</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                    {FEATURES.map((f, i) => (
                        <div key={i} className="feature-card">
                            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", padding: "24px", fontSize: 12, color: "var(--text-faint)", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <a href="https://github.com/vish-chan/AlgoFlow" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                    <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                    Open Source
                </a>
                <span style={{ color: "var(--border-light)" }}>·</span>
                <a href="https://github.com/vish-chan/AlgoFlow/issues" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
                    Feedback
                </a>
            </div>
        </div>
    );
}
