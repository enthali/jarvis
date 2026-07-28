Hook Engine Design Specifications
=================================

.. spec:: Hook Configuration Self-Install
   :id: SPEC_HOOK_CONFIG
   :status: implemented
   :links: REQ_HOOK_INTAKE

   **Description:**
   On activation, the hook engine self-installs its VS Code Agent Hook wiring into
   ``.github/hooks/`` â€” the VS Code default scan location for agent hook configs
   (see `VS Code Agent Hooks <https://code.visualstudio.com/docs/agent-customization/hooks>`_).
   No ``chat.hookFilesLocations`` setting change is required; VS Code scans
   ``.github/hooks/*.json`` automatically.

   **Steps performed at activation:**

   1. **Ensure the hook directory exists.** Create ``.github/hooks/`` if not present.
      VS Code scans this directory by default â€” no workspace-settings change needed.
   2. **Write the hook config** ``.github/hooks/jarvis-hooks.json`` registering all
      eight lifecycle events, each pointing to the bridge (SPEC_HOOK_BRIDGE) with
      the ``--event <name>`` parameter:

      .. code-block:: json

         {
           "hooks": {
             "SessionStart":     [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event SessionStart", "timeout": 10 }],
             "UserPromptSubmit": [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event UserPromptSubmit", "timeout": 10 }],
             "PreToolUse":       [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event PreToolUse", "timeout": 10 }],
             "PostToolUse":      [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event PostToolUse", "timeout": 10 }],
             "PreCompact":       [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event PreCompact", "timeout": 10 }],
             "SubagentStart":    [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event SubagentStart", "timeout": 10 }],
             "SubagentStop":     [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event SubagentStop", "timeout": 10 }],
             "Stop":             [{ "type": "command", "command": "node .github/hooks/bridge.mjs --event Stop", "timeout": 10 }]
           }
         }

   3. **Write the bridge** ``.github/hooks/bridge.mjs`` (SPEC_HOOK_BRIDGE).
   4. **Publish the port.** After the intake listener binds an ephemeral port
      (SPEC_HOOK_INTAKE), the engine writes that port as plain text to
      ``.github/hooks/port``. The bridge reads this file to find its instance's
      listener (SPEC_HOOK_BRIDGE). ``jarvis-hooks.json`` stays **static** (only the
      bridge command); only the small ``port`` file changes per activation.

   **Design notes:**

   * Forward slashes in the command path work on Windows (Node normalises). A
     ``windows`` OS-override may be added for robustness. WSL2/Linux multi-host
     support is a known follow-up (MVP targets the primary dev host).
   * The config and bridge are **generated artifacts** owned by the engine â€” they
     are re-written on activation so they stay consistent with the engine version.
   * ``.github/hooks/port`` is a generated runtime artifact and SHOULD be
     git-ignored.
   * **Multi-instance:** each workspace has its own ``.github/hooks/`` folder, so
     each VS Code instance writes its own ``port`` file â€” parallel instances on
     *different* workspaces are naturally collision-free. **Known limitation:** the
     same workspace opened in two windows shares one ``port`` file; the later
     activation wins. This is out of scope for the observe-only MVP.

   **Security & lifecycle (known, partly deferred):**

   * **Agent-editable bridge â€” security consideration.** ``bridge.mjs`` lives in
     ``.github/hooks/`` and is therefore reachable by the agent's edit tools; an
     agent that rewrites it could execute arbitrary code on the next hook. Per the
     VS Code hooks docs, protect hook scripts from unattended edits (e.g.
     ``chat.tools.edits.autoApprove`` excluding ``.github/hooks/``). This is one of
     several hook-related risks (cf. approval-bypass) and is documented, not solved,
     in this MVP.
   * **Teardown.** Controlled via the ``jarvis.hooks.autoInstall`` workspace setting
     (SPEC_HOOK_AUTOINST). When set to ``false``, Jarvis removes all managed hook
     files and stops the intake listener. The ``.github/hooks/`` directory itself is
     never removed — other tools or user-managed hooks may reside there.

   **Acceptance Criteria:**

   * AC-1: On activation, ``.github/hooks/jarvis-hooks.json`` exists and registers
     all eight events, each invoking the bridge.
   * AC-2: ``.github/hooks/bridge.mjs`` exists after activation.
   * AC-3: After the intake listener binds, ``.github/hooks/port`` contains the
     bound ephemeral port as plain text.
   * AC-4: ``jarvis-hooks.json`` is static across activations (it carries no port);
     only ``.github/hooks/port`` changes.
   * AC-5: When hooks are not supported/disabled, activation still succeeds (the
     self-install is best-effort and never throws into activation).


.. spec:: Hook Bridge
   :id: SPEC_HOOK_BRIDGE
   :status: implemented
   :links: REQ_HOOK_INTAKE

   **Description:**
   ``.github/hooks/bridge.mjs`` is a short-lived Node script that VS Code spawns per
   hook event. It reads the event JSON from stdin, forwards it to the in-extension
   hook-intake HTTP listener (SPEC_HOOK_INTAKE), and returns a non-blocking result.

   **Implementation:**

   .. code-block:: javascript

      #!/usr/bin/env node
      // .github/hooks/bridge.mjs — forwards a VS Code agent hook event to jarvis-core.
      import http from 'node:http';
      import { readFileSync } from 'node:fs';
      import { fileURLToPath } from 'node:url';
      import { dirname, join } from 'node:path';

      // Parse --event argument
      const args = process.argv.slice(2);
      let eventName = 'Unknown';
      const eventIdx = args.indexOf('--event');
      if (eventIdx !== -1 && eventIdx + 1 < args.length) {
        eventName = args[eventIdx + 1];
      }

      // The intake listener's ephemeral port is published next to this script.
      const here = dirname(fileURLToPath(import.meta.url));
      let port;
      try { port = readFileSync(join(here, 'port'), 'utf8').trim(); }
      catch { process.stdout.write(JSON.stringify({ continue: true })); process.exit(0); }

      function readStdin() {
        return new Promise((resolve) => {
          let data = '';
          process.stdin.setEncoding('utf8');
          process.stdin.on('data', (c) => (data += c));
          process.stdin.on('end', () => resolve(data));
        });
      }

      const raw = await readStdin();

      // Fire-and-forget POST; never block the agent on transport failure.
      await new Promise((resolve) => {
        const req = http.request(
          { host: '127.0.0.1', port, path: '/hooks', method: 'POST',
            headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(raw) } },
          (res) => { res.resume(); res.on('end', resolve); }
        );
        req.on('error', resolve);   // transport error → still continue
        req.write(raw);
        req.end();
      });

      // MVP is observe-only: always allow the agent to continue.
      process.stdout.write(JSON.stringify({ continue: true }));
      process.exit(0);

   **Acceptance Criteria:**

   * AC-1: The bridge reads the full hook event JSON from stdin.
   * AC-2: The bridge reads the listener port from ``.github/hooks/port`` (located
     next to the bridge) and POSTs the raw event JSON to
     ``http://127.0.0.1:<port>/hooks``.
   * AC-3: The bridge **always** writes ``{"continue": true}`` to stdout and exits 0,
     including when the port file is missing or the POST fails (errors are
     swallowed) — it never blocks or influences the agent.
   * AC-4: The bridge has no dependency beyond Node's standard library.
   * AC-5: The bridge parses ``--event <name>`` from the command line and includes
     it in the POST payload as ``hook_event_name``.


.. spec:: Hook Intake HTTP Listener
   :id: SPEC_HOOK_INTAKE
   :status: implemented
   :links: REQ_HOOK_INTAKE

   **Description:**
   A dedicated lightweight HTTP listener in ``jarvis-core`` receives hook events
   from the bridge and surfaces each to the ``HookEngine`` as a typed event. It is
   independent of the MCP server (hooks must not depend on ``jarvis.mcpEnabled``).

   **Listener:**

   * Binds to ``127.0.0.1`` on an **ephemeral port** (``server.listen(0)`` â€” the OS
     assigns a guaranteed-free port), avoiding fixed-port collisions across the
     user's parallel VS Code instances. The bound port is published to
     ``.github/hooks/port`` (SPEC_HOOK_CONFIG) so the bridge can find it.
   * Handles ``POST /hooks``: reads the JSON body, parses it into a ``HookEvent``,
     and passes it to ``HookEngine.receive(event)``. Responds ``200`` with
     ``{"continue": true}`` (the MVP never returns an agent-influencing decision).
   * Started during ``activate()`` when hook intake is enabled; stopped during
     ``deactivate()``.

   **Event type (bus-ready, minimal):**

   .. code-block:: typescript

      export interface HookEvent {
          /** The lifecycle event name, e.g. 'PostToolUse'. */
          eventName: string;
          /** Session id from the payload's `session_id` field, if present. */
          sessionId?: string;
          /** ISO 8601 timestamp from the payload. */
          timestamp?: string;
          /** The full raw payload as delivered on stdin. */
          payload: Record<string, unknown>;
      }

   **HookEngine intake:**

   .. code-block:: typescript

      // src/hookEngine.ts (jarvis-core)
      export class HookEngine {
          constructor(private readonly _log: vscode.LogOutputChannel) {}

          /** Intake point â€” called by the HTTP listener for each received event. */
          receive(event: HookEvent): void {
              // Dispatch to registered handlers for this event type
              this._dispatch(event);
              // MVP: also log via the logging sink (SPEC_HOOK_LOG)
              this._sink(event);
          }

          /** Register a handler for a specific hook event name. */
          on(eventName: string, handler: (event: HookEvent) => void): void {
              // Registry implementation
          }

          /** Dispatch event to registered handlers. */
          private _dispatch(event: HookEvent): void {
              // Call all handlers registered for event.eventName
          }

          // A future event bus is inserted here: receive() fans out to subscribers
          // instead of calling a single sink — without changing the intake contract.
      }

   **HTTP Listener payload parsing:**

   The HTTP listener extracts ``hook_event_name`` from the incoming JSON payload
   (added by the bridge, SPEC_HOOK_BRIDGE) and uses it as the ``eventName`` field
   in the ``HookEvent`` passed to ``HookEngine.receive()``. If ``hook_event_name``
   is absent, it falls back to ``eventName`` or ``event`` from the payload, or
   ``'Unknown'``. The session id is extracted from the payload's **``session_id``**
   field (snake_case — the hook API's own JSON convention, matching
   ``hook_event_name``) into ``HookEvent.sessionId``.

   ~~*Bug, fixed by the actor-activity-indicator CR:* an earlier implementation
   read ``parsed.sessionId`` (camelCase), a key that never exists in the payload,
   so ``HookEvent.sessionId`` was always ``undefined``. Confirmed via trace-level
   log inspection of a live payload, which showed ``session_id`` present at the
   top level of the JSON body. See REQ_HOOK_INTAKE AC-8.~~

   **Dispatch-before-response ordering (whoami-session-id-resolution CR, GH #51):**

   ``receive(event)`` is called **before** ``res.end()``, and dispatch to
   subscribers is synchronous (SPEC_HOOK_ROUTE). The bridge in turn writes its
   ``{"continue": true}`` result only from the response's ``end`` handler
   (SPEC_HOOK_BRIDGE), and VS Code waits for a hook to complete before it
   proceeds. Chaining these gives a happens-before relation:

   .. code-block:: text

      VS Code fires PreToolUse
        -> bridge POSTs /hooks
             -> listener calls HookEngine.receive(event)   [subscribers run]
             -> listener responds 200
        -> bridge writes {"continue": true}, exits
      VS Code invokes the tool handler

   **Therefore a tool handler can rely on its own ``PreToolUse`` event having
   already been dispatched.** This is the basis for ``SPEC_ACT_WHOAMI``
   resolving its calling session.

   This ordering is **normative** (REQ_HOOK_INTAKE AC-9), not an accident of
   the current code. Responding before dispatching would be a natural-looking
   latency optimisation and would break every ordering-dependent consumer
   *silently* — no test that exercises intake in isolation would notice, since
   the event still arrives, just too late. It is recorded here, at the
   listener, rather than only in the consumer that first depended on it.

   The guarantee holds only while the hook actually fires and the transport
   succeeds. It does **not** hold when hook intake is disabled
   (SPEC_HOOK_AUTOINST), when ``.github/hooks/port`` is missing or stale, when
   the POST fails, or when VS Code's hook timeout elapses. In all of these the
   bridge still continues (AC-3) and the tool simply runs with no event
   delivered — consumers must define their own behaviour for that case.

   **Design notes:**

   * **Bus-ready:** ``receive()`` is the stable intake contract. In the MVP it calls
     the logging sink directly; later it fans out to a dispatch bus / subscribers,
     and the same listener can return real control decisions in the HTTP response â€”
     no change to the bridge or the intake contract.
   * **Subscriber-conditional blocking.** The bridge only needs to *wait* for events
     that have a **deciding** subscriber (one that influences the agent, e.g. a
     ``PreToolUse`` deny). In the MVP the only subscriber is the logger â€” a pure
     sink that needs no synchronous answer â€” so the listener responds immediately and
     the bridge returns at once. A future blocking path is introduced **per event,
     only for deciding subscribers**, leaving observe-only events latency-free.
   * **Multi-subscriber on one deciding event (known future concern).** If several
     subscribers want to decide the same event, the listener must merge their
     decisions (e.g. "most restrictive wins", mirroring VS Code's own semantics).
     This coordination is a Layer-2 design problem, out of scope for the MVP.
   * **Independent of MCP:** the listener is core-owned and always available when
     hook intake is enabled.

   **Acceptance Criteria:**

   * AC-1: A core HTTP listener binds ``127.0.0.1`` on an ephemeral port
     (``server.listen(0)``), independent of the MCP server; the bound port is
     written to ``.github/hooks/port``.
   * AC-2: ``POST /hooks`` parses the body into a ``HookEvent`` (``eventName``,
     ``sessionId?`` — read from the payload's ``session_id`` field —,
     ``timestamp?``, raw ``payload``) and calls ``HookEngine.receive(event)``.
   * AC-3: The listener responds ``200`` with ``{"continue": true}`` â€” no
     agent-influencing output in the MVP.
   * AC-4: ``receive()`` is the single, stable intake contract behind which a future
     bus/subscribers can be inserted without changing the bridge or listener.
   * AC-5: The listener starts in ``activate()`` and stops in ``deactivate()``;
     activation does not depend on ``jarvis.mcpEnabled``.
   * AC-6: (GH #51) ``HookEngine.receive(event)`` is called before the ``200``
     response is written, so subscribers have observed the event by the time
     the bridge returns and VS Code proceeds (REQ_HOOK_INTAKE AC-9).


.. spec:: Hook Event Logging Sink
   :id: SPEC_HOOK_LOG
   :status: implemented
   :links: REQ_HOOK_LOG; SPEC_DEV_LOGCHANNEL

   **Description:**
   The MVP's only sink logs each received ``HookEvent`` to the existing "Jarvis"
   ``LogOutputChannel`` (SPEC_DEV_LOGCHANNEL) with a ``[Hook]`` module tag. No
   separate channel is created and no other action is taken. At the default
   ``info`` level only the event name (and session id) is logged; the full
   payload is logged at ``trace`` level only (``hook-log-level-reduction`` CR
   — reduces default-visible verbosity without losing full observability).

   **Log format:**

   .. code-block:: typescript

      private _sink(event: HookEvent): void {
          const sid = event.sessionId ? ` session=${event.sessionId}` : '';
          // trace: full payload, unchanged from the original single-entry
          // format — only visible when trace logging is explicitly enabled
          this.logger.trace(`[Hook] ${event.eventName}${sid} — ${JSON.stringify(event.payload)}`);
          // info: event name + session id only, no payload — default-visible
          this.logger.info(`[Hook] ${event.eventName}${sid}`);
      }

   Example output (``info`` level, default-visible):

   .. code-block:: text

      [Hook] SessionStart session=abc-123
      [Hook] PostToolUse session=abc-123

   Example output (``trace`` level, only when trace logging is enabled):

   .. code-block:: text

      [Hook] SessionStart session=abc-123 — {"hook_event_name":"SessionStart","cwd":"…"}
      [Hook] PostToolUse session=abc-123 — {"tool_name":"replace_string_in_file",…}

   **Acceptance Criteria:**

   * AC-1: Each received ``HookEvent`` produces one log entry at ``info`` level
     and one at ``trace`` level, both on the single "Jarvis"
     ``LogOutputChannel`` with the ``[Hook]`` tag.
   * AC-2: The ``info``-level entry includes the event name and session id
     (when present) only — no payload. The ``trace``-level entry includes the
     event name, session id (when present), and the full JSON payload — the
     same content and format as the original single-entry implementation.
   * AC-3: The sink takes no other action — no bus dispatch, no triggered actions,
     no memory injection, no per-session routing.
   * AC-4: No new output channel is created — the "Jarvis" channel from
     ``SPEC_DEV_LOGCHANNEL`` is reused.
   * AC-5: This is a pure log-level/verbosity split — no functional or
     behavioral change. The method itself is ``HookEngine``'s private
     ``_sink(event)`` (not a standalone ``logHookEvent()`` function as an
     earlier revision of this spec described — corrected to match the actual
     implementation in ``packages/core/src/engine/hooks/hookEngine.ts``).


.. spec:: Hook Auto-Install Setting
   :id: SPEC_HOOK_AUTOINST
   :status: implemented
   :links: REQ_HOOK_AUTOINST; SPEC_HOOK_CONFIG; SPEC_HOOK_INTAKE

   **Description:**
   A workspace-scoped VS Code setting `jarvis.hooks.autoInstall` (boolean, default
   `true`) gates the Hook Configuration Self-Install (SPEC_HOOK_CONFIG). When
   `true`, SPEC_HOOK_CONFIG runs as defined. When `false`, the engine performs a
   teardown: it removes all Jarvis-managed hook files and does not write them during
   the activation lifecycle.

   **Setting definition (contributes.configuration in package.json):**

   .. code-block:: json

      {
        "jarvis.hooks.autoInstall": {
          "type": "boolean",
          "default": true,
          "scope": "resource",
          "description": "When true (default), Jarvis auto-installs hook bridge files in .github/hooks/. Set to false to remove managed files and stop hook management."
        }
      }

   **Activation behaviour:**

   1. Read `jarvis.hooks.autoInstall` from workspace configuration.
   2. **If `true`:** execute the self-install sequence (SPEC_HOOK_CONFIG steps
      1–4) as before. Start the intake listener (SPEC_HOOK_INTAKE).
   3. **If `false`:** execute teardown, then skip intake listener start.

   **Teardown sequence (autoInstall = false):**

   1. Delete `.github/hooks/jarvis-hooks.json` if it exists.
   2. Delete `.github/hooks/bridge.mjs` if it exists.
   3. Delete `.github/hooks/port` if it exists.
   4. Do **not** remove the `.github/hooks/` directory itself — other tools or
      user-managed hooks may reside there.
   5. Do **not** start the Hook Intake HTTP listener (SPEC_HOOK_INTAKE).

   **Configuration change listener:**

   * The extension SHALL listen for `onDidChangeConfiguration` on the
     `jarvis.hooks.autoInstall` key.
   * If the setting transitions from `true` → `false` at runtime: stop the
     intake listener, run teardown.
   * If the setting transitions from `false` → `true` at runtime: run the
     self-install sequence, start the intake listener.

   **Design notes:**

   * The setting is `scope: "resource"` (workspace-scoped) so each workspace can
     independently opt in or out.
   * Teardown is idempotent — deleting non-existent files is a no-op.
   * The intake listener lifecycle is tied to the setting: when `false`, the
     listener is not started (and stopped if running). This means hook events are
     neither received nor logged when the setting is `false`.
   * The bridge (SPEC_HOOK_BRIDGE) is removed during teardown, so even if VS Code
     still has a stale `jarvis-hooks.json` in memory, the bridge would fail
     gracefully (file not found → VS Code skips).

   **Acceptance Criteria:**

   * AC-1: `package.json` contributes `jarvis.hooks.autoInstall` as a boolean
     setting with default `true` and scope `resource`.
   * AC-2: When `jarvis.hooks.autoInstall` is `true`, activation runs the
     SPEC_HOOK_CONFIG self-install and starts the SPEC_HOOK_INTAKE listener — no
     behavioural change from current default.
   * AC-3: When `jarvis.hooks.autoInstall` is `false`, activation deletes
     `.github/hooks/jarvis-hooks.json`, `.github/hooks/bridge.mjs`, and
     `.github/hooks/port` (if present) and does NOT start the intake listener.
   * AC-4: The `.github/hooks/` directory itself is never removed.
   * AC-5: A runtime change `true` → `false` stops the intake listener and runs
     teardown; `false` → `true` runs self-install and starts the listener.
   * AC-6: Teardown is idempotent — running it when files are already absent
     produces no errors.
   * AC-7: The setting is workspace-scoped — different workspaces can have different
     values.


.. spec:: Hook Event Routing Registry
   :id: SPEC_HOOK_ROUTE
   :status: implemented
   :links: REQ_HOOK_ROUTE; SPEC_HOOK_INTAKE

   **Description:**
   The Hook Engine provides an internal ``on(eventName, handler)`` registry that
   allows typed handlers to subscribe to specific hook event names. When
   ``HookEngine.receive(event)`` is called, the engine dispatches the event to all
   handlers registered for ``event.eventName``. This fulfills the "bus-ready"
   promise of SPEC_HOOK_INTAKE AC-4 and REQ_HOOK_INTAKE AC-4.

   **Registry API:**

   .. code-block:: typescript

      export class HookEngine {
          // ... existing constructor and receive()

          /** Register a handler for a specific hook event name. */
          on(eventName: string, handler: (event: HookEvent) => void): void;

          /** Remove a previously registered handler. */
          off(eventName: string, handler: (event: HookEvent) => void): void;

          /** Dispatch event to all handlers registered for event.eventName. */
          private _dispatch(event: HookEvent): void;
      }

   **Handler signature:**

   .. code-block:: typescript

      type HookHandler = (event: HookEvent) => void;

   **Dispatch semantics:**

   * Handlers are called synchronously in registration order.
   * Exceptions in handlers are caught and logged (they do not stop other handlers).
   * The logging sink (SPEC_HOOK_LOG) is always invoked after dispatch, regardless
     of whether any handlers are registered.
   * No return value is expected from handlers in the MVP (observe-only).

   **Design notes:**

   * The registry is intentionally simple — a ``Map<string, HookHandler[]>`` —
     sufficient for the observe-only MVP. Future layers may add priority, async
     support, or decision-merging for blocking subscribers.
   * The ``on()``/``off()`` API is the stable extension point. Consumers (memory
     housekeeping, agent steering, entity flows) will register handlers via this
     API without modifying the intake path.
   * The registry lives in ``jarvis-core`` and is independent of MCP, sessions,
     or any other feature.

   **Acceptance Criteria:**

   * AC-1: ``HookEngine`` exposes ``on(eventName, handler)`` and ``off(eventName, handler)`` methods.
   * AC-2: ``receive(event)`` calls all handlers registered for ``event.eventName`` in registration order.
   * AC-3: Exceptions in handlers are caught and logged; they do not prevent other handlers from running.
   * AC-4: The logging sink (SPEC_HOOK_LOG) is always invoked after dispatch, even when no handlers are registered.
   * AC-5: The registry is internal to ``jarvis-core`` and does not depend on MCP, sessions, or other features.


.. spec:: Hook-Driven Entity Activity Indicator
   :id: SPEC_HOOK_ACTIVITY
   :status: approved
   :links: REQ_HOOK_ACTIVITY; SPEC_HOOK_ROUTE; SPEC_HOOK_INTAKE; SPEC_ENG_TREEFACTORY

   **Description:**
   A new ``ActivityTracker`` (``packages/core/src/engine/hooks/activityTracker.ts``)
   registers handlers on the ``HookEngine`` (SPEC_HOOK_ROUTE) for all 8 lifecycle
   events, maintains an in-memory set of currently-active entity names, and is
   consulted by a new ``ActivityDecorator`` (a ``TreeItemDecorator``,
   registered for the ``'session'``, ``'project'``, and ``'event'`` kinds) that
   sets ``item.iconPath`` to a green filled circle for Active entities, and
   leaves ``item.iconPath`` untouched for Inactive entities.

   **F5 finding (superseded design correction):** the original design used a
   codicon prefix directly in ``item.label`` (``$(circle-filled) <name>``).
   A live F5 test found this renders as **literal text** ("$(circle-filled)
   Alice") in a VS Code ``TreeView`` — the ``$(...)`` codicon syntax only
   resolves inside QuickPick items and the status bar, not tree item labels.
   PM decision: switch to ``item.iconPath`` (below).

   **Session-id → entity-name resolution:**

   .. code-block:: typescript

      // packages/core/src/engine/sessions/sessionLookup.ts — new export
      export async function getEntityNameForSessionId(
          sessionId: string
      ): Promise<string | undefined> {
          const all = await getAllSessions();
          return all.find(s => s.sessionId === sessionId)?.title;
      }

   This is the reverse of the existing ``lookupSessionUUID()`` (name → uuid) —
   same data source (``getAllSessions()``), no new I/O path.

   **ActivityTracker:**

   .. code-block:: typescript

      // packages/core/src/engine/hooks/activityTracker.ts
      const ACTIVE_EVENTS = new Set([
          'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
          'PreCompact', 'SubagentStart', 'SubagentStop',
      ]);

      export class ActivityTracker {
          private readonly _activeEntityNames = new Set<string>();

          constructor(
              hookEngine: HookEngine,
              private readonly _onChange: (entityName: string) => void,
          ) {
              for (const name of [...ACTIVE_EVENTS, 'Stop']) {
                  hookEngine.on(name, (event) => this._handle(event, name === 'Stop'));
              }
          }

          isActive(entityName: string): boolean {
              return this._activeEntityNames.has(entityName);
          }

          private async _handle(event: HookEvent, toInactive: boolean): Promise<void> {
              if (!event.sessionId) { return; } // REQ_HOOK_ACTIVITY AC-6
              const entityName = await getEntityNameForSessionId(event.sessionId);
              if (!entityName) { return; } // REQ_HOOK_ACTIVITY AC-7 / AC-9
              const wasActive = this._activeEntityNames.has(entityName);
              if (toInactive) { this._activeEntityNames.delete(entityName); }
              else { this._activeEntityNames.add(entityName); }
              if (wasActive !== this.isActive(entityName)) { this._onChange(entityName); }
          }
      }

   **ActivityDecorator:**

   .. code-block:: typescript

      // packages/core/src/engine/hooks/activityDecorator.ts
      export class ActivityDecorator implements TreeItemDecorator {
          constructor(private readonly _tracker: ActivityTracker) {}

          decorate(item: vscode.TreeItem, node: TreeNode, _kind: string): void {
              const name = /* node's entity display name */;
              if (this._tracker.isActive(name)) {
                  item.iconPath = new vscode.ThemeIcon(
                      'circle-filled',
                      new vscode.ThemeColor('charts.green'),
                  );
              }
              // Inactive: leave item.iconPath untouched — the entity's normal
              // icon (or TaskBadgeDecorator's icon, if it set one) remains.
          }
      }

   **Wiring (``extension.ts``):**

   * ``ActivityTracker`` is constructed once, alongside ``hookEngine``, with an
     ``_onChange`` callback that calls ``engine.refreshKind(kind)`` for whichever
     of ``'session' | 'project' | 'event'`` currently owns an entity with that
     name (looked up via the existing ``getTreeForKind()``/``getEntity()``
     surface — the same one used by ``rescan()``).
   * ``ActivityDecorator`` is registered via ``registerDecorator()`` for all
     three kinds, alongside the existing ``TaskBadgeDecorator`` (registered for
     ``'project'``/``'event'`` only).

   **Design notes:**

   * **``iconPath`` only when Active — resolves the TaskBadgeDecorator conflict
     by time-sharing, not by field choice.** ``TaskBadgeDecorator``
     (SPEC_PIM_TASKBADGE) already sets ``item.iconPath`` conditionally on
     Project/Event nodes when a task is overdue/due-soon. Decorators for a
     kind run in registration order and mutate the same ``TreeItem`` in
     place — both decorators writing ``iconPath`` unconditionally would let
     the later-registered one silently win. The resolution here:
     ``ActivityDecorator`` only ever **sets** ``iconPath`` when the entity is
     Active; when Inactive, it leaves ``iconPath`` untouched, so whatever the
     entity's default icon (or ``TaskBadgeDecorator``'s icon, if any) was
     stands unchanged. In effect, an Active entity's green dot takes visible
     priority over a task-urgency icon while it's active; once it goes
     Inactive, the task badge (if any) is visible again on the next
     ``getTreeItem()`` call. This was the design that shipped after an
     earlier codicon-label-prefix approach was found not to render in
     ``TreeView`` (see the F5 finding above) — the originally-intended
     "different field, no time-sharing needed" avoidance strategy no longer
     applies since both decorators now use ``iconPath``, but the graceful
     time-sharing behavior achieves the same practical non-collision outcome.
   * **Session-id correlation — F5-confirmed (no longer just an assumption):**
     a live F5 test by PM confirmed the session-id correlation (REQ_HOOK_ACTIVITY
     AC-5/AC-9) holds in practice — state transitions fire correctly for real
     chat sessions bound to Actor/Project/Event entities. The graceful
     degradation path (AC-8/AC-9: silent all-Inactive fallback if the
     correlation ever fails for a given entity) remains in place as a safety
     net, but is no longer the expected/default outcome.
   * **No per-event ``refreshKind`` storm:** ``_onChange`` only fires when the
     tracked boolean actually flips for that entity (see ``wasActive !==
     isActive`` guard) — a burst of ``PreToolUse``/``PostToolUse`` events
     within one already-Active turn does not trigger repeated tree refreshes.

   **Acceptance Criteria:**

   * AC-1: ``ActivityTracker`` registers a handler (via SPEC_HOOK_ROUTE's
     ``on()``) for each of the 8 lifecycle events.
   * AC-2: The 7 events in REQ_HOOK_ACTIVITY AC-1 add the resolved entity name
     to the active set; ``Stop`` removes it.
   * AC-3: Entity-name resolution uses ``getEntityNameForSessionId()``
     (new, ``sessionLookup.ts``) — the reverse of the existing
     ``lookupSessionUUID()``, same ``getAllSessions()`` data source.
   * AC-4: Events with no ``sessionId``, or whose resolved title matches no
     known entity, are ignored (no state change, no error).
   * AC-5: ``ActivityDecorator`` is registered for the ``'session'``,
     ``'project'``, and ``'event'`` kinds via ``registerDecorator()``.
   * AC-5a: (F5 fix) ``ActivityDecorator`` sets ``item.iconPath`` to
     ``new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'))``
     when Active; when Inactive, ``item.iconPath`` is left untouched (not
     reset to a specific "inactive" icon) — superseding the original
     ``item.label`` codicon-prefix mechanism, which does not render inside
     ``TreeView`` labels.
   * AC-6: (superseded by AC-5a) ~~The decorator prefixes ``item.label`` with
     a codicon glyph (``$(circle-filled)`` Active / ``$(circle-outline)``
     Inactive) — it does not set ``item.iconPath`` or ``item.description``.~~
     This was found not to render in ``TreeView`` labels during F5 testing;
     see AC-5a for the shipped ``iconPath``-based mechanism. The decorator
     does not set ``item.description`` (no count-style badge), consistent
     with the original intent.
   * AC-7: A state flip for an entity triggers exactly one ``refreshKind(kind)``
     call for that entity's kind — not a full-tree rescan, not one call per
     underlying hook event.
   * AC-8: If the session-id → entity-name correlation never resolves any
     match in practice, the tree renders exactly as it did before this CR
     (all nodes Inactive) — no exceptions, no broken labels.
