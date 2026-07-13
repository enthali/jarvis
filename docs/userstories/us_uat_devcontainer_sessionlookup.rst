Devcontainer Session Lookup User Acceptance Tests
==================================================

.. story:: Devcontainer Session Lookup Acceptance Tests
   :id: US_UAT_MSG_REMOTECOMPAT
   :status: approved
   :priority: optional
   :links: US_MSG_REMOTECOMPAT; REQ_MSG_SESSIONLOOKUP

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the Devcontainer Session Lookup
   feature,
   **so that** I can verify correct session resolution via ``globalStorageUri``,
   graceful handling of a missing database file, and that local usage remains
   unaffected.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover: local happy path (regression), missing
     ``state.vscdb`` fallback, path derivation via ``globalStorageUri``, and
     ``listSessions`` tool correctness
   * AC-2: At least one test verifies local usage is unchanged (regression)
   * AC-3: At least one test verifies the warning is emitted and an empty list is
     returned when ``state.vscdb`` is absent
   * AC-4: At least one test verifies the path is constructed from
     ``globalStorageUri``
   * AC-5: At least one test verifies the ``listSessions`` MCP tool returns correct
     results

   **Test Scenarios:**

   **T-1 — Local environment: session found by name (regression)**
     Setup: Configure ``jarvis.projects.folder`` to include ``testdata/projects/``.
     Ensure a chat session named "alpha" already exists in the Extension
     Development Host. Confirm ``state.vscdb`` is present at the path derived
     from ``globalStorageUri``.
     Action: Right-click the "alpha" project node and select
     ``Jarvis: Open Agent Session``.
     Expected: The existing "alpha" session is focused; no duplicate session is
     created. Behaviour is identical to pre-change behaviour.

   **T-2 — Fallback: state.vscdb not found — warning logged, empty list returned**
     Setup: Temporarily rename or remove ``state.vscdb`` from the resolved path
     (e.g. by copying the database file out and deleting it). Reload the Extension
     Development Host.
     Action: Right-click any project node and select
     ``Jarvis: Open Agent Session``, or invoke the ``jarvis_listActors`` tool
     from a chat session.
     Expected: The Jarvis output log (``Output > Jarvis``) shows a warning
     message indicating ``state.vscdb`` was not found. The operation does not
     throw; a new session is opened (open-session) or an empty list is returned
     (list-sessions) rather than crashing.

   **T-3 — Path derived via globalStorageUri — correct path constructed**
     Setup: Enable debug/verbose logging or add a temporary log statement to
     confirm the resolved ``state.vscdb`` path. Use a local workspace (not a
     devcontainer).
     Action: Trigger ``Jarvis: Open Agent Session`` for any project.
     Expected: The Jarvis output log shows the resolved ``state.vscdb`` path,
     and that path is located inside a ``workspaceStorage/<hash>/`` directory
     derived from ``globalStorageUri`` — not from a remote filesystem path.

   **T-4 — listSessions tool returns sessions correctly**
     Setup: Ensure at least one named chat session exists in the Extension
     Development Host (e.g. "alpha").
     Action: In a Copilot agent chat, invoke the ``jarvis_listActors`` tool
     (e.g. ``@jarvis list sessions``).
     Expected: The tool response contains the existing session(s) by name.
     No error or empty result is returned when ``state.vscdb`` is accessible.
