Reminders UAT Design Specifications
=====================================

.. spec:: Reminders Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_REMINDERS_SCENARIOS
   :status: approved
   :links: REQ_UAT_REMINDERS_TESTENV; REQ_UAT_REMINDERS_TOOLS; REQ_UAT_REMINDERS_DELIVER; REQ_UAT_REMINDERS_VIEW; REQ_UAT_REMINDERS_OPENFILE

   **Description:**
   Step-by-step procedures and expected outcomes for all eight Reminders
   acceptance test scenarios, covering tool calls, tree display, delivery
   timing, persistence, cancellation, and click-to-open behaviour.

   **Test Setup:**

   * Extension Development Host running with Jarvis extension loaded.
   * An agent chat session is open (e.g. "project-manager" or any session).
   * A chat session named "TestTarget" is open (create via
     **Jarvis: New Chat Session** if needed).
   * ``reminders.yaml`` starts absent or empty — delete from the extension
     storage folder before the first full run to ensure a clean state.
   * Note the current UTC time to calculate ``deliverAt`` values.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result
      * - T-1 (set reminder)
        - In agent chat call:
          ``jarvis_setReminder({ text: "T-1 test reminder", session: "TestTarget", deliverAt: "<now+30s>" })``.
          Observe the "Reminders" sidebar view.
        - Tool returns JSON with ``id`` (non-empty UUID string) and
          ``deliverAt`` (ISO-8601). A new node labelled with the reminder
          text or id appears in the "Reminders" view immediately.
      * - T-2 (delivery fires)
        - Continue from T-1. Wait until the ``deliverAt`` time passes
          (up to ~35 s). Watch the "TestTarget" chat session.
        - Within 5 s of ``deliverAt``, the text "T-1 test reminder" is
          delivered to "TestTarget" (auto-delivery notification or injected
          message). No manual action required.
      * - T-3 (reminder removed after delivery)
        - Immediately after T-2 completes. Observe the "Reminders" view
          and, optionally, open ``reminders.yaml`` in the extension
          storage folder.
        - The reminder node is absent from the "Reminders" view.
          ``reminders.yaml`` contains no entry with the T-1 reminder id.
          The file may be empty or absent if no other reminders exist.
      * - T-4 (listReminders fields)
        - Register a new reminder with ``deliverAt`` 5 min in the future.
          Call ``jarvis_listReminders()`` in the agent chat.
        - Response is a JSON array. The pending reminder entry has all of:
          ``id``, ``text``, ``session``, ``deliverAt``, and a remaining-
          time field ``remainingMs``. No previously delivered
          reminder (from T-2) appears in the list.
      * - T-5 (cancel before delivery)
        - Register a reminder with ``deliverAt`` 3 min in the future; note
          its ``id``. Call
          ``jarvis_cancelReminder({ id: "<id>" })``.
          Wait past the original ``deliverAt``.
        - Tool returns success. The reminder node disappears from the
          "Reminders" view immediately. ``reminders.yaml`` has no entry for
          that id. No message is delivered to "TestTarget" after the
          original ``deliverAt``.
      * - T-6 (survives reload)
        - Register a reminder with ``deliverAt`` 2 min in the future.
          Confirm node appears in the "Reminders" view. Run **Developer:
          Reload Window** (Ctrl+Shift+P). Wait for extension to re-activate.
          Wait for ``deliverAt`` to pass.
        - After reload the "Reminders" view still shows the reminder node.
          When ``deliverAt`` is reached the message is delivered to
          "TestTarget" normally (same as T-2 behaviour).
      * - T-7 (overdue delivers immediately)
        - Ensure no pending reminders. Close VS Code is not required —
          edit ``reminders.yaml`` directly: insert a single entry with a
          fresh UUID, ``session: "TestTarget"``, ``text: "T-7 overdue"``,
          and a ``deliverAt`` 10–15 s in the past (ISO 8601). Save the
          file. This bypasses the ``jarvis_setReminder`` tool, which
          rejects past timestamps.
        - Within 5 s (one poll tick) the message is delivered to the target
          session. The reminder node disappears from the tree. No error is
          shown in the Jarvis output channel.
      * - T-8 (click opens reminders.yaml)
        - With at least one pending reminder visible in the "Reminders"
          view, single-click the reminder node label.
        - ``reminders.yaml`` opens in the editor and the cursor is placed
          on the line ``id: <uuid>`` matching the clicked reminder. No
          warning notification appears.

.. spec:: Reminders Test Utilities
   :id: SPEC_UAT_REMINDERS_UTILS
   :status: approved
   :links: REQ_UAT_REMINDERS_TESTENV; SPEC_UAT_REMINDERS_SCENARIOS

   **Description:**
   Practical helpers for computing timestamps and locating ``reminders.yaml``
   during test execution.

   **Timestamp Calculation:**

   Use the following snippet in any agent chat or browser console to obtain
   an ISO-8601 timestamp *N* seconds from now::

      new Date(Date.now() + N * 1000).toISOString()

   For T-7 (overdue), subtract instead of add::

      new Date(Date.now() - 12000).toISOString()

   **Locating reminders.yaml:**

   ``reminders.yaml`` is stored in the VS Code extension storage folder,
   co-located with ``messages.json``. To find it:

   1. Open the Jarvis output channel ("Jarvis" in the Output panel).
   2. Look for a log line containing the storage path on extension activation,
      or
   3. Use **Help → Open Extension Storage Folder** (if available in your build)
      and navigate to the Jarvis extension folder.

   **Clean State:**

   Before running the full test suite, delete or empty ``reminders.yaml``
   to avoid interference from previous runs.
