// pim-actor-mail-indicators CR, written from REQ_ACTOR_MAIL AC-1..18, REQ_ENG_ACTORINDICATOR, SPEC_ACTOR_MAIL
// and AC_ACTOR_MAIL_FLAG_JOURNEY. Developer unit tests live in actor-mail.test.ts and actor-mark.test.ts;
// these add the Core API seam, the Core/PIM boundary, the real read script against a fake Outlook, and the documents.
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as childProcess from 'child_process';

const { execFile } = vi.hoisted(() => ({ execFile: vi.fn() }));
vi.mock('child_process', async (importOriginal) => ({
    ...(await importOriginal<typeof import('child_process')>()),
    execFile,
}));
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { JarvisEngine } from '../../packages/core/src/engine/core/coreApi';
import { ActorScanner } from '../../packages/core/src/engine/actors/actorScanner';
import { ActorTreeProvider } from '../../packages/core/src/engine/actors/actorTreeProvider';
import { ActorMailStatus } from '../../packages/pim/src/ActorMailStatus';
import { READ_SCRIPT, parseFolderMail } from '../../packages/pim/src/outlookIntegration/OutlookActorMail';

const root = path.resolve(__dirname, '../..');
const read = (rel: string): string => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const tmp: string[] = [];
afterEach(() => { for (const d of tmp.splice(0)) { fs.rmSync(d, { recursive: true, force: true }); } vi.restoreAllMocks(); });

function tsFiles(dir: string): string[] {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => {
        const rel = `${dir}/${e.name}`;
        return e.isDirectory() ? tsFiles(rel) : /\.ts$/.test(e.name) ? [rel] : [];
    });
}

describe('REQ_ACTOR_MAIL AC-15 / SPEC_ENG_ACTORINDICATOR: Core reads no mail', () => {
    it('Core source has no Outlook mail code, no mail state and no outlook.enabled handling', () => {
        expect(fs.existsSync(path.join(root, 'packages/core/src/engine/actors/actorMail.ts'))).toBe(false);
        for (const f of tsFiles('packages/core/src')) {
            const text = read(f);
            expect(text, f).not.toMatch(/Outlook\.Application|UnReadItemCount|FlagStatus|GetActiveObject/);
            expect(text, f).not.toMatch(/ActorMailState|MailLike|outlook\.enabled/);
        }
    });

    it('the setting jarvis.outlook.enabled is declared by PIM and not by Core', () => {
        expect(read('packages/pim/package.json')).toContain('"jarvis.outlook.enabled"');
        expect(read('packages/core/package.json')).not.toContain('outlook.enabled');
    });

    it('JarvisCoreApi gains indicateActor and onDidScanActors and stays at version 2', () => {
        const types = read('packages/core/src/engine/core/types.ts');
        expect(types).toMatch(/readonly version: 2;/);
        expect(types).toMatch(/indicateActor\(actorId: string, icon: vscode\.ThemeIcon\): vscode\.Disposable;/);
        expect(types).toMatch(/readonly onDidScanActors: vscode\.Event<void>;/);
    });
});

describe('REQ_ACTOR_MAIL AC-15 / SPEC_ACTOR_MAIL: PIM uses only three Core API members', () => {
    it('ActorMailStatus calls only listActors, onDidScanActors and indicateActor on the API', () => {
        const src = read('packages/pim/src/ActorMailStatus.ts');
        const used = new Set([...src.matchAll(/\bapi\.(\w+)/g)].map(m => m[1]));
        expect([...used].sort()).toEqual(['indicateActor', 'listActors', 'onDidScanActors']);
    });

    it('PIM extension.ts constructs ActorMailStatus once and calls requestRead on jarvis.outlook.enabled changes', () => {
        const src = read('packages/pim/src/extension.ts');
        expect(src.match(/new ActorMailStatus\(/g)).toHaveLength(1);
        expect(src).toMatch(/affectsConfiguration\('jarvis\.outlook\.enabled'\)\) \{ actorMail\.requestRead\(\); \}/);
        expect(src).toMatch(/context\.subscriptions\.push\(\s*actorMail,/);
    });

    it('REQ_ACTOR_MAIL AC-19 / SPEC_ACTOR_MAIL AC-13: PIM activates on startup, not only when its view opens', () => {
        const manifest = JSON.parse(read('packages/pim/package.json'));
        expect(manifest.activationEvents).toContain('onStartupFinished');
    });

    it('no other PIM file reads the mail folders', () => {
        const hits = tsFiles('packages/pim/src').filter(f => /UnReadItemCount/.test(read(f)));
        expect(hits).toEqual(['packages/pim/src/outlookIntegration/OutlookActorMail.ts']);
    });
});

describe('REQ_ENG_ACTORINDICATOR / REQ_ENG_ACTORLIST AC-6: JarvisEngine seam', () => {
    it('indicateActor delegates to the wired indicator and returns its Disposable', () => {
        const engine = new JarvisEngine(new ActorScanner(() => '', () => {}));
        const disposable = new vscode.Disposable(() => {});
        const indicator = vi.fn(() => disposable);
        engine.setIndicator(indicator);
        const icon = new vscode.ThemeIcon('flag');
        expect(engine.indicateActor('a1', icon)).toBe(disposable);
        expect(indicator).toHaveBeenCalledWith('a1', icon);
    });

    it('indicateActor throws while the tree is not wired', () => {
        const engine = new JarvisEngine(new ActorScanner(() => '', () => {}));
        expect(() => engine.indicateActor('a1', new vscode.ThemeIcon('flag'))).toThrow('Actor tree is not available');
    });

    it('onDidScanActors fires after every completed scan, including one that changes nothing', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-scan-'));
        tmp.push(dir);
        const scanner = new ActorScanner(() => dir, () => {});
        const engine = new JarvisEngine(scanner);
        let fired = 0;
        engine.onDidScanActors(() => { fired++; });
        await scanner.rescan();
        await scanner.rescan();
        expect(fired).toBe(2);
    });
});

describe('Journey AC_ACTOR_MAIL_FLAG_JOURNEY: PIM status over the real engine, scanner and tree', () => {
    async function rig(names: string[], activity: 'idle' | 'working' = 'idle') {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-journey-'));
        tmp.push(dir);
        for (const n of names) {
            fs.mkdirSync(path.join(dir, n));
            fs.writeFileSync(path.join(dir, n, 'actor.yaml'), `name: "${n}"\nsummary: ""\nagent: ""\n`);
        }
        const scanner = new ActorScanner(() => dir, () => {});
        await scanner.rescan();
        const tree = new ActorTreeProvider(scanner, { state: () => activity });
        const engine = new JarvisEngine(scanner);
        engine.setIndicator((id, icon) => tree.indicate(id, icon));
        const iconOf = (name: string) =>
            (tree.getTreeItem({ kind: 'actor', id: scanner.actors.find(a => a.name === name)!.id }).iconPath as vscode.ThemeIcon | undefined)?.id;
        return { scanner, engine, iconOf };
    }

    function outlookReturns(entries: object[]) {
        vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue(
            { get: (k: string, d?: unknown) => (k === 'outlook.enabled' ? true : d) } as never);
        vi.spyOn(process, 'platform', 'get').mockReturnValue('win32');
        execFile.mockImplementation(((_f: string, _a: string[], _o: unknown, cb: (...x: unknown[]) => void) => {
            cb(null, JSON.stringify(entries), '');
        }) as never);
        return execFile;
    }

    const flush = () => new Promise(r => setImmediate(r));

    it('flag, flag over unread, completion reveals unread, clearing removes the icon', async () => {
        const { scanner, engine, iconOf } = await rig(['Test1', 'Test2']);
        const status = new ActorMailStatus(engine, { warn: () => {} }, false);
        const states: [object[], string | undefined, string | undefined][] = [
            [[{ name: 'Test1', unread: 0, flagged: false, checked: true }, { name: 'Test2', unread: 0, flagged: true, checked: true }], undefined, 'flag'],
            [[{ name: 'Test1', unread: 0, flagged: false, checked: true }, { name: 'Test2', unread: 1, flagged: true, checked: true }], undefined, 'flag'],
            [[{ name: 'Test1', unread: 0, flagged: false, checked: true }, { name: 'Test2', unread: 1, flagged: false, checked: true }], undefined, 'mail'],
            [[{ name: 'Test1', unread: 0, flagged: true, checked: true }, { name: 'Test2', unread: 1, flagged: false, checked: true }], 'flag', 'mail'],
            [[{ name: 'Test1', unread: 0, flagged: false, checked: true }, { name: 'Test2', unread: 0, flagged: false, checked: true }], undefined, undefined],
        ];
        for (const [entries, t1, t2] of states) {
            outlookReturns(entries);
            await scanner.rescan();
            await flush();
            expect([iconOf('Test1'), iconOf('Test2')]).toEqual([t1, t2]);
            vi.restoreAllMocks();
        }
        status.dispose();
    });

    it('chat activity keeps precedence and the flag returns when it ends', async () => {
        const { scanner, engine, iconOf } = await rig(['Test2'], 'working');
        const status = new ActorMailStatus(engine, { warn: () => {} }, false);
        outlookReturns([{ name: 'Test2', unread: 0, flagged: true, checked: true }]);
        await scanner.rescan();
        await flush();
        expect(iconOf('Test2')).toBe('loading~spin');
        status.dispose();
        expect(iconOf('Test2')).toBe('loading~spin');
    });

    it('disposing PIM status removes the indicator from the tree (Core without PIM shows none)', async () => {
        const { scanner, engine, iconOf } = await rig(['Test2']);
        const status = new ActorMailStatus(engine, { warn: () => {} }, false);
        outlookReturns([{ name: 'Test2', unread: 2, flagged: false, checked: true }]);
        await scanner.rescan();
        await flush();
        expect(iconOf('Test2')).toBe('mail');
        status.dispose();
        expect(iconOf('Test2')).toBeUndefined();
    });
});

// Runs the real READ_SCRIPT in Windows PowerShell; only the two attach lines are replaced by a fake Outlook.
describe.skipIf(process.platform !== 'win32')('SPEC_ACTOR_MAIL read script: behaviour against a fake Outlook', () => {
    const FAKE = `
$spec = ConvertFrom-Json $env:FAKE_FOLDERS | ForEach-Object { $_ }
$inbox = [pscustomobject]@{ Folders = @(foreach ($s in $spec) {
    $o = [pscustomobject]@{ Name = $s.name; UnReadItemCount = $s.unread; Mode = $s.flag; Pause = $s.pause }
    $o | Add-Member -MemberType ScriptMethod -Name GetTable -Value {
        param($filter)
        if ($filter -ne '[FlagStatus] >= 2') { throw 'wrong filter' }
        if ($this.Mode -eq 'throw') { throw 'boom' }
        if ($this.Pause) { Start-Sleep -Milliseconds $this.Pause }
        [pscustomobject]@{ EndOfTable = ($this.Mode -ne 'marked') }
    }
    $o
}) }`;
    const lines = READ_SCRIPT.split('\n');
    const attach = lines.findIndex(l => l.includes('GetActiveObject'));
    const fakeScript = [...lines.slice(0, attach), FAKE, ...lines.slice(attach + 2)].join('\n');

    function run(names: string[], folders: object[]) {
        const stdout = childProcess.execFileSync('powershell', ['-NoProfile', '-Command', fakeScript], {
            encoding: 'utf8', windowsHide: true,
            env: { ...process.env, JARVIS_ACTOR_NAMES: JSON.stringify(names), FAKE_FOLDERS: JSON.stringify(folders) },
        });
        return parseFolderMail(stdout)!;
    }

    it('the script parses and the attach line is where the fake takes over', () => {
        expect(attach).toBeGreaterThan(0);
        expect(lines[attach + 1]).toContain('GetDefaultFolder(6)');
    }, 20000);

    it('flags only candidate folders: marked counts, none does not, case differs, non-candidates are not looked up', () => {
        const rows = run(['Test1', 'Test2', 'Ärger'], [
            { name: 'Test1', unread: 0, flag: 'none' },
            { name: 'Test2', unread: 3, flag: 'marked' },
            { name: 'test2', unread: 1, flag: 'marked' },
            { name: 'Other', unread: 5, flag: 'throw' },
            { name: 'Ärger', unread: 0, flag: 'marked' },
        ]);
        const by = Object.fromEntries(rows.map(r => [r.name, r]));
        expect(by.Test1).toMatchObject({ unread: 0, flagged: false, checked: true });
        expect(by.Test2).toMatchObject({ unread: 3, flagged: true, checked: true });
        expect(by.test2).toMatchObject({ unread: 1, flagged: false, checked: true });
        expect(by.Other).toMatchObject({ unread: 5, flagged: false, checked: true });
        expect(by['Ärger']).toMatchObject({ flagged: true });
    }, 20000);

    it('a failing lookup counts as no flag, keeps unread and does not stop the other folders', () => {
        const rows = run(['A', 'B'], [
            { name: 'A', unread: 4, flag: 'throw' },
            { name: 'B', unread: 0, flag: 'marked' },
        ]);
        expect(rows.find(r => r.name === 'A')).toMatchObject({ unread: 4, flagged: false, checked: false });
        expect(rows.find(r => r.name === 'B')).toMatchObject({ flagged: true, checked: true });
    }, 20000);

    it('with no folders the output is a JSON array, not an empty string', () => {
        expect(run(['A'], [])).toEqual([]);
    }, 20000);

    it('after the 5 s budget lookups are skipped, yet every folder still reports its unread count', () => {
        const rows = run(['A', 'B', 'C'], [
            { name: 'A', unread: 1, flag: 'none', pause: 2700 },
            { name: 'B', unread: 2, flag: 'none', pause: 2700 },
            { name: 'C', unread: 7, flag: 'marked' },
        ]);
        expect(rows.map(r => [r.name, r.unread, r.checked])).toEqual([['A', 1, true], ['B', 2, true], ['C', 7, false]]);
        expect(rows[2].flagged).toBe(false);
    }, 30000);
});

describe('Documents: moved Needs, journey, guides', () => {
    it('the three mail Needs live in the PIM files and no longer in the Actor files', () => {
        for (const [file, id] of [['docs/userstories/us_pim.rst', 'US_ACTOR_MAIL'], ['docs/requirements/req_pim.rst', 'REQ_ACTOR_MAIL'], ['docs/design/spec_pim.rst', 'SPEC_ACTOR_MAIL']]) {
            expect(read(file)).toContain(`:id: ${id}\n`);
        }
        for (const f of ['docs/userstories/us_actor.rst', 'docs/requirements/req_actor.rst', 'docs/design/spec_actor.rst']) {
            expect(read(f)).not.toMatch(/:id: (US|REQ|SPEC)_ACTOR_MAIL\n/);
        }
    });

    it('the flag journey validates US_ACTOR_MAIL and covers the six transitions', () => {
        const rst = read('docs/acceptance/ac_actor_mail.rst');
        const block = rst.slice(rst.indexOf(':id: AC_ACTOR_MAIL_FLAG_JOURNEY'));
        expect(block).toContain(':validates: US_ACTOR_MAIL');
        expect(block.match(/^\s+[1-6]\. \*\*When\*\*/gm)).toHaveLength(6);
        expect(block).toContain('no Actor shows a mail icon or a flag icon');
    });

    it('PIM guide and README describe the flag and mail icons and the need for PIM', () => {
        const guide = read('docs/user guides/pim.md');
        const section = guide.slice(guide.indexOf('## Mail indicators on Actors'), guide.indexOf('## Configuration'));
        expect(section).toMatch(/flag/i);
        expect(section).toMatch(/unread/i);
        expect(section).toMatch(/Outlook/);
        expect(read('packages/pim/README.md')).toMatch(/flag/i);
    });

    it('Core user documents no longer present the mail icon as Core\'s own', () => {
        for (const f of ['docs/user guides/core.md', 'packages/core/README.md']) {
            expect(read(f), f).toMatch(/PIM/);
            expect(read(f), f).not.toMatch(/followed by the mail icon/i);
        }
    });

    it('no Need in docs is draft, open or deprecated', () => {
        const dir = path.join(root, 'docs');
        const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
            e.isDirectory() ? (['_build', 'changes'].includes(e.name) ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.rst') ? [path.join(d, e.name)] : []);
        for (const f of walk(dir)) {
            expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/^\s+:status: (draft|open|deprecated)\s*$/m);
        }
    });
});
