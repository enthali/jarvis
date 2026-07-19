Jarvis Entity Design Specifications
====================================

Generic, user-facing cross-kind design specifications (Project / Event /
Actor). See ``docs/namingconventions.rst`` for the theme placement rule
(``ENT`` = generic/user-facing, ``ENG`` = kind-agnostic plumbing, no US
level).

.. note::

   ``SPEC_ACT_AGENT_PICKER`` (in ``spec_act.rst``) is the concrete
   ``pickAgentMode()`` implementation invoked by all 3 entity kinds'
   creation flows; ``SPEC_ENT_AGENT_PICKER`` (below) is its cross-cutting
   contract (return semantics, consumer list, chat-open gate).
   ``SPEC_ACT_TREECLICK`` (in ``spec_act.rst``) specifies the Actor-specific
   click-semantics inversion (single-click opens agent chat instead of
   context.md); its inline context.md icon uses the same shared
   ``jarvis.openContext`` command specified below in
   ``SPEC_ENT_OPENCONTEXT_CMD`` — no Actor-only command exists (the earlier
   ``jarvis.openSessionContext`` command was retired as dead code by the
   ``entity-open-context-cleanup`` CR).

.. spec:: Open YAML Command — Retired
   :id: SPEC_ENT_OPENYAML_CMD
   :status: implemented
   :links: REQ_ENT_OPENYAML; SPEC_ENT_ENTITY_CONTEXTMENU

   **Retired (entity-tree-context-menu CR, PM decision 2026-07-02):**
   ``jarvis.openYamlFile`` is fully retired — the command registration, its
   handler, and all ``package.json`` contributions are removed entirely, not
   just its inline menu placement. The YAML file is reachable via the
   entity's expandable file children (``jarvis.openEntityFile``,
   ``REQ_ENT_ENTITY_FILE_CHILDREN``). Zero remaining callers confirmed
   before retirement (verified via ``get_need_links.py``).

   **Historical description** (kept for traceability): a command
   ``jarvis.openYamlFile`` opened the YAML file associated with a tree leaf
   item.

   **Historical handler** (to be deleted from ``extension.ts`` by Dev
   Engineer, not modified):

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openYamlFile', (element: LeafNode) => {
          const uri = vscode.Uri.file(element.id);
          vscode.commands.executeCommand('vscode.open', uri);
      });

   **Removal (code, this CR):**

   * ``src/extension.ts``: delete the ``jarvis.openYamlFile`` command
     registration and its ``context.subscriptions.push(...)`` entry entirely.
   * ``packages/core/package.json`` and ``packages/pim/package.json``: delete
     the ``jarvis.openYamlFile`` entry from ``contributes.commands`` and its
     ``view/item/context`` entries (already removed from the menu section by
     the earlier revision of this CR; the ``contributes.commands`` entry
     itself is what remains to be deleted).


.. spec:: Open Agent Session Command
   :id: SPEC_ENT_AGENTSESSION
   :status: draft
   :links: REQ_ENT_AGENTSESSION; SPEC_MSG_SESSIONLOOKUP; SPEC_EXP_PROVIDER; SPEC_ENT_OPENYAML_CMD; SPEC_MSG_OPENCHAT; SPEC_MSG_PINNED; SPEC_MSG_AGENTSESSION; SPEC_ENT_AGENTSESSION_INITPROMPT; SPEC_MSG_EDITORPLACEMENT

   **Description:**
   Register ``jarvis.openAgentSession`` in ``extension.ts``. Invoked from the
   inline ``$(comment-discussion)`` button on every project and event leaf node.
   Looks up a chat session whose title matches the entity ``name`` and opens it;
   if no session is found, creates a **fresh** chat editor via
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) and sends an initialization
   prompt. The full lifecycle sequence is specified in ``SPEC_MSG_AGENTSESSION``.

   **Rationale — URI-reuse bug fix:**
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) ensures each invocation
   produces a unique session URI and a dedicated editor; see
   ``SPEC_MSG_OPENCHAT`` for the canonical rationale.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openAgentSession',
        async (element: LeafNode) => {
          const entity = scanner.getEntity(element.id);
          if (!entity) { return; }

          const uuid = await lookupSessionUUID(entity.name);

          if (uuid) {
            // Open existing session, always at Main (column 1) — close+reopen
            // if currently open elsewhere (SPEC_MSG_EDITORPLACEMENT AC-5, the
            // one exception to the don't-move rule)
            const b64 = Buffer.from(uuid).toString('base64');
            const uri = vscode.Uri.parse(
              `vscode-chat-session://local/${b64}`
            );
            await openAtMain(uri, entity.name);  // SPEC_MSG_EDITORPLACEMENT
          } else {
            // Mode-primed creation: set the mode selector BEFORE openNewChatEditor()
            // so the new session is born in the bound agent mode (SPEC_MSG_OPENCHAT
            // mode-prime note). workbench.action.chat.open with mode does NOT
            // retroactively change an already-active session's mode.
            if (entity.agent) {
                await vscode.commands.executeCommand(
                    'workbench.action.chat.open', { mode: entity.agent }
                );
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Create a fresh chat editor — opens in the primed mode
            await openNewChatEditor();  // SPEC_MSG_OPENCHAT (includes 800 ms settle delay)

            // Rename session so future lookups can resolve it by name
            await renameFocusedChatSession(entity.name);

            // Send initialization prompt (SPEC_ENT_AGENTSESSION_INITPROMPT)
            const kind = entity.kind ?? 'project';
            const folder = entity.folder ?? path.dirname(element.id);
            const contextPath = path.join(folder, 'context.md');
            const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
                .get<string>('agentSession.initPromptTemplate') ?? '';
            const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
            const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });
            // Mode is already set at creation time — submit prompt without mode param
            await vscode.commands.executeCommand(
                'workbench.action.chat.open', { query: initPrompt }
            );

            // project-actor-click-placement-fix CR: guarantee Main placement
            // even for a freshly created session (REQ_ENT_AGENTSESSION AC-7,
            // REQ_MSG_EDITORPLACEMENT AC-12/AC-13). The rename above has
            // already completed, so the session is now resolvable by name —
            // reuse the exact same close+reopen mechanism as the
            // existing-session branch instead of trying to influence which
            // column the chat editor was born in (VS Code exposes no API
            // for that — see SPEC_MSG_OPENCHAT).
            const newUuid = await lookupSessionUUID(entity.name);
            if (newUuid) {
                const newB64 = Buffer.from(newUuid).toString('base64');
                const newUri = vscode.Uri.parse(
                    `vscode-chat-session://local/${newB64}`
                );
                await openAtMain(newUri, entity.name);  // SPEC_MSG_EDITORPLACEMENT
            }
            // Silent no-op if newUuid is still unresolved (rare rename-
            // propagation edge case, REQ_MSG_EDITORPLACEMENT AC-13) — the
            // session is still fully usable, just not repositioned.
          }
        }
      );

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.openAgentSession",
          "title": "Jarvis: Open Agent Session",
          "icon": "$(comment-discussion)"
        }

   * ``contributes.menus.view/item/context``: two entries, both with
     ``group: "inline"``:

     .. code-block:: json

        [
          {
            "command": "jarvis.openAgentSession",
            "when": "viewItem == jarvisProject",
            "group": "inline"
          },
          {
            "command": "jarvis.openAgentSession",
            "when": "viewItem == jarvisEvent",
            "group": "inline"
          }
        ]

   * ``contributes.menus.commandPalette``: hide from Command Palette
     (the command requires a ``LeafNode`` argument and would fail without one):

     .. code-block:: json

        [
          {
            "command": "jarvis.openAgentSession",
            "when": "false"
          }
        ]

   **Design notes:**

   * ``contextValue`` uses namespaced values (``jarvisProject``, ``jarvisEvent``,
     ``jarvisFolder``) to prevent collisions with other extensions — the button
     appears on all ``jarvisProject`` and ``jarvisEvent`` items and is now the
     only inline icon on those items (entity-tree-context-menu CR retired the
     ``$(go-to-file)``/``$(notebook)`` inline icons — see ``SPEC_ENT_OPENYAML_CMD``/
     ``SPEC_ENT_OPENCONTEXT_CMD``)
   * No changes to ``yamlScanner.ts`` — uses existing ``entity.name`` from the
     entity store
   * ``openAtMain`` (``SPEC_MSG_EDITORPLACEMENT``) replaces the prior
     ``openPinnedResource`` call for the existing-session branch: the tab is
     always found and, if necessary, closed and reopened at column 1 rather
     than merely focused wherever it happens to be (``REQ_ENT_AGENTSESSION``
     AC-6 — guaranteed)
   * The fresh-session-creation branch (``openNewChatEditor`` /
     ``renameFocusedChatSession``) now **also guarantees Main placement**
     (``project-actor-click-placement-fix`` CR, ``REQ_ENT_AGENTSESSION``
     AC-7 — corrected): after the rename and init-prompt steps complete, a
     follow-up ``lookupSessionUUID`` + ``openAtMain`` call relocates the
     newly created session exactly as the existing-session branch does.
     VS Code still exposes no API to force the view column of a chat editor
     *at creation time* — that fact is unchanged — but this CR closes the
     gap by relocating *after* creation instead, using only already-proven
     mechanisms.
   * **Spec/implementation naming note (pre-existing, not introduced by this
     CR):** the actual ``packages/core/src/extension.ts`` implementation
     factors the else-branch shown above into a shared private helper,
     ``openChatForEntity()``, called from both ``jarvis.openAgentSession``
     and the entity-creation commands (``jarvis.newSession`` et al., see
     ``SPEC_ACT_NEWENTITY``) — this spec's code sample inlines that logic
     rather than naming the shared function explicitly. The relocate-step
     fix above lives once in that shared helper, so both callers gain the
     Main-placement guarantee automatically; not re-documented separately
     in ``SPEC_ACT_NEWENTITY`` beyond a cross-reference note.
   * No changes to ``sessionLookup.ts`` — reuses ``lookupSessionUUID()`` as-is
   * The initialization prompt is submitted directly via
     ``workbench.action.chat.open`` (not via the message queue)
   * Disposable pushed to ``context.subscriptions``
   * **The verbatim prompt template is specified in
     ``SPEC_ENT_AGENTSESSION_INITPROMPT``.** The old hardcoded wording shown
     above is retained for historical reference only.


.. spec:: Agent-Session Identity Prompt Template
   :id: SPEC_ENT_AGENTSESSION_INITPROMPT
   :status: draft
   :links: REQ_ACT_AGENTPROMPT; REQ_ENT_AGENTPROMPT_TEMPLATE

   **Description:**
   When ``jarvis.openAgentSession`` or ``jarvis.newSession`` opens a **new** chat
   session, it sends a kind-aware initialization prompt that instructs the agent
   to adopt the entity's identity and maintain ``context.md`` as a minimal,
   action-oriented persistent memory. The prompt text is read from the VS Code
   setting ``jarvis.agentSession.initPromptTemplate``; three placeholders are
   substituted at send-time. This applies to all entity kinds: ``project``,
   ``event``, and ``session``.

   **Template substitution** (``src/extension.ts``, shared private helper ``applyTemplate``):

   .. code-block:: typescript

      // Shared helper — also used by SPEC_MSG_SENDCOMMAND and SPEC_MSG_AUTODELIVER_POLL.
      function applyTemplate(template: string, vars: Record<string, string>): string {
          return template.replace(/\$\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
          // Unknown placeholders are left as-is.
      }

   **Call site (init prompt):**

   .. code-block:: typescript

      const rawInitTemplate = vscode.workspace.getConfiguration('jarvis')
          .get<string>('agentSession.initPromptTemplate') ?? '';
      const initTemplate = rawInitTemplate.trim() ? rawInitTemplate : DEFAULT_INIT_PROMPT;
      const initPrompt = applyTemplate(initTemplate, { kind, name: entity.name, contextPath });

   **Default prompt** (``DEFAULT_INIT_PROMPT`` constant in ``extension.ts``):

   .. code-block:: text

      You are the ${kind} "${name}".

      Use only `${contextPath}` as your persistent memory. Read it now.

      Keep it minimal and action-oriented:
      - Store only long-lived items under Decision / Finding / Next.
      - One concise line per bullet. Prune aggressively.
      - Replace outdated bullets — never append logs.
      - Never store retries, raw tool output, or transient chatter.
      - Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.
      - When a topic grows past ~5 bullets, move it to a dedicated file beside `context.md` and leave a one-line summary with a relative link in `context.md`.

   **Fallback rule:** If ``jarvis.agentSession.initPromptTemplate`` is empty or
   not set, the built-in ``DEFAULT_INIT_PROMPT`` is used. Unknown placeholders in
   a custom template are passed through unchanged.

   **Placeholder definitions:**

   * ``${kind}`` — ``entity.kind`` (``'project' | 'event' | 'session'``), defaulting
     to ``'project'`` when the field is absent (backwards compatibility).
   * ``${name}`` — the display name from ``session.yaml`` / ``project.yaml`` /
     ``event.yaml``.
   * ``${contextPath}`` — ``path.join(entity.folder ?? path.dirname(element.id),
     'context.md')`` — absolute filesystem path so the agent can open the file
     directly without resolving workspace-relative paths.

   **Trigger points:**

   * ``jarvis.openAgentSession`` — new-session branch only (no existing UUID found).
   * ``jarvis.newSession`` — always (a new session folder is always created).
   * ``jarvis.sendMessages`` — new-session branch only (no UUID found) AND the
     scanner entity store contains an entity whose ``name`` matches
     ``node.destination``. If no entity matches, the init prompt is skipped.
   * Auto-delivery poll loop — new-session branch only (no UUID found) AND the
     scanner entity store contains an entity whose ``name`` matches the session
     name being delivered to. If no entity matches, the init prompt is skipped.

   **Mode-apply sequencing (delta — mode-prime pattern):**
   For all trigger points, when ``entity.agent`` is set the bound mode must be
   applied at session creation time, not post-creation. The caller primes the VS
   Code Chat mode selector with ``workbench.action.chat.open { mode: entity.agent }``
   + 300 ms settle *before* calling ``openNewChatEditor()``. The subsequently
   created session inherits the primed mode. The final init-prompt submission uses
   ``workbench.action.chat.open { query: initPrompt }`` without a ``mode``
   parameter — the mode is already set. See ``SPEC_MSG_OPENCHAT`` mode-prime note
   for the design rationale.

   **Scope:** Cross-entity — benefits projects, events, and sessions. The spec
   lives here (``spec_exp.rst``) because ``jarvis.openAgentSession`` is an EXP
   command; the triggering requirements live in ``REQ_ACT_AGENTPROMPT`` (sessions
   CR) and ``REQ_ENT_AGENTPROMPT_TEMPLATE`` (this CR).

   **File touchpoint:** ``src/extension.ts`` — ``openAgentSessionCommand`` and
   ``newSessionCommand``.


.. spec:: Shared Agent Picker Component
   :id: SPEC_ENT_AGENT_PICKER
   :status: draft
   :links: REQ_PRJ_NEWPROJECT; REQ_EVT_NEWEVENT; REQ_ACT_AGENT_PICKER; SPEC_ACT_AGENT_PICKER; SPEC_ACT_AGENT_DISCOVERY

   **Description:**
   Shared agent-picker component — the single source of truth for interactive
   agent selection across new-entity flows. Implementation reference: existing
   ``pickAgentMode()`` function (specced in ``SPEC_ACT_AGENT_PICKER``).

   **Scope:** This picker is shown ONLY by the 3 New-Entity command flows
   (``jarvis.newProject``, ``jarvis.newEvent``, ``jarvis.newSession`` /
   ``jarvis.newEntity``). It is NEVER shown by tree-click,
   ``jarvis.openAgentSession``, or any post-creation flow.

   **Return contract (3-way):**

   - ``undefined`` — user cancelled (Escape / dismissed)
   - ``""`` (empty string) — user selected "No agent" entry
   - ``"<agent-name>"`` — user selected a concrete agent (non-empty string)

   **Picker UI:**

   - Entry labelled ``"No agent"`` always present at top, with detail string
     ``"Opens a default chat — pick mode via the chat dropdown"``.
   - Below it: the list of discoverable agents from
     ``.github/agents/*.agent.md`` filtered by ``user-invocable``
     (per ``SPEC_ACT_AGENT_DISCOVERY``).

   **Interactive consumer list (3 — anti-drift applies):**

   1. ``jarvis.newSession`` (via ``SPEC_ACT_AGENT_PICKER``)
   2. ``jarvis.newProject`` (via ``SPEC_PRJ_NEWPROJECT_CMD``)
   3. ``jarvis.newEvent`` (via ``SPEC_EVT_NEWEVENT_CMD``)

   **Anti-drift rule:** No interactive consumer SHALL implement its own agent
   QuickPick. All SHALL call ``pickAgentMode()``.

   **Programmatic-validation consumer pattern (separate, no picker):**
   ``jarvis_createProject``, ``jarvis_createEvent``, ``jarvis_createActor``
   (was ``jarvis_createSession`` before the actor-tool-rename CR, Phase 5)
   LM tools — receive ``agent`` parameter, validate via ``discoverAgents()``
   (per ``SPEC_ACT_AGENT_DISCOVERY``), no picker invocation. Anti-drift rule
   does NOT apply here (different mechanism by design).

   **Chat-open gate (cross-cutting rule):** Chat-open SHALL occur on **all
   non-cancel** picker returns. When picker returns ``undefined`` (cancel) →
   no chat-open. When picker returns ``""`` ("No agent") → chat opens
   via ``openNewChatEditor()`` without mode-prime (VS Code default mode).
   When picker returns a concrete ``"<name>"`` → mode-prime first, then
   ``openNewChatEditor()``. Consumers reference this rule rather than
   re-deriving it.

   **Chat-Open Primitive (consolidated pattern):**

   All 3 picker-driven flows (``newProject``, ``newEvent``, ``newSession``)
   SHALL use the following consolidated primitive for chat-editor creation.
   ``chat.open({mode})`` is NOT a substitute for editor-creation — it is
   mode-prime only (global mode-selector side-effect).
   ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) is the editor-creation
   primitive.

   .. code-block:: typescript

      // Mode-prime (only for concrete agent — global active-mode side-effect)
      if (agentInput) {
          try {
              await vscode.commands.executeCommand(
                  'workbench.action.chat.open', { mode: agentInput }
              );
              await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
              log.warn(`Mode-prime failed: ${err}`);
          }
      }
      // Editor creation (always) — openNewChatEditor() calls
      // workbench.action.openChat + 800ms settle (SPEC_MSG_OPENCHAT)
      await openNewChatEditor();

   **Cross-reference:** ``SPEC_MSG_OPENCHAT`` is the canonical documentation of
   the ``openNewChatEditor()`` helper.

   **Acceptance Criteria:**

   1. ``pickAgentMode()`` returns one of exactly three values: ``undefined``,
      ``""``, or a non-empty agent name string.
   2. The QuickPick shows "No agent" as the first entry with detail
      ``"Opens a default chat — pick mode via the chat dropdown"``.
   3. Agent list below "No agent" is sourced from ``discoverAgents()``
      filtered by ``user-invocable``.
   4. All 3 interactive consumers call ``pickAgentMode()`` — none implement
      their own QuickPick.
   5. Programmatic LM-tool consumers use ``discoverAgents()`` for validation
      without invoking the picker.
   6. Chat-open occurs on all non-cancel returns using the consolidated
      primitive: ``""`` → ``openNewChatEditor()`` only (no mode-prime);
      ``"<name>"`` → mode-prime + ``openNewChatEditor()``.
      ``chat.open({mode})`` is mode-prime only, NOT editor-creation.
   7. "No agent" entry returns ``""`` (empty string) when selected.
   8. Escape / dismiss returns ``undefined``.



.. spec:: Rescan Command
   :id: SPEC_ENT_RESCAN_CMD
   :status: implemented
   :links: REQ_ENT_SCANREFRESH; SPEC_ENG_SCANNER; SPEC_EXP_EXTENSION

   **Description:**
   Register ``jarvis.rescan`` in ``extension.ts``. Triggered by the ``$(refresh)``
   icon in both the Projects and Events view title bars. Calls the scanner's
   existing ``rescan()`` method.

   **Handler:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.rescan', async () => {
          await scanner.rescan();
      });

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        {
          "command": "jarvis.rescan",
          "title": "Jarvis: Rescan",
          "icon": "$(refresh)"
        }

   * ``contributes.menus.view/title``: two entries:

     .. code-block:: json

        [
          {
            "command": "jarvis.rescan",
            "when": "view == jarvisProjects",
            "group": "navigation@3"
          },
          {
            "command": "jarvis.rescan",
            "when": "view == jarvisEvents",
            "group": "navigation@3"
          }
        ]

   * ``contributes.menus.commandPalette``: hide from Command Palette:

     .. code-block:: json

        {
          "command": "jarvis.rescan",
          "when": "false"
        }

   **Disposable** pushed to ``context.subscriptions``.


.. spec:: Entity Agent Field — Scanner Implementation
   :id: SPEC_ENT_ENTITY_AGENT
   :status: draft
   :links: REQ_ENT_ENTITY_AGENT; SPEC_ENG_SCANNER

   **Description:**
   Specifies how the ``agent`` field is read from ``project.yaml`` and
   ``event.yaml`` during the scanner's ``_buildTree()`` loop, the treatment of
   missing/invalid values, and the runtime semantics of unbound entities.

   **Scanner read logic** (in ``_buildTree()``, after reading the convention
   file):

   .. code-block:: typescript

      // After parsing the YAML document (doc)
      const rawAgent = doc['agent'];
      let agent: string | undefined;
      if (typeof rawAgent === 'string') {
          agent = rawAgent;           // preserves "" as valid bound value
      } else if ('agent' in doc) {
          agent = undefined;          // non-string present (null, number, bool) → unbound
      } else {
          agent = undefined;          // field absent → unbound
      }

   **Three-state semantics of the ``agent`` field:**

   .. list-table::
      :header-rows: 1
      :widths: 30 30 40

      * - ``doc['agent']`` in YAML
        - ``EntityEntry.agent``
        - Meaning
      * - field absent
        - ``undefined``
        - legacy/unbound — runtime identical to ``""`` (no mode-prime, no picker)
      * - ``""`` (present, empty string)
        - ``""``
        - explicit "user chose No agent" — NO picker, opens chat without mode
      * - ``"<name>"`` (non-empty string)
        - ``"<name>"``
        - concrete-bound — opens chat with mode

   **Note:** The runtime treats ``""`` and ``undefined`` identically as "no
   agent bound"; the scanner-level distinction exists for schema validation and
   warn-logging only.

   **Additional non-string cases:**

   * **Explicitly ``undefined``** (``agent:`` with no value / YAML null) →
     ``rawAgent`` is ``null`` or ``undefined`` → ``EntityEntry.agent = undefined``
     (unbound).
   * **Non-string** (``agent: 42``, ``agent: true``) → ``typeof`` check fails →
     ``EntityEntry.agent = undefined`` (unbound).

   **Warn-log line** (emitted ONLY when field is missing — ``!('agent' in doc)``):

   .. code-block:: typescript

      if (!('agent' in doc)) {
          console.warn(
              `${kind} ${entity.name} at ${filePath} is missing required 'agent' field — marked unbound`
          );
      }

   Where ``kind`` is ``"project"`` or ``"event"`` (derived from
   ``conventionFile``), and ``filePath`` is the convention file's absolute path.

   The warn-log does NOT fire for ``agent: ""`` (that is a valid bound state
   meaning "No agent chosen").

   **``EntityEntry`` interface update:**

   The ``agent`` field is declared as an optional property in ``EntityEntry``
   (see ``SPEC_ENG_SCANNER``):

   .. code-block:: typescript

      interface EntityEntry {
          name: string;
          datesEnd?: string;
          datesStart?: string;
          summary?: string;        // entity-parity: event summary; empty string default
          agent?: string;          // entity-parity: bound agent mode; undefined = unbound, "" = No agent
          kind?: string;           // entity-parity: 'project' | 'event' | 'session'
          folder?: string;         // entity-parity: absolute path to entity folder
      }

   **Runtime three-state semantic:**

   * ``entity.agent === undefined`` — entity is unbound (legacy, field missing).
     Runtime behavior identical to ``""`` (opens chat without mode-prime, no
     picker, no YAML writeback). Warn-log emitted at scan time.
   * ``entity.agent === ""`` — entity is explicitly bound to "No agent".
     No picker on tree-click, opens chat without mode parameter.
   * ``entity.agent === "<name>"`` (non-empty string) — entity is concrete-bound.
     Opens chat with ``mode: <name>``.

   Downstream consumers (``SPEC_ENT_TREECLICK``,
   ``SPEC_EVT_LISTEVENTS``, ``SPEC_PRJ_LISTPROJECTS``) check this property
   to determine the states. No separate boolean flag is used.

   **Acceptance Criteria:**

   1. The scanner reads the ``agent`` field from ``project.yaml`` and
      ``event.yaml`` in the ``_buildTree()`` loop.
   2. Three-state semantics: field absent → ``undefined`` (unbound); empty
      string ``""`` → ``""`` (bound to "No agent"); non-empty string →
      stored verbatim (concrete-bound). Non-string values (null, number,
      boolean) → ``undefined`` (unbound).
   3. ``EntityEntry.agent`` can be ``undefined``, ``""``, or a non-empty
      string. Only ``undefined`` represents an unbound entity.
   4. A ``console.warn()`` line is emitted ONLY when the ``agent`` field is
      absent from the YAML (``!('agent' in doc)``), with text:
      ``"<kind> <name> at <path> is missing required 'agent' field —
      marked unbound"``. The warn-log does NOT fire for ``agent: ""``.
   5. ``EntityEntry`` declares ``agent?: string`` as an optional property.
   6. ``entity.agent === undefined`` is the indicator of unbound state;
      ``entity.agent === ""`` means "No agent chosen" (bound, no picker);
      ``entity.agent`` non-empty means concrete-bound.
   7. Runtime treats ``undefined`` and ``""`` identically (Branch B of
      ``SPEC_ENT_TREECLICK``): no mode-prime, no picker, no YAML
      writeback. The distinction is for schema validation and warn-logging only.


.. spec:: Entity Tree-Click-to-Chat Implementation
   :id: SPEC_ENT_TREECLICK
   :status: draft
   :links: REQ_ENT_ENTITY_TREECLICK; SPEC_ENT_AGENTSESSION; SPEC_ENT_ENTITY_AGENT

   **Description:**
   Specifies how ``TreeItem.command`` is wired for project, event, and actor
   leaf nodes so that a single click opens the agent-chat editor. Exactly two
   runtime branches exist — no picker is ever shown on tree-click.

   **``TreeItem.command`` wiring** (in ``getTreeItem()`` of each
   TreeDataProvider):

   For every leaf node with ``contextValue`` of ``jarvisProject``,
   ``jarvisEvent``, or ``jarvisSession``, the ``TreeItem.command`` property
   SHALL be set to:

   .. code-block:: typescript

      item.command = {
          command: 'jarvis.openAgentSession',
          title: 'Open Agent Session',
          arguments: [element],   // LeafNode passed as argument
      };

   This causes a single-click to invoke ``jarvis.openAgentSession``
   (``SPEC_ENT_AGENTSESSION``) with the leaf node.

   **Runtime branches (exactly 2):**

   The ``jarvis.openAgentSession`` handler (``SPEC_ENT_AGENTSESSION``) checks
   ``entity.agent``:

   * **Branch A — ``entity.agent`` is a non-empty string** (concrete-bound):
     mode-prime (``workbench.action.chat.open({ mode: entity.agent })`` +
     300 ms settle) → ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``) →
     rename → init prompt (per ``SPEC_ENT_AGENTSESSION_INITPROMPT``).
   * **Branch B — ``entity.agent`` is ``""`` OR ``undefined``** (no agent
     bound, or legacy field-missing): ``openNewChatEditor()``
     (``SPEC_MSG_OPENCHAT``) → rename → init prompt. No mode-prime, no
     picker, no YAML writeback.

   **Design rationale:** The scanner-level distinction between ``undefined``
   and ``""`` is preserved for schema validation and warn-logging
   (``SPEC_ENT_ENTITY_AGENT``), but at runtime both collapse into Branch B.
   Users who want to switch agent mode do so via VS Code's native chat-mode
   dropdown inside the chat editor.

   **Same behavior for all 3 entity kinds:**

   The ``TreeItem.command`` wiring and the branch logic apply uniformly to
   projects, events, and actors. No entity-kind-specific branching in the
   tree-click path.

   **Acceptance Criteria:**

   1. ``TreeItem.command`` for project, event, and actor leaf nodes is set
      to ``jarvis.openAgentSession`` with the ``LeafNode`` as argument.
   2. Single-click on any leaf node invokes ``jarvis.openAgentSession``.
   3. Branch A: concrete-bound entities (``entity.agent`` is non-empty string)
      → mode-prime + ``openNewChatEditor()`` + rename + init prompt.
   4. Branch B: ``entity.agent === ""`` OR ``entity.agent === undefined`` →
      ``openNewChatEditor()`` + rename + init prompt. No mode-prime, no
      picker, no YAML writeback.
   5. No picker is ever shown on tree-click.
   6. Double-click behaves identically to single-click (VS Code default).
   7. All three entity kinds (project, event, actor) use the same
      ``TreeItem.command`` binding — no kind-specific branching.


.. spec:: Uniform Inline Icons for All Entities — Superseded
   :id: SPEC_ENT_ENTITY_ICONS
   :status: draft
   :links: REQ_ENT_ENTITY_ICONS; SPEC_EXP_EXTENSION; SPEC_EXP_PROVIDER; SPEC_ENT_CONTEXTACTIONS; SPEC_ENT_ENTITY_CONTEXTMENU

   **Superseded (entity-tree-context-menu CR):** the two inline icons this
   spec mandated (``$(go-to-file)`` → ``jarvis.openYamlFile``, ``$(notebook)``
   → ``jarvis.openContext``) are retired — see ``SPEC_ENT_OPENYAML_CMD`` /
   ``SPEC_ENT_OPENCONTEXT_CMD`` (both now fully retired, not just
   inline-placement-removed) and ``SPEC_ENT_ENTITY_CONTEXTMENU`` (the
   replacement right-click Open/Copy Path/Copy Full Path menu). **The
   ``jarvis.openRecording``-removal content below (icon table's absence,
   "Removed" section, ACs 4-6/9) is unrelated to this supersession and
   remains in force** — that removal predates this CR and concerns a
   different icon (``$(record)``), not the two retired here.

   **Historical description** (kept for traceability, no longer enforced):
   every leaf node across all three entity types (project, event, actor)
   displayed two inline icons: YAML and context.md. No recording icon was
   shown.

   **Historical icon identifiers and commands** (retired):

   .. list-table::
      :header-rows: 1
      :widths: 20 20 25 35

      * - Icon
        - Codicon
        - Command
        - Purpose
      * - YAML
        - ``$(go-to-file)``
        - ``jarvis.openYamlFile``
        - (historical) Opened the entity's convention YAML file
      * - context.md
        - ``$(notebook)``
        - ``jarvis.openContext``
        - (historical) Opened ``context.md`` in the entity's folder

   **Historical icon order** (left to right in the tree item inline area,
   no longer applicable — no inline icons remain):

   ``$(notebook)`` → ``$(go-to-file)``

   This is controlled via ``group: "inline@<n>"`` in the
   ``contributes.menus.view/item/context`` entries in ``package.json``.

   **Removed — ``jarvis.openRecording`` command and ``+recording`` contextValue:**

   The following elements SHALL NOT exist in the codebase:

   * The command ``jarvis.openRecording`` SHALL NOT be registered in
     ``contributes.commands`` in ``package.json``.
   * No ``contributes.menus.view/item/context`` entry SHALL reference
     ``jarvis.openRecording``.
   * The ``+recording`` suffix SHALL NOT be appended to any tree item's
     ``contextValue``. All leaf nodes use plain ``contextValue`` strings:
     ``jarvisProject``, ``jarvisEvent``, or ``jarvisSession``.
   * No ``fs.existsSync(path.join(entityFolder, 'recording'))`` check SHALL
     exist in any ``getTreeItem()`` method.
   * No command handler for ``jarvis.openRecording`` SHALL be registered in
     ``extension.ts``.

   **Implementation in ``getTreeItem()``:**

   .. code-block:: typescript

      item.contextValue = baseContextValue;

   Where ``baseContextValue`` is ``jarvisProject``, ``jarvisEvent``, or
   ``jarvisSession`` depending on the entity kind. No suffix logic.

   **Historical manifest entries** (``package.json``
   ``contributes.menus.view/item/context`` — both entries retired, see
   ``SPEC_ENT_OPENYAML_CMD``/``SPEC_ENT_OPENCONTEXT_CMD``):

   .. code-block:: json

      [
        {
          "command": "jarvis.openContext",
          "when": "viewItem =~ /^jarvis(Project|Event|Session)/",
          "group": "inline@1"
        },
        {
          "command": "jarvis.openYaml",
          "when": "viewItem =~ /^jarvis(Project|Event|Session)/",
          "group": "inline@2"
        }
      ]

   **Acceptance Criteria:**

   1. (historical) Every leaf node showed a ``$(go-to-file)`` inline icon
      for opening the entity YAML file.
   2. (historical) Every leaf node showed a ``$(notebook)`` inline icon for
      opening ``context.md``.
   3. (historical) Icon order (left to right): ``$(notebook)``, ``$(go-to-file)``.
   4. The ``$(record)`` icon SHALL NOT appear on any entity tree item,
      regardless of whether a ``recording/`` subfolder exists.
   5. No ``jarvis.openRecording`` command exists in ``package.json`` or is
      registered at runtime.
   6. No ``+recording`` suffix is appended to any ``contextValue``.
   7. (historical) All three entity kinds (project, event, actor) used the
      same icon set — no kind-specific branching.
   8. (historical) Actor nodes already had these icons; this spec extended
      the pattern to project and event nodes.
   9. Start/stop recording inline icons (``jarvis.startRecording``,
      ``jarvis.stopRecording``) and active-recording highlight remain
      unchanged — this removal targets only the dead "Open Recording" icon.

   **Note:** v0.7.0 entity-parity risk #1 (``jarvis.hasRecording`` context-key
   trigger never formalized) is resolved by this removal — the context key and
   its folder-scan trigger no longer exist.


.. spec:: Entity File Children in Tree
   :id: SPEC_ENT_ENTITY_FILE_CHILDREN
   :status: approved
   :links: REQ_ENT_ENTITY_FILE_CHILDREN; SPEC_ENG_TREEFACTORY; SPEC_ACT_TREE; SPEC_ENT_TREECLICK; SPEC_ACT_AGENT_DISCOVERY; SPEC_MSG_EDITORPLACEMENT; SPEC_PRJ_LISTPROJECTS

   **Description:**
   Every project, event, and actor leaf node becomes expandable into two
   category child nodes, computed on-the-fly (not cached in
   ``YamlScanner``): an **"Agent"** category (conditional) and a **"Files"**
   category (always present) that recursively mirrors every file and
   subfolder actually present in the entity's own folder.

   **(actor-owned-files-tree CR — architecture correction):** this spec is
   rewritten in two independent respects:

   1. **Behavior change** (the actual point of this CR): the fixed
      3-child flat list (``context.md``, YAML config, agent file) is
      replaced by the Agent/Files category layer described below.
   2. **Stale-illustration correction** (found during this CR's impact
      analysis, fixed at zero extra cost since this spec was being rewritten
      anyway): the previous revision's code samples described three
      separate hand-written ``TreeDataProvider`` classes
      (``ProjectTreeProvider``/``EventTreeProvider``/``SessionTreeProvider``).
      That architecture no longer exists — it was superseded by the single,
      generic ``GenericTreeDataProvider`` (``packages/core/src/engine/core/
      treeFactory.ts``, ``SPEC_ENG_TREEFACTORY``), driven by
      ``EntityKindConfig`` for all three kinds. The previous revision's code
      also carried a header-comment reference to
      ``SPEC_EXP_ENTITY_FILE_CHILDREN``/``REQ_EXP_ENTITY_FILE_CHILDREN`` —
      **IDs that do not exist anywhere in the spec tree**, a leftover from
      an earlier draft that was never reconciled. All code samples below
      describe the real, current implementation.

   The agent file remains a **shared** file — multiple entities with the
   same ``agent`` value point to the same path (e.g. several Actor entities
   bound to ``agent: "Test Manager"`` all show the same
   ``.github/agents/test-agent.agent.md``, resolved by matching frontmatter
   ``name:``, not filename — this identity-resolution mechanism itself is
   unchanged from the prior revision). This remains purely additive at the
   entity-node level: existing inline icons, context-menu actions, and the
   entity-node click-to-chat command are unchanged.

   **Node types (provider-local, added to** ``packages/core/src/engine/core/
   treeFactory.ts`` **— deliberately NOT added to** ``yamlScanner.ts``'s
   **exported** ``TreeNode`` **union):**

   .. code-block:: typescript

      /** Category node grouping "Agent"/"Files" (and future categories) under a leaf. */
      interface EntityFileCategoryNode {
          kind: 'entityFileCategory';
          category: 'agent' | 'files';   // extension point: add 'recent' here later
          label: string;                  // "Agent" | "Files"
          entityFolder: string;           // absolute path to the entity's own folder
      }

      /** A file within the recursive "Files" listing, or the Agent category's synthetic child. */
      interface EntityFileNode {
          kind: 'entityFile';
          filePath: string;   // absolute path, forward-slash normalized for tooltip
          label: string;      // basename (the parent "Agent" category node already provides context)
      }

      /** A subfolder within the recursive "Files" listing. */
      interface EntityFileFolderNode {
          kind: 'entityFileFolder';
          folderPath: string; // absolute path
          label: string;      // basename
      }

      type EntityFilesSubtreeNode = EntityFileCategoryNode | EntityFileNode | EntityFileFolderNode;

      // Extends the provider's existing node union (ProviderNode = TreeNode | ChildTreeNode):
      export type ProviderNode = TreeNode | ChildTreeNode | EntityFilesSubtreeNode;

   **Design rationale — why these nodes are NOT added to** ``yamlScanner.ts``'s
   **shared** ``TreeNode`` **union:**
   ``TreeNode`` (``FolderNode | LeafNode | FileNode``) is consumed by several
   places that pattern-match on ``.kind`` with an if/else chain, not an
   exhaustive switch+``assertNever`` — most notably
   ``packages/pim/src/extension.ts``'s ``collectLeaves()``, which was the
   subject of a real regression (``v0.15.1``, ``pim-treenode-filenode-fix``)
   when ``FileNode`` was added and ``collectLeaves()`` wasn't updated for
   it. ``collectLeaves()`` only ever walks ``KindDrivenScanner.getTreeForKind()``
   output (``FolderNode``/``LeafNode`` only in practice — file children have
   always been computed on-the-fly by the provider, never merged into the
   scanner's own tree), so it was never actually at risk from the *existing*
   ``FileNode`` variant; but a **4th** union member would widen the same
   class of silent-gap risk to every other ``TreeNode``-typed if/else
   consumer (``yamlScanner.ts``'s own sort/equality helpers,
   ``unifiedEntityTreeProvider.ts``, ``packages/pim/src/extension.ts``'s
   folder-filter). By scoping the new recursive nodes to a provider-local
   ``ProviderNode`` extension instead (exactly where the existing ``child``
   variant, ``ChildTreeNode``, already lives for hook-based subtree
   rendering), none of those ``TreeNode``-only consumers are touched at
   all — provably safe by construction, not by review.

   **Dev Engineer verification step (explicit, per this CR):** grep the
   codebase for ``.kind === 'folder'``, ``.kind === 'file'``, and
   ``.kind === 'leaf'`` before merging, to confirm no consumer was missed
   and that none of them receive ``ProviderNode`` values (only genuine
   ``TreeNode`` values) where an exhaustive check might silently degrade.
   Consider converting ``collectLeaves()``'s if/else chain to a
   ``switch`` with a ``default: assertNever(node)`` branch as a hardening
   follow-up (optional, not required by this CR) so a *future* ``TreeNode``
   union addition fails to compile instead of silently no-op'ing.

   **Agent-file resolution (unchanged from prior revision — reused as-is):**

   .. code-block:: typescript

      let _agentModesCache: AgentModeEntry[] | undefined;

      async function getAgentModesCached(): Promise<AgentModeEntry[]> {
          if (!_agentModesCache) {
              _agentModesCache = await discoverAgentModes();
          }
          return _agentModesCache;
      }

      /** Resolves entity.agent (frontmatter identity) to its .agent.md file. */
      async function resolveAgentFileChild(
          entityAgent: string | undefined,
          workspaceRoot: string
      ): Promise<{ filePath: string; label: string } | undefined> {
          if (!entityAgent) { return undefined; }
          const modes = await getAgentModesCached();
          const match = modes.find(m => m.name === entityAgent);
          if (!match) { return undefined; } // fail-open: unresolved identity → no Agent category
          return {
              filePath: path.join(workspaceRoot, match.filePath),
              label: path.basename(match.filePath),
          };
      }

   Because ``discoverAgentModes()`` only ever enumerates agent files that
   actually exist on disk at scan time, a successful match already implies
   "the file existed as of the last cache population" — satisfying
   ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-2c's "present = has content" rule
   with no additional existence check. If the file is deleted *after* the
   cache was populated, the Agent category still renders (stale cache) but
   the click handler's existing fail-open path (below) surfaces a warning —
   this is the one remaining fail-open scenario for the Agent category
   (see UAT amendment).

   **Recursive folder scan (new — the actual "Files" category mechanism):**

   .. code-block:: typescript

      const ENTITY_FILE_CATEGORIES: Array<{ category: 'agent' | 'files'; label: string }> = [
          { category: 'agent', label: 'Agent' },
          { category: 'files', label: 'Files' },
          // Future extension point: { category: 'recent', label: 'Recently Modified' } —
          // same category-node pattern, no structural changes needed elsewhere.
      ];

      async function scanEntityFilesRecursive(
          folder: string
      ): Promise<(EntityFileNode | EntityFileFolderNode)[]> {
          let entries: import('fs').Dirent[];
          try {
              entries = await fs.promises.readdir(folder, { withFileTypes: true });
          } catch {
              return []; // fail-open: unreadable folder → empty listing, no error
          }
          const sorted = [...entries].sort((a, b) =>
              a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          );
          return sorted.map(entry => {
              const fullPath = path.join(folder, entry.name);
              return entry.isDirectory()
                  ? { kind: 'entityFileFolder' as const, folderPath: fullPath, label: entry.name }
                  : { kind: 'entityFile' as const, filePath: fullPath, label: entry.name };
          });
      }

   ``fs.promises.readdir`` includes dot-prefixed (hidden) entries by
   default on every platform — no extra filtering is needed to satisfy
   ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-2b's "hidden entries included".
   Sorting is a single alphabetical pass over files and folders together
   (not folders-first) — a deliberate reading of the CD's literal "sorted
   alphabetically" wording; flagged as a minor, easily-reversible UX
   decision if folders-first is later preferred.

   **``GenericTreeDataProvider._getLeafChildren()`` (replaces the old
   ``getEntityFileChildren()`` call — same call site, new implementation):**

   .. code-block:: typescript

      private async _getLeafChildren(element: LeafNode): Promise<ProviderNode[]> {
          const entity = this._scanner.getEntity(element.id);
          const entityFolder = path.dirname(element.id);
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';

          const categoryNodes: EntityFileCategoryNode[] = [];
          const agentFile = await resolveAgentFileChild(entity?.agent, workspaceRoot);
          if (agentFile) {
              categoryNodes.push({ kind: 'entityFileCategory', category: 'agent', label: 'Agent', entityFolder });
          }
          categoryNodes.push({ kind: 'entityFileCategory', category: 'files', label: 'Files', entityFolder });

          let hookChildren: ProviderNode[] = [];
          if (this._config.getChildren) {
              const name = entity ? entity.name : path.basename(entityFolder);
              const entityData = { name, filePath: element.id, data: (entity ?? {}) as Record<string, unknown> };
              const descriptors = this._config.getChildren(entityData);
              if (descriptors && descriptors.length > 0) {
                  hookChildren = descriptors.map(d => ({ kind: 'child' as const, descriptor: d, parentKind: this._config.kind }));
              }
          }
          return [...categoryNodes, ...hookChildren];
      }

   **``getChildren(element)`` additions (new branches, alongside the
   existing ``'folder'``/``'child'``/``'file'``/``'leaf'`` handling shown in
   ``SPEC_ENG_TREEFACTORY``):**

   .. code-block:: typescript

      if (element.kind === 'entityFileCategory') {
          if (element.category === 'agent') {
              // Re-resolve rather than cache the single node — cheap (one
              // cache lookup + array find, per REQ_ENT_ENTITY_FILE_CHILDREN AC-2c).
              const entity = this._scanner.getEntity(/* owning leaf id, tracked alongside category node */);
              const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
              const agentFile = await resolveAgentFileChild(entity?.agent, workspaceRoot);
              return agentFile
                  ? [{ kind: 'entityFile' as const, filePath: agentFile.filePath, label: agentFile.label }]
                  : [];
          }
          // category === 'files'
          return scanEntityFilesRecursive(element.entityFolder);
      }
      if (element.kind === 'entityFileFolder') {
          return scanEntityFilesRecursive(element.folderPath);
      }
      if (element.kind === 'entityFile') {
          return []; // leaf — no further descent
      }

   (Implementation note for Dev Engineer: the category node's re-resolution
   of the owning entity needs a stable reference back to the originating
   ``LeafNode``/entity id — either carry it on ``EntityFileCategoryNode`` as
   an additional field, or key the lookup off ``entityFolder``'s parent
   convention file. Either is acceptable; not prescribed further here.)

   **``getTreeItem(element)`` additions:**

   .. code-block:: typescript

      if (element.kind === 'entityFileCategory') {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
          item.contextValue = `jarvisEntityFileCategory:${element.category}`;
          return item;
      }
      if (element.kind === 'entityFileFolder') {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
          item.tooltip = element.folderPath.replace(/\\/g, '/');
          item.contextValue = 'jarvisEntityFileFolder';
          return item;
      }
      if (element.kind === 'entityFile') {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
          item.tooltip = element.filePath.replace(/\\/g, '/');
          item.contextValue = 'jarvisEntityFile';
          item.command = { command: 'jarvis.openEntityFile', title: 'Open File', arguments: [element] };
          return item;
      }
      // LeafNode branch (existing) — collapsibleState unchanged from prior revision (Collapsed).

   **``jarvis.openEntityFile`` command (extended — broadened ``.md`` check,
   new preview-mode branch for non-``.md`` files):**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openEntityFile',
        async (node: { filePath: string; label: string }) => {
          const uri = vscode.Uri.file(node.filePath);
          try {
            await vscode.workspace.openTextDocument(uri); // validates existence first
            if (path.extname(node.filePath).toLowerCase() === '.md') {
              // Broadened from the prior exact-basename ("context.md" only)
              // check to any .md extension — REQ_ENT_ENTITY_FILE_CHILDREN
              // AC-4a now deliberately includes *.agent.md (previously
              // excluded), per this CR's CD.
              await vscode.commands.executeCommand('markdown.showPreview', uri, DOCS_COLUMN);
            } else {
              // New: preview-mode (single-click reuse, double-click pin),
              // still fixed to the Docs column and focus-in-place if open
              // elsewhere (SPEC_MSG_EDITORPLACEMENT).
              await openAtDocs(uri, { preview: true });
            }
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open file: ${node.filePath}`);
          }
        }
      );

   **``openAtDocs()`` signature change (``packages/core/src/extension.ts``,
   single existing call site — this one):**

   .. code-block:: typescript

      async function openAtDocs(uri: vscode.Uri, options?: { preview?: boolean }): Promise<void> {
          const existing = findFileTab(uri.fsPath);
          const viewColumn = existing ? existing.group.viewColumn : DOCS_COLUMN;
          await vscode.commands.executeCommand('vscode.open', uri, {
              preview: options?.preview ?? false,   // unchanged default for any other future caller
              viewColumn,
          });
      }

   **Copy Path / Copy Full Path (``SPEC_ENT_ENTITY_CONTEXTMENU``) — unchanged
   behavior, small type-compatibility note:** ``resolveCopyPaths()``
   currently types its parameter as ``FileNode | LeafNode``. Since
   ``EntityFileNode``/``EntityFileFolderNode`` are structurally compatible
   (``filePath``/``folderPath`` + ``label``), Dev Engineer widens the
   parameter type (or adds a small adapter) so the existing commands keep
   working unchanged for the new node kinds — no behavior change, no new
   command.

   **Registration in package.json:** unchanged from the prior revision —
   ``jarvis.openEntityFile`` remains Command-Palette-hidden
   (``"when": "false"``), reachable only via tree-item click. Context-menu
   entries (Open/Copy Path/Copy Full Path/Copy File Name) are unaffected —
   see ``SPEC_ENT_ENTITY_CONTEXTMENU`` for the current, authoritative menu
   contents (unchanged by this CR per the CD).

   **Acceptance Criteria:**

   1. ``ProviderNode`` (``packages/core/src/engine/core/treeFactory.ts``)
      gains three new provider-local variants
      (``EntityFileCategoryNode``/``EntityFileNode``/``EntityFileFolderNode``);
      ``yamlScanner.ts``'s exported ``TreeNode`` union is explicitly
      **unchanged** (still ``FolderNode | LeafNode | FileNode``) — see the
      Design Rationale above.
   2. ``_getLeafChildren()`` (``GenericTreeDataProvider``) returns an
      "Agent" category node (conditional) followed by a "Files" category
      node (always), followed by any existing hook-based children — no
      duplicated logic across kinds (single shared provider, per
      ``SPEC_ENG_TREEFACTORY``).
   3. Every leaf node's ``collapsibleState`` remains ``Collapsed``
      (unchanged from the prior revision — this CR changes what the
      children ARE, not the leaf's own collapsibility).
   4. Category and folder listings are computed on-the-fly in
      ``getChildren()`` on every expansion — never cached in the scanner or
      in ``YamlScanner``'s tree structures (``REQ_ENT_ENTITY_FILE_CHILDREN``
      AC-8).
   5. The "Agent" category is included only when ``entity.agent`` is
      non-empty **and** resolves via ``discoverAgentModes()`` to a matching
      ``AgentModeEntry``; otherwise omitted entirely (fail-open, no error,
      no empty category shown).
   6. ``discoverAgentModes()`` results remain cached at module level for the
      extension host session lifetime (unchanged from prior revision).
   7. The "Files" category recursively lists the entity's own folder via
      ``fs.promises.readdir`` (alphabetical, hidden entries included,
      subfolders expandable and recursed identically).
   8. Clicking any file child (either category) invokes
      ``jarvis.openEntityFile``: ``.md`` files (by extension, not exact
      basename) open via Markdown Preview; all other files open via
      ``openAtDocs(uri, { preview: true })`` — both at the fixed Docs
      column, focusing an existing tab in place if already open elsewhere,
      or showing a warning if the file no longer exists. No file is created
      as a side effect.
   9. File child tooltip shows the full absolute path with forward slashes;
      folder children likewise.
   10. File child ``contextValue`` is ``jarvisEntityFile``; folder child
       ``contextValue`` is ``jarvisEntityFileFolder``; category node
       ``contextValue`` is ``jarvisEntityFileCategory:agent`` or
       ``jarvisEntityFileCategory:files`` — all distinct from existing
       entity-node ``contextValue``s, so none of them are picked up by
       existing entity-node context-menu ``when``-clauses.
   11. No existing inline icon, context-menu entry, or entity-node
       ``TreeItem.command`` binding is modified by this spec.



.. spec:: Context Actions Commands
   :id: SPEC_ENT_CONTEXTACTIONS
   :status: implemented
   :links: REQ_ENT_CONTEXTACTIONS; SPEC_EXP_EXTENSION; SPEC_EXP_PROVIDER

   **Description:**
   Register three commands in ``extension.ts`` that delegate to built-in VS Code
   commands to reveal the entity folder in the file explorer, OS file manager, or
   integrated terminal. Each command receives a ``LeafNode`` from the tree view
   context menu and derives the folder URI from the convention file path.

   **Handlers:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.revealInExplorer', (node: LeafNode) => {
          vscode.commands.executeCommand('revealInExplorer', vscode.Uri.file(node.id));
      });

      vscode.commands.registerCommand('jarvis.revealInOS', (node: LeafNode) => {
          vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(node.id));
      });

      vscode.commands.registerCommand('jarvis.openInTerminal', (node: LeafNode) => {
          vscode.commands.executeCommand('openInTerminal', vscode.Uri.file(node.id));
      });

   **Design note:** ``node.id`` is the absolute path to the convention file
   (``project.yaml`` / ``event.yaml``). The built-in ``revealInExplorer`` command
   accepts a file URI and reveals the containing folder. ``revealFileInOS`` opens
   the OS file manager at that path. ``openInTerminal`` opens a terminal at the
   directory of the given URI. All three handle the folder resolution internally.

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        [
          {
            "command": "jarvis.revealInExplorer",
            "title": "Reveal in Explorer"
          },
          {
            "command": "jarvis.revealInOS",
            "title": "Reveal in File Explorer"
          },
          {
            "command": "jarvis.openInTerminal",
            "title": "Open in Terminal"
          }
        ]

   * ``contributes.menus.view/item/context``: six entries (3 commands × 2 contextValues),
     all in group ``"context-actions"``:

     .. code-block:: json

        [
          {
            "command": "jarvis.revealInExplorer",
            "when": "viewItem == jarvisProject",
            "group": "context-actions"
          },
          {
            "command": "jarvis.revealInExplorer",
            "when": "viewItem == jarvisEvent",
            "group": "context-actions"
          },
          {
            "command": "jarvis.revealInOS",
            "when": "viewItem == jarvisProject",
            "group": "context-actions"
          },
          {
            "command": "jarvis.revealInOS",
            "when": "viewItem == jarvisEvent",
            "group": "context-actions"
          },
          {
            "command": "jarvis.openInTerminal",
            "when": "viewItem == jarvisProject",
            "group": "context-actions"
          },
          {
            "command": "jarvis.openInTerminal",
            "when": "viewItem == jarvisEvent",
            "group": "context-actions"
          }
        ]

   * ``contributes.menus.commandPalette``: hide all three commands:

     .. code-block:: json

        [
          { "command": "jarvis.revealInExplorer", "when": "false" },
          { "command": "jarvis.revealInOS", "when": "false" },
          { "command": "jarvis.openInTerminal", "when": "false" }
        ]

   **Disposables** pushed to ``context.subscriptions``.


.. spec:: Entity Tree Context Menu — Open / Copy Path / Copy Full Path
   :id: SPEC_ENT_ENTITY_CONTEXTMENU
   :status: draft
   :links: REQ_ENT_ENTITY_CONTEXTMENU; SPEC_ENT_ENTITY_FILE_CHILDREN; SPEC_ENT_AGENTSESSION; SPEC_EXP_EXTENSION

   **Description:**
   Register ``jarvis.copyPath``, ``jarvis.copyFullPath``, ``jarvis.copyFileName``,
   and ``jarvis.copyCategoryName`` in ``extension.ts``, plus ``view/item/context``
   bindings that add "Open" / "Copy Path" / "Copy Full Path" / "Copy File Name"
   (file children only) to the right-click menu of file-child nodes
   (``jarvisEntityFile``) and entity root nodes (``jarvisProject``,
   ``jarvisEvent``, ``jarvisSession``), plus a separate single-entry "Copy"
   menu for folder/category nodes (``jarvisFolder``, ``ui-improvements`` CR).
   "Open" reuses existing commands (``jarvis.openEntityFile`` for file
   children, ``jarvis.openAgentSession`` for root nodes) — no new "Open"
   command is introduced.

   **Path resolution helper** (shared by both new commands):

   .. code-block:: typescript

      /** Resolves the containing folder (Copy Path) and the full path
       *  (Copy Full Path) for either a file-child node or an entity root
       *  node. Root nodes have no filename, so both resolve to the same
       *  folder path. */
      function resolveCopyPaths(node: FileNode | LeafNode): { folder: string; full: string } {
          if (node.kind === 'file') {
              return { folder: path.dirname(node.filePath), full: node.filePath };
          }
          // Entity root (LeafNode): node.id is the convention file's absolute
          // path (project.yaml/event.yaml/session.yaml) — the entity's own
          // folder is its dirname; there is no separate "full path" for a
          // root node, so both resolve to the folder.
          const folder = path.dirname(node.id);
          return { folder, full: folder };
      }

   **Handlers:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.copyPath',
        async (node: FileNode | LeafNode) => {
          const { folder } = resolveCopyPaths(node);
          await vscode.env.clipboard.writeText(folder);
        }
      );

      vscode.commands.registerCommand(
        'jarvis.copyFullPath',
        async (node: FileNode | LeafNode) => {
          const { full } = resolveCopyPaths(node);
          await vscode.env.clipboard.writeText(full);
        }
      );

   **Copy File Name handler** (file-child nodes only, ``ui-improvements`` CR):

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.copyFileName',
        async (node: FileNode) => {
          await vscode.env.clipboard.writeText(path.basename(node.filePath));
        }
      );

   **Copy Category Name handler** (folder/category nodes, ``ui-improvements`` CR):

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.copyCategoryName',
        async (node: FolderNode) => {
          await vscode.env.clipboard.writeText(node.name);
        }
      );

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        [
          { "command": "jarvis.copyPath", "title": "Copy Path" },
          { "command": "jarvis.copyFullPath", "title": "Copy Full Path" },
          { "command": "jarvis.copyFileName", "title": "Copy File Name" },
          { "command": "jarvis.copyCategoryName", "title": "Copy" }
        ]

   * ``contributes.menus.view/item/context``: for the 3 root-node
     ``contextValue`` patterns (``jarvisProject``, ``jarvisEvent``,
     ``viewItem =~ /^jarvisSession$/``), 3 entries — Open, Copy Path, Copy
     Full Path. For ``jarvisEntityFile``, 4 entries — Open, Copy Path, Copy
     Full Path, **Copy File Name** (``ui-improvements`` CR addition). For
     ``jarvisFolder``, a single entry — **Copy** (``jarvis.copyCategoryName``,
     ``ui-improvements`` CR addition), in its own group since there is no
     Open/Copy Path/Copy Full Path set for this node kind
     (``REQ_ENT_ENTITY_CONTEXTMENU`` AC-7/AC-9):

     .. code-block:: json

        [
          { "command": "jarvis.openEntityFile", "when": "viewItem == jarvisEntityFile", "group": "open" },
          { "command": "jarvis.copyPath", "when": "viewItem == jarvisEntityFile", "group": "clipboard@1" },
          { "command": "jarvis.copyFullPath", "when": "viewItem == jarvisEntityFile", "group": "clipboard@2" },
          { "command": "jarvis.copyFileName", "when": "viewItem == jarvisEntityFile", "group": "clipboard@3" },

          { "command": "jarvis.openAgentSession", "when": "viewItem == jarvisProject", "group": "open" },
          { "command": "jarvis.copyPath", "when": "viewItem == jarvisProject", "group": "clipboard@1" },
          { "command": "jarvis.copyFullPath", "when": "viewItem == jarvisProject", "group": "clipboard@2" },

          { "command": "jarvis.openAgentSession", "when": "viewItem == jarvisEvent", "group": "open" },
          { "command": "jarvis.copyPath", "when": "viewItem == jarvisEvent", "group": "clipboard@1" },
          { "command": "jarvis.copyFullPath", "when": "viewItem == jarvisEvent", "group": "clipboard@2" },

          { "command": "jarvis.openAgentSession", "when": "viewItem =~ /^jarvisSession$/", "group": "open" },
          { "command": "jarvis.copyPath", "when": "viewItem =~ /^jarvisSession$/", "group": "clipboard@1" },
          { "command": "jarvis.copyFullPath", "when": "viewItem =~ /^jarvisSession$/", "group": "clipboard@2" },

          { "command": "jarvis.copyCategoryName", "when": "viewItem == jarvisFolder", "group": "clipboard@1" }
        ]

     The ``jarvisProject``/``jarvisEvent``/``jarvisFolder`` entries are
     contributed by ``packages/pim/package.json``; the ``jarvisEntityFile``
     and ``jarvisSession`` entries are contributed by
     ``packages/core/package.json`` (matching the existing PIM/core split
     for other shared commands, e.g. ``jarvis.openContext``, per
     ``SPEC_ENT_OPENCONTEXT_CMD``'s design note). Note: ``jarvisFolder``
     nodes appear in both the Projects/Events trees (PIM) and the Actors
     tree (core) — Dev Engineer adds the ``jarvis.copyCategoryName`` entry
     to **both** ``packages/pim/package.json`` and
     ``packages/core/package.json`` (``viewItem == jarvisFolder`` in each),
     mirroring how other folder-node-agnostic entries are duplicated across
     the two packages. The ``jarvis.openEntityFile``/``jarvis.openAgentSession``
     entries here are additive bindings on already-registered commands — no
     new command registration for "Open".

   * ``contributes.menus.commandPalette``: hide all four new commands (they
     require a tree node argument):

     .. code-block:: json

        [
          { "command": "jarvis.copyPath", "when": "false" },
          { "command": "jarvis.copyFullPath", "when": "false" },
          { "command": "jarvis.copyFileName", "when": "false" },
          { "command": "jarvis.copyCategoryName", "when": "false" }
        ]

   **Design notes:**

   * ``jarvis.openEntityFile`` and ``jarvis.openAgentSession`` are NOT
     duplicated or re-implemented — this spec only adds new
     ``view/item/context`` bindings for them; their handlers
     (``SPEC_ENT_ENTITY_FILE_CHILDREN``, ``SPEC_ENT_AGENTSESSION``) are
     unchanged, except for ``jarvis.openEntityFile``'s ``context.md``
     rendered-preview branch — see ``SPEC_ENT_ENTITY_FILE_CHILDREN``'s
     updated handler (``ui-improvements`` CR).
   * Folder nodes (``contextValue == 'jarvisFolder'``) now show the
     single-entry "Copy" menu (``jarvis.copyCategoryName``,
     ``ui-improvements`` CR) instead of no menu at all — still excluded
     from the Open/Copy Path/Copy Full Path/Copy File Name set
     (``REQ_ENT_ENTITY_CONTEXTMENU`` AC-7).
   * ``vscode.env.clipboard.writeText()`` is the standard VS Code clipboard
     API — no OS-specific clipboard handling needed.
   * Group naming (``open``, ``clipboard@1``/``clipboard@2``/``clipboard@3``)
     follows the same numbered-suffix convention already used for
     ``inline@1``/``inline@2`` elsewhere in this file — the ``@N`` suffix
     controls order within a group, not the group's separation from others.
   * This spec does not touch the existing ``context-actions`` group
     (``SPEC_ENT_CONTEXTACTIONS`` — Reveal in Explorer/OS/Terminal); Open and
     Copy Path/Full Path/File Name are visually separate menu sections.


.. spec:: Recently Touched Files per Entity
   :id: SPEC_ENT_TOUCHEDFILES
   :status: draft
   :links: REQ_ENT_TOUCHEDFILES; SPEC_HOOK_ROUTE; SPEC_HOOK_ACTIVITY; SPEC_ENT_ENTITY_FILE_CHILDREN; SPEC_ENT_ENTITY_CONTEXTMENU; SPEC_ENG_TREEFACTORY

   **Description:**
   A new ``TouchTracker`` (``packages/core/src/engine/hooks/touchTracker.ts``)
   registers a single handler on the ``HookEngine`` (``SPEC_HOOK_ROUTE``) for
   ``PostToolUse`` only, classifies each event via an explicit ``TOUCH_RULES``
   allowlist, and persists per-entity touch lists via a new ``TouchStore``
   (``packages/core/src/engine/hooks/touchStore.ts``). A new provider-local
   node family renders the persisted data as a third category — "Recently
   Touched Files" — sibling to the "Agent"/"Files" categories from
   ``SPEC_ENT_ENTITY_FILE_CHILDREN``. This follows the same overall shape as
   ``SPEC_HOOK_ACTIVITY`` (hook-driven tracker + session-id→entity
   resolution + tree refresh), reusing its wiring pattern rather than
   inventing a new one.

   **``TOUCH_RULES`` allowlist (from the research spike, used verbatim):**

   .. code-block:: typescript

      // packages/core/src/engine/hooks/touchTracker.ts
      type TouchKind = 'read' | 'write';
      interface TouchRule { kind: TouchKind; extract: (input: any) => string[]; }

      const TOUCH_RULES: Record<string, TouchRule> = {
          read_file:                    { kind: 'read',  extract: i => [i.filePath] },
          create_file:                  { kind: 'write', extract: i => [i.filePath] },
          replace_string_in_file:       { kind: 'write', extract: i => [i.filePath] },
          multi_replace_string_in_file: { kind: 'write', extract: i => (i.replacements ?? []).map((r: any) => r.filePath) },
          // Any tool_name not listed here → ignored (fail-safe default, REQ_ENT_TOUCHEDFILES AC-2d).
      };

   **``TouchTracker`` (mirrors ``ActivityTracker``'s shape — single hook
   subscription, session-id→entity resolution, change callback):**

   .. code-block:: typescript

      // packages/core/src/engine/hooks/touchTracker.ts
      export class TouchTracker {
          constructor(
              hookEngine: HookEngine,
              private readonly _store: TouchStore,
              private readonly _resolveOwner: (entityName: string) => { kind: string; name: string; folder: string } | undefined,
              private readonly _onChange: (entityKind: string, entityName: string) => void,
              private readonly _log?: vscode.LogOutputChannel,
          ) {
              hookEngine.on('PostToolUse', (event) => { void this._handle(event); });
          }

          private async _handle(event: HookEvent): Promise<void> {
              if (!event.sessionId) { return; } // REQ_ENT_TOUCHEDFILES AC-4
              const rule = TOUCH_RULES[event.payload?.tool_name as string];
              if (!rule) { return; } // AC-2d — unknown tool, ignored
              const entityName = await getEntityNameForSessionId(event.sessionId);
              if (!entityName) { return; } // AC-4, fail-open (same as REQ_HOOK_ACTIVITY AC-9)
              const owner = this._resolveOwner(entityName);
              if (!owner) { return; }
              // Bugfix (PM F5 finding, GH #18): the storage key must disambiguate
              // 'actor' from 'session' (resolveTouchStorageKind) so two same-named
              // entities from different scan roots never collide on one JSON file.
              // onChange still receives owner.kind unchanged — that must stay the
              // real registered provider kind ('session') for refreshKind() to work.
              const storageKind = resolveTouchStorageKind(owner.kind, owner.folder);
              const cwd = event.payload?.cwd as string | undefined;
              if (!cwd) { return; }
              const absPaths: string[] = rule.extract(event.payload?.tool_input) ?? [];
              const relPaths = [...new Set(absPaths.filter(Boolean))] // dedupe, AC-2c
                  .map(p => path.relative(cwd, p).replace(/\\/g, '/')); // AC-5
              if (relPaths.length === 0) { return; }
              await this._store.recordTouches(storageKind, owner.name, relPaths, rule.kind);
              this._log?.debug(`[Touch] ${rule.kind} x${relPaths.length} -> ${storageKind}:${owner.name}`);
              this._onChange(owner.kind, owner.name);
          }
      }

   Entity-name resolution reuses ``getEntityNameForSessionId``
   (``sessionLookup.ts``, introduced by ``SPEC_HOOK_ACTIVITY``) — no new
   session-id correlation mechanism. ``_resolveOwner`` is supplied by the
   wiring in ``extension.ts`` as
   ``(name) => kindDrivenScanner.entities.find(e => e.name === name)``
   (returning ``{ kind, name, folder }`` — ``folder`` is the extra field
   needed by ``resolveTouchStorageKind()``, not required by
   ``ActivityTracker``'s equivalent lookup), the same lookup
   ``ActivityTracker``'s ``_onChange`` wiring already performs
   (``extension.ts``, alongside the existing activity-tracker
   construction) — reused here to get the ``kind``/``folder`` needed for the
   per-entity JSON filename (AC-6), which ``getEntityNameForSessionId``
   alone does not provide.

   **``TouchStore`` (persistence) — synchronous I/O, per** ``touched-files-write-race``
   **CR (GH #35), see bugfix note below:**

   .. code-block:: typescript

      // packages/core/src/engine/hooks/touchStore.ts
      interface TouchEntry { lastRead?: string; lastEdited?: string; } // ISO 8601 UTC
      interface TouchFile { files: Record<string, TouchEntry>; } // key = workspace-relative path

      export class TouchStore {
          constructor(private readonly _stateDir: string) {} // <workspaceRoot>/.jarvis/state/touched-files

          private _filePath(kind: string, name: string): string {
              // name is sanitized (existing entity-name-to-filename convention,
              // reused as-is — entity names are already filesystem-safe by
              // construction elsewhere in the codebase).
              return path.join(this._stateDir, `${kind}-${name}.json`);
          }

          async recordTouches(kind: string, name: string, relPaths: string[], touchKind: 'read' | 'write'): Promise<void> {
              const file = this._filePath(kind, name);
              const data = this._load(file);      // sync — no await between load and save
              const now = new Date().toISOString();
              for (const relPath of relPaths) {
                  const entry = data.files[relPath] ?? {};
                  if (touchKind === 'write') { entry.lastEdited = now; } else { entry.lastRead = now; }
                  data.files[relPath] = entry;
              }
              this._save(file, data);              // sync — completes before this call yields
          }

          async removeEntry(kind: string, name: string, relPath: string): Promise<void> {
              const file = this._filePath(kind, name);
              const data = this._load(file);
              delete data.files[relPath];
              this._save(file, data);
          }

          async getEntries(kind: string, name: string): Promise<Record<string, TouchEntry>> {
              return this._load(this._filePath(kind, name)).files;
          }

          private _load(file: string): TouchFile {
              try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
              catch { return { files: {} }; } // fail-open: missing/corrupt file → empty
          }

          private _save(file: string, data: TouchFile): void {
              fs.mkdirSync(path.dirname(file), { recursive: true });
              fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
          }
      }

   **Bugfix (``touched-files-write-race`` CR, GH #35 — satisfies
   REQ_ENT_TOUCHEDFILES AC-6a):** the original revision of this class used
   ``fs.promises`` (``async``/``await``) for ``_load``/``_save``. Because
   ``TouchTracker`` dispatches each ``PostToolUse`` handler fire-and-forget
   (no queueing — see the ``TouchTracker`` section above), multiple
   overlapping calls to ``recordTouches()`` for the *same* entity's JSON
   file could each reach their own ``await fs.promises.readFile(...)``,
   both observe the same pre-mutation snapshot, both mutate their own
   in-memory copy, and then both ``await fs.promises.writeFile(...)`` —
   whichever finished last silently discarded the other's changes
   (confirmed data loss, GH #35: 6 near-simultaneous tool calls in one
   turn → only 3/6 new entries survived, plus previously-persisted entries
   lost).

   The fix replaces ``_load``/``_save`` with fully **synchronous**
   ``fs.readFileSync``/``fs.writeFileSync``/``fs.mkdirSync`` calls, with no
   ``await`` anywhere between the read and the write inside
   ``recordTouches()``/``removeEntry()``. Because Node.js is single-threaded
   and a synchronous call never yields control back to the event loop, the
   entire read-mutate-write body of ``recordTouches()``/``removeEntry()``
   now executes as one uninterruptible turn — no other queued
   ``TouchTracker`` handler (or anything else) can observe or write the
   file mid-mutation, regardless of how many ``PostToolUse`` events arrive
   in the same tick. This mirrors the same, already-proven pattern used by
   ``packages/core/src/engine/sessions/messageQueue.ts``'s
   ``readQueue()``/``writeQueue()`` for the identical read-modify-write
   shape — reusing an established codebase convention rather than
   introducing a new per-key promise-chain/queue abstraction (rejected
   alternative, see Design Notes).

   Each touch is written through immediately (no batching/debounce) —
   ``PostToolUse`` frequency is bounded by agent tool-call rate (at most a
   few per second in practice), not a hot path; a brief, synchronous
   blocking write is an accepted, precedented tradeoff here (the same
   tradeoff ``messageQueue.ts`` already makes on every command-handler
   read/write), consistent with KISS (REQ_ENT_TOUCHEDFILES AC-6/AC-6a).

   **``resolveTouchStorageKind()`` — storage-key disambiguation (bugfix, PM
   F5 finding, GH #18):** ``KindDrivenScanner``'s ``additionalScanRoots``
   merges Actor entities (``actor.yaml``, under the actors folder) into the
   **same** ``'session'`` ``EntityKindConfig`` bucket as raw Session
   entities — there is no separate registered ``'actor'`` provider kind, and
   that shared ``'session'`` tag is the correct value everywhere the tree
   provider or ``refreshKind()`` is concerned (only one provider is
   registered, view id ``jarvisEntities``). It is, however, the **wrong**
   key for ``<kind>-<name>.json`` persistence (``REQ_ENT_TOUCHEDFILES``
   AC-6): a raw session and an actor that happen to share the same
   ``name`` would otherwise silently collide on one JSON file. A dedicated
   helper re-derives ``'actor'`` from the entity's actual folder instead,
   and is used on both the write path (``TouchTracker``) and the read path
   (``GenericTreeDataProvider._getLeafChildren()``/``_getTouchedCategoryChildren()``):

   .. code-block:: typescript

      // packages/core/src/engine/hooks/touchStore.ts
      export function resolveTouchStorageKind(kind: string, folder: string): string {
          if (kind !== 'session') { return kind; }
          const actorsDir = configPaths.getActorsDir();
          if (actorsDir && (folder === actorsDir || folder.startsWith(actorsDir + path.sep))) {
              return 'actor';
          }
          return kind;
      }

   Everywhere ``refreshKind()`` is called with a storage key obtained from
   ``resolveTouchStorageKind()`` (e.g. the remove-command handler below),
   the value is mapped back (``ownerKind === 'actor' ? 'session' : ownerKind``)
   before being passed to ``refreshKind()`` — that API expects a real
   registered provider kind, not a TouchStore storage key.

   **Tree node types (provider-local, alongside** ``EntityFileCategoryNode``
   **et al. from** ``SPEC_ENT_ENTITY_FILE_CHILDREN``, **same file):**

   **Bugfix (PM F5 finding, GH #18) — field deliberately named** ``ownerKind``,
   **not** ``entityKind``: ``UnifiedEntityTreeProvider``'s ``getChildren()``/
   ``getTreeItem()`` duck-type their own, unrelated ``CategoryNode`` via
   ``'entityKind' in element`` (no discriminated-union ``kind`` check). Any of
   these three new node types reaching that provider with a field literally
   named ``entityKind`` was silently misrouted as a root category node —
   wrong children resolved (via a no-args ``getChildren()`` call), wrong
   ``TreeItem`` rendered, and no exception ever thrown, matching the
   originally reported "feature unusable, no visible error" symptom. The
   field is named ``ownerKind`` on all three node types (and everywhere they
   are constructed or consumed) specifically to avoid this name collision —
   not for descriptive preference.

   .. code-block:: typescript

      interface TouchedFilesCategoryNode {
          kind: 'touchedFilesCategory';
          ownerKind: string;
          entityName: string;
      }
      interface TouchedFileFolderNode {
          kind: 'touchedFileFolder';
          relFolderPath: string; // workspace-relative
          label: string;
          entries: Record<string, TouchEntry>; // full flat entry map, for children resolution
          ownerKind: string;
          entityName: string;
      }
      interface TouchedFileLeafNode {
          kind: 'touchedFileLeaf';
          filePath: string;   // absolute — structurally compatible with EntityFileNode
                              // for jarvis.openEntityFile/resolveCopyPaths/copyFileName reuse
          label: string;
          entry: TouchEntry;
          ownerKind: string;
          entityName: string;
      }
      export type ProviderNode = /* existing union, SPEC_ENT_ENTITY_FILE_CHILDREN */
          | TouchedFilesCategoryNode | TouchedFileFolderNode | TouchedFileLeafNode;

   **Building the hierarchical tree from a flat relative-path map (new —
   the "Recently Touched Files" category has no on-disk folder to
   recursively ``readdir``, unlike "Files"; the hierarchy is derived purely
   from the recorded relative-path strings):**

   .. code-block:: typescript

      function buildTouchedFileChildren(
          entries: Record<string, TouchEntry>,
          underFolder: string, // '' at category root; a relative folder path when descending
          workspaceRoot: string, ownerKind: string, entityName: string,
      ): (TouchedFileFolderNode | TouchedFileLeafNode)[] {
          const seenFolders = new Set<string>();
          const result: (TouchedFileFolderNode | TouchedFileLeafNode)[] = [];
          for (const [relPath, entry] of Object.entries(entries)) {
              if (underFolder && !relPath.startsWith(underFolder + '/')) { continue; }
              const rest = underFolder ? relPath.slice(underFolder.length + 1) : relPath;
              const sepIndex = rest.indexOf('/');
              if (sepIndex === -1) {
                  result.push({
                      kind: 'touchedFileLeaf', label: rest, entry, ownerKind, entityName,
                      filePath: path.join(workspaceRoot, relPath),
                  });
              } else {
                  const folderName = rest.slice(0, sepIndex);
                  const relFolderPath = underFolder ? `${underFolder}/${folderName}` : folderName;
                  if (seenFolders.has(relFolderPath)) { continue; } // AC-8: one node per folder, not per file
                  seenFolders.add(relFolderPath);
                  result.push({ kind: 'touchedFileFolder', relFolderPath, label: folderName, entries, ownerKind, entityName });
              }
          }
          return result.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
      }

   This walks the flat entry map once per expansion (category root or any
   folder node) filtering by prefix — cheap for the expected touch-list
   sizes (tens to low hundreds of files per entity), no persistent
   in-memory tree structure kept between expansions (mirrors "Files"
   category's on-the-fly-only rule, ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-8).
   Because a node is only ever created for a ``relPath`` that exists in
   ``entries``, empty branches never appear — AC-8's "prune empty
   branches" falls out for free from this construction, no separate
   pruning pass needed.

   **``getChildren(element)`` additions:**

   .. code-block:: typescript

      if (element.kind === 'touchedFilesCategory') {
          const entries = await touchStore.getEntries(element.ownerKind, element.entityName);
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
          return buildTouchedFileChildren(entries, '', workspaceRoot, element.ownerKind, element.entityName);
      }
      if (element.kind === 'touchedFileFolder') {
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
          return buildTouchedFileChildren(element.entries, element.relFolderPath, workspaceRoot, element.ownerKind, element.entityName);
      }
      if (element.kind === 'touchedFileLeaf') { return []; }

   **``_getLeafChildren()`` addition (alongside the existing Agent/Files
   category push, ``SPEC_ENT_ENTITY_FILE_CHILDREN``) — storage key resolved
   via** ``resolveTouchStorageKind()`` **(bugfix, see below), not** ``this._config.kind``
   **directly:**

   .. code-block:: typescript

      const ownerKind = resolveTouchStorageKind(this._config.kind, entityFolder);
      const touchEntries = await touchStore.getEntries(ownerKind, entity?.name ?? '');
      if (Object.keys(touchEntries).length > 0) { // AC-7: omitted entirely when empty
          categoryNodes.push({ kind: 'touchedFilesCategory', ownerKind, entityName: entity!.name });
      }

   **``getTreeItem(element)`` additions:**

   .. code-block:: typescript

      if (element.kind === 'touchedFilesCategory') {
          const item = new vscode.TreeItem('Recently Touched Files', vscode.TreeItemCollapsibleState.Collapsed);
          item.contextValue = 'jarvisEntityFileCategory:touched';
          return item;
      }
      if (element.kind === 'touchedFileFolder') {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
          item.tooltip = element.relFolderPath;
          item.contextValue = 'jarvisEntityFileFolder'; // reuses the existing folder contextValue/menu
          return item;
      }
      if (element.kind === 'touchedFileLeaf') {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
          const { lastRead, lastEdited } = element.entry;
          item.tooltip = [
              lastEdited ? `Last edited: ${new Date(lastEdited).toLocaleString()}` : undefined,
              lastRead ? `Last read: ${new Date(lastRead).toLocaleString()}` : undefined,
          ].filter(Boolean).join('\n');
          item.contextValue = 'jarvisTouchedFile';
          item.command = { command: 'jarvis.openEntityFile', title: 'Open File', arguments: [element] };
          return item;
      }

   **New commands — diff and remove:**

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.diffTouchedFile',
        async (node: TouchedFileLeafNode) => {
          // Delegates to the built-in Git extension's own "Open Changes"
          // command — no custom git-uri/diff wiring. If the workspace isn't
          // a git repo, or the file is untracked/has no HEAD version, this
          // command simply does nothing observable — no special-casing,
          // per CM/user decision (REQ_ENT_TOUCHEDFILES AC-12).
          await vscode.commands.executeCommand('git.openChange', vscode.Uri.file(node.filePath));
        }
      );

      vscode.commands.registerCommand(
        'jarvis.removeTouchedFile',
        async (node: TouchedFileLeafNode) => {
          const relPath = path.relative(
              vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '', node.filePath
          ).replace(/\\/g, '/');
          await touchStore.removeEntry(node.ownerKind, node.entityName, relPath);
          // node.ownerKind is the disambiguated TouchStore storage key
          // ('actor'/'session'/'project'/'event' — see resolveTouchStorageKind);
          // refreshKind() needs the real registered provider kind instead
          // ('actor' entities are still rendered by the 'session' provider).
          engine.treeFactory.refreshKind(node.ownerKind === 'actor' ? 'session' : node.ownerKind);
        }
      );

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        [
          { "command": "jarvis.diffTouchedFile", "title": "Jarvis: Show Changes" },
          { "command": "jarvis.removeTouchedFile", "title": "Jarvis: Remove Touched File", "icon": "$(trash)" }
        ]

   * ``contributes.menus.view/item/context`` (``jarvisTouchedFile`` reuses
     the existing ``jarvis.openEntityFile``/``jarvis.copyPath``/
     ``jarvis.copyFullPath``/``jarvis.copyFileName`` bindings from
     ``SPEC_ENT_ENTITY_CONTEXTMENU`` by adding this ``contextValue`` to
     their existing ``when`` clauses, plus two new entries):

     .. code-block:: json

        [
          { "command": "jarvis.openEntityFile", "when": "viewItem == jarvisTouchedFile", "group": "open" },
          { "command": "jarvis.copyPath", "when": "viewItem == jarvisTouchedFile", "group": "clipboard@1" },
          { "command": "jarvis.copyFullPath", "when": "viewItem == jarvisTouchedFile", "group": "clipboard@2" },
          { "command": "jarvis.copyFileName", "when": "viewItem == jarvisTouchedFile", "group": "clipboard@3" },
          { "command": "jarvis.revealInExplorer", "when": "viewItem == jarvisTouchedFile", "group": "context-actions" },
          { "command": "jarvis.diffTouchedFile", "when": "viewItem == jarvisTouchedFile", "group": "diff" },
          { "command": "jarvis.removeTouchedFile", "when": "viewItem == jarvisTouchedFile", "group": "inline" }
        ]

   * ``contributes.menus.commandPalette``: hide both new commands (they
     require a tree node argument), same pattern as every other tree-only
     command in this file:

     .. code-block:: json

        [
          { "command": "jarvis.diffTouchedFile", "when": "false" },
          { "command": "jarvis.removeTouchedFile", "when": "false" }
        ]

   **Wiring (``extension.ts``, alongside the existing ``activityTracker``
   construction):**

   .. code-block:: typescript

      const touchStore = new TouchStore(path.join(workspaceRoot, '.jarvis', 'state', 'touched-files'));
      const touchTracker = new TouchTracker(
          hookEngine, touchStore,
          (entityName) => {
              const owner = kindDrivenScanner.entities.find(e => e.name === entityName);
              return owner ? { kind: owner.kind, name: owner.name, folder: path.dirname(owner.id) } : undefined;
          },
          (entityKind) => engine.treeFactory.refreshKind(entityKind),
          log,
      );

   **Design notes:**

   * **Bugfix root cause — why the field is ``ownerKind``, not
     ``entityKind`` (PM F5 finding, GH #18):** the first shipped revision of
     this spec used ``entityKind`` on all three new node types. That
     collided with ``UnifiedEntityTreeProvider``, which resolves its own
     (unrelated) root ``CategoryNode`` by duck-typing —
     ``'entityKind' in element`` — rather than switching on a discriminated
     ``kind`` field. Any ``TouchedFilesCategoryNode``/``TouchedFileFolderNode``/
     ``TouchedFileLeafNode`` value that reached that provider was silently
     misrouted as a root category node: wrong children resolved (a
     no-args ``getChildren()`` call), wrong ``TreeItem`` rendered, and — the
     dangerous part — no exception was ever thrown, so the feature simply
     looked broken/empty with nothing to debug from. Renaming the field to
     ``ownerKind`` everywhere (node types, ``buildTouchedFileChildren()``,
     ``getChildren()``, the remove-command handler, and the wiring callback)
     removes the collision at its source rather than hardening
     ``UnifiedEntityTreeProvider``'s duck-typing — the smaller, more local
     fix of the two, and consistent with not touching unrelated providers
     for a bug entirely contained in this CR's own new node types.
   * **Why ``jarvisEntityFileFolder`` is reused for touched-file folder
     nodes rather than a new contextValue:** a touched-file folder node has
     exactly the same right-click needs as a "Files" category folder node
     (none beyond what folders already get) — introducing a distinct
     contextValue would require duplicating menu bindings for zero
     behavioral difference. If a touched-file-folder-specific action is
     ever needed, splitting the contextValue is a small, isolated follow-up.
   * **Why the diff command has no fallback path:** per the confirmed
     CM/user decision (CD Level 1), a non-git workspace or untracked file
     simply produces no visible diff when ``git.openChange`` is invoked —
     this mirrors how the same action behaves in VS Code's own Source
     Control view for the same file, so the behavior is not surprising to
     users familiar with that view.
   * **Why ``TouchStore`` and ``ActivityTracker``/``sessionLookup.ts``
     don't share a persistence layer:** ``ActivityTracker``'s state is
     purely in-memory (activity is inherently transient — "active right
     now"); touched-files state is explicitly required to survive reload
     (``REQ_ENT_TOUCHEDFILES`` AC-6), so it needs its own on-disk store.
     The two remain independent, single-purpose consumers of the same
     ``HookEngine``/``getEntityNameForSessionId`` infrastructure.
   * **No file-system watcher on the persisted JSON files:** they are only
     ever written by ``TouchStore`` itself (in-process); no external
     process is expected to modify them, so no watcher is needed to detect
     external changes — consistent with the project's existing scan-driven
     (not watcher-driven) reactivity model elsewhere in the Explorer.
   * **Why synchronous I/O, not a per-key promise-chain/queue, was chosen
     to fix the write race (``touched-files-write-race`` CR, GH #35):** a
     per-entity-key promise chain (each call awaits the previous call's
     promise for the same key before starting its own read-mutate-write)
     would also fix the race, but introduces a new abstraction (a map of
     in-flight promises keyed by storage file, with its own lifecycle/
     cleanup concerns) for a problem the codebase already has a simpler,
     proven answer to — synchronous I/O, as used by ``messageQueue.ts``
     for the same read-modify-write shape. Given the write is small and
     infrequent (bounded by agent tool-call rate, not a hot path), the
     brief event-loop block from synchronous ``fs`` calls is preferable to
     a new concurrency-control abstraction — consistent with this
     project's established KISS bias and its own existing precedent for
     the identical problem shape.

   **Acceptance Criteria:**

   1. ``TouchTracker`` registers exactly one handler, for ``PostToolUse``
      only (``SPEC_HOOK_ROUTE``'s ``on()``) — no other lifecycle event is
      subscribed to.
   2. Classification uses the ``TOUCH_RULES`` table verbatim from the
      research spike; any ``tool_name`` absent from the table is ignored,
      with no heuristic path-sniffing fallback.
   3. Entity resolution reuses ``getEntityNameForSessionId``
      (``sessionLookup.ts``, unchanged) plus a kind lookup via
      ``kindDrivenScanner.entities.find()`` — no new session-id
      correlation mechanism is introduced.
   4. ``TouchStore`` persists one JSON file per entity at
      ``.jarvis/state/touched-files/<kind>-<name>.json``, written through
      immediately on every touch (no batching), and tolerates a
      missing/corrupt file by treating it as empty (fail-open).
   5. (``touched-files-write-race`` CR, GH #35 — REQ_ENT_TOUCHEDFILES
      AC-6a) ``TouchStore``'s ``_load``/``_save`` SHALL use synchronous
      ``fs`` calls (``readFileSync``/``writeFileSync``/``mkdirSync``) with
      no ``await`` between the read and the write inside
      ``recordTouches()``/``removeEntry()`` — guaranteeing the
      read-mutate-write critical section cannot be interleaved by another
      overlapping call for the same entity, regardless of how many
      ``PostToolUse`` events arrive in the same tick.
   6. The "Recently Touched Files" category node is included in
      ``_getLeafChildren()`` output if and only if the entity's touch map
      is non-empty; otherwise omitted entirely.
   7. The category's children are computed by walking the flat
      ``relPath -> TouchEntry`` map on every expansion (never cached
      between expansions) — grouped into one folder node per distinct
      path segment and one leaf node per file, with empty branches never
      constructed in the first place (see Design Notes).
   8. Clicking a touched-file leaf invokes the existing
      ``jarvis.openEntityFile`` command unchanged — no new open-file
      command is introduced; the node's ``filePath``/``label`` shape is
      structurally compatible with the command's existing parameter type.
   9. Each touched-file leaf's tooltip shows last-edited and/or last-read,
      whichever are set, with no separate child node.
   10. Right-click on a touched-file leaf shows Open, Copy Path, Copy Full
       Path, Copy File Name, Reveal in Explorer (all reused, unchanged
       handlers), plus a new **Show Changes** entry
       (``jarvis.diffTouchedFile`` → ``git.openChange``, no fallback
       handling) and an inline trash icon (``jarvis.removeTouchedFile``).
   11. ``jarvis.removeTouchedFile`` deletes exactly the clicked entry from
       the entity's JSON file and triggers a ``refreshKind()`` for that
       entity's kind only — not a full-tree rescan.
   12. This spec introduces no changes to ``SPEC_ENT_ENTITY_FILE_CHILDREN``'s
       "Agent"/"Files" categories or to ``SPEC_HOOK_ACTIVITY``'s
       ``ActivityTracker``/``ActivityDecorator``.


.. spec:: Open Context File Command — Retired
   :id: SPEC_ENT_OPENCONTEXT_CMD
   :status: draft
   :links: REQ_ENT_OPENCONTEXT; REQ_ACT_OPENCONTEXT; SPEC_ENT_OPENYAML_CMD; SPEC_ENT_AGENTSESSION; SPEC_EXP_EXTENSION; SPEC_ENT_ENTITY_CONTEXTMENU

   **Retired (entity-tree-context-menu CR, PM decision 2026-07-02):**
   ``jarvis.openContext`` is fully retired — the command registration, its
   handler, and all ``package.json`` contributions are removed entirely, not
   just its inline menu placement. ``context.md`` is reachable via the
   entity's expandable file children (``jarvis.openEntityFile``,
   ``REQ_ENT_ENTITY_FILE_CHILDREN``). Zero remaining callers confirmed
   before retirement (verified via ``get_need_links.py``).

   **Historical description** (kept for traceability): a single command
   ``jarvis.openContext`` resolved and opened the ``context.md`` file
   associated with a project, event, or actor leaf item using a 3-step
   discovery process (direct hit → one-level subfolder search → QuickPick
   if multiple matches → information message if none found). It was the
   one shared command for all 3 entity kinds — there was no per-kind
   variant (``jarvis.openSessionContext`` was retired in the
   ``entity-open-context-cleanup`` CR; see ``SPEC_ACT_TREECLICK``). It
   never created a file as a side effect (no auto-create — see
   ``SPEC_ACT_TREECLICK``'s "Auto-create decision" for the rationale,
   which remains a valid historical design decision independent of this
   retirement).

   **Historical handler** (to be deleted from ``extension.ts`` by Dev
   Engineer, not modified — algorithm kept here for reference only):

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openContext',
        async (element: LeafNode) => {
          const folder = path.dirname(element.id);
          const direct = path.join(folder, 'context.md');
          if (fs.existsSync(direct)) {
            await vscode.window.showTextDocument(vscode.Uri.file(direct), { preview: false });
            return;
          }
          const candidates: string[] = [];
          try {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
              if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
              const candidate = path.join(folder, entry.name, 'context.md');
              if (fs.existsSync(candidate)) { candidates.push(candidate); }
            }
          } catch { /* entity folder unreadable — fall through to "not found" */ }
          if (candidates.length === 1) {
            await vscode.window.showTextDocument(vscode.Uri.file(candidates[0]), { preview: false });
            return;
          }
          if (candidates.length > 1) {
            const items = candidates.map(c => ({
              label: path.relative(folder, c).replace(/\\/g, '/'),
              fullPath: c
            }));
            const pick = await vscode.window.showQuickPick(items, {
              placeHolder: 'Multiple context.md found — pick one'
            });
            if (pick) {
              await vscode.window.showTextDocument(vscode.Uri.file(pick.fullPath), { preview: false });
            }
            return;
          }
          vscode.window.showInformationMessage('No context.md found for this entity');
        }
      );

   **Removal (code, this CR):**

   * ``src/extension.ts``: delete the ``jarvis.openContext`` command
     registration and its ``context.subscriptions.push(...)`` entry entirely.
   * ``packages/core/package.json`` and ``packages/pim/package.json``: delete
     the ``jarvis.openContext`` entry from ``contributes.commands`` and its
     ``commandPalette`` ``"when": "false"`` entry. Its ``view/item/context``
     entries were already removed from the menu section by the earlier
     revision of this CR.
