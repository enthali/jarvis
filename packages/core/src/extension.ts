// Implementation: SPEC_MOD_CORE_PKG, SPEC_ENG_API
// Core extension — Actor engine, messaging, reminders, heartbeat.
// PIM (projects/events/categories/tasks/outlook) and recorder are separate extensions (S5/S6).

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as configPaths from './engine/core/configPaths';
import { MessageTreeProvider, SessionGroupNode, MessageLeafNode } from './apps/session/messageTreeProvider';
import { RemindersTreeProvider, ReminderNode } from './apps/session/remindersTreeProvider';
import { activateHeartbeat, HeartbeatScheduler, HeartbeatJob, HeartbeatStep, listAvailableModels, formatModelEntry } from './apps/session/heartbeat';
import { JobNode } from './apps/session/heartbeatTreeProvider';
import { JarvisEngine } from './engine/core/coreApi';
import type { JarvisCoreApi } from './engine/core/types';
import { deleteMessage, appendMessage, popMessage, readAutoDelivery, addAutoDelivery, removeAutoDelivery, readQueue, writeQueue } from './engine/sessions/messageQueue';
import { removeReminder, setRemindersLogger } from './apps/session/reminders';
import { processDueReminders } from './apps/session/reminderDelivery';
import { createCancelReminderHandler, createListRemindersHandler, createSetReminderHandler, findReminderLine } from './apps/session/reminderRuntime';
import { initSessionLookup, setSessionLookupLogger, getValidDestinations } from './engine/sessions/sessionLookup';
import { DEFAULT_INIT_PROMPT } from './engine/sessions/actorStartupPrompt';
import { checkForUpdates } from './engine/core/updateCheck';
import { removeLegacyHookFiles } from './engine/core/legacyHookFiles';
import { applyGitignore, setIgnoreManagerLogger } from './engine/core/gitignoreManager';
import { setAssetProvisioningLogger, provisionModuleAssets } from './engine/core/assetProvisioning';
import { announceIfNewVersion, showReleaseNotes } from './engine/core/releaseNotes';
import { ActorScanner, ambiguousActorMessage } from './engine/actors/actorScanner';
import { ActorMailState } from './engine/actors/actorMail';
import { ActorActivity } from './engine/actors/actorActivity';
import { ActorTreeProvider, ActorNode } from './engine/actors/actorTreeProvider';
import { actorNameProblem, existingActorFolder, writeActorFiles } from './engine/actors/actorCreation';
import { ensureActorAgent, setActorAgentLogger } from './engine/actors/actorAgent';
import { createActorHandler } from './engine/actors/actorRuntime';
import { registerJarvisYamlSchemaContributor } from './engine/core/yamlSchemaContributor';
import { AhpClient, userDataDirFromGlobalStorage, desktopUserDataDir } from './engine/ahp';
import { createActorMessageTools } from './engine/sessions/actorMessageTools';
import { createAnnouncer } from './engine/sessions/actorAnnouncements';
import { openActorChat } from './engine/sessions/openActorChat';

import { CronExpressionParser } from 'cron-parser';

let ahpClient: AhpClient | undefined;

// Substitution helper for the start-up instruction (SPEC_ACTOR_INITPROMPT)
function applyTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
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
    setIgnoreManagerLogger(log);
    setAssetProvisioningLogger(log);
    setActorAgentLogger(log);
    void registerJarvisYamlSchemaContributor(context.extensionUri, log);

    // Gitignore auto-management (SPEC_CFG_IGNOREMANAGER)
    applyGitignore();

    // Actor instructions provisioning (SPEC_MOD_ACTORRULES)
    const actorProvisionEnabled = vscode.workspace.getConfiguration('jarvis.actor').get<boolean>('autoProvision', true);
    void provisionModuleAssets(context, {
        namespace: 'jarvis-actor',
        instructionsSourceDir: context.asAbsolutePath('assets/instructions'),
        enabled: actorProvisionEnabled,
    });

    // Hook files of earlier versions (SPEC_CFG_HOOKCLEANUP): removed once per activation, never blocks it.
    const workspaceRoot = configPaths.getWorkspaceRoot();
    if (workspaceRoot) {
        removeLegacyHookFiles(workspaceRoot, log).catch(err => log.warn(`[CFG] Removal of old hook files failed: ${err instanceof Error ? err.message : err}`));
    }

    // Configuration change listener for jarvis.gitignore.autoManage (SPEC_CFG_IGNOREMANAGER AC-8)
    const gitignoreAutoManageListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (!e.affectsConfiguration('jarvis.gitignore.autoManage')) { return; }
        applyGitignore();
    });
    context.subscriptions.push(gitignoreAutoManageListener);

    const DOCS_COLUMN = vscode.ViewColumn.Two;

    /** Finds an already-open tab for a file, by comparing fsPath. */
    function findFileTab(filePath: string): vscode.Tab | undefined {
        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                const uri = (tab.input as { uri?: vscode.Uri } | undefined)?.uri;
                if (uri?.fsPath === filePath) { return tab; }
            }
        }
        return undefined;
    }

    /** Docs-target open (always column 2, focus-in-place if already open elsewhere). */
    async function openAtDocs(uri: vscode.Uri, options?: { preview?: boolean }): Promise<void> {
        const existing = findFileTab(uri.fsPath);
        const viewColumn = existing ? existing.group.viewColumn : DOCS_COLUMN;
        await vscode.commands.executeCommand('vscode.open', uri, {
            preview: options?.preview ?? false,
            viewColumn,
        });
    }

    // The Actor engine: JarvisEngine (public API) + ActorScanner (sole source
    // of Actor entries, SPEC_ACTOR_SCANNER) + ActorTreeProvider (SPEC_ACTOR_TREE).
    let actorTreeProvider: ActorTreeProvider | undefined;
    const actorScanner = new ActorScanner(
        () => configPaths.getActorsDir() ?? '',
        () => actorTreeProvider?.refresh(),
    );
    const engine = new JarvisEngine(actorScanner);
    context.subscriptions.push({ dispose: () => engine.dispose() });
    engine.setMessaging(resolveMessagesPath, () => messageProvider.reload());

    const activity = new ActorActivity(workspaceRoot ?? '', () => actorScanner.actors.map(actor => actor.name), () => actorTreeProvider?.refresh());

    // Unread-mail state (SPEC_ACTOR_MAIL): read after every scan, drawn by the tree.
    const actorMail = new ActorMailState(actorScanner, log, () => actorTreeProvider?.refresh());
    context.subscriptions.push(actorMail);

    actorTreeProvider = new ActorTreeProvider(actorScanner, activity, actorMail);
    const treeProvider = actorTreeProvider;
    engine.setMarker((id, icon) => treeProvider.mark(id, icon));
    // Jarvis AHP client and its message path (SPEC_COM_CLIENTMODULE, SPEC_COM_TOOLS, SPEC_COM_INBOX).
    // start() returns at once, the client never blocks activation.
    const startupTextFor = (actor: { name: string; folder: string }): string => {
        const rawTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('agentSession.initPromptTemplate') ?? '';
        return applyTemplate(rawTemplate.trim() ? rawTemplate : DEFAULT_INIT_PROMPT, { name: actor.name, contextPath: path.join(actor.folder, 'context.md') });
    };

    /** The Actor with its agent file in place (a description is what makes the host list it), ready for its chat. */
    async function resolveActorForChat(actorName: string): Promise<{ name: string; startupText: string }> {
        const lookup = actorScanner.resolveName(actorName);
        if (lookup.status === 'ambiguous') { throw new Error(ambiguousActorMessage(actorName, lookup.matches)); }
        if (lookup.status === 'unknown') { throw new Error(`Actor not found: ${actorName}`); }
        const actor = lookup.actor;
        await ensureActorAgent({ name: actor.name, folder: actor.folder, summary: actor.summary });
        return { name: actor.name, startupText: startupTextFor(actor) };
    }

    // VS Code Server (remote, Codespaces) keeps the Agent Host registry in the desktop user data folder
    // of its product, not below its own server data folder (FI-2026-11-18).
    function desktopRegistryDirs(): string[] {
        let nameShort: string | undefined;
        try {
            nameShort = JSON.parse(fs.readFileSync(path.join(vscode.env.appRoot, 'product.json'), 'utf8')).nameShort;
        } catch { /* fall back to the application name */ }
        nameShort ??= vscode.env.appName.includes('Insiders') ? 'Code - Insiders' : 'Code';
        const dir = desktopUserDataDir(nameShort);
        return dir ? [dir] : [];
    }

    const userDataDir = userDataDirFromGlobalStorage(context.globalStorageUri.fsPath);
    const ahpWorkspace = configPaths.getWorkspaceRoot();
    if (userDataDir) {
        ahpClient = new AhpClient({
            userDataDir,
            fallbackUserDataDirs: desktopRegistryDirs(),
            clientVersion: context.extension.packageJSON.version,
            log: (severity, text) => log[severity](`[AHP] ${text}`),
            messagePath: ahpWorkspace ? {
                workspaceFolder: ahpWorkspace,
                actorNames: () => actorScanner.actors.map(a => a.name),
                tools: createActorMessageTools({
                    actors: () => actorScanner.actors.map(a => ({ name: a.name, summary: a.summary })),
                    lookup: name => {
                        const found = actorScanner.resolveName(name);
                        if (found.status === 'found') { return { status: 'found', name: found.actor.name }; }
                        if (found.status === 'ambiguous') { return { status: 'ambiguous', message: ambiguousActorMessage(name, found.matches) }; }
                        return { status: 'unknown' };
                    },
                    appendMessage: (destination, sender, text) => appendMessage(resolveMessagesPath(), destination, sender, text),
                    popMessage: destination => popMessage(resolveMessagesPath(), destination),
                    ensureChat: async actorName => (await ahpClient!.ensureActorChat(await resolveActorForChat(actorName))).session,
                    changed: () => messageProvider.reload(),
                    log: text => log.info(`[MSG] ${text}`),
                }),
            } : undefined,
        });
        context.subscriptions.push(
            { dispose: () => ahpClient?.dispose() },
            { dispose: ahpClient.onSessionsChanged(sessions => activity.update(sessions)) },
            actorScanner.onDidScan(() => { activity.refresh(); void ahpClient?.publishTools(); }),
        );
        ahpClient.start();
    } else {
        log.warn(`[AHP] client not started: cannot derive the user data folder from ${context.globalStorageUri.fsPath}`);
    }

    const announcer = createAnnouncer({
        readQueue: () => readQueue(resolveMessagesPath()),
        writeQueue: messages => writeQueue(resolveMessagesPath(), messages),
        autoDelivery: () => readAutoDelivery(resolveMessagesPath()).filter(name => actorScanner.resolveName(name).status === 'found'),
        announce: async (actorName, count) => {
            const actor = await resolveActorForChat(actorName);
            await ahpClient!.deliverAnnouncement(actor, count);
        },
        changed: () => messageProvider.reload(),
        log: (severity, text) => log[severity](`[MSG] ${text}`),
    });

    async function deliverViaAhp(destination: string): Promise<void> {
        if (!ahpClient?.isConnected()) {
            void vscode.window.showInformationMessage('Jarvis: Not connected to the Agent Host; messages remain in the inbox.');
            return;
        }
        try {
            await announcer.deliver(destination);
        } catch (err) {
            void vscode.window.showWarningMessage(`Jarvis: Could not announce the messages to "${destination}": ${err instanceof Error ? err.message : err}`);
        }
    }

    // Inbox watcher (SPEC_COM_INBOX): an Actor with automatic delivery is told when a message arrives.
    const inboxFile = resolveMessagesPath();
    if (inboxFile) {
        const inboxWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(path.dirname(inboxFile), path.basename(inboxFile)));
        const onInboxChange = (): void => { if (ahpClient?.isConnected()) { void announcer.runAuto(); } };
        context.subscriptions.push(inboxWatcher, inboxWatcher.onDidChange(onInboxChange), inboxWatcher.onDidCreate(onInboxChange));
    }

    const actorsView = vscode.window.createTreeView('jarvisActors', {
        treeDataProvider: actorTreeProvider,
        showCollapseAll: true,
    });
    const firstFolder = vscode.workspace.workspaceFolders?.[0];
    if (firstFolder) {
        actorsView.title = `${firstFolder.name} Actors`;
    }
    context.subscriptions.push(actorsView, actorTreeProvider);

    // Heartbeat scheduler — created conditionally inside heartbeat block
    let scheduler: HeartbeatScheduler | undefined;

    // Trigger initial scan, then start the scanner-owned rescan timer
    // (SPEC_ACTOR_SCANNER — replaces the old heartbeat-job-based Rescan).
    void actorScanner.rescan();
    function syncScannerTimer(): void {
        const interval = vscode.workspace.getConfiguration('jarvis').get<number>('scanInterval', 2);
        actorScanner.startTimer(interval);
    }
    syncScannerTimer();

    // One-time cleanup: remove the legacy heartbeat-job-based Rescan, now
    // superseded by actorScanner's own timer.
    if (cfg.get<boolean>('heartbeat.enabled', true)) {
        scheduler = activateHeartbeat(context, messageProvider, resolveMessagesPath, log, actorScanner);
        engine.setScheduler(scheduler);
        void scheduler.unregisterJob('Jarvis: Rescan');
    } else {
        log.info('[CFG] Heartbeat feature disabled');
    }

    // ------- MESSAGES feature block (SPEC_CFG_TOGGLEGUARDS) -------
    let remindersProvider: RemindersTreeProvider | undefined;

    if (cfg.get<boolean>('messages.enabled', true)) {
        const messageView = vscode.window.createTreeView('jarvisMessages', { treeDataProvider: messageProvider, showCollapseAll: true });
        context.subscriptions.push(messageView);

        if (cfg.get<boolean>('reminders.enabled', true)) {
            remindersProvider = new RemindersTreeProvider();
            const remindersView = vscode.window.createTreeView('jarvisReminders', { treeDataProvider: remindersProvider, showCollapseAll: true });
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

    // Release notes on update (SPEC_REL_RELEASENOTES)
    void announceIfNewVersion(context, log);

    const showReleaseNotesCommand = vscode.commands.registerCommand(
        'jarvis.showReleaseNotes',
        () => showReleaseNotes(context, log)
    );

    // Rescan command
    const rescanCommand = vscode.commands.registerCommand('jarvis.rescan', async () => {
        await actorScanner.rescan();
        log.info('[Scanner] manual rescan triggered');
    });

    // Context actions (SPEC_ACTOR_CONTEXTMENU) — generic, used by any actor
    // node or file-like node (filePath/folderPath + optional resourceUri).
    type RevealableNode =
        | ActorNode
        | { filePath: string; resourceUri?: vscode.Uri }
        | { folderPath: string; resourceUri?: vscode.Uri };
    function resolveRevealUri(node: RevealableNode): vscode.Uri {
        if ('resourceUri' in node && node.resourceUri) { return node.resourceUri; }
        if ('filePath' in node) { return vscode.Uri.file(node.filePath); }
        if ('folderPath' in node) { return vscode.Uri.file(node.folderPath); }
        const actor = actorScanner.getActor(node.id);
        return vscode.Uri.file(actor?.folder ?? '');
    }
    const revealInExplorerCommand = vscode.commands.registerCommand('jarvis.revealInExplorer', (node: RevealableNode) => {
        vscode.commands.executeCommand('revealInExplorer', resolveRevealUri(node));
    });
    const revealInOSCommand = vscode.commands.registerCommand('jarvis.revealInOS', (node: RevealableNode) => {
        vscode.commands.executeCommand('revealFileInOS', resolveRevealUri(node));
    });
    const openInTerminalCommand = vscode.commands.registerCommand('jarvis.openInTerminal', (node: RevealableNode) => {
        vscode.commands.executeCommand('openInTerminal', resolveRevealUri(node));
    });

    // Play action of a Messages group (SPEC_COM_INBOX)
    const sendMessagesCommand = vscode.commands.registerCommand(
        'jarvis.sendMessages',
        async (node?: SessionGroupNode) => {
            if (!node) {
                vscode.window.showWarningMessage('Jarvis: Use the play button on a session group in the Messages tree.');
                return;
            }
            log.info(`[MSG] sendMessages: destination="${node.destination}", count=${node.children.length}`);
            await deliverViaAhp(node.destination);
            messageProvider.reload();
        }
    );

    async function openChat(name: string, create: boolean): Promise<void> {
        try {
            await openActorChat(name, create, {
                connected: () => !!ahpClient?.isConnected(),
                offline: () => { void vscode.window.showInformationMessage('Jarvis: Not connected to the Agent Host.'); },
                isActor: actorName => actorScanner.resolveName(actorName).status === 'found',
                find: actorName => ahpClient!.findActorChat(actorName),
                ensure: async actorName => (await ahpClient!.ensureActorChat(await resolveActorForChat(actorName))).session,
                groups: () => vscode.window.tabGroups.all.map(group => ({
                    viewColumn: group.viewColumn,
                    uris: group.tabs.map(tab => (tab.input as { uri?: vscode.Uri } | undefined)?.uri?.toString()),
                })),
                firstColumn: vscode.ViewColumn.One,
                log: text => log.info(`[OPEN] ${text}`),
                open: async (session, viewColumn) => {
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(session), { viewColumn, preview: false });
                },
            });
        } catch (err) {
            void vscode.window.showWarningMessage(`Jarvis: Could not open chat for "${name}": ${err instanceof Error ? err.message : err}`);
        }
    }

    const openMessageActorChatCommand = vscode.commands.registerCommand(
        'jarvis.openMessageActorChat',
        async (node: SessionGroupNode) => {
            await openChat(node.destination, false);
        }
    );

    // Open Actor session command (SPEC_ACTOR_TREE)
    const openActorSessionCommand = vscode.commands.registerCommand(
        'jarvis.openActorSession',
        async (element: ActorNode) => {
            const entity = actorScanner.getActor(element.id);
            if (!entity) { return; }

            await openChat(entity.name, true);
        }
    );

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

    // Open Actor file command (SPEC_ACTOR_FILES) — fail-open, no auto-creation
    const openActorFileCommand = vscode.commands.registerCommand(
        'jarvis.openActorFile',
        async (node: { filePath: string; label: string; resourceUri?: vscode.Uri }) => {
            const uri = node.resourceUri ?? vscode.Uri.file(node.filePath);
            try {
                await vscode.workspace.openTextDocument(uri); // validates existence first
                if (path.extname(node.filePath).toLowerCase() === '.md') {
                    // actor-owned-files-tree CR: broadened from the prior
                    // exact-basename ("context.md" only) check to any .md
                    // extension — REQ_ACTOR_FILES_TREE AC-6 now
                    // deliberately includes *.agent.md (previously excluded).
                    // DOCS_COLUMN passed explicitly so the preview honors the
                    // Docs (column 2) placement guarantee; markdown.showPreview
                    // reuses an already-open preview tab for the same file.
                    await vscode.commands.executeCommand('markdown.showPreview', uri, DOCS_COLUMN);
                } else {
                    // Non-.md: preview-mode (single-click tab reuse, double-click
                    // pin), still fixed to the Docs column and focus-in-place if
                    // open elsewhere (SPEC_MSG_EDITORPLACEMENT).
                    await openAtDocs(uri, { preview: true });
                }
            } catch {
                vscode.window.showWarningMessage(`Jarvis: Cannot open file: ${node.filePath}`);
            }
        }
    );

    // Copy Path / Copy Full Path (SPEC_ACTOR_CONTEXTMENU) — shared path
    // resolution helper for file-child nodes and Actor root nodes.
    type CopyPathNode =
        | ActorNode
        | { kind: 'actorFile'; filePath: string; label: string }
        | { kind: 'actorFileFolder'; folderPath: string; label: string };
    function resolveCopyPaths(node: CopyPathNode): { folder: string; full: string } {
        if (node.kind === 'actorFile') {
            return { folder: path.dirname(node.filePath), full: node.filePath };
        }
        if (node.kind === 'actorFileFolder') {
            return { folder: path.dirname(node.folderPath), full: node.folderPath };
        }
        // Actor root: node.id is the actor.yaml absolute path — the Actor's
        // own folder is its dirname; there is no separate "full path" for a
        // root node, so both resolve to the folder.
        const folder = path.dirname(node.id);
        return { folder, full: folder };
    }

    const copyPathCommand = vscode.commands.registerCommand(
        'jarvis.copyPath',
        async (node: CopyPathNode) => {
            const { folder } = resolveCopyPaths(node);
            await vscode.env.clipboard.writeText(folder);
        }
    );

    const copyFullPathCommand = vscode.commands.registerCommand(
        'jarvis.copyFullPath',
        async (node: CopyPathNode) => {
            const { full } = resolveCopyPaths(node);
            await vscode.env.clipboard.writeText(full);
        }
    );

    // Copy File Name (file-child nodes only, SPEC_ACTOR_CONTEXTMENU)
    const copyFileNameCommand = vscode.commands.registerCommand(
        'jarvis.copyFileName',
        async (node: { filePath: string }) => {
            await vscode.env.clipboard.writeText(path.basename(node.filePath));
        }
    );

    // --- Core LM tools ---

    // Job destination validation helper
    async function validateJobDestinations(steps: HeartbeatStep[]): Promise<void> {
        const validNames = getValidDestinations(actorScanner);
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

    // listModels (SPEC_AUT_LISTMODELS): one list for the user (command) and for Actors (tool)
    const listModelsTool = engine.registerTool('jarvis_listModels',
        'Returns the language models an agent step of a heartbeat job can name, as { vendor, model }.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const models = await listAvailableModels();
            log.info(`[Models] listModels: ${models.length} model(s)`);
            return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(models))]);
        }
    );

    const listModelsCommand = vscode.commands.registerCommand('jarvis.listModels', async () => {
        const models = await listAvailableModels();
        if (models.length === 0) {
            log.info('[Models] no language model available');
        } else {
            log.info(`[Models] ${models.length} language model(s) available; an agent step names vendor and model:`);
            for (const m of models) {
                log.info(`[Models] ${formatModelEntry(m)}`);
            }
        }
        log.show(true);
    });

    const reminderToolDependencies = {
        remindersPath: () => configPaths.getRemindersPath() ?? '',
        reload: () => remindersProvider?.reload(),
        info: (message: string) => log.info(message),
        now: () => new Date(),
    };

    // setReminder
    const setReminderTool = engine.registerTool('jarvis_setReminder',
        'Registers a time-scheduled reminder.',
        createSetReminderHandler(reminderToolDependencies)
    );

    // listReminders
    const listRemindersTool = engine.registerTool('jarvis_listReminders',
        'Returns all pending reminders.',
        createListRemindersHandler(reminderToolDependencies)
    );

    // cancelReminder
    const cancelReminderTool = engine.registerTool('jarvis_cancelReminder',
        'Cancels a pending reminder by id.',
        createCancelReminderHandler(reminderToolDependencies)
    );

    // createActor tool (SPEC_ACTOR_CREATETOOL) —
    // registered whenever the actors folder is resolvable; no feature gate.
    let createActorTool: vscode.Disposable | undefined;
    if (configPaths.getActorsDir() !== undefined) {
        createActorTool = engine.registerTool('jarvis_createActor',
            'Creates a Jarvis Actor (actor.yaml and context.md) under the configured actors folder. Returns created: false without changes when the Actor folder already exists.',
            createActorHandler({
                resolveActorsFolder: () => configPaths.getActorsDir(),
                appendMessage: (actorName, sender, text) => appendMessage(resolveMessagesPath(), actorName, sender, text),
                reloadMessages: () => messageProvider.reload(),
                actorScanner,
                openActorSession: async (actorName: string) => {
                    const actor = actorScanner.actors.find(a => a.name === actorName);
                    if (actor) { await vscode.commands.executeCommand('jarvis.openActorSession', { kind: 'actor', id: actor.id }); }
                },
                openSessionOnCreate: () => vscode.workspace.getConfiguration('jarvis').get<boolean>('actors.openSessionOnCreate', true),
                log,
            })
        );
    }

    // New Actor command (SPEC_ACTOR_CREATE)
    const newActorCommand = vscode.commands.registerCommand(
        'jarvis.newActor',
        async () => {
            const nameInput = await vscode.window.showInputBox({
                prompt: 'Actor name',
                placeHolder: 'My Actor',
                validateInput: actorNameProblem,
            });
            if (!nameInput) { return; }

            const actorsFolder = configPaths.getActorsDir();
            if (!actorsFolder) { vscode.window.showWarningMessage('Jarvis: No workspace open.'); return; }
            const name = nameInput;
            // REQ_ACTOR_CREATE AC-3: rescan and refuse a name already carried by any Actor,
            // not only an existing target folder (REQ_ACTOR_SCHEMA AC-7).
            const blockingFolder = await existingActorFolder(actorsFolder, name, actorScanner);
            if (blockingFolder) {
                vscode.window.showErrorMessage(`Jarvis: An Actor named "${name}" already exists: ${blockingFolder}`);
                return;
            }

            const summaryInput = await vscode.window.showInputBox({ prompt: 'Summary (optional)', placeHolder: 'Short description' });
            const targetPath = await writeActorFiles(actorsFolder, { name, summary: summaryInput ?? '' });
            await ensureActorAgent({ name, folder: targetPath, summary: summaryInput ?? '' });

            await actorScanner.rescan();
            log.info(`[ACTOR] newActor: created "${name}" at ${targetPath}`);

            const openOnCreate = vscode.workspace.getConfiguration('jarvis').get<boolean>('actors.openSessionOnCreate', true);
            if (openOnCreate) {
                const actor = actorScanner.actors.find(a => a.name === name);
                if (actor) {
                    await vscode.commands.executeCommand('jarvis.openActorSession', { kind: 'actor', id: actor.id });
                }
            }
        }
    );
    context.subscriptions.push(newActorCommand);

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
            lineIndex = findReminderLine(
                Array.from({ length: doc.lineCount }, (_, index) => doc.lineAt(index).text),
                node.reminder.id
            );
            const range = new vscode.Range(lineIndex, 0, lineIndex, 0);
            const editor = await vscode.window.showTextDocument(doc);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
            editor.selection = new vscode.Selection(range.start, range.start);
        } catch { vscode.window.showWarningMessage(`Jarvis: Cannot open reminders file: ${remindersPath}`); }
    });



    const pollInterval = setInterval(async () => {
        const messagesPath = resolveMessagesPath();
        if (ahpClient?.isConnected()) {
            void announcer.runAuto();
        }

        // Reminder delivery (SPEC_MSG_REMINDERSLOOP)
        processDueReminders({
            remindersPath: configPaths.getRemindersPath() ?? '',
            messagesPath,
            now: new Date(),
            reloadReminders: () => remindersProvider?.reload(),
            reloadMessages: () => messageProvider.reload(),
            info: message => log.info(message),
            warn: message => log.warn(message),
        });
    }, 5000);

    context.subscriptions.push(
        rescanCommand,
        revealInExplorerCommand,
        revealInOSCommand,
        openInTerminalCommand,
        sendMessagesCommand,
        openMessageActorChatCommand,
        deleteMessageCommand,
        openHeartbeatJobCommand,
        openMessageFileCommand,
        openActorFileCommand,
        copyPathCommand,
        copyFullPathCommand,
        copyFileNameCommand,
        openActorSessionCommand,
        checkForUpdatesCommand,
        showReleaseNotesCommand,
        ...(createActorTool ? [createActorTool] : []),
        registerJobTool,
        unregisterJobTool,
        listJobsTool,
        listModelsTool,
        listModelsCommand,
        setReminderTool,
        listRemindersTool,
        cancelReminderTool,
        cancelReminderCommand,
        openReminderFileCommand,
        enableAutoDeliveryCommand,
        disableAutoDeliveryCommand,
        { dispose: () => clearInterval(pollInterval) },
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis.scanInterval')) { syncScannerTimer(); }
            if (e.affectsConfiguration('jarvis.actors.folder')) {
                void actorScanner.rescan();
            }
            if (e.affectsConfiguration('jarvis.outlook.enabled')) { actorMail.requestRead(); }
        }),
    );

    // SPEC_ENG_API AC-1: activate() returns the JarvisCoreApi
    return engine as JarvisCoreApi;
}

export function deactivate() {
    // SPEC_COM_CLIENTMODULE: deactivate ends the AHP client (idempotent; the subscription disposal calls it too)
    ahpClient?.dispose();
}
