Create Event Tool User Acceptance Tests
=========================================

.. story:: Create Event LM Tool Acceptance Tests
   :id: US_UAT_CREATEEVENT
   :status: draft
   :priority: optional
   :links: US_EXP_CREATEEVENT; REQ_EXP_CREATEEVENT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the ``jarvis_createEvent``
   Language Model and MCP tool,
   **so that** I can verify that programmatic event creation works end-to-end,
   including folder naming convention (``<date>_<name>``), duplicate guard, and
   parameter validation.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_createEvent`` creates a folder named
     ``<startDate>_<name>`` (underscore separator, raw name verbatim), writes
     ``event.yaml`` and ``context.md``, and returns ``created: true`` (maps to
     ``US_EXP_CREATEEVENT`` AC-1, AC-2, AC-4 / T-10).
   * AC-2: A test verifies that the Events Tree reflects the new event within
     2 seconds without a manual rescan (maps to ``US_EXP_CREATEEVENT`` AC-3
     / T-10).
   * AC-3: A test verifies that a duplicate folder returns ``created: false``
     without overwriting files (maps to ``US_EXP_CREATEEVENT`` AC-5 / T-11).
   * AC-4: A test verifies that an invalid date format or non-calendar date
     returns an error and does not create any folder (maps to
     ``US_EXP_CREATEEVENT`` AC-6 / T-12).
   * AC-5: A test verifies that omitting the required ``startDate`` parameter
     causes the tool to return an error (maps to ``US_EXP_CREATEEVENT`` AC-4
     / T-13).

   **Test Scenarios (summary):**

   * T-10: Happy path — ``<date>_<name>`` folder created; YAML with correct
     fields; tree auto-refreshes.
   * T-11: Duplicate event → ``created: false``; no files overwritten.
   * T-12: Invalid date format or non-calendar date → error; no folder.
   * T-13: Missing required ``startDate`` → error.
