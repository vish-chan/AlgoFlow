import VisualizerCanvas from "./VisualizerCanvas";
import Controls from "./Controls";

export default function AlgorithmVisualizerPane() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
                <VisualizerCanvas />
            </div>
            <Controls />
        </div>
    );
}
