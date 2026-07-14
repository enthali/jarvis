# Change Document: actor-internal-identifiers-rename

**Status**: in-progress
**Branch**: feature/actor-internal-identifiers-rename
**Created**: 2026-07-06
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Phase 1b of the "Consequent Actor Renaming" initiative. Renames the remaining internal code identifiers that still reference "Session" as the Jarvis actor entity kind — the VS Code view ID (`jarvisSessions`), the `jarvis.newSession` command ID, and TypeScript class/type names in `packages/core` — to their "Actor" equivalents. These identifiers carry zero on-disk data-compatibility risk: nothing is persisted under these names (unlike storage paths `.jarvis/sessions/`/`session.yaml`, which remain explicitly out of scope, deferred to Phase 2). The only user-visible side effect is a one-time reset of VS Code's per-identifier UI state (keybindings bound to old command IDs, tree view-collapse memory) — acceptable since Phase 1 (`actor-terminology-rename`, already shipped) already changed the human-facing labels these identifiers back. Genuine VS Code "chat session" concepts and identifiers are a distinct concept and are NOT in scope.

**Scope correction found during design (System Designer, user-confirmed):** `jarvis.openAgentSession` is **not** renamed to an Actor-specific command ID in this CR. Impact analysis found it is bound to Project and Event context menus (`packages/pim/package.json`) as well as Actor's — it is a generic "open this entity's bound agent chat" command (`REQ_ENT_AGENTSESSION`), not Actor-specific. Renaming its ID here would be wrong (same command, three entity kinds). **Bundled bug fix (user-approved, scope extended slightly, PM notified):** Phase 1 (`actor-terminology-rename`) had already changed this shared command's *title* to "Jarvis: Open Actor Chat" — which is itself a bug, since it now mislabels the Project/Event "Open" context-menu action. Fixed here to the entity-neutral "Jarvis: Open Agent Chat" while already in the area; the command ID itself (`jarvis.openAgentSession`) is unchanged.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACT_ACTORS | Actor Entity Type | unchanged | Already covers this at the concept level (its own note anticipates the code-level rename as a "separate, future code migration") |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|

### Decisions

- No new US needed — same rationale as Phase 1: this CR fulfills already-specified intent (internal identifiers catching up to the concept-level "Actor" rename), not a new user-facing capability.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ACT_TREE | US_ACT_ACTORS | modified | New AC-10 (view ID `jarvisSessions`→`jarvisActors`), AC-11 (`jarvis.newSession`→`jarvis.newActor`), AC-12 (**dead-code removal**, corrected during design — `SessionTreeProvider` class + its test fixture removed, not renamed), AC-13 (bug fix: `jarvis.openAgentSession` title corrected, ID unchanged). AC-8 annotated (struck through) to record the Phase 1 bug it contained. |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|

### Conflicts Detected

- **Resolved during design, user-confirmed:** the CD's original scope line ("command IDs: `jarvis.newSession`, `jarvis.openAgentSession`") conflicted with reality — `jarvis.openAgentSession` is shared across Project/Event/Actor (`REQ_ENT_AGENTSESSION`), so an Actor-specific rename would break/mislabel Project and Event's "Open" action. Resolution: do not rename `jarvis.openAgentSession`'s ID; instead fix its Phase-1-introduced mistitling bug (see AC-13). Summary section updated accordingly; user approved bundling the bug fix into this CR's scope.

### Decisions

- `kind: 'session'` (entity-kind registry string) and `contextValue: 'jarvisSession'` (per-leaf-node) are explicitly left unrenamed — they are echoed in tool-facing JSON (`jarvis_listJarvisSessions` output), so renaming them now would silently change an LM/MCP tool contract, which is Phase 5's job (deprecation-cycle treatment, same as `sendMessage`/`receiveMessage`), not this CR's.
- **Corrected during design (user-confirmed):** AC-12 was originally going to rename the `SessionTreeProvider` class to `ActorTreeProvider`. Impact analysis found this class has zero production callers — the live Actor tree provider is the generic `engine.treeFactory.getProvider('session')`. The class was a deliberately-kept "legacy reference implementation" whose only consumer was `src/tests/sessionTreeEquivalence.test.ts` (a one-time migration-equivalence proof from a prior CR, the "S5 engine generalization"). Renaming dead code would be misleading. Decision: **remove both files** instead of renaming. Done directly in this design session (user explicitly authorized the implementation action, an exception to the normal design→implement handoff for this narrow, already-verified-safe cleanup) — see Level 2 for the collateral test fix this required.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (no new REQs — only existing amended)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ACT_TREE | REQ_ACT_TREE | modified | Amendment notes for Phase 1b renames (view ID) + AC-13 bug fix; **class-removal note** (not rename) documenting `SessionTreeProvider` is dead code, now removed; original code sample re-marked HISTORICAL |
| SPEC_ACT_MANIFEST | REQ_ACT_TREE | modified | All package.json code samples rewritten to reflect both Phase 1 (previously undocumented) and Phase 1b changes — this spec's samples had never been updated after Phase 1 shipped |
| SPEC_ACT_NEWENTITY | REQ_ACT_TREE | modified | Amendment note: `jarvis.newSession`→`jarvis.newActor` command ID, translation guidance for the historical prose below (left otherwise unchanged) |
| SPEC_ACT_TREECLICK | (historical prose reference) | modified | Added a clarifying note that `SessionTreeProvider`/`sessionTreeProvider.ts` referenced in this spec's historical description no longer exists; behavior described is unaffected (now lives in the generic factory's config) |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|

### Conflicts Detected

- None new beyond the L1 conflict already resolved (see above) — `SPEC_ACT_MANIFEST`/`SPEC_ACT_TREE`/`SPEC_ACT_NEWENTITY` are all internally consistent with the corrected REQ_ACT_TREE ACs.

### Decisions

- **Found and fixed while in this area (bonus, not in original dispatch):** `SPEC_ACT_MANIFEST`'s package.json code samples still showed the pre-Phase-1 strings ("Sessions" title, "Jarvis: New Session") — Phase 1 never updated them. Rewrote them to show the current, correct state (Phase 1's shipped changes + this CR's own). Also found and fixed two file-level H1 headings still saying "Sessions" (`req_act.rst`, `spec_act.rst`) — trivial, adjacent, low-risk fixes while already editing these exact files.
- **Not fixed, flagged instead:** many historical prose mentions of `jarvis.newSession` remain throughout `spec_act.rst`'s older, narrative sections (e.g. step-by-step handler descriptions, "Notes" bullets). Consistent with how Phase 1 handled this same file (added a translation note rather than rewriting all prose), I added amendment notes at the top of each amended SPEC explaining the rename and telling the reader how to translate old identifier mentions, rather than doing a mechanical full-file rewrite — judged as the right scope boundary for a "rename internal identifiers" CR, not a full historical-prose cleanup.
- **Actual code change made during design (user-authorized):** deleted `packages/core/src/apps/session/sessionTreeProvider.ts` and `src/tests/sessionTreeEquivalence.test.ts`. Verified via `npx tsc -p packages/core` (clean) and `npx vitest run` (214/214 passing after one collateral fix — see Artefakt-Removal-Check). This is normally Dev Engineer's job, but the user explicitly directed me to do it directly as part of this design session given how narrow/pre-verified-safe the change was.
- **Collateral fix required:** `src/tests/remove-open-recording-icon.test.ts` had 2 assertions reading `sessionTreeProvider.ts`'s file content directly (AC-6/AC-7 of `SPEC_EXP_ENTITY_ICONS`) — these broke when the file was deleted. Rewrote them to check `extension.ts`'s session `EntityKindConfig` registration instead (same intent: no recording-conditional/ternary contextValue branching), consistent with how Project/Event's equivalent checks already work.
- **Coverage gap flagged, not filled (Test Designer follow-up):** Project and Event each have their own `*TreeExpectation.test.ts` (literal-assertion tests against the generic factory, replacing their own removed legacy equivalence tests in a prior CR). No `sessionTreeExpectation.test.ts` exists for session/actor — recommend Test Designer add one as a small follow-up, now that the equivalence test that partially covered this is gone.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (no new SPECs — only existing amended)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_ACTORS (unchanged) | REQ_ACT_TREE (AC-10..AC-13 added) | SPEC_ACT_TREE, SPEC_ACT_MANIFEST, SPEC_ACT_NEWENTITY, SPEC_ACT_TREECLICK (amendment notes) | ✅ |

`get_need_links.py --direction both` spot-checked on `REQ_ACT_TREE` — links unchanged (`US_ACT_ACTORS` outgoing; `SPEC_ACT_TREE`, `SPEC_ACT_MANIFEST`, `SPEC_ACT_TREECLICK`, `REQ_UAT_ACT_TREE` incoming), no dangling references. Sphinx build 0 warnings.

### Artefakt-Removal-Check

Two artefacts removed in this CR (both source of the same dead-code finding, see Level 1/2 Decisions above):

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `packages/core/src/apps/session/sessionTreeProvider.ts` (class `SessionTreeProvider`) | 1 active reference fixed: `src/tests/remove-open-recording-icon.test.ts` (2 assertions rewritten to check `extension.ts` instead) | `docs/design/spec_act.rst`: live prose updated with removal notes (`SPEC_ACT_TREE`, `SPEC_ACT_TREECLICK`); historical code samples kept but re-marked HISTORICAL, not deleted | `docs/releasenotes.md` (v-history entry for the original sessions-feature CR), `docs/changes/v0.15.0/entity-files-tree.md` (already-archived note, itself slightly stale re: this class's continued existence) — accepted historic stranding, not touched |
| `src/tests/sessionTreeEquivalence.test.ts` | 0 remaining references (it was itself the sole consumer of the class above) | None | None |

- [x] All class (a) active code/workflow references fixed in this CR (`npx tsc -p packages/core` clean; `npx vitest run` 214/214 passing)
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- **Coverage gap (non-blocking, flagged for Test Designer):** no `sessionTreeExpectation.test.ts` exists for the session/actor kind, unlike Project (`projectTreeExpectation.test.ts`) and Event (`eventTreeExpectation.test.ts`), which each replaced their own removed legacy-equivalence test with a proper literal-assertion expectation test. The equivalence test removed by this CR partially covered this gap by comparison; removing it without a replacement leaves session/actor as the only kind without a dedicated generic-factory expectation test. Recommend a small follow-up.
- **Scope correction, already resolved (see L1 Conflicts):** original CD scope line listed `jarvis.openAgentSession` as a rename candidate; corrected during design to a title-only bug fix (command ID unchanged) since the command is shared across all three entity kinds.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation (note: the dead-code removal portion is already implemented and verified — see Decisions; only the remaining ACs (view ID/command ID rename, title bug fix) require Dev Engineer)

---

## UAT Generation

**Status**: ✅ completed

**Performed by**: Test Designer

### New UAT Coverage

Extended the existing Sessions Feature UAT chain (`US_UAT_ACT_SESSIONS` / `REQ_UAT_ACT_TREE` / `SPEC_UAT_ACT_SCENARIOS`) with new test scenarios T-14, T-15, and T-16 covering the Phase 1b internal identifier renames and bug fix:

| Scenario | Coverage |
|----------|----------|
| **T-14: View ID & Command ID renames** | Verifies that the view ID is now `jarvisActors` (not `jarvisSessions`), command ID `jarvis.newSession` is now `jarvis.newActor`, and previous keybindings are cleared (one-time user-visible side effect). Uses Context Keys inspector and Command Palette to confirm changes are present. |
| **T-15: Bug fix — entity-neutral command title** | Verifies that `jarvis.openAgentSession` command title is now "Jarvis: Open Agent Chat" (entity-neutral), consistently displayed in context menus across Project, Event, and Actor entity kinds (not "Open Actor Chat", which would mislabel Project/Event). |
| **T-16: Tree-collapse state reset** | Verifies that the Actors tree's collapse/expand state is reset to the default when the view ID changes, a one-time user-visible side effect of the Phase 1b rename. |

### Amended Acceptance Criteria

Added AC-12 to `REQ_UAT_ACT_TREE` (and corresponding AC to `US_UAT_ACT_SESSIONS`) documenting the internal identifier rename coverage at the requirement level:

- **AC-12:** The view ID SHALL be `jarvisActors` (not `jarvisSessions`), the command ID `jarvis.newSession` SHALL be renamed to `jarvis.newActor`, the command ID `jarvis.openAgentSession` SHALL remain unchanged, and its title SHALL be corrected to "Jarvis: Open Agent Chat" (entity-neutral). Previous keybindings and tree-collapse state SHALL be reset to defaults as a one-time side effect (T-14, T-15, T-16).

### Verification

- **Sphinx build**: 0 warnings; all links valid.
- **Traceability**: `get_need_links.py --direction both` on `REQ_UAT_ACT_TREE` confirms all outgoing links (`US_UAT_ACT_SESSIONS`, `REQ_ACT_TOGGLE`, `REQ_ACT_TREE`, `REQ_ACT_SCHEMA`, `REQ_ACT_OPENCONTEXT`) and incoming link (`SPEC_UAT_ACT_SCENARIOS`) are clean.
- **Test data**: No new test data files required; reused existing session fixtures (`copilot-cm`, `dev-feature-x`) from earlier UAT runs.

### Handoff Note

UAT scenarios document expected user-observable behavior changes (new view ID/command IDs, corrected command title, state reset). Implementation verification (actual code changes to `package.json`, command registration, title strings) is the responsibility of the Verify Engineer's final validation report.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-07

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed:

1. **Code-vs-Spec** (packages/core/package.json + packages/core/src/extension.ts):
   - AC-10 (view ID rename): `id: "jarvisActors"` (package.json line 78), `onView:jarvisActors` activation event (package.json line 37), `viewId: 'jarvisActors'` + `createTreeView('jarvisActors', ...)` (extension.ts lines 407/415) ✓
   - AC-11 (command ID rename): `jarvis.newActor` in both package.json (line 108) and extension.ts (line 1051) ✓
   - AC-13 (title bug fix): `jarvis.openAgentSession` title = `"Jarvis: Open Agent Chat"` (package.json line 106); command ID `jarvis.openAgentSession` unchanged in extension.ts (lines 591, 1008, 1031) ✓
   - Scope integrity — Phase 5 identifiers correctly UNCHANGED: `kind: 'session'` (extension.ts line 406), `jarvis_listJarvisSessions` tool (extension.ts line 868), `viewItem =~ /^jarvisSession$/` when-clause (package.json line 177) ✓
   - Dead code removal: `sessionTreeProvider.ts` and `sessionTreeEquivalence.test.ts` confirmed deleted (file_search returns nothing) ✓

2. **Build** (packages/core TypeScript):
   - `npx tsc -p packages/core` → clean (0 errors) ✓

3. **Tests** (vitest):
   - `npx vitest run` → 214/214 passed (22 test files, 0 failures) ✓
   - Test count drop 222→214 is expected: `sessionTreeEquivalence.test.ts` removed (8 tests) per Artefakt-Removal-Check ✓

4. **Sphinx**:
   - `python -m sphinx -b html docs docs/_build/html -W --keep-going`
   - Result: "build succeeded" with 0 warnings ✓

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_ACT_TREE: links out = [US_ACT_ACTORS], linked from = [SPEC_ACT_TREE, SPEC_ACT_MANIFEST, SPEC_ACT_TREECLICK, REQ_UAT_ACT_TREE] — bidirectional, 0 dangling ✓

**Two scope corrections (both PM-approved) verified correct:**
- `jarvis.openAgentSession` not renamed (shared across Project/Event/Actor), only title bug fixed ✓
- `SessionTreeProvider` removed (dead code), not renamed ✓

**Non-blocking coverage gap (disclosed in CD):** no `sessionTreeExpectation.test.ts` for the session/actor kind — accepted per CD disclosure, flagged for Test Designer follow-up.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | *No findings* | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | *No decisions required (CLEAR verdict)* |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
