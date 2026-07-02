Event Requirements
==================

.. req:: Chronological Event Sorting
   :id: REQ_EVT_DATESORT
   :status: implemented
   :priority: optional
   :links: US_EVT_DATESORT

   **Description:**
   The Events tree view SHALL sort event leaf nodes by their start date
   (``dates.start``) in ascending order and display the start date as a
   prefix in the tree item label.

   **Acceptance Criteria:**

   * AC-1: Event leaf nodes SHALL be sorted by ``dates.start``
     (``YYYY-MM-DD``, ascending) rather than by entity name
   * AC-2: The event tree item label SHALL be ``<dates.start> — <name>``
     (e.g. ``2026-04-15 — DevCon 2026``)
   * AC-3: If ``dates.start`` is a JavaScript ``Date`` object (unquoted YAML),
     it SHALL be converted to ``YYYY-MM-DD`` via ``toISOString().slice(0, 10)``
   * AC-4: If ``dates.start`` is already a string, it SHALL be used directly
   * AC-5: If ``dates.start`` is absent or not parseable, the event SHALL sort
     by name and display name only (fail-open)
   * AC-6: Grouping folder sort order is unchanged (alphabetical by folder name)

.. req:: Future Event Filter
   :id: REQ_EVT_EVENTFILTER
   :status: implemented
   :priority: optional
   :links: US_EVT_EVENTFILTER; REQ_EXP_TREEVIEW; REQ_EVT_EVENTFILTERPERSIST

   **Description:**
   The Events tree view SHALL provide a toggle button that, when active,
   shows only events not yet fully in the past.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar triggers the command ``jarvis.filterFutureEvents``
   * AC-2: The command toggles the future-only filter on and off (single click)
   * AC-3: When active, events whose ``datesEnd`` is strictly before today are hidden
   * AC-4: Events with no parseable ``datesEnd`` are always shown (fail-open)
   * AC-5: The icon changes visually when the filter is active (``filter`` vs ``filter-filled``)
   * AC-6: When the future-only filter is active, grouping nodes whose **every** descendant
     leaf is hidden SHALL themselves be hidden (empty-branch pruning)


.. req:: Event Filter Persistence
   :id: REQ_EVT_EVENTFILTERPERSIST
   :status: implemented
   :priority: optional
   :links: US_EVT_EVENTFILTER

   **Description:**
   The future-event filter toggle state SHALL be persisted in ``workspaceState``
   and restored on extension activation.

   **Acceptance Criteria:**

   * AC-1: Filter state is stored under key ``jarvis.eventFutureFilter`` (boolean)
   * AC-2: On extension start, the saved state is applied to the EventTreeProvider


.. req:: List Events LM+MCP Tool
   :id: REQ_EVT_LISTEVENTS
   :status: draft
   :priority: optional
   :links: US_EVT_LISTEVENTS; REQ_EXP_YAMLDATA

   **Description:**
   The extension SHALL register a Language Model Tool that returns the list of
   events from the configured events folder, enabling LLM agents and MCP
   clients to discover available events programmatically.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool named ``jarvis_listEvents`` SHALL be registered
     via ``registerDualTool()`` with ``canBeReferencedInPrompt: true``
   * AC-2: The tool SHALL accept no input parameters (empty input schema)
   * AC-3: The tool SHALL return an array of objects, each containing ``name``
     (string), ``summary`` (string, may be empty), ``agent`` (string, may be
     empty), ``datesStart`` (string or empty), ``datesEnd`` (string or empty),
     and ``folder`` (string, relative path from the configured events folder)
   * AC-4: If no events exist, the tool SHALL return an empty array
   * AC-5: The tool SHALL be simultaneously available via the MCP server


.. req:: jarvis_createEvent LM+MCP Tool
   :id: REQ_EVT_CREATEEVENT
   :status: draft
   :priority: optional
   :links: US_EVT_CREATEEVENT; REQ_EVT_NEWEVENT; REQ_ACT_AGENT_DISCOVERY

   **Description:**
   A Language Model and MCP tool ``jarvis_createEvent`` SHALL programmatically
   create an event entity under the configured events folder.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL be registered via ``registerDualTool()`` with
     ``canBeReferencedInPrompt: true``.
   * AC-2: Input parameters: ``name`` (string, required), ``startDate``
     (string YYYY-MM-DD, required), ``endDate`` (string YYYY-MM-DD, optional,
     defaults to ``startDate``), ``summary`` (string, optional, defaults to
     empty), ``agent`` (string, optional).
   * AC-3: On success, the tool SHALL create the folder
     ``<eventsFolder>/<startDate>_<name>/event.yaml`` and ``context.md``.
   * AC-4: ``event.yaml`` SHALL contain ``name``, ``summary``, ``dates.start``,
     ``dates.end``.  ``agent`` SHALL be included only when non-blank and valid.
   * AC-5: After creation, ``scanner.rescan()`` SHALL be called.
   * AC-6: If the folder already exists, return ``{ created: false }``.
   * AC-7: Name validation uses same rules as sessions. Date validation
     ensures valid ``YYYY-MM-DD`` format and valid calendar date.
   * AC-8: Agent validation per ``REQ_ACT_AGENT_DISCOVERY``.


.. req:: Event Summary Required
   :id: REQ_EVT_EVENT_SUMMARY
   :status: draft
   :priority: required
   :links: US_ENT_ENTITYPARITY

   **Description:**
   The event entity schema SHALL make ``summary`` a required field.

   **Acceptance Criteria:**

   * AC-1: ``schemas/event.schema.json`` SHALL add ``summary`` to the
     ``required`` array.
   * AC-2: The YAML scanner SHALL continue to load events without ``summary``
     at runtime (fail-open: ``summary`` defaults to empty string in
     ``EntityEntry``). The schema enforcement is for editor-time validation
     only.
   * AC-3: Test data in ``testdata/events/`` that is missing ``summary``
     SHALL be updated to include the field.



.. req:: New Event Command
   :id: REQ_EVT_NEWEVENT
   :status: draft
   :priority: optional
   :links: US_ENT_NEWENTITY; REQ_EXP_REACTIVECACHE; REQ_ENT_AGENTSESSION; REQ_EXP_YAMLDATA; REQ_CFG_FOLDERPATHS

   **Description:**
   A command triggered by a ``+`` icon in the Events title bar SHALL create
   a new event folder with a convention file and immediately refresh the scanner.

   **Acceptance Criteria:**

   * AC-1: A ``$(add)`` icon in the Events view title bar triggers the command
     ``jarvis.newEvent``
   * AC-2: The command shows an InputBox prompting for the event name
   * AC-3: The command shows a second InputBox prompting for a start date
     (``YYYY-MM-DD``) with validation — if the input does not match the format
     or is not a valid calendar date, the InputBox shows an inline error and
     re-prompts
   * AC-4: The folder name is derived as ``<date>_<raw-name>``
     (e.g. ``2026-06-10_DevCon 2026``) — underscore separator, raw name
     verbatim (no kebab transformation). Old hyphen-kebab folders remain
     readable.
   * AC-5: The folder is created directly in ``jarvis.eventsFolder``
     (not nested in a year subfolder)
   * AC-6: ``event.yaml`` contains ``name``, ``summary`` (empty string),
     ``dates.start``, ``dates.end`` (start = end = input date)
   * AC-7: After file creation, an immediate scanner rescan is triggered
   * AC-8: After the rescan, the new entity appears in the tree. The chat
     editor is opened per the consolidated chat-open primitive
     (``SPEC_ENT_AGENT_PICKER``): concrete agent → mode-prime +
     ``openNewChatEditor()``; "No agent" → ``openNewChatEditor()`` only.
   * AC-9: If the user cancels any InputBox, the command exits without side effects
   * AC-10: The command SHALL NOT appear in the Command Palette
   * AC-11: If a folder with the derived name already exists, the command SHALL
     show an error notification and abort without modifying the file system
   * AC-12: Invalid names (filesystem-illegal characters, dot-only, Windows
     reserved device names) SHALL be rejected via ``validateInput`` inline
     feedback — same rules as ``jarvis.newSession``.
   * AC-13: After the date prompt, the command SHALL invoke the shared
     agent-picker (``SPEC_ENT_AGENT_PICKER``). If the user cancels the picker,
     the command SHALL abort without side effects.
   * AC-14: The selected agent SHALL be written to ``event.yaml`` as the
     ``agent`` field. If "No agent" is chosen, ``agent: ""`` SHALL be
     written (not omitted). Chat editor opens via ``openNewChatEditor()``
     (``SPEC_MSG_OPENCHAT``).


