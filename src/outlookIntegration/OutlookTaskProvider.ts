// Implementation: SPEC_OLK_TASKPROVIDER
// Requirements: REQ_OLK_TASKPROVIDER

import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { Task, ITaskProvider, TaskStatus, TaskPriority } from '../pim/ITaskProvider';

function escapePs(s: string): string {
    return s.replace(/'/g, "''");
}

function runPowerShell(script: string, log: vscode.LogOutputChannel): Promise<string> {
    return new Promise((resolve, reject) => {
        childProcess.execFile(
            'powershell',
            ['-NoProfile', '-Command', script],
            { timeout: 15000 },
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

function mapStatus(outlookStatus: number): TaskStatus {
    switch (outlookStatus) {
        case 0:  return 'notStarted';
        case 1:  return 'inProgress';
        case 2:  return 'completed';
        case 3:  return 'waitingOnOther';
        case 4:  return 'deferred';
        default: return 'notStarted';
    }
}

function mapStatusToOutlook(status: TaskStatus): number {
    switch (status) {
        case 'notStarted':     return 0;
        case 'inProgress':     return 1;
        case 'completed':      return 2;
        case 'waitingOnOther': return 3;
        case 'deferred':       return 4;
    }
}

function mapPriority(outlookImportance: number): TaskPriority {
    switch (outlookImportance) {
        case 0:  return 'low';
        case 1:  return 'normal';
        case 2:  return 'high';
        default: return 'normal';
    }
}

function mapPriorityToOutlook(priority: TaskPriority): number {
    switch (priority) {
        case 'low':    return 0;
        case 'normal': return 1;
        case 'high':   return 2;
    }
}

function buildPatchStatements(changes: Partial<Task>): string {
    const lines: string[] = [];
    // completedDate is never written
    if (changes.subject !== undefined) {
        lines.push(`$task.Subject = '${escapePs(changes.subject)}'`);
    }
    if (changes.dueDate !== undefined) {
        if (changes.dueDate === '') {
            // Clear due date — set to Outlook's "none" sentinel (year 4501)
            lines.push(`$task.DueDate = [DateTime]::MaxValue`);
        } else {
            lines.push(`$task.DueDate = [DateTime]::Parse('${escapePs(changes.dueDate)}')`);
        }
    }
    if (changes.status !== undefined) {
        lines.push(`$task.Status = ${mapStatusToOutlook(changes.status)}`);
    }
    if (changes.priority !== undefined) {
        lines.push(`$task.Importance = ${mapPriorityToOutlook(changes.priority)}`);
    }
    if (changes.isComplete !== undefined) {
        lines.push(`$task.Complete = $${changes.isComplete ? 'true' : 'false'}`);
    }
    if (changes.body !== undefined) {
        lines.push(`$task.Body = '${escapePs(changes.body)}'`);
    }
    if (changes.categories !== undefined) {
        const catStr = escapePs((changes.categories as string[]).join(', '));
        lines.push(`$task.Categories = '${catStr}'`);
    }
    if (lines.length > 0) {
        lines.push('$task.Save()');
    }
    return lines.join('\n');
}

export class OutlookTaskProvider implements ITaskProvider {
    readonly source = 'outlook';

    constructor(private _log: vscode.LogOutputChannel) {}

    async getTasks(): Promise<Task[]> {
        if (process.platform !== 'win32') {
            return [];
        }
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$tasks = $ns.GetDefaultFolder(13).Items
$result = @()
foreach ($t in $tasks) {
    $due = if ($t.DueDate -and $t.DueDate.Year -ne 4501) {
        $t.DueDate.ToString('yyyy-MM-dd')
    } else { $null }
    $completed = if ($t.DateCompleted -and $t.Complete) {
        $t.DateCompleted.ToString('yyyy-MM-dd')
    } else { $null }
    $result += [PSCustomObject]@{
        Id            = $t.EntryID
        Subject       = $t.Subject
        DueDate       = $due
        Status        = [int]$t.Status
        Priority      = [int]$t.Importance
        IsComplete    = [bool]$t.Complete
        CompletedDate = $completed
        Categories    = $t.Categories
        Body          = $t.Body
    }
}
$result | ConvertTo-Json -Compress`;
        const output = await runPowerShell(script, this._log);
        const trimmed = output.trim();
        if (!trimmed || trimmed === 'null') {
            return [];
        }
        // PowerShell ConvertTo-Json does not escape all control characters;
        // strip U+0000–U+001F except tab (\x09), LF (\x0A), CR (\x0D)
        const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
        const raw = JSON.parse(sanitized);
        const items: Array<{
            Id: unknown; Subject: unknown; DueDate: unknown;
            Status: unknown; Priority: unknown; IsComplete: unknown;
            CompletedDate: unknown; Categories: unknown; Body: unknown;
        }> = Array.isArray(raw) ? raw : [raw];

        const tasks = items.map(item => ({
            id: String(item.Id),
            subject: String(item.Subject ?? ''),
            dueDate: item.DueDate ? String(item.DueDate) : undefined,
            status: mapStatus(Number(item.Status)),
            priority: mapPriority(Number(item.Priority)),
            isComplete: Boolean(item.IsComplete),
            completedDate: item.CompletedDate ? String(item.CompletedDate) : undefined,
            categories: item.Categories
                ? String(item.Categories).split(', ').filter(c => c.trim().length > 0)
                : [],
            source: this.source,
            body: item.Body ? String(item.Body) : ''
        }));
        this._log.info(`[Outlook] getTasks: ${tasks.length} tasks loaded`);
        tasks.forEach(t => this._log.debug(
            `[Outlook] task: "${t.subject}" categories=[${t.categories.join(', ')}] isComplete=${t.isComplete}`
        ));
        return tasks;
    }

    async setTask(task: Partial<Task>): Promise<Task> {
        if (process.platform !== 'win32') {
            throw new Error('Windows + Outlook Classic required');
        }
        const patchStatements = buildPatchStatements(task);
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$task = $ol.CreateItem(3)
${patchStatements}
$id = $task.EntryID
Write-Output $id`;
        const output = await runPowerShell(script, this._log);
        const id = output.trim();
        // Return a Task object representing the newly created task
        return {
            id,
            subject: String(task.subject ?? ''),
            dueDate: task.dueDate,
            status: task.status ?? 'notStarted',
            priority: task.priority ?? 'normal',
            isComplete: task.isComplete ?? false,
            categories: task.categories ?? [],
            source: this.source
        };
    }

    async modifyTask(id: string, changes: Partial<Task>): Promise<void> {
        if (process.platform !== 'win32') {
            throw new Error('Windows + Outlook Classic required');
        }
        const safeId = escapePs(id);
        const patchStatements = buildPatchStatements(changes);
        if (!patchStatements) {
            this._log.info('[Outlook] modifyTask: no changes to apply');
            return;
        }
        this._log.info(`[Outlook] modifyTask: applying changes: ${JSON.stringify(Object.keys(changes))}`);
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$task = $ns.GetItemFromID('${safeId}')
${patchStatements}`;
        await runPowerShell(script, this._log);
        this._log.info('[Outlook] modifyTask: done');
    }

    async deleteTask(id: string): Promise<void> {
        if (process.platform !== 'win32') {
            throw new Error('Windows + Outlook Classic required');
        }
        const safeId = escapePs(id);
        const script = `
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$task = $ns.GetItemFromID('${safeId}')
if ($task) { $task.Delete() }`;
        await runPowerShell(script, this._log);
    }
}
