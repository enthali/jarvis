Engine Design Specifications
============================

.. spec:: JarvisCoreApi Contract & Types
   :id: SPEC_ENG_API
   :status: approved
   :links: REQ_ENG_CONTRACT; REQ_ENG_SCANNER

   **Description:**
   The core extension exposes a versioned ``JarvisCoreApi`` as the return value
   of its ``activate()`` function. Add-ons obtain it cross-extension via
   ``vscode.extensions.getExtension('enthali.jarvis').exports`` (their
   ``extensionDependencies`` on the core guarantees the core is active first).

   **Types:**

   .. code-block:: typescript

      // --- Scanner types (promoted to public API surface) ---

      /**
       * A single scanned entity. Returned by ``getEntity()``; the fields
       * are populated by the YAML scanner from entity files.
       */
      export interface EntityEntry {
          name: string;
          summary?: string;
          agent?: string;
          datesStart?: string;
          datesEnd?: string;
          kind?: 'project' | 'event' | 'session';
          folder?: string;
      }

      /**
       * A flat, public-API view of a single scanned entity, used by
       * ``listJarvisSessions()``. Optional source fields are normalised to
       * empty strings so the shape matches ``jarvis_listActors`` /
       * ``jarvis_listProjects``.
       */
      export interface JarvisSession {
          name: string;
          summary: string;
          agent: string;
          kind: string;
          folder: string;
      }

      export interface FolderNode {
          kind: 'folder';
          name: string;
          children: TreeNode[];
      }

      export interface LeafNode {
          kind: 'leaf';
          id: string;
      }

      /** A node in the scanned tree. Returned by ``getTreeForKind()``. */
      export type TreeNode = FolderNode | LeafNode;

      // --- Registration & rendering types ---

      /**
       * A recursive subtree node descriptor returned by a children provider.
       * Each node may itself have children, enabling arbitrary-depth trees
       * below an entity leaf (e.g. entity → taskGroup → taskLeaf).
       */
      export interface SubtreeNode {
          /** Unique id for this node (e.g. task URI string, group id). */
          id: string;
          /** Display label (may include counts, e.g. "Uncategorized (3)"). */
          label: string;
          /** Optional tooltip. */
          tooltip?: string;
          /** Command to execute on click (default: none). */
          command?: vscode.Command;
          /** contextValue for when-clause scoping (default: derived from kind + 'Child'). */
          contextValue?: string;
          /**
           * Collapsible state for this node.
           * - 'collapsed' → TreeItemCollapsibleState.Collapsed
           * - 'expanded' → TreeItemCollapsibleState.Expanded
           * - 'none' (default if omitted) → TreeItemCollapsibleState.None (leaf)
           */
          collapsibleState?: 'collapsed' | 'expanded' | 'none';
          /** Icon for this node (ThemeIcon, Uri, or {light, dark} pair). */
          iconPath?: vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri };
          /** Child nodes (recursive). Empty or omitted → leaf node. */
          children?: SubtreeNode[];
      }

      export interface EntityKindConfig {
          /** Stable kind discriminator, e.g. 'session' | 'project' | 'event'. */
          kind: string;
          /** View id declared in the OWNING extension's package.json. */
          viewId: string;
          /** Settings key holding this kind's scan folder (read by the engine). */
          folderSettingKey: string;
          /** Display-label factory for tree items of this kind. */
          label(name: string, entity?: { data: Record<string, unknown> }): string;

          // --- Optional tree-rendering hooks (S5 generalization) ---

          /**
           * Return a subtree of nodes for an entity.
           * If omitted or returns empty/undefined, the entity renders as a flat
           * leaf (CollapsibleState.None) — session-compatible default.
           * If non-empty, the entity renders as CollapsibleState.Collapsed
           * (the user expands it on demand).
           * Subtree nodes are recursive — a node with its own children array
           * renders as a parent at arbitrary depth.
           */
          getChildren?(entity: { name: string; filePath: string; data: Record<string, unknown> }): SubtreeNode[] | undefined;

          /**
           * Command to execute on single-click of an entity leaf node.
           * Receives the TreeNode representing the entity.
           * Default (if omitted): { command: 'jarvis.openAgentSession', title: 'Open', arguments: [node] }
           */
          leafCommand?(node: TreeNode): vscode.Command;

          /**
           * Tooltip for an entity leaf node.
           * Default (if omitted): entity.summary (the YAML summary field).
           */
          leafTooltip?(entity: { name: string; summary?: string; data: Record<string, unknown> }): string | vscode.MarkdownString | undefined;
      }

      export type ToolHandler = (
          options: vscode.LanguageModelToolInvocationOptions<unknown>,
          token: vscode.CancellationToken
      ) => Promise<vscode.LanguageModelToolResult>;

      /**
       * Decorator for tree items of a registered entity kind.
       * Called after the engine builds a base TreeItem; may mutate it in place
       * (e.g. append a task-count badge, change the icon for active recording).
       */
      export interface TreeItemDecorator {
          decorate(item: vscode.TreeItem, node: TreeNode, kind: string): void;
      }

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
          /** Contract version — add-ons MUST check before using newer fields. */
          readonly version: 1;
          registerEntityKind(config: EntityKindConfig): vscode.Disposable;
          registerTool(name: string, description: string, handler: ToolHandler): vscode.Disposable;
          /**
           * Register a decorator for tree items of the given kind.
           * This is THE documented extension point referenced by
           * SPEC_ENG_TREEFACTORY AC-3. Supports two use cases:
           * (a) a kind decorating its own items (e.g. PIM task badge);
           * (b) an add-on decorating another extension's kind
           *     (e.g. recorder highlighting the actively-recording
           *     project/event node).
           * Returns a Disposable that removes the decorator.
           */
          registerDecorator(kind: string, decorator: TreeItemDecorator): vscode.Disposable;

          // --- Scanner query surface (SPEC_ENG_SCANNER) ---
          // Add-ons query the engine's central scanner; they never
          // run their own scanner (AD-3).

          /**
           * Return the scanned tree for a registered kind.
           * The result is the scanner's current in-memory tree — a list of
           * ``FolderNode`` / ``LeafNode`` entries. Returns ``[]`` if the
           * kind is not registered or the folder is empty.
           */
          getTreeForKind(kind: string): TreeNode[];
          /**
           * Look up a single entity by its id (the entity's YAML file path).
           * Returns ``undefined`` if the id is not in the scanner cache.
           */
          getEntity(id: string): EntityEntry | undefined;

          /**
           * Return every entity currently held by the central scanner, across
           * all registered kinds, as a flat ``JarvisSession[]``. This publishes
           * the scanner's existing cross-kind list (no new scan, no per-add-on
           * coupling). Optional source fields (``summary``, ``agent``) are
           * normalised to empty strings. See ``SPEC_ENG_SESSIONLIST``.
           */
          listJarvisSessions(): JarvisSession[];
          /**
           * Trigger a full rescan of all registered kinds. The returned
           * promise resolves when the scan is complete and tree views have
           * been refreshed. Add-ons call this after creating or modifying
           * an entity file so subsequent queries reflect the change.
           */
          rescan(): Promise<void>;

          /**
           * Request a lightweight re-render of a registered kind's tree view
           * (fires the tree's onDidChangeTreeData event). Does NOT re-scan
           * the filesystem — use this after an add-on's decoration state
           * changed (e.g. recording started/stopped) so decorators produce
           * updated output. No-op if the kind is not registered.
           */
          refreshKind(kind: string): void;

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
      }

   **Acceptance Criteria:**

   * AC-1: ``activate()`` returns a value structurally implementing
     ``JarvisCoreApi``.
   * AC-2: ``version`` is the literal ``1``; add-ons that read it can branch on
     future versions.
   * AC-3: The interface is the single published surface; the engine exposes no
     other globals to add-ons.
   * AC-4: ``getTreeForKind(kind)`` returns the scanner's current tree for
     that kind (empty array if not registered). ``getEntity(id)`` returns the
     entity or ``undefined``. Both are read-only views of the central
     scanner's cache — no per-add-on scanner.
   * AC-4a: ``listJarvisSessions()`` returns one ``JarvisSession`` per scanned
     entity across all registered kinds, derived read-only from the scanner's
     cache (no filesystem scan). Optional fields are normalised to empty strings.
     See ``SPEC_ENG_SESSIONLIST``.
   * AC-5: ``rescan()`` triggers a full re-scan of all registered kinds and
     resolves when done; tree views are refreshed.
   * AC-5a: ``refreshKind(kind)`` fires the tree's change event for the given
     kind without re-scanning the filesystem. It is a no-op if the kind is not
     registered. This is the public way for a decoration contributor to request
     re-render after its decoration state changes (see ``SPEC_ENG_TREEFACTORY``
     AC-3 / ``registerDecorator``).
   * AC-6: ``getRegisteredTools()`` and ``invokeTool()`` provide read-only
     access to the tool registry (see ``SPEC_ENG_TOOLREGISTRY``).
   * AC-7: ``registerJob(job)`` persists a heartbeat job (idempotent upsert by
     name); ``unregisterJob(name)`` removes it; ``listJobs()`` returns the
     current persisted set. These are PERSISTENT operations — they write to
     ``heartbeat.yaml`` and survive deactivation/restarts. They do NOT return
     ``Disposable`` (see ``SPEC_ENG_HEARTBEAT_JOBAPI``).


.. spec:: registerEntityKind Semantics
   :id: SPEC_ENG_REGISTER_KIND
   :status: approved
   :links: REQ_ENG_CONTRACT; REQ_ENG_SCANNER

   **Description:**
   ``registerEntityKind(config)`` plugs a kind into the engine: it adds the kind
   to the generic scanner's scan set (keyed by ``config.folderSettingKey``),
   registers the kind's tree view against ``config.viewId``, and makes the kind
   available to the generic tree-provider factory. It returns a ``Disposable``
   that reverses all of the above.

   **Behaviour:**

   * The engine holds no compile-time knowledge of any concrete kind; the
     ``session`` kind is registered through this same hook at core activation
     (reference application — no special-case branch).
   * Disposing the returned ``Disposable`` removes the kind's scan folder, tree
     view, and any tools the kind registered, with no residual surface.

   **Acceptance Criteria:**

   * AC-1: After registration, the kind's entities appear in the scanner output
     and its tree view renders.
   * AC-2: Disposal removes the tree view and the kind's scan folder at runtime
     (no reload).
   * AC-3: The ``session`` kind is registered via this hook; grepping the engine
     reveals no ``'session'``-specific branch in scanner or tree code.


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


.. spec:: Generic Scanner
   :id: SPEC_ENG_SCANNER
   :status: approved
   :links: REQ_ENG_SCANNER

   **Description:**
   The core owns one scanner that enumerates entities for every registered kind.
   For each kind it resolves the scan folder from ``config.folderSettingKey``
   (the ``session`` kind resolves to its fixed ``.jarvis/sessions/`` path through
   the same lookup), discovers leaf entities, and parses their YAML. There is no
   per-add-on scanner.

   **Scan algorithm (convention-file model):** for each registered kind's
   folder, the scanner reads directory entries recursively. For each
   subdirectory: (1) if the kind's convention file (e.g. ``project.yaml``,
   ``event.yaml``, ``session.yaml``) exists and parses with a valid ``name``,
   emit a leaf entity keyed by the convention file's absolute path and do not
   descend further; (2) if the convention file exists but is unparseable or
   missing ``name``, still emit a leaf entity with ``name`` falling back to
   the folder name; (3) if no convention file exists, recurse into the
   subdirectory as a grouping node (folder nodes with no leaf descendants are
   omitted). Non-convention YAML files and other file types are ignored.

   **Sort order:** after building each directory level, nodes are sorted
   alphabetically (case-insensitive, ``localeCompare``) before being returned.
   Folders and leaves are interleaved in one sorted list per level (not
   grouped separately). The default leaf sort key is the entity's ``name``
   field (folder-name fallback if unresolved). A kind MAY override the sort
   key via ``EntityKindConfig`` (e.g. Event nodes sort by
   ``(entity.datesStart ?? '') + name`` so dated events sort chronologically
   and undated events sort last, since ``YYYY-MM-DD`` is lexicographically
   sortable) — see ``SPEC_EVT_LISTEVENTS`` / ``REQ_EVT_DATESORT`` for the
   Event-specific sort-key rule.

   **Change detection:** after each scan, the scanner compares the new tree
   structure AND the new entity data map against the cached versions. The
   entity-map comparison converts each map to a sorted array of
   ``[key, JSON.stringify(value)]`` pairs and compares the resulting
   strings — this ensures a YAML content edit (e.g. renaming an entity or
   changing a date) triggers a cache update even when the tree's
   folder/leaf structure is unchanged. The scanner fires its change
   notification only when a difference is detected in either structure or
   entity data.

   **Acceptance Criteria:**

   * AC-1: The scanner's kind set is exactly the set of currently registered
     kinds.
   * AC-2: Adding/disposing a kind updates the scan set without a reload.
   * AC-3: Each kind's folder is read from its ``folderSettingKey`` setting; the
     scanner contains no hard-coded per-kind folder logic.
   * AC-4: Nodes at each tree level are sorted alphabetically (case-insensitive)
     by default; folders and leaves are interleaved in one sorted list, not
     grouped separately. A kind MAY override the leaf sort key.
   * AC-5: A cache update (change notification) fires when either the tree
     structure or any entity's data (per the sorted-JSON entity-map
     comparison) differs from the previous scan — a YAML content edit alone
     (no structural change) SHALL trigger an update.


.. spec:: Generic Tree-Provider Factory
   :id: SPEC_ENG_TREEFACTORY
   :status: approved
   :links: REQ_ENG_TREEFACTORY

   **Description:**
   The engine provides one generic ``TreeDataProvider`` driven by registered
   kinds, replacing the three near-identical per-kind providers. Tree items are
   rendered entirely from each kind's ``EntityKindConfig`` hooks — children
   structure, click command, tooltip, and label — with no concrete-kind knowledge
   in the engine. Add-ons may decorate their own kind's items (e.g. PIM task
   counts, recorder active-recording highlight) without the engine knowing the
   decoration.

   **Rendering behaviour:**

   * **Entity collapsibility:** If ``config.getChildren`` is provided AND
     returns a non-empty array for an entity, that entity's leaf renders with
     ``CollapsibleState.Collapsed`` (user expands on demand). Otherwise the leaf
     renders with ``CollapsibleState.None`` (flat leaf — session-compatible
     default). The entity is **never** rendered ``Expanded``.
   * **Recursive subtree:** Each ``SubtreeNode`` returned by ``getChildren`` is
     rendered as a tree item. If a ``SubtreeNode`` itself has a non-empty
     ``children`` array, it renders as a parent node (its ``collapsibleState``
     property controls the collapse state); otherwise it renders as a leaf
     (``None``). Nesting is recursive to arbitrary depth.
   * **Per-node rendering:** Each ``SubtreeNode`` carries its own ``label``,
     ``tooltip``, ``command``, ``contextValue``, ``iconPath``, and
     ``collapsibleState``. The engine maps ``collapsibleState`` strings
     (``'collapsed'`` / ``'expanded'`` / ``'none'``) to VS Code
     ``TreeItemCollapsibleState`` values. If ``iconPath`` is set, it is applied
     to the ``TreeItem.iconPath``.
   * **Label:** The factory calls ``config.label(name, { data })`` passing the
     entity's parsed data as the optional second argument, so a kind can format
     the leaf label from entity fields (e.g. an event date prefix).
   * **Click command:** The entity leaf's ``TreeItem.command`` is set from
     ``config.leafCommand(node)`` if provided; otherwise it defaults to
     ``{ command: 'jarvis.openAgentSession', title: 'Open', arguments: [node] }``.
     Subtree nodes use their own ``command`` property (no default).
   * **Tooltip:** The entity leaf's tooltip is set from
     ``config.leafTooltip(entity)`` if provided; otherwise it defaults to
     ``entity.summary``.
   * **contextValue:** Derived uniformly from the kind discriminator for entity
     leaves. Subtree nodes use their ``SubtreeNode.contextValue`` if set,
     otherwise ``jarvis<Kind>Child``.
   * **Decorators:** Applied after the above, on entity leaves only, via
     ``JarvisCoreApi.registerDecorator`` (see ``SPEC_ENG_API``). The PIM
     extension uses this to apply the task-count badge; the recorder will use
     it in S6 to highlight the actively-recording project/event node.

   **Acceptance Criteria:**

   * AC-1: All registered kinds render through the one factory; no per-kind
     provider class remains.
   * AC-2: ``contextValue`` is derived uniformly from the kind discriminator
     for entity leaves.
   * AC-3: An add-on can contribute item decoration via
     ``JarvisCoreApi.registerDecorator(kind, decorator)`` without modifying
     engine code. Two patterns are supported: (a) a kind decorating its own
     items (e.g. PIM task-count badge on project/event nodes), and (b) an
     add-on decorating another extension's kind (e.g. the recorder
     highlighting the actively-recording project/event node).
     After a decorator's underlying state changes, the contributor calls
     ``JarvisCoreApi.refreshKind(kind)`` (see ``SPEC_ENG_API`` AC-5a) to
     trigger re-render — this fires the tree's change event without
     rescanning the filesystem.
   * AC-4: A kind registered WITHOUT ``getChildren``/``leafCommand``/``leafTooltip``
     renders identically to the S4a session behaviour (flat leaves, click opens
     agent session, tooltip = summary, ``CollapsibleState.None``).
     **Session-compatibility invariant.**
   * AC-5: A kind registered WITH ``getChildren`` returning a non-empty
     ``SubtreeNode[]`` renders the entity leaf as ``Collapsed``. The subtree
     nodes appear as children when expanded, each with their declared
     ``collapsibleState``, ``iconPath``, ``command``, and ``contextValue``.
     Recursion works: a subtree node with its own ``children`` renders as a
     parent whose children are likewise rendered.
   * AC-6: A kind registered WITH ``leafCommand`` uses that command on entity
     leaf click instead of the default ``jarvis.openAgentSession``.
   * AC-7: A subtree node with ``iconPath`` set (e.g. ``ThemeIcon('warning')``)
     renders with that icon on its ``TreeItem``.


.. spec:: Tool Registry Exposure Surface
   :id: SPEC_ENG_TOOLREGISTRY
   :status: approved
   :links: REQ_ENG_TOOLREGISTRY

   **Description:**
   The engine exposes a read-only enumeration and invocation surface over the
   aggregate tool registry so that a consumer extension (e.g. the MCP transport)
   can discover and invoke ALL tools registered by any extension — without
   reaching into engine internals. This is a purely additive extension of
   ``JarvisCoreApi`` (``version`` stays ``1``).

   **API additions to JarvisCoreApi:**

   .. code-block:: typescript

      /** Descriptor returned by getRegisteredTools(). */
      export interface ToolDescriptor {
          /** Tool name (e.g. 'jarvis_listActors', 'jarvis_pim_listProjects'). */
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
           * @param name - Exact tool name (e.g. 'jarvis_pim_listProjects').
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
     ``registerEntityKind``, handler signatures, or disposal semantics — the
     existing contract is byte-identical.
   * ``version`` remains ``1`` because the additions are backward-compatible: an
     existing add-on that does not call these methods works unchanged.

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
   * AC-6: The existing ``registerTool`` / ``registerEntityKind`` / disposal
     semantics are unchanged (no breaking modification to the validated
     contract).


.. spec:: Platform Session List API
   :id: SPEC_ENG_SESSIONLIST
   :status: draft
   :links: REQ_ENG_SESSIONLIST

   **Description:**
   ``JarvisCoreApi.listJarvisSessions()`` publishes the central scanner's existing
   cross-kind entity list as a flat ``JarvisSession[]``. The scanner already holds
   every entity of every registered kind (``yamlScanner.entities``); this method is
   a thin, read-only projection of that data — **no** new scanner, provider, or
   registry is introduced.

   **Implementation:**

   The engine's ``coreApi`` delegates to the scanner's existing ``entities``
   getter and maps each entry to the public ``JarvisSession`` shape, normalising
   optional fields to empty strings:

   .. code-block:: typescript

      // In coreApi.ts — JarvisCoreApi implementation
      listJarvisSessions(): JarvisSession[] {
          return this._scanner.entities.map(e => ({
              name: e.name,
              summary: e.summary ?? '',
              agent: e.agent ?? '',
              kind: e.kind,
              folder: e.folder,
          }));
      }

   The ``scanner.entities`` getter (already present in ``yamlScanner.ts``) returns
   every entity across all registered kinds; ``listJarvisSessions()`` adds only the
   shape normalisation.

   **Design rationale:**

   * **Publishes, does not rebuild** — the scanner is the single source of truth
     and already enumerates all kinds to build the tree views. This method simply
     exposes that list; it never triggers a filesystem scan.
   * **No opt-in marker** — every scanned entity is by construction a Jarvis
     session: a kind only appears in the scanner if it registered a scan folder
     and its convention YAML was found. A non-session capability (e.g. a recorder
     recording) is simply not scanned as an entity and therefore never appears.
   * **Shape parity** — the ``{name, summary, agent, kind, folder}`` shape matches
     the existing ``jarvis_listActors`` / ``jarvis_listProjects`` output (plus
     ``kind`` to distinguish), so consumers see a consistent contract.
   * **Additive** — ``version`` stays ``1``; no existing API method changes.

   **Acceptance Criteria:**

   * AC-1: ``listJarvisSessions()`` returns one ``JarvisSession`` per entity in
     ``scanner.entities`` across all registered kinds.
   * AC-2: Each result carries ``{name, summary, agent, kind, folder}`` with
     ``summary`` and ``agent`` normalised to ``''`` when absent in the source YAML.
   * AC-3: The method performs no filesystem scan — it reads the scanner cache only.
   * AC-4: When the scanner holds no entities, the method returns ``[]``.
   * AC-5: The addition is purely additive — no existing ``JarvisCoreApi`` method
     is modified.


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

   Unlike ``registerEntityKind`` / ``registerTool`` / ``registerDecorator``
   (runtime, session-scoped, return a ``Disposable`` disposed on deactivation),
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

   **API additions to JarvisCoreApi** (``version`` stays ``1``):

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

   * Promotes ``HeartbeatJob`` / ``HeartbeatStep`` to public types (alongside
     ``TreeNode``, ``EntityEntry``, ``SubtreeNode``) so add-ons can construct
     job definitions without importing engine internals.
   * ``listJobs()`` is included for coherence (mirrors ``getRegisteredTools()``
     — if you can register, you can query). It enables an add-on to check
     whether its job already exists before deciding to sync.
   * ``version`` remains ``1`` — the additions are backward-compatible; an
     existing add-on that does not call these methods works unchanged.

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
