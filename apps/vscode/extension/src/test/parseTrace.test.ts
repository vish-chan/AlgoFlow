import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nullifyNonNumericLiterals, parseTrace } from '../exec/parseTrace';
import { findMonorepoRoot } from '../monorepo';
import { listFixtures } from '../dev/fixtures';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = findMonorepoRoot([here]);

describe('parseTrace', () => {
    it('locates the monorepo, so the golden traces below are actually exercised', () => {
        expect(repoRoot).toBeDefined();
    });

    const fixtures = repoRoot ? listFixtures(repoRoot) : [];

    it('finds every engine golden trace', () => {
        expect(fixtures.length).toBeGreaterThan(50);
    });

    for (const fixture of fixtures) {
        it(`parses ${fixture.label}`, () => {
            const commands = parseTrace(readFileSync(fixture.path, 'utf-8'));
            expect(commands.length).toBeGreaterThan(0);
            for (const command of commands) {
                expect(typeof command.method).toBe('string');
                expect(Array.isArray(command.args)).toBe(true);
            }
        });
    }

    // The goldens are hashcode-normalized and contain no non-numeric literals, so the
    // path that matters most for real Java traces needs handcrafted input.
    it('accepts bare NaN and Infinity, which strict JSON.parse rejects', () => {
        const commands = parseTrace(
            '[{"key":"v","method":"set","args":[NaN, Infinity, -Infinity]}]',
        );
        expect(commands[0].args).toEqual([null, null, null]);
    });

    it('does not corrupt the word Infinity inside a logged string', () => {
        const commands = parseTrace(
            '[{"key":"log","method":"println","args":["distance is Infinity",NaN]}]',
        );
        expect(commands[0].args[0]).toBe('distance is Infinity');
        expect(commands[0].args[1]).toBeNull();
    });

    it('does not corrupt an escaped quote before a literal', () => {
        const commands = parseTrace('[{"key":null,"method":"m","args":["a \\" NaN b",NaN]}]');
        expect(commands[0].args[0]).toBe('a " NaN b');
        expect(commands[0].args[1]).toBeNull();
    });

    it('rejects a trace that is not an array', () => {
        expect(() => parseTrace('{"commands":[]}')).toThrow(/array/i);
    });

    it('propagates a syntax error that sanitizing cannot fix', () => {
        expect(() => parseTrace('[{"key":')).toThrow(SyntaxError);
    });
});

describe('nullifyNonNumericLiterals', () => {
    it('leaves identifiers that merely start with a literal alone', () => {
        expect(nullifyNonNumericLiterals('[{"NaNCount":1}]')).toBe('[{"NaNCount":1}]');
        expect(nullifyNonNumericLiterals('[NaNCount]')).toBe('[NaNCount]');
    });

    it('replaces -Infinity as a whole, not Infinity leaving a stray minus', () => {
        expect(nullifyNonNumericLiterals('[-Infinity]')).toBe('[null]');
    });
});
