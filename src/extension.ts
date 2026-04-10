// Implementation: SPEC_EXP_EXTENSION, SPEC_EXP_FILTERCOMMAND, SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_OPENYAML_CMD, SPEC_AUT_MANUALCOMMAND, SPEC_MSG_SENDCOMMAND, SPEC_MSG_OPENSESSION, SPEC_MSG_LISTSESSIONS, SPEC_EXP_AGENTSESSION, SPEC_EXP_NEWPROJECT_CMD, SPEC_EXP_NEWEVENT_CMD, SPEC_REL_UPDATECOMMAND
// Requirements: REQ_EXP_ACTIVITYBAR, REQ_EXP_TREEVIEW, REQ_EXP_REACTIVECACHE, REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL, REQ_EXP_PROJECTFILTER, REQ_EXP_FILTERPERSIST, REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST, REQ_EXP_OPENYAML, REQ_AUT_MANUALRUN, REQ_MSG_SEND, REQ_MSG_DELETE, REQ_MSG_OPENSESSION, REQ_MSG_SESSIONFILTER, REQ_MSG_LISTSESSIONS, REQ_EXP_AGENTSESSION, REQ_EXP_NEWPROJECT, REQ_EXP_NEWEVENT, REQ_REL_UPDATECOMMAND, REQ_CFG_UPDATECHECK

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProjectTreeProvider } from './projectTreeProvider';
import { EventTreeProvider } from './eventTreeProvider';
import { MessageTreeProvider, SessionGroupNode, MessageLeafNode } from './messageTreeProvider';
import { YamlScanner, LeafNode, TreeNode } from './yamlScanner';
import { activateHeartbeat } from './heartbeat';
import { deleteMessage, deleteByDestination, appendMessage } from './messageQueue';
import { lookupSessionUUID, getAllSessions, initSessionLookup, filterNamedSessions } from './sessionLookup';
import { checkForUpdates } from './updateCheck';

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

    const scanner = new YamlScanner(() => {
        projectProvider.refresh();
        eventProvider.refresh();
    });

    const projectProvider = new ProjectTreeProvider(scanner);
    const eventProvider = new EventTreeProvider(scanner);

    // Message queue path resolution (SPEC_CFG_HEARTBEATSETTINGS)
    function resolveMessagesPath(): string {
        const override = vscode.workspace
            .getConfiguration('jarvis')
            .get<string>('messagesFile', '');
        if (override) { return override; }
        return vscode.Uri.joinPath(context.storageUri!, 'messages.json').fsPath;
    }

    const messageProvider = new MessageTreeProvider(() => resolveMessagesPath());

    function startScanner(): void {
        const config = vscode.workspace.getConfiguration('jarvis');
        const projectsFolder = config.get<string>('projectsFolder', '');
        const eventsFolder = config.get<string>('eventsFolder', '');
        const scanInterval = config.get<number>('scanInterval', 120);
        scanner.start(projectsFolder, eventsFolder, scanInterval);
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

    // Activate heartbeat scheduler (SPEC_AUT_SCHEDULERLOOP, SPEC_CFG_HEARTBEATSETTINGS)
    activateHeartbeat(context, messageProvider, resolveMessagesPath);

    // Automatic update check (SPEC_REL_UPDATECOMMAND, SPEC_CFG_UPDATECHECK)
    const autoCheck = vscode.workspace
        .getConfiguration('jarvis')
        .get<boolean>('checkForUpdates', true);
    if (autoCheck) {
        checkForUpdates(context, true);
    }

    // Manual update check command (SPEC_REL_UPDATECOMMAND)
    const checkForUpdatesCommand = vscode.commands.registerCommand(
        'jarvis.checkForUpdates',
        () => checkForUpdates(context, false)
    );

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

    // Register send messages command (SPEC_MSG_SENDCOMMAND)
    const sendMessagesCommand = vscode.commands.registerCommand(
        'jarvis.sendMessages',
        async (node?: SessionGroupNode) => {
            if (!node) {
                vscode.window.showWarningMessage('Jarvis: Use the play button on a session group in the Messages tree.');
                return;
            }
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

            // 3. Submit each message with preamble
            for (const child of node.children) {
                const preamble = `[Jarvis Message Service — from: ${child.sender}, to: ${node.destination}]\n\n`;
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open',
                    { query: preamble + child.text }
                );
                // Wait between messages to avoid race conditions
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            // 4. Remove delivered messages from queue
            deleteByDestination(resolveMessagesPath(), node.destination);

            // 5. Refresh tree
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
            deleteMessage(resolveMessagesPath(), node.index);
            messageProvider.reload();
        }
    );

    // Register LM tool: sendToSession (allows LLMs to queue messages to other sessions)
    const sendToSessionTool = vscode.lm.registerTool('jarvis_sendToSession', {
        async invoke(options: vscode.LanguageModelToolInvocationOptions<{ session: string; senderSession?: string; text: string }>, _token: vscode.CancellationToken) {
            const { session, text } = options.input;
            // Auto-detect sender from active chat tab label
            const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
            const sender = activeTab?.label || options.input.senderSession || 'unknown';
            appendMessage(resolveMessagesPath(), session, sender, text);
            messageProvider.reload();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Message queued for destination "${session}" from "${sender}"`)
            ]);
        }
    });

    // Register LM tool: listSessions (SPEC_MSG_LISTSESSIONS)
    // Requirements: REQ_MSG_LISTSESSIONS, REQ_MSG_SESSIONFILTER
    const listSessionsTool = vscode.lm.registerTool('jarvis_listSessions', {
        async invoke(
            _options: vscode.LanguageModelToolInvocationOptions<Record<string, never>>,
            _token: vscode.CancellationToken
        ) {
            const sessions = await getAllSessions();
            const named = filterNamedSessions(sessions)
                .map(s => s.title);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(named))
            ]);
        }
    });

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

            await scanner.rescan();

            const leafNode = findLeafNode(scanner.getEventTree(), targetPath);
            if (leafNode) {
                await vscode.commands.executeCommand(
                    'jarvis.openAgentSession', leafNode);
            }
        }
    );

    context.subscriptions.push(
        filterCommand,
        filterCommandActive,
        eventFilterCommand,
        eventFilterCommandActive,
        openYamlCommand,
        sendMessagesCommand,
        deleteMessageCommand,
        openSessionCommand,
        openAgentSessionCommand,
        newProjectCommand,
        newEventCommand,
        checkForUpdatesCommand,
        sendToSessionTool,
        listSessionsTool,
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
            if (e.affectsConfiguration('jarvis')) {
                startScanner();
            }
        }),
        { dispose: () => scanner.stop() }
    );
}

export function deactivate() {}
