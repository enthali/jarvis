Reminders UAT Requirements
===========================

.. req:: Reminders Test Environment
   :id: REQ_UAT_REMINDERS_TESTENV
   :status: approved
   :priority: optional
   :links: US_UAT_REMINDERS; REQ_MSG_REMINDERS_TOOLS; REQ_MSG_REMINDERS_PERSIST

   **Description:**
   The test environment SHALL provide the prerequisites needed to execute all
   eight Reminders test scenarios manually.

   **Acceptance Criteria:**

   * AC-1: The Extension Development Host SHALL be running with the Jarvis
     extension loaded and a chat session named "TestTarget" open.
   * AC-2: The tester SHALL be able to call LM tools (``jarvis_setReminder``,
     ``jarvis_listReminders``, ``jarvis_cancelReminder``) interactively from an
     agent chat window.
   * AC-3: The tester SHALL be able to inspect ``reminders.yaml`` in the
     extension storage folder to verify persistence state.
   * AC-4: No additional test-data files beyond the running extension are
     required; all reminders are created on-the-fly via LM tool calls.

.. req:: Reminders Tool Correctness Requirements
   :id: REQ_UAT_REMINDERS_TOOLS
   :status: approved
   :priority: optional
   :links: US_UAT_REMINDERS; REQ_MSG_REMINDERS_TOOLS

   **Description:**
   The three Reminders LM tools SHALL behave as specified for test scenarios
   T-1, T-4, and T-5.

   **Acceptance Criteria:**

   * AC-1: ``jarvis_setReminder`` SHALL return a JSON object with ``id``
     (UUID string) and ``deliverAt`` (ISO-8601 string) for T-1.
   * AC-2: ``jarvis_listReminders`` SHALL return an array where each element
     has ``id``, ``text``, ``session``, ``deliverAt``, and a remaining-time
     field; delivered reminders SHALL NOT appear (T-4).
   * AC-3: ``jarvis_cancelReminder`` SHALL remove the specified reminder and
     return a success indicator without error; calling it on a non-existent id
     SHALL NOT crash the extension (T-5).

.. req:: Reminders Delivery and Persistence Requirements
   :id: REQ_UAT_REMINDERS_DELIVER
   :status: approved
   :priority: optional
   :links: US_UAT_REMINDERS; REQ_MSG_REMINDERS_DELIVER; REQ_MSG_REMINDERS_PERSIST

   **Description:**
   The poll loop and persistence layer SHALL satisfy the delivery and durability
   guarantees verified by T-2, T-3, T-6, and T-7.

   **Acceptance Criteria:**

   * AC-1: A reminder SHALL be delivered to the target session within 5 s of
     ``deliverAt`` (T-2).
   * AC-2: After delivery, the reminder entry SHALL be absent from both
     ``reminders.yaml`` and the "Reminders" sidebar view (T-3).
   * AC-3: ``reminders.yaml`` SHALL survive a VS Code window reload; reminders
     in the file SHALL be re-loaded and delivered when due (T-6).
   * AC-4: A reminder whose ``deliverAt`` is already in the past at load time
     SHALL be delivered on the first poll tick after the extension activates
     (T-7).

.. req:: Reminders View Requirements
   :id: REQ_UAT_REMINDERS_VIEW
   :status: approved
   :priority: optional
   :links: US_UAT_REMINDERS; REQ_MSG_REMINDERS_VIEW

   **Description:**
   A dedicated "Reminders" sidebar view in the Jarvis Activity Bar container
   SHALL display open reminders, as verified by T-1 and T-3.

   **Acceptance Criteria:**

   * AC-1: After calling ``jarvis_setReminder``, a node for the new reminder
     SHALL appear in the "Reminders" view without requiring a manual tree
     refresh (T-1).
   * AC-2: After a reminder fires or is cancelled, its node SHALL be removed
     from the "Reminders" view automatically (T-3, T-5).
   * AC-3: The "Reminders" view SHALL be visible (possibly empty) when no
     reminders are pending.

.. req:: Reminders Click-to-Open Requirements
   :id: REQ_UAT_REMINDERS_OPENFILE
   :status: approved
   :priority: optional
   :links: US_UAT_REMINDERS; REQ_EXP_REMINDER_OPENFILE

   **Description:**
   Clicking a reminder node in the "Reminders" sidebar view SHALL open
   ``reminders.yaml`` in the editor at the matching entry, as verified by
   T-8.

   **Acceptance Criteria:**

   * AC-1: A single click on a reminder node SHALL open ``reminders.yaml``
     in the editor (T-8).
   * AC-2: The cursor SHALL be placed on the line containing
     ``id: <uuid>`` matching the clicked reminder (T-8).
   * AC-3: No warning notification SHALL appear when the reminders file
     exists and contains the entry (T-8).
