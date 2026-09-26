import { describe, expect, it } from 'vitest';
import {
    countPackageDeclarations,
    extractClassName,
    normalizeToRunnerPackage,
    RUNNER_PACKAGE,
} from '../exec/javaNormalize';

const countLines = (text: string) => text.split(/\r\n|\n|\r/).length;
// Deliberately the production scanner: a textual regex would count `// package foo;`
// and `"package x;"`, which are exactly the cases this must not count.
const countPackages = countPackageDeclarations;

const CASES: { name: string; source: string }[] = [
    {
        name: 'no package declaration',
        source: 'public class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'package on line 1',
        source: 'package com.example;\n\npublic class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'package below a license header (the backend produces two declarations here)',
        source: '/*\n * Copyright 2026\n */\npackage com.example;\n\npublic class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'package after blank lines',
        source: '\n\npackage com.example;\npublic class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'package split across lines',
        source: 'package\n    com.example\n    .deep;\npublic class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'package sharing a line with an import',
        source: 'package com.example; import java.util.List;\npublic class Main {\n    public static void main(String[] a) { List.of(); }\n}\n',
    },
    {
        name: 'package inside a line comment',
        source: '// package foo;\npublic class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'package inside a string literal',
        source: 'public class Main {\n    static String s = "package x;";\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'CRLF line endings',
        source: 'package com.example;\r\n\r\npublic class Main {\r\n    public static void main(String[] a) {}\r\n}\r\n',
    },
    {
        name: 'leading BOM',
        source: '﻿package com.example;\npublic class Main {\n    public static void main(String[] a) {}\n}\n',
    },
    {
        name: 'single line file',
        source: 'public class Main { public static void main(String[] a) {} }',
    },
];

describe('normalizeToRunnerPackage', () => {
    for (const { name, source } of CASES) {
        describe(name, () => {
            const result = normalizeToRunnerPackage(source);

            it('uses the line-preserving strategy', () => {
                expect(result.warning).toBeUndefined();
            });

            it('preserves the line count', () => {
                expect(countLines(result.code)).toBe(countLines(source));
            });

            it('emits exactly one package declaration', () => {
                expect(countPackages(result.code)).toBe(1);
                expect(result.code).toContain(`package ${RUNNER_PACKAGE};`);
            });

            it('maps line numbers as the identity', () => {
                for (let line = 1; line <= countLines(source); line++) {
                    expect(result.lineMap.toUser(line)).toBe(line);
                    expect(result.lineMap.toNormalized(line)).toBe(line);
                }
            });

            it('keeps the public class visible', () => {
                expect(extractClassName(result.code)).toBe('Main');
            });
        });
    }

    it('keeps code that shared the package line', () => {
        const { code } = normalizeToRunnerPackage(
            'package com.example; import java.util.List;\npublic class Main {}\n',
        );
        expect(code).toContain('import java.util.List;');
    });

    it('does not treat a commented-out package as the declaration to blank', () => {
        const { code } = normalizeToRunnerPackage(
            '// package foo;\npublic class Main {}\n',
        );
        expect(code).toContain('// package foo;');
    });

    it('leaves a package-like string literal alone', () => {
        const { code } = normalizeToRunnerPackage(
            'public class Main {\n    static String s = "package x;";\n}\n',
        );
        expect(code).toContain('"package x;"');
    });

    it('preserves columns on lines after line 1', () => {
        const source = 'package com.example;\n    int indented = 1;\n';
        const { code } = normalizeToRunnerPackage(source);
        expect(code.split('\n')[1]).toBe('    int indented = 1;');
    });

    it('offsets only line 1 columns, by the length of the prefix', () => {
        const { lineMap, code } = normalizeToRunnerPackage('public class Main {}\n');
        expect(lineMap.col1Delta).toBe(`package ${RUNNER_PACKAGE}; `.length);
        expect(code.slice(lineMap.col1Delta)).toMatch(/^public class Main/);
    });

    it('rejects an empty file', () => {
        expect(() => normalizeToRunnerPackage('   \n\n')).toThrow(/empty/i);
    });
});

describe('extractClassName', () => {
    it('finds the public class', () => {
        expect(extractClassName('final class Helper {}\npublic class Solution {}')).toBe('Solution');
    });

    it('explains what is missing rather than throwing a regex error', () => {
        expect(() => extractClassName('class Main {}')).toThrow(/public class/);
    });
});
