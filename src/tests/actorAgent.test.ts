/**
 * Unit tests for ensureActorAgent (SPEC_ACTOR_WHOAMI, actor-identity-via-agent-file).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscodeMock from 'vscode';
import { ensureActorAgent } from '../../packages/core/src/engine/actors/actorAgent';

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
    (vscodeMock.workspace as any).workspaceFolders = undefined;
    vi.restoreAllMocks();
});

function makeRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-actor-agent-'));
    roots.push(root);
    (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
    return root;
}

function agentsDir(root: string): string {
    return path.join(root, '.github', 'agents');
}

describe('ensureActorAgent: noWorkspace', () => {
    it('returns skipped/noWorkspace when there is no workspace folder', async () => {
        (vscodeMock.workspace as any).workspaceFolders = [];
        const result = await ensureActorAgent({ name: 'Solo Actor', folder: '/does/not/matter' });
        expect(result).toEqual({ status: 'skipped', reason: 'noWorkspace' });
    });
});

describe('ensureActorAgent: create path (no matching agent discovered)', () => {
    it('creates <name>.agent.md with front matter and the two Jarvis lines, returns ready', async () => {
        const root = makeRoot();
        const actorFolder = path.join(root, '.jarvis', 'actors', 'Fresh Actor');

        const result = await ensureActorAgent({ name: 'Fresh Actor', folder: actorFolder });

        expect(result).toEqual({ status: 'ready', mode: 'Fresh Actor' });
        const written = fs.readFileSync(path.join(agentsDir(root), 'Fresh Actor.agent.md'), 'utf8');
        expect(written).toContain('name: "Fresh Actor"');
        expect(written).toContain('You act as Actor Fresh Actor');
        expect(written).toContain(
            'Your context memory is .jarvis/actors/Fresh Actor/context.md. Read it and the files it links if you did not do that already or after a compaction.'
        );
    }, 10_000);

    it('is idempotent under concurrent calls for the same Actor name (AC-9 serialization)', async () => {
        const root = makeRoot();
        const actorFolder = path.join(root, '.jarvis', 'actors', 'Racer');

        const [a, b] = await Promise.all([
            ensureActorAgent({ name: 'Racer', folder: actorFolder }),
            ensureActorAgent({ name: 'Racer', folder: actorFolder }),
        ]);

        expect(a).toEqual({ status: 'ready', mode: 'Racer' });
        expect(b).toEqual({ status: 'ready', mode: 'Racer' });
        const written = fs.readFileSync(path.join(agentsDir(root), 'Racer.agent.md'), 'utf8');
        expect(written.match(/You act as Actor Racer/g)?.length).toBe(1);
    }, 10_000);
});

describe('ensureActorAgent: restore path (exactly one agent discovered by identity)', () => {
    it('inserts the two lines after existing front matter, preserving the rest of the file', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        const filePath = path.join(agentsDir(root), 'custom-file-name.agent.md');
        fs.writeFileSync(filePath, '---\nname: "Existing Actor"\n---\n# Persona\n\nSome body text.\n', 'utf8');

        const result = await ensureActorAgent({ name: 'Existing Actor', folder: path.join(root, 'Existing Actor') });

        expect(result).toEqual({ status: 'ready', mode: 'Existing Actor' });
        const written = fs.readFileSync(filePath, 'utf8');
        expect(written).toContain('You act as Actor Existing Actor');
        expect(written).toContain('Your context memory is');
        expect(written).toContain('# Persona');
        expect(written).toContain('Some body text.');
    });

    it('replaces previously-restored lines in place rather than duplicating them', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        const filePath = path.join(agentsDir(root), 'Existing Actor.agent.md');
        fs.writeFileSync(
            filePath,
            '---\nname: "Existing Actor"\n---\nYou act as Actor Existing Actor\nYour context memory is stale/path.md. Read it.\nBody.\n',
            'utf8'
        );

        await ensureActorAgent({ name: 'Existing Actor', folder: path.join(root, 'Existing Actor') });

        const written = fs.readFileSync(filePath, 'utf8');
        expect(written.match(/You act as Actor Existing Actor/g)?.length).toBe(1);
        expect(written).not.toContain('stale/path.md');
        expect(written).toContain('Body.');
    });

    it('does not rewrite the file when the restored content is unchanged', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        const filePath = path.join(agentsDir(root), 'Existing Actor.agent.md');
        const actorFolder = path.join(root, 'Existing Actor');
        const content =
            '---\nname: "Existing Actor"\n---\n' +
            'You act as Actor Existing Actor\n' +
            `Your context memory is ${path.join('Existing Actor', 'context.md').split(path.sep).join('/')}` +
            '. Read it and the files it links if you did not do that already or after a compaction.\n';
        fs.writeFileSync(filePath, content, 'utf8');
        const before = fs.statSync(filePath).mtimeMs;

        await new Promise(resolve => setTimeout(resolve, 5));
        await ensureActorAgent({ name: 'Existing Actor', folder: actorFolder });

        const after = fs.statSync(filePath).mtimeMs;
        expect(after).toBe(before);
    });
});

describe('ensureActorAgent: nameMismatch and duplicateAgent', () => {
    it('returns skipped/nameMismatch when <name>.agent.md exists but is not the Actor\'s agent', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        fs.writeFileSync(path.join(agentsDir(root), 'Mismatched.agent.md'), '---\nname: "Someone Else"\n---\nBody.\n', 'utf8');
        const warnSpy = vi.spyOn(vscodeMock.window, 'showWarningMessage').mockResolvedValue(undefined as any);

        const result = await ensureActorAgent({ name: 'Mismatched', folder: path.join(root, 'Mismatched') });

        expect(result).toEqual({ status: 'skipped', reason: 'nameMismatch' });
        expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('returns skipped/duplicateAgent when more than one agent shares the identity', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        fs.writeFileSync(path.join(agentsDir(root), 'one.agent.md'), '---\nname: "Dup Actor"\n---\nBody.\n', 'utf8');
        fs.writeFileSync(path.join(agentsDir(root), 'two.agent.md'), '---\nname: "Dup Actor"\n---\nBody.\n', 'utf8');
        const warnSpy = vi.spyOn(vscodeMock.window, 'showWarningMessage').mockResolvedValue(undefined as any);

        const result = await ensureActorAgent({ name: 'Dup Actor', folder: path.join(root, 'Dup Actor') });

        expect(result).toEqual({ status: 'skipped', reason: 'duplicateAgent' });
        expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('leaves every candidate file unchanged in the mismatch case', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        const filePath = path.join(agentsDir(root), 'Mismatched2.agent.md');
        const content = '---\nname: "Someone Else"\n---\nBody.\n';
        fs.writeFileSync(filePath, content, 'utf8');
        vi.spyOn(vscodeMock.window, 'showWarningMessage').mockResolvedValue(undefined as any);

        await ensureActorAgent({ name: 'Mismatched2', folder: path.join(root, 'Mismatched2') });

        expect(fs.readFileSync(filePath, 'utf8')).toBe(content);
    });

    it('shows a given warning at most once per window session (AC-6)', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        fs.writeFileSync(path.join(agentsDir(root), 'Repeat.agent.md'), '---\nname: "Someone Else"\n---\nBody.\n', 'utf8');
        const warnSpy = vi.spyOn(vscodeMock.window, 'showWarningMessage').mockResolvedValue(undefined as any);

        await ensureActorAgent({ name: 'Repeat', folder: path.join(root, 'Repeat') });
        await ensureActorAgent({ name: 'Repeat', folder: path.join(root, 'Repeat') });

        expect(warnSpy).toHaveBeenCalledOnce();
    });
});

describe('ensureActorAgent: line-ending and front-matter edge cases (AC-3)', () => {
    it('preserves CRLF line endings when restoring the two lines', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        const filePath = path.join(agentsDir(root), 'CRLF Actor.agent.md');
        fs.writeFileSync(filePath, '---\r\nname: "CRLF Actor"\r\n---\r\nBody.\r\n', 'utf8');

        const result = await ensureActorAgent({ name: 'CRLF Actor', folder: path.join(root, 'CRLF Actor') });

        expect(result).toEqual({ status: 'ready', mode: 'CRLF Actor' });
        const written = fs.readFileSync(filePath, 'utf8');
        expect(written).toContain('\r\nYou act as Actor CRLF Actor\r\n');
        expect(written).not.toMatch(/[^\r]\n/); // every \n is preceded by \r
    });

    it('inserts the two lines at the start of a file with no front matter', async () => {
        const root = makeRoot();
        fs.mkdirSync(agentsDir(root), { recursive: true });
        const filePath = path.join(agentsDir(root), 'No Frontmatter.agent.md');
        fs.writeFileSync(filePath, '# Just a heading\n\nSome body.\n', 'utf8');

        const result = await ensureActorAgent({ name: 'No Frontmatter', folder: path.join(root, 'No Frontmatter') });

        expect(result).toEqual({ status: 'ready', mode: 'No Frontmatter' });
        const written = fs.readFileSync(filePath, 'utf8');
        expect(written.startsWith('You act as Actor No Frontmatter\n')).toBe(true);
        expect(written).toContain('# Just a heading');
        expect(written).toContain('Some body.');
    });
});

describe('REQ_ACTOR_WHOAMI AC-10/AC-11: jarvis_whoAmI fully removed', () => {
    it('is absent from packages/core/package.json languageModelTools', () => {
        const pkg = JSON.parse(fs.readFileSync(
            path.resolve(__dirname, '..', '..', 'packages', 'core', 'package.json'), 'utf8'
        ));
        const names: string[] = pkg.contributes.languageModelTools.map((t: { name: string }) => t.name);
        expect(names).not.toContain('jarvis_whoAmI');
    });

    it('the kernel instructions asset does not mention jarvis_whoAmI', () => {
        const kernelAsset = fs.readFileSync(path.resolve(
            __dirname, '..', '..', 'packages', 'core', 'assets', 'instructions', 'jarvis-actor.kernel.instructions.md'
        ), 'utf8');
        expect(kernelAsset).not.toContain('jarvis_whoAmI');
    });

    it('SPEC_ACTOR_WHOAMI AC-10: no identity section; sections 1 to 4 keep their numbers', () => {
        const kernelAsset = fs.readFileSync(path.resolve(
            __dirname, '..', '..', 'packages', 'core', 'assets', 'instructions', 'jarvis-actor.kernel.instructions.md'
        ), 'utf8');
        expect(kernelAsset).not.toContain('## 0.');
        expect(kernelAsset).not.toContain('Identity');
        expect(kernelAsset).toContain('## 1. Local Memory');
        expect(kernelAsset).toContain('## 2. Messaging');
        expect(kernelAsset).toContain('## 3. Escalation');
        expect(kernelAsset).toContain('## 4. Culture');
    });
});
