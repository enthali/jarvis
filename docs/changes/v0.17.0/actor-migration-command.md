# Change Document: actor-migration-command

**Status**: in-progress
**Branch**: feature/actor-migration-command
**Created**: 2026-07-13
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Phase 4 of the "Consequent Actor Renaming" initiative. Adds a single, deliberately minimal Command Palette-only command — "Jarvis: Migrate Session to Actor" — that lets a user opt in to migrating one old-naming-convention actor at a time to the new convention. No tree/context-menu UI integration, no bulk operation, no automatic nudging. Flow: user invokes the command, a QuickPick lists all actors currently stored under the old convention (`.jarvis/sessions/*/session.yaml`) — actors already using the new convention (`.jarvis/actors/*/actor.yaml`) never appear, since there's nothing to migrate; if the list is empty, show an informative message instead of an empty picker. User selects one, the command renames its folder (`.jarvis/sessions/<name>/` → `.jarvis/actors/<name>/`) and its convention file (`session.yaml` → `actor.yaml`), then triggers a scanner rescan. After a successful migration, the command unconditionally sends a fire-and-forget message via `jarvis_sendMessage` (sender "Jarvis") to a destination matching the migrated actor's name, informing it of the new folder and context.md paths — regardless of whether a chat session by that name is currently open (harmless no-op if not; the message simply sits unread in the queue). This is intentionally the minimum viable migration mechanism — no pressure to use it, and it does not touch any other actor's data.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

None modified — this CR is purely additive at L0.

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ACT_MIGRATIONCOMMAND | Opt-In Actor Storage-Convention Migration Command | optional |

### Decisions

- Decision 1: Linked as a child of `US_ACT_DUALPATH_STORAGE` (Phase 2's soft-migration story), not `US_ACT_ACTORS` directly — this command is specifically the "opt-in trigger" for the dual-path coexistence concept already established there, and its ACs explicitly reference `US_ACT_DUALPATH_STORAGE` AC-3/AC-4 (never-forced, permanent-coexistence) to make clear this command does not contradict or supersede those guarantees.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_ACT_DUALPATH_STORAGE` AC-3 says migration is never *forced*; this command is explicitly user-triggered/opt-in, consistent with that guarantee, not a violation of it.
- [x] No redundancies
- [x] Gaps identified and addressed (this closes the "no manual migration path exists yet" gap left open by Phase 2)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

None modified — this CR is purely additive at L1.

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ACT_MIGRATIONCOMMAND | Opt-In Actor Migration Command | US_ACT_MIGRATIONCOMMAND; REQ_ACT_DUALPATH_SCANNER | optional |

### Conflicts Detected

None.

### Decisions

- Decision 1 (genuine design constraint found during impact analysis, resolved without escalation — see rationale): the CD's Summary describes sending the fire-and-forget notification "via `jarvis_sendMessage`" with sender `"Jarvis"`. Impact analysis of `REQ_MSG_SENDMESSAGE` found AC-5/AC-6 require `senderSession` to be a member of `getValidDestinations()` — and `"Jarvis"` is not itself a registered session or entity name, so routing through the LM tool as literally described would throw a runtime error. Resolution: the command calls the internal `appendMessage()` function directly (bypassing the LM-tool wrapper entirely), which is an established, precedented pattern already used by `heartbeat.ts` (sender `'heartbeat'`), `jarvis_createSession`'s initial-message enqueue (sender `'jarvis_createSession'`), and the Reminder feature (sender `'Reminder'`) — none of which go through `jarvis_sendMessage`'s validation either. This was not escalated as a "genuine product decision requiring PM input" because it has zero product/behavior impact (the notification is sent exactly as described) — it is a purely internal implementation-mechanism clarification with strong precedent, not a scope or UX ambiguity. Documented in `REQ_ACT_MIGRATIONCOMMAND` AC-6 and `SPEC_ACT_MIGRATIONCOMMAND`'s "Why appendMessage() directly" design note.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

None modified — this CR is purely additive at L2.

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ACT_MIGRATIONCOMMAND | Opt-In Actor Migration Command | REQ_ACT_MIGRATIONCOMMAND; SPEC_ACT_DUALPATH_SCANNER; SPEC_ACT_CREATETOOL |

### Conflicts Detected

None.

### Decisions

- Decision 1: The command performs the folder move and file rename via two sequential `fs.promises.rename()` calls (folder first, then the file inside it) rather than a single combined operation — `rename()` on the same filesystem is atomic and preserves file contents untouched, satisfying the "don't touch context.md" requirement without needing a copy+delete fallback.
- Decision 2: No auto-open of a chat session after migration (unlike `jarvis_createSession`) — this command only relocates existing storage; an already-open chat session for that Actor is unaffected by the underlying file move, and there is no "brand new entity" moment that would warrant auto-opening a chat.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACT_MIGRATIONCOMMAND | REQ_ACT_MIGRATIONCOMMAND | SPEC_ACT_MIGRATIONCOMMAND | ✅ |

Confirmed via `get_need_links.py REQ_ACT_MIGRATIONCOMMAND --direction both` — clean bidirectional links, no dangling references.

### Artefakt-Removal-Check

Not applicable — this CR is purely additive (new command, new spec elements at all three levels); nothing is removed, renamed, or deprecated.

### Issues Found

- [x] Issue 1: The CD's Summary literally says the notification is sent "via `jarvis_sendMessage`" — taken literally, this would fail at runtime because `jarvis_sendMessage`'s `senderSession` validation (`REQ_MSG_SENDMESSAGE` AC-6) rejects `"Jarvis"` as an invalid sender. Resolved by specifying direct use of the internal `appendMessage()` function instead (see Level 1 Decision 1) — same net user-visible behavior (a message is queued for the migrated Actor with sender "Jarvis"), different (correct, precedented) internal mechanism. Not escalated to PM since it doesn't change scope, UX, or requirements — purely an implementation-detail correction caught during design.

### Sign-off

- [x] All levels completed
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
**Review date:** 2026-07-13

#### Verification Summary

**CLEAR** — Zero findings. All verification dimensions passed.

1. **Code-vs-spec (extension.ts + package.json):**
   - AC-1 (Command Palette only): `jarvis.migrateSessionToActor` appears exactly once in package.json (command definition only, no menu/context-menu/view-title registration, no icon) ✓
   - AC-2 (QuickPick of old-convention actors): `listOldConventionActors()` reads from `engine.treeFactory.getProvider('session')`, filters leaves where `leaf.id.endsWith('session.yaml')` ✓
   - AC-3 (empty list): `vscode.window.showInformationMessage('No session-convention Actors to migrate.')` on empty candidates ✓
   - AC-4 (rename + rescan): `fs.promises.rename(folderPath, targetFolder)` → `fs.promises.rename(...session.yaml, ...actor.yaml)` → `kindDrivenScanner.rescan()` ✓
   - AC-5 (collision guard): `fs.existsSync(targetFolder)` checked before any rename — abort with error message on collision ✓
   - AC-6 (fire-and-forget via appendMessage): `appendMessage(resolveMessagesPath(), name, 'Jarvis', ...)` — direct internal call, not via `jarvis_sendMessage` LM tool (which would fail senderSession validation for "Jarvis") ✓
   - AC-7 (non-goals met): no bulk operation, no tree/context-menu UI, no auto-nudge ✓

2. **Build** (`npx tsc -p packages/core`): clean (0 errors) ✓

3. **Tests** (`npx vitest run`): 213/213 passed ✓

4. **Sphinx** (`-W --keep-going`): build succeeded, 0 warnings ✓

5. **Traceability** (spot-check via `get_need_links.py --direction both`):
   - REQ_ACT_MIGRATIONCOMMAND: links = [US_ACT_MIGRATIONCOMMAND, REQ_ACT_DUALPATH_SCANNER], linked_from = [SPEC_ACT_MIGRATIONCOMMAND] — 0 dangling ✓

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
