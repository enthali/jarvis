Message Flow Visualization UAT Requirements
=============================================

.. req:: Message Flow Test Data and Harness
   :id: REQ_UAT_FLOW_TESTDATA
   :status: draft
   :priority: optional
   :links: US_UAT_FLOW

   **Description:**
   The repo SHALL contain the ``message-log.json`` test fixtures needed to
   exercise the diagram's data-source edge cases (empty state, 500-entry
   cap) and normal rendering, plus a workspace with the ``enthali.jarvis-flow``
   add-on installed alongside the core for manual verification.

   **Acceptance Criteria:**

   * AC-1: A test fixture ``testdata/messages/message-log-flow-cap.json``
     (or equivalent) contains 520 entries, where the oldest 20 involve a
     sender/destination value that appears nowhere else in the file, to
     verify the 500-entry cap excludes it.
   * AC-2: A test fixture ``testdata/messages/message-log-flow-sample.json``
     (or equivalent) contains a small number of entries between two known
     session names, with entries spread across both old (multi-day) and
     recent timestamps, to verify normal node/edge rendering, tooltip
     content, and the Fog-of-Time fade.
   * AC-3: A documented setup step verifies the empty-state case by ensuring
     no ``message-log.json`` exists (default logging-disabled state) —
     no fixture file is needed for this case.
   * AC-4: The Extension Development Host launch used for these scenarios
     includes ``enthali.jarvis-flow`` alongside the core, per
     ``REQ_UAT_MODULAR_INSTALL``.


.. req:: Message Flow Test Scenarios and Expected Outcomes
   :id: REQ_UAT_FLOW_TESTS
   :status: draft
   :priority: optional
   :links: US_UAT_FLOW; REQ_UAT_FLOW_TESTDATA

   **Description:**
   Manual test procedures SHALL exist that verify the diagram's opening
   behavior, data-source edge cases, rendering, actor-click behavior, and
   periodic refresh, per ``US_UAT_FLOW``'s acceptance criteria and test
   scenarios T-1..T-9.

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
   * AC-5: A test procedure verifies the Fog-of-Time fade and that the
     slider re-renders client-side only, without a new extension-host
     round trip.
   * AC-6: A test procedure verifies actor-node click opens the session's
     chat at Main, including the close+reopen case.
   * AC-7: A test procedure verifies actor-node click on an unresolvable
     name is a silent no-op.
   * AC-8: A test procedure verifies the diagram reflects a newly delivered
     message within one poll interval without manual refresh.
