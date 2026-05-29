Entity Parity UAT Requirements
================================

.. req:: Entity Feature Parity — Test Data and Verification Requirements
   :id: REQ_UAT_ENTITY_PARITY
   :status: draft
   :priority: required
   :links: US_UAT_ENTITY_PARITY; REQ_EXP_ENTITY_AGENT; REQ_EXP_ENTITY_TREECLICK; REQ_EXP_ENTITY_ICONS

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate entity feature parity (agent binding, lazy-bind,
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

   * AC-2 (``agent: ""`` treated as unbound):
     For T-16, the tester SHALL set ``agent: ""`` in ``alpha/project.yaml``,
     reload the scanner, click ``alpha``, and verify the picker fires (entity is
     unbound). The tester SHALL then restore the original value.

   * AC-3 (event summary schema warning):
     For T-17, the tester SHALL verify VS Code Problems panel shows a schema
     warning for the event file missing ``summary``, while the entity still
     appears in the Events Tree.

   * AC-4 (bound project/event → direct chat open):
     For T-31 and T-32, the tester SHALL verify that clicking a bound entity
     opens the chat in the specified agent mode **without any picker appearing**.

   * AC-5 (three inline icons present):
     For T-33 and T-37, the tester SHALL hover over a project and event node
     and verify three icons appear: ``$(go-to-file)``, ``$(notebook)``,
     ``$(record)``. Tooltip text SHALL be verified for each.

   * AC-6 (``$(record)`` context-key gating):
     For T-36, the tester SHALL create and then remove a ``recording/``
     subfolder under an entity folder and verify the ``$(record)`` icon
     appears/disappears after rescan.

   * AC-7 (lazy-bind cancel):
     For T-27, the tester SHALL click an unbound entity, press Escape, and
     verify the YAML file is unmodified and no chat is opened.

   * AC-8 (lazy-bind "No agent"):
     For T-28, the tester SHALL select "No agent" in the picker, verify
     ``agent: ""`` written, verify no chat opened, then click again to confirm
     the picker re-fires.

   * AC-9 (lazy-bind concrete agent):
     For T-29, the tester SHALL select a concrete agent, verify the YAML is
     updated, and verify the chat opens in the correct mode.

   * AC-10 (lazy-bind write failure):
     For T-30, the tester SHALL make the YAML file read-only, trigger the
     lazy-bind flow, select an agent, and verify: no chat opened, ``[WARN]``
     log emitted, YAML unchanged.

   * AC-11 (init-prompt for project/event):
     For T-40 and T-41, the tester SHALL verify the init-prompt appears in the
     chat transcript on first open and does NOT appear on a second click of the
     same entity.
