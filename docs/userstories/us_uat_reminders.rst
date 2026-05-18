Reminders User Acceptance Tests
================================

.. story:: Reminders Acceptance Tests
   :id: US_UAT_REMINDERS
   :status: approved
   :priority: optional
   :links: US_MSG_REMINDERS

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the Reminders
   feature,
   **so that** I can verify end-to-end that agents can schedule time-stamped
   reminders that are persisted, displayed in the tree, and automatically
   delivered to the target session when due.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_setReminder`` registers a reminder
     and returns a response containing ``id`` and ``deliverAt``.
   * AC-2: A test verifies that a pending reminder appears as a node in the
     dedicated "Reminders" sidebar view (Jarvis Activity Bar).
   * AC-3: A test verifies that when ``deliverAt`` is reached (±5 s), the
     message is delivered to the target session via auto-delivery.
   * AC-4: A test verifies that after delivery the reminder is removed from
     ``reminders.yaml`` and from the tree.
   * AC-5: A test verifies that ``jarvis_listReminders`` returns all open
     reminders with ``id``, ``text``, ``session``, ``deliverAt``, and remaining
     time fields.
   * AC-6: A test verifies that ``jarvis_cancelReminder`` removes a pending
     reminder before it fires.
   * AC-7: A test verifies that a pending reminder survives a VS Code window
     reload and is delivered when due.
   * AC-8: A test verifies that clicking a reminder node opens
     ``reminders.yaml`` in the editor with the cursor on the matching
     ``id: <uuid>`` line.

   **Test Scenarios:**

   **T-1 — setReminder registers reminder and returns id + deliverAt**
     Setup: Extension running in Extension Development Host; a chat session is
     open (e.g. "TestTarget").
     Action: In an agent chat, call
     ``jarvis_setReminder({ text: "T-1 test reminder", session: "TestTarget", deliverAt: "<now+30s ISO>" })``.
     Expected: Tool returns a JSON object with string fields ``id`` (UUID) and
     ``deliverAt`` (ISO-8601 timestamp). The "Reminders" sidebar view shows a
     new node for this reminder.

   **T-2 — Reminder fires and is delivered to target session**
     Setup: Reminder from T-1 (or a fresh one) set to fire in 30–60 s;
     "TestTarget" chat session is open.
     Action: Wait until ``deliverAt`` passes (up to ~65 s including one poll
     tick margin).
     Expected: The message "T-1 test reminder" appears in the "TestTarget"
     chat session via auto-delivery (notification or injected message).

   **T-3 — After delivery, reminder is removed from yaml and tree**
     Setup: Reminder has just fired (from T-2).
     Action: Inspect the "Reminders" view and, optionally, open ``reminders.yaml``
     in the extension storage folder.
     Expected: The reminder node is gone from the "Reminders" view.
     ``reminders.yaml`` no longer contains an entry with the reminder's id.

   **T-4 — listReminders returns open reminders with correct fields**
     Setup: At least one pending reminder exists (e.g. registered with
     ``deliverAt`` 5 min in the future).
     Action: In an agent chat, call ``jarvis_listReminders()`` with no arguments.
     Expected: JSON response contains an array; each entry has ``id``,
     ``text``, ``session``, ``deliverAt``, and a remaining-time field (e.g.
     ``remainingMs``). The pending reminder from the setup
     is present; no already-delivered reminders appear.

   **T-5 — cancelReminder removes a pending reminder before delivery**
     Setup: Register a reminder with ``deliverAt`` at least 60 s in the future.
     Note its ``id``.
     Action: Call ``jarvis_cancelReminder({ id: "<id>" })`` before the reminder
     fires.
     Expected: Tool returns a success response. The reminder node disappears
     from the tree. ``reminders.yaml`` no longer contains that id. Waiting
     past the original ``deliverAt`` produces no delivery.

   **T-6 — Pending reminder survives VS Code window reload**
     Setup: Register a reminder with ``deliverAt`` 2 min in the future; confirm
     it appears in the tree.
     Action: Run **Developer: Reload Window** (Ctrl+Shift+P → Reload Window).
     Wait for the extension to re-initialise.
     Expected: After reload the "Reminders" view still shows the reminder node.
     When ``deliverAt`` is reached the message is delivered normally.

   **T-7 — Overdue reminder delivers immediately on next tick**
     Setup: No pending reminders.
     Action: Edit ``reminders.yaml`` directly (bypassing the tool, which
     rejects past timestamps): insert a single entry with a fresh UUID,
     ``session: "TestTarget"``, ``text: "T-7 overdue"``, and a ``deliverAt``
     10–15 s in the past (ISO 8601).
     Expected: Within 5 s (one poll tick) the message is delivered to the
     target session. The reminder is then absent from the tree and
     ``reminders.yaml``.

   **T-8 — Clicking a reminder node opens reminders.yaml at its entry**
     Setup: At least one pending reminder visible in the "Reminders" view.
     Action: Single-click the reminder node label.
     Expected: ``reminders.yaml`` opens in the editor; the cursor is on
     the line containing ``id: <uuid>`` matching the clicked reminder.
