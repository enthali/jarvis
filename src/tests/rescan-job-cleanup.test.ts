/**
 * Focused test for the REQ_CFG_SCANINTERVAL AC-5 startup cleanup: a
 * "Jarvis: Rescan" job left over from an earlier version's heartbeat-job-
 * based rescan is removed once the heartbeat feature starts (superseded by
 * ActorScanner's own timer, SPEC_ACTOR_SCANNER).
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as vscodeMock from 'vscode';
import { HeartbeatScheduler } from '../../packages/core/src/apps/session/heartbeat';

const extensionSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'core', 'src', 'extension.ts'), 'utf-8'
);

const roots: string[] = [];

afterEach(() => {
    for (const root of roots.splice(0)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
});

function writeHeartbeatYaml(root: string, jobs: { name: string }[]): string {
    const heartbeatDir = path.join(root, '.jarvis');
    fs.mkdirSync(heartbeatDir, { recursive: true });
    const configPath = path.join(heartbeatDir, 'heartbeat.yaml');
    fs.writeFileSync(configPath, yaml.dump({ jobs }), 'utf8');
    return configPath;
}

describe('REQ_CFG_SCANINTERVAL AC-5: legacy "Jarvis: Rescan" job cleanup', () => {
    it('unregisterJob removes a leftover "Jarvis: Rescan" job from heartbeat.yaml', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-rescan-cleanup-'));
        roots.push(root);
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const configPath = writeHeartbeatYaml(root, [
            { name: 'Jarvis: Rescan' },
            { name: 'Some Other Job' },
        ]);

        const scheduler = new HeartbeatScheduler();
        await scheduler.unregisterJob('Jarvis: Rescan');

        const data = yaml.load(fs.readFileSync(configPath, 'utf8')) as { jobs: { name: string }[] };
        expect(data.jobs.map(j => j.name)).toEqual(['Some Other Job']);
    });

    it('is a no-op when no "Jarvis: Rescan" job is present', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-rescan-cleanup-'));
        roots.push(root);
        (vscodeMock.workspace as any).workspaceFolders = [{ uri: { fsPath: root } }];
        const configPath = writeHeartbeatYaml(root, [{ name: 'Some Other Job' }]);

        const scheduler = new HeartbeatScheduler();
        await scheduler.unregisterJob('Jarvis: Rescan');

        const data = yaml.load(fs.readFileSync(configPath, 'utf8')) as { jobs: { name: string }[] };
        expect(data.jobs.map(j => j.name)).toEqual(['Some Other Job']);
    });
});

describe('REQ_CFG_SCANINTERVAL AC-5: activation wiring actually calls unregisterJob', () => {
    it('extension.ts calls scheduler.unregisterJob("Jarvis: Rescan") right after activateHeartbeat()', () => {
        // A direct scheduler-method test (above) cannot catch this call site being
        // removed from activation, since it constructs HeartbeatScheduler itself.
        const heartbeatBlockStart = extensionSrc.indexOf("scheduler = activateHeartbeat(");
        expect(heartbeatBlockStart).toBeGreaterThan(-1);
        const blockEnd = extensionSrc.indexOf('} else {', heartbeatBlockStart);
        const block = extensionSrc.slice(heartbeatBlockStart, blockEnd);
        expect(block).toContain("scheduler.unregisterJob('Jarvis: Rescan')");
    });
});
