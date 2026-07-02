Open Context UAT User Stories
==============================

.. story:: Open Context File Acceptance Tests
   :id: US_UAT_OPENCONTEXT
   :status: approved
   :priority: optional
   :links: US_ENT_OPENCONTEXT; REQ_ENT_OPENCONTEXT; US_UAT_ENTITY_CONTEXTMENU

   **Superseded by the ``entity-tree-context-menu`` CR (2026-07-02).** The
   ``jarvis.openContext`` inline ``$(notebook)`` button this story tested is
   now fully retired (``REQ_ENT_OPENCONTEXT`` — Retired) — not merely its
   inline placement removed, the command and its 3-step discovery algorithm
   (direct hit → subfolder scan → QuickPick → info message) no longer exist
   in the codebase at all. There is no surviving equivalent: the new
   right-click "Open" entry (``US_UAT_ENTITY_CONTEXTMENU``,
   ``REQ_ENT_ENTITY_CONTEXTMENU``) invokes ``jarvis.openEntityFile`` (a
   fixed, already-known file path — no discovery/QuickPick) for file
   children, or ``jarvis.openAgentSession`` (opens the chat, not
   ``context.md``) for entity root nodes. Missing-file fail-open behavior is
   now covered by ``US_UAT_ENTITY_FILES_TREE`` T-9 (``jarvis.openEntityFile``
   fail-open warning), a materially different mechanism than this story's
   T-3. Kept in place (not deleted) for historical traceability — all
   scenarios below describe **retired** behavior, executable only on
   pre-``entity-tree-context-menu`` code.

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Open Context inline button,
   **so that** I can verify that the ``context.md`` file opens correctly from
   project and event tree nodes before release.

   **Acceptance Criteria (historical, retired):**

   * AC-1: **Retired.** Test scenarios document expected outcomes for:
     happy-path open, missing-file fallback, and folder-node exclusion
   * AC-2: **Retired.** At least one test covers the happy path (context.md exists and opens)
   * AC-3: **Retired.** At least one test covers the missing-file edge case (info message shown)
   * AC-4: **Retired.** At least one test verifies the button is absent on folder nodes

   **Test Scenarios (historical, retired — kept for traceability):**

   **T-1 — Open context.md for a project (happy path)**
     Setup: A project leaf node exists in the testdata tree (e.g.
     ``testdata/projects/alpha/project.yaml``). A ``context.md`` file exists
     in the same folder (``testdata/projects/alpha/context.md``).
     Action: Hover over the project node; click the ``$(notebook)`` inline button.
     Expected: ``context.md`` opens in the VS Code text editor. No error or info
     message is shown.

   **T-2 — Open context.md for an event (happy path)**
     Setup: An event leaf node exists (e.g. ``testdata/events/2025/conf/event.yaml``).
     A ``context.md`` file exists in the same folder.
     Action: Hover over the event node; click the ``$(notebook)`` inline button.
     Expected: ``context.md`` opens in the VS Code text editor.

   **T-3 — Missing context.md shows info message**
     Setup: A project leaf node exists. No ``context.md`` file is present in
     its folder (remove it if necessary).
     Action: Hover over the project node; click the ``$(notebook)`` inline button.
     Expected: An info notification "No context.md found for this entity" is
     displayed. No editor tab opens.

   **T-4 — Folder nodes do not show the button**
     Setup: A non-leaf (folder/grouping) node is visible in the Projects or
     Events tree.
     Action: Hover over the folder node.
     Expected: The ``$(notebook)`` button does NOT appear on the folder node.

   **T-5 — Button appears alongside existing buttons**
     Setup: A project leaf node exists.
     Action: Hover over the project node.
     Expected: All three inline buttons are visible: ``$(go-to-file)``,
     ``$(comment-discussion)``, and ``$(notebook)``.

   **T-6 — Subfolder discovery (single match)**
     Setup: ``testdata/projects/withsub/`` has no ``context.md`` at root, but
     ``testdata/projects/withsub/sub/context.md`` exists.
     Action: Hover over the ``withsub`` project node; click the ``$(notebook)``
     inline button.
     Expected: ``sub/context.md`` opens in the VS Code text editor. No picker
     or info message is shown.

   **T-7 — Multiple subfolder matches → QuickPick**
     Setup: ``testdata/projects/multi/`` has no root ``context.md``, but
     ``testdata/projects/multi/pm/context.md`` and
     ``testdata/projects/multi/qm/context.md`` both exist.
     Action: Hover over the ``multi`` project node; click the ``$(notebook)``
     inline button.
     Expected: A QuickPick dropdown appears listing at least ``pm/context.md``
     and ``qm/context.md``. Selecting one opens it in the editor.

   **T-8 — Hidden folders ignored → falls through to info message**
     Setup: ``testdata/projects/hidden/`` has no root ``context.md`` and no
     non-hidden subfolder ``context.md``; only
     ``testdata/projects/hidden/.hidden/context.md`` exists.
     Action: Hover over the ``hidden`` project node; click the ``$(notebook)``
     inline button.
     Expected: An info notification "No context.md found for this entity" is
     displayed. The hidden file is NOT opened.

   **T-9 — Direct hit takes precedence over subfolder match**
     Setup: ``testdata/projects/withsub/`` has both
     ``testdata/projects/withsub/context.md`` AND
     ``testdata/projects/withsub/sub/context.md``.
     Action: Hover over the ``withsub`` project node; click the ``$(notebook)``
     inline button.
     Expected: The root ``context.md`` opens directly. No picker appears.
