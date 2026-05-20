Session Tree Click Behaviour User Acceptance Tests
===================================================

.. story:: Session Tree Click Behaviour Acceptance Tests
   :id: US_UAT_SESSIONTREECLICK
   :status: draft
   :priority: required
   :links: US_SES_TREECLICK

   **As a** Jarvis Test Engineer working in the Extension Development Host
   with the Sessions Tree visible,
   **I want** a set of manual acceptance test scenarios for the inverted
   click semantics of session tree items,
   **so that** I can verify that a single click on a session node opens the
   agent-chat editor, that ``context.md`` is reachable via a dedicated inline
   icon, that double-click is indistinguishable from single click, that the
   legacy context-menu is untouched, that legacy-session resilience works, and
   that both pre-existing and programmatically created sessions behave
   consistently.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a single click on a session node in the
     Sessions Tree opens (or activates) the agent-chat editor, identical to
     invoking ``jarvis.openAgentSession`` manually (maps to REQ AC-1 / T-1).
   * AC-2: A test verifies that the inline icon is visible on hover, that its
     tooltip reads exactly ``"Open context.md"``, and that it is rendered on
     every ``jarvisSession`` leaf node (maps to REQ AC-3 / T-2).
   * AC-3: A test verifies that clicking the inline icon opens ``context.md``
     in a non-preview (sticky) editor tab, and that the agent-chat editor is
     **not** opened by this action (maps to REQ AC-2 + AC-3 / T-3).
   * AC-4: A test verifies that a double-click on a session node produces the
     same outcome as a single click — agent chat opens, not ``context.md``,
     and not two separate chats (maps to REQ AC-4 / T-4).
   * AC-5: A test verifies that the right-click context menu on a session node
     still contains all five expected entries: ``Open Context``,
     ``Open Agent Session``, ``Reveal in Explorer``, ``Reveal in OS``, and
     ``Open in Terminal`` (maps to REQ AC-5 / T-5).
   * AC-6: A test verifies that deleting ``context.md`` from a session folder
     and then clicking the inline icon causes the file to be recreated with the
     standard template (``# <session-name>`` heading + blank line) before
     opening in the editor (maps to REQ AC-6 / T-6).
   * AC-7: A regression test verifies that pre-existing sessions
     ``copilot-cm`` and ``dev-feature-x`` (present in ``testdata/`` before
     this CR) exhibit the new click semantics without modification of their
     ``context.md`` or ``session.yaml`` (maps to REQ AC-1 through AC-6 /
     T-7).
   * AC-8: A cross-CR sanity test verifies that a session freshly created via
     ``jarvis_createSession`` also exhibits the new click semantics
     immediately after creation, confirming that all session leaves are treated
     uniformly by the tree provider (maps to REQ AC-1 + AC-2 / T-8).

   **Test Scenarios (summary):**

   * T-1: Single click on session name → agent-chat editor opens / activates.
   * T-2: Hover over session node → inline icon appears; tooltip reads
     ``"Open context.md"``.
   * T-3: Click inline icon → ``context.md`` opens in sticky editor; chat NOT
     opened.
   * T-4: Double-click session name → chat opens (same as T-1; no duplicate
     chat, no ``context.md``).
   * T-5: Right-click session node → all five context-menu entries present and
     functional.
   * T-6: Delete ``context.md``, click inline icon → file recreated from
     template, opens in editor.
   * T-7: Pre-existing ``copilot-cm`` / ``dev-feature-x`` sessions — new
     click semantics apply (regression).
   * T-8: Session created by ``jarvis_createSession`` — new click semantics
     apply immediately (cross-CR sanity).
   * T-9: ``jarvis.openSessionContext`` is absent from the VS Code Command
     Palette (command hidden; it is tree-context-only).
