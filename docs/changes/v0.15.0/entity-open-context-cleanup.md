# Change Document: entity-open-context-cleanup

**Status**: in-progress
**Branch**: feature/entity-open-context-cleanup
**Created**: 2026-07-01
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Code-cleanup CR resolving the `jarvis.openContext` (Project/Event) vs. `jarvis.openSessionContext` (Actor) naming/behavior asymmetry, flagged as an accepted-but-unaddressed gap during the entity-taxonomy-rename CR. Two different commands currently open `context.md` for different entity kinds: `jarvis.openContext` uses a 3-step discovery+QuickPick flow with icon `$(notebook)` for Project/Event, while `jarvis.openSessionContext` uses on-the-fly creation with icon `$(book)` for Actor. Unify into a single command/resolution path across all 3 entity kinds, consistent with the entity-taxonomy-rename CR's "Project/Event/Actor are equal peer kinds" principle. Code + spec change (not spec-only). Run first, before any other code-cleanup work, per explicit Research/User direction to not let this be deferred indefinitely.

---

## Level 0: User Stories

**Status**: 🔄 in progress

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACT_ACTORS | Actor entity kind | modified | REQ_ACT_TREECLICK's `jarvis.openSessionContext` inline-icon description is stale (dead code) |
| US_ENT_ENTITYPARITY | Entity Feature Parity | modified | the naming asymmetry directly contradicts this US's "equal peer kinds" principle |

### CM Pre-Investigation (impact analysis before dispatch to System Designer)

Direct code inspection (not yet in Research Finding, done here to save a round-trip):

- **`jarvis.openContext`** (extension.ts ~444): 3-step discovery+QuickPick flow (direct path → scan sibling dirs → QuickPick if multiple). No auto-create on missing file — shows "No context.md found" instead. Wired in `package.json`: inline icon `$(notebook)` for **Project/Event** (`jarvisFolder`... contextValue groups) AND already bound to `viewItem =~ /^jarvisSession$/` (i.e. **Actor**) per `REQ_ACT_CONTEXTMENU` AC-1 / `REQ_ACT_OPENCONTEXT`.
- **`jarvis.openSessionContext`** (extension.ts ~489): on-the-fly creation (writes `# <name>\n\n` template if missing) + `preview:false` open. Icon `$(book)`. **DEAD CODE** — both `package.json` menu registrations have `"when": "false"`, and no code path anywhere calls `executeCommand('jarvis.openSessionContext')` programmatically. It is registered but unreachable from any UI surface.
- **Spec drift discovered**: `REQ_ACT_TREECLICK` AC-2/AC-3/AC-6 describe `jarvis.openSessionContext` as the live inline-icon command for Actor nodes (with auto-create semantics) — but this was superseded/never-activated; the actually-live command for Actor is `jarvis.openContext` (no auto-create), per `REQ_ACT_CONTEXTMENU`/`REQ_ACT_OPENCONTEXT`. The REQs contradict each other on which command is authoritative for Actor nodes; implementation matches the `openContext`-side REQs, not `REQ_ACT_TREECLICK`.

### New User Stories

*None planned — this is a consolidation/bugfix within existing US scope (`US_ENT_ENTITYPARITY`), not a new capability.*

### Decisions

- **Single command, single icon**: unify on `jarvis.openContext` as the one command for all 3 entity kinds (Project/Event/Actor) — it is already the live, wired command for all 3 per current `package.json`; `jarvis.openSessionContext` is genuinely dead and should be removed rather than merged, eliminating duplicate code instead of duplicate behavior.
- **Auto-create semantics**: decide whether `jarvis.openContext` should gain the auto-create-on-missing behavior from the dead `openSessionContext` (System Designer's call — Actor entities may have stronger "context.md always exists" expectations per the actor-model description in `entity-taxonomy-rename`).
- **Icon**: standardize on `$(notebook)` (the `openContext` icon) across all 3 kinds — no functional reason found for the `$(book)` icon on the dead command to be preserved.
- **REQ_ACT_TREECLICK cleanup**: this REQ's AC-2/AC-3/AC-6 describing `jarvis.openSessionContext` need correction/removal once the unified command is decided — they currently describe unreachable code as if it were live.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — resolved via `REQ_ACT_TREECLICK` rewrite (see Level 1)
- [x] No redundancies — dead command retirement removes the only redundancy
- [x] Gaps identified and addressed — auto-create semantics decision made (see Level 1 Decisions): NOT adopted, uniform discovery-only behavior for all 3 kinds

### Independent Verification (System Designer)

Re-verified CM's pre-investigation directly against the code (not just trusted):

- `packages/core/src/extension.ts` lines ~444-513: confirmed `jarvis.openContext` (3-step discovery, no auto-create) and `jarvis.openSessionContext` (on-the-fly creation) exist exactly as described.
- `packages/core/package.json`: confirmed `jarvis.openSessionContext`'s only menu entry is `commandPalette` `"when": "false"` — no `view/item/context` entry exists for it anywhere. Confirmed dead.
- `packages/core/package.json` line ~156: confirmed `jarvis.openContext` IS wired to `viewItem =~ /^jarvisSession$/` (Actor), inline@1.
- **New finding, not in CM's pre-investigation**: the Project/Event `jarvis.openContext` binding does not live in `packages/core/package.json` at all — it's contributed by `packages/pim/package.json` (`viewItem =~ /^jarvis(Project|Event)$/`). This is architecturally relevant (PIM package owns Project/Event tree decoration, core owns Actor) but does not change the design conclusion — `jarvis.openContext` is still the one shared command, registered once in core and referenced by two different `package.json` files' menu contributions.
- Confirmed `REQ_ACT_TREECLICK` AC-2/AC-3/AC-6 (pre-fix) describe the dead command as live, contradicting AC-5 (pre-fix) which lists `jarvis.openContext` among the "unchanged" existing entries — a genuine internal self-contradiction, now resolved.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_ACT_TREECLICK` | `US_ENT_ENTITYPARITY` | rewritten | Removed stale ACs describing dead `jarvis.openSessionContext`; added explicit retirement note and cross-reference to the auto-create decision |
| `REQ_ENT_OPENCONTEXT` | `US_ENT_OPENCONTEXT` | extended | Scope widened from "project and event" to explicitly include "actor" (formalizing what was previously only implicit via `REQ_ACT_OPENCONTEXT`); added `preview: false` standardization and explicit no-auto-create statement to AC-6 |
| `REQ_ACT_OPENCONTEXT` | `US_ACT_ACTORS` | unchanged | Already correct — already specifies `preview:false` and identical dispatch behavior for Actor; retained as-is, now cross-referenced from `REQ_ENT_OPENCONTEXT` |
| `REQ_ACT_CONTEXTMENU` | `US_ACT_ACTORS` | unchanged | AC-1 already correctly names `jarvis.openContext` (not the dead command) — verified accurate, no change needed |

### New Requirements

None. This is a consolidation/bugfix within existing REQ scope, not a new capability — consistent with the CD's Level 0 "no new User Stories" decision.

### Conflicts Detected

- ⚠️ `REQ_ACT_TREECLICK` (pre-fix) vs `REQ_ACT_CONTEXTMENU`/`REQ_ACT_OPENCONTEXT`: contradicted each other on which command (`jarvis.openSessionContext` vs `jarvis.openContext`) is the live Actor inline-context.md command.
  - **Resolution**: `REQ_ACT_TREECLICK` rewritten to match the implementation ground truth (`jarvis.openContext` is authoritative); the dead command is formally retired, not merged.

### Decisions

- **Unified command**: `jarvis.openContext` is the single command for all 3 kinds. `jarvis.openSessionContext` is retired (removed, not merged) — confirmed genuinely dead (no live callers, no `view/item/context` binding ever existed for it).
- **Auto-create semantics (the open design question)**: **NOT adopted.** `jarvis.openContext` keeps its existing discovery-only behavior (no auto-create) for all 3 kinds. Rationale: all 3 entity kinds already receive `context.md` at entity-creation time via their respective creation tools/commands (`jarvis_createProject`/`jarvis_createEvent`/`jarvis_createSession` and UI equivalents) — the Actor "state = context.md" architectural expectation from the actor-model description is satisfied at creation time, not by the open command. A missing `context.md` at open-time is an edge case (manual folder creation, accidental deletion) equally possible for any kind; silently mutating the filesystem as a side effect of a read-only "open" action was rejected in favor of extending the already-majority (2 of 3 kinds) discovery-only behavior to the third.
- **Icon**: `$(notebook)` standardized across all 3 kinds — already the case in practice since `$(book)` was never actually rendered (dead command). No icon change needed in code; the decision is now explicit in the spec.
- **`preview: false` standardization**: added to all 3 `showTextDocument()` call sites in `jarvis.openContext`'s handler (previously only `jarvis.openSessionContext` set this) — a small correctness improvement consistent with "unify the resolution path," not scope creep, since it directly serves the CR's stated goal.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — the one identified contradiction is resolved
- [x] No redundancies — dead command formally retired
- [x] All new REQs link to User Stories — N/A (no new REQs)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_ACT_TREECLICK` | `REQ_ACT_TREECLICK` | rewritten | Removed the entire "new `jarvis.openSessionContext` command" section (was ~150 lines: handler code, package.json wiring, icon rationale, legacy-resilience notes); replaced with a "Retired" section documenting what's removed and why, plus the Auto-create decision rationale. Title changed from "...and Inline Context Icon" to reflect the icon is no longer separately introduced. Rewrote Acceptance Criteria to verify absence of the dead command instead of its presence. |
| `SPEC_ENT_OPENCONTEXT_CMD` | `REQ_ENT_OPENCONTEXT` | extended | Description widened to explicitly cover all 3 kinds; handler code updated with `{ preview: false }` on all 3 `showTextDocument()` calls; menu registration section extended to show the `jarvisSession` entry (previously undocumented in this SPEC, only implicit); design notes updated with the PIM/core package-split architecture note and cross-references to the auto-create decision |

### New Design Elements

None — consolidation of existing specs, not new capability.

### Conflicts Detected

None beyond the Level 1 conflict already resolved (same root cause, addressed at both levels together).

### Decisions

- `SPEC_ACT_TREECLICK`'s click-semantics-inversion content (Actor click → `jarvis.openAgentSession`, not `jarvis.openContext`) is **unchanged and still valid** — only the dead command's introduction is removed. This is a live, correct, unrelated behavior that must not be disturbed.
- Code removal is scoped precisely: delete the `openSessionContextCommand` registration + its `context.subscriptions.push(...)` entry in `extension.ts`; delete the `jarvis.openSessionContext` entries from `package.json` (`contributes.commands`, `contributes.menus.commandPalette`). No `view/item/context` entry exists to remove (never added).
- `SPEC_ENT_OPENCONTEXT_CMD`'s existing 3-step discovery algorithm is **unchanged** — only `preview: false` was added to each `showTextDocument()` call; the resolution logic itself (direct hit → subfolder scan → picker → not-found message) is correct as-is for all 3 kinds and needs no further change.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — the one identified contradiction is resolved
- [x] All new SPECs link to Requirements — N/A (no new SPECs)

---

## Final Consistency Check

**Status**: ✅ passed (design-level; code removal pending Dev Engineer)

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_ACTORS | REQ_ACT_TREECLICK (rewritten), REQ_ACT_OPENCONTEXT, REQ_ACT_CONTEXTMENU | SPEC_ACT_TREECLICK (rewritten) | ✅ |
| US_ENT_ENTITYPARITY | REQ_ENT_OPENCONTEXT (extended) | SPEC_ENT_OPENCONTEXT_CMD (extended) | ✅ |

Verified via `get_need_links.py REQ_ACT_TREECLICK --direction both` — resolves to `REQ_ACT_OPENCONTEXT`, `REQ_ENT_ENTITY_TREECLICK`, `REQ_UAT_SESSIONTREECLICK`, `SPEC_ACT_TREECLICK`, `US_ENT_ENTITYPARITY` — no dangling links.

### Artefakt-Removal-Check

**Design-level (spec content already removed in this CR):**

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|-------------------|-------------------------------|----------------------|----------------------------------|
| `jarvis.openSessionContext` command spec content (`SPEC_ACT_TREECLICK` section 2-6, `REQ_ACT_TREECLICK` AC-2/3/6) | **Not yet fixed — code still contains the live registration** (`extension.ts` ~489, `package.json` command + commandPalette entries). This is a **code change**, outside Designer's role — flagged explicitly here, not silently left. Dev Engineer must remove: the `openSessionContextCommand` handler + its `context.subscriptions.push(...)` line in `extension.ts`; the `contributes.commands` entry and `contributes.menus.commandPalette` entry in `package.json`. | **Fixed by Test Designer (2026-07-01):** `docs/userstories/us_uat_sessiontreeclick.rst`, `docs/requirements/req_uat_sessiontreeclick.rst`, `docs/design/spec_uat_sessiontreeclick.rst` — T-9 rewritten to verify full **non-existence** (no `package.json` reference in any package, absent from Command Palette, and `executeCommand` rejects with "command not found") rather than mere palette-invisibility. Also added T-10 (cross-kind consistency: `jarvis.openContext`'s `preview:false` + discovery-only/no-auto-create behavior verified identical across Session/Project/Event), and corrected the now-stale T-6/AC-6/AC-7 "auto-recreate context.md" scenario to match the CR's actual no-auto-create decision. `sphinx-build -W --keep-going -E` passes, 0 warnings. | None — this CR is new; no historic Change Docs reference `jarvis.openSessionContext`'s removal (its introduction is documented in `session-tree-click-behavior` v0.5.x history, which is unaffected — historic record of what was built, correctly retained) |

- [ ] All class (a) active code/workflow references fixed in this CR — **NO, this is a code+spec CR; the code removal is Dev Engineer's task, not yet done**
- [x] All class (b) active documentation references fixed in this CR — spec-level (REQ/SPEC) content and UAT test-artifact content are now both updated (UAT fixed by Test Designer, 2026-07-01)
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above (N/A — no historic docs affected)

### Issues Found

- [x] Issue 1: Code removal (`extension.ts`, `package.json`) is required to match this design — routed to Dev Engineer via CM (not handed off directly, per CM's instruction)
- [x] Issue 2: UAT test artifacts (`us_uat_sessiontreeclick.rst`, `req_uat_sessiontreeclick.rst`, `spec_uat_sessiontreeclick.rst`) test for palette-absence but not full non-existence — **resolved by Test Designer (2026-07-01)**: rewritten to test non-existence (T-9) and added cross-kind consistency coverage (T-10)

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining — no stubs left, full retirement per no-permanent-stubs policy)
- [x] All conflicts resolved
- [x] Traceability verified
- [ ] Ready for implementation — **design is ready; code implementation (removal + verification) is Dev Engineer's next step, to be dispatched by CM**

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1 (Independent QM Review)

**Reviewed by:** Quality Manager (direct code inspection + dispatched Trace Engineer on the REQ_ACT_TREECLICK/SPEC_ACT_TREECLICK retirement + REQ_ENT_OPENCONTEXT/SPEC_ENT_OPENCONTEXT_CMD unification)
**Review date:** 2026-07-01

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | — (CD structure) | This Change Document | The "Final Consistency Check" status line ("design-level; code removal pending Dev Engineer") and the Sign-off checkbox ("Ready for implementation: [ ]") are stale — implementation (commit b4963df) and UAT (commit c57e453) are both already complete per CM's own report and independently confirmed by QM (see below). Same class of minor CD-staleness pattern seen in `entity-taxonomy-rename`. Cosmetic only. | low |

#### Independent Verification (direct code read, not just trusting the report)

- `packages/core/src/extension.ts`: zero remaining references to `openSessionContext` — dead command handler fully removed; `jarvis.openContext` handler confirmed present with `{ preview: false }` on all 3 `showTextDocument()` call sites.
- `packages/core/package.json`: zero remaining `jarvis.openSessionContext` entries (command, menu, or palette).
- `packages/core/package.json` / `packages/pim/package.json`: confirmed the PIM/core menu-contribution split described in the CD — `jarvis.openContext` wired to `jarvisSession` in core and `jarvisProject`/`jarvisEvent` in PIM, both invoking the one command registered in core.
- **Trace Engineer** (REQ_ACT_TREECLICK/SPEC_ACT_TREECLICK retirement + REQ_ENT_OPENCONTEXT/SPEC_ENT_OPENCONTEXT_CMD unification): PASS — retirement documentation accurate and non-contradictory, all links valid (no dangling references), zero stale "live" references to the dead command anywhere in `docs/` (20 occurrences found, all are retirement/removal-instruction/UAT-non-existence-test/historical context), full cross-kind consistency (command/icon/discovery-logic/`preview:false`/no-auto-create) confirmed identical across Project/Event/Actor.

**QM Verdict: CLEAR.** Code, spec, and UAT are all independently confirmed consistent and complete. The one finding (#1) is cosmetic CD-formatting staleness, not a content or functional defect — no fix-now required to unblock merge, but recommend a quick housekeeping pass (flip the two stale status markers) whenever convenient.



## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
