Message Flow Visualization UAT Design Specifications
======================================================

.. spec:: Message Flow Test Data Files
   :id: SPEC_UAT_FLOW_FILES
   :status: draft
   :links: REQ_UAT_FLOW_TESTDATA

   **Description:**
   The repo SHALL contain the following test data under ``testdata/messages/``.

   .. list-table::
      :header-rows: 1
      :widths: 45 55

      * - File
        - Purpose
      * - ``message-log-flow-cap.json``
        - T-4, T-10, T-14: 520 entries; oldest 20 reference a
          sender/destination value (``"old-only-sender"``) that appears in
          no other entry, to verify the 500-entry cap excludes it, the
          lens's default rank-1..500 window, and the "+500" cap-increase
          (500 → 1000, all 520 reachable).
      * - ``message-log-flow-sample.json``
        - T-5, T-6, T-15: A handful of entries (well under 500) between two
          known sessions, spread across old (multi-day) and recent
          timestamps, to verify normal rendering, hover tooltip content,
          the lens's gradient fade, and the small-dataset lens edge case.

   T-11/T-12/T-13 (live-tracking, anchoring, drag) require no dedicated
   fixture — they are exercised procedurally against whichever fixture is
   already active, by triggering additional heartbeat ``queue`` deliveries
   or handle drags.

   **Empty-state setup (T-3, not a fixture file):**
   Verified by ensuring no ``message-log.json`` exists at the configured
   path (default state when ``jarvis.messages.logging`` has never been
   enabled) — copying either fixture above to the active
   ``message-log.json`` path is how T-4/T-5/T-6 are actually exercised in
   the host.


.. spec:: Message Flow Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_FLOW_PROCEDURES
   :status: draft
   :links: REQ_UAT_FLOW_TESTS; SPEC_UAT_FLOW_FILES

   **Description:**
   Step-by-step procedures and expected outcomes for the fifteen message-flow
   diagram acceptance scenarios, executed in an Extension Development Host
   with ``enthali.jarvis-flow`` installed alongside the core.

   **Test Setup:**

   * Extension Development Host launched with core + ``enthali.jarvis-flow``
     (per ``REQ_UAT_MODULAR_INSTALL``).
   * Workspace: ``testdata/test.code-workspace``.
   * ``jarvis.messages.logging`` toggled per-scenario as noted below.

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Diagram opens from title-bar button

          *AC: REQ_FLOW_WEBVIEWPANEL 1-2*
        - Enable ``jarvis.messages.logging``; ensure ``message-log.json``
          has a few entries; click the diagram icon button on the
          ``jarvisMessages`` view title bar.
        - "Message Flow" tab opens in the Content column (column 2),
          coexisting with any already-open entity-doc tab as a separate tab.

      * - T-2

          Command palette reveals existing panel

          *AC: REQ_FLOW_WEBVIEWPANEL 1, 3*
        - With the panel already open (T-1), run
          ``Jarvis: Open Message Flow`` from the Command Palette.
        - Existing panel is revealed/focused; no second "Message Flow" tab
          is created.

      * - T-3

          Empty state, logging never enabled

          *AC: REQ_FLOW_DATASOURCE 1*
        - Ensure no ``message-log.json`` exists (default state); open the
          diagram.
        - Empty-state message explains logging must be enabled; no error
          or exception is shown.

      * - T-4

          500-entry cap excludes older entries

          *AC: REQ_FLOW_DATASOURCE 2, 4*
        - Copy ``message-log-flow-cap.json`` to the active
          ``message-log.json`` path; open the diagram.
        - ``"old-only-sender"`` does not appear as a node; nodes/edges
          reflect only the most recent 500 entries.

      * - T-5

          Node/edge rendering and hover tooltip

          *AC: REQ_FLOW_CHORDVIEW 1, 4*
        - Copy ``message-log-flow-sample.json`` to the active
          ``message-log.json`` path; open the diagram; hover the edge
          between the two known sessions.
        - Both sessions appear as nodes; a directional edge connects them;
          tooltip shows the correct count, time range, and a sample of
          message text.

      * - T-6

          Lens gradient fade within window, opacity floor 0.05

          *AC: REQ_FLOW_TIMELENS 6*
        - With ``message-log-flow-sample.json`` active (old + recent
          entries), open the diagram; observe edge opacity from near
          (newest) to far (oldest) edge of the window.
        - Edges nearer the far/oldest edge are progressively more faded;
          the far-edge message renders at ~0.05 (5%) opacity, never fully
          invisible; no additional Output Channel log entries or file
          reads are triggered merely by observing the render.

      * - T-7

          Actor node click opens chat at Main

          *AC: REQ_FLOW_ACTORCLICK 1-2*
        - With a session's chat editor open in a non-1 column and shown as
          a node in the diagram, click that node.
        - Tab closes and reopens fresh in column 1 (Main) — identical to an
          entity-tree Actor click.

      * - T-8

          Actor node click, unresolvable name

          *AC: REQ_FLOW_ACTORCLICK 3*
        - With a node present whose name matches no known session (stale
          data), click that node.
        - No error, no notification, no new tab — silent no-op.

      * - T-9

          Periodic refresh reflects new messages

          *AC: REQ_FLOW_WEBVIEWPANEL 4*
        - With the diagram open and visible, trigger delivery of a new
          message (e.g. a heartbeat ``queue`` step) to a session not
          currently shown as a node.
        - Within ~5 seconds, the new node/edge appears without any manual
          refresh action.

      * - T-10

          Lens default state matches original default window

          *AC: REQ_FLOW_TIMELENS 5*
        - With ``message-log-flow-cap.json`` (520 entries) active, open the
          diagram; inspect the lens handle positions.
        - Start handle at rank 1 (live-tracking); end handle at rank 500
          (``min(520, 500)``); rendered set identical to T-4 (``"old-only-
          sender"`` excluded).

      * - T-11

          Live-tracking at rank 1 auto-advances on poll

          *AC: REQ_FLOW_TIMELENS 3*
        - With the default lens open (start at rank 1), trigger delivery of
          a new message to a session not yet shown; wait one poll interval
          (~5 s).
        - New node/edge appears with no user action; start handle remains
          at rank 1 and now represents the new true-latest message.

      * - T-12

          Anchored handle rank updates without window jump

          *AC: REQ_FLOW_TIMELENS 4*
        - Drag the start handle away from rank 1 to an interior message
          (e.g. rank 5); trigger delivery of 3–5 new messages via repeated
          heartbeat ``queue`` steps; wait for polling.
        - Start handle's displayed rank number increases (e.g. rank 5 → 8)
          but the rendered window's near boundary stays anchored to the
          same message identity — no visual jump.

      * - T-13

          Dragging handles is zero-round-trip, shows timestamp tooltip

          *AC: REQ_FLOW_TIMELENS 7-8*
        - Drag the start handle to a new position, then the end handle to
          a new position; observe the UI during each drag.
        - A tooltip shows the actual timestamp of the message at the
          handle's current position while dragging; window/fade updates
          live; no new Output Channel log entries or file reads occur as a
          result of the drag.

      * - T-14

          "+500" button increases cap without moving the lens

          *AC: REQ_FLOW_LOADMORE 1-3*
        - With ``message-log-flow-cap.json`` (520 entries) and the default
          lens (T-10) active, click the "+500" button next to the lens.
        - Cap increases to 1000 (all 520 entries loaded); lens handles'
          rendered window is visually unchanged immediately after the
          click; dragging the end handle further now reaches
          ``"old-only-sender"`` entries beyond rank 500.

      * - T-15

          Lens window larger than loaded data (small dataset)

          *AC: REQ_FLOW_TIMELENS 5*
        - With ``message-log-flow-sample.json`` (well under 500 entries)
          active, open the diagram; inspect lens handle positions and try
          dragging the end handle past the last loaded entry.
        - End handle defaults to the rank of the last loaded entry (not a
          fixed 500), with no error; end handle cannot be dragged past that
          rank; the full small dataset renders within the window by
          default.
