``jarvis_listSessionEntities`` Gating User Acceptance Tests
===========================================================

.. story:: jarvis_listSessionEntities Gating Acceptance Tests
   :id: US_UAT_LISTSESSIONENTITIESGATING
   :status: implemented
   :priority: required
   :links: US_SES_SESSIONS

   **As a** Jarvis Test Engineer running in the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the
   ``jarvis_listSessionEntities`` gating behaviour,
   **so that** I can verify that the tool is registered and available when
   ``jarvis.sessions.enabled=true`` and is completely absent from the LM/MCP
   tool catalog when ``jarvis.sessions.enabled=false``, consistent with the
   ``jarvis_createSession`` sibling tool.

   **Acceptance Criteria:**

   * AC-1: A test verifies that ``jarvis_listSessionEntities`` appears in the
     VS Code Chat tool catalog when ``jarvis.sessions.enabled=true`` and is
     callable, returning the session list (maps to REQ AC-1).
   * AC-2: A test verifies that ``jarvis_listSessionEntities`` is absent from
     the VS Code Chat tool catalog when ``jarvis.sessions.enabled=false``
     after Extension Host reload (maps to REQ AC-2).
   * AC-3: A test verifies that with ``jarvis.sessions.enabled=false`` both
     ``jarvis_listSessionEntities`` and ``jarvis_createSession`` are absent —
     confirming that the entire session-tool gated block is disabled (maps to
     REQ AC-3).

   **Test Scenarios (summary):**

   * T-1: Feature ENABLED — ``jarvis.sessions.enabled=true``, reload, prompt
     Copilot to list sessions → ``jarvis_listSessionEntities`` is invoked and
     returns the session list.
   * T-2: Feature DISABLED — ``jarvis.sessions.enabled=false``, reload, same
     prompt → ``jarvis_listSessionEntities`` does NOT appear in the tool
     catalog; Copilot cannot invoke it.
   * T-3: Symmetry check — with ``jarvis.sessions.enabled=false``, both
     ``jarvis_listSessionEntities`` and ``jarvis_createSession`` are absent
     (regression guard).
