// Implementation: SPEC_COM_AHPDISCOVERY (connect with the connection token of the registry entry)
// No `vscode` import: this folder must stay movable into a process of its own.
//
// Hand-rolled JSON-RPC client on `ws`: the official SDK is ESM-only and the core compiles to CommonJS.
// The Agent Host listens on a named pipe (Windows) or Unix socket, so the HTTP upgrade of `ws` is routed
// through an agent that hands back that socket (FI-2026-09-13).

import * as http from 'http';
import * as net from 'net';
import { WebSocket } from 'ws';
import type { AgentHostEntry } from './registry';

export interface ConnectOptions {
    connectTimeoutMs?: number;
    requestTimeoutMs?: number;
    /** Called for each notification (a message with a method and no id). */
    onNotification?: (method: string, params: unknown) => void;
}

interface Pending {
    method: string;
    resolve: (value: unknown) => void;
    reject: (err: Error) => void;
    timer: NodeJS.Timeout;
}

export class AhpRpcError extends Error {
    constructor(readonly method: string, readonly code: number, message: string, readonly data?: unknown) {
        super(`${method}: ${message} (${code})`);
    }
}

export class AhpConnection {
    private nextId = 1;
    private clientSeq = 0;
    private readonly pending = new Map<number, Pending>();
    private closed = false;
    private readonly closeListeners: ((reason: string) => void)[] = [];

    private constructor(
        private readonly ws: WebSocket,
        private readonly requestTimeoutMs: number,
        private readonly onNotification?: (method: string, params: unknown) => void,
    ) {
        ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => this.onMessage(Buffer.isBuffer(data) ? data.toString('utf8') : Buffer.from(data as ArrayBuffer).toString('utf8')));
        ws.on('close', (code: number, reason: Buffer) => this.finish(`closed by host (code ${code}${reason.length ? `, ${reason.toString('utf8')}` : ''})`));
        ws.on('error', (err: Error) => this.finish(`transport error: ${err.message}`));
    }

    static connect(entry: AgentHostEntry, options: ConnectOptions = {}): Promise<AhpConnection> {
        const connectTimeoutMs = options.connectTimeoutMs ?? 15_000;
        const requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
        return new Promise((resolve, reject) => {
            const agent = new http.Agent();
            (agent as unknown as { createConnection: unknown }).createConnection =
                (_opts: unknown, cb: (err: Error | null, sock: net.Socket) => void) => {
                    const sock = net.createConnection(entry.endpoint.path);
                    sock.on('connect', () => cb(null, sock));
                    sock.on('error', err => cb(err, sock));
                    return sock;
                };
            const ws = new WebSocket(`ws://localhost/?tkn=${encodeURIComponent(entry.connectionToken)}`, {
                agent,
                handshakeTimeout: connectTimeoutMs,
            });
            const fail = (err: Error): void => { ws.removeAllListeners(); ws.on('error', () => undefined); ws.terminate(); reject(err); };
            ws.once('open', () => {
                ws.removeAllListeners('error');
                ws.removeAllListeners('unexpected-response');
                resolve(new AhpConnection(ws, requestTimeoutMs, options.onNotification));
            });
            ws.once('error', fail);
            ws.once('unexpected-response', (_req, res) => {
                res.resume();
                fail(new Error(`host refused the connection: HTTP ${res.statusCode} ${res.statusMessage ?? ''}`.trim()));
            });
        });
    }

    /** Registers a listener that runs once when the connection ends, for any reason. */
    onClose(listener: (reason: string) => void): void {
        if (this.closed) { listener('already closed'); return; }
        this.closeListeners.push(listener);
    }

    request<T = unknown>(method: string, params: unknown, timeoutMs = this.requestTimeoutMs): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            if (this.closed) { reject(new Error(`${method}: connection is closed`)); return; }
            const id = this.nextId++;
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`${method}: no answer within ${timeoutMs} ms`));
            }, timeoutMs);
            this.pending.set(id, { method, resolve: resolve as (v: unknown) => void, reject, timer });
            this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }), err => {
                if (err) { this.settle(id)?.reject(err); }
            });
        });
    }

    /** Sends an action on a channel (`dispatchAction`, a notification). Returns the client sequence number the host echoes in `origin`. */
    dispatch(channel: string, action: object): number {
        const clientSeq = ++this.clientSeq;
        if (this.closed) { return clientSeq; }
        this.ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'dispatchAction', params: { channel, clientSeq, action } }), () => undefined);
        return clientSeq;
    }

    /** Closes the connection on purpose. Pending requests fail; close listeners still run once. */
    close(): void {
        this.finish('closed by client');
        this.ws.terminate();
    }

    private settle(id: number): Pending | undefined {
        const p = this.pending.get(id);
        if (p) { clearTimeout(p.timer); this.pending.delete(id); }
        return p;
    }

    private onMessage(raw: string): void {
        let msg: { id?: number; method?: string; params?: unknown; result?: unknown; error?: { code: number; message: string; data?: unknown } };
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.method !== undefined) {
            if (msg.id === undefined) { this.onNotification?.(msg.method, msg.params); return; }
            // A request from the host: this client declares no capabilities, so it answers "method not found".
            this.ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `client does not implement ${msg.method}` } }));
            return;
        }
        if (msg.id === undefined) { return; }
        const p = this.settle(msg.id);
        if (!p) { return; }
        if (msg.error) { p.reject(new AhpRpcError(p.method, msg.error.code, msg.error.message, msg.error.data)); }
        else { p.resolve(msg.result); }
    }

    private finish(reason: string): void {
        if (this.closed) { return; }
        this.closed = true;
        for (const [id, p] of [...this.pending]) {
            this.settle(id);
            p.reject(new Error(`${p.method}: connection ${reason}`));
        }
        for (const l of this.closeListeners.splice(0)) { l(reason); }
    }
}
