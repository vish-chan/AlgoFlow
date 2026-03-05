import Editor from "@monaco-editor/react";
import { useState } from "react";
import { loadCommands, play } from "./visualizer/visualizerEngine";
import { executeJavaCode } from "./api/backend";
import { DEFAULT_JAVA_CODE, SAMPLE_COMMANDS } from "./constants/sampleCode";

export default function JavaEditor() {
    const [code, setCode] = useState(DEFAULT_JAVA_CODE);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRun = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const commands = await executeJavaCode(code);
            loadCommands(commands);
            play();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Execution failed');
            console.error('Execution error:', err);
            loadCommands(SAMPLE_COMMANDS);
            play();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: 1 }}>
                <Editor
                    width="100%"
                    height="100%"
                    language="java"
                    theme="vs-dark"
                    value={code}
                    onChange={(v) => setCode(v ?? "")}
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        automaticLayout: true,
                    }}
                />
            </div>

            <div
                style={{
                    padding: "10px",
                    backgroundColor: "#1e1e1e",
                    borderTop: "1px solid #444",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                {error && <span style={{ color: "#f44336", fontSize: 12 }}>{error}</span>}
                <div style={{ flex: 1 }} />
                <button
                    onClick={handleRun}
                    disabled={loading}
                    style={{
                        padding: "6px 12px",
                        fontSize: 14,
                        cursor: loading ? "not-allowed" : "pointer",
                    }}
                >
                    {loading ? "Running..." : "Run"}
                </button>
            </div>
        </div>
    );
}
