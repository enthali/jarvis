Message Flow Visualization User Stories
========================================

.. story:: Message Flow Chord Diagram
   :id: US_FLOW_CHORDVIEW
   :status: draft
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_CHATQUEUE; US_MSG_EDITORPLACEMENT

   **As a** Jarvis User,
   **I want** an interactive diagram of inter-agent message flow (who sent
   what to whom, and how often), sourced from the existing message log,
   **so that** I can understand communication patterns between my sessions
   and actors at a glance, instead of reading raw JSON or scrolling through
   the Messages tree.

   **Acceptance Criteria:**

   * AC-1: A chord diagram shows sessions/actors as nodes arranged around a
     circle, with directional edges (source → destination) sized by message
     count.
   * AC-2: The diagram is opened from an icon button on the Messages tree
     view's title bar (or an equivalent command), as its own editor tab —
     it does not replace or compete with the Messages tree itself.
   * AC-3: Older messages fade visually relative to newer ones ("Fog of
     Time"), with an in-diagram control to adjust how quickly the fade
     applies.
   * AC-4: Hovering an edge or node shows a tooltip with the message count,
     time range, and a sample of the message text involved.
   * AC-5: Clicking an actor/session node opens that actor's chat, using the
     same predictable placement behavior as clicking it in the entity tree
     (``US_MSG_EDITORPLACEMENT``).
   * AC-6: The diagram reflects new messages without the user needing to
     manually refresh (a periodic refresh is acceptable — near-real-time,
     not necessarily instant).
   * AC-7: The feature is delivered as a separate, optionally-installed
     add-on module — the core extension and other add-ons are unaffected if
     it is not installed.
