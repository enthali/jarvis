Entity Parity UAT Requirements
================================

.. req:: Entity Feature Parity — Test Data and Verification Requirements
   :id: REQ_UAT_ENTITY_PARITY
   :status: draft
   :priority: required
   :links: US_UAT_ENTITY_PARITY; REQ_ENT_ENTITY_AGENT; REQ_ENT_ENTITY_TREECLICK; REQ_ENT_ENTITY_ICONS

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate entity feature parity (agent binding,
   inline icons, tree-click-to-chat, and schema strictness) in the Extension
   Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host (F5).
   * ``jarvis.projects.enabled``, ``jarvis.events.enabled``, and
     ``jarvis.sessions.enabled`` must all be ``true`` (defaults).
   * Pre-existing project test data:

     - ``testdata/projects/alpha/project.yaml`` — ``agent: syspilot.cm``
     - ``testdata/projects/beta/project.yaml`` — ``agent: syspilot.uat``
     - ``testdata/projects/legacy-no-agent/project.yaml`` — no ``agent`` field
       (intentionally omitted to test unbound semantics)

   * Pre-existing event test data:

     - ``testdata/events/2026-06-15_DevCon 2026/event.yaml`` — ``agent: syspilot.cm``
     - ``testdata/events/2025-03-15_Conference/event.yaml`` — no ``agent`` field

   * Pre-existing session test data:

     - ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` — ``agent: syspilot.cm``

   * All entity folders must contain a ``context.md`` file.
   * The Jarvis Output Channel (View → Output → Jarvis) must be open.
   * Existing VS Code Chat sessions should be closed or renamed before each
     scenario that tests a new-session open path (to ensure the new-session
     branch is exercised).

   **Acceptance Criteria:**

   * AC-1 (unbound entity loads — warn-log):
     For T-15, the tester SHALL verify that ``legacy-no-agent`` appears in the
     Projects Tree after EDH reload, and that a ``[WARN]`` log line containing
     the folder name is present in the Output Channel.

   * AC-2 (``agent: ""`` treated as unbound — no picker on tree-click):
     For T-16, the tester SHALL set ``agent: ""`` in ``alpha/project.yaml``,
     reload the scanner, click ``alpha``, and verify a default chat opens
     (no picker, no YAML writeback) followed by rename + init-prompt. The
     tester SHALL then restore the original value.

   * AC-3 (event summary schema warning):
     For T-17, the tester SHALL verify VS Code Problems panel shows a schema
     warning for the event file missing ``summary``, while the entity still
     appears in the Events Tree.

   * AC-4 (bound project/event → direct chat open):
     For T-31 and T-32, the tester SHALL verify that clicking a bound entity
     opens the chat in the specified agent mode **without any picker appearing**.

   * AC-5 (two inline icons present):
     For T-33 and T-37, the tester SHALL hover over a project and event node
     and verify two icons appear: ``$(go-to-file)``, ``$(notebook)``.
     Tooltip text SHALL be verified for each.

   * AC-6 (``$(record)`` icon absent):
     For T-36, the tester SHALL verify that no ``$(record)`` icon appears on
     any entity tree item, even when a ``recording/`` subfolder exists under
     the entity folder.

   * AC-7 (New-Entity picker cancel):
     For T-27, the tester SHALL invoke a ``Jarvis: New …`` command, enter a
     name, then press Escape in the agent picker, and verify entity creation
     is aborted (no folder/YAML created, no chat opened).

   * AC-8 (New-Entity "No agent" selection):
     For T-28, the tester SHALL invoke a ``Jarvis: New …`` command, select
     "No agent" in the picker, and verify: YAML contains ``agent: ""``, a
     default chat opens (no mode), chat is renamed to the entity name, and the
     init-prompt is submitted.

   * AC-9 (New-Entity concrete-agent selection):
     For T-29, the tester SHALL invoke a ``Jarvis: New …`` command, select a
     concrete agent, and verify: YAML contains ``agent: "<name>"``, chat
     opens in that mode, chat is renamed, and the init-prompt is submitted.

   * AC-10 (Tree-click on default-bound entity opens chat directly):
     For T-30, the tester SHALL click an entity whose YAML has ``agent: ""``
     and verify a default chat opens with no picker, no YAML mutation,
     followed by rename + init-prompt.

   * AC-11 (init-prompt for project/event):
     For T-40 and T-41, the tester SHALL verify the init-prompt appears in the
     chat transcript on first open and does NOT appear on a second click of the
     same entity.
