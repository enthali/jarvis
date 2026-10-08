/**
 * SPEC_ENG_ACTORMARK AC-1..AC-4: Actor node icon marks held by ActorTreeProvider.
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ThemeIcon, ThemeColor } from 'vscode';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ActorTreeProvider } from '../../packages/core/src/engine/actors/actorTreeProvider';
import { TouchStore } from '../../packages/core/src/engine/hooks/touchStore';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

async function setup(active: boolean) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mark-'));
    roots.push(root);
    const folder = path.join(root, 'Solo');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), 'name: "Solo"\nsummary: ""\nagent: ""\n');
    const scanner = new ActorScanner(() => root, () => {});
    await scanner.rescan();
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mark-state-'));
    roots.push(stateDir);
    const provider = new ActorTreeProvider(scanner, new TouchStore(stateDir), { isActive: () => active });
    const node = { kind: 'actor' as const, id: scanner.actors[0].id };
    let refreshes = 0;
    provider.onDidChangeTreeData(() => { refreshes++; });
    return { provider, node, refreshes: () => refreshes };
}

const red = new ThemeIcon('circle-filled', new ThemeColor('charts.red'));
const blue = new ThemeIcon('circle-filled', new ThemeColor('charts.blue'));

describe('SPEC_ENG_ACTORMARK: ActorTreeProvider.mark', () => {
    it('AC-3: the mark replaces the icon, ahead of the activity indicator', async () => {
        const { provider, node } = await setup(true);
        provider.mark(node.id, red);
        expect(provider.getTreeItem(node).iconPath).toBe(red);
    });

    it('AC-1/AC-4: disposing removes the mark, refreshes, and the activity icon returns', async () => {
        const { provider, node, refreshes } = await setup(true);
        const d = provider.mark(node.id, red);
        const before = refreshes();
        d.dispose();
        expect(refreshes()).toBe(before + 1);
        const icon = provider.getTreeItem(node).iconPath as ThemeIcon;
        expect(icon.color?.id).toBe('charts.green');
    });

    it('AC-4: an inactive Actor has no icon once the mark is gone', async () => {
        const { provider, node } = await setup(false);
        provider.mark(node.id, red).dispose();
        expect(provider.getTreeItem(node).iconPath).toBeUndefined();
    });

    it('AC-2: a second mark replaces the first; disposing the first leaves the second', async () => {
        const { provider, node } = await setup(false);
        const first = provider.mark(node.id, red);
        provider.mark(node.id, blue);
        first.dispose();
        expect(provider.getTreeItem(node).iconPath).toBe(blue);
    });

    it('AC-3: nothing else on the node changes', async () => {
        const { provider, node } = await setup(false);
        const plain = provider.getTreeItem(node);
        provider.mark(node.id, red);
        const marked = provider.getTreeItem(node);
        expect(marked.contextValue).toBe(plain.contextValue);
        expect(marked.label).toBe(plain.label);
    });
});
