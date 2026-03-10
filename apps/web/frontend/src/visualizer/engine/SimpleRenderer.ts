interface SwapAnimation {
    tracerKey: string;
    i: number;
    j: number;
    progress: number;
    startTime: number;
}

export class SimpleRenderer {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private data: any = null;
    private container: HTMLElement | null = null;
    private swapAnim: SwapAnimation | null = null;
    private animFrameId: number | null = null;
    private resizeObserver: ResizeObserver | null = null;
    private clickRegions: { x: number; y: number; w: number; h: number; action: () => void }[] = [];
    private handleClick: ((e: MouseEvent) => void) | null = null;

    private static readonly SWAP_DURATION = 300;

    mount(container: HTMLElement) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.style.width = '100%';
        this.canvas.style.display = 'block';
        this.canvas.style.background = '#111';
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
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
    }

    unmount() {
        this.resizeObserver?.disconnect();
        if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
        if (this.canvas && this.handleClick) this.canvas.removeEventListener('click', this.handleClick);
        if (this.canvas?.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
        this.container = null;
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
            this.canvas.style.height = requiredHeight + 'px';
        }
        
        this.render();
    };

    setData(data: any) {
        this.data = data;
        this.resize();
    }

    animateSwap(_tracerKey: string, i: number, j: number) {
        this.swapAnim = { tracerKey: _tracerKey, i, j, progress: 0, startTime: performance.now() };
        this.animLoop();
    }

    private animLoop = () => {
        if (!this.swapAnim) return;
        const elapsed = performance.now() - this.swapAnim.startTime;
        this.swapAnim.progress = Math.min(elapsed / SimpleRenderer.SWAP_DURATION, 1);
        this.render();
        if (this.swapAnim.progress < 1) {
            this.animFrameId = requestAnimationFrame(this.animLoop);
        } else {
            this.swapAnim = null;
            this.animFrameId = null;
        }
    };

    private easeInOut(t: number): number {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
        
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        
        this.ctx.clearRect(0, 0, width, height);
        
        if (!this.data) {
            this.ctx.fillStyle = '#555';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Run code to visualize', width / 2, height / 2);
            return;
        }

        if (this.data.type === 'array') {
            this.renderArray(this.data.data, this.data.title);
        } else if (this.data.type === 'array2d') {
            this.renderArray2D(this.data.data, this.data.title);
        } else if (this.data.type === 'log') {
            this.renderLog(this.data.logs, this.data.title);
        } else if (this.data.type === 'recursion') {
            this.renderRecursion(this.data.calls, this.data.title, this.data.recursiveOnly, this.data.onToggleRecursiveOnly);
        } else if (this.data.type === 'variables') {
            this.renderVariables(this.data.vars, this.data.title, this.data.patchState);
        } else if (this.data.type === 'graph') {
            this.renderGraphInBounds(this.data.adjMatrix, this.data.nodes, this.data.title, 0, 0, width, height, this.data.visitedEdges, this.data.directed, this.data.weighted, this.data.nodeLabels, this.data.layout, this.data.edges);
        } else if (this.data.type === 'layout') {
            this.renderLayout(this.data.children);
        } else {
            this.renderText(JSON.stringify(this.data, null, 2));
        }
    }

    private renderArray(arr: any[], title?: string) {
        if (!this.ctx || !this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;

        const cellWidth = Math.min(80, (width - 40) / Math.max(arr.length, 1));
        const cellHeight = 60;
        const totalWidth = arr.length * cellWidth;
        const startX = (width - totalWidth) / 2;
        const y = (height - cellHeight) / 2;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, width / 2, y - 15);
        }

        const anim = this.swapAnim;
        const t = anim ? this.easeInOut(anim.progress) : 0;

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;

            let offsetX = 0;
            let isSwapping = false;

            if (anim && (i === anim.i || i === anim.j)) {
                isSwapping = true;
                const dist = (anim.j - anim.i) * cellWidth;
                if (i === anim.i) {
                    offsetX = t * dist;
                } else {
                    offsetX = -t * dist;
                }
            }

            const x = startX + i * cellWidth + offsetX;
            const cy = y;

            this.ctx!.fillStyle = (isSwapping || patched) ? '#f44336' : (selected ? '#2196F3' : '#333');
            this.ctx!.fillRect(x + 2, cy, cellWidth - 4, cellHeight);

            this.ctx!.strokeStyle = '#666';
            this.ctx!.strokeRect(x + 2, cy, cellWidth - 4, cellHeight);

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = `${Math.min(16, cellWidth * 0.35)}px monospace`;
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(String(value), x + cellWidth / 2, cy + cellHeight / 2);

            this.ctx!.fillStyle = '#888';
            this.ctx!.font = '12px monospace';
            this.ctx!.fillText(String(i), startX + i * cellWidth + cellWidth / 2, y + cellHeight + 20);
        });
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

    private renderLog(logs: any[], title?: string) {
        if (!this.ctx) return;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 25;
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '14px monospace';
        
        logs.forEach(log => {
            const text = String(log);
            const lines = text.split('\n');
            lines.forEach(line => {
                this.ctx!.fillText(line, 20, y);
                y += 20;
            });
        });
    }

    private calcChildHeight(child: any): number {
        if (child?.type === 'recursion' && child.calls) return Math.max(120, 45 + child.calls.length * 22);
        if (child?.type === 'graph') return child?.layout === 'tree' ? 300 : 250;
        if (child?.type === 'array2d' && child.data) return Math.max(120, 30 + child.data.length * 35);
        if (child?.type === 'variables' && child.vars) return Math.max(60, 45 + 28);
        if (child?.type === 'variablesGroup') return 25 + child.items.length * 32;
        if (child?.type === 'log' && child.logs) return Math.max(80, 36 + child.logs.length * 16);
        return 120;
    }

    private groupLayoutChildren(children: any[]): any[] {
        const grouped: any[] = [];
        const varItems: any[] = [];
        let logChild: any = null;
        for (const child of children) {
            if (child?.type === 'variables') {
                varItems.push(child);
            } else if (child?.type === 'log') {
                logChild = child;
            } else {
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
            
            if (child?.type === 'array' && child.data) {
                this.renderArrayInBounds(child.data, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'array2d' && child.data) {
                this.renderArray2DInBounds(child.data, child.title, 0, 0, width, sectionHeight);
            } else if (child?.type === 'log' && child.logs) {
                this.renderLogInBounds(child.logs, child.title, 0, 0);
            } else if (child?.type === 'recursion' && child.calls) {
                this.renderRecursionInBounds(child.calls, child.title, 0, 0, width, sectionHeight, y, child.recursiveOnly, child.onToggleRecursiveOnly);
            } else if (child?.type === 'graph') {
                this.renderGraphInBounds(child.adjMatrix, child.nodes, child.title, 0, 0, width, sectionHeight, child.visitedEdges, child.directed, child.weighted, child.nodeLabels, child.layout, child.edges);
            } else if (child?.type === 'variables' && child.vars) {
                this.renderVariablesInBounds(child.vars, child.title, 0, 0, width, sectionHeight, child.patchState);
            } else if (child?.type === 'variablesGroup') {
                this.renderVariablesGroupInBounds(child.items, 0, 0, width);
            }
            
            this.ctx!.restore();
            
            if (i < grouped.length - 1) {
                this.ctx!.strokeStyle = '#444';
                this.ctx!.beginPath();
                this.ctx!.moveTo(0, yOffset);
                this.ctx!.lineTo(width, yOffset);
                this.ctx!.stroke();
            }
        });
    }

    private renderArrayInBounds(arr: any[], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx) return;

        const cellWidth = Math.min(60, (width - 40) / Math.max(arr.length, 1));
        const cellHeight = 40;
        const totalWidth = arr.length * cellWidth;
        const startX = x + (width - totalWidth) / 2;
        const startY = y + (height - cellHeight) / 2;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, x + width / 2, startY - 10);
        }

        const anim = this.swapAnim;
        const t = anim ? this.easeInOut(anim.progress) : 0;

        arr.forEach((item, i) => {
            const value = typeof item === 'object' ? item.value : item;
            const selected = typeof item === 'object' ? item.selected : false;
            const patched = typeof item === 'object' ? item.patched : false;

            let offsetX = 0;
            let isSwapping = false;

            if (anim && (i === anim.i || i === anim.j)) {
                isSwapping = true;
                const dist = (anim.j - anim.i) * cellWidth;
                if (i === anim.i) {
                    offsetX = t * dist;
                } else {
                    offsetX = -t * dist;
                }
            }

            const cx = startX + i * cellWidth + offsetX;
            const cy = startY;

            this.ctx!.fillStyle = (isSwapping || patched) ? '#f44336' : (selected ? '#2196F3' : '#333');
            this.ctx!.fillRect(cx + 2, cy, cellWidth - 4, cellHeight);

            this.ctx!.strokeStyle = '#666';
            this.ctx!.strokeRect(cx + 2, cy, cellWidth - 4, cellHeight);

            this.ctx!.fillStyle = '#fff';
            this.ctx!.font = `${Math.min(14, cellWidth * 0.35)}px monospace`;
            this.ctx!.textAlign = 'center';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(String(value), cx + cellWidth / 2, cy + cellHeight / 2);
            
            this.ctx!.fillStyle = '#888';
            this.ctx!.font = '10px monospace';
            this.ctx!.fillText(String(i), startX + i * cellWidth + cellWidth / 2, startY + cellHeight + 15);
        });
    }

    private renderLogInBounds(logs: any[], title: string | undefined, x: number, y: number) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            ly += 20;
        }
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
        
        logs.forEach(log => {
            const text = String(log);
            this.ctx!.fillText(text, x + 10, ly);
            ly += 16;
        });
    }

    private renderArray2D(rows: any[][], title?: string) {
        if (!this.ctx || !this.canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;

        this.renderArray2DInBounds(rows, title, 0, 0, width, height);
    }

    private renderArray2DInBounds(rows: any[][], title: string | undefined, x: number, y: number, width: number, height: number) {
        if (!this.ctx || !rows.length) return;

        const cols = rows[0]?.length || 1;
        const nRows = rows.length;
        const titleH = title ? 25 : 0;
        const pad = 20;

        const maxCellW = Math.floor((width - pad * 2) / cols);
        const maxCellH = Math.floor((height - pad * 2 - titleH) / nRows);
        const cellSize = Math.max(24, Math.min(64, maxCellW, maxCellH));

        const gridW = cols * cellSize;
        const gridH = nRows * cellSize;
        const startX = x + (width - gridW) / 2;
        const startY = y + titleH + (height - titleH - gridH) / 2;

        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, x + width / 2, y + 16);
        }

        const fontSize = Math.max(8, Math.min(12, cellSize * 0.4));
        this.ctx.font = `${fontSize}px monospace`;
        const textPad = 4;

        rows.forEach((row, rowIdx) => {
            row.forEach((item, colIdx) => {
                const value = typeof item === 'object' ? item.value : item;
                const selected = typeof item === 'object' ? item.selected : false;
                const patched = typeof item === 'object' ? item.patched : false;
                const cx = startX + colIdx * cellSize;
                const cy = startY + rowIdx * cellSize;

                this.ctx!.fillStyle = patched ? '#f44336' : (selected ? '#2196F3' : '#2a2a2a');
                this.ctx!.fillRect(cx, cy, cellSize, cellSize);

                this.ctx!.strokeStyle = '#444';
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

    private renderGraphInBounds(adjMatrix: number[][], nodes: any[], title: string | undefined, x: number, y: number, width: number, height: number, visitedEdges?: string[], directed?: boolean, weighted?: boolean, nodeLabels?: string[], layout?: string, edges?: [number, number][]) {
        if (!this.ctx || !nodes.length) return;

        const titleH = title ? 25 : 0;
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(title, x + width / 2, y + 18);
        }

        const n = nodes.length;
        const nodeR = 20;
        const edgeSet = new Set(visitedEdges || []);

        const labels = nodeLabels || [];

        let pos: { x: number; y: number }[];

        if (layout === 'tree' && edges?.length) {
            pos = this.computeTreeLayout(n, edges, x, y + titleH, width, height - titleH, nodeR);
        } else {
            const cx = x + width / 2;
            const cy = y + titleH + (height - titleH) / 2;
            const r = Math.min(width, height - titleH) / 2 - 30;
            pos = nodes.map((_: any, i: number) => ({
                x: cx + r * Math.cos(2 * Math.PI * i / n - Math.PI / 2),
                y: cy + r * Math.sin(2 * Math.PI * i / n - Math.PI / 2),
            }));
        }

        // Helper to check if a node is a null sentinel
        const isNull = (idx: number) => String(labels[idx] ?? '').startsWith('null_');

        // Draw edges (skip edges to/from null sentinel nodes)
        if (directed) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (i === j || !adjMatrix[i]?.[j]) continue;
                    if (isNull(i) || isNull(j)) continue;
                    const a = Math.min(i, j), b = Math.max(i, j);
                    const visited = edgeSet.has(`${a}-${b}`);
                    const bidir = !!(adjMatrix[j]?.[i]);
                    this.drawDirectedEdge(pos[i], pos[j], nodeR, visited, bidir ? (i < j ? 1 : -1) : 0, weighted ? adjMatrix[i][j] : 0);
                }
            }
        } else {
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    if (isNull(i) || isNull(j)) continue;
                    const w = adjMatrix[i]?.[j] || adjMatrix[j]?.[i];
                    if (!w) continue;
                    const visited = edgeSet.has(`${i}-${j}`);
                    this.ctx.strokeStyle = visited ? '#4CAF50' : '#555';
                    this.ctx.lineWidth = visited ? 2.5 : 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(pos[i].x, pos[i].y);
                    this.ctx.lineTo(pos[j].x, pos[j].y);
                    this.ctx.stroke();
                    if (weighted && w !== 1) {
                        this.ctx.fillStyle = '#ffab40';
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
            this.ctx.arc(pos[i].x, pos[i].y, nodeR, 0, Math.PI * 2);
            this.ctx.fillStyle = nodes[i].state === 'active' ? '#4CAF50' : nodes[i].state === 'explored' ? '#2E7D32' : '#333';
            this.ctx.fill();
            this.ctx.strokeStyle = '#888';
            this.ctx.stroke();

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '13px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(this.truncateText(label, nodeR * 2 - 4), pos[i].x, pos[i].y);
        }
    }

    private computeTreeLayout(n: number, edges: [number, number][], x: number, y: number, width: number, height: number, nodeR: number): { x: number; y: number }[] {
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
            const kids = children[node].filter(c => visited.has(c) || true);
            if (kids.length === 0) {
                subtreeLeaves[node] = 1;
            } else {
                subtreeLeaves[node] = kids.reduce((s, c) => s + subtreeLeaves[c], 0);
            }
        }

        // Assign horizontal positions based on leaf ordering
        let leafCounter = 0;
        const assignLeafIndex = (node: number) => {
            const kids = children[node];
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
        const pad = nodeR + 10;
        const usableW = width - pad * 2;
        const usableH = height - pad * 2;
        const levelH = maxDepth > 0 ? usableH / maxDepth : 0;

        const pos: { x: number; y: number }[] = new Array(n);
        for (let i = 0; i < n; i++) {
            pos[i] = {
                x: x + pad + (totalLeaves > 1 ? (leafIndex[i] / (totalLeaves - 1)) * usableW : usableW / 2),
                y: y + pad + depth[i] * levelH,
            };
        }
        return pos;
    }

    private drawDirectedEdge(from: { x: number; y: number }, to: { x: number; y: number }, nodeR: number, visited: boolean, curve: number, weight: number) {
        if (!this.ctx) return;
        const dx = to.x - from.x, dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist === 0) return;
        const ux = dx / dist, uy = dy / dist;

        // Shorten to node edges
        const sx = from.x + ux * nodeR, sy = from.y + uy * nodeR;
        const ex = to.x - ux * nodeR, ey = to.y - uy * nodeR;

        this.ctx.strokeStyle = visited ? '#4CAF50' : '#555';
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
        this.ctx.fillStyle = visited ? '#4CAF50' : '#555';
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
            this.ctx.fillStyle = '#ffab40';
            this.ctx.font = '10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(String(weight), lx, ly);
        }
    }

    private renderRecursion(calls: any[], title?: string, recursiveOnly?: boolean, onToggle?: () => void) {
        if (!this.ctx || !this.canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const width = this.canvas.width / dpr;
        
        let y = 30;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            if (onToggle) this.drawRecursiveToggle(width - 150, y - 10, recursiveOnly ?? false, onToggle);
            y += 30;
        }
        
        calls.forEach((call, i) => {
            const indent = i * 20;
            const x = 20 + indent;
            const barWidth = width - x - 20;
            
            this.ctx!.fillStyle = call.patched ? '#f44336' : (call.active ? '#4CAF50' : '#666');
            this.ctx!.fillRect(x, y - 15, barWidth, 25);
            
            this.ctx!.strokeStyle = '#888';
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
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '14px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, 20, y);
            y += 30;
        }
        
        this.drawVarChips(vars, patchState, 20, y, width - 40, '12px monospace');
    }
    
    private renderRecursionInBounds(calls: any[], title: string | undefined, x: number, y: number, width: number, _height: number, parentY: number, recursiveOnly?: boolean, onToggle?: () => void) {
        if (!this.ctx) return;
        
        let ly = y + 20;
        
        if (title) {
            this.ctx.fillStyle = '#aaa';
            this.ctx.font = '12px sans-serif';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(title, x + 10, ly);
            if (onToggle) this.drawRecursiveToggle(x + width - 140, parentY + ly - 10, recursiveOnly ?? false, onToggle);
            ly += 25;
        }
        
        calls.forEach((call, i) => {
            const indent = Math.min(i * 15, width * 0.3);
            const cx = x + 10 + indent;
            const cw = width - indent - 20;
            
            this.ctx!.fillStyle = call.patched ? '#f44336' : (call.active ? '#4CAF50' : '#666');
            this.ctx!.fillRect(cx, ly - 12, cw, 20);
            
            this.ctx!.strokeStyle = '#888';
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
            this.ctx.fillStyle = '#aaa';
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
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Local Variables', x + 10, ly);
        ly += 20;
        
        this.ctx.font = '11px sans-serif';
        const subTitles = items.map((item: any) =>
            (item.title || '').replace(/locals?\s*[-–—:]?\s*variables?\s*[-–—:]?\s*/i, '').replace(/locals?\s*[-–—:]?\s*/i, '').trim() || 'scope'
        );
        const maxLabelW = Math.max(...subTitles.map((s: string) => this.ctx!.measureText(s).width));
        const chipsX = x + 18 + maxLabelW;
        
        items.forEach((item: any, idx: number) => {
            this.ctx!.fillStyle = '#777';
            this.ctx!.font = '11px sans-serif';
            this.ctx!.textAlign = 'left';
            this.ctx!.textBaseline = 'middle';
            this.ctx!.fillText(subTitles[idx], x + 12, ly);
            this.drawVarChips(item.vars, item.patchState, chipsX, ly, width - chipsX + x - 10, '11px monospace');
            ly += 28;
        });
    }

    private drawRecursiveToggle(x: number, y: number, checked: boolean, onToggle: () => void) {
        if (!this.ctx) return;
        const label = `${checked ? '☑' : '☐'} recursive only`;
        this.ctx.fillStyle = '#888';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(label, x, y);
        const tw = this.ctx.measureText(label).width;
        this.clickRegions.push({ x, y, w: tw, h: 16, action: onToggle });
    }

    private drawVarChips(vars: Record<string, any>, patchState: Record<string, any> | undefined, startX: number, y: number, maxWidth: number, font: string) {
        if (!this.ctx) return;
        const pad = 8, gap = 6, chipH = 22;
        this.ctx.font = font;
        let cx = startX;
        
        Object.entries(vars).forEach(([name, value]) => {
            const displayValue = typeof value === 'object' ? value.value : value;
            const label = `${name} = ${displayValue}`;
            const tw = this.ctx!.measureText(label).width;
            const chipW = tw + pad * 2;
            
            if (cx + chipW > startX + maxWidth && cx > startX) {
                cx = startX;
                y += chipH + gap;
            }
            
            const isPatched = patchState?.[name]?.patched;
            this.ctx!.fillStyle = isPatched ? '#f44336' : '#333';
            this.ctx!.fillRect(cx, y - 12, chipW, chipH);
            this.ctx!.strokeStyle = '#666';
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
