// Implementation: SPEC_ENG_API, SPEC_ENG_REGISTER_TOOL, SPEC_ENG_ACTORLIST, SPEC_ENG_ACTORMARK
// Requirements: REQ_ENG_CONTRACT, REQ_ENG_TOOLNS, REQ_ENG_ACTORLIST, REQ_ENG_ACTORMARK

import * as vscode from 'vscode';
import type { JarvisActor, JarvisCoreApi, ModuleAssetConfig, ToolDescriptor, ToolHandler } from './types';
import type { HeartbeatJob } from './types';
import type { HeartbeatScheduler } from '../../apps/session/heartbeat';
import type { ActorScanner } from '../actors/actorScanner';
import { ambiguousActorMessage } from '../actors/actorScanner';
import { appendMessage } from '../sessions/messageQueue';

/**
 * Real implementation of the JarvisCoreApi contract.
 * Constructed at core activation; returned from activate().
 */
export class JarvisEngine implements JarvisCoreApi {
    readonly version = 2 as const;

    private readonly _tools = new Map<string, { description: string; handler: ToolHandler; disposable: vscode.Disposable }>();
    private readonly _subscriptions: vscode.Disposable[] = [];
    private _scheduler: HeartbeatScheduler | undefined;
    private _resolveMessagesPath: (() => string) | undefined;
    private _onMessageQueued: (() => void) | undefined;
    private _marker: ((actorId: string, icon: vscode.ThemeIcon) => vscode.Disposable) | undefined;

    constructor(private readonly _actorScanner: ActorScanner) {}

    /** Wire the heartbeat scheduler (called from activation after scheduler creation). */
    setScheduler(scheduler: HeartbeatScheduler): void {
        this._scheduler = scheduler;
    }

    /** Wire the message queue path resolver + reload callback (SPEC_SPL_NOTIFY). */
    setMessaging(resolveMessagesPath: () => string, onMessageQueued: () => void): void {
        this._resolveMessagesPath = resolveMessagesPath;
        this._onMessageQueued = onMessageQueued;
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

    // --- Actor listing API (SPEC_ENG_ACTORLIST) ---

    listActors(): JarvisActor[] {
        return this._actorScanner.actors.map(a => ({
            name: a.name, summary: a.summary, agent: a.agent, folder: a.folder, id: a.id,
        }));
    }

    // --- Actor node mark API (SPEC_ENG_ACTORMARK) ---

    /** Wire the tree provider's mark function (called from activation). */
    setMarker(marker: (actorId: string, icon: vscode.ThemeIcon) => vscode.Disposable): void {
        this._marker = marker;
    }

    markActor(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable {
        if (!this._marker) {
            throw new Error('Actor tree is not available');
        }
        return this._marker(actorId, icon);
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

    // --- Cross-actor messaging API (SPEC_SPL_NOTIFY, SPEC_ENG_API AC-8) ---

    sendMessage(destination: string, sender: string, text: string): void {
        if (!this._resolveMessagesPath) {
            throw new Error('Messaging is not available');
        }
        // Sender-name validation is skipped (module-internal senders need not
        // be Actors). Destination ambiguity is still refused with a
        // user-visible notification, per REQ_ACTOR_SCHEMA AC-7.
        const lookup = this._actorScanner.resolveName(destination);
        if (lookup.status === 'ambiguous') {
            const msg = ambiguousActorMessage(destination, lookup.matches);
            void vscode.window.showErrorMessage(`Jarvis: ${msg}`);
            throw new Error(msg);
        }
        appendMessage(this._resolveMessagesPath(), destination, sender, text);
        this._onMessageQueued?.();
    }

    // --- Module asset provisioning (SPEC_MOD_SKILL_PROVISION) ---

    async provisionModuleAssets(ctx: vscode.ExtensionContext, config: ModuleAssetConfig): Promise<void> {
        const { provisionModuleAssets: provision } = await import('./assetProvisioning');
        return provision(ctx, config);
    }

    dispose(): void {
        for (const [, entry] of this._tools) {
            entry.disposable.dispose();
        }
        this._tools.clear();
        for (const sub of this._subscriptions) {
            sub.dispose();
        }
        this._actorScanner.dispose();
    }
}

