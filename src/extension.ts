// Implementation: SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND, SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_OPENYAML_CMD, SPEC_EXP_CONTEXTACTIONS, SPEC_AUT_MANUALCOMMAND, SPEC_MSG_SENDCOMMAND, SPEC_MSG_OPENSESSION, SPEC_MSG_LISTSESSIONS, SPEC_EXP_AGENTSESSION, SPEC_EXP_NEWPROJECT_CMD, SPEC_EXP_NEWEVENT_CMD, SPEC_REL_UPDATECOMMAND, SPEC_EXP_RESCAN_CMD, SPEC_AUT_JOBREG, SPEC_DEV_LOGCHANNEL, SPEC_MSG_DUALREGISTRATION, SPEC_EXP_LISTPROJECTS, SPEC_CFG_TOGGLEGUARDS, SPEC_CFG_PATHRESOLVER, SPEC_EXP_FEATURETOGGLE, SPEC_PIM_SERVICE, SPEC_PIM_CATVIEW, SPEC_PIM_CATTOOL, SPEC_OLK_COMBRIDGE, SPEC_OLK_SETTINGS, SPEC_OLK_AUTOCAT_NEWENTITY, SPEC_PIM_TASKSERVICE, SPEC_PIM_TASKEDITOR, SPEC_PIM_TASKTOOL, SPEC_OLK_TASKPROVIDER, SPEC_OLK_TASKENABLE, SPEC_EXP_HEARTBEAT_OPENFILE, SPEC_EXP_MESSAGE_OPENFILE, SPEC_EXP_SEARCH_CMD, SPEC_SES_CREATETOOL, SPEC_SES_AGENT_DISCOVERY, SPEC_SES_AGENT_SCHEMA, SPEC_SES_AGENT_PICKER, SPEC_SES_AGENT_CREATETOOL, SPEC_SES_AGENT_OPEN
// Requirements: REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW, REQ_EXP_REACTIVECACHE, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST, REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST, REQ_EXP_OPENYAML, REQ_EXP_CONTEXTACTIONS, REQ_AUT_MANUALRUN, REQ_MSG_SEND, REQ_MSG_DELETE, REQ_MSG_OPENSESSION, REQ_MSG_SESSIONFILTER, REQ_MSG_LISTSESSIONS, REQ_EXP_AGENTSESSION, REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT, REQ_REL_UPDATECOMMAND, REQ_CFG_UPDATECHECK, REQ_EXP_RESCAN_BTN, REQ_AUT_JOBREG, REQ_DEV_LOGGING, REQ_MSG_MCPSERVER, REQ_CFG_MCPPORT, REQ_EXP_LISTPROJECTS, REQ_CFG_TOGGLES, REQ_CFG_FIXEDPATHS, REQ_EXP_FEATURETOGGLE, REQ_PIM_SERVICE, REQ_PIM_CATVIEW, REQ_PIM_CATTOOL, REQ_OLK_COMBRIDGE, REQ_OLK_ENABLE, REQ_OLK_AUTOCAT_NEWENTITY, REQ_PIM_TASKSERVICE, REQ_PIM_TASKEDITOR, REQ_PIM_TASKTOOL, REQ_OLK_TASKPROVIDER, REQ_OLK_TASKENABLE, REQ_SES_CREATETOOL, REQ_SES_AGENT_FIELD, REQ_SES_AGENT_PICKER, REQ_SES_AGENT_DISCOVERY, REQ_SES_AGENT_CREATETOOL, REQ_SES_AGENT_VALIDATION, REQ_SES_AGENT_OPEN, REQ_SES_AGENT_COMPAT

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as configPaths from './configPaths';
import { ProjectTreeProvider } from './projectTreeProvider';
import { EventTreeProvider } from './eventTreeProvider';
import { MessageTreeProvider, SessionGroupNode, MessageLeafNode } from './messageTreeProvider';
import { RemindersTreeProvider, ReminderNode } from './remindersTreeProvider';
import { YamlScanner, LeafNode, TreeNode } from './yamlScanner';
import * as yaml from 'js-yaml';
import { activateHeartbeat, HeartbeatScheduler, HeartbeatJob, HeartbeatStep } from './heartbeat';
import { JobNode } from './heartbeatTreeProvider';
import { deleteMessage, appendMessage, popMessage, readAutoDelivery, addAutoDelivery, removeAutoDelivery, readQueue, writeQueue } from './messageQueue';
import { addReminder, readReminders, removeReminder, popDueReminders, setRemindersLogger } from './reminders';
import { lookupSessionUUID, getAllSessions, initSessionLookup, setSessionLookupLogger, filterNamedSessions, getValidDestinations } from './sessionLookup';
import { checkForUpdates } from './updateCheck';
import { registerMcpTool, startMcpServer, stopMcpServer } from './mcpServer';
import { z } from 'zod';
import { CronExpressionParser } from 'cron-parser';
import { CategoryService } from './pim/CategoryService';
import { CategoryTreeProvider } from './pim/CategoryTreeProvider';
import { OutlookCategoryProvider } from './outlookIntegration/OutlookCategoryProvider';
import { TaskService } from './pim/TaskService';
import { TaskEditorProvider } from './pim/TaskEditorProvider';
import { OutlookTaskProvider } from './outlookIntegration/OutlookTaskProvider';
import { RecordingManager } from './recording';
import { SessionTreeProvider } from './sessionTreeProvider';

// Module-level reference so deactivate() can call recordingManager.deactivate() (SPEC_REC_SUBPROCESS)
let _recordingManager: RecordingManager | undefined;

// Implementation: SPEC_EXP_NEWPROJECT_CMD
function toKebabCase(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function findLeafNode(nodes: TreeNode[], targetFolder: string): LeafNode | undefined {
    for (const node of nodes) {
        if (node.kind === 'leaf' && node.id.includes(targetFolder)) {
            return node;
        }
        if (node.kind === 'folder') {
            const found = findLeafNode(node.children, targetFolder);
            if (found) { return found; }
        }
    }
    return undefined;
}

// Shared substitution helper (SPEC_EXP_AGENTSESSION_INITPROMPT, SPEC_MSG_SENDCOMMAND)
// Substitutes ${key} tokens; unknown tokens are left as-is.
function applyTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// YAML string serialisation helper (escapes \ and " for double-quoted YAML values)
function yamlString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Implementation: SPEC_SES_AGENT_DISCOVERY
// Requirements: REQ_SES_AGENT_DISCOVERY
interface AgentModeEntry {
    name: string;
    filePath: string;
}

function readFrontmatterBool(content: string, key: string): boolean {
    if (!content.startsWith('---')) { return false; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return false; }
    const header = content.slice(3, closeIdx);
    const re = new RegExp(`^${key}:\\s*true\\s*$`, 'm');
    return re.test(header);
}

function isExplicitlyExcluded(content: string, key: string): boolean {
    if (!content.startsWith('---')) { return false; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return false; }
    const header = content.slice(3, closeIdx);
    const re = new RegExp(`^${key}:\\s*false\\s*$`, 'm');
    return re.test(header);
}

function readFrontmatterString(content: string, key: string): string | undefined {
    if (!content.startsWith('---')) { return undefined; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return undefined; }
    const header = content.slice(3, closeIdx);
    // Match: key: value | key: "value" | key: 'value'
    const re = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+?))\\s*$`, 'm');
    const m = re.exec(header);
    if (!m) { return undefined; }
    const value = m[1] ?? m[2] ?? m[3] ?? '';
    return value.trim() || undefined;
}

function getAgentIdentity(content: string, filename: string): string {
    const name = readFrontmatterString(content, 'name');
    if (name) { return name; }
    return filename.endsWith('.agent.md')
        ? filename.slice(0, -'.agent.md'.length)
        : filename;
}

async function discoverAgentModes(): Promise<AgentModeEntry[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
    const agents: AgentModeEntry[] = [];

    for (const workspaceFolder of workspaceFolders) {
        const agentsDir = path.join(workspaceFolder.uri.fsPath, '.github', 'agents');
        let entries: fs.Dirent[];
        try {
            entries = await fs.promises.readdir(agentsDir, { withFileTypes: true });
        } catch {
            continue; // directory absent or unreadable — skip silently
        }

        for (const entry of entries) {
            if (!entry.isFile()) { continue; }
            const lower = entry.name.toLowerCase();
            if (!lower.endsWith('.agent.md')) { continue; }

            const agentPath = path.join(agentsDir, entry.name);
            let content: string;
            try {
                content = await fs.promises.readFile(agentPath, 'utf8');
            } catch {
                continue; // unreadable → skip
            }
            if (isExplicitlyExcluded(content, 'user-invocable')) {
                continue; // explicit opt-out
            }
            // else: INCLUDED (default-include policy per SPEC_SES_AGENT_DISCOVERY)

            const agentName = getAgentIdentity(content, entry.name);
            agents.push({
                name: agentName,
                filePath: path.relative(workspaceFolder.uri.fsPath, agentPath),
            });
        }
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name));
}

// Implementation: SPEC_SES_AGENT_PICKER, SPEC_EXP_AGENT_PICKER
// Requirements: REQ_SES_AGENT_PICKER
async function pickAgentMode(): Promise<string | undefined> {
    const agents = await discoverAgentModes();

    const items: (vscode.QuickPickItem & { mode: string })[] = [
        {
            label:       'No agent',
            detail:      'Opens a default chat \u2014 pick mode via the chat dropdown',
            mode:        '',
        },
        ...agents.map(a => ({
            label:       a.name,
            description: a.filePath,
            mode:        a.name,
        })),
    ];

    const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select the agent for this entity (Escape = cancel)',
        matchOnDescription: true,
    });

    // undefined → user dismissed (Escape) → caller aborts creation
    return pick === undefined ? undefined : pick.mode;
}

// Implementation: SPEC_EXP_SEARCH_CMD
function flattenLeaves(nodes: TreeNode[]): LeafNode[] {
    const result: LeafNode[] = [];
    for (const node of nodes) {
        if (node.kind === 'leaf') {
            result.push(node);
        } else {
            result.push(...flattenLeaves(node.children));
        }
    }
    return result;
}

export function activate(context: vscode.ExtensionContext) {
    // Initialize workspace-scoped session lookup (SPEC_MSG_SESSIONLOOKUP)
    if (context.storageUri) {
        initSessionLookup(context.storageUri, context.globalStorageUri);
    }

    // Implementation: SPEC_CFG_TOGGLEGUARDS, SPEC_CFG_PATHRESOLVER
    const cfg = vscode.workspace.getConfiguration('jarvis');

    // Message queue path resolution via fixed .jarvis/ directory (SPEC_CFG_PATHRESOLVER)
    function resolveMessagesPath(): string {
        return configPaths.getMessagesPath() ?? '';
    }

    const messageProvider = new MessageTreeProvider(resolveMessagesPath);

    // Implementation: SPEC_DEV_LOGCHANNEL
    // Requirements: REQ_DEV_LOGGING
    const log = vscode.window.createOutputChannel('Jarvis', { log: true });
    context.subscriptions.push(log);
    setSessionLookupLogger(log);
    setRemindersLogger(log);

    async function renameFocusedChatSession(sessionName: string): Promise<void> {
        await vscode.commands.executeCommand(
            'workbench.action.chat.open',
            { query: `/rename ${sessionName}` }
        );
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    async function openNewChatEditor(): Promise<void> {
        await vscode.commands.executeCommand('workbench.action.openChat');
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // SPEC_EXP_ENTITY_TREECLICK / SPEC_EXP_NEWPROJECT_CMD / SPEC_EXP_NEWEVENT_CMD /
    // SPEC_SES_NEWENTITY: single shared entity-chat opener.
    // agent === non-empty → mode-prime then openNewChatEditor;
    // agent === ""/undefined → openNewChatEditor only (no picker, no writeback).
    // Always followed by rename + init-prompt.
    async function openChatForEntity(
        name: string,
        kind: string,
        folder: string,
        agent: string | undefined
    ): Promise<void> {
        if (agent) {
            try {
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open', { mode: agent });
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) {
                log.warn(`[MSG] openChatForEntity: failed to prime agent mode "${agent}": ${err}`);
            }
        }
        await openNewChatEditor();
        await renameFocusedChatSession(name);

        // SPEC_EXP_AGENTSESSION_INITPROMPT
        const contextPath = path.join(folder, 'context.md');
        const defaultInitPrompt =
            `You are the agent session for the \${kind} "\${name}".\n\n` +
            `Use only \`\${contextPath}\` as your persistent memory. Read it now.\n\n` +
            `Keep it minimal and action-oriented:\n` +
            `- Store only long-lived items under Decision / Finding / Next.\n` +
            `- One concise line per bullet. Prune aggressively.\n` +
            `- Replace outdated bullets — never append logs.\n` +
            `- Never store retries, raw tool output, or transient chatter.\n` +
            `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.`;
        const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
            .get<string>('agentSession.initPromptTemplate') ?? '';
        const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : defaultInitPrompt;
        const initPrompt = applyTemplate(initTemplate, { kind, name, contextPath });
        await vscode.commands.executeCommand(
            'workbench.action.chat.open', { query: initPrompt });
    }

    // Implementation: SPEC_PIM_TASKSERVICE
    // Requirements: REQ_PIM_TASKSERVICE
    const taskService = new TaskService();

    // Implementation: SPEC_REC_SUBPROCESS, SPEC_REC_STATUSBAR, SPEC_REC_BUTTON
    // Requirements: REQ_REC_SUBPROCESS, REQ_REC_STATUSBAR, REQ_REC_BUTTON
    _recordingManager = new RecordingManager();
    _recordingManager.setLog(log);

    // Scanner and providers — created conditionally inside feature blocks
    let scanner: YamlScanner | undefined;
    let projectProvider: ProjectTreeProvider | undefined;
    let eventProvider: EventTreeProvider | undefined;
    let sessionProvider: SessionTreeProvider | undefined;
    let projectView: vscode.TreeView<any> | undefined;
    let eventView: vscode.TreeView<any> | undefined;

    function startScanner(): void {
        if (!scanner) { return; }
        const config = vscode.workspace.getConfiguration('jarvis');
        const projectsFolder = config.get<string>('projects.folder', '');
        const eventsFolder = config.get<string>('events.folder', '');
        const sessionsFolder = configPaths.getSessionsDir() ?? '';
        scanner.start(projectsFolder, eventsFolder, sessionsFolder);
        log.info('[Scanner] starting scan');
    }

    // Heartbeat scheduler — created conditionally inside heartbeat block
    let scheduler: HeartbeatScheduler | undefined;

    // Implementation: SPEC_EXP_EXTENSION (syncRescanJob helper)
    // Requirements: REQ_CFG_SCANINTERVAL, REQ_AUT_JOBREG
    function syncRescanJob(): void {
        if (!scheduler) { return; }
        const interval = vscode.workspace
            .getConfiguration('jarvis')
            .get<number>('scanInterval', 2);
        if (interval > 0) {
            const job: HeartbeatJob = {
                name: 'Jarvis: Rescan',
                schedule: `*/${interval} * * * *`,
                steps: [{ type: 'command', run: 'jarvis.rescan' }]
            };
            scheduler.registerJob(job);
            log.info(`[Scanner] registered rescan job: */${interval} * * * *`);
        } else {
            scheduler.unregisterJob('Jarvis: Rescan');
            log.info('[Scanner] unregistered rescan job (interval=0)');
        }
    }

    // Implementation: SPEC_REC_WATCHERJOB
    // Requirements: REQ_REC_WATCHERJOB
    function syncTranscriptWatcherJob(): void {
        if (!scheduler) { return; }
        const cfg = vscode.workspace.getConfiguration('jarvis');
        const enabled = cfg.get<boolean>('recording.enabled', false);
        const whisperPath = cfg.get<string>('recording.whisperPath', '');
        const jobName = 'Jarvis: Check Transcripts';
        if (enabled && whisperPath) {
            const interval = cfg.get<number>('scanInterval', 2);
            const schedule = interval > 0 ? `*/${interval} * * * *` : '*/2 * * * *';
            const job: HeartbeatJob = {
                name: jobName,
                schedule,
                steps: [{ type: 'command', run: 'jarvis.checkTranscripts' }]
            };
            scheduler.registerJob(job);
            log.info(`[Recording] registered transcript watcher job: ${schedule}`);
        } else {
            scheduler.unregisterJob(jobName);
            log.info('[Recording] unregistered transcript watcher job');
        }
    }

    // ------- PROJECTS feature block (SPEC_CFG_TOGGLEGUARDS) -------
    if (cfg.get<boolean>('projects.enabled', false)) {
        scanner = scanner ?? new YamlScanner(() => {
            projectProvider?.refresh();
            eventProvider?.refresh();
            sessionProvider?.refresh();
        });
        projectProvider = new ProjectTreeProvider(scanner, taskService, _recordingManager);
        projectView = vscode.window.createTreeView('jarvisProjects', { treeDataProvider: projectProvider });

        // Restore persisted hidden folders (REQ_EXP_FILTERPERSIST AC-2)
        const savedHidden = context.workspaceState.get<string[]>('jarvis.hiddenProjectFolders', []);
        projectProvider.setHiddenFolders(new Set(savedHidden));
        if (savedHidden.length > 0) {
            projectView!.description = '(filtered)';
            vscode.commands.executeCommand('setContext', 'jarvis.projectFilterActive', true);
        }

        context.subscriptions.push(
            projectView!,
            projectView!.onDidChangeVisibility(e => {
                if (e.visible) {
                    startScanner();
                } else {
                    scanner?.stop();
                }
            })
        );
    } else {
        log.info('[CFG] Projects feature disabled');
    }

    // ------- EVENTS feature block (SPEC_CFG_TOGGLEGUARDS) -------
    if (cfg.get<boolean>('events.enabled', false)) {
        if (!scanner) {
            scanner = new YamlScanner(() => {
                projectProvider?.refresh();
                eventProvider?.refresh();
                sessionProvider?.refresh();
            });
        }
        eventProvider = new EventTreeProvider(scanner, taskService, _recordingManager);
        eventView = vscode.window.createTreeView('jarvisEvents', { treeDataProvider: eventProvider });

        // Restore persisted event filter (REQ_EXP_EVENTFILTERPERSIST AC-2)
        const savedEventFilter = context.workspaceState.get<boolean>('jarvis.eventFutureFilter', false);
        eventProvider.setFutureOnly(savedEventFilter);
        if (savedEventFilter) {
            eventView!.description = '(future only)';
            vscode.commands.executeCommand('setContext', 'jarvis.eventFilterActive', true);
        }

        context.subscriptions.push(eventView!);
    } else {
        log.info('[CFG] Events feature disabled');
    }

    // ------- SESSIONS feature block (SPEC_SES_MANIFEST, SPEC_SES_TREE) -------
    // Implementation: SPEC_SES_TREE, SPEC_SES_TOOLS, SPEC_SES_MANIFEST
    // Requirements: REQ_SES_TOGGLE, REQ_SES_TREE, REQ_SES_LISTTOOL
    if (cfg.get<boolean>('sessions.enabled', true)) {
        if (!scanner) {
            scanner = new YamlScanner(() => {
                projectProvider?.refresh();
                eventProvider?.refresh();
                sessionProvider?.refresh();
            });
        }
        sessionProvider = new SessionTreeProvider(scanner);
        const sessionView = vscode.window.createTreeView('jarvisSessions', {
            treeDataProvider: sessionProvider,
            canSelectMany: false,
        });
        context.subscriptions.push(sessionView);
        log.info('[CFG] Sessions feature enabled');
    } else {
        log.info('[CFG] Sessions feature disabled');
    }

    // Start scanner if any entity feature is active
    if (scanner) { startScanner(); }

    // ------- HEARTBEAT feature block (SPEC_CFG_TOGGLEGUARDS) -------
    if (cfg.get<boolean>('heartbeat.enabled', true)) {
        // Activate heartbeat scheduler (creates tree view internally) (SPEC_EXP_EXTENSION, SPEC_AUT_SCHEDULERLOOP)
        scheduler = activateHeartbeat(context, messageProvider, resolveMessagesPath, log, scanner);

        // Register rescan heartbeat job (SPEC_EXP_EXTENSION)
        if (scanner) { syncRescanJob(); }

        // Register transcript watcher heartbeat job (SPEC_REC_WATCHERJOB)
        syncTranscriptWatcherJob();
    } else {
        log.info('[CFG] Heartbeat feature disabled');
    }

    // ------- MESSAGES feature block (SPEC_CFG_TOGGLEGUARDS) -------
    let remindersProvider: RemindersTreeProvider | undefined;

    if (cfg.get<boolean>('messages.enabled', true)) {
        const messageView = vscode.window.createTreeView('jarvisMessages', { treeDataProvider: messageProvider });
        context.subscriptions.push(messageView);

        // ------- REMINDERS sub-block -------
        if (cfg.get<boolean>('reminders.enabled', true)) {
            remindersProvider = new RemindersTreeProvider(resolveMessagesPath);
            const remindersView = vscode.window.createTreeView('jarvisReminders', { treeDataProvider: remindersProvider });
            context.subscriptions.push(remindersView);
        } else {
            log.info('[CFG] Reminders feature disabled');
        }
    } else {
        log.info('[CFG] Messages feature disabled');
    }

    // Implementation: SPEC_REC_WATCHER
    // Requirements: REQ_REC_DISPATCH, REQ_REC_SIDECAR
    context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.checkTranscripts', async () => {
            const cfg = vscode.workspace.getConfiguration('jarvis');
            const enabled = cfg.get<boolean>('recording.enabled', false);
            const whisperPath = cfg.get<string>('recording.whisperPath', '');
            if (!enabled || !whisperPath) { return; }

            const outputDir = path.join(whisperPath, 'output');
            const inputDir = path.join(whisperPath, 'input');
            if (!fs.existsSync(outputDir)) { return; }

            const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.txt'));
            for (const file of files) {
                const stem = file.slice(0, -4);
                const sidecarPath = path.join(inputDir, `${stem}.json`);
                if (!fs.existsSync(sidecarPath)) { continue; }

                let project: string;
                try {
                    const sidecar = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as { project: string };
                    project = sidecar.project;
                } catch {
                    log.warn(`[Recording] could not parse sidecar: ${sidecarPath}`);
                    continue;
                }

                const txtPath = path.join(outputDir, file);
                const transcript = `Ein neues Meeting Transcript liegt für dich bereit: ${txtPath}`;
                appendMessage(resolveMessagesPath(), project, 'Whisper Watcher', transcript);
                messageProvider.reload();
                log.info(`[Recording] dispatched transcript "${stem}" to session "${project}"`);

                try { fs.unlinkSync(sidecarPath); } catch { /* ignore */ }
            }
        })
    );

    // Implementation: SPEC_OLK_SETTINGS, SPEC_PIM_SERVICE, SPEC_PIM_CATVIEW
    // Requirements: REQ_PIM_SERVICE, REQ_PIM_CATVIEW, REQ_OLK_ENABLE
    const categoryService = new CategoryService(log);
    const categoryTreeProvider = new CategoryTreeProvider(categoryService);

    const outlookEnabled = vscode.workspace
        .getConfiguration('jarvis')
        .get<boolean>('outlook.enabled', false);

    if (outlookEnabled) {
        categoryService.addProvider(new OutlookCategoryProvider(log));
    }

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('jarvisCategories', categoryTreeProvider)
    );

    // Implementation: SPEC_OLK_TASKENABLE, SPEC_PIM_TASKSERVICE
    // Requirements: REQ_OLK_TASKENABLE, REQ_PIM_TASKSERVICE
    try {
        const cfg2 = vscode.workspace.getConfiguration('jarvis');
        if (cfg2.get('outlook.enabled') === true
            && cfg2.get('outlook.tasks.enabled') === true) {
            const outlookTaskProvider = new OutlookTaskProvider(log);
            taskService.addProvider(outlookTaskProvider);
            log.info('[Tasks] OutlookTaskProvider registered');
        }
    } catch (err) {
        log.warn(`[Tasks] Failed to initialize task providers: ${err}`);
    }

    // Register TaskEditorProvider (SPEC_PIM_TASKEDITOR)
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'jarvis.taskEditor',
            new TaskEditorProvider(taskService, categoryService, log),
            { supportsMultipleEditorsPerDocument: false }
        )
    );

    // Implementation: SPEC_PIM_SERVICE (syncCategoryRefreshJob)
    function syncCategoryRefreshJob(): void {
        if (!scheduler) { return; }
        if (!categoryService.hasProviders()) {
            scheduler.unregisterJob('Jarvis: Category Refresh');
            return;
        }
        const interval = vscode.workspace
            .getConfiguration('jarvis')
            .get<number>('scanInterval', 2);
        if (interval > 0) {
            const job: HeartbeatJob = {
                name: 'Jarvis: Category Refresh',
                schedule: `*/${interval} * * * *`,
                steps: [{ type: 'command', run: 'jarvis.refreshCategories' }]
            };
            scheduler.registerJob(job);
            log.info(`[PIM] registered refresh job: */${interval} * * * *`);
        } else {
            scheduler.unregisterJob('Jarvis: Category Refresh');
            log.info('[PIM] unregistered refresh job (interval=0)');
        }
    }

    syncCategoryRefreshJob();

    // Implementation: SPEC_PIM_TASKSERVICE (syncTaskRefreshJob)
    // Requirements: REQ_PIM_TASKSERVICE
    function syncTaskRefreshJob(): void {
        if (!scheduler) { return; }
        if (!taskService.hasProviders()) {
            scheduler.unregisterJob('Jarvis: Task Refresh');
            return;
        }
        const interval = vscode.workspace
            .getConfiguration('jarvis')
            .get<number>('scanInterval', 2);
        if (interval > 0) {
            const job: HeartbeatJob = {
                name: 'Jarvis: Task Refresh',
                schedule: `*/${interval} * * * *`,
                steps: [{ type: 'command', run: 'jarvis.refreshTasks' }]
            };
            scheduler.registerJob(job);
            log.info(`[Tasks] registered refresh job: */${interval} * * * *`);
        } else {
            scheduler.unregisterJob('Jarvis: Task Refresh');
            log.info('[Tasks] unregistered refresh job (interval=0)');
        }
    }

    syncTaskRefreshJob();

    // Automatic update check (SPEC_REL_UPDATECOMMAND, SPEC_CFG_UPDATECHECK)
    const autoCheck = vscode.workspace
        .getConfiguration('jarvis')
        .get<boolean>('checkForUpdates', true);
    if (autoCheck) {
        checkForUpdates(context, true, log);
    }

    // Manual update check command (SPEC_REL_UPDATECOMMAND)
    const checkForUpdatesCommand = vscode.commands.registerCommand(
        'jarvis.checkForUpdates',
        () => checkForUpdates(context, false, log)
    );

    // Register rescan command (SPEC_EXP_RESCAN_CMD)
    // Requirements: REQ_EXP_RESCAN_BTN
    const rescanCommand = vscode.commands.registerCommand('jarvis.rescan', async () => {
        if (!scanner) { return; }
        await scanner.rescan();
        log.info('[Scanner] manual rescan triggered');
    });

    // Register filter command (SPEC_EXP_FILTERCOMMAND)
    const filterHandler = () => {
        if (!scanner || !projectProvider || !projectView) { return; }
        const allFolders = scanner.getProjectTree()
            .filter(n => n.kind === 'folder')
            .map(n => n.name);

        const hiddenFolders = new Set(projectProvider.getHiddenFolders());

        const qp = vscode.window.createQuickPick<vscode.QuickPickItem>();
        qp.title = 'Filter Project Folders';
        qp.placeholder = 'Toggle folder visibility';
        qp.canSelectMany = false;

        function renderItems() {
            qp.items = allFolders.map(name => ({
                label: `${hiddenFolders.has(name) ? '$(circle-large-outline)' : '$(check)'} ${name}`,
            }));
        }

        renderItems();

        qp.onDidAccept(() => {
            const active = qp.activeItems[0];
            if (!active) { return; }
            const name = active.label.replace(/^\$\([^)]+\)\s*/, '');
            if (hiddenFolders.has(name)) {
                hiddenFolders.delete(name);
            } else {
                hiddenFolders.add(name);
            }
            renderItems();

            // Apply immediately on each toggle
            projectProvider!.setHiddenFolders(new Set(hiddenFolders));
            context.workspaceState.update('jarvis.hiddenProjectFolders', [...hiddenFolders]);
            const isActive = hiddenFolders.size > 0;
            projectView!.description = isActive ? '(filtered)' : '';
            vscode.commands.executeCommand('setContext', 'jarvis.projectFilterActive', isActive);
        });

        qp.onDidHide(() => {
            qp.dispose();
        });

        qp.show();
    };

    const filterCommand = vscode.commands.registerCommand('jarvis.filterProjectFolders', filterHandler);
    const filterCommandActive = vscode.commands.registerCommand('jarvis.filterProjectFoldersActive', filterHandler);

    // Register event future filter commands (SPEC_EXP_EVENTFILTER_CMD)
    const eventFilterHandler = () => {
        if (!eventProvider || !eventView) { return; }
        const next = !eventProvider.isFutureOnly();
        eventProvider.setFutureOnly(next);
        context.workspaceState.update('jarvis.eventFutureFilter', next);
        eventView.description = next ? '(future only)' : '';
        vscode.commands.executeCommand('setContext', 'jarvis.eventFilterActive', next);
    };

    const eventFilterCommand = vscode.commands.registerCommand('jarvis.filterFutureEvents', eventFilterHandler);
    const eventFilterCommandActive = vscode.commands.registerCommand('jarvis.filterFutureEventsActive', eventFilterHandler);

    // Implementation: SPEC_EXP_SEARCH_CMD
    // Requirements: REQ_EXP_SEARCHPROJECTS
    type SearchItem = vscode.QuickPickItem & { leaf: LeafNode };

    const searchProjectsCommand = vscode.commands.registerCommand('jarvis.searchProjects', () => {
        if (!scanner || !projectView) { return; }
        const leaves = flattenLeaves(scanner.getProjectTree());
        const qp = vscode.window.createQuickPick<SearchItem>();
        qp.matchOnDescription = true;
        qp.items = leaves.map(leaf => {
            const entity = scanner!.getEntity(leaf.id);
            const name = entity ? entity.name : path.basename(path.dirname(leaf.id));
            return { label: name, description: leaf.id, leaf };
        });
        qp.onDidAccept(() => {
            const [selected] = qp.selectedItems;
            if (selected) {
                projectView!.reveal(selected.leaf, { select: true, focus: true, expand: true });
            }
            qp.hide();
        });
        qp.onDidHide(() => qp.dispose());
        qp.show();
    });

    // Implementation: SPEC_EXP_SEARCH_CMD
    // Requirements: REQ_EXP_SEARCHEVENTS
    const searchEventsCommand = vscode.commands.registerCommand('jarvis.searchEvents', () => {
        if (!scanner || !eventView) { return; }
        const leaves = flattenLeaves(scanner.getEventTree());
        const qp = vscode.window.createQuickPick<SearchItem>();
        qp.matchOnDescription = true;
        qp.items = leaves.map(leaf => {
            const entity = scanner!.getEntity(leaf.id);
            const name = entity ? entity.name : path.basename(path.dirname(leaf.id));
            return { label: name, description: entity?.datesStart, leaf };
        });
        qp.onDidAccept(() => {
            const [selected] = qp.selectedItems;
            if (selected) {
                eventView!.reveal(selected.leaf, { select: true, focus: true, expand: true });
            }
            qp.hide();
        });
        qp.onDidHide(() => qp.dispose());
        qp.show();
    });

    // Register open YAML command (SPEC_EXP_OPENYAML_CMD)
    const openYamlCommand = vscode.commands.registerCommand('jarvis.openYamlFile', (element: LeafNode) => {
        const uri = vscode.Uri.file(element.id);
        vscode.commands.executeCommand('vscode.open', uri);
    });

    // Register context actions (SPEC_EXP_CONTEXTACTIONS)
    const revealInExplorerCommand = vscode.commands.registerCommand('jarvis.revealInExplorer', (node: LeafNode) => {
        vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(node.id));
    });
    const revealInOSCommand = vscode.commands.registerCommand('jarvis.revealInOS', (node: LeafNode) => {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(node.id));
    });
    const openInTerminalCommand = vscode.commands.registerCommand('jarvis.openInTerminal', (node: LeafNode) => {
        vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(node.id));
    });

    // Register refreshTasks command (SPEC_PIM_TASKSERVICE)
    const refreshTasksCommand = vscode.commands.registerCommand('jarvis.refreshTasks', async () => {
        try {
            await taskService.refresh();
            projectProvider?.refresh();
            eventProvider?.refresh();
            log.info('[Tasks] manual task refresh triggered');
        } catch (err) {
            log.warn(`[Tasks] refresh failed: ${err}`);
        }
    });

    // Register category commands (SPEC_PIM_CATVIEW, SPEC_OLK_SETTINGS)
    const refreshCategoriesCommand = vscode.commands.registerCommand('jarvis.refreshCategories', async () => {
        await categoryTreeProvider.refresh();
        log.info('[PIM] manual categories refresh triggered');
    });

    const renameCategoryCommand = vscode.commands.registerCommand(
        'jarvis.renameCategory',
        async (node: { name: string; source: string; id?: string }) => {
            const newName = await vscode.window.showInputBox({
                prompt: 'New category name',
                value: node.name,
                validateInput: v => v?.trim() ? null : 'Name cannot be empty'
            });
            if (newName && newName !== node.name) {
                await categoryService.renameCategory(node.name, newName, node.source, node.id);
                categoryTreeProvider.refresh();
            }
        }
    );

    const deleteCategoryCommand = vscode.commands.registerCommand(
        'jarvis.deleteCategory',
        async (node: { name: string; source: string; id?: string }) => {
            const confirm = await vscode.window.showWarningMessage(
                `Delete category "${node.name}"?`,
                { modal: true },
                'Delete'
            );
            if (confirm === 'Delete') {
                await categoryService.deleteCategory(node.name, node.source, node.id);
                categoryTreeProvider.refresh();
            }
        }
    );

    // Register send messages command (SPEC_MSG_SENDCOMMAND)
    const sendMessagesCommand = vscode.commands.registerCommand(
        'jarvis.sendMessages',
        async (node?: SessionGroupNode) => {
            if (!node) {
                vscode.window.showWarningMessage('Jarvis: Use the play button on a session group in the Messages tree.');
                return;
            }
            log.info(`[MSG] sendMessages: destination="${node.destination}", count=${node.children.length}`);
            // 1. Resolve session UUID
            const uuid = await lookupSessionUUID(node.destination);

            // 2. Focus existing session or create new one
            if (uuid) {
                const b64 = Buffer.from(uuid).toString('base64');
                const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                await vscode.commands.executeCommand('vscode.open', uri);
                // Wait for session tab to be fully focused
                await new Promise(resolve => setTimeout(resolve, 800));
            } else {
                // No existing session — create new chat editor
                // Implementation: SPEC_MSG_SENDCOMMAND, SPEC_EXP_AGENTSESSION_INITPROMPT
                // Requirements: REQ_MSG_SEND, REQ_EXP_AGENTPROMPT_TEMPLATE
                const entityForSend = scanner?.entities?.find(e => e.name === node.destination);
                if (entityForSend?.agent) {
                    try {
                        await vscode.commands.executeCommand('workbench.action.chat.open', { mode: entityForSend.agent });
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } catch (err) {
                        log.warn(`[MSG] sendMessages: failed to prime agent mode "${entityForSend.agent}": ${err}`);
                    }
                }
                await openNewChatEditor();  // SPEC_MSG_OPENCHAT (includes 800 ms settle delay)
                await renameFocusedChatSession(node.destination);
                if (entityForSend) {
                    const kind = entityForSend.kind ?? 'project';
                    const folder = entityForSend.folder ?? '';
                    const contextPath = path.join(folder, 'context.md');
                    const rawInitTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('agentSession.initPromptTemplate') ?? '';
                    const defaultInitPrompt =
                        `You are the ${kind} "${entityForSend.name}".\n\n` +
                        `Use only \`${contextPath}\` as your persistent memory. Read it now.\n\n` +
                        `Keep it minimal and action-oriented:\n` +
                        `- Store only long-lived items under Decision / Finding / Next.\n` +
                        `- One concise line per bullet. Prune aggressively.\n` +
                        `- Replace outdated bullets — never append logs.\n` +
                        `- Never store retries, raw tool output, or transient chatter.\n` +
                        `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.`;
                    const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : defaultInitPrompt;
                    const initPrompt = applyTemplate(initTemplate, { kind, name: entityForSend.name, contextPath });
                    await vscode.commands.executeCommand('workbench.action.chat.open', { query: initPrompt });
                }
            }

            // 3. Send single notification stub
            const count = node.children.length;
            const defaultNotifTemplate =
                `[Jarvis Message Service] You have \${count} new message(s) in your inbox.\n` +
                `Read them with the jarvis_readMessage tool (destination: "\${destination}") until remaining = 0.`;
            const rawNotifTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('messages.notificationTemplate') ?? '';
            const notifTemplate = rawNotifTemplate.trim() ? rawNotifTemplate : defaultNotifTemplate;
            const stub = applyTemplate(notifTemplate, { count: String(count), destination: node.destination });
            await vscode.commands.executeCommand(
                'workbench.action.chat.open',
                { query: stub }
            );

            // 4. Refresh tree (messages stay in queue)
            messageProvider.reload();
        }
    );

    // Register open session command (SPEC_MSG_OPENSESSION)
    // Requirements: REQ_MSG_OPENSESSION, REQ_MSG_SESSIONFILTER
    const openSessionCommand = vscode.commands.registerCommand(
        'jarvis.openSession',
        async () => {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions);
            if (named.length === 0) {
                vscode.window.showInformationMessage('Jarvis: No named chat sessions found');
                return;
            }
            const pick = await vscode.window.showQuickPick(
                named.map(s => ({ label: s.title, description: s.sessionId })),
                { placeHolder: 'Select a chat session to open' }
            );
            if (!pick) { return; }
            const b64 = Buffer.from(pick.description!).toString('base64');
            const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
            await vscode.commands.executeCommand('vscode.open', uri);
        }
    );

    // Register open agent session command (SPEC_EXP_AGENTSESSION, SPEC_EXP_ENTITY_TREECLICK)
    // Requirements: REQ_EXP_AGENTSESSION
    const openAgentSessionCommand = vscode.commands.registerCommand(
        'jarvis.openAgentSession',
        async (element: LeafNode) => {
            const entity = scanner?.getEntity(element.id);
            if (!entity) { return; }

            const uuid = await lookupSessionUUID(entity.name);

            if (uuid) {
                // Open existing session
                const b64 = Buffer.from(uuid).toString('base64');
                const uri = vscode.Uri.parse(
                    `vscode-chat-session://local/${b64}`
                );
                await vscode.commands.executeCommand('vscode.open', uri);
            } else {
                // Create new session — SPEC_EXP_ENTITY_TREECLICK
                const kind = entity.kind ?? 'project';
                const folder = entity.folder ?? path.dirname(element.id);
                await openChatForEntity(entity.name, kind, folder, entity.agent);
            }
        }
    );

    // Register open context command (SPEC_EXP_OPENCONTEXT_CMD)
    // Requirements: REQ_EXP_OPENCONTEXT
    const openContextCommand = vscode.commands.registerCommand(
        'jarvis.openContext',
        async (element: LeafNode) => {
            const folder = path.dirname(element.id);
            const direct = path.join(folder, 'context.md');

            // 1. Direct hit: <folder>/context.md
            if (fs.existsSync(direct)) {
                await vscode.window.showTextDocument(vscode.Uri.file(direct));
                return;
            }

            // 2. Search one level deep in subfolders (skip hidden)
            const found: string[] = [];
            try {
                for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                    if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
                    const candidate = path.join(folder, entry.name, 'context.md');
                    if (fs.existsSync(candidate)) { found.push(candidate); }
                }
            } catch {
                // folder unreadable — fall through to "not found"
            }

            if (found.length === 1) {
                await vscode.window.showTextDocument(vscode.Uri.file(found[0]));
                return;
            }

            if (found.length > 1) {
                const picked = await vscode.window.showQuickPick(
                    found.map(p => ({
                        label: path.relative(folder, p).replace(/\\/g, '/'),
                        fullPath: p,
                    })),
                    { placeHolder: 'Multiple context.md found — pick one' }
                );
                if (picked) {
                    await vscode.window.showTextDocument(vscode.Uri.file(picked.fullPath));
                }
                return;
            }

            // 3. Nothing found
            vscode.window.showInformationMessage(
                'No context.md found for this entity');
        }
    );

    // Implementation: SPEC_EXP_ENTITY_ICONS (openRecording command)
    const openRecordingCommand = vscode.commands.registerCommand(
        'jarvis.openRecording',
        (element: LeafNode) => {
            const entityFolder = path.dirname(element.id);
            const recordingFolder = path.join(entityFolder, 'recording');
            vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(recordingFolder));
        }
    );

    // Implementation: SPEC_SES_TREECLICK
    // Requirements: REQ_SES_TREECLICK
    let openSessionContextCommand: vscode.Disposable | undefined;
    if (cfg.get<boolean>('sessions.enabled', true)) {
        openSessionContextCommand = vscode.commands.registerCommand(
            'jarvis.openSessionContext',
            async (element: LeafNode) => {
                const sessionDir = path.dirname(element.id);
                const contextPath = path.join(sessionDir, 'context.md');

                if (!fs.existsSync(contextPath)) {
                    // Resilience: create context.md on the fly (AC-6)
                    const entity = scanner?.getEntity(element.id);
                    const sessionName = entity?.name ?? path.basename(sessionDir);
                    try {
                        await fs.promises.writeFile(
                            contextPath,
                            '# ' + sessionName + '\n\n',
                            'utf-8'
                        );
                        log.info('[OpenSessionContext] created missing context.md for "' + sessionName + '"');
                    } catch (err) {
                        vscode.window.showErrorMessage(
                            'Jarvis: Could not create context.md -- ' + err
                        );
                        return;
                    }
                }

                try {
                    await vscode.window.showTextDocument(
                        vscode.Uri.file(contextPath),
                        { preview: false }
                    );
                } catch (err) {
                    log.warn(`[SES] openSessionContext: showTextDocument failed for ${contextPath}: ${err}`);
                    vscode.window.showWarningMessage(`Jarvis: could not open context.md: ${err}`);
                }
            }
        );
        context.subscriptions.push(openSessionContextCommand);
    } // end if (sessions.enabled) — SPEC_SES_TREECLICK

    // Register delete message command (SPEC_MSG_SENDCOMMAND)
    const deleteMessageCommand = vscode.commands.registerCommand(
        'jarvis.deleteMessage',
        (node: MessageLeafNode) => {
            log.debug(`[MSG] deleteMessage: index=${node.index}`);
            deleteMessage(resolveMessagesPath(), node.index);
            messageProvider.reload();
        }
    );

    // Implementation: SPEC_EXP_HEARTBEAT_OPENFILE
    // Requirements: REQ_EXP_HEARTBEAT_OPENFILE
    const openHeartbeatJobCommand = vscode.commands.registerCommand(
        'jarvis.openHeartbeatJob',
        async (node: JobNode) => {
            const configPath = configPaths.getHeartbeatPath();
            if (!configPath) {
                vscode.window.showWarningMessage('Jarvis: No workspace folder; cannot open heartbeat config.');
                return;
            }
            const uri = vscode.Uri.file(configPath);
            let lineIndex = 0;
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                const target = `name: ${node.job.name}`;
                for (let i = 0; i < doc.lineCount; i++) {
                    if (doc.lineAt(i).text.includes(target)) {
                        lineIndex = i;
                        break;
                    }
                }
                const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
                const editor = await vscode.window.showTextDocument(doc);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                editor.selection = new vscode.Selection(range.start, range.start);
            } catch {
                vscode.window.showWarningMessage(`Jarvis: Cannot open heartbeat config: ${configPath}`);
            }
        }
    );

    // Implementation: SPEC_EXP_MESSAGE_OPENFILE
    // Requirements: REQ_EXP_MESSAGE_OPENFILE
    const openMessageFileCommand = vscode.commands.registerCommand(
        'jarvis.openMessageFile',
        async (node: MessageLeafNode) => {
            const messagesPath = resolveMessagesPath();
            if (!messagesPath) {
                vscode.window.showWarningMessage('Jarvis: No workspace open (cannot resolve messages path).');
                return;
            }
            const uri = vscode.Uri.file(messagesPath);
            let lineIndex = 0;
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                let count = -1;
                for (let i = 0; i < doc.lineCount; i++) {
                    if (doc.lineAt(i).text.trimStart().startsWith('"text":')) {
                        count++;
                        if (count === node.index) {
                            lineIndex = i;
                            break;
                        }
                    }
                }
                const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
                const editor = await vscode.window.showTextDocument(doc);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                editor.selection = new vscode.Selection(range.start, range.start);
            } catch {
                vscode.window.showWarningMessage(`Jarvis: Cannot open messages file: ${messagesPath}`);
            }
        }
    );

    // Implementation: SPEC_MSG_DUALREGISTRATION
    // Requirements: REQ_MSG_MCPSERVER
    function registerDualTool(
        name: string,
        lmHandler: (options: vscode.LanguageModelToolInvocationOptions<any>, token: vscode.CancellationToken) => Promise<vscode.LanguageModelToolResult>,
        mcpDescription: string,
        mcpInputSchema: Record<string, z.ZodTypeAny>,
        mcpHandler: (args: Record<string, unknown>) => Promise<object>
    ): vscode.Disposable {
        const lmTool = vscode.lm.registerTool(name, { invoke: lmHandler });
        registerMcpTool(name, mcpDescription, mcpInputSchema, mcpHandler);
        return lmTool;
    }

    // Register LM+MCP tool: sendToSession (allows LLMs to queue messages to other sessions)
    const sendToSessionTool = registerDualTool(
        'jarvis_sendToSession',
        async (options: vscode.LanguageModelToolInvocationOptions<{ session: string; senderSession?: string; text: string }>, _token: vscode.CancellationToken) => {
            const { session, text } = options.input;

            // Destination validation (REQ_MSG_SENDTOSESSION AC-3/4, REQ_MSG_DEST_ERROR)
            const validNames = await getValidDestinations(scanner);
            if (!validNames.includes(session)) {
                const sorted = [...validNames].sort((a, b) =>
                    a.localeCompare(b, undefined, { sensitivity: 'base' })
                );
                const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
                throw new Error(
                    `Destination session "${session}" does not exist.\n` +
                    `Valid destinations: ${listStr}`
                );
            }

            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            const sender = options.input.senderSession || activeTab?.label || 'unknown';
            appendMessage(resolveMessagesPath(), session, sender, text);
            log.info(`[MSG] sendToSession: destination="${session}", sender="${sender}"`);
            messageProvider.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Message queued for destination "${session}" from "${sender}"`)
            ]);
        },
        'Queues a message for delivery to another VS Code chat session identified by name. Fails with an error if the destination session does not exist.',
        { session: z.string().describe('Target chat session name'), senderSession: z.string().optional().describe('Sender session name'), text: z.string().describe('Message text') },
        async (args) => {
            const session = args.session as string;
            const text = args.text as string;

            // Destination validation (REQ_MSG_SENDTOSESSION AC-3/4, REQ_MSG_DEST_ERROR)
            const validNames = await getValidDestinations(scanner);
            if (!validNames.includes(session)) {
                const sorted = [...validNames].sort((a, b) =>
                    a.localeCompare(b, undefined, { sensitivity: 'base' })
                );
                const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
                throw new Error(
                    `Destination session "${session}" does not exist.\n` +
                    `Valid destinations: ${listStr}`
                );
            }

            const sender = (args.senderSession as string) || 'mcp-client';
            appendMessage(resolveMessagesPath(), session, sender, text);
            log.info(`[MSG] sendToSession(MCP): destination="${session}", sender="${sender}"`);
            messageProvider.reload();
            return { status: 'queued', destination: session, sender };
        }
    );

    // Register LM+MCP tool: readMessage (SPEC_MSG_READMESSAGE)
    // Requirements: REQ_MSG_READ
    const readMessageTool = registerDualTool(
        'jarvis_readMessage',
        async (options: vscode.LanguageModelToolInvocationOptions<{ destination: string }>, _token: vscode.CancellationToken) => {
            const result = popMessage(resolveMessagesPath(), options.input.destination);
            log.info(`[MSG] readMessage: destination="${options.input.destination}", remaining=${result.remaining}`);
            messageProvider.reload();
            if (result.message) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        message: { sender: result.message.sender, text: result.message.text, timestamp: result.message.timestamp },
                        remaining: result.remaining
                    }))
                ]);
            }
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ message: null, remaining: 0 }))
            ]);
        },
        'Reads and removes the oldest message from the Jarvis message queue for the given destination session.',
        { destination: z.string().describe('The exact name/title of the chat session whose inbox to read') },
        async (args) => {
            const destination = args.destination as string;
            const result = popMessage(resolveMessagesPath(), destination);
            log.info(`[MSG] readMessage(MCP): destination="${destination}", remaining=${result.remaining}`);
            messageProvider.reload();
            if (result.message) {
                return {
                    message: { sender: result.message.sender, text: result.message.text, timestamp: result.message.timestamp },
                    remaining: result.remaining
                };
            }
            return { message: null, remaining: 0 };
        }
    );

    // Register LM+MCP tool: listSessions — BREAKING SWAP (SPEC_MSG_LISTSESSIONS, SPEC_SES_TOOLS)
    // Returns YAML session entities; legacy chat-tabs behavior moved to jarvis_listChatSessions.
    // Requirements: REQ_MSG_LISTSESSIONS, REQ_SES_LISTTOOL
    const listSessionsTool = registerDualTool(
        'jarvis_listSessions',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const sessions = scanner?.entities
                .filter(e => e.kind === 'session')
                .map(e => ({ name: e.name, summary: e.summary ?? '', agent: e.agent ?? '', folder: e.folder })) ?? [];
            log.info(`[SES] listSessions: ${sessions.length} session(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ sessions }))
            ]);
        },
        'Returns all Jarvis session entities (YAML-based) with name, summary, agent, and folder path.',
        {},
        async () => {
            const sessions = scanner?.entities
                .filter(e => e.kind === 'session')
                .map(e => ({ name: e.name, summary: e.summary ?? '', agent: e.agent ?? '', folder: e.folder })) ?? [];
            log.info(`[SES] listSessions(MCP): ${sessions.length} session(s)`);
            return { sessions };
        }
    );

    // Register LM+MCP tool: listChatSessions (SPEC_MSG_LISTSESSIONS)
    // Returns VS Code chat tab titles (the old jarvis_listSessions behavior)
    const listChatSessionsTool = registerDualTool(
        'jarvis_listChatSessions',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions)
                .map(s => s.title);
            log.info(`[MSG] listChatSessions: ${named.length} session(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(named))
            ]);
        },
        'Returns the list of named VS Code chat session titles in the current workspace.',
        {},
        async () => {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions)
                .map(s => s.title);
            log.info(`[MSG] listChatSessions(MCP): ${named.length} session(s)`);
            return { sessions: named };
        }
    );

    // Implementation: SPEC_AUT_JOBREG_TOOLS
    // Requirements: REQ_AUT_JOBREG_TOOLS

    // Validation helper (SPEC_AUT_REGISTERJOB_VALIDATION, SPEC_AUT_HEARTBEAT_RESOLVER_REUSE)
    async function validateJobDestinations(steps: HeartbeatStep[]): Promise<void> {
        const validNames = await getValidDestinations(scanner);
        for (const step of steps) {
            if (step.type === 'queue' && step.destination) {
                if (!validNames.includes(step.destination)) {
                    const sorted = [...validNames].sort((a, b) =>
                        a.localeCompare(b, undefined, { sensitivity: 'base' })
                    );
                    const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
                    throw new Error(
                        `Destination session "${step.destination}" does not exist.\n` +
                        `Valid destinations: ${listStr}`
                    );
                }
            }
        }
    }

    const registerJobTool = registerDualTool(
        'jarvis_registerJob',
        async (options: vscode.LanguageModelToolInvocationOptions<{ name: string; schedule: string; steps: HeartbeatStep[] }>, _token: vscode.CancellationToken) => {
            const { name, schedule, steps } = options.input;
            await validateJobDestinations(steps);
            const job: HeartbeatJob = { name, schedule, steps };
            await scheduler!.registerJob(job);
            log.info(`[Heartbeat] registerJob: name="${name}", schedule="${schedule}"`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Job '${name}' registered with schedule '${schedule}'`)
            ]);
        },
        'Registers (or updates) a heartbeat job with the given name, cron schedule, and steps.',
        {
            name: z.string().describe('Unique name for the heartbeat job'),
            schedule: z.string().describe('5-field cron expression or "manual"'),
            steps: z.array(z.object({
                type: z.string().describe('Step type: python, powershell, command, agent, or queue'),
                run: z.string().optional().describe('Script path or VS Code command ID (for python/powershell/command)'),
                prompt: z.string().optional().describe('Path to prompt file (for agent steps)'),
                outputFile: z.string().optional().describe('Path to write LLM response (for agent steps)'),
                append: z.boolean().optional().describe('Append to outputFile instead of overwrite (for agent steps)'),
                destination: z.string().optional().describe('Target chat session name (for queue steps)'),
                sender: z.string().optional().describe('Sender name (for queue steps)'),
                text: z.string().optional().describe('Message content (for queue steps)')
            }))
        },
        async (args) => {
            const name = args.name as string;
            const schedule = args.schedule as string;
            const steps = args.steps as HeartbeatStep[];
            await validateJobDestinations(steps);
            const job: HeartbeatJob = { name, schedule, steps };
            await scheduler!.registerJob(job);
            log.info(`[Heartbeat] registerJob(MCP): name="${name}", schedule="${schedule}"`);
            return { status: 'registered', name, schedule };
        }
    );

    // Implementation: SPEC_AUT_JOBREG_TOOLS
    // Requirements: REQ_AUT_JOBREG_TOOLS
    const unregisterJobTool = registerDualTool(
        'jarvis_unregisterJob',
        async (options: vscode.LanguageModelToolInvocationOptions<{ name: string }>, _token: vscode.CancellationToken) => {
            const { name } = options.input;
            const existed = scheduler!.currentJobs.some(j => j.name === name);
            await scheduler!.unregisterJob(name);
            log.info(`[Heartbeat] unregisterJob: name="${name}", existed=${existed}`);
            const text = existed ? `Job '${name}' unregistered` : `Job '${name}' not found`;
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(text)
            ]);
        },
        'Removes a heartbeat job by name. Returns whether the job was found and removed.',
        { name: z.string().describe('The name of the heartbeat job to remove') },
        async (args) => {
            const name = args.name as string;
            const existed = scheduler!.currentJobs.some(j => j.name === name);
            await scheduler!.unregisterJob(name);
            log.info(`[Heartbeat] unregisterJob(MCP): name="${name}", existed=${existed}`);
            return existed
                ? { status: 'unregistered', name }
                : { status: 'not_found', name };
        }
    );

    // Implementation: SPEC_AUT_LISTJOBS_TOOL
    // Requirements: REQ_AUT_LISTJOBS_TOOL
    function jobDescriptor(job: HeartbeatJob): {
        name: string;
        schedule: string;
        enabled: boolean;
        nextFire: string | null;
    } {
        const enabled = job.enabled !== false;
        let nextFire: string | null = null;
        if (enabled && job.schedule !== 'manual') {
            try {
                nextFire = CronExpressionParser
                    .parse(job.schedule)
                    .next()
                    .toDate()
                    .toISOString();
            } catch {
                nextFire = null;
            }
        }
        return { name: job.name, schedule: job.schedule, enabled, nextFire };
    }

    const listJobsTool = registerDualTool(
        'jarvis_listJobs',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const jobs = scheduler!.currentJobs.map(j => jobDescriptor(j));
            log.info(`[Heartbeat] listJobs: ${jobs.length} job(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(jobs))
            ]);
        },
        'Returns all registered heartbeat jobs with name, schedule, enabled state, and next scheduled fire time (ISO 8601 or null for manual/paused jobs).',
        {},
        async () => {
            const jobs = scheduler!.currentJobs.map(j => jobDescriptor(j));
            log.info(`[Heartbeat] listJobs(MCP): ${jobs.length} job(s)`);
            return { jobs };
        }
    );

    // Implementation: SPEC_MSG_REMINDERSTOOLS
    // Requirements: REQ_MSG_REMINDERS_TOOLS
    const setReminderTool = registerDualTool(
        'jarvis_setReminder',
        async (options: vscode.LanguageModelToolInvocationOptions<{ text: string; session: string; deliverAt: string }>, _token: vscode.CancellationToken) => {
            const { text, session, deliverAt } = options.input;
            if (new Date(deliverAt) <= new Date()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: 'deliverAt must be in the future' }))
                ]);
            }
            const reminder = addReminder(configPaths.getRemindersPath() ?? '', text, session, deliverAt);
            log.info(`[MSG] setReminder: id="${reminder.id}", session="${session}", deliverAt="${deliverAt}"`);
            remindersProvider?.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ id: reminder.id, deliverAt: reminder.deliverAt }))
            ]);
        },
        'Registers a time-scheduled reminder that delivers a message to a named chat session at the specified time.',
        { text: z.string().describe('Message to deliver'), session: z.string().describe('Target chat session name'), deliverAt: z.string().describe('ISO 8601 delivery timestamp (must be in the future)') },
        async (args) => {
            const text = args.text as string;
            const session = args.session as string;
            const deliverAt = args.deliverAt as string;
            if (new Date(deliverAt) <= new Date()) {
                return { error: 'deliverAt must be in the future' };
            }
            const reminder = addReminder(configPaths.getRemindersPath() ?? '', text, session, deliverAt);
            log.info(`[MSG] setReminder(MCP): id="${reminder.id}", session="${session}", deliverAt="${deliverAt}"`);
            remindersProvider?.reload();
            return { id: reminder.id, deliverAt: reminder.deliverAt };
        }
    );

    const listRemindersTool = registerDualTool(
        'jarvis_listReminders',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const reminders = readReminders(configPaths.getRemindersPath() ?? '');
            const now = Date.now();
            const result = reminders.map(r => ({ ...r, remainingMs: new Date(r.deliverAt).getTime() - now }));
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ reminders: result }))
            ]);
        },
        'Returns all pending reminders with id, text, session, deliverAt, and remainingMs.',
        {},
        async () => {
            const reminders = readReminders(configPaths.getRemindersPath() ?? '');
            const now = Date.now();
            return { reminders: reminders.map(r => ({ ...r, remainingMs: new Date(r.deliverAt).getTime() - now })) };
        }
    );

    const cancelReminderTool = registerDualTool(
        'jarvis_cancelReminder',
        async (options: vscode.LanguageModelToolInvocationOptions<{ id: string }>, _token: vscode.CancellationToken) => {
            const { id } = options.input;
            const removed = removeReminder(configPaths.getRemindersPath() ?? '', id);
            log.info(`[MSG] cancelReminder: id="${id}", removed=${removed}`);
            remindersProvider?.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ status: removed ? 'cancelled' : 'not_found' }))
            ]);
        },
        'Cancels a pending reminder by id. Returns { status: "cancelled" | "not_found" }.',
        { id: z.string().describe('Reminder UUID to cancel') },
        async (args) => {
            const id = args.id as string;
            const removed = removeReminder(configPaths.getRemindersPath() ?? '', id);
            log.info(`[MSG] cancelReminder(MCP): id="${id}", removed=${removed}`);
            remindersProvider?.reload();
            return { status: removed ? 'cancelled' : 'not_found' };
        }
    );

    // Implementation: SPEC_EXP_LISTPROJECTS
    // Requirements: REQ_EXP_LISTPROJECTS
    function collectLeaves(nodes: TreeNode[]): LeafNode[] {
        const result: LeafNode[] = [];
        for (const node of nodes) {
            if (node.kind === 'leaf') {
                result.push(node);
            } else {
                result.push(...collectLeaves(node.children));
            }
        }
        return result;
    }

    // Implementation: SPEC_EXP_CREATEPROJECT
    // Requirements: REQ_EXP_CREATEPROJECT
    async function createProjectEntity(args: { name: string; summary?: string; agent?: string }): Promise<{ created: boolean; reason?: string; path?: string }> {
        const { name, summary, agent } = args;

        if (!name) { throw new Error('invalid project name: name must not be empty'); }
        if (/[/\\:*?"<>|]/.test(name)) { throw new Error('invalid project name: contains forbidden character (/ \\ : * ? " < > |)'); }
        if (/[\x00-\x1F]/.test(name)) { throw new Error('invalid project name: contains null or control character'); }
        if (name === '.' || name === '..') { throw new Error('invalid project name: must not be "." or ".."'); }
        if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) { throw new Error('invalid project name: reserved device name'); }

        if (agent) {
            const available = await discoverAgentModes();
            const validAgentNames = available.map(a => a.name);
            if (!validAgentNames.includes(agent)) {
                const names = validAgentNames.length > 0 ? validAgentNames.sort().join(', ') : '(none)';
                throw new Error(`Agent "${agent}" is not available.\nAvailable agents: ${names}`);
            }
        }

        const projectsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('projects.folder', '');
        if (!projectsFolder) { throw new Error('jarvis_createProject: projects.folder not configured'); }

        const targetPath = path.join(projectsFolder, name);
        if (fs.existsSync(targetPath)) {
            return { created: false, reason: `project "${name}" already exists` };
        }

        await fs.promises.mkdir(targetPath, { recursive: true });

        const yamlLines = [`name: ${yamlString(name)}`];
        if (summary) { yamlLines.push(`summary: ${yamlString(summary)}`); }
        if (agent) { yamlLines.push(`agent: ${yamlString(agent)}`); }
        yamlLines.push('');
        await fs.promises.writeFile(path.join(targetPath, 'project.yaml'), yamlLines.join('\n'), 'utf-8');

        const contextContent = summary ? `# ${name}\n\n${summary}\n` : `# ${name}\n\n`;
        await fs.promises.writeFile(path.join(targetPath, 'context.md'), contextContent, 'utf-8');

        await scanner?.rescan();
        log.info(`[EXP] createProject: created "${name}" at ${targetPath}`);
        return { created: true, path: path.relative(projectsFolder, targetPath).replace(/\\/g, '/') };
    }

    // Implementation: SPEC_EXP_CREATEEVENT
    // Requirements: REQ_EXP_CREATEEVENT
    async function createEventEntity(args: { name: string; startDate: string; endDate?: string; summary?: string; agent?: string }): Promise<{ created: boolean; reason?: string; path?: string }> {
        const { name, startDate, summary, agent } = args;
        const endDate = args.endDate || startDate;

        if (!name) { throw new Error('invalid event name: name must not be empty'); }
        if (/[/\\:*?"<>|]/.test(name)) { throw new Error('invalid event name: contains forbidden character (/ \\ : * ? " < > |)'); }
        if (/[\x00-\x1F]/.test(name)) { throw new Error('invalid event name: contains null or control character'); }
        if (name === '.' || name === '..') { throw new Error('invalid event name: must not be "." or ".."'); }
        if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) { throw new Error('invalid event name: reserved device name'); }

        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) { throw new Error('invalid date: startDate must be YYYY-MM-DD'); }
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const sDate = new Date(sy, sm - 1, sd);
        if (sDate.getFullYear() !== sy || sDate.getMonth() !== sm - 1 || sDate.getDate() !== sd) {
            throw new Error('invalid date: startDate is not a valid calendar date');
        }
        if (endDate && endDate !== startDate) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) { throw new Error('invalid date: endDate must be YYYY-MM-DD'); }
            const [ey, em, ed] = endDate.split('-').map(Number);
            const eDate = new Date(ey, em - 1, ed);
            if (eDate.getFullYear() !== ey || eDate.getMonth() !== em - 1 || eDate.getDate() !== ed) {
                throw new Error('invalid date: endDate is not a valid calendar date');
            }
        }

        if (agent) {
            const available = await discoverAgentModes();
            const validAgentNames = available.map(a => a.name);
            if (!validAgentNames.includes(agent)) {
                const names = validAgentNames.length > 0 ? validAgentNames.sort().join(', ') : '(none)';
                throw new Error(`Agent "${agent}" is not available.\nAvailable agents: ${names}`);
            }
        }

        const eventsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('events.folder', '');
        if (!eventsFolder) { throw new Error('jarvis_createEvent: events.folder not configured'); }

        const folderName = `${startDate}_${name}`;
        const targetPath = path.join(eventsFolder, folderName);
        if (fs.existsSync(targetPath)) {
            return { created: false, reason: `event folder "${folderName}" already exists` };
        }

        await fs.promises.mkdir(targetPath, { recursive: true });

        const yamlLines = [
            `name: ${yamlString(name)}`,
            `summary: ${yamlString(summary ?? '')}`,
            `dates:`,
            `  start: "${startDate}"`,
            `  end: "${endDate}"`,
        ];
        if (agent) { yamlLines.push(`agent: ${yamlString(agent)}`); }
        yamlLines.push('');
        await fs.promises.writeFile(path.join(targetPath, 'event.yaml'), yamlLines.join('\n'), 'utf-8');

        const contextContent = `# ${name}\n\n`;
        await fs.promises.writeFile(path.join(targetPath, 'context.md'), contextContent, 'utf-8');

        await scanner?.rescan();
        log.info(`[EXP] createEvent: created "${name}" at ${targetPath}`);
        return { created: true, path: folderName };
    }

    const listProjectsTool = registerDualTool(
        'jarvis_listProjects',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const projectsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('projects.folder', '');
            const leaves = collectLeaves(scanner?.getProjectTree() ?? []);
            const projects = leaves.map(leaf => {
                const entity = scanner?.getEntity(leaf.id);
                const absDir = path.dirname(leaf.id);
                const rel = projectsFolder
                    ? path.relative(projectsFolder, absDir)
                    : absDir;
                return {
                    name: entity?.name ?? path.basename(absDir),
                    folder: rel.replace(/\\/g, '/')
                };
            });
            log.info(`[EXP] listProjects: ${projects.length} project(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(projects))
            ]);
        },
        'Returns the list of projects configured in the current Jarvis workspace. Each project has a name and folder path.',
        {},
        async () => {
            const projectsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('projects.folder', '');
            const leaves = collectLeaves(scanner?.getProjectTree() ?? []);
            const projects = leaves.map(leaf => {
                const entity = scanner?.getEntity(leaf.id);
                const absDir = path.dirname(leaf.id);
                const rel = projectsFolder
                    ? path.relative(projectsFolder, absDir)
                    : absDir;
                return {
                    name: entity?.name ?? path.basename(absDir),
                    folder: rel.replace(/\\/g, '/')
                };
            });
            log.info(`[EXP] listProjects(MCP): ${projects.length} project(s)`);
            return { projects };
        }
    );

    // Implementation: SPEC_EXP_LISTEVENTS
    // Requirements: REQ_EXP_LISTEVENTS
    const listEventsTool = registerDualTool(
        'jarvis_listEvents',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const eventsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('events.folder', '');
            const leaves = collectLeaves(scanner?.getEventTree() ?? []);
            const events = leaves.map(leaf => {
                const entity = scanner?.getEntity(leaf.id);
                const absDir = path.dirname(leaf.id);
                const rel = eventsFolder
                    ? path.relative(eventsFolder, absDir)
                    : absDir;
                return {
                    name: entity?.name ?? path.basename(absDir),
                    summary: entity?.summary ?? '',
                    agent: entity?.agent ?? '',
                    datesStart: entity?.datesStart ?? '',
                    datesEnd: entity?.datesEnd ?? '',
                    folder: rel.replace(/\\/g, '/'),
                };
            });
            log.info(`[EXP] listEvents: ${events.length} event(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(events))
            ]);
        },
        'Returns the list of events with name, summary, dates, agent, and folder path.',
        {},
        async () => {
            const eventsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('events.folder', '');
            const leaves = collectLeaves(scanner?.getEventTree() ?? []);
            const events = leaves.map(leaf => {
                const entity = scanner?.getEntity(leaf.id);
                const absDir = path.dirname(leaf.id);
                const rel = eventsFolder
                    ? path.relative(eventsFolder, absDir)
                    : absDir;
                return {
                    name: entity?.name ?? path.basename(absDir),
                    summary: entity?.summary ?? '',
                    agent: entity?.agent ?? '',
                    datesStart: entity?.datesStart ?? '',
                    datesEnd: entity?.datesEnd ?? '',
                    folder: rel.replace(/\\/g, '/'),
                };
            });
            log.info(`[EXP] listEvents(MCP): ${events.length} event(s)`);
            return { events };
        }
    );

    // Implementation: SPEC_EXP_CREATEPROJECT
    // Requirements: REQ_EXP_CREATEPROJECT
    const createProjectTool = registerDualTool(
        'jarvis_createProject',
        async (
            options: vscode.LanguageModelToolInvocationOptions<{ name: string; summary?: string; agent?: string }>,
            _token: vscode.CancellationToken
        ) => {
            const result = await createProjectEntity(options.input);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        },
        'Creates a new project folder with project.yaml and context.md. Idempotent: returns success if project already exists.',
        {
            name: z.string().describe('Project name; used verbatim as the folder name'),
            summary: z.string().optional().describe('Optional short description'),
            agent: z.string().optional().describe("Optional VS Code chat-mode name. Must match a user-invocable agent in .github/agents/."),
        },
        async (args) => {
            return await createProjectEntity({
                name: args.name as string,
                summary: args.summary as string | undefined,
                agent: args.agent as string | undefined,
            });
        }
    );

    // Implementation: SPEC_EXP_CREATEEVENT
    // Requirements: REQ_EXP_CREATEEVENT
    const createEventTool = registerDualTool(
        'jarvis_createEvent',
        async (
            options: vscode.LanguageModelToolInvocationOptions<{ name: string; startDate: string; endDate?: string; summary?: string; agent?: string }>,
            _token: vscode.CancellationToken
        ) => {
            const result = await createEventEntity(options.input);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        },
        'Creates a new event folder with event.yaml and context.md. Folder name: ${startDate}_${name}. Idempotent.',
        {
            name: z.string().describe('Event name; used verbatim in folder name and YAML'),
            startDate: z.string().describe('Start date in YYYY-MM-DD format'),
            endDate: z.string().optional().describe('End date in YYYY-MM-DD format (defaults to startDate)'),
            summary: z.string().optional().describe('Optional short description'),
            agent: z.string().optional().describe("Optional VS Code chat-mode name. Must match a user-invocable agent."),
        },
        async (args) => {
            return await createEventEntity({
                name: args.name as string,
                startDate: args.startDate as string,
                endDate: args.endDate as string | undefined,
                summary: args.summary as string | undefined,
                agent: args.agent as string | undefined,
            });
        }
    );

    // Implementation: SPEC_SES_CREATETOOL
    // Requirements: REQ_SES_CREATETOOL
    let createSessionTool: vscode.Disposable | undefined;
    if (cfg.get<boolean>('sessions.enabled', true)) {
        const createSession = async (args: {
            name: string;
            summary?: string;
            agent?: string;
            initialMessage?: string;
        }): Promise<{ created: boolean; reason?: string; path: string }> => {
        const { name, summary, agent, initialMessage } = args;

        // Name validation (before any filesystem operation)
        if (!name) {
            throw new Error('invalid session name: name must not be empty');
        }
        if (/[/\\:*?"<>|]/.test(name)) {
            throw new Error('invalid session name: contains forbidden character (/ \\ : * ? " < > |)');
        }
        if (/[\x00-\x1F]/.test(name)) {
            throw new Error('invalid session name: contains null or control character');
        }
        if (name === '.' || name === '..') {
            throw new Error('invalid session name: must not be "." or ".."');
        }
        if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) {
            throw new Error('invalid session name: reserved device name');
        }

        // Agent validation (after name validation, before filesystem operations)
        // Implementation: SPEC_SES_AGENT_CREATETOOL
        // Requirements: REQ_SES_AGENT_CREATETOOL, REQ_SES_AGENT_VALIDATION
        if (agent) {
            const available = await discoverAgentModes();
            const validNames = available.map(a => a.name);
            if (!validNames.includes(agent)) {
                const names = validNames.length > 0
                    ? validNames.sort().join(', ')
                    : '(none)';
                throw new Error(
                    `Agent "${agent}" is not available.\nAvailable agents: ${names}`
                );
            }
        }

        // Workspace check
        const sessionsDir = configPaths.ensureSessionsDir();
        if (!sessionsDir) {
            throw new Error('jarvis_createSession: no workspace open');
        }

        const targetPath = path.join(sessionsDir, name);
        const relPath = `.jarvis/sessions/${name}`;

        // Idempotency check
        if (fs.existsSync(targetPath)) {
            log.info(`[SES] createSession: idempotent skip for "${name}"`);
            try {
                const sessionYamlPath = path.join(targetPath, 'session.yaml');
                const leaf: LeafNode = { kind: 'leaf', id: sessionYamlPath };
                await vscode.commands.executeCommand('jarvis.openAgentSession', leaf);
                log.info(`[SES] createSession: idempotent skip but auto-opened session "${name}"`);
            } catch (err) {
                log.warn(`[SES] createSession: auto-open failed for "${name}": ${err}`);
            }
            return {
                created: false,
                reason: `session "${name}" already exists; no action taken`,
                path: relPath,
            };
        }

        // Create directory
        await fs.promises.mkdir(targetPath, { recursive: true });

        // Write session.yaml (mirrors newSessionCommand serialisation)
        const yamlLines = [`name: ${yamlString(name)}`];
        if (summary) {
            yamlLines.push(`summary: ${yamlString(summary)}`);
        }
        if (agent) {
            yamlLines.push(`agent: ${yamlString(agent)}`);
        }
        yamlLines.push('');
        await fs.promises.writeFile(
            path.join(targetPath, 'session.yaml'),
            yamlLines.join('\n'),
            'utf-8'
        );

        // Write context.md
        const contextContent = summary ? `# ${name}\n\n${summary}\n` : `# ${name}\n\n`;
        await fs.promises.writeFile(
            path.join(targetPath, 'context.md'),
            contextContent,
            'utf-8'
        );

        // Enqueue initial message if provided
        if (initialMessage) {
            appendMessage(resolveMessagesPath(), name, 'jarvis_createSession', initialMessage);
            messageProvider.reload();
        }

        // Trigger rescan so Sessions Tree refreshes within 2 s (AC-3)
        await scanner?.rescan();

        // Auto-open the new session as an agent session (REQ AC-10)
        try {
            const sessionYamlPath = path.join(targetPath, 'session.yaml');
            const leaf: LeafNode = { kind: 'leaf', id: sessionYamlPath };
            await vscode.commands.executeCommand('jarvis.openAgentSession', leaf);
            log.info(`[SES] createSession: auto-opened new session "${name}"`);
        } catch (err) {
            log.warn(`[SES] createSession: auto-open failed for "${name}": ${err}`);
        }

        log.info(`[SES] createSession: created "${name}" at ${targetPath}`);
        return { created: true, path: relPath };
        };

        createSessionTool = registerDualTool(
        'jarvis_createSession',
        async (
            options: vscode.LanguageModelToolInvocationOptions<{
                name: string;
                summary?: string;
                agent?: string;
                initialMessage?: string;
            }>,
            _token: vscode.CancellationToken
        ) => {
            const result = await createSession(options.input);
            log.info(`[SES] createSession: created=${result.created}, path=${result.path}`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        },
        'Creates a new Jarvis session folder with session.yaml and context.md under <workspace>/.jarvis/sessions/<name>/. Optional agent selects the VS Code chat mode used when auto-opening. Idempotent: returns success if session already exists.',
        {
            name: z.string().describe('Session name; used verbatim as the folder name'),
            summary: z.string().optional().describe('Optional short description written to session.yaml'),
            agent: z.string().optional().describe("Optional VS Code chat-mode name (e.g. 'syspilot.cm'). When set, opening the session activates that agent automatically. Must match a user-invocable agent in .github/agents/."),
            initialMessage: z.string().optional().describe("Optional first message to enqueue in the new session's inbox"),
        },
        async (args) => {
            const result = await createSession({
                name: args.name as string,
                summary: args.summary as string | undefined,
                agent: args.agent as string | undefined,
                initialMessage: args.initialMessage as string | undefined,
            });
            log.info(`[SES] createSession(MCP): created=${result.created}, path=${result.path}`);
            return result;
        }
    );
    } // end if (sessions.enabled) — SPEC_SES_CREATETOOL + SPEC_SES_TOOLS

    // Implementation: SPEC_PIM_CATTOOL
    // Requirements: REQ_PIM_CATTOOL
    const categoryTool = registerDualTool(
        'jarvis_category',
        async (options: vscode.LanguageModelToolInvocationOptions<{
            action: string;
            name?: string;
            filter?: string;
            provider?: string;
            oldName?: string;
            newName?: string;
        }>, _token: vscode.CancellationToken) => {
            if (!categoryService.hasProviders()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'No category providers configured. '
                        + 'Enable a PIM provider (e.g. jarvis.outlookEnabled).'
                    )
                ]);
            }
            const { action, name, filter, provider, oldName, newName } = options.input;
            let result: object;
            switch (action) {
                case 'get':
                    result = { categories: await categoryService.getCategories(filter) };
                    break;
                case 'set':
                    if (!name) { throw new Error('name required for set'); }
                    await categoryService.setCategory(name, 0, provider);
                    result = { status: 'ok', name };
                    break;
                case 'delete':
                    if (!name) { throw new Error('name required for delete'); }
                    await categoryService.deleteCategory(name, provider);
                    result = { status: 'ok', name };
                    break;
                case 'rename':
                    if (!oldName || !newName) { throw new Error('oldName and newName required for rename'); }
                    await categoryService.renameCategory(oldName, newName, provider);
                    result = { status: 'ok', oldName, newName };
                    break;
                default:
                    throw new Error(`Unknown action: ${action}`);
            }
            categoryTreeProvider.refresh();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        },
        'Manage categories: get, set, delete, or rename.',
        {
            action: z.enum(['get', 'set', 'delete', 'rename']),
            name: z.string().optional(),
            filter: z.string().optional(),
            provider: z.string().optional(),
            oldName: z.string().optional(),
            newName: z.string().optional()
        },
        async (args) => {
            if (!categoryService.hasProviders()) {
                return { error: 'No category providers configured.' };
            }
            const action = args.action as string;
            const name = args.name as string | undefined;
            const filter = args.filter as string | undefined;
            const provider = args.provider as string | undefined;
            const oldNameArg = args.oldName as string | undefined;
            const newNameArg = args.newName as string | undefined;
            switch (action) {
                case 'get':
                    return { categories: await categoryService.getCategories(filter) };
                case 'set':
                    if (!name) { return { error: 'name is required' }; }
                    await categoryService.setCategory(name, 0, provider);
                    categoryTreeProvider.refresh();
                    return { status: 'ok', name };
                case 'delete':
                    if (!name) { return { error: 'name is required' }; }
                    await categoryService.deleteCategory(name, provider);
                    categoryTreeProvider.refresh();
                    return { status: 'ok', name };
                case 'rename':
                    if (!oldNameArg || !newNameArg) { return { error: 'oldName and newName are required' }; }
                    await categoryService.renameCategory(oldNameArg, newNameArg, provider);
                    categoryTreeProvider.refresh();
                    return { status: 'ok', oldName: oldNameArg, newName: newNameArg };
                default:
                    return { error: `Unknown action: ${action}` };
            }
        }
    );

    // Implementation: SPEC_PIM_TASKTOOL
    // Requirements: REQ_PIM_TASKTOOL
    const taskTool = registerDualTool(
        'jarvis_task',
        async (options: vscode.LanguageModelToolInvocationOptions<{
            action: string;
            category?: string;
            status?: string;
            dueBefore?: string;
            includeBody?: boolean;
            id?: string;
            subject?: string;
            body?: string;
            dueDate?: string;
            priority?: string;
            isComplete?: boolean;
            categories?: string[];
            provider?: string;
            completedDate?: string;
        }>, _token: vscode.CancellationToken) => {
            if (!taskService.hasProviders()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(
                        'No task providers configured. '
                        + 'Enable jarvis.outlookEnabled and jarvis.outlook.tasks.enabled.'
                    )
                ]);
            }
            const input = options.input;
            if (input.completedDate !== undefined) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('completedDate is read-only and cannot be set directly.')
                ]);
            }
            let result: object;
            switch (input.action) {
                case 'get': {
                    const tasks = await taskService.getTasks({
                        category: input.category,
                        status: input.status,
                        dueBefore: input.dueBefore
                    });
                    const mapped = input.includeBody
                        ? tasks
                        : tasks.map(({ body: _b, ...t }) => t);
                    result = { tasks: mapped };
                    break;
                }
                case 'set': {
                    const newTask = await taskService.setTask(input as any, input.provider);
                    projectProvider?.refresh();
                    eventProvider?.refresh();
                    result = { task: newTask };
                    break;
                }
                case 'modify': {
                    if (!input.id) { throw new Error('id required for modify'); }
                    const { completedDate: _cd, ...changes } = input as any;
                    delete changes.action;
                    delete changes.provider;
                    delete changes.id;
                    delete changes.includeBody;
                    delete changes.category;
                    delete changes.status;
                    delete changes.dueBefore;
                    await taskService.modifyTask(input.id, changes, input.provider);
                    projectProvider?.refresh();
                    eventProvider?.refresh();
                    result = { status: 'ok', id: input.id };
                    break;
                }
                case 'delete': {
                    if (!input.id) { throw new Error('id required for delete'); }
                    await taskService.deleteTask(input.id, input.provider);
                    projectProvider?.refresh();
                    eventProvider?.refresh();
                    result = { status: 'ok', id: input.id };
                    break;
                }
                default:
                    throw new Error(`Unknown action: ${input.action}`);
            }
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        },
        'Manage tasks: get, set, modify, or delete. Tasks are linked to projects/events via their categories field.',
        {
            action: z.enum(['get', 'set', 'modify', 'delete']),
            category: z.string().optional(),
            status: z.string().optional(),
            dueBefore: z.string().optional(),
            includeBody: z.boolean().optional(),
            id: z.string().optional(),
            subject: z.string().optional(),
            body: z.string().optional(),
            dueDate: z.string().optional(),
            priority: z.string().optional(),
            isComplete: z.boolean().optional(),
            categories: z.array(z.string()).optional(),
            provider: z.string().optional()
        },
        async (args) => {
            if (!taskService.hasProviders()) {
                return { error: 'No task providers configured.' };
            }
            const action = args.action as string;
            if ((args as any).completedDate !== undefined) {
                return { error: 'completedDate is read-only.' };
            }
            switch (action) {
                case 'get': {
                    const tasks = await taskService.getTasks({
                        category: args.category as string | undefined,
                        status: args.status as string | undefined,
                        dueBefore: args.dueBefore as string | undefined
                    });
                    const mapped = args.includeBody
                        ? tasks
                        : tasks.map(({ body: _b, ...t }) => t);
                    return { tasks: mapped };
                }
                case 'set': {
                    const newTask = await taskService.setTask(args as any, args.provider as string | undefined);
                    projectProvider?.refresh();
                    eventProvider?.refresh();
                    return { task: newTask };
                }
                case 'modify': {
                    if (!args.id) { return { error: 'id is required for modify' }; }
                    const changes = { ...args } as any;
                    delete changes.action;
                    delete changes.id;
                    delete changes.provider;
                    delete changes.includeBody;
                    delete changes.category;
                    delete changes.status;
                    delete changes.dueBefore;
                    delete changes.completedDate;
                    await taskService.modifyTask(args.id as string, changes, args.provider as string | undefined);
                    projectProvider?.refresh();
                    eventProvider?.refresh();
                    return { status: 'ok', id: args.id };
                }
                case 'delete': {
                    if (!args.id) { return { error: 'id is required for delete' }; }
                    await taskService.deleteTask(args.id as string, args.provider as string | undefined);
                    projectProvider?.refresh();
                    eventProvider?.refresh();
                    return { status: 'ok', id: args.id };
                }
                default:
                    return { error: `Unknown action: ${action}` };
            }
        }
    );

    // Register new project command (SPEC_EXP_NEWPROJECT_CMD)
    // Requirements: REQ_EXP_NEWPROJECT
    const newProjectCommand = vscode.commands.registerCommand(
        'jarvis.newProject',
        async () => {
            const projectsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('projects.folder', '');
            if (!projectsFolder) {
                vscode.window.showWarningMessage('Jarvis: jarvis.projects.folder is not configured');
                return;
            }

            const input = await vscode.window.showInputBox({
                prompt: 'Project name',
                placeHolder: 'My Project',
                validateInput: (value: string) => {
                    if (/[<>:"\/\\|?*\x00-\x1f]/.test(value)) {
                        return 'Name contains characters not allowed in folder names';
                    }
                    if (!value.trim()) {
                        return 'Name must not be empty';
                    }
                    return undefined;
                },
            });
            if (!input) { return; }

            // Mandatory agent picker (SPEC_EXP_AGENT_PICKER)
            const agentInput = await pickAgentMode();
            if (agentInput === undefined) { return; } // user cancelled

            const targetPath = path.join(projectsFolder, input);

            if (fs.existsSync(targetPath)) {
                vscode.window.showErrorMessage(
                    `Folder '${input}' already exists in projects folder`);
                return;
            }

            await fs.promises.mkdir(targetPath);
            const yamlLines = [`name: ${yamlString(input)}`];
            yamlLines.push(`agent: ${yamlString(agentInput)}`);
            yamlLines.push('');
            await fs.promises.writeFile(
                path.join(targetPath, 'project.yaml'), yamlLines.join('\n'), 'utf-8');

            // Implementation: SPEC_OLK_AUTOCAT_NEWENTITY
            // Requirements: REQ_OLK_AUTOCAT_NEWENTITY
            try {
                const olkEnabled = vscode.workspace
                    .getConfiguration('jarvis')
                    .get<boolean>('outlook.enabled', false);
                if (olkEnabled && categoryService.hasProviders()) {
                    await categoryService.setCategory(input, 0);
                    log.info(`[NewProject] Outlook category created: "${input}"`);
                }
            } catch (err) {
                log.warn(`[NewProject] Failed to create Outlook category: ${err}`);
            }

            await scanner?.rescan();

            // SPEC_EXP_NEWPROJECT_CMD step 12: open chat via shared helper
            await openChatForEntity(input, 'project', targetPath, agentInput);
        }
    );

    // Register new event command (SPEC_EXP_NEWEVENT_CMD)
    // Requirements: REQ_EXP_NEWEVENT
    const newEventCommand = vscode.commands.registerCommand(
        'jarvis.newEvent',
        async () => {
            const eventsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('events.folder', '');
            if (!eventsFolder) {
                vscode.window.showWarningMessage('Jarvis: jarvis.events.folder is not configured');
                return;
            }

            const nameInput = await vscode.window.showInputBox({
                prompt: 'Event name',
                placeHolder: 'My Event',
                validateInput: (value: string) => {
                    if (/[<>:"\/\\|?*\x00-\x1f]/.test(value)) {
                        return 'Name contains characters not allowed in folder names';
                    }
                    if (!value.trim()) {
                        return 'Name must not be empty';
                    }
                    return undefined;
                },
            });
            if (!nameInput) { return; }

            const dateInput = await vscode.window.showInputBox({
                prompt: 'Start date (YYYY-MM-DD)',
                placeHolder: '2026-01-15',
                validateInput: (value: string) => {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                        return 'Date must be in YYYY-MM-DD format';
                    }
                    const [y, m, d] = value.split('-').map(Number);
                    const date = new Date(y, m - 1, d);
                    if (date.getFullYear() !== y ||
                        date.getMonth() !== m - 1 ||
                        date.getDate() !== d) {
                        return 'Not a valid calendar date';
                    }
                    return undefined;
                },
            });
            if (!dateInput) { return; }

            // Mandatory agent picker (SPEC_EXP_AGENT_PICKER)
            const agentInput = await pickAgentMode();
            if (agentInput === undefined) { return; } // user cancelled

            const folderName = `${dateInput}_${nameInput}`;
            const targetPath = path.join(eventsFolder, folderName);

            if (fs.existsSync(targetPath)) {
                vscode.window.showErrorMessage(
                    `Folder '${folderName}' already exists in events folder`);
                return;
            }

            await fs.promises.mkdir(targetPath);
            const content = [
                `name: ${yamlString(nameInput)}`,
                `agent: ${yamlString(agentInput)}`,
                `dates:`,
                `  start: "${dateInput}"`,
                `  end: "${dateInput}"`,
                '',
            ].join('\n');
            await fs.promises.writeFile(
                path.join(targetPath, 'event.yaml'), content, 'utf-8');

            // Implementation: SPEC_OLK_AUTOCAT_NEWENTITY
            // Requirements: REQ_OLK_AUTOCAT_NEWENTITY
            try {
                const olkEnabled = vscode.workspace
                    .getConfiguration('jarvis')
                    .get<boolean>('outlook.enabled', false);
                if (olkEnabled && categoryService.hasProviders()) {
                    await categoryService.setCategory(nameInput, 0);
                    log.info(`[NewEvent] Outlook category created: "${nameInput}"`);
                }
            } catch (err) {
                log.warn(`[NewEvent] Failed to create Outlook category: ${err}`);
            }

            await scanner?.rescan();

            // SPEC_EXP_NEWEVENT_CMD step 14: open chat via shared helper
            await openChatForEntity(nameInput, 'event', targetPath, agentInput);
        }
    );

    // Implementation: SPEC_SES_NEWENTITY (path validation)
    // Requirements: REQ_SES_NEWENTITY
    const INVALID_PATH_CHARS = /[/\\:*?"<>|]/;
    const CONTROL_CHARS = /[\x00-\x1F]/;
    const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

    function validateSessionName(name: string): string | null {
        const trimmed = name.trim();
        if (!trimmed) {
            return 'Name cannot be empty';
        }
        if (trimmed === '.' || trimmed === '..') {
            return "Name cannot be '.' or '..'";
        }
        if (INVALID_PATH_CHARS.test(trimmed)) {
            return 'Name contains invalid characters (/, \\, :, *, ?, ", <, >, |)';
        }
        if (CONTROL_CHARS.test(trimmed)) {
            return 'Name contains control characters (not allowed)';
        }
        if (WINDOWS_RESERVED.test(trimmed)) {
            return `Name '${trimmed}' is a reserved Windows device name`;
        }
        return null;
    }

    // Implementation: SPEC_SES_MANIFEST (newEntity Session option)
    // Requirements: REQ_SES_NEWENTITY
    // Implementation: SPEC_SES_NEWENTITY (Session branch)
    // Requirements: REQ_SES_NEWENTITY, REQ_SES_AGENT_DISCOVERY
    const newSessionCommand = vscode.commands.registerCommand(
        'jarvis.newSession',
        async () => {
            const targetFolder = configPaths.ensureSessionsDir();
            if (!targetFolder) {
                vscode.window.showWarningMessage('Jarvis: No workspace open.');
                return;
            }

            const nameInput = await vscode.window.showInputBox({
                prompt: 'Session name',
                placeHolder: 'My Session',
                validateInput: validateSessionName,
            });
            if (!nameInput) { return; }

            const summaryInput = await vscode.window.showInputBox({
                prompt: 'Session summary (optional)',
                placeHolder: 'Short description',
            });

            // Implementation: SPEC_SES_AGENT_PICKER
            // Requirements: REQ_SES_AGENT_PICKER
            const agentInput = await pickAgentMode();
            if (agentInput === undefined) { return; } // user cancelled (Escape)

            const sessionName = nameInput.trim();
            const targetPath = path.join(targetFolder, sessionName);

            if (fs.existsSync(targetPath)) {
                vscode.window.showErrorMessage(`Folder '${sessionName}' already exists in sessions folder`);
                return;
            }

            await fs.promises.mkdir(targetPath, { recursive: true });

            const yamlLines = [`name: ${yamlString(nameInput)}`];
            if (summaryInput) {
                yamlLines.push(`summary: ${yamlString(summaryInput)}`);
            }
            // SPEC_SES_AGENT_PICKER: write agent field unconditionally (empty string for default agent)
            yamlLines.push(`agent: ${yamlString(agentInput)}`);
            yamlLines.push('');
            await fs.promises.writeFile(
                path.join(targetPath, 'session.yaml'),
                yamlLines.join('\n'),
                'utf-8'
            );

            const contextContent = `# ${nameInput}\n\n${summaryInput ?? ''}\n`;
            await fs.promises.writeFile(
                path.join(targetPath, 'context.md'),
                contextContent,
                'utf-8'
            );

            await scanner?.rescan();
            log.info(`[NewSession] created session "${nameInput}" at ${targetPath}`);

            // SPEC_SES_NEWENTITY step 10: open chat via shared helper
            await openChatForEntity(nameInput, 'session', targetPath, agentInput);
        }
    );

    const newEntityCommand = vscode.commands.registerCommand(
        'jarvis.newEntity',
        async () => {
            const pick = await vscode.window.showQuickPick([
                { label: 'Project', description: 'Full project entity (name, status, stakeholders)' },
                { label: 'Event', description: 'Calendar event entity (name, dates)' },
                { label: 'Session', description: 'Lightweight project entity (name + summary)' },
            ], { placeHolder: 'Select entity type to create' });
            if (!pick) { return; }

            if (pick.label === 'Project') {
                await vscode.commands.executeCommand('jarvis.newProject');
            } else if (pick.label === 'Event') {
                await vscode.commands.executeCommand('jarvis.newEvent');
            } else if (pick.label === 'Session') {
                await vscode.commands.executeCommand('jarvis.newSession');
            }
        }
    );

    // ------- MCP feature block (SPEC_CFG_TOGGLEGUARDS) -------
    // Implementation: SPEC_MSG_DUALREGISTRATION (lifecycle)
    // Requirements: REQ_MSG_MCPSERVER, REQ_CFG_MCPPORT
    if (cfg.get<boolean>('mcp.enabled', false)) {
        const mcpPort = cfg.get<number>('mcpPort', 31415);
        const mcpStatusBar = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right, 100
        );
        mcpStatusBar.text = `Jarvis MCP: ${mcpPort}`;
        mcpStatusBar.tooltip = 'Jarvis MCP Server';
        startMcpServer(mcpPort, log).then(() => {
            mcpStatusBar.show();
        }).catch(() => { /* error already logged */ });
        context.subscriptions.push(mcpStatusBar);
    } else {
        log.info('[CFG] MCP feature disabled');
    }

    // Implementation: SPEC_REC_STATUSBAR
    // Requirements: REQ_REC_STATUSBAR
    const recordingStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 10);
    recordingStatusBar.command = 'jarvis.stopRecording';
    recordingStatusBar.hide();

    let recordingTimer: ReturnType<typeof setInterval> | undefined;

    function updateRecordingStatusBar(): void {
        const name = _recordingManager!.currentProject;
        const t0 = _recordingManager!.startTime;
        if (!name || t0 === undefined) {
            recordingStatusBar.hide();
            return;
        }
        const elapsed = Math.floor((Date.now() - t0) / 1000);
        const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
        const ss = String(elapsed % 60).padStart(2, '0');
        recordingStatusBar.text = `🔴 ${name} — ${mm}:${ss}`;
        recordingStatusBar.show();
    }

    _recordingManager.onDidChange(() => {
        if (_recordingManager!.currentProject) {
            updateRecordingStatusBar();
            recordingTimer = setInterval(updateRecordingStatusBar, 1000);
        } else {
            if (recordingTimer) {
                clearInterval(recordingTimer);
                recordingTimer = undefined;
            }
            recordingStatusBar.hide();
        }
        projectProvider?.refresh();
        eventProvider?.refresh();
    });

    // Implementation: SPEC_REC_BUTTON
    // Requirements: REQ_REC_BUTTON
    // Register enableAutoDelivery command (SPEC_MSG_AUTODELIVERY)
    const enableAutoDeliveryCommand = vscode.commands.registerCommand(
        'jarvis.enableAutoDelivery',
        (node: SessionGroupNode) => {
            addAutoDelivery(resolveMessagesPath(), node.destination);
            messageProvider.reload();
        }
    );

    // Register disableAutoDelivery command (SPEC_MSG_AUTODELIVERY)
    const disableAutoDeliveryCommand = vscode.commands.registerCommand(
        'jarvis.disableAutoDelivery',
        (node: SessionGroupNode) => {
            removeAutoDelivery(resolveMessagesPath(), node.destination);
            messageProvider.reload();
        }
    );

    // Register cancelReminder command (SPEC_MSG_REMINDERSVIEW)
    const cancelReminderCommand = vscode.commands.registerCommand(
        'jarvis.cancelReminder',
        (node?: ReminderNode) => {
            if (!node || node.kind !== 'reminder') { return; }
            removeReminder(configPaths.getRemindersPath() ?? '', node.reminder.id);
            log.info(`[MSG] cancelReminder(tree): id="${node.reminder.id}"`);
            remindersProvider?.reload();
        }
    );

    // Implementation: SPEC_EXP_REMINDER_OPENFILE
    // Requirements: REQ_EXP_REMINDER_OPENFILE
    const openReminderFileCommand = vscode.commands.registerCommand(
        'jarvis.openReminderFile',
        async (node: ReminderNode) => {
            const remindersPath = configPaths.getRemindersPath() ?? '';
            if (!fs.existsSync(remindersPath)) {
                vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`);
                return;
            }
            const uri = vscode.Uri.file(remindersPath);
            let lineIndex = 0;
            try {
                const doc = await vscode.workspace.openTextDocument(uri);
                const target = `id: ${node.reminder.id}`;
                for (let i = 0; i < doc.lineCount; i++) {
                    if (doc.lineAt(i).text.includes(target)) {
                        lineIndex = i;
                        break;
                    }
                }
                const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
                const editor = await vscode.window.showTextDocument(doc);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
                editor.selection = new vscode.Selection(range.start, range.start);
            } catch {
                vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`);
            }
        }
    );

    // Auto-delivery poll loop (SPEC_MSG_AUTODELIVERY)
    const pollInterval = setInterval(async () => {
        const messagesPath = resolveMessagesPath();
        const autoDeliverySessions = readAutoDelivery(messagesPath);
        if (autoDeliverySessions.length > 0) {
        const messages = readQueue(messagesPath);
        for (const sessionName of autoDeliverySessions) {
            const pending = messages.filter(m => m.destination === sessionName && !m.notified);
            if (pending.length === 0) { continue; }
            // Deliver notification
            try {
                const uuid = await lookupSessionUUID(sessionName);
                if (uuid) {
                    const b64 = Buffer.from(uuid).toString('base64');
                    const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                    await vscode.commands.executeCommand('vscode.open', uri);
                    await new Promise(resolve => setTimeout(resolve, 800));
                } else {
                    // Create a fresh chat editor — never reuses an existing one
                    // Implementation: SPEC_MSG_AUTODELIVER_POLL, SPEC_EXP_AGENTSESSION_INITPROMPT
                    // Requirements: REQ_MSG_AUTODELIVER_POLL, REQ_EXP_AGENTPROMPT_TEMPLATE
                    const entityForPoll = scanner?.entities?.find(e => e.name === sessionName);
                    if (entityForPoll?.agent) {
                        try {
                            await vscode.commands.executeCommand('workbench.action.chat.open', { mode: entityForPoll.agent });
                            await new Promise(resolve => setTimeout(resolve, 300));
                        } catch (err) {
                            log.warn(`[MSG] autoDelivery: failed to prime agent mode "${entityForPoll.agent}": ${err}`);
                        }
                    }
                    await openNewChatEditor();  // SPEC_MSG_OPENCHAT (includes 800 ms settle delay)
                    await renameFocusedChatSession(sessionName);
                    if (entityForPoll) {
                        const kind = entityForPoll.kind ?? 'project';
                        const folder = entityForPoll.folder ?? '';
                        const contextPath = path.join(folder, 'context.md');
                        const rawInitTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('agentSession.initPromptTemplate') ?? '';
                        const defaultInitPrompt =
                            `You are the ${kind} "${entityForPoll.name}".\n\n` +
                            `Use only \`${contextPath}\` as your persistent memory. Read it now.\n\n` +
                            `Keep it minimal and action-oriented:\n` +
                            `- Store only long-lived items under Decision / Finding / Next.\n` +
                            `- One concise line per bullet. Prune aggressively.\n` +
                            `- Replace outdated bullets — never append logs.\n` +
                            `- Never store retries, raw tool output, or transient chatter.\n` +
                            `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.`;
                        const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : defaultInitPrompt;
                        const initPrompt = applyTemplate(initTemplate, { kind, name: entityForPoll.name, contextPath });
                        await vscode.commands.executeCommand('workbench.action.chat.open', { query: initPrompt });
                    }
                }
                const count = pending.length;
                const defaultNotifTemplate =
                    `[Jarvis Message Service] You have \${count} new message(s) in your inbox.\n` +
                    `Read them with the jarvis_readMessage tool (destination: "\${destination}") until remaining = 0.`;
                const rawNotifTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('messages.notificationTemplate') ?? '';
                const notifTemplate = rawNotifTemplate.trim() ? rawNotifTemplate : defaultNotifTemplate;
                const stub = applyTemplate(notifTemplate, { count: String(count), destination: sessionName });
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open',
                    { query: stub }
                );
                // Mark those messages as notified
                const updated = readQueue(messagesPath);
                let changed = false;
                for (const m of updated) {
                    if (m.destination === sessionName && !m.notified) {
                        m.notified = true;
                        changed = true;
                    }
                }
                if (changed) {
                    writeQueue(messagesPath, updated);
                    messageProvider.reload();
                }
            } catch (err) {
                log.warn(`[MSG] autoDelivery: delivery failed for "${sessionName}": ${err}`);
            }
            break; // max 1 delivery per tick
        }
        }

        // --- Reminder delivery (SPEC_MSG_REMINDERSLOOP) ---
        const remindersPath = configPaths.getRemindersPath() ?? '';
        const due = popDueReminders(remindersPath, new Date());
        for (const reminder of due) {
            try {
                appendMessage(messagesPath, reminder.session, 'Reminder', reminder.text);
                addAutoDelivery(messagesPath, reminder.session);
                log.info(`[MSG] Reminder "${reminder.id}" delivered to session "${reminder.session}"`);
            } catch (err) {
                log.warn(`[MSG] Reminder delivery failed for "${reminder.id}": ${err}`);
            }
        }
        if (due.length > 0) {
            remindersProvider?.reload();
            messageProvider.reload();
        }
    }, 5000);

    const startRecordingCommand = vscode.commands.registerCommand(
        'jarvis.startRecording',
        async (element: LeafNode) => {
            const entity = scanner?.getEntity(element.id);
            const name = entity?.name ?? path.basename(path.dirname(element.id));
            await _recordingManager!.start(name, context);
        }
    );

    const stopRecordingCommand = vscode.commands.registerCommand(
        'jarvis.stopRecording',
        async () => {
            await _recordingManager!.stop();
        }
    );

    context.subscriptions.push(
        rescanCommand,
        filterCommand,
        filterCommandActive,
        eventFilterCommand,
        eventFilterCommandActive,
        searchProjectsCommand,
        searchEventsCommand,
        openYamlCommand,
        revealInExplorerCommand,
        revealInOSCommand,
        openInTerminalCommand,
        sendMessagesCommand,
        deleteMessageCommand,
        openHeartbeatJobCommand,
        openMessageFileCommand,
        openSessionCommand,
        openAgentSessionCommand,
        openContextCommand,
        newProjectCommand,
        newEventCommand,
        newEntityCommand,
        newSessionCommand,
        checkForUpdatesCommand,
        sendToSessionTool,
        readMessageTool,
        listSessionsTool,
        ...(createSessionTool ? [createSessionTool] : []),
        registerJobTool,
        unregisterJobTool,
        listJobsTool,
        setReminderTool,
        listRemindersTool,
        cancelReminderTool,
        cancelReminderCommand,
        openReminderFileCommand,
        listProjectsTool,
        listEventsTool,
        createProjectTool,
        createEventTool,
        listChatSessionsTool,
        openRecordingCommand,
        categoryTool,
        taskTool,
        refreshCategoriesCommand,
        renameCategoryCommand,
        deleteCategoryCommand,
        refreshTasksCommand,
        recordingStatusBar,
        startRecordingCommand,
        stopRecordingCommand,
        enableAutoDeliveryCommand,
        disableAutoDeliveryCommand,
        { dispose: () => clearInterval(pollInterval) },
        { dispose: () => { if (recordingTimer) { clearInterval(recordingTimer); } } },
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis.projects.folder') ||
                e.affectsConfiguration('jarvis.events.folder')) {
                startScanner();
            }
            if (e.affectsConfiguration('jarvis.scanInterval')) {
                syncRescanJob();
                syncCategoryRefreshJob();
                syncTaskRefreshJob();
            }
            if (e.affectsConfiguration('jarvis.recording.enabled') ||
                e.affectsConfiguration('jarvis.recording.whisperPath')) {
                syncTranscriptWatcherJob();
            }
            if (e.affectsConfiguration('jarvis.outlook.enabled')
                || e.affectsConfiguration('jarvis.outlook.tasks.enabled')) {
                vscode.window.showInformationMessage(
                    'Jarvis: Outlook toggle changed. Reload window to apply.',
                    'Reload'
                ).then(choice => {
                    if (choice === 'Reload') {
                        vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                });
            }
        }),
        { dispose: () => scanner?.stop() }
    );
}

export async function deactivate() {
    if (_recordingManager) {
        await _recordingManager.deactivate();
    }
    await stopMcpServer();
}
