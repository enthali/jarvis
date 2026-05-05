Stable Session Open UAT Design Specifications
===============================================

.. spec:: Stable Session Open Test Data
   :id: SPEC_UAT_MSG_STABLESESSION_FILES
   :status: approved
   :links: REQ_UAT_MSG_STABLESESSION_FILES; US_MSG_STABLESESSION

   **Description:**
   Test data for the Stable Session Open feature reuses existing
   ``testdata/projects/alpha/`` project leaf. A ``context.md`` file must be
   present in that folder. Session state is live (``state.vscdb``); testers
   manage open chat sessions manually in the Extension Development Host.

   **Test data:**

   * ``testdata/projects/alpha/project.yaml`` — project leaf used for T-1 to T-5
   * ``testdata/projects/alpha/context.md`` — initialization prompt source for T-4
   * Live ``state.vscdb`` sessions — no additional files required


.. spec:: Stable Session Open Expected Outcomes
   :id: SPEC_UAT_MSG_STABLESESSION_OUTCOMES
   :status: approved
   :links: REQ_UAT_MSG_STABLESESSION_TESTDATA; REQ_MSG_PINNED; REQ_MSG_OPENCHAT; REQ_MSG_SENDPROMPT

   **Description:**
   Expected outcome table for each Stable Session Open test scenario.

   **Expected test outcomes (documented in test protocol):**

   .. list-table::
      :header-rows: 1
      :widths: 12 48 40

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (new session)
        - Run ``Jarvis: Open Agent Session`` on "alpha" with no existing session
        - New chat session created and becomes active tab
      * - T-2 (reuse session)
        - Run ``Jarvis: Open Agent Session`` on "alpha" with existing "alpha" session
        - Existing "alpha" session is focused; no second session created
      * - T-3 (pinned open)
        - Run command with existing "alpha" session
        - Session tab is permanent (not italicised / not preview)
      * - T-4 (init prompt)
        - Run command on "alpha" with no existing session; project has context.md
        - Chat input receives prompt containing absolute path to context.md
      * - T-5 (rename)
        - Run command on "alpha" with no existing session
        - Chat session tab is renamed to "alpha" after creation
