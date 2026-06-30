// Jarvis Hook Bridge — stdlib only, always continue: true
// Reads hook event JSON from stdin, POSTs to the port in .jarvis/hooks/port
// Never blocks the agent — exit 0, {"continue": true} always.

import { readFileSync } from 'fs';
import { resolve } from 'path';
import http from 'http';

function main() {
    const hooksDir = resolve('.github', 'hooks');
    const portFile = resolve(hooksDir, 'port');

    let port;
    try {
        port = parseInt(readFileSync(portFile, 'utf-8').trim(), 10);
    } catch {
        // Port file missing — log and continue
        console.error('[Jarvis Hook Bridge] Port file not found, continuing');
        process.stdout.write(JSON.stringify({ continue: true }));
        return;
    }

    let input = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', chunk => { input += chunk; });
    process.stdin.on('end', () => {
        if (!input.trim()) {
            process.stdout.write(JSON.stringify({ continue: true }));
            return;
        }

        const postData = input;
        const options = {
            hostname: '127.0.0.1',
            port,
            path: '/hooks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        const req = http.request(options, res => {
            res.on('data', () => {});
            res.on('end', () => {
                process.stdout.write(JSON.stringify({ continue: true }));
            });
        });

        req.on('error', () => {
            // Transport error — swallow, always continue
            process.stdout.write(JSON.stringify({ continue: true }));
        });

        req.write(postData);
        req.end();
    });
}

main();
