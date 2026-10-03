/**
 * QM F-3 (SPEC_REC_ENGINE AC-10): the EMITTED worker loads an ESM-only SDK in every supported build path.
 * QM F-4 (SPEC_MOD_REC_PKG AC-6): the package holds no output of removed sources.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, execSync, fork } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const root = path.resolve(__dirname, '../..');
const pkgDir = path.join(root, 'packages', 'recorder');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-worker-'));
afterAll(() => fs.rmSync(work, { recursive: true, force: true }));

// A minimal ESM-only SDK: package.json "type": "module", exports only "import", like foundry-local-sdk 2.1.0.
function writeFakeSdk(dir: string): void {
    fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fake-sdk', version: '0.0.0', type: 'module', exports: { '.': { import: './dist/index.js' } } }));
    fs.writeFileSync(path.join(dir, 'dist', 'index.js'), `
export const CatalogType = { Local: 1 };
export class FoundryLocalManager {
  static create(cfg) { return new FoundryLocalManager(cfg); }
  getCatalog() { return { getModelVariant: async () => { throw new Error('not registered'); }, registerModel: async () => ({ load: async () => {} }) }; }
  dispose() {}
}
export class MutableModelInfo { setStringProperty() { return this; } }
export class AudioSession {
  processStreamingRequest() {
    return { async *[Symbol.asyncIterator]() { yield { type: 'speechSegment', kind: 'none', text: ' hello' }; },
             response: Promise.resolve({ output: [{ type: 'speechResult', text: ' hello' }] }) };
  }
  dispose() {}
}
export class ItemQueue { push() {} markFinished() {} dispose() {} }
export class Request { addItem() { return this; } setOptions() { return this; } }
export const Item = { audioDescriptor: () => ({}), bytes: d => ({ d }) };
`);
}

function runWorker(workerFile: string, sdkDir: string): Promise<{ messages: { t: string; [k: string]: unknown }[]; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
        const child = fork(workerFile, [], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, serialization: 'advanced', stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
        const messages: { t: string; [k: string]: unknown }[] = [];
        const timer = setTimeout(() => { child.kill(); reject(new Error(`worker timed out; messages: ${JSON.stringify(messages)}`)); }, 20000);
        child.stdout?.resume(); child.stderr?.resume();
        child.on('message', (m: { t: string }) => {
            messages.push(m);
            if (m.t === 'ready') { child.send({ t: 'audio', data: new Uint8Array(8) }); child.send({ t: 'finish' }); }
        });
        child.on('exit', code => { clearTimeout(timer); resolve({ messages, exitCode: code }); });
        child.send({ t: 'init', sdkDir, modelDir: path.join(work, 'models'), language: 'auto' });
    });
}

describe('QM F-3: the emitted worker loads an ESM package and reaches ready (SPEC_REC_ENGINE AC-10)', () => {
    const sdkDir = path.join(work, 'sdk', '1.0.0');
    const tscOut = path.join(work, 'tsc');
    const bundleOut = path.join(work, 'bundle');

    beforeAll(() => {
        writeFakeSdk(sdkDir);
        // Plain compile of the package: the path that "compile all" takes.
        execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', pkgDir, '--outDir', tscOut], { stdio: 'pipe' });
        // Bundle: the path of vscode:prepublish.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('esbuild').buildSync({
            entryPoints: [path.join(pkgDir, 'src', 'engineWorker.ts')], bundle: true, outfile: path.join(bundleOut, 'engineWorker.js'),
            platform: 'node', format: 'cjs', target: 'node20', logLevel: 'silent',
        });
    }, 120000);

    for (const [name, dir] of [['plain tsc output', tscOut], ['esbuild bundle', bundleOut]] as const) {
        it(`${name}: loads the ESM SDK, reaches ready, forwards text and ends with final`, async () => {
            const file = path.join(dir, 'engineWorker.js');
            expect(fs.existsSync(file)).toBe(true);
            const { messages, exitCode } = await runWorker(file, sdkDir);
            expect(messages.find(m => m.t === 'error')).toBeUndefined();
            expect(messages.map(m => m.t)).toEqual(['ready', 'text', 'final']);
            expect(messages[1].delta).toBe(' hello');
            expect(exitCode).toBe(0);
        }, 40000);

        it(`${name}: contains no require() of the SDK`, () => {
            const text = fs.readFileSync(path.join(dir, 'engineWorker.js'), 'utf8');
            expect(text).not.toMatch(/require\([^)]*pathToFileURL|require\(\(0, [a-z_]*url[a-z_]*\.pathToFileURL\)/i);
        });
    }

    it('the worker reports a clear error for a missing SDK directory instead of hanging', async () => {
        const { messages, exitCode } = await runWorker(path.join(tscOut, 'engineWorker.js'), path.join(work, 'nope'));
        expect(messages.map(m => m.t)).toEqual(['error']);
        expect(exitCode).toBe(1);
    }, 40000);
});

describe('QM F-4: package content (SPEC_MOD_REC_PKG AC-6)', () => {
    function packageFiles(): string[] {
        const out = execSync('npx --no-install vsce ls --no-dependencies', { cwd: pkgDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        return out.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('npm '));
    }

    it('every packaged out/ file has a source in src/ and nothing names the retired pipeline', () => {
        const files = packageFiles();
        const sources = new Set(fs.readdirSync(path.join(pkgDir, 'src')).filter(f => f.endsWith('.ts')).map(f => f.replace(/\.ts$/, '')));
        for (const f of files.filter(f => f.startsWith('out/'))) {
            const base = f.slice('out/'.length).replace(/\.js(\.map)?$/, '');
            expect(sources.has(base), `${f} has no source file in src/`).toBe(true);
        }
        expect(files.join('\n')).not.toMatch(/recording\.js|whisper|recorder\.py/i);
        expect(files.filter(f => !f.startsWith('out/')).sort()).toEqual([
            'README.md', 'package.json', 'resources/capture.ps1', 'resources/components.json', 'resources/jarvis-128.png',
        ]);
    }, 120000);

    it('a build removes stale output of removed sources (clean before bundle)', () => {
        const stale = path.join(pkgDir, 'out', 'recording.js');
        fs.mkdirSync(path.dirname(stale), { recursive: true });
        fs.writeFileSync(stale, 'class RecordingManager {} // whisperPath');
        fs.writeFileSync(stale + '.map', '{}');
        execFileSync(process.execPath, ['build.js'], { cwd: pkgDir, stdio: 'pipe' });
        expect(fs.existsSync(stale)).toBe(false);
        expect(fs.existsSync(stale + '.map')).toBe(false);
        expect(fs.readdirSync(path.join(pkgDir, 'out')).filter(f => f.endsWith('.js')).sort()).toEqual(['engineWorker.js', 'extension.js']);
    }, 120000);

    it('the normal "compile all" path cleans the recorder output before tsc', () => {
        const tasks = fs.readFileSync(path.join(root, '.vscode', 'tasks.json'), 'utf8');
        const commands = [...tasks.matchAll(/"command":\s*"([^"]*packages\/recorder[^"]*)"/g)].map(m => m[1]);
        expect(commands.length).toBeGreaterThanOrEqual(3);
        for (const c of commands) { expect(c).toContain('node packages/recorder/clean.js && npx tsc -p packages/recorder'); }
        const scripts = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')).scripts;
        expect(scripts.compile).toBe('node clean.js && tsc -p ./');
    });
});
