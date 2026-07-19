# Test Protocol: touched-files-write-race

**Change Document:** docs/changes/touched-files-write-race.md (GH #35)  
**Branch:** feature/touched-files-write-race  
**Design commit:** 581587a  
**Status:** ready for execution  
**Scope:** Bugfix — concurrent same-turn touches to the same entity no
longer race/overwrite each other (`TouchStore` switched to synchronous
`fs` I/O). Extends `docs/changes/tst-actor-touched-files.md`; this
protocol covers only the concurrency guarantee (`REQ_ENT_TOUCHEDFILES`
AC-6a) and its non-regression impact — it does not repeat the full
actor-touched-files UAT.

---

## Preconditions and Test Data

1. Launch the Extension Development Host (F5) from
   `feature/touched-files-write-race`.
2. Open a git-initialized workspace with `jarvis.sessions.enabled=true`
   and the hook engine active, with a working `PostToolUse` bridge.
3. Prepare at least two entities (e.g. one Actor, one Project) each bound
   to a distinct VS Code chat session, for the cross-entity isolation
   check (Group B).
4. Start each test group from a clean/known `.jarvis/state/touched-files/`
   state (delete or note prior contents), except where a test explicitly
   requires pre-existing entries (Group A repro, Group C non-regression).
5. Reproduction shape (per GH #35): a **single agent turn** that issues
   **6 (or more) near-simultaneous file-touching tool calls** (e.g. 6
   `read_file` calls in one response, or a mix of `read_file` and
   `replace_string_in_file` calls) all resolving to the **same** entity.
   The bug was timing-sensitive (calls firing within ~76ms of each other
   in the original repro) — if a first attempt does not reproduce data
   loss on the pre-fix build, increase the number of concurrent calls
   (e.g. 8-10) or touch larger/more files to widen the timing window
   before concluding the fix is confirmed.
6. Keep the Jarvis Output Channel open for diagnostic visibility.

---

## Test Cases

### Group A: Concurrent Same-Entity Touches (Core Bugfix, AC-6a)

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| A-1 | 6 near-simultaneous touches in one turn — all new entries survive | Start with an entity that has 2 pre-existing touched-file entries (from a prior turn). In a single new agent turn, have the agent issue 6 `read_file` calls (or a realistic mix per the design's TOUCH_RULES) on 6 distinct files in the same entity's session, back-to-back with no intervening turns. Inspect `.jarvis/state/touched-files/<kind>-<name>.json` after the turn completes. | The JSON file contains all 6 new entries plus the 2 pre-existing entries — 8 total, none lost or overwritten. | **PASS** if all 8 entries are present with correct data; **FAIL** if any entry (new or pre-existing) is missing. |
| A-2 | Repeat with 10 concurrent touches (wider timing window) | Same as A-1 but with 10 file-touching tool calls in one turn on 10 distinct files, starting from 3 pre-existing entries. | All 10 new entries plus the 3 pre-existing entries are present (13 total) — no loss regardless of the increased concurrency. | **PASS** if all 13 entries are present; **FAIL** if any are missing. |
| A-3 | Concurrent touches to the *same* file within one turn | In one turn, have the agent `read_file` and then `replace_string_in_file` the same file (or call `read_file` on it twice), issued close together. Inspect the entry for that file. | The single entry for that file reflects the correct merged state (e.g. both `lastRead` and `lastEdited` set if both operations occurred), not a partially-applied or reverted state from a lost update. | **PASS** if the merged entry is fully consistent with all operations that occurred; otherwise **FAIL**. |
| A-4 | No previously-persisted entries lost during a concurrent burst | Start with an entity that has 5 pre-existing entries unrelated to the files being touched in this test's burst. Perform a 6-call concurrent burst touching 6 different files. Inspect the JSON. | All 5 pre-existing entries remain unchanged, plus the 6 new entries are added — 11 total. | **PASS** if none of the 5 pre-existing entries are lost or altered; otherwise **FAIL**. |
| A-5 | `multi_replace_string_in_file` (n paths in one call) combined with other concurrent calls | In one turn, have the agent call `multi_replace_string_in_file` touching 3 files, concurrently with 3 separate `read_file` calls on 3 other files (same entity). Inspect the JSON. | All 6 distinct files appear with correct touch kinds (write for the 3 from `multi_replace_string_in_file`, read for the 3 from `read_file`). | **PASS** if all 6 entries are present and correctly classified; otherwise **FAIL**. |

### Group B: Cross-Entity Independence (Regression Check)

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| B-1 | Concurrent bursts on two different entities don't cross-contaminate | Simultaneously (or as close as practically achievable) run a 6-call touch burst in Entity A's session and a separate 6-call touch burst in Entity B's session. Inspect both entities' JSON files. | Entity A's JSON contains only its own 6 entries (plus any pre-existing); Entity B's JSON contains only its own 6 entries (plus any pre-existing) — no entry from A appears in B's file or vice versa. | **PASS** if each entity's file contains exactly its own entries; otherwise **FAIL**. |
| B-2 | One entity's burst does not block or delay another entity's touch | While Entity A is mid-burst (multiple rapid tool calls), have Entity B perform a single unrelated touch. Inspect Entity B's JSON promptly after its call. | Entity B's touch is recorded correctly and promptly — unaffected by Entity A's concurrent activity (separate JSON files, no shared lock). | **PASS** if Entity B's touch is recorded correctly regardless of Entity A's concurrent burst; otherwise **FAIL**. |

### Group C: Non-Regression — Existing Single/Sequential Behavior (from tst-actor-touched-files.md)

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| C-1 | Single touch still recorded correctly | Perform a single `read_file` call in an otherwise idle session. Inspect the JSON. | The file's entry shows `lastRead` set correctly — identical behavior to tst-actor-touched-files.md Group A pre-fix behavior. | **PASS** if the single touch is recorded correctly; otherwise **FAIL**. |
| C-2 | Sequential (non-overlapping) touches across separate turns still accumulate correctly | Perform 3 separate touches in 3 separate agent turns (not concurrent), each on a different file. Inspect the JSON after each turn. | Each turn's touch is added without disturbing the previous turns' entries — 3 entries total after the third turn. | **PASS** if all 3 sequential touches accumulate correctly; otherwise **FAIL**. |
| C-3 | Read then write on same file (sequential turns) still merges into one entry | Repeat tst-actor-touched-files.md's A-8 scenario (read a file in one turn, write it in a later turn) under the synchronous-fs implementation. Inspect the entry. | The single entry shows both `lastRead` and `lastEdited` — unchanged behavior from the async implementation. | **PASS** if the merged entry is correct; otherwise **FAIL**. |
| C-4 | Tree UI still reflects all persisted entries correctly | After a concurrent burst (Group A) completes, expand the entity's "Recently Touched Files" category in the tree. | All entries persisted in the JSON (including those recorded during the concurrent burst) are visible in the tree, correctly grouped into the hierarchical folder structure. | **PASS** if the tree UI matches the JSON contents with no missing entries; otherwise **FAIL**. |
| C-5 | Remove still works correctly after the sync-fs switch | Remove a single entry (inline trash icon) from an entity that has multiple entries, including some added during a concurrent burst. Inspect the JSON. | Only the targeted entry is deleted; all other entries (including those from the concurrent burst) remain intact. | **PASS** if exactly the targeted entry is removed and nothing else is affected; otherwise **FAIL**. |
| C-6 | Persistence across reload still holds after concurrent writes | After a concurrent burst (Group A) completes and is confirmed correct, reload the VS Code window. Re-expand the entity's touched-files category. | All entries recorded during the concurrent burst are still present after reload — no data loss introduced by the reload path either. | **PASS** if all entries persist across reload; otherwise **FAIL**. |

### Group D: Fail-Open Behavior Still Holds (Sync Implementation)

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| D-1 | Missing touched-files JSON file still fails open | Delete an entity's `.jarvis/state/touched-files/<kind>-<name>.json` file entirely while the extension is running. Trigger a new touch for that entity. | No error/crash occurs. A new JSON file is created (via `fs.mkdirSync`/`fs.writeFileSync`) containing just the new touch — treated as starting from empty. | **PASS** if the missing file is handled gracefully and recreated correctly; otherwise **FAIL**. |
| D-2 | Corrupt touched-files JSON file still fails open | Manually corrupt an entity's JSON file (e.g. truncate to `{` or write invalid JSON). Trigger a new touch for that entity. | No error/crash occurs. The corrupt file is treated as empty (`{ files: {} }`) and the new touch is recorded, overwriting the corrupt content with valid JSON going forward. | **PASS** if the corrupted file is handled gracefully via `_load`'s catch-and-default-to-empty behavior; otherwise **FAIL**. |
| D-3 | Missing state directory is created on first write | Delete the entire `.jarvis/state/touched-files/` directory. Trigger a touch for any entity. | The directory is recreated (via `fs.mkdirSync({ recursive: true })`) and the entity's JSON file is written successfully — no error about a missing parent directory. | **PASS** if the directory and file are created without error; otherwise **FAIL**. |

---

## Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Test Cases |
|-------------|---------------------|------------|
| REQ_ENT_TOUCHEDFILES | AC-6a (no lost/overwritten entries under concurrent same-turn/overlapping touches, regardless of ordering/timing) | A-1, A-2, A-3, A-4, A-5 |
| REQ_ENT_TOUCHEDFILES | AC-6 (persistence survives reload; unaffected by the sync-fs switch) | C-1, C-2, C-3, C-6 |
| SPEC_ENT_TOUCHEDFILES | Synchronous `_load`/`_save` (`readFileSync`/`writeFileSync`/`mkdirSync`, no `await` between load and save — atomic critical section) | A-1 through A-5, B-1, B-2 |
| SPEC_ENT_TOUCHEDFILES | Fail-open on missing/corrupt file (unchanged behavior under sync implementation) | D-1, D-2, D-3 |
| SPEC_ENT_TOUCHEDFILES | `recordTouches`/`removeEntry`/`getEntries` keep existing async signatures (interface compatibility, no call-site changes) | C-4, C-5 |
| Cross-entity isolation (design precedent, separate JSON files per entity) | n/a | B-1, B-2 |

---

## Execution Notes

1. This protocol assumes `docs/changes/tst-actor-touched-files.md` has
   already been executed and passed for baseline (non-concurrent)
   functional coverage — Group C here only re-verifies the specific
   behaviors most likely to be impacted by the internal I/O mechanism
   change, not the full original suite.
2. Reproducing the race reliably on an *unfixed* build (for before/after
   comparison, if desired) may require tuning the number/timing of
   concurrent tool calls — the original repro observed data loss with 6
   near-simultaneous calls within ~76ms; on faster/slower hardware this
   window may shift. If validating against a pre-fix build to confirm the
   test actually detects the bug, try increasing concurrency (Group A-2)
   before concluding the repro doesn't apply.
3. On the *fixed* build, all Group A/B cases are expected to reliably
   pass regardless of timing, since the synchronous critical section
   removes the race entirely (no event-loop yield point exists between
   load and save) — flakiness in these results on the fixed build would
   itself indicate a regression.
4. D-1/D-2/D-3 are unchanged fail-open guarantees carried over from
   `tst-actor-touched-files.md`'s Group G — included here specifically to
   confirm the switch from async to sync `fs` calls didn't alter the
   catch-and-default-to-empty error handling shape.
5. Any failed case blocks acceptance until fixed or explicitly waived.

## Sign-off

- [ ] All UAT cases pass (A-1 through D-3)
- [ ] Core concurrency guarantee verified under realistic burst sizes (Group A)
- [ ] Cross-entity independence verified under concurrent load (Group B)
- [ ] No regression to single/sequential-touch, tree UI, remove, or reload behavior (Group C)
- [ ] Fail-open behavior unaffected by the sync-fs switch (Group D)
- [ ] Ready for verification phase
