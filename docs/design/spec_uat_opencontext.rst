Open Context UAT Design Specifications
========================================

.. spec:: Open Context Test Data
   :id: SPEC_UAT_OPENCONTEXT_FILES
   :status: approved
   :links: REQ_UAT_OPENCONTEXT_TESTDATA; SPEC_EXP_OPENCONTEXT_CMD

   **Description:**
   A ``context.md`` test file is added to the ``alpha`` project testdata folder.
   Other project folders intentionally lack a ``context.md`` to support
   the missing-file test scenario without additional setup.

   **Test data:**

   * ``testdata/projects/alpha/context.md`` — used for T-1 (happy path project)
   * ``testdata/events/2025/2025-03-15-tech-conference/context.md`` — used for T-2
     (happy path event)
   * All other testdata project/event folders have no ``context.md`` — T-3
     (missing file) can be executed against any of them

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
