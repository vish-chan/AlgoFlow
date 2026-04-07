const GitHubIcon = () => (
    <svg height="15" width="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
);

interface NavBarProps {
    badge?: { label: string; bg: string };
    onLogoClick?: () => void;
    onTourClick?: () => void;
}

export default function NavBar({ badge, onLogoClick, onTourClick }: NavBarProps) {
    const logoTitle = onLogoClick ? "Back to home" : undefined;

    return (
        <div style={{
            background: "var(--bg-surface)", padding: "0 20px", height: 40, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: "1px solid var(--border)",
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                    onClick={onLogoClick}
                    style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: onLogoClick ? "pointer" : "default", opacity: 0.9, transition: "opacity 0.15s" }}
                    onMouseEnter={e => { if (onLogoClick) e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={e => { if (onLogoClick) e.currentTarget.style.opacity = "0.9"; }}
                    title={logoTitle}
                >
                    <img src="/logo-dark.svg" alt="" width={16} height={16} />
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 0.3, color: "var(--text-primary)" }}>AlgoPad</span>
                </span>
                {badge && (
                    <>
                        <div style={{ width: 1, height: 16, background: "var(--border)" }} />
                        <span style={{
                            fontSize: 10, background: badge.bg, color: "#fff",
                            padding: "2px 8px", borderRadius: 3, fontWeight: 600, letterSpacing: 0.5,
                        }}>
                            {badge.label}
                        </span>
                    </>
                )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {onTourClick && (
                    <button
                        className="btn btn-ghost"
                        onClick={onTourClick}
                        title="Show tour"
                        style={{ padding: '4px 8px' }}
                    >?</button>
                )}
                <a
                    href="https://github.com/vish-chan/AlgoFlow/issues" target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", padding: 4, borderRadius: 4, transition: "color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                    title="Feedback"
                >
                    <svg height="15" width="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </a>
                <a
                    href="https://github.com/vish-chan/AlgoFlow" target="_blank" rel="noopener noreferrer"
                    style={{ color: "var(--text-muted)", display: "inline-flex", alignItems: "center", padding: 4, borderRadius: 4, transition: "color 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--text-secondary)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                    title="View on GitHub"
                >
                    <GitHubIcon />
                </a>
            </div>
        </div>
    );
}
