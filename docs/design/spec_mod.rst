Modular Delivery Design Specifications
======================================

.. spec:: Monorepo Layout & Shared Build
   :id: SPEC_MOD_MONOREPO
   :status: approved
   :links: REQ_MOD_CORE; REQ_MOD_ADDONS

   **Description:**
   The repository is an npm-workspaces monorepo producing three extension
   packages plus shared internals. Internal module seams created before the
   physical split match the future package boundaries, so no throwaway structure
   is needed.

   **Target layout:**

   .. code-block:: text

      packages/
        core/        -> enthali.jarvis-core  (engine + session app + shared runtime; marketplace)
        core-gh/     -> enthali.jarvis        (legacy GitHub Releases packaging; no src/)
        pim/         -> enthali.jarvis-pim
        recorder/    -> enthali.jarvis-recorder
        mcp/         -> enthali.jarvis-mcp
        suite/       -> enthali.jarvis-suite  (extension pack)

   **Acceptance Criteria:**

   * AC-1: ``npm run build`` builds all three packages in one invocation.
   * AC-2: Module boundaries (``engine`` / ``apps`` / ``shared``) align with the
     eventual package boundaries.
   * AC-3: Versioning is lockstep across the packages (the concrete version is
     assigned by the Release Manager, not this change).


.. spec:: Core Package
   :id: SPEC_MOD_CORE_PKG
   :status: approved
   :links: REQ_MOD_CORE; REQ_MOD_NOMIGRATION; REQ_MOD_ZEROTRACE

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
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_ENG_TOOLNS

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
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_ENG_TOOLNS

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


.. spec:: Suite Extension Pack
   :id: SPEC_MOD_SUITE
   :status: approved
   :links: REQ_MOD_ADDONS

   **Description:**
   ``enthali.jarvis-suite`` is an extension pack referencing core, PIM,
   recorder, and MCP, offering a one-click "install everything" path. Individual
   extensions remain independently installable.

   **Acceptance Criteria:**

   * AC-1: Installing the pack installs all four extensions.
   * AC-2: Each extension remains independently installable without the pack.
   * AC-3: The build emits the pack alongside the four extension VSIXes.


.. spec:: MCP Package
   :id: SPEC_MOD_MCP_PKG
   :status: approved
   :links: REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_ENG_TOOLREGISTRY

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
   * AC-6: Disabling ``jarvis.mcp.enabled`` at runtime stops the server and
     removes the status bar item.
