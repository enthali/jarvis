Message Flow Visualization UAT Requirements
=============================================

.. req:: Message Flow Test Data and Harness
   :id: REQ_UAT_FLOW_TESTDATA
   :status: draft
   :priority: optional
   :links: US_UAT_FLOW; REQ_FLOW_TIMELENS; REQ_FLOW_LOADMORE

   **Description:**
   The repo SHALL contain the ``message-log.json`` test fixtures needed to
   exercise the diagram's data-source edge cases (empty state, 500-entry
   cap), the time-lens's rank/anchoring/cap-growth edge cases, and normal
   rendering, plus a workspace with the ``enthali.jarvis-flow`` add-on
   installed alongside the core for manual verification.

   **Acceptance Criteria:**

   * AC-1: A test fixture ``testdata/messages/message-log-flow-cap.json``
     (or equivalent) contains 520 entries, where the oldest 20 involve a
     sender/destination value that appears nowhere else in the file, to
     verify the 500-entry cap excludes it. This same fixture SHALL also be
     usable to verify the lens's default window (rank 1–500) and the
     "+500" cap-increase scenario (500 → 1000, all 520 entries reachable).
   * AC-2: A test fixture ``testdata/messages/message-log-flow-sample.json``
     (or equivalent) contains a small number of entries between two known
     session names, with entries spread across both old (multi-day) and
     recent timestamps, to verify normal node/edge rendering, tooltip
     content, and the lens's gradient fade. This same fixture SHALL also be
     usable to verify the "lens window larger than loaded data" edge case
     (small dataset, well under 500 entries).
   * AC-3: A documented setup step verifies the empty-state case by ensuring
     no ``message-log.json`` exists (default logging-disabled state) —
     no fixture file is needed for this case.
   * AC-4: The Extension Development Host launch used for these scenarios
     includes ``enthali.jarvis-flow`` alongside the core, per
     ``REQ_UAT_MODULAR_INSTALL``.
   * AC-5: No new test-data files are required for the live-tracking and
     identity-anchoring scenarios (rank-shift-after-poll behavior) — these
     are exercised procedurally, by triggering additional heartbeat
     ``queue`` deliveries against an already-loaded fixture, rather than
     via a static fixture file.


.. req:: Message Flow Test Scenarios and Expected Outcomes
   :id: REQ_UAT_FLOW_TESTS
   :status: draft
   :priority: optional
   :links: US_UAT_FLOW; REQ_UAT_FLOW_TESTDATA; REQ_FLOW_TIMELENS; REQ_FLOW_LOADMORE

   **Description:**
   Manual test procedures SHALL exist that verify the diagram's opening
   behavior, data-source edge cases, rendering, time-lens behavior,
   actor-click behavior, and periodic refresh, per ``US_UAT_FLOW``'s
   acceptance criteria and test scenarios T-1..T-15.

   **Acceptance Criteria:**

   * AC-1: A test procedure verifies the title-bar button and Command
     Palette command both open/reveal a single diagram panel instance in
     the Content column.
   * AC-2: A test procedure verifies the empty-state message when no
     ``message-log.json`` exists.
   * AC-3: A test procedure verifies the 500-entry cap excludes older
     entries from the rendered nodes/edges.
   * AC-4: A test procedure verifies node/edge rendering and hover tooltip
     content (count, time range, sample text).
   * AC-5: A test procedure verifies the time lens's gradient fade within
     the current window, including the 0.05 opacity floor at the window's
     far edge, and that observing the render triggers no new
     extension-host round trip.
   * AC-6: A test procedure verifies actor-node click opens the session's
     chat at Main, including the close+reopen case.
   * AC-7: A test procedure verifies actor-node click on an unresolvable
     name is a silent no-op.
   * AC-8: A test procedure verifies the diagram reflects a newly delivered
     message within one poll interval without manual refresh.
   * AC-9: A test procedure verifies the lens's default state on open
     (start = rank 1, end = ``min(loaded total, 500)``).
   * AC-10: A test procedure verifies live-tracking (start handle at rank 1
     auto-advances on poll) and identity-anchoring (a handle away from
     rank 1, or the end handle, keeps its window boundary fixed to the same
     message across polls while its displayed rank number changes).
   * AC-11: A test procedure verifies dragging either lens handle is a
     zero-round-trip client-side operation and displays a drag tooltip with
     the actual timestamp of the message at the handle's position.
   * AC-12: A test procedure verifies the "+500" button increases the data
     cap without moving the existing lens position, and that the newly
     loaded history becomes reachable via the end handle.
   * AC-13: A test procedure verifies the small-dataset edge case — when
     loaded data is well under 500 entries, the lens's default end handle
     matches the loaded total (not a fixed 500) and cannot be dragged past
     it.
