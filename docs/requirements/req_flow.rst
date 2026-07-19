Message Flow Visualization Requirements
========================================

.. req:: Flow Add-on Package
   :id: REQ_FLOW_PACKAGE
   :status: draft
   :priority: optional
   :links: US_FLOW_CHORDVIEW; REQ_MOD_ADDONS

   **Description:**
   The message-flow diagram SHALL be delivered as a separate, optionally
   installed extension package (``enthali.jarvis-flow``), analogous to the
   existing PIM and Recorder add-ons — not folded into the core ``MSG``
   theme/module. It depends on the core extension for its shared runtime
   and reads ``message-log.json`` directly from the workspace (no new
   engine API surface is introduced for this CR).

   **Acceptance Criteria:**

   * AC-1: The package lives at ``packages/flow`` and builds extension id
     ``enthali.jarvis-flow``.
   * AC-2: Its manifest declares ``extensionDependencies: ["enthali.jarvis-core"]``
     and cannot activate without the core installed.
   * AC-3: With the add-on not installed, none of its surface (view title
     button, command, webview) is present anywhere — see ``REQ_MOD_ZEROTRACE``.
   * AC-4: The add-on contributes its own commands, views contributions
     (title-bar button on the existing ``jarvisMessages`` tree view), and
     settings in its own ``package.json`` — it does not modify the core's
     ``package.json``.


.. req:: Message Flow Data Source
   :id: REQ_FLOW_DATASOURCE
   :status: draft
   :priority: optional
   :links: US_FLOW_CHORDVIEW; REQ_MSG_LOGSETTING

   **Description:**
   The diagram SHALL source its data from the existing, fixed-path
   ``message-log.json`` file (``{destination, sender, text, timestamp}``
   per entry, per ``REQ_MSG_LOGSETTING``/``SPEC_MSG_LOGSETTING``) — no new
   logging, no new file format, no new persisted data.

   **Acceptance Criteria:**

   * AC-1: If ``jarvis.messages.logging`` has never been enabled (no
     ``message-log.json`` file exists), the diagram SHALL show an empty
     state explaining that message logging must be enabled to populate the
     diagram, rather than an error.
   * AC-2: To bound diagram size and rendering cost, the data set SHALL be
     capped to the most recent 30 entries (amended from 500 by
     ``flow-message-pagination`` CR, GH #36) — no time-based boundary.
     Rationale: a project idle for a while (e.g. an older project revisited
     after a gap) must still show its message history rather than an empty
     diagram just because its messages fall outside a rolling time window.
     This is a fixed v1 default — no user setting is introduced for it in
     this CR.
   * AC-3: The cap in AC-2 governs which raw entries are loaded/aggregated;
     it is independent of and unaffected by the client-side "Fog of Time"
     visual fade (``REQ_FLOW_CHORDVIEW`` AC-3), which only changes opacity
     of the (already-capped) data already loaded.
   * AC-4: Nodes SHALL be derived as the distinct union of ``sender`` and
     ``destination`` values across the capped entry set. Edges SHALL be
     derived per distinct ``(sender, destination)`` pair, with weight =
     count of entries for that pair and a stored time range (min/max
     ``timestamp``).


.. req:: Chord Diagram Visualization
   :id: REQ_FLOW_CHORDVIEW
   :status: draft
   :priority: optional
   :links: US_FLOW_CHORDVIEW; REQ_FLOW_DATASOURCE

   **Description:**
   The extension SHALL render the aggregated node/edge data (``REQ_FLOW_DATASOURCE``
   AC-4) as an interactive D3 chord diagram.

   **Acceptance Criteria:**

   * AC-1: Nodes (sessions/actors) SHALL be arranged around a circle; edges
     SHALL be directional chords sized by message count (weight).
   * AC-2: Chord/edge color and opacity SHALL fade based on position within
     the currently visible lens window (``REQ_FLOW_TIMELENS``) — edges whose
     underlying messages are nearer the window's far/oldest edge are
     visually de-emphasized relative to those nearer its near/newest edge.
   * AC-3: The diagram SHALL provide the two-handle rank-based "time lens"
     control specified in full by ``REQ_FLOW_TIMELENS`` — **replacing** the
     original single fade-rate slider design (superseded; see
     ``REQ_FLOW_TIMELENS`` for the current, sole windowing/fade control).
     Moving either handle is a rendering-only operation (re-runs the fade
     calculation over already-loaded data); it does not re-query
     ``REQ_FLOW_DATASOURCE``'s capped data set.
   * AC-4: Hovering a node or edge SHALL show a tooltip with: message count,
     time range (earliest/latest timestamp in that group), and a truncated
     sample of message text.
   * AC-5: The extension SHALL use VS Code's ``--vscode-charts-*`` and
     ``--vscode-*`` CSS custom properties for diagram theming — opt-in
     per element (webviews do not inherit native VS Code theming
     automatically for chart-specific colors).
   * AC-6: The D3 library SHALL be vendored locally within the extension
     package — the webview's Content-Security-Policy does not permit
     fetching it from a CDN.


.. req:: Time Lens (Rank-Based Message Window)
   :id: REQ_FLOW_TIMELENS
   :status: draft
   :priority: medium
   :links: US_FLOW_CHORDVIEW; REQ_FLOW_CHORDVIEW; REQ_FLOW_DATASOURCE

   **Description:**
   The extension SHALL replace the diagram's single fade-rate slider with a
   two-handle range control ("lens") that lets the user restrict and scrub
   the visible message window by **position** (rank), counted from the
   true-latest loaded message, rather than by wall-clock age. This flow-time-lens
   CR **fully supersedes** ``REQ_FLOW_CHORDVIEW`` AC-3's original single-slider
   design — there is no day/hour/minute unit selector and no VS Code setting;
   all lens state lives in the webview only.

   **Acceptance Criteria:**

   * AC-1: Every loaded message entry has a **rank**, counted from the
     true-latest loaded entry (rank 1) growing toward history (rank 2, 3,
     ... up to the currently loaded total). Ranks are recomputed whenever
     the loaded entry set changes (poll update, or ``REQ_FLOW_LOADMORE``
     cap increase) — they are a derived position, not a stored value.
   * AC-2: The lens exposes two handles: a **start** handle (near/newest
     edge of the window) and an **end** handle (far/oldest edge). At all
     times ``start`` SHALL be less than or equal to ``end`` in rank number
     (the window never inverts).
   * AC-3: **Live-tracking:** while the start handle is at rank 1, the
     window's near edge SHALL always include the current true-latest
     message — as new messages arrive via the diagram's periodic refresh
     (``US_FLOW_CHORDVIEW`` AC-6), the window automatically extends to keep
     including them, with no user action required.
   * AC-4: **Anchoring:** whenever the start handle is at any rank other
     than 1, and for the end handle at all times, the handle SHALL be
     anchored to the **specific message identity** it was set to — not to
     the numeric rank it happened to have at that moment. As new messages
     arrive and shift what rank number that same message now has, the
     handle's displayed rank number SHALL update accordingly, but the
     window SHALL NOT visually jump to include or exclude different
     messages as a side effect of that renumbering.
   * AC-5: **Default window on open:** ``start`` = rank 1 (live-tracking),
     ``end`` = the rank corresponding to ``min(currently loaded total, 30)``
     — i.e. on first open, the diagram shows exactly the same message set as
     the pre-lens default (the full initial 30-entry-or-fewer load).
   * AC-6: The fade gradient (``REQ_FLOW_CHORDVIEW`` AC-2) SHALL be computed
     over position **within the current lens window only** — the message at
     the window's near edge (start) renders at full opacity, the message at
     the window's far edge (end) renders at the fade floor, with a linear
     interpolation in between. The fade floor SHALL be 0.05 (5% minimum
     opacity) — lowered from the prior single-slider design's 0.15 (15%).
   * AC-7: While a handle is being dragged, the diagram SHALL display the
     actual timestamp of the message currently at that handle's position, as
     a drag tooltip — for human orientation only; the underlying unit
     remains message rank/count, not time.
   * AC-8: Moving either handle SHALL be a client-side-only operation — it
     SHALL NOT send any request to the extension host and SHALL NOT change
     which raw entries are loaded (``REQ_FLOW_DATASOURCE`` AC-2); it only
     changes which of the already-loaded entries are included in the
     rendered window and how they are faded.


.. req:: Expand Loaded History ("+30")
   :id: REQ_FLOW_LOADMORE
   :status: draft
   :priority: medium
   :links: US_FLOW_CHORDVIEW; REQ_FLOW_DATASOURCE; REQ_FLOW_TIMELENS

   **Description:**
   The extension SHALL provide an in-diagram control that lets the user
   increase how much message history is loaded, beyond the default cap
   (``REQ_FLOW_DATASOURCE`` AC-2), without leaving the diagram.

   **Acceptance Criteria:**

   * AC-1: A control (e.g. a "+30" button) SHALL be available alongside the
     time lens. Activating it SHALL increase the diagram's data-load cap by
     30 entries (30 → 60 → 90 → ...), with no upper limit imposed by
     this requirement.
   * AC-2: After a cap increase, the underlying sliding-window mechanic
     (``REQ_FLOW_DATASOURCE`` AC-2 — most-recent-N entries, no time
     boundary) is unchanged in kind, just applied at the new, larger N.
   * AC-3: A cap increase SHALL re-derive ranks (``REQ_FLOW_TIMELENS`` AC-1)
     over the newly (larger) loaded entry set; any existing lens window
     (live-tracking or anchored, per ``REQ_FLOW_TIMELENS`` AC-3/AC-4) SHALL
     remain visually unchanged immediately after the increase — the cap
     increase only makes *more history reachable* by dragging the end
     handle further, it does not itself move either handle.
   * AC-4: The increased cap SHALL NOT persist across closing and reopening
     the diagram panel — no VS Code setting is introduced for this CR; each
     new panel instance starts back at the default cap (30).


.. req:: Message Flow Webview Panel
   :id: REQ_FLOW_WEBVIEWPANEL
   :status: draft
   :priority: optional
   :links: US_FLOW_CHORDVIEW; REQ_FLOW_CHORDVIEW; REQ_MSG_EDITORPLACEMENT; REQ_EXP_TREEVIEW

   **Description:**
   The diagram SHALL open as a VS Code Webview Panel presented as an editor
   tab, entered via a title-bar icon button on the existing ``jarvisMessages``
   tree view (plus an equivalent Command Palette command) — not as a
   sidebar view and not replacing the Messages tree.

   **Acceptance Criteria:**

   * AC-1: A title-bar icon button on the ``jarvisMessages`` tree view and a
     registered command (e.g. ``jarvis.openMessageFlow``) SHALL both open
     (or focus, if already open) the diagram Webview Panel.
   * AC-2: The panel SHALL target the **Content** column (column 2, fixed)
     — the same fixed target already used for entity docs
     (``REQ_MSG_EDITORPLACEMENT`` AC-2, generalized by this CR from "Docs"
     to "Content" to explicitly include the diagram) — coexisting with any
     already-open docs tab as a separate tab within that column, not
     replacing it.
   * AC-3: If the panel is already open (in any column, including one the
     user manually moved it to), the command/button SHALL reveal/focus the
     existing panel rather than creating a second instance.
   * AC-4: The panel's content SHALL refresh by polling ``message-log.json``
     every 5 seconds while the panel is visible — matching the existing
     Auto-Delivery poll-loop cadence (``REQ_MSG_AUTODELIVER_POLL``); no
     file-watcher is introduced for v1, since delivery itself is not faster
     than this interval.
   * AC-5: Because a Webview Panel tab is not a chat tab (``lookupSessionUUID``
     does not resolve it) and not a plain file tab (no ``.uri``), it SHALL
     be identified by its VS Code ``viewType`` when the placement logic
     needs to recognize it (e.g. to avoid it being miscounted as an
     additional distinct column when resolving the Secondary target — see
     ``REQ_MSG_EDITORPLACEMENT`` new AC-11).


.. req:: Actor Node Click Opens Chat
   :id: REQ_FLOW_ACTORCLICK
   :status: draft
   :priority: optional
   :links: US_FLOW_CHORDVIEW; REQ_FLOW_WEBVIEWPANEL; REQ_MSG_EDITORPLACEMENT; REQ_MSG_SESSIONLOOKUP

   **Description:**
   Clicking an actor/session node in the rendered diagram SHALL open that
   actor's chat at the same **Main** target used elsewhere for actor
   clicks, via the extension↔webview ``postMessage`` bridge (the webview's
   rendering sandbox is not a technical barrier to this — the actual
   editor-tab manipulation happens in the extension host, not in the
   webview's DOM).

   **Acceptance Criteria:**

   * AC-1: A click on a node SHALL post a message from the webview to the
     extension host identifying the clicked session/actor name.
   * AC-2: On receipt, the extension host SHALL resolve and open/focus that
     session's chat at Main (column 1) using the existing placement helper
     (``REQ_MSG_EDITORPLACEMENT`` AC-1/AC-9, including its close+reopen
     rule) — no new placement logic is introduced for this path.
   * AC-3: If the clicked name does not resolve to any known session/actor
     (e.g. stale data), the click SHALL be a silent no-op — consistent with
     the no-op-on-miss precedent established for label clicks elsewhere
     (``REQ_MSG_EDITORPLACEMENT`` AC-10).


.. req:: Message Log Viewer Panel
   :id: REQ_FLOW_LOGVIEWER
   :status: draft
   :priority: optional
   :links: US_FLOW_LOGVIEWER; REQ_FLOW_PACKAGE; REQ_MSG_AUDITLOG; REQ_MSG_EDITORPLACEMENT

   **Description:**
   A command ``jarvis.openMessageLog`` SHALL create (or reveal, if already
   open) a single ``vscode.WebviewPanel`` showing every entry of the
   persistent audit log (``message-log.json``, ``REQ_MSG_AUDITLOG``),
   newest first, with scroll-position-driven auto-refresh. This is the
   read/browse half of the feature; ``REQ_FLOW_REQUEUE`` covers the
   Requeue action.

   **Acceptance Criteria:**

   * AC-1: ``jarvis.openMessageLog`` SHALL create the panel on first call
     and reveal the existing instance on subsequent calls — exactly one
     panel instance ever exists (same singleton-panel pattern as
     ``REQ_FLOW_WEBVIEWPANEL`` AC-1).
   * AC-2: The panel SHALL open at the fixed Docs placement column (column
     2, ``REQ_MSG_EDITORPLACEMENT`` AC-2) — same target as the chord
     diagram.
   * AC-3: An icon button on the ``jarvisMessages`` tree view's title bar
     SHALL invoke the same command — same contribution point already used
     for ``jarvis.openMessageFlow`` (``REQ_FLOW_WEBVIEWPANEL`` AC-3), a
     second button alongside it, not a replacement.
   * AC-4: If ``message-log.json`` does not exist or fails to parse, the
     panel SHALL show an empty state (e.g. "No message history yet" /
     "Enable message logging to populate this view") rather than an error
     — same tolerant-empty-state precedent as ``REQ_FLOW_DATASOURCE`` AC-1.
   * AC-5: Entries SHALL be listed newest first (reverse-chronological by
     timestamp) — the opposite order from the chord diagram's data source
     (``REQ_FLOW_DATASOURCE``'s ``entries`` array is chronological
     ascending; the log viewer reverses it for display, not by changing
     the underlying data-loading function).
   * AC-6: Each entry SHALL display: sender, recipient (destination),
     date/time formatted from the entry's ISO 8601 timestamp into a
     human-readable form, and the message content, word-wrapped (not
     truncated or scrollable-within-the-entry).
   * AC-7: Auto-refresh SHALL be driven entirely by the webview's own
     scroll position, with no separate toggle control:

     a. While the list's scroll container is at ``scrollTop === 0``, the
        panel SHALL poll for new entries every 5000 ms (matching
        ``REQ_FLOW_WEBVIEWPANEL`` AC-2's existing poll interval) and
        silently prepend any new entries found — no jump, no flash, no
        loss of the user's (top) scroll position.
     b. As soon as the user scrolls away from the top (``scrollTop > 0``),
        polling SHALL pause — the currently rendered list SHALL NOT change
        until the user returns to the top.
     c. Scrolling back to ``scrollTop === 0`` manually, or clicking "Jump
        to Top" (AC-8), SHALL reactivate polling AND trigger one immediate
        refresh (not waiting for the next 5 s tick).

   * AC-8: A "Jump to Top" button SHALL be visible only when the scroll
     container is not at the top (``scrollTop > 0``); clicking it SHALL
     scroll the list to the top and satisfy AC-7c.
   * AC-9: Polling SHALL be skipped entirely while the panel is not
     ``visible`` (backgrounded tab) — same resource-conscious precedent as
     ``REQ_FLOW_WEBVIEWPANEL`` AC-2.
   * AC-10: The panel's styling SHALL use VS Code's theme CSS variables
     (``--vscode-editor-background``, ``--vscode-editor-foreground``,
     ``--vscode-font-family``, etc.) for background/foreground/font, the
     same approach already used by the chord-diagram webview
     (``SPEC_FLOW_WEBVIEW``) — no hardcoded colors, so the panel matches
     the user's active VS Code theme automatically, light or dark.


.. req:: Message Requeue (Redelivery)
   :id: REQ_FLOW_REQUEUE
   :status: draft
   :priority: optional
   :links: US_FLOW_LOGVIEWER; REQ_FLOW_LOGVIEWER; REQ_MSG_QUEUE; REQ_MSG_AUDITLOG

   **Description:**
   A "Requeue" button on each log-viewer entry SHALL copy that message back
   into the live message queue (``messages.json``), addressed to its
   original recipient — a redelivery of a past message, not a new send.
   This SHALL NOT create a new entry in the persistent audit log
   (``message-log.json``), even when audit logging
   (``jarvis.messages.logging``, ``REQ_MSG_LOGSETTING``) is enabled — a
   deliberate, explicit divergence from the normal message-send path (which
   always logs when enabled), since a requeue is a redelivery of an entry
   that is already logged, not a new event to log again.

   **Acceptance Criteria:**

   * AC-1: Clicking "Requeue" on an entry SHALL append a new entry to
     ``messages.json`` with the same ``destination`` (recipient),
     ``text`` (content), and the **same** ``timestamp`` as the original
     entry (preserving the original send time, not stamping a new one) —
     the redelivered entry is otherwise an exact copy of the logged entry.
   * AC-2: The ``sender`` field of the requeued entry SHALL be the
     original entry's ``sender`` verbatim (the redelivered message still
     appears to come from whoever originally sent it, not from "Jarvis" or
     the log viewer itself).
   * AC-3: The requeue write path SHALL NOT invoke the audit-logging side
     effect — packages/flow (a separate extension package with no
     compile-time access to core's internal ``appendMessage()`` function)
     SHALL implement its own minimal, local queue-append function that
     writes only to ``messages.json``, mirroring ``QueuedMessage``'s exact
     JSON shape (``REQ_MSG_AUDITLOG`` AC-2) — it SHALL NOT duplicate or
     reimplement any log-writing logic, simply omit it.
   * AC-4: After a successful requeue, the log viewer SHALL show a brief,
     non-blocking confirmation (e.g. a status message or toast) — no modal
     dialog, no panel reload required.
   * AC-5: If ``messages.json``'s parent directory does not exist (no
     workspace open, or ``.jarvis`` missing), the requeue action SHALL fail
     open: show an error notification, and SHALL NOT throw an unhandled
     exception or crash the panel.
   * AC-6: Requeuing the same log entry multiple times SHALL be permitted
     and SHALL each independently append a new ``messages.json`` entry —
     no idempotency/deduplication guard, matching the "any number of
     redeliveries" nature of the feature (a user may deliberately want to
     resend the same message more than once).
