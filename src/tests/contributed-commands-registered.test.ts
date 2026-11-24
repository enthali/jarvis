// sidebar-and-spec-cleanup CR (K07): every command a package manifest contributes is registered in that
// package's own sources, so no menu entry or Command Palette item leads to "command not found".
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..', '..');
const packages = ['core', 'flow', 'kanban', 'mcp', 'pim', 'recorder'];

function tsFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { return e.name === 'node_modules' ? [] : tsFiles(full); }
        return e.name.endsWith('.ts') && !e.name.endsWith('.d.ts') ? [full] : [];
    });
}

describe('every contributed command is registered in its package sources', () => {
    it.each(packages)('%s', (name) => {
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'packages', name, 'package.json'), 'utf8'));
        const ids: string[] = (pkg.contributes?.commands ?? []).map((c: { command: string }) => c.command);
        const src = tsFiles(path.join(root, 'packages', name, 'src')).map(f => fs.readFileSync(f, 'utf8')).join('\n');
        // registerCommand('id', ...), possibly with the id on the next line
        const registered = new Set([...src.matchAll(/registerCommand\(\s*['"]([^'"]+)['"]/g)].map(m => m[1]));
        expect(ids.filter(id => !registered.has(id)), `unregistered in packages/${name}`).toEqual([]);
    });

    it('the scan sees commands in every package that contributes some, so an empty match cannot pass', () => {
        const counts = packages.map(name => {
            const pkg = JSON.parse(fs.readFileSync(path.join(root, 'packages', name, 'package.json'), 'utf8'));
            return (pkg.contributes?.commands ?? []).length;
        });
        expect(counts.reduce((a, b) => a + b, 0)).toBeGreaterThan(30);
    });
});
