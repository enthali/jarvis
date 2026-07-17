# Change Document: actor-touched-files

**Status**: merged
**Branch**: feature/actor-touched-files (merged to develop)
**Created**: 2026-07-17
**Author**: PM
**Operation Mode**: user-guided
**GitHub Issue(s)**: #18

---

## Summary

Under each entity node (Actor/Project/Event) in the Jarvis tree view, show a
"Recently Touched Files" subtree listing files the AI has read or written
during sessions bound to that entity, so the user has visibility into what
the AI actually touched without digging through transcripts. The Hook
Engine emits per-file touch events (read vs. write) with timestamps on
`PostToolUse`; any write-tool invocation is treated as a touch regardless
of tool success/failure (KISS — no success verification via hooks, per
research spike findings). Touched files render as a hierarchical,
workspace-root-relative tree per entity, persisted in
`.jarvis/state/touched-files/<kind>-<name>.json`, surviving VS Code reload.
Users can click a file to open it in preview, see last-read/last-edited in
a tooltip, and use a context menu (Copy Path, Copy Full Path, Reveal in
Explorer) plus an inline trash icon to remove an entry. Acceptance criteria
and full scope are tracked in GH #18; empirical Hook Engine payload
findings (tool_name → path-field extraction model, read/write/ignore
allowlist) are documented in
`.jarvis/sessions/Research/FI-2026-07-17-hook-payloads-file-touch.md` and
should be used as the authoritative reference for the L1/L2 design.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None modified.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ENT_TOUCHEDFILES | As a Jarvis User, I want each Actor/Project/Event node to show a "Recently Touched Files" subtree (files read/written by the agent during that entity's session), so I can see at a glance what the agent actually touched | optional |

### Decisions

- Decision 1: Placed under the ENT theme (`us_ent.rst`), not HOOK — this is a cross-kind, user-facing tree feature (applies to Actor/Project/Event alike), matching the existing `US_ENT_ENTITY_FILES_TREE` precedent and the naming-convention definition of ENT ("generic, user-facing, cross-kind concepts that apply to ≥2 of Project/Event/Actor"). HOOK is plumbing-consumer infrastructure (like `US_HOOK_ACTIVITY`), not the user-facing surface itself — the story links to `US_HOOK_ROUTE` as its infrastructure dependency, same pattern as `US_HOOK_ACTIVITY` did for the activity indicator.
- Decision 2: Modeled as a **third, independent category node** ("Recently Touched Files") alongside the existing "Agent"/"Files" categories from `US_ENT_ENTITY_FILES_TREE`, not nested inside "Files" — per GH #18's explicit requirement that touched files are workspace-root-relative (not scoped to the entity's own folder), which is a fundamentally different scope than the "Files" category's entity-folder-only listing. Keeping them as siblings avoids conflating two different semantics under one tree.
- Decision 3 (flagging for confirmation before L1): GH #18 AC includes **"Diff view available on right-click"** — not explicitly called out in the CD Summary (which only mentions Copy Path/Copy Full Path/Reveal in Explorer). This requires deciding on a diff mechanism (most likely `vscode.diff()` against the file's source-control HEAD version via the built-in Git extension's virtual document scheme, gracefully degrading/hiding the option when the workspace isn't a git repo or the file is untracked). Will design this into L1/L2 unless told otherwise.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — this is additive to, not overlapping with, `US_ENT_ENTITY_FILES_TREE`'s "Files" category (different scope: workspace-root-relative vs. entity-folder-only)
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

None modified — purely additive (see AC-14).

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ENT_TOUCHEDFILES | Recently Touched Files per Entity | US_ENT_TOUCHEDFILES; REQ_HOOK_ROUTE; REQ_ENT_ENTITY_FILE_CHILDREN; REQ_ENT_ENTITY_CONTEXTMENU | optional |

### Conflicts Detected

None. The new "Recently Touched Files" category is a sibling to the existing "Agent"/"Files" categories (`REQ_ENT_ENTITY_FILE_CHILDREN`), not an overlap — different scope (workspace-root-relative vs. entity-folder-only) and a distinct `contextValue`.

### Decisions

- Decision 1: One combined requirement (`REQ_ENT_TOUCHEDFILES`) covers both the Hook-Engine-side tracker (allowlist classification, persistence) and the tree/UI-side category — mirrors the precedent set by `REQ_HOOK_ACTIVITY`, which likewise covered both its tracker and its tree decorator in a single requirement rather than splitting infra vs. UI across two REQs.
- Decision 2: Diff mechanism confirmed by CM/user: `vscode.diff()` against git `HEAD` via the built-in Git extension's virtual document scheme (AC-12). No fallback/special-casing for non-git workspaces or untracked files — the action simply produces no diff in that case, per explicit "keep it simple" instruction.
- Decision 3: The "Recently Touched Files" category is omitted entirely when an entity has zero touched-file entries (AC-7), rather than always shown empty — consistent with the "Agent" category's existing fail-open omission pattern (`REQ_ENT_ENTITY_FILE_CHILDREN` AC-2c).
- Decision 4: Success/failure of a tool call is explicitly NOT tracked (AC-3) — `tool_response` has no reliable signal per the research spike; every matching `PostToolUse` counts as a touch (write intent honestly reflects what the agent attempted, not what necessarily landed).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — distinct category/contextValue from `REQ_ENT_ENTITY_FILE_CHILDREN`'s "Files"
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

None modified — purely additive (see REQ_ENT_TOUCHEDFILES AC-14 / SPEC_ENT_TOUCHEDFILES AC-11).

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ENT_TOUCHEDFILES | Recently Touched Files per Entity | REQ_ENT_TOUCHEDFILES; SPEC_HOOK_ROUTE; SPEC_HOOK_ACTIVITY; SPEC_ENT_ENTITY_FILE_CHILDREN; SPEC_ENT_ENTITY_CONTEXTMENU; SPEC_ENG_TREEFACTORY |

### Conflicts Detected

None. `TouchTracker`/`TouchStore` are new, independent classes; the "Recently Touched Files" category reuses the existing `jarvisEntityFileFolder` contextValue/menu (no new folder-node behavior) and extends the existing Open/Copy Path/Copy Full Path/Copy File Name `when`-clauses (SPEC_ENT_ENTITY_CONTEXTMENU) rather than duplicating them.

### Decisions

- Decision 1: `TouchTracker` mirrors `ActivityTracker`'s architecture (single `HookEngine.on()` subscription, `getEntityNameForSessionId` resolution, change-callback → targeted `refreshKind()`) rather than inventing a new pattern — consistency with the already-shipped `actor-activity-indicator` CR's infrastructure.
- Decision 2: Entity `kind` (needed for the `<kind>-<name>.json` persistence filename) is resolved via `kindDrivenScanner.entities.find(e => e.name === entityName)` — the exact same lookup `ActivityTracker`'s `extension.ts` wiring already performs for `refreshKind()` — rather than extending `getEntityNameForSessionId` to also return kind.
- Decision 3: The "Recently Touched Files" folder nodes reuse the existing `jarvisEntityFileFolder` contextValue (no new folder contextValue) — they have identical right-click needs (none beyond what folders already get); a distinct contextValue would duplicate menu bindings for zero behavioral difference.
- Decision 4: Diff command (`jarvis.diffTouchedFile`) delegates to the built-in Git extension's `git.openChange` command — no custom git-uri/virtual-document wiring, no fallback path for non-git workspaces or untracked files (per the confirmed CM/user decision from L1) — mirrors the same action's behavior in VS Code's own Source Control view.
- Decision 5: Each touch is written through to disk immediately (no batching/debounce) — `PostToolUse` frequency is bounded by agent tool-call rate, not a hot path; simplicity over throughput optimization (KISS).
- Decision 6: The hierarchical tree is built by walking the flat `relPath -> TouchEntry` map on every expansion (never cached) — this both satisfies "no separate pruning pass" (empty branches structurally cannot appear) and matches the existing "Files" category's on-the-fly-only rule (REQ_ENT_ENTITY_FILE_CHILDREN AC-8).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ENT_TOUCHEDFILES | REQ_ENT_TOUCHEDFILES | SPEC_ENT_TOUCHEDFILES | ✅ |

Sphinx schema validation confirms 0 warnings across all three new/linked IDs — no dangling or malformed `:links:` references introduced by this CR.

### Artefakt-Removal-Check

Not applicable — this CR removes no artefact (file, field, configuration key, or REQ-ID). Purely additive.

### Issues Found

- [x] Issue 1: GH #18's full AC list included "Diff view available on right-click", not present in the CD Summary's condensed paraphrase — found during L0 impact analysis (Task step 1, reading the GH issue directly rather than relying solely on the Summary). Resolved: CM/user confirmed the `git.openChange` (built-in Git extension) mechanism with no fallback handling; designed into SPEC_ENT_TOUCHEDFILES AC-9/Design Notes.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-17

#### Scope

Scoped review per CM notification: REQ_ENT_TOUCHEDFILES/SPEC_ENT_TOUCHEDFILES (all 14 ACs), the two PM-F5 bugfixes (storage-key disambiguation, `ownerKind`/`entityKind` field collision), and their reflection in code, spec, and the UAT test protocol.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | UAT | tst-actor-touched-files.md (Group F) | Both PM-F5 bugfixes are independently confirmed in code (`resolveTouchStorageKind()` in `touchStore.ts`) and unit-tested (4 new tests covering the actor/session-folder branching), and SPEC_ENT_TOUCHEDFILES documents the fix accurately. However, the UAT test protocol has no manual test case for the exact regression scenario that triggered the bug: a raw Session and an Actor entity **sharing the same name**. F-1 tests cross-contamination between two *differently-named* entities (Actor A / Project B), which does not exercise the `resolveTouchStorageKind()` branch at all (that function only does something when `kind === 'session'`, which includes both raw sessions and actors under the shared bucket). A same-name collision case would be the most direct manual confirmation that the fix holds end-to-end. | low |

#### Independent Verification (non-finding, for the record)

- `resolveTouchStorageKind()` (touchStore.ts) and `ownerKind` field naming (treeFactory.ts, no `entityKind` field on any of the 3 new node types) independently re-read in code — both match the val report's claims and SPEC_ENT_TOUCHEDFILES exactly.
- `docs/design/spec_ent.rst` and `docs/requirements/req_ent.rst` both accurately document the bugfixes with matching code samples.
- No other MECE/Trace concerns found; val-actor-touched-files.md's 14-AC verification table and architectural-consistency sections are consistent with independently-read code.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | accept-as-is | The underlying fix (`resolveTouchStorageKind()`) is independently unit-tested (4 new tests covering the actor/session-folder branching) and confirmed correct in code by both PM-F5 re-test and QM's independent code review. The gap is a missing *manual* UAT case for the same-name collision scenario, not an unverified code path — the risk this finding flags is already retired at the unit-test level. Not blocking merge. |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
