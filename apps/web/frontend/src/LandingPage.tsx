import { useEffect, useState } from "react";
import NavBar from "./NavBar";

const DEMOS = [
    { src: "/demo.gif", ms: 3000 },
    { src: "/demo2.gif", ms: 2500 },
    { src: "/demo3.gif", ms: 4000 },
];

const GITHUB_REPO = "vish-chan/AlgoFlow";

function useStarCount() {
    const [stars, setStars] = useState<number | null>(null);
    useEffect(() => {
        fetch(`https://api.github.com/repos/${GITHUB_REPO}`)
            .then(r => r.json())
            .then(d => { if (typeof d.stargazers_count === 'number') setStars(d.stargazers_count); })
            .catch(() => {});
    }, []);
    return stars;
}

function DemoSlideshow() {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const id = setTimeout(() => setIdx(i => (i + 1) % DEMOS.length), DEMOS[idx].ms);
        return () => clearTimeout(id);
    }, [idx]);

    return (
        <div className="lp-slides">
            {DEMOS.map((d, i) => (
                <img 
                    key={d.src} 
                    src={d.src} 
                    alt={`Algorithm visualization demo ${i + 1} showing step-by-step code execution`} 
                    className={i === idx ? "active" : ""} 
                />
            ))}
        </div>
    );
}

export default function LandingPage({ onNavigate }: { onNavigate: (mode: "playground" | "practice", opts?: { annotate?: boolean }) => void }) {
    const stars = useStarCount();

    return (
        <div className="lp">
            <style>{`
                .lp {
                    min-height: 100vh; background: var(--bg-base); color: var(--text-primary);
                    display: flex; flex-direction: column;
                }

                .lp-main {
                    flex: 1; display: flex; flex-direction: column;
                    align-items: center; padding: 48px 20px 32px; gap: 24px;
                }

                .lp-desc {
                    font-size: 16px; color: var(--text-muted); text-align: center;
                    max-width: 500px; line-height: 1.5; margin: 0;
                }

                .lp-actions { display: flex; gap: 8px; }
                .lp-btn {
                    padding: 7px 20px; font-size: 13px; font-weight: 600;
                    border-radius: 5px; cursor: pointer; font-family: inherit;
                    border: 1px solid var(--border); transition: all 0.12s;
                    min-width: 160px; text-align: center;
                }
                .lp-btn:active { transform: scale(0.97); }
                .lp-btn-fill {
                    background: var(--info); color: #fff; border-color: var(--info);
                    box-shadow: 0 2px 12px rgba(33,150,243,0.3);
                }
                .lp-btn-fill:hover {
                    background: #fff; color: var(--info); border-color: #fff;
                    box-shadow: 0 4px 20px rgba(255,255,255,0.15);
                }
                .lp-btn-outline {
                    background: transparent; color: var(--text-secondary);
                }
                .lp-btn-outline:hover { background: var(--bg-hover); color: var(--text-primary); }

                .lp-secondary {
                    font-size: 14px; color: var(--text-muted); background: none;
                    border: none; cursor: pointer; font-family: inherit; padding: 0;
                }
                .lp-secondary:hover { color: var(--text-secondary); }

                .lp-demo {
                    max-width: 720px; width: 100%;
                    border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
                }
                .lp-demo-bar {
                    height: 28px; background: var(--bg-elevated);
                    border-bottom: 1px solid var(--border);
                    display: flex; align-items: center; padding: 0 10px; gap: 5px;
                }
                .lp-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-light); }

                .lp-slides {
                    position: relative; width: 100%;
                    background: var(--bg-surface);
                }
                .lp-slides img {
                    width: 100%; display: block;
                    opacity: 0; transition: opacity 0.8s ease;
                }
                .lp-slides img:first-child {
                    position: relative;
                }
                .lp-slides img:not(:first-child) {
                    position: absolute; top: 0; left: 0;
                }
                .lp-slides img.active { opacity: 1; }

                .lp-footer-link {
                    color: var(--text-muted); text-decoration: none; transition: color 0.15s;
                }
                .lp-footer-link:hover { color: var(--text-secondary); }

                @media (max-width: 500px) {
                    .lp-actions { flex-direction: column; width: 100%; }
                    .lp-btn { width: 100%; text-align: center; }
                }
            `}</style>

            <NavBar badge={{ label: "BETA", bg: "var(--bg-active)" }} />

            <main className="lp-main">
                <p className="lp-desc">
                    Algorithm visualizer for Java and Python. Write normal code, see it execute step-by-step.
                </p>

                <div className="lp-actions">
                    <button className="lp-btn lp-btn-outline" onClick={() => onNavigate("practice")}>Leetcode Practice</button>
                    <button className="lp-btn lp-btn-fill" onClick={() => onNavigate("playground")}>Playground</button>
                </div>

                <button className="lp-secondary" onClick={() => onNavigate("playground", { annotate: true })}>
                    create a lesson →
                </button>

                <section className="lp-demo" aria-label="Algorithm visualization demo">
                    <div className="lp-demo-bar">
                        <div className="lp-dot" /><div className="lp-dot" /><div className="lp-dot" />
                    </div>
                    <DemoSlideshow />
                </section>
            </main>

            <footer style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16,
                padding: '16px 20px', borderTop: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text-muted)',
            }}>
                <a href={`https://github.com/${GITHUB_REPO}`} target="_blank" rel="noopener noreferrer" className="lp-footer-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <svg height="11" width="11" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>
                    Star{stars !== null && ` (${stars})`}
                </a>
                <span style={{ color: 'var(--border-light)' }}>·</span>
                <a href={`https://github.com/${GITHUB_REPO}#readme`} target="_blank" rel="noopener noreferrer" className="lp-footer-link">Docs</a>
                <span style={{ color: 'var(--border-light)' }}>·</span>
                <a href={`https://github.com/${GITHUB_REPO}/blob/main/CONTRIBUTING.md`} target="_blank" rel="noopener noreferrer" className="lp-footer-link">Contributing</a>
                <span style={{ color: 'var(--border-light)' }}>·</span>
                <a href={`https://github.com/${GITHUB_REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className="lp-footer-link">Apache-2.0</a>
            </footer>
        </div>
    );
}
