import { SimpleRenderer } from './SimpleRenderer';
import type { Command, Chunk, Tracer, GraphTracer } from './types';
export type { Command, Chunk } from './types';

// Helpers
function unwrap2D(raw: any): any[] {
    return (raw.length === 1 && Array.isArray(raw[0]) && Array.isArray(raw[0][0])) ? raw[0] : raw;
}

function toCells(arr: any[]) {
    return arr.map((v: any) => ({ value: v, selected: false, patched: false }));
}

function toCells2D(raw: any) {
    return unwrap2D(raw).map((row: any[]) => row.map((v: any) => ({ value: v, selected: false, patched: false })));
}

function parseTitleDsType(rawTitle: string): { title: string; dsType?: string } {
    const colonIdx = rawTitle.indexOf(': ');
    if (colonIdx >= 0) return { dsType: rawTitle.substring(0, colonIdx), title: rawTitle.substring(colonIdx + 2) };
    return { title: rawTitle };
}

function resolveNodeIdx(t: GraphTracer, id: string): number {
    if (t.namedNodes.has(id)) return t.namedNodes.get(id)!;
    const n = Number(id);
    return isNaN(n) ? -1 : Math.floor(n);
}

export class SimpleEngine {
    private chunks: Chunk[] = [];
    private cursor = 0;
    private tracers: Record<string, Tracer> = {};
    private root: string | null = null;
    private renderer: SimpleRenderer;
    private listeners: Set<() => void> = new Set();
    private hiddenChildren: Set<string> = new Set();
    private highlightedLine: number | null = null;
    private batching = false;
    private activeChildKey: string | null = null;
    private rawCommands: Command[] = [];
    private static readonly TYPE_PRIORITY: Record<string, number> = {
        graph: 10, array: 9, array2d: 9, hashmap: 9, log: 5, variables: 3, locals: 1, recursion: 0,
    };

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
        this.rawCommands = commands;

        const raw: Chunk[] = [{ commands: [] }];
        commands.forEach(command => {
            const { key, method } = command;
            if (key === null && method === 'delay') {
                raw.push({ commands: [] });
            } else {
                raw[raw.length - 1].commands.push(command);
            }
        });

        this.chunks = raw.filter(c => c.commands.length > 0);
        this.cursor = 0;
        this.reset();
        this.precomputeFinalTreeLayouts(commands);
        this.notify();
    }

    private treeMaxLeaves: Map<string, number> = new Map();
    private treeMaxDepth: Map<string, number> = new Map();
    private treeKeys: Set<string> = new Set();
    private _maxLocalsRows = 0;
    private _maxLocalsFrames = 0;

    getMaxLocalsRows(): number { return this._maxLocalsRows; }
    getMaxLocalsFrames(): number { return this._maxLocalsFrames; }

    private precomputeFinalTreeLayouts(commands: Command[]) {
        this.treeMaxLeaves.clear();
        this.treeMaxDepth.clear();
        this.treeKeys.clear();
        this._maxLocalsRows = 0;
        this._maxLocalsFrames = 0;
        const localsKeys = new Set<string>();
        const trackers = new Map<string, { namedNodes: Map<string, number>; edges: [number, number][]; isTree: boolean }>();
        for (const cmd of commands) {
            const { key, method, args } = cmd;
            if (!key) continue;
            if (method === 'Array2DTracer') {
                const title = String(args[0] || '').toLowerCase();
                if (title === 'locals') localsKeys.add(key);
            }
            if (method === 'set' && localsKeys.has(key)) {
                const rows = unwrap2D(args[0]);
                if (Array.isArray(rows)) {
                    this._maxLocalsRows = Math.max(this._maxLocalsRows, rows.length);
                    let frames = 0;
                    for (const r of rows) { if (Array.isArray(r) && String(r[0]).startsWith('\u25b8')) frames++; }
                    this._maxLocalsFrames = Math.max(this._maxLocalsFrames, frames);
                }
            }
            if (method === 'GraphTracer') {
                trackers.set(key, { namedNodes: new Map(), edges: [], isTree: false });
            }
            const t = trackers.get(key);
            if (!t) continue;
            if (method === 'reset') {
                t.namedNodes.clear(); t.edges.length = 0;
            } else if (method === 'addNode') {
                const id = String(args[0]);
                if (!t.namedNodes.has(id)) t.namedNodes.set(id, t.namedNodes.size);
            } else if (method === 'addEdge') {
                const from = t.namedNodes.get(String(args[0])) ?? -1;
                const to = t.namedNodes.get(String(args[1])) ?? -1;
                if (from >= 0 && to >= 0) t.edges.push([from, to]);
            } else if (method === 'layoutTree') {
                t.isTree = true;
                this.treeKeys.add(key);
                const n = t.namedNodes.size;
                const children: number[][] = Array.from({ length: n }, () => []);
                const hasParent = new Set<number>();
                for (const [from, to] of t.edges) { children[from].push(to); hasParent.add(to); }
                let root = 0;
                for (let i = 0; i < n; i++) { if (!hasParent.has(i)) { root = i; break; } }
                const depth = new Array(n).fill(0);
                const queue = [root];
                const visited = new Set([root]);
                while (queue.length) {
                    const nd = queue.shift()!;
                    for (const c of children[nd]) {
                        if (!visited.has(c)) { visited.add(c); depth[c] = depth[nd] + 1; queue.push(c); }
                    }
                }
                let leaves = 0;
                for (let i = 0; i < n; i++) {
                    const label = [...t.namedNodes.entries()].find(([, v]) => v === i)?.[0];
                    if (label?.startsWith('null_')) continue;
                    if (children[i].length === 0) leaves++;
                }
                const maxD = Math.max(...depth);
                this.treeMaxLeaves.set(key, Math.max(this.treeMaxLeaves.get(key) ?? 0, leaves));
                this.treeMaxDepth.set(key, Math.max(this.treeMaxDepth.get(key) ?? 0, maxD));
            }
        }
    }

    getTreeMaxDimensions(key: string): { maxLeaves: number; maxDepth: number } | undefined {
        const l = this.treeMaxLeaves.get(key);
        const d = this.treeMaxDepth.get(key);
        if (l === undefined || d === undefined) return undefined;
        return { maxLeaves: l, maxDepth: d };
    }

    private reset() {
        this.tracers = {};
        this.root = null;
        this.highlightedLine = null;
        this.renderer.setData(null);
    }

    getActiveChildKey(): string | null { return this.activeChildKey; }

    getActiveChildType(): string | null {
        if (!this.activeChildKey) return null;
        return this.tracers[this.activeChildKey]?.type || null;
    }

    getHighlightedLine(): number | null { return this.highlightedLine; }

    // --- Command dispatch ---

    private applyCommand(command: Command) {
        const { key, method, args } = command;

        if (key !== null && this.tracers[key] && this.tracers[key].type !== 'code') {
            const newPri = SimpleEngine.TYPE_PRIORITY[this.tracers[key].type] ?? 2;
            const curPri = this.activeChildKey && this.tracers[this.activeChildKey]
                ? (SimpleEngine.TYPE_PRIORITY[this.tracers[this.activeChildKey].type] ?? 2) : -1;
            if (newPri >= curPri) this.activeChildKey = key;
        }

        if (key === null) {
            if (method === 'setRoot') this.root = args[0];
            return;
        }

        const handler = this.dispatch[method];
        if (handler) {
            handler(key, args);
        }
    }

    private dispatch: Record<string, (key: string, args: any[]) => void> = {
        // --- Tracer creation ---
        ChartTracer: (key, args) => {
            this.tracers[key] = { type: 'chart', data: [], title: args[0] || '' };
        },
        Array1DTracer: (key, args) => {
            const { title, dsType } = parseTitleDsType(args[0] || '');
            this.tracers[key] = { type: 'array', data: [], title, dsType };
        },
        Array2DTracer: (key, args) => {
            const title = args[0] || '';
            const lower = title.toLowerCase();
            if (lower.includes('callstack')) {
                this.tracers[key] = { type: 'recursion', calls: [], title };
            } else if (lower === 'locals') {
                this.tracers[key] = { type: 'locals', rows: [], patchedRows: new Set(), title };
            } else if (lower.includes('variable') || lower.includes('local')) {
                this.tracers[key] = { type: 'variables', vars: {}, title };
            } else if (lower.startsWith('map:')) {
                this.tracers[key] = { type: 'hashmap', data: [], title: title.replace(/^map:\s*/i, '') };
            } else {
                const { title: t, dsType } = parseTitleDsType(title);
                this.tracers[key] = { type: 'array2d', data: [], title: t, dsType };
            }
        },
        LogTracer: (key, args) => {
            this.tracers[key] = { type: 'log', logs: [], title: args[0] || 'Log' };
        },
        CodeTracer: (key, args) => {
            this.tracers[key] = { type: 'code', line: null, title: args[0] || 'Code' };
        },
        GraphTracer: (key, args) => {
            this.tracers[key] = { type: 'graph', adjMatrix: [], nodes: [], visitedEdges: new Set(), layout: 'circle', title: args[0] || 'Graph', namedNodes: new Map(), nodeLabels: [], edges: [], treeRoot: null };
        },
        VerticalLayout: (key, args) => {
            this.tracers[key] = { type: 'layout', children: args[0] || [], title: 'Layout' };
        },

        // --- Data set ---
        set: (key, args) => {
            const t = this.tracers[key];
            if (!t) return;
            switch (t.type) {
                case 'chart':
                case 'array':
                    t.data = toCells(args[0]);
                    break;
                case 'array2d':
                case 'hashmap':
                    t.data = toCells2D(args[0]);
                    break;
                case 'log':
                    t.logs = [args[0]];
                    break;
                case 'recursion': {
                    let flat = unwrap2D(args[0]);
                    if (Array.isArray(flat) && flat.length > 0) {
                        t.calls = flat.map((call: string) => ({
                            method: String(call).replace(/\s*recursive\s*/gi, '').trim().replace(/,\s*$/, ''),
                            params: [], active: false,
                        }));
                        t.calls[0].active = true;
                    } else {
                        t.calls = [];
                    }
                    break;
                }
                case 'graph': {
                    const matrix = unwrap2D(args[0]);
                    t.adjMatrix = matrix;
                    t.nodes = matrix.map((_: any, i: number) => ({ state: 'default', index: i }));
                    t.visitedEdges = new Set();
                    break;
                }
                case 'locals': {
                    const rows = unwrap2D(args[0]);
                    t.rows = rows.map((r: any[]) => [r[0], r[1]]);
                    t.patchedRows = new Set();
                    break;
                }
                case 'variables': {
                    let flat = unwrap2D(args[0]);
                    const vars: Record<string, any> = {};
                    if (Array.isArray(flat)) {
                        flat.forEach((item: any) => {
                            if (Array.isArray(item) && item.length === 2) vars[item[0]] = item[1];
                        });
                    }
                    t.vars = vars;
                    break;
                }
            }
        },

        // --- Print ---
        print: (key, args) => { this.handlePrint(key, args, false); },
        println: (key, args) => { this.handlePrint(key, args, true); },

        // --- Select / Deselect ---
        select: (key, args) => { this.handleCellOp(key, args, 'select'); },
        deselect: (key, args) => { this.handleCellOp(key, args, 'deselect'); },
        patch: (key, args) => { this.handleCellOp(key, args, 'patch'); },
        depatch: (key, args) => { this.handleCellOp(key, args, 'depatch'); },

        // --- Recursion ---
        push: (key, args) => {
            const t = this.tracers[key];
            if (t?.type === 'recursion') {
                const m = String(args[0]).replace(/\s*recursive\s*/gi, '').trim().replace(/,\s*$/, '');
                t.calls.push({ method: m, params: args[1] || [], active: true });
            }
        },
        pop: (key, _args) => {
            const t = this.tracers[key];
            if (t?.type === 'recursion' && t.calls.length > 0) {
                t.calls[t.calls.length - 1].active = false;
            }
        },

        // --- Graph ---
        reset: (key, _args) => {
            const t = this.tracers[key];
            if (t?.type === 'graph') {
                t.adjMatrix = []; t.nodes = []; t.visitedEdges = new Set();
                t.namedNodes = new Map(); t.nodeLabels = []; t.edges = []; t.treeRoot = null;
            }
        },
        directed: (key, args) => {
            const t = this.tracers[key];
            if (t?.type === 'graph') t.directed = !!args[0];
        },
        weighted: (key, args) => {
            const t = this.tracers[key];
            if (t?.type === 'graph') t.weighted = !!args[0];
        },
        addNode: (key, args) => {
            const t = this.tracers[key];
            if (t?.type !== 'graph') return;
            const id = String(args[0]);
            if (t.namedNodes.has(id)) return;
            const idx = t.nodes.length;
            t.namedNodes.set(id, idx);
            t.nodeLabels.push(String(args[1] ?? id));
            t.nodes.push({ state: 'default', index: idx });
            const n = t.nodes.length;
            for (const row of t.adjMatrix) row.push(0);
            t.adjMatrix.push(new Array(n).fill(0));
        },
        addEdge: (key, args) => {
            const t = this.tracers[key];
            if (t?.type !== 'graph') return;
            const from = resolveNodeIdx(t, String(args[0]));
            const to = resolveNodeIdx(t, String(args[1]));
            if (from < 0 || to < 0 || !t.adjMatrix[from]) return;
            t.adjMatrix[from][to] = args[2] ?? 1;
            const posKey = `${from}-${to}`;
            const origIdx = t.removedEdgePositions?.get(posKey);
            if (origIdx !== undefined) {
                t.edges.splice(Math.min(origIdx, t.edges.length), 0, [from, to]);
                t.removedEdgePositions!.delete(posKey);
            } else {
                t.edges.push([from, to]);
            }
        },
        removeEdge: (key, args) => {
            const t = this.tracers[key];
            if (t?.type !== 'graph') return;
            const from = resolveNodeIdx(t, String(args[0]));
            const to = resolveNodeIdx(t, String(args[1]));
            if (from < 0 || to < 0 || !t.adjMatrix[from]) return;
            t.adjMatrix[from][to] = 0;
            const idx = t.edges.findIndex(([a, b]) => a === from && b === to);
            if (idx >= 0) {
                if (!t.removedEdgePositions) t.removedEdgePositions = new Map();
                t.removedEdgePositions.set(`${from}-${to}`, idx);
                t.edges.splice(idx, 1);
            }
        },
        layoutCircle: (key, _args) => {
            const t = this.tracers[key];
            if (t?.type === 'graph') t.layout = 'circle';
        },
        layoutTree: (key, args) => {
            const t = this.tracers[key];
            if (t?.type === 'graph') { t.layout = 'tree'; t.treeRoot = String(args[0]); }
        },
        visit: (key, args) => {
            const t = this.tracers[key];
            if (t?.type !== 'graph') return;
            for (const node of t.nodes) { if (node.state === 'active') node.state = 'default'; }
            const nodeIdx = resolveNodeIdx(t, String(args[0]));
            if (nodeIdx >= 0 && t.nodes[nodeIdx]) t.nodes[nodeIdx].state = 'active';
            if (args.length >= 2) {
                const src = resolveNodeIdx(t, String(args[1]));
                if (src >= 0 && src !== nodeIdx) {
                    const a = Math.min(src, nodeIdx), b = Math.max(src, nodeIdx);
                    t.visitedEdges.add(`${a}-${b}`);
                }
            }
        },
        leave: (key, args) => {
            const t = this.tracers[key];
            if (t?.type !== 'graph') return;
            const nodeIdx = resolveNodeIdx(t, String(args[0]));
            if (nodeIdx >= 0 && t.nodes[nodeIdx]) t.nodes[nodeIdx].state = 'default';
        },
        updateNode: (key, args) => {
            const t = this.tracers[key];
            if (t?.type !== 'graph') return;
            const nodeIdx = resolveNodeIdx(t, String(args[0]));
            if (nodeIdx >= 0 && args.length >= 2) t.nodeLabels[nodeIdx] = String(args[1]);
        },

        // --- Variables ---
        setVar: (key, args) => {
            const t = this.tracers[key];
            if (t?.type === 'variables') t.vars[args[0]] = args[1];
        },
    };

    private handlePrint(key: string, args: any[], newline: boolean) {
        const t = this.tracers[key];
        if (!t) return;
        if (t.type === 'code') {
            const n = parseInt(String(args[0]));
            if (!isNaN(n)) this.highlightedLine = n;
        } else if (t.type === 'log') {
            const text = newline ? args[0] + '\n' : args[0];
            if (t.logs.length > 0 && !t.logs[t.logs.length - 1].endsWith('\n')) {
                t.logs[t.logs.length - 1] += text;
            } else {
                t.logs.push(text);
            }
        }
    }

    private handleCellOp(key: string, args: any[], op: 'select' | 'deselect' | 'patch' | 'depatch') {
        const t = this.tracers[key];
        if (!t) return;

        switch (t.type) {
            case 'array':
            case 'chart': {
                const cell = t.data?.[args[0]];
                if (!cell) return;
                if (op === 'select') { cell.selected = true; cell.patched = false; }
                else if (op === 'deselect') { cell.selected = false; }
                else if (op === 'patch') { cell.value = args[1]; cell.patched = true; cell.selected = false; }
                else { cell.patched = false; }
                break;
            }
            case 'array2d':
            case 'hashmap': {
                const cell = t.data?.[args[0]]?.[args[1]];
                if (!cell) return;
                if (op === 'select') { cell.selected = true; cell.patched = false; }
                else if (op === 'deselect') { cell.selected = false; }
                else if (op === 'patch') { cell.value = args[2]; cell.patched = true; cell.selected = false; }
                else { cell.patched = false; }
                break;
            }
            case 'recursion': {
                const call = t.calls?.[args[0]];
                if (!call) return;
                if (op === 'select') call.active = true;
                else if (op === 'deselect') call.active = false;
                else if (op === 'patch') call.patched = true;
                else call.patched = false;
                break;
            }
            case 'locals':
                if (op === 'patch') t.patchedRows.add(Math.floor(args[0]));
                else if (op === 'depatch') t.patchedRows.delete(Math.floor(args[0]));
                break;
            case 'variables':
                if (op === 'patch' && args.length >= 2) {
                    const varNames = Object.keys(t.vars);
                    const varName = varNames[Math.floor(args[0])];
                    if (varName && t.vars.hasOwnProperty(varName)) {
                        if (!t.patchState) t.patchState = {};
                        t.patchState[varName] = { patched: true, col: Math.floor(args[1]) };
                    }
                } else if (op === 'depatch' && args.length >= 1) {
                    const varNames = Object.keys(t.vars);
                    const varName = varNames[Math.floor(args[0])];
                    if (varName && t.patchState?.[varName]) delete t.patchState[varName];
                }
                break;
        }
    }

    // --- Render data ---

    private buildChildData(childKey: string): any | null {
        const c = this.tracers[childKey];
        if (!c) return null;
        const _tracerKey = childKey;
        if (c.type === 'graph') {
            return { ...c, _tracerKey, dsType: this.treeKeys.has(childKey) ? 'Tree' : 'Graph', visitedEdges: [...c.visitedEdges], directed: c.directed, weighted: c.weighted, nodeLabels: c.nodeLabels, layout: c.layout, treeRoot: c.treeRoot, edges: c.edges, namedNodes: c.namedNodes, treeDims: this.getTreeMaxDimensions(childKey) };
        }
        if (c.type === 'log') {
            return { ...c, _tracerKey, logs: [...c.logs] };
        }
        if (c.type === 'locals') {
            return { ...c, _tracerKey, rows: [...c.rows], patchedRows: new Set(c.patchedRows), maxRows: this._maxLocalsRows, maxFrames: this._maxLocalsFrames };
        }
        if (c.type === 'variables') {
            return { ...c, _tracerKey, patchState: c.patchState ? { ...c.patchState } : undefined };
        }
        return { ...c, _tracerKey };
    }

    private buildLayoutChildren(): any[] {
        if (!this.root) return [];
        const tracer = this.tracers[this.root];
        if (tracer?.type !== 'layout') return [];
        return tracer.children
            .filter((childKey: string) => !this.hiddenChildren.has(childKey) && this.tracers[childKey]?.type !== 'code')
            .map((childKey: string) => this.buildChildData(childKey))
            .filter((child: any) => child);
    }

    private updateRenderer() {
        if (this.batching) return;
        if (this.root && this.tracers[this.root]) {
            const tracer = this.tracers[this.root];
            if (tracer.type === 'layout') {
                this.renderer.setData({ type: 'layout', children: this.buildLayoutChildren() });
            } else {
                const data = this.buildChildData(this.root);
                if (data) { delete data._tracerKey; this.renderer.setData(data); }
            }
        }
    }

    // --- Playback ---

    next(): boolean {
        if (this.cursor >= this.chunks.length) return false;
        this.activeChildKey = null;

        const chunk = this.chunks[this.cursor];
        chunk.commands.forEach(cmd => this.applyCommand(cmd));
        this.cursor++;
        this.updateRenderer();
        this.notify();

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
        this.batching = true;
        const applyingChunks = this.chunks.slice(0, this.cursor);
        applyingChunks.forEach(chunk => {
            chunk.commands.forEach(command => this.applyCommand(command));
        });
        this.batching = false;
        this.updateRenderer();
        this.notify();
    }

    getCursor() { return this.cursor; }
    getLength() { return this.chunks.length; }
    getCommands() { return this.rawCommands; }

    getLayoutChildren(): { key: string; title: string; dsType?: string }[] {
        if (!this.root) return [];
        const tracer = this.tracers[this.root];
        if (tracer?.type !== 'layout') return [];
        return tracer.children
            .map((k: string) => {
                const t = this.tracers[k];
                let dsType = (t as any)?.dsType;
                if (!dsType && t?.type === 'graph') dsType = this.treeKeys.has(k) ? 'Tree' : 'Graph';
                if (!dsType && t?.type === 'chart') dsType = 'Chart';
                if (!dsType && t?.type === 'locals') dsType = 'Call Stack';
                if (!dsType && t?.type === 'hashmap') dsType = 'Map';
                return { key: k, title: t?.title || k, dsType };
            })
            .filter((c: { key: string; title: string }) => {
                const t = this.tracers[c.key];
                if (!t || t.type === 'code' || t.type === 'recursion') return false;
                if ((t.type === 'array' || t.type === 'chart') && t.data?.length === 0) return false;
                if (t.type === 'graph' && t.nodes?.length === 0) return false;
                if (t.type === 'hashmap' && (!t.data?.length || t.data.length < 2)) return false;
                return true;
            });
    }

    toggleChild(key: string) {
        if (this.hiddenChildren.has(key)) this.hiddenChildren.delete(key);
        else this.hiddenChildren.add(key);
        this.updateRenderer();
        this.notify();
    }

    isChildHidden(key: string): boolean { return this.hiddenChildren.has(key); }

    isLayoutRoot(): boolean {
        if (!this.root) return false;
        return this.tracers[this.root]?.type === 'layout';
    }

    getLayoutData(): any[] { return this.buildLayoutChildren(); }
    getRenderer(): SimpleRenderer { return this.renderer; }

    hasRecursionTracer(): boolean {
        return Object.values(this.tracers).some(t => t.type === 'recursion');
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }
}
