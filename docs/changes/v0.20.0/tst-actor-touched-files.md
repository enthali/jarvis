# Test Protocol: actor-touched-files

**Change Document:** docs/changes/actor-touched-files.md (GH #18)  
**Branch:** feature/actor-touched-files  
**Design commit:** 246fcf2  
**Status:** ready for execution  
**Scope:** Hook-driven "Recently Touched Files" category per entity — TouchTracker/TouchStore, tree UI, diff, and remove commands

---

## Preconditions and Test Data

1. Launch the Extension Development Host (F5) from `feature/actor-touched-files`.
2. Open a git-initialized workspace (`testdata/test.code-workspace` or
   equivalent) with `jarvis.sessions.enabled=true` and the hook engine active.
3. Ensure `.github/hooks/` bridge files are installed so `PostToolUse` events
   flow through to the extension.
4. Prepare at least two entities (e.g. one Actor, one Project) each bound to
   a distinct VS Code chat session, so multi-entity isolation can be tested.
5. Delete or note the starting contents of `.jarvis/state/touched-files/`
   before each test group, to start from a clean/known state.
6. Have at least one file tracked by git (with a committed HEAD version) and
   one untracked file available in the workspace, for diff-command testing.
7. Keep the Jarvis Output Channel open for diagnostic visibility (optional
   but useful for confirming touch classification).
8. Reminder of `TOUCH_RULES`: `read_file` → read; `create_file`,
   `replace_string_in_file` → write; `multi_replace_string_in_file` → write
   (n paths from `replacements[].filePath`); any other tool (e.g.
   `run_in_terminal`, `grep_search`, `file_search`, `semantic_search`) is
   ignored.

---

## Test Cases

### Group A: Touch Classification (TouchTracker)

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| A-1 | `read_file` tool call classified as read | In an agent chat bound to a test entity, have the agent call `read_file` on a workspace file. Inspect `.jarvis/state/touched-files/<kind>-<name>.json`. | The file's relative path appears in the entity's JSON with a `lastRead` ISO 8601 timestamp set. `lastEdited` is absent (unless previously set). | **PASS** if `lastRead` is populated for the read file; otherwise **FAIL**. |
| A-2 | `create_file` tool call classified as write | Have the agent call `create_file` to create a new file. Inspect the JSON. | The new file's relative path appears with `lastEdited` set. | **PASS** if `lastEdited` is populated; otherwise **FAIL**. |
| A-3 | `replace_string_in_file` tool call classified as write | Have the agent call `replace_string_in_file` on an existing file. Inspect the JSON. | The file's relative path shows `lastEdited` updated to the current time. | **PASS** if `lastEdited` reflects the edit; otherwise **FAIL**. |
| A-4 | `multi_replace_string_in_file` classified as write for all paths (n paths) | Have the agent call `multi_replace_string_in_file` with edits spanning 3 distinct files in one call. Inspect the JSON. | All 3 files appear in the JSON, each with `lastEdited` set to approximately the same timestamp. Duplicate paths within the same call (if any) produce only one entry (deduplicated). | **PASS** if all distinct paths are recorded and duplicates collapse to one entry; otherwise **FAIL**. |
| A-5 | Unmapped tool calls are ignored | Have the agent call `run_in_terminal`, `grep_search`, `file_search`, or `semantic_search`. Inspect the JSON before and after. | No new entries appear in the touched-files JSON as a result of these calls. | **PASS** if unmapped tools produce no touch entries; otherwise **FAIL**. |
| A-6 | `PreToolUse` events do not create touches | If observable (e.g. via trace logging), confirm the tracker does not act on `PreToolUse` — only `PostToolUse`. Trigger a tool call and inspect the Output Channel/JSON immediately as the call starts (before completion) if timing permits. | No touch entry is recorded until after the tool call completes (`PostToolUse`). | **PASS** if only `PostToolUse` produces a recorded touch; otherwise **FAIL**. |
| A-7 | Tool success/failure is not distinguished | Have the agent call `read_file` on a path that does not exist (tool call fails/errors) versus a path that exists. Inspect the JSON for both. | Both calls produce a touch entry — a failed tool call is recorded exactly like a successful one (no success/failure filtering). | **PASS** if both failed and successful calls produce touch entries; otherwise **FAIL**. |
| A-8 | Read then write on same file updates both timestamps | Have the agent `read_file` a file, then later `replace_string_in_file` on the same file. Inspect the JSON entry. | The single entry for that file shows both `lastRead` (from the earlier read) and `lastEdited` (from the later write), not two separate entries. | **PASS** if one entry carries both timestamps; otherwise **FAIL**. |

### Group B: Entity Resolution and Path Handling

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| B-1 | Touch resolved to correct entity via session_id | In a chat session bound to Entity A, have the agent touch a file. Inspect `.jarvis/state/touched-files/`. | Only Entity A's JSON file (`<kind>-A.json`) contains the new entry — no other entity's file is affected. | **PASS** if the touch is attributed to the correct entity only; otherwise **FAIL**. |
| B-2 | Unresolvable session_id is silently ignored | Trigger a tool-call event from a chat session that does not correlate to any known entity (e.g. a generic "New Chat"). Inspect the Output Channel and all entities' JSON files. | No error appears. No entity's JSON file is modified. | **PASS** if the unmapped event produces no state change and no error; otherwise **FAIL**. |
| B-3 | Absolute paths relativized against workspace root | Have the agent touch a file using its absolute path (as it appears in the raw tool payload). Inspect the persisted JSON. | The JSON key is a workspace-root-relative path (e.g. `src/foo.ts`), not an absolute path, and uses forward slashes regardless of OS. | **PASS** if the persisted path is relative and uses `/` separators; otherwise **FAIL**. |
| B-4 | Persistence survives VS Code reload | After recording at least one touch for an entity, reload the VS Code window (Developer: Reload Window). Re-open the entity's "Recently Touched Files" category. | The previously recorded touched file(s) are still listed — the JSON file on disk was the source of truth, no data lost on reload. | **PASS** if touched files persist across a reload; otherwise **FAIL**. |

### Group C: Tree Category Behavior

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| C-1 | Category hidden when entity has no touches | Inspect an entity that has never had a file touched (clean `.jarvis/state/touched-files/` for that entity). Expand its tree node. | Only "Agent" (if applicable) and "Files" categories appear — no "Recently Touched Files" category is shown. | **PASS** if the category is fully omitted when empty; otherwise **FAIL**. |
| C-2 | Category appears after first touch | Touch a file for an entity that previously had none. Expand/refresh its tree node. | "Recently Touched Files" now appears as a third category, positioned after "Agent"/"Files". | **PASS** if the category appears in the correct position after the first touch; otherwise **FAIL**. |
| C-3 | Hierarchical folder structure mirrors relative paths | Touch files at multiple nesting depths (e.g. `src/a.ts`, `src/sub/b.ts`, `README.md`). Expand the "Recently Touched Files" category. | Files are grouped hierarchically: a `src` folder node containing `a.ts` and a `sub` subfolder (containing `b.ts`), plus `README.md` at the category root — not a flat list of all three paths. | **PASS** if the hierarchy mirrors the folder structure; otherwise **FAIL**. |
| C-4 | Empty intermediate folders are pruned | Touch only `a/b/c/file.ts` (deep single file). Expand through the category. | Only the folders actually leading to a touched file appear (`a` → `b` → `c` → `file.ts`) — no extra empty branches; and no other unrelated folders appear. | **PASS** if only the necessary folder chain is shown; otherwise **FAIL**. |
| C-5 | Category recomputed fresh on each expansion (no stale cache) | Touch a file, expand the category (see it listed), then use "Remove" (see Group E) to remove it, then collapse and re-expand the category. | The removed file no longer appears — the children are recomputed from the current JSON state on every expansion, not cached from a prior expansion. | **PASS** if re-expansion reflects the current persisted state; otherwise **FAIL**. |

### Group D: File Open Behavior

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| D-1 | `.md` touched file opens as Markdown Preview | Touch a `.md` file (e.g. via `read_file`). Click the corresponding leaf in "Recently Touched Files". | The file opens as a Markdown Preview in the fixed Docs column — same behavior as the "Files" category's `.md` handling. | **PASS** if Markdown Preview opens in the Docs column; otherwise **FAIL**. |
| D-2 | Non-`.md` touched file opens in preview mode | Touch a non-`.md` file (e.g. a `.ts` file). Click the corresponding leaf. | The file opens in the editor's preview mode (single-click tab reuse) in the fixed Docs column — identical behavior to the "Files" category's non-`.md` handling. | **PASS** if the file opens in preview mode in the Docs column; otherwise **FAIL**. |
| D-3 | Tooltip shows last-read and/or last-edited | Hover over a touched-file leaf that has only been read, one that has only been written, and one that has both. | The tooltip shows exactly the timestamp(s) that are set on that entry (e.g. only "Last read: ..." for a read-only entry, both lines for a read+write entry) — no separate child node conveys this. | **PASS** if tooltips accurately reflect the recorded timestamps; otherwise **FAIL**. |

### Group E: Context Menu — Reused Actions, Diff, and Remove

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| E-1 | Copy Path / Copy Full Path / Copy File Name work unchanged | Right-click a touched-file leaf. Select Copy Path, then Copy Full Path, then Copy File Name. Paste each into a text field. | Each produces the expected value (workspace-relative path, absolute path, bare filename respectively) — identical behavior to the "Files" category's file nodes. | **PASS** if all three copy actions produce correct values; otherwise **FAIL**. |
| E-2 | Reveal in Explorer works unchanged | Right-click a touched-file leaf and select "Reveal in Explorer". | The OS file explorer opens with the file selected/highlighted — same as the "Files" category behavior. | **PASS** if Reveal in Explorer works correctly; otherwise **FAIL**. |
| E-3 | Diff (Show Changes) opens git diff for a tracked, modified file | Touch a file that is tracked by git and has uncommitted working-tree changes. Right-click its leaf and select "Show Changes" (or equivalent diff entry). | VS Code opens its standard diff view comparing the working-tree content against the git `HEAD` version. | **PASS** if the diff view opens correctly; otherwise **FAIL**. |
| E-4 | Diff on an untracked file produces no visible diff (no fallback) | Touch a file that is NOT tracked by git (untracked). Right-click its leaf and select "Show Changes". | No diff view opens, and no error/exception appears — the command silently does nothing observable, matching how VS Code's own Source Control view behaves for an untracked file. | **PASS** if no error occurs and no diff view opens; **FAIL** if an exception, error notification, or crash occurs. |
| E-5 | Diff in a non-git workspace produces no visible diff (no fallback) | In a workspace that is not a git repository, touch a file and attempt "Show Changes" on its leaf. | No diff view opens, no error/exception appears. | **PASS** if the command silently no-ops without error; otherwise **FAIL**. |
| E-6 | Remove (trash icon) deletes the entry and refreshes immediately | Click the inline trash/Remove icon on a touched-file leaf. | The entry disappears from the "Recently Touched Files" category immediately (targeted refresh of that entity's kind, not a full-tree rescan or manual rescan requirement). Inspecting the JSON file confirms the entry was deleted. | **PASS** if the entry vanishes from the tree and JSON immediately after clicking Remove; otherwise **FAIL**. |
| E-7 | Removed file reappears if touched again (no dismissed state) | After removing an entry (E-6), have the agent touch that same file again (e.g. `read_file`). | The file reappears in "Recently Touched Files" — there is no persistent "dismissed" marker that would suppress it from reappearing. | **PASS** if the file reappears after being touched again; otherwise **FAIL**. |
| E-8 | Removing the last entry hides the category | Remove the only remaining touched-file entry for an entity. Observe the entity's tree node. | The "Recently Touched Files" category disappears entirely (consistent with C-1's fail-open omission-when-empty rule). | **PASS** if the category is hidden once no entries remain; otherwise **FAIL**. |

### Group F: Multi-Session / Multi-Entity Isolation

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| F-1 | Parallel sessions touching different entities do not cross-contaminate | Open two agent chat sessions bound to two different entities (e.g. Actor A and Project B) at the same time. In A's session, touch file `x.ts`; in B's session, touch file `y.ts`. Inspect both entities' JSON files. | Entity A's JSON contains only `x.ts`; Entity B's JSON contains only `y.ts` — no cross-contamination between the two persisted files. | **PASS** if each entity's touch list contains only its own session's touches; otherwise **FAIL**. |
| F-2 | Each entity's tree category reflects only its own touches | With F-1's setup, expand both entities' "Recently Touched Files" categories in the tree. | Entity A's category shows only `x.ts`; Entity B's category shows only `y.ts`. | **PASS** if the tree UI correctly isolates entries per entity; otherwise **FAIL**. |
| F-3 | Removing an entry from one entity does not affect another | With both entities having touched files, remove an entry from Entity A. Inspect Entity B's category/JSON. | Entity B's touched-files list is unaffected by the removal performed on Entity A. | **PASS** if Entity B's data remains untouched; otherwise **FAIL**. |

### Group G: Non-Regression

| ID | Test Case | Steps | Expected Result | Pass/Fail Criteria |
|----|-----------|-------|-----------------|-------------------|
| G-1 | "Agent"/"Files" categories unaffected | Expand an entity node that has both an Agent category, a Files category, and a Recently Touched Files category. | All three categories render correctly, in the order Agent → Files → Recently Touched Files. "Agent"/"Files" behavior (contents, click, context menu) is unchanged from pre-CR behavior. | **PASS** if all three categories coexist correctly with no regressions; otherwise **FAIL**. |
| G-2 | Activity indicator (`ActivityTracker`/`ActivityDecorator`) unaffected | With the actor-activity-indicator feature also active, trigger hook events that both activate an entity (e.g. `UserPromptSubmit`) and touch a file (e.g. `read_file`) in the same session. | The entity's activity icon (green filled-circle when active) behaves exactly as before — unaffected by the new touch-tracking consumer of the same `HookEngine`. | **PASS** if activity indication is unaffected by touch tracking; otherwise **FAIL**. |
| G-3 | Missing/corrupt touched-files JSON fails open | Manually corrupt or delete an entity's `.jarvis/state/touched-files/<kind>-<name>.json` file while the extension is running, then trigger a rescan or touch a new file for that entity. | No error or crash occurs. The entity's touch list is treated as empty and rebuilt correctly from that point (new touches are recorded normally). | **PASS** if the corrupted/missing file is handled gracefully; otherwise **FAIL**. |

---

## Acceptance Criteria Mapping

| Requirement | Acceptance Criteria | Test Cases |
|-------------|---------------------|------------|
| REQ_ENT_TOUCHEDFILES | AC-1 (PostToolUse only, not PreToolUse) | A-6 |
| REQ_ENT_TOUCHEDFILES | AC-2 (TOUCH_RULES classification: read_file, create_file/replace_string_in_file, multi_replace_string_in_file, unmapped ignored) | A-1, A-2, A-3, A-4, A-5 |
| REQ_ENT_TOUCHEDFILES | AC-3 (success/failure not tracked) | A-7 |
| REQ_ENT_TOUCHEDFILES | AC-4 (session_id → entity resolution, fail-open) | B-1, B-2 |
| REQ_ENT_TOUCHEDFILES | AC-5 (path relativized against cwd) | B-3 |
| REQ_ENT_TOUCHEDFILES | AC-6 (persisted per-entity JSON, survives reload, both lastRead/lastEdited) | A-8, B-4 |
| REQ_ENT_TOUCHEDFILES | AC-7 (category shown only when non-empty, positioned after Agent/Files) | C-1, C-2, E-8 |
| REQ_ENT_TOUCHEDFILES | AC-8 (hierarchical tree, empty branches pruned) | C-3, C-4 |
| REQ_ENT_TOUCHEDFILES | AC-9 (open behavior identical to entity file children) | D-1, D-2 |
| REQ_ENT_TOUCHEDFILES | AC-10 (tooltip shows last-read/last-edited) | D-3 |
| REQ_ENT_TOUCHEDFILES | AC-11 (Copy Path/Copy Full Path/Reveal in Explorer reused) | E-1, E-2 |
| REQ_ENT_TOUCHEDFILES | AC-12 (diff via git.openChange, no fallback) | E-3, E-4, E-5 |
| REQ_ENT_TOUCHEDFILES | AC-13 (inline Remove, targeted refresh, reappears if touched again) | E-6, E-7 |
| REQ_ENT_TOUCHEDFILES | AC-14 (purely additive, no change to Agent/Files/ActivityTracker) | G-1, G-2 |
| SPEC_ENT_TOUCHEDFILES | AC-4 (TouchStore fail-open on missing/corrupt file) | G-3 |
| SPEC_ENT_TOUCHEDFILES | AC-6 (children recomputed fresh on every expansion, not cached) | C-5 |
| SPEC_ENT_TOUCHEDFILES | AC-7 (jarvis.openEntityFile reused unchanged) | D-1, D-2 |
| SPEC_ENT_TOUCHEDFILES | AC-10 (removeTouchedFile refreshes only that entity's kind) | E-6 |
| Multi-entity isolation (design precedent, per REQ_ENT_TOUCHEDFILES AC-4/AC-6) | n/a | F-1, F-2, F-3 |

---

## Execution Notes

1. All cases are manual UAT cases requiring an Extension Development Host
   with a functioning hook bridge and at least one agent-bound chat session
   per test entity.
2. Groups A and B require observing `.jarvis/state/touched-files/*.json`
   directly after each tool call — inspect the file contents in a text
   editor (outside the workspace's own entity folders, per AC-6).
3. Group A's test tool calls should be issued through an actual agent chat
   turn (not simulated) so the real hook payload shape is exercised — see
   `.jarvis/sessions/Research/FI-2026-07-17-hook-payloads-file-touch.md`
   for realistic example payloads if constructing test prompts.
4. E-4/E-5 (diff with no fallback) are negative tests — the pass criterion
   is the *absence* of any error, not a positive diff result. Watch the
   Jarvis Output Channel and VS Code's own notifications for any
   unexpected exception during these cases.
5. F-1/F-2/F-3 require two simultaneously open agent chat sessions bound to
   two different entities — this mirrors the multi-session precedent
   established in the actor-activity-indicator UAT.
6. G-3 (corrupt JSON) can be simulated by writing invalid JSON text (e.g.
   truncated `{`) directly to an entity's touched-files file, then
   triggering a new touch or tree expansion for that entity.
7. Any failed case blocks acceptance until fixed or explicitly waived.

## Sign-off

- [ ] All UAT cases pass (A-1 through G-3)
- [ ] TOUCH_RULES classification verified for all four table entries + unmapped-ignored (Group A)
- [ ] Multi-entity isolation verified (Group F)
- [ ] Diff no-fallback behavior verified as silent, not erroring (E-4, E-5)
- [ ] Remove + reappear-on-retouch semantics verified (E-6, E-7)
- [ ] No regression to Agent/Files categories or ActivityTracker (Group G)
- [ ] Ready for verification phase
