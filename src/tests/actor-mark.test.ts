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
import type { ActorActivityState } from '../../packages/core/src/engine/actors/actorActivity';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

async function setup(active: boolean | ActorActivityState) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-mark-'));
    roots.push(root);
    const folder = path.join(root, 'Solo');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, 'actor.yaml'), 'name: "Solo"\nsummary: ""\nagent: ""\n');
    const scanner = new ActorScanner(() => root, () => {});
    await scanner.rescan();
    const provider = new ActorTreeProvider(scanner, { state: () => typeof active === 'string' ? active : active ? 'working' : 'idle' });
    const node = { kind: 'actor' as const, id: scanner.actors[0].id };
    let refreshes = 0;
    provider.onDidChangeTreeData(() => { refreshes++; });
    return { provider, node, refreshes: () => refreshes };
}

const red = new ThemeIcon('circle-filled', new ThemeColor('charts.red'));
const blue = new ThemeIcon('circle-filled', new ThemeColor('charts.blue'));

describe('SPEC_ENG_ACTORMARK: ActorTreeProvider.mark', () => {
    it.each([['error', 'error', 'charts.red'], ['waiting', 'question', 'charts.blue']] as const)(
        'shows %s ahead of a recording mark', async (state, iconId, color) => {
            const { provider, node } = await setup(state);
            provider.mark(node.id, red);
            const icon = provider.getTreeItem(node).iconPath as ThemeIcon;
            expect(icon.id).toBe(iconId);
            expect(icon.color?.id).toBe(color);
        }
    );
    it('AC-3: the activity indicator takes precedence over the mark', async () => {
        const { provider, node } = await setup(true);
        provider.mark(node.id, red);
        expect((provider.getTreeItem(node).iconPath as ThemeIcon).id).toBe('loading~spin');
    });

    it('AC-1/AC-4: disposing removes the mark, refreshes, and the activity icon returns', async () => {
        const { provider, node, refreshes } = await setup(true);
        const d = provider.mark(node.id, red);
        const before = refreshes();
        d.dispose();
        expect(refreshes()).toBe(before + 1);
        const icon = provider.getTreeItem(node).iconPath as ThemeIcon;
        expect(icon.id).toBe('loading~spin');
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

const green = new ThemeIcon('mail');
const flagIcon = new ThemeIcon('flag');

describe('SPEC_ENG_ACTORINDICATOR: ActorTreeProvider.indicate', () => {
    it('AC-3: an idle Actor without a mark shows the indicator icon', async () => {
        const { provider, node } = await setup(false);
        provider.indicate(node.id, green);
        expect(provider.getTreeItem(node).iconPath).toBe(green);
    });

    it.each([true, 'error', 'waiting'] as const)('AC-3: activity state %s takes precedence over the indicator', async (state) => {
        const { provider, node } = await setup(state);
        provider.indicate(node.id, green);
        expect(provider.getTreeItem(node).iconPath).not.toBe(green);
    });

    it('AC-3: a mark takes precedence over the indicator, which returns when the mark is disposed', async () => {
        const { provider, node } = await setup(false);
        provider.indicate(node.id, green);
        const mark = provider.mark(node.id, red);
        expect(provider.getTreeItem(node).iconPath).toBe(red);
        mark.dispose();
        expect(provider.getTreeItem(node).iconPath).toBe(green);
    });

    it('AC-1: disposing removes the indicator and refreshes; a second dispose does neither', async () => {
        const { provider, node, refreshes } = await setup(false);
        const d = provider.indicate(node.id, green);
        const before = refreshes();
        d.dispose();
        expect(refreshes()).toBe(before + 1);
        expect(provider.getTreeItem(node).iconPath).toBeUndefined();
        d.dispose();
        expect(refreshes()).toBe(before + 1);
    });

    it('AC-2: indicators stack; the newest still set shows, then the older one', async () => {
        const { provider, node } = await setup(false);
        provider.indicate(node.id, green);
        const second = provider.indicate(node.id, flagIcon);
        expect(provider.getTreeItem(node).iconPath).toBe(flagIcon);
        second.dispose();
        expect(provider.getTreeItem(node).iconPath).toBe(green);
    });

    it('AC-4: indicators and marks are separate; one never removes the other', async () => {
        const { provider, node } = await setup(false);
        const d = provider.indicate(node.id, green);
        provider.mark(node.id, red);
        d.dispose();
        expect(provider.getTreeItem(node).iconPath).toBe(red);
    });

    it('AC-3: nothing else on the node changes', async () => {
        const { provider, node } = await setup(false);
        const plain = provider.getTreeItem(node);
        provider.indicate(node.id, green);
        const shown = provider.getTreeItem(node);
        expect(shown.contextValue).toBe(plain.contextValue);
        expect(shown.label).toBe(plain.label);
    });

    it('AC-6: with no indicator set the node has no icon', async () => {
        const { provider, node } = await setup(false);
        expect(provider.getTreeItem(node).iconPath).toBeUndefined();
    });
});
