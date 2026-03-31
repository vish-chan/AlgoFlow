import React, { useEffect, useRef, useState, useCallback } from "react";
import { getEngine, subscribe } from "./visualizerEngine";

function PaneResizeHandle() {
    const [dragging, setDragging] = useState(false);
    return (
        <div
            style={{
                height: 5,
                cursor: "row-resize",
                background: dragging ? "#555" : "#2a2a2a",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#444')}
            onMouseLeave={e => { if (!dragging) e.currentTarget.style.background = '#2a2a2a'; }}
            onMouseDown={e => {
                setDragging(true);
                const handle = e.currentTarget;
                const prev = handle.previousElementSibling as HTMLElement;
                const next = handle.nextElementSibling as HTMLElement;
                if (!prev || !next) return;
                const startY = e.clientY;
                const prevH = prev.offsetHeight;
                const nextH = next.offsetHeight;
                const onMove = (ev: MouseEvent) => {
                    const dy = ev.clientY - startY;
                    prev.style.maxHeight = Math.max(40, prevH + dy) + 'px';
                    next.style.maxHeight = Math.max(40, nextH - dy) + 'px';
                };
                const onUp = () => {
                    setDragging(false);
                    handle.style.background = '#2a2a2a';
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            }}
        >
            <div style={{ width: 30, height: 2, borderRadius: 1, background: '#555' }} />
        </div>
    );
}

function ChildPane({ child, renderer }: { child: any; renderer: any; isFirst?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const regionsRef = useRef<any[]>([]);
    const tooltipRef = useRef<any[]>([]);
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
    const [, forceUpdate] = useState({});

    const paint = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const dpr = window.devicePixelRatio || 1;
        const containerW = container.clientWidth;
        const naturalW = renderer.calcChildWidth(child) || containerW;
        const w = Math.max(containerW, naturalW);
        const h = renderer.calcChildHeight(child);
        const newW = Math.round(w * dpr);
        const newH = Math.round(h * dpr);
        if (canvas.width !== newW || canvas.height !== newH) {
            canvas.width = newW;
            canvas.height = newH;
            canvas.style.width = w + "px";
            canvas.style.height = h + "px";
        }
        renderer.renderChildToCanvas(canvas, child);
        regionsRef.current = [...renderer.getClickRegions()];
        tooltipRef.current = [...renderer.getTooltipRegions()];
        if (child?.type === 'locals' && container.scrollTop > 0) {
            container.scrollTop = 0;
        }
    }, [child, renderer]);

    useEffect(() => {
        paint();
        const ro = new ResizeObserver(paint);
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [paint]);

    // Click + hover handling for interactive elements (e.g. locals frame toggle)
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const hitTest = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            for (let i = 0; i < regionsRef.current.length; i++) {
                const r = regionsRef.current[i];
                if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return i;
            }
            return -1;
        };
        const onClick = (e: MouseEvent) => {
            const idx = hitTest(e);
            if (idx >= 0) { regionsRef.current[idx].action(); paint(); forceUpdate({}); }
        };
        const onMove = (e: MouseEvent) => {
            const idx = hitTest(e);
            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            canvas.style.cursor = idx >= 0 ? 'pointer' : '';
            if (renderer.getHoveredRegion() !== idx) {
                renderer.setHoveredRegion(idx);
                paint();
            }
            let tip: { text: string; x: number; y: number } | null = null;
            for (const r of tooltipRef.current) {
                if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                    tip = { text: r.text, x: mx, y: r.y };
                    break;
                }
            }
            setTooltip(tip);
        };
        const onLeave = () => {
            if (renderer.getHoveredRegion() !== -1) {
                renderer.setHoveredRegion(-1);
                paint();
            }
            setTooltip(null);
        };
        canvas.addEventListener('click', onClick);
        canvas.addEventListener('mousemove', onMove);
        canvas.addEventListener('mouseleave', onLeave);
        return () => {
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('mousemove', onMove);
            canvas.removeEventListener('mouseleave', onLeave);
        };
    }, [paint]);

    // Repaint on swap animation frames for array panes
    useEffect(() => {
        if (child?.type !== 'array') return;
        const prev = renderer.onSwapFrame;
        renderer.setSwapFrameCallback(() => {
            prev?.();
            paint();
        });
        return () => renderer.setSwapFrameCallback(prev);
    }, [child, renderer, paint]);

    const naturalH = renderer.calcChildHeight(child);
    const naturalW = renderer.calcChildWidth(child);
    const isLocals = child?.type === 'locals';
    const needsScroll = naturalH > 450 || naturalW > 0 || isLocals;
    const maxH = needsScroll ? Math.max(60, isLocals ? 300 : Math.round(naturalH * 0.9)) : naturalH;

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                flex: "0 0 auto",
                minHeight: 60,
                maxHeight: maxH,
                overflow: "auto",
                borderBottom: "none",
                borderTop: "none",
            }}
        >
            <canvas ref={canvasRef} style={{ display: "block", background: "#111" }} />
            {tooltip && (
                <div style={{
                    position: "absolute",
                    left: tooltip.x,
                    top: tooltip.y - 24,
                    background: "#222",
                    color: "#fff",
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid #555",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    transform: "translateX(-50%)",
                }}>{tooltip.text}</div>
            )}
        </div>
    );
}

export default function VisualizerCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [, forceUpdate] = useState({});
    const [panelOpen, setPanelOpen] = useState(false);

    const engine = getEngine();
    const layoutChildren = engine.getLayoutChildren();
    const isLayout = engine.isLayoutRoot();

    useEffect(() => {
        if (!containerRef.current) return;
        engine.mount(containerRef.current);
        const unsubscribe = subscribe(() => forceUpdate({}));
        return () => {
            unsubscribe();
            engine.unmount();
        };
    }, []);

    const renderer = engine.getRenderer();
    const grouped = isLayout ? renderer.groupLayoutChildren(engine.getLayoutData()) : [];

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            {layoutChildren.length > 0 && (
                <div style={{ background: "#1a1a1a", borderBottom: "1px solid #333" }}>
                    <button
                        onClick={() => setPanelOpen(!panelOpen)}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#888')}
                        style={{
                            padding: "4px 10px",
                            fontSize: 12,
                            background: "transparent",
                            color: "#888",
                            border: "none",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                            transition: "color 0.15s",
                        }}
                    >
                        ⚙ Panels {panelOpen ? "▾" : "▸"}
                    </button>
                    {panelOpen && (
                        <div style={{ display: "flex", gap: 6, padding: "4px 10px 8px", flexWrap: "wrap" }}>
                            {layoutChildren.map(({ key, title, dsType }) => {
                                const hidden = engine.isChildHidden(key);
                                return (
                                    <button
                                        key={key}
                                        onClick={() => engine.toggleChild(key)}
                                        onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.3)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.filter = ''; }}
                                        style={{
                                            padding: "2px 10px",
                                            fontSize: 12,
                                            background: hidden ? "#333" : "#444",
                                            color: hidden ? "#666" : "#ddd",
                                            border: `1px solid ${hidden ? "#444" : "#666"}`,
                                            borderRadius: 4,
                                            cursor: "pointer",
                                            textDecoration: hidden ? "line-through" : "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 4,
                                            transition: "filter 0.15s",
                                        }}
                                    >
                                        {dsType && (
                                            <span style={{
                                                background: "#2a4a3a",
                                                color: "#4CAF50",
                                                fontSize: 10,
                                                fontWeight: "bold",
                                                padding: "1px 4px",
                                                borderRadius: 3,
                                            }}>{dsType}</span>
                                        )}
                                        {title}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {isLayout && grouped.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", background: "#111" }}>
                    {grouped.map((child: any, i: number) => (
                        <React.Fragment key={child.title || child.type + i}>
                            <ChildPane child={child} renderer={renderer} isFirst={i === 0} />
                            {i < grouped.length - 1 && <PaneResizeHandle />}
                        </React.Fragment>
                    ))}
                </div>
            ) : null}
            <div
                ref={containerRef}
                style={{ flex: 1, width: "100%", minHeight: 0, background: "#111", display: isLayout && grouped.length > 0 ? "none" : undefined }}
            />
        </div>
    );
}
