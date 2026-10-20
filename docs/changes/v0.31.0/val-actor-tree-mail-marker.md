# Validation Report: actor-tree-mail-marker

**Date**: 2026-10-19 (round 1), updated 2026-10-20 to the final state
**Change Document**: [actor-tree-mail-marker.md](actor-tree-mail-marker.md)
**Test Protocol**: [tst-actor-tree-mail-marker.md](tst-actor-tree-mail-marker.md)
**Status**: PASS for the automated scope at `2168e2a` (QM Round 1 fixes re-verified; residual risk: the `extension.ts` listener has no automated test); the manual UAT (T-2 to T-6, T-10 to T-12) is NOT RUN

**Basis**: three verification rounds on `feature/actor-tree-mail-marker`, each read in a clean detached worktree with every package's `node_modules` linked (removed afterwards).

| Round | Commit | Verdict | Findings |
|-------|--------|---------|----------|
| 1 | `6e7d5de` (implementation; report first committed as `43cc863`) | PARTIAL | F-1, F-2, F-3 opened |
| 2 | `e4d6164` | PARTIAL | F-1, F-3 and most of F-2 closed; F-4 and F-5 opened (two surviving mutants) |
| 3 | `24ebfb6` | PASS | F-1 to F-5 closed |
| 4 (final) | `2168e2a` (QM Round 1 fixes: coalesce of reads during a run, re-read on `jarvis.outlook.enabled` change) | PASS for the automated scope | QM F1 and F2 verified; residual risk recorded below |

`e26ba2b`, the HEAD when this report was updated, differs from `24ebfb6` in `docs/changes/actor-tree-mail-marker.md` only (`git diff --name-only 24ebfb6 e26ba2b`). Between `6e7d5de` and `24ebfb6` the only changed files are the Change Document, the protocol, `docs/design/spec_actor.rst`, `packages/core/src/engine/actors/actorMail.ts`, `src/tests/actor-mail.test.ts` and this report; `actorTreeProvider.ts`, `actorScanner.ts`, `types.ts`, `extension.ts` and `actor-mark.test.ts` are unchanged since `6e7d5de`. The shared tree held three modified files outside this CR (`docs/design/spec_kan.rst`, `docs/requirements/req_kan.rst`, `docs/requirements/req_rec.rst`); they are not mine and no round used them as evidence.

## Round 4: QM Round 1 fixes re-verified at `2168e2a`

Clean detached worktree at `2168e2a` (status empty, every package's `node_modules` linked, removed afterwards).

| # | Item | Command | Result |
|---|------|---------|--------|
| 1 | Compile | `npx tsc -p packages/core` | exit 0 |
| 2 | Full suite | `node node_modules\vitest\vitest.mjs run` | exit 0; 61 files, 652 tests passed |
| 3 | Related files | `vitest run` on `actor-mail`, `actor-mark`, `actor-touchedfiles-ambiguity` | exit 0; 3 files, 42 tests passed (includes the T-15 to T-22 automated cases) |
| 4 | Lint, touched files | `npx eslint <files> -f json` | `actorMail.ts` 0/0; `actor-mail.test.ts` 0/0; `extension.ts` 0 errors, 30 warnings (the warnings are not reported on lines 1284 to 1290, the changed lines; the count of 30 was not re-measured at the parent commit) |
| 5 | Docs | `sphinx -E -a -b html docs docs/_build/html -W --keep-going` | exit 0, "build succeeded" |
| 6 | Line endings | bare LF count in the touched files | 0 in the CD (CRLF 273), the protocol (363), the Change Document of the CR (294), `actorMail.ts` (164), `extension.ts` (1299), `actor-mail.test.ts` (458), `spec_actor.rst` (1375), `req_eng.rst` (130), `req_exp.rst` (158) |

**Code read, coalesce.** `ActorMailState._read()` sets `_pending` when a call arrives during a run; after the run it clears the flag and starts one re-read. `requestRead()` is the public entry point. `_readOnce()` keeps the previous read logic unchanged.

**Code read, setting listener.** `packages/core/src/extension.ts:1287` calls `actorMail.requestRead()` when `jarvis.outlook.enabled` changes. The call sits in the same `context.subscriptions.push(...)` argument list as the other disposables (lines 1281 to 1289), so it is disposed with them. `actorMail` itself is registered for disposal at line 377.

**Mutation check at `2168e2a`.** Each mutant applied by an asserted single replacement in the worktree and restored from git; the three test files and the mutant precondition (`execFile` mocked in `actor-mail.test.ts`) were checked first.

| Mutant | Result | Failing tests |
|--------|--------|---------------|
| A coalesce replaced by the drop guard (`_pending` not set) | caught | 1 of 42: "coalesces scans during a run into one re-read after it (T-20)" |
| B `requestRead()` body emptied | caught | 1 of 42: "clears the icons when the setting goes false and reads again when it returns true (T-22)" |
| C `requestRead()` call removed from the `extension.ts` listener | SURVIVED | 0 of 42 in the three files; 0 of 652 in the full suite |

Mutant C survives because no automated test loads `extension.ts` for this path (the two files that import it do not drive this listener), and T-22 drives `requestRead()` directly, not the listener. T-22 therefore covers the state path only, as the Change Manager noted. The listener is verified by code reading above and by manual T-12, which is NOT RUN.

**Residual risk.** A future change that drops the listener's `requestRead()` call would pass every automated test. Until manual T-12 is run and recorded, the setting-change re-read is supported by code reading only.

**Foreign files.** `docs/design/spec_kan.rst`, `docs/requirements/req_kan.rst` and `docs/requirements/req_rec.rst` are modified in the shared tree; they were not touched and were not used as evidence.
## Summary

At `24ebfb6` the code matches the text of `SPEC_ACTOR_MAIL`, `SPEC_ENG_ACTORMARK`, `SPEC_ACTOR_TREE` and `SPEC_ACTOR_SCANNER`. Compile, the full suite (61 files, 651 tests), lint (0 errors and 0 warnings on the five touched files) and strict Sphinx pass, and all five findings of rounds 1 and 2 are closed with the evidence below. The verdict is PASS for the automated scope only.

The manual cases are NOT RUN, and this report has no evidence for them. By the PM decision (forwarded by CM, 2026-10-19), the set-change path of `onChange` (a non-empty set drawn) is accepted without an automated test, on the condition that the manual cases for the non-empty set (T-2 to T-6 and T-10 to T-12) are executed and recorded in the protocol before merge. They are manual, not automated, and part of the user's validation.

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements (`REQ_ACTOR_MAIL` AC-1..AC-12) | 12 | 12 at the automated level | 0 (on-screen behaviour: manual cases, NOT RUN) |
| Designs (`SPEC_ACTOR_MAIL`, `SPEC_ENG_ACTORMARK`, `SPEC_ACTOR_TREE`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_ACTIVITY` AC-4, `SPEC_ENG_API`) | 6 | 6 | 0 |
| Implementations (5 source files) | 5 | 5 | 0 |
| Tests (`actor-mail.test.ts`, `actor-mark.test.ts`) | 2 files | pass | 0 |
| Traceability (4 chains) | 4 | 4 | 0 |

## Findings and how each was closed

| Finding | Severity | Owner | Closed by | Evidence at `24ebfb6` |
|---------|----------|-------|-----------|-----------------------|
| F-1 an Outlook that is not running was not logged as a failure | Medium | SD, then Dev | spec `586706f`, `ee3661d`; code `4743b86` | The spec's script and `READ_SCRIPT` are identical line by line (8 lines) except a trailing comment on the stop line; `$ErrorActionPreference = 'Stop'` is line 13 of `actorMail.ts`, before `GetActiveObject` (line 14). The exact committed script, run with the application name swapped to a registered application that was not running (Word, not Outlook), exits 1 with stdout `[]` (the original script exited 0); Word was not started. Tests: "stops on an attach error before attaching (AC-5)" (text order) and "a failed attach (script exit 1) logs exactly one line and empties the set (T-10)" (mocked exit 1). Mutants M10 and M11 caught. Limit: Outlook itself was not run; T-10 is NOT RUN. |
| F-2 no automated tests for T-15, T-16, T-21; T-18, T-19, T-20 partial | Medium | Dev, TD | tests `d32b265`, `4743b86`, `7d63b19`; protocol `4d5fbb0`, `e9f4189` | Tests exist for T-15, T-16, T-17, T-18 (three rows, no notification shown), T-19, T-20 (five tests) and T-21. The three mutants that survived in round 1 are caught, each by its own test: the `outlook.enabled` guard removed (M5, T-19), case-insensitive name match (M6, T-16), script reads another default folder (M7, T-15). |
| F-3 protocol Evidence lines said "Not yet written" | Low | TD | `7aa4ced`, later re-cites | All 14 test titles the protocol cites exist in `actor-mail.test.ts`, each exactly once (checked by exact string); the 7 cited commits exist and touch that file; the old titles are gone from the test file, protocol and CD. The protocol still has 21 NOT RUN lines and no PASS or FAIL. |
| F-4 a timer started by the read was not caught (round 2, "R-1") | Medium | Dev | `7e72794`, `c566838`, `1866e4b` | Mutants caught: the constructor starts a `setInterval` (M16) or a `setTimeout` (M16b), each by two tests; a completed read starts a `setInterval` (M21) or schedules a `setTimeout` re-read (M22), each by "starts no timer from a completed read (T-20)". The cause was measured in round 2: the committed test installed fake timers after the state was built; with the order swapped in a scratch copy the same mutant was caught. |
| F-5 `shell: true` in the `execFile` options was not caught (round 2, "R-2") | Low | Dev with TD | `7e72794` | Mutant M18 caught by "passes execFile no shell option (SPEC_ACTOR_MAIL step 3)". Limit: the test pins the absence of a `shell` key, not every way to get a shell. |

## Commands (final state, clean worktree at `24ebfb6`)

| # | Item | Command | Result |
|---|------|---------|--------|
| 1 | Compile | `npx tsc -p packages/core` | exit 0 |
| 2 | Full suite | `node node_modules\vitest\vitest.mjs run` | exit 0; 61 files, 651 tests passed (635 in round 1, 649 in round 2) |
| 3 | Lint, five touched files | `npx eslint <files> -f json` | exit 0; 0 errors, 0 warnings (`actorMail.ts`, `actorTreeProvider.ts`, `actorScanner.ts`, `actor-mail.test.ts`, `actor-mark.test.ts`) |
| 4 | Docs | `sphinx -E -a -b html docs docs/_build/html -W --keep-going` | exit 0, "build succeeded" |
| 5 | Line endings | byte count of bare LF | 0 in the CD (273 CRLF), the protocol (350), `spec_actor.rst` (1370), `actorMail.ts` (150) and `actor-mail.test.ts` (418); the working tree equals HEAD for all of them |

## Mutation check (final state)

Baseline 41 tests in `actor-mark.test.ts`, `actor-mail.test.ts` and `actor-touchedfiles-ambiguity.test.ts`, 41 passing. `actor-mail.test.ts` mocks `child_process.execFile`; the run aborts unless that is the case, so no mutant could start a process or reach a real Outlook. Each mutant was applied by an asserted single replacement and restored from git. 17 mutants, 17 caught, 0 survived, 0 stale; after the last one the worktree was clean and 41/41 passed again.

| Mutant | Finding | Failing tests |
|--------|---------|---------------|
| M5 `outlook.enabled` guard removed | F-2 | 1 (T-19) |
| M6 name match case-insensitive | F-2 | 1 (T-16) |
| M7 script reads another default folder | F-2 | 1 (T-15) |
| M16 constructor starts a `setInterval` | F-4 | 2 |
| M16b constructor starts a `setTimeout` | F-4 | 2 |
| M21 a completed read starts a `setInterval` | F-4 | 1 |
| M22 a completed read schedules a `setTimeout` re-read | F-4 | 1 |
| M18 `execFile` gets `shell: true` | F-5 | 1 |
| M10 stop line removed | F-1 | 1 |
| M11 stop line moved after the attach | F-1 | 1 |
| M12 script gains a mutating member (`.Delete`) | regression | 2 (T-15, T-21) |
| M13 a failed read does not empty the set | regression | 4 |
| M14 a trigger during a run is not dropped | regression | 1 |
| M15 `onChange` fires on every read | regression | 6 |
| M17 a failed read shows a notification | regression | 3 |
| M19 timeout changed to 60 s | regression | 1 |
| M20 `-NoProfile` dropped | regression | 3 |

Not re-run in rounds 2 and 3: the round 1 mutants M1 to M4 and M8. M1 to M3b target `actorTreeProvider.ts`, M4 targets `actorScanner.ts`; both files are unchanged since `6e7d5de`, and `actor-mark.test.ts` is unchanged too. The two `onDidScan` tests that caught M4 are still present under the same titles, but I did not compare their bodies with round 1. M8 (a failed read writes no log line) was not re-run either. The T-18 and T-10 tests assert exactly one log line (read in the test file).

My first mutation run at `e4d6164` was invalid: a guard I had kept swapped the application name inside the script, so the script-text test failed in every run and every mutant looked caught. I noticed that mutants that cannot affect that test failed it too, removed the swap, made the run abort unless `execFile` is mocked, and re-ran. Only valid runs are reported here.

## Checks requested with the PM decision

- **No dynamic value reaches the PowerShell text.** `READ_SCRIPT` (`actorMail.ts:11-20`) is a constant template literal with no `${...}`; the only `${` in the file are in log strings built after the run (lines 75, 76, 136). The `execFile` arguments are constant (`actorMail.ts:67-70`: `['-NoProfile', '-Command', READ_SCRIPT]`, `{ timeout: READ_TIMEOUT_MS, windowsHide: true }`) and the file has no `shell` option (the word appears only inside `powershell`). Folder names return only on stdout as JSON, pass through `parseMailFolders`, and are used only as the argument of `scanner.resolveName` (an equality comparison). The one configuration value read (`outlook.enabled`) is a boolean used in a condition. The first stderr line goes into a log message only. Basis: reading the whole file and grep; no fuzzing. Dropping `-EncodedCommand` costs nothing here, since there is nothing to quote.
- **`execFile` form, spec and code agree.** `SPEC_ACTOR_MAIL` step 3 now states `childProcess.execFile('powershell', ['-NoProfile', '-Command', READ_SCRIPT], { timeout: 10_000, windowsHide: true }, callback)`, no shell; the code is the same with `READ_TIMEOUT_MS = 10_000`. In round 1 the spec named neither the arguments nor `windowsHide`; SD stated them in `ee3661d`.

## Manual UAT (not part of this verification)

T-1 to T-14 are manual and NOT RUN. The PM decision names T-2 to T-6 and T-10 to T-12 (the cases that show a non-empty set drawn and its change) as required before merge, executed and recorded in `docs/changes/tst-actor-tree-mail-marker.md`. This report counts them as manual, not automated. The protocol's automated support lines (for example the mocked T-10 test) are not a pass of a manual case, and the protocol says so.

## Statuses

`REQ_ACTOR_MAIL`, `SPEC_ACTOR_MAIL`, `SPEC_ENG_ACTORMARK`, `SPEC_ACTOR_TREE`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_ACTIVITY` and `US_ACTOR_MAIL` are `draft` at `e26ba2b` (checked). Approval goes to the PM (D-L1-7); I changed no status. The setting name drift of `REQ_OLK_ENABLE` and `SPEC_OLK_SETTINGS` (`jarvis.outlookEnabled`) against the shipped `jarvis.outlook.enabled` (`packages/pim/package.json:120`) is a deferred documentation change on the PM backlog (D-L1-8); I did not verify it as fixed, and this CR's elements use the shipped name.

## Limits of this verification

- Everything above ran against a fake host (`vscode` stubbed by the test setup, `execFile` mocked in the committed tests). A real PowerShell child ran only in my scratch tests (round 1) and in the exit-code probe of F-1. No Development Host and no Outlook COM call was involved. Outlook was running on the machine; I did not run the read script against it, because it would put real folder names in front of me, which this report must not hold.
- The F-1 behaviour was measured on stand-ins (an unregistered name, and Word, registered and not running). The failure class is the same as an Outlook that is not running; it is not a run against Outlook, and Outlook's own message text is untested.
- The shell test (F-5) pins the absence of a `shell` key only.
- The scratch tests and the mutation scripts were throwaway (not committed); the figures above are their results.

## Conclusion

At `24ebfb6` the implementation does what the specification text says, builds, passes 651 tests, lints clean, and the documentation builds strictly. All five findings are closed with evidence, and 17 of 17 mutants are caught. The verdict is PASS for the automated scope. What remains is not mine to close: the manual UAT (T-1 to T-14, in particular T-2 to T-6 and T-10 to T-12 before merge), the PM's approval of the draft elements, and the deferred D-L1-8 documentation change.

---

# Record of round 1 (`6e7d5de`)

Everything below is the first report as committed in `43cc863`, with its headings demoted and marked "(Round 1)". It describes the state at `6e7d5de`: statements about open findings, missing tests, surviving mutants and the stand-in measurements are as of that round and are superseded by the sections above where the findings were closed.

**Basis of round 1**: implementation commit `6e7d5de` (parent `a2220e7`), read in a clean detached worktree with every package's `node_modules` linked. When I started, the shared tree was not clean: three modified files outside this CR (`docs/design/spec_kan.rst`, `docs/requirements/req_kan.rst`, `docs/requirements/req_rec.rst`); I did not touch them and used none as evidence.

### Summary (Round 1)

The code matches the text of `SPEC_ACTOR_MAIL`, `SPEC_ENG_ACTORMARK`, `SPEC_ACTOR_TREE` and `SPEC_ACTOR_SCANNER`. Compile, the full suite, lint and strict Sphinx pass, and Dev's counts are confirmed. The report is PARTIAL for two reasons, both written out below:

- **F-1 (Medium, owner SD, then Dev):** with the read script as `SPEC_ACTOR_MAIL` specifies it, an Outlook that is not running is not detected as a failure. The tree behaves correctly (no icon, no message), but the one log line that `REQ_ACTOR_MAIL` AC-10 and protocol case T-10 expect is never written.
- **F-2 (Medium, owner Dev, with TD):** three of the protocol's seven automated cases (T-15, T-16, T-21) and the process part of T-19 have no test, and T-18 and T-20 are covered only in part. Mutants that break those behaviours survive.

No protocol case has been run (T-1 to T-14 need a Development Host and Outlook; T-15 to T-21 are listed in the protocol as "Evidence: Not yet written"). Statuses are unchanged by me; see Statuses.

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements (`REQ_ACTOR_MAIL` AC-1..AC-12) | 12 | 11 | 1 (AC-10, F-1) |
| Designs (`SPEC_ACTOR_MAIL`, `SPEC_ENG_ACTORMARK`, `SPEC_ACTOR_TREE`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_ACTIVITY` AC-4, `SPEC_ENG_API`) | 6 | 5 | 1 (`SPEC_ACTOR_MAIL`, F-1) |
| Implementations (5 source files, 2 test files) | 7 | 7 | 0 |
| Tests (Dev's) | 2 files | pass | F-2 (gaps) |
| Traceability | 3 levels | complete in the specs | F-3 (protocol evidence lines) |

### Commands (item, command, result) (Round 1)

| # | Item | Command (clean worktree at `6e7d5de`) | Result |
|---|------|----------------------------------------|--------|
| 1 | Compile | `npx tsc -p packages/core` | exit 0 |
| 2 | Full suite | `node node_modules\vitest\vitest.mjs run` | exit 0; 61 files, 635 tests passed (Dev reported 61 / 635) |
| 3 | Lint, the 7 touched files | `npx eslint <files> -f json` | exit 0; 0 errors; 30 warnings, all in `extension.ts` (19 `no-unused-vars`, 11 `no-explicit-any`); the parent `a2220e7` has the same 30 there, so none is new; the only one near the changed lines is `_entityName` at line 371, untouched |
| 8 | Docs | `sphinx -E -a -b html docs docs/_build/html -W --keep-going` | exit 0, "build succeeded" |

### Specification conformance (item 4) (Round 1)

| Spec element | AC | Code | Test | Result |
|--------------|----|------|------|--------|
| `SPEC_ACTOR_MAIL` | step 1, AC-4: setting false starts no process | `actorMail.ts:123-125` | "with the Outlook setting off ..." asserts no change and no log, not that no process starts | holds; process part untested (F-2) |
| | step 3, AC-2, AC-5, AC-6: script text | `actorMail.ts:11-19`, identical to the spec's script; reads only `GetDefaultFolder(6)` and `Folders`; `GetActiveObject`, never `New-Object` | none | holds by reading; untested (F-2) |
| | step 3: `execFile`, no shell, 10 s | `actorMail.ts:66-69` | timeout measured by me (S6) | holds |
| | step 4, AC-1: only a `found` name counts | `unreadActorIds` | two Dev tests (found, ambiguous), S1 | holds |
| | step 5, AC-7: failure empties the set, one log line, no message | `actorMail.ts:127-138` | Dev: non-Windows branch only; me: timeout, non-zero exit, non-JSON output | holds for those branches; **not reached for "Outlook not running" (F-1)** |
| | step 6, AC-8: `onChange` only on a changed set | `actorMail.ts:144-147` | indirect (mutant M9 caught by 2 tests); S1 measured the unchanged and changed cases | holds |
| | AC-3: a read after every completed scan, no other trigger | one subscription, `actorMail.ts:107`; no timer, no Outlook event | Dev: `onDidScan` fires per rescan | holds |
| | trigger during a run is dropped | `actorMail.ts:120` | none by Dev; S3 measured (2 scans, 1 read) | holds; untested (F-2) |
| `SPEC_ACTOR_SCANNER` | `onDidScan` after every completed rescan, once for a shared in-flight promise | `actorScanner.ts:84` | Dev: 2 tests; mutant M4 caught by 3 | holds |
| `SPEC_ACTOR_TREE` | AC-6: order mark, green activity, mail | `actorTreeProvider.ts:151-157` | Dev: 5 tests; mutants M3a, M3b caught | holds |
| `SPEC_ENG_ACTORMARK` | AC-1 idempotent dispose; AC-2 stacking; AC-3 order; AC-5 additive, `version` stays 2 | `actorTreeProvider.ts:66-76`; `types.ts:57` | Dev: 3 new/changed tests; mutants M1, M2 caught | holds |
| `SPEC_ACTOR_ACTIVITY` AC-4, `SPEC_ENG_API` | wording only | `ActivityTracker` unchanged; `types.ts` comment now says stack | n/a | holds |

Consumer check for the changed mark semantics: the only caller of `markActor` is the recorder (`packages/recorder/src/extension.ts:82`, `session.ts:208`); it holds one mark and disposes it, so stacking changes nothing for it.

### Acceptance criteria of `REQ_ACTOR_MAIL` (Round 1)

- [x] AC-1: a name that resolves to `found` is the only one drawn. Evidence: `actorMail.ts` `unreadActorIds`; S1.
- [x] AC-2: exact, case-sensitive; direct Inbox children only. Evidence: `resolveName` compares with `===`; S1 (a folder differing only in case adds nothing); script lines 13-14. No Dev test (mutant M6 survives; F-2).
- [x] AC-3: an ambiguous name draws nothing, silently. Evidence: Dev test "adds nothing for an ambiguous name".
- [x] AC-4: only a folder with `unread > 0`. Evidence: `unreadActorIds`; S1, S2.
- [x] AC-5: read after every completed scan; no timer, no Outlook event; only Actor ids kept; refresh only on a changed set. Evidence: `actorMail.ts:97-147` (the whole file read); S1, S3.
- [x] AC-6, AC-7: order and "next icon still present". Evidence: `actorTreeProvider.ts:151-157`; Dev tests; M1, M3a, M3b caught. The "at the next refresh" part is T-7 to T-9 (NOT RUN).
- [x] AC-8: read-only members only. Evidence: script text. No test (M7 survives; F-2).
- [x] AC-9: never starts Outlook. Evidence: `GetActiveObject` only. I ran the script text against a registered application that was not running (Word, as a stand-in); it did not start (no process afterwards). The stand-in shows the attach behaviour, not Outlook itself (see Limits).
- [ ] AC-10: failure to read, no icon, one log line, no message. Holds for: non-Windows (Dev), timeout, non-zero exit, non-JSON output (me). **Does not hold for "Outlook not running" or a COM error: no log line (F-1).** The tree outcome (no icon, no message) does hold.
- [x] AC-11: setting false, no Outlook call. Evidence: `actorMail.ts:123-125`; process-not-started is untested (F-2).
- [x] AC-12: the node changes only in `iconPath`. Evidence: the `getTreeItem` diff of `6e7d5de` adds one `else if` branch and touches no other property. T-14 (NOT RUN) shows it on screen.

### Dev's interim decisions (item 5) (Round 1)

- **(a) Optional 4th constructor parameter `mail` of `ActorTreeProvider`** (`actorTreeProvider.ts:55`, default `{ isUnread: () => false }`). Reason it is acceptable: the only production caller passes it (`extension.ts:379`, read by me), and the two older test files that construct the provider keep working. Open for SD: `SPEC_ACTOR_TREE` shows `mail.isUnread(...)` in its rendering sample but never says how `mail` reaches the provider, so the parameter is unspecified. The wiring itself (`extension.ts:376-379`) has no automated test; I verified it by reading.
- **(b) `execFile('powershell', ['-NoProfile', '-Command', script])`, 10 s timeout, no `-EncodedCommand`.** Matches `SPEC_OLK_COMBRIDGE` (`OutlookCategoryProvider.ts:22-25`: same arguments, same 10 s). The multi-line script as one `-Command` argument works: a real PowerShell child ran it in S1, S2 and F1/F2 (list of one entry, empty list, non-ASCII name `├£ber` all parse). One addition not in either spec: `windowsHide: true`; harmless, and `SPEC_ACTOR_MAIL` is silent on it (observation for SD).
- **(c) Failures logged as one line, no `error.message`.** Holds. The line is `[Mail] Outlook read failed: <reason>` with the reason built from `error.killed` ("timed out after 10 s") or `exit <code>: <first stderr line>`. Measured: a child that wrote two stderr lines and exited 3 produced one log line with `exit 3` and the first stderr line only. The first stderr line of a PowerShell COM error is the exception text; I saw no script text or folder name in it.

### Test gap flagged by Dev, and the protocol (item 6, for CM, to state for PM) (Round 1)

Dev's statement: the set-change path of `onChange` (a non-empty set drawn) needs live Outlook. What I found:

- The manual cases that cover a non-empty set drawn, and its change: T-2 (empty to non-empty, manual refresh), T-3 (second Actor, periodic scan), T-4 and T-5 (non-empty to empty, manual and periodic), T-6 (after restart), T-10 and T-11 (Outlook closed, then back), T-12 (setting off, then on). All are NOT RUN.
- The Outlook COM leg needs live Outlook. The rest of the path does not: in a scratch test (not committed) I ran the real `ActorMailState` against a real PowerShell child that returned synthetic folder lists. Empty to non-empty to unchanged to changed gave `onChange` 1, 1 (unchanged read), 2 times; a name with a non-ASCII character matched; a folder differing only in case did not. So an automated test of the set-change path is possible without Outlook; adding it is for Dev and TD to decide.
- Acceptance of the untested path is not mine to decide; this is stated for PM.

### Mutation check (item 7) (Round 1)

Each mutant was applied to the worktree copy with an asserted single replacement, the tests of `actor-mark`, `actor-mail` and `actor-touchedfiles-ambiguity` were run (25 tests, 25 passing unmutated), and the file was restored from git. Mutants that touch the read script also swapped the application name, so no run could reach a real Outlook.

| Mutant | Targets | Failing tests | Result |
|--------|---------|---------------|--------|
| M1 a new mark replaces the older ones (**the AC-2 replace-semantics mutant**) | `SPEC_ENG_ACTORMARK` AC-2 | 2 | caught |
| M2 dispose not idempotent | AC-1 | 1 | caught |
| M3a a mark no longer beats the mail icon | `SPEC_ACTOR_TREE` AC-6 | 1 | caught |
| M3b the mail icon beats the green indicator | AC-6 | 1 | caught |
| M4 `onDidScan` only when the list changed | `SPEC_ACTOR_SCANNER` | 3 | caught |
| M8 failed read writes no log line | AC-7 | 1 | caught |
| M9 `onChange` on every read | AC-8 | 2 | caught |
| M5 the `outlook.enabled` guard removed | T-19 | 0 | **survived** (conditional: with the application name swapped the removed guard reads an empty list quietly; the test does not spy on `execFile`, so it cannot see a process start) |
| M6 name match case-insensitive | T-16, AC-2 | 0 | **survived** |
| M7 the script reads another folder | T-15, AC-2 | 0 | **survived** |

After all mutants: worktree clean, 25/25 passing again.

### Test Protocol (Round 1)

**File**: docs/changes/tst-actor-tree-mail-marker.md
**Result**: NOT RUN (the protocol states that no case is marked PASS or FAIL; it has no overall result line)

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| T-1 to T-14 | `REQ_ACTOR_MAIL`, `REQ_REC_BUTTON`, `REQ_ACTOR_ACTIVITY` | see protocol | manual cases in a Development Host with Outlook | NOT RUN |
| T-15 | `REQ_ACTOR_MAIL` | AC-2 | script reads direct children only | NOT RUN; no Dev test; I read the script text |
| T-16 | `REQ_ACTOR_MAIL` | AC-2 | exact, case-sensitive name | NOT RUN; no Dev test (M6 survives); S1 measured it |
| T-17 | `REQ_ACTOR_MAIL` | AC-3 | ambiguous name, silent | NOT RUN; Dev test exists (name-resolution level) |
| T-18 | `REQ_ACTOR_MAIL` | AC-10 | three failure runs, one log line | NOT RUN; Dev covers non-Windows only; I measured timeout, non-zero exit, non-JSON |
| T-19 | `REQ_ACTOR_MAIL` | AC-11 | setting false, no process | NOT RUN; Dev asserts the observable, not the process (M5) |
| T-20 | `REQ_ACTOR_MAIL` | AC-5 | one read per scan; drop during a run; change only on a changed set | NOT RUN; Dev covers the scan event and part of the change rule; S3 measured the drop |
| T-21 | `REQ_ACTOR_MAIL` | AC-8 | read-only members only | NOT RUN; no Dev test (M7 survives) |

Every Evidence line of T-15 to T-21 still reads "Not yet written" (the protocol was committed before the implementation and `6e7d5de` did not touch it).

### Issues Found (Round 1)

#### F-1: "Outlook not running" is not detected as a failure with the specified script (Round 1)
- **Severity**: Medium
- **Category**: Design (the script in `SPEC_ACTOR_MAIL` step 3), then Code
- **Owner**: SD decides the remedy; Dev implements
- **Description**: with the script exactly as specified (`actorMail.ts:11-19` is identical), a failed `GetActiveObject` is a non-terminating PowerShell error. Measured with a registered application that was not running, and with a name that is not registered: exit code 0, stdout `[]`, the error text on stderr only. `ActorMailState` reads exit 0 plus a valid empty array as a successful read: the set is emptied (the visible result is right) but `log.warn` is never called. With `$ErrorActionPreference = 'Stop'` prepended, the same run exits 1 and the existing failure branch would log.
- **Expected**: `REQ_ACTOR_MAIL` AC-10 and `SPEC_ACTOR_MAIL` AC-7 name "Outlook not running" and "COM error" as failures that write one log line; protocol T-10 expects "one warning line about the Outlook read".
- **Actual**: no log line in those cases; T-10's log expectation cannot be met. No icon, no message, and no Outlook start do hold.
- **Recommendation**: SD to choose between adding `$ErrorActionPreference = 'Stop'` to the script in step 3, or having the code treat output on stderr as a failure (this would also fire on harmless PowerShell warnings). Dev then follows and adds a test that runs a failing attach, as in F1/F2 and S5 here.
- **Limit**: measured on stand-ins, not on Outlook (see Limits).

#### F-2: Automated tests do not cover T-15, T-16, T-21 and parts of T-18, T-19, T-20 (Round 1)
- **Severity**: Medium
- **Category**: Test
- **Owner**: Dev writes the tests; TD records the evidence lines
- **Description**: see the Test Protocol table and the survived mutants M5, M6, M7. The tests Dev wrote exercise the pure helpers, the scan event, the setting-off path and the non-Windows failure. They never run the script, spy on `execFile`, or reach a non-empty set through `ActorMailState`.
- **Recommendation**: tests that stub `execFile` (as T-18, T-19 and T-20 already say) and one that pins the script text against the read-only member list (T-21); the scratch tests I ran show what is measurable without Outlook.

#### F-3: Protocol evidence lines are not updated (Round 1)
- **Severity**: Low
- **Category**: Traceability
- **Owner**: TD
- **Description**: T-15 to T-21 say "Not yet written" although some tests exist (T-17, part of T-18/T-20). The protocol says file and title are recorded at implementation.

#### Observations (no action required by this report) (Round 1)
- `SPEC_ACTOR_TREE` does not mention the optional `mail` constructor parameter (SD, Low).
- `windowsHide: true` is not named in `SPEC_ACTOR_MAIL` (SD, Low).
- A dropped trigger means a mail change during a running read is seen at the next scan; that is what the spec says (read one at a time, drop the rest).

### Statuses (Round 1)

`REQ_ACTOR_MAIL`, `SPEC_ACTOR_MAIL`, `SPEC_ENG_ACTORMARK`, `SPEC_ACTOR_TREE`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_ACTIVITY` and `US_ACTOR_MAIL` are `draft` (D-L1-7: approval goes to the PM, to be raised with the user). I changed no status: draft elements are not at the `approved` step that precedes `implemented`, and AC-10 of the requirement is not verified (F-1).

### Limits of this verification (Round 1)

- Everything above ran against a fake host (`vscode` stubbed by the test setup) and, in my scratch tests, a real PowerShell child with synthetic folder lists. No Development Host and no Outlook COM call was involved. Outlook was running on this machine; I did not run the read script against it, because it would put real folder names in front of me, which this report must not hold.
- Failure behaviour of the attach (F-1) was measured on stand-ins (an unregistered name, and Word, registered and not running). The failure class is the same as "Outlook not running"; it is not a run against Outlook, and Outlook's own message text is untested.
- The scratch tests and the mutation script were throwaway (not committed); their results are the figures above.

### Traceability (Round 1)

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| `REQ_ACTOR_MAIL` | `SPEC_ACTOR_MAIL` | `actorMail.ts` (header names SPEC and REQ), `extension.ts:376-379` | `actor-mail.test.ts`, `actor-mark.test.ts`; T-1..T-21 NOT RUN | partial (F-1, F-2) |
| `REQ_ENG_ACTORMARK` | `SPEC_ENG_ACTORMARK` | `actorTreeProvider.ts:66-76`, `types.ts` | `actor-mark.test.ts` | yes |
| `REQ_ACTOR_TREE`, `REQ_ACTOR_ACTIVITY` | `SPEC_ACTOR_TREE` AC-6, `SPEC_ACTOR_ACTIVITY` AC-4 | `actorTreeProvider.ts:151-157` | `actor-mark.test.ts` | yes |
| `REQ_EXP_REACTIVECACHE`, `REQ_CFG_SCANINTERVAL` | `SPEC_ACTOR_SCANNER` | `actorScanner.ts:37-40, 84` | `actor-mail.test.ts` (`onDidScan`) | yes |

### Conclusion (Round 1)

The implementation does what the specification text says, builds, passes 635 tests and lints without errors. It is not fully verified: AC-10 of `REQ_ACTOR_MAIL` fails for the case it is mostly about, an Outlook that is not running (F-1), and three of the seven automated cases in the protocol (T-15, T-16, T-21) have no test (F-2). Next step: SD decides the remedy for F-1; Dev and TD close F-2 and F-3; then I re-check those points. The manual protocol (T-1 to T-14) and the PM's decision on the untested set-change path stay with their owners.
