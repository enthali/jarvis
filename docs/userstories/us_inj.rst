Prompt Injection User Stories
=============================

.. story:: Prompt Injection Primitive
   :id: US_INJ_INJECT
   :status: draft
   :priority: mandatory

   **As a** Jarvis User or Agent,
   **I want** a single prompt-injection primitive that can deliver any text into
   a named entity's chat session,
   **so that** instructions (e.g. "read the message queue") or slash-commands
   (e.g. ``/compact``) can be injected into the session's prompt.

   **Acceptance Criteria:**

   * AC-1: A function ``injectPrompt(entityName, text)`` resolves the named
     entity (actor, project, or event), locates or spawns its chat session, and
     injects ``text`` into the chat input so that VS Code processes it as if the
     user had typed it — including slash-commands.
   * AC-2: If no live session exists for the entity, a new session is spawned
     with correct agent-mode binding and the entity's init prompt, then ``text``
     is injected after session creation.
   * AC-3: The primitive is exposed as a Language Model Tool
     (``jarvis_injectPrompt``) so that agents can invoke it programmatically.
   * AC-4: The primitive is exposed as a VS Code command
     (``jarvis.injectPrompt``) visible in the Command Palette, prompting for
     entity name and text via quick-pick and input box.
   * AC-5: Target must be a registered entity (actor, project, or event). The
     primitive does not accept arbitrary session names — unresolved names
     produce a user-visible error.
   * AC-6: Injecting ``/compact`` into an actor demonstrably compacts that
     actor's session (end-to-end acceptance).
   * AC-7: (**notification-template-empty-fallback CR, GH #56**) When the
     primitive is asked to inject nothing, it opens/focuses the session and
     submits nothing — a legitimate outcome, not an error — but it never leaves
     that outcome indistinguishable from a real submission: the log records
     which entity was opened without a submission, so a caller that passed an
     empty payload by mistake is diagnosable from the log alone.
