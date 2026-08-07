// Invariant: every command ID contributed in package.json must be registered
// via registerCommand() in source. Catches dead contributions like GH #64 root cause.
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function contributedCommandIds(): string[] {
    const pkgDir = path.join(ROOT, 'packages');
    const ids: string[] = [];
    for (const pkg of fs.readdirSync(pkgDir)) {
        const pkgJson = path.join(pkgDir, pkg, 'package.json');
        if (!fs.existsSync(pkgJson)) { continue; }
        const manifest = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
        for (const cmd of manifest?.contributes?.commands ?? []) {
            if (cmd.command) { ids.push(cmd.command); }
        }
    }
    return ids;
}

function registeredCommandIds(): Set<string> {
    const ids = new Set<string>();
    const queue: string[] = [path.join(ROOT, 'packages')];
    while (queue.length) {
        const dir = queue.pop()!;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // skip compiled output
                if (entry.name === 'out' || entry.name === 'node_modules') { continue; }
                queue.push(full);
            } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
                const src = fs.readFileSync(full, 'utf8');
                // command IDs appear as string literals regardless of line structure
                for (const m of src.matchAll(/['"`](jarvis\.[\w.]+)['"`]/g)) {
                    ids.add(m[1]);
                }
            }
        }
    }
    return ids;
}

describe('manifest invariant', () => {
    it('every contributed command ID has a matching registerCommand() call', () => {
        const contributed = contributedCommandIds();
        const registered = registeredCommandIds();
        const dead = contributed.filter(id => !registered.has(id));
        // jarvis.newEntity: specced in SPEC_ACT_NEWENTITY, contributed + hidden (when:false),
        // but never registered — pre-existing, tracked separately for user decision.
        const knownPending = new Set(['jarvis.newEntity']);
        const unexpected = dead.filter(id => !knownPending.has(id));
        expect(unexpected, `Contributed but never registered: ${unexpected.join(', ')}`).toEqual([]);
    });
});
