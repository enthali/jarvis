Message Flow Visualization Design Specifications
==================================================

.. spec:: Flow Data Service
   :id: SPEC_FLOW_DATASERVICE
   :status: draft
   :links: REQ_FLOW_DATASOURCE; REQ_FLOW_LOADMORE; SPEC_MSG_LOGSETTING

   **Description:**
   ``packages/flow/src/dataService.ts`` reads ``message-log.json`` (same file
   and format as ``SPEC_MSG_LOGSETTING``) and aggregates it into the node/edge
   shape the renderer consumes. Read-only — never writes to the log.
   **Amended (flow-time-lens CR):** ``loadFlowData`` now accepts an explicit
   ``cap`` parameter (``REQ_FLOW_LOADMORE`` AC-1) instead of a fixed module
   constant, and ``FlowData`` additionally carries the raw, capped, entry list
   (``entries``) so the webview can recompute the time-lens window
   (``REQ_FLOW_TIMELENS``) locally, without a host round-trip per handle drag.

   .. code-block:: typescript

      interface FlowMessageEntry {
        sender: string;
        destination: string;
        timestamp: string; // ISO 8601
      }

      interface FlowEdge {
        source: string;
        target: string;
        count: number;
        firstTimestamp: string; // ISO 8601, earliest in this group
        lastTimestamp: string;  // ISO 8601, latest in this group
        sample: string;         // text of the most recent entry in this group
      }

      interface FlowData {
        nodes: string[];            // distinct union of sender/destination
        edges: FlowEdge[];          // full-cap aggregation (unchanged shape)
        entries: FlowMessageEntry[]; // NEW — capped raw entries, chronological
                                      // ascending order (oldest first); the
                                      // webview derives per-message rank and
                                      // re-aggregates windowed subsets from
                                      // this array (REQ_FLOW_TIMELENS)
      }

      export const DEFAULT_CAP = 500;

      function loadFlowData(logPath: string, cap: number = DEFAULT_CAP): FlowData {
        const raw = readMessageLog(logPath); // reuses message-log.json reader
        const capped = raw.slice(-cap); // most recent `cap` entries, no time boundary
        return {
          ...aggregate(capped),
          entries: capped.map(e => ({ sender: e.sender, destination: e.destination, timestamp: e.timestamp }))
        };
      }

   **Acceptance Criteria:**

   * AC-1: If ``message-log.json`` does not exist or fails to parse, returns
     ``{ nodes: [], edges: [], entries: [] }`` (empty state, no thrown error)
     — mirrors the existing tolerant-parse pattern in
     ``readQueue()``/``SPEC_MSG_QUEUESTORE``.
   * AC-2: The entry cap (``REQ_FLOW_DATASOURCE`` AC-2, now parameterized per
     ``REQ_FLOW_LOADMORE`` AC-1) is applied before aggregation, not after —
     node/edge counts and the ``entries`` array always reflect the
     already-capped set. There is no time-based boundary — an idle
     project's messages remain visible regardless of age, as long as they
     fall within the ``cap`` most recent log entries.
   * AC-3: ``aggregate()`` groups capped entries by ``(sender, destination)``,
     computing ``count``, ``firstTimestamp``/``lastTimestamp`` (min/max), and
     ``sample`` (text of the chronologically-last entry in the group).
     Unchanged by this CR — the lens windowing (``REQ_FLOW_TIMELENS``)
     re-runs an equivalent grouping client-side over a sub-range of
     ``entries``; it does not alter this host-side function.
   * AC-4: ``cap`` defaults to ``DEFAULT_CAP`` (500) for the first load of a
     newly created panel; ``SPEC_FLOW_LOADMORE`` governs how and when a
     larger ``cap`` value is supplied on subsequent calls.


.. spec:: Flow Webview Panel
   :id: SPEC_FLOW_WEBVIEW
   :status: draft
   :links: REQ_FLOW_WEBVIEWPANEL; REQ_FLOW_LOADMORE; SPEC_FLOW_DATASERVICE; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   ``packages/flow/src/extension.ts`` registers ``jarvis.openMessageFlow``,
   which creates (or reveals, if already open) a single
   ``vscode.WebviewPanel`` at the fixed Content column (``DOCS_COLUMN``,
   ``SPEC_MSG_EDITORPLACEMENT``), never via ``resolveSecondaryColumn()``.
   **Amended (flow-time-lens CR):** the panel now tracks its own in-memory
   data-load cap (``REQ_FLOW_LOADMORE``) and handles an ``increaseCap``
   message from the webview alongside the existing ``actorClick`` message.

   .. code-block:: typescript

      const FLOW_VIEWTYPE = 'jarvisMessageFlow';
      const DOCS_COLUMN = vscode.ViewColumn.Two;
      let panel: vscode.WebviewPanel | undefined;

      function openMessageFlow(context: vscode.ExtensionContext, logPath: string): void {
        if (panel) {
          panel.reveal(DOCS_COLUMN);
          return;
        }
        let currentCap = DEFAULT_CAP; // REQ_FLOW_LOADMORE AC-4 — resets per new panel

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
            panel.webview.postMessage({ type: 'data', payload: loadFlowData(logPath, currentCap) });
          }
        }, 5000);
        panel.webview.postMessage({ type: 'data', payload: loadFlowData(logPath, currentCap) });

        panel.webview.onDidReceiveMessage(msg => {
          if (msg.type === 'actorClick') {
            handleActorClick(msg.name);
          } else if (msg.type === 'increaseCap') {
            // REQ_FLOW_LOADMORE AC-1/AC-2 — grow cap, reload, push immediately
            currentCap += 500;
            panel?.webview.postMessage({ type: 'data', payload: loadFlowData(logPath, currentCap) });
          }
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
   * AC-5: ``currentCap`` is a closure variable scoped to one
     ``openMessageFlow`` call (i.e. one panel lifetime) — it is not
     persisted anywhere and resets to ``DEFAULT_CAP`` the next time a panel
     is created from scratch, per ``REQ_FLOW_LOADMORE`` AC-4.
   * AC-6: Both the regular 5 s poll tick and an ``increaseCap`` message use
     the same ``loadFlowData(logPath, currentCap)`` call — an ``increaseCap``
     response is indistinguishable in shape from a normal poll update; the
     webview client applies the same rank-rederivation logic
     (``REQ_FLOW_TIMELENS`` AC-1) to both.


.. spec:: Chord Diagram Renderer
   :id: SPEC_FLOW_CHORDRENDER
   :status: draft
   :links: REQ_FLOW_CHORDVIEW; REQ_FLOW_TIMELENS; SPEC_FLOW_WEBVIEW; SPEC_FLOW_TIMELENS

   **Description:**
   ``packages/flow/webview/chord.ts`` (bundled into the webview's script,
   vendoring D3 via ``packages/flow/webview/vendor/d3.min.js`` — no CDN
   fetch) renders the currently windowed (``SPEC_FLOW_TIMELENS``) subset of
   ``FlowData.entries`` as a D3 chord diagram (``d3.chord()`` + ``d3.ribbon()``
   on a node-index adjacency matrix built by re-aggregating that subset).

   **Time lens fade (amended, flow-time-lens CR — replaces the prior
   day-based "Fog of Time" fade in its entirety; see ``SPEC_FLOW_TIMELENS``
   for the full lens/rank mechanism):**

   .. code-block:: typescript

      const FADE_FLOOR = 0.05; // was 0.15 — lowered per REQ_FLOW_TIMELENS AC-6

      function opacityFor(rank: number, startRank: number, endRank: number): number {
        if (endRank === startRank) { return 1; } // degenerate single-message window
        const t = (rank - startRank) / (endRank - startRank); // 0 at near edge, 1 at far edge
        return Math.max(FADE_FLOOR, 1 - t);
      }

   Each rendered edge's opacity is computed from the rank of the message
   contributing its ``lastTimestamp`` within the window (i.e. the most
   recent message in that edge group determines how "faded" the whole edge
   looks) — re-run purely client-side whenever either lens handle moves; no
   ``postMessage`` request to the extension host is triggered
   (``REQ_FLOW_TIMELENS`` AC-8).

   **Theming:** node/ribbon fill colors are assigned from a palette read via
   ``getComputedStyle(document.documentElement).getPropertyValue('--vscode-charts-*')``
   (``REQ_FLOW_CHORDVIEW`` AC-5), falling back to a small fixed D3 category
   palette if a given custom property is unset.

   **Tooltips:** a hover listener on each ribbon/arc shows a positioned
   ``<div>`` with ``count``, ``firstTimestamp``–``lastTimestamp``, and
   ``sample`` (truncated to ~120 chars) from the corresponding (windowed)
   ``FlowEdge``. Separately, while dragging a lens handle, a drag tooltip
   shows the timestamp of the entry at that handle's current position
   (``REQ_FLOW_TIMELENS`` AC-7; see ``SPEC_FLOW_TIMELENS``).

   **Acceptance Criteria:**

   * AC-1: Node arcs and edge ribbons render from the lens-windowed subset
     of ``FlowData.entries``, re-aggregated client-side, with no server
     round-trip other than the 5 s poll / an explicit ``REQ_FLOW_LOADMORE``
     cap increase (``SPEC_FLOW_WEBVIEW``).
   * AC-2: Moving either lens handle only affects rendering (windowed
     re-aggregation + ``opacityFor``), never triggers a new ``postMessage``
     request to the extension host.
   * AC-3: Empty ``FlowData`` (``{ nodes: [], edges: [], entries: [] }``)
     renders an empty-state message instead of an empty SVG
     (``REQ_FLOW_DATASOURCE`` AC-1).
   * AC-4: The fade floor used by ``opacityFor`` is 0.05 (``REQ_FLOW_TIMELENS``
     AC-6) — the oldest visible edge within the window is never fully
     invisible, but is markedly dimmer than under the prior 0.15 floor.


.. spec:: Time Lens (Rank Derivation, Live-Tracking & Anchoring)
   :id: SPEC_FLOW_TIMELENS
   :status: draft
   :links: REQ_FLOW_TIMELENS; SPEC_FLOW_DATASERVICE; SPEC_FLOW_CHORDRENDER

   **Description:**
   ``packages/flow/webview/chord.ts`` derives per-message rank from
   ``FlowData.entries`` (``SPEC_FLOW_DATASERVICE``) and maintains two lens
   handles (``start``, ``end``) entirely client-side. A message's **identity**
   for anchoring purposes is the tuple ``(timestamp, sender, destination)`` —
   sufficiently unique in practice for a single workspace's message log, and
   simpler than introducing a synthetic sequence id into the log format
   (which ``REQ_FLOW_DATASOURCE`` explicitly rules out: "no new file format").

   .. code-block:: typescript

      interface MessageIdentity { timestamp: string; sender: string; destination: string; }

      type LensHandle =
        | { mode: 'live' }                       // start handle only, rank 1
        | { mode: 'anchored'; id: MessageIdentity };

      interface LensState {
        start: LensHandle;
        end: LensHandle; // end is always 'anchored' — never 'live'
      }

      // Rank 1 = last element of `entries` (most recent); rank grows toward index 0.
      function rankOf(entries: FlowMessageEntry[], index: number): number {
        return entries.length - index;
      }

      function indexForIdentity(entries: FlowMessageEntry[], id: MessageIdentity): number {
        const idx = entries.findIndex(e =>
          e.timestamp === id.timestamp && e.sender === id.sender && e.destination === id.destination
        );
        return idx; // -1 if the message aged out of the loaded window (edge case, see AC-4)
      }

      function currentWindow(entries: FlowMessageEntry[], lens: LensState): { startRank: number; endRank: number } {
        const total = entries.length;
        const startRank = lens.start.mode === 'live'
          ? 1
          : rankOf(entries, indexForIdentity(entries, lens.start.id));
        const endIdx = indexForIdentity(entries, lens.end.id);
        const endRank = endIdx === -1 ? total : rankOf(entries, endIdx); // AC-4 fallback
        return { startRank, endRank };
      }

   Whenever new ``FlowData`` arrives (regular 5 s poll, or a
   ``REQ_FLOW_LOADMORE`` cap-increase response — indistinguishable in shape,
   ``SPEC_FLOW_WEBVIEW`` AC-6), ``currentWindow()`` is recomputed against the
   new ``entries`` array; the window's rendered content only changes if the
   underlying identities it resolves to change (which happens automatically
   for the live handle, and only when an anchored identity ages out for an
   anchored handle).

   **Handle interaction:** dragging a handle updates a transient index during
   the drag (for the drag tooltip, ``REQ_FLOW_TIMELENS`` AC-7); on drag end,
   the handle's ``LensState`` entry is committed: the start handle becomes
   ``{ mode: 'live' }`` if released at rank 1, otherwise
   ``{ mode: 'anchored', id: <identity of entries[releasedIndex]> }``; the end
   handle always commits as ``{ mode: 'anchored', id: ... }``.

   **Client-side re-aggregation:** ``aggregateWindow(entries, startRank,
   endRank)`` groups the slice of ``entries`` between the resolved indices by
   ``(sender, destination)`` — logic intentionally mirrors (small, ~10-line)
   the host's ``aggregate()`` in ``SPEC_FLOW_DATASERVICE`` — this is a
   deliberate, minimal duplication to keep every lens-handle move a
   zero-round-trip client-side operation (``REQ_FLOW_TIMELENS`` AC-8), rather
   than introducing IPC plumbing for a small pure function.

   **Acceptance Criteria:**

   * AC-1: ``rankOf``/``indexForIdentity`` are recomputed on every new
     ``FlowData`` payload — ranks are never cached across payloads
     (``REQ_FLOW_TIMELENS`` AC-1).
   * AC-2: A start handle in ``{ mode: 'live' }`` always resolves to rank 1
     regardless of how many new messages have arrived (``REQ_FLOW_TIMELENS``
     AC-3) — no identity lookup is performed for it.
   * AC-3: An anchored handle (start away from rank 1, or end always)
     resolves via ``indexForIdentity`` — its displayed rank number changes as
     new messages shift it, but ``currentWindow()`` still returns the same
     conceptual boundary (same message), so the rendered edge set does not
     jump (``REQ_FLOW_TIMELENS`` AC-4).
   * AC-4: If an anchored identity is no longer present in ``entries``
     (``indexForIdentity`` returns ``-1`` — only possible if a future CR
     introduces log trimming/eviction independent of the cap; not reachable
     under the current append-only, cap-only-grows model), the handle falls
     back to the far edge (``endRank = total``) rather than throwing.
   * AC-5: Default ``LensState`` on panel open is
     ``{ start: { mode: 'live' }, end: { mode: 'anchored', id: <identity of
     entries[max(0, entries.length - 500)]> } }`` — i.e. rank 1 through
     ``min(total, 500)`` (``REQ_FLOW_TIMELENS`` AC-5).


.. spec:: Expand Loaded History Button ("+500")
   :id: SPEC_FLOW_LOADMORE
   :status: draft
   :links: REQ_FLOW_LOADMORE; SPEC_FLOW_WEBVIEW; SPEC_FLOW_DATASERVICE

   **Description:**
   A button in the webview's HTML, adjacent to the time lens, posts
   ``{ type: 'increaseCap' }`` to the extension host on click
   (``vscode.postMessage``) and is handled by ``SPEC_FLOW_WEBVIEW``'s
   ``onDidReceiveMessage`` (cap += 500, immediate reload + push).

   .. code-block:: typescript

      document.getElementById('load-more-btn')!.addEventListener('click', () => {
        vscode.postMessage({ type: 'increaseCap' });
      });

   The resulting ``FlowData`` update is applied through the exact same
   code path as a regular poll tick (``SPEC_FLOW_WEBVIEW`` AC-6): existing
   lens state (live or anchored) is preserved by ``SPEC_FLOW_TIMELENS``'s
   identity-based resolution — the newly reachable history simply becomes
   draggable-to via the end handle, without moving anything automatically.

   **Acceptance Criteria:**

   * AC-1: Clicking the button posts exactly one ``{ type: 'increaseCap' }``
     message per click; the button is not disabled or debounced beyond
     normal UI responsiveness (repeated rapid clicks are acceptable and each
     adds 500, per ``REQ_FLOW_LOADMORE`` AC-1 — no upper limit is enforced).
   * AC-2: On receiving the resulting ``FlowData`` update, the webview does
     not reset ``LensState`` — it re-resolves the existing handles' identities
     (or ``{ mode: 'live' }``) against the new, longer ``entries`` array
     (``REQ_FLOW_LOADMORE`` AC-3).
   * AC-3: The button has no persisted state and is always visible/enabled
     regardless of current cap size (``REQ_FLOW_LOADMORE`` AC-4).


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


.. spec:: Message Log Viewer Panel
   :id: SPEC_FLOW_LOGVIEWER
   :status: draft
   :links: REQ_FLOW_LOGVIEWER; SPEC_FLOW_WEBVIEW; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   ``packages/flow/src/extension.ts`` registers ``jarvis.openMessageLog``,
   a second singleton ``vscode.WebviewPanel`` alongside the existing
   ``jarvis.openMessageFlow`` panel (``SPEC_FLOW_WEBVIEW``), reusing the
   same viewtype-per-panel/reveal/Docs-column pattern. It reads
   ``message-log.json`` directly (the same file ``SPEC_FLOW_DATASERVICE``
   reads for the chord diagram) via a small local reader — the log
   viewer's own reader returns the raw, un-aggregated entry list
   (reverse-chronological), rather than the chord diagram's
   node/edge-aggregated ``FlowData`` shape, since it displays individual
   entries, not aggregated counts.

   **Reader (``packages/flow/src/dataService.ts`` — new function, alongside
   the existing ``loadFlowData``):**

   .. code-block:: typescript

      export function loadMessageLogEntries(logPath: string): LoggedMessage[] {
          const raw = readMessageLog(logPath); // existing tolerant reader, reused as-is
          return [...raw].reverse(); // newest first (REQ_FLOW_LOGVIEWER AC-5)
      }

   ``readMessageLog()`` (existing, ``SPEC_FLOW_DATASERVICE``) already
   returns ``[]`` on a missing/unparseable file — the empty-state handling
   (``REQ_FLOW_LOGVIEWER`` AC-4) is therefore already satisfied by reuse,
   no new tolerant-parse logic is needed.

   **Panel registration (``extension.ts`` — mirrors ``makeOpenMessageFlow``'s
   structure):**

   .. code-block:: typescript

      const LOGVIEWER_VIEWTYPE = 'jarvisMessageLog';

      function makeOpenMessageLog(
          context: vscode.ExtensionContext,
          log: vscode.LogOutputChannel
      ): () => void {
          let panel: vscode.WebviewPanel | undefined;
          let pollHandle: ReturnType<typeof setInterval> | undefined;

          function postData(): void {
              if (!panel) { return; }
              const logPath = resolveMessageLogPath();
              const entries = logPath ? loadMessageLogEntries(logPath) : [];
              panel.webview.postMessage({ type: 'logData', payload: entries });
          }

          return function openMessageLog(): void {
              if (panel) {
                  panel.reveal(DOCS_COLUMN);
                  return;
              }
              panel = vscode.window.createWebviewPanel(
                  LOGVIEWER_VIEWTYPE,
                  'Message Log',
                  DOCS_COLUMN,
                  {
                      enableScripts: true,
                      retainContextWhenHidden: true,
                      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')],
                  }
              );
              panel.webview.html = renderLogViewerHtml(panel.webview, context.extensionUri);
              panel.onDidDispose(() => {
                  panel = undefined;
                  if (pollHandle) { clearInterval(pollHandle); pollHandle = undefined; }
              });

              panel.webview.onDidReceiveMessage(msg => {
                  if (msg?.type === 'atTop') {
                      // REQ_FLOW_LOGVIEWER AC-7a/AC-7c — (re)start polling, refresh immediately
                      if (!pollHandle) {
                          postData();
                          pollHandle = setInterval(() => { if (panel?.visible) { postData(); } }, POLL_MS);
                      }
                  } else if (msg?.type === 'scrolledDown') {
                      // REQ_FLOW_LOGVIEWER AC-7b — pause polling, freeze current list
                      if (pollHandle) { clearInterval(pollHandle); pollHandle = undefined; }
                  } else if (msg?.type === 'requeue') {
                      handleRequeue(msg.entry, log)
                          .then(ok => panel?.webview.postMessage({ type: 'requeueResult', ok }))
                          .catch(e => {
                              log.warn(`[Flow] requeue failed: ${e}`);
                              panel?.webview.postMessage({ type: 'requeueResult', ok: false });
                          });
                  }
              });

              postData();
              pollHandle = setInterval(() => { if (panel?.visible) { postData(); } }, POLL_MS);
          };
      }

   **Design note — scroll-position-driven refresh lives in the webview,
   not the host:** the extension host has no visibility into the webview's
   DOM scroll position; the webview-side script tracks ``scrollTop`` on its
   own list container and posts ``{ type: 'atTop' }`` /
   ``{ type: 'scrolledDown' }`` transitions to the host, which starts/stops
   the ``setInterval`` accordingly (``REQ_FLOW_LOGVIEWER`` AC-7). This is
   the same split responsibility already used for ``increaseCap``
   (``SPEC_FLOW_LOADMORE``) — webview owns UI/interaction state, host owns
   data loading and timers.

   **HTML/CSS (theme-consistent, per user decision):**

   .. code-block:: typescript

      function renderLogViewerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
          const scriptUri = webview.asWebviewUri(
              vscode.Uri.joinPath(extensionUri, 'out', 'webview', 'logviewer.js')
          );
          const csp = `default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};`;
          return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="${csp}">
        <title>Message Log</title>
        <style>
          html, body { height: 100%; margin: 0; padding: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); font-family: var(--vscode-font-family); }
          #log-root { width: 100%; height: 100%; overflow-y: auto; }
        </style>
      </head>
      <body>
        <div id="log-root"></div>
        <script src="${scriptUri}"></script>
      </body>
      </html>`;
      }

   Same theme-CSS-variable approach as ``SPEC_FLOW_WEBVIEW``'s
   ``renderHtml`` (``--vscode-editor-background`` /
   ``--vscode-editor-foreground`` / ``--vscode-font-family``) — no
   hardcoded colors — per ``REQ_FLOW_LOGVIEWER`` AC-10. Per-entry
   block/button styling (background of each message card, the "Jump to
   Top"/"Requeue" buttons) SHALL likewise use VS Code theme variables
   (e.g. ``--vscode-button-background``/``--vscode-button-foreground`` for
   buttons, ``--vscode-editorWidget-background`` or similar for the
   per-entry card background) rather than fixed colors, so the panel's
   light/dark appearance always matches the chord diagram's and the rest
   of the editor's.

   **Manifest additions (``packages/flow/package.json``):**

   * ``contributes.commands``: ``jarvis.openMessageLog`` (title "Jarvis:
     Open Message Log", icon ``$(list-unordered)`` — distinct from the
     chord diagram's ``$(graph)``)
   * ``contributes.menus.commandPalette``: ``{ "command":
     "jarvis.openMessageLog", "when": "config.jarvis.messages.enabled ==
     true" }`` — same gating as ``jarvis.openMessageFlow``
   * ``contributes.menus.view/title``: ``{ "command":
     "jarvis.openMessageLog", "when": "view == jarvisMessages", "group":
     "navigation@3" }`` — third button, alongside the existing
     ``jarvis.openMessageFlow`` (``navigation@2``)

   **Acceptance Criteria:**

   1. ``jarvis.openMessageLog`` creates the panel on first call and reveals
      the existing instance on subsequent calls.
   2. The panel opens at the fixed Docs column (``DOCS_COLUMN``), same as
      the chord-diagram panel.
   3. ``loadMessageLogEntries()`` reuses the existing tolerant
      ``readMessageLog()`` reader and only reverses order — no duplicated
      parse/empty-state logic.
   4. Auto-refresh start/stop is driven by webview-posted ``atTop``/
      ``scrolledDown`` messages, not by any host-side scroll awareness (the
      host has none).
   5. Polling uses the same 5000 ms interval and the same
      "skip while not ``panel.visible``" guard as the chord diagram.
   6. HTML/CSS uses VS Code theme CSS variables throughout (background,
      foreground, font, button colors) — no hardcoded color values.


.. spec:: Message Requeue (Redelivery)
   :id: SPEC_FLOW_REQUEUE
   :status: draft
   :links: REQ_FLOW_REQUEUE; SPEC_FLOW_LOGVIEWER; SPEC_MSG_QUEUESTORE

   **Description:**
   A local, minimal queue-append function in ``packages/flow`` (NOT an
   import of core's ``appendMessage()`` — cross-package compile-time
   imports between separately-bundled extensions are not possible; this
   mirrors the existing precedent of ``dataService.ts`` maintaining its own
   ``message-log.json`` reader rather than importing core's) writes a copy
   of the requeued entry into ``messages.json``, preserving the original
   ``sender`` and ``timestamp`` verbatim (per user decision during L1
   review — a requeue is an exact redelivery of the original entry, not a
   new event with a new send time). It deliberately does **not** touch
   ``message-log.json`` — no audit-log side effect, unlike a normal send.

   **Implementation:**

   .. code-block:: typescript

      interface QueuedMessageCopy {
          destination: string;
          sender: string;
          text: string;
          timestamp: string; // preserved verbatim from the original log entry
      }

      /** Resolves <workspaceRoot>/.jarvis/messages.json — mirrors configPaths.getMessagesPath(). */
      function resolveMessagesPath(): string | undefined {
          const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          return root ? path.join(root, '.jarvis', 'messages.json') : undefined;
      }

      /**
       * Appends `entry` to messages.json only — deliberately does NOT write
       * to message-log.json, even if jarvis.messages.logging is enabled
       * (REQ_FLOW_REQUEUE: a requeue is a redelivery of an already-logged
       * entry, not a new event to log again).
       */
      async function requeueMessage(entry: QueuedMessageCopy): Promise<void> {
          const messagesPath = resolveMessagesPath();
          if (!messagesPath) { throw new Error('No workspace open'); }
          let queue: QueuedMessageCopy[] = [];
          try {
              const raw = await fs.promises.readFile(messagesPath, 'utf-8');
              queue = JSON.parse(raw);
          } catch {
              queue = []; // missing/unparseable file → start fresh, same tolerant pattern as readMessageLog()
          }
          queue.push(entry);
          await fs.promises.mkdir(path.dirname(messagesPath), { recursive: true });
          await fs.promises.writeFile(messagesPath, JSON.stringify(queue, null, 2));
      }

      async function handleRequeue(
          original: { sender: string; destination: string; text: string; timestamp: string },
          log: vscode.LogOutputChannel
      ): Promise<boolean> {
          try {
              await requeueMessage({
                  destination: original.destination,
                  sender: original.sender,        // preserved verbatim
                  text: original.text,
                  timestamp: original.timestamp,  // preserved verbatim — same send time
              });
              log.info(`[Flow] requeued message to "${original.destination}" (original timestamp ${original.timestamp})`);
              return true;
          } catch (e) {
              log.warn(`[Flow] requeue failed for "${original.destination}": ${e}`);
              return false;
          }
      }

   **Design note — why no idempotency/dedup guard:** ``REQ_FLOW_REQUEUE``
   AC-6 explicitly permits repeated requeues of the same entry, each
   appending independently — there is deliberately no "already requeued"
   marker or check, unlike ``jarvis_createActor``'s idempotent-skip
   pattern elsewhere in the codebase. A requeue is a user-initiated,
   repeatable action, not a create-once operation.

   **Webview-side trigger (``logviewer.ts``, new webview script):** the
   Requeue button's click handler posts
   ``{ type: 'requeue', entry: { sender, destination, text, timestamp } }``
   (the full original entry, not just an index — the log viewer holds the
   already-loaded, reverse-chronological array client-side) to the
   extension host; on ``{ type: 'requeueResult', ok }`` it shows a
   transient inline confirmation or error state on that entry's card
   (``REQ_FLOW_REQUEUE`` AC-4/AC-5) — no panel-wide reload is triggered by
   a requeue itself (the next scheduled/atTop-triggered poll will pick up
   any change naturally if the requeued message is itself later logged
   again by a subsequent real send).

   **Acceptance Criteria:**

   1. ``requeueMessage()`` writes only to ``messages.json`` — no code path
      in this function touches ``message-log.json``.
   2. The appended entry's ``sender`` and ``timestamp`` are copied verbatim
      from the original log entry; only ``destination``/``text`` are
      otherwise involved (also copied verbatim — nothing is transformed).
   3. A missing/unparseable ``messages.json`` is treated as an empty queue
      (tolerant, consistent with ``readMessageLog()``'s existing pattern)
      — the requeue still succeeds, creating the file fresh.
   4. No workspace open (``resolveMessagesPath()`` returns ``undefined``)
      results in a thrown error, caught by ``handleRequeue()``, surfaced to
      the webview as ``{ ok: false }`` — never an unhandled rejection.
   5. Repeated requeues of the same entry are unrestricted — no
      deduplication, no "already requeued" state tracked anywhere.
