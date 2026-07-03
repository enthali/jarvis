Message Flow Visualization User Acceptance Tests
==================================================

.. story:: Message Flow Chord Diagram Acceptance Tests
   :id: US_UAT_FLOW
   :status: draft
   :priority: optional
   :links: US_FLOW_CHORDVIEW; US_MSG_EDITORPLACEMENT

   **As a** Jarvis Test Engineer,
   **I want** a set of manual acceptance test scenarios for the message-flow
   chord diagram (``enthali.jarvis-flow`` add-on),
   **so that** I can verify the diagram opens correctly, renders the
   aggregated message data, refreshes periodically, and that clicking an
   actor node opens the right chat — end-to-end, in the Extension
   Development Host.

   Install-combination coverage (zero-trace when the add-on is absent,
   requires-core activation) is verified by ``US_UAT_MODULAR_INSTALL``, not
   here. Content-column coexistence with entity docs and exclusion from the
   Secondary-column count is verified by ``US_UAT_CHATEDITORREUSE`` (AC-11),
   not here — this story covers the diagram's own functional behavior only.

   **Acceptance Criteria:**

   * AC-1: A test verifies the diagram opens from the ``jarvisMessages`` tree
     view's title-bar icon button as its own editor tab in the Content
     column (column 2), and that the Command Palette command
     (``jarvis.openMessageFlow``) opens/focuses the same singleton panel
     rather than creating a second instance.
   * AC-2: A test verifies the empty-state behavior when
     ``message-log.json`` does not exist (logging never enabled) — an
     explanatory empty state, not an error.
   * AC-3: A test verifies the 500-entry data cap — with more than 500
     logged entries, only the most recent 500 are reflected in the
     rendered nodes/edges, regardless of their age.
   * AC-4: A test verifies node/edge rendering from real message-log data —
     nodes for each distinct sender/destination, directional edges sized by
     message count — and that hovering a node/edge shows a tooltip with
     message count, time range, and a sample of message text.
   * AC-5: A test verifies the "Fog of Time" age-based fade — older edges
     are visually de-emphasized — and that the in-webview slider changes
     the fade aggressiveness without triggering any new data fetch from the
     extension host.
   * AC-6: A test verifies that clicking an actor/session node opens that
     session's chat at Main (column 1), using the same close+reopen
     behavior as an entity-tree Actor click.
   * AC-7: A test verifies that clicking a node whose name does not resolve
     to any known session is a silent no-op — no error, no notification.
   * AC-8: A test verifies the diagram reflects a newly queued/delivered
     message within one poll interval (~5 s) without the user manually
     refreshing.

   **Test Scenarios:**

   **T-1 — Diagram opens from title-bar button, singleton panel**
     Setup: ``jarvis.messages.logging`` enabled; ``message-log.json`` has a
     few entries; Messages tree view visible.
     Action: Click the diagram icon button on the ``jarvisMessages`` view
     title bar.
     Expected: A "Message Flow" editor tab opens in the Content column
     (column 2), coexisting with any already-open entity-doc tab as a
     separate tab in the same group.

   **T-2 — Command palette reveals existing panel (no duplicate)**
     Setup: Diagram panel already open (from T-1).
     Action: Run ``Jarvis: Open Message Flow`` from the Command Palette.
     Expected: The existing panel is revealed/focused; no second "Message
     Flow" tab is created.

   **T-3 — Empty state when logging never enabled**
     Setup: ``jarvis.messages.logging`` left at default (disabled); no
     ``message-log.json`` file exists in the workspace.
     Action: Open the diagram.
     Expected: An empty-state message explains that message logging must be
     enabled to populate the diagram; no error/exception is shown.

   **T-4 — 500-entry cap excludes older entries**
     Setup: A ``message-log.json`` fixture with 520 entries, the first 20 of
     which involve a session name (``"old-only-sender"``) that appears in
     no other entries.
     Action: Open the diagram.
     Expected: ``"old-only-sender"`` does NOT appear as a node (its entries
     fall outside the most-recent-500 cap); nodes/edges reflect only the
     last 500 entries.

   **T-5 — Node/edge rendering and hover tooltip**
     Setup: ``message-log.json`` with several entries between two known
     sessions (e.g. "Change Manager" → "Test Designer", 3 entries).
     Action: Open the diagram; hover the edge/ribbon between the two nodes.
     Expected: Both sessions appear as nodes; a directional edge/ribbon
     connects them; a tooltip shows count ``3``, the earliest–latest
     timestamp range, and a truncated sample of one message's text.

   **T-6 — Fog of Time fade and slider (no re-fetch)**
     Setup: ``message-log.json`` with both old (several days) and recent
     entries.
     Action: Open the diagram; observe edge opacity/color; adjust the fade
     slider.
     Expected: Older edges appear visually faded relative to newer ones;
     moving the slider changes the fade immediately and only client-side —
     no new request is sent to the extension host (no additional Output
     Channel log entries or log-file reads triggered by the slider).

   **T-7 — Actor node click opens chat at Main**
     Setup: A session with an existing chat editor open in a non-1 column;
     diagram open with that session as a node.
     Action: Click the node for that session.
     Expected: The tab closes and reopens fresh in column 1 (Main) —
     identical to an entity-tree Actor click (``REQ_MSG_EDITORPLACEMENT``
     AC-1/AC-5).

   **T-8 — Actor node click with unresolvable name is a silent no-op**
     Setup: ``message-log.json`` contains an entry for a sender/destination
     name that no longer corresponds to any known session or actor (stale
     data).
     Action: Click that node in the diagram.
     Expected: Nothing happens — no error, no notification, no new tab.

   **T-9 — Periodic refresh reflects new messages**
     Setup: Diagram open and visible; note the current node/edge set.
     Action: Trigger a new message delivery (e.g. run a heartbeat ``queue``
     step) to a session not yet shown as a node.
     Expected: Within ~5 seconds (next poll), the new node/edge appears
     without any manual refresh action.
