// Implementation: SPEC_KAN_MODULE, SPEC_KAN_DISCOVER, SPEC_KAN_CREATE, SPEC_KAN_VERIFY, SPEC_KAN_OPEN, SPEC_KAN_UX, SPEC_KAN_UPDATE
// Requirements: REQ_KAN_MODULE, REQ_KAN_DISCOVER, REQ_KAN_CREATE, REQ_KAN_VERIFY, REQ_KAN_OPEN, REQ_KAN_UX, REQ_KAN_UPDATE

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import type { JarvisCoreApi } from 'jarvis-core';
import { openKanbanPanel, refreshKanbanPanel } from './kanbanPanel';
import { KanbanEditorProvider } from './kanbanEditorProvider';

// ── Board index ────────────────────────────────────────────────────────

interface BoardEntry {
    owner: string;
    folder: string;
    files: string[];
}

/** In-memory index of discovered kanban boards. */
const boardIndex = new Map<string, BoardEntry>();

/** Scan a single entity folder for kanban board files. */
function scanEntityFolder(folder: string): string[] {
    try {
        const entries = fs.readdirSync(folder);
        return entries.filter(e => e === 'kanban.yaml' || e.endsWith('.kanban.yaml'));
    } catch {
        return [];
    }
}

/** Rebuild the board index from all entities across all kinds. */
function rebuildIndex(api: JarvisCoreApi): void {
    boardIndex.clear();
    const sessions = api.listJarvisSessions();
    for (const session of sessions) {
        if (!session.folder) { continue; }
        const files = scanEntityFolder(session.folder);
        if (files.length > 0) {
            boardIndex.set(session.name, { owner: session.name, folder: session.folder, files });
        }
    }
}

// ── Owner resolution ───────────────────────────────────────────────────

interface ResolvedOwner {
    name: string;
    folder: string;
}

function resolveOwnerByName(name: string, api: JarvisCoreApi): ResolvedOwner | undefined {
    const sessions = api.listJarvisSessions();
    const match = sessions.find(s => s.name === name);
    if (match?.folder) {
        return { name: match.name, folder: match.folder };
    }
    return undefined;
}

async function resolveOwner(
    ownerName: string | undefined,
    api: JarvisCoreApi,
    token: vscode.CancellationToken
): Promise<ResolvedOwner | { error: string }> {
    if (ownerName) {
        const owner = resolveOwnerByName(ownerName, api);
        if (!owner) { return { error: 'actor unknown' }; }
        return owner;
    }
    // Invoke jarvis_whoAmI to resolve the calling actor
    try {
        const result = await api.invokeTool(
            'jarvis_whoAmI',
            { input: {}, toolInvocationToken: undefined } as unknown as vscode.LanguageModelToolInvocationOptions<unknown>,
            token
        );
        // Parse the result — whoAmI returns JSON with name + contextPath
        const text = (result as { content: Array<{ value: string }> }).content
            ?.map(part => (part as { value: string }).value)
            .join('') ?? '';
        const parsed = JSON.parse(text);
        if (parsed.error) { return { error: parsed.error }; }
        const name = parsed.name as string;
        const owner = resolveOwnerByName(name, api);
        if (!owner) { return { error: `actor "${name}" resolved but folder not found` }; }
        return owner;
    } catch (e) {
        return { error: `whoAmI resolution failed: ${e}` };
    }
}

function resolveBoardPath(folder: string, boardName: string | undefined): string {
    if (!boardName) { return path.join(folder, 'kanban.yaml'); }
    // Accept full filenames — strip known suffixes so both "sprint" and "sprint.kanban.yaml" resolve correctly
    let stem = boardName;
    if (stem.endsWith('.kanban.yaml')) { stem = stem.slice(0, -'.kanban.yaml'.length); }
    else if (stem.endsWith('.yaml')) { stem = stem.slice(0, -'.yaml'.length); }
    // "kanban" (or empty) maps to the default board
    if (!stem || stem === 'kanban') { return path.join(folder, 'kanban.yaml'); }
    return path.join(folder, `${stem}.kanban.yaml`);
}

// ── Skeleton board template ────────────────────────────────────────────

function skeletonYaml(title: string): string {
    return `title: ${title}
nextId: 1
fields:
  - name: status
    type: single_select
    options:
      - name: Backlog
      - name: In Progress
      - name: Done
  - name: priority
    type: single_select
    options:
      - name: Low
      - name: Medium
      - name: High
items: []
`;
}

// ── JSON Schema validation ─────────────────────────────────────────────

// Load the schema once at activation, resolved from extension package
let kanbanSchema: object | undefined;
let extensionUri: vscode.Uri | undefined;

function loadSchema(): object | { error: string } {
    if (kanbanSchema) { return kanbanSchema; }
    if (!extensionUri) { return { error: 'Extension URI not initialized' }; }
    const schemaUri = vscode.Uri.joinPath(extensionUri, 'schemas', 'kanban.schema.json');
    try {
        kanbanSchema = JSON.parse(fs.readFileSync(schemaUri.fsPath, 'utf-8'));
        return kanbanSchema!;
    } catch {
        return { error: 'Schema file not found in extension package' };
    }
}

interface ValidationFinding {
    field: string;
    message: string;
    item?: string;
}

interface ValidationResult {
    board: string;
    errors: ValidationFinding[];
    warnings: ValidationFinding[];
}

function semanticValidate(data: {
    title: string;
    fields: Array<{ name: string; type: string; options: Array<{ name: string }> }>;
    items: Array<Record<string, unknown>>;
}, boardPath: string): ValidationResult {
    const errors: ValidationFinding[] = [];
    const warnings: ValidationFinding[] = [];

    // Check exactly one status field
    const statusFields = data.fields.filter(f => f.name === 'status');
    if (statusFields.length === 0) {
        errors.push({ field: 'fields', message: "No field named 'status' found. Exactly one is required." });
    } else if (statusFields.length > 1) {
        errors.push({ field: 'fields', message: `Found ${statusFields.length} fields named 'status'. Exactly one is required.` });
    }

    // Build field option maps
    const fieldMap = new Map<string, Set<string>>();
    for (const field of data.fields) {
        fieldMap.set(field.name, new Set(field.options.map(o => o.name)));
    }

    const statusOptions = fieldMap.get('status');

    // Validate each item
    for (const item of data.items) {
        const itemName = (item.name as string) ?? '<unnamed>';

        // Check status value
        if (statusOptions && typeof item.status === 'string') {
            if (!statusOptions.has(item.status)) {
                errors.push({
                    field: 'status',
                    message: `Value "${item.status}" is not a defined status option.`,
                    item: itemName,
                });
            }
        }

        // Check additional properties against defined fields
        const knownKeys = new Set(['id', 'name', 'status', 'labels', 'notes']);
        for (const [key, value] of Object.entries(item)) {
            if (knownKeys.has(key)) { continue; }
            const fieldOpts = fieldMap.get(key);
            if (!fieldOpts) {
                warnings.push({
                    field: key,
                    message: `Unknown field "${key}" — not defined in fields[].`,
                    item: itemName,
                });
            } else if (typeof value === 'string' && !fieldOpts.has(value)) {
                errors.push({
                    field: key,
                    message: `Value "${value}" is not a defined option for field "${key}".`,
                    item: itemName,
                });
            }
        }
    }

    return { board: boardPath, errors, warnings };
}

// ── Activation ─────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    const log = vscode.window.createOutputChannel('Jarvis Kanban', { log: true });
    context.subscriptions.push(log);

    // Store extensionUri for schema resolution (SPEC_KAN_MODULE AC-8)
    extensionUri = context.extensionUri;

    // Core API guard (same pattern as flow/pim)
    const coreExt = vscode.extensions.getExtension('enthali.jarvis-core');
    const api = coreExt?.exports as JarvisCoreApi | undefined;
    if (!api || api.version !== 1) {
        log.error('[Kanban] Jarvis core API not available or version mismatch — Kanban will not activate.');
        return;
    }

    // Build initial board index
    rebuildIndex(api);
    log.info(`[Kanban] activated — ${boardIndex.size} owner(s) with boards`);

    // ── Asset provisioning (SPEC_MOD_SKILL_PROVISION) ──────────────────

    const autoProvision = vscode.workspace.getConfiguration('jarvis.kanban').get<boolean>('autoProvision', true);
    void api.provisionModuleAssets(context, {
        namespace: 'jarvis-kanban',
        skillsSourceDir: context.asAbsolutePath('assets/skills'),
        instructionsSourceDir: context.asAbsolutePath('assets/instructions'),
        enabled: autoProvision,
    });

    // ── Discovery decorator ────────────────────────────────────────────

    for (const kind of ['session', 'project', 'event']) {
        context.subscriptions.push(api.registerDecorator(kind, {
            decorate(item, node, _kind) {
                if (node.kind !== 'leaf') { return; }
                const folder = path.dirname(node.id);
                const files = scanEntityFolder(folder);
                if (files.length > 0 && item.contextValue) {
                    item.contextValue += ',kanban';
                }
            },
        }));
    }

    // ── Commands ───────────────────────────────────────────────────────

    context.subscriptions.push(vscode.commands.registerCommand(
        'jarvis.openKanbanBoard',
        async (arg?: { folder?: string; filePath?: string }) => {
            if (arg?.filePath) {
                // Direct file path — open it
                openKanbanPanel(context, log, arg.filePath);
                return;
            }

            if (arg?.folder) {
                // From tree node — check folder
                const files = scanEntityFolder(arg.folder);
                if (files.length === 0) {
                    vscode.window.showInformationMessage('No kanban boards found for this entity.');
                    return;
                }
                if (files.length === 1) {
                    openKanbanPanel(context, log, path.join(arg.folder, files[0]));
                    return;
                }
                const pick = await vscode.window.showQuickPick(files, { placeHolder: 'Select a kanban board' });
                if (pick) {
                    openKanbanPanel(context, log, path.join(arg.folder, pick));
                }
                return;
            }

            // Command palette — show all owners
            rebuildIndex(api);
            if (boardIndex.size === 0) {
                vscode.window.showInformationMessage('No kanban boards found in any entity folder.');
                return;
            }

            const owners = Array.from(boardIndex.entries()).map(([name, entry]) => ({
                label: name,
                description: `${entry.files.length} board(s)`,
                entry,
            }));
            const ownerPick = await vscode.window.showQuickPick(owners, { placeHolder: 'Select an owner' });
            if (!ownerPick) { return; }

            if (ownerPick.entry.files.length === 1) {
                openKanbanPanel(context, log, path.join(ownerPick.entry.folder, ownerPick.entry.files[0]));
                return;
            }

            const boardPick = await vscode.window.showQuickPick(ownerPick.entry.files, { placeHolder: 'Select a board' });
            if (boardPick) {
                openKanbanPanel(context, log, path.join(ownerPick.entry.folder, boardPick));
            }
        }
    ));

    context.subscriptions.push(vscode.commands.registerCommand(
        'jarvis.createKanbanBoard',
        async (node?: { kind: string; id: string }) => {
            rebuildIndex(api);

            let ownerFolder: string;
            let ownerLabel: string;

            if (node?.kind === 'leaf' && node.id) {
                // Invoked from tree context menu — entity folder from node
                ownerFolder = path.dirname(node.id);
                ownerLabel = path.basename(ownerFolder);
            } else {
                // Command palette — pick owner
                const sessions = api.listJarvisSessions();
                if (sessions.length === 0) {
                    vscode.window.showInformationMessage('No entities found.');
                    return;
                }
                const pick = await vscode.window.showQuickPick(
                    sessions.map(s => ({ label: s.name, description: s.kind, folder: s.folder })),
                    { placeHolder: 'Select an owner for the new kanban board' }
                );
                if (!pick?.folder) { return; }
                ownerFolder = pick.folder;
                ownerLabel = pick.label;
            }

            const nameInput = await vscode.window.showInputBox({
                prompt: 'Board name (leave empty for default kanban.yaml, or enter e.g. "sprint" for sprint.kanban.yaml)',
                placeHolder: 'kanban',
                validateInput: v => {
                    if (!v) { return undefined; }
                    if (/[/\\:*?"<>|]/.test(v)) { return 'Board name must not contain path separators or special characters.'; }
                    return undefined;
                }
            });
            if (nameInput === undefined) { return; } // cancelled

            const boardPath = resolveBoardPath(ownerFolder, nameInput || undefined);
            if (fs.existsSync(boardPath)) {
                vscode.window.showWarningMessage(`Board "${path.basename(boardPath)}" already exists for this entity.`);
                return;
            }

            const title = nameInput ? `${ownerLabel} — ${nameInput}` : ownerLabel;
            await fs.promises.writeFile(boardPath, skeletonYaml(title));
            vscode.window.showInformationMessage(`Created "${path.basename(boardPath)}" for "${ownerLabel}".`);
            rebuildIndex(api);
        }
    ));

    // ── Custom Editor ──────────────────────────────────────────────────

    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'jarvis.kanbanEditor',
            new KanbanEditorProvider(context, log),
            { webviewOptions: { retainContextWhenHidden: true } }
        )
    );

    // "Open as Text" command — invoked from the editor title bar button
    // (activeCustomEditorId == jarvis.kanbanEditor). Arg is a vscode.Uri
    // provided by VS Code when launched from editor/title.
    context.subscriptions.push(vscode.commands.registerCommand(
        'jarvis.openKanbanAsText',
        (arg?: vscode.Uri) => {
            const target = arg instanceof vscode.Uri ? arg : vscode.window.activeTextEditor?.document.uri;
            if (target) {
                vscode.commands.executeCommand('vscode.openWith', target, 'default');
            }
        }
    ));

    // ── LM Tools ──────────────────────────────────────────────────────

    // Tool: jarvis_createKanbanBoard
    context.subscriptions.push(api.registerTool(
        'jarvis_createKanbanBoard',
        'Creates a new kanban board YAML file for an actor, project, or event.',
        async (options, token) => {
            const input = options.input as { boardName?: string; ownerName?: string };
            const ownerResult = await resolveOwner(input.ownerName, api, token);
            if ('error' in ownerResult) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: ownerResult.error }))
                ]);
            }

            const boardPath = resolveBoardPath(ownerResult.folder, input.boardName);
            if (fs.existsSync(boardPath)) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        error: 'board already exists',
                        path: boardPath,
                    }))
                ]);
            }

            const title = input.boardName || 'Board';
            await fs.promises.mkdir(path.dirname(boardPath), { recursive: true });
            await fs.promises.writeFile(boardPath, skeletonYaml(title));
            rebuildIndex(api);
            log.info(`[Kanban] created board: ${boardPath}`);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ path: boardPath }))
            ]);
        }
    ));

    // Tool: jarvis_verifyKanbanSchema
    context.subscriptions.push(api.registerTool(
        'jarvis_verifyKanbanSchema',
        'Validates a kanban board YAML file against the schema and semantic rules.',
        async (options, token) => {
            const input = options.input as { boardName?: string; ownerName?: string };
            const ownerResult = await resolveOwner(input.ownerName, api, token);
            if ('error' in ownerResult) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: ownerResult.error }))
                ]);
            }

            const boardPath = resolveBoardPath(ownerResult.folder, input.boardName);
            if (!fs.existsSync(boardPath)) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: 'board not found' }))
                ]);
            }

            // Read and parse YAML
            let rawContent: string;
            try {
                rawContent = fs.readFileSync(boardPath, 'utf-8');
            } catch (e) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: `failed to read file: ${e}` }))
                ]);
            }

            let data: unknown;
            try {
                // Use dynamic import for yaml parser at runtime
                const yaml = await import('yaml');
                data = yaml.parse(rawContent);
            } catch (e) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        board: boardPath,
                        errors: [{ field: '', message: `YAML parse error: ${e}` }],
                        warnings: [],
                    }))
                ]);
            }

            // Structural validation with JSON Schema
            const schemaResult = loadSchema();
            const structuralErrors: ValidationFinding[] = [];

            if ('error' in (schemaResult as object)) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        board: boardPath,
                        errors: [{ field: 'schema', message: (schemaResult as { error: string }).error }],
                        warnings: [],
                    }))
                ]);
            }

            const schema = schemaResult as object;
            if (schema) {
                try {
                    const Ajv = (await import('ajv')).default;
                    const ajv = new Ajv({ allErrors: true });
                    const validate = ajv.compile(schema);
                    const valid = validate(data);
                    if (!valid && validate.errors) {
                        for (const err of validate.errors) {
                            structuralErrors.push({
                                field: err.instancePath || '/',
                                message: err.message ?? 'validation error',
                            });
                        }
                    }
                } catch (e) {
                    structuralErrors.push({
                        field: '',
                        message: `Schema validation engine error: ${e}`,
                    });
                }
            }

            if (structuralErrors.length > 0) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({
                        board: boardPath,
                        errors: structuralErrors,
                        warnings: [],
                    }))
                ]);
            }

            // Semantic validation
            const result = semanticValidate(
                data as { title: string; fields: Array<{ name: string; type: string; options: Array<{ name: string }> }>; items: Array<Record<string, unknown>> },
                boardPath
            );
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result))
            ]);
        }
    ));

    // Tool: jarvis_updateKanbanItem
    context.subscriptions.push(api.registerTool(
        'jarvis_updateKanbanItem',
        'Updates fields on an existing kanban board item by ID.',
        async (options, token) => {
            const input = options.input as { itemId: number; changes: Record<string, string>; boardName?: string; ownerName?: string };
            const ownerResult = await resolveOwner(input.ownerName, api, token);
            if ('error' in ownerResult) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: ownerResult.error }))
                ]);
            }

            const boardPath = resolveBoardPath(ownerResult.folder, input.boardName);
            if (!fs.existsSync(boardPath)) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: 'board not found' }))
                ]);
            }

            // 2. Read file and parse into round-trip representation (SPEC_KAN_UPDATE)
            let rawContent: string;
            try {
                rawContent = fs.readFileSync(boardPath, 'utf-8');
            } catch (e) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: `failed to read file: ${e}` }))
                ]);
            }

            const yaml = await import('yaml');
            let doc: import('yaml').Document;
            try {
                doc = yaml.parseDocument(rawContent);
            } catch (e) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: `YAML parse error: ${e}` }))
                ]);
            }

            // Read plain data from the document for lookup and validation
            const data = doc.toJSON() as {
                items: Array<Record<string, unknown>>;
                fields: Array<{ name: string; options: Array<{ name: string }> }>;
            };

            // 3. Find item by id
            const itemIndex = data.items.findIndex(i => i.id === input.itemId);
            if (itemIndex === -1) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: `item with id ${input.itemId} not found` }))
                ]);
            }

            // 5. Validate status change if present (read from same representation)
            if (input.changes.status) {
                const statusField = data.fields.find(f => f.name === 'status');
                const validOptions = statusField ? new Set(statusField.options.map(o => o.name)) : undefined;
                if (validOptions && !validOptions.has(input.changes.status)) {
                    return new vscode.LanguageModelToolResult([
                        new vscode.LanguageModelTextPart(JSON.stringify({
                            error: `invalid status value "${input.changes.status}". Valid: ${Array.from(validOptions).join(', ')}`,
                        }))
                    ]);
                }
            }

            // 4. Apply changes to the round-trip representation (Document node)
            const itemsSeq = doc.get('items') as import('yaml').YAMLSeq;
            const itemNode = itemsSeq.get(itemIndex) as import('yaml').YAMLMap;
            for (const [key, value] of Object.entries(input.changes)) {
                if (key === 'id') { continue; } // immutable
                itemNode.set(key, value);
            }

            // 6. Serialize round-trip representation back to file
            try {
                await fs.promises.writeFile(boardPath, doc.toString());
            } catch (e) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: `failed to write file: ${e}` }))
                ]);
            }

            log.info(`[Kanban] updated item #${input.itemId} in ${boardPath}`);
            // Trigger 3: direct panel refresh after tool write
            refreshKanbanPanel(boardPath);
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ path: boardPath, updated: true, itemId: input.itemId }))
            ]);
        }
    ));

    // Tool: jarvis_openKanbanBoard
    context.subscriptions.push(api.registerTool(
        'jarvis_openKanbanBoard',
        'Opens a kanban board in the webview renderer.',
        async (options, token) => {
            const input = options.input as { boardName?: string; ownerName?: string };
            const ownerResult = await resolveOwner(input.ownerName, api, token);
            if ('error' in ownerResult) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: ownerResult.error }))
                ]);
            }

            const boardPath = resolveBoardPath(ownerResult.folder, input.boardName);
            if (!fs.existsSync(boardPath)) {
                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart(JSON.stringify({ error: 'board not found' }))
                ]);
            }

            await vscode.commands.executeCommand('jarvis.openKanbanBoard', { filePath: boardPath });
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify({ opened: true, path: boardPath }))
            ]);
        }
    ));
}

export function deactivate(): void {
    // no-op: panel disposal handled by kanbanPanel.ts
}
