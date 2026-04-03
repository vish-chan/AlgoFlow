import { theme } from "../../constants/theme";

interface SwapAnimation {
    tracerKey: string;
    i: number;
    j: number;
    progress: number;
    startTime: number;
}

interface ColorTransition {
    from: [number, number, number, number];
    to: [number, number, number, number];
    startTime: number;
}

export class SimpleRenderer {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private data: any = null;
    private container: HTMLElement | null = null;
    private swapAnim: SwapAnimation | null = null;
    private animFrameId: number | null = null;
    private transitionFrameId: number | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private clickRegions: { x: number; y: number; w: number; h: number; action: () => void }[] = [];
    private tooltipRegions: { x: number; y: number; w: number; h: number; text: string }[] = [];
    private lastChildTooltipRegions: { x: number; y: number; w: number; h: number; text: string }[] = [];
    private handleClick: ((e: MouseEvent) => void) | null = null;
    private expandedFrames: Set<number> = new Set();
    private hoveredRegionIdx: number = -1;
    private transitions: Map<string, ColorTransition> = new Map();
    private childTransitions: Map<string, ColorTransition> = new Map();

    private static readonly SWAP_DURATION = 400;
    private static readonly TRANSITION_DURATION = 200;

    private resizeRAF: number | null = null;

    mount(container: HTMLElement) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.display = 'block';
        this.canvas.style.background = theme.bg.surface;
        container.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        this.handleClick = (e: MouseEvent) => {
            const rect = this.canvas!.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            for (const r of this.clickRegions) {
                if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
                    r.action();
                    break;
                }
            }
        };
        this.canvas.addEventListener('click', this.handleClick);
        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeRAF !== null) cancelAnimationFrame(this.resizeRAF);
            this.resizeRAF = requestAnimationFrame(() => { this.resizeRAF = null; this.resize(); });
        });
        this.resizeObserver.observe(container);
        this.resize();
    }

    unmount() {
        this.resizeObserver?.disconnect();
        if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
        if (this.transitionFrameId !== null) cancelAnimationFrame(this.transitionFrameId);
        if (this.resizeRAF !== null) cancelAnimationFrame(this.resizeRAF);
        if (this.canvas && this.handleClick) this.canvas.removeEventListener('click', this.handleClick);
        if (this.canvas?.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
        this.container = null;
        this.transitions.clear();
    }

    private resize = () => {
        if (!this.canvas || !this.container) return;
        const dpr = window.devicePixelRatio || 1;
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight;
        
        let requiredHeight = containerHeight;
        if (this.data?.type === 'log' && this.data.logs) {
            requiredHeight = Math.max(containerHeight, 50 + this.data.logs.length * 20);
        } else if (this.data?.type === 'layout' && this.data.children) {
            let total = 0;
            for (const child of this.data.children) {
                total += this.calcChildHeight(child);
            }
            requiredHeight = Math.max(containerHeight, total);
        }
        
        const newW = Math.round(containerWidth * dpr);
        const newH = Math.round(requiredHeight * dpr);
        if (this.canvas.width !== newW || this.canvas.height !== newH) {
            this.canvas.width = newW;
            this.canvas.height = newH;
            this.canvas.style.width = containerWidth + 'px';
            // Only set explicit height when content overflows (logs/layouts)
            // Otherwise let the canvas fill its container naturally
            if (requiredHeight > containerHeight) {
                this.canvas.style.height = requiredHeight + 'px';
            } else {
                this.canvas.style.height = '100%';
            }
        }
        
        this.render();
    };

    setData(data: any) {
        this.data = data;
        this.resize();
        if (data) this.scheduleTransitionLoop();
    }    private parseRGBA(color: string): [number, number, number, number] {
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);
            return [r, g, b, 1];
        }
        return [0, 0, 0, 1];
    }

    private transitionColor(key: string, target: string, store?: Map<string, ColorTransition>): string {
        const map = store || this.transitions;
        const targetRGBA = this.parseRGBA(target);
        const existing = map.get(key);
        const now = performance.now();

        if (!existing) {
            map.set(key, { from: targetRGBA, to: targetRGBA, startTime: now });
            return target;
        }

        if (existing.to[0] === targetRGBA[0] && existing.to[1] === targetRGBA[1] && existing.to[2] === targetRGBA[2]) {
            const t = Math.min((now - existing.startTime) / SimpleRenderer.TRANSITION_DURATION, 1);
            if (t >= 1) return target;
            const e = this.easeInOut(t);
            const r = Math.round(existing.from[0] + (existing.to[0] - existing.from[0]) * e);
            const g = Math.round(existing.from[1] + (existing.to[1] - existing.from[1]) * e);
            const b = Math.round(existing.from[2] + (existing.to[2] - existing.from[2]) * e);
            return `rgb(${r},${g},${b})`;
        }

        // Target changed — start new transition from current interpolated value
        const t = Math.min((now - existing.startTime) / SimpleRenderer.TRANSITION_DURATION, 1);
        const e = this.easeInOut(t);
        const curR = Math.round(existing.from[0] + (existing.to[0] - existing.from[0]) * e);
        const curG = Math.round(existing.from[1] + (existing.to[1] - existing.from[1]) * e);
        const curB = Math.round(existing.from[2] + (existing.to[2] - existing.from[2]) * e);
        map.set(key, { from: [curR, curG, curB, 1], to: targetRGBA, startTime: now });
        return `rgb(${curR},${curG},${curB})`;
    }

    private hasActiveTransitions(store?: Map<string, ColorTransition>): boolean {
        const map = store || this.transitions;
        const now = performance.now();
        for (const t of map.values()) {
            if (now - t.startTime < SimpleRenderer.TRANSITION_DURATION) return true;
        }
        return false;
    }

    private scheduleTransitionLoop() {
        if (this.transitionFrameId !== null) return;
        if (!this.hasActiveTransitions() && !this.hasActiveTransitions(this.childTransitions)) return;
        const loop = () => {
            this.transitionFrameId = null;
            if (this.hasActiveTransitions() || this.hasActiveTransitions(this.childTransitions)) {
                this.render();
                this.onTransitionFrame?.();
                this.transitionFrameId = requestAnimationFrame(loop);
            }
        };
        this.transitionFrameId = requestAnimationFrame(loop);
    }

    private onTransitionFrame: (() => void) | null = null;

    setTransitionFrameCallback(cb: (() => void) | null) {
        this.onTransitionFrame = cb;
    }

    animateSwap(_tracerKey: string, i: number, j: number) {
        this.swapAnim = { tracerKey: _tracerKey, i, j, progress: 0, startTime: performance.now() };
        this.animLoop();
    }

    private onSwapFrame: (() => void) | null = null;

    setSwapFrameCallback(cb: (() => void) | null) {
        this.onSwapFrame = cb;
    }

    getSwapAnim() {
        return this.swapAnim;
    }

    private animLoop = () => {
        if (!this.swapAnim) return;
        const elapsed = performance.now() - this.swapAnim.startTime;
        this.swapAnim.progress = Math.min(elapsed / SimpleRenderer.SWAP_DURATION, 1);
        this.render();
        this.onSwapFrame?.();
        if (this.swapAnim.progress < 1) {
            this.animFrameId = requestAnimationFrame(this.animLoop);
        } else {
            this.swapAnim = null;
            this.animFrameId = null;
        }
    };

    private easeInOut(t: number): number {
        // Cubic ease-out with slight overshoot for snappy feel
        return t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private truncateText(text: string, maxWidth: number): string {
        if (!this.ctx) return text;
        if (this.ctx.measureText(text).width <= maxWidth) return text;
        let t = text;
        while (t.length > 0 && this.ctx.measureText(t + '…').width > maxWidth) {
            t = t.slice(0, -1);
        }
        return t + '…';
    }

    private render() {
        if (!this.ctx || !this.canvas) return;
        this.clickRegions = [];
        this.tooltipRegions = [];
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        
        this.ctx.clearRect(0, 0, width, height);
        
        if (!this.data) {
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const cx = Math.round(width / 2), cy = Math.round(height / 2);

            // Play icon in circle
            this.ctx.fillStyle = theme.bg.active;
            this.ctx.beginPath();
            this.ctx.arc(cx, cy - 40, 32, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = theme.accent.default;
            this.ctx.font = '28px sans-serif';
            this.ctx.fillText('▶', cx + 2, cy - 38);

            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = 'bold 15px sans-serif';
            this.ctx.fillText('Write Code · Run · Visualize', cx, cy + 16);

            this.ctx.fillStyle = theme.text.muted;
            this.ctx.font = '12px sans-serif';
            this.ctx.fillText('Common data structures are visualized automatically', cx, cy + 40);

            this.ctx.fillStyle = theme.text.faint;
            this.ctx.font = '11px sans-serif';
            const isMac = typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
            this.ctx.fillText(`${isMac ? '⌘' : 'Ctrl'}+Enter = run · Space = play/pause · ← → = step`, cx, cy + 62);

            return;
        }

        if (this.data.type === 'chart') {
            this.renderChartInBounds(this.data.data, this.data.title, 0, 0, width, height);
        } else if (this.data.type === 'array') {
            this.renderArray(this.data.data, this.data.title, this.data.dsType);
        } else if (this.data.type === 'array2d') {
            this.renderArray2D(this.data.data, this.data.title, this.data.dsType);
        } else if (this.data.type === 'hashmap') {
            this.renderHashMap(this.data.data, this.data.title);
        } else if (this.data.type === 'log') {
            this.renderLog(this.data.logs, this.data.title);
        } else if (this.data.type === 'recursion') {
            this.renderRecursion(this.data.calls, this.data.title);
        } else if (this.data.type === 'variables') {
            this.renderVariables(this.data.vars, this.data.title, this.data.patchState);
        } else if (this.data.type === 'locals') {
            this.renderLocalsInBounds(this.data.rows, this.data.patchedRows, this.data.title, 0, 0, width);
        } else if (this.data.type === 'graph') {
            this.renderGraphInBounds(this.data.adjMatrix, this.data.nodes, this.data.title, 0, 0, width, height, this.data.visitedEdges, this.data.directed, this.data.weighted, this.data.nodeLabels, this.data.layout, this.data.edges, this.data.treeDims);
        } else if (this.data.type === 'layout') {
            this.renderLayout(this.data.children);
        } else {
            this.renderText(JSON.stringify(this.data, null, 2));
        }
    }

    private renderArray(arr: any[], title?: string, dsType?: string) {
        if (!this.ctx || !this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;

        if (dsType === 'Stack') {
            this.renderStackInBounds(arr, title, dsType, 0, 0, width, height);
        } else if (dsType === 'LinkedList' || dsType === 'SinglyLinkedList') {
            this.renderLinkedListInBounds(arr, title, dsType, 0, 0, width, height);
        } else {
            this.renderDefaultArrayInBounds(arr, title, dsType, 0, 0, width, height, true);
        }
    }

    private renderText(text: string) {
        if (!this.ctx) return;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        this.ctx.textAlign = 'left';
        
        const lines = text.split('\n');
        lines.forEach((line, i) => {
            this.ctx!.fillText(line, 20, 30 + i * 20);
        });
    }

    private wrapText(text: string, maxWidth: number): string[] {
        if (!this.ctx) return [text];
        const words = text.split(' ');
        const lines: string[] = [];
        let current = '';
        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (this.ctx.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = word;
            } else {
                current = test;
            }
        }
        if (current) lines.push(current);
        return lines;
    }

    private renderLog(logs: any[], title?: string) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const isError = title === 'Error';
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = isError ? theme.status.error : theme.text.secondary;
            this.ctx.font = isError ? 'bold 16px sans-serif' : '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(isError ? '⚠ Error' : title, 20, y);
            y += isError ? 30 : 25;
        }
        
        this.ctx.fillStyle = isError ? theme.status.errorLight : '#fff';
        this.ctx.font = '14px monospace';
        
        logs.forEach(log => {
            const text = String(log);
            const lines = text.split('\n');
            lines.forEach(line => {
                for (const wrapped of this.wrapText(line, width - 40)) {
                    this.ctx!.fillText(wrapped, 20, y);
                    y += 20;
                }
            });
        });
    }

    private static readonly GRAPH_MIN_SCALE = 0.5;
    private static readonly GRAPH_PANE_HEIGHT = 400;
    private static readonly TREE_PANE_HEIGHT = 450;

    private graphNaturalSize(child: any): { w: number; h: number } {
        const n = child.nodes?.length || 0;
        if (child.layout === 'tree') {
            const h = Math.max(SimpleRenderer.TREE_PANE_HEIGHT, n * 20);
            return { w: h, h }; // trees are roughly square
        }
        const nodeR = Math.max(10, Math.min(20, 200 / Math.max(n, 1)));
        const minR = n > 1 ? (n * (nodeR * 2 + 12)) / (2 * Math.PI) : 40;
        const d = (minR + nodeR + 10) * 2;
        return { w: d, h: d + 25 };
    }

    calcChildHeight(child: any): number {
        if (child?.type === 'chart' && child.data) return Math.max(120, 160);
        if (child?.type === 'recursion' && child.calls) return Math.max(120, 45 + child.calls.length * 22);
        if (child?.type === 'graph') {
            const nat = this.graphNaturalSize(child);
            const paneH = child.layout === 'tree' ? SimpleRenderer.TREE_PANE_HEIGHT : SimpleRenderer.GRAPH_PANE_HEIGHT;
            const scale = Math.max(SimpleRenderer.GRAPH_MIN_SCALE, Math.min(1, paneH / nat.h));
            return Math.max(paneH, Math.round(nat.h * scale));
        }
        if (child?.type === 'array2d' && child.data) return Math.max(120, 30 + child.data.length * 40);
        if (child?.type === 'hashmap' && child.data) {
            const n = child.data[0]?.length || 1;
            if (this.isHashMapVertical(child.data, 400)) return Math.max(120, 30 + n * 31);
            return Math.max(120, 30 + 80);
        }
        if (child?.type === 'variables' && child.vars) return Math.max(60, 45 + 28);
        if (child?.type === 'locals' && child.rows) {
            const rows = child.maxRows || child.rows.length;
            return this.calcLocalsHeightFromCount(rows, child.maxFrames);
        }
        if (child?.type === 'variablesGroup') return 25 + child.items.length * 32;
        if (child?.type === 'log' && child.logs) return Math.max(80, 36 + child.logs.length * 16);
        return 120;
    }

    calcChildWidth(child: any): number {
        if (child?.type === 'array' && child.data) {
            const n = child.data.length;
            const dsType = child.dsType;
            if (dsType === 'LinkedList' || dsType === 'SinglyLinkedList') return n * 48 + (n - 1) * 24 + 60;
            if (dsType === 'Stack') return n * 60 + 40;
            return n * 60 + 40;
        }
        if (child?.type === 'array2d' && child.data) {
            const cols = child.data[0]?.length || 1;
            return cols * 40 + 40;
        }
        if (child?.type === 'hashmap' && child.data) {
            const cols = child.data[0]?.length || 1;
            return cols * 70 + 40;
        }
        if (child?.type === 'graph') {
            const nat = this.graphNaturalSize(child);
            const scale = Math.max(SimpleRenderer.GRAPH_MIN_SCALE, Math.min(1, SimpleRenderer.GRAPH_PANE_HEIGHT / Math.max(nat.w, nat.h)));
            return scale < 1 ? Math.round(nat.w * scale) : 0;
        }
        return 0; // 0 means use container width
    }

    groupLayoutChildren(children: any[]): any[] {
        const grouped: any[] = [];
        const varItems: any[] = [];
        let logChild: any = null;
        let recursionChild: any = null;
        for (const child of children) {
            if (child?.type === 'variables') {
                varItems.push(child);
            } else if (child?.type === 'log') {
                logChild = child;
            } else if (child?.type === 'recursion') {
                recursionChild = child;
            } else if (child?.type === 'locals') {
                grouped.push({ ...child, callStack: recursionChild });
            } else {
                if (child?.type === 'array' && child.data?.length === 0) continue;
                if (child?.type === 'chart' && child.data?.length === 0) continue;
                grouped.push(child);
            }
        }
        if (varItems.length > 0) {
            grouped.push({ type: 'variablesGroup', items: varItems });
        }
        if (logChild) grouped.push(logChild);
        return grouped;
    }

    private renderLayout(children: any[]) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        
        const grouped = this.groupLayoutChildren(children);
        const heights = grouped.map(c => this.calcChildHeight(c));
        
        let yOffset = 0;
        grouped.forEach((child, i) => {
            const sectionHeight = heights[i];
            const y = yOffset;
            yOffset += sectionHeight;
            
            this.ctx!.save();
            this.ctx!.translate(0, y);
            this.ctx!.beginPath();
            this.ctx!.rect(0, 0, width, sectionHeight);
            this.ctx!.clip();
            
            if (child?.type === 'chart' && child.data) {
                this.renderChartInBounds(child.data, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'array' && child.data) {
                this.renderArrayInBounds(child.data, child.title, 0, 0, width, sectionHeight, child.dsType, child._tracerKey);            } else if (child?.type === 'locals' && child.rows) {
                this.renderLocalsInBounds(child.rows, child.patchedRows, child.title, 0, 0, width, child.callStack);
            } else if (child?.type === 'array2d' && child.data) {
                this.renderArray2DInBounds(child.data, child.title, 0, 0, width, sectionHeight, child.dsType);
            } else if (child?.type === 'hashmap' && child.data) {
                this.renderHashMapInBounds(child.data, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'log' && child.logs) {
                this.renderLogInBounds(child.logs, child.title, 0, 0, width);
            } else if (child?.type === 'recursion' && child.calls) {
                this.renderRecursionInBounds(child.calls, child.title, 0, 0, width, sectionHeight, y);
            } else if (child?.type === 'graph') {
                this.renderGraphInBounds(child.adjMatrix, child.nodes, child.title, 0, 0, width, sectionHeight, child.visitedEdges, child.directed, child.weighted, child.nodeLabels, child.layout, child.edges, child.treeDims);
            } else if (child?.type === 'variables' && child.vars) {
                this.renderVariablesInBounds(child.vars, child.title, 0, 0, width, sectionHeight, child.patchState);
            } else if (child?.type === 'variablesGroup') {
                this.renderVariablesGroupInBounds(child.items, 0, 0, width);
            }
            
            this.ctx!.restore();
            
            if (i < grouped.length - 1) {
                this.ctx!.strokeStyle = theme.text.faint;
                this.ctx!.beginPath();
                this.ctx!.moveTo(0, yOffset);
                this.ctx!.lineTo(width, yOffset);
                this.ctx!.stroke();
            }
        });
    }

    private renderArrayInBounds(arr: any[], title: string | undefined, x: number, y: number, width: number, height: number, dsType?: string, tracerKey?: string) {
        if (!this.ctx) return;
        if (dsType === 'Stack') {
            this.renderStackInBounds(arr, title, dsType, x, y, width, height);
        } else if (dsType === 'LinkedList' || dsType === 'SinglyLinkedList') {
            this.renderLinkedListInBounds(arr, title, dsType, x, y, width, height);
        } else {
            this.renderDefaultArrayInBounds(arr, title, dsType, x, y, width, height, false, tracerKey);
        }
    }

    private drawTitleWithBadge(title: string | undefined, dsType: string | undefined, cx: number, cy: number, fontSize: number) {
        if (!this.ctx || !title) return;
        if (dsType) {
            const badgeFont = `bold ${fontSize - 1}px sans-serif`;
            const nameFont = `${fontSize}px sans-serif`;
            this.ctx.font = badgeFont;
            const badgeText = dsType;
            const badgeW = this.ctx.measureText(badgeText).width + 10;
            const badgeH = fontSize + 6;
            this.ctx.font = nameFont;
            const nameW = this.ctx.measureText(title).width;
            const totalW = badgeW + 6 + nameW;
            const startX = cx - totalW / 2;

            // badge
            this.ctx.fillStyle = theme.accent.dark;
            this.ctx.beginPath();
            this.ctx.roundRect(startX, cy - badgeH / 2 - 1, badgeW, badgeH, 3);
            this.ctx.fill();
            this.ctx.fillStyle = theme.accent.default;
            this.ctx.font = badgeFont;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(badgeText, startX + badgeW / 2, cy);

            // name
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = nameFont;
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, startX + badgeW + 6, cy);
        } else {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = `${fontSize}px sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(title, cx, cy);
        }
    }

    private renderChartInBounds(arr: any[], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx || !arr.length) return;
        const titleH = title ? 25 : 0;
        if (title) this.drawTitleWithBadge(title, 'Chart', x + width / 2, y + 14, 12);

        const pad = 12;
        const chartX = x + pad;
        const chartY = y + titleH + 4;
        const chartW = width - pad * 2;
        const chartH = height - titleH - 8;
        const gap = 2;
        const barW = Math.max(3, Math.min(30, (chartW - gap * (arr.length - 1)) / arr.length));

        let maxVal = 0;
        for (const item of arr) {
            const v = Math.abs(typeof item === 'object' ? item.value : item);
            if (v > maxVal) maxVal = v;
        }
        if (maxVal === 0) maxVal = 1;

        const totalBarW = arr.length * barW + (arr.length - 1) * gap;
        const offsetX = chartX + (chartW - totalBarW) / 2;

        const anim = this.swapAnim;

        for (let i = 0; i < arr.length; i++) {
            const value = typeof arr[i] === 'object' ? arr[i].value : arr[i];
            const selected = typeof arr[i] === 'object' ? arr[i].selected : false;
            const patched = typeof arr[i] === 'object' ? arr[i].patched : false;
            const barH = Math.max(2, (Math.abs(value) / maxVal) * (chartH - 20));
            const isSwapping = !!(anim && (i === anim.i || i === anim.j));
            const bx = offsetX + i * (barW + gap);
            const by = chartY + chartH - barH;

            const target = (isSwapping || patched) ? theme.status.error : (selected ? theme.status.info : theme.accent.default);
            this.ctx.fillStyle = this.transitionColor(`chart-${i}`, target);
            this.ctx.beginPath();
            this.ctx.roundRect(bx, by, barW, barH, Math.min(3, barW / 2));
            this.ctx.fill();

            if (barW >= 16) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = `${Math.min(11, barW - 2)}px monospace`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'bottom';
                this.ctx.fillText(String(value), bx + barW / 2, by - 2);
            }

            this.tooltipRegions.push({ x: bx, y: by, w: barW, h: barH, text: `[${i}] = ${value}` });
        }
    }

    private renderDefaultArrayInBounds(arr: any[], title: string | undefined, dsType: string | undefined, x: number, y: number, width: number, height: number, large: boolean, tracerKey?: string) {
        if (!this.ctx) return;
        const cellWidth = large ? 80 : 60;
        const cellHeight = large ? 60 : 40;
        const totalWidth = arr.length * cellWidth;
        const startX = x + (width - totalWidth) / 2;
        const startY = y + (height - cellHeight) / 2;
        const fontSize = large ? 14 : 12;
        const colorPrefix = tracerKey || title || 'arr';

        if (title) this.drawTitleWithBadge(title, dsType, x + width / 2, startY - (large ? 15 : 10), fontSize);

        const anim = this.swapAnim;
        const t = anim ? this.easeInOut(anim.progress) : 0;
        const valFont = `${large ? 16 : 14}px monospace`;

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;
            let offsetX = 0, isSwapping = false;
            if (anim && (i === anim.i || i === anim.j)) {
                isSwapping = true;
                const dist = (anim.j - anim.i) * cellWidth;
                offsetX = i === anim.i ? t * dist : -t * dist;
            }
            const cx = startX + i * cellWidth + offsetX;
            const targetColor = (isSwapping || patched) ? theme.status.error : (selected ? theme.status.info : theme.cell.default);
            const cellColor = this.transitionColor(`${colorPrefix}-${i}`, targetColor);
            if (patched) { this.ctx!.shadowColor = theme.status.error; this.ctx!.shadowBlur = 10; }
            this.ctx!.fillStyle = cellColor;
            this.ctx!.fillRect(cx + 2, startY, cellWidth - 4, cellHeight);
            this.ctx!.shadowColor = 'transparent'; this.ctx!.shadowBlur = 0;
            this.ctx!.strokeStyle = theme.text.muted;
            this.ctx!.strokeRect(cx + 2, startY, cellWidth - 4, cellHeight);
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = valFont;
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(String(value), cx + cellWidth / 2, startY + cellHeight / 2);
            this.tooltipRegions.push({ x: cx + 2, y: startY, w: cellWidth - 4, h: cellHeight, text: `[${i}] = ${value}` });
            this.ctx!.fillStyle = theme.text.secondary;
            this.ctx!.font = `${large ? 12 : 10}px monospace`;
            this.ctx!.fillText(String(i), startX + i * cellWidth + cellWidth / 2, startY + cellHeight + (large ? 20 : 15));
        });
    }

    private renderLinkedListInBounds(arr: any[], title: string | undefined, dsType: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx) return;
        const cy = y + height / 2;
        if (!arr.length) {
            if (title) this.drawTitleWithBadge(title, dsType, x + width / 2, cy - 10, 12);
            this.ctx.fillStyle = theme.text.muted;
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('(empty)', x + width / 2, cy + 10);
            return;
        }
        const nodeW = 48, arrowW = 24, nullW = 30;
        const nodeH = 32;
        const totalW = arr.length * nodeW + (arr.length - 1) * arrowW;
        const startX = x + Math.max(10, (width - totalW - nullW) / 2);

        if (title) this.drawTitleWithBadge(title, dsType, x + width / 2, cy - nodeH / 2 - 14, 12);

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;
            const nx = startX + i * (nodeW + arrowW);

            this.ctx!.fillStyle = patched ? theme.status.error : (selected ? theme.status.info : theme.cell.default);
            this.ctx!.beginPath();
            this.ctx!.roundRect(nx, cy - nodeH / 2, nodeW, nodeH, 6);
            this.ctx!.fill();
            this.ctx!.strokeStyle = theme.text.muted;
            this.ctx!.beginPath();
            this.ctx!.roundRect(nx, cy - nodeH / 2, nodeW, nodeH, 6);
            this.ctx!.stroke();

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '13px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(this.truncateText(String(value), nodeW - 8), nx + nodeW / 2, cy);
            this.tooltipRegions.push({ x: nx, y: cy - nodeH / 2, w: nodeW, h: nodeH, text: `[${i}] = ${value}` });

            if (i < arr.length - 1) {
                const ax = nx + nodeW + 2, ax2 = ax + arrowW - 4;
                this.ctx!.strokeStyle = theme.text.secondary;
                this.ctx!.lineWidth = 1.5;
                // Forward arrow →
                this.ctx!.beginPath();
                this.ctx!.moveTo(ax, cy - (dsType === 'SinglyLinkedList' ? 0 : 3));
                this.ctx!.lineTo(ax2, cy - (dsType === 'SinglyLinkedList' ? 0 : 3));
                this.ctx!.stroke();
                this.ctx!.fillStyle = theme.text.secondary;
                this.ctx!.beginPath();
                this.ctx!.moveTo(ax2, cy - (dsType === 'SinglyLinkedList' ? 0 : 3));
                this.ctx!.lineTo(ax2 - 5, cy - (dsType === 'SinglyLinkedList' ? 4 : 7));
                this.ctx!.lineTo(ax2 - 5, cy + (dsType === 'SinglyLinkedList' ? 4 : 1));
                this.ctx!.closePath();
                this.ctx!.fill();
                if (dsType !== 'SinglyLinkedList') {
                    // Backward arrow ←
                    this.ctx!.beginPath();
                    this.ctx!.moveTo(ax2, cy + 3);
                    this.ctx!.lineTo(ax, cy + 3);
                    this.ctx!.stroke();
                    this.ctx!.beginPath();
                    this.ctx!.moveTo(ax, cy + 3);
                    this.ctx!.lineTo(ax + 5, cy - 1);
                    this.ctx!.lineTo(ax + 5, cy + 7);
                    this.ctx!.closePath();
                    this.ctx!.fill();
                }
                this.ctx!.lineWidth = 1;
            }
        });

        // null terminator
        const lastNx = startX + (arr.length - 1) * (nodeW + arrowW);
        const ax = lastNx + nodeW + 2, ax2 = ax + arrowW - 4;
        this.ctx.strokeStyle = theme.text.muted;
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(ax, cy);
        this.ctx.lineTo(ax2, cy);
        this.ctx.stroke();
        this.ctx.fillStyle = theme.text.muted;
        this.ctx.font = '11px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('null', ax2 + 3, cy);
        this.ctx.lineWidth = 1;
    }

    private renderStackInBounds(arr: any[], title: string | undefined, dsType: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx) return;
        if (!arr.length) {
            const cy = y + height / 2;
            if (title) this.drawTitleWithBadge(title, dsType, x + width / 2, cy - 10, 12);
            this.ctx.fillStyle = theme.text.muted;
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('(empty)', x + width / 2, cy + 10);
            return;
        }
        const cellWidth = 60;
        const cellHeight = 40;
        const totalWidth = arr.length * cellWidth;
        const startX = x + (width - totalWidth) / 2;
        const startY = y + (height - cellHeight) / 2;

        if (title) this.drawTitleWithBadge(title, dsType, x + width / 2, startY - 10, 12);

        const topIdx = arr.length - 1;

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;
            const cx = startX + i * cellWidth;

            const stackTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.cell.default);
            this.ctx!.fillStyle = this.transitionColor(`stack-${i}`, stackTarget);
            this.ctx!.fillRect(cx + 2, startY, cellWidth - 4, cellHeight);
            this.ctx!.strokeStyle = theme.text.muted;
            this.ctx!.strokeRect(cx + 2, startY, cellWidth - 4, cellHeight);

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '14px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(String(value), cx + cellWidth / 2, startY + cellHeight / 2);
            this.tooltipRegions.push({ x: cx + 2, y: startY, w: cellWidth - 4, h: cellHeight, text: `[${i}] = ${value}` });

            if (i === topIdx) {
                this.ctx!.fillStyle = theme.accent.default;
                this.ctx!.font = 'bold 9px sans-serif';
                this.ctx!.textAlign = 'center';
                this.ctx!.fillText('TOP', cx + cellWidth / 2, startY + cellHeight + 13);
            }
        });
    }

    private lastChildClickRegions: { x: number; y: number; w: number; h: number; action: () => void }[] = [];

    getClickRegions() {
        return this.lastChildClickRegions;
    }

    setHoveredRegion(idx: number) {
        this.hoveredRegionIdx = idx;
    }

    getHoveredRegion(): number {
        return this.hoveredRegionIdx;
    }

    getTooltipRegions() {
        return this.lastChildTooltipRegions;
    }

    renderChildToCanvas(canvas: HTMLCanvasElement, child: any) {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const prevCanvas = this.canvas;
        const prevCtx = this.ctx;
        const prevTransitions = this.transitions;
        this.canvas = canvas;
        this.ctx = ctx;
        this.transitions = this.childTransitions;
        this.clickRegions = [];
        this.tooltipRegions = [];

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        if (child?.type === 'chart' && child.data) {
            this.renderChartInBounds(child.data, child.title, 0, 0, width, height);
        } else if (child?.type === 'array' && child.data) {
            this.renderArrayInBounds(child.data, child.title, 0, 0, width, height, child.dsType, child._tracerKey);        } else if (child?.type === 'locals' && child.rows) {
            this.renderLocalsInBounds(child.rows, child.patchedRows, child.title, 0, 0, width, child.callStack);
        } else if (child?.type === 'array2d' && child.data) {
            this.renderArray2DInBounds(child.data, child.title, 0, 0, width, height, child.dsType);
        } else if (child?.type === 'hashmap' && child.data) {
            this.renderHashMapInBounds(child.data, child.title, 0, 0, width, height);
        } else if (child?.type === 'log' && child.logs) {
            this.renderLogInBounds(child.logs, child.title, 0, 0, width);
        } else if (child?.type === 'recursion' && child.calls) {
            this.renderRecursionInBounds(child.calls, child.title, 0, 0, width, height, 0);
        } else if (child?.type === 'graph') {
            this.renderGraphInBounds(child.adjMatrix, child.nodes, child.title, 0, 0, width, height, child.visitedEdges, child.directed, child.weighted, child.nodeLabels, child.layout, child.edges, child.treeDims);
        } else if (child?.type === 'variables' && child.vars) {
            this.renderVariablesInBounds(child.vars, child.title, 0, 0, width, height, child.patchState);
        } else if (child?.type === 'variablesGroup') {
            this.renderVariablesGroupInBounds(child.items, 0, 0, width);
        } else {
            this.ctx.fillStyle = theme.text.faint;
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('waiting for data…', width / 2, height / 2);
        }

        this.lastChildClickRegions = this.clickRegions;
        this.lastChildTooltipRegions = this.tooltipRegions;
        this.transitions = prevTransitions;
        this.canvas = prevCanvas;
        this.ctx = prevCtx;
    }

    private calcLocalsHeightFromCount(rowCount: number, maxFrames?: number): number {
        if (maxFrames && maxFrames > 1) {
            // Top frame expanded (~46px) + collapsed frames (~26px each) + title (38px)
            return Math.max(60, 38 + 46 + (maxFrames - 1) * 26);
        }
        return Math.max(60, 38 + rowCount * 30);
    }



    private parseLocalsFrames(rows: any[]): { name: string; vars: { name: string; val: any; rowIdx: number }[] }[] {
        const frames: { name: string; vars: { name: string; val: any; rowIdx: number }[] }[] = [];
        for (let i = 0; i < rows.length; i++) {
            const name = String(rows[i][0]);
            if (name.startsWith('\u25b8')) {
                frames.push({ name: name.substring(2), vars: [] });
            } else if (frames.length > 0) {
                frames[frames.length - 1].vars.push({ name: name.replace(/^\s+/, ''), val: rows[i][1], rowIdx: i });
            }
        }
        return frames;
    }

    private renderLocalsInBounds(rows: any[], patchedRows: Set<number>, _title: string | undefined, x: number, y: number, _width: number, callStack?: any) {
        if (!this.ctx) return;
        const frames = this.parseLocalsFrames(rows);
        const csCalls = callStack?.calls || [];
        let ly = y + (_title ? 18 : 8);

        if (_title) {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Call Stack & Locals', x + 10, ly);
            ly += 20;
        }

        for (let f = 0; f < frames.length; f++) {
            const frame = frames[f];
            const isTop = f === 0;
            const expanded = isTop || this.expandedFrames.has(f);
            const hasVars = frame.vars.length > 0;
            const showVars = expanded && hasVars;
            const toggle = isTop ? '' : (expanded ? ' \u25be' : ' \u25b8');
            const csCall = csCalls[f];
            const returning = csCall?.patched;

            const barX = x + 10 + f * 12;
            const barW = _width - 20 - f * 12;
            const barH = showVars ? 38 : 22;

            // Bar background
            const regionIdx = this.clickRegions.length;
            const hovered = !isTop && this.hoveredRegionIdx === regionIdx;
            this.ctx.fillStyle = returning ? theme.status.errorDark : (isTop ? theme.accent.explored : (hovered ? theme.text.faint : theme.cell.default));
            this.ctx.beginPath();
            this.ctx.roundRect(barX, ly, barW, barH, 4);
            this.ctx.fill();
            this.ctx.strokeStyle = returning ? theme.status.error : (isTop ? theme.accent.default : (hovered ? theme.text.secondary : theme.text.muted));
            this.ctx.beginPath();
            this.ctx.roundRect(barX, ly, barW, barH, 4);
            this.ctx.stroke();

            // Frame name
            this.ctx.fillStyle = isTop ? '#fff' : theme.text.primary;
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(frame.name + toggle, barX + 8, ly + 11);

            if (!isTop) {
                this.clickRegions.push({
                    x: barX, y: ly, w: barW, h: barH,
                    action: () => {
                        const idx = f;
                        if (this.expandedFrames.has(idx)) this.expandedFrames.delete(idx);
                        else this.expandedFrames.add(idx);
                        this.resize();
                    }
                });
            }

            // Variable chips inside bar
            if (showVars) {
                let cx = barX + 8;
                const chipY = ly + 28;
                this.ctx.font = '10px monospace';
                for (const v of frame.vars) {
                    const label = `${v.name}=${v.val}`;
                    const tw = this.ctx.measureText(label).width;
                    const chipW = tw + 10;
                    const patched = patchedRows?.has(v.rowIdx);
                    if (patched) {
                        this.ctx.shadowColor = theme.status.error;
                        this.ctx.shadowBlur = 8;
                    }
                    this.ctx.fillStyle = patched ? theme.status.error : 'rgba(0,0,0,0.35)';
                    this.ctx.beginPath();
                    this.ctx.roundRect(cx, chipY - 7, chipW, 16, 3);
                    this.ctx.fill();
                    this.ctx.shadowColor = 'transparent';
                    this.ctx.shadowBlur = 0;
                    this.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
                    this.ctx.beginPath();
                    this.ctx.roundRect(cx, chipY - 7, chipW, 16, 3);
                    this.ctx.stroke();
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '10px monospace';
                    this.ctx.textAlign = 'left';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(label, cx + 5, chipY + 1);
                    cx += chipW + 5;
                }
            }

            ly += barH + 4;
        }
    }
    private renderLogInBounds(logs: any[], title: string | undefined, x: number, y: number, maxWidth?: number) {
        if (!this.ctx) return;
        
        const isError = title === 'Error';
        let ly = y + 20;
        const wrapW = (maxWidth || 400) - 20;
        
        if (title) {
            this.ctx.fillStyle = isError ? theme.status.error : theme.text.secondary;
            this.ctx.font = isError ? 'bold 14px sans-serif' : '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(isError ? '⚠ Error' : title, x + 10, ly);
            ly += isError ? 24 : 20;
        }
        
        this.ctx.fillStyle = isError ? theme.status.errorLight : '#fff';
        this.ctx.font = '12px monospace';
        
        logs.forEach(log => {
            const text = String(log);
            for (const wrapped of this.wrapText(text, wrapW)) {
                this.ctx!.fillText(wrapped, x + 10, ly);
                ly += 16;
            }
        });
    }

    private renderArray2D(rows: any[][], title?: string, dsType?: string) {
        if (!this.ctx || !this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;

        this.renderArray2DInBounds(rows, title, 0, 0, width, height, dsType);
    }

    private renderArray2DInBounds(rows: any[][], title: string | undefined, x: number, y: number, width: number, height: number, dsType?: string) {
        if (!this.ctx || !rows.length) return;

        const cols = rows[0]?.length || 1;
        const nRows = rows.length;
        const titleH = title ? 25 : 0;
        const cellSize = 40;

        const gridW = cols * cellSize;
        const gridH = nRows * cellSize;
        const startX = x + (width - gridW) / 2;
        const startY = y + titleH + (height - titleH - gridH) / 2;

        if (title) {
            this.drawTitleWithBadge(title, dsType, x + width / 2, y + 16, 12);
        }

        const fontSize = 12;
        this.ctx.font = `${fontSize}px monospace`;
        const textPad = 4;

        rows.forEach((row, rowIdx) => {
            row.forEach((item, colIdx) => {
                const value = typeof item === 'object' ? item.value : item;
                const selected = typeof item === 'object' ? item.selected : false;
                const patched = typeof item === 'object' ? item.patched : false;
                const cx = startX + colIdx * cellSize;
                const cy = startY + rowIdx * cellSize;

                this.ctx!.fillStyle = patched ? theme.status.error : (selected ? theme.status.info : theme.bg.active);
                this.ctx!.fillRect(cx, cy, cellSize, cellSize);

                this.ctx!.strokeStyle = theme.text.faint;
                this.ctx!.lineWidth = 1;
                this.ctx!.strokeRect(cx, cy, cellSize, cellSize);

                this.ctx!.fillStyle = '#fff';
                this.ctx!.font = `${fontSize}px monospace`;
                this.ctx!.textAlign = 'center';
                this.ctx!.textBaseline = 'middle';
                const label = this.truncateText(String(value), cellSize - textPad * 2);
                this.ctx!.fillText(label, cx + cellSize / 2, cy + cellSize / 2);
            });
        });

    }

    private renderHashMap(rows: any[][], title?: string) {
        if (!this.ctx || !this.canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        this.renderHashMapInBounds(rows, title, 0, 0, width, height);
    }

    private isHashMapVertical(rows: any[][], width: number): boolean {
        if (!this.ctx || rows.length < 2) return false;
        const n = rows[0]?.length || 0;
        if (n > 10) return true;
        this.ctx.font = '12px monospace';
        const pad = 40;
        const gap = 6;
        let totalW = (n - 1) * gap;
        for (let i = 0; i < n; i++) {
            const k = typeof rows[0][i] === 'object' ? rows[0][i].value : rows[0][i];
            const v = typeof rows[1][i] === 'object' ? rows[1][i].value : rows[1][i];
            const content = Math.max(this.ctx.measureText(String(k)).width, this.ctx.measureText(String(v)).width) + 16;
            totalW += Math.max(50, Math.min(120, content));
        }
        return totalW > width - pad;
    }

    private renderHashMapInBounds(rows: any[][], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx || !rows.length || rows.length < 2) return;

        const keys = rows[0];
        const values = rows[1];
        const n = keys.length;
        if (n === 0) return;

        const titleH = title ? 25 : 0;
        if (title) this.drawTitleWithBadge(title, 'Map', x + width / 2, y + 14, 12);

        if (this.isHashMapVertical(rows, width)) {
            this.renderHashMapVertical(keys, values, n, x, y + titleH, width, height - titleH);
        } else {
            this.renderHashMapHorizontal(keys, values, n, x, y + titleH, width, height - titleH);
        }
    }

    private renderHashMapHorizontal(keys: any[], values: any[], n: number, x: number, y: number, width: number, height: number) {
        const cellH = 32;
        const gap = 6;
        const minW = 50;
        const maxW = 120;

        this.ctx!.font = '12px monospace';
        const naturalWidths: number[] = [];
        for (let i = 0; i < n; i++) {
            const { kVal, vVal } = this.extractMapEntry(keys[i], values[i]);
            const content = Math.max(this.ctx!.measureText(String(kVal)).width, this.ctx!.measureText(String(vVal)).width) + 16;
            naturalWidths.push(Math.max(minW, Math.min(maxW, content)));
        }
        const totalNatural = naturalWidths.reduce((s, w) => s + w, 0) + (n - 1) * gap;
        const availW = width - 40;
        const scale = totalNatural > availW ? availW / totalNatural : 1;
        const cellWidths = naturalWidths.map(w => w * scale);
        const totalW = cellWidths.reduce((s, w) => s + w, 0) + (n - 1) * gap;
        const startX = x + (width - totalW) / 2;
        const startY = y + (height - cellH * 2 - 12) / 2;

        let curX = startX;
        for (let i = 0; i < n; i++) {
            const cellW = cellWidths[i];
            const { kVal, vVal, selected, patched } = this.extractMapEntry(keys[i], values[i]);
            const keyTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.bg.elevated);
            const valTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.cell.default);
            const borderTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.border.light);

            this.applyMapGlow(selected, patched);
            this.ctx!.fillStyle = this.transitionColor(`map-k-${i}`, keyTarget);
            this.ctx!.beginPath();
            this.ctx!.roundRect(curX, startY, cellW, cellH, [4, 4, 0, 0]);
            this.ctx!.fill();
            this.ctx!.strokeStyle = borderTarget;
            this.ctx!.lineWidth = 1;
            this.ctx!.stroke();
            this.ctx!.shadowColor = 'transparent'; this.ctx!.shadowBlur = 0;

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '12px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(this.truncateText(String(kVal), cellW - 8), curX + cellW / 2, startY + cellH / 2);

            this.applyMapGlow(selected, patched);
            this.ctx!.fillStyle = this.transitionColor(`map-v-${i}`, valTarget);
            this.ctx!.beginPath();
            this.ctx!.roundRect(curX, startY + cellH, cellW, cellH, [0, 0, 4, 4]);
            this.ctx!.fill();
            this.ctx!.strokeStyle = borderTarget;
            this.ctx!.lineWidth = 1;
            this.ctx!.stroke();
            this.ctx!.shadowColor = 'transparent'; this.ctx!.shadowBlur = 0;

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = 'bold 13px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(this.truncateText(String(vVal), cellW - 8), curX + cellW / 2, startY + cellH + cellH / 2);

            this.tooltipRegions.push({ x: curX, y: startY, w: cellW, h: cellH * 2, text: `${kVal} \u2192 ${vVal}` });
            curX += cellW + gap;
        }
    }

    private renderHashMapVertical(keys: any[], values: any[], n: number, x: number, y: number, width: number, height: number) {
        const rowH = 28;
        const gap = 3;
        const pad = 20;
        const keyW = Math.min(100, (width - pad * 2) * 0.3);
        const valW = width - pad * 2 - keyW - 8;
        const totalH = n * rowH + (n - 1) * gap;
        const startX = x + pad;
        const startY = y + (height - totalH) / 2;

        for (let i = 0; i < n; i++) {
            const { kVal, vVal, selected, patched } = this.extractMapEntry(keys[i], values[i]);
            const ry = startY + i * (rowH + gap);
            const keyTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.bg.elevated);
            const valTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.cell.default);
            const borderTarget = patched ? theme.status.error : (selected ? theme.status.info : theme.border.light);

            this.applyMapGlow(selected, patched);
            this.ctx!.fillStyle = this.transitionColor(`map-k-${i}`, keyTarget);
            this.ctx!.beginPath();
            this.ctx!.roundRect(startX, ry, keyW, rowH, [4, 0, 0, 4]);
            this.ctx!.fill();
            this.ctx!.strokeStyle = borderTarget;
            this.ctx!.lineWidth = 1;
            this.ctx!.stroke();
            this.ctx!.shadowColor = 'transparent'; this.ctx!.shadowBlur = 0;

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '12px monospace';
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(this.truncateText(String(kVal), keyW - 10), startX + keyW / 2, ry + rowH / 2);

            this.applyMapGlow(selected, patched);
            this.ctx!.fillStyle = this.transitionColor(`map-v-${i}`, valTarget);
            this.ctx!.beginPath();
            this.ctx!.roundRect(startX + keyW + 4, ry, valW, rowH, [0, 4, 4, 0]);
            this.ctx!.fill();
            this.ctx!.strokeStyle = borderTarget;
            this.ctx!.lineWidth = 1;
            this.ctx!.stroke();
            this.ctx!.shadowColor = 'transparent'; this.ctx!.shadowBlur = 0;

            // Arrow between key and value
            this.ctx!.fillStyle = theme.text.faint;
            this.ctx!.font = '10px sans-serif';
            this.ctx!.textAlign = 'center';
            this.ctx!.fillText('\u2192', startX + keyW + 2, ry + rowH / 2);

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = 'bold 12px monospace';
            this.ctx!.textAlign = 'left';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(this.truncateText(String(vVal), valW - 12), startX + keyW + 10, ry + rowH / 2);

            this.tooltipRegions.push({ x: startX, y: ry, w: keyW + 4 + valW, h: rowH, text: `${kVal} \u2192 ${vVal}` });
        }
    }

    private extractMapEntry(kItem: any, vItem: any) {
        return {
            kVal: typeof kItem === 'object' ? kItem.value : kItem,
            vVal: typeof vItem === 'object' ? vItem.value : vItem,
            selected: (typeof kItem === 'object' && kItem.selected) || (typeof vItem === 'object' && vItem.selected),
            patched: (typeof kItem === 'object' && kItem.patched) || (typeof vItem === 'object' && vItem.patched),
        };
    }

    private applyMapGlow(selected: boolean, patched: boolean) {
        if (patched) { this.ctx!.shadowColor = theme.status.error; this.ctx!.shadowBlur = 10; }
        else if (selected) { this.ctx!.shadowColor = theme.status.info; this.ctx!.shadowBlur = 8; }
    }

    private renderGraphInBounds(adjMatrix: number[][], nodes: any[], title: string | undefined, x: number, y: number, width: number, height: number, visitedEdges?: string[], directed?: boolean, weighted?: boolean, nodeLabels?: string[], layout?: string, edges?: [number, number][], treeDims?: { maxLeaves: number; maxDepth: number }) {
        if (!this.ctx || !nodes.length) return;

        const n = nodes.length;
        const nodeR = Math.max(10, Math.min(20, 200 / Math.max(n, 1)));
        const nat = this.graphNaturalSize({ nodes, layout, edges } as any);
        const paneH = layout === 'tree' ? SimpleRenderer.TREE_PANE_HEIGHT : SimpleRenderer.GRAPH_PANE_HEIGHT;
        const scale = Math.max(SimpleRenderer.GRAPH_MIN_SCALE, Math.min(1, paneH / Math.max(nat.w, nat.h)));

        if (scale < 1) {
            this.ctx.save();
            this.ctx.translate(x, y);
            this.ctx.scale(scale, scale);
            const sw = width / scale;
            const sh = height / scale;
            this.renderGraphContent(adjMatrix, nodes, title, 0, 0, sw, sh, visitedEdges, directed, weighted, nodeLabels, layout, edges, nodeR, treeDims);
            this.ctx.restore();
        } else {
            this.renderGraphContent(adjMatrix, nodes, title, x, y, width, height, visitedEdges, directed, weighted, nodeLabels, layout, edges, nodeR, treeDims);
        }
    }

    private renderGraphContent(adjMatrix: number[][], nodes: any[], title: string | undefined, x: number, y: number, width: number, height: number, visitedEdges?: string[], directed?: boolean, weighted?: boolean, nodeLabels?: string[], layout?: string, edges?: [number, number][], nodeR?: number, treeDims?: { maxLeaves: number; maxDepth: number }) {
        if (!this.ctx) return;

        const n = nodes.length;
        const nr = nodeR ?? Math.max(10, Math.min(20, 200 / Math.max(n, 1)));

        const badge = layout === 'tree' ? 'Tree' : 'Graph';
        const titleH = title ? 25 : 0;
        if (title) this.drawTitleWithBadge(title, badge, x + width / 2, y + 14, 12);

        const edgeSet = new Set(visitedEdges || []);
        const labels = nodeLabels || [];

        let pos: { x: number; y: number }[];

        if (layout === 'tree' && edges?.length) {
            pos = this.computeTreeLayout(n, edges, x, y + titleH, width, height - titleH, nr, treeDims);
        } else {
            const cxC = x + width / 2;
            const cyC = y + titleH + (height - titleH) / 2;
            const minCircleR = n > 1 ? (n * (nr * 2 + 12)) / (2 * Math.PI) : 0;
            const fitR = Math.min(width, height - titleH) / 2 - nr - 10;
            const r = Math.max(minCircleR, fitR);
            pos = nodes.map((_: any, i: number) => ({
                x: cxC + r * Math.cos(2 * Math.PI * i / n - Math.PI / 2),
                y: cyC + r * Math.sin(2 * Math.PI * i / n - Math.PI / 2),
            }));
        }

        // Helper to check if a node is a null sentinel
        const isNull = (idx: number) => String(labels[idx] ?? '').startsWith('null_');

        // Draw edges (skip edges to/from null sentinel nodes)
        if (directed) {
            if (layout === 'tree' && edges?.length) {
                // For tree layout, draw from edges array to support duplicate edges
                for (const [from, to] of edges) {
                    if (isNull(from) || isNull(to)) continue;
                    const a = Math.min(from, to), b = Math.max(from, to);
                    const visited = edgeSet.has(`${a}-${b}`);
                    this.drawDirectedEdge(pos[from], pos[to], nr, visited, 0, weighted ? (adjMatrix[from]?.[to] || 0) : 0);
                }
            } else {
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) {
                        if (i === j || !adjMatrix[i]?.[j]) continue;
                        if (isNull(i) || isNull(j)) continue;
                        const a = Math.min(i, j), b = Math.max(i, j);
                        const visited = edgeSet.has(`${a}-${b}`);
                        const bidir = !!(adjMatrix[j]?.[i]);
                        this.drawDirectedEdge(pos[i], pos[j], nr, visited, bidir ? (i < j ? 1 : -1) : 0, weighted ? adjMatrix[i][j] : 0);
                    }
                }
            }
        } else {
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (isNull(i) || isNull(j)) continue;
                    const w = adjMatrix[i]?.[j] || adjMatrix[j]?.[i];
                    if (!w) continue;
                    const visited = edgeSet.has(`${i}-${j}`);
                    const edgeTarget = visited ? theme.accent.default : theme.edge.default;
                    this.ctx.strokeStyle = this.transitionColor(`edge-${i}-${j}`, edgeTarget);
                    this.ctx.lineWidth = visited ? 2.5 : 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(pos[i].x, pos[i].y);
                    this.ctx.lineTo(pos[j].x, pos[j].y);
                    this.ctx.stroke();
                    if (weighted && w !== 1) {
                        this.ctx.fillStyle = theme.status.weight;
                        this.ctx.font = '10px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.textBaseline = 'middle';
                        this.ctx.fillText(String(w), (pos[i].x + pos[j].x) / 2, (pos[i].y + pos[j].y) / 2 - 8);
                    }
                }
            }
        }

        // Draw nodes (skip null sentinel nodes)
        this.ctx.lineWidth = 1.5;
        for (let i = 0; i < n; i++) {
            const label = String(labels[i] ?? i);
            if (label.startsWith('null_')) continue;

            this.ctx.beginPath();
            this.ctx.arc(pos[i].x, pos[i].y, nr, 0, Math.PI * 2);
            const nodeTarget = nodes[i].state === 'active' ? theme.accent.default : nodes[i].state === 'explored' ? theme.accent.explored : theme.cell.default;
            this.ctx.fillStyle = this.transitionColor(`node-${i}`, nodeTarget);
            this.ctx.fill();
            this.ctx.strokeStyle = theme.text.secondary;
            this.ctx.stroke();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = `${Math.max(8, Math.min(13, nr))}px monospace`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.truncateText(label, nr * 2 - 4), pos[i].x, pos[i].y);
            this.tooltipRegions.push({ x: pos[i].x - nr, y: pos[i].y - nr, w: nr * 2, h: nr * 2, text: label });
        }

    }

    private computeTreeLayout(n: number, edges: [number, number][], x: number, y: number, width: number, height: number, nodeR: number, treeDims?: { maxLeaves: number; maxDepth: number }): { x: number; y: number }[] {
        if (n === 0) return [];
        // Build children map from directed edges
        const children: number[][] = Array.from({ length: n }, () => []);
        const hasParent = new Set<number>();
        for (const [from, to] of edges) {
            children[from].push(to);
            hasParent.add(to);
        }

        // Find root (node with no parent)
        let root = 0;
        for (let i = 0; i < n; i++) {
            if (!hasParent.has(i)) { root = i; break; }
        }

        // BFS to compute depth and leaf count for each subtree
        const depth: number[] = new Array(n).fill(0);
        const leafIndex: number[] = new Array(n).fill(0);
        const subtreeLeaves: number[] = new Array(n).fill(0);
        const order: number[] = [];

        const queue = [root];
        const visited = new Set([root]);
        while (queue.length) {
            const node = queue.shift()!;
            order.push(node);
            for (const child of children[node]) {
                if (!visited.has(child)) {
                    visited.add(child);
                    depth[child] = depth[node] + 1;
                    queue.push(child);
                }
            }
        }

        // Compute subtree leaf counts bottom-up
        for (let i = order.length - 1; i >= 0; i--) {
            const node = order[i];
            const kids = [...new Set(children[node])];
            if (kids.length === 0) {
                subtreeLeaves[node] = 1;
            } else {
                subtreeLeaves[node] = kids.reduce((s, c) => s + subtreeLeaves[c], 0);
            }
        }

        // Assign horizontal positions based on leaf ordering
        let leafCounter = 0;
        const assignLeafIndex = (node: number) => {
            const kids = [...new Set(children[node])];
            if (kids.length === 0) {
                leafIndex[node] = leafCounter++;
            } else {
                for (const child of kids) assignLeafIndex(child);
                // Center parent over children
                const first = leafIndex[kids[0]];
                const last = leafIndex[kids[kids.length - 1]];
                leafIndex[node] = (first + last) / 2;
            }
        };
        assignLeafIndex(root);

        const maxDepth = Math.max(...depth);
        const totalLeaves = leafCounter || 1;
        // Use precomputed max dimensions for stable centering across rebuilds
        const spacingLeaves = treeDims ? Math.max(totalLeaves, treeDims.maxLeaves) : totalLeaves;
        const spacingDepth = treeDims ? Math.max(maxDepth, treeDims.maxDepth) : maxDepth;
        const pad = nodeR + 10;
        const usableW = width - pad * 2;
        const usableH = height - pad * 2;
        const levelH = spacingDepth > 0 ? usableH / spacingDepth : 0;

        const pos: { x: number; y: number }[] = new Array(n);
        for (let i = 0; i < n; i++) {
            pos[i] = {
                x: x + pad + (spacingLeaves > 1 ? (leafIndex[i] / (spacingLeaves - 1)) * usableW : usableW / 2),
                y: y + pad + depth[i] * levelH,
            };
        }
        return pos;
    }

    private drawDirectedEdge(from: { x: number; y: number }, to: { x: number; y: number }, nr: number, visited: boolean, curve: number, weight: number) {
        if (!this.ctx) return;
        const dx = to.x - from.x, dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        const ux = dx / dist, uy = dy / dist;

        // Shorten to node edges
        const sx = from.x + ux * nr, sy = from.y + uy * nr;
        const ex = to.x - ux * nr, ey = to.y - uy * nr;

        this.ctx.strokeStyle = visited ? theme.accent.default : theme.text.muted;
        this.ctx.lineWidth = visited ? 2.5 : 1;

        const bulge = curve * 20;
        const nx = -uy, ny = ux; // perpendicular
        const cpx = (sx + ex) / 2 + nx * bulge;
        const cpy = (sy + ey) / 2 + ny * bulge;

        this.ctx.beginPath();
        if (curve !== 0) {
            this.ctx.moveTo(sx, sy);
            this.ctx.quadraticCurveTo(cpx, cpy, ex, ey);
        } else {
            this.ctx.moveTo(sx, sy);
            this.ctx.lineTo(ex, ey);
        }
        this.ctx.stroke();

        // Arrowhead — tangent at endpoint
        let ax: number, ay: number;
        if (curve !== 0) {
            ax = ex - (2 * (1 - 1) * (cpx - sx) + 2 * 1 * (ex - cpx)) ? ex - cpx : ux;
            ay = ey - (2 * (1 - 1) * (cpy - sy) + 2 * 1 * (ey - cpy)) ? ey - cpy : uy;
            // Tangent of quadratic at t=1: 2*(P2-P1) = 2*(end - cp)
            ax = ex - cpx; ay = ey - cpy;
        } else {
            ax = ux; ay = uy;
        }
        const alen = Math.sqrt(ax * ax + ay * ay);
        if (alen === 0) return;
        ax /= alen; ay /= alen;
        const arrowLen = 8;
        this.ctx.fillStyle = visited ? theme.accent.default : theme.text.muted;
        this.ctx.beginPath();
        this.ctx.moveTo(ex, ey);
        this.ctx.lineTo(ex - arrowLen * ax + arrowLen * 0.4 * (-ay), ey - arrowLen * ay + arrowLen * 0.4 * ax);
        this.ctx.lineTo(ex - arrowLen * ax - arrowLen * 0.4 * (-ay), ey - arrowLen * ay - arrowLen * 0.4 * ax);
        this.ctx.closePath();
        this.ctx.fill();

        // Weight label
        if (weight && weight !== 1) {
            const lx = curve !== 0 ? cpx : (sx + ex) / 2;
            const ly = (curve !== 0 ? cpy : (sy + ey) / 2) - 8;
            this.ctx.fillStyle = theme.status.weight;
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(String(weight), lx, ly);
        }
    }

    private renderRecursion(calls: any[], title?: string) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 30;
        }
        
        calls.forEach((call, i) => {
            const indent = i * 20;
            const x = 20 + indent;
            const barWidth = width - x - 20;
            
            this.ctx!.fillStyle = call.patched ? theme.status.error : (call.active ? theme.accent.default : theme.text.muted);
            this.ctx!.fillRect(x, y - 15, barWidth, 25);
            
            this.ctx!.strokeStyle = theme.text.secondary;
            this.ctx!.strokeRect(x, y - 15, barWidth, 25);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '12px monospace';
            this.ctx!.textAlign = 'left';
            this.ctx!.textBaseline = 'middle';
            const params = call.params.join(', ');
            const label = this.truncateText(`${call.method}${params}`, barWidth - 16);
            this.ctx!.fillText(label, x + 8, y);
            
            y += 30;
        });
    }
    
    private renderVariables(vars: Record<string, any>, title?: string, patchState?: Record<string, any>) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 30;
        }
        
        this.drawVarChips(vars, patchState, 20, y, width - 40, '12px monospace');
    }
    
    private renderRecursionInBounds(calls: any[], title: string | undefined, x: number, y: number, width: number, _height: number, _parentY: number) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            ly += 25;
        }
        
        calls.forEach((call, i) => {
            const indent = Math.min(i * 15, width * 0.3);
            const cx = x + 10 + indent;
            const cw = width - indent - 20;
            
            this.ctx!.fillStyle = call.patched ? theme.status.error : (call.active ? theme.accent.default : theme.text.muted);
            this.ctx!.fillRect(cx, ly - 12, cw, 20);
            
            this.ctx!.strokeStyle = theme.text.secondary;
            this.ctx!.strokeRect(cx, ly - 12, cw, 20);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = '10px monospace';
            this.ctx!.textAlign = 'left';
            this.ctx!.textBaseline = 'middle';
            const params = call.params.join(', ');
            const label = this.truncateText(`${call.method}${params}`, cw - 8);
            this.ctx!.fillText(label, cx + 4, ly);
            
            ly += 22;
        });
    }
    
    private renderVariablesInBounds(vars: Record<string, any>, title: string | undefined, x: number, y: number, width: number, _height: number, patchState?: Record<string, any>) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            ly += 25;
        }
        
        this.drawVarChips(vars, patchState, x + 10, ly, width - 20, '10px monospace');
    }

    private renderVariablesGroupInBounds(items: any[], x: number, y: number, width: number) {
        if (!this.ctx) return;
        
        let ly = y + 18;
        const hasTitle = items.some((item: any) => item.title);
        if (hasTitle) {
            this.ctx.fillStyle = theme.text.secondary;
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Local Variables', x + 10, ly);
            ly += 20;
        }
        
        this.ctx.font = '11px sans-serif';
        const subTitles = items.map((item: any) =>
            (item.title || '').replace(/locals?\s*[-–—:]?\s*variables?\s*[-–—:]?\s*/i, '').replace(/locals?\s*[-–—:]?\s*/i, '').trim() || 'scope'
        );
        const maxLabelW = Math.max(...subTitles.map((s: string) => this.ctx!.measureText(s).width));
        const chipsX = x + 18 + maxLabelW;
        
        items.forEach((item: any, idx: number) => {
            this.ctx!.fillStyle = theme.text.muted;
            this.ctx!.font = '11px sans-serif';
            this.ctx!.textAlign = 'left';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(subTitles[idx], x + 12, ly);
            this.drawVarChips(item.vars, item.patchState, chipsX, ly, width - chipsX + x - 10, '11px monospace');
            ly += 28;
        });
    }


    private drawVarChips(vars: Record<string, any>, patchState: Record<string, any> | undefined, startX: number, y: number, maxWidth: number, font: string) {
        if (!this.ctx) return;
        const pad = 8, gap = 6, chipH = 22;
        this.ctx.font = font;
        let cx = startX;
        
        Object.entries(vars).forEach(([name, value]) => {
            const displayValue = (value != null && typeof value === 'object') ? value.value : value;
            const label = `${name} = ${displayValue}`;
            const tw = this.ctx!.measureText(label).width;
            const chipW = tw + pad * 2;
            
            if (cx + chipW > startX + maxWidth && cx > startX) {
                cx = startX;
                y += chipH + gap;
            }
            
            const isPatched = patchState?.[name]?.patched;
            if (isPatched) {
                this.ctx!.shadowColor = theme.status.error;
                this.ctx!.shadowBlur = 8;
            }
            const chipTarget = isPatched ? theme.status.error : theme.cell.default;
            this.ctx!.fillStyle = this.transitionColor(`var-${name}`, chipTarget);
            this.ctx!.fillRect(cx, y - 12, chipW, chipH);
            this.ctx!.shadowColor = 'transparent';
            this.ctx!.shadowBlur = 0;
            this.ctx!.strokeStyle = theme.text.muted;
            this.ctx!.strokeRect(cx, y - 12, chipW, chipH);
            
            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = font;
            this.ctx!.textAlign = 'left';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(label, cx + pad, y - 1);
            
            cx += chipW + gap;
        });
    }
}
