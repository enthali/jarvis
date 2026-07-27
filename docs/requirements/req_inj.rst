Prompt Injection Requirements
=============================

.. req:: Prompt Injection Primitive
   :id: REQ_INJ_PRIMITIVE
   :status: draft
   :priority: mandatory
   :links: US_INJ_INJECT

   **Description:**
   The extension SHALL provide a function ``injectPrompt(entityName, text)``
   that resolves a named entity, locates or spawns its chat session, and injects
   arbitrary text into the chat input.

   **Acceptance Criteria:**

   * AC-1: ``injectPrompt`` SHALL accept an entity name (string) and a text
     payload (string) and return a promise that resolves when injection is
     complete.
   * AC-2: The function SHALL resolve the entity name against the scanner entity
     store (actors, projects, events). If no entity matches, it SHALL reject with
     a user-visible error message.
   * AC-3: If a live session exists for the entity (UUID found via
     ``REQ_MSG_SESSIONLOOKUP``), the function SHALL focus it using the
     Editor-Group Placement Model (``REQ_MSG_EDITORPLACEMENT``).
   * AC-4: If no live session exists, the function SHALL spawn a new session:
     prime agent mode if ``entity.agent`` is set (``REQ_ENT_AGENTPROMPT_TEMPLATE``
     AC-6), open a new chat editor (``REQ_MSG_OPENCHAT``), rename it to the
     entity name, and send the init prompt (``REQ_ENT_AGENTPROMPT_TEMPLATE``).
   * AC-5: After the session is focused or spawned, the function SHALL inject
     ``text`` via ``REQ_MSG_SENDPROMPT`` — subject to AC-7.
   * AC-6: The function SHALL be the single call site for session-targeted text
     injection. All existing injection paths (message notification, auto-delivery,
     init prompt on tree-click) SHALL route through this function.
   * AC-7: When ``text`` is empty (or absent), the primitive SHALL open/focus the
     session silently without submitting any message. This does not affect the
     init prompt sent on spawn (AC-4), which is gated on the new-session branch
     only.


.. req:: Prompt Injection LM Tool
   :id: REQ_INJ_TOOL
   :status: draft
   :priority: mandatory
   :links: US_INJ_INJECT; REQ_INJ_PRIMITIVE

   **Description:**
   The extension SHALL expose the prompt-injection primitive as a Language Model
   Tool so that agents can invoke it programmatically.

   **Acceptance Criteria:**

   * AC-1: A tool named ``jarvis_injectPrompt`` SHALL be registered as a
     ``vscode.lm.registerTool`` call.
   * AC-2: The tool SHALL accept two required parameters: ``actor`` (string —
     entity name) and ``text`` (string — the text to inject).
   * AC-3: The tool SHALL delegate to ``injectPrompt(actor, text)``
     (``REQ_INJ_PRIMITIVE``).
   * AC-4: On success the tool SHALL return a confirmation message including the
     entity name and a truncated preview of the injected text.
   * AC-5: On failure (entity not found, injection error) the tool SHALL return
     an error message — not throw.


.. req:: Prompt Injection Command
   :id: REQ_INJ_COMMAND
   :status: draft
   :priority: mandatory
   :links: US_INJ_INJECT; REQ_INJ_PRIMITIVE

   **Description:**
   The extension SHALL expose the prompt-injection primitive as a VS Code command
   visible in the Command Palette.

   **Acceptance Criteria:**

   * AC-1: A command ``jarvis.injectPrompt`` SHALL be registered and visible in
     the Command Palette with label "Jarvis: Inject Prompt".
   * AC-2: When invoked, the command SHALL present a quick-pick list of all
     registered entities (actors, projects, events) for entity selection.
   * AC-3: After entity selection, the command SHALL present an input box for the
     text to inject.
   * AC-4: The command SHALL delegate to ``injectPrompt(entityName, text)``
     (``REQ_INJ_PRIMITIVE``).
   * AC-5: On failure the command SHALL show a warning notification with the
     error message.
