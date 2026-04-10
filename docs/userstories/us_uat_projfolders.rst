Convention-File Model User Acceptance Tests
=============================================

.. story:: Convention-File Sidebar Acceptance Tests
   :id: US_UAT_SIDEBAR
   :status: approved
   :priority: optional
   :links: US_EXP_SIDEBAR; REQ_EXP_YAMLDATA; REQ_EXP_TREEVIEW

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the convention-file model
   in the Projects and Events explorer trees,
   **so that** I can verify that folder-based entity detection, grouping nodes,
   fallback labels, and empty-branch pruning work end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for: convention file
     detection (``project.yaml`` / ``event.yaml``), grouping folder display,
     fallback labels for invalid convention files, and no-descent into leaf folders
   * AC-2: At least one test covers valid convention file scanning for both
     projects and events
   * AC-3: At least one test covers each invalid convention file variant
     (missing name, wrong type, empty file)
   * AC-4: At least one test verifies that grouping folders without a convention
     file appear as collapsible nodes

   **Test Scenarios:**

   **T-1 — Project convention file detection**
     Setup: ``jarvis.projectsFolder`` set to ``testdata/projects/``.
     ``alpha/project.yaml``, ``beta/project.yaml``, ``gamma/project.yaml`` exist
     with valid ``name`` fields.
     Action: Expand the Projects section.
     Expected: Three leaf nodes appear labeled "Project Alpha", "Project Beta",
     "Project Gamma" (the ``name`` field values). No raw file paths shown.

   **T-2 — Event convention file detection**
     Setup: ``jarvis.eventsFolder`` set to ``testdata/events/``.
     ``2025/2025-03-15-conference/event.yaml`` and other event folders exist.
     Action: Expand the Events section.
     Expected: Each folder containing ``event.yaml`` appears as a leaf node
     labeled with the event ``name``. Year folders (``2025/``, ``2027/``) appear
     as grouping nodes.

   **T-3 — Grouping folder (project)**
     Setup: ``testdata/projects/active/`` is a folder without ``project.yaml``
     but contains ``delta/project.yaml``.
     Action: Expand Projects → ``active/``.
     Expected: ``active/`` appears as a collapsible grouping node. Expanding it
     reveals "Project Delta" as a leaf node.

   **T-4 — Year-grouping folder (events)**
     Setup: ``testdata/events/2025/`` contains multiple event subfolders
     (``2025-03-15-conference/``, ``2025-06-20-workshop/``, ``2025-09-18-iot-summit/``).
     Action: Expand Events → ``2025/``.
     Expected: ``2025/`` appears as grouping node. Three events appear as leaf
     nodes inside.

   **T-5 — Fallback label: missing name field**
     Setup: ``testdata/projects/invalid-no-name/project.yaml`` exists but has no
     ``name`` field.
     Action: Expand Projects section.
     Expected: A leaf node appears labeled ``invalid-no-name`` (the folder name)
     instead of a project name. No crash or error toast.

   **T-6 — Fallback label: wrong type for name**
     Setup: ``testdata/projects/invalid-bad-name/project.yaml`` has ``name`` as
     an integer.
     Action: Expand Projects section.
     Expected: A leaf node appears labeled ``invalid-bad-name`` (the folder name).

   **T-7 — Fallback label: empty convention file (events)**
     Setup: ``testdata/events/invalid-empty/event.yaml`` is an empty file.
     Action: Expand Events section.
     Expected: A leaf node appears labeled ``invalid-empty`` (the folder name).

   **T-8 — No descent into leaf folders**
     Setup: ``testdata/projects/alpha/`` contains ``project.yaml`` and potentially
     other files (e.g. ``notes.md``).
     Action: Expand Projects section.
     Expected: ``alpha/`` is a leaf node only — no expand arrow, no child items.
     Scanner does not recurse into leaf folders.


.. story:: Empty-Branch Pruning Acceptance Tests
   :id: US_UAT_EVENTFILTER
   :status: approved
   :priority: optional
   :links: US_EXP_EVENTFILTER; REQ_EXP_EVENTFILTER; REQ_EXP_TREEVIEW

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for empty-branch pruning in
   the Events explorer tree,
   **so that** I can verify that grouping folders are hidden when the future-only
   filter removes all their descendant events.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for empty-branch pruning
     when the future-only filter is active
   * AC-2: At least one test covers a year folder where all events are past
     (fully pruned)
   * AC-3: At least one test covers the filter toggle restoring pruned branches

   **Test Scenarios:**

   **T-1 — Year folder pruned when all events are past**
     Setup: ``testdata/events/2025/`` contains only past events (end dates before
     today). Future-only filter is off.
     Action: Click the filter icon in the Events title bar to enable future-only.
     Expected: The ``2025/`` grouping node disappears entirely — it is not shown
     as an empty folder.

   **T-2 — Partial pruning: mixed year folders**
     Setup: ``testdata/events/`` has ``2025/`` (all past) and ``2027/`` (future
     event). Future-only filter is off.
     Action: Enable future-only filter.
     Expected: ``2027/`` remains visible with its future event. ``2025/`` is
     pruned (hidden). Root-level invalid events without dates remain visible
     (fail-open).

   **T-3 — Disable filter restores pruned branches**
     Setup: Future-only filter is active from T-1 or T-2; ``2025/`` is hidden.
     Action: Click the filter icon to disable future-only filter.
     Expected: ``2025/`` reappears with all its past events.

   **T-4 — Undated event survives pruning**
     Setup: ``testdata/events/invalid-bad-status/event.yaml`` has no ``dates.end``
     field. Future-only filter is off.
     Action: Enable future-only filter.
     Expected: ``invalid-bad-status`` leaf remains visible (fail-open behaviour).
     Its parent grouping folder (if any) is not pruned because it has a visible
     descendant.
