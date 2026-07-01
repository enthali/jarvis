Entity File Children UAT Requirements
=======================================

.. req:: Entity File Children — Test Data and Verification Requirements
   :id: REQ_UAT_ENTITY_FILES_TREE
   :status: draft
   :priority: required
   :links: US_UAT_ENTITY_FILES_TREE; REQ_ENT_ENTITY_FILE_CHILDREN

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate entity file children (expand-to-show
   ``context.md``, YAML config, agent file) in the Extension Development Host.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host (F5).
   * ``jarvis.projects.enabled``, ``jarvis.events.enabled``, and
     ``jarvis.sessions.enabled`` must all be ``true`` (defaults).
   * Pre-existing project test data:

     - ``testdata/projects/alpha/project.yaml`` — ``agent: syspilot.cm``,
       ``context.md`` present.
     - ``testdata/projects/legacy-no-agent/project.yaml`` — no ``agent``
       field, ``context.md`` present.

   * Pre-existing event test data:

     - ``testdata/events/2026-06-15_DevCon 2026/event.yaml`` —
       ``agent: syspilot.cm``, ``context.md`` present.

   * Pre-existing session test data:

     - ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` —
       ``agent: syspilot.cm``, ``context.md`` present.

   * ``.github/agents/syspilot.cm.agent.md`` must exist in the workspace root
     for the fail-open scenario (T-9) to be reproduced by **temporarily
     renaming** it, then restoring it after the test.

   **Acceptance Criteria:**

   * AC-1 (leaf nodes expandable, 3 file children when agent bound):
     For T-1, T-2, T-3, the tester SHALL expand ``alpha`` (Projects),
     ``copilot-cm`` (Sessions), and ``DevCon 2026`` (Events) and verify each
     shows exactly 3 file children: ``context.md``, the YAML config file,
     and ``syspilot.cm.agent.md``.

   * AC-2 (no agent → 2 file children only):
     For T-4, the tester SHALL expand ``legacy-no-agent`` and verify exactly
     2 file children appear (``context.md``, ``project.yaml``) with no
     agent-file child.

   * AC-3 (click opens file, non-preview):
     For T-5, T-6, T-7, the tester SHALL click each file child in turn and
     verify the corresponding file opens in a non-preview (sticky) editor
     tab, with no side effect on any other entity or chat.

   * AC-4 (tooltip shows full path):
     For T-8, the tester SHALL hover over a file child and verify the
     tooltip text is the full absolute filesystem path using forward
     slashes.

   * AC-5 (fail-open on missing agent file):
     For T-9, the tester SHALL temporarily rename
     ``.github/agents/syspilot.cm.agent.md`` to simulate a missing file,
     reload the scanner if needed, click the agent-file child on ``alpha``,
     and verify a warning notification appears (e.g.
     "Jarvis: Cannot open file: ..."), no exception is thrown in the Output
     Channel, and no file is created at the expected path. The tester SHALL
     restore the renamed file after the test.

   * AC-6 (no regression to inline icons / click-to-chat):
     For T-10, the tester SHALL verify that ``alpha``, ``copilot-cm``, and
     ``DevCon 2026`` still show their existing inline icons
     (``$(go-to-file)``, ``$(notebook)``) and that clicking the entity node
     label itself (not the expand arrow) still opens the agent chat as
     before.
