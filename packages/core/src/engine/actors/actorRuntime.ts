import * as path from 'path';
import * as vscode from 'vscode';
import { ActorScanner } from './actorScanner';

export interface ActorEntity {
    id: string;
    name: string;
    summary?: string;
    agent?: string;
    kind?: string;
    folder: string;
}

export interface ActorEntitySource {
    readonly entities: ActorEntity[];
}

export function createActorEntitySource(
    legacySource: ActorEntitySource,
    actorScanner: ActorScanner,
): ActorEntitySource {
    return {
        get entities() {
            return [
                ...legacySource.entities,
                ...actorScanner.actors.map(actor => ({ ...actor, kind: 'actor' })),
            ];
        },
    };
}

export function createListActorsHandler(
    legacySource: ActorEntitySource,
    actorScanner: ActorScanner,
    log: Pick<vscode.LogOutputChannel, 'info'>,
): (options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken) => Promise<vscode.LanguageModelToolResult> {
    return async () => {
        const legacyActors = legacySource.entities
            .filter(entity => entity.kind === 'session')
            .map(entity => ({
                name: entity.name,
                summary: entity.summary ?? '',
                agent: entity.agent ?? '',
                folder: entity.folder,
            }));
        const actors = actorScanner.actors.map(actor => ({
            name: actor.name,
            summary: actor.summary,
            agent: actor.agent,
            folder: actor.folder,
            id: actor.id,
        }));
        const sessions = [...legacyActors, ...actors];
        log.info(`[SES] listActors: ${sessions.length} Actor(s)`);
        return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(JSON.stringify({ sessions }))
        ]);
    };
}

export type ActorIdentityResolution =
    | { kind: 'not-found' }
    | { kind: 'ambiguous'; paths: string[] }
    | { kind: 'found'; payload: { name: string; contextPath: string; id?: string } };

export function resolveActorIdentity(
    entityName: string,
    source: ActorEntitySource,
    actorScanner: ActorScanner,
): ActorIdentityResolution {
    const matches = source.entities.filter(entity => entity.name === entityName);
    if (matches.length === 0) { return { kind: 'not-found' }; }
    if (matches.length > 1) {
        return { kind: 'ambiguous', paths: matches.map(match => match.id) };
    }

    const entity = matches[0];
    const actor = actorScanner.getActor(entity.id);
    return {
        kind: 'found',
        payload: {
            name: entity.name,
            contextPath: path.join(entity.folder, 'context.md'),
            ...(actor ? { id: actor.id } : {}),
        },
    };
}