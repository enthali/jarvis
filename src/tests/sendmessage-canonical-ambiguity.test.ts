/**
 * Unit tests for the canonical jarvis_sendMessage LM/MCP handler
 * (SPEC_MSG_SENDMESSAGE, REQ_ACTOR_SCHEMA AC-7): destination and sender
 * resolution route through ActorScanner.resolveName(); an ambiguous name
 * shows `Jarvis: <ambiguousActorMessage>` and throws without queuing; an
 * unknown name throws a distinct, non-notifying "does not exist" error.
 *
 * The handler is a private closure inside extension.ts's activate() (not
 * exported), so this test combines the established static-source-assertion
 * pattern (see newactor-creation-flow.test.ts) with a behavioral
 * replication against the real ActorScanner + ambiguousActorMessage (see
 * kanban-owner-ambiguity.test.ts), confirming both the exact code shape and
 * its runtime behavior.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { ActorScanner, ambiguousActorMessage } from '../../packages/core/src/engine/actors/actorScanner';
import { getValidDestinations } from '../../packages/core/src/engine/sessions/sessionLookup';

const extensionSrc = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'packages', 'core', 'src', 'extension.ts'), 'utf-8'
);

function sendMessageHandlerBody(): string {
    const start = extensionSrc.indexOf("engine.registerTool('jarvis_sendMessage'");
    const end = extensionSrc.indexOf('// readMessage', start);
    return extensionSrc.slice(start, end);
}

describe('SPEC_MSG_SENDMESSAGE: canonical handler routes through resolveName', () => {
    it('resolves destination and sender via actorScanner.resolveName, not plain membership', () => {
        const body = sendMessageHandlerBody();
        expect(body).toContain('actorScanner.resolveName(session)');
        expect(body).toContain('actorScanner.resolveName(senderSession)');
        expect(body).not.toContain('validNames.includes(session)');
        expect(body).not.toContain('validNames.includes(senderSession)');
    });

    it('shows the ambiguity notification and throws for both destination and sender', () => {
        const body = sendMessageHandlerBody();
        const occurrences = body.match(/void vscode\.window\.showErrorMessage\(`Jarvis: \$\{msg\}`\)/g);
        expect(occurrences).not.toBeNull();
        expect(occurrences!.length).toBe(2);
        expect(body).toContain('ambiguousActorMessage(session, dest.matches)');
        expect(body).toContain('ambiguousActorMessage(senderSession, sender.matches)');
    });

    it('keeps a distinct, non-notifying error for an unknown name', () => {
        const body = sendMessageHandlerBody();
        expect(body).toContain('Destination session "${session}" does not exist.');
        expect(body).toContain('Sender session "${senderSession}" does not exist.');
    });
});

describe('SPEC_MSG_SENDMESSAGE: behavioral replication against a real ActorScanner', () => {
    const roots: string[] = [];
    afterEach(() => {
        for (const root of roots.splice(0)) { fs.rmSync(root, { recursive: true, force: true }); }
        vi.restoreAllMocks();
    });

    function writeActor(root: string, folderName: string, name: string): void {
        const folder = path.join(root, folderName);
        fs.mkdirSync(folder, { recursive: true });
        fs.writeFileSync(path.join(folder, 'actor.yaml'), `name: "${name}"\n`);
    }

    // Mirrors the handler's validation order/shape confirmed by source assertions above.
    async function sendMessage(actorScanner: ActorScanner, session: string, senderSession: string): Promise<{ queued: boolean }> {
        const validNames = getValidDestinations(actorScanner);
        const sortedNames = () => (validNames.length > 0 ? [...validNames].sort().join(', ') : '(none)');

        const dest = actorScanner.resolveName(session);
        if (dest.status === 'ambiguous') {
            const msg = ambiguousActorMessage(session, dest.matches);
            void vscode.window.showErrorMessage(`Jarvis: ${msg}`);
            throw new Error(msg);
        }
        if (dest.status === 'unknown') {
            throw new Error(`Destination session "${session}" does not exist.\nValid destinations: ${sortedNames()}`);
        }

        if (!senderSession || String(senderSession).trim() === '') {
            throw new Error('senderSession is required.');
        }
        const sender = actorScanner.resolveName(senderSession);
        if (sender.status === 'ambiguous') {
            const msg = ambiguousActorMessage(senderSession, sender.matches);
            void vscode.window.showErrorMessage(`Jarvis: ${msg}`);
            throw new Error(msg);
        }
        if (sender.status === 'unknown') {
            throw new Error(`Sender session "${senderSession}" does not exist.\nValid senders: ${sortedNames()}`);
        }

        return { queued: true };
    }

    it('ambiguous destination: notifies and throws, never reaching sender validation', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-canon-'));
        roots.push(root);
        writeActor(root, 'Dup1', 'Shared Name');
        writeActor(root, 'Dup2', 'Shared Name');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();
        const notifySpy = vi.spyOn(vscode.window, 'showErrorMessage');

        await expect(sendMessage(scanner, 'Shared Name', 'anything')).rejects.toThrow(/ambiguous/);
        expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('Jarvis: Actor name "Shared Name" is ambiguous'));
    });

    it('unknown destination: throws a distinct error without notifying', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-canon-'));
        roots.push(root);
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();
        const notifySpy = vi.spyOn(vscode.window, 'showErrorMessage');

        await expect(sendMessage(scanner, 'No Such Actor', 'anything')).rejects.toThrow(/does not exist/);
        expect(notifySpy).not.toHaveBeenCalled();
    });

    it('ambiguous sender: notifies and throws after destination passes', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-canon-'));
        roots.push(root);
        writeActor(root, 'Target', 'Target Actor');
        writeActor(root, 'Dup1', 'Shared Sender');
        writeActor(root, 'Dup2', 'Shared Sender');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();
        const notifySpy = vi.spyOn(vscode.window, 'showErrorMessage');

        await expect(sendMessage(scanner, 'Target Actor', 'Shared Sender')).rejects.toThrow(/ambiguous/);
        expect(notifySpy).toHaveBeenCalledWith(expect.stringContaining('Jarvis: Actor name "Shared Sender" is ambiguous'));
    });

    it('unknown sender: throws a distinct error without notifying', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-canon-'));
        roots.push(root);
        writeActor(root, 'Target', 'Target Actor');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();
        const notifySpy = vi.spyOn(vscode.window, 'showErrorMessage');

        await expect(sendMessage(scanner, 'Target Actor', 'No Such Sender')).rejects.toThrow(/does not exist/);
        expect(notifySpy).not.toHaveBeenCalled();
    });

    it('both valid: resolves without throwing or notifying', async () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-sendmsg-canon-'));
        roots.push(root);
        writeActor(root, 'Target', 'Target Actor');
        writeActor(root, 'Sender', 'Sender Actor');
        const scanner = new ActorScanner(() => root, () => {});
        await scanner.rescan();
        const notifySpy = vi.spyOn(vscode.window, 'showErrorMessage');

        await expect(sendMessage(scanner, 'Target Actor', 'Sender Actor')).resolves.toEqual({ queued: true });
        expect(notifySpy).not.toHaveBeenCalled();
    });
});
