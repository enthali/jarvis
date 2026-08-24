Prompt Injection Design Specifications
=======================================

.. spec:: Prompt Injection Primitive
   :id: SPEC_INJ_INJECT
   :status: draft
   :links: REQ_INJ_PRIMITIVE; REQ_MSG_SESSIONLOOKUP; SPEC_MSG_SESSIONLOOKUP; SPEC_MSG_OPENCHAT; SPEC_MSG_SENDPROMPT; SPEC_MSG_EDITORPLACEMENT; SPEC_ENT_AGENTSESSION_INITPROMPT; SPEC_MSG_NOTIFICATION_RESOLVE

   **Description:**
   Async function ``injectPrompt`` in
   ``packages/core/src/engine/sessions/injectPrompt.ts`` that resolves a named
   entity, finds or spawns its chat session, and injects arbitrary text into the
   chat input. This is the single implementation of session-targeted text
   injection — all existing call sites (message notification, auto-delivery,
   init prompt on tree-click) delegate to this function.

   **Visibility:** ``injectPrompt`` is an internal function — it is NOT exposed
   on ``JarvisCoreApi``. External consumers (add-ons like PIM) use the
   higher-level ``openActorSession()`` API (``SPEC_ENG_API``), which delegates
   to ``injectPrompt`` internally. Direct callers of ``injectPrompt`` are
   limited to core-internal code: ``SPEC_MSG_SENDCOMMAND``,
   ``SPEC_MSG_AUTODELIVER_POLL``, ``SPEC_MSG_AGENTSESSION``,
   ``SPEC_ENT_AGENTSESSION``, ``SPEC_ACT_NEWENTITY``, and the
   ``openActorSession`` API wrapper itself.

   **Signature:**

   .. code-block:: typescript

      async function injectPrompt(
          entityName: string,
          text: string,
          options?: {
              placement?: 'main' | 'secondary';
              skipInitPrompt?: boolean;
          }
      ): Promise<void>

   **Parameters:**

   * ``entityName`` — display name of the target entity (actor, project, or
     event). Matched against ``scanner.entities`` by ``e.name``.
   * ``text`` — the text to inject into the chat input. May be a plain
     instruction, a slash-command (e.g. ``/compact``), or a notification stub.
     **May be the empty string**, which means "open/focus only, submit nothing"
     — see step 4.
   * ``options.placement`` — editor-group placement target. ``'main'`` (default)
     for user-initiated actions (``SPEC_MSG_EDITORPLACEMENT`` Main target);
     ``'secondary'`` for system-initiated actions (auto-delivery).
   * ``options.skipInitPrompt`` — **deprecated** (agent-session-reinit-fix CR,
     GH #52). When ``true``, skip the init prompt on session spawn. The
     init-prompt gating is fully owned by step 3b's ``if (!skipInitPrompt)``
     block; callers that only want open/focus now pass an empty ``text``
     instead. Retained in the signature for backwards compatibility; new
     callers SHALL NOT pass it.

   **Algorithm:**

   1. **Entity resolution:** Find entity in ``scanner.entities`` where
      ``e.name === entityName``. If not found, throw an error with message
      ``"Jarvis: Entity not found: <entityName>"``.

   2. **Session lookup:** Call ``lookupSessionUUID(entityName)``
      (``SPEC_MSG_SESSIONLOOKUP``).

   3a. **Existing session:** If UUID found:

       - Focus the session at the requested placement target via
         ``openAtMain`` or ``openAtSecondary`` (``SPEC_MSG_EDITORPLACEMENT``).
       - If ``entity.agent`` is set, call ``reapplyAgentMode(entity.agent,
         entityName)`` (GH #25 agent-mode-persistence). ``entityName`` is the
         verified target, not a log label: the helper applies the mode only if
         that session is the focused chat editor, else skips
         (``agent-mode-reset-race`` CR, ``REQ_MSG_MODETARGET``).
       - Wait 800 ms for the editor to settle.

   3b. **New session (spawn):** If no UUID found:

       - If ``entity.agent`` is set: prime the VS Code Chat mode selector via
         ``workbench.action.chat.open { mode: entity.agent }`` + 300 ms settle
         (``SPEC_MSG_OPENCHAT`` mode-prime pattern).
       - Call ``openNewChatEditor()`` (``SPEC_MSG_OPENCHAT``, includes 800 ms
         settle delay).
       - Call ``renameFocusedChatSession(entityName)``.
       - Unless ``skipInitPrompt`` is ``true``: build and inject the init prompt
         via ``SPEC_ENT_AGENTSESSION_INITPROMPT`` template expansion, then submit
         via ``sendPromptModeSetting(initPrompt)`` (``SPEC_MSG_SENDPROMPT``).
         Wait 800 ms for the init prompt to settle.
       - **Post-spawn repositioning** (``placement === 'main'`` only): call
         ``lookupSessionUUID(entityName)``; if a UUID is found, call
         ``openAtMain(uri, entityName)`` to guarantee the spawned session lands
         in Main column (``REQ_ENT_AGENTSESSION`` AC-7,
         ``REQ_MSG_EDITORPLACEMENT`` AC-12/AC-13). Silent no-op if UUID is
         still unresolved (rare rename-propagation edge case,
         ``REQ_MSG_EDITORPLACEMENT`` AC-13). VS Code exposes no API to force
         view column at chat-editor creation time — this relocate-after-creation
         pattern is the established workaround.

   4. **Text injection:** If ``text`` is non-empty, submit it via
      ``SPEC_MSG_SENDPROMPT``. If ``text`` is empty, skip — this allows callers
      that only want session open/focus (not text injection) to pass the empty
      string (``REQ_INJ_PRIMITIVE`` AC-7). Before the agent-session-reinit-fix
      CR this step was unconditional, so every re-focus of an already-open
      session re-submitted the caller-composed init prompt as a live chat
      message (GH #52).

      **Emptiness is evaluated after trimming**
      (``text.trim().length === 0``, notification-template-empty-fallback CR,
      GH #56). The previous ``if (text)`` guard treated a whitespace-only
      payload as deliverable while the template layer treated it as empty; one
      definition now applies to both (``REQ_INJ_PRIMITIVE`` AC-7).

      **A skipped submission is logged** (``REQ_INJ_PRIMITIVE`` AC-9)::

         _log?.info(`[INJ] injectPrompt: empty text for "${entityName}" — session opened/focused, nothing submitted`);

      Level is ``info``, deliberately not ``warn``: open/focus-only is ordinary
      operation for ``SPEC_ENT_AGENTSESSION`` and ``SPEC_ACT_NEWENTITY``, and a
      warning on a normal path would be noise that readers learn to skip — the
      same blindness that let GH #56 run undetected. The diagnostic value comes
      from the entry existing at all: an unintended empty payload now appears in
      the log immediately after the caller's own delivery log line, instead of
      leaving no trace. The *warning* for an intended-but-empty notification is
      raised one layer up, where delivery intent is known
      (``SPEC_MSG_NOTIFICATION_RESOLVE``).

      .. note:: **This step is not the fix for GH #56.**
         The guard was doing exactly what it was specified to do; the defect was
         that the notification path handed it an empty string. Hardening the
         guard into an error would break the legitimate open/focus-only contract
         (``REQ_INJ_PRIMITIVE`` AC-7) that GH #52 introduced. The fix is
         upstream — the stub is non-empty by construction
         (``SPEC_MSG_NOTIFICATION_RESOLVE``); this step only stops being silent.

      **The submission variant depends on which branch was taken**
      (notification-agent-mode-reset CR, GH #54):

      - **After branch 3a (existing session):** use the **mode-preserving**
        variant (``SPEC_MSG_SENDPROMPT``). The session's agent mode is already
        established, and step 3a may have just restored a custom mode via
        ``reapplyAgentMode()``. A mode-setting submission here would immediately
        clobber that restoration, which is precisely the GH #54 defect — and,
        for the auto-delivery path, a re-occurrence of the v0.5.8 regression
        (``docs/changes/v0.5.8/hotfix-agent-reset.md``) that the injectPrompt
        consolidation flattened away.
      - **After branch 3b (new session):** the mode-setting variant remains
        acceptable — the session was just created and any custom mode is bound
        by the mode-prime step, not by this submission.

      The variant is selected by this step from the branch it took; it is not
      a caller-facing option and not something ``SPEC_MSG_SENDPROMPT`` infers
      from global state.

   .. note:: **Known related gap (not fixed by this CR).**
      Branch 3b submits the init prompt through the mode-setting variant while
      the session was just created in a *custom* mode via the mode-prime step
      (``entity.agent`` set). By the command taxonomy in
      ``SPEC_MSG_SENDPROMPT``, that submission resets the freshly primed custom
      mode to generic "Agent" — the same coupling as GH #54, on the
      new-session path. It is out of scope here (the CR scopes 3b as
      unchanged) and is not user-visible in the same way, because a new session
      has no prior conversation to lose context from. Recorded so it is not
      re-discovered as a fresh defect.

   **Focus-restore responsibility:**
   ``injectPrompt`` does NOT perform focus-snapshot/restore. Callers that need
   focus-restore (e.g. auto-delivery poll loop) wrap the call in their own
   ``snapshotFocus()`` / ``restoreFocus()`` cycle (``SPEC_MSG_FOCUSRESTORE``).
   This keeps the primitive single-purpose.

   **Error handling:**
   Entity-not-found throws. All other errors (session lookup failure, VS Code
   command failures) propagate to the caller. The primitive does not swallow
   errors — callers decide how to surface them (tool returns error message,
   command shows warning, poll loop logs and continues).

   **File touchpoint:** ``packages/core/src/engine/sessions/injectPrompt.ts``.

   **Caller migration (this CR):**

   * ``SPEC_MSG_SENDCOMMAND`` — replaces inline session-resolve + inject logic
     (lines 200–270 in current spec) with
     ``await injectPrompt(node.destination, stub, { placement: 'main' })``.
   * ``SPEC_MSG_AUTODELIVER_POLL`` — replaces inline session-resolve + inject
     logic with
     ``await injectPrompt(sessionName, stub, { placement: 'secondary' })``,
     wrapped in focus-snapshot/restore.
   * ``SPEC_ENT_AGENTSESSION`` (``jarvis.openAgentSession``) — replaces inline
     new-session sequence with
     ``await injectPrompt(entity.name, '', { placement: 'main' })``. Passes the
     empty string as ``text`` — session open/focus only; the init prompt on
     spawn is handled entirely by step 3b (agent-session-reinit-fix CR).
   * ``SPEC_ACT_NEWENTITY`` (``jarvis.newSession``) — same shape:
     ``await injectPrompt(nameInput, '', { placement: 'main' })``. The entity is
     freshly created, so step 3b always fires and sends exactly one init prompt.

   **``/rename`` exception:**
   ``renameFocusedChatSession()`` is NOT migrated to ``injectPrompt``. It targets
   the currently focused editor (no entity resolution, no session spawn) and is
   called *within* the primitive's own spawn sequence (step 3b). It remains an
   inline helper.


.. spec:: Prompt Injection LM Tool
   :id: SPEC_INJ_TOOL
   :status: draft
   :links: REQ_INJ_TOOL; SPEC_INJ_INJECT

   **Description:**
   Language Model Tool ``jarvis_injectPrompt`` registered via
   ``vscode.lm.registerTool`` in ``packages/core/src/extension.ts``.

   **Tool metadata:**

   .. code-block:: typescript

      {
          name: 'jarvis_injectPrompt',
          description: 'Inject a prompt or slash-command into a named entity\'s '
              + 'chat session. The entity can be an actor, project, or event. '
              + 'If no session exists, one is spawned automatically.',
          parameters: {
              type: 'object',
              properties: {
                  actor: {
                      type: 'string',
                      description: 'The name of the target entity (actor, project, or event).'
                  },
                  text: {
                      type: 'string',
                      description: 'The text or slash-command to inject (e.g. "/compact", '
                          + '"read your context.md").'
                  }
              },
              required: ['actor', 'text']
          }
      }

   **Handler:**

   .. code-block:: typescript

      async invoke(options, token) {
          const { actor, text } = options.parameters as { actor: string; text: string };
          try {
              await injectPrompt(actor, text);
              return { 'text/plain': `Injected into "${actor}": ${text.slice(0, 80)}…` };
          } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return { 'text/plain': `Error: ${msg}` };
          }
      }

   **File touchpoint:** ``packages/core/src/extension.ts`` (tool registration
   block, alongside existing tools).


.. spec:: Prompt Injection Command
   :id: SPEC_INJ_COMMAND
   :status: draft
   :links: REQ_INJ_COMMAND; SPEC_INJ_INJECT

   **Description:**
   VS Code command ``jarvis.injectPrompt`` registered in
   ``packages/core/src/extension.ts``, visible in the Command Palette.

   **Registration:**

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.injectPrompt', async () => {
          // 1. Pick entity
          const entities = scanner?.entities ?? [];
          if (entities.length === 0) {
              vscode.window.showWarningMessage('Jarvis: No entities found.');
              return;
          }
          const items = entities.map(e => ({
              label: e.name,
              description: e.kind ?? 'project'
          }));
          const picked = await vscode.window.showQuickPick(items, {
              placeHolder: 'Select entity to inject into'
          });
          if (!picked) { return; }

          // 2. Get text
          const text = await vscode.window.showInputBox({
              prompt: 'Text or slash-command to inject',
              placeHolder: '/compact'
          });
          if (!text) { return; }

          // 3. Inject
          try {
              await injectPrompt(picked.label, text);
          } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              vscode.window.showWarningMessage(msg);
          }
      });

   **package.json contribution:**

   .. code-block:: json

      {
          "command": "jarvis.injectPrompt",
          "title": "Jarvis: Inject Prompt"
      }

   **File touchpoint:** ``packages/core/src/extension.ts`` (command registration
   block), ``package.json`` (contributes.commands).
