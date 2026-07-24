Actor Identity Recovery (jarvis_whoAmI) UAT Requirements
==========================================================

.. req:: jarvis_whoAmI — Test Data and Verification Requirements
   :id: REQ_UAT_WHOAMI
   :status: draft
   :priority: required
   :links: US_UAT_WHOAMI; REQ_ACT_WHOAMI

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the ``jarvis_whoAmI`` LM+MCP tool.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host
     (F5 from VS Code with ``feature/jarvis-whoami`` checked out).
   * ``jarvis.sessions.enabled`` must be ``true`` (default).
   * The following actor test-data files must be present:

     * ``testdata/.jarvis/actors/Change Manager/session.yaml`` — must
       contain ``name: Change Manager``.
     * ``testdata/.jarvis/actors/Change Manager/context.md`` — any content.
     * ``testdata/.jarvis/actors/Test Designer/session.yaml`` — must
       contain ``name: Test Designer``.
     * ``testdata/.jarvis/actors/Test Designer/context.md`` — any content.

   * For T-3 (non-actor session), a plain VS Code Chat session must be open
     with a title that does not match any registered actor (e.g., default
     untitled chat or ``"Copilot"``).
   * For T-7 (gating), ``jarvis.sessions.enabled`` must be set to ``false``
     in VS Code Settings, and the EDH must be restarted before the test.
   * For T-8 (post-compact), the ``Change Manager`` session must contain
     10+ messages before ``/compact`` is run.

   **Acceptance Criteria — per CR AC:**

   * CR AC-1 (T-1, T-2):
     The tester SHALL verify that the JSON result contains both ``name`` and
     ``contextPath``, that ``name`` exactly matches the actor's registered
     name, and that ``contextPath`` is an absolute path pointing to an
     existing ``context.md`` file. The Jarvis Output Channel SHALL show a
     ``[SES] whoAmI:`` log entry.

   * CR AC-2 / AC-3 (T-3):
     The tester SHALL verify that invoking the tool from a non-actor session
     returns an error object (not a crash) with a message instructing the
     session to ask the user for its identity. No ``name`` or ``contextPath``
     fields SHALL be present in the result.

   * CR AC-1 / no-input (T-5):
     The tester SHALL verify that the tool picker presents ``whoAmI`` with
     no parameter input box. The tool SHALL be invokable without entering
     any text after selecting it.

   * CR AC-4 (T-6, T-7):
     For T-6, the tester SHALL confirm ``whoAmI`` appears in the tool picker
     with the short reference name ``whoAmI``. For T-7, the tester SHALL
     restart the EDH with ``jarvis.sessions.enabled: false`` and confirm the
     tool is absent from the picker.

   * CR AC-5 (T-4 — code inspection):
     The tester SHALL verify by code inspection that the handler contains a
     guard for ``!activeTab`` that returns an error message (not throws).

   **End-to-End Recovery (T-8):**
   The tester SHALL compact the ``Change Manager`` session via ``/compact``
   and then invoke ``#whoAmI``, confirming the returned ``contextPath`` can
   be opened in VS Code and contains the actor's persistent memory. This
   demonstrates the identity-recovery use case described in the Actor Kernel
   Section 0.
