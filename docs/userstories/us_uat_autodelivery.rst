Auto Delivery User Acceptance Tests
=====================================

.. story:: Auto Delivery Acceptance Tests
   :id: US_UAT_MSG_AUTODELIVERY
   :status: approved
   :priority: optional
   :links: US_MSG_AUTODELIVERY; US_MSG_EDITORPLACEMENT; US_MSG_AUTODELIVERY_OPTOUT

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the auto-delivery feature,
   including its Secondary-column placement, Focus-Snapshot/Restore, and
   active-use opt-out behavior,
   so that I can verify end-to-end that messages are automatically sent to
   registered sessions without manual intervention, without disrupting the
   user's current focus, and without interrupting an in-progress
   conversation.

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
   * AC-8: A delivery to a session with no currently-open chat tab opens it
     at the Secondary placement target (the last existing editor-group
     column) rather than creating a new column
   * AC-8b: When exactly 1 editor-group column (Main only) is open, a
     Secondary delivery SHALL split a new column 2 — it SHALL NOT collapse
     into column 1 (Main)
   * AC-9: Around a system-initiated (poll-loop) delivery, the user's
     current focus — an editor tab or an integrated terminal — is
     automatically restored immediately after the delivery completes
   * AC-10: The poll loop skips delivering to a session whose chat tab is
     currently the active/focused tab, retrying on a later tick once the
     session is no longer active

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

   **T-10 — Secondary placement for delivery to a not-yet-open session**
     Setup: 2 editor columns already open (e.g. an Actor chat in column 1, a
     ``context.md`` in column 2). "TestTarget" is registered for auto-delivery
     and its chat tab is **not** open in any column. Queue a message for it.
     Action: Wait up to 10 s (two poll ticks).
     Expected: A new tab for "TestTarget" opens in column 2 (the last
     existing column at delivery time) — no third column is created.

   **T-11 — Focus-Snapshot/Restore: editor tab case**
     Setup: "TestTarget" is registered for auto-delivery; its chat tab is
     closed. An unrelated file (e.g. ``README.md``) is open and focused in
     the editor. Queue a message for "TestTarget".
     Action: Wait up to 10 s for the poll tick to deliver.
     Expected: The "TestTarget" chat briefly opens/receives the message, then
     focus automatically returns to the ``README.md`` tab — the user ends up
     exactly where they were before the delivery, with no manual action.

   **T-12 — Focus-Snapshot/Restore: terminal case**
     Setup: "TestTarget" is registered for auto-delivery; its chat tab is
     closed. An integrated terminal panel is open and focused (not an
     editor tab). Queue a message for "TestTarget".
     Action: Wait up to 10 s for the poll tick to deliver.
     Expected: After the delivery, focus automatically returns to the
     integrated terminal (``terminal.show()``) — not to the newly-opened
     "TestTarget" chat tab.

   **T-13 — Active-use opt-out skips a session mid-chat**
     Setup: "TestTarget" is registered for auto-delivery. Its chat tab is
     open and is the currently active/focused editor tab (simulate active
     use by keeping it focused). Queue a message for "TestTarget".
     Action: Wait up to 10 s (two poll ticks) while keeping the "TestTarget"
     tab focused throughout.
     Expected: The message is NOT delivered while the tab remains active/
     focused — it stays queued (retrievable via ``jarvis_readMessage``).
     Switch focus away from the "TestTarget" tab and wait one more tick;
     the message is then delivered normally on the next tick.

   **T-14 — Secondary placement with only Main column open (split, not collapse)**
     Setup: Exactly 1 editor-group column open, containing an Actor chat at
     Main (column 1). No Docs column is open yet. "TestTarget" is registered
     for auto-delivery and its chat tab is **not** open anywhere. Queue a
     message for "TestTarget".
     Action: Wait up to 10 s (two poll ticks).
     Expected: A new column 2 is split off and "TestTarget"'s chat tab opens
     there. The Main tab in column 1 is undisturbed — "TestTarget" does NOT
     open inside column 1 alongside/replacing the Main tab. This is distinct
     from T-10 (2+ columns already open, Secondary reuses the last one).
