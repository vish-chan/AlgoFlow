import { SimpleRenderer } from './SimpleRenderer';

export class SimpleEngine {
    private chunks: Chunk[] = [];
    private cursor = 0;
    private tracers: Record<string, any> = {};
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
                const rawData = args[0];
                const rows = (rawData?.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) ? rawData[0] : rawData;
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
                // Compute depth and leaf count for this rebuild
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

    getActiveChildKey(): string | null {
        return this.activeChildKey;
    }

    getActiveChildType(): string | null {
        if (!this.activeChildKey) return null;
        return this.tracers[this.activeChildKey]?.type || null;
    }

    getHighlightedLine(): number | null {
        return this.highlightedLine;
    }

    private applyCommand(command: Command) {
        const { key, method, args } = command;

        // Track which tracer is actively being updated (prefer visual types over bookkeeping)
        if (key !== null && this.tracers[key] && this.tracers[key].type !== 'code') {
            const newPriority = SimpleEngine.TYPE_PRIORITY[this.tracers[key].type] ?? 2;
            const curPriority = this.activeChildKey && this.tracers[this.activeChildKey]
                ? (SimpleEngine.TYPE_PRIORITY[this.tracers[this.activeChildKey].type] ?? 2) : -1;
            if (newPriority >= curPriority) this.activeChildKey = key;
        }

        if (key === null && method === 'setRoot') {
            this.root = args[0];
            this.updateRenderer();
        } else if (key !== null && method === 'ChartTracer') {
            this.tracers[key] = { type: 'chart', data: [], title: args[0] || '' };
        } else if (key !== null && method === 'Array1DTracer') {
            const rawTitle = args[0] || '';
            const colonIdx = rawTitle.indexOf(': ');
            const dsType = colonIdx >= 0 ? rawTitle.substring(0, colonIdx) : undefined;
            const displayTitle = colonIdx >= 0 ? rawTitle.substring(colonIdx + 2) : rawTitle;
            this.tracers[key] = { type: 'array', data: [], title: displayTitle, dsType };
        } else if (key !== null && method === 'Array2DTracer') {
            const title = args[0] || '';
            if (title.toLowerCase().includes('callstack')) {
                this.tracers[key] = { type: 'recursion', calls: [], title: args[0] };
            } else if (title.toLowerCase() === 'locals') {
                this.tracers[key] = { type: 'locals', rows: [], patchedRows: new Set<number>(), title: args[0] };
            } else if (title.toLowerCase().includes('variable') || title.toLowerCase().includes('local')) {
                this.tracers[key] = { type: 'variables', vars: {}, title: args[0] };
            } else if (title.toLowerCase().startsWith('map: ') || title.toLowerCase().startsWith('map:')) {
                const mapTitle = title.replace(/^map:\s*/i, '');
                this.tracers[key] = { type: 'hashmap', data: [], title: mapTitle };
            } else {
                const colonIdx = title.indexOf(': ');
                const dsType = colonIdx >= 0 ? title.substring(0, colonIdx) : undefined;
                const displayTitle = colonIdx >= 0 ? title.substring(colonIdx + 2) : title;
                this.tracers[key] = { type: 'array2d', data: [], title: displayTitle, dsType };
            }
        } else if (key !== null && method === 'LogTracer') {
            this.tracers[key] = { type: 'log', logs: [], title: args[0] || 'Log' };
        } else if (key !== null && method === 'CodeTracer') {
            this.tracers[key] = { type: 'code', line: null, title: args[0] || 'Code' };
        } else if (key !== null && method === 'GraphTracer') {
            this.tracers[key] = { type: 'graph', adjMatrix: [], nodes: [], visitedEdges: new Set<string>(), layout: 'circle', title: args[0] || 'Graph', namedNodes: new Map<string, number>(), nodeLabels: [] as string[], edges: [] as [number, number][], treeRoot: null as string | null };
        } else if (key !== null && method === 'VerticalLayout') {
            this.tracers[key] = { type: 'layout', children: args[0] || [], title: 'Layout' };
        } else if (key !== null && method === 'set') {
            if (this.tracers[key]?.type === 'chart' || this.tracers[key]?.type === 'array') {
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
            } else if (this.tracers[key]?.type === 'hashmap') {
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
                        const m = raw.replace(/\s*recursive\s*/gi, '').trim().replace(/,\s*$/, '');
                        return { method: m, params: [], active: false };
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
            } else if (this.tracers[key]?.type === 'locals') {
                const rawData = args[0];
                const unwrapped = (rawData.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) ? rawData[0] : rawData;
                this.tracers[key].rows = unwrapped.map((r: any[]) => [r[0], r[1]]);
                this.tracers[key].patchedRows = new Set<number>();
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
                const logs = this.tracers[key].logs;
                if (logs.length > 0 && !logs[logs.length - 1].endsWith('\n')) {
                    logs[logs.length - 1] += args[0];
                } else {
                    logs.push(args[0]);
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'println') {
            if (this.tracers[key]?.type === 'code') {
                const n = parseInt(String(args[0]));
                if (!isNaN(n)) this.highlightedLine = n;
            } else if (this.tracers[key]?.type === 'log') {
                const logs = this.tracers[key].logs;
                if (logs.length > 0 && !logs[logs.length - 1].endsWith('\n')) {
                    logs[logs.length - 1] += args[0] + '\n';
                } else {
                    logs.push(args[0] + '\n');
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'push') {
            if (this.tracers[key]?.type === 'recursion') {
                const rawMethod = String(args[0]);
                const method = rawMethod.replace(/\s*recursive\s*/gi, '').trim().replace(/,\s*$/, '');
                this.tracers[key].calls.push({ method, params: args[1] || [], active: true });
                this.updateRenderer();
            }
        } else if (key !== null && method === 'pop') {
            if (this.tracers[key]?.type === 'recursion' && this.tracers[key].calls.length > 0) {
                this.tracers[key].calls[this.tracers[key].calls.length - 1].active = false;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'reset') {
            if (this.tracers[key]?.type === 'graph') {
                this.tracers[key].adjMatrix = [];
                this.tracers[key].nodes = [];
                this.tracers[key].visitedEdges = new Set<string>();
                this.tracers[key].namedNodes = new Map<string, number>();
                this.tracers[key].nodeLabels = [];
                this.tracers[key].edges = [];
                this.tracers[key].treeRoot = null;
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
        } else if (key !== null && method === 'addNode') {
            if (this.tracers[key]?.type === 'graph') {
                const t = this.tracers[key];
                const id = String(args[0]);
                if (!t.namedNodes.has(id)) {
                    const idx = t.nodes.length;
                    t.namedNodes.set(id, idx);
                    t.nodeLabels.push(String(args[1] ?? id));
                    t.nodes.push({ state: 'default', index: idx });
                    // Expand adjacency matrix
                    const n = t.nodes.length;
                    for (const row of t.adjMatrix) { row.push(0); }
                    t.adjMatrix.push(new Array(n).fill(0));
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'addEdge') {
            if (this.tracers[key]?.type === 'graph') {
                const t = this.tracers[key];
                const fromId = String(args[0]), toId = String(args[1]);
                const from = t.namedNodes.has(fromId) ? t.namedNodes.get(fromId) : (isNaN(Number(fromId)) ? -1 : Math.floor(Number(fromId)));
                const to = t.namedNodes.has(toId) ? t.namedNodes.get(toId) : (isNaN(Number(toId)) ? -1 : Math.floor(Number(toId)));
                if (from >= 0 && to >= 0 && t.adjMatrix[from]) {
                    t.adjMatrix[from][to] = args[2] ?? 1;
                    const posKey = `${from}-${to}`;
                    const origIdx = t.removedEdgePositions?.get(posKey);
                    if (origIdx !== undefined) {
                        t.edges.splice(Math.min(origIdx, t.edges.length), 0, [from, to]);
                        t.removedEdgePositions.delete(posKey);
                    } else {
                        t.edges.push([from, to]);
                    }
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'removeEdge') {
            if (this.tracers[key]?.type === 'graph') {
                const t = this.tracers[key];
                const fromId = String(args[0]), toId = String(args[1]);
                const from = t.namedNodes.has(fromId) ? t.namedNodes.get(fromId) : (isNaN(Number(fromId)) ? -1 : Math.floor(Number(fromId)));
                const to = t.namedNodes.has(toId) ? t.namedNodes.get(toId) : (isNaN(Number(toId)) ? -1 : Math.floor(Number(toId)));
                if (from >= 0 && to >= 0 && t.adjMatrix[from]) {
                    t.adjMatrix[from][to] = 0;
                    const idx = t.edges.findIndex(([a, b]: [number, number]) => a === from && b === to);
                    if (idx >= 0) {
                        if (!t.removedEdgePositions) t.removedEdgePositions = new Map();
                        t.removedEdgePositions.set(`${from}-${to}`, idx);
                        t.edges.splice(idx, 1);
                    }
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'layoutCircle') {
            if (this.tracers[key]?.type === 'graph') {
                this.tracers[key].layout = 'circle';
                this.updateRenderer();
            }
        } else if (key !== null && method === 'layoutTree') {
            if (this.tracers[key]?.type === 'graph') {
                this.tracers[key].layout = 'tree';
                this.tracers[key].treeRoot = String(args[0]);
                this.updateRenderer();
            }
        } else if (key !== null && method === 'visit') {
            if (this.tracers[key]?.type === 'graph') {
                const t = this.tracers[key];
                // Clear any previously active node (only one should be active at a time)
                for (const node of t.nodes) {
                    if (node.state === 'active') node.state = 'default';
                }
                const id = String(args[0]);
                const nodeIdx = t.namedNodes.has(id) ? t.namedNodes.get(id) : (isNaN(Number(id)) ? -1 : Math.floor(Number(id)));
                if (nodeIdx >= 0 && t.nodes[nodeIdx]) {
                    t.nodes[nodeIdx].state = 'active';
                }
                if (args.length >= 2) {
                    const srcId = String(args[1]);
                    const src = t.namedNodes.has(srcId) ? t.namedNodes.get(srcId) : (isNaN(Number(srcId)) ? -1 : Math.floor(Number(srcId)));
                    if (src >= 0 && src !== nodeIdx) {
                        const a = Math.min(src, nodeIdx), b = Math.max(src, nodeIdx);
                        t.visitedEdges.add(`${a}-${b}`);
                    }
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'leave') {
            if (this.tracers[key]?.type === 'graph') {
                const t = this.tracers[key];
                const id = String(args[0]);
                const nodeIdx = t.namedNodes.has(id) ? t.namedNodes.get(id) : (isNaN(Number(id)) ? -1 : Math.floor(Number(id)));
                if (nodeIdx >= 0 && t.nodes[nodeIdx]) {
                    t.nodes[nodeIdx].state = 'default';
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'setVar') {
            if (this.tracers[key]?.type === 'variables') {
                this.tracers[key].vars[args[0]] = args[1];
                this.updateRenderer();
            }
        } else if (key !== null && method === 'updateNode') {
            if (this.tracers[key]?.type === 'graph') {
                const t = this.tracers[key];
                const id = String(args[0]);
                const nodeIdx = t.namedNodes.has(id) ? t.namedNodes.get(id) : -1;
                if (nodeIdx >= 0 && args.length >= 2) {
                    t.nodeLabels[nodeIdx] = String(args[1]);
                }
                this.updateRenderer();
            }
        } else if (key !== null && method === 'select') {
            if ((this.tracers[key]?.type === 'array' || this.tracers[key]?.type === 'chart') && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].selected = true;
                this.tracers[key].data[args[0]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].selected = true;
                this.tracers[key].data[args[0]][args[1]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'hashmap' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].selected = true;
                this.tracers[key].data[args[0]][args[1]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].active = true;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'deselect') {
            if ((this.tracers[key]?.type === 'array' || this.tracers[key]?.type === 'chart') && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'hashmap' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].active = false;
                this.updateRenderer();
            }
        } else if (key !== null && method === 'patch') {
            if ((this.tracers[key]?.type === 'array' || this.tracers[key]?.type === 'chart') && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].value = args[1];
                this.tracers[key].data[args[0]].patched = true;
                this.tracers[key].data[args[0]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].value = args[2];
                this.tracers[key].data[args[0]][args[1]].patched = true;
                this.tracers[key].data[args[0]][args[1]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'hashmap' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].value = args[2];
                this.tracers[key].data[args[0]][args[1]].patched = true;
                this.tracers[key].data[args[0]][args[1]].selected = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].patched = true;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'locals') {
                this.tracers[key].patchedRows.add(Math.floor(args[0]));
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
            if ((this.tracers[key]?.type === 'array' || this.tracers[key]?.type === 'chart') && this.tracers[key]?.data?.[args[0]]) {
                this.tracers[key].data[args[0]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'hashmap' && this.tracers[key]?.data?.[args[0]]?.[args[1]]) {
                this.tracers[key].data[args[0]][args[1]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion' && this.tracers[key]?.calls?.[args[0]]) {
                this.tracers[key].calls[args[0]].patched = false;
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'locals') {
                this.tracers[key].patchedRows.delete(Math.floor(args[0]));
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
        if (this.batching) return;
        if (this.root && this.tracers[this.root]) {
            const tracer = this.tracers[this.root];
            
            if (tracer.type === 'chart') {
                this.renderer.setData({ type: 'chart', data: tracer.data, title: tracer.title });
            } else if (tracer.type === 'array') {
                this.renderer.setData({ type: 'array', data: tracer.data, title: tracer.title, dsType: tracer.dsType });
            } else if (tracer.type === 'array2d') {
                this.renderer.setData({ type: 'array2d', data: tracer.data, title: tracer.title, dsType: tracer.dsType });
            } else if (tracer.type === 'hashmap') {
                this.renderer.setData({ type: 'hashmap', data: tracer.data, title: tracer.title });
            } else if (tracer.type === 'log') {
                this.renderer.setData({ type: 'log', logs: tracer.logs, title: tracer.title });
            } else if (tracer.type === 'recursion') {
                this.renderer.setData({ type: 'recursion', calls: tracer.calls, title: tracer.title });
            } else if (tracer.type === 'locals') {
                this.renderer.setData({ type: 'locals', rows: [...tracer.rows], patchedRows: new Set(tracer.patchedRows), title: tracer.title, maxRows: this._maxLocalsRows, maxFrames: this._maxLocalsFrames });
            } else if (tracer.type === 'variables') {
                this.renderer.setData({ type: 'variables', vars: tracer.vars, title: tracer.title, patchState: tracer.patchState });
            } else if (tracer.type === 'graph') {
                const graphKey = Object.entries(this.tracers).find(([, v]) => v === tracer)?.[0];
                this.renderer.setData({ type: 'graph', adjMatrix: tracer.adjMatrix, nodes: tracer.nodes, visitedEdges: [...tracer.visitedEdges], title: tracer.title, directed: tracer.directed, weighted: tracer.weighted, nodeLabels: tracer.nodeLabels, layout: tracer.layout, treeRoot: tracer.treeRoot, edges: tracer.edges, namedNodes: tracer.namedNodes, treeDims: graphKey ? this.getTreeMaxDimensions(graphKey) : undefined });
            } else if (tracer.type === 'layout') {
                const children = tracer.children
                    .filter((childKey: string) => !this.hiddenChildren.has(childKey) && this.tracers[childKey]?.type !== 'code')
                    .map((childKey: string) => {
                        const c = this.tracers[childKey];
                        const _tracerKey = childKey;
                        if (c?.type === 'graph') {
                            return { ...c, _tracerKey, dsType: this.treeKeys.has(childKey) ? 'Tree' : 'Graph', visitedEdges: [...c.visitedEdges], directed: c.directed, weighted: c.weighted, nodeLabels: c.nodeLabels, layout: c.layout, treeRoot: c.treeRoot, edges: c.edges, namedNodes: c.namedNodes, treeDims: this.getTreeMaxDimensions(childKey) };
                        }
                        if (c?.type === 'chart') {
                            return { ...c, _tracerKey };
                        }
                        if (c?.type === 'array') {
                            return { ...c, _tracerKey, dsType: c.dsType };
                        }
                        if (c?.type === 'log') {
                            return { ...c, _tracerKey, logs: [...c.logs] };
                        }
                        if (c?.type === 'variables') {
                            return { ...c, _tracerKey, patchState: c.patchState ? { ...c.patchState } : undefined };
                        }
                        if (c?.type === 'locals') {
                            return { ...c, _tracerKey, rows: [...c.rows], patchedRows: new Set(c.patchedRows), maxRows: this._maxLocalsRows, maxFrames: this._maxLocalsFrames };
                        }
                        return { ...c, _tracerKey };
                    })
                    .filter((child: any) => child);
                this.renderer.setData({ type: 'layout', children });
            }
        }
    }

    next(): boolean {
        if (this.cursor >= this.chunks.length) return false;
        this.activeChildKey = null;

        // Swap detection for Array1DTracer and ChartTracer
        const cur = this.chunks[this.cursor];
        let arrayPatch: Command | null = null;
        for (const c of cur.commands) {
            if (c.key !== null && c.method === 'patch' && (this.tracers[c.key]?.type === 'array' || this.tracers[c.key]?.type === 'chart')) {
                arrayPatch = c;
                break;
            }
        }

        let swap: { key: string; i: number; j: number } | null = null;
        let consumeCount = 1;

        if (arrayPatch) {
            const k = arrayPatch.key!;
            const tracerType = this.tracers[k]?.type;
            // Only animate swaps for default arrays (not LinkedList, Stack, Deque, etc.) and charts
            const dsType = this.tracers[k]?.dsType;
            if (tracerType === 'chart' || !dsType || dsType === 'ArrayList' || dsType === 'Deque' || dsType === 'Collection') {
            const idxA = arrayPatch.args[0], valA = arrayPatch.args[1];
            let foundDepatch = false;
            const maxScan = Math.min(this.cursor + 6, this.chunks.length);
            for (let i = this.cursor; i < maxScan; i++) {
                for (const c of this.chunks[i].commands) {
                    if (c.key === k && c.method === 'depatch') foundDepatch = true;
                    else if (c.key === k && c.method === 'patch' && foundDepatch) {
                        const idxB = c.args[0], valB = c.args[1];
                        if (idxA !== idxB) {
                            const oldA = this.tracers[k].data[idxA]?.value;
                            const oldB = this.tracers[k].data[idxB]?.value;
                            if (valA === oldB && valB === oldA) {
                                swap = { key: k, i: idxA, j: idxB };
                                consumeCount = i - this.cursor + 1;
                            }
                        }
                        i = maxScan; break;
                    } else if (c.key === k && c.method === 'set') {
                        i = maxScan; break;
                    }
                }
            }
            }
        }

        // Apply chunks incrementally instead of replaying from scratch
        for (let i = 0; i < consumeCount; i++) {
            const chunk = this.chunks[this.cursor + i];
            if (chunk) chunk.commands.forEach(cmd => this.applyCommand(cmd));
        }
        this.cursor += consumeCount;
        this.updateRenderer();
        this.notify();

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
        this.batching = true;
        const applyingChunks = this.chunks.slice(0, this.cursor);
        applyingChunks.forEach(chunk => {
            chunk.commands.forEach(command => this.applyCommand(command));
        });
        this.batching = false;
        this.updateRenderer();
        this.notify();
    }

    getCursor() {
        return this.cursor;
    }

    getLength() {
        return this.chunks.length;
    }

    getCommands() {
        return this.rawCommands;
    }

    getLayoutChildren(): { key: string; title: string; dsType?: string }[] {
        if (!this.root) return [];
        const tracer = this.tracers[this.root];
        if (tracer?.type !== 'layout') return [];
        return tracer.children
            .map((k: string) => {
                const t = this.tracers[k];
                let dsType = t?.dsType;
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

    isChildHidden(key: string): boolean {
        return this.hiddenChildren.has(key);
    }

    isLayoutRoot(): boolean {
        if (!this.root) return false;
        return this.tracers[this.root]?.type === 'layout';
    }

    getLayoutData(): any[] {
        if (!this.root) return [];
        const tracer = this.tracers[this.root];
        if (tracer?.type !== 'layout') return [];
        return tracer.children
            .filter((childKey: string) => !this.hiddenChildren.has(childKey) && this.tracers[childKey]?.type !== 'code')
            .map((childKey: string) => {
                const c = this.tracers[childKey];
                if (!c) return null;
                const _tracerKey = childKey;
                if (c.type === 'graph') {
                    return { ...c, _tracerKey, dsType: this.treeKeys.has(childKey) ? 'Tree' : 'Graph', visitedEdges: [...c.visitedEdges], treeDims: this.getTreeMaxDimensions(childKey) };
                }
                if (c.type === 'chart') {
                    return { ...c, _tracerKey };
                }
                if (c.type === 'array') {
                    return { ...c, _tracerKey };
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
            })
            .filter((child: any) => child);
    }

    getRenderer(): SimpleRenderer {
        return this.renderer;
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
