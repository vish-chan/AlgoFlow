import { describe, it, expect } from 'vitest';
import { SimpleEngine } from '../SimpleEngine';
import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..', '..', '..', '..', '..', '..');
const SNAPSHOTS_DIR = join(REPO_ROOT, 'packages/java/engine/src/test/snapshot/snapshots');

function captureStepState(engine: SimpleEngine) {
    return {
        cursor: engine.getCursor(),
        line: engine.getHighlightedLine(),
        isLayout: engine.isLayoutRoot(),
        layoutData: engine.isLayoutRoot()
            ? engine.getLayoutData().map(serializeChild)
            : null,
    };
}

function serializeChild(child: any): any {
    if (!child) return null;
    const base: any = { type: child.type, title: child.title };
    if (child.dsType) base.dsType = child.dsType;
    if (child._tracerKey) base._tracerKey = child._tracerKey;

    switch (child.type) {
        case 'array':
        case 'chart':
            base.data = child.data?.map((d: any) => ({
                value: d.value,
                selected: d.selected,
                patched: d.patched,
            }));
            break;
        case 'array2d':
        case 'hashmap':
            base.data = child.data?.map((row: any[]) =>
                row.map((d: any) => ({
                    value: d.value,
                    selected: d.selected,
                    patched: d.patched,
                }))
            );
            break;
        case 'log':
            base.logs = [...(child.logs || [])];
            break;
        case 'recursion':
            base.calls = child.calls?.map((c: any) => ({
                method: c.method,
                active: c.active,
                patched: !!c.patched,
            }));
            break;
        case 'locals':
            base.rows = child.rows?.map((r: any) => [...r]);
            base.patchedRows = [...(child.patchedRows || [])].sort();
            break;
        case 'variables':
            base.vars = { ...child.vars };
            if (child.patchState) base.patchState = { ...child.patchState };
            break;
        case 'graph':
            base.nodeCount = child.nodes?.length || 0;
            base.nodeStates = child.nodes?.map((n: any) => n.state);
            base.visitedEdges = [...(child.visitedEdges || [])].sort();
            base.layout = child.layout;
            base.directed = !!child.directed;
            base.weighted = !!child.weighted;
            break;
    }
    return base;
}

function runEngine(commands: any[]): any[] {
    const engine = new SimpleEngine();
    engine.loadCommands(commands);
    const steps: any[] = [];
    while (engine.next()) {
        steps.push(captureStepState(engine));
    }
    return steps;
}

const snapshotFiles = readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();

describe('SimpleEngine snapshot tests', () => {
    for (const file of snapshotFiles) {
        const name = file.replace('.json', '');
        it(`processes ${name} consistently`, () => {
            const commands = JSON.parse(readFileSync(join(SNAPSHOTS_DIR, file), 'utf-8'));
            const steps = runEngine(commands);

            expect(steps.length).toBeGreaterThan(0);
            expect(steps).toMatchSnapshot();
        });
    }
});
