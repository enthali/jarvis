New Entity User Acceptance Tests
=================================

.. story:: Create New Entity Acceptance Tests
   :id: US_UAT_NEWENTITY
   :status: approved
   :priority: optional
   :links: US_EXP_NEWENTITY; REQ_EXP_NEWPROJECT; REQ_EXP_NEWEVENT; REQ_EXP_REACTIVECACHE

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for creating new projects and events
   via the ``+`` title bar icon,
   **so that** I can verify folder creation, scanner refresh, agent session opening,
   input validation, and cancellation end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: new project creation,
     new event creation, scanner refresh, agent session opening, cancellation,
     duplicate guard, and date validation
   * AC-2: At least one test covers the happy path for each command
     (``jarvis.newProject`` and ``jarvis.newEvent``)
   * AC-3: At least one test covers cancellation without side effects
   * AC-4: At least one test covers duplicate folder detection
   * AC-5: At least one test covers invalid date input for new event

   **Test Scenarios:**

   **T-1 — New project: happy path**
     Setup: ``jarvis.projectsFolder`` set to ``testdata/projects/``.
     Projects tree is visible with existing projects (alpha, beta, gamma).
     Action: Click the ``+`` icon in the Projects title bar. Enter
     ``My Test Project`` in the project name InputBox.
     Expected: Folder ``my-test-project/`` is created inside
     ``testdata/projects/`` containing ``project.yaml`` with
     ``name: "My Test Project"``. The Projects tree immediately refreshes
     and shows "My Test Project" as a new leaf node. An agent session opens
     for the new project.

   **T-2 — New event: happy path**
     Setup: ``jarvis.eventsFolder`` set to ``testdata/events/``.
     Events tree is visible.
     Action: Click the ``+`` icon in the Events title bar. Enter
     ``DevCon 2026`` in the event name InputBox. Enter ``2026-06-15`` in
     the date InputBox.
     Expected: Folder ``2026-06-15-devcon-2026/`` is created inside
     ``testdata/events/`` containing ``event.yaml`` with
     ``name: "DevCon 2026"`` and ``dates: { start: "2026-06-15", end: "2026-06-15" }``.
     The Events tree immediately refreshes and shows "DevCon 2026" as a
     new leaf node. An agent session opens for the new event.

   **T-3 — Cancel project name InputBox**
     Setup: ``jarvis.projectsFolder`` set to ``testdata/projects/``.
     Action: Click the ``+`` icon in the Projects title bar. Press Escape
     in the project name InputBox.
     Expected: No folder is created. The Projects tree does not change.
     No error notifications appear.

   **T-4 — Cancel event date InputBox**
     Setup: ``jarvis.eventsFolder`` set to ``testdata/events/``.
     Action: Click the ``+`` icon in the Events title bar. Enter
     ``Sprint Review`` as the event name. Press Escape in the date InputBox.
     Expected: No folder is created. The Events tree does not change.
     No error notifications appear.

   **T-5 — Duplicate project folder**
     Setup: ``testdata/projects/alpha/`` already exists with ``project.yaml``.
     Action: Click the ``+`` icon in the Projects title bar. Enter ``Alpha``
     as the project name.
     Expected: An error notification appears indicating the folder already
     exists. No files are created or modified. The tree does not change.

   **T-6 — Duplicate event folder**
     Setup: ``testdata/events/2025-03-15-conference/`` already exists (or
     a folder matching the derived name for the input).
     Action: Click the ``+`` icon in the Events title bar. Enter
     ``Conference`` as the event name. Enter ``2025-03-15`` as the date.
     Expected: An error notification appears indicating the folder already
     exists. No files are created or modified.

   **T-7 — Invalid date format**
     Setup: ``jarvis.eventsFolder`` set to ``testdata/events/``.
     Action: Click the ``+`` icon in the Events title bar. Enter
     ``Workshop`` as the event name. Type ``15-06-2026`` in the date InputBox.
     Expected: An inline validation error appears in the InputBox (e.g.
     "Expected format: YYYY-MM-DD"). The InputBox does not close — the user
     can correct the input.

   **T-8 — Invalid calendar date**
     Setup: ``jarvis.eventsFolder`` set to ``testdata/events/``.
     Action: Click the ``+`` icon in the Events title bar. Enter
     ``Meetup`` as the event name. Type ``2026-02-30`` in the date InputBox.
     Expected: An inline validation error appears (not a valid calendar date).
     The InputBox does not close.

   **T-9 — Kebab-case folder naming**
     Setup: ``jarvis.projectsFolder`` set to ``testdata/projects/``.
     Action: Click the ``+`` icon in the Projects title bar. Enter
     ``My   Special--Project!`` (extra spaces and special chars).
     Expected: Folder name is ``my-special-project/`` (lowercase, special
     characters replaced by hyphens, consecutive hyphens collapsed).

   **T-10 — Commands not in Command Palette**
     Setup: Extension active.
     Action: Open Command Palette (Ctrl+Shift+P). Search for
     ``Jarvis: New Project`` and ``Jarvis: New Event``.
     Expected: Neither command appears in the Command Palette results.

   **T-11 — Scanner rescan is immediate**
     Setup: ``jarvis.projectsFolder`` set to ``testdata/projects/``.
     Action: Create a new project via T-1.
     Expected: The new project appears in the tree immediately after
     creation — no need to reload the window or wait for a background
     scan interval.

   **T-12 — Cleanup**
     Setup: T-1 and/or T-2 completed.
     Action: Manually delete ``testdata/projects/my-test-project/`` and
     ``testdata/events/2026-06-15-devcon-2026/`` from the file system.
     Expected: Folders removed. The tree refreshes on next rescan.
