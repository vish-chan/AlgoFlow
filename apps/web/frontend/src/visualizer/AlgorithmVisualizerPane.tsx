import VisualizerCanvas from "./VisualizerCanvas";
import Controls from "./Controls";
import LessonAnnotation from "../lesson/LessonAnnotation";
import LessonBanner from "../lesson/LessonBanner";

interface Props {
    loading?: boolean;
    annotating?: boolean;
    onAnnotatingChange?: (v: boolean) => void;
    annotations?: Record<number, string>;
    onAnnotationChange?: (step: number, text: string) => void;
    lessonViewing?: boolean;
    onShare?: () => void;
    cursor?: number;
    total?: number;
}

export default function AlgorithmVisualizerPane({ loading, annotating, onAnnotatingChange, annotations, onAnnotationChange, lessonViewing, onShare, cursor, total }: Props) {
    const annotationCount = annotations ? Object.keys(annotations).filter(k => annotations[Number(k)]).length : 0;
    const currentNote = (cursor !== undefined && annotations?.[cursor]) || "";

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                position: "relative",
            }}
        >
            <div style={{ flex: 1, overflow: "auto", minHeight: 0, position: "relative" }}>
                <VisualizerCanvas />
                {lessonViewing && (
                    <LessonBanner text={currentNote} step={cursor ?? 0} total={total ?? 0} />
                )}
            </div>
            {annotating && cursor !== undefined && onAnnotationChange && onShare && (
                <LessonAnnotation
                    step={cursor}
                    total={total ?? 0}
                    value={currentNote}
                    annotationCount={annotationCount}
                    onChange={onAnnotationChange}
                    onShare={onShare}
                />
            )}
            <Controls
                annotating={annotating}
                onAnnotatingChange={onAnnotatingChange}
                onShare={!annotating && annotationCount > 0 ? onShare : undefined}
                annotations={annotations}
            />
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
                            width: 28, height: 28, border: "3px solid var(--border-light)",
                            borderTopColor: "var(--accent)", borderRadius: "50%",
                            animation: "spin 0.8s linear infinite", margin: "0 auto 10px",
                        }} />
                        <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>Executing…</div>
                    </div>
                </div>
            )}
        </div>
    );
}
