# Test Protocol: actor-migration-command

**Change Document:** docs/changes/actor-migration-command.md  
**Branch:** feature/actor-migration-command  
**Status:** ready for execution  
**Scope:** Opt-in migration of one old-convention Actor to the new storage convention

---

## Preconditions and Test Data

1. Launch the Jarvis extension in an Extension Development Host with F5.
2. Open a disposable workspace with the Actor feature enabled.
3. Prepare these fixtures before each applicable test:
   - Old-convention Actor: `.jarvis/sessions/legacy-alpha/session.yaml`, with
     `name: legacy-alpha`, a summary, `context.md`, and at least one additional
     file such as `notes.md`.
   - Second old-convention Actor: `.jarvis/sessions/legacy-beta/session.yaml`.
   - New-convention Actor: `.jarvis/actors/current-alpha/actor.yaml`.
   - Collision fixture: `.jarvis/actors/legacy-alpha/actor.yaml` with content
     that can be compared before and after the collision test.
4. Keep a copy or checksum of each fixture's YAML and non-convention files.
5. Ensure the workspace has a writable message queue path and that the Jarvis
   Output channel is available.
6. Restore the disposable workspace after each test group. Tests that mutate
   storage should use fresh fixture folders so later cases are not affected.

## Test Cases

### Group A: Command Surface and Candidate Enumeration

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| A-1 | Command Palette-only invocation | Open Command Palette and search for `Jarvis: Migrate Session to Actor`. Inspect the Actors tree, Actor leaf context menu, and any tree title-bar menus. | The command is available from the Command Palette. It is not offered as a tree-node action, context-menu entry, or title-bar icon. | **PASS** if the Command Palette is the only user-facing entry point; otherwise **FAIL**. |
| A-2 | Old-convention candidates only | Prepare `legacy-alpha` and `legacy-beta` under `.jarvis/sessions/`, plus `current-alpha` under `.jarvis/actors/`. Invoke the migration command and inspect the QuickPick. | The QuickPick lists `legacy-alpha` and `legacy-beta`, with their old-convention paths as descriptions. `current-alpha` is absent. | **PASS** if every `session.yaml` Actor is listed and no `actor.yaml` Actor is listed; otherwise **FAIL**. |
| A-3 | Empty candidate list message | Remove or move all `.jarvis/sessions/*/session.yaml` Actors while leaving a new-convention Actor under `.jarvis/actors/`. Invoke the migration command. | An informative message such as `No session-convention Actors to migrate.` is shown. No empty QuickPick opens. | **PASS** if the user receives the informative message and no empty picker; otherwise **FAIL**. |
| A-4 | Cancel has no side effects | With at least one old-convention candidate, invoke the command and dismiss the QuickPick with Escape. | No folder, file, scanner, message-queue, or tree state changes occur. | **PASS** if cancellation is side-effect-free; otherwise **FAIL**. |

### Group B: Successful Migration

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| B-1 | Folder and convention-file migration | Prepare `.jarvis/sessions/legacy-alpha/session.yaml`. Invoke the command, select `legacy-alpha`, and confirm the operation if prompted. Inspect both storage roots. | `.jarvis/sessions/legacy-alpha/` no longer exists. `.jarvis/actors/legacy-alpha/` exists and contains `actor.yaml`, not `session.yaml`. The YAML content and `name`/`summary` values are unchanged. | **PASS** if the folder and convention filename are moved exactly as specified without duplicate old data; otherwise **FAIL**. |
| B-2 | Scanner rescan and tree update | Immediately after B-1, observe the Jarvis Entities/Actors tree and trigger no manual rescan. | The migrated Actor is discovered under the new convention and no longer appears as an old-convention duplicate. The tree updates after the command's rescan. | **PASS** if the tree reflects the new location automatically; otherwise **FAIL**. |
| B-3 | Context and additional-file preservation | Before migration, record the contents of `context.md` and `notes.md` in `legacy-alpha`. Run B-1, then open and edit `context.md` at the new path. | Both files exist under `.jarvis/actors/legacy-alpha/` with their original contents. `context.md` remains writable and edits can be saved. | **PASS** if all non-convention files survive unchanged and remain usable; otherwise **FAIL**. |
| B-4 | Successful migration notification | After B-1, inspect the migrated Actor's message queue or open its chat/message view. | Exactly one fire-and-forget notification is queued to destination `legacy-alpha`, sender is `Jarvis`, and the message identifies the new Actor folder and new `context.md` path. The command does not require an open chat to enqueue it. | **PASS** if the notification is queued unconditionally with the expected destination, sender, and paths; otherwise **FAIL**. |

### Group C: Collision and Data Safety

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| C-1 | Name-collision guard | Prepare both `.jarvis/sessions/legacy-alpha/` and `.jarvis/actors/legacy-alpha/`. Record checksums and directory contents. Invoke the command and select `legacy-alpha`. | An error notification reports that an Actor already exists at the target path. The old folder remains in place, the new folder remains unchanged, and no partial rename occurs. | **PASS** if both source and target data remain byte-for-byte unchanged and no rescan/notification is emitted as a successful migration; otherwise **FAIL**. |
| C-2 | Collision does not affect other candidates | With the collision fixture plus a separate `legacy-beta` old-convention Actor, invoke migration. Select the colliding Actor first, then run again and select `legacy-beta`. | The collision attempt aborts cleanly. `legacy-beta` can still be migrated successfully afterward. | **PASS** if one collision does not poison the command or other candidates; otherwise **FAIL**. |

### Group D: Regression and Scope Boundaries

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| D-1 | New Actor creation remains unchanged | After migration tests, run `Jarvis: New Actor` or the existing new-entity Actor flow. Enter a unique name such as `created-after-migration`. | The new Actor is created only under `.jarvis/actors/created-after-migration/` with `actor.yaml` and `context.md`; no `.jarvis/sessions/created-after-migration/` folder is created. | **PASS** if creation still uses only the new convention and the migration command does not alter that flow; otherwise **FAIL**. |
| D-2 | No automatic or bulk migration | Populate multiple old-convention Actors, reload the extension, wait through a normal idle period, and inspect storage. Invoke the command once and inspect its selection UI. | No Actor moves without explicit command invocation and selection. The QuickPick supports selecting one Actor only; there is no bulk/multi-select operation or scheduled migration. | **PASS** if migration is strictly opt-in and one-at-a-time; otherwise **FAIL**. |

## Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Test Cases |
|-------------|---------------------|------------|
| REQ_ACT_MIGRATIONCOMMAND | AC-1: Command Palette-only registration and no tree/context entry | A-1 |
| REQ_ACT_MIGRATIONCOMMAND | AC-2: Old-convention enumeration; exclude `actor.yaml` | A-2 |
| REQ_ACT_MIGRATIONCOMMAND | AC-3: Informative empty-list behavior | A-3 |
| REQ_ACT_MIGRATIONCOMMAND | AC-4: Folder move, file rename, preservation, and rescan | B-1, B-2, B-3 |
| REQ_ACT_MIGRATIONCOMMAND | AC-5: Collision guard with no data changes | C-1, C-2 |
| REQ_ACT_MIGRATIONCOMMAND | AC-6: Unconditional `Jarvis` notification to migrated Actor | B-4 |
| REQ_ACT_MIGRATIONCOMMAND | AC-7: No bulk, automatic, or new-creation behavior changes | A-4, D-1, D-2 |
| US_ACT_MIGRATIONCOMMAND AC-1..AC-5 | User-facing migration flow and scope boundaries | A-1..A-4, B-1..B-4, C-1..C-2, D-1..D-2 |

## Execution Notes

1. All cases are manual UAT cases and require an Extension Development Host.
2. Use fresh fixture names for repeated runs; do not reuse a migrated source
   folder without recreating its old-convention files.
3. Verify queue contents through the supported Jarvis message/session view or
   the repository's message inspection tooling. The notification must be
   checked even when no chat session is open for the migrated Actor.
4. Run the automated regression suite and affected TypeScript compilation after
   the manual cases.
5. Any failed case blocks acceptance until fixed or explicitly waived by the
   Change Manager.

## Sign-off

- [ ] All UAT cases pass (A-1 through D-2)
- [ ] Automated regression tests pass
- [ ] Affected packages compile successfully
- [ ] No source or target data was lost during collision testing
- [ ] Ready for verification phase
