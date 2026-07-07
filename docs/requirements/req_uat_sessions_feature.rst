Sessions Feature UAT Requirements
==================================

.. req:: Sessions Tree View UAT Requirements
   :id: REQ_UAT_ACT_TREE
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_TOGGLE; REQ_ACT_TREE; REQ_ACT_SCHEMA; REQ_ACT_OPENCONTEXT

   **Description:**
   The Sessions tree view behaviour — toggle gating, folder configuration, alphabetical
   ordering, node clicks, and context-menu entries — SHALL be verifiable through manual
   test scenarios T-1 through T-4 and T-6.

   **Test Data Requirements:**

   * Two sample sessions in ``testdata/.jarvis/sessions/``:

     * ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` — ``name: copilot-cm``,
       ``summary: "Change Manager session"``.
     * ``testdata/.jarvis/sessions/copilot-cm/context.md`` — minimal markdown header.
     * ``testdata/.jarvis/sessions/dev-feature-x/session.yaml`` — ``name: dev-feature-x``,
       ``summary: "Working on feature X"``.
     * ``testdata/.jarvis/sessions/dev-feature-x/context.md`` — minimal markdown header.

   **Acceptance Criteria:**

   * AC-1: With ``jarvis.sessions.enabled=true`` (default) the Sessions view SHALL
     be present in the Jarvis sidebar; disabling it without reload SHALL hide the
     view; re-enabling SHALL show it again (T-1).
   * AC-2: The Sessions tree SHALL display ``copilot-cm`` and ``dev-feature-x``
     from ``testdata/.jarvis/sessions/`` in alphabetical order, without any
     folder configuration (T-2).
   * AC-3: Clicking a session node SHALL open its ``context.md`` in the editor (T-3).
   * AC-4: Right-clicking a session node SHALL show all five context-menu entries:
     **Open Context**, **Open Agent Session**, **Reveal in Explorer**,
     **Reveal in OS**, and **Open in Terminal** (T-4).
   * AC-5: A ``session.yaml`` with missing ``name`` field SHALL produce a YAML schema
     validation error in the Problems panel (T-6).
   * AC-6: (actor-terminology-rename CR) The tree view's display name, the
     ``jarvis.newSession``/``jarvis.openAgentSession`` command titles, and the
     settings-group title/descriptions SHALL use "Actor" terminology, per
     ``REQ_ACT_TREE`` AC-7/AC-8/AC-9 (T-12).
   * AC-7: (actor-terminology-rename CR) The view ID (``jarvisSessions``),
     command IDs (``jarvis.newSession``, ``jarvis.openAgentSession``), setting
     key (``jarvis.sessions.enabled``), and storage path
     (``.jarvis/sessions/``) SHALL remain unchanged by the terminology rename
     (negative test, T-13).
   * AC-8: (actor-internal-identifiers-rename CR) The view ID SHALL be
     ``jarvisActors`` (not ``jarvisSessions``), the command ID
     ``jarvis.newSession`` SHALL be renamed to ``jarvis.newActor``, the
     command ID ``jarvis.openAgentSession`` SHALL remain unchanged, and its
     title SHALL be corrected from "Jarvis: Open Actor Chat" to
     "Jarvis: Open Agent Chat" (entity-neutral, same across Project/Event/Actor).
     The previous keybindings and tree-collapse state SHALL be reset to
     defaults as a one-time side effect of the ID changes (T-14, T-15, T-16).


.. req:: Sessions New Entity UAT Requirements
   :id: REQ_UAT_ACT_NEWENTITY
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_NEWENTITY

   **Description:**
   The extension of ``jarvis.newEntity`` to include a **Session** option SHALL be
   verifiable through manual test scenario T-5.

   **Test Data Requirements:**

   * The ``testdata/.jarvis/sessions/`` folder must exist (created on demand by
     ``ensureSessionsDir()`` when running T-5).

   **Acceptance Criteria:**

   * AC-1: The ``jarvis.newEntity`` QuickPick SHALL display exactly three options:
     **Project**, **Event**, and **Session** (T-5).
   * AC-2: Selecting **Session** and completing the prompts SHALL create a folder
     ``<workspace>/.jarvis/sessions/<name-slug>/`` containing ``session.yaml``
     (with the provided ``name`` and ``summary``) and ``context.md`` (T-5).
   * AC-3: The newly created session node SHALL appear in the Sessions tree
     immediately after creation, without a manual reload (T-5).
   * AC-4: After creation, a new Copilot chat session SHALL open automatically
     with the identity prompt described in ``REQ_ACT_AGENTPROMPT`` (T-5, T-11).
   * AC-5: The Sessions view title ``+`` button (``jarvis.newSession``) SHALL
     trigger the same creation flow as T-5 without going through the QuickPick
     (T-5a). The command SHALL be absent from the Command Palette.


.. req:: Sessions LM/MCP Tool UAT Requirements
   :id: REQ_UAT_ACT_TOOL
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_LISTTOOL

   **Description:**
   The ``jarvis_listSessionEntities`` LM+MCP tool registration and output SHALL be
   verifiable through manual test scenarios T-7 and T-8.

   **Test Data Requirements:**

   * Same two sample sessions as REQ_UAT_ACT_TREE.
   * ``jarvis.mcp.enabled=true`` for T-8 (MCP port listening).

   **Acceptance Criteria:**

   * AC-1: In an agent chat, invoking ``#listSessionEntities`` SHALL return
     both sample sessions with ``name``, ``summary``, and folder path (T-7).
   * AC-2: When ``jarvis.mcp.enabled=true``, the tool SHALL be accessible via the
     MCP endpoint and return the same data as the LM tool call (T-8).
   * AC-3: No error SHALL appear in the Jarvis output channel during tool calls (T-7,
     T-8).


.. req:: Sessions Feature Toggle UAT Requirements
   :id: REQ_UAT_ACT_TOGGLE
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_TOGGLE

   **Description:**
   The independence of the Sessions feature from Projects/Events and the gating of
   tool registration by ``jarvis.sessions.enabled`` SHALL be verifiable through manual
   test scenarios T-9 and T-10.

   **Test Data Requirements:**

   * ``jarvis.projects.enabled=false`` and ``jarvis.events.enabled=false`` for T-10.
   * ``jarvis.sessions.enabled=false`` for T-9.

   **Acceptance Criteria:**

   * AC-1: With ``jarvis.sessions.enabled=false`` and a reload, ``jarvis_listSessionEntities``
     SHALL NOT appear in the agent tool autocomplete (T-9).
   * AC-2: Re-enabling ``jarvis.sessions.enabled`` and reloading SHALL restore the tool
     in the autocomplete (T-9).
   * AC-3: With ``jarvis.projects.enabled=false`` and ``jarvis.events.enabled=false``,
     the Sessions view SHALL still be present and the tool SHALL return sessions
     without error (T-10).


.. req:: Agent-Session Identity Prompt UAT Requirements
   :id: REQ_UAT_ACT_AGENTPROMPT
   :status: implemented
   :priority: required
   :links: US_UAT_ACT_SESSIONS; REQ_ACT_AGENTPROMPT

   **Description:**
   The identity prompt sent by ``jarvis.openAgentSession`` when creating a new chat
   session SHALL be verifiable through manual test scenario T-11.

   **Test Data Requirements:**

   * A newly created session entity (e.g. ``test-session`` from T-5 or
     ``btn-session`` from T-5a) where no prior chat session exists.

   **Acceptance Criteria:**

   * AC-1: The first message in the auto-opened chat SHALL start with
     ``You are the session "<name>"`` (T-11).
   * AC-2: The message SHALL contain the absolute path of ``context.md`` as an
     inline code span (backtick-quoted) (T-11).
   * AC-3: The message SHALL instruct the agent to read and update ``context.md``
     as persistent memory (T-11).
   * AC-4: The same prompt structure SHALL apply to project and event entities
     (``You are the project/event "<name>"``), verified by opening a new agent
     session on a project node (T-11).
