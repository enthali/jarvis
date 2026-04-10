// Implementation: SPEC_AUT_JOBSCHEMA, SPEC_AUT_SCHEDULERLOOP, SPEC_AUT_EXECUTOR,
//                 SPEC_AUT_MANUALCOMMAND, SPEC_AUT_STATUSBARITEM, SPEC_AUT_OUTPUTCHANNEL,
//                 SPEC_AUT_AGENTEXEC, SPEC_AUT_QUEUEEXEC, SPEC_CFG_HEARTBEATSETTINGS,
//                 SPEC_AUT_JOBREG
// Requirements:   REQ_AUT_JOBCONFIG, REQ_AUT_SCHEDULER, REQ_AUT_JOBEXEC,
//                 REQ_AUT_MANUALRUN, REQ_AUT_STATUSBAR, REQ_AUT_OUTPUT,
//                 REQ_CFG_HEARTBEATPATH, REQ_CFG_HEARTBEATINTERVAL, REQ_MSG_QUEUE,
//                 REQ_AUT_JOBREG

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { appendMessage } from './messageQueue';
import { MessageTreeProvider } from './messageTreeProvider';
import { HeartbeatTreeProvider, JobNode } from './heartbeatTreeProvider';

// ---------------------------------------------------------------------------
// Types (SPEC_AUT_JOBSCHEMA)
// ---------------------------------------------------------------------------

export interface HeartbeatStep {
    type: 'python' | 'powershell' | 'command' | 'agent' | 'queue';
    run?: string;         // script path or VS Code command ID (omitted for agent/queue)
    prompt?: string;      // agent: path to prompt file
    outputFile?: string;  // agent: path to write LLM response
    append?: boolean;     // agent: append to outputFile instead of overwrite
    destination?: string; // queue: target chat tab label
    sender?: string;      // queue: originating session or component
    text?: string;        // queue: message content
}

export interface HeartbeatJob {
    name: string;
    schedule: string; // 5-field cron string or "manual"
    steps: HeartbeatStep[];
}

interface ExecResult {
    success: boolean;
    stepType?: HeartbeatStep['type'];
    error?: string;
}

// ---------------------------------------------------------------------------
// Job loader (SPEC_AUT_JOBSCHEMA)
// ---------------------------------------------------------------------------

export function loadJobs(filePath: string, outputChannel: vscode.LogOutputChannel): HeartbeatJob[] {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(raw) as { jobs: HeartbeatJob[] };
        return data?.jobs ?? [];
    } catch (e) {
        outputChannel.warn(`[Heartbeat] Failed to load config: ${e}`);
        return [];
    }
}

// ---------------------------------------------------------------------------
// Config path resolution (SPEC_CFG_HEARTBEATSETTINGS)
// ---------------------------------------------------------------------------

function resolveConfigPath(context: vscode.ExtensionContext): string {
    const override = vscode.workspace
        .getConfiguration('jarvis')
        .get<string>('heartbeatConfigFile', '');
    if (override) {
        return override;
    }
    return vscode.Uri.joinPath(context.storageUri!, 'heartbeat.yaml').fsPath;
}

// ---------------------------------------------------------------------------
// Cron micro-matcher (SPEC_AUT_SCHEDULERLOOP)
// ---------------------------------------------------------------------------

function matchesCronField(field: string, value: number): boolean {
    if (field === '*') { return true; }
    if (field.startsWith('*/')) { return value % parseInt(field.slice(2)) === 0; }
    if (field.includes('-')) {
        const [a, b] = field.split('-').map(Number);
        return value >= a && value <= b;
    }
    if (field.includes(',')) {
        return field.split(',').map(Number).includes(value);
    }
    return parseInt(field) === value;
}

function matchesCron(expr: string, now: Date): boolean {
    const [min, hour, dom, month, dow] = expr.split(' ');
    return matchesCronField(min,   now.getMinutes())
        && matchesCronField(hour,  now.getHours())
        && matchesCronField(dom,   now.getDate())
        && matchesCronField(month, now.getMonth() + 1)
        && matchesCronField(dow,   now.getDay());
}

// ---------------------------------------------------------------------------
// Status bar helpers (SPEC_AUT_STATUSBARITEM)
// ---------------------------------------------------------------------------

function nextFireMinutes(expr: string, from: Date): number {
    for (let delta = 1; delta <= 10080; delta++) {
        const candidate = new Date(from.getTime() + delta * 60000);
        if (matchesCron(expr, candidate)) { return delta; }
    }
    return -1;
}

function updateStatusBar(jobs: HeartbeatJob[], now: Date, item: vscode.StatusBarItem): void {
    const scheduled = jobs.filter(j => j.schedule !== 'manual');
    if (scheduled.length === 0) {
        item.text = 'Heartbeat: idle';
        return;
    }
    let best: { name: string; delta: number } | undefined;
    for (const job of scheduled) {
        const delta = nextFireMinutes(job.schedule, now);
        if (delta >= 0 && (!best || delta < best.delta)) {
            best = { name: job.name, delta };
        }
    }
    if (best) {
        const fireTime = new Date(now.getTime() + best.delta * 60000);
        const hhmm = fireTime.toTimeString().slice(0, 5);
        item.text = `$(clock) ${best.name} ${hhmm}`;
    } else {
        item.text = 'Heartbeat: idle'; // jobs exist but none fire within 7 days
    }
}

// ---------------------------------------------------------------------------
// Step executor (SPEC_AUT_EXECUTOR)
// ---------------------------------------------------------------------------

function spawnStep(
    executable: string,
    args: string[],
    outputChannel: vscode.LogOutputChannel,
    stepType: HeartbeatStep['type']
): Promise<ExecResult> {
    return new Promise(resolve => {
        const proc = cp.spawn(executable, args, { shell: false });
        proc.stdout.on('data', (d: Buffer) => outputChannel.debug('[Heartbeat] stdout: ' + d.toString().trimEnd()));
        proc.stderr.on('data', (d: Buffer) => outputChannel.debug('[Heartbeat] stderr: ' + d.toString().trimEnd()));
        proc.on('close', (code: number | null) => {
            if (code !== 0) {
                resolve({ success: false, stepType, error: `exit ${code ?? 'null'}` });
            } else {
                resolve({ success: true });
            }
        });
        proc.on('error', (err: Error) => {
            resolve({ success: false, stepType, error: err.message });
        });
    });
}

function resolveScriptPath(run: string, configDir: string): string {
    if (path.isAbsolute(run)) { return run; }
    return path.join(configDir, run);
}

// ---------------------------------------------------------------------------
// Agent step executor (SPEC_AUT_AGENTEXEC)
// ---------------------------------------------------------------------------

async function executeAgentStep(
    step: HeartbeatStep,
    outputChannel: vscode.LogOutputChannel,
    configDir: string
): Promise<ExecResult> {
    const promptPath = resolveScriptPath(step.prompt!, configDir);
    outputChannel.info(`[Heartbeat] agent: prompt=${promptPath}`);
    try {
        const promptText = fs.readFileSync(promptPath, 'utf8');
        const models = await vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' });
        if (models.length === 0) {
            return { success: false, stepType: 'agent', error: 'no LM model available' };
        }
        const model = models[0];
        outputChannel.debug(`[Heartbeat] agent: model=${model.id}`);
        const messages = [vscode.LanguageModelChatMessage.User(promptText)];
        const response = await model.sendRequest(messages, {});
        let text = '';
        for await (const chunk of response.text) { text += chunk; }
        outputChannel.debug(`[Heartbeat] agent: response length=${text.length}`);
        if (step.outputFile) {
            const outPath = resolveScriptPath(step.outputFile, configDir);
            if (step.append) {
                fs.appendFileSync(outPath, text);
            } else {
                fs.writeFileSync(outPath, text);
            }
            outputChannel.info(`[Heartbeat] agent: written to ${outPath}`);
        }
        return { success: true };
    } catch (e) {
        return { success: false, stepType: 'agent', error: (e as Error).message };
    }
}

// ---------------------------------------------------------------------------
// Queue step executor (SPEC_AUT_QUEUEEXEC)
// ---------------------------------------------------------------------------

async function executeQueueStep(
    step: HeartbeatStep,
    outputChannel: vscode.LogOutputChannel,
    queuePath: string,
    messageTreeProvider: MessageTreeProvider
): Promise<ExecResult> {
    try {
        appendMessage(queuePath, step.destination!, step.sender || 'heartbeat', step.text!);
        messageTreeProvider.reload();
        outputChannel.info(
            `[Heartbeat] queue: destination="${step.destination}" sender="${step.sender || 'heartbeat'}" text="${step.text}"`
        );
        return { success: true };
    } catch (e) {
        return {
            success: false,
            stepType: 'queue',
            error: (e as Error).message
        };
    }
}

async function runStep(
    step: HeartbeatStep,
    outputChannel: vscode.LogOutputChannel,
    configDir: string,
    queuePath: string,
    messageTreeProvider: MessageTreeProvider
): Promise<ExecResult> {
    if (step.type === 'agent') {
        return executeAgentStep(step, outputChannel, configDir);
    }

    if (step.type === 'queue') {
        return executeQueueStep(step, outputChannel, queuePath, messageTreeProvider);
    }

    if (step.type === 'python') {
        const interp = vscode.workspace
            .getConfiguration('python')
            .get<string>('defaultInterpreterPath', '') || 'python';
        return spawnStep(interp, [resolveScriptPath(step.run!, configDir)], outputChannel, 'python');
    }

    if (step.type === 'powershell') {
        return spawnStep('pwsh', ['-NonInteractive', '-File', resolveScriptPath(step.run!, configDir)], outputChannel, 'powershell');
    }

    // command
    try {
        outputChannel.info(`[Heartbeat] command: ${step.run}`);
        await vscode.commands.executeCommand(step.run!);
        return { success: true };
    } catch (e) {
        return { success: false, stepType: 'command', error: (e as Error).message };
    }
}

export async function executeJob(
    job: HeartbeatJob,
    outputChannel: vscode.LogOutputChannel,
    configDir: string,
    queuePath: string,
    messageTreeProvider: MessageTreeProvider
): Promise<ExecResult> {
    for (const step of job.steps) {
        const result = await runStep(step, outputChannel, configDir, queuePath, messageTreeProvider);
        if (!result.success) { return result; }
    }
    return { success: true };
}

// ---------------------------------------------------------------------------
// Failure notification (SPEC_AUT_OUTPUTCHANNEL)
// ---------------------------------------------------------------------------

export function notifyFailure(
    job: HeartbeatJob,
    result: ExecResult,
    outputChannel: vscode.LogOutputChannel
): void {
    const msg = `Jarvis: job "${job.name}" failed — ${result.stepType} ${result.error}`;
    vscode.window.showErrorMessage(msg);
    outputChannel.error(`[Heartbeat] ${msg}`);
}

// ---------------------------------------------------------------------------
// Manual run command (SPEC_AUT_MANUALCOMMAND)
// ---------------------------------------------------------------------------

export async function runManualJob(
    jobs: HeartbeatJob[],
    outputChannel: vscode.LogOutputChannel,
    configDir: string,
    queuePath: string,
    messageTreeProvider: MessageTreeProvider
): Promise<void> {
    const manual = jobs.filter(j => j.schedule === 'manual');
    if (manual.length === 0) {
        vscode.window.showInformationMessage('Jarvis: no manual jobs configured.');
        return;
    }
    const pick = await vscode.window.showQuickPick(
        manual.map(j => j.name),
        { placeHolder: 'Select a job to run' }
    );
    if (!pick) { return; }
    const job = manual.find(j => j.name === pick)!;
    const result = await executeJob(job, outputChannel, configDir, queuePath, messageTreeProvider);
    if (!result.success) { notifyFailure(job, result, outputChannel); }
}

// ---------------------------------------------------------------------------
// Scheduler (SPEC_AUT_SCHEDULERLOOP)
// ---------------------------------------------------------------------------

export class HeartbeatScheduler {
    private timer: NodeJS.Timeout | undefined;
    private lastFired = new Map<string, number>();
    private jobs: HeartbeatJob[] = [];
    private configDir: string = '';
    private outputChannel: vscode.LogOutputChannel | undefined;
    private statusBarItem: vscode.StatusBarItem | undefined;
    private context: vscode.ExtensionContext | undefined;
    private queuePath: string = '';
    private messageTreeProvider: MessageTreeProvider | undefined;
    private heartbeatTreeProvider: HeartbeatTreeProvider | undefined;

    get currentJobs(): HeartbeatJob[] { return this.jobs; }
    get currentConfigDir(): string { return this.configDir; }
    get currentQueuePath(): string { return this.queuePath; }

    setTreeProvider(provider: HeartbeatTreeProvider): void {
        this.heartbeatTreeProvider = provider;
    }

    // Implementation: SPEC_AUT_JOBREG
    // Requirements: REQ_AUT_JOBREG
    async registerJob(job: HeartbeatJob): Promise<void> {
        const configPath = resolveConfigPath(this.context!);
        let data: { jobs: HeartbeatJob[] } = { jobs: [] };
        try {
            const raw = fs.readFileSync(configPath, 'utf8');
            data = (yaml.load(raw) as { jobs: HeartbeatJob[] }) ?? { jobs: [] };
            if (!data.jobs) { data.jobs = []; }
        } catch { /* file missing or unparseable — start fresh */ }

        const idx = data.jobs.findIndex(j => j.name === job.name);
        if (idx >= 0) { data.jobs[idx] = job; } else { data.jobs.push(job); }

        fs.mkdirSync(path.dirname(configPath), { recursive: true });
        fs.writeFileSync(configPath, yaml.dump(data), 'utf8');
        this.reload();
        this.heartbeatTreeProvider?.setJobs(this.jobs);
    }

    // Implementation: SPEC_AUT_JOBREG
    // Requirements: REQ_AUT_JOBREG
    async unregisterJob(name: string): Promise<void> {
        const configPath = resolveConfigPath(this.context!);
        let data: { jobs: HeartbeatJob[] };
        try {
            const raw = fs.readFileSync(configPath, 'utf8');
            data = (yaml.load(raw) as { jobs: HeartbeatJob[] }) ?? { jobs: [] };
            if (!data.jobs) { return; }
        } catch { return; }

        const idx = data.jobs.findIndex(j => j.name === name);
        if (idx < 0) { return; }
        data.jobs.splice(idx, 1);

        fs.writeFileSync(configPath, yaml.dump(data), 'utf8');
        this.reload();
        this.heartbeatTreeProvider?.setJobs(this.jobs);
    }

    reload(): void {
        if (!this.context || !this.outputChannel) { return; }
        const configPath = resolveConfigPath(this.context);
        this.configDir = path.dirname(configPath);
        this.jobs = loadJobs(configPath, this.outputChannel);
    }

    start(
        context: vscode.ExtensionContext,
        outputChannel: vscode.LogOutputChannel,
        statusBarItem: vscode.StatusBarItem,
        queuePath: string,
        messageTreeProvider: MessageTreeProvider
    ): void {
        this.context = context;
        this.outputChannel = outputChannel;
        this.statusBarItem = statusBarItem;
        this.queuePath = queuePath;
        this.messageTreeProvider = messageTreeProvider;

        const configPath = resolveConfigPath(context);
        this.configDir = path.dirname(configPath);
        this.jobs = loadJobs(configPath, outputChannel);

        const interval = Math.max(
            10,
            vscode.workspace.getConfiguration('jarvis').get<number>('heartbeatInterval', 60)
        );

        this.timer = setInterval(() => this.tick(), interval * 1000);

        // Run one initial status bar update
        updateStatusBar(this.jobs, new Date(), statusBarItem);
    }

    private tick(): void {
        if (!this.outputChannel || !this.statusBarItem || !this.context || !this.messageTreeProvider) { return; }

        // Reload config on each tick (picks up file changes)
        const configPath = resolveConfigPath(this.context);
        this.configDir = path.dirname(configPath);
        this.jobs = loadJobs(configPath, this.outputChannel);

        const now = new Date();
        const minuteKey = Math.floor(now.getTime() / 60000);

        for (const job of this.jobs) {
            if (job.schedule === 'manual') { continue; }
            if (!matchesCron(job.schedule, now)) { continue; }
            if (this.lastFired.get(job.name) === minuteKey) { continue; }
            this.lastFired.set(job.name, minuteKey);

            // dispatch — silent idle: no log when nothing runs
            const ch = this.outputChannel;
            const configDir = this.configDir;
            const qp = this.queuePath;
            const mtp = this.messageTreeProvider;
            executeJob(job, ch, configDir, qp, mtp).then(result => {
                if (!result.success) { notifyFailure(job, result, ch); }
            });
        }

        updateStatusBar(this.jobs, now, this.statusBarItem);

        // Refresh tree view with updated next-run times
        if (this.heartbeatTreeProvider) {
            this.heartbeatTreeProvider.setJobs(this.jobs);
        }
    }

    dispose(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}

// ---------------------------------------------------------------------------
// Activation entry point
// ---------------------------------------------------------------------------

export function activateHeartbeat(
    context: vscode.ExtensionContext,
    messageTreeProvider: MessageTreeProvider,
    resolveMessagesPath: () => string,
    outputChannel: vscode.LogOutputChannel
): HeartbeatScheduler {
    // Status bar item (SPEC_AUT_STATUSBARITEM)
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBarItem.text = 'Heartbeat: idle';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // Scheduler
    const scheduler = new HeartbeatScheduler();
    scheduler.start(context, outputChannel, statusBarItem, resolveMessagesPath(), messageTreeProvider);
    context.subscriptions.push({ dispose: () => scheduler.dispose() });

    // Heartbeat tree view (SPEC_AUT_HEARTBEATPROVIDER)
    const heartbeatTreeProvider = new HeartbeatTreeProvider();
    heartbeatTreeProvider.setJobs(scheduler.currentJobs);
    scheduler.setTreeProvider(heartbeatTreeProvider);
    const heartbeatView = vscode.window.createTreeView('jarvisHeartbeat', {
        treeDataProvider: heartbeatTreeProvider
    });
    context.subscriptions.push(heartbeatView);

    // Manual run command (SPEC_AUT_MANUALCOMMAND)
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.runHeartbeatJob', () => {
            scheduler.reload();
            return runManualJob(
                scheduler.currentJobs, outputChannel, scheduler.currentConfigDir,
                scheduler.currentQueuePath, messageTreeProvider
            );
        })
    );

    // Run single job from tree (SPEC_AUT_RUNJOBCOMMAND)
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.runJob', (node: JobNode) => {
            executeJob(node.job, outputChannel, scheduler.currentConfigDir,
                scheduler.currentQueuePath, messageTreeProvider)
                .then(result => {
                    if (!result.success) { notifyFailure(node.job, result, outputChannel); }
                });
        })
    );

    // Refresh heartbeat tree (SPEC_AUT_RUNJOBCOMMAND)
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.refreshHeartbeat', () => {
            scheduler.reload();
            heartbeatTreeProvider.setJobs(scheduler.currentJobs);
        })
    );

    // Config change handler — restart scheduler (SPEC_CFG_HEARTBEATSETTINGS)
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (
                e.affectsConfiguration('jarvis.heartbeatInterval') ||
                e.affectsConfiguration('jarvis.heartbeatConfigFile')
            ) {
                scheduler.dispose();
                scheduler.start(context, outputChannel, statusBarItem, resolveMessagesPath(), messageTreeProvider);
                heartbeatTreeProvider.setJobs(scheduler.currentJobs);
            }
            if (e.affectsConfiguration('jarvis.messagesFile')) {
                messageTreeProvider.reload();
            }
        })
    );

    return scheduler;
}
