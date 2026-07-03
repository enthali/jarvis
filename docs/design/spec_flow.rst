Message Flow Visualization Design Specifications
==================================================

.. spec:: Flow Data Service
   :id: SPEC_FLOW_DATASERVICE
   :status: draft
   :links: REQ_FLOW_DATASOURCE; SPEC_MSG_LOGSETTING

   **Description:**
   ``packages/flow/src/dataService.ts`` reads ``message-log.json`` (same file
   and format as ``SPEC_MSG_LOGSETTING``) and aggregates it into the node/edge
   shape the renderer consumes. Read-only — never writes to the log.

   .. code-block:: typescript

      interface FlowEdge {
        source: string;
        target: string;
        count: number;
        firstTimestamp: string; // ISO 8601, earliest in this group
        lastTimestamp: string;  // ISO 8601, latest in this group
        sample: string;         // text of the most recent entry in this group
      }

      interface FlowData {
        nodes: string[];   // distinct union of sender/destination
        edges: FlowEdge[];
      }

      const MAX_ENTRIES = 500;

      function loadFlowData(logPath: string): FlowData {
        const raw = readMessageLog(logPath); // reuses message-log.json reader
        const capped = raw.slice(-MAX_ENTRIES); // most recent MAX_ENTRIES, no time boundary
        return aggregate(capped);
      }

   **Acceptance Criteria:**

   * AC-1: If ``message-log.json`` does not exist or fails to parse, returns
     ``{ nodes: [], edges: [] }`` (empty state, no thrown error) — mirrors the
     existing tolerant-parse pattern in ``readQueue()``/``SPEC_MSG_QUEUESTORE``.
   * AC-2: The 500-entry cap (``REQ_FLOW_DATASOURCE`` AC-2) is applied before
     aggregation, not after — node/edge counts always reflect the
     already-capped set. There is no time-based boundary — an idle
     project's messages remain visible regardless of age, as long as they
     fall within the most recent 500 log entries.
   * AC-3: ``aggregate()`` groups capped entries by ``(sender, destination)``,
     computing ``count``, ``firstTimestamp``/``lastTimestamp`` (min/max), and
     ``sample`` (text of the chronologically-last entry in the group).


.. spec:: Flow Webview Panel
   :id: SPEC_FLOW_WEBVIEW
   :status: draft
   :links: REQ_FLOW_WEBVIEWPANEL; SPEC_FLOW_DATASERVICE; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   ``packages/flow/src/extension.ts`` registers ``jarvis.openMessageFlow``,
   which creates (or reveals, if already open) a single
   ``vscode.WebviewPanel`` at the fixed Content column (``DOCS_COLUMN``,
   ``SPEC_MSG_EDITORPLACEMENT``), never via ``resolveSecondaryColumn()``.

   .. code-block:: typescript

      const FLOW_VIEWTYPE = 'jarvisMessageFlow';
      const DOCS_COLUMN = vscode.ViewColumn.Two;
      let panel: vscode.WebviewPanel | undefined;

      function openMessageFlow(context: vscode.ExtensionContext, logPath: string): void {
        if (panel) {
          panel.reveal(DOCS_COLUMN);
          return;
        }
        panel = vscode.window.createWebviewPanel(
          FLOW_VIEWTYPE,
          'Message Flow',
          DOCS_COLUMN,
          { enableScripts: true, retainContextWhenHidden: true }
        );
        panel.webview.html = renderHtml(panel.webview, context.extensionUri);
        panel.onDidDispose(() => { panel = undefined; clearInterval(pollHandle); });

        const pollHandle = setInterval(() => {
          if (panel?.visible) {
            panel.webview.postMessage({ type: 'data', payload: loadFlowData(logPath) });
          }
        }, 5000);
        panel.webview.postMessage({ type: 'data', payload: loadFlowData(logPath) });

        panel.webview.onDidReceiveMessage(msg => {
          if (msg.type === 'actorClick') { handleActorClick(msg.name); }
        });
      }

   **Acceptance Criteria:**

   * AC-1: ``jarvis.openMessageFlow`` creates the panel on first call and
     reveals the existing instance (``panel.reveal(DOCS_COLUMN)``) on
     subsequent calls — exactly one panel instance ever exists.
   * AC-2: Poll interval is 5000 ms, matching ``REQ_MSG_AUTODELIVER_POLL``;
     polling is skipped while ``panel.visible`` is false (backgrounded tab)
     to avoid needless work.
   * AC-3: The title-bar button contribution (``package.json`` ``menus``,
     ``view/title`` for ``jarvisMessages``, group ``navigation``) invokes
     the same ``jarvis.openMessageFlow`` command.
   * AC-4: CSP (``Content-Security-Policy`` meta tag in ``renderHtml``)
     restricts script/style sources to the webview's own resource root
     (``panel.webview.asWebviewUri``) — no external CDN origins are
     permitted, per ``REQ_FLOW_CHORDVIEW`` AC-6.


.. spec:: Chord Diagram Renderer
   :id: SPEC_FLOW_CHORDRENDER
   :status: draft
   :links: REQ_FLOW_CHORDVIEW; SPEC_FLOW_WEBVIEW

   **Description:**
   ``packages/flow/webview/chord.ts`` (bundled into the webview's script,
   vendoring D3 via ``packages/flow/webview/vendor/d3.min.js`` — no CDN
   fetch) renders the ``FlowData`` received via ``postMessage`` as a D3
   chord diagram (``d3.chord()`` + ``d3.ribbon()`` on a node-index adjacency
   matrix built from ``FlowEdge.count``).

   **Fog of Time (age-based fade):**

   .. code-block:: typescript

      function opacityFor(edge: FlowEdge, now: number, fadeDays: number): number {
        const ageMs = now - new Date(edge.lastTimestamp).getTime();
        const ageDays = ageMs / (24 * 60 * 60 * 1000);
        return Math.max(0.15, 1 - ageDays / fadeDays); // floor so oldest edges stay visible, never fully invisible
      }

   ``fadeDays`` is bound to an ``<input type="range">`` slider in the
   webview's HTML (``REQ_FLOW_CHORDVIEW`` AC-3); changing it only re-runs
   ``opacityFor`` over the already-loaded ``FlowData`` — no re-fetch.

   **Theming:** node/ribbon fill colors are assigned from a palette read via
   ``getComputedStyle(document.documentElement).getPropertyValue('--vscode-charts-*')``
   (``REQ_FLOW_CHORDVIEW`` AC-5), falling back to a small fixed D3 category
   palette if a given custom property is unset.

   **Tooltips:** a hover listener on each ribbon/arc shows a positioned
   ``<div>`` with ``count``, ``firstTimestamp``–``lastTimestamp``, and
   ``sample`` (truncated to ~120 chars) from the corresponding ``FlowEdge``.

   **Acceptance Criteria:**

   * AC-1: Node arcs and edge ribbons render from ``FlowData`` with no
     server round-trip other than the 5 s poll (``SPEC_FLOW_WEBVIEW``).
   * AC-2: The fade slider only affects rendering (``opacityFor``), never
     triggers a new ``postMessage`` request to the extension host.
   * AC-3: Empty ``FlowData`` (``{ nodes: [], edges: [] }``) renders an
     empty-state message instead of an empty SVG (``REQ_FLOW_DATASOURCE`` AC-1).


.. spec:: Actor Node Click Bridge
   :id: SPEC_FLOW_ACTORCLICK
   :status: draft
   :links: REQ_FLOW_ACTORCLICK; SPEC_FLOW_CHORDRENDER; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   A ``click`` listener on each node arc in ``chord.ts`` posts
   ``{ type: 'actorClick', name }`` to the extension host (``vscode.postMessage``,
   the standard webview→host channel). The host-side handler
   (``SPEC_FLOW_WEBVIEW``'s ``onDidReceiveMessage``) invokes the
   already-registered ``jarvis.openMessageSession`` command by id
   (``SPEC_MSG_EDITORPLACEMENT``) rather than calling ``lookupSessionUUID``/
   ``openAtMain`` directly — those are not reachable via ``JarvisCoreApi``'s
   exports (``openAtMain`` is a private closure in core's ``extension.ts``;
   ``lookupSessionUUID`` is re-exported from ``engine/index.ts`` only as a
   type, not a value). Invoking the command achieves the same reuse (no
   Flow-specific placement/lookup logic) without requiring any change to
   ``JarvisCoreApi`` or duplicating core's session-lookup/placement logic
   in the Flow package (found necessary during implementation, Dev
   Engineer commit ``2d18c43``):

   .. code-block:: typescript

      async function handleActorClick(name: string): Promise<void> {
        // jarvis.openMessageSession accepts any object shaped like
        // SessionGroupNode (SPEC_MSG_TREEPROVIDER) — only `.destination`
        // is read. It resolves the live session itself and is a silent
        // no-op if none exists (REQ_FLOW_ACTORCLICK AC-3) — the same
        // command already bound to a Messages-tree group-node click.
        await vscode.commands.executeCommand('jarvis.openMessageSession', { destination: name });
      }

   **Acceptance Criteria:**

   * AC-1: ``handleActorClick`` reuses the existing ``jarvis.openMessageSession``
     command unmodified — no Flow-specific placement branch is introduced
     in ``SPEC_MSG_EDITORPLACEMENT``, and no new engine API/export is added
     to ``JarvisCoreApi`` for this CR.
   * AC-2: A click on a node with no resolvable session is a silent no-op
     — no error, no notification — since ``jarvis.openMessageSession``
     itself already implements that behavior (``SPEC_MSG_EDITORPLACEMENT``).
   * AC-3: The Flow package invokes ``jarvis.openMessageSession`` via
     ``vscode.commands.executeCommand`` (a cross-extension command call,
     available regardless of which extension registered the command) —
     no dependency on ``JarvisCoreApi``'s exports for this interaction,
     unlike ``SPEC_FLOW_DATASERVICE``'s direct file read of
     ``message-log.json``.
