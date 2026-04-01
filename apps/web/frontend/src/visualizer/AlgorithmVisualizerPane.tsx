import VisualizerCanvas from "./VisualizerCanvas";
import Controls from "./Controls";

export default function AlgorithmVisualizerPane({ loading }: { loading?: boolean }) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                position: "relative",
            }}
        >
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                <VisualizerCanvas />
            </div>
            <Controls />
            {loading && (
                <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    zIndex: 5,
                }}>
                    <style>{`
                        @keyframes spin { to { transform: rotate(360deg); } }
                    `}</style>
                    <div style={{ textAlign: "center" }}>
                        <div style={{
                            width: 28, height: 28, border: "3px solid #333",
                            borderTopColor: "#4CAF50", borderRadius: "50%",
                            animation: "spin 0.8s linear infinite", margin: "0 auto 10px",
                        }} />
                        <div style={{ color: "#888", fontSize: 12 }}>Executing…</div>
                    </div>
                </div>
            )}
        </div>
    );
}
