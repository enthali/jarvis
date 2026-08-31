whoAmI Multi-Kind Entity Resolution Acceptance Tests
======================================================

.. story:: whoAmI Multi-Kind Entity Resolution Acceptance Tests
   :id: US_UAT_ACT_WHOAMI_MULTIKINDS
   :status: approved
   :priority: required
   :links: US_ACT_WHOAMI

   **As a** Jarvis Test Engineer,
   **I want** acceptance scenarios for the ``whoami-all-entity-kinds`` CR,
   **so that** I can verify that ``jarvis_whoAmI`` resolves Project and Event
   sessions correctly, returns an error for multi-match name collisions across
   kinds, and that kanban tools consuming the owner-resolution path inherit
   Project/Event support without regression.

   These scenarios extend the existing ``US_UAT_WHOAMI`` / ``SPEC_UAT_WHOAMI``
   (T-1..T-8). Scenario T-3 in ``SPEC_UAT_WHOAMI`` has been amended to
   reference the zero-match AC-12 explicitly.

   Module integration (compile/package/CI) is out of UAT scope.

   **Behaviour-Change Register coverage:**

   * BC-1 (new positive): A session bound to a **Project** now returns
     ``{ name, contextPath }`` — previously returned an error (T-1).
   * BC-2 (new positive): A session bound to an **Event** now returns
     ``{ name, contextPath }`` — previously returned an error (T-2).
   * BC-3 (unchanged): Actor sessions still return ``{ name, contextPath }``
     — covered by existing T-1/T-2 in ``SPEC_UAT_WHOAMI``; T-4 here is a
     regression guard only.
   * BC-4 (new error): A name matching entities of two different kinds now
     returns an error — previously returned the ``session``-kind match (T-3).

   **Acceptance Criteria:**

   * AC-1: A test verifies that a chat session bound to a Project entity
     returns ``{ name, contextPath }`` (T-1).
   * AC-2: A test verifies that a chat session bound to an Event entity
     returns ``{ name, contextPath }`` (T-2).
   * AC-3: A test verifies that a name matching both an Actor and a Project
     returns an error instead of the Actor's identity (T-3).
   * AC-4: A kanban regression test confirms that omitting ``ownerName`` on
     a tool call while a Project chat session is active correctly resolves
     the Project via ``jarvis_whoAmI`` (T-4).
