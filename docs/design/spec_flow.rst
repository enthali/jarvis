Message Flow Visualization Design Specifications
==================================================

.. spec:: Flow Data Service
   :id: SPEC_FLOW_DATASERVICE
   :status: implemented
   :links: REQ_FLOW_DATASOURCE; REQ_FLOW_LOADMORE; SPEC_MSG_LOGSETTING; REQ_CFG_STATEMIGRATION

   **Description:**
   ``packages/flow/src/dataService.ts`` reads the message audit log at
   ``.jarvis/messages/log.json`` (same file
   and format as ``SPEC_MSG_LOGSETTING``) and aggregates it into the node/edge
   shape the renderer consumes. Read-only — never writes to the log.

   **(GH #59)** ``flow`` is a separate extension and may run at a different
   version from ``core``, so its read unions the superseded
   ``.jarvis/message-log.json`` with the current path
   (``SPEC_CFG_STATEMIGRATION``): ``unionReadLog`` merges both files,
   drops duplicates by the tuple (destination, sender, text, timestamp) and
   orders the result by ascending timestamp. Being read-only, it never removes the
   superseded file (``REQ_CFG_STATEMIGRATION`` AC-7) — removal requires having
   persisted the union, which only the writer does.

   ``loadFlowData`` takes an explicit ``cap`` parameter
   (``REQ_FLOW_LOADMORE`` AC-1), and ``FlowData`` carries the raw, capped, entry
   list (``entries``) next to the aggregation, so the webview can recompute the
   time-lens window (``REQ_FLOW_TIMELENS``) locally, without a host round-trip
   per handle drag. The shared shapes live in ``packages/flow/src/types.ts``.

   .. code-block:: typescript

      interface FlowMessageEntry {
        sender: string;
        destination: string;
        timestamp: string; // ISO 8601
        text: string;      // message text, for the tooltip sample (SPEC_FLOW_CHORDRENDER)
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
        edges: FlowEdge[];          // full-cap aggregation
        entries: FlowMessageEntry[]; // capped raw entries, chronological
                                      // ascending order (oldest first); the
                                      // webview derives per-message rank and
                                      // re-aggregates windowed subsets from
                                      // this array (REQ_FLOW_TIMELENS)
      }

      export const DEFAULT_CAP = 30;

      function loadFlowData(logPath: string, cap: number = DEFAULT_CAP, legacyLogPath?: string): FlowData {
        const raw = unionReadLog(logPath, legacyLogPath); // tolerant readers, current + superseded path
        const capped = raw.slice(-cap); // most recent `cap` entries, no time boundary
        return {
          ...aggregate(capped),
          entries: capped.map(e => ({ sender: e.sender, destination: e.destination, timestamp: e.timestamp, text: e.text }))
        };
      }

   **Acceptance Criteria:**

   * AC-1: If the audit log does not exist at either path or fails to parse,
     returns
     ``{ nodes: [], edges: [], entries: [] }`` (empty state, no thrown error)
     — mirrors the existing tolerant-parse pattern in
     ``readQueue()``/``SPEC_MSG_QUEUESTORE``.
   * AC-2: The entry cap (``REQ_FLOW_DATASOURCE`` AC-2, parameterized per
     ``REQ_FLOW_LOADMORE`` AC-1) is applied before aggregation, not after —
     node/edge counts and the ``entries`` array always reflect the
     already-capped set. There is no time-based boundary — an idle
     project's messages remain visible regardless of age, as long as they
     fall within the ``cap`` most recent log entries.
   * AC-3: ``aggregate()`` groups capped entries by ``(sender, destination)``,
     computing ``count``, ``firstTimestamp``/``lastTimestamp`` (min/max), and
     ``sample`` (text of the chronologically-last entry in the group).
     The lens windowing (``REQ_FLOW_TIMELENS``)
     re-runs an equivalent grouping client-side over a sub-range of
     ``entries``; it does not alter this host-side function.
   * AC-4: ``cap`` defaults to ``DEFAULT_CAP`` (30) for the first load of a
     newly created panel; ``SPEC_FLOW_LOADMORE`` governs how and when a
     larger ``cap`` value is supplied on subsequent calls.


.. spec:: Flow Webview Panel
   :id: SPEC_FLOW_WEBVIEW
   :status: implemented
   :links: REQ_FLOW_WEBVIEWPANEL; REQ_FLOW_LOADMORE; SPEC_FLOW_DATASERVICE; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   ``packages/flow/src/extension.ts`` registers ``jarvis.openMessageFlow``
   (``makeOpenMessageFlow``), which creates (or reveals, if already open) a
   single ``vscode.WebviewPanel`` at the fixed Content column
   (``DOCS_COLUMN``, ``SPEC_MSG_EDITORPLACEMENT``), never via
   ``resolveSecondaryColumn()``. The panel tracks its own in-memory
   data-load cap (``REQ_FLOW_LOADMORE``) and handles an ``increaseCap``
   message from the webview alongside the ``actorClick`` message. Paths
   are resolved from the first workspace folder; without one the panel
   receives the empty ``FlowData``.

   .. code-block:: typescript

      const FLOW_VIEWTYPE = 'jarvisMessageFlow';
      const DOCS_COLUMN = vscode.ViewColumn.Two;
      const POLL_MS = 5000;

      function makeOpenMessageFlow(context: vscode.ExtensionContext, log: vscode.LogOutputChannel): () => void {
        let panel: vscode.WebviewPanel | undefined;
        let pollHandle: ReturnType<typeof setInterval> | undefined;
        let currentCap = DEFAULT_CAP;

        function postData(): void {
          if (!panel) { return; }
          const logPath = resolveMessageLogPath();
          const payload = logPath
            ? loadFlowData(logPath, currentCap, resolveLegacyMessageLogPath())
            : { nodes: [], edges: [], entries: [] };
          panel.webview.postMessage({ type: 'data', payload });
        }

        return function openMessageFlow(): void {
          if (panel) {
            panel.reveal(DOCS_COLUMN);
            return;
          }
          currentCap = DEFAULT_CAP; // REQ_FLOW_LOADMORE AC-4 — resets per new panel
          panel = vscode.window.createWebviewPanel(
            FLOW_VIEWTYPE, 'Message Flow', DOCS_COLUMN,
            { enableScripts: true, retainContextWhenHidden: true,
              localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out')] }
          );
          panel.webview.html = renderHtml(panel.webview, context.extensionUri);

          panel.webview.onDidReceiveMessage(msg => {
            if (msg?.type === 'actorClick' && typeof msg.name === 'string') {
              handleActorClick(msg.name).catch(e => log.warn(`[Flow] actorClick failed: ${e}`));
            } else if (msg?.type === 'increaseCap') {
              // REQ_FLOW_LOADMORE AC-1/AC-2 — grow cap, reload, push immediately
              currentCap += 30;
              postData();
            }
          });

          panel.onDidDispose(() => {
            panel = undefined;
            if (pollHandle) { clearInterval(pollHandle); pollHandle = undefined; }
          });

          pollHandle = setInterval(() => { if (panel?.visible) { postData(); } }, POLL_MS);
          postData();
        };
      }

   **Acceptance Criteria:**

   * AC-1: ``jarvis.openMessageFlow`` creates the panel on first call and
     reveals the existing instance (``panel.reveal(DOCS_COLUMN)``) on
     subsequent calls — exactly one panel instance ever exists.
   * AC-2: Poll interval is 5000 ms, matching the 5-second tick of the extension's inbox and reminder loop;
     polling is skipped while ``panel.visible`` is false (backgrounded tab)
     to avoid needless work.
   * AC-3: The title-bar button contribution (``package.json`` ``menus``,
     ``view/title`` for ``jarvisMessages``, group ``navigation@2``) invokes
     the same ``jarvis.openMessageFlow`` command.
   * AC-4: CSP (``Content-Security-Policy`` meta tag in ``renderHtml``)
     restricts default, script and image sources to the webview's own origin
     (``webview.cspSource``) and style sources to it plus inline styles — no
     external CDN origins are permitted, per ``REQ_FLOW_CHORDVIEW`` AC-6. The
     webview's resource roots are limited to the package's ``out`` folder
     (``localResourceRoots``).
   * AC-5: ``currentCap`` is a variable of one ``makeOpenMessageFlow`` call,
     set back to ``DEFAULT_CAP`` whenever a panel is created from scratch
     (not on reveal) — it is not persisted anywhere, per
     ``REQ_FLOW_LOADMORE`` AC-4.
   * AC-6: Both the regular 5 s poll tick and an ``increaseCap`` message use
     the same ``postData()`` call, which loads with ``currentCap`` — an ``increaseCap``
     response is indistinguishable in shape from a normal poll update; the
     webview client applies the same rank-rederivation logic
     (``REQ_FLOW_TIMELENS`` AC-1) to both.


.. spec:: Chord Diagram Renderer
   :id: SPEC_FLOW_CHORDRENDER
   :status: implemented
   :links: REQ_FLOW_CHORDVIEW; REQ_FLOW_TIMELENS; SPEC_FLOW_WEBVIEW; SPEC_FLOW_TIMELENS

   **Description:**
   ``packages/flow/webview/chord.ts`` (bundled by esbuild into
   ``out/webview/chord.js``, with D3 from the ``d3`` dev dependency bundled
   in at build time — no CDN fetch, ``packages/flow/webview-build.js``)
   renders the currently windowed (``SPEC_FLOW_TIMELENS``) subset of
   ``FlowData.entries`` as a D3 chord diagram (``d3.chord()`` + ``d3.ribbon()``
   on a node-index adjacency matrix built by re-aggregating that subset).

   **Time lens fade (see ``SPEC_FLOW_TIMELENS`` for the full lens/rank
   mechanism):**

   .. code-block:: typescript

      const FADE_FLOOR = 0.05; // REQ_FLOW_TIMELENS AC-6

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

   **Tooltips:** a ``mousemove`` listener on each ribbon (edge) and on each
   node arc shows a positioned ``<div>``. The edge tooltip shows
   ``source → target``, ``count``, ``firstTimestamp``–``lastTimestamp`` and a
   truncated ``sample`` (80 characters, ellipsis when cut) of the corresponding
   (windowed) ``FlowEdge``. The node tooltip shows the node name, the number of
   messages it sent and received inside the window, their time range, and the
   truncated text of the newest of them. For this ``FlowMessageEntry`` carries
   ``text`` (``SPEC_FLOW_DATASERVICE``), the windowed re-aggregation keeps it, so
   ``sample`` is the text of the newest entry of the group inside the window
   and is never the empty string while a message exists.
   Separately, while dragging a lens handle, a drag tooltip
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
     invisible.
   * AC-5: A node arc and an edge ribbon each show a tooltip on hover; both
     show the message count, the time range and a sample of at most 80
     characters of the newest message text (``REQ_FLOW_CHORDVIEW`` AC-4).


.. spec:: Time Lens (Rank Derivation, Live-Tracking & Anchoring)
   :id: SPEC_FLOW_TIMELENS
   :status: implemented
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

      // Returns indices as well as ranks; the render step slices entries[endIdx..startIdx].
      function currentWindow(entries: FlowMessageEntry[], lens: LensState):
        { startIdx: number; endIdx: number; startRank: number; endRank: number } {
        const total = entries.length;
        if (total === 0) { return { startIdx: 0, endIdx: 0, startRank: 0, endRank: 0 }; }
        let startIdx = lens.start.mode === 'live'
          ? total - 1                                   // rank 1
          : indexForIdentity(entries, lens.start.id);
        if (startIdx === -1) { startIdx = total - 1; }  // AC-4 fallback: near edge
        let endIdx = indexForIdentity(entries, lens.end.id);
        if (endIdx === -1) { endIdx = 0; }              // AC-4 fallback: far edge (rank = total)
        return { startIdx, endIdx, startRank: rankOf(entries, startIdx), endRank: rankOf(entries, endIdx) };
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
   handle always commits as ``{ mode: 'anchored', id: ... }``. The two handles
   are range inputs that are clamped against each other: a move of one handle
   past the other sets the other handle to the same position
   (``REQ_FLOW_TIMELENS`` AC-2), so ``startRank <= endRank`` holds after every
   input event. The commit is bound to the range input's ``change`` event as
   well as to mouse release, so a keyboard move is committed like a mouse move.

   **Client-side re-aggregation:** ``aggregateWindow(entries, startIdx,
   endIdx)`` groups the slice of ``entries`` between the resolved indices by
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
     (``indexForIdentity`` returns ``-1`` — not reachable while the log is
     append-only and the cap only grows, but possible if the log is emptied or
     trimmed), the end handle falls back to the far edge (``endRank = total``)
     and the start handle to rank 1, rather than throwing.
   * AC-5: Default ``LensState`` on panel open is
     ``{ start: { mode: 'live' }, end: { mode: 'anchored', id: <identity of
     entries[max(0, entries.length - 30)]> } }`` — i.e. rank 1 through
     ``min(total, 30)`` (``REQ_FLOW_TIMELENS`` AC-5).
   * AC-6: After any input event on either handle, ``startRank <= endRank``;
     the handle that was not moved follows to the moved handle's position
     rather than the window inverting (``REQ_FLOW_TIMELENS`` AC-2).
   * AC-7: A keyboard move of a handle is committed to ``LensState`` and
     re-renders the diagram, like a mouse move.


.. spec:: Expand Loaded History Button ("+30")
   :id: SPEC_FLOW_LOADMORE
   :status: implemented
   :links: REQ_FLOW_LOADMORE; SPEC_FLOW_WEBVIEW; SPEC_FLOW_DATASERVICE

   **Description:**
   A button (``load-more-btn``) in the webview's HTML built by ``chord.ts``, adjacent to the time lens, posts
   ``{ type: 'increaseCap' }`` to the extension host on click
   (``vscode.postMessage``) and is handled by ``SPEC_FLOW_WEBVIEW``'s
   ``onDidReceiveMessage`` (cap += 30, immediate reload + push).

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
     adds 30, per ``REQ_FLOW_LOADMORE`` AC-1 — no upper limit is enforced).
   * AC-2: On receiving the resulting ``FlowData`` update, the webview does
     not reset ``LensState`` — it re-resolves the existing handles' identities
     (or ``{ mode: 'live' }``) against the new, longer ``entries`` array
     (``REQ_FLOW_LOADMORE`` AC-3).
   * AC-3: The button has no persisted state and is enabled whenever the
     lens controls are shown (the loaded entry set is not empty),
     regardless of current cap size (``REQ_FLOW_LOADMORE`` AC-4).


.. spec:: Actor Node Click Bridge
   :id: SPEC_FLOW_ACTORCLICK
   :status: implemented
   :links: REQ_FLOW_ACTORCLICK; SPEC_FLOW_CHORDRENDER; SPEC_COM_OPEN

   **Description:**
   A ``click`` listener on each node arc in ``chord.ts`` posts
   ``{ type: 'actorClick', name }`` to the extension host (``vscode.postMessage``,
   the standard webview→host channel). The host-side handler
   (``SPEC_FLOW_WEBVIEW``'s ``onDidReceiveMessage``, which accepts the message
   only when ``name`` is a string and logs a failed call) invokes the
   already-registered ``jarvis.openMessageActorChat`` command by id
   (``SPEC_COM_OPEN``). The Agent Host client lives in core and is not reachable
   via ``JarvisCoreApi``, so the command gives the Flow package the same
   behaviour without any lookup or placement logic of its own and without a
   change to ``JarvisCoreApi``:

   .. code-block:: typescript

      async function handleActorClick(name: string): Promise<void> {
        // jarvis.openMessageActorChat accepts any object shaped like
        // SessionGroupNode (SPEC_MSG_TREEPROVIDER) — only `.destination`
        // is read. It finds the chat itself and does nothing if none
        // exists (REQ_FLOW_ACTORCLICK AC-3) — the same command that is
        // bound to a Messages-tree group-node click.
        await vscode.commands.executeCommand('jarvis.openMessageActorChat', { destination: name });
      }

   **Acceptance Criteria:**

   * AC-1: ``handleActorClick`` reuses the existing ``jarvis.openMessageActorChat``
     command unmodified — no Flow-specific placement or lookup logic is
     introduced, and no new engine API/export is added to ``JarvisCoreApi``.
   * AC-2: A click on a node whose Actor has no chat does nothing — no error,
     no notification — since ``jarvis.openMessageActorChat`` itself implements
     that behavior (``SPEC_COM_OPEN``).
   * AC-3: The Flow package invokes ``jarvis.openMessageActorChat`` via
     ``vscode.commands.executeCommand`` (a cross-extension command call,
     available regardless of which extension registered the command) —
     no dependency on ``JarvisCoreApi``'s exports for this interaction,
     unlike ``SPEC_FLOW_DATASERVICE``'s direct file read of
     the audit log.


.. spec:: Message Log Viewer Panel
   :id: SPEC_FLOW_LOGVIEWER
   :status: implemented
   :links: REQ_FLOW_LOGVIEWER; SPEC_FLOW_WEBVIEW; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   ``packages/flow/src/extension.ts`` registers ``jarvis.openMessageLog``,
   a second singleton ``vscode.WebviewPanel`` alongside the existing
   ``jarvis.openMessageFlow`` panel (``SPEC_FLOW_WEBVIEW``), reusing the
   same viewtype-per-panel/reveal/Content-column pattern. It reads
   the audit log directly (the same file ``SPEC_FLOW_DATASERVICE``
   reads for the chord diagram, resolved the same way and with the same
   migration union) via a small reader in ``dataService.ts`` — the log
   viewer's reader returns the raw, un-aggregated entry list
   (reverse-chronological), rather than the chord diagram's
   node/edge-aggregated ``FlowData`` shape, since it displays individual
   entries, not aggregated counts.

   **Reader (``packages/flow/src/dataService.ts`` — alongside
   ``loadFlowData``):**

   .. code-block:: typescript

      export function loadMessageLogEntries(logPath: string, legacyLogPath?: string): LoggedMessage[] {
          const raw = unionReadLog(logPath, legacyLogPath); // same tolerant union reader as loadFlowData
          return [...raw].reverse(); // newest first (REQ_FLOW_LOGVIEWER AC-5)
      }

   ``unionReadLog()`` (``SPEC_FLOW_DATASERVICE``) already
   returns ``[]`` on a missing/unparseable file — the empty-state handling
   (``REQ_FLOW_LOGVIEWER`` AC-4) is therefore already satisfied by reuse,
   no new tolerant-parse logic is needed. The webview shows
   "No messages logged yet." for an empty list.

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
              const entries = logPath ? loadMessageLogEntries(logPath, resolveLegacyMessageLogPath()) : [];
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
   2. The panel opens at the fixed Content column (``DOCS_COLUMN``), same as
      the chord-diagram panel.
   3. ``loadMessageLogEntries()`` reuses the existing tolerant
      ``unionReadLog()`` reader and only reverses order — no duplicated
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
   :status: implemented
   :links: REQ_FLOW_REQUEUE; SPEC_FLOW_LOGVIEWER; SPEC_MSG_QUEUESTORE; REQ_CFG_STATEMIGRATION

   **Description:**
   A local, minimal queue-append function in ``packages/flow`` (NOT an
   import of core's ``appendMessage()`` — cross-package compile-time
   imports between separately-bundled extensions are not possible; this
   mirrors the existing precedent of ``dataService.ts`` maintaining its own
   audit-log reader rather than importing core's) writes a copy
   of the requeued entry into the message queue, preserving the original
   ``sender`` and ``timestamp`` verbatim (per user decision during L1
   review — a requeue is an exact redelivery of the original entry, not a
   new event with a new send time). It deliberately does **not** touch
   the audit log — no audit-log side effect, unlike a normal send.

   **(GH #59)** This is a *writer* in a separately versioned package, so it is
   the case ``REQ_CFG_STATEMIGRATION`` is written for: it unions the superseded
   queue path into what it writes, and removes the superseded file afterwards.
   Its local path resolution mirrors ``configPaths`` and derives nothing
   (``REQ_CFG_PATHSINGLESOURCE`` AC-4).

   **Implementation:** the file access lives in
   ``packages/flow/src/requeueService.ts`` (``requeueWithMigration``, kept
   apart from ``extension.ts`` so it can be tested without VS Code); the
   path resolution and the handler stay in ``extension.ts``.

   .. code-block:: typescript

      interface QueuedMessageCopy {
          destination: string;
          sender: string;
          text: string;
          timestamp: string; // preserved verbatim from the original log entry
      }

      /** Mirrors configPaths.getMessagesPath() — <workspaceRoot>/.jarvis/messages/queue.json. */
      function resolveMessagesPath(): string | undefined { /* first workspace folder, else undefined */ }

      /** Mirrors configPaths.getLegacyMessagesPath() — read/remove only (GH #59): <workspaceRoot>/.jarvis/messages.json. */
      function resolveLegacyMessagesPath(): string | undefined { /* same */ }

      /**
       * Appends `entry` to the queue only — deliberately does NOT write
       * to the audit log, even if jarvis.messages.logging is enabled
       * (REQ_FLOW_REQUEUE: a requeue is a redelivery of an already-logged
       * entry, not a new event to log again).
       */
      async function requeueMessage(entry: QueuedMessageCopy): Promise<void> {
          const messagesPath = resolveMessagesPath();
          if (!messagesPath) { throw new Error('No workspace open'); }
          await requeueWithMigration(messagesPath, resolveLegacyMessagesPath(), entry);
      }

      // requeueService.ts
      async function requeueWithMigration(currentPath, legacyPath, entry): Promise<void> {
          // Union read (SPEC_CFG_STATEMIGRATION): an older core may still be
          // writing the flat path; ignoring it would strand those messages.
          // Unreadable/missing file => empty; a legacy file that exists counts as present.
          // Merge de-duplicated by (destination, sender, text, timestamp), sorted by timestamp.
          merged.push(entry);
          await fs.promises.mkdir(path.dirname(currentPath), { recursive: true });
          await fs.promises.writeFile(currentPath, JSON.stringify(merged, null, 2));
          // Only now is the union durable — removal before this point is data loss.
          if (legacyPresent) { await fs.promises.unlink(legacyPath).catch(() => {}); }
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
   repeatable action, not a create-once operation. (The merge in the union
   read removes duplicates already in the files; the entry appended by the
   requeue is added after it, so it is never dropped.)

   **Webview-side trigger (``logviewer.ts``):** the
   Requeue button's click handler disables the button, sets its label to
   "Requeuing…" and posts
   ``{ type: 'requeue', entry: { sender, destination, text, timestamp } }``
   (the full original entry, not just an index — the log viewer holds the
   already-loaded, reverse-chronological array client-side) to the
   extension host. The host answers ``{ type: 'requeueResult', ok }`` and, on
   success, shows a non-modal information notification
   ``Requeued to "<destination>"``; on failure it shows an error notification
   naming the destination, in addition to the warning in the log
   (``REQ_FLOW_REQUEUE`` AC-4/AC-5). The notifications are shown by the host
   (the caller of ``handleRequeue`` in ``extension.ts``), because a webview
   cannot raise a VS Code notification. On ``requeueResult`` the webview
   re-renders the list, which restores the button.

   **Acceptance Criteria:**

   1. ``requeueMessage()`` writes only to the queue — no code path
      in this function touches the audit log.
   2. The appended entry's ``sender`` and ``timestamp`` are copied verbatim
      from the original log entry; only ``destination``/``text`` are
      otherwise involved (also copied verbatim — nothing is transformed).
   3. A missing/unparseable queue file at either path is treated as empty
      (tolerant, consistent with the log reader's existing pattern)
      — the requeue still succeeds, creating the file fresh.
   4. No workspace open (``resolveMessagesPath()`` returns ``undefined``)
      results in a thrown error, caught by ``handleRequeue()``, surfaced to
      the webview as ``{ ok: false }`` — never an unhandled rejection.
   5. Repeated requeues of the same entry are unrestricted — no
      deduplication, no "already requeued" state tracked anywhere.
   6. A successful requeue shows a non-modal information notification and a
      failed one an error notification, both raised by the host
      (``REQ_FLOW_REQUEUE`` AC-4/AC-5).
