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
   * AC-3: A two-handle "time lens" control lets the user restrict the visible
     window to a sub-range of the loaded message history by position (newest
     ↔ oldest), with older messages within that window still fading visually
     relative to newer ones within it ("Fog of Time" gradient, preserved
     inside the lens window). The near-edge handle can either track the
     true-latest message live, or be pinned further back in history; the
     diagram does not require re-fetching data merely to move either handle.
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
   * AC-8: The user can expand how much message history is loaded (beyond
     the default cap) via an in-diagram control, without leaving the
     diagram or losing their current lens position.


.. story:: Message Log Viewer
   :id: US_FLOW_LOGVIEWER
   :status: draft
   :priority: optional
   :links: US_MSG_CHATQUEUE; US_EXP_SIDEBAR; US_FLOW_CHORDVIEW

   **As a** Jarvis User,
   **I want** a scrollable, newest-first viewer for the persistent message
   audit log (sender, recipient, timestamp, and word-wrapped content per
   entry) with a Requeue button on each entry,
   **so that** I can browse message history and recover/redeliver a
   specific message to its original recipient without hand-editing JSON
   files.

   **Acceptance Criteria:**

   * AC-1: The viewer is opened via a command (``jarvis.openMessageLog``)
     and an icon button on the ``jarvisMessages`` tree view's title bar —
     the same contribution point already used by the chord diagram
     (``US_FLOW_CHORDVIEW`` AC-2) — as its own editor tab.
   * AC-2: The list shows every entry from the persistent audit log,
     newest first; each entry shows sender, recipient, a formatted
     date/time (derived from the entry's ISO timestamp), and word-wrapped
     message content.
   * AC-3: Auto-refresh is driven by scroll position, with no explicit
     toggle: while scrolled to the very top, the list polls periodically
     and silently prepends new entries; scrolling down freezes the list
     (no entries shift while reading).
   * AC-4: A "Jump to Top" button, visible only when not scrolled to the
     top, both scrolls the list back to the top and reactivates
     auto-refresh (with an immediate refresh, not waiting for the next
     poll tick).
   * AC-5: A "Requeue" button on each entry copies that message back into
     the live message queue, addressed to its original recipient — this is
     a redelivery, not a new send: it SHALL NOT create a new entry in the
     persistent audit log, even though an ordinary send does.
   * AC-6: This feature is delivered as part of the existing jarvis-flow
     add-on (no new package) — the core extension and other add-ons are
     unaffected if jarvis-flow is not installed, consistent with
     ``US_FLOW_CHORDVIEW`` AC-7.
