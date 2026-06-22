// Implementation: SPEC_MOD_CORE_PKG, SPEC_ENG_API
// Core extension — engine, sessions, messaging, reminders, heartbeat.
// PIM (projects/events/categories/tasks/outlook) and recorder are separate extensions (S5/S6).

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as configPaths from './engine/configPaths';
import { MessageTreeProvider, SessionGroupNode, MessageLeafNode } from './apps/session/messageTreeProvider';
import { RemindersTreeProvider, ReminderNode } from './apps/session/remindersTreeProvider';
import { KindDrivenScanner, LeafNode, TreeNode } from './engine/yamlScanner';
import { activateHeartbeat, HeartbeatScheduler, HeartbeatJob, HeartbeatStep } from './apps/session/heartbeat';
import { JobNode } from './apps/session/heartbeatTreeProvider';
import { JarvisEngine } from './engine/coreApi';
import { GenericTreeFactory } from './engine/treeFactory';
import type { EntityKindConfig, JarvisCoreApi } from './engine/types';
import { deleteMessage, appendMessage, popMessage, readAutoDelivery, addAutoDelivery, removeAutoDelivery, readQueue, writeQueue } from './engine/messageQueue';
import { addReminder, readReminders, removeReminder, popDueReminders, setRemindersLogger } from './apps/session/reminders';
import { lookupSessionUUID, getAllSessions, initSessionLookup, setSessionLookupLogger, filterNamedSessions, getValidDestinations } from './engine/sessionLookup';
import { checkForUpdates } from './engine/updateCheck';

import { CronExpressionParser } from 'cron-parser';

// Shared substitution helper (SPEC_EXP_AGENTSESSION_INITPROMPT, SPEC_MSG_SENDCOMMAND)
function applyTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// YAML string serialisation helper
function yamlString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

// Implementation: SPEC_SES_AGENT_DISCOVERY
interface AgentModeEntry {
    name: string;
    filePath: string;
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
            continue;
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
                continue;
            }
            if (isExplicitlyExcluded(content, 'user-invocable')) {
                continue;
            }

            const agentName = getAgentIdentity(content, entry.name);
            agents.push({
                name: agentName,
                filePath: path.relative(workspaceFolder.uri.fsPath, agentPath),
            });
        }
    }

    return agents.sort((a, b) => a.name.localeCompare(b.name));
}

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

    return pick === undefined ? undefined : pick.mode;
}

// Implementation: SPEC_SES_NEWENTITY (path validation)
const INVALID_PATH_CHARS = /[/\\:*?"<>|]/;
const CONTROL_CHARS = /[\x00-\x1F]/;
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

function validateSessionName(name: string): string | null {
    const trimmed = name.trim();
    if (!trimmed) { return 'Name cannot be empty'; }
    if (trimmed === '.' || trimmed === '..') { return "Name cannot be '.' or '..'"; }
    if (INVALID_PATH_CHARS.test(trimmed)) { return 'Name contains invalid characters (/, \\, :, *, ?, ", <, >, |)'; }
    if (CONTROL_CHARS.test(trimmed)) { return 'Name contains control characters (not allowed)'; }
    if (WINDOWS_RESERVED.test(trimmed)) { return `Name '${trimmed}' is a reserved Windows device name`; }
    return null;
}

export function activate(context: vscode.ExtensionContext): JarvisCoreApi {
    // Initialize workspace-scoped session lookup (SPEC_MSG_SESSIONLOOKUP)
    if (context.storageUri) {
        initSessionLookup(context.storageUri, context.globalStorageUri);
    }

    const cfg = vscode.workspace.getConfiguration('jarvis');

    // Message queue path resolution via fixed .jarvis/ directory (SPEC_CFG_PATHRESOLVER)
    function resolveMessagesPath(): string {
        return configPaths.getMessagesPath() ?? '';
    }

    const messageProvider = new MessageTreeProvider(resolveMessagesPath);

    // Implementation: SPEC_DEV_LOGCHANNEL
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

    // Shared entity-chat opener (SPEC_EXP_ENTITY_TREECLICK / SPEC_SES_NEWENTITY)
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
            `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.\n` +
            `- When a topic grows past ~5 bullets, move it to a dedicated file beside \`context.md\` and leave a one-line summary with a relative link in \`context.md\`.`;
        const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
            .get<string>('agentSession.initPromptTemplate') ?? '';
        const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : defaultInitPrompt;
        const initPrompt = applyTemplate(initTemplate, { kind, name, contextPath });
        await vscode.commands.executeCommand(
            'workbench.action.chat.open', { query: initPrompt });
    }

    // Engine (kind-driven scanner + generic tree factory) for session kind
    const kindDrivenScanner = new KindDrivenScanner(
        () => { engine.treeFactory.refreshAll(); },
        (settingKey: string) => {
            if (settingKey === 'jarvis.sessions.folder') {
                return configPaths.getSessionsDir() ?? '';
            }
            return vscode.workspace.getConfiguration().get<string>(settingKey, '');
        }
    );
    const treeFactory = new GenericTreeFactory(kindDrivenScanner);
    const engine = new JarvisEngine(kindDrivenScanner, treeFactory);
    context.subscriptions.push({ dispose: () => engine.dispose() });

    // Heartbeat scheduler — created conditionally inside heartbeat block
    let scheduler: HeartbeatScheduler | undefined;

    // Rescan heartbeat job helper
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

    // ------- SESSIONS feature block (SPEC_SES_MANIFEST, SPEC_SES_TREE) -------
    let sessionKindDisposable: vscode.Disposable | undefined;
    if (cfg.get<boolean>('sessions.enabled', true)) {
        const sessionKindConfig: EntityKindConfig = {
            kind: 'session',
            viewId: 'jarvisSessions',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name: string) => name,
        };
        sessionKindDisposable = engine.registerEntityKind(sessionKindConfig);
        context.subscriptions.push(sessionKindDisposable);

        const sessionTreeProvider = engine.treeFactory.getProvider('session')!;
        const sessionView = vscode.window.createTreeView('jarvisSessions', {
            treeDataProvider: sessionTreeProvider,
            canSelectMany: false,
        });
        context.subscriptions.push(sessionView);
        log.info('[CFG] Sessions feature enabled (via engine)');
    } else {
        log.info('[CFG] Sessions feature disabled');
    }

    // Trigger initial scan for registered kinds
    kindDrivenScanner.rescan();

    // ------- HEARTBEAT feature block (SPEC_CFG_TOGGLEGUARDS) -------
    if (cfg.get<boolean>('heartbeat.enabled', true)) {
        scheduler = activateHeartbeat(context, messageProvider, resolveMessagesPath, log, undefined);
        engine.setScheduler(scheduler);
        syncRescanJob();
    } else {
        log.info('[CFG] Heartbeat feature disabled');
    }

    // ------- MESSAGES feature block (SPEC_CFG_TOGGLEGUARDS) -------
    let remindersProvider: RemindersTreeProvider | undefined;

    if (cfg.get<boolean>('messages.enabled', true)) {
        const messageView = vscode.window.createTreeView('jarvisMessages', { treeDataProvider: messageProvider });
        context.subscriptions.push(messageView);

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

    // Automatic update check (SPEC_REL_UPDATECOMMAND)
    const autoCheck = vscode.workspace
        .getConfiguration('jarvis')
        .get<boolean>('checkForUpdates', true);
    if (autoCheck) {
        checkForUpdates(context, true, log);
    }

    // Manual update check command
    const checkForUpdatesCommand = vscode.commands.registerCommand(
        'jarvis.checkForUpdates',
        () => checkForUpdates(context, false, log)
    );

    // Rescan command
    const rescanCommand = vscode.commands.registerCommand('jarvis.rescan', async () => {
        await kindDrivenScanner.rescan();
        log.info('[Scanner] manual rescan triggered');
    });

    // Open YAML command (SPEC_EXP_OPENYAML_CMD) — generic, used by any entity
    const openYamlCommand = vscode.commands.registerCommand('jarvis.openYamlFile', (element: LeafNode) => {
        const uri = vscode.Uri.file(element.id);
        vscode.commands.executeCommand('vscode.open', uri);
    });

    // Context actions (SPEC_EXP_CONTEXTACTIONS) — generic, used by any entity
    const revealInExplorerCommand = vscode.commands.registerCommand('jarvis.revealInExplorer', (node: LeafNode) => {
        vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(node.id));
    });
    const revealInOSCommand = vscode.commands.registerCommand('jarvis.revealInOS', (node: LeafNode) => {
        vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(node.id));
    });
    const openInTerminalCommand = vscode.commands.registerCommand('jarvis.openInTerminal', (node: LeafNode) => {
        vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(node.id));
    });

    // Send messages command (SPEC_MSG_SENDCOMMAND)
    const sendMessagesCommand = vscode.commands.registerCommand(
        'jarvis.sendMessages',
        async (node?: SessionGroupNode) => {
            if (!node) {
                vscode.window.showWarningMessage('Jarvis: Use the play button on a session group in the Messages tree.');
                return;
            }
            log.info(`[MSG] sendMessages: destination="${node.destination}", count=${node.children.length}`);
            const uuid = await lookupSessionUUID(node.destination);

            if (uuid) {
                const b64 = Buffer.from(uuid).toString('base64');
                const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                await vscode.commands.executeCommand('vscode.open', uri);
                await new Promise(resolve => setTimeout(resolve, 800));
            } else {
                const entityForSend = kindDrivenScanner.entities.find(e => e.name === node.destination);
                if (entityForSend?.agent) {
                    try {
                        await vscode.commands.executeCommand('workbench.action.chat.open', { mode: entityForSend.agent });
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } catch (err) {
                        log.warn(`[MSG] sendMessages: failed to prime agent mode "${entityForSend.agent}": ${err}`);
                    }
                }
                await openNewChatEditor();
                await renameFocusedChatSession(node.destination);
                if (entityForSend) {
                    const kind = entityForSend.kind ?? 'session';
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
                        `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.\n` +
                        `- When a topic grows past ~5 bullets, move it to a dedicated file beside \`context.md\` and leave a one-line summary with a relative link in \`context.md\`.`;
                    const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : defaultInitPrompt;
                    const initPrompt = applyTemplate(initTemplate, { kind, name: entityForSend.name, contextPath });
                    await vscode.commands.executeCommand('workbench.action.chat.open', { query: initPrompt });
                }
            }

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
            messageProvider.reload();
        }
    );

    // Open session command (SPEC_MSG_OPENSESSION)
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

    // Open agent session command (SPEC_EXP_AGENTSESSION)
    const openAgentSessionCommand = vscode.commands.registerCommand(
        'jarvis.openAgentSession',
        async (element: LeafNode) => {
            const entity = kindDrivenScanner.getEntity(element.id);
            if (!entity) { return; }

            const uuid = await lookupSessionUUID(entity.name);

            if (uuid) {
                const b64 = Buffer.from(uuid).toString('base64');
                const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                await vscode.commands.executeCommand('vscode.open', uri);
            } else {
                const kind = entity.kind ?? 'session';
                const folder = entity.folder ?? path.dirname(element.id);
                await openChatForEntity(entity.name, kind, folder, entity.agent);
            }
        }
    );

    // Open context command (SPEC_EXP_OPENCONTEXT_CMD)
    const openContextCommand = vscode.commands.registerCommand(
        'jarvis.openContext',
        async (element: LeafNode) => {
            const folder = path.dirname(element.id);
            const direct = path.join(folder, 'context.md');

            if (fs.existsSync(direct)) {
                await vscode.window.showTextDocument(vscode.Uri.file(direct));
                return;
            }

            const found: string[] = [];
            try {
                for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
                    if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
                    const candidate = path.join(folder, entry.name, 'context.md');
                    if (fs.existsSync(candidate)) { found.push(candidate); }
                }
            } catch { /* fall through */ }

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

            vscode.window.showInformationMessage('No context.md found for this entity');
        }
    );

    // Open session context command (SPEC_SES_TREECLICK)
    let openSessionContextCommand: vscode.Disposable | undefined;
    if (cfg.get<boolean>('sessions.enabled', true)) {
        openSessionContextCommand = vscode.commands.registerCommand(
            'jarvis.openSessionContext',
            async (element: LeafNode) => {
                const sessionDir = path.dirname(element.id);
                const contextPath = path.join(sessionDir, 'context.md');

                if (!fs.existsSync(contextPath)) {
                    const entity = kindDrivenScanner.getEntity(element.id);
                    const sessionName = entity?.name ?? path.basename(sessionDir);
                    try {
                        await fs.promises.writeFile(contextPath, '# ' + sessionName + '\n\n', 'utf-8');
                        log.info('[OpenSessionContext] created missing context.md for "' + sessionName + '"');
                    } catch (err) {
                        vscode.window.showErrorMessage('Jarvis: Could not create context.md -- ' + err);
                        return;
                    }
                }

                try {
                    await vscode.window.showTextDocument(vscode.Uri.file(contextPath), { preview: false });
                } catch (err) {
                    log.warn(`[SES] openSessionContext: showTextDocument failed for ${contextPath}: ${err}`);
                    vscode.window.showWarningMessage(`Jarvis: could not open context.md: ${err}`);
                }
            }
        );
        context.subscriptions.push(openSessionContextCommand);
    }

    // Delete message command
    const deleteMessageCommand = vscode.commands.registerCommand(
        'jarvis.deleteMessage',
        (node: MessageLeafNode) => {
            log.debug(`[MSG] deleteMessage: index=${node.index}`);
            deleteMessage(resolveMessagesPath(), node.index);
            messageProvider.reload();
        }
    );

    // Open heartbeat job command (SPEC_EXP_HEARTBEAT_OPENFILE)
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

    // Open message file command (SPEC_EXP_MESSAGE_OPENFILE)
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

    // --- Core LM tools ---

    // sendToSession
    const sendToSessionTool = engine.registerTool('jarvis_sendToSession',
        'Queues a message for delivery to another VS Code chat session identified by name.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { session, text } = options.input;
            const validNames = await getValidDestinations(kindDrivenScanner);
            if (!validNames.includes(session)) {
                const sorted = [...validNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
                throw new Error(`Destination session "${session}" does not exist.\nValid destinations: ${listStr}`);
            }
            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            const sender = options.input.senderSession || activeTab?.label || 'unknown';
            appendMessage(resolveMessagesPath(), session, sender, text);
            log.info(`[MSG] sendToSession: destination="${session}", sender="${sender}"`);
            messageProvider.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Message queued for destination "${session}" from "${sender}"`)
            ]);
        }
    );

    // readMessage
    const readMessageTool = engine.registerTool('jarvis_readMessage',
        'Reads and removes the oldest message from the Jarvis message queue for the given destination session.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
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
        }
    );

    // listSessions — returns YAML session entities
    const listSessionsTool = engine.registerTool('jarvis_listSessions',
        'Returns all Jarvis session entities (YAML-based) with name, summary, agent, and folder path.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const sessions = kindDrivenScanner.entities
                .filter(e => e.kind === 'session')
                .map(e => ({ name: e.name, summary: e.summary ?? '', agent: e.agent ?? '', folder: e.folder }));
            log.info(`[SES] listSessions: ${sessions.length} session(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ sessions }))
            ]);
        }
    );

    // listChatSessions — returns VS Code chat tab titles
    const listChatSessionsTool = engine.registerTool('jarvis_listChatSessions',
        'Returns the list of named VS Code chat session titles in the current workspace.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions).map(s => s.title);
            log.info(`[MSG] listChatSessions: ${named.length} session(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(named))
            ]);
        }
    );

    // Job destination validation helper
    async function validateJobDestinations(steps: HeartbeatStep[]): Promise<void> {
        const validNames = await getValidDestinations(kindDrivenScanner);
        for (const step of steps) {
            if (step.type === 'queue' && step.destination) {
                if (!validNames.includes(step.destination)) {
                    const sorted = [...validNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                    const listStr = sorted.length > 0 ? sorted.join(', ') : '(none)';
                    throw new Error(`Destination session "${step.destination}" does not exist.\nValid destinations: ${listStr}`);
                }
            }
        }
    }

    // registerJob
    const registerJobTool = engine.registerTool('jarvis_registerJob',
        'Registers (or updates) a heartbeat job with the given name, cron schedule, and steps.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { name, schedule, steps } = options.input;
            await validateJobDestinations(steps);
            const job: HeartbeatJob = { name, schedule, steps };
            await scheduler!.registerJob(job);
            log.info(`[Heartbeat] registerJob: name="${name}", schedule="${schedule}"`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Job '${name}' registered with schedule '${schedule}'`)
            ]);
        }
    );

    // unregisterJob
    const unregisterJobTool = engine.registerTool('jarvis_unregisterJob',
        'Removes a heartbeat job by name.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { name } = options.input;
            const existed = scheduler!.currentJobs.some(j => j.name === name);
            await scheduler!.unregisterJob(name);
            log.info(`[Heartbeat] unregisterJob: name="${name}", existed=${existed}`);
            const text = existed ? `Job '${name}' unregistered` : `Job '${name}' not found`;
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(text)]);
        }
    );

    // listJobs
    function jobDescriptor(job: HeartbeatJob): { name: string; schedule: string; enabled: boolean; nextFire: string | null } {
        const enabled = job.enabled !== false;
        let nextFire: string | null = null;
        if (enabled && job.schedule !== 'manual') {
            try { nextFire = CronExpressionParser.parse(job.schedule).next().toDate().toISOString(); } catch { nextFire = null; }
        }
        return { name: job.name, schedule: job.schedule, enabled, nextFire };
    }

    const listJobsTool = engine.registerTool('jarvis_listJobs',
        'Returns all registered heartbeat jobs.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const jobs = scheduler!.currentJobs.map(j => jobDescriptor(j));
            log.info(`[Heartbeat] listJobs: ${jobs.length} job(s)`);
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(jobs))]);
        }
    );

    // setReminder
    const setReminderTool = engine.registerTool('jarvis_setReminder',
        'Registers a time-scheduled reminder.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { text, session, deliverAt } = options.input;
            if (new Date(deliverAt) <= new Date()) {
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify({ error: 'deliverAt must be in the future' }))]);
            }
            const reminder = addReminder(configPaths.getRemindersPath() ?? '', text, session, deliverAt);
            log.info(`[MSG] setReminder: id="${reminder.id}", session="${session}", deliverAt="${deliverAt}"`);
            remindersProvider?.reload();
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify({ id: reminder.id, deliverAt: reminder.deliverAt }))]);
        }
    );

    // listReminders
    const listRemindersTool = engine.registerTool('jarvis_listReminders',
        'Returns all pending reminders.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const reminders = readReminders(configPaths.getRemindersPath() ?? '');
            const now = Date.now();
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify({ reminders: reminders.map(r => ({ ...r, remainingMs: new Date(r.deliverAt).getTime() - now })) }))]);
        }
    );

    // cancelReminder
    const cancelReminderTool = engine.registerTool('jarvis_cancelReminder',
        'Cancels a pending reminder by id.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { id } = options.input;
            const removed = removeReminder(configPaths.getRemindersPath() ?? '', id);
            log.info(`[MSG] cancelReminder: id="${id}", removed=${removed}`);
            remindersProvider?.reload();
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify({ status: removed ? 'cancelled' : 'not_found' }))]);
        }
    );

    // createSession tool
    let createSessionTool: vscode.Disposable | undefined;
    if (cfg.get<boolean>('sessions.enabled', true)) {
        const createSession = async (args: { name: string; summary?: string; agent?: string; initialMessage?: string }): Promise<{ created: boolean; reason?: string; path: string }> => {
            const { name, summary, agent, initialMessage } = args;
            if (!name) { throw new Error('invalid session name: name must not be empty'); }
            if (/[/\\:*?"<>|]/.test(name)) { throw new Error('invalid session name: contains forbidden character (/ \\ : * ? " < > |)'); }
            if (/[\x00-\x1F]/.test(name)) { throw new Error('invalid session name: contains null or control character'); }
            if (name === '.' || name === '..') { throw new Error('invalid session name: must not be "." or ".."'); }
            if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) { throw new Error('invalid session name: reserved device name'); }

            if (agent) {
                const available = await discoverAgentModes();
                const validNames = available.map(a => a.name);
                if (!validNames.includes(agent)) {
                    const names = validNames.length > 0 ? validNames.sort().join(', ') : '(none)';
                    throw new Error(`Agent "${agent}" is not available.\nAvailable agents: ${names}`);
                }
            }

            const sessionsDir = configPaths.ensureSessionsDir();
            if (!sessionsDir) { throw new Error('jarvis_createSession: no workspace open'); }

            const targetPath = path.join(sessionsDir, name);
            const relPath = `.jarvis/sessions/${name}`;

            if (fs.existsSync(targetPath)) {
                log.info(`[SES] createSession: idempotent skip for "${name}"`);
                try {
                    const sessionYamlPath = path.join(targetPath, 'session.yaml');
                    const leaf: LeafNode = { kind: 'leaf', id: sessionYamlPath };
                    await vscode.commands.executeCommand('jarvis.openAgentSession', leaf);
                } catch (err) { log.warn(`[SES] createSession: auto-open failed for "${name}": ${err}`); }
                return { created: false, reason: `session "${name}" already exists; no action taken`, path: relPath };
            }

            await fs.promises.mkdir(targetPath, { recursive: true });
            const yamlLines = [`name: ${yamlString(name)}`];
            if (summary) { yamlLines.push(`summary: ${yamlString(summary)}`); }
            if (agent) { yamlLines.push(`agent: ${yamlString(agent)}`); }
            yamlLines.push('');
            await fs.promises.writeFile(path.join(targetPath, 'session.yaml'), yamlLines.join('\n'), 'utf-8');
            const contextContent = summary ? `# ${name}\n\n${summary}\n` : `# ${name}\n\n`;
            await fs.promises.writeFile(path.join(targetPath, 'context.md'), contextContent, 'utf-8');

            if (initialMessage) {
                appendMessage(resolveMessagesPath(), name, 'jarvis_createSession', initialMessage);
                messageProvider.reload();
            }

            await kindDrivenScanner.rescan();
            try {
                const sessionYamlPath = path.join(targetPath, 'session.yaml');
                const leaf: LeafNode = { kind: 'leaf', id: sessionYamlPath };
                await vscode.commands.executeCommand('jarvis.openAgentSession', leaf);
                log.info(`[SES] createSession: auto-opened new session "${name}"`);
            } catch (err) { log.warn(`[SES] createSession: auto-open failed for "${name}": ${err}`); }

            log.info(`[SES] createSession: created "${name}" at ${targetPath}`);
            return { created: true, path: relPath };
        };

        createSessionTool = engine.registerTool('jarvis_createSession',
        'Creates a new Jarvis session folder with session.yaml and context.md.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
                const result = await createSession(options.input);
                log.info(`[SES] createSession: created=${result.created}, path=${result.path}`);
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(result))]);
            }
    );
    }

    // New session command (SPEC_SES_NEWENTITY)
    const newSessionCommand = vscode.commands.registerCommand(
        'jarvis.newSession',
        async () => {
            const targetFolder = configPaths.ensureSessionsDir();
            if (!targetFolder) { vscode.window.showWarningMessage('Jarvis: No workspace open.'); return; }

            const nameInput = await vscode.window.showInputBox({ prompt: 'Session name', placeHolder: 'My Session', validateInput: validateSessionName });
            if (!nameInput) { return; }
            const summaryInput = await vscode.window.showInputBox({ prompt: 'Session summary (optional)', placeHolder: 'Short description' });
            const agentInput = await pickAgentMode();
            if (agentInput === undefined) { return; }

            const sessionName = nameInput.trim();
            const targetPath = path.join(targetFolder, sessionName);
            if (fs.existsSync(targetPath)) { vscode.window.showErrorMessage(`Folder '${sessionName}' already exists in sessions folder`); return; }

            await fs.promises.mkdir(targetPath, { recursive: true });
            const yamlLines = [`name: ${yamlString(nameInput)}`];
            if (summaryInput) { yamlLines.push(`summary: ${yamlString(summaryInput)}`); }
            yamlLines.push(`agent: ${yamlString(agentInput)}`);
            yamlLines.push('');
            await fs.promises.writeFile(path.join(targetPath, 'session.yaml'), yamlLines.join('\n'), 'utf-8');
            const contextContent = `# ${nameInput}\n\n${summaryInput ?? ''}\n`;
            await fs.promises.writeFile(path.join(targetPath, 'context.md'), contextContent, 'utf-8');
            await kindDrivenScanner.rescan();
            log.info(`[NewSession] created session "${nameInput}" at ${targetPath}`);
            await openChatForEntity(nameInput, 'session', targetPath, agentInput);
        }
    );

    // enableAutoDelivery / disableAutoDelivery commands
    const enableAutoDeliveryCommand = vscode.commands.registerCommand('jarvis.enableAutoDelivery', (node: SessionGroupNode) => { addAutoDelivery(resolveMessagesPath(), node.destination); messageProvider.reload(); });
    const disableAutoDeliveryCommand = vscode.commands.registerCommand('jarvis.disableAutoDelivery', (node: SessionGroupNode) => { removeAutoDelivery(resolveMessagesPath(), node.destination); messageProvider.reload(); });

    // cancelReminder tree command
    const cancelReminderCommand = vscode.commands.registerCommand('jarvis.cancelReminder', (node?: ReminderNode) => {
        if (!node || node.kind !== 'reminder') { return; }
        removeReminder(configPaths.getRemindersPath() ?? '', node.reminder.id);
        log.info(`[MSG] cancelReminder(tree): id="${node.reminder.id}"`);
        remindersProvider?.reload();
    });

    // Open reminder file command
    const openReminderFileCommand = vscode.commands.registerCommand('jarvis.openReminderFile', async (node: ReminderNode) => {
        const remindersPath = configPaths.getRemindersPath() ?? '';
        if (!fs.existsSync(remindersPath)) { vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`); return; }
        const uri = vscode.Uri.file(remindersPath);
        let lineIndex = 0;
        try {
            const doc = await vscode.workspace.openTextDocument(uri);
            const target = `id: ${node.reminder.id}`;
            for (let i = 0; i < doc.lineCount; i++) { if (doc.lineAt(i).text.includes(target)) { lineIndex = i; break; } }
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
        } catch { vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`); }
    });



    // Auto-delivery poll loop (SPEC_MSG_AUTODELIVERY)
    const pollInterval = setInterval(async () => {
        const messagesPath = resolveMessagesPath();
        const autoDeliverySessions = readAutoDelivery(messagesPath);
        if (autoDeliverySessions.length > 0) {
            const messages = readQueue(messagesPath);
            for (const sessionName of autoDeliverySessions) {
                const pending = messages.filter(m => m.destination === sessionName && !m.notified);
                if (pending.length === 0) { continue; }
                try {
                    const uuid = await lookupSessionUUID(sessionName);
                    if (uuid) {
                        const b64 = Buffer.from(uuid).toString('base64');
                        const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                        await vscode.commands.executeCommand('vscode.open', uri);
                        await new Promise(resolve => setTimeout(resolve, 800));
                    } else {
                        const entityForPoll = kindDrivenScanner.entities.find(e => e.name === sessionName);
                        if (entityForPoll?.agent) {
                            try {
                                await vscode.commands.executeCommand('workbench.action.chat.open', { mode: entityForPoll.agent });
                                await new Promise(resolve => setTimeout(resolve, 300));
                            } catch (err) { log.warn(`[MSG] autoDelivery: failed to prime agent mode "${entityForPoll.agent}": ${err}`); }
                        }
                        await openNewChatEditor();
                        await renameFocusedChatSession(sessionName);
                        if (entityForPoll) {
                            const kind = entityForPoll.kind ?? 'session';
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
                                `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.\n` +
                                `- When a topic grows past ~5 bullets, move it to a dedicated file beside \`context.md\` and leave a one-line summary with a relative link in \`context.md\`.`;
                            const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : defaultInitPrompt;
                            const initPrompt = applyTemplate(initTemplate, { kind, name: entityForPoll.name, contextPath });
                            await vscode.commands.executeCommand('workbench.action.chat.open', { query: initPrompt });
                        }
                    }
                    const count = pending.length;
                    const defaultNotifTemplate = `[Jarvis Message Service] You have \${count} new message(s) in your inbox.\nRead them with the jarvis_readMessage tool (destination: "\${destination}") until remaining = 0.`;
                    const rawNotifTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('messages.notificationTemplate') ?? '';
                    const notifTemplate = rawNotifTemplate.trim() ? rawNotifTemplate : defaultNotifTemplate;
                    const stub = applyTemplate(notifTemplate, { count: String(count), destination: sessionName });
                    await vscode.commands.executeCommand('workbench.action.chat.open', { query: stub });
                    const updated = readQueue(messagesPath);
                    let changed = false;
                    for (const m of updated) { if (m.destination === sessionName && !m.notified) { m.notified = true; changed = true; } }
                    if (changed) { writeQueue(messagesPath, updated); messageProvider.reload(); }
                } catch (err) { log.warn(`[MSG] autoDelivery: delivery failed for "${sessionName}": ${err}`); }
                break; // max 1 delivery per tick
            }
        }

        // Reminder delivery (SPEC_MSG_REMINDERSLOOP)
        const remindersPath = configPaths.getRemindersPath() ?? '';
        const due = popDueReminders(remindersPath, new Date());
        for (const reminder of due) {
            try {
                appendMessage(messagesPath, reminder.session, 'Reminder', reminder.text);
                addAutoDelivery(messagesPath, reminder.session);
                log.info(`[MSG] Reminder "${reminder.id}" delivered to session "${reminder.session}"`);
            } catch (err) { log.warn(`[MSG] Reminder delivery failed for "${reminder.id}": ${err}`); }
        }
        if (due.length > 0) { remindersProvider?.reload(); messageProvider.reload(); }
    }, 5000);

    context.subscriptions.push(
        rescanCommand,
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
        listChatSessionsTool,
        enableAutoDeliveryCommand,
        disableAutoDeliveryCommand,
        { dispose: () => clearInterval(pollInterval) },
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis.scanInterval')) { syncRescanJob(); }
        }),
    );

    // SPEC_ENG_API AC-1: activate() returns the JarvisCoreApi
    return engine as JarvisCoreApi;
}

export function deactivate() {
    // No-op — subscriptions handle cleanup.
}
