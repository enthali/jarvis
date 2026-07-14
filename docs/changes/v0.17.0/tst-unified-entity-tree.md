# Test Protocol: unified-entity-tree

**Change Document:** docs/changes/unified-entity-tree.md  
**Branch:** feature/unified-entity-tree  
**Implementation commit:** 8711139  
**Status:** ready for execution

---

## Scope

This protocol covers the unified `jarvisEntities` Explorer tree, cross-kind
search, per-kind filter relocation, runtime Event registration gating,
backward-compatible Actor scanning, empty-workspace behavior, refresh
forwarding, and retirement of the former standalone views.

## Preconditions and Test Data

1. Build the extension and launch the Extension Development Host with F5.
2. Use a disposable test workspace containing:
   - at least one Actor stored using the legacy `.jarvis/sessions/` convention;
   - at least one Actor stored using the current `.jarvis/actors/` convention;
   - at least two Projects and at least one Event for multi-kind tests;
   - a second workspace, or a temporary backup of the entity directories, for
     single-kind and empty-workspace tests.
3. Ensure `jarvis.events.enabled` can be changed at workspace scope.
4. Reload the Extension Development Host after changing settings or entity
   files so that the scanner state is deterministic.
5. Unless a scenario says otherwise, record the observed tree, menus, and
   QuickPick result before marking the scenario passed.

## Test Groups

### Group A: Unified Tree Rendering and Grouping (REQ_EXP_UNIFIEDTREE)

| ID | Test Case | Preconditions / Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|----------------------|-----------------|--------------------|
| A-1 | Multi-kind category grouping | Populate the workspace with Actors, Projects, and Events. Open the Jarvis Entities view. | The root shows exactly one expanded category node for each registered kind: Actors, Projects, and Events. Each category contains only that kind's existing root nodes. | **PASS** if all registered kinds have one correctly labelled category and no leaf is under the wrong category; otherwise **FAIL**. |
| A-2 | Single-kind always shows category | Use a workspace containing only Actors (no Project or Event entities). Reload and open Jarvis Entities. | An "Actors" category node is still shown at the root; actor entities appear as children of this category node. No flattening occurs. | **PASS** if the Actors category header is present and actor leaves are nested beneath it; otherwise **FAIL**. |
| A-3 | Empty registered kind shows empty category | Use a workspace where Actors is the only registered kind and its folder is empty (no entities). Reload and open Jarvis Entities. | The Actors category node is visible but has no children (no expand arrow). No error is shown. | **PASS** if the empty category is visible with no children and no error; otherwise **FAIL**. |
| A-4 | Per-kind leaf behavior remains unchanged | In a multi-kind workspace, expand category nodes, open entity leaves, expand an Actor's file children, and exercise existing Project/Event leaf actions. | Labels, tooltips, context values, click actions, file-child expansion, Project folder filtering, and Event filtering/sorting behave as before. | **PASS** if the wrapper changes only the ancestor structure and all leaf behavior remains functional; otherwise **FAIL**. |
| A-5 | New action on category node | In a multi-kind workspace, verify each category node shows a `+` inline icon. Click the `+` on the Actors category node. Repeat for Projects and Events if applicable. | Clicking the `+` on a category node triggers the per-kind "New" command (`jarvis.newActor`/`jarvis.newProject`/`jarvis.newEvent`). The view title bar does NOT have a `+` icon. | **PASS** if the `+` is on the category node and triggers the correct per-kind command; otherwise **FAIL**. |

### Group B: Live Filter Entities in Tree (REQ_EXP_SEARCHENTITIES — pivoted from reveal-based search)

| ID | Test Case | Preconditions / Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|----------------------|-----------------|--------------------|
| B-1 | Search command opens input box | Open Jarvis Entities in a workspace containing multiple kinds. Click the search icon in the view title. | The `jarvis.searchEntities` command opens a QuickPick that behaves as a plain text-input box (no item list shown). The command is not offered in the Command Palette. | **PASS** if the QuickPick opens as an input-only box and no standalone search command is exposed; otherwise **FAIL**. |
| B-2 | Live filter narrows tree across all kinds | With Actor, Project, and Event entities present, type a substring matching one Actor's name, one Project's name, and one Event's summary (in turn). | On each keystroke, the `jarvisEntities` tree updates in real time to show only matching leaves (by name or summary, case-insensitive) under their respective category node; non-matching leaves and empty categories' branches are hidden. | **PASS** if the tree filters live and correctly across all three kinds; otherwise **FAIL**. |
| B-3 | Auto-expand and clear-on-close | Type a query that matches an entity nested inside a collapsed folder. Then dismiss the QuickPick (Escape). | While the filter is active, folders containing a match auto-expand (no manual expansion needed). After dismissal, the filter clears and the tree returns to its normal (pre-filter) state, including default folder collapse. | **PASS** if matching folders auto-expand during filtering and the tree fully resets on close; otherwise **FAIL**. |
| B-4 | No matches | Type a query that matches no entity in any registered kind. | The affected kind sections show no children (empty categories) — no error or placeholder message appears. | **PASS** if empty results are handled gracefully; otherwise **FAIL**. |
| B-5 | Combined with per-kind filters | Enable the Project folder filter (hide one folder) and/or the Event future-only filter, then type a search query. | The live filter and the existing per-kind filter both apply — a node must pass both to remain visible. | **PASS** if search filtering composes correctly with Project/Event filters; otherwise **FAIL**. |

### Group C: Filter Relocation (REQ_PRJ_PROJECTFILTER / REQ_EVT_EVENTFILTER)

| ID | Test Case | Preconditions / Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|----------------------|-----------------|--------------------|
| C-1 | Project filter on category node | Use a multi-kind workspace. Right-click the Projects category node and choose the Project folder filter command. Toggle it again while active. | The Project filter command appears on the Projects category node, applies only to Projects, and its active label/state toggles correctly. | **PASS** if the filter is scoped to Projects and the menu is attached to the category node; otherwise **FAIL**. |
| C-2 | Event filter on category node | Use a multi-kind workspace. Right-click the Events category node and choose the future-events filter command. Toggle it again while active. | The Event filter command appears on the Events category node, applies only to Events, and its active label/state toggles correctly. | **PASS** if the filter is scoped to Events and the menu is attached to the category node; otherwise **FAIL**. |
| C-3 | Filter reachable via Command Palette | Open the Command Palette and search for `jarvis.filterProjectFolders` and `jarvis.filterFutureEvents`. | Both filter commands appear in the Command Palette and function correctly when invoked from there (alternative to context-menu on category node). | **PASS** if both commands are accessible and functional from the Command Palette; otherwise **FAIL**. |

### Group D: Event Runtime Gate (REQ_EXP_UNIFIEDTREE AC-8)

| ID | Test Case | Preconditions / Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|----------------------|-----------------|--------------------|
| D-1 | Events disabled | Set `jarvis.events.enabled` to `false`, reload, and open Jarvis Entities in a workspace with Event files and another kind. | Event entities are not registered or shown, no Events category is rendered, and Actor/Project behavior remains available. | **PASS** if disabling the setting removes only the Event kind from the unified tree; otherwise **FAIL**. |
| D-2 | Events enabled | Set `jarvis.events.enabled` to `true`, reload, and open the same workspace. | Event entities are registered and shown. If another kind is present, an Events category appears and Event filtering works. | **PASS** if enabling the setting restores Event registration and rendering; otherwise **FAIL**. |

### Group E: Dual-Path Actor Compatibility (REQ_ACT_TREE AC-14 / REQ_ACT_DUALPATH_SCANNER)

| ID | Test Case | Preconditions / Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|----------------------|-----------------|--------------------|
| E-1 | Legacy and current Actor paths scan together | Place valid `session.yaml` plus `context.md` under `.jarvis/sessions/` and valid `actor.yaml` plus `context.md` under `.jarvis/actors/`. Reload and open Jarvis Entities. | Both Actor entities are visible in the Actors category node. No legacy Actor disappears after introducing the current path. | **PASS** if both storage conventions are scanned and rendered as Actors under the Actors category; otherwise **FAIL**. |
| E-2 | Same-name compatibility edge case | Create same-named Actor entities in both `.jarvis/sessions/` and `.jarvis/actors/`. Reload and inspect the tree and search results. | Both entities appear as distinct nodes/items; neither convention overwrites or silently deduplicates the other. | **PASS** if both records remain independently addressable; otherwise **FAIL**. |

### Group F: Refresh and Regression Checks (REQ_EXP_UNIFIEDTREE AC-6/AC-7)

| ID | Test Case | Preconditions / Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|----------------------|-----------------|--------------------|
| F-1 | Refresh forwarding | Open a multi-kind tree. Add, remove, or modify an entity in each registered kind in turn, then trigger the existing scanner refresh mechanism. | Jarvis Entities refreshes after every wrapped provider change and reflects the updated categories/leaves without requiring a new view. | **PASS** if changes from Actors, Projects, and Events all propagate to the parent tree; otherwise **FAIL**. |
| F-2 | Standalone views retired | Inspect the Explorer and Command Palette after activation. Search the active manifests/source for `jarvisActors`, `jarvisProjects`, `jarvisEvents`, `jarvis.searchProjects`, and `jarvis.searchEvents` active registrations. | Only `jarvisEntities` is registered as the entity view; old standalone views and per-kind search commands are not exposed. Existing provider registrations and entity actions remain functional. | **PASS** if no active orphaned view/search registration remains and no broken reference is observed; otherwise **FAIL**. |
| F-3 | Activation and reload regression | Close and reopen the Jarvis Entities view, reload the Extension Development Host, and repeat a multi-kind open/search/filter flow. | The unified view activates through `onView:jarvisEntities`, opens without errors, and all covered operations remain available after reload. | **PASS** if repeated activation has no missing view, duplicate tree, or stale command behavior; otherwise **FAIL**. |

## Acceptance Criteria Mapping

| Requirement / Design Element | Acceptance Criteria | Test Cases |
|------------------------------|--------------------|------------|
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-1, AC-2, AC-3, AC-4 | A-1, A-2, A-3, F-2 |
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-5 (superseded — no flattening) | A-2 (confirms categories always shown) |
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-6 refresh forwarding | F-1 |
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-7 activation replacement | F-3 |
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-8 Event gate | D-1, D-2 |
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-9 leaf delegation | A-4 |
| REQ_EXP_UNIFIEDTREE / SPEC_EXP_UNIFIEDTREE | AC-10 New action on category node | A-5 |
| REQ_EXP_SEARCHENTITIES / SPEC_EXP_SEARCH_ENTITIES_MANIFEST | AC-1 | B-1 |
| REQ_EXP_SEARCHENTITIES / SPEC_EXP_SEARCH_ENTITIES_CMD | AC-2, AC-3, AC-4 | B-2 |
| REQ_EXP_SEARCHENTITIES / SPEC_EXP_SEARCH_ENTITIES_CMD | AC-5, AC-6, AC-7 | B-3 |
| REQ_EXP_SEARCHENTITIES | AC-8 no matches | B-4 |
| REQ_EXP_SEARCHENTITIES | AC-9 combined with per-kind filters | B-5 |
| REQ_PRJ_PROJECTFILTER / SPEC_PRJ_FILTERCOMMAND | Relocated Project filter trigger | C-1, C-3 |
| REQ_EVT_EVENTFILTER / SPEC_EVT_EVENTFILTER_CMD | Relocated Event filter trigger | C-2, C-3 |
| REQ_ACT_TREE | AC-14 standalone Actor view retirement | E-1, F-2 |
| REQ_ACT_DUALPATH_SCANNER | Backward-compatible Actor scanning | E-1, E-2 |

## Execution Notes

1. Groups A-F are manual UAT scenarios and require the Extension Development Host.
2. Run the automated regression suite with `npm test` or the repository's
   configured Vitest command before final sign-off.
3. Run TypeScript compilation for the affected packages and confirm no errors.
4. Record each scenario as PASS or FAIL with evidence in the verification
   report. Any failure blocks acceptance until resolved or explicitly waived.
5. Restore the disposable workspace and return `jarvis.events.enabled` to its
   original value after execution.

## Sign-off

- [ ] All UAT scenarios pass (A-1 through F-3)
- [ ] Automated regression tests pass
- [ ] TypeScript compilation succeeds
- [ ] No standalone-view or orphaned-command regression remains
- [ ] Ready for verification phase
