// Implementation: SPEC_OLK_COMBRIDGE
// Requirements: REQ_OLK_COMBRIDGE

import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { Category, ICategoryProvider } from '../pim/ICategoryProvider';

function escapePs(s: string): string {
    return s.replace(/'/g, "''");
}

function resolveColor(name: string, requestedColor: number): number {
    if (requestedColor !== 0) { return requestedColor; }
    const lower = name.toLowerCase();
    if (lower.includes('project')) { return 8; }   // olCategoryColorBlue
    if (lower.includes('event')) { return 10; }    // olCategoryColorPink
    return 0;                                       // olCategoryColorNone
}

function runPowerShell(script: string, log: vscode.LogOutputChannel): Promise<string> {
    return new Promise((resolve, reject) => {
        childProcess.execFile(
            'powershell',
            ['-NoProfile', '-Command', script],
            { timeout: 10000 },
            (error, stdout, stderr) => {
                if (error) {
                    log.error(`[Outlook] PowerShell error: ${error.message}`);
                    reject(error);
                    return;
                }
                if (stderr) {
                    log.warn(`[Outlook] PowerShell stderr: ${stderr}`);
                }
                resolve(stdout);
            }
        );
    });
}

export class OutlookCategoryProvider implements ICategoryProvider {
    readonly source = 'outlook';

    constructor(private _log: vscode.LogOutputChannel) {}

    async getCategories(): Promise<Category[]> {
        if (process.platform !== 'win32') {
            return [];
        }
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$cats = $ns.Categories
$result = @()
foreach ($c in $cats) {
    $result += [PSCustomObject]@{
        Id    = $c.CategoryID
        Name  = $c.Name
        Color = [int]$c.Color
    }
}
$result | ConvertTo-Json -Compress`;
        const output = await runPowerShell(script, this._log);
        const trimmed = output.trim();
        if (!trimmed || trimmed === 'null') {
            return [];
        }
        const raw = JSON.parse(trimmed);
        const items: Array<{ Id: unknown; Name: unknown; Color: unknown }> = Array.isArray(raw) ? raw : [raw];
        return items.map(item => ({
            id: String(item.Id),
            name: String(item.Name),
            color: Number(item.Color),
            source: this.source
        }));
    }

    async setCategory(name: string, color: number): Promise<void> {
        if (process.platform !== 'win32') {
            throw new Error('Windows + Outlook Classic required');
        }
        const resolvedColor = resolveColor(name, color);
        const safeName = escapePs(name);
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$existing = $ns.Categories | Where-Object { $_.Name -eq '${safeName}' }
if ($existing) {
    $existing.Color = ${resolvedColor}
} else {
    $ns.Categories.Add('${safeName}', ${resolvedColor})
}`;
        await runPowerShell(script, this._log);
    }

    async deleteCategory(name: string): Promise<void> {
        if (process.platform !== 'win32') {
            throw new Error('Windows + Outlook Classic required');
        }
        const safeNameOrId = escapePs(name);
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$cat = $ns.Categories | Where-Object {
    $_.CategoryID -eq '${safeNameOrId}' -or $_.Name -eq '${safeNameOrId}'
} | Select-Object -First 1
if ($cat) { $ns.Categories.Remove($cat.CategoryID) }`;
        await runPowerShell(script, this._log);
    }

    async renameCategory(oldName: string, newName: string): Promise<void> {
        if (process.platform !== 'win32') {
            throw new Error('Windows + Outlook Classic required');
        }
        const safeOldNameOrId = escapePs(oldName);
        const safeNewName = escapePs(newName);
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$cat = $ns.Categories | Where-Object {
    $_.CategoryID -eq '${safeOldNameOrId}' -or $_.Name -eq '${safeOldNameOrId}'
} | Select-Object -First 1
if ($cat) {
    $color = [int]$cat.Color
    $ns.Categories.Remove($cat.CategoryID)
    $ns.Categories.Add('${safeNewName}', $color)
}`;
        await runPowerShell(script, this._log);
    }
}
