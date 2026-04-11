import { useEffect, useRef, useState, useCallback } from "react";
import { getEngine, subscribe, subscribeToPlaying } from "./visualizerEngine";

function PaneLabel({ child, collapsed, onToggle, paneId }: { child: any; collapsed: boolean; onToggle: () => void; paneId?: string }) {
    const type = child?.type || '';
    const title = child?.title || '';
    const dsType = child?.dsType
        || (type === 'chart' ? 'Chart' : null)
        || (type === 'hashmap' ? 'Map' : null)
        || (type === 'locals' ? 'Call Stack' : null)
        || (type === 'fields' ? (title.startsWith('Static') ? 'Static' : 'Instance') : null);
    const typeIcon: Record<string, string> = {
        array: '▦', array2d: '▦', chart: '▥', graph: '◉', log: '▸', locals: '⧉',
        variables: '𝑥', variablesGroup: '𝑥', recursion: '↻', hashmap: '◈', fields: '⊞',
    };
    const displayName: Record<string, string> = {
        locals: 'Call Stack & Locals',
        variablesGroup: 'Local Variables',
        log: title === 'Error' ? '⚠ Error' : (title || 'Log'),
        recursion: title || 'Recursion',
        variables: title || 'Variables',
    };
    const label = displayName[type] || title || type;
    const icon = typeIcon[type] || '';
    return (
        <div
            data-pane-id={paneId}
            onClick={onToggle}
            style={{
                padding: '3px 10px', fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 5,
                flexShrink: 0, userSelect: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
            <span style={{ fontSize: 8, opacity: 0.5 }}>{collapsed ? '▶' : '▼'}</span>
            <span style={{ opacity: 0.6 }}>{icon}</span>
            {dsType && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', background: 'rgba(76,175,80,0.1)', padding: '1px 5px', borderRadius: 3 }}>{dsType}</span>
            )}
            {label}
        </div>
    );
}

function PaneResizeHandle() {
    const handleRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState(false);

    useEffect(() => {
        const el = handleRef.current;
        if (!el) return;
        let dragging = false;

        const onDown = (e: MouseEvent) => {
            const prev = el.previousElementSibling as HTMLElement;
            const next = el.nextElementSibling as HTMLElement;
            if (!prev || !next) return;
            e.preventDefault();
            dragging = true;
            setActive(true);
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
            const startY = e.clientY;
            const prevH = prev.offsetHeight;
            const nextH = next.offsetHeight;

            const onMove = (ev: MouseEvent) => {
                if (!dragging) return;
                const dy = ev.clientY - startY;
                prev.style.maxHeight = Math.max(40, prevH + dy) + 'px';
                next.style.maxHeight = Math.max(40, nextH - dy) + 'px';
            };
            const onUp = () => {
                dragging = false;
                setActive(false);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        };

        const onDblClick = () => {
            const prev = el.previousElementSibling as HTMLElement;
            const next = el.nextElementSibling as HTMLElement;
            if (prev) prev.style.maxHeight = '';
            if (next) next.style.maxHeight = '';
        };

        el.addEventListener('mousedown', onDown);
        el.addEventListener('dblclick', onDblClick);
        return () => {
            el.removeEventListener('mousedown', onDown);
            el.removeEventListener('dblclick', onDblClick);
        };
    }, []);

    return (
        <div
            ref={handleRef}
            style={{
                height: 7,
                cursor: 'row-resize',
                background: active ? 'var(--text-muted)' : 'var(--border)',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--border-light)'; }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'var(--border)'; }}
        >
            <div style={{ display: 'flex', gap: 3 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'var(--text-secondary)' : 'var(--text-muted)' }} />
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'var(--text-secondary)' : 'var(--text-muted)' }} />
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'var(--text-secondary)' : 'var(--text-muted)' }} />
            </div>
        </div>
    );
}

function ChildPane({ child, renderer, autoScroll, hideTitle, onLinkSourcesUpdate }: { child: any; renderer: any; isFirst?: boolean; autoScroll?: boolean; hideTitle?: boolean; onLinkSourcesUpdate?: (sources: { x: number; y: number; ref: number }[]) => void }) {
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
        const renderChild = hideTitle ? { ...child, title: undefined } : child;
        renderer.renderChildToCanvas(canvas, renderChild);
        regionsRef.current = [...renderer.getClickRegions()];
        tooltipRef.current = [...renderer.getTooltipRegions()];
        if (onLinkSourcesUpdate) onLinkSourcesUpdate(renderer.getChildLinkSources());
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

    // Repaint during color transitions
    useEffect(() => {
        const cb = () => paint();
        renderer.addTransitionFrameCallback(cb);
        return () => renderer.removeTransitionFrameCallback(cb);
    }, [renderer, paint]);

    // Auto-scroll log panes to bottom during playback
    useEffect(() => {
        if (autoScroll && containerRef.current) {
            const el = containerRef.current;
            el.scrollTop = el.scrollHeight;
        }
    });

    const naturalH = renderer.calcChildHeight(child);
    const naturalW = renderer.calcChildWidth(child);
    const isLocals = child?.type === 'locals';
    const needsScroll = naturalW > 0 || isLocals;
    const maxH = needsScroll ? Math.max(60, naturalH) : naturalH;

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
            <canvas ref={canvasRef} style={{ display: "block", background: "var(--bg-surface)" }} />
            {tooltip && (
                <div style={{
                    position: "absolute",
                    left: tooltip.x,
                    top: tooltip.y - 24,
                    background: "var(--bg-hover)",
                    color: "#fff",
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid var(--text-muted)",
                    pointerEvents: "none",
                    whiteSpace: "nowrap",
                    zIndex: 10,
                    transform: "translateX(-50%)",
                }}>{tooltip.text}</div>
            )}
        </div>
    );
}

function LinkOverlay({ scrollRef, engine, grouped, paneRefs, linkSourcesMap }: {
    scrollRef: React.RefObject<HTMLDivElement | null>;
    engine: any;
    grouped: any[];
    paneRefs: React.MutableRefObject<(HTMLElement | null)[]>;
    linkSourcesMap: Map<number, { sources: { x: number; y: number; ref: number }[]; paneIdx: number }>;
}) {
    const [lines, setLines] = useState<{ x1: number; y1: number; x2: number; y2: number }[]>([]);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;
        const objectRefs: Map<number, string> = engine.getObjectRefs();
        if (!objectRefs || objectRefs.size === 0) { setLines([]); return; }

        const containerRect = container.getBoundingClientRect();
        const scrollTop = container.scrollTop;
        const newLines: { x1: number; y1: number; x2: number; y2: number }[] = [];

        // Build tracerKey → pane label element map
        const targetMap = new Map<string, HTMLElement>();
        for (let i = 0; i < grouped.length; i++) {
            const tk = grouped[i]?._tracerKey;
            const el = paneRefs.current[i];
            if (tk && el) {
                const label = el.querySelector(`[data-pane-id="${tk}"]`) as HTMLElement;
                if (label) targetMap.set(tk, label);
            }
        }

        linkSourcesMap.forEach(({ sources, paneIdx }) => {
            const sourceEl = paneRefs.current[paneIdx];
            if (!sourceEl) return;
            const canvas = sourceEl.querySelector('canvas');
            if (!canvas) return;
            const canvasRect = canvas.getBoundingClientRect();

            for (const src of sources) {
                const targetTracerKey = objectRefs.get(src.ref);
                if (!targetTracerKey) continue;
                const targetEl = targetMap.get(targetTracerKey);
                if (!targetEl) continue;
                const targetRect = targetEl.getBoundingClientRect();

                newLines.push({
                    x1: canvasRect.left - containerRect.left + src.x,
                    y1: canvasRect.top - containerRect.top + scrollTop + src.y,
                    x2: targetRect.left - containerRect.left + 14,
                    y2: targetRect.top - containerRect.top + scrollTop + targetRect.height / 2,
                });
            }
        });

        setLines(newLines);
    });

    if (lines.length === 0) return null;
    const container = scrollRef.current;
    const h = container ? container.scrollHeight : 0;
    const w = container ? container.clientWidth : 0;

    const palette = [
        'rgba(59,130,246,0.35)',   // blue
        'rgba(168,85,247,0.35)',   // purple
        'rgba(236,72,153,0.35)',   // pink
        'rgba(34,197,94,0.35)',    // green
        'rgba(245,158,11,0.35)',   // amber
        'rgba(6,182,212,0.35)',    // cyan
        'rgba(239,68,68,0.35)',    // red
        'rgba(99,102,241,0.35)',   // indigo
    ];
    const dotPalette = palette.map(c => c.replace('0.35)', '0.6)'));

    return (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: w, height: h, pointerEvents: 'none', zIndex: 5 }}>
            {lines.map((l, i) => {
                const color = palette[i % palette.length];
                const cpx = Math.min(l.x1, l.x2) - 16;
                return (
                    <path
                        key={i}
                        d={`M ${l.x1} ${l.y1} C ${cpx} ${l.y1}, ${cpx} ${l.y2}, ${l.x2} ${l.y2}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                    />
                );
            })}
            {lines.map((l, i) => (
                <circle key={`dot-${i}`} cx={l.x2} cy={l.y2} r={3} fill={dotPalette[i % dotPalette.length]} />
            ))}
        </svg>
    );
}

export default function VisualizerCanvas() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [, forceUpdate] = useState({});
    const [playing, setPlaying] = useState(false);
    const [collapsedPanes, setCollapsedPanes] = useState<Set<string>>(new Set());

    const toggleCollapse = (key: string) => {
        setCollapsedPanes(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    useEffect(() => { const unsub = subscribeToPlaying(setPlaying); return () => { unsub(); }; }, []);

    const engine = getEngine();
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const paneRefs = useRef<(HTMLElement | null)[]>([]);
    const [offscreenActivity, setOffscreenActivity] = useState<'above' | 'below' | null>(null);
    const activeTypeRef = useRef<string | null>(null);
    const [linkSourcesMap, setLinkSourcesMap] = useState<Map<number, { sources: { x: number; y: number; ref: number }[]; paneIdx: number }>>(new Map());

    // Track which pane is active and whether it's off-screen
    const offscreenRef = useRef<'above' | 'below' | null>(null);
    useEffect(() => {
        if (!playing) {
            if (offscreenRef.current !== null) { offscreenRef.current = null; setOffscreenActivity(null); }
            return;
        }
        const activeKey = engine.getActiveChildKey();
        const activeType = engine.getActiveChildType();
        if (!activeKey || !activeType || activeType === 'recursion' || activeType === 'locals') return;
        activeTypeRef.current = activeKey;
        const idx = grouped.findIndex((c: any) => c._tracerKey === activeKey);
        if (idx < 0 || !scrollRef.current) return;
        const el = paneRefs.current[idx];
        if (!el) return;
        const containerRect = scrollRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        let next: 'above' | 'below' | null = null;
        if (elRect.bottom < containerRect.top) next = 'above';
        else if (elRect.top > containerRect.bottom) next = 'below';
        if (next !== offscreenRef.current) { offscreenRef.current = next; setOffscreenActivity(next); }
    });

    const scrollToActive = () => {
        if (!scrollRef.current) return;
        const activeKey = activeTypeRef.current;
        if (!activeKey) return;
        const idx = grouped.findIndex((c: any) => c._tracerKey === activeKey);
        const el = idx >= 0 ? paneRefs.current[idx] : null;
        if (el) {
            const containerRect = scrollRef.current.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            scrollRef.current.scrollTop += elRect.top - containerRect.top;
        }
        setOffscreenActivity(null);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%" }}>
            {isLayout && grouped.length > 0 ? (
                <div style={{ flex: 1, minHeight: 0, position: 'relative', background: 'var(--bg-surface)' }}>
                    <div ref={scrollRef} style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <LinkOverlay scrollRef={scrollRef} engine={engine} grouped={grouped} paneRefs={paneRefs} linkSourcesMap={linkSourcesMap} />
                        {grouped.map((child: any, i: number) => {
                            const paneKey = child.title || child.type + i;
                            const collapsed = collapsedPanes.has(paneKey);
                            return (
                                <div key={paneKey} ref={el => { paneRefs.current[i] = el; }}>
                                    <PaneLabel child={child} collapsed={collapsed} onToggle={() => toggleCollapse(paneKey)} paneId={child._tracerKey} />
                                    {!collapsed && (
                                        <>
                                            <ChildPane child={child} renderer={renderer} isFirst={i === 0} autoScroll={playing && child?.type === 'log'} hideTitle
                                                onLinkSourcesUpdate={(sources) => {
                                                    if (sources.length > 0) {
                                                        setLinkSourcesMap(prev => {
                                                            const next = new Map(prev);
                                                            next.set(i, { sources, paneIdx: i });
                                                            return next;
                                                        });
                                                    }
                                                }}
                                            />
                                            {i < grouped.length - 1 && <PaneResizeHandle />}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {offscreenActivity && (
                        <div
                            onClick={scrollToActive}
                            style={{
                                position: 'absolute',
                                right: 12,
                                [offscreenActivity === 'above' ? 'top' : 'bottom']: 12,
                                zIndex: 20,
                                width: 32, height: 32, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'var(--accent)',
                                color: '#fff', fontSize: 16,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                            }}
                        >
                            {offscreenActivity === 'above' ? '↑' : '↓'}
                        </div>
                    )}
                </div>
            ) : null}
            <div
                ref={containerRef}
                style={{ flex: 1, width: "100%", minHeight: 0, background: "var(--bg-surface)", display: isLayout && grouped.length > 0 ? "none" : undefined }}
            />
        </div>
    );
}
