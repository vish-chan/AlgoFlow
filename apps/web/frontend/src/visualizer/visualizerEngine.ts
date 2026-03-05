import { SimpleEngine } from './engine/SimpleEngine';

export const engine = new SimpleEngine();

let playing = false;
let playTimer: number | null = null;
let speed = 500;

export function loadCommands(commands: any[]) {
    pause();
    engine.loadCommands(commands);
}

export function play() {
    if (playing) return;
    playing = true;
    notifyPlayingChange();
    
    const step = () => {
        if (engine.next()) {
            playTimer = window.setTimeout(step, speed);
        } else {
            pause();
        }
    };
    step();
}

export function pause() {
    playing = false;
    notifyPlayingChange();
    if (playTimer !== null) {
        clearTimeout(playTimer);
        playTimer = null;
    }
}

const playingListeners = new Set<(playing: boolean) => void>();

function notifyPlayingChange() {
    playingListeners.forEach(listener => listener(playing));
}

export function subscribeToPlaying(listener: (playing: boolean) => void) {
    playingListeners.add(listener);
    listener(playing);
    return () => playingListeners.delete(listener);
}

export function isPlaying() {
    return playing;
}

export function stepForward() {
    pause();
    engine.next();
}

export function stepBackward() {
    pause();
    engine.prev();
}

export function reset() {
    pause();
    engine.setCursor(0);
}

export function setSpeed(newSpeed: number) {
    speed = newSpeed;
}

export function subscribe(listener: () => void) {
    return engine.subscribe(listener);
}

export function getEngine() {
    return engine;
}
