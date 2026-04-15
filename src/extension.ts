// Implementation: SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND, SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_OPENYAML_CMD, SPEC_EXP_CONTEXTACTIONS, SPEC_AUT_MANUALCOMMAND, SPEC_MSG_SENDCOMMAND, SPEC_MSG_OPENSESSION, SPEC_MSG_LISTSESSIONS, SPEC_EXP_AGENTSESSION, SPEC_EXP_NEWPROJECT_CMD, SPEC_EXP_NEWEVENT_CMD, SPEC_REL_UPDATECOMMAND, SPEC_EXP_RESCAN_CMD, SPEC_AUT_JOBREG, SPEC_DEV_LOGCHANNEL, SPEC_MSG_DUALREGISTRATION, SPEC_EXP_LISTPROJECTS, SPEC_CFG_DEFAULTPATHS, SPEC_EXP_FEATURETOGGLE, SPEC_PIM_SERVICE, SPEC_PIM_CATVIEW, SPEC_PIM_CATTOOL, SPEC_OLK_COMBRIDGE, SPEC_OLK_SETTINGS, SPEC_OLK_AUTOCAT_NEWENTITY, SPEC_PIM_TASKSERVICE, SPEC_PIM_TASKEDITOR, SPEC_PIM_TASKTOOL, SPEC_OLK_TASKPROVIDER, SPEC_OLK_TASKENABLE
// Requirements: REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW, REQ_EXP_REACTIVECACHE, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST, REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST, REQ_EXP_OPENYAML, REQ_EXP_CONTEXTACTIONS, REQ_AUT_MANUALRUN, REQ_MSG_SEND, REQ_MSG_DELETE, REQ_MSG_OPENSESSION, REQ_MSG_SESSIONFILTER, REQ_MSG_LISTSESSIONS, REQ_EXP_AGENTSESSION, REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT, REQ_REL_UPDATECOMMAND, REQ_CFG_UPDATECHECK, REQ_EXP_RESCAN_BTN, REQ_AUT_JOBREG, REQ_DEV_LOGGING, REQ_MSG_MCPSERVER, REQ_CFG_MCPPORT, REQ_EXP_LISTPROJECTS, REQ_CFG_DEFAULTPATHS, REQ_EXP_FEATURETOGGLE, REQ_PIM_SERVICE, REQ_PIM_CATVIEW, REQ_PIM_CATTOOL, REQ_OLK_COMBRIDGE, REQ_OLK_ENABLE, REQ_OLK_AUTOCAT_NEWENTITY, REQ_PIM_TASKSERVICE, REQ_PIM_TASKEDITOR, REQ_PIM_TASKTOOL, REQ_OLK_TASKPROVIDER, REQ_OLK_TASKENABLE

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectTreeProvider } from './projectTreeProvider';
import { EventTreeProvider } from './eventTreeProvider';
import { MessageTreeProvider, SessionGroupNode, MessageLeafNode } from './messageTreeProvider';
import { YamlScanner, LeafNode, TreeNode } from './yamlScanner';
import { activateHeartbeat, HeartbeatScheduler, HeartbeatJob, HeartbeatStep } from './heartbeat';
import { deleteMessage, appendMessage, popMessage } from './messageQueue';
import { lookupSessionUUID, getAllSessions, initSessionLookup, filterNamedSessions } from './sessionLookup';
import { checkForUpdates } from './updateCheck';
import { registerMcpTool, startMcpServer, stopMcpServer } from './mcpServer';
import { z } from 'zod';
import { CategoryService } from './pim/CategoryService';
import { CategoryTreeProvider } from './pim/CategoryTreeProvider';
import { OutlookCategoryProvider } from './outlookIntegration/OutlookCategoryProvider';
import { TaskService } from './pim/TaskService';
import { TaskEditorProvider } from './pim/TaskEditorProvider';
import { OutlookTaskProvider } from './outlookIntegration/OutlookTaskProvider';
import { RecordingManager } from './recording';

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

export function activate(context: vscode.ExtensionContext) {
    // Initialize workspace-scoped session lookup (SPEC_MSG_SESSIONLOOKUP)
    if (context.storageUri) {
        initSessionLookup(context.storageUri);
    }

    // Message queue path resolution (SPEC_CFG_HEARTBEATSETTINGS)
    function resolveMessagesPath(): string {
        const override = vscode.workspace
            .getConfiguration('jarvis')
            .get<string>('messagesFile', '');
        if (override) { return override; }
        return vscode.Uri.joinPath(context.storageUri!, 'messages.json').fsPath;
    }

    // Implementation: SPEC_CFG_DEFAULTPATHS
    // Requirements: REQ_CFG_DEFAULTPATHS
    // Writes heartbeatConfigFile and messagesFile into Workspace settings when empty,
    // so that the feature-toggle when-clauses become truthy on first activation.
    function populateDefaultPaths(): void {
        const cfg = vscode.workspace.getConfiguration('jarvis');
        if (!cfg.get<string>('messagesFile', '')) {
            cfg.update('messagesFile', resolveMessagesPath(), vscode.ConfigurationTarget.Workspace);
        }
        if (!cfg.get<string>('heartbeatConfigFile', '')) {
            cfg.update('heartbeatConfigFile', vscode.Uri.joinPath(context.storageUri!, 'heartbeat.yaml').fsPath, vscode.ConfigurationTarget.Workspace);
        }
    }

    // Populate default paths early so feature-toggle when-clauses become truthy (SPEC_CFG_DEFAULTPATHS)
    populateDefaultPaths();

    const messageProvider = new MessageTreeProvider(() => resolveMessagesPath());

    // Implementation: SPEC_DEV_LOGCHANNEL
    // Requirements: REQ_DEV_LOGGING
    const log = vscode.window.createOutputChannel('Jarvis', { log: true });
    context.subscriptions.push(log);

    // Activate heartbeat scheduler first (SPEC_EXP_EXTENSION, SPEC_AUT_SCHEDULERLOOP)
    const scheduler = activateHeartbeat(context, messageProvider, resolveMessagesPath, log);

    const scanner = new YamlScanner(() => {
        projectProvider.refresh();
        eventProvider.refresh();
    });

    // Implementation: SPEC_PIM_TASKSERVICE
    // Requirements: REQ_PIM_TASKSERVICE
    const taskService = new TaskService();

    // Implementation: SPEC_REC_SUBPROCESS, SPEC_REC_STATUSBAR, SPEC_REC_BUTTON
    // Requirements: REQ_REC_SUBPROCESS, REQ_REC_STATUSBAR, REQ_REC_BUTTON
    _recordingManager = new RecordingManager();
    _recordingManager.setLog(log);

    const projectProvider = new ProjectTreeProvider(scanner, taskService, _recordingManager);
    const eventProvider = new EventTreeProvider(scanner, taskService, _recordingManager);

    function startScanner(): void {
        const config = vscode.workspace.getConfiguration('jarvis');
        const projectsFolder = config.get<string>('projectsFolder', '');
        const eventsFolder = config.get<string>('eventsFolder', '');
        scanner.start(projectsFolder, eventsFolder);
        log.info('[Scanner] starting scan');
    }

    // Implementation: SPEC_EXP_EXTENSION (syncRescanJob helper)
    // Requirements: REQ_CFG_SCANINTERVAL, REQ_AUT_JOBREG
    function syncRescanJob(): void {
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

    const projectView = vscode.window.createTreeView('jarvisProjects', { treeDataProvider: projectProvider });
    const eventView = vscode.window.createTreeView('jarvisEvents', { treeDataProvider: eventProvider });
    const messageView = vscode.window.createTreeView('jarvisMessages', { treeDataProvider: messageProvider });

    // Restore persisted hidden folders (REQ_EXP_FILTERPERSIST AC-2)
    const savedHidden = context.workspaceState.get<string[]>('jarvis.hiddenProjectFolders', []);
    projectProvider.setHiddenFolders(new Set(savedHidden));
    if (savedHidden.length > 0) {
        projectView.description = '(filtered)';
        vscode.commands.executeCommand('setContext', 'jarvis.projectFilterActive', true);
    }

    // Restore persisted event filter (REQ_EXP_EVENTFILTERPERSIST AC-2)
    const savedEventFilter = context.workspaceState.get<boolean>('jarvis.eventFutureFilter', false);
    eventProvider.setFutureOnly(savedEventFilter);
    if (savedEventFilter) {
        eventView.description = '(future only)';
        vscode.commands.executeCommand('setContext', 'jarvis.eventFilterActive', true);
    }

    // Start scanner immediately on activation (view may already be visible)
    startScanner();

    // Register rescan heartbeat job (SPEC_EXP_EXTENSION)
    syncRescanJob();

    // Register transcript watcher heartbeat job (SPEC_REC_WATCHERJOB)
    syncTranscriptWatcherJob();

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
        .get<boolean>('outlookEnabled', false);

    if (outlookEnabled) {
        categoryService.addProvider(new OutlookCategoryProvider(log));
    }

    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('jarvisCategories', categoryTreeProvider)
    );

    // Implementation: SPEC_OLK_TASKENABLE, SPEC_PIM_TASKSERVICE
    // Requirements: REQ_OLK_TASKENABLE, REQ_PIM_TASKSERVICE
    try {
        const cfg = vscode.workspace.getConfiguration('jarvis');
        if (cfg.get('outlookEnabled') === true
            && cfg.get('outlook.tasks.enabled') === true) {
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
        await scanner.rescan();
        log.info('[Scanner] manual rescan triggered');
    });

    // Register filter command (SPEC_EXP_FILTERCOMMAND)
    const filterHandler = () => {
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
            projectProvider.setHiddenFolders(new Set(hiddenFolders));
            context.workspaceState.update('jarvis.hiddenProjectFolders', [...hiddenFolders]);
            const isActive = hiddenFolders.size > 0;
            projectView.description = isActive ? '(filtered)' : '';
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
        const next = !eventProvider.isFutureOnly();
        eventProvider.setFutureOnly(next);
        context.workspaceState.update('jarvis.eventFutureFilter', next);
        eventView.description = next ? '(future only)' : '';
        vscode.commands.executeCommand('setContext', 'jarvis.eventFilterActive', next);
    };

    const eventFilterCommand = vscode.commands.registerCommand('jarvis.filterFutureEvents', eventFilterHandler);
    const eventFilterCommandActive = vscode.commands.registerCommand('jarvis.filterFutureEventsActive', eventFilterHandler);

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
            projectProvider.refresh();
            eventProvider.refresh();
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
                // No existing session — create a new editor chat via URI with empty sessionId
                await vscode.commands.executeCommand('vscode.open',
                    vscode.Uri.parse('vscode-chat-session://local/new'));
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            // 3. Send single notification stub
            const count = node.children.length;
            const stub =
                `[Jarvis Message Service] Du hast ${count} neue Nachrichten in deiner Inbox.\n` +
                `Lies sie mit dem Tool jarvis_readMessage (destination: "${node.destination}") bis remaining = 0.`;
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

    // Register open agent session command (SPEC_EXP_AGENTSESSION)
    // Requirements: REQ_EXP_AGENTSESSION
    const openAgentSessionCommand = vscode.commands.registerCommand(
        'jarvis.openAgentSession',
        async (element: LeafNode) => {
            const entity = scanner.getEntity(element.id);
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
                // Create new session
                await vscode.commands.executeCommand('vscode.open',
                    vscode.Uri.parse('vscode-chat-session://local/new'));
                await new Promise(resolve => setTimeout(resolve, 800));

                // Send initialization prompt
                const initPrompt =
                    `You are working on the project/event "${entity.name}". ` +
                    `Please ask the user to rename this session to "${entity.name}" ` +
                    `and then read the relevant project context.`;
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open',
                    { query: initPrompt }
                );
            }
        }
    );

    // Register delete message command (SPEC_MSG_SENDCOMMAND)
    const deleteMessageCommand = vscode.commands.registerCommand(
        'jarvis.deleteMessage',
        (node: MessageLeafNode) => {
            log.debug(`[MSG] deleteMessage: index=${node.index}`);
            deleteMessage(resolveMessagesPath(), node.index);
            messageProvider.reload();
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
            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            const sender = options.input.senderSession || activeTab?.label || 'unknown';
            appendMessage(resolveMessagesPath(), session, sender, text);
            log.info(`[MSG] sendToSession: destination="${session}", sender="${sender}"`);
            messageProvider.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Message queued for destination "${session}" from "${sender}"`)
            ]);
        },
        'Queues a message for delivery to another VS Code chat session identified by name.',
        { session: z.string().describe('Target chat session name'), senderSession: z.string().optional().describe('Sender session name'), text: z.string().describe('Message text') },
        async (args) => {
            const session = args.session as string;
            const text = args.text as string;
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

    // Register LM+MCP tool: listSessions (SPEC_MSG_LISTSESSIONS)
    // Requirements: REQ_MSG_LISTSESSIONS, REQ_MSG_SESSIONFILTER
    const listSessionsTool = registerDualTool(
        'jarvis_listSessions',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions)
                .map(s => s.title);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(named))
            ]);
        },
        'Returns the list of named chat session titles in the current workspace.',
        {},
        async () => {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions)
                .map(s => s.title);
            return { sessions: named };
        }
    );

    // Implementation: SPEC_AUT_JOBREG_TOOLS
    // Requirements: REQ_AUT_JOBREG_TOOLS
    const registerJobTool = registerDualTool(
        'jarvis_registerJob',
        async (options: vscode.LanguageModelToolInvocationOptions<{ name: string; schedule: string; steps: HeartbeatStep[] }>, _token: vscode.CancellationToken) => {
            const { name, schedule, steps } = options.input;
            const job: HeartbeatJob = { name, schedule, steps };
            await scheduler.registerJob(job);
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
            const job: HeartbeatJob = { name, schedule, steps };
            await scheduler.registerJob(job);
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
            const existed = scheduler.currentJobs.some(j => j.name === name);
            await scheduler.unregisterJob(name);
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
            const existed = scheduler.currentJobs.some(j => j.name === name);
            await scheduler.unregisterJob(name);
            log.info(`[Heartbeat] unregisterJob(MCP): name="${name}", existed=${existed}`);
            return existed
                ? { status: 'unregistered', name }
                : { status: 'not_found', name };
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

    const listProjectsTool = registerDualTool(
        'jarvis_listProjects',
        async (
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) => {
            const projectsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('projectsFolder', '');
            const leaves = collectLeaves(scanner.getProjectTree());
            const projects = leaves.map(leaf => {
                const entity = scanner.getEntity(leaf.id);
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
                .get<string>('projectsFolder', '');
            const leaves = collectLeaves(scanner.getProjectTree());
            const projects = leaves.map(leaf => {
                const entity = scanner.getEntity(leaf.id);
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
                    projectProvider.refresh();
                    eventProvider.refresh();
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
                    projectProvider.refresh();
                    eventProvider.refresh();
                    result = { status: 'ok', id: input.id };
                    break;
                }
                case 'delete': {
                    if (!input.id) { throw new Error('id required for delete'); }
                    await taskService.deleteTask(input.id, input.provider);
                    projectProvider.refresh();
                    eventProvider.refresh();
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
                    projectProvider.refresh();
                    eventProvider.refresh();
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
                    projectProvider.refresh();
                    eventProvider.refresh();
                    return { status: 'ok', id: args.id };
                }
                case 'delete': {
                    if (!args.id) { return { error: 'id is required for delete' }; }
                    await taskService.deleteTask(args.id as string, args.provider as string | undefined);
                    projectProvider.refresh();
                    eventProvider.refresh();
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
                .get<string>('projectsFolder', '');
            if (!projectsFolder) {
                vscode.window.showWarningMessage('Jarvis: projectsFolder is not configured');
                return;
            }

            const input = await vscode.window.showInputBox({
                prompt: 'Project name',
                placeHolder: 'My Project',
            });
            if (!input) { return; }

            const kebabName = toKebabCase(input);
            const targetPath = path.join(projectsFolder, kebabName);

            if (fs.existsSync(targetPath)) {
                vscode.window.showErrorMessage(
                    `Folder '${kebabName}' already exists in projects folder`);
                return;
            }

            await fs.promises.mkdir(targetPath);
            const content = `name: "${input}"\n`;
            await fs.promises.writeFile(
                path.join(targetPath, 'project.yaml'), content, 'utf-8');

            // Implementation: SPEC_OLK_AUTOCAT_NEWENTITY
            // Requirements: REQ_OLK_AUTOCAT_NEWENTITY
            try {
                const outlookEnabled = vscode.workspace
                    .getConfiguration('jarvis')
                    .get<boolean>('outlookEnabled', false);
                if (outlookEnabled && categoryService.hasProviders()) {
                    await categoryService.setCategory(input, 0);
                    log.info(`[NewProject] Outlook category created: "${input}"`);
                }
            } catch (err) {
                log.warn(`[NewProject] Failed to create Outlook category: ${err}`);
            }

            await scanner.rescan();

            const leafNode = findLeafNode(scanner.getProjectTree(), targetPath);
            if (leafNode) {
                await vscode.commands.executeCommand(
                    'jarvis.openAgentSession', leafNode);
            }
        }
    );

    // Register new event command (SPEC_EXP_NEWEVENT_CMD)
    // Requirements: REQ_EXP_NEWEVENT
    const newEventCommand = vscode.commands.registerCommand(
        'jarvis.newEvent',
        async () => {
            const eventsFolder = vscode.workspace
                .getConfiguration('jarvis')
                .get<string>('eventsFolder', '');
            if (!eventsFolder) {
                vscode.window.showWarningMessage('Jarvis: eventsFolder is not configured');
                return;
            }

            const nameInput = await vscode.window.showInputBox({
                prompt: 'Event name',
                placeHolder: 'My Event',
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

            const folderName = `${dateInput}-${toKebabCase(nameInput)}`;
            const targetPath = path.join(eventsFolder, folderName);

            if (fs.existsSync(targetPath)) {
                vscode.window.showErrorMessage(
                    `Folder '${folderName}' already exists in events folder`);
                return;
            }

            await fs.promises.mkdir(targetPath);
            const content = [
                `name: "${nameInput}"`,
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
                const outlookEnabled = vscode.workspace
                    .getConfiguration('jarvis')
                    .get<boolean>('outlookEnabled', false);
                if (outlookEnabled && categoryService.hasProviders()) {
                    await categoryService.setCategory(nameInput, 0);
                    log.info(`[NewEvent] Outlook category created: "${nameInput}"`);
                }
            } catch (err) {
                log.warn(`[NewEvent] Failed to create Outlook category: ${err}`);
            }

            await scanner.rescan();

            const leafNode = findLeafNode(scanner.getEventTree(), targetPath);
            if (leafNode) {
                await vscode.commands.executeCommand(
                    'jarvis.openAgentSession', leafNode);
            }
        }
    );

    // Implementation: SPEC_MSG_DUALREGISTRATION (lifecycle)
    // Requirements: REQ_MSG_MCPSERVER, REQ_CFG_MCPPORT
    const mcpConfig = vscode.workspace.getConfiguration('jarvis');
    const mcpEnabled = mcpConfig.get<boolean>('mcpEnabled', true);
    const mcpPort = mcpConfig.get<number>('mcpPort', 31415);

    const mcpStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right, 100
    );
    mcpStatusBar.text = `Jarvis MCP: ${mcpPort}`;
    mcpStatusBar.tooltip = 'Jarvis MCP Server';

    if (mcpEnabled) {
        startMcpServer(mcpPort, log).then(() => {
            mcpStatusBar.show();
        }).catch(() => { /* error already logged */ });
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
        projectProvider.refresh();
        eventProvider.refresh();
    });

    // Implementation: SPEC_REC_BUTTON
    // Requirements: REQ_REC_BUTTON
    const startRecordingCommand = vscode.commands.registerCommand(
        'jarvis.startRecording',
        async (element: LeafNode) => {
            const entity = scanner.getEntity(element.id);
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
        openYamlCommand,
        revealInExplorerCommand,
        revealInOSCommand,
        openInTerminalCommand,
        sendMessagesCommand,
        deleteMessageCommand,
        openSessionCommand,
        openAgentSessionCommand,
        newProjectCommand,
        newEventCommand,
        checkForUpdatesCommand,
        sendToSessionTool,
        readMessageTool,
        listSessionsTool,
        registerJobTool,
        unregisterJobTool,
        listProjectsTool,
        categoryTool,
        taskTool,
        refreshCategoriesCommand,
        renameCategoryCommand,
        deleteCategoryCommand,
        refreshTasksCommand,
        mcpStatusBar,
        recordingStatusBar,
        startRecordingCommand,
        stopRecordingCommand,
        { dispose: () => { if (recordingTimer) { clearInterval(recordingTimer); } } },
        projectView,
        eventView,
        messageView,
        projectView.onDidChangeVisibility(e => {
            if (e.visible) {
                startScanner();
            } else {
                scanner.stop();
            }
        }),
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis.projectsFolder') ||
                e.affectsConfiguration('jarvis.eventsFolder')) {
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
            if (e.affectsConfiguration('jarvis.outlookEnabled')
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
        { dispose: () => scanner.stop() }
    );
}

export async function deactivate() {
    if (_recordingManager) {
        await _recordingManager.deactivate();
    }
    await stopMcpServer();
}
