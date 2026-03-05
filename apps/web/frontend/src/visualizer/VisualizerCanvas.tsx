import { useEffect, useRef, useState } from "react";
import { getEngine, subscribe } from "./visualizerEngine";

export default function VisualizerCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [, forceUpdate] = useState({});

    useEffect(() => {
        if (!containerRef.current) return;

        const engine = getEngine();
        engine.mount(containerRef.current);

        const unsubscribe = subscribe(() => {
            forceUpdate({});
        });

        return () => {
            unsubscribe();
            engine.unmount();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: "100%",
                minHeight: "100%",
                background: "#111",
            }}
        />
    );
}
