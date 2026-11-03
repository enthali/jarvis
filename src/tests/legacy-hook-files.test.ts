/**
 * REQ_CFG_HOOKCLEANUP / SPEC_CFG_HOOKCLEANUP: hook files of earlier versions are removed, and no hook
 * functionality is left in the core package (AC-5).
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { LEGACY_HOOK_FILES, removeLegacyHookFiles } from '../../packages/core/src/engine/core/legacyHookFiles';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ActorTreeProvider } from '../../packages/core/src/engine/actors/actorTreeProvider';

const root = path.resolve(__dirname, '..', '..');
const coreDir = path.join(root, 'packages', 'core');
const corePackageJson = JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'), 'utf-8'));
const extensionSrc = fs.readFileSync(path.join(coreDir, 'src', 'extension.ts'), 'utf-8');

const FIVE = ['jarvis-hooks.json', 'jarvis-bridge.mjs', 'jarvis-port', 'bridge.mjs', 'port'];
const workspaces: string[] = [];

afterEach(() => {
    for (const w of workspaces.splice(0)) { fs.rmSync(w, { recursive: true, force: true }); }
});

function workspace(files: string[] = []): { dir: string; hooks: string } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-hookclean-'));
    workspaces.push(dir);
    const hooks = path.join(dir, '.github', 'hooks');
    fs.mkdirSync(hooks, { recursive: true });
    for (const f of files) { fs.writeFileSync(path.join(hooks, f), 'x'); }
    return { dir, hooks };
}

function recorder() {
    const lines: string[] = [];
    return { lines, log: { info: (m: string) => lines.push(`info ${m}`), warn: (m: string) => lines.push(`warn ${m}`) } };
}

describe('SPEC_CFG_HOOKCLEANUP: removeLegacyHookFiles', () => {
    it('the closed list names exactly the five files of earlier versions', () => {
        expect([...LEGACY_HOOK_FILES]).toEqual(FIVE.map(f => `.github/hooks/${f}`));
    });

    it('AC-1: removes all five files and logs one info line', async () => {
        const { dir, hooks } = workspace(FIVE);
        const { lines, log } = recorder();
        await removeLegacyHookFiles(dir, log);
        for (const f of FIVE) { expect(fs.existsSync(path.join(hooks, f))).toBe(false); }
        expect(lines).toHaveLength(1);
        expect(lines[0].startsWith('info')).toBe(true);
        for (const f of FIVE) { expect(lines[0]).toContain(f); }
    });

    it('AC-2: a clean workspace loses nothing and logs nothing, also without a .github folder', async () => {
        const clean = workspace();
        const bare = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-hookclean-bare-'));
        workspaces.push(bare);
        for (const dir of [clean.dir, bare]) {
            const { lines, log } = recorder();
            await removeLegacyHookFiles(dir, log);
            expect(lines).toEqual([]);
        }
    });

    it('AC-3: another file in the directory and the directory itself remain', async () => {
        const { dir, hooks } = workspace([...FIVE, 'other-tool.json', 'jarvis-own-hook.json']);
        await removeLegacyHookFiles(dir, recorder().log);
        expect(fs.readdirSync(hooks).sort()).toEqual(['jarvis-own-hook.json', 'other-tool.json']);
    });

    it('AC-4: a removal that fails is logged, the other names are still tried, and the function resolves', async () => {
        const { dir, hooks } = workspace(['jarvis-hooks.json', 'bridge.mjs', 'port']);
        fs.mkdirSync(path.join(hooks, 'jarvis-bridge.mjs'));
        const { lines, log } = recorder();
        await expect(removeLegacyHookFiles(dir, log)).resolves.toBeUndefined();
        expect(fs.existsSync(path.join(hooks, 'jarvis-hooks.json'))).toBe(false);
        expect(fs.existsSync(path.join(hooks, 'bridge.mjs'))).toBe(false);
        expect(fs.existsSync(path.join(hooks, 'port'))).toBe(false);
        expect(fs.existsSync(path.join(hooks, 'jarvis-bridge.mjs'))).toBe(true);
        expect(lines.filter(l => l.startsWith('warn') && l.includes('.github/hooks/jarvis-bridge.mjs'))).toHaveLength(1);
        expect(lines.filter(l => l.startsWith('info'))).toHaveLength(1);
    });

    it('is idempotent: a second run finds nothing and logs nothing', async () => {
        const { dir } = workspace(FIVE);
        await removeLegacyHookFiles(dir, recorder().log);
        const { lines, log } = recorder();
        await removeLegacyHookFiles(dir, log);
        expect(lines).toEqual([]);
    });
});

describe('REQ_CFG_HOOKCLEANUP AC-6 / SPEC_CFG_HOOKCLEANUP AC-5: no hook functionality in core', () => {
    it('the manifest has no hook setting and no touched-files setting, command or menu', () => {
        const raw = JSON.stringify(corePackageJson.contributes);
        expect(raw).not.toContain('jarvis.hooks');
        expect(raw).not.toContain('touchedFiles');
        expect(raw).not.toMatch(/Touched/);
        const titles = corePackageJson.contributes.configuration.map((g: { title: string }) => g.title);
        expect(titles).toEqual(['Actors', 'Messages', 'Prompt Templates', 'Heartbeat', 'Reminders', 'Gitignore', 'Updates']);
    });

    it('the source folder of the hook engine is gone and extension.ts starts no listener', () => {
        expect(fs.existsSync(path.join(coreDir, 'src', 'engine', 'hooks'))).toBe(false);
        for (const word of ['HookEngine', 'HookIntake', 'installHookConfig', 'TouchTracker', 'TouchStore', 'hooks.autoInstall', 'http.createServer']) {
            expect(extensionSrc).not.toContain(word);
        }
    });

    it('activate() removes the old files of the first workspace folder without waiting for it', () => {
        expect(extensionSrc).toContain("import { removeLegacyHookFiles } from './engine/core/legacyHookFiles';");
        expect(extensionSrc).toMatch(/const workspaceRoot = configPaths\.getWorkspaceRoot\(\);\s+if \(workspaceRoot\) \{\s+removeLegacyHookFiles\(workspaceRoot, log\)\.catch\(/);
    });

    it('no production source of any package writes into .github/hooks or reads hook events', () => {
        const hits: string[] = [];
        const walk = (dir: string): void => {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (entry.name !== 'node_modules' && entry.name !== 'out' && entry.name !== 'dist') { walk(full); }
                } else if (entry.name.endsWith('.ts') && !full.endsWith('legacyHookFiles.ts') && /PostToolUse|PreToolUse|jarvis-hooks\.json/.test(fs.readFileSync(full, 'utf-8'))) {
                    hits.push(path.relative(root, full));
                }
            }
        };
        for (const pkg of fs.readdirSync(path.join(root, 'packages'))) {
            const src = path.join(root, 'packages', pkg, 'src');
            if (fs.existsSync(src)) { walk(src); }
        }
        expect(hits).toEqual([]);
    });

    it('SPEC_CFG_HOOKCLEANUP (Left on disk) / SPEC_ACTOR_TREE: leftover .jarvis/state/touched-files/ stays on disk and ActorTreeProvider never shows a touched category', async () => {
        const { dir } = workspace(FIVE);
        const stateFile = path.join(dir, '.jarvis', 'state', 'touched-files', 'Solo.json');
        fs.mkdirSync(path.dirname(stateFile), { recursive: true });
        fs.writeFileSync(stateFile, JSON.stringify({ 'README.md': { timestamp: new Date().toISOString() } }));

        const actorFolder = path.join(dir, '.jarvis', 'actors', 'Solo');
        fs.mkdirSync(actorFolder, { recursive: true });
        fs.writeFileSync(path.join(actorFolder, 'actor.yaml'), 'name: "Solo"\nsummary: ""\n');

        await removeLegacyHookFiles(dir, recorder().log);
        expect(fs.existsSync(stateFile)).toBe(true);

        const scanner = new ActorScanner(() => path.join(dir, '.jarvis', 'actors'), () => {});
        await scanner.rescan();
        const provider = new ActorTreeProvider(scanner, { state: () => 'idle' });
        const children = await provider.getChildren({ kind: 'actor', id: scanner.actors[0].id });
        const categories = children.map((c: any) => c.category);
        expect(categories).not.toContain('touched');
        expect(categories).toEqual(['files']);
        provider.dispose();
    });
});
