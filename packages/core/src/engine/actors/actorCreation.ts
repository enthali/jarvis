// Implementation: SPEC_ACTOR_CREATE
// Requirements: REQ_ACTOR_CREATE

import * as fs from 'fs';
import * as path from 'path';
import type { ActorScanner } from './actorScanner';

const INVALID_PATH_CHARS = /[/\\:*?"<>|]/;
const CONTROL_CHARS = /[\x00-\x1F]/;
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/** Throws `"invalid actor name: <reason>"` when the name is unusable as a folder name. */
export function validateActorName(name: string): void {
    const trimmed = (name ?? '').trim();
    if (!trimmed) { throw new Error('invalid actor name: name must not be empty'); }
    if (/^\.+$/.test(trimmed)) { throw new Error('invalid actor name: must not consist only of dots'); }
    if (INVALID_PATH_CHARS.test(trimmed)) { throw new Error('invalid actor name: contains forbidden character (/ \\ : * ? " < > |)'); }
    if (CONTROL_CHARS.test(trimmed)) { throw new Error('invalid actor name: contains null or control character'); }
    if (WINDOWS_RESERVED.test(trimmed)) { throw new Error(`invalid actor name: "${trimmed}" is a reserved Windows device name`); }
}

/** InputBox validator wrapper — returns an error string, or null when valid. */
export function actorNameProblem(name: string): string | null {
    try {
        validateActorName(name);
        return null;
    } catch (err) {
        return err instanceof Error ? err.message : String(err);
    }
}

function yamlString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Throws `"invalid actor summary: <reason>"` for a missing, empty or white-space-only value (REQ_ACTOR_CREATETOOL AC-10). */
export function validateActorSummary(summary: unknown): void {
    if (typeof summary !== 'string' || !summary.trim()) {
        throw new Error('invalid actor summary: summary must not be empty');
    }
}

/** Same rule as validateActorSummary, as the message for an InputBox validator. */
export function actorSummaryProblem(summary: string): string | undefined {
    try {
        validateActorSummary(summary);
        return undefined;
    } catch (err) {
        return err instanceof Error ? err.message : String(err);
    }
}

export interface ModelChoice { vendor: string; model: string }

/**
 * REQ_ACTOR_CREATETOOL AC-11. The catalog is injected so the engine does not import the apps layer.
 * A model that is not listed (also in an empty list) and a catalog that cannot be read are different errors.
 */
export async function validateModel(model: string, listModels: () => Promise<ModelChoice[]>): Promise<void> {
    let available: ModelChoice[];
    try {
        available = await listModels();
    } catch {
        throw new Error('jarvis_createActor: model catalog not available');
    }
    if (available.some(entry => entry.model === model)) { return; }
    const list = available.length > 0
        ? '\n' + available.map(entry => `vendor="${entry.vendor}" model="${entry.model}"`).join('\n')
        : ' (none)';
    throw new Error(`model not available: "${model}"\nAvailable:${list}`);
}

export interface WriteActorFilesArgs {
    name: string;
    summary: string;
}

/** Writes actor.yaml (name, summary) and context.md into a new Actor folder; callers have validated the summary. */
export async function writeActorFiles(actorsFolder: string, args: WriteActorFilesArgs): Promise<string> {
    const targetFolder = path.join(actorsFolder, args.name);
    await fs.promises.mkdir(targetFolder, { recursive: true });
    const yamlLines = [
        `name: ${yamlString(args.name)}`,
        `summary: ${yamlString(args.summary)}`,
        '',
    ];
    await fs.promises.writeFile(path.join(targetFolder, 'actor.yaml'), yamlLines.join('\n'), 'utf8');
    await fs.promises.writeFile(path.join(targetFolder, 'context.md'), `# ${args.name}\n\n${args.summary}\n`, 'utf8');
    return targetFolder;
}

/**
 * Rescans, then returns the folder that blocks creating `name`, or undefined:
 * `<actorsFolder>/<name>` when it exists on disk (with or without actor.yaml),
 * otherwise the folder of an Actor whose name is `name` (any resolveName
 * result other than 'unknown'; for 'ambiguous' the first match).
 */
export async function existingActorFolder(actorsFolder: string, name: string, scanner: ActorScanner): Promise<string | undefined> {
    await scanner.rescan();
    const targetPath = path.join(actorsFolder, name);
    if (fs.existsSync(targetPath)) { return targetPath; }
    const lookup = scanner.resolveName(name);
    if (lookup.status === 'found') { return lookup.actor.folder; }
    if (lookup.status === 'ambiguous') { return lookup.matches[0].folder; }
    return undefined;
}
