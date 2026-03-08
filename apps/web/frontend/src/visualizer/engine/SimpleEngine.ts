import { SimpleRenderer } from './SimpleRenderer';

export class SimpleEngine {
    private chunks: Chunk[] = [];
    private cursor = 0;
    private tracers: Record<string, any> = {};
    private root: string | null = null;
    private renderer: SimpleRenderer;
    private listeners: Set<() => void> = new Set();
    private hiddenChildren: Set<string> = new Set();
    private recursiveOnly = false;
    private highlightedLine: number | null = null;

    constructor() {
        this.renderer = new SimpleRenderer();
    }

    mount(container: HTMLElement) {
        this.renderer.mount(container);
    }

    unmount() {
        this.renderer.unmount();
    }

    loadCommands(commands: Command[]) {
        const chunks: Chunk[] = [{ commands: [] }];
        
        commands.forEach(command => {
            const { key, method } = command;
            if (key === null && method === 'delay') {
                chunks.push({ commands: [] });
            } else {
                chunks[chunks.length - 1].commands.push(command);
            }
        });

        this.chunks = chunks;
        this.cursor = 0;
        this.reset();
        this.notify();
    }

    private reset() {
        this.tracers = {};
        this.root = null;
        this.highlightedLine = null;
        this.renderer.setData(null);
    }

    getHighlightedLine(): number | null {
        return this.highlightedLine;
    }

    private detectSwaps(chunks: Chunk[]): Map<string, { i: number; j: number }> {
        const swaps = new Map<string, { i: number; j: number }>();
        const patches: Command[] = [];
        for (const chunk of chunks) {
            for (const c of chunk.commands) {
                if (c.key !== null && c.method === 'patch') patches.push(c);
            }
        }

        for (const tracerKey of new Set(patches.map(p => p.key!))) {
            const tp = patches.filter(p => p.key === tracerKey);
            if (tp.length !== 2) continue;
            const tracer = this.tracers[tracerKey];
            if (tracer?.type !== 'array') continue;

            const [a, b] = tp;
            const idxA = a.args[0], valA = a.args[1];
            const idxB = b.args[0], valB = b.args[1];
            if (idxA === idxB) continue;

            const oldA = tracer.data[idxA]?.value;
            const oldB = tracer.data[idxB]?.value;
            if (valA === oldB && valB === oldA) {
                swaps.set(tracerKey, { i: idxA, j: idxB });
            }
        }
        return swaps;
    }

    private applyCommand(command: Command) {
        const { key, method, args } = command;

        if (key === null && method === 'setRoot') {
            this.root = args[0];
            this.updateRenderer();
        } else if (key !== null && method === 'Array1DTracer') {
            this.tracers[key] = { type: 'array', data: [], title: args[0] };
        } else if (key !== null && method === 'Array2DTracer') {
            const title = args[0] || '';
            if (title.toLowerCase().includes('callstack')) {
                this.tracers[key] = { type: 'recursion', calls: [], title: args[0] };
            } else if (title.toLowerCase().includes('variable') || title.toLowerCase().includes('local')) {
                this.tracers[key] = { type: 'variables', vars: {}, title: args[0] };
            } else {
                this.tracers[key] = { type: 'array2d', data: [], title: args[0] };
            }
        } else if (key !== null && method === 'LogTracer') {
            this.tracers[key] = { type: 'log', logs: [], title: args[0] || 'Log' };
        } else if (key !== null && method === 'CodeTracer') {
            this.tracers[key] = { type: 'code', line: null, title: args[0] || 'Code' };
        } else if (key !== null && method === 'GraphTracer') {
            this.tracers[key] = { type: 'graph', adjMatrix: [], nodes: [], visitedEdges: new Set<string>(), layout: 'circle', title: args[0] || 'Graph' };
        } else if (key !== null && method === 'VerticalLayout') {
            this.tracers[key] = { type: 'layout', children: args[0] || [], title: 'Layout' };
        } else if (key !== null && method === 'set') {
            if (this.tracers[key]?.type === 'array') {
                this.tracers[key].data = args[0].map((v: any) => ({ value: v, selected: false, patched: false }));
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d') {
                const rawData = args[0];
                const unwrapped = (rawData.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) 
                    ? rawData[0] 
                    : rawData;
                this.tracers[key].data = unwrapped.map((row: any[]) =>
                    row.map((v: any) => ({ value: v, selected: false, patched: false }))
                );
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'log') {
                this.tracers[key].logs = [args[0]];
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion') {
                const rawData = args[0];
                let flatData = rawData;
                if (Array.isArray(rawData) && rawData.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) {
                    flatData = rawData[0];
                }
                if (Array.isArray(flatData) && flatData.length > 0) {
                    this.tracers[key].calls = flatData.map((call: string) => {
                        const raw = String(call);
                        const isRecursive = /recursive/i.test(raw);
                        const m = raw.replace(/\s*recursive\s*/gi, '').trim().replace(/,\s*$/, '');
                        return { method: m, params: [], active: false, isRecursive };
                    });
                    this.tracers[key].calls[0].active = true;
                } else {
                    this.tracers[key].calls = [];
                }
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'graph') {
                const raw = args[0];
                const matrix = (raw.length === 1 && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) ? raw[0] : raw;
                this.tracers[key].adjMatrix = matrix;
                this.tracers[key].nodes = matrix.map((_: any, i: number) => ({ state: 'default', index: i }));
                this.tracers[key].visitedEdges = new Set<string>();
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'variables') {
                const rawData = args[0];
                let flatData = rawData;
                if (Array.isArray(rawData) && rawData.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) {
                    flatData = rawData[0];
                }
                const vars: Record<string, any> = {};
                if (Array.isArray(flatData) && flatData.length > 0) {
                    flatData.forEach((item: any) => {
                        if (Array.isArray(item) && item.length === 2) {
                            vars[item[0]] = item[1];
                        }
                    });
                }
                this.tracers[key].vars = vars;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'print') {
            if (this.tracers[key]?.type === 'code') {
                const n = parseInt(String(args[0]));
                if (!isNaN(n)) this.highlightedLine = n;
            } else if (this.tracers[key]?.type === 'log') {
                this.tracers[key].logs.push(args[0]);
                this.updateRenderer();
            }
        } else if (key !== null && method === 'println') {
            if (this.tracers[key]?.type === 'code') {
                const n = parseInt(String(args[0]));
                if (!isNaN(n)) this.highlightedLine = n;
            } else if (this.tracers[key]?.type === 'log') {
                this.tracers[key].logs.push(args[0] + '\n');
                this.updateRenderer();
            }
        } else if (key !== null && method === 'push') {
            if (this.tracers[key]?.type === 'recursion') {
                const rawMethod = String(args[0]);
                const isRecursive = /recursive/i.test(rawMethod);
                const method = rawMethod.replace(/\s*recursive\s*/gi, '').trim().replace(/,\s*$/, '');
                this.tracers[key].calls.push({ method, params: args[1] || [], active: true, isRecursive });
                this.updateRenderer();
            }
        } else if (key !== null && method === 'pop') {
            if (this.tracers[key]?.type === 'recursion' && this.tracers[key].calls.length > 0) {
                this.tracers[key].calls[this.tracers[key].calls.length - 1].active = false;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'directed') {
            if (this.tracers[key]?.type === 'graph') {
                this.tracers[key].directed = !!args[0];
                this.updateRenderer();
            }
        } else if (key !== null && method === 'weighted') {
            if (this.tracers[key]?.type === 'graph') {
                this.tracers[key].weighted = !!args[0];
                this.updateRenderer();
            }
        } else if (key !== null && method === 'addEdge') {
            if (this.tracers[key]?.type === 'graph') {
                const from = Math.floor(args[0]), to = Math.floor(args[1]), weight = args[2] ?? 1;
                if (this.tracers[key].adjMatrix[from]) {
                    this.tracers[key].adjMatrix[from][to] = weight;
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'removeEdge') {
            if (this.tracers[key]?.type === 'graph') {
                const from = Math.floor(args[0]), to = Math.floor(args[1]);
                if (this.tracers[key].adjMatrix[from]) {
                    this.tracers[key].adjMatrix[from][to] = 0;
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'layoutCircle') {
            if (this.tracers[key]?.type === 'graph') {
                this.tracers[key].layout = 'circle';
            }
        } else if (key !== null && method === 'visit') {
            if (this.tracers[key]?.type === 'graph') {
                const nodeIdx = Math.floor(args[0]);
                if (this.tracers[key].nodes[nodeIdx]) {
                    if (this.tracers[key].nodes[nodeIdx].state === 'default') {
                        this.tracers[key].nodes[nodeIdx].state = 'active';
                    }
                }
                if (args.length >= 2) {
                    const src = Math.floor(args[1]);
                    if (src !== nodeIdx) {
                        const a = Math.min(src, nodeIdx), b = Math.max(src, nodeIdx);
                        this.tracers[key].visitedEdges.add(`${a}-${b}`);
                    }
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'leave') {
            if (this.tracers[key]?.type === 'graph') {
                const nodeIdx = Math.floor(args[0]);
                if (this.tracers[key].nodes[nodeIdx]) {
                    this.tracers[key].nodes[nodeIdx].state = 'explored';
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'setVar') {
            if (this.tracers[key]?.type === 'variables') {
                this.tracers[key].vars[args[0]] = args[1];
                this.updateRenderer();
            }
        } else if (key !== null && method === 'select') {
            if (this.tracers[key]?.type === 'array' && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].selected = true;
                this.tracers[key].data[args[0]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].selected = true;
                this.tracers[key].data[args[0]][args[1]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].active = true;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'deselect') {
            if (this.tracers[key]?.type === 'array' && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].selected = false;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'patch') {
            if (this.tracers[key]?.type === 'array' && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].value = args[1];
                this.tracers[key].data[args[0]].patched = true;
                this.tracers[key].data[args[0]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].value = args[2];
                this.tracers[key].data[args[0]][args[1]].patched = true;
                this.tracers[key].data[args[0]][args[1]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].patched = true;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'variables') {
                if (args.length >= 2) {
                    const varNames = Object.keys(this.tracers[key].vars);
                    const rowIndex = Math.floor(args[0]);
                    const colIndex = Math.floor(args[1]);
                    const varName = varNames[rowIndex];
                    if (varName && this.tracers[key].vars.hasOwnProperty(varName)) {
                        if (!this.tracers[key].patchState) {
                            this.tracers[key].patchState = {};
                        }
                        this.tracers[key].patchState[varName] = { patched: true, col: colIndex };
                        this.updateRenderer();
                    }
                }
            }
        } else if (key !== null && method === 'depatch') {
            if (this.tracers[key]?.type === 'array' && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'variables') {
                if (args.length >= 1) {
                    const varNames = Object.keys(this.tracers[key].vars);
                    const rowIndex = Math.floor(args[0]);
                    const varName = varNames[rowIndex];
                    if (varName && this.tracers[key].patchState?.[varName]) {
                        delete this.tracers[key].patchState[varName];
                        this.updateRenderer();
                    }
                }
            }
        }
    }

    private updateRenderer() {
        if (this.root && this.tracers[this.root]) {
            const tracer = this.tracers[this.root];
            
            if (tracer.type === 'array') {
                this.renderer.setData({ type: 'array', data: tracer.data, title: tracer.title });
            } else if (tracer.type === 'array2d') {
                this.renderer.setData({ type: 'array2d', data: tracer.data, title: tracer.title });
            } else if (tracer.type === 'log') {
                this.renderer.setData({ type: 'log', logs: tracer.logs, title: tracer.title });
            } else if (tracer.type === 'recursion') {
                const calls = this.recursiveOnly ? tracer.calls.filter((c: any) => c.isRecursive) : tracer.calls;
                this.renderer.setData({ type: 'recursion', calls, title: tracer.title, recursiveOnly: this.recursiveOnly, onToggleRecursiveOnly: () => this.toggleRecursiveOnly() });
            } else if (tracer.type === 'variables') {
                this.renderer.setData({ type: 'variables', vars: tracer.vars, title: tracer.title, patchState: tracer.patchState });
            } else if (tracer.type === 'graph') {
                this.renderer.setData({ type: 'graph', adjMatrix: tracer.adjMatrix, nodes: tracer.nodes, visitedEdges: [...tracer.visitedEdges], title: tracer.title, directed: tracer.directed, weighted: tracer.weighted });
            } else if (tracer.type === 'layout') {
                const children = tracer.children
                    .filter((childKey: string) => !this.hiddenChildren.has(childKey) && this.tracers[childKey]?.type !== 'code')
                    .map((childKey: string) => {
                        const c = this.tracers[childKey];
                        if (c?.type === 'recursion' && this.recursiveOnly) {
                            return { ...c, calls: c.calls.filter((call: any) => call.isRecursive), recursiveOnly: this.recursiveOnly, onToggleRecursiveOnly: () => this.toggleRecursiveOnly() };
                        }
                        if (c?.type === 'recursion') {
                            return { ...c, recursiveOnly: this.recursiveOnly, onToggleRecursiveOnly: () => this.toggleRecursiveOnly() };
                        }
                        if (c?.type === 'graph') {
                            return { ...c, visitedEdges: [...c.visitedEdges], directed: c.directed, weighted: c.weighted };
                        }
                        return c;
                    })
                    .filter((child: any) => child);
                this.renderer.setData({ type: 'layout', children });
            }
        }
    }

    private isCodeTracerKey(key: string | null): boolean {
        return key !== null && this.tracers[key]?.type === 'code';
    }

    next(): boolean {
        if (this.cursor >= this.chunks.length) return false;

        // Swap pattern: patch → depatch → patch → depatch (with possible CodeTracer in between)
        // Collect array-relevant commands from current chunk onward, stopping at second patch
        const cur = this.chunks[this.cursor];
        let arrayPatch: Command | null = null;
        for (const c of cur.commands) {
            if (c.key !== null && c.method === 'patch' && this.tracers[c.key]?.type === 'array') {
                arrayPatch = c;
                break;
            }
        }

        let swap: { key: string; i: number; j: number } | null = null;
        let consumeCount = 1;

        if (arrayPatch) {
            const k = arrayPatch.key!;
            // Scan forward for: depatch(k) then patch(k) — the second half of a swap
            let foundDepatch = false;
            for (let i = this.cursor; i < this.chunks.length; i++) {
                for (const c of this.chunks[i].commands) {
                    if (c.key === k && c.method === 'depatch') foundDepatch = true;
                    if (c.key === k && c.method === 'patch' && foundDepatch) {
                        // Verify it's a real swap: values cross
                        const idxA = arrayPatch!.args[0], valA = arrayPatch!.args[1];
                        const idxB = c.args[0], valB = c.args[1];
                        if (idxA !== idxB) {
                            const oldA = this.tracers[k].data[idxA]?.value;
                            const oldB = this.tracers[k].data[idxB]?.value;
                            if (valA === oldB && valB === oldA) {
                                swap = { key: k, i: idxA, j: idxB };
                                consumeCount = i - this.cursor + 1;
                            }
                        }
                        break;
                    }
                    // Abort if array gets reset
                    if (c.key === k && c.method === 'set') break;
                }
                if (swap || (!foundDepatch && i > this.cursor)) break;
            }
        }

        this.cursor += consumeCount;
        this.updateToCurrentCursor();

        if (swap) {
            this.renderer.animateSwap('', swap.i, swap.j);
        }

        return true;
    }

    prev(): boolean {
        if (this.cursor <= 0) return false;
        this.cursor--;
        this.reset();
        this.updateToCurrentCursor();
        return true;
    }

    setCursor(cursor: number) {
        this.cursor = Math.max(0, Math.min(cursor, this.chunks.length));
        this.reset();
        this.updateToCurrentCursor();
    }

    private updateToCurrentCursor() {
        const applyingChunks = this.chunks.slice(0, this.cursor);
        applyingChunks.forEach(chunk => {
            chunk.commands.forEach(command => this.applyCommand(command));
        });
        this.notify();
    }

    getCursor() {
        return this.cursor;
    }

    getLength() {
        return this.chunks.length;
    }

    getLayoutChildren(): { key: string; title: string }[] {
        if (!this.root) return [];
        const tracer = this.tracers[this.root];
        if (tracer?.type !== 'layout') return [];
        return tracer.children
            .map((k: string) => ({ key: k, title: this.tracers[k]?.title || k }))
            .filter((c: { key: string; title: string }) => this.tracers[c.key]);
    }

    toggleChild(key: string) {
        if (this.hiddenChildren.has(key)) this.hiddenChildren.delete(key);
        else this.hiddenChildren.add(key);
        this.updateRenderer();
        this.notify();
    }

    isChildHidden(key: string): boolean {
        return this.hiddenChildren.has(key);
    }

    getRecursiveOnly(): boolean {
        return this.recursiveOnly;
    }

    toggleRecursiveOnly() {
        this.recursiveOnly = !this.recursiveOnly;
        this.updateRenderer();
        this.notify();
    }

    hasRecursionTracer(): boolean {
        return Object.values(this.tracers).some((t: any) => t.type === 'recursion');
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }
}

interface Command {
    key: string | null;
    method: string;
    args: any[];
}

interface Chunk {
    commands: Command[];
}
