Project Design Specifications
==============================

.. spec:: Project Folder Filter Command
   :id: SPEC_PRJ_FILTERCOMMAND
   :status: implemented
   :links: REQ_PRJ_PROJECTFILTER, REQ_PRJ_FILTERPERSIST, SPEC_ENG_SCANNER, SPEC_EXP_PROVIDER

   **Description:**
   A new command ``jarvis.filterProjectFolders`` implements the filter dialog using a
   single-click toggle QuickPick (no OK button — each click applies immediately).

   **Flow:**

   1. Collect root-level ``FolderNode`` names from ``scanner.getProjectTree()``
   2. Build QuickPick items: one per folder, with ``$(check)`` if visible, ``$(circle-large-outline)`` if hidden
   3. Open ``vscode.window.createQuickPick()`` with ``canSelectMany = false``
   4. On ``onDidAccept``: toggle the selected folder in/out of ``hiddenFolders`` set
   5. Re-render items with updated codicons (immediate feedback)
   6. Apply filter: ``provider.setHiddenFolders(new Set(hiddenFolders))``
   7. Persist: ``workspaceState.update('jarvis.hiddenProjectFolders', [...hiddenFolders])``
   8. Update icon + description: ``setContext('jarvis.projectFilterActive', isActive)``,
      ``projectView.description = isActive ? '(filtered)' : ''``
   9. On ``onDidHide``: dispose QuickPick

   **Registration in package.json:**

   * ``contributes.commands``: two commands —
     ``jarvis.filterProjectFolders`` (icon ``$(filter)``) and
     ``jarvis.filterProjectFoldersActive`` (icon ``$(filter-filled)``),
     both bound to the same handler
   * ``contributes.menus.view/title``: two entries toggled via ``jarvis.projectFilterActive``
     context key — one with ``!jarvis.projectFilterActive``, one with ``jarvis.projectFilterActive``

   **Icon toggle:** Two command definitions in ``package.json`` with different icons,
   shown/hidden via ``when`` clauses using the ``jarvis.projectFilterActive`` context key.


.. spec:: List Projects LM Tool
   :id: SPEC_PRJ_LISTPROJECTS
   :status: implemented
   :links: REQ_PRJ_LISTPROJECTS; SPEC_ENG_SCANNER; SPEC_MSG_DUALREGISTRATION

   **Description:**
   Register ``jarvis_listProjects`` as a dual LM + MCP tool in ``extension.ts``.
   Returns the list of projects from the scanner with their name, summary,
   agent, and relative folder path. Output shape matches ``jarvis_listSessions``
   (``{name, summary, agent, folder}``).

   **Leaf extraction helper** (local to ``activate()``):

   .. code-block:: typescript

      function collectLeaves(nodes: TreeNode[]): LeafNode[] {
          const leaves: LeafNode[] = [];
          for (const node of nodes) {
              if (node.kind === 'leaf') {
                  leaves.push(node);
              } else {
                  leaves.push(...collectLeaves(node.children));
              }
          }
          return leaves;
      }

   **Core logic** (shared by LM and MCP handlers):

   .. code-block:: typescript

      function getProjectList(): {
          name: string; summary: string; agent: string; folder: string;
      }[] {
          const projectsFolder = vscode.workspace
              .getConfiguration('jarvis')
              .get<string>('projectsFolder', '');
          const leaves = collectLeaves(scanner.getProjectTree());
          return leaves.map(leaf => {
              const entity = scanner.getEntity(leaf.id);
              const absDir = path.dirname(leaf.id);
              const rel = projectsFolder
                  ? path.relative(projectsFolder, absDir)
                  : absDir;
              return {
                  name: entity?.name ?? path.basename(absDir),
                  summary: entity?.summary ?? '',
                  agent: entity?.agent ?? '',
                  folder: rel.replace(/\\/g, '/')
              };
          });
      }

   **Dual-tool registration:**

   .. code-block:: typescript

      const listProjectsTool = registerDualTool(
          'jarvis_listProjects',
          // LM handler
          async (_options, _token) => {
              const projects = getProjectList();
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(projects))
              ]);
          },
          // MCP description
          'Returns the list of projects with name, summary, agent, and folder path.',
          // MCP input schema (Zod)
          {},
          // MCP handler
          async () => {
              const projects = getProjectList();
              return { projects };
          }
      );

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listProjects",
        "displayName": "List Projects",
        "modelDescription": "Returns the list of projects in the Jarvis workspace with their name, summary, agent, and folder path. Use this to discover available projects.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listProjects",
        "icon": "$(project)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Design notes:**

   * Output shape: ``{name, summary, agent, folder}`` — matches ``jarvis_listSessions``
   * ``summary`` and ``agent`` use ``entity?.field ?? ''`` fallback (same as ``jarvis_listEvents``)
   * No input parameters — mirrors ``jarvis_listSessions`` pattern
   * ``folder`` uses forward slashes for cross-platform consistency
   * Falls back to folder basename if entity lookup fails (defensive)
   * Disposable pushed to ``context.subscriptions``


.. spec:: jarvis_createProject LM+MCP Tool
   :id: SPEC_PRJ_CREATEPROJECT
   :status: draft
   :links: REQ_PRJ_CREATEPROJECT; SPEC_ENG_SCANNER; SPEC_MSG_DUALREGISTRATION; SPEC_ACT_CREATETOOL; SPEC_ENT_AGENT_PICKER

   **Description:**
   Register ``jarvis_createProject`` via ``registerDualTool()`` in
   ``src/extension.ts``. Creates a project folder with ``project.yaml`` and
   ``context.md`` under the configured projects folder. Mirrors
   ``SPEC_ACT_CREATETOOL`` for structure; uses programmatic agent validation
   (no picker) per ``SPEC_ENT_AGENT_PICKER`` programmatic-consumer pattern.

   **Tool input schema:**

   .. list-table::
      :header-rows: 1
      :widths: 20 12 12 56

      * - Parameter
        - Type
        - Required
        - Purpose
      * - ``name``
        - ``string``
        - yes
        - Project name; used verbatim as folder name.
      * - ``summary``
        - ``string``
        - no
        - Short description written to ``project.yaml``
          (omitted from the file when blank or absent).
      * - ``agent``
        - ``string``
        - no
        - Agent mode to bind. Validated via ``discoverAgents()``
          (per ``SPEC_ACT_AGENT_DISCOVERY``). Omitted from YAML
          when blank or absent.

   **Name validation** (identical to ``SPEC_ACT_CREATETOOL``):

   * The name MUST NOT be empty (``""``).
   * The name MUST NOT contain any of: ``/ \\ : * ? " < > |``, null bytes, or
     ASCII control characters (U+0000–U+001F).
   * The name MUST NOT be ``.`` or ``..``.
   * On Windows, the name MUST NOT be a reserved device name (``CON``, ``PRN``,
     ``AUX``, ``NUL``, ``COM1``–``COM9``, ``LPT1``–``LPT9``), case-insensitive.

   Violation → throw ``Error("invalid project name: <reason>")``.

   **Agent validation** (when ``agent`` is non-blank):

   Validate against ``discoverAgents()`` (per ``SPEC_ACT_AGENT_DISCOVERY``).
   If the agent name is not in the discovered list, throw
   ``Error("unknown agent \"<agent>\"; available: <list>")``.
   No picker is invoked — this is a programmatic consumer.

   **Idempotency check** (after validation, before writes):

   .. code-block:: typescript

      const projectsFolder = vscode.workspace
          .getConfiguration('jarvis')
          .get<string>('projectsFolder', '');
      if (!projectsFolder) { throw new Error('jarvis_createProject: projectsFolder not configured'); }
      const targetPath = path.join(projectsFolder, name);
      if (fs.existsSync(targetPath)) {
          return { created: false, reason: `project "${name}" already exists` };
      }

   **File layout after creation:**

   .. code-block:: text

      <projectsFolder>/
        <name>/
          project.yaml    ← name always; summary when non-blank; agent when non-blank
          context.md      ← always; starts with "# <name>\n\n"

   **``project.yaml`` format:**

   .. code-block:: yaml

      name: "<name>"
      summary: "<summary>"    # only present when summary is non-blank
      agent: "<agent>"        # only present when agent is non-blank and valid

   **``context.md`` initial content:**

   .. code-block:: markdown

      # <name>

   (Trailing newline, then empty line — identical to ``SPEC_ACT_CREATETOOL``.)

   **Post-creation:** Call ``scanner.rescan()`` to update the entity cache.

   **Acceptance Criteria:**

   1. ``jarvis_createProject`` is registered via ``registerDualTool()`` with
      ``canBeReferencedInPrompt: true``.
   2. Input parameters: ``name`` (required), ``summary`` (optional),
      ``agent`` (optional).
   3. On success, creates ``<projectsFolder>/<name>/project.yaml`` and
      ``context.md``.
   4. ``scanner.rescan()`` is called after creation.
   5. If the folder already exists, returns
      ``{ created: false, reason: "project \"<name>\" already exists" }``.
   6. Name validation uses the same rules as ``SPEC_ACT_CREATETOOL``.
   7. Agent validation uses ``discoverAgents()``; invalid agent → error with
      available agents listed.
   8. Disposable pushed to ``context.subscriptions``.



.. spec:: New Project Command
   :id: SPEC_PRJ_NEWPROJECT_CMD
   :status: draft
   :links: REQ_PRJ_NEWPROJECT; REQ_EXP_REACTIVECACHE; SPEC_ENG_SCANNER; SPEC_EXP_EXTENSION; SPEC_ENT_AGENT_PICKER

   **Description:**
   Register ``jarvis.newProject`` in ``extension.ts``. Triggered by the ``$(add)``
   icon in the Projects view title bar. Creates a new project folder with
   ``project.yaml`` and opens the new entity's chat editor (same new-session
   pattern used by ``jarvis.newSession``).

   **Handler flow:**

   1. Read ``jarvis.projectsFolder`` from configuration.
      If empty, show warning notification and return.
   2. Show ``InputBox`` with prompt ``"Project name"``,
      ``placeHolder: "My Project"``, with ``validateInput``:

      .. code-block:: typescript

         validateInput: (value: string) => {
             if (/[<>:"\/\\|?*\x00-\x1f]/.test(value)) {
                 return 'Name contains characters not allowed in folder names';
             }
             if (!value.trim()) {
                 return 'Name must not be empty';
             }
             return undefined;
         }

   3. If user cancels (``undefined``), return.
   4. Invoke ``pickAgentMode()`` (per ``SPEC_ENT_AGENT_PICKER``).
   5. If picker returns ``undefined`` (cancel), return (creation aborted).
   6. Use raw input as folder name (verbatim, no transformation).
   7. Compute target path: ``path.join(projectsFolder, input)``.
   8. If target path already exists (``fs.existsSync``), show error notification
      ``"Folder '<input>' already exists in projects folder"`` and return.
   9. Create directory: ``await fs.promises.mkdir(targetPath)``.
   10. Write ``project.yaml``:

       .. code-block:: typescript

          const agent = pickerResult; // "" or "<agent-name>"
          const content = `name: "${input}"\nagent: "${agent}"\n`;
          await fs.promises.writeFile(
              path.join(targetPath, 'project.yaml'), content, 'utf-8');

   11. Trigger scanner rescan: ``await scanner.rescan()``.
   12. Open chat editor (per ``SPEC_ENT_AGENT_PICKER`` Chat-Open Primitive):

       .. code-block:: typescript

          // Mode-prime (only for concrete agent)
          if (pickerResult) {
              try {
                  await vscode.commands.executeCommand(
                      'workbench.action.chat.open', { mode: pickerResult }
                  );
                  await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
                  log.warn(`Mode-prime failed: ${err}`);
              }
          }
          // Editor creation (always)
          await openNewChatEditor();  // SPEC_MSG_OPENCHAT

   **Disposable** pushed to ``context.subscriptions``.

   **Registration in package.json** — see ``SPEC_EXP_EXTENSION``.


