Session Tree Click Behaviour User Acceptance Tests
===================================================

.. story:: Session Tree Click Behaviour Acceptance Tests
   :id: US_UAT_SESSIONTREECLICK
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY; US_ENT_OPENCONTEXT

   **As a** Jarvis Test Engineer working in the Extension Development Host
   with the Sessions Tree visible,
   **I want** a set of manual acceptance test scenarios for the inverted
   click semantics of session tree items,
   **so that** I can verify that a single click on a session node opens the
   agent-chat editor, that ``context.md`` is reachable via the shared
   ``jarvis.openContext`` inline icon, that double-click is indistinguishable
   from single click, that the legacy context-menu is untouched, that the
   discovery-only (no auto-create) behavior is consistent across all 3 entity
   kinds, that the retired ``jarvis.openSessionContext`` command no longer
   exists in any form, and that both pre-existing and programmatically
   created sessions behave consistently.

   **Acceptance Criteria:**

   * AC-1: A test verifies that a single click on a session node in the
     Sessions Tree opens (or activates) the agent-chat editor, identical to
     invoking ``jarvis.openAgentSession`` manually (maps to REQ AC-1 / T-1).
   * AC-2: A test verifies that the inline icon is visible on hover, that its
     tooltip reads ``"Open Context"`` (the ``jarvis.openContext`` command
     title, minus the ``Jarvis:`` category prefix VS Code strips from inline
     tooltips), and that it is rendered on every ``jarvisSession`` leaf node
     (maps to REQ AC-2 / T-2).
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
     and then clicking the inline icon SHALL NOT recreate the file — no
     ``context.md`` auto-creation occurs for any entity kind. Instead, an
     information message is shown and no editor opens (maps to REQ AC-6 /
     T-6).
   * AC-7: A regression test verifies that pre-existing sessions
     ``copilot-cm`` and ``dev-feature-x`` (present in ``testdata/`` before
     this CR) exhibit the new click semantics without modification of their
     ``context.md`` or ``session.yaml`` (maps to REQ AC-1 through AC-6 /
     T-7).
   * AC-8: A cross-CR sanity test verifies that a session freshly created via
     ``jarvis_createActor`` also exhibits the new click semantics
     immediately after creation, confirming that all session leaves are treated
     uniformly by the tree provider (maps to REQ AC-1 + AC-2 / T-8).
   * AC-9: A test verifies that ``jarvis.openSessionContext`` no longer
     exists anywhere in the codebase — not registered as a command, not
     present in any ``package.json``, and not invocable programmatically
     (fails with a "command not found" error) — a stronger check than mere
     palette-invisibility (maps to REQ AC-9 / T-9).
   * AC-10: A cross-kind consistency test verifies that Project and Event
     nodes' ``context.md`` inline icon exhibits the same ``preview: false``
     and discovery-only (no auto-create) behavior already verified for
     Session nodes in T-3/T-6, confirming ``jarvis.openContext`` is the one
     shared command across all 3 entity kinds (maps to REQ AC-10 / T-10).

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
   * T-6: Delete ``context.md``, click inline icon → information message
     shown, no file created, no editor opens (discovery-only, no
     auto-create).
   * T-7: Pre-existing ``copilot-cm`` / ``dev-feature-x`` sessions — new
     click semantics apply (regression).
   * T-8: Session created by ``jarvis_createActor`` — new click semantics
     apply immediately (cross-CR sanity).
   * T-9: ``jarvis.openSessionContext`` no longer exists — not registered,
     not in any ``package.json``, not invocable programmatically.
   * T-10: Project and Event nodes' ``context.md`` inline icon behaves
     identically to Session's (``preview: false``, no auto-create),
     confirming the shared ``jarvis.openContext`` command across all 3 kinds.
