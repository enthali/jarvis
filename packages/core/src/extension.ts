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
import { lookupSessionUUID, getAllSessions, initSessionLookup, setSessionLookupLogger, filterNamedSessions, getValidDestinations } from './engine/sessions/sessionLookup';
import { discoverAgentModes } from './engine/sessions/agentDiscovery';
import { checkForUpdates } from './engine/core/updateCheck';
import { HookEngine } from './engine/hooks/hookEngine';
import { HookIntake } from './engine/hooks/hookIntake';
import { installHookConfig, uninstallHookConfig, getHooksDir } from './engine/hooks/hookConfig';

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
    async function openAtDocs(uri: vscode.Uri): Promise<void> {
        const existing = findFileTab(uri.fsPath);
        const viewColumn = existing ? existing.group.viewColumn : DOCS_COLUMN;
        await vscode.commands.executeCommand('vscode.open', uri, {
            preview: false,
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

    // --- Auto-Delivery Active-Use Opt-Out Check (SPEC_MSG_AUTODELIVERY_OPTOUT) ---
    // No new persisted state — reuses vscode.window.tabGroups already read by
    // the placement helpers above. Only called from the poll loop's tick logic
    // — does not affect jarvis.sendMessages (manual delivery).
    function isSessionActiveTab(sessionName: string): boolean {
        const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
        return activeTab?.label === sessionName;
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

        // project-actor-click-placement-fix CR: guarantee Main placement
        // even for a freshly created session (REQ_ENT_AGENTSESSION AC-7,
        // REQ_MSG_EDITORPLACEMENT AC-12/AC-13). The rename above has
        // already completed, so the session is now resolvable by name —
        // reuse the exact same close+reopen mechanism as the
        // existing-session branch instead of trying to influence which
        // column the chat editor was born in (VS Code exposes no API
        // for that — see SPEC_MSG_OPENCHAT).
        const newUuid = await lookupSessionUUID(name);
        if (newUuid) {
            const newB64 = Buffer.from(newUuid).toString('base64');
            const newUri = vscode.Uri.parse(
                `vscode-chat-session://local/${newB64}`
            );
            await openAtMain(newUri, name);  // SPEC_MSG_EDITORPLACEMENT
        }
        // Silent no-op if newUuid is still unresolved (rare rename-
        // propagation edge case, REQ_MSG_EDITORPLACEMENT AC-13) — the
        // session is still fully usable, just not repositioned.
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
    context.subscriptions.push(entitiesView, unifiedProvider);

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
                const entityForSend = kindDrivenScanner.entities.find(e => e.name === node.destination);
                const b64 = Buffer.from(uuid).toString('base64');
                const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                // Main placement: close+reopen at column 1 if open elsewhere
                // (SPEC_MSG_EDITORPLACEMENT, REQ_MSG_SEND AC-9)
                await openAtMain(uri, node.destination);
                // agent-mode-persistence: VS Code drops the custom agent mode
                // on window reload; re-apply it to the focused editor.
                if (entityForSend?.agent) {
                    await reapplyAgentMode(entityForSend.agent, node.destination);
                }
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
                `Read them with the enthali.jarvis-core/receiveMessage tool (destination: "\${destination}") until remaining = 0.`;
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

            const uuid = await lookupSessionUUID(entity.name);

            if (uuid) {
                // Open existing session, always at Main (column 1) — close+reopen
                // if currently open elsewhere (SPEC_MSG_EDITORPLACEMENT)
                const b64 = Buffer.from(uuid).toString('base64');
                const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                await openAtMain(uri, entity.name);
            } else {
                const kind = entity.kind ?? 'session';
                const folder = entity.folder ?? path.dirname(element.id);
                await openChatForEntity(entity.name, kind, folder, entity.agent);
            }
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
        async (node: FileNode) => {
            const uri = vscode.Uri.file(node.filePath);
            try {
                await vscode.workspace.openTextDocument(uri); // validates existence first
                if (path.basename(node.filePath) === 'context.md') {
                    // ui-improvements CR: render context.md as Markdown preview
                    // instead of the raw text editor. Exact-basename check, NOT
                    // an extension check — the agent-file child is also .md
                    // (*.agent.md) and must continue to open as raw text.
                    // MECE finding fix: pass DOCS_COLUMN explicitly so the
                    // preview still honors the Docs (column 2) placement
                    // guarantee (REQ_MSG_EDITORPLACEMENT AC-2) on first open;
                    // markdown.showPreview's own built-in behavior reuses an
                    // already-open preview tab for the same file on subsequent
                    // invocations (VS Code framework behavior, not custom logic).
                    await vscode.commands.executeCommand('markdown.showPreview', uri, DOCS_COLUMN);
                } else {
                    // Docs placement: fixed column 2, focus-in-place if already open
                    // elsewhere (SPEC_MSG_EDITORPLACEMENT)
                    await openAtDocs(uri);
                }
            } catch {
                vscode.window.showWarningMessage(`Jarvis: Cannot open file: ${node.filePath}`);
            }
        }
    );

    // Copy Path / Copy Full Path (SPEC_ENT_ENTITY_CONTEXTMENU) — shared path
    // resolution helper for file-child nodes and entity root nodes.
    function resolveCopyPaths(node: FileNode | LeafNode): { folder: string; full: string } {
        if (node.kind === 'file') {
            return { folder: path.dirname(node.filePath), full: node.filePath };
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
        async (node: FileNode | LeafNode) => {
            const { folder } = resolveCopyPaths(node);
            await vscode.env.clipboard.writeText(folder);
        }
    );

    const copyFullPathCommand = vscode.commands.registerCommand(
        'jarvis.copyFullPath',
        async (node: FileNode | LeafNode) => {
            const { full } = resolveCopyPaths(node);
            await vscode.env.clipboard.writeText(full);
        }
    );

    // Copy File Name (file-child nodes only, SPEC_ENT_ENTITY_CONTEXTMENU, ui-improvements CR)
    const copyFileNameCommand = vscode.commands.registerCommand(
        'jarvis.copyFileName',
        async (node: FileNode) => {
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
    }

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
            await openChatForEntity(nameInput, 'session', targetPath, agentInput);
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
                if (isSessionActiveTab(sessionName)) { continue; } // SPEC_MSG_AUTODELIVERY_OPTOUT

                // Snapshot focus before the disruptive delivery (SPEC_MSG_FOCUSRESTORE)
                const focus = await snapshotFocus();
                try {
                    const uuid = await lookupSessionUUID(sessionName);
                    if (uuid) {
                        const entityForPoll = kindDrivenScanner.entities.find(e => e.name === sessionName);
                        // Open at Secondary placement — focus-in-place if already
                        // open anywhere, else the last existing column (SPEC_MSG_EDITORPLACEMENT)
                        const b64 = Buffer.from(uuid).toString('base64');
                        const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);
                        await openAtSecondary(uri, sessionName);
                        // agent-mode-persistence: re-apply custom agent mode
                        // dropped by VS Code on window reload.
                        if (entityForPoll?.agent) {
                            await reapplyAgentMode(entityForPoll.agent, sessionName);
                        }
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
                    const defaultNotifTemplate = `[Jarvis Message Service] You have \${count} new message(s) in your inbox.\nRead them with the jarvis_receiveMessage tool (destination: "\${destination}") until remaining = 0.`;
                    const rawNotifTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('messages.notificationTemplate') ?? '';
                    const notifTemplate = rawNotifTemplate.trim() ? rawNotifTemplate : defaultNotifTemplate;
                    const stub = applyTemplate(notifTemplate, { count: String(count), destination: sessionName });
                    await vscode.commands.executeCommand('workbench.action.chat.open', { query: stub });
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
        openSessionCommand,
        openAgentSessionCommand,
        newSessionCommand,
        { dispose: () => void stopHookIntake() },
        checkForUpdatesCommand,
        sendToSessionTool,
        readMessageTool,
        listActorsTool,
        ...(createActorTool ? [createActorTool] : []),
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
