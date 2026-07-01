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
   :links: US_EVT_CREATEEVENT; REQ_EXP_NEWEVENT; REQ_ACT_AGENT_DISCOVERY

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


