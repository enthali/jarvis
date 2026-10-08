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
import { lookupSessionUUID, getAllSessions, initSessionLookup, setSessionLookupLogger, filterNamedSessions, getValidDestinations, getEntityNameForSessionId } from './engine/sessions/sessionLookup';
import { discoverAgentModes } from './engine/sessions/agentDiscovery';
import { injectPrompt, initInjectPrompt, resolveNotificationText } from './engine/sessions/injectPrompt';
import { checkForUpdates } from './engine/core/updateCheck';
import { HookEngine } from './engine/hooks/hookEngine';
import { HookIntake } from './engine/hooks/hookIntake';
import { installHookConfig, uninstallHookConfig, getHooksDir } from './engine/hooks/hookConfig';
import { ActivityTracker } from './engine/hooks/activityTracker';
import { TouchStore, ACTOR_TOUCH_KIND } from './engine/hooks/touchStore';
import { TouchTracker } from './engine/hooks/touchTracker';
import { applyGitignore, setIgnoreManagerLogger } from './engine/core/gitignoreManager';
import { setAssetProvisioningLogger, provisionModuleAssets } from './engine/core/assetProvisioning';
import { announceIfNewVersion, showReleaseNotes } from './engine/core/releaseNotes';
import { ActorScanner, ambiguousActorMessage } from './engine/actors/actorScanner';
import { ActorTreeProvider, ActorNode } from './engine/actors/actorTreeProvider';
import { actorNameProblem, existingActorFolder, writeActorAgent, writeActorFiles } from './engine/actors/actorCreation';
import { createListActorsHandler, createActorHandler } from './engine/actors/actorRuntime';
import { registerJarvisYamlSchemaContributor } from './engine/core/yamlSchemaContributor';

import { CronExpressionParser } from 'cron-parser';

// Shared substitution helper (SPEC_EXP_AGENTSESSION_INITPROMPT, SPEC_MSG_SENDCOMMAND)
function applyTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

// Implementation: SPEC_SES_AGENT_DISCOVERY
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
        placeHolder: 'Select the agent for this entity',
        matchOnDescription: true,
    });

    return pick === undefined ? undefined : pick.mode;
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
    void registerJarvisYamlSchemaContributor(context.extensionUri, log);

    // Gitignore auto-management (SPEC_CFG_IGNOREMANAGER)
    applyGitignore();

    // Actor instructions provisioning (SPEC_MOD_ACTORRULES)
    const actorProvisionEnabled = vscode.workspace.getConfiguration('jarvis.actor').get<boolean>('autoProvision', false);
    void provisionModuleAssets(context, {
        namespace: 'jarvis-actor',
        instructionsSourceDir: context.asAbsolutePath('assets/instructions'),
        enabled: actorProvisionEnabled,
    });

    // Hook Engine (SPEC_HOOK_LOG, SPEC_HOOK_INTAKE, SPEC_HOOK_CONFIG)
    const hookEngine = new HookEngine(log);
    const workspaceRoot = configPaths.getWorkspaceRoot();
    const hookIntake = new HookIntake(hookEngine, workspaceRoot ? getHooksDir(workspaceRoot) : '');
    let hookIntakeStarted = false;

    // Touched-files persistence (SPEC_ACTOR_TOUCHEDFILES) — constructed early
    // (only needs workspaceRoot) so it can be injected into the tree factory
    // before any provider renders; TouchTracker is wired later, alongside
    // ActivityTracker, once kindDrivenScanner/engine exist.
    const touchStore = new TouchStore(path.join(workspaceRoot ?? '', '.jarvis', 'state', 'touched-files'));

    async function startHookIntake(): Promise<void> {
        if (hookIntakeStarted) { return; }
        try {
            const workspaceRoot = configPaths.getWorkspaceRoot();
            if (workspaceRoot) {
                await installHookConfig(workspaceRoot, log);
                await hookIntake.start();
                hookIntakeStarted = true;
                log.info(`[HookIntake] Started on port ${hookIntake.getPort()}`);
            }
        } catch (err) {
            log.warn(`[HookIntake] Failed to start (best-effort): ${err}`);
        }
    }

    async function stopHookIntake(): Promise<void> {
        if (hookIntakeStarted) {
            await hookIntake.stop();
            hookIntakeStarted = false;
            log.info('[HookIntake] Stopped');
        }
    }

    // Start hook intake gated on autoInstall setting (SPEC_HOOK_AUTOINST)
    const autoInstall = vscode.workspace.getConfiguration('jarvis.hooks').get<boolean>('autoInstall', true);
    if (autoInstall) {
        void startHookIntake();
    } else {
        // Teardown any leftover files from a previous activation
        const wr = configPaths.getWorkspaceRoot();
        if (wr) { void uninstallHookConfig(wr, log); }
    }

    // Configuration change listener for jarvis.hooks.autoInstall (SPEC_HOOK_AUTOINST AC-5)
    const hookAutoInstallListener = vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (!e.affectsConfiguration('jarvis.hooks.autoInstall')) { return; }
        const newValue = vscode.workspace.getConfiguration('jarvis.hooks').get<boolean>('autoInstall', true);
        const wr = configPaths.getWorkspaceRoot();
        if (newValue) {
            // false → true: install + start
            if (wr) { await startHookIntake(); }
        } else {
            // true → false: stop + teardown
            await stopHookIntake();
            if (wr) { await uninstallHookConfig(wr, log); }
        }
    });
    context.subscriptions.push(hookAutoInstallListener);

    // Configuration change listener for jarvis.gitignore.autoManage (SPEC_CFG_IGNOREMANAGER AC-8)
    const gitignoreAutoManageListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (!e.affectsConfiguration('jarvis.gitignore.autoManage')) { return; }
        applyGitignore();
    });
    context.subscriptions.push(gitignoreAutoManageListener);

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

    // Pinned resource open helper (SPEC_MSG_PINNED) — { preview: false } prevents
    // VS Code from silently reusing a transient editor slot ("ghost editor").
    // Optional viewColumn lets callers direct the open per the placement model
    // (SPEC_MSG_EDITORPLACEMENT); omitting it preserves prior default-column behavior.
    async function openPinnedResource(
        uri: vscode.Uri,
        viewColumn?: vscode.ViewColumn
    ): Promise<void> {
        await vscode.commands.executeCommand('vscode.open', uri, {
            preview: false,
            ...(viewColumn !== undefined ? { viewColumn } : {}),
        });
    }

    // --- Editor-Group Placement Helper (SPEC_MSG_EDITORPLACEMENT) ---
    // Three placement targets (Main/Docs/Secondary) computed at call time from
    // vscode.window.tabGroups.all — no persisted state.

    const MAIN_COLUMN = vscode.ViewColumn.One;
    const DOCS_COLUMN = vscode.ViewColumn.Two;

    function resolveSecondaryColumn(): vscode.ViewColumn {
        // Math.max(2, N) — NOT N alone, and NOT N + 1.
        // - N alone collapses Secondary into Main (column 1) when only 1
        //   column is open — Secondary and Main must never be the same
        //   column (confirmed regression found by PM in manual testing).
        // - N + 1 creates a brand-new column on every delivery (confirmed
        //   regression during spike validation).
        // The floor of 2 guarantees Secondary always splits at least
        // column 2 the first time; once 2+ columns exist, Secondary
        // reuses the existing last column, letting Secondary sessions
        // stack as tabs within the same group once 3+ columns exist.
        const groupCount = vscode.window.tabGroups.all.length;
        return Math.max(2, groupCount) as vscode.ViewColumn;
    }

    /** Finds an already-open tab for a chat session, by resolving the tab's
     *  label via lookupSessionUUID (chat tabs expose no .uri). */
    function findSessionTab(sessionName: string): vscode.Tab | undefined {
        for (const group of vscode.window.tabGroups.all) {
            for (const tab of group.tabs) {
                if (tab.label === sessionName) { return tab; }
            }
        }
        return undefined;
    }

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

    /** Main-target open (user click — always column 1, close+reopen if elsewhere). */
    async function openAtMain(uri: vscode.Uri, sessionName: string): Promise<void> {
        const existing = findSessionTab(sessionName);
        if (existing && existing.group.viewColumn !== MAIN_COLUMN) {
            // AC-5: close the tab wherever it is, then reopen fresh at Main
            await vscode.window.tabGroups.close(existing);
        }
        await vscode.commands.executeCommand('vscode.open', uri, {
            preview: false,
            viewColumn: MAIN_COLUMN,
        });
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

    /** Secondary-target open (system delivery — focus-in-place if open anywhere, else last column). */
    async function openAtSecondary(uri: vscode.Uri, sessionName: string): Promise<void> {
        const existing = findSessionTab(sessionName);
        const viewColumn = existing ? existing.group.viewColumn : resolveSecondaryColumn();
        await vscode.commands.executeCommand('vscode.open', uri, {
            preview: false,
            viewColumn,
        });
    }

    /**
     * Re-apply a custom agent mode to the currently-focused chat editor.
     *
     * VS Code silently drops the custom agent mode of a chat editor session
     * on window reload (upstream limitation): the tab reopens but reverts to
     * the generic assistant. VS Code registers a per-mode command
     * `workbench.action.chat.open<ModeName>` for every discovered agent mode;
     * unlike the generic `workbench.action.chat.open`, these carry `this.mode`
     * and therefore target the *focused* chat editor widget instead of the
     * sidebar view. We rebuild that command id from the entity's agent name
     * and invoke it after the session tab has been opened+focused.
     *
     * Defensive: the command only exists once VS Code has registered the mode,
     * so we probe the command registry first and no-op (with a warning) if it
     * is not yet available, rather than throwing `command not found`.
     *
     * @param agent       The agent/mode name (e.g. "Test Manager"), as stored
     *                    on the entity's `agent` field.
     * @param sessionName The name of the session the mode change targets.
     *                    Compared against the active tab label to prevent
     *                    mis-targeted mode commands.
     */
    async function reapplyAgentMode(agent: string, sessionName: string): Promise<void> {
        try {
            await new Promise(resolve => setTimeout(resolve, 400));
            const cmdId = `workbench.action.chat.open${agent}`;
            const available = await vscode.commands.getCommands(true);
            if (!available.includes(cmdId)) {
                log.warn(`[MSG] reapplyAgentMode: command "${cmdId}" not registered yet — skipping for "${sessionName}"`);
                return;
            }
            const activeLabel = vscode.window.tabGroups.activeTabGroup.activeTab?.label;
            if (activeLabel !== sessionName) {
                log.warn(
                    `[MSG] reapplyAgentMode: skipped — intended "${sessionName}" `
                    + `but focused tab is "${activeLabel ?? '<none>'}"`
                );
                return;
            }
            await vscode.commands.executeCommand(cmdId);
            await new Promise(resolve => setTimeout(resolve, 300));
            log.info(`[MSG] reapplyAgentMode: re-applied agent mode "${agent}" to session "${sessionName}"`);
        } catch (err) {
            log.warn(`[MSG] reapplyAgentMode: failed to re-apply agent mode "${agent}" for "${sessionName}": ${err}`);
        }
    }

    // --- Focus-Snapshot and Restore Helper (SPEC_MSG_FOCUSRESTORE) ---

    type FocusSnapshot =
        | { kind: 'editor'; uri: vscode.Uri; viewColumn: vscode.ViewColumn }
        | { kind: 'terminal'; terminal: vscode.Terminal }
        | undefined;

    async function snapshotFocus(): Promise<FocusSnapshot> {
        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
        if (activeTab) {
            // Chat-editor tabs expose no .uri on tab.input — resolve the real
            // session UUID via lookupSessionUUID(tab.label), the same
            // mechanism used for Main/Secondary placement
            // (SPEC_MSG_EDITORPLACEMENT, REQ_MSG_FOCUSRESTORE AC-2). The
            // tab's label is the session *name*, not a UUID — it must be
            // resolved, never encoded directly.
            const existingUri = (activeTab.input as { uri?: vscode.Uri } | undefined)?.uri;
            let uri = existingUri;
            if (!uri) {
                const uuid = await lookupSessionUUID(activeTab.label);
                if (!uuid) { return undefined; } // unresolvable chat tab — nothing to restore
                uri = vscode.Uri.parse(
                    `vscode-chat-session://local/${Buffer.from(uuid).toString('base64')}`
                );
            }
            return {
                kind: 'editor',
                uri,
                viewColumn: activeTab.group.viewColumn,
            };
        }
        if (vscode.window.activeTerminal) {
            return { kind: 'terminal', terminal: vscode.window.activeTerminal };
        }
        return undefined;
    }

    // No artificial delay between disrupt and restore — an earlier spike
    // revision's defensive setTimeout(800) measurably worsened both latency
    // (839ms→~520ms once removed) and keystroke-leak count (23→0-1 once
    // removed). Do not reintroduce it defensively.
    async function restoreFocus(snapshot: FocusSnapshot): Promise<void> {
        if (!snapshot) { return; }
        if (snapshot.kind === 'editor') {
            await vscode.commands.executeCommand('vscode.open', snapshot.uri, {
                preview: false,
                viewColumn: snapshot.viewColumn,
                preserveFocus: false,
            });
        } else {
            snapshot.terminal.show();
        }
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

    // Activity indicator (SPEC_ACTOR_ACTIVITY): hook-driven 2-state tree
    // icon, read directly by ActorTreeProvider.getTreeItem().
    const activityTracker = new ActivityTracker(hookEngine, actorScanner, (_entityName: string) => {
        actorTreeProvider?.refresh();
    }, log);

    actorTreeProvider = new ActorTreeProvider(actorScanner, touchStore, activityTracker);
    const treeProvider = actorTreeProvider;
    engine.setMarker((id, icon) => treeProvider.mark(id, icon));
    initInjectPrompt({
        scanner: actorScanner,
        log,
        openAtMain,
        openAtSecondary,
        openNewChatEditor,
        renameFocusedChatSession,
        reapplyAgentMode,
    });
    const actorsView = vscode.window.createTreeView('jarvisActors', {
        treeDataProvider: actorTreeProvider,
        showCollapseAll: true,
    });
    const firstFolder = vscode.workspace.workspaceFolders?.[0];
    if (firstFolder) {
        actorsView.title = `${firstFolder.name} Actors`;
    }
    context.subscriptions.push(actorsView, actorTreeProvider);

    // Touched-files tracking (SPEC_ACTOR_TOUCHEDFILES): single PostToolUse
    // subscription. No local reference kept — the tracker self-registers on
    // hookEngine and needs no further interaction from extension.ts.
    new TouchTracker(
        hookEngine, touchStore,
        (entityName: string) => {
            const lookup = actorScanner.resolveName(entityName);
            return lookup.status === 'found' ? { name: lookup.actor.name, folder: lookup.actor.folder } : undefined;
        },
        () => actorTreeProvider?.refresh(),
        log,
    );

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

    // Context actions (SPEC_EXP_CONTEXTACTIONS) — generic, used by any actor
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

    // Send messages command (SPEC_MSG_SENDCOMMAND)
    const sendMessagesCommand = vscode.commands.registerCommand(
        'jarvis.sendMessages',
        async (node?: SessionGroupNode) => {
            if (!node) {
                vscode.window.showWarningMessage('Jarvis: Use the play button on a session group in the Messages tree.');
                return;
            }
            log.info(`[MSG] sendMessages: destination="${node.destination}", count=${node.children.length}`);

            // 1. Compose notification stub (SPEC_MSG_NOTIFICATION_RESOLVE)
            const count = node.children.length;
            const senders = [...new Set(node.children.map((c: any) => c.sender))].join(', ');
            const cfg = vscode.workspace.getConfiguration('jarvis');
            const stub = resolveNotificationText(
                cfg.get<string>('messages.notificationTemplate', ''),
                { count: String(count), destination: node.destination, sender: senders },
                node.destination
            );  // REQ_MSG_NOTIFICATION_TEMPLATE

            // 2. Delegate to injectPrompt (SPEC_INJ_INJECT)
            await injectPrompt(node.destination, stub, { placement: 'main' });

            // 3. Refresh tree (messages stay in queue)
            messageProvider.reload();
        }
    );

    // Open message session command (SPEC_MSG_EDITORPLACEMENT / SPEC_MSG_TREEPROVIDER,
    // ui-improvements CR) — clicking a SessionGroupNode's label opens that
    // actor's chat at Main. Silent no-op if no live session exists yet
    // (lower-intent than clicking Play, so no create-on-miss).
    const openMessageSessionCommand = vscode.commands.registerCommand(
        'jarvis.openMessageSession',
        async (node: SessionGroupNode) => {
            const uuid = await lookupSessionUUID(node.destination);
            if (!uuid) { return; }
            const b64 = Buffer.from(uuid).toString('base64');
            const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
            await openAtMain(uri, node.destination);
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
            await openPinnedResource(uri);
        }
    );

    // Open Actor session command (SPEC_ACTOR_TREE)
    const openActorSessionCommand = vscode.commands.registerCommand(
        'jarvis.openActorSession',
        async (element: ActorNode) => {
            const entity = actorScanner.getActor(element.id);
            if (!entity) { return; }

            // Delegate to injectPrompt — init prompt is owned by injectPrompt.ts
            // (SPEC_INJ_INJECT, SPEC_ACTOR_INITPROMPT)
            await injectPrompt(entity.name, '', { placement: 'main' });
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
        | { kind: 'actorFileFolder'; folderPath: string; label: string }
        | { kind: 'touchedFileLeaf'; filePath: string; label: string }
        | { kind: 'touchedFileFolder'; relFolderPath: string; label: string };
    function resolveCopyPaths(node: CopyPathNode): { folder: string; full: string } {
        if (node.kind === 'actorFile' || node.kind === 'touchedFileLeaf') {
            return { folder: path.dirname(node.filePath), full: node.filePath };
        }
        if (node.kind === 'actorFileFolder') {
            return { folder: path.dirname(node.folderPath), full: node.folderPath };
        }
        if (node.kind === 'touchedFileFolder') {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const full = path.join(workspaceRoot, node.relFolderPath);
            return { folder: path.dirname(full), full };
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

    // Show Changes / Remove for touched-file leaves (SPEC_ACTOR_TOUCHEDFILES)
    const diffTouchedFileCommand = vscode.commands.registerCommand(
        'jarvis.diffTouchedFile',
        async (node: { filePath: string; resourceUri?: vscode.Uri }) => {
            const uri = node.resourceUri ?? vscode.Uri.file(node.filePath);
            await vscode.commands.executeCommand('git.openChange', uri);
        }
    );

    const removeTouchedFileCommand = vscode.commands.registerCommand(
        'jarvis.removeTouchedFile',
        async (node: { filePath: string; actorName: string; resourceUri?: vscode.Uri; entry?: { rootUri?: string; relPath?: string } }) => {
            // D-16: use canonical key (resourceUri string) for new records, fall back to relPath for legacy
            let key: string;
            if (node.resourceUri) {
                key = node.resourceUri.toString(true);
            } else {
                key = path.relative(
                    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', node.filePath
                ).replace(/\\/g, '/');
            }
            await touchStore.removeEntry(ACTOR_TOUCH_KIND, node.actorName, key);
            actorTreeProvider?.refresh();
        }
    );

    // Remove all touched files under a folder or category (SPEC_ACTOR_TOUCHEDFILES)
    const removeTouchedFilesCommand = vscode.commands.registerCommand(
        'jarvis.removeTouchedFiles',
        async (node: { kind: string; actorName: string; relFolderPath?: string; rootUri?: string }) => {
            if (node.kind === 'touchedFileFolder') {
                await touchStore.removeUnder(ACTOR_TOUCH_KIND, node.actorName, node.relFolderPath!, node.rootUri);
            } else {
                await touchStore.removeAll(ACTOR_TOUCH_KIND, node.actorName);
            }
            actorTreeProvider?.refresh();
        }
    );

    // Clean up dead entries — D-15: snapshot + async probes + synchronous compare-delete
    const cleanupTouchedFilesCommand = vscode.commands.registerCommand(
        'jarvis.cleanupTouchedFiles',
        async (node: { actorName: string }) => {
            const { probeTouchEntry } = await import('./engine/actors/touchedFilesView');
            const snapshot = await touchStore.getEntries(ACTOR_TOUCH_KIND, node.actorName);
            const absentKeys: string[] = [];
            await Promise.all(
                Object.entries(snapshot).map(async ([key, entry]) => {
                    const { result } = await probeTouchEntry(entry);
                    if (result === 'absent') { absentKeys.push(key); }
                })
            );
            const count = touchStore.removeEntriesIfUnchanged(ACTOR_TOUCH_KIND, node.actorName, snapshot, absentKeys);
            void vscode.window.showInformationMessage(
                count > 0
                    ? `${node.actorName}: removed ${count} missing file(s).`
                    : `${node.actorName}: nothing to clean up.`
            );
            actorTreeProvider?.refresh();
        }
    );

    // Refresh on windowDays configuration change (SPEC_ACTOR_TOUCHEDFILES)
    const touchedFilesConfigWatcher = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('jarvis.touchedFiles.windowDays')) {
            actorTreeProvider?.refresh();
        }
    });

    // --- Core LM tools ---

    // sendToSession — HARD DEPRECATED (REQ_MSG_SENDTOSESSION AC-3/4/5/6)
    const sendToSessionTool = engine.registerTool('jarvis_sendToSession',
        '[DEPRECATED AND DISABLED — use jarvis_sendMessage instead.] Queues a message for delivery to another VS Code chat session identified by name.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            throw new Error(
                'This tool is deprecated and no longer functional. Use jarvis_sendMessage instead.'
            );
        }
    );

    // sendMessage (canonical)
    const sendMessageTool = engine.registerTool('jarvis_sendMessage',
        'Queues a text message for delivery to a destination identified by name. senderSession is required and validated.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { session, text, senderSession } = options.input;
            const validNames = getValidDestinations(actorScanner);
            const sortedNames = () => {
                const sorted = [...validNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                return sorted.length > 0 ? sorted.join(', ') : '(none)';
            };

            // Destination validation (REQ_MSG_SENDMESSAGE AC-3/4, REQ_ACTOR_SCHEMA AC-7)
            const dest = actorScanner.resolveName(session);
            if (dest.status === 'ambiguous') {
                const msg = ambiguousActorMessage(session, dest.matches);
                void vscode.window.showErrorMessage(`Jarvis: ${msg}`);
                throw new Error(msg);
            }
            if (dest.status === 'unknown') {
                throw new Error(`Destination session "${session}" does not exist.\nValid destinations: ${sortedNames()}`);
            }

            // Sender validation (REQ_MSG_SENDMESSAGE AC-5/6, REQ_MSG_SENDER_ERROR)
            if (!senderSession || String(senderSession).trim() === '') {
                throw new Error(
                    'senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.'
                );
            }
            const sender = actorScanner.resolveName(senderSession);
            if (sender.status === 'ambiguous') {
                const msg = ambiguousActorMessage(senderSession, sender.matches);
                void vscode.window.showErrorMessage(`Jarvis: ${msg}`);
                throw new Error(msg);
            }
            if (sender.status === 'unknown') {
                throw new Error(`Sender session "${senderSession}" does not exist.\nValid senders: ${sortedNames()}`);
            }

            // Both valid — queue the message (REQ_MSG_SENDMESSAGE AC-7)
            appendMessage(resolveMessagesPath(), session, senderSession, text);
            log.info(`[MSG] sendMessage: destination="${session}", sender="${senderSession}"`);
            messageProvider.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Message queued for destination "${session}" from "${senderSession}"`)
            ]);
        }
    );

    // readMessage — HARD DEPRECATED (REQ_MSG_READ AC-3/4/5)
    const readMessageTool = engine.registerTool('jarvis_readMessage',
        '[DEPRECATED AND DISABLED — use jarvis_receiveMessage instead.] Reads and removes the oldest message from the Jarvis message queue for the given destination session.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            throw new Error(
                'This tool is deprecated and no longer functional. Use jarvis_receiveMessage instead.'
            );
        }
    );

    // receiveMessage (canonical)
    const receiveMessageTool = engine.registerTool('jarvis_receiveMessage',
        'Reads and removes the oldest message from the Jarvis message queue for the given destination session.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const result = popMessage(resolveMessagesPath(), options.input.destination);
            log.info(`[MSG] receiveMessage: destination="${options.input.destination}", remaining=${result.remaining}`);
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

    // listActors — returns all Jarvis Actors
    const listActorsTool = engine.registerTool('jarvis_listActors',
        'Returns all Jarvis Actor entities (YAML-based) with name, summary, agent, and folder path.',
        createListActorsHandler(actorScanner, log)
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

    // createActor / whoAmI tools (SPEC_ACTOR_CREATETOOL, SPEC_ACTOR_WHOAMI) —
    // registered whenever the actors folder is resolvable; no feature gate.
    let createActorTool: vscode.Disposable | undefined;
    let whoAmITool: vscode.Disposable | undefined;
    if (configPaths.getActorsDir() !== undefined) {
        createActorTool = engine.registerTool('jarvis_createActor',
            'Creates a Jarvis Actor (actor.yaml and context.md) under the configured actors folder. Returns created: false without changes when the Actor folder already exists.',
            createActorHandler({
                resolveActorsFolder: () => configPaths.getActorsDir(),
                discoverAgentModes,
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

        // whoAmI correlation buffer (SPEC_ACTOR_WHOAMI, whoami-session-id-resolution CR #51)
        // Captures PreToolUse events for jarvis_whoAmI and provides the calling
        // session's session_id to the tool handler. See spec for 5 behavioural
        // properties: filter at capture, consume on read, expire on age,
        // ambiguity is an error, absence is an error.
        const WHOAMI_FRESHNESS_MS = 10_000; // 10 seconds — exceeds hook round-trip with margin
        const whoAmIBuffer: Array<{ sessionId: string; timestamp: number }> = [];

        hookEngine.on('PreToolUse', (event) => {
            const toolName = event.payload?.tool_name as string | undefined;
            // Decision 6: trace-log actual payload.tool_name for live verification
            log.trace(`[whoAmI] PreToolUse payload.tool_name = ${JSON.stringify(toolName)}`);
            // Filter: only retain events for jarvis_whoAmI (may appear bare or with transport prefix)
            if (!toolName || !toolName.endsWith('jarvis_whoAmI')) { return; }
            if (!event.sessionId) { return; }
            whoAmIBuffer.push({ sessionId: event.sessionId, timestamp: Date.now() });
        });

        /** Consume the buffer and return the unambiguous session_id, or undefined. */
        function takeCallingSessionId(): string | undefined {
            const now = Date.now();
            // Drain and filter: take all entries, discard stale ones
            const entries = whoAmIBuffer.splice(0);
            const fresh = entries.filter(e => (now - e.timestamp) < WHOAMI_FRESHNESS_MS);
            if (fresh.length === 0) {
                log.debug('[whoAmI] no fresh buffer entries (absence)');
                return undefined;
            }
            const uniqueIds = new Set(fresh.map(e => e.sessionId));
            if (uniqueIds.size > 1) {
                log.warn(`[whoAmI] ambiguous buffer: ${uniqueIds.size} distinct session_ids — returning error`);
                return undefined;
            }
            return fresh[0].sessionId;
        }

        // whoAmI tool (SPEC_ACTOR_WHOAMI)
        whoAmITool = engine.registerTool('jarvis_whoAmI',
            'Returns the calling actor\'s name and the absolute path to its context.md. Call this after /compact or context loss to recover your identity. No input parameters required.',
            async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
                const ERROR_MSG = 'Unable to determine your identity automatically (hooks disabled or unavailable). Please confirm your identity with the user.';

                // 1. Obtain calling session's session_id from correlation buffer
                const sessionId = takeCallingSessionId();
                if (!sessionId) {
                    // Accepted limitation: if hooks are disabled, buffer is always empty.
                    log.info('[whoAmI] no session_id from buffer (hooks disabled, absent, stale, or ambiguous)');
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify({ error: ERROR_MSG }))
                    ]);
                }

                // 2. Resolve session_id to entity name
                const entityName = await getEntityNameForSessionId(sessionId);
                if (!entityName) {
                    log.info(`[whoAmI] session_id=${sessionId} could not be resolved to an entity`);
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify({ error: ERROR_MSG }))
                    ]);
                }

                // 3. Resolve name against the Actor scanner (SPEC_ACTOR_WHOAMI step 3)
                const lookup = actorScanner.resolveName(entityName);
                if (lookup.status !== 'found') {
                    log.info(`[whoAmI] entity "${entityName}" resolved to status="${lookup.status}"`);
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify({ error: ERROR_MSG }))
                    ]);
                }

                // 4. Return identity
                const payload = {
                    name: lookup.actor.name,
                    contextPath: path.join(lookup.actor.folder, 'context.md'),
                    id: lookup.actor.id,
                };
                log.info(`[ACTOR] whoAmI: "${payload.name}" → ${payload.contextPath} (via session_id=${sessionId})`);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify(payload))
                ]);
            }
        );
    }

    // Inject prompt tool (SPEC_INJ_TOOL)
    const injectPromptTool = engine.registerTool('jarvis_injectPrompt',
        'Inject a prompt or slash-command into a named actor\'s chat session. '
        + 'If no session exists, one is spawned automatically.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const { actor, text } = options.input as { actor: string; text: string };
            try {
                await injectPrompt(actor, text);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(`Injected into "${actor}": ${text.slice(0, 80)}${text.length > 80 ? '…' : ''}`)
                ]);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(`Error: ${msg}`)
                ]);
            }
        }
    );

    // Inject prompt command (SPEC_INJ_COMMAND)
    const injectPromptCommand = vscode.commands.registerCommand(
        'jarvis.injectPrompt',
        async () => {
            const actors = actorScanner.actors;
            if (actors.length === 0) {
                vscode.window.showWarningMessage('Jarvis: No Actors found.');
                return;
            }
            const items = actors.map(a => ({
                label: a.name,
                description: a.summary
            }));
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select Actor to inject into'
            });
            if (!picked) { return; }

            const text = await vscode.window.showInputBox({
                prompt: 'Text or slash-command to inject',
                placeHolder: '/compact'
            });
            if (!text) { return; }

            try {
                await injectPrompt(picked.label, text);
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                vscode.window.showWarningMessage(msg);
            }
        }
    );

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
            const targetPath = await writeActorFiles(actorsFolder, { name, summary: summaryInput ?? '', agent: '' });

            const agentInput = await pickAgentMode();
            if (agentInput) {
                await writeActorAgent(targetPath, { name, summary: summaryInput ?? '', agent: agentInput });
            }

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



    // Re-entrancy guard (agent-mode-reset-race CR, REQ_MSG_DELIVERY_REENTRANCY).
    let deliveryInFlight = false;

    // Auto-delivery poll loop (SPEC_MSG_AUTODELIVER_POLL)
    const pollInterval = setInterval(async () => {
        const messagesPath = resolveMessagesPath();
        const autoDeliverySessions = readAutoDelivery(messagesPath);
        if (autoDeliverySessions.length > 0) {
            const messages = readQueue(messagesPath);
            for (const sessionName of autoDeliverySessions) {
                const pending = messages.filter(m => m.destination === sessionName && !m.notified);
                if (pending.length === 0) { continue; }

                if (deliveryInFlight) {
                    log.debug('[MSG] autoDelivery: tick skipped — delivery still in flight');
                    break;
                }
                deliveryInFlight = true;
                try {
                    // Snapshot focus before the disruptive delivery (SPEC_MSG_FOCUSRESTORE)
                    const focus = await snapshotFocus();

                    // Compose notification stub (SPEC_MSG_NOTIFICATION_RESOLVE)
                    const cfg = vscode.workspace.getConfiguration('jarvis');
                    const senders = [...new Set(pending.map(m => m.sender))].join(', ');
                    const stub = resolveNotificationText(
                        cfg.get<string>('messages.notificationTemplate', ''),
                        { count: String(pending.length), destination: sessionName, sender: senders },
                        sessionName
                    );  // REQ_MSG_NOTIFICATION_TEMPLATE

                    // Delegate to injectPrompt (SPEC_INJ_INJECT)
                    await injectPrompt(sessionName, stub, { placement: 'secondary' });

                    // Mark messages as notified
                    const updated = readQueue(messagesPath);
                    for (const m of updated) {
                        if (m.destination === sessionName && !m.notified) { m.notified = true; }
                    }
                    writeQueue(messagesPath, updated);
                    messageProvider.reload();

                    // Restore the user's prior focus immediately, no artificial
                    // delay (SPEC_MSG_FOCUSRESTORE) — unless user disabled it
                    const restoreFocusEnabled = vscode.workspace.getConfiguration('jarvis.messaging').get<boolean>('restoreFocusAfterDelivery', true);
                    if (restoreFocusEnabled) {
                        await restoreFocus(focus);
                    }
                } catch (err) {
                    log.warn(`[MSG] autoDelivery: delivery failed for "${sessionName}": ${err}`);
                } finally {
                    deliveryInFlight = false;
                }
                break; // max one session per tick
            }
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
        openMessageSessionCommand,
        deleteMessageCommand,
        openHeartbeatJobCommand,
        openMessageFileCommand,
        openActorFileCommand,
        copyPathCommand,
        copyFullPathCommand,
        copyFileNameCommand,
        diffTouchedFileCommand,
        removeTouchedFileCommand,
        removeTouchedFilesCommand,
        cleanupTouchedFilesCommand,
        touchedFilesConfigWatcher,
        openSessionCommand,
        openActorSessionCommand,
        { dispose: () => void stopHookIntake() },
        checkForUpdatesCommand,
        showReleaseNotesCommand,
        sendToSessionTool,
        readMessageTool,
        listActorsTool,
        ...(createActorTool ? [createActorTool] : []),
        ...(whoAmITool ? [whoAmITool] : []),
        injectPromptTool,
        injectPromptCommand,
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
        listChatSessionsTool,
        enableAutoDeliveryCommand,
        disableAutoDeliveryCommand,
        { dispose: () => clearInterval(pollInterval) },
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('jarvis.scanInterval')) { syncScannerTimer(); }
            if (e.affectsConfiguration('jarvis.actors.folder')) {
                void actorScanner.rescan();
            }
        }),
    );

    // SPEC_ENG_API AC-1: activate() returns the JarvisCoreApi
    return engine as JarvisCoreApi;
}

export function deactivate() {
    // Stop hook intake on deactivate
    // Note: this is best-effort; the extension host may terminate before this runs
    // The actual stop is handled by the subscription disposal in activate()
}
