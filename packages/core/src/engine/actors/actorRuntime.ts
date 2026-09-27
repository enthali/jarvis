// Implementation: SPEC_ACTOR_LISTTOOL, SPEC_ACTOR_CREATETOOL
// Requirements: REQ_ACTOR_LISTTOOL, REQ_ACTOR_CREATETOOL

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ActorScanner } from './actorScanner';
import { existingActorFolder, validateActorName, writeActorFiles } from './actorCreation';
import { getWorkspaceRoot } from '../core/configPaths';

/** Workspace-relative, forward-slash path (REQ_ACTOR_CREATETOOL AC-2/AC-7). Absolute when no workspace root is resolvable. */
function toWorkspaceRelative(absPath: string): string {
    const root = getWorkspaceRoot();
    if (!root) { return absPath; }
    return path.relative(root, absPath).split(path.sep).join('/');
}

/** SPEC_ACTOR_LISTTOOL: pure projection of the Actor scanner, key `actors`. */
export function createListActorsHandler(
    actorScanner: ActorScanner,
    log: Pick<vscode.LogOutputChannel, 'info'>,
): (options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken) => Promise<vscode.LanguageModelToolResult> {
    return async () => {
        const actors = actorScanner.actors.map(actor => ({
            name: actor.name,
            summary: actor.summary,
            agent: actor.agent,
            folder: actor.folder,
            id: actor.id,
        }));
        log.info(`[ACTOR] listActors: ${actors.length} Actor(s)`);
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({ actors }))
        ]);
    };
}

export interface CreateActorHandlerDependencies {
    resolveActorsFolder(): string | undefined;
    discoverAgentModes(): Promise<{ name: string }[]>;
    appendMessage(actorName: string, sender: string, text: string): void;
    reloadMessages(): void;
    actorScanner: ActorScanner;
    /** Opens the session for a freshly created Actor; failures are non-fatal. */
    openActorSession(actorName: string): Promise<void>;
    /** Whether jarvis.actors.openSessionOnCreate is enabled. */
    openSessionOnCreate(): boolean;
    log: Pick<vscode.LogOutputChannel, 'info' | 'warn'>;
}

/** SPEC_ACTOR_CREATETOOL: shared with `jarvis.newActor` via actorCreation.ts. */
export function createActorHandler(
    deps: CreateActorHandlerDependencies,
): (options: vscode.LanguageModelToolInvocationOptions<any>, token: vscode.CancellationToken) => Promise<vscode.LanguageModelToolResult> {
    return async (options) => {
        const { name, summary, agent, initialMessage } = options.input as {
            name: string; summary?: string; agent?: string; initialMessage?: string;
        };

        validateActorName(name);

        if (agent) {
            const available = await deps.discoverAgentModes();
            const validNames = available.map(a => a.name);
            if (!validNames.includes(agent)) {
                const names = validNames.length > 0 ? [...validNames].sort().join(', ') : '(none)';
                throw new Error(`Agent "${agent}" is not available.\nAvailable agents: ${names}`);
            }
        }

        const actorsFolder = deps.resolveActorsFolder();
        if (!actorsFolder) { throw new Error('jarvis_createActor: no workspace open'); }
        await fs.promises.mkdir(actorsFolder, { recursive: true });

        // REQ_ACTOR_CREATETOOL AC-7: rescan and refuse a name already carried by any Actor,
        // not only an existing target folder (REQ_ACTOR_SCHEMA AC-7).
        const blockingFolder = await existingActorFolder(actorsFolder, name, deps.actorScanner);
        if (blockingFolder) {
            deps.log.info(`[ACTOR] createActor: idempotent skip for "${name}"`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({
                    created: false,
                    reason: `actor "${name}" already exists; no action taken`,
                    path: toWorkspaceRelative(blockingFolder),
                }))
            ]);
        }

        const targetPath = await writeActorFiles(actorsFolder, { name, summary, agent });

        if (initialMessage) {
            deps.appendMessage(name, 'jarvis_createActor', initialMessage);
            deps.reloadMessages();
        }

        await deps.actorScanner.rescan();

        if (deps.openSessionOnCreate()) {
            try {
                await deps.openActorSession(name);
            } catch (err) {
                deps.log.warn(`[ACTOR] createActor: auto-open failed for "${name}": ${err}`);
            }
        }

        deps.log.info(`[ACTOR] createActor: created "${name}" at ${targetPath}`);
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({ created: true, path: toWorkspaceRelative(targetPath) }))
        ]);
    };
}
