Event Design Specifications
============================

.. spec:: Future Event Filter Command
   :id: SPEC_EVT_EVENTFILTER_CMD
   :status: implemented
   :links: REQ_EVT_EVENTFILTER, REQ_EVT_EVENTFILTERPERSIST, SPEC_EXP_PROVIDER

   **Description:**
   Two commands ``jarvis.filterFutureEvents`` and ``jarvis.filterFutureEventsActive``
   are bound to the same handler that toggles the future-only filter on the EventTreeProvider.

   **Flow:**

   1. Toggle: ``const next = !eventProvider.isFutureOnly()``
   2. Apply: ``eventProvider.setFutureOnly(next)``
   3. Persist: ``workspaceState.update('jarvis.eventFutureFilter', next)``
   4. Update icon + description: ``setContext('jarvis.eventFilterActive', next)``,
      ``eventView.description = next ? '(future only)' : ''``

   **Registration in package.json:**

   * ``contributes.commands``: two commands —
     ``jarvis.filterFutureEvents`` (icon ``$(filter)``) and
     ``jarvis.filterFutureEventsActive`` (icon ``$(filter-filled)``),
     both bound to the same handler
   * ``contributes.menus.view/title``: two entries for ``view == jarvisEvents``
     toggled via ``jarvis.eventFilterActive`` context key


.. spec:: List Events LM+MCP Tool
   :id: SPEC_EVT_LISTEVENTS
   :status: draft
   :links: REQ_EVT_LISTEVENTS; SPEC_ENG_SCANNER; SPEC_MSG_DUALREGISTRATION; SPEC_PRJ_LISTPROJECTS; SPEC_ENT_ENTITY_FILE_CHILDREN

   **Description:**
   Register ``jarvis_listEvents`` as a dual LM + MCP tool in ``extension.ts``.
   Returns the list of events from the scanner with their name, summary, dates,
   agent, and relative folder path. Mirrors the ``SPEC_PRJ_LISTPROJECTS`` pattern
   but adds event-specific fields.

   **Core logic** (shared by LM and MCP handlers):

   .. code-block:: typescript

      function getEventList(): {
          name: string; summary: string; agent: string;
          datesStart: string; datesEnd: string; folder: string;
      }[] {
          const eventsFolder = vscode.workspace
              .getConfiguration('jarvis')
              .get<string>('eventsFolder', '');
          const leaves = collectLeaves(scanner.getEventTree());
          return leaves.map(leaf => {
              const entity = scanner.getEntity(leaf.id);
              const absDir = path.dirname(leaf.id);
              const rel = eventsFolder
                  ? path.relative(eventsFolder, absDir)
                  : absDir;
              return {
                  name: entity?.name ?? path.basename(absDir),
                  summary: entity?.summary ?? '',
                  agent: entity?.agent ?? '',
                  datesStart: entity?.datesStart ?? '',
                  datesEnd: entity?.datesEnd ?? '',
                  folder: rel.replace(/\\/g, '/'),
              };
          });
      }

   **Dual-tool registration:**

   .. code-block:: typescript

      const listEventsTool = registerDualTool(
          'jarvis_listEvents',
          // LM handler
          async (_options, _token) => {
              const events = getEventList();
              return new vscode.LanguageModelToolResult([
                  new vscode.LanguageModelTextPart(JSON.stringify(events))
              ]);
          },
          // MCP description
          'Returns the list of events with name, summary, dates, agent, and folder path.',
          // MCP input schema (Zod)
          {},
          // MCP handler
          async () => {
              const events = getEventList();
              return { events };
          }
      );

   **Registration in package.json:**

   .. code-block:: json

      {
        "name": "jarvis_listEvents",
        "displayName": "List Events",
        "modelDescription": "Returns the list of events in the Jarvis workspace with name, summary, dates, agent, and folder path. Use this to discover available events.",
        "canBeReferencedInPrompt": true,
        "toolReferenceName": "listEvents",
        "icon": "$(calendar)",
        "inputSchema": {
          "type": "object",
          "properties": {}
        }
      }

   **Error handling:**

   * If no events exist, return an empty array (not an error).
   * Entity lookup failure (``scanner.getEntity()`` returns ``undefined``) →
     use fallback values (folder basename for ``name``, empty strings for all
     other fields). The tool never throws on missing data.

   **Acceptance Criteria:**

   1. ``jarvis_listEvents`` is registered via ``registerDualTool()`` with
      ``canBeReferencedInPrompt: true``.
   2. The tool accepts no input parameters (empty input schema).
   3. Each returned record contains ``name``, ``summary``, ``agent``,
      ``datesStart``, ``datesEnd``, and ``folder``.
   4. ``agent`` is ``""`` when the entity has no agent (unbound).
   5. If no events exist, the tool returns an empty array.
   6. The tool is simultaneously available via the MCP server.
   7. ``collectLeaves()`` helper is reused from ``SPEC_PRJ_LISTPROJECTS``.
   8. Disposable pushed to ``context.subscriptions``.

   **Design notes:**

   * Reuses ``collectLeaves()`` helper defined in ``SPEC_PRJ_LISTPROJECTS`` —
     see that spec's design notes for the ``TreeNode``/``FileNode``
     exhaustive-handling requirement (``SPEC_ENT_ENTITY_FILE_CHILDREN``),
     which applies equally here since this tool calls the same helper
   * ``folder`` uses forward slashes for cross-platform consistency
   * ``summary`` and ``agent`` default to ``""`` when absent — never ``null``
     or ``undefined`` in the output


.. spec:: jarvis_createEvent LM+MCP Tool
   :id: SPEC_EVT_CREATEEVENT
   :status: draft
   :links: REQ_EVT_CREATEEVENT; SPEC_ENG_SCANNER; SPEC_MSG_DUALREGISTRATION; SPEC_ACT_CREATETOOL; SPEC_ENT_AGENT_PICKER

   **Description:**
   Register ``jarvis_createEvent`` via ``registerDualTool()`` in
   ``src/extension.ts``. Creates an event folder with ``event.yaml`` and
   ``context.md`` under the configured events folder. Folder name uses
   ``${startDate}_${name}`` (underscore separator, verbatim name — per KISS
   convention). Uses programmatic agent validation (no picker).

   **Tool input schema:**

   .. list-table::
      :header-rows: 1
      :widths: 20 12 12 56

      * - Parameter
        - Type
        - Required
        - Purpose
      * - ``name``
        - ``string``
        - yes
        - Event name; used verbatim in folder name and YAML.
      * - ``startDate``
        - ``string``
        - yes
        - Start date in ``YYYY-MM-DD`` format.
      * - ``endDate``
        - ``string``
        - no
        - End date in ``YYYY-MM-DD`` format. Defaults to ``startDate``.
      * - ``summary``
        - ``string``
        - no
        - Short description (defaults to empty).
      * - ``agent``
        - ``string``
        - no
        - Agent mode to bind. Validated via ``discoverAgents()``.

   **Name validation** (identical to ``SPEC_ACT_CREATETOOL``):

   Same rules as ``SPEC_PRJ_CREATEPROJECT``. Violation → throw
   ``Error("invalid event name: <reason>")``.

   **Date validation:**

   * ``startDate`` MUST match ``/^\d{4}-\d{2}-\d{2}$/`` and be a valid
     calendar date (``new Date(startDate)`` must not be ``NaN``).
   * ``endDate``, when provided, MUST match the same pattern and be a valid
     calendar date.
   * Violation → throw ``Error("invalid date: <reason>")``.

   **Agent validation** (when ``agent`` is non-blank):

   Same as ``SPEC_PRJ_CREATEPROJECT`` — validate via ``discoverAgents()``,
   throw error with available agents on mismatch.

   **Folder naming:**

   .. code-block:: typescript

      const folderName = `${startDate}_${name}`;
      const targetPath = path.join(eventsFolder, folderName);

   **Idempotency check:**

   .. code-block:: typescript

      if (fs.existsSync(targetPath)) {
          return { created: false, reason: `event folder "${folderName}" already exists` };
      }

   **File layout after creation:**

   .. code-block:: text

      <eventsFolder>/
        <startDate>_<name>/
          event.yaml      ← name, summary, dates.start, dates.end; agent when valid
          context.md      ← always; starts with "# <name>\n\n"

   **``event.yaml`` format:**

   .. code-block:: yaml

      name: "<name>"
      summary: "<summary>"
      dates:
        start: "<startDate>"
        end: "<endDate>"
      agent: "<agent>"        # only present when agent is non-blank and valid

   **``context.md`` initial content:**

   .. code-block:: markdown

      # <name>

   **Post-creation:** Call ``scanner.rescan()`` to update the entity cache.

   **Acceptance Criteria:**

   1. ``jarvis_createEvent`` is registered via ``registerDualTool()`` with
      ``canBeReferencedInPrompt: true``.
   2. Input parameters: ``name`` (required), ``startDate`` (required),
      ``endDate`` (optional, defaults to ``startDate``), ``summary`` (optional),
      ``agent`` (optional).
   3. Folder name is ``${startDate}_${name}`` (underscore separator, verbatim
      name).
   4. On success, creates ``event.yaml`` with ``name``, ``summary``,
      ``dates.start``, ``dates.end``; ``agent`` included only when non-blank
      and valid.
   5. ``scanner.rescan()`` is called after creation.
   6. If the folder already exists, returns ``{ created: false }``.
   7. Name validation uses the same rules as ``SPEC_ACT_CREATETOOL``.
   8. Date validation ensures valid ``YYYY-MM-DD`` format and valid calendar
      date.
   9. Agent validation uses ``discoverAgents()``; invalid → error with
      available agents listed.
   10. Disposable pushed to ``context.subscriptions``.



.. spec:: New Event Command
   :id: SPEC_EVT_NEWEVENT_CMD
   :status: draft
   :links: REQ_EVT_NEWEVENT; REQ_EXP_REACTIVECACHE; SPEC_ENG_SCANNER; SPEC_EXP_EXTENSION; SPEC_ENT_AGENT_PICKER

   **Description:**
   Register ``jarvis.newEvent`` in ``extension.ts``. Triggered by the ``$(add)``
   icon in the Events view title bar. Creates a new event folder with
   ``event.yaml`` and opens the new entity's chat editor (same new-session
   pattern used by ``jarvis.newSession``).

   **Handler flow:**

   1. Read ``jarvis.eventsFolder`` from configuration.
      If empty, show warning notification and return.
   2. Show ``InputBox`` with prompt ``"Event name"``,
      ``placeHolder: "My Event"``, with ``validateInput``:

      .. code-block:: typescript

         validateInput: (value: string) => {
             if (/[<>:"\/\\|?*\x00-\x1f]/.test(value)) {
                 return 'Name contains characters not allowed in folder names';
             }
             if (!value.trim()) {
                 return 'Name must not be empty';
             }
             return undefined;
         }

   3. If user cancels (``undefined``), return.
   4. Show second ``InputBox`` with prompt ``"Start date (YYYY-MM-DD)"``,
      ``placeHolder: "2026-01-15"``, with ``validateInput``:

      .. code-block:: typescript

         validateInput: (value: string) => {
             if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                 return 'Date must be in YYYY-MM-DD format';
             }
             const [y, m, d] = value.split('-').map(Number);
             const date = new Date(y, m - 1, d);
             if (date.getFullYear() !== y ||
                 date.getMonth() !== m - 1 ||
                 date.getDate() !== d) {
                 return 'Not a valid calendar date';
             }
             return undefined;
         }

   5. If user cancels (``undefined``), return.
   6. Invoke ``pickAgentMode()`` (per ``SPEC_ENT_AGENT_PICKER``).
   7. If picker returns ``undefined`` (cancel), return (creation aborted).
   8. Derive folder name: ```${dateInput}_${nameInput}`` (underscore separator,
      raw name verbatim).
   9. Compute target path: ``path.join(eventsFolder, folderName)``.
   10. If target path already exists (``fs.existsSync``), show error notification
       ``"Folder '<folderName>' already exists in events folder"`` and return.
   11. Create directory: ``await fs.promises.mkdir(targetPath)``.
   12. Write ``event.yaml``:

       .. code-block:: typescript

          const agent = pickerResult; // "" or "<agent-name>"
          const content = [
              `name: "${nameInput}"`,
              `agent: "${agent}"`,
              `dates:`,
              `  start: "${dateInput}"`,
              `  end: "${dateInput}"`,
              ''
          ].join('\n');
          await fs.promises.writeFile(
              path.join(targetPath, 'event.yaml'), content, 'utf-8');

   13. Trigger scanner rescan: ``await scanner.rescan()``.
   14. Open chat editor (per ``SPEC_ENT_AGENT_PICKER`` Chat-Open Primitive):

       .. code-block:: typescript

          // Mode-prime (only for concrete agent)
          if (pickerResult) {
              try {
                  await vscode.commands.executeCommand(
                      'workbench.action.chat.open', { mode: pickerResult }
                  );
                  await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) {
                  log.warn(`Mode-prime failed: ${err}`);
              }
          }
          // Editor creation (always)
          await openNewChatEditor();  // SPEC_MSG_OPENCHAT

   **Disposable** pushed to ``context.subscriptions``.

   **Registration in package.json** — see ``SPEC_EXP_EXTENSION``.


