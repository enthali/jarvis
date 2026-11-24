// settle-draft-specifications CR: Flow webview behaviour, written from the specification.
// SPEC_FLOW_CHORDRENDER AC-5 / REQ_FLOW_CHORDVIEW AC-4 (node tooltip carries a message sample),
// SPEC_FLOW_TIMELENS AC-6 / AC-7 / REQ_FLOW_TIMELENS AC-2 (lens never inverts; keyboard commits).
// chord.ts is a browser script with no exports, so it runs here against a fake DOM and a recording d3.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { recorded } = vi.hoisted(() => ({ recorded: { on: [] as { ev: string; fn: (...a: any[]) => void }[] } }));
vi.mock('d3', () => {
    const p: any = new Proxy(function () { /* callable */ }, {
        get: (_t, prop) => {
            if (prop === 'then') { return undefined; }
            if (prop === 'on') { return (ev: string, fn: (...a: any[]) => void) => { recorded.on.push({ ev, fn }); return p; }; }
            return p;
        },
        apply: () => p,
    });
    return new Proxy({}, { get: (_t, prop) => (prop === 'then' ? undefined : prop === 'schemeCategory10' ? ['#111', '#222'] : p), has: () => true });
});

type Listener = (...a: any[]) => void;
function fakeEl() {
    const listeners: Record<string, Listener[]> = {};
    return {
        style: {} as Record<string, string>, textContent: '', innerHTML: '', value: '1', max: '', clientWidth: 600, clientHeight: 500,
        listeners,
        addEventListener(t: string, f: Listener) { (listeners[t] ??= []).push(f); },
        getBoundingClientRect: () => ({ left: 0, width: 100, top: 0 }),
        fire(t: string) { (listeners[t] ?? []).forEach(f => f()); },
    };
}

let els: Record<string, ReturnType<typeof fakeEl>>;
let windowListeners: Record<string, Listener>;

const entry = (i: number, text = `m${i}`) => ({
    timestamp: `2026-01-01T00:00:0${i}.000Z`, sender: i % 2 ? 'A' : 'B', destination: i % 2 ? 'B' : 'A', text,
});

async function load(entries: ReturnType<typeof entry>[]): Promise<void> {
    vi.resetModules();
    recorded.on.length = 0;
    els = {};
    for (const id of ['flow-empty', 'flow-controls', 'flow-svg', 'flow-tooltip', 'drag-tooltip', 'lens-range', 'lens-start', 'lens-end', 'load-more-btn', 'flow-root']) {
        els[id] = fakeEl();
    }
    windowListeners = {};
    vi.stubGlobal('document', { getElementById: (id: string) => els[id], documentElement: {} });
    vi.stubGlobal('window', { addEventListener: (t: string, f: Listener) => { windowListeners[t] = f; } });
    vi.stubGlobal('getComputedStyle', () => ({ getPropertyValue: () => '' }));
    vi.stubGlobal('acquireVsCodeApi', () => ({ postMessage: () => {} }));
    await import('../../packages/flow/webview/chord');
    windowListeners.message({ data: { type: 'data', payload: { nodes: [], edges: [], entries } } });
}

beforeEach(() => { recorded.on.length = 0; });
afterEach(() => { vi.unstubAllGlobals(); });

describe('SPEC_FLOW_CHORDRENDER AC-5: node tooltip shows a message sample', () => {
    const long = 'x'.repeat(200);
    const mousemoves = () => recorded.on.filter(o => o.ev === 'mousemove').map(o => o.fn);

    it('the actor-node tooltip shows the newest touching message text, shortened to 80 characters', async () => {
        await load([entry(1, 'old'), entry(2, long)]);
        const [, node] = mousemoves();
        node({ pageX: 1, pageY: 2 }, { index: 0 });
        expect(els['flow-tooltip'].style.display).toBe('block');
        expect(els['flow-tooltip'].innerHTML).toContain('x'.repeat(80) + '\u2026');
        expect(els['flow-tooltip'].innerHTML).not.toContain('x'.repeat(81));
        expect(els['flow-tooltip'].innerHTML).not.toContain('old');
    });

    it('the ribbon tooltip keeps its sample after re-aggregation, shortened to 80 characters', async () => {
        await load([entry(1, long)]);
        const [ribbon] = mousemoves();
        ribbon({ pageX: 1, pageY: 2 }, { source: { index: 0 }, target: { index: 1 } });
        expect(els['flow-tooltip'].innerHTML).toContain('x'.repeat(80) + '\u2026');
        expect(els['flow-tooltip'].innerHTML).not.toContain('x'.repeat(81));
    });

    it('message text is escaped in the node tooltip', async () => {
        await load([entry(1, '<b>hi</b>')]);
        const [, node] = mousemoves();
        node({ pageX: 0, pageY: 0 }, { index: 0 });
        expect(els['flow-tooltip'].innerHTML).toContain('&lt;b&gt;hi&lt;/b&gt;');
        expect(els['flow-tooltip'].innerHTML).not.toContain('<b>hi');
    });
});

describe('SPEC_FLOW_TIMELENS AC-6 / AC-7: lens handles', () => {
    const five = () => [1, 2, 3, 4, 5].map(i => entry(i));

    it('dragging the start handle past the end handle moves the end handle along (window never inverts)', async () => {
        await load(five());
        els['lens-end'].value = '2';
        els['lens-start'].value = '4';
        els['lens-start'].fire('input');
        expect(els['lens-end'].value).toBe('4');
    });

    it('dragging the end handle below the start handle moves the start handle along', async () => {
        await load(five());
        els['lens-start'].value = '3';
        els['lens-end'].value = '1';
        els['lens-end'].fire('input');
        expect(els['lens-start'].value).toBe('1');
    });

    it('a keyboard move (change event, no mouse release) commits the lens', async () => {
        await load(five());
        els['lens-end'].value = '3';
        els['lens-end'].fire('change');
        expect(els['lens-range'].textContent).toBe('start: 1 (live), end: 3');
    });

    it('the clamped window after a start-handle move is committed, not inverted', async () => {
        await load(five());
        els['lens-end'].value = '2';
        els['lens-start'].value = '4';
        els['lens-start'].fire('input');
        els['lens-start'].fire('change');
        expect(els['lens-range'].textContent).toBe('start: 4 (anchored), end: 4');
    });
});
