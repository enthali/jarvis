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

   **Acceptance Criteria:**

   * AC-1: Repo contains sample YAML files for Projects and Events under
     ``testdata/projects/`` and ``testdata/events/``
   * AC-2: Files conform to the JSON Schemas (project.schema.json, event.schema.json)
   * AC-3: At least 3 projects and 3 events with various status values
   * AC-4: Test scenarios document expected outcomes for: sidebar display,
     folder hierarchy, project filter, event filter, open YAML, and error handling
   * AC-5: At least one test covers subfolder display
   * AC-6: At least one test covers invalid YAML handling

   **Test Scenarios:**

   **T-1 — Sidebar appears in Activity Bar**
     Setup: ``testdata/projects/`` configured as ``jarvis.projectsFolder``,
     ``testdata/events/`` as ``jarvis.eventsFolder``.
     Action: Click the Jarvis icon in the Activity Bar.
     Expected: Sidebar opens with three collapsible sections: "Projects",
     "Events", and "Messages".

   **T-2 — Projects tree displays YAML files**
     Setup: Same as T-1; ``testdata/projects/`` contains 3+ valid YAML files.
     Action: Expand the Projects section.
     Expected: Each valid YAML file appears as a leaf node showing the
     project ``name``. Invalid files (``project-invalid-no-name.yaml``,
     ``project-invalid-bad-name.yaml``) are handled gracefully (shown with
     filename or omitted — no crash).

   **T-3 — Subfolder hierarchy displayed**
     Setup: ``testdata/projects/active/`` contains ``project-delta.yaml``.
     Action: Expand Projects section.
     Expected: ``active/`` appears as a collapsible folder node. Expanding it
     reveals "Project Delta" as a leaf item.

   **T-4 — Events tree displays YAML files**
     Setup: ``testdata/events/`` contains 3+ valid YAML files.
     Action: Expand the Events section.
     Expected: Each valid event appears as a leaf node showing the event
     ``name``. Invalid files are handled gracefully.

   **T-5 — Event subfolder hierarchy**
     Setup: ``testdata/events/conferences/`` contains ``event-iot-summit.yaml``.
     Action: Expand Events section.
     Expected: ``conferences/`` appears as a collapsible folder node with
     "IoT Summit" inside.

   **T-6 — Open YAML via inline button**
     Setup: Projects tree loaded.
     Action: Hover over "Project Alpha" leaf node; click ``$(go-to-file)`` button.
     Expected: ``project-alpha.yaml`` opens in the VS Code editor.

   **T-7 — Folder nodes have no open-YAML button**
     Setup: Projects tree loaded with ``active/`` subfolder visible.
     Action: Hover over the ``active/`` folder node.
     Expected: No ``$(go-to-file)`` button visible.

   **T-8 — Project folder filter**
     Setup: Projects tree shows ``active/`` subfolder and root-level projects.
     Action: Click the filter icon in the Projects title bar; deselect ``active/``.
     Expected: ``active/`` folder and its contents disappear from the tree.
     Re-opening the filter shows ``active/`` unchecked.

   **T-9 — Project filter persists across restart**
     Setup: T-8 filter applied (``active/`` hidden).
     Action: Reload the VS Code window (Developer: Reload Window).
     Expected: ``active/`` remains hidden after reload.

   **T-10 — Future event filter**
     Setup: Events tree loaded; ``testdata/events/`` contains events with
     past and future ``dates.end`` values.
     Action: Click the filter icon in the Events title bar.
     Expected: Only events whose ``dates.end`` is today or later are shown.
     Events without a parseable end date remain visible (fail-open).

   **T-11 — Config change triggers rescan**
     Setup: Extension active with ``jarvis.projectsFolder`` pointing to
     ``testdata/projects/``.
     Action: Change ``jarvis.projectsFolder`` to an empty directory.
     Expected: Projects tree clears immediately; no errors.

   **T-12 — Invalid YAML files handled gracefully**
     Setup: ``testdata/projects/`` contains ``project-invalid-no-name.yaml``
     (missing name) and ``project-invalid-bad-name.yaml`` (wrong type).
     Action: Expand Projects section.
     Expected: Extension does not crash or show error toasts. Invalid files
     are either shown with their filename or omitted silently.
