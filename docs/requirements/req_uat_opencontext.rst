Open Context UAT Requirements
==============================

.. req:: Open Context Test Data
   :id: REQ_UAT_OPENCONTEXT_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_OPENCONTEXT; REQ_ENT_OPENCONTEXT

   **Superseded by the ``entity-tree-context-menu`` CR (2026-07-02).** See
   ``US_UAT_OPENCONTEXT`` for the full rationale — ``jarvis.openContext`` and
   its 3-step discovery algorithm are fully retired with no surviving
   equivalent. Kept for historical traceability; describes retired test data
   requirements only.

   **Description (historical):**
   The repo SHALL provide test data files for manual verification of the
   Open Context command.

   **Acceptance Criteria (historical, retired):**

   * AC-1: A ``context.md`` file SHALL exist in at least one project testdata
     folder (e.g. ``testdata/projects/alpha/context.md``) for happy-path testing
   * AC-2: At least one project testdata folder SHALL NOT contain a ``context.md``
     so that the missing-file scenario (T-3) can be tested without setup steps
   * AC-3: Expected outcomes for each test scenario (T-1 through T-5 from
     ``US_UAT_OPENCONTEXT``) SHALL be documented in the test protocol
   * AC-4: Test instructions SHALL specify that ``jarvis.projectsFolder`` is
     pointed at the ``testdata/projects/`` directory in the Extension
     Development Host
   * AC-5: A project testdata folder SHALL exist where ``context.md`` is absent
     at root but present in exactly one non-hidden subfolder, to support T-6
     (e.g. ``testdata/projects/withsub/sub/context.md``)
   * AC-6: A project testdata folder SHALL exist where ``context.md`` is absent
     at root but present in two or more non-hidden subfolders, to support T-7
     (e.g. ``testdata/projects/multi/pm/context.md`` and
     ``testdata/projects/multi/qm/context.md``)
   * AC-7: A project testdata folder SHALL exist where ``context.md`` only
     appears inside a hidden subfolder (name starts with ``.``), to support
     T-8 (e.g. ``testdata/projects/hidden/.hidden/context.md``)
   * AC-8: The ``withsub`` project MAY also contain a root ``context.md`` so
     that T-9 (direct-hit precedence) can be executed by adding that file
