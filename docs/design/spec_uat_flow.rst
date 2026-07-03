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
        - T-4: 520 entries; oldest 20 reference a sender/destination value
          (``"old-only-sender"``) that appears in no other entry, to verify
          the 500-entry cap excludes it.
      * - ``message-log-flow-sample.json``
        - T-5, T-6: A handful of entries between two known sessions, spread
          across old (multi-day) and recent timestamps, to verify normal
          rendering, hover tooltip content, and the Fog-of-Time fade.

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
   Step-by-step procedures and expected outcomes for the nine message-flow
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

          Fog-of-Time fade and slider (no re-fetch)

          *AC: REQ_FLOW_CHORDVIEW 2-3*
        - With ``message-log-flow-sample.json`` active (old + recent
          entries), observe edge opacity; move the fade slider.
        - Older edges appear visually faded relative to newer ones; moving
          the slider re-renders immediately with no additional Output
          Channel log entries or file reads triggered by the slider itself.

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
