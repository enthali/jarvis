// Implementation: SPEC_ENG_API, SPEC_ENG_REGISTER_KIND, SPEC_ENG_REGISTER_TOOL
// Requirements: REQ_ENG_CONTRACT, REQ_ENG_TOOLNS

import * as vscode from 'vscode';
import type { EntityKindConfig, JarvisCoreApi, ToolDescriptor, ToolHandler, TreeItemDecorator } from './types';
import type { HeartbeatJob } from './types';
import type { HeartbeatScheduler } from '../../apps/session/heartbeat';
import { KindDrivenScanner } from '../sessions/yamlScanner';
import { GenericTreeFactory } from './treeFactory';
import { appendMessage } from '../sessions/messageQueue';

/**
 * Real implementation of the JarvisCoreApi contract.
 * Constructed at core activation; returned from activate().
 */
export class JarvisEngine implements JarvisCoreApi {
    readonly version = 1 as const;

    private readonly _kinds = new Map<string, EntityKindConfig>();
    private readonly _tools = new Map<string, { description: string; handler: ToolHandler; disposable: vscode.Disposable }>();
    private readonly _scanner: KindDrivenScanner;
    private readonly _treeFactory: GenericTreeFactory;
    private readonly _subscriptions: vscode.Disposable[] = [];
    private _scheduler: HeartbeatScheduler | undefined;
    private _resolveMessagesPath: (() => string) | undefined;
    private _onMessageQueued: (() => void) | undefined;

    constructor(scanner: KindDrivenScanner, treeFactory: GenericTreeFactory) {
        this._scanner = scanner;
        this._treeFactory = treeFactory;
    }

    /** Wire the heartbeat scheduler (called from activation after scheduler creation). */
    setScheduler(scheduler: HeartbeatScheduler): void {
        this._scheduler = scheduler;
    }

    /** Wire the message queue path resolver + reload callback (SPEC_SPL_NOTIFY). */
    setMessaging(resolveMessagesPath: () => string, onMessageQueued: () => void): void {
        this._resolveMessagesPath = resolveMessagesPath;
        this._onMessageQueued = onMessageQueued;
    }

    get kinds(): ReadonlyMap<string, EntityKindConfig> {
        return this._kinds;
    }

    get scanner(): KindDrivenScanner {
        return this._scanner;
    }

    get treeFactory(): GenericTreeFactory {
        return this._treeFactory;
    }

    registerEntityKind(config: EntityKindConfig): vscode.Disposable {
        this._kinds.set(config.kind, config);
        this._scanner.addKind(config);
        this._treeFactory.addKind(config);

        return {
            dispose: () => {
                this._kinds.delete(config.kind);
                this._scanner.removeKind(config.kind);
                this._treeFactory.removeKind(config.kind);
            }
        };
    }

    registerTool(name: string, description: string, handler: ToolHandler): vscode.Disposable {
        if (!name.startsWith('jarvis_')) {
            throw new Error(`Tool name must start with 'jarvis_', got: '${name}'`);
        }
        if (this._tools.has(name)) {
            throw new Error(`Tool '${name}' is already registered`);
        }

        const lmDisposable = vscode.lm.registerTool(name, { invoke: handler });
        this._tools.set(name, { description, handler, disposable: lmDisposable });

        return {
            dispose: () => {
                const entry = this._tools.get(name);
                if (entry) {
                    entry.disposable.dispose();
                    this._tools.delete(name);
                }
            }
        };
    }

    registerDecorator(kind: string, decorator: TreeItemDecorator): vscode.Disposable {
        return this._treeFactory.registerDecorator(kind, decorator);
    }

    getTreeDataProvider(kind: string): vscode.TreeDataProvider<unknown> | undefined {
        return this._treeFactory.getProvider(kind);
    }

    refreshKind(kind: string): void {
        this._treeFactory.refreshKind(kind);
    }

    getTreeForKind(kind: string) {
        return this._scanner.getTreeForKind(kind);
    }

    getEntity(id: string) {
        return this._scanner.getEntity(id);
    }

    async rescan(): Promise<void> {
        await this._scanner.rescan();
    }

    // --- Filter API (SPEC_PRJ_FILTERCOMMAND, SPEC_EVT_EVENTFILTER_CMD) ---

    setHiddenFolders(kind: string, folders: Set<string>): void {
        const provider = this._treeFactory.getProvider(kind);
        if (provider) {
            provider.setHiddenFolders(folders);
        }
    }

    getHiddenFolders(kind: string): Set<string> {
        const provider = this._treeFactory.getProvider(kind);
        return provider ? provider.getHiddenFolders() : new Set();
    }

    setFutureOnly(kind: string, value: boolean): void {
        const provider = this._treeFactory.getProvider(kind);
        if (provider) {
            provider.setFutureOnly(value);
        }
    }

    isFutureOnly(kind: string): boolean {
        const provider = this._treeFactory.getProvider(kind);
        return provider ? provider.isFutureOnly() : false;
    }

    // --- Session listing API (SPEC_ENG_SESSIONLIST, SPEC_MSG_JARVISSESSIONS) ---

    listJarvisSessions(): { name: string; summary: string; agent: string; kind: string; folder: string }[] {
        return this._scanner.listJarvisSessions();
    }

    // --- Heartbeat job API (SPEC_ENG_HEARTBEAT_JOBAPI) ---

    async registerJob(job: HeartbeatJob): Promise<void> {
        if (!this._scheduler) {
            throw new Error('Heartbeat scheduler is not available');
        }
        await this._scheduler.registerJob(job);
    }

    async unregisterJob(name: string): Promise<void> {
        if (!this._scheduler) {
            throw new Error('Heartbeat scheduler is not available');
        }
        await this._scheduler.unregisterJob(name);
    }

    listJobs(): HeartbeatJob[] {
        if (!this._scheduler) {
            return [];
        }
        return this._scheduler.currentJobs;
    }

    // --- Tool registry API (SPEC_ENG_TOOLREGISTRY) ---

    getRegisteredTools(): ToolDescriptor[] {
        const result: ToolDescriptor[] = [];
        for (const [name, entry] of this._tools) {
            result.push({ name, description: entry.description });
        }
        return result;
    }

    invokeTool(name: string, options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult> {
        const entry = this._tools.get(name);
        if (!entry) {
            throw new Error(`Tool '${name}' is not registered`);
        }
        return entry.handler(options, token);
    }

    // --- Cross-actor messaging API (SPEC_SPL_NOTIFY) ---

    sendMessage(destination: string, sender: string, text: string): void {
        if (!this._resolveMessagesPath) {
            throw new Error('Messaging is not available');
        }
        appendMessage(this._resolveMessagesPath(), destination, sender, text);
        this._onMessageQueued?.();
    }

    // --- Actor Session API (SPEC_PIM_OPENACTORSESSION) ---

    async openActorSession(entityName: string, options?: { placement?: 'main' | 'secondary' }): Promise<void> {
        const entity = this._scanner.entities.find(e => e.name === entityName);
        if (!entity) {
            throw new Error(`Jarvis: Entity not found: ${entityName}`);
        }
        const kind = entity.kind ?? 'project';
        const folder = entity.folder ?? '';
        const path = await import('path');
        const vscode = await import('vscode');
        const contextPath = path.join(folder, 'context.md');
        const defaultInitPrompt =
            `You are the agent session for the \${kind} "\${name}".\n\n` +
            `Use only \`\${contextPath}\` as your persistent memory. Read it now.\n\n` +
            `Keep it minimal and action-oriented:\n` +
            `- Store only long-lived items under Decision / Finding / Next.\n` +
            `- One concise line per bullet. Prune aggressively.\n` +
            `- Replace outdated bullets \u2014 never append logs.\n` +
            `- Never store retries, raw tool output, or transient chatter.\n` +
            `- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.\n` +
            `- When a topic grows past ~5 bullets, move it to a dedicated file beside \`context.md\` and leave a one-line summary with a relative link in \`context.md\`.`;
        const rawTemplate = vscode.workspace.getConfiguration('jarvis').get<string>('agentSession.initPromptTemplate') ?? '';
        const initTemplate = rawTemplate.trim() ? rawTemplate : defaultInitPrompt;
        const initPrompt = initTemplate.replace(/\$\{(\w+)\}/g, (m: string, k: string) => {
            const vars: Record<string, string> = { kind, name: entityName, contextPath };
            return k in vars ? vars[k] : m;
        });
        const { injectPrompt: inject } = await import('../sessions/injectPrompt');
        return inject(entityName, initPrompt, { placement: options?.placement, skipInitPrompt: true });
    }

    dispose(): void {
        for (const [, entry] of this._tools) {
            entry.disposable.dispose();
        }
        this._tools.clear();
        this._kinds.clear();
        for (const sub of this._subscriptions) {
            sub.dispose();
        }
    }
}
