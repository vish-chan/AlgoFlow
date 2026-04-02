import { useState, useEffect, useRef } from "react";

interface Props {
    step: number;
    total: number;
    value: string;
    annotationCount: number;
    onChange: (step: number, text: string) => void;
    onShare: () => void;
}

export default function LessonAnnotation({ step, total, value, annotationCount, onChange, onShare }: Props) {
    const [text, setText] = useState(value);
    const ref = useRef<HTMLTextAreaElement>(null);

    useEffect(() => { setText(value); }, [value, step]);
    useEffect(() => { ref.current?.focus(); }, [step]);

    const commit = () => onChange(step, text.trim());

    return (
        <div style={{
            background: "var(--bg-elevated)", borderTop: "1px solid var(--accent)",
            display: "flex", flexDirection: "column",
        }}>
            {/* Header bar */}
            <div style={{
                padding: "6px 12px", display: "flex", alignItems: "center",
                justifyContent: "space-between", borderBottom: "1px solid var(--border)",
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: "var(--accent)",
                        background: "rgba(76,175,80,0.1)", padding: "2px 8px",
                        borderRadius: 3, letterSpacing: 0.5,
                    }}>📝 ANNOTATING</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Step {step}/{total}
                    </span>
                    {annotationCount > 0 && (
                        <span style={{
                            fontSize: 10, color: "var(--text-secondary)",
                            background: "var(--bg-active)", padding: "1px 6px",
                            borderRadius: 10,
                        }}>
                            {annotationCount} note{annotationCount !== 1 ? "s" : ""}
                        </span>
                    )}
                </div>
                <button
                    onClick={onShare}
                    disabled={annotationCount === 0}
                    style={{
                        fontSize: 11, fontWeight: 600, cursor: annotationCount > 0 ? "pointer" : "not-allowed",
                        background: annotationCount > 0 ? "var(--accent)" : "var(--border)",
                        color: "#fff", border: "none", borderRadius: 4,
                        padding: "4px 12px", transition: "all 0.15s",
                        opacity: annotationCount > 0 ? 1 : 0.5,
                    }}
                >
                    🔗 Share Lesson
                </button>
            </div>
            {/* Hint for first-time users */}
            {annotationCount === 0 && step === 0 && (
                <div style={{
                    padding: "6px 12px", fontSize: 11, color: "var(--text-muted)",
                    lineHeight: 1.5, borderBottom: "1px solid var(--border)",
                }}>
                    💡 Write code → Run → Step through the visualization and add notes at key moments → Share the lesson URL with your students
                </div>
            )}
            {/* Input */}
            <div style={{ padding: "6px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                {value ? (
                    <span style={{ fontSize: 14, lineHeight: 1 }} title="This step has a note">💬</span>
                ) : (
                    <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.3 }} title="No note on this step">💬</span>
                )}
                <textarea
                    ref={ref}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onBlur={commit}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); } }}
                    placeholder="Type a note for this step… (Enter to save)"
                    rows={1}
                    style={{
                        flex: 1, resize: "none", fontSize: 12, fontFamily: "sans-serif",
                        background: "var(--bg-active)", color: "var(--text-primary)",
                        border: value ? "1px solid var(--accent)" : "1px solid var(--border)",
                        borderRadius: 4, padding: "5px 8px", outline: "none",
                        transition: "border-color 0.15s",
                    }}
                />
                {text.trim() && (
                    <button
                        onClick={() => { setText(""); onChange(step, ""); }}
                        style={{
                            background: "none", border: "none", color: "var(--text-muted)",
                            cursor: "pointer", fontSize: 14, padding: "2px 4px",
                        }}
                        title="Remove note"
                    >✕</button>
                )}
            </div>
        </div>
    );
}
