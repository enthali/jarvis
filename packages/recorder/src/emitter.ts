// Implementation: SPEC_REC_ENGINE, SPEC_REC_CAPTURE — minimal event type shared by the recorder parts
// Kept free of vscode so the recorder logic runs in plain unit tests.

export interface Disposable { dispose(): void }
export type Event<T> = (listener: (e: T) => void) => Disposable;

export class Emitter<T> {
    private listeners: ((e: T) => void)[] = [];

    readonly event: Event<T> = listener => {
        this.listeners.push(listener);
        return { dispose: () => { this.listeners = this.listeners.filter(l => l !== listener); } };
    };

    fire(e: T): void {
        for (const l of [...this.listeners]) {
            try { l(e); } catch { /* a listener must not break the others */ }
        }
    }

    dispose(): void { this.listeners = []; }
}
