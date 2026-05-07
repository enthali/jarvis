Open Context UAT User Stories
==============================

.. story:: Open Context File Acceptance Tests
   :id: US_UAT_OPENCONTEXT
   :status: approved
   :priority: optional
   :links: US_EXP_OPENCONTEXT; REQ_EXP_OPENCONTEXT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Open Context inline button,
   **so that** I can verify that the ``context.md`` file opens correctly from
   project and event tree nodes before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: happy-path open,
     missing-file fallback, and folder-node exclusion
   * AC-2: At least one test covers the happy path (context.md exists and opens)
   * AC-3: At least one test covers the missing-file edge case (info message shown)
   * AC-4: At least one test verifies the button is absent on folder nodes

   **Test Scenarios:**

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
