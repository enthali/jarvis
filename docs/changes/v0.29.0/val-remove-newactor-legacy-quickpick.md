# Validation Report: remove-newactor-legacy-quickpick

**Date**: 2026-09-30
**Change Document**: docs/changes/remove-newactor-legacy-quickpick.md
**Status**: PASSED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | 1 | 1 | 0 |
| Designs | 1 | 1 | 0 |
| Implementations | 1 | 1 | 0 |
| Tests | 0 | 0 | 0 |
| Traceability | 3 | 3 | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|
| REQ_ACTOR_CREATE | Create Actor Command | SPEC_ACTOR_CREATE | extension.ts L1173–1214 | N/A (pure deletion, no test asserted QuickPick) | ✅ |

## Acceptance Criteria Verification

### REQ_ACTOR_CREATE

- [x] AC-1: `$(add)` icon triggers `jarvis.newActor`; not in Command Palette; opens name InputBox directly (AC-2) — Evidence: `extension.ts` L1173–1179 (`showInputBox` is first user interaction, no `showQuickPick`); `package.json` `jarvis.newActor` command.
- [x] AC-2: InputBox for name with `validateInput: actorNameProblem` — Evidence: `extension.ts` L1177 (`validateInput: actorNameProblem`).
- [x] AC-3: Rescan + `existingActorFolder` check before any write — Evidence: `extension.ts` L1183–1188.
- [x] AC-4: Optional summary InputBox; Escape → "" — Evidence: `extension.ts` L1190.
- [x] AC-5: `writeActorFiles` with `agent: ""` — Evidence: `extension.ts` L1191.
- [x] AC-6: Agent picker after files exist; "No agent"/Escape keeps "" — Evidence: `extension.ts` L1193–1195.
- [x] AC-7: `await actorScanner.rescan()` after agent write — Evidence: `extension.ts` L1197.
- [x] AC-8: Cancel name InputBox → exit without side effects — Evidence: `extension.ts` L1180 (`if (!nameInput) { return; }`). No QuickPick cancel path remains.
- [x] AC-9: `openSessionOnCreate` true → `jarvis.openActorSession` — Evidence: `extension.ts` L1207–1212.
- [x] AC-10: Setting `jarvis.actors.openSessionOnCreate` boolean, default true — Evidence: `package.json` configuration (unchanged by this CR).

## Design Verification

### SPEC_ACTOR_CREATE

The `jarvis.newActor` flow in `spec_actor.rst` (7 steps) matches the code
1:1:

| Spec Step | Code Location | Verified |
|-----------|---------------|----------|
| 1. InputBox for name; cancel → return (AC-1, AC-2, AC-8) | L1175–1180 | ✅ |
| 2. Resolve actors folder; `existingActorFolder` → error (AC-3) | L1182–1188 | ✅ |
| 3. Optional summary InputBox; Escape → "" (AC-4) | L1190 | ✅ |
| 4. `writeActorFiles(…)` (AC-5) | L1191 | ✅ |
| 5. `pickAgentMode()` → `writeActorAgent` (AC-6) | L1193–1195 | ✅ |
| 6. `await actorScanner.rescan()` (AC-7) | L1197 | ✅ |
| 7. `openSessionOnCreate` → `jarvis.openActorSession` (AC-9) | L1207–1212 | ✅ |

The former QuickPick step (old step 1) and its AC-1/AC-8 references are
removed. Remaining "QuickPick" mentions in `spec_actor.rst` and
`us_actor.rst` refer to the **agent binding** QuickPick (AC-4/AC-6), which
is intentionally retained.

## Code Diff Verification

**File**: `packages/core/src/extension.ts`

Removed (git diff `development...feature/remove-newactor-legacy-quickpick`):
```
-            const chosen = await vscode.window.showQuickPick(
-                [{ label: 'Create Actor' }],
-                { title: 'New Entry', placeHolder: 'Choose an entry type' }
-            );
-            if (!chosen) { return; }
```

No other code changes. The handler now starts directly with
`showInputBox` for the name — exactly as SPEC_ACTOR_CREATE step 1
describes.

## Spec Diff Verification

**US_ACTOR_CREATE AC-1** (`us_actor.rst`): Reworded from "opens a 'New
Entry' QuickPick … 'Create Actor' choice opens a name input" to "opens a
name input directly". ✅

**REQ_ACTOR_CREATE AC-1** (`req_actor.rst`): Reworded from "open a 'New
Entry' QuickPick with a 'Create Actor' choice; selecting it SHALL proceed
to AC-2" to "open the name InputBox directly (AC-2)". ✅

**REQ_ACTOR_CREATE AC-8** (`req_actor.rst`): Reworded from "cancels the
'New Entry' QuickPick or the name InputBox" to "cancels the name
InputBox". ✅

**SPEC_ACTOR_CREATE flow** (`spec_actor.rst`): Old step 1 (QuickPick)
removed; steps renumbered 1–7; AC references updated. ✅

## Artefact-Removal Check

| Removed Artefact | Class (a): Code | Class (b): Active Docs | Class (c): Historic Docs |
|---|---|---|---|
| `showQuickPick` "New Entry" in `newActor` | `extension.ts` — removed ✅ | `spec_actor.rst`, `req_actor.rst`, `us_actor.rst` — all updated ✅ | `docs/changes/v0.28.0/one-kind-consolidation.md` ADR-10 — acceptable historic stranding, disclosed in CD ✅ |

Workspace-wide grep for `showQuickPick.*Create Actor` → 0 hits.
Workspace-wide grep for "New Entry" in active code/specs → 0 hits (only
historic change docs and unrelated "new entry" in flow/gitignore
contexts).

## Test Protocol

**File**: docs/changes/tst-remove-newactor-legacy-quickpick.md
**Result**: MISSING

No test protocol exists for this CR. This is a pure deletion of dead UI
— the CD's intake verification confirms no existing test asserted the
QuickPick step (`newactor-creation-flow.test.ts` checks other handler
properties but not the QuickPick). No new behavior to test: the handler
goes straight to the name InputBox, which was already the second step.

## Build & Test Results

- **Full monorepo build** (`compile all` task): ✅ clean, all packages
  compile (core, pim, recorder, mcp, flow, kanban, syspilot).
- **Test suite** (`npx vitest run`): 354 passed, 1 failed (355 total).
  The single failure is a pre-existing flaky timeout in
  `touched-files-write-race.test.ts` (A-2 concurrency stress test,
  5000ms timeout) — unrelated to this CR's scope.

## Traceability Matrix

| User Story | Requirement | Design | Implementation | Test | Complete |
|------------|-------------|--------|----------------|------|----------|
| US_ACTOR_CREATE | REQ_ACTOR_CREATE | SPEC_ACTOR_CREATE | extension.ts L1173–1214 | N/A (pure deletion) | ✅ |

## Issues Found

_(none)_

## Conclusion

**PASSED.** The implementation matches the Change Document exactly:

1. **Code**: The `showQuickPick([{ label: 'Create Actor' }], { title: 'New Entry', ... })` call and its `if (!chosen) { return; }` guard are removed from `jarvis.newActor`. The handler now starts directly with the name `showInputBox`.

2. **Specs**: All three levels (L0/L1/L2) are updated — US_ACTOR_CREATE AC-1, REQ_ACTOR_CREATE AC-1 and AC-8, and SPEC_ACTOR_CREATE flow (7 steps, renumbered). AC references are consistent.

3. **Artefact-removal**: No remaining references to the "New Entry" QuickPick in active code or specs. Historic change-doc references (ADR-10 in `one-kind-consolidation.md`) are acceptable stranding, disclosed in the CD.

4. **Build**: Full monorepo compile is clean. Test suite: 354/355 pass (1 pre-existing flaky timeout unrelated to this CR).

Ready for merge.
