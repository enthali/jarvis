Modular Delivery Design Specifications
======================================

.. spec:: Monorepo Layout & Shared Build
   :id: SPEC_MOD_MONOREPO
   :status: approved
   :links: REQ_MOD_CORE; REQ_MOD_ADDONS

   **Description:**
   The repository is an npm-workspaces monorepo producing five extension
   packages plus shared internals (``message-flow-diagram`` CR added
   ``packages/flow`` as the fourth; ``jarvis-syspilot`` CR added
   ``packages/syspilot`` as the fifth). Internal module seams created before
   the physical split match the future package boundaries, so no throwaway
   structure is needed.

   **Target layout:**

   .. code-block:: text

      packages/
        core/        -> enthali.jarvis-core  (engine + session app + shared runtime; marketplace)
        core-gh/     -> enthali.jarvis        (legacy GitHub Releases packaging; no src/)
        pim/         -> enthali.jarvis-pim
        recorder/    -> enthali.jarvis-recorder
        mcp/         -> enthali.jarvis-mcp
        flow/        -> enthali.jarvis-flow
        syspilot/    -> enthali.jarvis-syspilot
        suite/       -> enthali.jarvis-suite  (extension pack)

   **Acceptance Criteria:**

   * AC-1: ``npm run build`` builds all packages in one invocation.
   * AC-2: Module boundaries (``engine`` / ``apps`` / ``shared``) align with the
     eventual package boundaries.
   * AC-3: Versioning is lockstep across the packages (the concrete version is
     assigned by the Release Manager, not this change).


.. spec:: Core Package
   :id: SPEC_MOD_CORE_PKG
   :status: approved
   :links: REQ_MOD_CORE; REQ_MOD_NOMIGRATION; REQ_MOD_ZEROTRACE; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/core`` builds the ``enthali.jarvis-core`` extension — the primary
   marketplace identity. Its ``package.json`` contributes only core surfaces
   (sessions view, messaging, reminders, heartbeat, core settings, core commands,
   core tools) and exports ``JarvisCoreApi``.

   ``packages/core-gh`` is a thin packaging-only companion that produces the
   legacy ``enthali.jarvis`` VSIX for GitHub Releases, sharing the same compiled
   bundle from ``packages/core/out/``. It has no ``src/`` of its own.
   See ``SPEC_REL_COREGH`` for the packaging mechanism.

   Add-ons obtain the engine API via:
   ``vscode.extensions.getExtension('enthali.jarvis-core')!.exports``

   **Acceptance Criteria:**

   * AC-1: The marketplace published id is ``enthali.jarvis-core``.
   * AC-2: ``contributes`` in the core manifest contains no PIM or recorder
     views, settings, commands, or tools.
   * AC-3: Settings keep their existing ``jarvis.*`` keys.
   * AC-4: ``activate()`` returns ``JarvisCoreApi`` (per ``SPEC_ENG_API``).
   * AC-5: ``packages/core-gh/package.json`` name is ``jarvis`` (id ``enthali.jarvis``);
     its ``out/extension.js`` is a CI copy of ``packages/core/out/extension.js``.


.. spec:: PIM Package
   :id: SPEC_MOD_PIM_PKG
   :status: approved
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_ENG_TOOLNS; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/pim`` builds ``enthali.jarvis-pim`` with
   ``extensionDependencies: ["enthali.jarvis-core"]``. On activation it obtains the
   engine and registers the ``project`` and ``event`` kinds plus PIM tools
   (``jarvis_pim_*``). All PIM views, settings, commands, and tools live in this
   manifest only.

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: PIM registers ``project`` and ``event`` kinds via
     ``registerEntityKind`` and PIM tools via ``registerTool``.
   * AC-3: PIM settings use existing ``jarvis.*`` keys (e.g.
     ``jarvis.projects.folder``).
   * AC-4: When PIM is not installed, none of its contributions exist (per
     ``REQ_MOD_ZEROTRACE``).


.. spec:: Recorder Package
   :id: SPEC_MOD_REC_PKG
   :status: approved
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_ENG_TOOLNS; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/recorder`` builds ``enthali.jarvis-recorder`` with
   ``extensionDependencies: ["enthali.jarvis-core"]``. It contributes recording
   commands/settings/tools (``jarvis_rec_*``) and the whisper/transcript
   pipeline. The recorder works with whatever entity kinds are present (it does
   not require PIM).

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: Recorder tools use the ``jarvis_rec_`` infix.
   * AC-3: Recording functions with core alone (no PIM dependency).
   * AC-4: When the recorder is not installed, none of its contributions exist.


.. spec:: Flow Package
   :id: SPEC_MOD_FLOW_PKG
   :status: draft
   :links: REQ_FLOW_PACKAGE; REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/flow`` builds ``enthali.jarvis-flow`` with
   ``extensionDependencies: ["enthali.jarvis-core"]``. On activation it
   contributes a title-bar button to the core's existing ``jarvisMessages``
   tree view (via a ``menus`` contribution keyed to that view id, not by
   modifying the core's manifest) and a Webview Panel command. It reads
   ``message-log.json`` directly from the workspace — it registers no new
   engine tools and does not require PIM or the recorder.

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: The ``jarvis.openMessageFlow`` command and its title-bar button
     are contributed entirely from this package's ``package.json``.
   * AC-3: Functions with core alone (no PIM/recorder dependency).
   * AC-4: When not installed, none of its contributions exist (per
     ``REQ_MOD_ZEROTRACE`` AC-6).


.. spec:: Suite Extension Pack (Deprecated)
   :id: SPEC_MOD_SUITE
   :status: deprecated
   :links: REQ_MOD_ADDONS

   **Description:**
   ``enthali.jarvis-suite`` is **deprecated**. It was an extension pack
   referencing core, PIM, recorder, MCP, and flow — offering a one-click
   "install everything" path. Now that Jarvis spans genuinely different
   audiences (personal-assistant users vs. software-engineering teams),
   a single "install all" pack no longer makes sense.

   Users should install individual components instead. No further add-ons
   (including syspilot) SHALL be added to the pack.

   **Acceptance Criteria:**

   * AC-1: ``packages/suite/package.json`` description and
     ``packages/suite/README.md`` clearly state the pack is deprecated
     and direct users to install components individually.
   * AC-2: No new extensions are added to the pack’s
     ``extensionPack`` array.
   * AC-3: The pack remains publishable for existing users but receives
     no further functional updates.


.. spec:: MCP Package
   :id: SPEC_MOD_MCP_PKG
   :status: approved
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_ENG_TOOLREGISTRY; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/mcp`` builds ``enthali.jarvis-mcp`` with
   ``extensionDependencies: ["enthali.jarvis-core"]``. On activation it obtains the
   engine, enumerates registered tools via ``getRegisteredTools()``, and serves
   them over the MCP protocol on ``127.0.0.1`` using
   ``@modelcontextprotocol/sdk``. It registers NO ``jarvis_`` tools of its own
   — it is a transport layer re-exposing others' tools.

   **Behaviour:**

   * On activation, reads ``jarvis.mcp.enabled`` (default ``false``) and
     ``jarvis.mcpPort`` (default ``31415``) from workspace configuration.
   * If ``jarvis.mcp.enabled`` is ``false``, the extension activates silently
     and does nothing (no port binding, no status bar).
   * If enabled, calls ``api.getRegisteredTools()`` to discover all tools,
     translates each ``ToolDescriptor`` into an MCP tool definition, and
     starts the MCP HTTP server.
   * MCP tool invocations are delegated to ``api.invokeTool(name, options,
     token)``.
   * Listens for tool registry changes: periodically (or on an event if the
     engine provides one in a future version) re-enumerates tools so
     dynamically registered/disposed tools are reflected on the MCP surface.
   * On deactivation, gracefully shuts down the HTTP server.
   * Owns the ``jarvis.mcp.enabled`` and ``jarvis.mcpPort`` settings
     contributions in its own ``package.json`` (moved from core's manifest).
   * Shows a status bar item ``Jarvis MCP: <port>`` when running.
   * The ``@modelcontextprotocol/sdk`` and ``zod`` dependencies move from core's
     ``package.json`` to MCP's ``package.json``.

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: When the MCP extension is not installed, no MCP surface exists
     anywhere (per ``REQ_MOD_ZEROTRACE``): no ``jarvis.mcp.*`` settings, no
     status bar item, no port binding.
   * AC-3: When installed and enabled, all tools from all installed extensions
     are exposed over MCP (verified by ``tools/list`` MCP call returning every
     tool from ``getRegisteredTools()``).
   * AC-4: MCP tool invocations produce the same results as language-model tool
     invocations (same handler, same output).
   * AC-5: The MCP extension registers zero ``jarvis_*`` tools via
     ``registerTool`` — it is purely a consumer of the registry.


.. spec:: Syspilot Package
   :id: SPEC_MOD_SPL_PKG
   :status: draft
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; SPEC_SPL_PACKAGE; SPEC_REL_PKGCONTRACT

   **Description:**
   ``packages/syspilot`` builds ``enthali.jarvis-syspilot`` with
   ``extensionDependencies: ["enthali.jarvis-core"]``. On activation it obtains
   the core API, performs a startup version check against the pinned upstream
   syspilot release tag, and registers commands and LM tools for suspend/skip
   management. It does not register entity kinds — it uses the existing actor
   framework via ``invokeTool('jarvis_createActor', ...)`` and
   ``listJarvisSessions()``.

   See ``SPEC_SPL_PACKAGE`` and related ``SPEC_SPL_*`` specs for the full
   feature design.

   **Acceptance Criteria:**

   * AC-1: Manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``.
   * AC-2: ``contributes.commands`` includes ``jarvis.syspilotUpdate``,
     ``jarvis.delaySyspilotUpdate``, and ``jarvis.SyspilotSkipThisVersion``.
   * AC-3: ``contributes.configuration`` includes ``jarvis.syspilot.releaseTag``
     (string, default ``"main"``).
   * AC-4: When not installed, no syspilot-related commands, settings, or tools
     appear anywhere (per ``REQ_MOD_ZEROTRACE``).


.. spec:: Add-on Onboarding Checklist
   :id: SPEC_MOD_ADDON_ONBOARDING
   :status: draft
   :links: REQ_MOD_ADDONS

   **Description:**
   When a new add-on package is introduced under ``packages/<name>``, all of
   the following registration points SHALL be verified before the design phase
   is closed. This checklist exists because previous releases shipped with
   incomplete add-on wiring (e.g. ``jarvis-flow`` was once missing from the
   self-update VSIX mapping; ``jarvis-syspilot`` was missing from the CI
   release pipeline).

   **Checklist items:**

   1. **Release CI** (``SPEC_REL_COREGH``): The add-on appears in the
      "Complete release.yml CI sequence" — a ``vsce package`` step in step 4,
      its VSIX listed in step 5 (GitHub Release upload), and a Marketplace
      publish step in step 6.
   2. **Self-update VSIX mapping — requirement** (``REQ_REL_UPDATEINSTALL``):
      The add-on's extension ID → VSIX filename row is present in the
      mapping table.
   3. **Self-update VSIX mapping — design** (``SPEC_REL_UPDATENOTIFY``):
      The add-on's extension ID → VSIX filename row is present in the
      design-level mapping table.
   4. **Self-update code** (``packages/core/src/engine/core/updateCheck.ts``):
      The ``idToVsix`` map includes the add-on's extension ID.
   5. **Add-on registry requirement** (``REQ_MOD_ADDONS``): A new AC is
      added for the add-on, following the established pattern (AC-1 through
      AC-7).
   6. **Monorepo layout** (``SPEC_MOD_MONOREPO``): The package appears in
      the "Target layout" code block and the description's package count
      is updated.

   **Process integration:**

   * ``REQ_MOD_ADDONS`` links to this spec, so any CR that touches
     ``REQ_MOD_ADDONS`` (which every add-on CR must) naturally surfaces the
     checklist.
   * The System Designer's agent tailoring file
     (``.github/agents/syspilot.design.tailoring.md``) SHALL include a
     preflight rule: when a CR introduces a new ``packages/<name>``
     add-on extension, the System Designer reads
     ``SPEC_MOD_ADDON_ONBOARDING`` and verifies every checklist item
     before closing the design phase.

   **Acceptance Criteria:**

   * AC-1: Every item in the checklist above is satisfied for all
     currently shipped add-ons (pim, recorder, mcp, flow, syspilot).
   * AC-2: The checklist is referenced from ``REQ_MOD_ADDONS`` via
     ``:links:`` so it is discoverable in the traceability graph.
