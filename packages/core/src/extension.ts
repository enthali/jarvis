// Implementation: SPEC_MOD_CORE_PKG, SPEC_ENG_API
// Core extension — engine, sessions, messaging, reminders, heartbeat.
// PIM (projects/events/categories/tasks/outlook) and recorder are separate extensions (S5/S6).

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as configPaths from './engine/core/configPaths';
import { MessageTreeProvider, SessionGroupNode, MessageLeafNode } from './apps/session/messageTreeProvider';
import { RemindersTreeProvider, ReminderNode } from './apps/session/remindersTreeProvider';
import { KindDrivenScanner, LeafNode, TreeNode, FileNode, FolderNode } from './engine/sessions/yamlScanner';
import { activateHeartbeat, HeartbeatScheduler, HeartbeatJob, HeartbeatStep } from './apps/session/heartbeat';
import { JobNode } from './apps/session/heartbeatTreeProvider';
import { JarvisEngine } from './engine/core/coreApi';
import { GenericTreeFactory } from './engine/core/treeFactory';
import { UnifiedEntityTreeProvider } from './engine/core/unifiedEntityTreeProvider';
import type { EntityKindConfig, JarvisCoreApi } from './engine/core/types';
import { deleteMessage, appendMessage, popMessage, readAutoDelivery, addAutoDelivery, removeAutoDelivery, readQueue, writeQueue } from './engine/sessions/messageQueue';
import { addReminder, readReminders, removeReminder, popDueReminders, setRemindersLogger } from './apps/session/reminders';
import { lookupSessionUUID, getAllSessions, initSessionLookup, setSessionLookupLogger, filterNamedSessions, getValidDestinations, getEntityNameForSessionId } from './engine/sessions/sessionLookup';
import { discoverAgentModes } from './engine/sessions/agentDiscovery';
import { injectPrompt, initInjectPrompt, resolveNotificationText } from './engine/sessions/injectPrompt';
import { checkForUpdates } from './engine/core/updateCheck';
import { HookEngine } from './engine/hooks/hookEngine';
import { HookIntake } from './engine/hooks/hookIntake';
import { installHookConfig, uninstallHookConfig, getHooksDir } from './engine/hooks/hookConfig';
import { ActivityTracker } from './engine/hooks/activityTracker';
import { ActivityDecorator } from './engine/hooks/activityDecorator';
import { TouchStore } from './engine/hooks/touchStore';
import { TouchTracker } from './engine/hooks/touchTracker';

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
// AgentModeEntry/discoverAgentModes moved to ./engine/sessions/agentDiscovery
// (SPEC_EXP_ENTITY_FILE_CHILDREN amendment) so getEntityFileChildren()
// (yamlScanner.ts) can reuse them without an extension.ts -> yamlScanner.ts
// import cycle.

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

    // Hook Engine (SPEC_HOOK_LOG, SPEC_HOOK_INTAKE, SPEC_HOOK_CONFIG)
    const hookEngine = new HookEngine(log);
    const workspaceRoot = configPaths.getWorkspaceRoot();
    const hookIntake = new HookIntake(hookEngine, workspaceRoot ? getHooksDir(workspaceRoot) : '');
    let hookIntakeStarted = false;

    // Touched-files persistence (SPEC_ENT_TOUCHEDFILES) — constructed early
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
     * @param agent   The agent/mode name (e.g. "Test Manager"), as stored on
     *                the entity's `agent` field.
     * @param context Short label for logging (session name).
     */
    async function reapplyAgentMode(agent: string, context: string): Promise<void> {
        try {
            // Let the freshly-opened editor tab settle so it is the focused
            // (active-element) chat widget before the mode-specific command runs.
            await new Promise(resolve => setTimeout(resolve, 400));
            const cmdId = `workbench.action.chat.open${agent}`;
            const available = await vscode.commands.getCommands(true);
            if (!available.includes(cmdId)) {
                log.warn(`[MSG] reapplyAgentMode: command "${cmdId}" not registered yet — skipping for "${context}"`);
                return;
            }
            await vscode.commands.executeCommand(cmdId);
            await new Promise(resolve => setTimeout(resolve, 300));
            log.info(`[MSG] reapplyAgentMode: re-applied agent mode "${agent}" to session "${context}"`);
        } catch (err) {
            log.warn(`[MSG] reapplyAgentMode: failed to re-apply agent mode "${agent}" for "${context}": ${err}`);
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

    // Engine (kind-driven scanner + generic tree factory) for session kind
    const kindDrivenScanner = new KindDrivenScanner(
        () => { engine.treeFactory.refreshAll(); },
        (settingKey: string) => {
            if (settingKey === 'jarvis.sessions.folder') {
                return configPaths.getSessionsDir() ?? '';
            }
            if (settingKey === 'jarvis.actors.folder') {
                return configPaths.getActorsDir() ?? '';
            }
            return vscode.workspace.getConfiguration().get<string>(settingKey, '');
        }
    );
    const treeFactory = new GenericTreeFactory(kindDrivenScanner);
    treeFactory.setTouchStore(touchStore); // SPEC_ENT_TOUCHEDFILES
    const engine = new JarvisEngine(kindDrivenScanner, treeFactory);
    context.subscriptions.push({ dispose: () => engine.dispose() });
    engine.setMessaging(resolveMessagesPath, () => messageProvider.reload());

    // Initialize injectPrompt primitive (SPEC_INJ_INJECT)
    initInjectPrompt({
        scanner: kindDrivenScanner,
        log,
        openAtMain,
        openAtSecondary,
        openNewChatEditor,
        renameFocusedChatSession,
        reapplyAgentMode,
    });

    // Activity indicator (SPEC_HOOK_ACTIVITY): hook-driven 2-state tree icon.
    // Constructed after `engine` exists (onChange needs treeFactory.refreshKind
    // + kindDrivenScanner.entities to resolve which kind owns the flipped entity).
    const activityTracker = new ActivityTracker(hookEngine, (entityName: string) => {
        const owner = kindDrivenScanner.entities.find(e => e.name === entityName);
        if (owner) { engine.treeFactory.refreshKind(owner.kind); }
    }, log);
    const activityDecorator = new ActivityDecorator(activityTracker, kindDrivenScanner);
    for (const kind of ['session', 'project', 'event']) {
        context.subscriptions.push(engine.treeFactory.registerDecorator(kind, activityDecorator));
    }

    // Touched-files tracking (SPEC_ENT_TOUCHEDFILES): single PostToolUse
    // subscription, reusing the same entity-resolution wiring as ActivityTracker.
    // No local reference kept — the tracker self-registers on hookEngine and
    // needs no further interaction from extension.ts (same as if it were
    // stored in context.subscriptions with a no-op dispose).
    new TouchTracker(
        hookEngine, touchStore,
        (entityName: string) => kindDrivenScanner.entities.find(e => e.name === entityName),
        (entityKind: string) => engine.treeFactory.refreshKind(entityKind),
        log,
    );

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
            viewId: 'jarvisEntities',
            folderSettingKey: 'jarvis.sessions.folder',
            label: (name: string) => name,
            additionalScanRoots: [
                { folderSettingKey: 'jarvis.actors.folder', conventionFile: 'actor.yaml' }
            ],
        };
        sessionKindDisposable = engine.registerEntityKind(sessionKindConfig);
        context.subscriptions.push(sessionKindDisposable);
        log.info('[CFG] Sessions feature enabled (via engine)');
    } else {
        log.info('[CFG] Sessions feature disabled');
    }

    // ------- UNIFIED ENTITIES TREE (SPEC_EXP_UNIFIEDTREE) -------
    // Create unified tree view after all kinds are registered
    const unifiedProvider = new UnifiedEntityTreeProvider(engine.treeFactory);
    const entitiesView = vscode.window.createTreeView('jarvisEntities', {
        treeDataProvider: unifiedProvider,
        showCollapseAll: true,
    });
    // Dynamic title: show first workspace folder name (the one scanned for .jarvis)
    const firstFolder = vscode.workspace.workspaceFolders?.[0];
    if (firstFolder) {
        entitiesView.title = `${firstFolder.name} Entities`;
    }
    context.subscriptions.push(entitiesView, unifiedProvider);

    // Trigger initial scan for registered kinds
    kindDrivenScanner.rescan();

    // ------- HEARTBEAT feature block (SPEC_CFG_TOGGLEGUARDS) -------
    if (cfg.get<boolean>('heartbeat.enabled', true)) {
        scheduler = activateHeartbeat(context, messageProvider, resolveMessagesPath, log, kindDrivenScanner);
        engine.setScheduler(scheduler);
        syncRescanJob();
    } else {
        log.info('[CFG] Heartbeat feature disabled');
    }

    // ------- MESSAGES feature block (SPEC_CFG_TOGGLEGUARDS) -------
    let remindersProvider: RemindersTreeProvider | undefined;

    if (cfg.get<boolean>('messages.enabled', true)) {
        const messageView = vscode.window.createTreeView('jarvisMessages', { treeDataProvider: messageProvider, showCollapseAll: true });
        context.subscriptions.push(messageView);

        if (cfg.get<boolean>('reminders.enabled', true)) {
            remindersProvider = new RemindersTreeProvider(resolveMessagesPath);
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

    // Rescan command
    const rescanCommand = vscode.commands.registerCommand('jarvis.rescan', async () => {
        await kindDrivenScanner.rescan();
        log.info('[Scanner] manual rescan triggered');
    });

    // Search Entities command (SPEC_EXP_SEARCH_ENTITIES_CMD)
    // Search Entities command - live tree filtering (REQ_EXP_SEARCHENTITIES)
    const searchEntitiesCommand = vscode.commands.registerCommand('jarvis.searchEntities', () => {
        const qp = vscode.window.createQuickPick();
        qp.placeholder = 'Type to filter entities in the tree...';
        qp.matchOnDescription = false;
        qp.matchOnDetail = false;
        
        // Apply search filter to all providers on every keystroke
        qp.onDidChangeValue((query) => {
            const trimmed = query.trim();
            for (const kind of ['session', 'project', 'event']) {
                const provider = engine.treeFactory.getProvider(kind);
                if (provider) {
                    provider.setSearchFilter(trimmed);
                }
            }
        });

        // Clear filter when closed
        qp.onDidHide(() => {
            for (const kind of ['session', 'project', 'event']) {
                const provider = engine.treeFactory.getProvider(kind);
                if (provider) {
                    provider.setSearchFilter('');
                }
            }
            qp.dispose();
        });

        qp.show();
    });

    // Context actions (SPEC_EXP_CONTEXTACTIONS) — generic, used by any entity
    // actor-touched-files CR: widened to also accept file-like nodes (filePath)
    // so "Reveal in Explorer" can be reused unchanged for jarvisTouchedFile.
    const revealInExplorerCommand = vscode.commands.registerCommand('jarvis.revealInExplorer', (node: LeafNode | { filePath: string }) => {
        const target = 'filePath' in node ? node.filePath : node.id;
        vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(target));
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

    // Open agent session command (SPEC_ENT_AGENTSESSION)
    const openAgentSessionCommand = vscode.commands.registerCommand(
        'jarvis.openAgentSession',
        async (element: LeafNode) => {
            const entity = kindDrivenScanner.getEntity(element.id);
            if (!entity) { return; }

            // Delegate to injectPrompt — init prompt is owned by injectPrompt.ts
            // (SPEC_INJ_INJECT, SPEC_ENT_AGENTSESSION_INITPROMPT)
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

    // Open entity file command (SPEC_ENT_ENTITY_FILE_CHILDREN) — fail-open, no auto-creation
    const openEntityFileCommand = vscode.commands.registerCommand(
        'jarvis.openEntityFile',
        async (node: { filePath: string; label: string }) => {
            const uri = vscode.Uri.file(node.filePath);
            try {
                await vscode.workspace.openTextDocument(uri); // validates existence first
                if (path.extname(node.filePath).toLowerCase() === '.md') {
                    // actor-owned-files-tree CR: broadened from the prior
                    // exact-basename ("context.md" only) check to any .md
                    // extension — REQ_ENT_ENTITY_FILE_CHILDREN AC-4a now
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

    // Copy Path / Copy Full Path (SPEC_ENT_ENTITY_CONTEXTMENU) — shared path
    // resolution helper for file-child nodes and entity root nodes.
    // actor-owned-files-tree CR: widened to also accept the provider-local
    // EntityFileNode/EntityFileFolderNode shapes (structurally compatible —
    // filePath/folderPath + label). No behavior change: entity-file children
    // carry contextValue 'jarvisEntityFile' (same menu bindings as the legacy
    // FileNode), so only 'entityFile' actually reaches these commands today;
    // 'entityFileFolder' is handled defensively for completeness.
    type CopyPathNode =
        | FileNode
        | LeafNode
        | { kind: 'entityFile'; filePath: string; label: string }
        | { kind: 'entityFileFolder'; folderPath: string; label: string }
        // actor-touched-files CR (SPEC_ENT_TOUCHEDFILES): touched-file leaf/folder
        // shapes are structurally compatible (filePath/folderPath + label).
        | { kind: 'touchedFileLeaf'; filePath: string; label: string }
        | { kind: 'touchedFileFolder'; relFolderPath: string; label: string };
    function resolveCopyPaths(node: CopyPathNode): { folder: string; full: string } {
        if (node.kind === 'file' || node.kind === 'entityFile' || node.kind === 'touchedFileLeaf') {
            return { folder: path.dirname(node.filePath), full: node.filePath };
        }
        if (node.kind === 'entityFileFolder') {
            return { folder: path.dirname(node.folderPath), full: node.folderPath };
        }
        if (node.kind === 'touchedFileFolder') {
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
            const full = path.join(workspaceRoot, node.relFolderPath);
            return { folder: path.dirname(full), full };
        }
        // Entity root (LeafNode): node.id is the convention file's absolute
        // path (project.yaml/event.yaml/session.yaml) — the entity's own
        // folder is its dirname; there is no separate "full path" for a
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

    // Copy File Name (file-child nodes only, SPEC_ENT_ENTITY_CONTEXTMENU, ui-improvements CR)
    const copyFileNameCommand = vscode.commands.registerCommand(
        'jarvis.copyFileName',
        async (node: { filePath: string }) => {
            await vscode.env.clipboard.writeText(path.basename(node.filePath));
        }
    );

    // Copy Category Name (folder/category nodes, SPEC_ENT_ENTITY_CONTEXTMENU, ui-improvements CR)
    const copyCategoryNameCommand = vscode.commands.registerCommand(
        'jarvis.copyCategoryName',
        async (node: FolderNode) => {
            await vscode.env.clipboard.writeText(node.name);
        }
    );

    // Show Changes / Remove for touched-file leaves (SPEC_ENT_TOUCHEDFILES)
    const diffTouchedFileCommand = vscode.commands.registerCommand(
        'jarvis.diffTouchedFile',
        async (node: { filePath: string }) => {
            // Delegates to the built-in Git extension's "Open Changes" command —
            // no custom git-uri/diff wiring, no fallback for untracked/non-git
            // files (REQ_ENT_TOUCHEDFILES AC-12, per CM/user decision).
            await vscode.commands.executeCommand('git.openChange', vscode.Uri.file(node.filePath));
        }
    );

    const removeTouchedFileCommand = vscode.commands.registerCommand(
        'jarvis.removeTouchedFile',
        async (node: { filePath: string; ownerKind: string; entityName: string }) => {
            const relPath = path.relative(
                vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', node.filePath
            ).replace(/\\/g, '/');
            await touchStore.removeEntry(node.ownerKind, node.entityName, relPath);
            // node.ownerKind is the disambiguated TouchStore storage key
            // ('actor'/'session'/'project'/'event' — see resolveTouchStorageKind);
            // refreshKind() needs the real registered provider kind instead
            // ('actor' entities are still rendered by the 'session' provider).
            engine.treeFactory.refreshKind(node.ownerKind === 'actor' ? 'session' : node.ownerKind);
        }
    );

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
            const validNames = await getValidDestinations(kindDrivenScanner);
            const sortedNames = () => {
                const sorted = [...validNames].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
                return sorted.length > 0 ? sorted.join(', ') : '(none)';
            };

            // Destination validation (REQ_MSG_SENDMESSAGE AC-3/4)
            if (!validNames.includes(session)) {
                throw new Error(`Destination session "${session}" does not exist.\nValid destinations: ${sortedNames()}`);
            }

            // Sender validation (REQ_MSG_SENDMESSAGE AC-5/6, REQ_MSG_SENDER_ERROR)
            if (!senderSession || String(senderSession).trim() === '') {
                throw new Error(
                    'senderSession is required. Callers must explicitly provide their session name — do not rely on the active editor tab.'
                );
            }
            if (!validNames.includes(senderSession)) {
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

    // listActors — returns YAML session entities
    const listActorsTool = engine.registerTool('jarvis_listActors',
        'Returns all Jarvis Actor entities (YAML-based) with name, summary, agent, and folder path.',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const sessions = kindDrivenScanner.entities
                .filter(e => e.kind === 'session')
                .map(e => ({ name: e.name, summary: e.summary ?? '', agent: e.agent ?? '', folder: e.folder }));
            log.info(`[SES] listActors: ${sessions.length} Actor(s)`);
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

    // listJarvisSessions — returns all Jarvis sessions across all kinds (Sessions, Projects, Events, ...)
    const listJarvisSessionsTool = engine.registerTool('jarvis_listJarvisSessions',
        'List all Jarvis sessions across all kinds (Sessions, Projects, Events, ...)',
        async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
            const sessions = engine.listJarvisSessions();
            log.info(`[SES] listJarvisSessions: ${sessions.length} session(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(sessions))
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

    // createActor tool
    let createActorTool: vscode.Disposable | undefined;
    let whoAmITool: vscode.Disposable | undefined;
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

            const sessionsDir = configPaths.ensureActorsDir();
            if (!sessionsDir) { throw new Error('jarvis_createActor: no workspace open'); }

            const targetPath = path.join(sessionsDir, name);
            const relPath = `.jarvis/actors/${name}`;

            if (fs.existsSync(targetPath)) {
                log.info(`[SES] createSession: idempotent skip for "${name}"`);
                try {
                    const sessionYamlPath = path.join(targetPath, 'actor.yaml');
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
            await fs.promises.writeFile(path.join(targetPath, 'actor.yaml'), yamlLines.join('\n'), 'utf-8');
            const contextContent = summary ? `# ${name}\n\n${summary}\n` : `# ${name}\n\n`;
            await fs.promises.writeFile(path.join(targetPath, 'context.md'), contextContent, 'utf-8');

            if (initialMessage) {
                appendMessage(resolveMessagesPath(), name, 'jarvis_createActor', initialMessage);
                messageProvider.reload();
            }

            await kindDrivenScanner.rescan();
            try {
                const sessionYamlPath = path.join(targetPath, 'actor.yaml');
                const leaf: LeafNode = { kind: 'leaf', id: sessionYamlPath };
                await vscode.commands.executeCommand('jarvis.openAgentSession', leaf);
                log.info(`[SES] createSession: auto-opened new session "${name}"`);
            } catch (err) { log.warn(`[SES] createSession: auto-open failed for "${name}": ${err}`); }

            log.info(`[SES] createSession: created "${name}" at ${targetPath}`);
            return { created: true, path: relPath };
        };

        createActorTool = engine.registerTool('jarvis_createActor',
        'Creates a new Jarvis Actor folder with actor.yaml and context.md.',
        async (options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
                const result = await createSession(options.input);
                log.info(`[SES] createActor: created=${result.created}, path=${result.path}`);
                return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(JSON.stringify(result))]);
            }
    );

        // whoAmI correlation buffer (SPEC_ACT_WHOAMI, whoami-session-id-resolution CR #51)
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

        // whoAmI tool (SPEC_ACT_WHOAMI)
        whoAmITool = engine.registerTool('jarvis_whoAmI',
            'Returns the calling actor\'s name and the absolute path to its context.md. Call this after /compact or context loss to recover your identity. No input parameters required.',
            async (_options: vscode.LanguageModelToolInvocationOptions<any>, _token: vscode.CancellationToken) => {
                const ERROR_MSG = 'You are not a registered actor. Please ask the user which actor you are.';

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

                // 3. Find the scanner entity with kind === 'session'
                const actor = kindDrivenScanner.entities
                    .find(e => e.kind === 'session' && e.name === entityName);
                if (!actor) {
                    log.info(`[whoAmI] entity "${entityName}" is not a registered session actor`);
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify({ error: ERROR_MSG }))
                    ]);
                }

                // 4. Return identity
                const contextPath = path.join(actor.folder, 'context.md');
                log.info(`[SES] whoAmI: "${actor.name}" → ${contextPath} (via session_id=${sessionId})`);
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        name: actor.name,
                        contextPath
                    }))
                ]);
            }
        );
    }

    // Inject prompt tool (SPEC_INJ_TOOL)
    const injectPromptTool = engine.registerTool('jarvis_injectPrompt',
        'Inject a prompt or slash-command into a named entity\'s chat session. '
        + 'The entity can be an actor, project, or event. '
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
            const entities = kindDrivenScanner.entities;
            if (entities.length === 0) {
                vscode.window.showWarningMessage('Jarvis: No entities found.');
                return;
            }
            const items = entities.map(e => ({
                label: e.name,
                description: e.kind ?? 'project'
            }));
            const picked = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select entity to inject into'
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

    // New session command (SPEC_SES_NEWENTITY)
    const newSessionCommand = vscode.commands.registerCommand(
        'jarvis.newActor',
        async () => {
            const targetFolder = configPaths.ensureActorsDir();
            if (!targetFolder) { vscode.window.showWarningMessage('Jarvis: No workspace open.'); return; }

            const nameInput = await vscode.window.showInputBox({ prompt: 'Actor name', placeHolder: 'My Actor', validateInput: validateSessionName });
            if (!nameInput) { return; }
            const summaryInput = await vscode.window.showInputBox({ prompt: 'Summary (optional)', placeHolder: 'Short description' });
            const agentInput = await pickAgentMode();
            if (agentInput === undefined) { return; }

            const sessionName = nameInput.trim();
            const targetPath = path.join(targetFolder, sessionName);
            if (fs.existsSync(targetPath)) { vscode.window.showErrorMessage(`Folder '${sessionName}' already exists in actors folder`); return; }

            await fs.promises.mkdir(targetPath, { recursive: true });
            const yamlLines = [`name: ${yamlString(nameInput)}`];
            if (summaryInput) { yamlLines.push(`summary: ${yamlString(summaryInput)}`); }
            yamlLines.push(`agent: ${yamlString(agentInput)}`);
            yamlLines.push('');
            await fs.promises.writeFile(path.join(targetPath, 'actor.yaml'), yamlLines.join('\n'), 'utf-8');
            const contextContent = `# ${nameInput}\n\n${summaryInput ?? ''}\n`;
            await fs.promises.writeFile(path.join(targetPath, 'context.md'), contextContent, 'utf-8');
            await kindDrivenScanner.rescan();
            log.info(`[NewSession] created session "${nameInput}" at ${targetPath}`);

            // Delegate to injectPrompt — init prompt is owned by injectPrompt.ts
            // (SPEC_INJ_INJECT, SPEC_ENT_AGENTSESSION_INITPROMPT)
            await injectPrompt(nameInput, '', { placement: 'main' });
        }
    );

    // Helper: flatten tree to leaf nodes (SPEC_ACT_MIGRATIONCOMMAND)
    function flattenLeaves(nodes: TreeNode[]): LeafNode[] {
        const leaves: LeafNode[] = [];
        for (const node of nodes) {
            if (node.kind === 'leaf') {
                leaves.push(node);
            } else if (node.kind === 'folder') {
                leaves.push(...flattenLeaves(node.children));
            }
        }
        return leaves;
    }

    // Helper: enumerate old-convention actors (SPEC_ACT_MIGRATIONCOMMAND)
    function listOldConventionActors(): { name: string; folderPath: string }[] {
        const provider = engine.treeFactory.getProvider('session');
        if (!provider) { return []; }
        const roots = provider.getChildren();
        const leaves = flattenLeaves(Array.isArray(roots) ? roots as TreeNode[] : []);
        return leaves
            .filter(leaf => leaf.id.endsWith('session.yaml'))  // old convention only
            .map(leaf => ({
                name: kindDrivenScanner.getEntity(leaf.id)?.name
                    ?? path.basename(path.dirname(leaf.id)),
                folderPath: path.dirname(leaf.id),
            }));
    }

    // Migrate session to actor command (SPEC_ACT_MIGRATIONCOMMAND)
    const migrateSessionToActorCommand = vscode.commands.registerCommand(
        'jarvis.migrateSessionToActor',
        async () => {
            const candidates = listOldConventionActors();
            if (candidates.length === 0) {
                vscode.window.showInformationMessage(
                    'No session-convention Actors to migrate.'
                );
                return;
            }

            const picked = await vscode.window.showQuickPick(
                candidates.map(c => ({ label: c.name, description: c.folderPath, c })),
                { placeHolder: 'Select an Actor to migrate to the new .jarvis/actors/ convention' }
            );
            if (!picked) { return; }  // user cancelled

            const { name, folderPath } = picked.c;
            const actorsDir = configPaths.ensureActorsDir();
            if (!actorsDir) {
                vscode.window.showErrorMessage('jarvis.migrateSessionToActor: no workspace open');
                return;
            }
            const targetFolder = path.join(actorsDir, name);

            // AC-5: name-collision guard — abort cleanly, touch nothing
            if (fs.existsSync(targetFolder)) {
                vscode.window.showErrorMessage(
                    `Cannot migrate "${name}": an Actor already exists at .jarvis/actors/${name}/`
                );
                return;
            }

            // AC-4(a)/(b): move folder, then rename convention file inside it
            await fs.promises.mkdir(path.dirname(targetFolder), { recursive: true });
            await fs.promises.rename(folderPath, targetFolder);
            await fs.promises.rename(
                path.join(targetFolder, 'session.yaml'),
                path.join(targetFolder, 'actor.yaml')
            );

            // AC-4(c): rescan so the tree reflects the new convention immediately
            await kindDrivenScanner.rescan();

            // AC-6: unconditional fire-and-forget notification
            appendMessage(
                resolveMessagesPath(),
                name,
                'Jarvis',
                `Your Actor has been migrated to the new storage convention.\n` +
                `New folder: .jarvis/actors/${name}/\n` +
                `context.md: .jarvis/actors/${name}/context.md`
            );
            messageProvider.reload();

            vscode.window.showInformationMessage(`Migrated "${name}" to .jarvis/actors/${name}/`);
            log.info(`[ACT] migrateSessionToActor: "${name}" moved to new convention`);
        }
    );
    context.subscriptions.push(migrateSessionToActorCommand);

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



    // Auto-delivery poll loop (SPEC_MSG_AUTODELIVER_POLL)
    const pollInterval = setInterval(async () => {
        const messagesPath = resolveMessagesPath();
        const autoDeliverySessions = readAutoDelivery(messagesPath);
        if (autoDeliverySessions.length > 0) {
            const messages = readQueue(messagesPath);
            for (const sessionName of autoDeliverySessions) {
                const pending = messages.filter(m => m.destination === sessionName && !m.notified);
                if (pending.length === 0) { continue; }

                // Snapshot focus before the disruptive delivery (SPEC_MSG_FOCUSRESTORE)
                const focus = await snapshotFocus();
                try {
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
                    let changed = false;
                    for (const m of updated) { if (m.destination === sessionName && !m.notified) { m.notified = true; changed = true; } }
                    if (changed) { writeQueue(messagesPath, updated); messageProvider.reload(); }

                    // Restore the user's prior focus immediately, no artificial
                    // delay (SPEC_MSG_FOCUSRESTORE)
                    await restoreFocus(focus);
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
        searchEntitiesCommand,
        revealInExplorerCommand,
        revealInOSCommand,
        openInTerminalCommand,
        sendMessagesCommand,
        openMessageSessionCommand,
        deleteMessageCommand,
        openHeartbeatJobCommand,
        openMessageFileCommand,
        openEntityFileCommand,
        copyPathCommand,
        copyFullPathCommand,
        copyFileNameCommand,
        copyCategoryNameCommand,
        diffTouchedFileCommand,
        removeTouchedFileCommand,
        openSessionCommand,
        openAgentSessionCommand,
        newSessionCommand,
        { dispose: () => void stopHookIntake() },
        checkForUpdatesCommand,
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
    // Stop hook intake on deactivate
    // Note: this is best-effort; the extension host may terminate before this runs
    // The actual stop is handled by the subscription disposal in activate()
}
