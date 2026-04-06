export interface Command {
    key: string | null;
    method: string;
    args: any[];
}

export interface Chunk {
    commands: Command[];
}

// --- Tracer types ---

interface CellData {
    value: any;
    selected: boolean;
    patched: boolean;
}

interface RecursionCall {
    method: string;
    params: any[];
    active: boolean;
    patched?: boolean;
}

export interface ChartTracer {
    type: 'chart';
    data: CellData[];
    title: string;
}

export interface ArrayTracer {
    type: 'array';
    data: CellData[];
    title: string;
    dsType?: string;
}

export interface Array2DTracer {
    type: 'array2d';
    data: CellData[][];
    title: string;
    dsType?: string;
}

export interface HashMapTracer {
    type: 'hashmap';
    data: CellData[][];
    title: string;
}

export interface LogTracer {
    type: 'log';
    logs: string[];
    title: string;
}

export interface CodeTracer {
    type: 'code';
    line: number | null;
    title: string;
}

export interface RecursionTracer {
    type: 'recursion';
    calls: RecursionCall[];
    title: string;
}

export interface LocalsTracer {
    type: 'locals';
    rows: [string, any][];
    patchedRows: Set<number>;
    title: string;
}

export interface VariablesTracer {
    type: 'variables';
    vars: Record<string, any>;
    title: string;
    patchState?: Record<string, { patched: boolean; col: number }>;
}

export interface GraphTracer {
    type: 'graph';
    adjMatrix: number[][];
    nodes: { state: string; index: number }[];
    visitedEdges: Set<string>;
    layout: 'circle' | 'tree';
    title: string;
    directed?: boolean;
    weighted?: boolean;
    namedNodes: Map<string, number>;
    nodeLabels: string[];
    edges: [number, number][];
    treeRoot: string | null;
    removedEdgePositions?: Map<string, number>;
}

export interface LayoutTracer {
    type: 'layout';
    children: string[];
    title: string;
}

export type Tracer =
    | ChartTracer
    | ArrayTracer
    | Array2DTracer
    | HashMapTracer
    | LogTracer
    | CodeTracer
    | RecursionTracer
    | LocalsTracer
    | VariablesTracer
    | GraphTracer
    | LayoutTracer;
