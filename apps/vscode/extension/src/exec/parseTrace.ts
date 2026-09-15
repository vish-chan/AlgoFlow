import type { TraceCommand } from '../protocol';

/**
 * Parse an engine trace.
 *
 * The Java agent serializes identity hash codes through a float path, so a trace can
 * contain bare `NaN` / `Infinity` / `-Infinity` — valid for Jackson with
 * `ALLOW_NON_NUMERIC_NUMBERS` (which the backend enables) but not for `JSON.parse`.
 * Rather than pay the scan on every trace, we only sanitize after a `SyntaxError`.
 */
export function parseTrace(text: string): TraceCommand[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        parsed = JSON.parse(nullifyNonNumericLiterals(text));
    }

    if (!Array.isArray(parsed)) {
        throw new Error('Trace is not a JSON array of commands.');
    }
    return parsed as TraceCommand[];
}

/**
 * Replace bare `NaN`/`Infinity`/`-Infinity` tokens with `null`, skipping over string
 * literals. A plain global regex would corrupt a logged message that happens to
 * contain the word "Infinity", which is exactly the kind of thing a user prints.
 */
export function nullifyNonNumericLiterals(text: string): string {
    let out = '';
    let i = 0;
    let inString = false;

    while (i < text.length) {
        const ch = text[i];

        if (inString) {
            out += ch;
            if (ch === '\\') {
                // Copy the escaped character verbatim so `\"` does not end the string.
                if (i + 1 < text.length) out += text[i + 1];
                i += 2;
                continue;
            }
            if (ch === '"') inString = false;
            i += 1;
            continue;
        }

        if (ch === '"') {
            inString = true;
            out += ch;
            i += 1;
            continue;
        }

        const matched = matchLiteralAt(text, i);
        if (matched) {
            out += 'null';
            i += matched;
            continue;
        }

        out += ch;
        i += 1;
    }

    return out;
}

const LITERALS = ['-Infinity', 'Infinity', 'NaN'] as const;

/** Length of the non-numeric literal starting at `i`, or 0. */
function matchLiteralAt(text: string, i: number): number {
    for (const literal of LITERALS) {
        if (!text.startsWith(literal, i)) continue;
        // Must not be part of a longer word, e.g. a key like "NaNCount".
        const next = text[i + literal.length];
        if (next !== undefined && /[A-Za-z0-9_$]/.test(next)) continue;
        return literal.length;
    }
    return 0;
}
