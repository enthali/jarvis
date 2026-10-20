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

async function setup(active: boolean, mail: { isUnread: (id: string) => boolean } = { isUnread: () => false }) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mark-'));
    roots.push(root);
    const folder = path.join(root, 'Solo');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), 'name: "Solo"\nsummary: ""\nagent: ""\n');
    const scanner = new ActorScanner(() => root, () => {});
    await scanner.rescan();
    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mark-state-'));
    roots.push(stateDir);
    const provider = new ActorTreeProvider(scanner, new TouchStore(stateDir), { isActive: () => active }, mail);
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

    it('AC-2: marks stack; disposing the newer one shows the older one again', async () => {
        const { provider, node } = await setup(false);
        provider.mark(node.id, red);
        const second = provider.mark(node.id, blue);
        expect(provider.getTreeItem(node).iconPath).toBe(blue);
        second.dispose();
        expect(provider.getTreeItem(node).iconPath).toBe(red);
    });

    it('AC-2: disposing the older mark while the newer one is set leaves the newer one', async () => {
        const { provider, node } = await setup(false);
        const first = provider.mark(node.id, red);
        provider.mark(node.id, blue);
        first.dispose();
        expect(provider.getTreeItem(node).iconPath).toBe(blue);
    });

    it('AC-1: disposing a mark twice refreshes once and does not remove another mark', async () => {
        const { provider, node, refreshes } = await setup(false);
        provider.mark(node.id, red);
        const second = provider.mark(node.id, blue);
        second.dispose();
        const before = refreshes();
        second.dispose();
        expect(refreshes()).toBe(before);
        expect(provider.getTreeItem(node).iconPath).toBe(red);
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

const unread = { isUnread: () => true };

describe('SPEC_ACTOR_MAIL: unread-mail icon on the Actor node (ActorTreeProvider)', () => {
    it('AC-5: an unread Actor that is not active shows the mail icon, without colour', async () => {
        const { provider, node } = await setup(false, unread);
        const icon = provider.getTreeItem(node).iconPath as ThemeIcon;
        expect(icon.id).toBe('mail');
        expect(icon.color).toBeUndefined();
    });

    it('AC-6: the activity icon takes precedence over the mail icon', async () => {
        const { provider, node } = await setup(true, unread);
        const icon = provider.getTreeItem(node).iconPath as ThemeIcon;
        expect(icon.color?.id).toBe('charts.green');
    });

    it('AC-6: a mark takes precedence over the mail icon', async () => {
        const { provider, node } = await setup(false, unread);
        provider.mark(node.id, red);
        expect(provider.getTreeItem(node).iconPath).toBe(red);
    });

    it('AC-6: the mail icon returns when the mark is disposed', async () => {
        const { provider, node } = await setup(false, unread);
        provider.mark(node.id, red).dispose();
        expect((provider.getTreeItem(node).iconPath as ThemeIcon).id).toBe('mail');
    });

    it('AC-5: no mail icon when the Actor has no unread mail', async () => {
        const { provider, node } = await setup(false);
        expect(provider.getTreeItem(node).iconPath).toBeUndefined();
    });
});
