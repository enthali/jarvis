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
     capped to the most recent 500 entries — no time-based boundary.
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
   * AC-2: Chord/edge color and opacity SHALL fade based on the age of the
     underlying messages ("Fog of Time") — older edges are visually
     de-emphasized relative to newer ones.
   * AC-3: The diagram SHALL provide an in-webview slider control that
     adjusts how aggressively the age-based fade is applied (a rendering
     parameter only — it does not re-query or change the underlying capped
     data set from ``REQ_FLOW_DATASOURCE`` AC-2).
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
