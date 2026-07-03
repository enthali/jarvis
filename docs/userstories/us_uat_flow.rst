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
   * AC-5: A test verifies the two-handle time lens's default state on
     open: ``start`` = rank 1 (live-tracking), ``end`` = rank
     ``min(loaded total, 500)`` — the same effective window as the
     diagram's original (pre-lens) default (``flow-time-lens`` CR;
     supersedes this AC's original "Fog of Time" single-slider wording —
     the day-based fade slider no longer exists).
   * AC-6: A test verifies that clicking an actor/session node opens that
     session's chat at Main (column 1), using the same close+reopen
     behavior as an entity-tree Actor click.
   * AC-7: A test verifies that clicking a node whose name does not resolve
     to any known session is a silent no-op — no error, no notification.
   * AC-8: A test verifies the diagram reflects a newly queued/delivered
     message within one poll interval (~5 s) without the user manually
     refreshing.
   * AC-9: A test verifies live-tracking — while the lens's start handle is
     at rank 1, the window's near edge automatically includes newly
     arrived messages on each poll, with no user action required
     (``flow-time-lens`` CR).
   * AC-10: A test verifies identity-anchoring — a handle set away from
     rank 1 (start) or the end handle (always) stays locked to the
     specific message it was set to as new messages arrive; only its
     displayed rank number changes, the rendered window does not visually
     jump (``flow-time-lens`` CR).
   * AC-11: A test verifies dragging either lens handle is a zero-round-trip
     client-side operation (no new extension-host request) and shows a
     drag tooltip with the actual timestamp of the message at the handle's
     current position (``flow-time-lens`` CR).
   * AC-12: A test verifies the lens's gradient fade floor is 0.05 (5%) for
     the message at the window's far/oldest edge — lowered from the prior
     single-slider design's 0.15 (``flow-time-lens`` CR).
   * AC-13: A test verifies the "+500" button increases the data-load cap
     by 500 without moving the existing lens position, and that the newly
     reachable history becomes draggable-to via the end handle
     (``flow-time-lens`` CR).

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

   **T-6 — Lens gradient fade within window, opacity floor 0.05 (no re-fetch)**
     Setup: ``message-log-flow-sample.json`` with entries spread across old
     (multi-day) and recent timestamps active as ``message-log.json``.
     Action: Open the diagram; observe edge opacity across the window from
     near (newest) to far (oldest) edge; note the value at the far edge.
     Expected: Edges nearer the window's far/oldest edge are progressively
     more faded than those nearer the near/newest edge; the message at the
     far edge renders at approximately 0.05 (5%) opacity, never fully
     invisible; no new request is sent to the extension host merely from
     observing the render (no additional Output Channel log entries or
     log-file reads).

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

   **T-10 — Lens default state matches original default window**
     Setup: ``message-log-flow-cap.json`` (520 entries) active as
     ``message-log.json``.
     Action: Open the diagram; inspect the lens handle positions.
     Expected: Start handle is at rank 1 (live-tracking); end handle is at
     rank 500 (``min(520, 500)``); the rendered node/edge set is identical
     to T-4's expectation (``"old-only-sender"`` excluded).

   **T-11 — Live-tracking at rank 1 auto-advances on poll**
     Setup: Diagram open with the default lens (start at rank 1, from T-10
     or a fresh fixture).
     Action: Trigger delivery of a new message (heartbeat ``queue`` step) to
     a session not yet shown; wait one poll interval (~5 s).
     Expected: The new message's node/edge appears without any user action;
     the start handle remains at rank 1 and still represents the (now new)
     true-latest message — no manual re-drag needed.

   **T-12 — Anchored handle rank updates without window jump**
     Setup: Diagram open; drag the start handle away from rank 1 to a
     specific interior message (e.g. rank 5); note which message/edge it
     now excludes/includes at the near edge.
     Action: Trigger delivery of several new messages (repeat a heartbeat
     ``queue`` step 3–5 times); wait for polling to pick them up.
     Expected: The start handle's displayed rank number increases (e.g.
     rank 5 → rank 8) to reflect the new messages ahead of it, but the
     rendered window's near boundary does not visually jump — it remains
     anchored to the same message identity throughout.

   **T-13 — Dragging handles is zero-round-trip and shows a timestamp tooltip**
     Setup: Diagram open with ``message-log-flow-sample.json`` or
     ``message-log-flow-cap.json`` active.
     Action: Drag the start handle to a new position, then the end handle
     to a new position; observe the UI during each drag.
     Expected: While dragging, a tooltip shows the actual timestamp of the
     message currently at that handle's position; the window/fade updates
     live as the handle moves; no new Output Channel log entries or
     log-file reads occur as a result of the drag (client-side only).

   **T-14 — "+500" button increases cap without moving the lens**
     Setup: ``message-log-flow-cap.json`` (520 entries) active; diagram open
     with the default lens (start rank 1, end rank 500, per T-10).
     Action: Click the "+500" button next to the lens.
     Expected: The data-load cap increases to 1000 (all 520 entries now
     loaded, including the previously-excluded ``"old-only-sender"``
     entries); the lens handles' rendered window is visually unchanged
     immediately after the click (still showing the same 500-entry range);
     dragging the end handle further now reaches the newly-loaded entries
     (e.g. ``"old-only-sender"`` becomes reachable/visible once the end
     handle is dragged past rank 500).

   **T-15 — Lens window larger than loaded data (small dataset)**
     Setup: ``message-log-flow-sample.json`` (a handful of entries, well
     under 500) active as ``message-log.json``.
     Action: Open the diagram; inspect the lens handle positions and try
     dragging the end handle past the last loaded entry.
     Expected: End handle defaults to the rank of the last loaded entry
     (not 500) with no error; the end handle cannot be dragged past that
     rank (no out-of-range state); the full small dataset is rendered
     within the window by default.
