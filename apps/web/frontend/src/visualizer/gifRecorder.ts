import html2canvas from 'html2canvas';
import { encode } from 'modern-gif';

export type RecordingState = 'idle' | 'recording' | 'encoding';

const listeners = new Set<(state: RecordingState) => void>();
let state: RecordingState = 'idle';

function setState(s: RecordingState) {
    state = s;
    listeners.forEach(l => l(s));
}

export function getState(): RecordingState { return state; }

export function onStateChange(listener: (state: RecordingState) => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

export async function recordGif(
    getContainer: () => HTMLElement | null,
    stepFn: () => boolean,
    delay: number,
) {
    const container = getContainer();
    if (!container || state !== 'idle') return;

    setState('recording');

    const frames: { data: ImageData; delay: number }[] = [];

    const capture = async () => {
        const canvas = await html2canvas(container, {
            backgroundColor: '#1a1a2e',
            scale: 1,
            logging: false,
            useCORS: true,
        });
        const ctx = canvas.getContext('2d');
        if (ctx) {
            frames.push({
                data: ctx.getImageData(0, 0, canvas.width, canvas.height),
                delay,
            });
        }
        return canvas;
    };

    // Capture initial frame
    await capture();

    // Step through and capture each frame
    while (state === 'recording' && stepFn()) {
        await new Promise(r => setTimeout(r, 50)); // small pause for render
        await capture();
    }

    if (frames.length === 0) {
        setState('idle');
        return;
    }

    setState('encoding');

    // Yield to let React render the encoding state
    await new Promise(r => setTimeout(r, 50));

    try {
        const { width, height } = frames[0].data;
        const output = await encode({
            width,
            height,
            frames: frames.map(f => ({
                data: f.data.data,
                delay: f.delay,
            })),
        });

        const blob = new Blob([output], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `algoflow-${Date.now()}.gif`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error('GIF encoding failed:', e);
    }

    setState('idle');
}

export function cancelRecording() {
    if (state === 'recording') setState('idle');
}
