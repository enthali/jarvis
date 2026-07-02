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

.. spec:: Open YAML Command
   :id: SPEC_ENT_OPENYAML_CMD
   :status: implemented
   :links: REQ_ENT_OPENYAML

   **Description:**
   A command ``jarvis.openYamlFile`` opens the YAML file associated with a tree leaf item.

   **Handler:**

   The command receives the selected ``LeafNode`` as its argument (VS Code passes the
   element from the ``TreeDataProvider`` when the inline action is triggered).

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openYamlFile', (element: LeafNode) => {
          const uri = vscode.Uri.file(element.id);
          vscode.commands.executeCommand('vscode.open', uri);
      });

   **Registration in package.json:**

   * ``contributes.commands``: ``jarvis.openYamlFile`` with title "Open YAML File"
     and icon ``$(go-to-file)``
   * ``contributes.menus.view/item/context``: two entries, both with ``group: "inline"``

     .. code-block:: json

        [
          {
            "command": "jarvis.openYamlFile",
            "when": "viewItem == jarvisProject",
            "group": "inline"
          },
          {
            "command": "jarvis.openYamlFile",
            "when": "viewItem == jarvisEvent",
            "group": "inline"
          }
        ]


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
     appears on all ``jarvisProject`` and ``jarvisEvent`` items alongside the
     existing ``$(go-to-file)`` button
   * No changes to ``yamlScanner.ts`` — uses existing ``entity.name`` from the
     entity store
   * ``openAtMain`` (``SPEC_MSG_EDITORPLACEMENT``) replaces the prior
     ``openPinnedResource`` call for the existing-session branch: the tab is
     always found and, if necessary, closed and reopened at column 1 rather
     than merely focused wherever it happens to be (``REQ_ENT_AGENTSESSION``
     AC-6 — guaranteed)
   * The fresh-session-creation branch (``openNewChatEditor`` /
     ``renameFocusedChatSession``) is unchanged — a newly created chat editor
     is born in the currently active column, which for a user-initiated click
     is already Main in the common case; this is **best-effort, not
     guaranteed** (``REQ_ENT_AGENTSESSION`` AC-7) — VS Code exposes no API to
     force the view column of a chat editor at creation time, so no explicit
     re-placement step is added here
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
   ``jarvis_createProject``, ``jarvis_createEvent``, ``jarvis_createSession``
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


.. spec:: Uniform Inline Icons for All Entities
   :id: SPEC_ENT_ENTITY_ICONS
   :status: draft
   :links: REQ_ENT_ENTITY_ICONS; SPEC_EXP_EXTENSION; SPEC_EXP_PROVIDER; SPEC_ENT_CONTEXTACTIONS

   **Description:**
   Every leaf node across all three entity types (project, event, actor) SHALL
   display two inline icons: YAML and context.md. No recording icon is shown.

   **Icon identifiers and commands:**

   .. list-table::
      :header-rows: 1
      :widths: 20 20 25 35

      * - Icon
        - Codicon
        - Command
        - Purpose
      * - YAML
        - ``$(go-to-file)``
        - ``jarvis.openYaml``
        - Opens the entity's convention YAML file
      * - context.md
        - ``$(notebook)``
        - ``jarvis.openContext``
        - Opens ``context.md`` in the entity's folder

   **Icon order** (left to right in the tree item inline area):

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

   **Manifest entries** (``package.json`` ``contributes.menus.view/item/context``):

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

   1. Every leaf node shows ``$(go-to-file)`` inline icon for opening the
      entity YAML file.
   2. Every leaf node shows ``$(notebook)`` inline icon for opening
      ``context.md``.
   3. Icon order (left to right): ``$(notebook)``, ``$(go-to-file)``.
   4. The ``$(record)`` icon SHALL NOT appear on any entity tree item,
      regardless of whether a ``recording/`` subfolder exists.
   5. No ``jarvis.openRecording`` command exists in ``package.json`` or is
      registered at runtime.
   6. No ``+recording`` suffix is appended to any ``contextValue``.
   7. All three entity kinds (project, event, actor) use the same icon set
      — no kind-specific branching.
   8. Actor nodes already have these icons; this spec extends the pattern to
      project and event nodes.
   9. Start/stop recording inline icons (``jarvis.startRecording``,
      ``jarvis.stopRecording``) and active-recording highlight remain
      unchanged — this removal targets only the dead "Open Recording" icon.

   **Note:** v0.7.0 entity-parity risk #1 (``jarvis.hasRecording`` context-key
   trigger never formalized) is resolved by this removal — the context key and
   its folder-scan trigger no longer exist.


.. spec:: Entity File Children in Tree
   :id: SPEC_ENT_ENTITY_FILE_CHILDREN
   :status: approved
   :links: REQ_ENT_ENTITY_FILE_CHILDREN; SPEC_EXP_PROVIDER; SPEC_ACT_TREE; SPEC_ENT_TREECLICK; SPEC_ACT_AGENT_DISCOVERY; SPEC_MSG_EDITORPLACEMENT; SPEC_PRJ_LISTPROJECTS

   **Description:**
   Every project, event, and actor leaf node becomes expandable and shows
   up to 3 file children computed on-the-fly (not cached in
   ``YamlScanner``): ``context.md``, the entity's YAML config file, and the
   shared agent-mode file resolved via ``discoverAgentModes()``
   (``SPEC_ACT_AGENT_DISCOVERY``) when the entity has a non-empty ``agent``
   field. The agent file is a **shared** file — multiple entities with the
   same ``agent`` value point to the same path (e.g. several Actor
   entities bound to ``agent: "Test Manager"`` all show the same
   ``.github/agents/test-agent.agent.md`` child, resolved by matching
   frontmatter ``name:``, not filename). This is purely additive: existing
   inline icons, context-menu actions, and the entity-node click-to-chat
   command are unchanged.

   **Amendment note:** An earlier revision of this spec constructed the
   agent-file path as
   ``path.join(workspaceRoot, '.github', 'agents', \`${entity.agent}.agent.md\`)``
   — assuming ``entity.agent`` (the frontmatter ``name:`` identity) is also
   the filename. This is false: filename and frontmatter ``name:`` are
   independent (e.g. frontmatter ``name: Test Manager`` but file
   ``.github/agents/test-agent.agent.md``). Confirmed broken in Dev Host
   testing ("Cannot open file" on click). The corrected mechanism below
   reuses ``discoverAgentModes()`` (``SPEC_ACT_AGENT_DISCOVERY``), which
   already performs this exact identity-to-file resolution for the agent
   picker.

   **New TreeNode variant** (added to ``src/yamlScanner.ts``, shared by all
   three TreeDataProviders):

   .. code-block:: typescript

      interface FileNode {
          kind: 'file';
          filePath: string;   // absolute path, forward-slash normalized for tooltip
          label: string;      // basename shown as the tree item label
      }

      type TreeNode = FolderNode | LeafNode | FileNode;

   **Agent-file resolution** (module-level cache in ``src/extension.ts`` —
   agent files are static configuration for the lifetime of the extension
   host session, so the underlying ``discoverAgentModes()`` filesystem scan
   is cached rather than re-run on every tree expansion):

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
      ): Promise<FileNode | undefined> {
          if (!entityAgent) { return undefined; }
          const modes = await getAgentModesCached();
          const match = modes.find(m => m.name === entityAgent);
          if (!match) { return undefined; } // fail-open: unresolved identity → no agent-file child
          return {
              kind: 'file',
              filePath: path.join(workspaceRoot, match.filePath),
              label: path.basename(match.filePath),
          };
      }

   **File-children computation** (local helper, shared by all three
   providers — added to ``src/yamlScanner.ts`` as an exported function so it
   is not duplicated three times):

   .. code-block:: typescript

      export async function getEntityFileChildren(
          leaf: LeafNode,
          entity: EntityEntry | undefined
      ): Promise<FileNode[]> {
          const folder = path.dirname(leaf.id);
          const children: FileNode[] = [
              { kind: 'file', filePath: path.join(folder, 'context.md'), label: 'context.md' },
              { kind: 'file', filePath: leaf.id, label: path.basename(leaf.id) },
          ];
          const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
          const agentFile = await resolveAgentFileChild(entity?.agent, workspaceRoot);
          if (agentFile) {
              children.push(agentFile);
          }
          return children;
      }

   ``leaf.id`` is always the path to the entity's YAML config file (existing
   convention — see ``SPEC_EXP_PROVIDER``), so the YAML child requires no
   extra lookup. ``resolveAgentFileChild()`` and ``getAgentModesCached()``
   live in ``src/extension.ts`` (same module as ``discoverAgentModes()``,
   per ``SPEC_ACT_AGENT_DISCOVERY``) and are imported by
   ``getEntityFileChildren()``.

   **Provider changes** (``ProjectTreeProvider``, ``EventTreeProvider``,
   ``SessionTreeProvider`` — identical change in all three):

   ``getChildren(element)`` (now ``async`` — ``vscode.TreeDataProvider.getChildren``
   already supports ``Thenable<T[]>`` as a return type, no interface change needed):

   .. code-block:: typescript

      async getChildren(element?: TreeNode): Promise<TreeNode[]> {
          if (element?.kind === 'leaf') {
              const entity = scanner.getEntity(element.id);
              return getEntityFileChildren(element, entity);
          }
          if (element?.kind === 'file') {
              return [];
          }
          // ...existing root / FolderNode branches unchanged...
      }

   ``getTreeItem(element)``:

   .. code-block:: typescript

      if (element.kind === 'file') {
          const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
          item.tooltip = element.filePath.replace(/\\/g, '/');
          item.contextValue = 'jarvisEntityFile';
          item.command = {
              command: 'jarvis.openEntityFile',
              title: 'Open File',
              arguments: [element]
          };
          return item;
      }
      // LeafNode branch (existing) — collapsibleState changes:
      const item = new vscode.TreeItem(name, vscode.TreeItemCollapsibleState.Collapsed);
      // ...existing label/tooltip/contextValue/command assignment unchanged...

   **New command — ``jarvis.openEntityFile``** (registered once in
   ``extension.ts``, shared by all three providers):

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openEntityFile',
        async (node: FileNode) => {
          const uri = vscode.Uri.file(node.filePath);
          try {
            await vscode.workspace.openTextDocument(uri); // validates existence first
            // Docs placement: fixed column 2, focus-in-place if already open
            // elsewhere (SPEC_MSG_EDITORPLACEMENT)
            await openAtDocs(uri);
          } catch {
            vscode.window.showWarningMessage(`Jarvis: Cannot open file: ${node.filePath}`);
          }
        }
      );

   Fail-open per ``REQ_ENT_ENTITY_FILE_CHILDREN`` AC-7: a missing file (e.g.
   ``context.md`` not yet created, or no matching ``.agent.md``) shows a
   warning notification instead of throwing or creating the file. No
   auto-creation — this command is read/navigate-only.

   **Registration in package.json:**

   * ``contributes.commands``:

     .. code-block:: json

        { "command": "jarvis.openEntityFile", "title": "Jarvis: Open Entity File" }

   * ``contributes.menus.commandPalette``: hidden (``"when": "false"``) —
     reachable only via tree-item click, same pattern as
     ``jarvis.openHeartbeatJob`` (``SPEC_EXP_HEARTBEAT_OPENFILE``).
   * No ``view/item/context`` menu entries are added for
     ``jarvisEntityFile`` — file children expose no context-menu actions in
     this CR (right-click on a file child shows the default VS Code
     tree-item context menu only, i.e. nothing custom).

   **Acceptance Criteria:**

   1. ``TreeNode`` gains a ``FileNode`` variant with ``kind: 'file'``,
      ``filePath``, and ``label``.
   2. ``getEntityFileChildren()`` is exported from ``src/yamlScanner.ts`` and
      reused by all three TreeDataProviders — no duplicated logic.
   3. Every leaf node's ``collapsibleState`` changes from ``None`` to
      ``Collapsed`` in all three providers.
   4. File children are computed on-the-fly in ``getChildren()`` — not
      stored in the scanner's cache or in ``YamlScanner``'s tree structures.
   5. The agent-file child is included only when ``entity.agent`` is a
      non-empty string **and** ``discoverAgentModes()`` resolves it to a
      matching ``AgentModeEntry`` (by frontmatter ``name:`` identity, not
      filename); its path is the resolved entry's ``filePath`` joined to
      ``workspaceRoot``. If ``entity.agent`` does not resolve to any known
      agent, the agent-file child is omitted (fail-open, no error).
   6. ``discoverAgentModes()`` results SHALL be cached at module level for
      the lifetime of the extension host session — the underlying
      filesystem scan SHALL NOT re-run on every tree expansion.
   7. Clicking a file child invokes ``jarvis.openEntityFile``, which opens
      the file at the fixed Docs column (column 2), focusing an already-open
      tab in place if the file is open elsewhere (``SPEC_MSG_EDITORPLACEMENT``),
      or shows a warning if the file does not exist. No file is created as a
      side effect.
   8. File child tooltip shows the full absolute path with forward slashes.
   9. File child ``contextValue`` is ``jarvisEntityFile`` (distinct from
      ``jarvisProject`` / ``jarvisEvent`` / ``jarvisSession`` / ``jarvisFolder``)
      so it is excluded from all existing entity-node context-menu ``when``-clauses.
   10. No existing inline icon, context-menu entry, or entity-node
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


.. spec:: Open Context File Command
   :id: SPEC_ENT_OPENCONTEXT_CMD
   :status: draft
   :links: REQ_ENT_OPENCONTEXT; REQ_ACT_OPENCONTEXT; SPEC_ENT_OPENYAML_CMD; SPEC_ENT_AGENTSESSION; SPEC_EXP_EXTENSION

   **Description:**
   A single command ``jarvis.openContext`` resolves and opens the
   ``context.md`` file associated with a project, event, **or actor** leaf
   item using a 3-step discovery process. This is the one shared command
   for all 3 entity kinds — there is no per-kind variant
   (``jarvis.openSessionContext`` was retired in the
   ``entity-open-context-cleanup`` CR; see ``SPEC_ACT_TREECLICK``). If no
   file is found, an information message is shown; the command never
   creates a file as a side effect.

   **Handler:**

   The command receives the selected ``LeafNode`` as its argument (VS Code
   passes the element from the ``TreeDataProvider`` when the inline action is
   triggered).

   .. code-block:: typescript

      vscode.commands.registerCommand(
        'jarvis.openContext',
        async (element: LeafNode) => {
          const folder = path.dirname(element.id);

          // Step 1: direct hit
          const direct = path.join(folder, 'context.md');
          if (fs.existsSync(direct)) {
            await vscode.window.showTextDocument(vscode.Uri.file(direct), { preview: false });
            return;
          }

          // Step 2: one-level subfolder search (hidden folders excluded)
          const candidates: string[] = [];
          try {
            for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
              if (!entry.isDirectory() || entry.name.startsWith('.')) { continue; }
              const candidate = path.join(folder, entry.name, 'context.md');
              if (fs.existsSync(candidate)) {
                candidates.push(candidate);
              }
            }
          } catch {
            // entity folder unreadable — fall through to "not found"
          }

          if (candidates.length === 1) {
            // Step 2a: exactly one match — open without prompting
            await vscode.window.showTextDocument(vscode.Uri.file(candidates[0]), { preview: false });
            return;
          }

          if (candidates.length > 1) {
            // Step 3: multiple matches — let user pick
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

          // Step 4: nothing found
          vscode.window.showInformationMessage('No context.md found for this entity');
        }
      );

   **Registration in package.json:**

   * ``contributes.commands``: ``jarvis.openContext`` with title
     "Jarvis: Open Context" and icon ``$(notebook)``

     .. code-block:: json

        {
          "command": "jarvis.openContext",
          "title": "Jarvis: Open Context",
          "icon": "$(notebook)"
        }

   * ``contributes.menus.view/item/context``: two entries, both with
     ``group: "inline"``

     .. code-block:: json

        [
          {
            "command": "jarvis.openContext",
            "when": "viewItem == jarvisProject",
            "group": "inline"
          },
          {
            "command": "jarvis.openContext",
            "when": "viewItem == jarvisEvent",
            "group": "inline"
          },
          {
            "command": "jarvis.openContext",
            "when": "viewItem =~ /^jarvisSession$/",
            "group": "inline@1"
          }
        ]

   * ``contributes.menus.commandPalette``: hide from Command Palette (the
     command requires a ``LeafNode`` argument and would fail without one)

     .. code-block:: json

        [
          {
            "command": "jarvis.openContext",
            "when": "false"
          }
        ]

   **Design notes:**

   * Same inline-button pattern as ``SPEC_ENT_OPENYAML_CMD`` and
     ``SPEC_ENT_AGENTSESSION`` — three icons will be shown on leaf nodes:
     ``$(go-to-file)``, ``$(comment-discussion)``, and ``$(notebook)``
   * The Project/Event menu entries are contributed by the PIM package
     (``packages/pim/package.json``); the Actor (``jarvisSession``) entry is
     contributed by the core package (``packages/core/package.json``). Both
     invoke the same ``jarvis.openContext`` command registered once in core.
   * ``fs.existsSync()`` is used synchronously for all existence checks — this
     is acceptable because the subfolder count is small (project/event folders
     typically contain fewer than 20 entries)
   * ``fs.readdirSync`` with ``{ withFileTypes: true }`` avoids a second stat
     call to determine whether an entry is a directory
   * Hidden subfolders (names starting with ``.``) are excluded to avoid
     scanning ``.git``, ``.vscode``, and similar tool directories
   * Discovery is limited to exactly one level of depth — no recursion — to
     keep the search predictable and fast
   * The QuickPick label uses a forward-slash-normalised relative path so it
     looks consistent on Windows and macOS (e.g. ``pm/context.md``)
   * If the entity folder itself cannot be read (permissions, missing dir),
     the ``readdirSync`` error is silently swallowed and the "not found"
     info message is shown — no error dialog is raised
   * The ``$(notebook)`` icon visually suggests "documentation" or "notes" and
     is distinct from the existing icons
   * No tree provider changes required — purely a command + menu contribution
   * ``{ preview: false }`` is passed on every ``showTextDocument()`` call so
     opening ``context.md`` never reuses/clobbers a preview tab, consistent
     across all 3 entity kinds (entity-open-context-cleanup CR)
   * No auto-creation of ``context.md`` occurs on any kind — see
     ``SPEC_ACT_TREECLICK``'s "Auto-create decision" for the rationale
