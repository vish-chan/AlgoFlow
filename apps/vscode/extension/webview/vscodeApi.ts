import type { HostToWebview, WebviewToHost, WebviewPersistedState } from '../src/protocol';

type VsCodeApi = {
    postMessage(message: WebviewToHost): void;
    getState(): WebviewPersistedState | undefined;
    setState(state: WebviewPersistedState): void;
};

declare function acquireVsCodeApi(): VsCodeApi;

// Callable exactly once per webview, so it is hoisted to module scope and shared.
export const vscodeApi: VsCodeApi = acquireVsCodeApi();

export function post(message: WebviewToHost): void {
    vscodeApi.postMessage(message);
}

/** Subscribe to host messages. Returns an unsubscribe function. */
export function onHostMessage(handler: (message: HostToWebview) => void): () => void {
    const listener = (event: MessageEvent<HostToWebview>) => handler(event.data);
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
}
