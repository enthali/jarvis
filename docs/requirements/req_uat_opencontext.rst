Open Context UAT Requirements
==============================

.. req:: Open Context Test Data
   :id: REQ_UAT_OPENCONTEXT_TESTDATA
   :status: approved
   :priority: optional
   :links: US_UAT_OPENCONTEXT; REQ_EXP_OPENCONTEXT

   **Description:**
   The repo SHALL provide test data files for manual verification of the
   Open Context command.

   **Acceptance Criteria:**

   * AC-1: A ``context.md`` file SHALL exist in at least one project testdata
     folder (e.g. ``testdata/projects/alpha/context.md``) for happy-path testing
   * AC-2: At least one project testdata folder SHALL NOT contain a ``context.md``
     so that the missing-file scenario (T-3) can be tested without setup steps
   * AC-3: Expected outcomes for each test scenario (T-1 through T-5 from
     ``US_UAT_OPENCONTEXT``) SHALL be documented in the test protocol
   * AC-4: Test instructions SHALL specify that ``jarvis.projectsFolder`` is
     pointed at the ``testdata/projects/`` directory in the Extension
     Development Host
