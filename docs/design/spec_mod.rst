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
   * AC-6 (``module-skill-provisioning`` CR): ``JarvisCoreApi`` exposes
     ``provisionModuleAssets`` so any add-on can self-install its bundled Copilot
     assets — see ``SPEC_MOD_SKILL_PROVISION``.


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
   the message audit log directly from the workspace — it registers no new
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


.. spec:: Module Asset Provisioning Helper
   :id: SPEC_MOD_SKILL_PROVISION
   :status: approved
   :links: REQ_MOD_SKILL_PROVISION; REQ_MOD_SKILL_OPTOUT; SPEC_ENG_API

   **Description:**
   ``packages/core/src/engine/core/assetProvisioning.ts`` implements
   ``provisionModuleAssets``, exposed on ``JarvisCoreApi`` (``SPEC_ENG_API``
   AC-9). A module calls it fire-and-forget from ``activate()`` with its own
   ``ExtensionContext`` and a namespace; the helper copies the module's
   VSIX-bundled Copilot assets into the workspace, removes the module's own
   stale assets, and records what it wrote.

   The helper is reached only through ``JarvisCoreApi`` — add-ons ship as
   separate VSIXs and cannot import core's compiled code directly.

   **Bundling contract:**

   Assets live under ``packages/<name>/assets/`` — **not** under the package's
   ``.github/``, which every add-on ``.vscodeignore`` excludes:

   .. code-block:: text

      packages/<name>/
        assets/
          skills/
            <namespace>.<slug>/          -> .github/skills/<namespace>.<slug>/
              SKILL.md
              scripts/...                 (subfolders copied recursively)
          instructions/
            <namespace>.<slug>.instructions.md
                                          -> .github/instructions/<same name>

   The module's ``.vscodeignore`` SHALL NOT exclude ``assets/**``. The module
   resolves source paths via ``context.asAbsolutePath('assets/skills')``.

   **Config type:**

   .. code-block:: typescript

      export interface ModuleAssetConfig {
          /** Required name prefix for every asset this module provisions,
           *  e.g. 'jarvis-kanban'. Also scopes the workspaceState key. */
          namespace: string;
          /** Absolute path to the bundled skills folder. Omit if none. */
          skillsSourceDir?: string;
          /** Absolute path to the bundled instructions folder. Omit if none. */
          instructionsSourceDir?: string;
          /** Default true. False de-provisions — see SPEC_MOD_SKILL_MANIFEST. */
          enabled?: boolean;
      }

   **Call site (module side):**

   .. code-block:: typescript

      // in the module's activate()
      void api.provisionModuleAssets(context, {
          namespace: 'jarvis-kanban',
          skillsSourceDir: context.asAbsolutePath('assets/skills'),
          instructionsSourceDir: context.asAbsolutePath('assets/instructions'),
          // enabled omitted -> assets are functionally required, no user opt-out
      });

   **Algorithm:**

   1. Resolve the workspace root via ``getWorkspaceRoot()``
      (``REQ_CFG_PATHSINGLESOURCE``). If undefined, log a warning and return.
   2. If ``enabled === false``, run the de-provision path
      (``SPEC_MOD_SKILL_MANIFEST``) and return.
   3. **Enumerate** the bundle: immediate subdirectories of ``skillsSourceDir``
      and immediate files of ``instructionsSourceDir``. A missing source
      directory yields an empty list — not an error.
   4. **Validate** each entry's name starts with ``<namespace>.``. On violation,
      log a warning naming the offending entry and exclude it — it is never
      written. This makes the manifest's namespace guarantee structural rather
      than conventional.
   5. **Write** each valid entry to its target directory, creating parent
      directories as needed. A file is written only if it is absent or its
      bytes differ from the bundled file. Skill folders are copied recursively;
      each contained file is compared individually.
   6. **Clean up** orphans and **persist** the manifest
      (``SPEC_MOD_SKILL_MANIFEST``).

   **Failure handling:**
   Every filesystem operation is wrapped per-asset. A failure logs a warning
   naming the asset and processing continues with the next one; the function
   never throws to the caller and never raises a user-facing notification.
   A read-only or partially-locked workspace therefore degrades to "some assets
   missing" rather than a broken activation.

   **Encoding:**
   Files are copied as raw bytes — no text decoding, no EOL normalisation, no
   BOM insertion. Content comparison is a byte comparison. Any transformation
   here would make a file differ from its source on every activation and defeat
   idempotency.

   **Acceptance Criteria:**

   * AC-1: ``provisionModuleAssets`` is reachable on ``JarvisCoreApi`` and is
     the only published entry point for provisioning.
   * AC-2: With ``skillsSourceDir`` omitted, no skills are provisioned and no
     error occurs; likewise for ``instructionsSourceDir``.
   * AC-3: An entry whose name does not start with ``<namespace>.`` is logged
     and skipped — never written, never recorded in the manifest.
   * AC-4: A second invocation with an unchanged bundle performs zero writes
     and zero removals.
   * AC-5: With no workspace folder open, the function logs a warning and
     returns without touching the filesystem.
   * AC-6: A filesystem failure on one asset does not prevent the remaining
     assets from being processed, and produces no user-facing notification.
   * AC-7: The module's ``.vscodeignore`` does not exclude ``assets/**``, so
     the assets are present in the packaged VSIX.


.. spec:: Provisioning Manifest & Orphan Cleanup
   :id: SPEC_MOD_SKILL_MANIFEST
   :status: approved
   :links: REQ_MOD_SKILL_ORPHAN; REQ_MOD_SKILL_OPTOUT

   **Description:**
   Cleanup is driven by a manifest of what the helper previously wrote — not by
   matching filenames against the namespace prefix. A prefix match would also
   match a file the user created by hand or copied from elsewhere, and deleting
   it would be indistinguishable, to the user, from Jarvis destroying their
   work. The manifest only ever names files the helper itself wrote, so the
   "never touch what we did not create" guarantee holds by construction rather
   than by exclusion rules.

   This is the point of departure from ``.github/agents/syspilot.installer.agent.md``,
   which uses prefix matching and consequently needs a hand-maintained exception
   list (``syspilot.*.tailoring.md``) to protect user files. That list has to grow
   every time a new user-owned file convention appears; a manifest needs no such
   list.

   **Storage:**

   .. code-block:: typescript

      // key:   `jarvis.provisioned.${namespace}`
      // scope: the CALLING module's ExtensionContext.workspaceState
      // value: workspace-relative POSIX paths, e.g.
      [
        ".github/skills/jarvis-kanban.board",
        ".github/instructions/jarvis-kanban.yaml.instructions.md"
      ]

   ``workspaceState`` is per-extension and per-workspace, so one module can
   never read or clear another module's manifest, and provisioning state does
   not leak between workspaces. Skill folders are recorded as the folder path;
   removal is recursive on that folder.

   **Cleanup phase (``enabled`` true):**

   1. Read the previous manifest (empty array if absent).
   2. For each entry not present in the current valid bundle set, remove it from
      the workspace. A missing target is not an error — the user may have
      deleted it, which is a legitimate outcome to converge on.
   3. Write the current valid bundle set as the new manifest.

   **De-provision path (``enabled`` false):**

   1. Remove every entry in the manifest from the workspace.
   2. Clear the manifest (store an empty array).
   3. Perform no writes.

   No "disabled" flag is persisted: the next invocation with ``enabled`` true
   sees an empty manifest and a full bundle, and provisions everything. Re-enable
   therefore needs no separate restore path.

   **Acceptance Criteria:**

   * AC-1: The manifest is stored in the calling module's ``workspaceState``
     under ``jarvis.provisioned.<namespace>``.
   * AC-2: An asset present in the manifest but absent from the current bundle
     is removed from the workspace on the next invocation.
   * AC-3: A file in ``.github/skills/`` or ``.github/instructions/`` that is
     absent from the manifest is never removed — including a file whose name
     matches ``<namespace>.``.
   * AC-4: After every invocation the manifest equals exactly the set of assets
     in the current valid bundle (or the empty set when ``enabled`` is false).
   * AC-5: Removing an asset whose target file no longer exists succeeds
     silently and does not abort the remaining removals.
   * AC-6: With ``enabled: false``, all manifest entries are removed, the
     manifest is emptied, and no file is written.
   * AC-7: Setting ``enabled`` back to ``true`` restores the full asset set on
     the next activation, with no manual step.
