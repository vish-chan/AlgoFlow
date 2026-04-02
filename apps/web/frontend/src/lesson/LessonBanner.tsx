import { useState, useEffect } from "react";

interface Props {
    text: string;
    step: number;
    total: number;
}

export default function LessonBanner({ text, step, total }: Props) {
    const [visible, setVisible] = useState(!!text);
    const [displayText, setDisplayText] = useState(text);

    useEffect(() => {
        if (text) {
            setDisplayText(text);
            setVisible(true);
        } else {
            setVisible(false);
        }
    }, [text, step]);

    if (!visible && !displayText) return null;

    return (
        <div data-tour="lesson-banner" style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 4,
            pointerEvents: "none",
        }}>
            <div style={{
                margin: "0 12px 12px", padding: "10px 16px",
                background: "rgba(20, 20, 20, 0.92)", backdropFilter: "blur(8px)",
                borderRadius: 8, border: "1px solid var(--accent)",
                boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 0.25s ease, transform 0.25s ease",
                display: "flex", alignItems: "flex-start", gap: 10,
            }}>
                <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>💡</span>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: 13, color: "#fff", lineHeight: 1.5,
                    }}>{displayText}</div>
                    <div style={{
                        fontSize: 10, color: "var(--text-muted)", marginTop: 4,
                    }}>Step {step}/{total}</div>
                </div>
            </div>
        </div>
    );
}
