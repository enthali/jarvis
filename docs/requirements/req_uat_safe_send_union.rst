Safe Send Union Destination UAT Requirements
=============================================

.. req:: Safe Send-to-Session Destination Union — Test Data and Verification Requirements
   :id: REQ_UAT_SAFE_SEND_UNION
   :status: draft
   :priority: required
   :links: US_UAT_SAFE_SEND_UNION; REQ_MSG_SENDTOSESSION

   **Description:**
   Specifies the test data and per-AC verification criteria for manually
   validating the extended destination union of ``jarvis_sendToSession``
   (valid destinations = YAML entity names ∪ chat tab titles) and the
   auto-delivery regression path for YAML entities.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host.
   * The following entities must be present and loaded by the scanner:

     - Session: ``copilot-cm`` (``testdata/.jarvis/sessions/copilot-cm/``)
     - Project: ``alpha`` (``testdata/projects/alpha/``)
     - Event: ``DevCon 2026`` (``testdata/events/2026-06-15_DevCon 2026/``)

   * For T-47: at least one named VS Code Chat session tab must exist with a
     known title (e.g. "My Agent Tab").
   * For T-49 and T-55: no open chat tab for ``alpha`` or ``beta`` before
     the test (close any existing named tabs for these entities).
   * For T-55: auto-delivery must be enabled for ``beta`` via the Messages
     tree context menu ("Enable Direct Delivery").

   **Acceptance Criteria:**

   * AC-1 (YAML session entity accepted):
     For T-44, the tester SHALL verify the tool returns success and no error
     when destination is ``"copilot-cm"``.

   * AC-2 (YAML project entity accepted):
     For T-45, the tester SHALL verify success when destination is ``"alpha"``.

   * AC-3 (YAML event entity accepted):
     For T-46, the tester SHALL verify success when destination is
     ``"DevCon 2026"``.

   * AC-4 (chat tab title accepted):
     For T-47, the tester SHALL verify success when destination is an active
     VS Code Chat tab title.

   * AC-5 (unknown destination → error with list):
     For T-48, the tester SHALL verify the tool returns an error (not success).
     The error text SHALL contain the string ``"ghost-session-xyz"`` and SHALL
     list at least the known YAML entity names as valid options.

   * AC-6 (no side effect on invalid):
     For T-50, the tester SHALL note the message count in the Messages tree
     before and after an invalid invocation and verify they are equal.

   * AC-7 (YAML entity auto-delivery path):
     For T-49, the tester SHALL verify that after queuing a message to ``alpha``
     (no open chat), the auto-delivery poll opens a chat for ``alpha`` and
     delivers the message within one poll cycle (≤30 s).

   * AC-8 (new YAML entity auto-delivery regression):
     For T-55, the tester SHALL verify the same behaviour for ``beta`` (a
     project entity) with auto-delivery enabled — confirming no regression
     from v0.6.1 chat-open behaviour.
