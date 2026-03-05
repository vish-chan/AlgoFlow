import JavaEditor from "./JavaEditor";
import AlgorithmVisualizerPane from "./visualizer/AlgorithmVisualizerPane";

export default function App() {
    return (
        <div style={{ display: "flex", width: "100vw", height: "100vh" }}>
            <div style={{ flex: "0 0 50%" }}>
                <JavaEditor />
            </div>
            <div style={{ flex: 1 }}>
                <AlgorithmVisualizerPane />
            </div>
        </div>
    );
}
