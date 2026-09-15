export const RUNNER_PACKAGE = 'com.algoflow.runner';

const PACKAGE_PREFIX = `package ${RUNNER_PACKAGE}; `;

/**
 * Maps between line numbers in the user's document and the file we actually compile.
 *
 * An interface rather than a constant identity function because the fallback path below
 * shifts lines, and because a future debug adapter needs the same mapping.
 */
export interface LineMap {
    /** Normalized (compiled) 1-based line -> user document 1-based line. */
    toUser(line: number): number;
    /** User document 1-based line -> normalized 1-based line. */
    toNormalized(line: number): number;
    /** Columns added to line 1, for mapping `javac` diagnostics back. */
    col1Delta: number;
}

export type NormalizeResult = {
    /** Source to write to the scratch file. */
    code: string;
    lineMap: LineMap;
    /** Set when the line-preserving strategy could not be used. */
    warning?: string;
};

const IDENTITY: LineMap = {
    toUser: line => line,
    toNormalized: line => line,
    col1Delta: PACKAGE_PREFIX.length,
};

/**
 * Rewrite user Java into package `com.algoflow.runner` without moving any line.
 *
 * The instrumentation agent only touches classes under that package
 * (`VisualizerAgent` gates on `nameStartsWith`), so the rewrite is mandatory — but the
 * trace's line numbers come from `StackWalker` on the compiled class, and the extension
 * highlights lines in the user's untouched document. Shifting lines would need an
 * offset table that is one refactor away from being wrong.
 *
 * So instead of moving anything:
 *   1. blank the existing `package ...;` span with spaces of the same length, keeping
 *      the newlines inside it (preserves line count *and* columns, and keeps any code
 *      that shared the line, e.g. `package a.b; import c;`);
 *   2. prefix line 1 with the new declaration and no newline. Line 1 can never be a
 *      comment or string continuation, and a package declaration may legally precede
 *      anything else on the same line.
 *
 * The scan is a small state machine, not a regex: the backend's
 * `replaceFirst("^\\s*package...")` only matches when `package` is the very first
 * token, so a file with a license header above its package declaration ends up with
 * *two* package declarations and a compile error.
 */
export function normalizeToRunnerPackage(source: string): NormalizeResult {
    if (source.trim() === '') {
        throw new Error('Nothing to visualize: the file is empty.');
    }

    const hasBom = source.charCodeAt(0) === 0xfeff;
    const body = hasBom ? source.slice(1) : source;

    const span = findPackageSpan(body);
    const blanked =
        span === undefined
            ? body
            : body.slice(0, span.start) + blankPreservingNewlines(body.slice(span.start, span.end)) + body.slice(span.end);

    const code = (hasBom ? '﻿' : '') + PACKAGE_PREFIX + blanked;

    // Cheap invariants over the two properties everything downstream assumes.
    const linesPreserved = countLines(code) === countLines(source);
    const declarations = countPackageDeclarations(code);
    if (linesPreserved && declarations === 1) {
        return { code, lineMap: IDENTITY };
    }

    // Should be unreachable; fall back to the obvious rewrite plus a real offset rather
    // than compiling something we cannot map.
    const stripped = body.replace(/^\s*package\s+[^;]+;\s*/, '');
    const offset = 2; // 'package …;' + blank line
    return {
        code: `package ${RUNNER_PACKAGE};\n\n${stripped.trim()}\n`,
        lineMap: {
            toUser: line => Math.max(1, line - offset),
            toNormalized: line => line + offset,
            col1Delta: 0,
        },
        warning: linesPreserved
            ? `Expected exactly one package declaration after normalization, found ${declarations}.`
            : 'Line-preserving normalization changed the line count.',
    };
}

/** The class the JVM should run, i.e. the file's `public class`. */
export function extractClassName(source: string): string {
    const match = /public\s+class\s+(\w+)/.exec(source);
    if (!match) {
        throw new Error('Add a `public class` with a `main` method to visualize this file.');
    }
    return match[1];
}

type Span = { start: number; end: number };

/**
 * Locate the first real `package <name>;`, ignoring occurrences inside comments and
 * string literals. The declaration may legally span lines.
 */
function findPackageSpan(source: string): Span | undefined {
    let i = 0;
    while (i < source.length) {
        const ch = source[i];

        if (ch === '/' && source[i + 1] === '/') {
            i = skipUntil(source, i + 2, '\n');
            continue;
        }
        if (ch === '/' && source[i + 1] === '*') {
            const end = source.indexOf('*/', i + 2);
            i = end === -1 ? source.length : end + 2;
            continue;
        }
        if (ch === '"' || ch === "'") {
            i = skipQuoted(source, i);
            continue;
        }

        if (source.startsWith('package', i) && isWordBoundary(source, i, 'package'.length)) {
            const semicolon = source.indexOf(';', i);
            if (semicolon === -1) return undefined;
            return { start: i, end: semicolon + 1 };
        }

        i += 1;
    }
    return undefined;
}

function skipUntil(source: string, from: number, stop: string): number {
    const index = source.indexOf(stop, from);
    return index === -1 ? source.length : index;
}

/** Advance past a quoted literal, honouring backslash escapes. */
function skipQuoted(source: string, start: number): number {
    const quote = source[start];
    let i = start + 1;
    while (i < source.length) {
        if (source[i] === '\\') {
            i += 2;
            continue;
        }
        if (source[i] === quote) return i + 1;
        i += 1;
    }
    return source.length;
}

function isWordBoundary(source: string, start: number, length: number): boolean {
    const before = start === 0 ? undefined : source[start - 1];
    const after = source[start + length];
    const isWordChar = (c: string | undefined) => c !== undefined && /[A-Za-z0-9_$]/.test(c);
    return !isWordChar(before) && !isWordChar(after);
}

/** Replace every character with a space, except line terminators. */
function blankPreservingNewlines(text: string): string {
    return text.replace(/[^\r\n]/g, ' ');
}

function countLines(text: string): number {
    return text.split(/\r\n|\n|\r/).length;
}

/** Count real `package …;` declarations, ignoring comments and string literals. */
export function countPackageDeclarations(text: string): number {
    let count = 0;
    let rest = text;
    for (;;) {
        const span = findPackageSpan(rest);
        if (!span) return count;
        count += 1;
        rest = rest.slice(span.end);
    }
}
