# Change Document: actor-activity-indicator

**Status**: design-complete
**Branch**: feature/actor-activity-indicator
**Created**: 2026-07-16
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Add a two-state activity indicator (Active / Inactive) to every entity node (Actor, Project, Event) in the Jarvis Entities tree, driven by the existing Hook Engine. A green dot marks the node whose session is currently processing; a white circle marks all idle nodes. The indicator updates in real time: any hook event from a session sets the corresponding entity to Active; a `Stop` event returns it to Inactive. Default state at startup is Inactive for all nodes.

This change also includes a prerequisite 1-line bug fix in `hookIntake.ts`: the `session_id` field is currently extracted as `parsed.sessionId` (camelCase) but the actual Hook API payload uses snake_case (`parsed.session_id`), causing `event.sessionId` to always be `undefined`. This fix is required for the session→entity mapping to work at all, and also unblocks the "Linchpin" session-linking verification described in the research document referenced below.

**Research reference:** `.jarvis/sessions/Research/FI-2026-06-28-hook-engine.md` — contains the Hook API field inventory, the `session_id` bug root-cause analysis with live payload evidence, the `transcript_path` docking-lever finding, and the open Linchpin question about `session_id` ↔ `SessionInfo.sessionId` correlation. The System Designer and Dev Engineer should consult this document before designing the session→entity mapping.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None modified.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_HOOK_ACTIVITY | As a Jarvis User, I want every Actor/Project/Event node to show a two-state (Active/Inactive) indicator reflecting hook-driven agent activity, so I can tell at a glance what's happening right now | optional |

### Decisions

- Decision 1: Placed under the HOOK theme (`us_hook.rst`), not ENT/EXP — this is the first real consumer of the Hook Engine's dispatch registry (US_HOOK_ROUTE), and the story is fundamentally "what does a hook event *do*", not a tree-rendering story in its own right. Linked to `US_EXP_SIDEBAR` for the tree-surface context.
- Decision 2: No third "Error"/"unknown" state and no timeout-based transition, per CM's explicit dispatch scope — kept as an explicit AC (AC-5) to prevent future scope creep from silently adding one.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_HOOK_INTAKE | (bundled bug fix, not story-linked) | modified | Added AC-8: session id SHALL be extracted from payload's `session_id` (snake_case), documenting and closing the spec gap behind the confirmed `parsed.sessionId` (camelCase) bug. |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_HOOK_ACTIVITY | Hook-Driven Entity Activity Indicator | US_HOOK_ACTIVITY; REQ_HOOK_ROUTE; REQ_HOOK_INTAKE; REQ_ENG_TREEFACTORY; REQ_EXP_UNIFIEDTREE | optional |

### Conflicts Detected

None.

### Decisions

- Decision 1: The session→entity mapping (AC-5) reuses the existing `getAllSessions()`/title-matching mechanism (same source `lookupSessionUUID()` already uses forward) rather than inventing a new correlation path — entities are already named to match their bound chat session's title (SPEC_ENT_AGENTSESSION), so title-matching is the established mechanism, not new surface area.
- Decision 2 (flagged for CM visibility, not a blocking issue — **since resolved, see Round 2 below**): the entire feature's functioning depended on an **unverified assumption** — that hook `session_id` and `SessionInfo.sessionId` are the same UUID space. This was never empirically testable before this CR because the `session_id` extraction bug (REQ_HOOK_INTAKE AC-8) meant the field was always `undefined`. **Round 2 update:** PM's live F5 test confirmed the correlation holds in practice — state transitions fire correctly for real chat sessions. AC-9's graceful-degradation fallback (silent all-Inactive) remains as a safety net for edge cases (stale/unmapped sessions), not as the expected default.
- Decision 3 (**superseded — see Round 2 below**): ~~Icon mechanism is a label-prefix (codicon in `item.label`), not `item.iconPath` — see Level 2 decision below for the full rationale (avoids collision with the existing `TaskBadgeDecorator`).~~

### Round 2 (F5 finding — icon mechanism pivot)

- **Finding:** PM's live F5 test found that `$(circle-filled)`/`$(circle-outline)` codicon syntax renders as **literal text** in a VS Code `TreeView` label (e.g. "$(circle-filled) Alice") — this syntax only resolves inside QuickPick items and the status bar, not tree item labels. The original Decision 3 (label-prefix to avoid the `TaskBadgeDecorator` `iconPath` collision) was invalidated by this rendering limitation.
- **PM decision:** switch to `item.iconPath` — Active: `new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('charts.green'))`; Inactive: `iconPath` left untouched (not reset to a specific icon).
- **Conflict resolution, revised:** instead of avoiding the `TaskBadgeDecorator` `iconPath` collision by using a different `TreeItem` field, the two decorators now **time-share** the same field: `ActivityDecorator` only *asserts* `iconPath` while Active; while Inactive it leaves `iconPath` alone, so `TaskBadgeDecorator`'s task-urgency icon (if any) remains visible. This is arguably better UX than the original design (PM's assessment) — an active conversation's green dot takes visible priority, and idle entities show their normal/task-urgency icon.
- REQ_HOOK_ACTIVITY AC-8/AC-9/AC-10 and SPEC_HOOK_ACTIVITY amended accordingly (AC-8 struck through/superseded by new AC-8a; SPEC's ActivityDecorator code sample, Design notes, and ACs updated to the `iconPath` mechanism).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_HOOK_INTAKE | REQ_HOOK_INTAKE | modified | `HookEvent.sessionId` doc comment and AC-2 amended to state the field is read from `session_id` (snake_case); prior-bug note added with strikethrough, per project convention for superseded text. |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_HOOK_ACTIVITY | Hook-Driven Entity Activity Indicator | REQ_HOOK_ACTIVITY; SPEC_HOOK_ROUTE; SPEC_HOOK_INTAKE; SPEC_ENG_TREEFACTORY |

### Conflicts Detected

- ⚠️ New `ActivityDecorator` vs. existing `TaskBadgeDecorator` (SPEC_PIM_TASKBADGE): both would want to touch the same `TreeItem` for Project/Event kinds. `TaskBadgeDecorator` already sets `item.iconPath` conditionally (overdue/due-soon tasks); a second decorator also setting `iconPath` would silently overwrite it depending on registration order.
  - Resolution (**Round 2, current**): `ActivityDecorator` uses `item.iconPath` (ThemeIcon + green ThemeColor) when Active, and leaves `iconPath` untouched when Inactive — a time-sharing resolution rather than a field-separation one. `TaskBadgeDecorator`'s icon remains visible whenever the entity is Inactive; the activity indicator only asserts itself while Active.
  - ~~Resolution (Round 1, superseded): `ActivityDecorator` uses a codicon prefix directly in `item.label` (`$(circle-filled)` / `$(circle-outline)`) instead of `item.iconPath` — a different `TreeItem` field, so both decorators can act on the same node unconditionally, order-independent.~~ **Invalidated by F5 test:** codicon syntax does not render in `TreeView` labels (renders as literal text).

### Decisions

- Decision 1: New module `activityTracker.ts` (tracker) + `activityDecorator.ts` (decorator) in `packages/core/src/engine/hooks/`, keeping the Hook Engine's existing package boundary (no new package).
- Decision 2: State-flip changes trigger `refreshKind()` only for the affected kind, only on an actual boolean flip (not on every underlying hook event) — avoids refresh storms during a burst of `PreToolUse`/`PostToolUse` events within one already-Active turn.
- Decision 3 (disclosed, not blocking): see Level 1 Decision 2 — the Linchpin correlation is architecturally plausible (both are VS Code's own internal chat session UUID spaces) but unverified; design degrades gracefully either way.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_HOOK_ACTIVITY | REQ_HOOK_ACTIVITY | SPEC_HOOK_ACTIVITY | ✅ |
| (bug fix, no story) | REQ_HOOK_INTAKE (amended) | SPEC_HOOK_INTAKE (amended) | ✅ |

### Artefakt-Removal-Check

Not applicable — this CR adds and amends elements, it removes nothing.

### Issues Found

- [x] Issue 1 (**RESOLVED — Round 2**): **Linchpin assumption** — hook `session_id` ↔ `SessionInfo.sessionId` correlation. PM's live F5 test confirmed this holds in practice (state transitions fire correctly for real chat sessions bound to entities). AC-9's graceful degradation remains as a safety net for edge cases, not as the expected outcome.
- [x] Issue 2 (**Round 2 — found and fixed**): `$(circle-filled)`/`$(circle-outline)` codicon syntax in `item.label` was found via live F5 test to render as **literal text** in `TreeView` (only resolves in QuickPick/status bar). Fixed: switched to `item.iconPath` (green `ThemeIcon` when Active, untouched when Inactive). This also changed how the `TaskBadgeDecorator` conflict is resolved — from field-separation (Round 1) to time-sharing (Round 2, current) — see Level 2 Conflicts.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified (Sphinx build: 0 warnings; incoming/outgoing links confirmed via `get_need_links.py` and rendered HTML backlinks)
- [x] Ready for implementation (Round 2 amendment applied post-F5; Dev Engineer to re-verify icon rendering)

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-17

#### Verification Summary

**1 medium finding (non-blocking for code correctness — PM decides fix/defer/accept).**

1. **Bug fix verified:** `hookIntake.ts` uses `parsed.session_id` (snake_case) — REQ_HOOK_INTAKE AC-8 ✓
2. **ActivityDecorator (icon fix applied):** `item.iconPath = new vscode.ThemeIcon('circle-filled', ThemeColor('charts.green'))` when active; early-return (iconPath untouched) when inactive ✓
3. **session_id correlation:** confirmed empirically by PM F5 test ✓
4. **Build** (`npx tsc -p packages/core`): clean (0 errors) ✓
5. **Tests** (`npx vitest run`): 213/213 passed ✓
6. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓
7. **Traceability** (spot-check `get_need_links.py`): REQ_HOOK_ACTIVITY links = [US_HOOK_ACTIVITY, REQ_HOOK_ROUTE, REQ_HOOK_INTAKE, REQ_ENG_TREEFACTORY, REQ_EXP_UNIFIEDTREE], linked_from = [SPEC_HOOK_ACTIVITY] — 0 dangling ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | UAT | tst-actor-activity-indicator.md | UAT Group E (E-1, E-2, E-3) and the AC Mapping table entry for REQ_HOOK_ACTIVITY AC-8 describe the **old label-prefix approach** that was abandoned in the F5 fix (commit dbcc83d). Specifically: E-2 asserts "No iconPath change is attributable to the activity indicator" — this is now **wrong** (activity indicator does set iconPath when active). E-1 expects both task badge AND label prefix visible simultaneously — wrong (two decorators now time-share iconPath; green circle replaces task badge while entity is active). C-1/C-4/C-6 describe the icon as text prefix `$(circle-filled) <name>` — the visual is now a ThemeIcon, not a label text change. The UAT was committed (e30289c) before the spec amendment (aad8463) and was never updated to reflect the icon mechanism pivot. | medium |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now | Test Designer updated UAT Group E and AC Mapping row (commit 0242ec8) to correctly describe the iconPath approach. Finding resolved — see Round 2. |

---

### Round 2

**Reviewed by:** QM
**Review date:** 2026-07-17
**Scope:** Re-verification of Round 1 medium finding (stale UAT Group E)

#### Verification Summary

**CLEAR** — Round 1 medium finding resolved. No new findings.

**UAT fix verified (commit 0242ec8):**
- E-1: "Active green icon overrides task badge" — `ActivityDecorator` sets `iconPath = ThemeIcon('circle-filled', ThemeColor('charts.green'))` when active, overrides task badge ✓
- E-2: "Inactive entity restores task badge icon" — `ActivityDecorator` does NOT set iconPath when inactive; TaskBadgeDecorator's icon becomes visible again ✓
- E-3: "Default icon when no task badge" — no iconPath modification on inactive entity ✓
- C-tests: describe green `ThemeIcon` (not text prefix) ✓
- AC Mapping row for AC-8: "AC-8a (iconPath = ThemeIcon(circle-filled, charts.green) when active; iconPath untouched when inactive)" ✓

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No new findings (Round 1 finding resolved)* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

```
$ get_need_links.py REQ_HOOK_INTAKE --direction both --simple
{
  "id": "REQ_HOOK_INTAKE", "type": "req", "title": "Agent Hook Intake", "status": "draft",
  "links_outgoing": ["US_HOOK_OBSERVE"],
  "links_incoming": ["SPEC_HOOK_CONFIG", "SPEC_HOOK_BRIDGE", "SPEC_HOOK_INTAKE", "REQ_HOOK_ROUTE", "REQ_HOOK_ACTIVITY"]
}

$ get_need_links.py REQ_HOOK_ROUTE --direction both --simple
{
  "id": "REQ_HOOK_ROUTE", "type": "req", "title": "Hook Event Routing", "status": "draft",
  "links_outgoing": ["US_HOOK_ROUTE", "REQ_HOOK_INTAKE"],
  "links_incoming": ["SPEC_HOOK_ROUTE", "REQ_HOOK_ACTIVITY"]
}

$ get_need_links.py REQ_ENG_TREEFACTORY --direction both --simple
{
  "id": "REQ_ENG_TREEFACTORY", "type": "req", "title": "Generic Tree-Provider Factory", "status": "approved",
  "links_outgoing": ["US_MOD_INSTALL"],
  "links_incoming": ["SPEC_ENG_TREEFACTORY", "REQ_HOOK_ACTIVITY"]
}

$ get_need_links.py REQ_EXP_UNIFIEDTREE --direction both --simple
{
  "id": "REQ_EXP_UNIFIEDTREE", "type": "req", "title": "Unified Entities Tree", "status": "approved",
  "links_outgoing": ["US_EXP_SIDEBAR", "REQ_ACT_TREE", "REQ_PRJ_PROJECTFILTER", "REQ_EVT_EVENTFILTER"],
  "links_incoming": ["REQ_ACT_TREE", "REQ_EVT_EVENTFILTER", "REQ_PRJ_PROJECTFILTER", "US_EXP_SIDEBAR",
                     "SPEC_EXP_UNIFIEDTREE", "REQ_EXP_SEARCHENTITIES", "REQ_HOOK_ACTIVITY"]
}
```

No unexpected downstream consumers found — all incoming links on the impacted
existing IDs are either pre-existing or are the new IDs added by this CR.

---

*Generated by syspilot Change Agent*
