Engine Design Specifications
============================

.. spec:: JarvisCoreApi Contract & Types
   :id: SPEC_ENG_API
   :status: approved
   :links: REQ_ENG_CONTRACT; REQ_ENG_ACTORLIST; REQ_ENG_ACTORMARK; REQ_MOD_SKILL_PROVISION; REQ_ACTOR_SCHEMA

   **Description:**
   The core extension exposes a versioned ``JarvisCoreApi`` as the return value
   of its ``activate()`` function. Add-ons obtain it cross-extension via
   ``vscode.extensions.getExtension('enthali.jarvis').exports`` (their
   ``extensionDependencies`` on the core guarantees the core is active first).

   **Types:**

   .. code-block:: typescript

      /** One Actor as published to add-ons (SPEC_ENG_ACTORLIST). */
      export interface JarvisActor {
          name: string;
          summary: string;   // "" when absent
          agent: string;     // "" when absent
          folder: string;    // absolute Actor folder
          id: string;        // absolute path of actor.yaml
      }

      export type ToolHandler = (
          options: vscode.LanguageModelToolInvocationOptions<unknown>,
          token: vscode.CancellationToken
      ) => Promise<vscode.LanguageModelToolResult>;

      /** Descriptor for a registered tool (returned by getRegisteredTools). */
      export interface ToolDescriptor {
          name: string;
          description: string;
      }

      // --- Heartbeat types (promoted to public API surface) ---

      /**
       * A single step within a heartbeat job.
       * Promoted from the internal heartbeat module to the public API so
       * add-ons can construct jobs without importing engine internals.
       */
      export interface HeartbeatStep {
          type: 'python' | 'powershell' | 'command' | 'agent' | 'queue';
          run?: string;
          prompt?: string;
          outputFile?: string;
          append?: boolean;
          vendor?: string;       // agent: language model vendor (SPEC_AUT_JOBSCHEMA)
          model?: string;        // agent: language model id (SPEC_AUT_JOBSCHEMA)
          destination?: string;
          sender?: string;
          text?: string;
      }

      /**
       * A heartbeat job definition. Persisted in heartbeat.yaml.
       * Promoted from the internal heartbeat module to the public API so
       * add-ons can register jobs via ``JarvisCoreApi.registerJob()``.
       */
      export interface HeartbeatJob {
          name: string;
          schedule: string;       // 5-field cron or "manual"
          steps: HeartbeatStep[];
          enabled?: boolean;      // default true; false = paused
      }

      export interface JarvisCoreApi {
          /** Contract version — add-ons MUST check it before using the API. */
          readonly version: 2;
          registerTool(name: string, description: string, handler: ToolHandler): vscode.Disposable;

          /** Snapshot of all Actors from the Actor scanner (SPEC_ENG_ACTORLIST). */
          listActors(): JarvisActor[];

          /**
           * Replace the icon of one Actor node until the returned Disposable is
           * disposed (SPEC_ENG_ACTORMARK). Additive: add-ons check that the
           * member exists before calling it.
           */
          markActor(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable;

          // --- Tool registry exposure (SPEC_ENG_TOOLREGISTRY) ---

          /** Return descriptors for all currently registered tools. */
          getRegisteredTools(): ToolDescriptor[];
          /** Invoke a registered tool by name; throws if not registered. */
          invokeTool(
              name: string,
              options: vscode.LanguageModelToolInvocationOptions,
              token: vscode.CancellationToken
          ): Promise<vscode.LanguageModelToolResult>;

          // --- Heartbeat job registration (SPEC_ENG_HEARTBEAT_JOBAPI) ---
          // PERSISTENT — jobs survive reload/uninstall. NOT session-scoped.
          // Callers sync on config change, not on extension lifecycle.

          /**
           * Register or update a heartbeat job (idempotent upsert by name).
           * The job is persisted to heartbeat.yaml immediately.
           * This is a PERSISTENT operation — the job survives extension
           * deactivation and VS Code restarts.
           */
          registerJob(job: HeartbeatJob): Promise<void>;
          /**
           * Remove a heartbeat job by name. No-op if not found.
           * Persistent — the removal is written to heartbeat.yaml.
           */
          unregisterJob(name: string): Promise<void>;
          /**
           * Return all currently persisted heartbeat jobs (snapshot).
           * Includes paused jobs (enabled === false).
           */
          listJobs(): HeartbeatJob[];

          // --- Messaging (SPEC_SPL_NOTIFY) ---

          /**
           * Append a message to the Jarvis message queue. Only the sender is
           * not validated: internal/module senders (e.g. jarvis-syspilot,
           * heartbeat internals) need not be registered Actors. The
           * destination is resolved with ActorScanner.resolveName: an
           * ambiguous name shows an error notification and throws, nothing
           * is queued (REQ_ACTOR_SCHEMA AC-7); an unknown name is queued
           * unchanged. Delivered by the auto-delivery poll loop like any
           * other queued message. (jarvis-syspilot CR, GH #39)
           */
          sendMessage(destination: string, sender: string, text: string): void;

          // --- Module asset provisioning (SPEC_MOD_SKILL_PROVISION) ---

          /**
           * Copy the calling module's VSIX-bundled Copilot Skill folders and
           * Instructions files into the workspace's ``.github/skills/`` and
           * ``.github/instructions/``. Idempotent; removes the module's own
           * prior assets that are no longer bundled. The module passes its own
           * ``ExtensionContext`` — the manifest of written files is persisted
           * in that context's ``workspaceState``, which scopes cleanup to the
           * calling module. Fire-and-forget from ``activate()``.
           */
          provisionModuleAssets(
              context: vscode.ExtensionContext,
              config: ModuleAssetConfig
          ): Promise<void>;
      }

   **Acceptance Criteria:**

   * AC-1: ``activate()`` returns a value structurally implementing
     ``JarvisCoreApi``.
   * AC-2: ``version`` is the literal ``2``. Every add-on activates only when
     it reads ``version === 2`` and logs an error otherwise (PIM, kanban,
     syspilot, MCP, recorder, flow). This AC is the sole normative statement
     of the guard; an add-on's own package spec (``SPEC_MOD_*_PKG``) MAY
     restate it as its own AC when the guard is otherwise easy to lose track
     of (e.g. ``SPEC_MOD_FLOW_PKG`` AC-5, added after Flow's guard was found
     stale) but need not, and its absence from a given package spec is not a
     gap against this AC.
   * AC-3: The interface is the single published surface; the engine exposes no
     other globals to add-ons.
   * AC-4: ``registerEntityKind``, ``registerDecorator``, ``getTreeForKind``,
     ``getEntity``, ``listJarvisSessions``, ``rescan``, ``refreshKind``,
     ``openActorSession``, ``getTreeDataProvider`` and the folder/future
     filter methods do not exist on the interface or its implementation
     (``REQ_ENG_CONTRACT`` AC-2). The types ``EntityEntry``, ``JarvisSession``,
     ``TreeNode``, ``SubtreeNode``, ``EntityKindConfig`` and
     ``TreeItemDecorator`` are removed with them.
   * AC-5: ``listActors()`` returns the Actor scanner's current entries as
     ``JarvisActor[]`` (``SPEC_ENG_ACTORLIST``).
   * AC-6: ``getRegisteredTools()`` and ``invokeTool()`` provide read-only
     access to the tool registry (see ``SPEC_ENG_TOOLREGISTRY``).
   * AC-7: ``registerJob(job)`` persists a heartbeat job (idempotent upsert by
     name); ``unregisterJob(name)`` removes it; ``listJobs()`` returns the
     current persisted set. These are PERSISTENT operations — they write to
     ``heartbeat.yaml`` and survive deactivation/restarts. They do NOT return
     ``Disposable`` (see ``SPEC_ENG_HEARTBEAT_JOBAPI``).
   * AC-8: ``sendMessage(destination, sender, text)`` appends a message to the
     queue file (same as ``appendMessage`` internally). It skips sender-name
     validation only, for module-internal senders (e.g. ``jarvis-syspilot``)
     that are not registered Actors. The destination is resolved with
     ``ActorScanner.resolveName``: an ambiguous destination shows an error
     notification and throws without queuing (``REQ_ACTOR_SCHEMA`` AC-7); an
     unknown destination is queued unchanged. The message is picked up by
     the auto-delivery poll loop like any other queued message
     (``jarvis-syspilot`` CR, GH #39).
   * AC-9 (``module-skill-provisioning`` CR): ``provisionModuleAssets(context,
     config)`` provisions the calling module's bundled Copilot assets into the
     workspace and returns when the write and cleanup phases are complete. It
     never throws to the caller — all failures are logged. See
     ``SPEC_MOD_SKILL_PROVISION`` for the algorithm and ``ModuleAssetConfig``
     shape.
   * AC-10: ``markActor(actorId, icon)`` sets an icon mark on one Actor node and
     returns a ``Disposable`` that removes it (``SPEC_ENG_ACTORMARK``). It is not a
     decorator API: AC-4 stays true.


.. spec:: registerTool Validation
   :id: SPEC_ENG_REGISTER_TOOL
   :status: approved
   :links: REQ_ENG_CONTRACT; REQ_ENG_TOOLNS

   **Description:**
   ``registerTool(name, description, handler)`` injects a language-model/MCP tool
   into the engine's shared tool surface. The engine validates the name and
   tracks a ``Disposable`` per tool.

   **Behaviour:**

   * Rejects (throws) a ``name`` that does not start with ``jarvis_``.
   * Rejects (throws) a ``name`` already registered — no silent shadowing.
   * Returns a ``Disposable`` that unregisters the tool.

   **Acceptance Criteria:**

   * AC-1: A non-``jarvis_`` name throws a descriptive error and registers
     nothing.
   * AC-2: A duplicate name throws and leaves the original registration intact.
   * AC-3: Disposing the returned handle removes the tool from the LM/MCP
     surface.


.. spec:: Tool Registry Exposure Surface
   :id: SPEC_ENG_TOOLREGISTRY
   :status: approved
   :links: REQ_ENG_TOOLREGISTRY

   **Description:**
   The engine exposes a read-only enumeration and invocation surface over the
   aggregate tool registry so that a consumer extension (e.g. the MCP transport)
   can discover and invoke ALL tools registered by any extension — without
   reaching into engine internals.

   **API additions to JarvisCoreApi:**

   .. code-block:: typescript

      /** Descriptor returned by getRegisteredTools(). */
      export interface ToolDescriptor {
          /** Tool name (e.g. 'jarvis_listActors', 'jarvis_pim_task'). */
          name: string;
          /** Human-readable description (as passed to registerTool). */
          description: string;
      }

      // Added to JarvisCoreApi:
      interface JarvisCoreApi {
          // ... existing members unchanged ...

          /**
           * Return descriptors for all currently registered tools.
           * The list is a snapshot — it reflects tools registered at call time.
           * Consumer extensions call this to discover available tools.
           */
          getRegisteredTools(): ToolDescriptor[];

          /**
           * Invoke a registered tool by name. Throws if the tool is not
           * registered. The invocation is delegated to the tool's handler
           * with the same semantics as a VS Code language-model invocation.
           *
           * @param name - Exact tool name (e.g. 'jarvis_listActors').
           * @param options - Standard LanguageModelToolInvocationOptions.
           * @param token - Cancellation token.
           * @returns The LanguageModelToolResult from the handler.
           * @throws Error if no tool with that name is registered.
           */
          invokeTool(
              name: string,
              options: vscode.LanguageModelToolInvocationOptions,
              token: vscode.CancellationToken
          ): Promise<vscode.LanguageModelToolResult>;
      }

   **Design rationale:**

   * ``getRegisteredTools()`` returns ``ToolDescriptor[]`` (name + description)
     rather than the full handler — consumers cannot bypass the engine's
     invocation path. Input schemas are not exposed here because the VS Code
     language-model metadata surface already provides them; the MCP extension
     obtains schemas from ``vscode.lm.tools`` (the standard API) or from the
     tool's ``package.json`` metadata.
   * ``invokeTool()`` delegates directly to the handler stored in the internal
     registry (the same ``ToolHandler`` that ``registerTool`` accepted). It does
     NOT re-enter ``vscode.lm`` — it calls the handler function, giving the MCP
     server the same execution semantics as a language-model call but without
     requiring a round-trip through the VS Code LM plumbing.
   * Both methods are read-only / side-effect-free on the registry itself (they
     never mutate registrations). They require no changes to ``registerTool``,
     handler signatures, or disposal semantics.

   **Acceptance Criteria:**

   * AC-1: ``getRegisteredTools()`` returns a ``ToolDescriptor[]`` containing
     every tool currently registered via ``registerTool``.
   * AC-2: The returned list reflects dynamic changes — a tool disposed after
     the call is no longer present in a subsequent call.
   * AC-3: ``invokeTool(name, options, token)`` invokes the named tool's handler
     and returns its ``LanguageModelToolResult``.
   * AC-4: ``invokeTool`` throws a descriptive error if the name is not
     registered.
   * AC-5: Neither method modifies the tool registry — they are pure consumers.
   * AC-6: The existing ``registerTool`` / disposal semantics are unchanged.


.. spec:: Platform Actor List API
   :id: SPEC_ENG_ACTORLIST
   :status: approved
   :links: REQ_ENG_ACTORLIST; SPEC_ACTOR_SCANNER; SPEC_ACTOR_LISTTOOL

   **Description:**
   ``JarvisCoreApi.listActors()`` publishes the Actor scanner's cache as
   ``JarvisActor[]`` (``REQ_ENG_ACTORLIST`` AC-1). It is a read-only
   projection; it never scans.

   .. code-block:: typescript

      listActors(): JarvisActor[] {
          return actorScanner.actors.map(a => ({
              name: a.name, summary: a.summary, agent: a.agent, folder: a.folder, id: a.id,
          }));
      }

   The entry shape equals a ``jarvis_listActors`` entry
   (``SPEC_ACTOR_LISTTOOL``); both call the same projection function.

   **Consumers:**

   * ``kanban``: board discovery scans ``listActors().map(a => a.folder)``;
     owner resolution requires exactly one entry with the given ``name``
     (``SPEC_KAN_CREATE`` step 1). Duplicates are returned as they are, so
     the add-on applies the unique-name rule itself.
   * ``syspilot``: ``versionCheck.ts`` tests whether the syspilot Actor
     exists via ``listActors().some(a => a.name === ACTOR_NAME)``.

   **Acceptance Criteria:**

   * AC-1: ``listActors()`` returns one entry per Actor in the scanner cache
     with exactly ``name``, ``summary``, ``agent``, ``folder``, ``id``.
   * AC-2: The method performs no file-system access.
   * AC-3: It returns ``[]`` when no Actor exists or the actors folder is not
     resolvable.
   * AC-4: ``listJarvisSessions()`` no longer exists; its two callers use
     ``listActors()``.


.. spec:: Actor Node Mark API
   :id: SPEC_ENG_ACTORMARK
   :status: approved
   :links: REQ_ENG_ACTORMARK; SPEC_ACTOR_TREE; SPEC_ACTOR_ACTIVITY

   **Description:**
   ``JarvisCoreApi.markActor(actorId, icon)`` lets an add-on replace the icon of one
   Actor node. ``ActorTreeProvider`` holds the marks and draws the node; no callback
   into the add-on is made.

   .. code-block:: typescript

      // ActorTreeProvider
      private marks = new Map<string, { icon: vscode.ThemeIcon }>();   // key = ActorEntry.id

      mark(actorId: string, icon: vscode.ThemeIcon): vscode.Disposable {
          const entry = { icon };
          this.marks.set(actorId, entry);
          this.refresh();
          return new vscode.Disposable(() => {
              if (this.marks.get(actorId) === entry) {
                  this.marks.delete(actorId);
                  this.refresh();
              }
          });
      }

   ``extension.ts`` wires ``markActor`` to ``actorTreeProvider.mark`` when it builds the API
   object, like ``listActors``. The node rendering reads the mark first
   (``SPEC_ACTOR_TREE``). A mark for an id with no node stays in the map and applies when the
   node appears.

   **Acceptance Criteria:**

   * AC-1: ``markActor`` returns a ``Disposable``; disposing it removes the mark and
     refreshes the tree.
   * AC-2: A second mark on the same id replaces the first; disposing the first
     ``Disposable`` afterwards does not remove the second mark.
   * AC-3: While a mark exists the node's ``iconPath`` is the mark's icon, ahead of the
     activity indicator; nothing else on the node changes.
   * AC-4: The mark does not touch the activity state (``SPEC_ACTOR_ACTIVITY``): once the
     mark is gone the activity indicator shows again if the Actor is Active.
   * AC-5: ``markActor`` is additive: ``version`` stays ``2``, and an add-on checks that the
     member exists before calling it (``REQ_ENG_ACTORMARK`` AC-5).


.. spec:: Heartbeat Job Registration API Surface
   :id: SPEC_ENG_HEARTBEAT_JOBAPI
   :status: approved
   :links: REQ_AUT_JOBREG; REQ_MOD_ADDONS; SPEC_AUT_JOBREG; SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP

   **Description:**
   The engine exposes heartbeat job registration on the public ``JarvisCoreApi``
   so that add-ons can schedule recurring (cron) jobs without knowing the storage
   path or YAML shape. The implementation delegates directly to the existing
   ``HeartbeatScheduler.registerJob()`` / ``unregisterJob()`` methods
   (``SPEC_AUT_JOBREG``) which handle the read-modify-write of
   ``heartbeat.yaml``, in-memory reload, and tree-view refresh.

   **Semantic — persistent, NOT session-scoped:**

   Unlike ``registerTool`` (runtime, session-scoped, returns a ``Disposable``
   disposed on deactivation),
   heartbeat jobs are **persistent**: they live in ``heartbeat.yaml`` and survive
   reloads, restarts, and uninstalls. Therefore:

   * ``registerJob`` performs an **idempotent upsert** (match by ``job.name``)
     and returns ``Promise<void>`` — NOT a session ``Disposable``. Deactivation
     of the calling extension does NOT remove its jobs.
   * ``unregisterJob`` performs an explicit removal by name.
   * The intended usage pattern: an add-on syncs on **configuration change**
     (feature enabled → ``registerJob``; feature disabled → ``unregisterJob``),
     never on extension lifecycle events.
   * Safety net: if an add-on is uninstalled and its command-step target is no
     longer registered, the heartbeat executor soft-skips the step gracefully
     (``SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP``) — no error popup, just a warning
     in the log.

   **API additions to JarvisCoreApi:**

   .. code-block:: typescript

      // Public types (promoted from internal heartbeat module):
      export interface HeartbeatStep { /* see SPEC_ENG_API types block */ }
      export interface HeartbeatJob  { /* see SPEC_ENG_API types block */ }

      // Added to JarvisCoreApi:
      interface JarvisCoreApi {
          // ... existing members unchanged ...

          /**
           * Register or update a heartbeat job (idempotent upsert by name).
           * Persists to heartbeat.yaml immediately. Reloads the scheduler
           * and refreshes the Heartbeat tree view.
           *
           * This is a PERSISTENT operation — the job survives extension
           * deactivation and VS Code restarts. Do NOT call this in
           * activate()/deactivate() — call it on configuration change.
           *
           * Delegates to HeartbeatScheduler.registerJob() (SPEC_AUT_JOBREG).
           */
          registerJob(job: HeartbeatJob): Promise<void>;

          /**
           * Remove a heartbeat job by name. No-op if not found.
           * Persists to heartbeat.yaml immediately.
           *
           * Delegates to HeartbeatScheduler.unregisterJob() (SPEC_AUT_JOBREG).
           */
          unregisterJob(name: string): Promise<void>;

          /**
           * Return all currently persisted heartbeat jobs (snapshot).
           * Includes paused jobs (enabled === false).
           * Reads HeartbeatScheduler.currentJobs.
           */
          listJobs(): HeartbeatJob[];
      }

   **Implementation delegation:**

   The ``JarvisCoreApi`` implementation (the object returned by ``activate()``)
   holds a reference to the ``HeartbeatScheduler`` instance and delegates:

   .. code-block:: typescript

      registerJob: (job) => scheduler.registerJob(job),
      unregisterJob: (name) => scheduler.unregisterJob(name),
      listJobs: () => scheduler.currentJobs,

   No new logic is introduced — these are thin pass-through methods over the
   proven ``SPEC_AUT_JOBREG`` persistence layer.

   **Design rationale:**

   * Promotes ``HeartbeatJob`` / ``HeartbeatStep`` to public types so add-ons
     can construct job definitions without importing engine internals.
   * ``listJobs()`` is included for coherence (mirrors ``getRegisteredTools()``
     — if you can register, you can query). It enables an add-on to check
     whether its job already exists before deciding to sync.

   **Acceptance Criteria:**

   * AC-1: ``registerJob(job)`` persists the job to ``heartbeat.yaml`` via
     ``HeartbeatScheduler.registerJob()`` — idempotent upsert by name.
   * AC-2: ``unregisterJob(name)`` removes the job from ``heartbeat.yaml`` via
     ``HeartbeatScheduler.unregisterJob()`` — no-op if not found.
   * AC-3: ``listJobs()`` returns the scheduler's ``currentJobs`` array
     (all persisted jobs including paused ones).
   * AC-4: Neither ``registerJob`` nor ``unregisterJob`` returns a
     ``Disposable`` — the jobs are persistent across extension lifecycle.
   * AC-5: The existing ``HeartbeatScheduler`` persistence semantics
     (``SPEC_AUT_JOBREG``) are unchanged — the API is a thin delegation.
   * AC-6: An orphaned job whose command step targets an unregistered command
     degrades gracefully via ``SPEC_AUT_HEARTBEAT_COMMAND_SOFTSKIP``.
   * AC-7: ``HeartbeatJob`` and ``HeartbeatStep`` are exported as public types
     from the ``JarvisCoreApi`` contract surface.
