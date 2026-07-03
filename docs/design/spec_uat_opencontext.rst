Open Context UAT Design Specifications
========================================

.. spec:: Open Context Test Data
   :id: SPEC_UAT_OPENCONTEXT_FILES
   :status: approved
   :links: REQ_UAT_OPENCONTEXT_TESTDATA; SPEC_ENT_OPENCONTEXT_CMD

   **Superseded by the ``entity-tree-context-menu`` CR (2026-07-02).** See
   ``US_UAT_OPENCONTEXT`` for the full retirement rationale. Kept for
   historical traceability; the test data and outcomes below describe
   behavior of the now fully-retired ``jarvis.openContext`` command
   (``SPEC_ENT_OPENCONTEXT_CMD`` — Retired) and are no longer executable
   against current code. See ``SPEC_UAT_ENTITY_CONTEXTMENU`` for the
   surviving right-click "Open"/"Copy Path"/"Copy Full Path" coverage.

   **Description (historical):**
   A ``context.md`` test file is added to the ``alpha`` project testdata folder.
   Other project folders intentionally lack a ``context.md`` to support
   the missing-file test scenario without additional setup.

   **Test data:**

   * ``testdata/projects/alpha/context.md`` — used for T-1 (happy path project)
   * ``testdata/events/2025/2025-03-15-tech-conference/context.md`` — used for T-2
     (happy path event)
   * All other testdata project/event folders have no ``context.md`` — T-3
     (missing file) can be executed against any of them
   * ``testdata/projects/withsub/sub/context.md`` — used for T-6 (single subfolder
     match); no root ``context.md`` in ``withsub/`` (add one temporarily for T-9)
   * ``testdata/projects/multi/pm/context.md`` and
     ``testdata/projects/multi/qm/context.md`` — used for T-7 (multiple matches);
     no root ``context.md`` in ``multi/``
   * ``testdata/projects/hidden/.hidden/context.md`` — used for T-8 (hidden folder
     ignored); no non-hidden subfolder ``context.md`` in ``hidden/``

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 15 45 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (project happy path)
        - Click ``$(notebook)`` on ``alpha`` project node
        - ``context.md`` opens in editor; no notification
      * - T-2 (event happy path)
        - Click ``$(notebook)`` on the tech-conference event node
        - ``context.md`` opens in editor; no notification
      * - T-3 (missing file)
        - Click ``$(notebook)`` on a project/event node with no ``context.md``
        - Info notification "No context.md found for this entity" shown; no
          editor tab opens
      * - T-4 (folder node)
        - Hover over a grouping folder node
        - ``$(notebook)`` button is absent
      * - T-5 (all three buttons)
        - Hover over a project or event leaf node
        - ``$(go-to-file)``, ``$(comment-discussion)``, and ``$(notebook)``
          buttons are all visible
      * - T-6 (subfolder single match)
        - Click ``$(notebook)`` on ``withsub`` project node (no root context.md)
        - ``sub/context.md`` opens in editor; no picker or notification
      * - T-7 (multiple subfolder matches)
        - Click ``$(notebook)`` on ``multi`` project node
        - QuickPick shows ``pm/context.md`` and ``qm/context.md``; selected file
          opens in editor
      * - T-8 (hidden folder ignored)
        - Click ``$(notebook)`` on ``hidden`` project node
        - Info notification "No context.md found for this entity" shown; hidden
          file is NOT opened
      * - T-9 (direct hit precedence)
        - Add root ``context.md`` to ``withsub/``; click ``$(notebook)`` on node
        - Root ``context.md`` opens directly; no picker appears
