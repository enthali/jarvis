Explorer User Acceptance Tests
================================

.. story:: Explorer Sidebar Acceptance Tests
   :id: US_UAT_SAMPLEDATA
   :status: implemented
   :priority: mandatory
   :links: US_EXP_SIDEBAR; US_ENT_OPENYAML; US_CFG_PROJECTPATH

   **As a** Jarvis Test Engineer,
   **I want** a versioned test dataset in the repo and manual acceptance test
   scenarios for the Explorer sidebar,
   **so that** I can test features reproducibly without relying on live data
   and verify the Explorer end-to-end before release.

   **Scope:** Smoke tests with testdata — sidebar appearance, open-YAML,
   config changes. Convention-file detection semantics (fallback labels, grouping
   folders, no-descent) are tested in ``US_UAT_SIDEBAR``.

   *Note (one-kind-consolidation CR):* The former project folder filter
   (T-4), the project filter persistence test (T-5), and the future-event
   filter (T-6) are removed together with the Project/Event entity kinds.
   The test dataset (AC-1…AC-3) is retained until Phase 2; at that point the
   Projects/Events sections of this UAT are deleted. T-4 (renumbered from
   former T-7) covers the config-change rescan for the Projects tree.

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

   **T-4 — Config change triggers rescan**
     Setup: Extension active with ``jarvis.projectsFolder`` pointing to
     ``testdata/projects/``.
     Action: Change ``jarvis.projectsFolder`` to an empty directory.
     Expected: Projects tree clears immediately; no errors.
