export interface Lesson {
    code: string;
    annotations: Record<number, string>; // step -> note text
}

const PKG_RE = /^package\s+[\w.]+;\s*\n?/;

function toUrlSafeBase64(s: string): string {
    return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromUrlSafeBase64(s: string): string {
    let b = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b.length % 4) b += '=';
    return b;
}

export async function encodeLesson(lesson: Lesson): Promise<string> {
    const stripped = { ...lesson, code: lesson.code.replace(PKG_RE, '') };
    const json = JSON.stringify(stripped);
    try {
        const bytes = new TextEncoder().encode(json);
        const cs = new CompressionStream('deflate');
        const writer = cs.writable.getWriter();
        writer.write(bytes);
        writer.close();
        const compressed = await new Response(cs.readable).arrayBuffer();
        return 'z.' + toUrlSafeBase64(btoa(String.fromCharCode(...new Uint8Array(compressed))));
    } catch {
        return toUrlSafeBase64(btoa(encodeURIComponent(json)));
    }
}

export async function decodeLesson(encoded: string): Promise<Lesson | null> {
    try {
        if (encoded.startsWith('z.')) {
            const binary = atob(fromUrlSafeBase64(encoded.slice(2)));
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            const ds = new DecompressionStream('deflate');
            const writer = ds.writable.getWriter();
            writer.write(bytes);
            writer.close();
            const json = await new Response(ds.readable).text();
            return JSON.parse(json);
        }
        // Legacy uncompressed format
        return JSON.parse(decodeURIComponent(atob(fromUrlSafeBase64(encoded))));
    } catch {
        return null;
    }
}

export async function parseLessonFromURL(): Promise<Lesson | null> {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return null;
    const params = new URLSearchParams(hash.slice(qIdx));
    const data = params.get('lesson');
    return data ? decodeLesson(data) : null;
}

export async function buildLessonURL(lesson: Lesson): Promise<string> {
    const base = `${window.location.origin}${window.location.pathname}`;
    const encoded = await encodeLesson(lesson);
    return `${base}#playground?lesson=${encoded}`;
}
