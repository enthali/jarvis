// Implementation: SPEC_HOOK_INTAKE
// Requirements: REQ_HOOK_INTAKE

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { HookEngine, HookEvent } from './hookEngine';

export class HookIntake {
    private server: http.Server | null = null;
    private readonly hookEngine: HookEngine;
    private readonly hooksDir: string;
    private readonly portFile: string;

    constructor(hookEngine: HookEngine, hooksDir: string) {
        this.hookEngine = hookEngine;
        this.hooksDir = hooksDir;
        this.portFile = path.join(hooksDir, 'jarvis-port');
    }

    async start(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                if (req.method === 'POST' && req.url === '/hooks') {
                    let body = '';
                    req.on('data', chunk => { body += chunk; });
                    req.on('end', () => {
                        try {
                            const parsed = JSON.parse(body);
                            // Extract hook_event_name from payload (added by bridge)
                            const eventName = parsed.hook_event_name ?? parsed.eventName ?? parsed.event ?? 'Unknown';
                            const event: HookEvent = {
                                eventName,
                                timestamp: parsed.timestamp ?? new Date().toISOString(),
                                sessionId: parsed.session_id,
                                payload: parsed.payload ?? parsed,
                            };
                            this.hookEngine.receive(event);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ continue: true }));
                        } catch (err) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ continue: true, error: 'Invalid JSON' }));
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end('Not Found');
                }
            });

            this.server.listen(0, '127.0.0.1', () => {
                const address = this.server!.address();
                if (address && typeof address === 'object') {
                    const port = address.port;
                    fs.mkdirSync(this.hooksDir, { recursive: true });
                    fs.writeFileSync(this.portFile, String(port), 'utf-8');
                    resolve(port);
                } else {
                    reject(new Error('Failed to bind ephemeral port'));
                }
            });

            this.server.on('error', reject);
        });
    }

    async stop(): Promise<void> {
        if (this.server) {
            await new Promise<void>((resolve) => {
                this.server!.close(() => resolve());
            });
            this.server = null;
            try { fs.unlinkSync(this.portFile); } catch { /* ignore */ }
        }
    }

    getPort(): number | null {
        if (this.server) {
            const address = this.server.address();
            if (address && typeof address === 'object') {
                return address.port;
            }
        }
        return null;
    }
}