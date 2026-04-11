Explorer User Acceptance Tests
================================

.. story:: Explorer Sidebar Acceptance Tests
   :id: US_UAT_SAMPLEDATA
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_EXP_PROJECTFILTER; US_EXP_EVENTFILTER; US_EXP_OPENYAML; US_CFG_PROJECTPATH

   **As a** Jarvis Test Engineer,
   **I want** a versioned test dataset in the repo and manual acceptance test
   scenarios for the Explorer sidebar,
   **so that** I can test features reproducibly without relying on live data
   and verify the Explorer end-to-end before release.

   **Scope:** Smoke tests with testdata — sidebar appearance, filters, open-YAML,
   config changes. Convention-file detection semantics (fallback labels, grouping
   folders, no-descent) are tested in ``US_UAT_SIDEBAR``.

   **Acceptance Criteria:**

   * AC-1: Repo contains sample YAML files for Projects and Events under
     ``testdata/projects/`` and ``testdata/events/``
   * AC-2: Files conform to the JSON Schemas (project.schema.json, event.schema.json)
   * AC-3: At least 3 projects and 3 events with various status values
   * AC-4: Test scenarios document expected outcomes for: sidebar display,
     filters, open YAML, and config changes
   * AC-5: At least one test covers subfolder display
   * AC-6: At least one test covers invalid YAML handling

   **Test Scenarios:**

   **T-1 — Sidebar appears in Activity Bar**
     Setup: ``testdata/projects/`` configured as ``jarvis.projectsFolder``,
     ``testdata/events/`` as ``jarvis.eventsFolder``.
     Action: Click the Jarvis icon in the Activity Bar.
     Expected: Sidebar opens with four collapsible sections: "Projects",
     "Events", "Messages", and "Heartbeat".

   **T-2 — Open YAML via inline button**
     Setup: Projects tree loaded.
     Action: Hover over "Project Alpha" leaf node; click ``$(go-to-file)`` button.
     Expected: ``project-alpha.yaml`` opens in the VS Code editor.

   **T-3 — Folder nodes have no open-YAML button**
     Setup: Projects tree loaded with ``active/`` subfolder visible.
     Action: Hover over the ``active/`` folder node.
     Expected: No ``$(go-to-file)`` button visible.

   **T-4 — Project folder filter**
     Setup: Projects tree shows ``active/`` subfolder and root-level projects.
     Action: Click the filter icon in the Projects title bar; deselect ``active/``.
     Expected: ``active/`` folder and its contents disappear from the tree.
     Re-opening the filter shows ``active/`` unchecked.

   **T-5 — Project filter persists across restart**
     Setup: T-4 filter applied (``active/`` hidden).
     Action: Reload the VS Code window (Developer: Reload Window).
     Expected: ``active/`` remains hidden after reload.

   **T-6 — Future event filter**
     Setup: Events tree loaded; ``testdata/events/`` contains events with
     past and future ``dates.end`` values.
     Action: Click the filter icon in the Events title bar.
     Expected: Only events whose ``dates.end`` is today or later are shown.
     Events without a parseable end date remain visible (fail-open).

   **T-7 — Config change triggers rescan**
     Setup: Extension active with ``jarvis.projectsFolder`` pointing to
     ``testdata/projects/``.
     Action: Change ``jarvis.projectsFolder`` to an empty directory.
     Expected: Projects tree clears immediately; no errors.
