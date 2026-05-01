Auto Delivery User Acceptance Tests
=====================================

.. story:: Auto Delivery Acceptance Tests
   :id: US_UAT_MSG_AUTODELIVERY
   :status: approved
   :priority: optional
   :links: US_MSG_AUTODELIVERY

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the auto-delivery feature,
   so that I can verify end-to-end that messages are automatically sent to
   registered sessions without manual intervention.

   **Acceptance Criteria:**

   * AC-1: The Messages tree always shows an "Auto Delivery" group node, even
     when no sessions are registered
   * AC-2: Any session node in the manual root has a context menu entry
     "Enable Direct Delivery"
   * AC-3: Enabling direct delivery moves the session node into the "Auto
     Delivery" group and persists the change to ``autodelivery.json``
   * AC-4: Auto Delivery session nodes have a "Disable Direct Delivery" context
     menu entry that moves them back to the manual root
   * AC-5: The poll loop auto-delivers a queued message to a registered session
     without the user pressing the Play button
   * AC-6: An auto-delivered message is not re-delivered on subsequent ticks
     (``notified`` flag prevents duplicates)
   * AC-7: The manual Play button still works for sessions that are in the Auto
     Delivery group

   **Test Scenarios:**

   **T-1 — "Auto Delivery" group node always visible**
     Setup: No sessions registered for auto-delivery.
     Action: Open the Jarvis Explorer sidebar and expand the Messages view.
     Expected: An "Auto Delivery" group node is visible (may show "0 sessions"
     or be empty), distinct from the manual message root.

   **T-2 — "Enable Direct Delivery" context menu on manual session node**
     Setup: At least one queued message exists for a session (e.g. "TestTarget"),
     so the session node appears under the manual root.
     Action: Right-click the "TestTarget" session node.
     Expected: Context menu contains the entry "Enable Direct Delivery".

   **T-3 — Enable Direct Delivery moves session to Auto Delivery group**
     Setup: "TestTarget" session node visible in manual root (from T-2).
     Action: Right-click "TestTarget" → "Enable Direct Delivery".
     Expected: "TestTarget" node disappears from the manual root and reappears
     inside the "Auto Delivery" group. Tree refreshes without requiring a manual
     rescan.

   **T-4 — autodelivery.json created/updated on enable**
     Setup: Before enabling, ``autodelivery.json`` either does not exist or does
     not contain "TestTarget".
     Action: Perform T-3 (enable auto-delivery for "TestTarget").
     Expected: ``autodelivery.json`` in the extension storage folder is
     created (if absent) or updated to include "TestTarget".

   **T-5 — "Disable Direct Delivery" context menu on Auto Delivery session node**
     Setup: "TestTarget" is in the Auto Delivery group (from T-3/T-4).
     Action: Right-click the "TestTarget" node inside the "Auto Delivery" group.
     Expected: Context menu contains the entry "Disable Direct Delivery".

   **T-6 — Disable Direct Delivery moves session back to manual root**
     Setup: "TestTarget" is in the Auto Delivery group.
     Action: Right-click "TestTarget" → "Disable Direct Delivery".
     Expected: "TestTarget" disappears from the "Auto Delivery" group and
     reappears in the manual root (assuming messages are still queued for it).
     ``autodelivery.json`` no longer lists "TestTarget".

   **T-7 — Poll loop auto-delivers message without manual Play**
     Setup: "TestTarget" is registered for auto-delivery. A chat session named
     "TestTarget" is open. Queue a message for "TestTarget" (e.g. via a
     heartbeat job or the ``jarvis_readMessage`` test helper).
     Action: Wait up to 10 seconds (two poll ticks).
     Expected: The message is delivered to the "TestTarget" chat session
     automatically — no Play button click required. The "TestTarget" node in
     the Auto Delivery group shows an updated (or cleared) message count.

   **T-8 — Auto-delivered message not re-delivered on next tick**
     Setup: T-7 completed; the message was delivered.
     Action: Wait another 10 seconds (two more poll ticks).
     Expected: The message is NOT delivered a second time. No duplicate
     notification appears in the "TestTarget" chat session.

   **T-9 — Manual Play button works for Auto Delivery session**
     Setup: "TestTarget" is in the Auto Delivery group. A new message is queued.
     Action: Click the Play (``$(play)``) button on the "TestTarget" node in
     the Auto Delivery group before the next poll tick fires.
     Expected: The message is delivered immediately, same as for a manual
     session. No error is shown. The message is not delivered a second time by
     the subsequent poll tick.
