# Test Protocol: actor-tree-mail-marker

**Change Request**: actor-tree-mail-marker  
**Branch**: `feature/actor-tree-mail-marker`  
**UAT Spec**: [SPEC_UAT_ACTOR_MAIL](../design/spec_uat_actor_mail.rst)  
**Date**: 2026-10-19

---

## Execution Note

This protocol has two kinds of case. T-1 to T-14 are manual: a tester runs them in
an Extension Development Host (EDH) and they stay NOT RUN until a tester executes
them. T-15 to T-22 are automated checks. T-15 to T-19 and T-21 were written by Dev Engineer at `d32b265`; the coalesce test of T-20 and T-22 were written by the Test Designer at `ae8da71` (see the Evidence lines). The
implementation (`packages/core/src/engine/actors/actorMail.ts`) is on the branch from
`6e7d5de`, and the F-1 stop line in its read script is at `4743b86`; T-10 relies on it.
Each automated case states the assertion its test must make; its Evidence line names the
file, commit and title of that test. No case is marked PASS or FAIL in this protocol.

## Test Setup

- Launch the EDH on `feature/actor-tree-mail-marker` with `testdata/test.code-workspace`,
  and `packages/core`, `packages/pim` and `packages/recorder` active. Module
  integration (compile, package, CI) is out of UAT scope.
- Set `"jarvis.outlook.enabled": true` in `testdata/.vscode/settings.json` before the
  EDH starts. The file currently sets `false`, and a folder setting overrides the
  `true` in `testdata/test.code-workspace`. The file is machine-local and gitignored;
  do not commit it.
- Run of 2026-10-20: Outlook enabled in the EDH (done by the user).
- Keep `"jarvis.scanInterval": 1`, so the periodic scan runs about once a minute.
  T-3, T-5 and T-13 wait for it.
- Outlook (classic) is running. The Inbox has direct subfolders named `Test1` and
  `Test2`. These folders live in Outlook, outside the repository. No other Outlook
  folder name is used in this protocol.
- Actors `Test1` and `Test2` are the fixtures `testdata/.jarvis/actors/Test1/` and
  `testdata/.jarvis/actors/Test2/`, each with `actor.yaml` and `context.md`. They are
  committed with this change.
- Baseline (state S0): no unread mail in `Test1` or `Test2`. Mark any such mail read
  in Outlook before T-1.
- Recording (T-7 to T-9) needs a working microphone and the recorder speech backend.
  If a recording cannot start, record the reason; do not mark the case PASS.
- Activity (T-8, T-9) uses the agent hook setting already in `testdata/.vscode/settings.json`
  (`chat.hookFilesLocations` with `.github/hooks`).
- Jarvis never changes mail. The tester changes read state, closes Outlook, or starts Outlook by
  hand only where a step says so.

## Test Scope

- Manual: T-1 to T-14 (NOT RUN until a tester executes them).
- Not run: T-8 and T-9 were not run because agent hooks are disabled in the EDH; T-2, T-4, T-6 and T-10 to T-14 are NOT RUN.
- Automated: T-15 to T-22 (the Evidence line of each case names its commit).
- Not shown by the manual cases, and why:
  - Nested folders, letter case, and same-name Actors (T-15 to T-17): a manual check would need a
    new Outlook folder structure, which this read-only UAT does not create. Covered by T-15 to T-17.
  - Read failure details and the process timeout (T-18): the manual case shows only
    Outlook not running (T-10).
  - No process started while the setting is off (T-19): not visible on screen; T-12 shows only
    that no icon appears.
  - The scan timing and change-callback rules (T-20): the periodic time is not fixed; T-3 and T-5
    allow up to 2 minutes.
  - Mark stacking (`REQ_ENG_ACTORMARK` AC-1 to AC-5): visible only through T-7 to T-9. The owning
    test is `src/tests/actor-mark.test.ts`; its AC-2 was expected to fail until implementation
    (D-L1-9 in `docs/changes/actor-tree-mail-marker.md`). This protocol does not edit that test.

## Merge Condition

PM decision (2026-10-19, `docs/changes/actor-tree-mail-marker.md`): the set-change path of
`onChange` for a non-empty set is accepted without an automated test. The manual run of the
non-empty set (T-2 to T-6 and T-10 to T-12) must be executed and recorded in this protocol
before merge. Those cases stay NOT RUN until a tester runs them; the run is part of the user's
validation.

The test "fires onChange only when the drawn set changes (T-20)" in `src/tests/actor-mail.test.ts`
uses a mocked read and does not reach Outlook, so the condition above still applies.

## Scenarios - Icon by scan (T-1..T-6)

### T-1 - Baseline shows no mail icon

**AC**: `US_ACTOR_MAIL` AC-2; `REQ_ACTOR_MAIL` AC-4  
**Procedure**: From baseline S0 (Test Setup), start the EDH and open the ACTORS view.
Wait until the view has loaded (up to 15 seconds).

1. Look at the nodes `Test1` and `Test2`.

**Expected**: Neither `Test1` nor `Test2` shows a mail icon. No notification appears.  
**Observed (user, 2026-10-20)**: Test1 seen with no icon at start. Test2 baseline not stated.  
**Status**: NOT RUN

### T-2 - Unread mail shows the icon after a manual Refresh

**AC**: `US_ACTOR_MAIL` AC-1, AC-3; `REQ_ACTOR_MAIL` AC-1, AC-5  
**Procedure**: Start from S0.

1. In Outlook, mark one mail in `Inbox\Test2` as unread.
2. Click the Refresh button of the ACTORS view.

**Expected**: `Test2` shows the mail icon in front of its name. `Test1` shows no icon.  
**Status**: NOT RUN

### T-3 - Unread mail on a second Actor appears from the periodic scan

**AC**: `US_ACTOR_MAIL` AC-3; `REQ_ACTOR_MAIL` AC-5; `REQ_CFG_SCANINTERVAL` AC-2  
**Procedure**: Start from the T-2 state (`Test2` unread, `Test1` read).

1. In Outlook, mark one mail in `Inbox\Test1` as unread. Do not click Refresh.
2. Check `Test1` right away. If it already shows the icon, a scan ran first; note the time
   and repeat T-3 from the T-2 state.
3. Wait up to 2 minutes without any click in VS Code.

**Expected**: Step 2 shows no icon on `Test1` (no live update). Step 3 shows the mail icon on
`Test1` from the periodic scan. `Test2` still shows its icon.  
**Observed (user, 2026-10-20)**: step 3 seen: Test1 marked unread, icon shown after the periodic scan. Step 2 (no icon before the scan) not stated.  
**Status**: NOT RUN

### T-4 - Read mail disappears after a manual Refresh

**AC**: `US_ACTOR_MAIL` AC-2, AC-3; `REQ_ACTOR_MAIL` AC-4, AC-5; `REQ_ACTOR_TREE` AC-7  
**Procedure**: Start from the T-3 state (`Test1` and `Test2` unread).

1. In Outlook, mark all mail in `Inbox\Test2` as read.
2. Click the Refresh button of the ACTORS view.

**Expected**: `Test2` shows no icon. `Test1` still shows its icon.  
**Status**: NOT RUN

### T-5 - Read mail disappears from the periodic scan

**AC**: `US_ACTOR_MAIL` AC-2, AC-3; `REQ_ACTOR_MAIL` AC-5; `REQ_CFG_SCANINTERVAL` AC-2  
**Procedure**: Start from the T-4 state (`Test1` unread, `Test2` read).

1. In Outlook, mark all mail in `Inbox\Test1` as read. Do not click Refresh.
2. Wait up to 2 minutes without any click in VS Code.

**Expected**: `Test1` loses its icon from the periodic scan. Both Actors show no icon (S0).  
**Observed (user, 2026-10-20)**: Test1 removal seen: marking Test1 read removes its icon; trigger (scan or Refresh) not stated. Separately, Test2 marked read showed no icon after a scan. That is the Test2 case, not the Test1 steps of this case.  
**Status**: NOT RUN

### T-6 - No mail state is kept across an EDH restart

**AC**: `US_ACTOR_MAIL` AC-5; `REQ_ACTOR_MAIL` AC-5  
**Procedure**: Start from S0.

1. Close the EDH window.
2. In Outlook, mark one mail in `Inbox\Test1` as unread while the EDH is closed.
3. Start the EDH again with the same workspace. Wait for the first scan (up to 15 seconds).
   Do not click Refresh.
4. In Outlook, mark the `Test1` mail as read again to return to S0.

**Expected**: After step 3, `Test1` shows the mail icon and `Test2` shows none. A missing icon here
means the first scan after the restart did not read Outlook.  
**Status**: NOT RUN

## Scenarios - Mark priority and sources (T-7..T-9)

### T-7 - Recording mark replaces the mail icon, and the mail icon returns after it ends

**AC**: `US_ACTOR_MAIL` AC-4; `REQ_ACTOR_MAIL` AC-6, AC-7; `REQ_REC_BUTTON` AC-3  
**Procedure**: Start from S0.

1. In Outlook, mark one mail in `Inbox\Test2` as unread. Click Refresh and check `Test2`.
2. Hover over `Test2` and start a recording with the start-recording action.
3. While the recording runs, check `Test2`.
4. End the recording with the end-recording button in the transcript view, and wait until the
   transcript is complete.
5. Check `Test2`. If the tree did not refresh by itself, click Refresh.

**Expected**: Step 1 shows the mail icon. Step 3 shows a red dot on `Test2` and no mail icon.
Step 5 shows the mail icon on `Test2` again (`REQ_ACTOR_MAIL` AC-7).  
**Observed (user, 2026-10-20)**: step 1 seen (icon on Test2); step 3 seen (red dot, no icon); step 5 seen (icon back after the recording stopped). Step 4 (transcript complete) not stated. Step 2 is not stated separately; the red dot implies it.  
**Status**: NOT RUN

### T-8 - Active session mark replaces the mail icon, and the mail icon returns when the turn ends

**AC**: `US_ACTOR_MAIL` AC-4; `US_ACTOR_ACTIVITY` AC-1, AC-2; `REQ_ACTOR_MAIL` AC-6; `REQ_ACTOR_ACTIVITY` AC-7  
**Procedure**: Start from S0 with `Test2` unread (`Test1` read) and the icon shown.

1. Click the `Test2` node to open its chat.
2. Send a prompt that makes the agent run several tool calls, for example: "List the files in
   testdata/.jarvis/actors and then in docs/changes, and summarize each folder in one line."
3. While the turn runs, check `Test2`.
4. When the turn ends, check `Test2` without clicking Refresh.

**Expected**: Step 3 shows a green dot on `Test2` and no mail icon. Step 4 shows the mail icon again.
If the green dot was not seen, repeat with a longer prompt; an unseen state is not a pass.  
**Observed (user, 2026-10-20)**: blocked: agent hooks disabled in EDH; not run. Known issue, reported by the user.  
**Status**: NOT RUN

### T-9 - Recording over active over mail, each source keeps its own entry

**AC**: `US_ACTOR_MAIL` AC-4; `REQ_ACTOR_MAIL` AC-6, AC-7; `REQ_REC_BUTTON` AC-3; `REQ_ACTOR_ACTIVITY` AC-7  
**Procedure**: Start from S0 with `Test2` unread and the icon shown (`Test1` read).

1. Click the `Test2` node to open its chat. Send the long prompt from T-8 step 2.
2. While the turn runs, start a recording on `Test2` (start-recording action).
3. While the recording runs, check `Test2`.
4. End the recording in the transcript view while the turn is still running; wait until the
   transcript is complete.
5. Check `Test2` at the next tree refresh while the turn is still running. Click Refresh if needed.
6. Wait for the turn to end and check `Test2`.

**Expected**: Step 3 shows only the red dot. Step 5 shows the green dot and no mail icon. Step 6 shows
the mail icon. If the turn ended before step 4, repeat with a longer turn; a turn that ended early does
not show the middle state.  
**Observed (user, 2026-10-20)**: blocked: agent hooks disabled in EDH; not run. Known issue, reported by the user.  
**Status**: NOT RUN

## Scenarios - Outlook availability and setting (T-10..T-13)

### T-10 - Outlook not running shows no icon and no message

**AC**: `US_ACTOR_MAIL` AC-6; `REQ_ACTOR_MAIL` AC-9, AC-10  
**Procedure**: Start from the T-2 state (`Test2` unread, icon shown).

1. Close Outlook by hand. In Task Manager, confirm that `OUTLOOK.EXE` is gone.
2. Click Refresh in the ACTORS view.
3. Check the notifications, the Jarvis log (extension output), and Task Manager.

**Expected**: No Actor shows a mail icon. No error notification or message appears. The Jarvis log has one
warning line about the Outlook read. Jarvis does not start `OUTLOOK.EXE`.  
**Automated support** (not a pass; the manual run above is still required): `src/tests/actor-mail.test.ts` at `4743b86`, test "a failed attach (script exit 1) logs exactly one line and empties the set (T-10)". It is mocked: `execFile` fails with exit code 1 and stderr `Exception calling "GetActiveObject"`; the test checks one `log.warn` line with that stderr and an empty set. It does not assert "no message" and does not assert that `OUTLOOK.EXE` is not started; it does not run Outlook.  
**Status**: NOT RUN

### T-11 - Mail icon returns once Outlook is running again

**AC**: `US_ACTOR_MAIL` AC-6; `REQ_ACTOR_MAIL` AC-10  
**Procedure**: Start from T-10 (Outlook closed, `Test2` still unread).

1. Start Outlook by hand.
2. Click Refresh in the ACTORS view.

**Expected**: `Test2` shows the mail icon again.  
**Status**: NOT RUN

### T-12 - Setting false shows no icon and no Outlook read

**AC**: `US_ACTOR_MAIL` AC-9; `REQ_ACTOR_MAIL` AC-11; `REQ_OLK_ENABLE` AC-2  
**Procedure**: Start from the T-2 state (`Test2` unread).

1. In `testdata/.vscode/settings.json`, set `"jarvis.outlook.enabled": false`. Run
   "Developer: Reload Window" and wait for the first scan.
2. Check all Actors.
3. In `testdata/.vscode/settings.json`, set `"jarvis.outlook.enabled": true`. Run
   "Developer: Reload Window" and wait for the first scan.
4. Check `Test2`.

**Expected**: Step 2 shows no mail icon on any Actor, though `Test2` is unread in Outlook. Step 4
shows the mail icon on `Test2`.  
**Status**: NOT RUN

### T-13 - Jarvis leaves the mail unchanged

**AC**: `US_ACTOR_MAIL` AC-8; `REQ_ACTOR_MAIL` AC-8  
**Procedure**: Start from the T-2 state (`Test2` unread, icon shown).

1. Keep the EDH open for about 3 minutes and click Refresh twice in that time.
2. In Outlook, check the mail in `Inbox\Test2`: it is still unread, and the number of items in
   `Inbox\Test2` has not changed.
3. In Outlook, mark that mail as read to return to S0.

**Expected**: Step 2 shows the mail still unread, with no mail moved, changed, or sent and no
folder changed.  
**Status**: NOT RUN

## Scenarios - Node behavior (T-14)

### T-14 - Mail icon leaves the node's click, menu and children unchanged

**AC**: `US_ACTOR_MAIL` AC-7; `REQ_ACTOR_MAIL` AC-12  
**Procedure**: Record the state without the icon first, then with it.

1. From S0, click Refresh. On `Test2`, right-click and record the menu entries. Expand `Test2` and
   record its children.
2. In Outlook, mark one mail in `Inbox\Test2` as unread. Click Refresh and check that `Test2` shows
   the icon.
3. Click the `Test2` node. Right-click it and expand it again.
4. In Outlook, mark that mail as read to return to S0.

**Expected**: Step 3 opens the `Test2` chat on click. The menu entries and children are the same as
in step 1. The label text is only the name `Test2`.  
**Status**: NOT RUN

## Scenarios - Automated checks (T-15..T-22)

### T-15 - Only direct Inbox children are read

**AC**: `REQ_ACTOR_MAIL` AC-2; `US_ACTOR_MAIL` AC-2; `SPEC_ACTOR_MAIL` AC-2  
**Procedure**: Inspect the read script in `actorMail.ts` text (or the test's copy of it).  
**Expected**: The script reads `GetDefaultFolder(6)` and then `Folders` only. No folder under a direct child is
opened.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265`, test "reads the direct Inbox children only (T-15)". It asserts one `GetDefaultFolder(` call, `GetDefaultFolder(6)`, and one `.Folders` access.  
**Status**: NOT RUN

### T-16 - Folder name must match the Actor name exactly

**AC**: `REQ_ACTOR_MAIL` AC-2  
**Procedure**: Feed the read a result with folder `test1` (unread 1) and an Actor named `Test1`.  
**Expected**: `isUnread("Test1")` is false; no Actor id is added.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265`, test "matches the folder name exactly, case-sensitive (T-16)". It reads `test1` and then `Test1`, and checks the set after each.  
**Status**: NOT RUN

### T-17 - Same-name Actors show no icon, silently

**AC**: `REQ_ACTOR_MAIL` AC-3; `SPEC_ACTOR_MAIL` AC-1  
**Procedure**: With two Actors named `Twin` in the scan (no stub of `resolveName`), read a result with folder `Twin` (unread 4).  
**Expected**: No Actor id is added. No log line and no message are written.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265`, test "adds no Actor for an ambiguous name, silently (T-17)". The ambiguity comes from two Actors named `Twin` in a real scan, and the read returns folder `Twin`. It does not stub `resolveName` and does not use folder `Test1`.  
**Status**: NOT RUN

### T-18 - Failed read empties the set, logs once, shows no message

**AC**: `REQ_ACTOR_MAIL` AC-10; `SPEC_ACTOR_MAIL` AC-7  
**Procedure**: Stub `execFile` in three runs: non-zero exit; timeout; output that is not a JSON array. Start from a
set that holds `Test2`.  
**Expected**: In each run the set is empty, `log.warn` is called once, and no notification is shown.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265`, test "on a failed read (%s) empties the set, logs one line and fires onChange (T-18)", with three rows: "non-zero exit", "timeout", "output not a JSON array". At `7d63b19` the test also expects `showWarningMessage` and `showInformationMessage` not to be called.  
**Status**: NOT RUN

### T-19 - Setting false starts no process

**AC**: `REQ_ACTOR_MAIL` AC-11; `SPEC_ACTOR_MAIL` AC-4  
**Procedure**: Set `jarvis.outlook.enabled` to `false` and trigger a completed scan. Spy on `execFile`.  
**Expected**: `execFile` is not called; the set is empty.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265`, test "starts no process while the setting is off (T-19)". It asserts that `execFile` is not called and the set stays empty.  
**Status**: NOT RUN

### T-20 - One read per completed scan, coalesced during a run; change fires only on a changed set

**AC**: `SPEC_ACTOR_MAIL` AC-3, AC-8; `REQ_EXP_REACTIVECACHE` AC-4  
**Procedure**: Fire `scanner.onDidScan` twice with an unchanged result, then once with a changed result. Fire it
again while a read is still running.  
**Expected**: Each completed scan starts one read when none is running. A scan during a run marks one re-read as pending; that re-read runs once after the running read ends, and scans during one run share it. `onChange` runs only for the
changed result. The constructor subscribes only to `scanner.onDidScan`; no timer or Outlook event is registered.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265` (the first and the third), `ae8da71` (the second: title and body), `7e72794` (the fourth: title from `7d63b19`, body from `7e72794`), and `c566838` (the fifth: body from `c566838`, title from `1866e4b`), five tests titled "(T-20)": "starts one read per completed scan", "coalesces scans during a run into one re-read after it", "fires onChange only when the drawn set changes", "starts no read while the clock advances without a scan", and "starts no timer from a completed read". The second test fires three scans during one run and expects one extra read after the running read ends. The fourth test advances fake timers and triggers no scan. The fifth test completes one read with a synchronous mock, then advances fake timers and expects no second read. No T-20 test asserts the constructor subscription or the absence of an Outlook event.  
**Status**: NOT RUN

### T-21 - Read script uses only read-only members

**AC**: `REQ_ACTOR_MAIL` AC-8; `SPEC_ACTOR_MAIL` AC-6  
**Procedure**: Check the script text against the members and type names it uses: `GetActiveObject`,
`Session`, `GetDefaultFolder`, `Folders`, `Name`, `UnReadItemCount`, `Runtime.InteropServices.Marshal`,
`Text.Encoding`. No other member is used.  
**Expected**: The script uses only these members and calls no method or assignment that changes a mail item, flag,
folder, or store.  
**Evidence**: `src/tests/actor-mail.test.ts` at `d32b265`, test "uses only read-only members (T-21)". It checks the script text against an allow-list of members and rejects property assignments.  
**Status**: NOT RUN

### T-22 - Setting change to false clears the icons; change to true reads again

**AC**: `SPEC_ACTOR_MAIL` AC-3, AC-4; `REQ_ACTOR_MAIL` AC-11; `REQ_OLK_ENABLE` AC-2  
**Procedure**: Mocked; no real Outlook. Start with the setting `true` and a completed read that shows `Test2` unread. Each change of `jarvis.outlook.enabled` is followed by `requestRead()`, the call that the configuration listener in `packages/core/src/extension.ts` makes; the test does not run that listener.

1. Change the setting to `false` and call `requestRead()`. Let the read finish.
2. Complete one more scan while the setting is `false`.
3. Change the setting to `true` and call `requestRead()`. Let the read finish.

**Expected**: After step 1, `Test2` has no icon, `onChange` has run once more, and no new process has been started. After step 2, no new process is started and no icon is shown. After step 3, one new read runs and `Test2` shows the icon.  
**Evidence**: `src/tests/actor-mail.test.ts` at `ae8da71`, body revised at `c3be2d5` to call `requestRead()`, test "clears the icons when the setting goes false and reads again when it returns true (T-22)". It is mocked and does not reach Outlook. It checks the set, the `onChange` count and the `execFile` count after each step. The configuration listener in `packages/core/src/extension.ts` (added at `834b0f6`) is not run by any automated check; the test covers only the state's response to `requestRead()`.  
**Status**: NOT RUN

## Automated support (not protocol cases)

### Stop on attach error (AC-5)

**AC**: `SPEC_ACTOR_MAIL` AC-5; step 3 of the read (the stop line in the script)  
**Automated support**: `src/tests/actor-mail.test.ts` at `4743b86`, test "stops on an attach error before attaching (AC-5)". It is a text check: it finds `$ErrorActionPreference = 'Stop'` in the read script and checks that it comes before the first `GetActiveObject`. It does not run PowerShell, so it does not show exit code 1 for a failed attach. It supports the F-1 stop line; it has no T-number and no Status line, and it decides no case.

### Shell option not passed (SPEC_ACTOR_MAIL step 3)

**AC**: `SPEC_ACTOR_MAIL` step 3 (`execFile` with no shell option)  
**Automated support**: `src/tests/actor-mail.test.ts` at `7e72794`, test "passes execFile no shell option (SPEC_ACTOR_MAIL step 3)". It is a mocked check: it reads the options object that `execFile` receives and asserts that it has no `shell` property. It does not run PowerShell. It supports the F-5 finding; it has no T-number and no Status line, and it decides no case.
