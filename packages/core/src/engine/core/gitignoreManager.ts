// Implementation: SPEC_CFG_IGNOREMANAGER
// Requirements: REQ_CFG_IGNOREBLOCK, REQ_CFG_IGNOREAUTOMANAGE, REQ_CFG_IGNOREPATTERNS

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getIgnoreEntries } from './configPaths';

const BEGIN = '# BEGIN JARVIS MANAGED (see jarvis.gitignore.autoManage)';
const END = '# END JARVIS MANAGED';

type Region =
    | { kind: 'absent' }
    | { kind: 'found'; begin: number; end: number }
    | { kind: 'malformed'; reason: string };

export function locateRegion(lines: string[]): Region {
    const begins = lines.flatMap((l, i) => l.trim() === BEGIN ? [i] : []);
    const ends = lines.flatMap((l, i) => l.trim() === END ? [i] : []);
    if (begins.length === 0 && ends.length === 0) { return { kind: 'absent' }; }
    if (begins.length !== 1 || ends.length !== 1) {
        return { kind: 'malformed', reason: `${begins.length} begin / ${ends.length} end markers` };
    }
    if (ends[0] < begins[0]) {
        return { kind: 'malformed', reason: 'end marker precedes begin marker' };
    }
    return { kind: 'found', begin: begins[0], end: ends[0] };
}

export function detectEol(content: string | undefined): string {
    if (!content) { return '\n'; }
    const crlf = (content.match(/\r\n/g) || []).length;
    const lf = (content.match(/(?<!\r)\n/g) || []).length;
    return crlf > lf ? '\r\n' : '\n';
}

function withRegion(lines: string[], region: Region, entries: string[]): string[] {
    const body = [BEGIN, ...entries, END];
    if (region.kind === 'found') {
        return [...lines.slice(0, region.begin), ...body, ...lines.slice(region.end + 1)];
    }
    // absent — append with a blank separator if file is non-empty and doesn't end blank
    const result = [...lines];
    if (result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
    }
    result.push(...body);
    return result;
}

function withoutRegion(lines: string[], region: Region): string[] {
    if (region.kind !== 'found') { return lines; }
    return [...lines.slice(0, region.begin), ...lines.slice(region.end + 1)];
}

function workspaceRootIfGitRepo(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) { return undefined; }
    const root = folders[0].uri.fsPath;
    try {
        return fs.existsSync(path.join(root, '.git')) ? root : undefined;
    } catch {
        return undefined;
    }
}

let log: vscode.LogOutputChannel | undefined;

export function setIgnoreManagerLogger(logger: vscode.LogOutputChannel): void {
    log = logger;
}

export function applyGitignoreAt(root: string, managed: boolean): void {
    const file = path.join(root, '.gitignore');
    const existing = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;

    if (existing === undefined && !managed) { return; }

    const eol = detectEol(existing);
    const lines = existing === undefined ? [] : existing.split(/\r?\n/);
    const region = locateRegion(lines);

    if (region.kind === 'malformed') {
        log?.warn(`[Jarvis] .gitignore: ${region.reason} — managed block left untouched`);
        return;
    }

    const next = managed
        ? withRegion(lines, region, getIgnoreEntries())
        : withoutRegion(lines, region);

    const rendered = next.join(eol);
    if (rendered === existing) { return; }
    fs.writeFileSync(file, rendered, 'utf8');
}

export function applyGitignore(): void {
    try {
        const root = workspaceRootIfGitRepo();
        if (!root) { return; }

        const managed = vscode.workspace
            .getConfiguration('jarvis.gitignore')
            .get<boolean>('autoManage', true);

        applyGitignoreAt(root, managed);
    } catch (err) {
        log?.warn(`[Jarvis] .gitignore: failed to update: ${err}`);
    }
}
