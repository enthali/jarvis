# Change Document: actor-tree-mail-marker

**Status**: merged
**Branch**: feature/actor-tree-mail-marker
**Created**: 2026-10-19
**Author**: PM
**Operation Mode**: autonomous

- **autonomous** — every actor decides on its own; when genuinely unsure, it asks the user directly (not routed through CM) and pauses only its own step until answered.

---

## Summary

The user wants to see in the actor tree which actors have unread email, without leaving VS Code. When Outlook email sync is enabled, every actor whose name matches an Outlook mail folder directly under the Inbox (e.g. `Inbox\Test1`) shows a mail icon in front of its name while that folder holds unread mail. The state is read from Outlook on each tree refresh (the existing configurable interval) and on the existing manual scan; no local cache and no live push are wanted. An actor node shows one icon at a time, by priority: recording (red dot) > active session (green dot) > unread mail (mail icon); the existing order of red over green and the colours stay as they are. Each source keeps its own entry, so ending one (e.g. a recording) shows the next one still present instead of no icon. Acceptance (user validation): with Outlook email sync enabled in the test workspace, the user marks mails in `Inbox\Test1` (currently one read mail) and `Inbox\Test2` (currently one unread mail) read or unread, and after a refresh or a manual scan the icons in front of the test actors `Test1` and `Test2` follow. Test constraints (user, 2026-10-19): unit tests are unrestricted; integration tests in the Extension Development Host may access Outlook read-only and never change mail; test actors exist only in `testdata` and match the Outlook folders `Test1` and `Test2`; no other real mail folder is used for tests.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ACTOR_ACTIVITY | Activity Indicator on Actor Nodes | modified | AC-1 ("exactly two visual states") conflicts with the recording mark (REQ_REC_BUTTON AC-3); narrowed to the indicator, other icons point to US_ACTOR_MAIL |
| US_REC_CAPTURE | Record a Meeting for an Actor | checked, unchanged | AC-2 (red circle while recording) still holds; the order against the mail icon is in US_ACTOR_MAIL AC-4 |
| US_ACTOR_TREE | Dedicated ACTORS Tree | checked, unchanged | AC-7 (rescan and periodic timer) are the moments the mail icon is read |
| US_REC_ENABLE | Enable / Disable Recording Feature | checked, unchanged | Reached through REQ_REC_BUTTON only; no mark wording |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_ACTOR_MAIL | Unread Mail Icon on Actor Nodes: a mail icon while the Outlook folder of the Actor's name, directly under the Inbox, holds unread mail | optional |

### Decisions

- D-L0-1: The mail icon is its own story (US_ACTOR_MAIL), not an extension of US_ACTOR_ACTIVITY: it reads Outlook and ranks below the activity indicator.
- D-L0-2 (USER REVIEW REQUIRED): "Outlook email sync is enabled" is read as `jarvis.outlook.enabled`, the existing Outlook switch of the PIM package. No spec before this CR describes Outlook mail folders or unread mail, so no email sync feature exists to attach to.
- D-L0-3: Order recording (red) > active session (green) > unread mail, as corrected by the user in the Summary; stated once, in US_ACTOR_MAIL AC-4.
- D-L0-4: Priority optional, as for the sibling activity story.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories (US_ACTOR_ACTIVITY AC-1 narrowed in this CR)
- [x] No redundancies (the order is stated only in US_ACTOR_MAIL AC-4)
- [x] Gaps identified and addressed (D-L0-2)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_ENG_ACTORMARK | US_REC_CAPTURE | modified | AC-2 and AC-3: a second mark replaced the first; marks now stack and disposing removes only its own entry; the order names the mail icon |
| REQ_ACTOR_ACTIVITY | US_ACTOR_ACTIVITY | modified | AC-7 forbade any iconPath change while Inactive; the mail icon needs it |
| REQ_REC_BUTTON | US_REC_CAPTURE; US_REC_ENABLE | modified | AC-3: after a recording the activity indicator applies again; now the next icon still present applies |
| REQ_EXP_REACTIVECACHE | US_EXP_SIDEBAR (via REQ_CFG_SCANINTERVAL) | modified | AC-4: refresh only on actor-cache change; the mail icon set is a second reason |
| REQ_ACTOR_TREE | US_ACTOR_TREE | checked, unchanged | AC-7 (rescan and timer) are the read occasions of the mail icon |
| REQ_CFG_SCANINTERVAL | US_ACTOR_TREE | checked, unchanged | The interval is the periodic read; AC-2 holds |
| REQ_OLK_ENABLE | US_OLK_COMBRIDGE | checked, unchanged | Gate of the mail read (no Outlook call while off); setting name in the text differs from the code; PM decision: code name stays, doc fix deferred (D-L1-8) |
| REQ_ENG_CONTRACT | REQ_ENG_ACTORMARK | checked, unchanged | Mark API stays additive, version 2 |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_ACTOR_MAIL | Unread Mail Icon on Actor Nodes | US_ACTOR_MAIL; REQ_ACTOR_TREE; REQ_ACTOR_ACTIVITY; REQ_ENG_ACTORMARK; REQ_OLK_ENABLE; REQ_CFG_SCANINTERVAL; REQ_EXP_REACTIVECACHE | optional |

### Conflicts Detected

- ⚠️ REQ_ACTOR_ACTIVITY AC-7 vs REQ_ACTOR_MAIL AC-6: AC-7 forbade any iconPath change while Inactive, where the mail icon applies.
  - Resolution: AC-7 says the indicator sets no icon while Inactive; another icon may apply.
- ⚠️ REQ_ENG_ACTORMARK AC-2 and AC-3 vs REQ_ACTOR_MAIL AC-7: a second mark replaced the first, so disposing the second left no icon.
  - Resolution: marks stack; the most recent still-set mark shows; disposing removes only that entry.
- ⚠️ REQ_EXP_REACTIVECACHE AC-4 vs REQ_ACTOR_MAIL AC-5: refresh only on an actor-cache change vs refresh on a change of the mail icon set.
  - Resolution: AC-4 names the mail icon set as a second reason; the mail state is not part of the cache.
- ⚠️ REQ_REC_BUTTON AC-3 vs REQ_ACTOR_MAIL AC-7: after a recording the activity indicator applied again, which leaves no icon while mail is unread.
  - Resolution: the next icon still present applies.
- ⚠️ US_ACTOR_ACTIVITY AC-1 vs REQ_REC_BUTTON AC-3 (approved before this CR): "exactly two visual states" vs the red circle.
  - Resolution: US_ACTOR_ACTIVITY AC-1 narrowed (Level 0).

### Decisions

- D-L1-1 (USER REVIEW REQUIRED): The Outlook read sits in core (`packages/core`, SPEC_ACTOR_MAIL), not in `packages/pim`: the tree and the scan that triggers the read are in core. A pim reader would need a new public API member and a scan event for add-ons. Reversible by moving the reader later.
- D-L1-2 (USER REVIEW REQUIRED): Attach only (`GetActiveObject`). With Outlook closed there are no mail icons, and the periodic scan never opens Outlook. The category bridge starts Outlook (`New-Object`); the difference is deliberate.
- D-L1-3 (USER REVIEW REQUIRED): No cache means the only mail state kept is the set of Actor ids that showed the icon last, which decides whether the tree refreshes. No counts, folders or items are kept.
- D-L1-4: Several marks on one Actor: the most recently added one shows. The Summary gives no order among add-on marks; cheapest to reverse.
- D-L1-5: The folder name match is exact and case-sensitive, like the Actor name rule; an ambiguous Actor name shows no mail icon, silently.
- D-L1-6: Read failures are logged only; no notification.
- D-L1-7: New and modified elements are draft; approval goes to the PM, to be raised with the user before merge.
- D-L1-8: PM decision (2026-10-19): the code name `jarvis.outlook.enabled` stays (the shipped setting in packages/pim/package.json), and REQ_ACTOR_MAIL and SPEC_ACTOR_MAIL use it. REQ_OLK_ENABLE and SPEC_OLK_SETTINGS name `jarvis.outlookEnabled`; both stay unchanged in this change, and the fix is a deferred doc change on the PM backlog.
- D-L1-9: src/tests/actor-mark.test.ts AC-2 (replace semantics) fails by design after implementation; the update belongs to Dev and TD.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements (conflicts above resolved in this CR)
- [x] No redundancies (the order sits in REQ_ACTOR_MAIL AC-6; other requirements refer to it)
- [x] All new REQs link to User Stories (REQ_ACTOR_MAIL links US_ACTOR_MAIL)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENG_ACTORMARK | REQ_ENG_ACTORMARK | modified | Marks held as a stack per Actor id; idempotent dispose; AC-1 to AC-3 rewritten |
| SPEC_ACTOR_TREE | REQ_ACTOR_TREE; REQ_ENG_ACTORMARK | modified | Icon order: mark, then activity, then mail; refresh on a change of the mail set; AC-6 added |
| SPEC_ACTOR_ACTIVITY | REQ_ACTOR_ACTIVITY | modified | AC-4 names the mail icon as the other influence; no icon set while Inactive |
| SPEC_ACTOR_SCANNER | REQ_EXP_REACTIVECACHE; REQ_CFG_SCANINTERVAL | modified | New event onDidScan after every completed rescan; onDidChange unchanged |
| SPEC_ENG_API | REQ_ENG_ACTORMARK | modified | Comment of markActor no longer says replace; signature and version unchanged |
| SPEC_REC_BUTTON | REQ_REC_BUTTON; REQ_ENG_ACTORMARK | checked, unchanged | Holds the red mark and removes it at the end; "removed afterwards" (AC-6) holds with stacking |
| SPEC_REC_SESSION | REQ_REC_BUTTON | checked, unchanged | Holds and releases its own entry; no replace wording (grep) |
| SPEC_OLK_SETTINGS | REQ_OLK_ENABLE | checked, unchanged | Setting name drift (D-L1-8); PM decision: unchanged in this change, deferred doc fix |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_ACTOR_MAIL | Unread Mail Icon Source | REQ_ACTOR_MAIL; SPEC_ACTOR_SCANNER; SPEC_ACTOR_TREE; SPEC_OLK_SETTINGS |

### Conflicts Detected

- ⚠️ SPEC_ENG_ACTORMARK AC-2 vs SPEC_ACTOR_TREE: the code and the spec hold one mark slot per Actor id.
  - Resolution: the slot becomes a stack; rendering reads the most recent entry.
- ⚠️ SPEC_ACTOR_ACTIVITY AC-4 ("the only other influence is the mark") vs SPEC_ACTOR_MAIL: the mail icon is a second influence.
  - Resolution: AC-4 lists both influences and their order.
- ⚠️ SPEC_ACTOR_SCANNER step 6 (onDidChange only on change) vs the mail read after every scan.
  - Resolution: new onDidScan event; onDidChange keeps its meaning.
- ⚠️ SPEC_OLK_COMBRIDGE (starts Outlook) vs SPEC_ACTOR_MAIL (attaches only): same route, different start behaviour.
  - Resolution: intended difference, stated in SPEC_ACTOR_MAIL; USER REVIEW REQUIRED (D-L1-2).
- ⚠️ SPEC_ACTOR_MAIL step 3 script vs step 5 and REQ_ACTOR_MAIL AC-10: a failed attach exited 0 with `[]`, so no failure line was logged (VE F-1).
  - Resolution: the script stops at its first error; exit code 1 reaches step 5 (D-L2-7).

### Decisions

- D-L2-1: A second dispose of the same Disposable changes nothing and refreshes nothing (SPEC_ENG_ACTORMARK AC-1).
- D-L2-2: onDidScan is an event on ActorScanner, not a constructor callback, so onDidChange keeps its meaning.
- D-L2-3: The mail read has a 10-second timeout, as the category bridge. A completed scan during a run is not dropped: one re-read is pending and runs once after the running read (QM Round 1 finding 1, PM decision 1).
- D-L2-4: The script sets UTF-8 console output first, so folder names with non-ASCII characters match Actor names.
- D-L2-5: The mail icon is ThemeIcon('mail') without colour, so it does not compete with the red and green dots.
- D-L2-6: No new public API member: the read lives in engine/actors and feeds the tree directly (D-L1-1).
- D-L2-7: VE finding F-1 (report 43cc863), remedy option (a): `$ErrorActionPreference = 'Stop'` in the read script after the encoding line (SPEC_ACTOR_MAIL step 3). Option (b), treating stderr output as failure, would also fire on harmless PowerShell warnings and blank every icon. With (a) a failed attach, a COM error or an Outlook error ends the script with exit code 1, which step 5 logs as one line. A partial read is never applied: an error on one folder fails the whole read, because a partial state would show wrong icons for the other Actors. Measured through the same Node `execFile` call as the code, with an unregistered ProgID: the current script exits 0 with stdout `[]`; with the line it exits 1 with empty stdout and the error on stderr; the success path with a stub object exits 0 with the expected JSON. Dev applies the line in `READ_SCRIPT` after this commit.
- D-L2-8: Process form as in the code, now stated in SPEC_ACTOR_MAIL step 3: `powershell` with `['-NoProfile', '-Command', READ_SCRIPT]` and `{ timeout: 10_000, windowsHide: true }`. The script is not passed with `-EncodedCommand`: READ_SCRIPT is a constant and no dynamic value reaches the script text, so the quoting question does not arise (VE check, CM request). `windowsHide` stays in the spec because it keeps a console window from appearing at each periodic scan.
- D-L2-9: QM Round 1 finding 2 (PM decision 2): a change of `jarvis.outlook.enabled` triggers a read (SPEC_ACTOR_MAIL AC-3). With `false` the read starts no process, empties the set and refreshes the tree at once, as REQ_ACTOR_MAIL AC-11 requires. The trigger is a configuration listener in `extension.ts` that calls `ActorMailState.requestRead()`; no other trigger is added. Spec wording corrected per QM Round 2 finding 4 (PM decision, 2026-10-20).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs (checked SPEC_REC_BUTTON, SPEC_REC_SESSION, SPEC_ENG_API, SPEC_OLK_COMBRIDGE)
- [x] All new SPECs link to Requirements (SPEC_ACTOR_MAIL links REQ_ACTOR_MAIL)

---

## Final Consistency Check

**Status**: ✅ passed (traceability); VE conformance re-verified at `2168e2a` (`6c566f5`)

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_ACTOR_MAIL | REQ_ACTOR_MAIL | SPEC_ACTOR_MAIL | ✅ |
| US_ACTOR_ACTIVITY | REQ_ACTOR_ACTIVITY | SPEC_ACTOR_ACTIVITY | ✅ |
| US_ACTOR_TREE | REQ_ACTOR_TREE; REQ_CFG_SCANINTERVAL; REQ_EXP_REACTIVECACHE | SPEC_ACTOR_TREE; SPEC_ACTOR_SCANNER | ✅ |
| US_REC_CAPTURE | REQ_ENG_ACTORMARK; REQ_ENG_CONTRACT; REQ_REC_BUTTON | SPEC_ENG_ACTORMARK; SPEC_ENG_API; SPEC_REC_BUTTON | ✅ |
| US_REC_ENABLE | REQ_REC_BUTTON | SPEC_REC_BUTTON; SPEC_REC_SESSION | ✅ |
| US_OLK_COMBRIDGE (via REQ_OLK_ENABLE) | REQ_OLK_ENABLE | SPEC_OLK_SETTINGS; SPEC_OLK_COMBRIDGE | ✅ |

Chains are checked on the documents (story, requirement and design link present). AC-level conformance of code and spec was re-verified by the Verify Engineer at `2168e2a` (report `6c566f5`).

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

For each removed artefact, run a project-wide grep on all plausible name variants and classify results:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| Test title `starts no read on its own: no timer and no Outlook event (T-20)` | none (renamed in `7d63b19`; no remaining reference in source or protocol) | none | 0 |

No file, field, configuration key or REQ-ID is removed by this CR. The `markActor` comment and the AC-2 replace wording changed, which is a rewrite and not a removal; the only remaining mention of "replace semantics" is in D-L1-9 of this document, which describes the test change.

- [x] All class (a) active code/workflow references fixed in this CR (none to fix)
- [x] All class (b) active documentation references fixed in this CR (none to fix)
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above (none)

### Issues Found

Verify Engineer verdict on code `6e7d5de`: PARTIAL (report `docs/changes/val-actor-tree-mail-marker.md`, commit `43cc863`).
Passed: `tsc` exit 0; vitest 61 files / 635 tests; eslint 0 errors (30 pre-existing warnings); strict Sphinx exit 0.

- [x] F-1 (Medium, owner SD, then Dev): a failed Outlook COM call is not logged with the script as written in SPEC_ACTOR_MAIL step 3; `log.warn` is never called (REQ_ACTOR_MAIL AC-10, protocol T-10). Closed: SD remedy `$ErrorActionPreference = 'Stop'` (`586706f`, `ee3661d`, D-L2-7, D-L2-8); Dev code and tests `4743b86`.
- [x] F-2 (Medium, owner Dev and TD): no automated tests for T-15, T-16, T-21; T-18 covers the non-Windows branch only; T-19 does not assert that no process starts; T-20 untested. Three mutants survive: `outlook.enabled` guard removed; case-insensitive name match; script reads another folder. Fix commits: `d32b265`, `4743b86`, `7d63b19` (tests); `4d5fbb0`, `e9f4189` (protocol). Closed: Verify Engineer re-verification at `24ebfb6` PASS (mutants T-15, T-16, T-19 caught).
- [x] F-3 (Low, owner TD): Evidence lines for T-15..T-21 still say "Not yet written". Closed by TD `7aa4ced`: Evidence cites the `d32b265` test titles; statuses stay NOT RUN.
- [x] F-4 (Medium, owner Dev; part of F-2): Verify Engineer re-verification at `e4d6164` found a surviving mutant (R-1): a timer started at construction is not caught. The T-20 test `starts no read while the clock advances without a scan (T-20)` installed fake timers after `setup()`. Fix `7e72794`: fake timers installed before `setup()`. Dev then found a timer started inside `_read` also survived; fix `c566838`: new test, caught by that mutant. Its title was renamed in `1866e4b` to `starts no timer from a completed read (T-20)`, because its body never holds a read in flight (synchronous mock); body unchanged. TD re-cites the title in `6aa003a`. Closed: Verify Engineer PASS at `24ebfb6`.
- [x] F-5 (Low, owner Dev with TD): Verify Engineer found a surviving mutant (R-2): `shell: true` added to the `execFile` options is not caught; SPEC_ACTOR_MAIL step 3 says no shell. Fix `7e72794`: new test `passes execFile no shell option (SPEC_ACTOR_MAIL step 3)`, caught by that mutant. Closed: Verify Engineer PASS at `24ebfb6`.
- [x] QM Round 1 finding 1 (Medium, reads dropped during a run; fix now): coalesce instead of drop. Spec `c4de06e` (SPEC_ACTOR_MAIL step 1 and AC-3); code `834b0f6` (`_pending` coalesce in `actorMail.ts`); tests `ae8da71` (T-20 coalesce test replaces the drop test), `2aeef3f` and `2168e2a` (protocol). Verify Engineer mutant (drop guard restored) caught by T-20. Closed per PM decision (2026-10-20); QM confirmed at `ece06bc`.
- [x] QM Round 1 finding 2 (Medium, no re-read on `jarvis.outlook.enabled` change; fix now): spec `4c3580b` (SPEC_ACTOR_MAIL AC-3 trigger, D-L2-9); code `834b0f6` (listener on `jarvis.outlook.enabled` in `extension.ts` calls `requestRead()`); test T-22 in `ae8da71` and `c3be2d5`. Closed per PM decision (2026-10-20); QM confirmed at `ece06bc`. Residual risk (Verify Engineer), NOT ACCEPTED by PM and open for the user as a merge gate: the listener call has no automated test. A removed call passes all automated tests (mutant survived); covered by code reading until the manual run of T-12 (NOT RUN).
- [x] QM Round 1 finding 3 (Low, three statuses set to `draft` without a decision; fix now): `d38141b` restores REQ_ENG_ACTORMARK `implemented` and REQ_EXP_REACTIVECACHE `approved`; `69a4908` restores REQ_REC_BUTTON `approved` (index-based, one line from HEAD blob `be3973427245f453ac878e3ef6440e299d4bb87b`). The working-tree copy of `docs/requirements/req_rec.rst` is foreign and untouched. Closed per PM decision (2026-10-20); QM confirmed at `ece06bc`.
- [x] Round 1 re-verification by Verify Engineer at HEAD `2168e2a` (report `6c566f5`, PASS for automated scope): tsc exit 0; vitest 61 files / 652 tests passed; actor-mail, actor-mark, actor-touchedfiles-ambiguity 42 of 42; eslint 0 errors; strict Sphinx exit 0; bare LF 0. Manual UAT rows NOT RUN. QM re-review of findings 1 to 3 closed at `ece06bc`.

PM decision (2026-10-19): all three findings **fix now before merge**. Rationale: each finding is a defect against an acceptance criterion or a protocol case, and merge is the last point at which they are cheap to fix. Re-verification by Verify Engineer is required before QM is notified.

Accepted without automated test (PM decision, 2026-10-19): the set-change path of `onChange` (non-empty set drawn) has no automated test. Premise restated (PM, 2026-10-19): the mocked test `fires onChange only when the drawn set changes (T-20)` covers the change rule only; the live Outlook read for a non-empty set stays manual. The manual UAT run of the non-empty set (T-2..T-6, T-10..T-12, all NOT RUN) must be executed and recorded in `tst-actor-tree-mail-marker` before merge; that run is part of the user's validation.

Foreign state (not this CR): `docs/design/spec_kan.rst`, `docs/requirements/req_kan.rst`, `docs/requirements/req_rec.rst` are modified and uncommitted in the shared tree. Not owned by this CR; nobody commits them on this branch until the owner is known (PM asking the user).

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved (not ticked: setting-name drift `jarvis.outlookEnabled` in REQ_OLK_ENABLE and SPEC_OLK_SETTINGS stays open, deferred by PM, D-L1-8)
- [x] Traceability verified (Final Consistency Check at `e4d6164`; VE re-verification at `24ebfb6`)
- [x] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-10-19
**Scope:** CM request of 2026-10-19T22:48:02Z; HEAD `4c51bd5` (code files as at `24ebfb6`; later commits are documents only)
**Verdict:** FINDINGS (2 Medium, 1 Low). Not cleared.

**Checks run by QM:**

- `node node_modules\vitest\vitest.mjs run src/tests/actor-mail.test.ts src/tests/actor-mark.test.ts src/tests/actor-touchedfiles-ambiguity.test.ts`: 3 files, 41 of 41 passed.
- `npx tsc -p packages/core --noEmit`: exit 0.
- Strict Sphinx build (`-E -a -W --keep-going`, output to a temporary folder): exit 0.
- Code read against `SPEC_ACTOR_MAIL`, `SPEC_ACTOR_SCANNER`, `SPEC_ACTOR_TREE`, `SPEC_ENG_ACTORMARK`, `REQ_ACTOR_MAIL` AC-1 to AC-12 and `REQ_ENG_ACTORMARK` AC-2 and AC-3. Conforming: AC-1 to AC-4 (exact case-sensitive name, direct Inbox children only, unread greater than zero, ambiguous adds nothing), AC-6 and AC-7 (priority and stacked marks), AC-8 and AC-9 (read-only, attach only), AC-10 (log line, 10 s timeout, no user message), AC-12 (no other node change). Test titles cited in the Test Protocol T-20 match the test file.
- Not reviewed: the uncommitted working-tree edits to `docs/design/spec_kan.rst`, `docs/requirements/req_kan.rst` and `docs/requirements/req_rec.rst` (not part of this change). The committed edits to `req_rec.rst` in `09bac1a` are reviewed under finding 3.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L1 and L2 (code conformance) | REQ_ACTOR_MAIL AC-5; SPEC_ACTOR_MAIL step 1 and AC-3 | A completed scan that arrives while a read is running is dropped (`_running` guard in `_read`, `packages/core/src/engine/actors/actorMail.ts`). REQ_ACTOR_MAIL AC-5 says the state SHALL be read after every completed scan. SPEC_ACTOR_MAIL AC-3 says a read starts after every completed scan and after no other trigger. Step 1 and D-L2-3 describe the drop, and the test "drops a trigger that arrives during a run (T-20)" asserts it, so the requirement and the design text contradict each other. The Verify Engineer took the drop as conforming. Effect: a mail change that a scan sees during a read is shown only at the next scan: 2 minutes by default, or only at a manual rescan when `jarvis.scanInterval` is 0. | Medium |
| 2 | L1, L2 and code | REQ_ACTOR_MAIL AC-11; SPEC_ACTOR_MAIL step 1 and AC-4 | Switching `jarvis.outlook.enabled` to `false` does not clear the mail icons. The only configuration listeners in `packages/core/src/extension.ts` (around line 1282) handle `jarvis.scanInterval` and `jarvis.actors.folder`. The icons stay until the next completed scan. Switching to `true` shows no icon until that scan as well. AC-11 says no mail icon SHALL be shown while the setting is `false`. A fix adds a trigger that SPEC_ACTOR_MAIL AC-3 excludes ("no other trigger"), so the spec and the code must change together. | Medium |
| 3 | L1 (status and traceability) | REQ_ENG_ACTORMARK, REQ_EXP_REACTIVECACHE, REQ_REC_BUTTON | Commit `09bac1a` (SD) set three requirements to `draft`: REQ_ENG_ACTORMARK (from `implemented`), REQ_EXP_REACTIVECACHE (from `approved`) and REQ_REC_BUTTON (from `approved`). The Change Document lists them as "modified" only, and the Verify Engineer's list of draft elements at `e26ba2b` names none of them. The text changes are consistent with the code; the status change is not recorded as a decision (D-L1-7 says approval is the PM's). | Low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix now | Option (a): coalesce one pending re-read after the running read, so a scan completing during a read is not dropped. Meets REQ_ACTOR_MAIL AC-5 as written. The drop test (T-20) is replaced by a coalesce test. Rationale: the requirement is the authority; the drop is a defect. |
| 2 | 2 | fix now | Option (a): re-read on a change of `jarvis.outlook.enabled`, and amend SPEC_ACTOR_MAIL AC-3 to list that trigger together with the code. Meets REQ_ACTOR_MAIL AC-11 as written. Rationale: the requirement is the authority; the spec and the code change together. |
| 3 | 3 | fix now | Restore the statuses before `09bac1a`: REQ_ENG_ACTORMARK `implemented` and REQ_EXP_REACTIVECACHE `approved` restored in `d38141b`; REQ_REC_BUTTON `approved` restored in `69a4908`. The text changes stay. A `draft` status is a PM approval decision (D-L1-7) and was not recorded; the user may set `draft` later on purpose. Blocker for REQ_REC_BUTTON: the committed status at HEAD was `draft` (`3bdb05a`), and the working-tree `docs/requirements/req_rec.rst` is a stale, uncommitted copy with status `approved` that is not part of this change. PM decision (2026-10-19): SD stages only the status line from a blob built on HEAD and commits the index with no path argument. The working-tree copy stays dirty and untouched. |

#### Accepted, not re-opened by QM

- Manual UAT T-2 to T-6 and T-10 to T-12 NOT RUN (PM decision, 2026-10-19).
- Naming drift `jarvis.outlookEnabled` in REQ_OLK_ENABLE and SPEC_OLK_SETTINGS (D-L1-8, deferred by PM).
- D-L2-8 process form (`-Command` without `-EncodedCommand`): checked, no dynamic value reaches the script text.

---

### Round 2

**Reviewed by:** QM
**Review date:** 2026-10-20
**Scope:** re-review of Round 1 findings 1 to 3 at the CM request (fixes: findings 1 and 2 in `834b0f6`, `ae8da71`, `2aeef3f`, `c3be2d5`, `2168e2a`; finding 3 in `d38141b`, `69a4908`); HEAD `27829f3` (no code change since `2168e2a`; `6c566f5`, `863eaac` and `27829f3` are documents only)
**Verdict:** Round 1 findings 1, 2 and 3 are resolved in code and HEAD. Round 2 findings 4 and 5 are open (documentation only). Not cleared until PM decides findings 4 and 5.

**Checks run by QM at 27829f3:**

- `node node_modules\vitest\vitest.mjs run src/tests/actor-mail.test.ts src/tests/actor-mark.test.ts src/tests/actor-touchedfiles-ambiguity.test.ts`: 3 files, 42 of 42 passed (41 at Round 1; the added test is T-22).
- `npx tsc -p packages/core --noEmit`: exit 0.
- Strict Sphinx build (`-E -a -W --keep-going`, output to a temporary folder): exit 0.
- Listener wiring read independently: `packages/core/src/extension.ts` line 1287 calls `actorMail.requestRead()` when `jarvis.outlook.enabled` changes. The call is inside `activate` (lines 46 to 1293) and uses the same `ActorMailState` instance that the tree provider receives (line 376). With the setting `false`, `_readOnce` empties the set without starting a process, so the icons clear at once (REQ_ACTOR_MAIL AC-11). With `true`, a read follows.
- Statuses at HEAD: REQ_ENG_ACTORMARK `implemented`, REQ_EXP_REACTIVECACHE `approved`, REQ_REC_BUTTON `approved`. These are the values before `09bac1a`.
- Not reviewed: the uncommitted working-tree edits to `docs/design/spec_kan.rst`, `docs/requirements/req_kan.rst` and `docs/requirements/req_rec.rst` (not part of this change).

#### Findings

| # | Level | Element ID | Finding | Severity | Status |
|---|-------|------------|---------|----------|--------|
| 1 (R1) | L1 and L2 (code conformance) | REQ_ACTOR_MAIL AC-5; SPEC_ACTOR_MAIL step 1 and AC-3 | Coalescing is in place. A scan during a run sets `_pending`, and one re-read runs after the running read. The Read paragraph of SPEC_ACTOR_MAIL states it, and test "coalesces scans during a run into one re-read after it (T-20)" asserts it. | Medium | Resolved at 27829f3 |
| 2 (R1) | L1, L2 and code | REQ_ACTOR_MAIL AC-11; SPEC_ACTOR_MAIL AC-3 | The listener at `extension.ts` line 1287 calls `requestRead()`; AC-11 holds at once for `false`. Residual risk: no automated test covers the listener (the mutant at line 1287 survived at `2168e2a`), so it is verified by reading and by manual T-12, NOT RUN. | Medium | Resolved in code; residual risk accepted by PM decision still open |
| 3 (R1) | L1 (status and traceability) | REQ_ENG_ACTORMARK, REQ_EXP_REACTIVECACHE, REQ_REC_BUTTON | Statuses restored to the pre-change values by `d38141b` and `69a4908`. The CD rows still say "modified"; the net status change is none. | Low | Resolved at 27829f3 |
| 4 (R2) | L2 (spec text vs code) | SPEC_ACTOR_MAIL, Trigger paragraph | The Trigger paragraph says the constructor of `ActorMailState` subscribes to `vscode.workspace.onDidChangeConfiguration` for `jarvis.outlook.enabled` (AC-3). The code has no such subscription; the listener is in `extension.ts`. The behaviour is correct, but the spec names the wrong place. Remedy: SD amends the Trigger paragraph to name the `extension.ts` listener, or moves the listener (and then CD and T-22 change with it). | Low | Open |
| 5 (R2) | L1 (requirement text vs code) | REQ_ACTOR_MAIL AC-5 | AC-5 says "Between two scans the icon SHALL NOT change". A change of `jarvis.outlook.enabled` now changes the icons between scans, as AC-11 requires. AC-5 does not name that exception. Remedy: PM decides the wording; the exception is the setting-change read only. | Low | Open |

#### Observations (no action required)

- A scan that completes during a run shares the one pending re-read with other scans of that run, so it gets no read of its own. SPEC_ACTOR_MAIL states this. QM treats it as conforming to the spec; PM may want REQ_ACTOR_MAIL AC-5 to state the same.
- Manual UAT rows T-2 to T-6, T-10 to T-12 and T-22 (a setting change in a running VS Code) are NOT RUN. Until T-12 runs, the listener at line 1287 is covered by reading only.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 (R1) | close proposed by QM; PM accepts once findings 4 and 5 are committed and the QM re-check passes | Resolved at 27829f3. PM decision (2026-10-20). |
| 2 | 2 (R1) | close proposed by QM; PM accepts once findings 4 and 5 are committed and the QM re-check passes. Residual risk NOT ACCEPTED: open for the user | Listener at `extension.ts` line 1287 has no automated test (mutant survived); covered by reading and manual T-12 (NOT RUN). Merge gate; the user decides it together with the OK to merge (PM decision, 2026-10-20). |
| 3 | 3 (R1) | close proposed by QM; PM accepts once findings 4 and 5 are committed and the QM re-check passes | Statuses are back to the pre-change values. PM decision (2026-10-20). |
| 4 | 4 (R2) | fix now (SD), done in `3ab3942` | Amend the SPEC_ACTOR_MAIL Trigger paragraph to name the `extension.ts` listener. The listener sits next to the scanInterval and actors.folder listeners; the code is the source of truth; moving it is a larger change for no gain (PM decision, 2026-10-20). |
| 5 | 5 (R2) | fix now (SD), done in `9763e23`, reworded in `605b3cd`, `(AC-11)` reference removed in `ebc88b2`, full stop after the trigger in `191654a` | Amend REQ_ACTOR_MAIL AC-5 to state that a read triggered by a `jarvis.outlook.enabled` change is the one permitted icon change between scans, mirroring AC-11. Requirement and code must agree; the text is the cheap side (PM decision, 2026-10-20). AC-5 names the trigger directly (PM decision, 2026-10-20). The colon was replaced by a full stop so the general constraint is not read as part of the exception (PM decision, 2026-10-20, QM observation). |

---

## Appendix: Link Discovery Results

```
Impact query on feature/actor-tree-mail-marker (docs/_build rebuilt by a strict Sphinx run first):
  get_need_links.py SPEC_ENG_ACTORMARK --depth 2 --direction both
  get_need_links.py SPEC_ACTOR_ACTIVITY --depth 2 --direction both
  get_need_links.py REQ_REC_BUTTON --depth 2 --direction both

SPEC_ENG_ACTORMARK -> REQ_ENG_ACTORMARK -> REQ_ACTOR_ACTIVITY, REQ_ACTOR_TREE, REQ_ENG_CONTRACT, US_REC_CAPTURE
  <- REQ_REC_BUTTON, SPEC_ENG_API, SPEC_REC_BUTTON; -> SPEC_ACTOR_ACTIVITY; -> SPEC_ACTOR_TREE
SPEC_ACTOR_ACTIVITY -> REQ_ACTOR_ACTIVITY -> REQ_ACTOR_SCHEMA, REQ_ACTOR_TREE, REQ_HOOK_INTAKE, REQ_HOOK_ROUTE, US_ACTOR_ACTIVITY
  -> SPEC_ACTOR_SCANNER (REQ_CFG_SCANINTERVAL, REQ_EXP_REACTIVECACHE, ...); -> SPEC_HOOK_INTAKE, SPEC_HOOK_ROUTE
  <- REQ_ENG_ACTORMARK, REQ_REC_BUTTON, SPEC_ACTOR_TREE, SPEC_ENG_ACTORMARK
REQ_REC_BUTTON -> REQ_ACTOR_ACTIVITY, REQ_ENG_ACTORMARK, REQ_REC_LIVEVIEW, US_REC_CAPTURE, US_REC_ENABLE
  <- SPEC_REC_BUTTON, SPEC_REC_LIVEVIEW, SPEC_REC_SESSION

Beyond the Research list (found by the query): SPEC_ACTOR_SCANNER, SPEC_ENG_API, SPEC_OLK_SETTINGS, REQ_EXP_REACTIVECACHE, REQ_CFG_SCANINTERVAL.
```

---

*Generated by syspilot Change Agent*
