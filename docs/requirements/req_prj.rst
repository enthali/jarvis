Project Requirements
====================

.. req:: Project Folder Filter
   :id: REQ_PRJ_PROJECTFILTER
   :status: implemented
   :priority: optional
   :links: US_PRJ_PROJECTFILTER; REQ_PRJ_FILTERPERSIST

   **Description:**
   The Projects tree view SHALL provide a filter mechanism to show/hide
   individual folders via a QuickPick dialog.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Projects title bar triggers the command ``jarvis.filterProjectFolders``
   * AC-2: The command shows a QuickPick with ``canPickMany: true``, one entry per existing root-level folder
   * AC-3: Pre-selected = visible, deselected = hidden
   * AC-4: After confirmation the tree updates immediately
   * AC-5: The icon changes visually when a filter is active (``filter`` vs ``filter-filled``)


.. req:: Filter Persistence
   :id: REQ_PRJ_FILTERPERSIST
   :status: implemented
   :priority: optional
   :links: US_PRJ_PROJECTFILTER

   **Description:**
   The folder filter selection SHALL be persisted in ``workspaceState``
   and restored on extension activation.

   **Acceptance Criteria:**

   * AC-1: The list of hidden folders is stored in ``workspaceState``
   * AC-2: On extension start the saved filter is applied
   * AC-3: On save only existing folders are persisted — stale entries are implicitly discarded


.. req:: List Projects LM Tool
   :id: REQ_PRJ_LISTPROJECTS
   :status: implemented
   :priority: optional
   :links: US_PRJ_LISTPROJECTS; REQ_EXP_YAMLDATA

   **Description:**
   The extension SHALL register a Language Model Tool that returns the list of
   projects from the configured projects folder, enabling LLM agents and MCP
   clients to discover available projects programmatically.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_listProjects`` SHALL be registered
     via ``registerDualTool()`` with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL accept no input parameters (empty input schema)
   * AC-3: The tool SHALL return an array of objects, each containing ``name``
     (string, from the project YAML ``name`` field), ``summary`` (string, from
     the project YAML ``summary`` field, empty string if absent), ``agent``
     (string, from the project YAML ``agent`` field, empty string if absent),
     and ``folder`` (string, relative path from the configured projects folder
     to the project directory)
   * AC-4: If no projects exist, the tool SHALL return an empty array
   * AC-5: The tool SHALL be simultaneously available via the MCP server
   * AC-6: The output object shape SHALL match ``jarvis_listSessions``
     (``{name, summary, agent, folder}``)


.. req:: jarvis_createProject LM+MCP Tool
   :id: REQ_PRJ_CREATEPROJECT
   :status: draft
   :priority: optional
   :links: US_PRJ_CREATEPROJECT; REQ_PRJ_NEWPROJECT; REQ_ACT_AGENT_DISCOVERY

   **Description:**
   A Language Model and MCP tool ``jarvis_createProject`` SHALL programmatically
   create a project entity under the configured projects folder.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered via ``registerDualTool()`` with
     ``canBeReferencedInPrompt: true``.
   * AC-2: Input parameters: ``name`` (string, required), ``summary`` (string,
     optional), ``agent`` (string, optional).
   * AC-3: On success, the tool SHALL create
     ``<projectsFolder>/<name>/project.yaml`` (with ``name``, ``summary`` if
     non-blank, ``agent`` if non-blank and valid) and
     ``<projectsFolder>/<name>/context.md`` (with template ``# <name>\n\n``).
   * AC-4: After creation, ``scanner.rescan()`` SHALL be called.
   * AC-5: If the folder already exists, return
     ``{ created: false, reason: "project \"<name>\" already exists" }``.
   * AC-6: Name validation SHALL use the same rules as
     ``jarvis_createSession`` (empty, illegal chars, dot-only, Windows
     reserved names).
   * AC-7: When ``agent`` is non-blank, validate against
     ``REQ_ACT_AGENT_DISCOVERY``; if invalid, throw error with available
     agents listed (per ``REQ_ACT_AGENT_VALIDATION``).



.. req:: New Project Command
   :id: REQ_PRJ_NEWPROJECT
   :status: draft
   :priority: optional
   :links: US_ENT_NEWENTITY; REQ_EXP_REACTIVECACHE; REQ_ENT_AGENTSESSION; REQ_EXP_YAMLDATA; REQ_CFG_FOLDERPATHS

   **Description:**
   A command triggered by a ``+`` icon in the Projects title bar SHALL create
   a new project folder with a convention file and immediately refresh the scanner.

   **Acceptance Criteria:**

   * AC-1: A ``$(add)`` icon in the Projects view title bar triggers the command
     ``jarvis.newProject``
   * AC-2: The command shows an InputBox prompting for the project name
   * AC-3: The folder name is the verbatim input name (no lowercase, no slug,
     no character substitution) — same folder-naming semantics as session
     creation. Old kebab-case folders remain readable.
   * AC-4: The folder ``<name>/`` is created inside ``jarvis.projectsFolder``
     with ``project.yaml`` containing ``name: "<input>"``
   * AC-5: After file creation, an immediate scanner rescan is triggered
   * AC-6: After the rescan, the new entity appears in the tree. The chat
     editor is opened per the consolidated chat-open primitive
     (``SPEC_ENT_AGENT_PICKER``): concrete agent → mode-prime +
     ``openNewChatEditor()``; "No agent" → ``openNewChatEditor()`` only.
   * AC-7: If the user cancels the InputBox, the command exits without side effects
   * AC-8: The command SHALL NOT appear in the Command Palette
   * AC-9: If a folder with the given name already exists, the command SHALL
     show an error notification and abort without modifying the file system
   * AC-10: Invalid names (filesystem-illegal characters, dot-only, Windows
     reserved device names) SHALL be rejected via ``validateInput`` inline
     feedback in the InputBox — same rules as ``jarvis.newSession``.
   * AC-11: After the name prompt, the command SHALL invoke the shared
     agent-picker (``SPEC_ENT_AGENT_PICKER``). If the user cancels the picker,
     the command SHALL abort without side effects.
   * AC-12: The selected agent SHALL be written to ``project.yaml`` as the
     ``agent`` field. If "No agent" is chosen, ``agent: ""`` SHALL be
     written (not omitted). Chat editor opens via ``openNewChatEditor()``
     (``SPEC_MSG_OPENCHAT``).


