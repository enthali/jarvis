Event User Stories
==================

.. story:: Event Entity Kind
   :id: US_EVT_EVENT
   :status: draft
   :priority: required
   :links: US_EXP_SIDEBAR; US_ENT_ENTITY

   **As a** Jarvis user,
   **I want** an Event entity kind — time-bound with a start and end date —
   so that I have a durable, identifiable container for date-scoped
   occurrences, distinct from the open-ended Project kind and the
   standing-function Actor kind.

   **Acceptance Criteria:**

   * AC-1: An Event is a Jarvis Entity kind, discovered by the generic
     scanner from ``jarvis.eventsFolder`` via ``event.yaml`` as its
     convention file.
   * AC-2: Event-specific feature behavior (chronological sorting, future-only
     filtering, LM tool listing, programmatic creation) is specified
     separately in this file's other User Stories (``US_EVT_DATESORT``,
     ``US_EVT_EVENTFILTER``, ``US_EVT_LISTEVENTS``, ``US_EVT_CREATEEVENT``)
     and is not duplicated here.


.. story:: Chronological Event Sorting
   :id: US_EVT_DATESORT
   :status: approved
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** events displayed in chronological order with their start date visible,
   **so that** I can quickly find upcoming events without scanning unordered names.

   **Acceptance Criteria:**

   * AC-1: Events are sorted by ``dates.start`` in ascending order
   * AC-2: The event label shows the start date as a prefix (e.g. ``2025-06-24 — Event Name``)
   * AC-3: Events without a start date appear at the end of the list

.. story:: Future Event Filter
   :id: US_EVT_EVENTFILTER
   :status: implemented
   :priority: optional
   :links: US_EXP_SIDEBAR

   **As a** Jarvis User,
   **I want** to toggle a filter in the Events explorer that shows only upcoming events,
   **so that** I can focus on what's ahead without past events cluttering the view.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar toggles the future-only filter on/off with a single click
   * AC-2: When active, only events whose end date (``dates.end``) is on or after today are shown
   * AC-3: Events without a parseable end date are shown regardless of filter state (fail-open)
   * AC-4: When the filter is active, the icon visually indicates the active state
   * AC-5: The filter state persists across VS Code restarts (workspaceState)
   * AC-6: When the future-only filter hides all events within a grouping folder
     (and its sub-folders), that folder node SHALL also be hidden (empty-branch pruning)


.. story:: List Events (LM Tool)
   :id: US_EVT_LISTEVENTS
   :status: draft
   :priority: optional
   :links: US_EXP_SIDEBAR; US_MSG_MCPSERVER

   **As a** LLM agent working in a Jarvis workspace,
   **I want** a tool that lists all events with their name, dates, and folder path,
   **so that** I can discover available events programmatically and use the
   information in automation workflows.

   **Acceptance Criteria:**

   * AC-1: A Language Model Tool ``jarvis_listEvents`` is available in the
     Chat tool picker
   * AC-2: The tool returns a list of events, each with ``name`` (from YAML),
     ``summary`` (from YAML, may be empty), ``agent`` (from YAML, may be empty),
     ``datesStart``, ``datesEnd``, and ``folder`` (relative path from the
     configured events folder)
   * AC-3: The tool requires no input parameters
   * AC-4: The tool is also available via the MCP server (dual registration)


.. story:: Programmatic Event Creation Tool
   :id: US_EVT_CREATEEVENT
   :status: draft
   :priority: optional
   :links: US_ENT_NEWENTITY; US_MSG_MCPSERVER

   **As an** LLM operating within an active Jarvis session,
   **I want** a tool ``jarvis_createEvent`` that programmatically creates a
   new event folder with ``event.yaml`` and ``context.md``,
   **so that** I can orchestrate event planning workflows without requiring
   the human to click through the Explorer UI.

   **Acceptance Criteria:**

   * AC-1: The tool ``jarvis_createEvent`` is registered via LM and MCP.
   * AC-2: A successful call creates ``<eventsFolder>/<date>_<name>/``,
     ``event.yaml`` (with ``name``, ``summary``, ``dates``, and optionally
     ``agent``), and an empty ``context.md``.
   * AC-3: The Events Tree reflects the new event within 2 seconds of
     creation, without any manual rescan.
   * AC-4: Required parameters: ``name``, ``startDate`` (YYYY-MM-DD).
     Optional: ``endDate`` (defaults to ``startDate``), ``summary``, ``agent``.
   * AC-5: If an event folder with the derived name already exists, the tool
     returns ``created: false``.
   * AC-6: Invalid names or dates result in an error.
