// Implementation: SPEC_INJ_INJECT
// Requirements: REQ_INJ_PRIMITIVE

import * as vscode from 'vscode';
import * as path from 'path';
import { lookupSessionUUID } from './sessionLookup';

// --- Module-level dependencies (injected via init) ---

let _scanner: { entities: { name: string; kind?: string; folder?: string; agent?: string }[] } | undefined;
let _log: vscode.LogOutputChannel | undefined;
let _openAtMain: (uri: vscode.Uri, sessionName: string) => Promise<void>;
let _openAtSecondary: (uri: vscode.Uri, sessionName: string) => Promise<void>;
let _openNewChatEditor: () => Promise<void>;
let _renameFocusedChatSession: (name: string) => Promise<void>;
let _reapplyAgentMode: (agent: string, context: string) => Promise<void>;

export interface InjectPromptDeps {
    scanner: { entities: { name: string; kind?: string; folder?: string; agent?: string }[] };
    log: vscode.LogOutputChannel;
    openAtMain: (uri: vscode.Uri, sessionName: string) => Promise<void>;
    openAtSecondary: (uri: vscode.Uri, sessionName: string) => Promise<void>;
    openNewChatEditor: () => Promise<void>;
    renameFocusedChatSession: (name: string) => Promise<void>;
    reapplyAgentMode: (agent: string, context: string) => Promise<void>;
}

export function initInjectPrompt(deps: InjectPromptDeps): void {
    _scanner = deps.scanner;
    _log = deps.log;
    _openAtMain = deps.openAtMain;
    _openAtSecondary = deps.openAtSecondary;
    _openNewChatEditor = deps.openNewChatEditor;
    _renameFocusedChatSession = deps.renameFocusedChatSession;
    _reapplyAgentMode = deps.reapplyAgentMode;
}

// Shared substitution helper (same as top-level applyTemplate in extension.ts)
function applyTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

const DEFAULT_INIT_PROMPT =
    `You are the agent session for the \${kind} "\${name}".\n\n` +
    `Use only \`\${contextPath}\` as your persistent memory. Read it now.\n\n` +
    `Keep it minimal and action-oriented:\n` +
    `- Store only long-lived items under Decision / Finding / Next.\n` +
    `- One concise line per bullet. Prune aggressively.\n` +
    `- Replace outdated bullets — never append logs.\n` +
    `- Never store retries, raw tool output, or transient chatter.\n` +
    `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.\n` +
    `- When a topic grows past ~5 bullets, move it to a dedicated file beside \`context.md\` and leave a one-line summary with a relative link in \`context.md\`.`;

/**
 * Send a prompt/slash-command to the focused chat editor (SPEC_MSG_SENDPROMPT).
 * Mode-setting variant: uses openAgent which forces "Agent" mode.
 * Used only for new-session init prompt (branch 3b).
 */
async function sendPromptModeSetting(query: string): Promise<void> {
    try {
        await vscode.commands.executeCommand('workbench.action.chat.focusInput');
    } catch {
        // Best effort: older VS Code builds may not expose the focus command.
    }

    try {
        await vscode.commands.executeCommand(
            'workbench.action.chat.openAgent',
            { query, isPartialQuery: false }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        _log?.warn(`[INJ] workbench.action.chat.openAgent failed, falling back to chat.open: ${message}`);
        await vscode.commands.executeCommand(
            'workbench.action.chat.open',
            { query, isPartialQuery: false, mode: 'agent' }
        );
    }
}

/**
 * Send a prompt to the focused chat editor without changing its agent mode
 * (SPEC_MSG_SENDPROMPT, mode-preserving variant).
 * Used for text injection into existing sessions (branch 3a → step 4).
 */
async function sendPromptModePreserving(query: string): Promise<void> {
    try {
        await vscode.commands.executeCommand('workbench.action.chat.focusInput');
    } catch {
        // Best effort
    }

    try {
        await vscode.commands.executeCommand(
            'workbench.action.chat.open',
            { query, isPartialQuery: false }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        _log?.warn(`[INJ] chat.open (mode-preserving) failed: ${message}`);
    }
}

export interface InjectPromptOptions {
    placement?: 'main' | 'secondary';
    skipInitPrompt?: boolean;
}

/**
 * Resolve a named entity, find or spawn its chat session, and inject
 * arbitrary text into the chat input (SPEC_INJ_INJECT).
 */
export async function injectPrompt(
    entityName: string,
    text: string,
    options?: InjectPromptOptions
): Promise<void> {
    if (!_scanner) {
        throw new Error('Jarvis: injectPrompt not initialized — call initInjectPrompt first');
    }

    const placement = options?.placement ?? 'main';
    const skipInitPrompt = options?.skipInitPrompt ?? false;

    // 1. Entity resolution
    const entity = _scanner.entities.find(e => e.name === entityName);
    if (!entity) {
        throw new Error(`Jarvis: Entity not found: ${entityName}`);
    }

    // 2. Session lookup
    const uuid = await lookupSessionUUID(entityName);
    let isExistingSession = false;

    if (uuid) {
        // 3a. Existing session
        isExistingSession = true;
        const b64 = Buffer.from(uuid).toString('base64');
        const uri = vscode.Uri.parse(`vscode-chat-session://local/${b64}`);

        if (placement === 'main') {
            await _openAtMain(uri, entityName);
        } else {
            await _openAtSecondary(uri, entityName);
        }

        if (entity.agent) {
            await _reapplyAgentMode(entity.agent, entityName);
        }

        await new Promise(resolve => setTimeout(resolve, 800));
    } else {
        // 3b. New session (spawn)
        if (entity.agent) {
            try {
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open', { mode: entity.agent });
                await new Promise(resolve => setTimeout(resolve, 300));
            } catch (err) {
                _log?.warn(`[INJ] injectPrompt: failed to prime agent mode "${entity.agent}": ${err}`);
            }
        }

        await _openNewChatEditor();
        await _renameFocusedChatSession(entityName);

        if (!skipInitPrompt) {
            // Build and inject init prompt (SPEC_ENT_AGENTSESSION_INITPROMPT)
            const kind = entity.kind ?? 'project';
            const folder = entity.folder ?? '';
            const contextPath = path.join(folder, 'context.md');
            const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
                .get<string>('agentSession.initPromptTemplate') ?? '';
            const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
            const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });
            await sendPromptModeSetting(initPrompt);
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Post-spawn placement fix: guarantee Main column for user-initiated
        // actions (REQ_ENT_AGENTSESSION AC-7, REQ_MSG_EDITORPLACEMENT AC-12/AC-13).
        // The rename above has completed, so the session is now resolvable by name.
        if (placement === 'main') {
            const newUuid = await lookupSessionUUID(entityName);
            if (newUuid) {
                const newB64 = Buffer.from(newUuid).toString('base64');
                const newUri = vscode.Uri.parse(`vscode-chat-session://local/${newB64}`);
                await _openAtMain(newUri, entityName);
            }
            // Silent no-op if UUID unresolved (rare rename-propagation edge case)
        }
    }

    // 4. Text injection (skip if empty — avoids re-injecting init prompt on re-focus)
    // Branch-aware: mode-preserving after 3a, mode-setting after 3b (SPEC_MSG_SENDPROMPT)
    if (text) {
        if (isExistingSession) {
            await sendPromptModePreserving(text);
        } else {
            await sendPromptModeSetting(text);
        }
    }
}
