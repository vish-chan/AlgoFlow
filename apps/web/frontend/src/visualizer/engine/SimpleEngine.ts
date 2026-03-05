import { SimpleRenderer } from './SimpleRenderer';

export class SimpleEngine {
    private chunks: Chunk[] = [];
    private cursor = 0;
    private tracers: Record<string, any> = {};
    private root: string | null = null;
    private renderer: SimpleRenderer;
    private listeners: Set<() => void> = new Set();

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
        this.renderer.setData(null);
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
            if (title.toLowerCase().includes('recursion')) {
                this.tracers[key] = { type: 'recursion', calls: [], title: args[0] };
            } else if (title.toLowerCase().includes('variable') || title.toLowerCase().includes('local')) {
                this.tracers[key] = { type: 'variables', vars: {}, title: args[0] };
            } else {
                this.tracers[key] = { type: 'array2d', data: [], title: args[0] };
            }
        } else if (key !== null && method === 'LogTracer') {
            this.tracers[key] = { type: 'log', logs: [], title: args[0] || 'Log' };
        } else if (key !== null && method === 'VerticalLayout') {
            this.tracers[key] = { type: 'layout', children: args[0] || [], title: 'Layout' };
        } else if (key !== null && method === 'set') {
            if (this.tracers[key]?.type === 'array') {
                this.tracers[key].data = args[0].map((v: any) => ({ value: v, selected: false, patched: false }));
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'array2d') {
                const rawData = args[0];
                console.log('Array2D set - rawData:', rawData);
                console.log('Array2D set - rawData type:', typeof rawData, 'isArray:', Array.isArray(rawData));
                console.log('Array2D set - rawData[0]:', rawData[0]);
                
                // Unwrap triple-nested arrays: [[[...]]] -> [[...]]
                const unwrapped = (rawData.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) 
                    ? rawData[0] 
                    : rawData;
                console.log('Array2D set - unwrapped:', unwrapped);
                
                this.tracers[key].data = unwrapped.map((row: any[]) => {
                    console.log('Array2D set - processing row:', row);
                    return row.map((v: any) => {
                        console.log('Array2D set - processing value:', v, 'type:', typeof v);
                        return { value: v, selected: false, patched: false };
                    });
                });
                console.log('Array2D set - final data:', this.tracers[key].data);
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'log') {
                this.tracers[key].logs = [args[0]];
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'recursion') {
                // Convert Array2D format to recursion calls
                const rawData = args[0];
                console.log('Recursion set - rawData:', rawData);
                
                // Handle triple-nested format: [[["method1", "method2"]]]
                let flatData = rawData;
                if (Array.isArray(rawData) && rawData.length === 1 && Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) {
                    flatData = rawData[0];
                }
                
                if (Array.isArray(flatData) && flatData.length > 0) {
                    this.tracers[key].calls = flatData.map((call: string) => ({ method: call, params: [], active: false }));
                    this.tracers[key].calls[0].active = true;
                } else {
                    this.tracers[key].calls = [];
                }
                this.updateRenderer();
            } else if (this.tracers[key]?.type === 'variables') {
                // Convert Array2D format to variables
                const rawData = args[0];
                console.log('Variables set - rawData:', rawData);
                
                // Handle triple-nested format: [[["name", value]]]
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
            if (this.tracers[key]?.type === 'log') {
                this.tracers[key].logs.push(args[0]);
                this.updateRenderer();
            }
        } else if (key !== null && method === 'println') {
            if (this.tracers[key]?.type === 'log') {
                this.tracers[key].logs.push(args[0] + '\n');
                this.updateRenderer();
            }
        } else if (key !== null && method === 'push') {
            if (this.tracers[key]?.type === 'recursion') {
                this.tracers[key].calls.push({ method: args[0], params: args[1] || [], active: true });
                this.updateRenderer();
            }
        } else if (key !== null && method === 'pop') {
            if (this.tracers[key]?.type === 'recursion' && this.tracers[key].calls.length > 0) {
                this.tracers[key].calls[this.tracers[key].calls.length - 1].active = false;
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
            console.log('Patch command:', { key, method, args, tracerType: this.tracers[key]?.type });
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
                // Variables are treated as 2D array: patch(row, col) where row=variable index, col=0(name)/1(value)
                if (args.length >= 2) {
                    const varNames = Object.keys(this.tracers[key].vars);
                    const rowIndex = Math.floor(args[0]);
                    const colIndex = Math.floor(args[1]);
                    const varName = varNames[rowIndex];
                    
                    if (varName && this.tracers[key].vars.hasOwnProperty(varName)) {
                        // Store patch state for rendering
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
                this.renderer.setData({ type: 'recursion', calls: tracer.calls, title: tracer.title });
            } else if (tracer.type === 'variables') {
                this.renderer.setData({ type: 'variables', vars: tracer.vars, title: tracer.title, patchState: tracer.patchState });
            } else if (tracer.type === 'layout') {
                const children = tracer.children
                    .map((childKey: string) => this.tracers[childKey])
                    .filter((child: any) => child);
                this.renderer.setData({ type: 'layout', children });
            }
        }
    }

    next(): boolean {
        if (this.cursor >= this.chunks.length) return false;
        this.cursor++;
        this.updateToCurrentCursor();
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
