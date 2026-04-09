# Change Document: event-filter

**Status**: verified
**Branch**: feature/event-filter
**Created**: 2026-04-07
**Author**: Jarvis Developer

---

## Summary

Add a future-events filter toggle to the Events tree view. A single click on the filter icon
switches between "show all events" and "show only upcoming events" (end date ≥ today).
No QuickPick needed — it's a pure on/off toggle. The filter state persists in workspaceState.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | none | Filter doesn't change sidebar structure |
| US_EXP_PROJECTFILTER | Project Folder Filter | none | Projects-only, separate concern |

### New User Stories

#### US_EXP_EVENTFILTER: Future Event Filter

```rst
.. story:: Future Event Filter
   :id: US_EXP_EVENTFILTER
   :status: draft
   :priority: optional

   **As a** Jarvis User,
   **I want** to toggle a filter in the Events explorer that shows only upcoming events,
   **so that** I can focus on what's ahead without past events cluttering the view.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar toggles the future-only filter on/off with a single click
   * AC-2: When active, only events whose end date (``dates.end``) is on or after today are shown
   * AC-3: Events without a parseable end date are shown regardless of filter state (fail-open)
   * AC-4: When the filter is active, the icon visually indicates the active state
   * AC-5: The filter state persists across VS Code restarts (workspaceState)
```

### Decisions

- Decision 1: Cutoff is `dates.end < today` → event fully in the past → hidden
- Decision 2: Simple on/off toggle (no QuickPick, no folder selection)
- Decision 3: Events without a parseable `dates.end` are always shown (fail-open)
- Decision 4: Events-only — project filter (folder-based) is a separate feature

### Horizontal Check (MECE)

- ✅ US_EXP_SIDEBAR: structural display, not impacted
- ✅ US_EXP_PROJECTFILTER: projects-only folder filter, complementary — no overlap
- ✅ US_EXP_EVENTFILTER covers the full intent — one toggle, date-based, events only
- ✅ No contradictions, no gaps

---

## Level 1: Requirements

**Status**: ✅ completed

### Modified Requirements

#### REQ_EXP_YAMLDATA: YAML-based Project and Event Data (add AC-5)

```rst
   * AC-5: For event YAML files, the ``dates.end`` field SHALL be extracted and stored as
     ``EntityEntry.datesEnd`` (string ``YYYY-MM-DD``); if absent or not a string,
     this field is ``undefined``
```

### New Requirements

#### REQ_EXP_EVENTFILTER: Future Event Filter

```rst
.. req:: Future Event Filter
   :id: REQ_EXP_EVENTFILTER
   :status: draft
   :priority: optional
   :links: US_EXP_EVENTFILTER

   **Description:**
   The Events tree view SHALL provide a toggle button that, when active,
   shows only events not yet fully in the past.

   **Acceptance Criteria:**

   * AC-1: A filter icon in the Events title bar triggers the command ``jarvis.filterFutureEvents``
   * AC-2: The command toggles the future-only filter on and off (single click)
   * AC-3: When active, events whose ``datesEnd`` is strictly before today are hidden
   * AC-4: Events with no parseable ``datesEnd`` are always shown (fail-open)
   * AC-5: The icon changes visually when the filter is active (``filter`` vs ``filter-filled``)
```

#### REQ_EXP_EVENTFILTERPERSIST: Event Filter Persistence

```rst
.. req:: Event Filter Persistence
   :id: REQ_EXP_EVENTFILTERPERSIST
   :status: draft
   :priority: optional
   :links: US_EXP_EVENTFILTER

   **Description:**
   The future-event filter toggle state SHALL be persisted in ``workspaceState``
   and restored on extension activation.

   **Acceptance Criteria:**

   * AC-1: Filter state is stored under key ``jarvis.eventFutureFilter`` (boolean)
   * AC-2: On extension start, the saved state is applied to the EventTreeProvider
```

### Horizontal Check (MECE)

- ✅ REQ_EXP_EVENTFILTER and REQ_EXP_EVENTFILTERPERSIST: complementary (interaction vs. storage), no overlap
- ✅ REQ_EXP_YAMLDATA modification minimal — only adds event date extraction, project scanning unchanged
- ✅ No overlap with REQ_EXP_PROJECTFILTER / REQ_EXP_FILTERPERSIST (different view, different mechanism)
- ✅ REQ_EXP_TREEVIEW and REQ_EXP_REACTIVECACHE: tree structure and scanner lifecycle unchanged

---

## Level 2: Design

**Status**: ✅ completed

### Design Decisions

- Future-only filter is a boolean toggle — no QuickPick, no folder selection
- Date comparison: `entity.datesEnd < today` using ISO string lexicography (YYYY-MM-DD)
- `EntityEntry.datesEnd` is optional (`string | undefined`) — missing/invalid = fail-open
- Same two-command icon toggle pattern as project filter (separate commands per icon state)

### Impacted Specs

| ID | Title | Impact |
|----|-------|--------|
| SPEC_EXP_SCANNER | YAML Scanner Service | modified — EntityEntry gains `datesEnd?`, _buildTree reads dates.end for events |
| SPEC_EXP_PROVIDER | Tree Data Providers | modified — EventTreeProvider gets `_futureOnly` flag + filter in getChildren |
| SPEC_EXP_EXTENSION | Extension Manifest & Activation | modified — workspaceState restore + command registration |

### New SPEC: SPEC_EXP_EVENTFILTER_CMD

```rst
.. spec:: Future Event Filter Command
   :id: SPEC_EXP_EVENTFILTER_CMD
   :status: draft
   :links: REQ_EXP_EVENTFILTER, REQ_EXP_EVENTFILTERPERSIST

   **Description:**
   Two commands ``jarvis.filterFutureEvents`` and ``jarvis.filterFutureEventsActive``
   are bound to the same handler that toggles the future-only filter on the EventTreeProvider.

   **Flow:**

   1. Toggle: ``const next = !eventProvider.isFutureOnly()``
   2. Apply: ``eventProvider.setFutureOnly(next)``
   3. Persist: ``workspaceState.update('jarvis.eventFutureFilter', next)``
   4. Update icon + description: ``setContext('jarvis.eventFilterActive', next)``,
      ``eventView.description = next ? '(future only)' : ''``

   **Date comparison (in EventTreeProvider.getChildren):**

   * ``const today = new Date().toISOString().slice(0, 10)``
   * Hide leaf if: ``entity.datesEnd !== undefined && entity.datesEnd < today``

   **Registration in package.json:**

   * ``contributes.commands``: two commands —
     ``jarvis.filterFutureEvents`` (icon ``$(filter)``) and
     ``jarvis.filterFutureEventsActive`` (icon ``$(filter-filled)``),
     both bound to the same handler
   * ``contributes.menus.view/title``: two entries for ``view == jarvisEvents``
     toggled via ``jarvis.eventFilterActive`` context key
```

### Modified SPEC_EXP_SCANNER

```rst
   EntityEntry gains optional field:

   * ``datesEnd?: string`` — event end date in YYYY-MM-DD format; ``undefined`` if absent or invalid

   _buildTree change for events:
   * After extracting ``name``, also read ``doc['dates']?.['end']``
   * If it is a string, store as ``datesEnd``; otherwise omit field
```

### Modified SPEC_EXP_PROVIDER (EventTreeProvider)

```rst
   Add to EventTreeProvider:

   * ``private _futureOnly: boolean = false``
   * ``setFutureOnly(value: boolean): void`` — update flag + refresh
   * ``isFutureOnly(): boolean``

   Modified ``getChildren(root)`` when ``_futureOnly === true``:
   * Filter out ``LeafNode``\s where ``entity.datesEnd !== undefined && entity.datesEnd < today``
```

### Modified SPEC_EXP_EXTENSION

```rst
   Add to activate():

   * Restore filter state: ``context.workspaceState.get<boolean>('jarvis.eventFutureFilter', false)``
     → pass to ``eventProvider.setFutureOnly()``
   * Register commands ``jarvis.filterFutureEvents`` and ``jarvis.filterFutureEventsActive``
     to same handler
   * Set initial context: ``setContext('jarvis.eventFilterActive', savedState)``
```

### Horizontal Check (MECE)

- ✅ SPEC_EXP_SCANNER modification minimal — EntityEntry shape change + one extra field read for events
- ✅ SPEC_EXP_PROVIDER: ProjectTreeProvider fully untouched; EventTreeProvider gets analogous filter
- ✅ SPEC_EXP_FILTERCOMMAND (project command): completely separate — no overlap
- ✅ SPEC_EXP_EVENTFILTER_CMD self-contained — only event view logic

---

## Final Consistency Check

**Status**: ✅ passed

| US | REQ | SPEC | Complete |
|----|-----|------|----------|
| US_EXP_EVENTFILTER | REQ_EXP_EVENTFILTER | SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_PROVIDER | ✅ |
| US_EXP_EVENTFILTER | REQ_EXP_EVENTFILTERPERSIST | SPEC_EXP_EVENTFILTER_CMD, SPEC_EXP_EXTENSION | ✅ |
| US_EXP_SIDEBAR | REQ_EXP_YAMLDATA (modified) | SPEC_EXP_SCANNER (modified) | ✅ |

Cross-level: US intent → REQ behavior → SPEC implementation consistent at all levels.
Fail-open propagates through all three levels. Persistence propagates through all three levels.
All elements set to `:status: approved` and committed to RST files.
