// Implementation: SPEC_MOD_PIM_PKG — PIM extension activation
// Requirements: REQ_MOD_ADDONS

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { JarvisCoreApi, TreeNode, LeafNode } from 'jarvis-core';
import { buildProjectKindConfig } from './projectKind';
import { buildEventKindConfig } from './eventKind';
import { TaskBadgeDecorator } from './taskBadgeDecorator';
import { TaskService } from './TaskService';
import { CategoryService } from './CategoryService';
import { CategoryTreeProvider } from './CategoryTreeProvider';
import { TaskEditorProvider } from './TaskEditorProvider';
import { OutlookCategoryProvider } from './outlookIntegration/OutlookCategoryProvider';
import { OutlookTaskProvider } from './outlookIntegration/OutlookTaskProvider';

// --- Helpers (PIM-local copies — these use only VS Code APIs) ---

function yamlString(value: string): string {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function applyTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

interface AgentModeEntry { name: string; filePath: string; }

function readFrontmatterString(content: string, key: string): string | undefined {
    if (!content.startsWith('---')) { return undefined; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return undefined; }
    const header = content.slice(3, closeIdx);
    const re = new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|(.+?))\\s*$`, 'm');
    const m = re.exec(header);
    if (!m) { return undefined; }
    return (m[1] ?? m[2] ?? m[3] ?? '').trim() || undefined;
}

function isExplicitlyExcluded(content: string, key: string): boolean {
    if (!content.startsWith('---')) { return false; }
    const closeIdx = content.indexOf('\n---', 3);
    if (closeIdx < 0) { return false; }
    const header = content.slice(3, closeIdx);
    return new RegExp(`^${key}:\\s*false\\s*$`, 'm').test(header);
}

function getAgentIdentity(content: string, filename: string): string {
    const name = readFrontmatterString(content, 'name');
    if (name) { return name; }
    return filename.endsWith('.agent.md') ? filename.slice(0, -'.agent.md'.length) : filename;
}

async function discoverAgentModes(): Promise<AgentModeEntry[]> {
    const agents: AgentModeEntry[] = [];
    for (const wsFolder of vscode.workspace.workspaceFolders ?? []) {
        const agentsDir = path.join(wsFolder.uri.fsPath, '.github', 'agents');
        let entries: fs.Dirent[];
        try { entries = await fs.promises.readdir(agentsDir, { withFileTypes: true }); } catch { continue; }
        for (const entry of entries) {
            if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.agent.md')) { continue; }
            const agentPath = path.join(agentsDir, entry.name);
            let content: string;
            try { content = await fs.promises.readFile(agentPath, 'utf8'); } catch { continue; }
            if (isExplicitlyExcluded(content, 'user-invocable')) { continue; }
            agents.push({ name: getAgentIdentity(content, entry.name), filePath: path.relative(wsFolder.uri.fsPath, agentPath) });
        }
    }
    return agents.sort((a, b) => a.name.localeCompare(b.name));
}

async function pickAgentMode(): Promise<string | undefined> {
    const agents = await discoverAgentModes();
    const items: (vscode.QuickPickItem & { mode: string })[] = [
        { label: 'No agent', detail: 'Opens a default chat — pick mode via the chat dropdown', mode: '' },
        ...agents.map(a => ({ label: a.name, description: a.filePath, mode: a.name })),
    ];
    const pick = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select the agent for this entity (Escape = cancel)',
        matchOnDescription: true,
    });
    return pick === undefined ? undefined : pick.mode;
}

async function openChatForEntity(name: string, kind: string, folder: string, agent: string | undefined): Promise<void> {
    if (agent) {
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', { mode: agent });
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch { /* ignore */ }
    }
    await vscode.commands.executeCommand('workbench.action.openChat');
    await new Promise(resolve => setTimeout(resolve, 800));
    await vscode.commands.executeCommand('workbench.action.chat.open', { query: `/rename ${name}` });
    await new Promise(resolve => setTimeout(resolve, 800));
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
    const rawTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('agentSession.initPromptTemplate') ?? '';
    const initTemplate = rawTemplate.trim() ? rawTemplate : defaultInitPrompt;
    const initPrompt = applyTemplate(initTemplate, { kind, name, contextPath });
    await vscode.commands.executeCommand('workbench.action.chat.open', { query: initPrompt });
}

// --- Activation -----------------------------------------------------------------

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis PIM', { log: true });
    context.subscriptions.push(log);

    // Acquire the core engine API
    const coreExt = vscode.extensions.getExtension('enthali.jarvis-core');
    const rawApi = coreExt?.exports as JarvisCoreApi | undefined;
    if (!rawApi || rawApi.version !== 1) {
        log.error('[PIM] Jarvis core API not available or version mismatch — PIM will not activate.');
        return;
    }
    const api: JarvisCoreApi = rawApi;

    // --- TaskService + Outlook integration ---
    const taskService = new TaskService();
    const categoryService = new CategoryService(log);
    const categoryTreeProvider = new CategoryTreeProvider(categoryService);

    const outlookEnabled = vscode.workspace.getConfiguration('jarvis').get<boolean>('outlook.enabled', false);
    if (outlookEnabled) {
        categoryService.addProvider(new OutlookCategoryProvider(log));
        try {
            if (vscode.workspace.getConfiguration('jarvis').get('outlook.tasks.enabled') === true) {
                taskService.addProvider(new OutlookTaskProvider(log));
                log.info('[PIM] OutlookTaskProvider registered');
            }
        } catch (err) {
            log.warn(`[PIM] Failed to initialize task providers: ${err}`);
        }
    }

    // --- Register entity kinds ---
    context.subscriptions.push(api.registerEntityKind(buildProjectKindConfig(taskService)));
    context.subscriptions.push(api.registerEntityKind(buildEventKindConfig(taskService)));

    // --- Register task badge decorator on both kinds ---
    const scanner = { getEntity: (id: string) => {
        // Delegate entity resolution to the engine's internal scanner via the provider
        const provider = api.getTreeDataProvider('project') as any;
        return provider?._scanner?.getEntity?.(id);
    }};
    const taskBadge = new TaskBadgeDecorator(taskService, scanner);
    context.subscriptions.push(api.registerDecorator('project', taskBadge));
    context.subscriptions.push(api.registerDecorator('event', taskBadge));

    // --- Create tree views ---
    const projectProvider = api.getTreeDataProvider('project');
    const eventProvider = api.getTreeDataProvider('event');

    if (projectProvider) {
        const projectView = vscode.window.createTreeView('jarvisProjects', { treeDataProvider: projectProvider });
        context.subscriptions.push(projectView);
    }
    if (eventProvider) {
        const eventView = vscode.window.createTreeView('jarvisEvents', { treeDataProvider: eventProvider });
        context.subscriptions.push(eventView);
    }

    // --- Categories tree view (PIM-owned, NOT engine-driven) ---
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('jarvisCategories', categoryTreeProvider)
    );

    // --- Task editor ---
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'jarvis.taskEditor',
            new TaskEditorProvider(taskService, categoryService, log),
            { supportsMultipleEditorsPerDocument: false }
        )
    );

    // --- PIM commands ---

    // New Project
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.newProject', async () => {
        const projectsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('projects.folder', '');
        if (!projectsFolder) {
            vscode.window.showWarningMessage('Jarvis: jarvis.projects.folder is not configured');
            return;
        }
        const input = await vscode.window.showInputBox({
            prompt: 'Project name', placeHolder: 'My Project',
            validateInput: v => {
                if (/[<>:"\/\\|?*\x00-\x1f]/.test(v)) { return 'Name contains characters not allowed in folder names'; }
                if (!v.trim()) { return 'Name must not be empty'; }
                return undefined;
            },
        });
        if (!input) { return; }
        const agentInput = await pickAgentMode();
        if (agentInput === undefined) { return; }
        const targetPath = path.join(projectsFolder, input);
        if (fs.existsSync(targetPath)) {
            vscode.window.showErrorMessage(`Folder '${input}' already exists in projects folder`);
            return;
        }
        await fs.promises.mkdir(targetPath);
        const yamlLines = [`name: ${yamlString(input)}`, `agent: ${yamlString(agentInput)}`, ''];
        await fs.promises.writeFile(path.join(targetPath, 'project.yaml'), yamlLines.join('\n'), 'utf-8');
        try {
            if (outlookEnabled && categoryService.hasProviders()) {
                await categoryService.setCategory(input, 0);
                log.info(`[PIM] Outlook category created: "${input}"`);
            }
        } catch (err) { log.warn(`[PIM] Failed to create Outlook category: ${err}`); }
        await vscode.commands.executeCommand('jarvis.rescan');
        await openChatForEntity(input, 'project', targetPath, agentInput);
    }));

    // New Event
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.newEvent', async () => {
        const eventsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('events.folder', '');
        if (!eventsFolder) {
            vscode.window.showWarningMessage('Jarvis: jarvis.events.folder is not configured');
            return;
        }
        const nameInput = await vscode.window.showInputBox({
            prompt: 'Event name', placeHolder: 'My Event',
            validateInput: v => {
                if (/[<>:"\/\\|?*\x00-\x1f]/.test(v)) { return 'Name contains characters not allowed in folder names'; }
                if (!v.trim()) { return 'Name must not be empty'; }
                return undefined;
            },
        });
        if (!nameInput) { return; }
        const dateInput = await vscode.window.showInputBox({
            prompt: 'Start date (YYYY-MM-DD)', placeHolder: '2026-01-15',
            validateInput: v => {
                if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { return 'Date must be in YYYY-MM-DD format'; }
                const [y, m, d] = v.split('-').map(Number);
                const date = new Date(y, m - 1, d);
                if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) { return 'Not a valid calendar date'; }
                return undefined;
            },
        });
        if (!dateInput) { return; }
        const agentInput = await pickAgentMode();
        if (agentInput === undefined) { return; }
        const folderName = `${dateInput}_${nameInput}`;
        const targetPath = path.join(eventsFolder, folderName);
        if (fs.existsSync(targetPath)) {
            vscode.window.showErrorMessage(`Folder '${folderName}' already exists in events folder`);
            return;
        }
        await fs.promises.mkdir(targetPath);
        const content = [`name: ${yamlString(nameInput)}`, `agent: ${yamlString(agentInput)}`, `dates:`, `  start: "${dateInput}"`, `  end: "${dateInput}"`, ''].join('\n');
        await fs.promises.writeFile(path.join(targetPath, 'event.yaml'), content, 'utf-8');
        try {
            if (outlookEnabled && categoryService.hasProviders()) {
                await categoryService.setCategory(nameInput, 0);
                log.info(`[PIM] Outlook category created: "${nameInput}"`);
            }
        } catch (err) { log.warn(`[PIM] Failed to create Outlook category: ${err}`); }
        await vscode.commands.executeCommand('jarvis.rescan');
        await openChatForEntity(nameInput, 'event', targetPath, agentInput);
    }));

    // Refresh Categories
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.refreshCategories', async () => {
        await categoryTreeProvider.refresh();
        log.info('[PIM] manual categories refresh triggered');
    }));

    // Rename Category
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.renameCategory',
        async (node: { name: string; source: string; id?: string }) => {
            const newName = await vscode.window.showInputBox({
                prompt: 'New category name', value: node.name,
                validateInput: v => v?.trim() ? null : 'Name cannot be empty'
            });
            if (newName && newName !== node.name) {
                await categoryService.renameCategory(node.name, newName, node.source, node.id);
                categoryTreeProvider.refresh();
            }
        }
    ));

    // Delete Category
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.deleteCategory',
        async (node: { name: string; source: string; id?: string }) => {
            const confirm = await vscode.window.showWarningMessage(
                `Delete category "${node.name}"?`, { modal: true }, 'Delete'
            );
            if (confirm === 'Delete') {
                await categoryService.deleteCategory(node.name, node.source, node.id);
                categoryTreeProvider.refresh();
            }
        }
    ));

    // Refresh Tasks
    context.subscriptions.push(vscode.commands.registerCommand('jarvis.refreshTasks', async () => {
        try {
            await taskService.refresh();
            api.refreshKind('project');
            api.refreshKind('event');
            log.info('[PIM] manual task refresh triggered');
        } catch (err) {
            log.warn(`[PIM] refresh failed: ${err}`);
        }
    }));

    // --- PIM LM tools (registered via engine API, renamed with _pim_ infix) ---

    // Helper: collect leaves from a tree
    function collectLeaves(nodes: TreeNode[]): LeafNode[] {
        const result: LeafNode[] = [];
        for (const node of nodes) {
            if (node.kind === 'leaf') { result.push(node); }
            else { result.push(...collectLeaves(node.children)); }
        }
        return result;
    }

    // Helper: create project entity
    async function createProjectEntity(args: { name: string; summary?: string; agent?: string }): Promise<{ created: boolean; reason?: string; path?: string }> {
        const { name, summary, agent } = args;
        if (!name) { throw new Error('invalid project name: name must not be empty'); }
        if (/[/\\:*?"<>|]/.test(name)) { throw new Error('invalid project name: contains forbidden character'); }
        if (/[\x00-\x1F]/.test(name)) { throw new Error('invalid project name: contains control character'); }
        if (name === '.' || name === '..') { throw new Error('invalid project name: must not be "." or ".."'); }
        if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(name)) { throw new Error('invalid project name: reserved device name'); }

        if (agent) {
            const available = await discoverAgentModes();
            if (!available.map(a => a.name).includes(agent)) {
                throw new Error(`Agent "${agent}" is not available.\nAvailable agents: ${available.map(a => a.name).sort().join(', ') || '(none)'}`);
            }
        }

        const projectsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('projects.folder', '');
        if (!projectsFolder) { throw new Error('jarvis_pim_createProject: projects.folder not configured'); }

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

        try {
            if (outlookEnabled && categoryService.hasProviders()) {
                await categoryService.setCategory(name, 0);
            }
        } catch (err) { log.warn(`[PIM] Failed to create Outlook category: ${err}`); }

        await api.rescan();
        log.info(`[PIM] createProject: created "${name}" at ${targetPath}`);
        return { created: true, path: path.relative(projectsFolder, targetPath).replace(/\\/g, '/') };
    }

    // Helper: create event entity
    async function createEventEntity(args: { name: string; startDate: string; endDate?: string; summary?: string; agent?: string }): Promise<{ created: boolean; reason?: string; path?: string }> {
        const { name, startDate, summary, agent } = args;
        const endDate = args.endDate || startDate;

        if (!name) { throw new Error('invalid event name: name must not be empty'); }
        if (/[/\\:*?"<>|]/.test(name)) { throw new Error('invalid event name: contains forbidden character'); }
        if (/[\x00-\x1F]/.test(name)) { throw new Error('invalid event name: contains control character'); }
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
            if (!available.map(a => a.name).includes(agent)) {
                throw new Error(`Agent "${agent}" is not available.\nAvailable agents: ${available.map(a => a.name).sort().join(', ') || '(none)'}`);
            }
        }

        const eventsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('events.folder', '');
        if (!eventsFolder) { throw new Error('jarvis_pim_createEvent: events.folder not configured'); }

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

        try {
            if (outlookEnabled && categoryService.hasProviders()) {
                await categoryService.setCategory(name, 0);
            }
        } catch (err) { log.warn(`[PIM] Failed to create Outlook category: ${err}`); }

        await api.rescan();
        log.info(`[PIM] createEvent: created "${name}" at ${targetPath}`);
        return { created: true, path: folderName };
    }

    // Tool: jarvis_pim_listProjects
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_listProjects',
        'Returns the list of projects configured in the current Jarvis workspace. Each project has a name, summary, agent, and folder path.',
        async (_options, _token) => {
            const projectsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('projects.folder', '');
            const leaves = collectLeaves(api.getTreeForKind('project'));
            const projects = leaves.map(leaf => {
                const entity = api.getEntity(leaf.id);
                const absDir = path.dirname(leaf.id);
                const rel = projectsFolder ? path.relative(projectsFolder, absDir) : absDir;
                return {
                    name: entity?.name ?? path.basename(absDir),
                    summary: entity?.summary ?? '',
                    agent: entity?.agent ?? '',
                    folder: rel.replace(/\\/g, '/'),
                };
            });
            log.info(`[PIM] listProjects: ${projects.length} project(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(projects))
            ]);
        }
    ));

    // Tool: jarvis_pim_listEvents
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_listEvents',
        'Returns the list of events with name, summary, dates, agent, and folder path.',
        async (_options, _token) => {
            const eventsFolder = vscode.workspace.getConfiguration('jarvis').get<string>('events.folder', '');
            const leaves = collectLeaves(api.getTreeForKind('event'));
            const events = leaves.map(leaf => {
                const entity = api.getEntity(leaf.id);
                const absDir = path.dirname(leaf.id);
                const rel = eventsFolder ? path.relative(eventsFolder, absDir) : absDir;
                return {
                    name: entity?.name ?? path.basename(absDir),
                    summary: entity?.summary ?? '',
                    agent: entity?.agent ?? '',
                    datesStart: entity?.datesStart ?? '',
                    datesEnd: entity?.datesEnd ?? '',
                    folder: rel.replace(/\\/g, '/'),
                };
            });
            log.info(`[PIM] listEvents: ${events.length} event(s)`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(events))
            ]);
        }
    ));

    // Tool: jarvis_pim_createProject
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_createProject',
        'Creates a new project folder with project.yaml and context.md. Idempotent: returns success if project already exists.',
        async (options, _token) => {
            const input = options.input as { name: string; summary?: string; agent?: string };
            const result = await createProjectEntity(input);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        }
    ));

    // Tool: jarvis_pim_createEvent
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_createEvent',
        'Creates a new event folder with event.yaml and context.md. Folder name: ${startDate}_${name}. Idempotent.',
        async (options, _token) => {
            const input = options.input as { name: string; startDate: string; endDate?: string; summary?: string; agent?: string };
            const result = await createEventEntity(input);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        }
    ));

    // Tool: jarvis_pim_category
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_category',
        'Manage categories: get, set, delete, or rename.',
        async (options, _token) => {
            if (!categoryService.hasProviders()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No category providers configured. Enable a PIM provider (e.g. jarvis.outlookEnabled).')
                ]);
            }
            const { action, name, filter, provider, oldName, newName } = options.input as {
                action: string; name?: string; filter?: string; provider?: string; oldName?: string; newName?: string;
            };
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
        }
    ));

    // Tool: jarvis_pim_task
    context.subscriptions.push(api.registerTool(
        'jarvis_pim_task',
        'Manage tasks: get, set, modify, or delete. Tasks are linked to projects/events via their categories field.',
        async (options, _token) => {
            if (!taskService.hasProviders()) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('No task providers configured. Enable jarvis.outlookEnabled and jarvis.outlook.tasks.enabled.')
                ]);
            }
            const input = options.input as {
                action: string; category?: string; status?: string; dueBefore?: string;
                includeBody?: boolean; id?: string; subject?: string; body?: string;
                dueDate?: string; priority?: string; isComplete?: boolean; categories?: string[];
                provider?: string; completedDate?: string;
            };
            if (input.completedDate !== undefined) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('completedDate is read-only and cannot be set directly.')
                ]);
            }
            let result: object;
            switch (input.action) {
                case 'get': {
                    const tasks = await taskService.getTasks({
                        category: input.category, status: input.status, dueBefore: input.dueBefore
                    });
                    const mapped = input.includeBody ? tasks : tasks.map(({ body: _b, ...t }) => t);
                    result = { tasks: mapped };
                    break;
                }
                case 'set': {
                    const newTask = await taskService.setTask(input as any, input.provider);
                    api.refreshKind('project');
                    api.refreshKind('event');
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
                    api.refreshKind('project');
                    api.refreshKind('event');
                    result = { status: 'ok', id: input.id };
                    break;
                }
                case 'delete': {
                    if (!input.id) { throw new Error('id required for delete'); }
                    await taskService.deleteTask(input.id, input.provider);
                    api.refreshKind('project');
                    api.refreshKind('event');
                    result = { status: 'ok', id: input.id };
                    break;
                }
                default:
                    throw new Error(`Unknown action: ${input.action}`);
            }
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        }
    ));

    log.info('[PIM] activated — project + event kinds + 6 tools registered');
}

export function deactivate(): void {
    // All disposables pushed to context.subscriptions are cleaned up automatically
}
