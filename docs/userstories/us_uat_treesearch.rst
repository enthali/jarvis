Tree Search Acceptance Tests
============================

.. story:: Tree Quick Search Acceptance Tests
   :id: US_UAT_EXP_TREESEARCH
   :status: approved
   :priority: optional
   :links: US_EXP_TREESEARCH

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the QuickPick-based tree search
   commands on the Projects and Events tree views,
   **so that** I can verify the end-to-end search, filter, and reveal behaviour
   before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: search icon visibility,
     QuickPick content, live filtering, node reveal, and Escape cancel
   * AC-2: At least one test covers the happy path for project search (open, filter,
     select)
   * AC-3: At least one test covers the happy path for event search (open, filter,
     select)
   * AC-4: At least one test covers the Escape / cancel path

   **Test Scenarios:**

   **T-1 — Search icon visible in Projects title bar**
     Setup: Jarvis extension is active. ``jarvis.projectsFolder`` is set to
     ``testdata/projects``. The Projects sidebar view is open.
     Action: Observe the Projects tree title bar.
     Expected: A search icon (``$(search)`` codicon) is visible in the title bar
     alongside the ``$(add)`` and ``$(refresh)`` icons. No error toast or dialog
     appears.

   **T-2 — Search icon visible in Events title bar**
     Setup: Jarvis extension is active. ``jarvis.eventsFolder`` is set to
     ``testdata/events``. The Events sidebar view is open.
     Action: Observe the Events tree title bar.
     Expected: A search icon (``$(search)`` codicon) is visible in the Events title
     bar. No error toast or dialog appears.

   **T-3 — Projects QuickPick lists all project items**
     Setup: ``jarvis.projectsFolder`` points to ``testdata/projects``. Scan has
     completed — at least the ``alpha``, ``beta``, ``gamma``, and ``active/delta``
     projects are loaded.
     Action: Click the search icon in the Projects title bar.
     Expected: A QuickPick input box opens. It contains one item per project leaf
     (e.g. "Alpha Project", "Beta Project", "Gamma Project", "Delta Project"). Each
     item shows the project ``name`` field as its label and the relative folder path
     within ``jarvis.projectsFolder`` as its description. No error toast or dialog
     appears.

   **T-4 — Events QuickPick lists all event items with date labels**
     Setup: ``jarvis.eventsFolder`` points to ``testdata/events``. Scan has
     completed — the 2025 events (conference, workshop, IoT Summit) are loaded.
     Action: Click the search icon in the Events title bar.
     Expected: A QuickPick opens containing one item per event leaf. Each label
     follows the format ``<datesStart> — <name>`` (e.g.
     ``2025-03-15 — Spring Conference``). No error toast or dialog appears.

   **T-5 — Typing in QuickPick filters items live**
     Setup: Projects QuickPick is open (as in T-3) with at least three project items.
     Action: Type a partial substring that matches only one project name (e.g. the
     first few characters of "Beta").
     Expected: The QuickPick list narrows to show only matching items in real time
     as the user types. Non-matching items disappear without any button press or
     delay. VS Code's built-in fuzzy filter handles the matching.

   **T-6 — Selecting a project reveals and focuses the tree node**
     Setup: Projects QuickPick is open (as in T-3).
     Action: Select one project item from the list (e.g. by pressing Enter or
     clicking it).
     Expected: The QuickPick closes. The corresponding leaf node in the Projects
     tree is scrolled into view, selected (highlighted), and focused. No error toast
     or dialog appears.

   **T-7 — Selecting an event reveals and focuses the tree node**
     Setup: Events QuickPick is open (as in T-4).
     Action: Select one event item from the list (e.g. by pressing Enter or
     clicking it).
     Expected: The QuickPick closes. The corresponding leaf node in the Events tree
     is scrolled into view, selected (highlighted), and focused. No error toast or
     dialog appears.

   **T-8 — Pressing Escape cancels without side effects**
     Setup: Either QuickPick (Projects or Events) is open.
     Action: Press the Escape key.
     Expected: The QuickPick closes immediately. The tree view is unchanged — no
     item is selected or focused that was not already selected before. No error toast
     or dialog appears.
