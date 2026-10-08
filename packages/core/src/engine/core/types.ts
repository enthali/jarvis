// Implementation: SPEC_ENG_API, SPEC_ENG_REGISTER_TOOL, SPEC_ENG_TOOLREGISTRY, SPEC_ENG_ACTORLIST
// Requirements: REQ_ENG_CONTRACT, REQ_ENG_TOOLNS, REQ_ENG_ACTORLIST

import type * as vscode from 'vscode';

/**
 * Handler signature for tools registered with the engine.
 */
export type ToolHandler = (
    options: vscode.LanguageModelToolInvocationOptions<unknown>,
    token: vscode.CancellationToken
) => Promise<vscode.LanguageModelToolResult>;

/**
 * Descriptor for a registered tool (SPEC_ENG_TOOLREGISTRY).
 */
export interface ToolDescriptor {
    name: string;
    description: string;
}

// Re-export heartbeat types as public engine types (SPEC_ENG_HEARTBEAT_JOBAPI)
export type { HeartbeatJob, HeartbeatStep } from '../../apps/session/heartbeat';

/**
 * Configuration for provisionModuleAssets (SPEC_MOD_SKILL_PROVISION).
 */
export interface ModuleAssetConfig {
    /** Required name prefix for every asset this module provisions. Also scopes the workspaceState key. */
    namespace: string;
    /** Absolute path to the bundled skills folder. Omit if none. */
    skillsSourceDir?: string;
    /** Absolute path to the bundled instructions folder. Omit if none. */
    instructionsSourceDir?: string;
    /** Default true. False de-provisions — see SPEC_MOD_SKILL_MANIFEST. */
    enabled?: boolean;
}

/**
 * An Actor as exposed by the Jarvis core API (SPEC_ENG_ACTORLIST).
 */
export interface JarvisActor {
    name: string;
    summary: string;
    /** The Actor's own agent, equal to name (SPEC_ACTOR_WHOAMI). */
    agent: string;
    folder: string;
    id: string;
}

/**
 * The public API surface exported by the Jarvis core extension.
 * Add-ons obtain this via `vscode.extensions.getExtension('enthali.jarvis-core')!.exports`.
 */
export interface JarvisCoreApi {
    /** Contract version — add-ons MUST check before using newer fields. */
    readonly version: 2;

    registerTool(name: string, description: string, handler: ToolHandler): vscode.Disposable;

    // --- Actor listing API (SPEC_ENG_ACTORLIST) ---

    /** Pure projection of the Actor scanner cache — no fs access, [] if none. */
    listActors(): JarvisActor[];

    /**
     * Replace the icon of one Actor node until the returned Disposable is disposed
     * (SPEC_ENG_ACTORMARK). Additive: add-ons check that the member exists before calling it.
     */
    markActor(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable;

    // --- Heartbeat job API (SPEC_ENG_HEARTBEAT_JOBAPI) ---

    /** Idempotent upsert of a heartbeat job (PERSISTENT — survives restart/uninstall). */
    registerJob(job: import('../../apps/session/heartbeat').HeartbeatJob): Promise<void>;
    /** Remove a heartbeat job by name. */
    unregisterJob(name: string): Promise<void>;
    /** Return all currently persisted heartbeat jobs. */
    listJobs(): import('../../apps/session/heartbeat').HeartbeatJob[];

    // --- Tool registry API (SPEC_ENG_TOOLREGISTRY) ---

    /** Return a snapshot of all currently registered tools. */
    getRegisteredTools(): ToolDescriptor[];
    /** Invoke a registered tool directly (no LM round-trip). Throws if not registered. */
    invokeTool(name: string, options: vscode.LanguageModelToolInvocationOptions<unknown>, token: vscode.CancellationToken): Promise<vscode.LanguageModelToolResult>;

    // --- Cross-actor messaging API (SPEC_SPL_NOTIFY) ---

    /**
     * Queue a message for delivery to a destination actor/session.
     * Unlike the jarvis_sendMessage LM tool, this does not require `sender` to
     * be an existing actor/session name — it is intended for system/add-on
     * originated notifications (e.g. jarvis-syspilot) that have no actor of
     * their own. Delivery still goes through the standard auto-delivery queue.
     */
    sendMessage(destination: string, sender: string, text: string): void;

    // --- Module asset provisioning (SPEC_MOD_SKILL_PROVISION) ---

    provisionModuleAssets(context: vscode.ExtensionContext, config: ModuleAssetConfig): Promise<void>;
}

