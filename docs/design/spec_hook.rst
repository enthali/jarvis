Hook Engine Design Specifications
=================================

.. spec:: Hook Configuration Self-Install
   :id: SPEC_HOOK_CONFIG
   :status: implemented
   :links: REQ_HOOK_INTAKE

   **Description:**
   On activation, the hook engine self-installs its VS Code Agent Hook wiring into
   ``.github/hooks/`` — the VS Code default scan location for agent hook configs
   (see `VS Code Agent Hooks <https://code.visualstudio.com/docs/agent-customization/hooks>`_).
   No ``chat.hookFilesLocations`` setting change is required; VS Code scans
   ``.github/hooks/*.json`` automatically.

   **Steps performed at activation:**

   1. **Ensure the hook directory exists.** Create ``.github/hooks/`` if not present.
      VS Code scans this directory by default — no workspace-settings change needed.
   2. **Write the hook config** ``.github/hooks/jarvis-hooks.json`` registering all
      eight lifecycle events, each pointing to the bridge (SPEC_HOOK_BRIDGE):

      .. code-block:: json

         {
           "hooks": {
             "SessionStart":     [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "UserPromptSubmit": [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "PreToolUse":       [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "PostToolUse":      [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "PreCompact":       [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "SubagentStart":    [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "SubagentStop":     [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }],
             "Stop":             [{ "type": "command", "command": "node .github/hooks/bridge.mjs", "timeout": 10 }]
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
   * The config and bridge are **generated artifacts** owned by the engine — they
     are re-written on activation so they stay consistent with the engine version.
   * ``.github/hooks/port`` is a generated runtime artifact and SHOULD be
     git-ignored.
   * **Multi-instance:** each workspace has its own ``.github/hooks/`` folder, so
     each VS Code instance writes its own ``port`` file — parallel instances on
     *different* workspaces are naturally collision-free. **Known limitation:** the
     same workspace opened in two windows shares one ``port`` file; the later
     activation wins. This is out of scope for the observe-only MVP.

   **Security & lifecycle (known, partly deferred):**

   * **Agent-editable bridge — security consideration.** ``bridge.mjs`` lives in
     ``.github/hooks/`` and is therefore reachable by the agent's edit tools; an
     agent that rewrites it could execute arbitrary code on the next hook. Per the
     VS Code hooks docs, protect hook scripts from unattended edits (e.g.
     ``chat.tools.edits.autoApprove`` excluding ``.github/hooks/``). This is one of
     several hook-related risks (cf. approval-bypass) and is documented, not solved,
     in this MVP.
   * **Teardown (deferred).** The MVP does not remove the ``.github/hooks/`` config
     on disable/uninstall. A stale config is harmless — the bridge swallows transport
     errors and returns ``continue:true`` — so cleanup is a known follow-up, not an
     MVP requirement.

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
      // .jarvis/hooks/bridge.mjs — forwards a VS Code agent hook event to jarvis-core.
      import http from 'node:http';
      import { readFileSync } from 'node:fs';
      import { fileURLToPath } from 'node:url';
      import { dirname, join } from 'node:path';

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


.. spec:: Hook Intake HTTP Listener
   :id: SPEC_HOOK_INTAKE
   :status: implemented
   :links: REQ_HOOK_INTAKE

   **Description:**
   A dedicated lightweight HTTP listener in ``jarvis-core`` receives hook events
   from the bridge and surfaces each to the ``HookEngine`` as a typed event. It is
   independent of the MCP server (hooks must not depend on ``jarvis.mcpEnabled``).

   **Listener:**

   * Binds to ``127.0.0.1`` on an **ephemeral port** (``server.listen(0)`` — the OS
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
          /** Session id from the payload, if present. */
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

          /** Intake point — called by the HTTP listener for each received event. */
          receive(event: HookEvent): void {
              this._sink(event);     // MVP: the only sink is the logger (SPEC_HOOK_LOG)
          }

          // A future event bus is inserted here: receive() fans out to subscribers
          // instead of calling a single sink — without changing the intake contract.
      }

   **Design notes:**

   * **Bus-ready:** ``receive()`` is the stable intake contract. In the MVP it calls
     the logging sink directly; later it fans out to a dispatch bus / subscribers,
     and the same listener can return real control decisions in the HTTP response —
     no change to the bridge or the intake contract.
   * **Subscriber-conditional blocking.** The bridge only needs to *wait* for events
     that have a **deciding** subscriber (one that influences the agent, e.g. a
     ``PreToolUse`` deny). In the MVP the only subscriber is the logger — a pure
     sink that needs no synchronous answer — so the listener responds immediately and
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
     ``sessionId?``, ``timestamp?``, raw ``payload``) and calls
     ``HookEngine.receive(event)``.
   * AC-3: The listener responds ``200`` with ``{"continue": true}`` — no
     agent-influencing output in the MVP.
   * AC-4: ``receive()`` is the single, stable intake contract behind which a future
     bus/subscribers can be inserted without changing the bridge or listener.
   * AC-5: The listener starts in ``activate()`` and stops in ``deactivate()``;
     activation does not depend on ``jarvis.mcpEnabled``.


.. spec:: Hook Event Logging Sink
   :id: SPEC_HOOK_LOG
   :status: implemented
   :links: REQ_HOOK_LOG; SPEC_DEV_LOGCHANNEL

   **Description:**
   The MVP's only sink logs each received ``HookEvent`` to the existing "Jarvis"
   ``LogOutputChannel`` (SPEC_DEV_LOGCHANNEL) with a ``[Hook]`` module tag. No
   separate channel is created and no other action is taken.

   **Log format:**

   .. code-block:: typescript

      function logHookEvent(log: vscode.LogOutputChannel, e: HookEvent): void {
          const sid = e.sessionId ? ` session=${e.sessionId}` : '';
          log.info(`[Hook] ${e.eventName}${sid} — ${JSON.stringify(e.payload)}`);
      }

   Example output:

   .. code-block:: text

      [Hook] SessionStart session=abc-123 — {"hook_event_name":"SessionStart","cwd":"…"}
      [Hook] PostToolUse session=abc-123 — {"tool_name":"replace_string_in_file",…}

   **Acceptance Criteria:**

   * AC-1: Each received ``HookEvent`` produces one log entry on the single "Jarvis"
     ``LogOutputChannel`` with the ``[Hook]`` tag.
   * AC-2: The entry includes the event name and the full payload so the delivered
     data is observable; the session id is included when present.
   * AC-3: The sink takes no other action — no bus dispatch, no triggered actions,
     no memory injection, no per-session routing.
   * AC-4: No new output channel is created — the "Jarvis" channel from
     ``SPEC_DEV_LOGCHANNEL`` is reused.
