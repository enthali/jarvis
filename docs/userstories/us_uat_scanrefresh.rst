Scanner Refresh User Acceptance Tests
=======================================

.. story:: Manual Rescan Button Acceptance Tests
   :id: US_UAT_SCANREFRESH
   :status: implemented
   :priority: optional
   :links: US_EXP_SCANREFRESH

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the rescan button,
   **so that** I can verify the refresh icon triggers an immediate rescan
   end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for refresh button in
     Projects and Events title bars
   * AC-2: At least one test covers the Projects view rescan
   * AC-3: At least one test covers the Events view rescan

   **Test Scenarios:**

   **T-1 — Refresh icon visible in Projects title bar**
     Setup: ``testdata/projects/`` configured as ``jarvis.projectsFolder``.
     Action: Open the Jarvis sidebar, look at the Projects title bar.
     Expected: A ``$(refresh)`` icon is visible alongside the existing ``+``
     and filter icons.

   **T-2 — Refresh icon visible in Events title bar**
     Setup: ``testdata/events/`` configured as ``jarvis.eventsFolder``.
     Action: Look at the Events title bar.
     Expected: A ``$(refresh)`` icon is visible alongside the existing ``+``
     and filter icons.

   **T-3 — Rescan updates Projects after external change**
     Setup: Projects tree loaded. Create a new folder
     ``testdata/projects/zulu/project.yaml`` with ``name: "Zulu Project"``
     outside VS Code (e.g. in a terminal).
     Action: Click the refresh icon in the Projects title bar.
     Expected: "Zulu Project" appears in the tree within a few seconds.
     Cleanup: Remove the ``zulu/`` folder.

   **T-4 — Rescan updates Events after external change**
     Setup: Events tree loaded. Create a new folder
     ``testdata/events/2027/2027-06-01-demo/event.yaml`` with
     ``name: "Demo Event"`` and appropriate dates.
     Action: Click the refresh icon in the Events title bar.
     Expected: "Demo Event" appears in the tree within a few seconds.
     Cleanup: Remove the ``2027-06-01-demo/`` folder.


.. story:: YAML Content Change Detection Acceptance Tests
   :id: US_UAT_CONTENTDETECT
   :status: implemented
   :priority: optional
   :links: US_EXP_CONTENTDETECT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for YAML content change detection,
   **so that** I can verify the scanner detects data-only changes and updates
   the tree accordingly.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected outcomes for name changes and
     date changes in YAML files
   * AC-2: At least one test covers a project name change
   * AC-3: At least one test covers an event date change affecting filter behaviour

   **Test Scenarios:**

   **T-1 — Project name change detected after rescan**
     Setup: Projects tree loaded showing "Project Alpha".
     Action: Open ``testdata/projects/alpha/project.yaml`` in the editor.
     Change ``name: "Project Alpha"`` to ``name: "Alpha Renamed"``. Save.
     Click the refresh icon in the Projects title bar.
     Expected: The tree now shows "Alpha Renamed" instead of "Project Alpha".
     Cleanup: Revert the name back to "Project Alpha".

   **T-2 — Event date change detected after rescan**
     Setup: Events tree loaded with future-only filter active.
     ``2027/2027-01-10-meetup/event.yaml`` is visible (future event).
     Action: Open the event YAML file. Change ``dates.end`` to ``2020-01-01``.
     Save. Click the refresh icon in the Events title bar.
     Expected: With future-only filter active, the meetup disappears from the
     tree (it's now a past event).
     Cleanup: Revert ``dates.end`` to the original value.

   **T-3 — Name change detected via background scan**
     Setup: Projects tree loaded. Set ``jarvis.scanInterval`` to 20 seconds.
     Action: Edit ``testdata/projects/beta/project.yaml``, change name to
     "Beta Changed". Save. Wait at least 20 seconds.
     Expected: The tree updates to show "Beta Changed" without clicking refresh.
     Cleanup: Revert the name.


.. story:: Sort by Entity Name Acceptance Tests
   :id: US_UAT_NAMESORT
   :status: implemented
   :priority: optional
   :links: US_EXP_NAMESORT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for entity-name-based sorting,
   **so that** I can verify tree items appear sorted by their YAML name
   rather than folder name.

   **Acceptance Criteria:**

   * AC-1: Test scenarios document expected order of nodes in the tree
   * AC-2: At least one test covers leaf node sort order
   * AC-3: At least one test covers mixed folder and leaf sort order

   **Test Scenarios:**

   **T-1 — Projects sorted by YAML name, not folder name**
     Setup: ``testdata/projects/`` configured as ``jarvis.projectsFolder``.
     Projects: alpha (name: "Project Alpha"), beta (name: "Project Beta"),
     gamma (name: "Project Gamma"), active/ (grouping folder with delta inside).
     Action: Expand the Projects section.
     Expected: Root-level items appear in order: ``active/``, "Project Alpha",
     "Project Beta", "Project Gamma" — sorted alphabetically by display name
     (folder name for grouping nodes, entity name for leaves).

   **T-2 — Events sorted by YAML name within year folders**
     Setup: ``testdata/events/`` configured as ``jarvis.eventsFolder``.
     The ``2025/`` grouping folder contains multiple events.
     Action: Expand the Events section, then expand ``2025/``.
     Expected: Events inside ``2025/`` are sorted alphabetically by their
     YAML ``name`` field, not by the folder name (date prefix).

   **T-3 — Sort is case-insensitive**
     Setup: A project with name "alpha test" and another with "Beta Project".
     Action: View Projects tree.
     Expected: "alpha test" appears before "Beta Project" (case-insensitive
     alphabetical sort).
