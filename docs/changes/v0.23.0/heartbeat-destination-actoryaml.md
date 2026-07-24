# Change Document: heartbeat-destination-actoryaml

**Status**: approved — merging
**Branch**: feature/heartbeat-destination-actoryaml
**Created**: 2026-07-23
**Author**: Project Manager (intake), Change Manager (pipeline)
**Operation Mode**: user-guided (default)

**GitHub Issue(s)**: #41

---

## Summary

`getValidDestinations()` (`packages/core/src/engine/sessions/sessionLookup.ts`)
validates a heartbeat `queue` step's `destination` against {open chat tab
titles} ∪ {YAML entity names from `YamlScanner`}. `YamlScanner._buildTree()`
(`packages/core/src/engine/sessions/yamlScanner.ts` line 98) still scans for
the deprecated `session.yaml` instead of `actor.yaml`. On actor-model
workspaces there are no `session.yaml` files, so the YAML half of that union
is always empty, and destination validation silently falls back to "only
works if a matching chat tab happens to be open" — unreliable for
autonomous/heartbeat delivery, which is exactly the use case heartbeat exists
for. Fix: make the destination-validation YAML scan recognize `actor.yaml`,
without breaking the (possibly shared) `_buildTree` scanning used for other
entity kinds (project.yaml, event.yaml) — System Designer to confirm scope
during design.

**Actual root cause (refined by System Designer's investigation):** The PM's
initial hypothesis (stale `session.yaml` scan in `YamlScanner`) was not the
primary cause. The real bug was that `activateHeartbeat()` in `extension.ts`
was called with `undefined` instead of the `KindDrivenScanner` instance,
silently degrading `getValidDestinations(scanner)` to chat-tabs-only (the
`scanner` parameter was ignored when `undefined`, so the YAML entity half of
the union was always empty regardless of convention). One-line wiring fix;
the now-confirmed-dead legacy `YamlScanner` class was also removed from code
and specs per user directive against leaving stale content.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Heartbeat Scheduled Job Execution | unchanged | AC text already covers "queue step destination validated" generically; this CR restores the intended behavior, no AC change needed |

### New User Stories

None.

### Decisions

- Decision 1: No new US needed. This is a correctness fix against an existing, already-specified behavior (destination validation should include YAML entities). The US intent was always correct; the implementation was broken.

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
| REQ_AUT_HEARTBEAT_LOAD_VALIDATION | US_AUT_HEARTBEAT | modified | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` amended: AC-1 corrected (scanner not optional), AC-2 updated, AC-3 added (actor.yaml entities recognized) |

### New Requirements

None.

### Decisions

- Decision 1: No new REQ elements. The validation requirement was already specified; only the SPEC-level implementation description and the code needed correcting.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (N/A)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_AUT_HEARTBEAT_LOAD_VALIDATION | REQ_AUT_HEARTBEAT_LOAD_VALIDATION | modified | AC-1/AC-2/AC-3 updated to require scanner passed non-null to getValidDestinations() |

### Actively Removed Elements (per user directive — no stale content in specs)

- `SPEC_ACT_TREE`: removed 80-line dead `SessionTreeProvider` skeleton (class already deleted from code)
- `spec_exp.rst`: activation order updated to `KindDrivenScanner` (YamlScanner references removed)
- `spec_dev.rst`: module wiring + boot sequence updated to `KindDrivenScanner` (YamlScanner references removed)
- Legacy `YamlScanner` class removed from `packages/core/src/engine/sessions/yamlScanner.ts`
- `characterization.test.ts`: 4 obsolete `YamlScanner` tests removed

### Decisions

- Decision 1: Per user direction, stale spec content was actively removed (not relabeled as "historical") — maintaining the principle that specs should reflect the current system, not accumulate dead-code documentation.
- Decision 2: The lint delta claim (193→150 warnings) in the implementation commit message could not be independently reproduced. The fix itself is correct; that specific narrative detail should be considered unreliable per MECE finding (b). The baseline remains 193 warnings.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_AUT_HEARTBEAT | REQ_AUT_HEARTBEAT_LOAD_VALIDATION (AC-1/2/3) | SPEC_AUT_HEARTBEAT_LOAD_VALIDATION | ✅ |

### Artefakt-Removal-Check

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `YamlScanner` class | Removed from `yamlScanner.ts`; 4 tests removed from `characterization.test.ts` | `spec_act.rst`, `spec_exp.rst`, `spec_dev.rst` stale references removed | Acceptable historic stranding in archived CDs |
| `SessionTreeProvider` skeleton in `SPEC_ACT_TREE` | Dead code already absent from codebase | Removed from `spec_act.rst` | N/A |

Note: stale `YamlScanner` references found in `packages/core/out/` (gitignored build artifacts) — not a repo concern, build-hygiene only per MECE finding (a).

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as acceptable historic stranding

### Issues Found

None blocking. Two non-blocking MECE follow-up notes (commit a3f1b5f):
- (a) Stale YamlScanner references exist only in gitignored `packages/core/out/` build artifacts — not caused by this CR.
- (b) Lint-delta claim (193→150) in implementation commit could not be reproduced; fix is correct but that specific count should not be relied upon.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified (MECE PASS commit a3f1b5f; Trace FULL PASS; QM CLEAR commit 22556a0)
- [x] Validation: 266/266 tests, TypeScript clean, lint 0 errors (193 baseline warnings), Sphinx 0 warnings
- [x] PM manual re-verification: independently re-ran `tsc -p packages/core --noEmit` (clean), `vitest run` (266/266), `eslint .` (0 errors); confirmed `extension.ts:530` passes `kindDrivenScanner` (not `undefined`) into `activateHeartbeat()`
- [x] Ready for merge

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-23

#### Scope

Full review per CM notification: the `activateHeartbeat()` wiring fix (scanner now passed instead of `undefined`), the legacy `YamlScanner` class removal (code + specs + tests), and the T-55 UAT addition.

#### Findings

None blocking. Two non-blocking notes already surfaced by MECE (stale `packages/core/out/` build artifacts; unreproducible 193→150 lint-delta claim in commit `0f0b14c`) are acknowledged and not repeated as separate QM findings — QM independently confirmed both are correctly characterized as non-blocking/pre-existing.

#### Independent Verification (for the record)

- `packages/core/src/extension.ts:530` — confirmed `activateHeartbeat(context, messageProvider, resolveMessagesPath, log, kindDrivenScanner)` — the real `KindDrivenScanner` instance, not `undefined`; only one call site exists.
- Full grep sweep of `packages/core/src/**` — confirmed zero `class YamlScanner`/`new YamlScanner` references remain.
- `git status --short` / `git diff --stat` — confirmed the branch's working tree has no uncommitted changes to any reviewed file (unrelated actor-context files aside), addressing the MECE report's transient tool-read false alarm from a different angle: the state is stable and correct as of this review.
- Did not independently re-run the full lint/test/sphinx gates this round — accepted MECE's §4/§7 reproduction work (worktree-based historical lint verification across three commits, 266/266 test run, sphinx clean) as sufficiently rigorous; re-running would be duplicative given the depth already shown.
- `docs/design/spec_uat_heartbeat_dest_valid.rst` — T-55 confirmed present, scoped to actor-model entities under `.jarvis/actors/`, distinct from T-51 (project entity).

#### Hold Status

Per established practice: **QM's CLEAR signal remains held** pending PM's manual re-test (GH #41 closure). No blocking findings.

#### PM Decisions

_(none required — no blocking findings)_

---

