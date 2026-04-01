import { useEffect, useRef, useState } from "react";

const FEATURES = [
    { icon: "👁", title: "See Your Code Run", desc: "Watch arrays sort, trees traverse, and graphs explore — step by step." },
    { icon: "☕", title: "Write Real Java", desc: "No pseudocode. No custom APIs. Just standard Java that compiles and runs." },
    { icon: "⚡", title: "Zero Setup", desc: "Declare a field, run your code. Arrays, trees, and graphs visualize automatically." },
    { icon: "🎯", title: "Built for Practice", desc: "Curated Blind 75 problems with instant visual feedback on your solution." },
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

            // edges
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

            // nodes
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
            <span style={{ fontSize: size * 0.75, fontWeight: 800, letterSpacing: 1, color: "#fff" }}>AlgoPad</span>
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
            background: "#1e1e1e", borderRadius: 8, padding: "16px 20px",
            fontSize: 13, lineHeight: 1.6, color: "#d4d4d4", fontFamily: "monospace",
            border: "1px solid #333", margin: 0, overflow: "hidden", minHeight: 160,
        }}>
            <span style={{ color: "#569cd6" }}>class</span>{" "}
            <span style={{ color: "#4ec9b0" }}>BubbleSort</span>{" {\n"}
            {displayed}
            <span style={{ animation: "blink 1s step-end infinite", color: "#4CAF50" }}>▎</span>
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

        // Generate swap sequence (bubble sort)
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
                ctx.fillStyle = highlights.has(i) ? "#4CAF50" : "#2a5a3a";
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
                // Reset
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

export default function LandingPage({ onNavigate }: { onNavigate: (mode: "playground" | "practice") => void }) {
    const [visible, setVisible] = useState(false);
    const [codeTyped, setCodeTyped] = useState(false);
    useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

    return (
        <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#fff", overflow: "auto" }}>
            <style>{`
                @keyframes blink { 50% { opacity: 0; } }
                @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes glow { 0%, 100% { box-shadow: 0 0 20px rgba(76,175,80,0.15); } 50% { box-shadow: 0 0 40px rgba(76,175,80,0.3); } }
                .landing-btn { padding: 14px 32px; font-size: 16px; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; transition: all 0.2s; letter-spacing: 0.5px; }
                .landing-btn:hover { transform: translateY(-2px); }
                .landing-btn:active { transform: translateY(0); }
                .btn-primary { background: #4CAF50; color: #fff; }
                .btn-primary:hover { background: #43a047; box-shadow: 0 8px 24px rgba(76,175,80,0.3); }
                .btn-secondary { background: transparent; color: #4CAF50; border: 2px solid #4CAF50 !important; }
                .btn-secondary:hover { background: rgba(76,175,80,0.1); box-shadow: 0 8px 24px rgba(76,175,80,0.15); }
                .feature-card { background: #141414; border: 1px solid #222; border-radius: 12px; padding: 24px; transition: all 0.2s; }
                .feature-card:hover { border-color: #4CAF50; transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
            `}</style>

            {/* Hero */}
            <div style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <FloatingNodes count={40} />

                <div style={{
                    position: "relative", zIndex: 1, maxWidth: 1100, width: "100%", padding: "40px 24px",
                    display: "flex", gap: 60, alignItems: "center", flexWrap: "wrap", justifyContent: "center",
                    opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)",
                    transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                    {/* Left — text */}
                    <div style={{ flex: "1 1 400px", maxWidth: 520 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                            <AlgoPadLogo size={28} />
                            <span style={{ fontSize: 10, background: "#4CAF50", color: "#fff", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>BETA</span>
                        </div>
                        <h1 style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, margin: "0 0 20px", letterSpacing: -1 }}>
                            See your algorithms{" "}
                            <span style={{ color: "#4CAF50" }}>come alive</span>
                        </h1>
                        <p style={{ fontSize: 18, color: "#999", lineHeight: 1.6, margin: "0 0 16px" }}>
                            Write Java. Hit run. Watch arrays sort, trees traverse, and graphs explore — all animated automatically. No setup, no custom APIs.
                        </p>
                        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 36px" }}>
                            The only algorithm visualizer where you write real, compilable Java and the visualization just works.
                        </p>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            <button className="landing-btn btn-primary" onClick={() => onNavigate("practice")}>
                                🎯 Practice Blind 75
                            </button>
                            <button className="landing-btn btn-secondary" onClick={() => onNavigate("playground")}>
                                ⚡ Playground
                            </button>
                        </div>
                    </div>

                    {/* Right — demo */}
                    <div style={{ flex: "1 1 360px", maxWidth: 440, animation: "glow 3s ease-in-out infinite" }}>
                        <TypewriterCode onDone={() => setCodeTyped(true)} />
                        <div style={{ marginTop: 12, background: "#111", borderRadius: 8, padding: 16, border: "1px solid #222" }}>
                            <div style={{ fontSize: 10, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Live Visualization</div>
                            <AnimatedBars active={codeTyped} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Features */}
            <div style={{ maxWidth: 1000, margin: "0 auto", padding: "80px 24px" }}>
                <h2 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, marginBottom: 12 }}>
                    Why AlgoPad?
                </h2>
                <p style={{ textAlign: "center", color: "#666", fontSize: 16, marginBottom: 48, maxWidth: 500, marginLeft: "auto", marginRight: "auto" }}>
                    Most visualizers make you learn their API. AlgoPad instruments your actual Java code.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
                    {FEATURES.map((f, i) => (
                        <div key={i} className="feature-card" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{f.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* How it works */}
            <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px 80px" }}>
                <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 700, marginBottom: 40 }}>
                    How it works
                </h2>
                <div style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
                    {[
                        { step: "1", title: "Write Java", desc: "Declare arrays, trees, or graphs as fields. Use @Tree or @Graph annotations." },
                        { step: "2", title: "Hit Run", desc: "Your code compiles and executes on the backend. Every field access is tracked." },
                        { step: "3", title: "Watch & Learn", desc: "Step through the visualization. See exactly what your code does at each line." },
                    ].map((s, i) => (
                        <div key={i} style={{ flex: "1 1 200px", maxWidth: 240, textAlign: "center" }}>
                            <div style={{
                                width: 40, height: 40, borderRadius: "50%", background: "#1a3a1a",
                                border: "2px solid #4CAF50", display: "flex", alignItems: "center", justifyContent: "center",
                                margin: "0 auto 14px", fontSize: 16, fontWeight: 800, color: "#4CAF50",
                            }}>{s.step}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                            <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{s.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div style={{ textAlign: "center", padding: "60px 24px 80px", borderTop: "1px solid #1a1a1a" }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Ready to start?</h2>
                <p style={{ color: "#666", fontSize: 15, marginBottom: 32 }}>Pick your path and start visualizing algorithms.</p>
                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                    <button className="landing-btn btn-primary" onClick={() => onNavigate("practice")}>
                        🎯 Practice Blind 75
                    </button>
                    <button className="landing-btn btn-secondary" onClick={() => onNavigate("playground")}>
                        ⚡ Playground
                    </button>
                </div>
                <div style={{ marginTop: 32, fontSize: 12, color: "#444", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <a href="https://github.com/vish-chan/AlgoFlow" target="_blank" rel="noopener noreferrer" style={{ color: "#888", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                        <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                        Open Source
                    </a>
                    <span style={{ color: "#333" }}>·</span>
                    <a href="https://github.com/vish-chan/AlgoFlow/issues" target="_blank" rel="noopener noreferrer" style={{ color: "#888", textDecoration: "none" }}>
                        Feedback
                    </a>
                </div>
            </div>
        </div>
    );
}
