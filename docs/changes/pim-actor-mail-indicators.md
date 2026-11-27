# Change Contract: pim-actor-mail-indicators

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-27<br>
- **Operation Mode**: autonomous

- **autonomous** - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-27 | 18:42 CET | Project Manager | Architect | User approved Contract release at 18:42 CET. The unread indicator moves to PIM first, then pending follow-up flags are added; both steps are independently verified. |
| 2026-11-27 | 18:55 CET | Architect | Admin | Specification complete; the Core-PIM boundary is two additive API members and a PIM-owned reader, the "provider" of the Contract is read as the Outlook integration, and open points for Developer and Quality are listed in my section. |
| 2026-11-27 | 18:57 CET | Admin | Developer | No infrastructure change needed; checks in my section. Compile Core before PIM, since PIM reads the two new API members from Core's built types. |
| 2026-11-27 | 19:30 CET | Developer | Technical Writer | Core indicator and PIM mail reader implemented, 19 Needs set to implemented, suite green. Flag match and lookup cost on large folders are unverified against real Outlook. |
| 2026-11-27 | 20:10 CET | Technical Writer | Tester | PIM guide and README describe the flag and mail icons (new section 'Mail indicators on Actors'); Core guide, Core README and root README now name the flag and mail icons as coming from PIM; strict docs build passes. The behaviour text follows the Needs, not a run against Outlook. Test design row is yours; the PM row above carries a stray |---| that breaks the table. |
| 2026-11-27 | 20:40 CET | Tester | Developer | Test design complete. Defect: `READ_SCRIPT` never matches a candidate name in Windows PowerShell 5.1 (`@(ConvertFrom-Json ...)` nests the array), so no flag lookup runs; 3 tests in `pim-actor-mail-indicators.test.ts` fail until fixed. Stray `\|---\|` in the PM row removed. |
| 2026-11-27 | 20:55 CET | Developer | Quality | Fixed READ_SCRIPT: names array is unrolled with `ForEach-Object { $_ }` (checked in Windows PowerShell 5.1: 2 names, `-ccontains` true). Full suite 78 files, 911 tests pass. |
| 2026-11-27 | 21:20 CET | Quality | Project Manager | `proceed` at 16233cb7: suite 911 pass, seven VSIX clean, READ_SCRIPT fix confirmed by mutation. Live flag match and lookup cost on large folders unverified (no flagged item in the probe mailbox); both are User Validation items. Name `US_ACTOR_MAIL`, `US_ACTOR_ACTIVITY`, `AC_ACTOR_MAIL_*` there. |
| 2026-11-27 | 20:21 CET | Project Manager | Developer | User validation found no Outlook mail indicators, though chat activity was visible. User also requested grouping the Outlook settings under Jarvis PIM. Reverify before returning for live validation. |
| 2026-11-27 | 20:30 CET | Developer | Technical Writer | Cause of the missing indicators: PIM activated only on `onView:jarvisCategories`; added `onStartupFinished` (AC-19). Settings group retitled "Jarvis PIM" per Architect 972031ce; 7 Needs set to implemented, suite 911 pass. User docs naming the "Outlook" group need the new title. Not checked in a live EDH. |
| 2026-11-27 | 21:50 CET | Technical Writer | Quality | No user document named the Outlook settings group; pim.md and the PIM README now say the settings are listed under Jarvis PIM and that PIM starts with VS Code, so the icons need no opened view. Strict docs build passes. The earlier proceed predates the activation and group changes, so Quality review is open again. |
| 2026-11-27 | 20:50 CET | Quality | Tester | `blocked` at 1db34796: suite, compile, lint, docs pass, but AC-19 (PIM activates on startup) has no test; see Open Findings. Needs check also lists AC-5/AC-6 for the Needs User validation names (Project Manager at closure). |
| 2026-11-27 | 21:05 CET | Tester | Quality | Added the AC-19 / SPEC_ACTOR_MAIL AC-13 test (`onStartupFinished` in PIM `activationEvents`) to `pim-actor-mail-indicators.test.ts`; it fails with the entry removed and passes with it. |
| 2026-11-27 | 20:58 CET | Quality | Project Manager | `proceed` at 2ed972b9: AC-19 test confirmed by mutation, suite 912 pass, seven VSIX clean with `onStartupFinished` in the PIM manifest. Live flag match, lookup cost and indicator check in the EDH remain User Validation. AC-5/AC-6 Needs-check hits are yours at closure. |
| 2026-11-27 | 20:43 CET | Project Manager | Developer | User retest still showed neither mail indicator, but PIM loaded Outlook categories. The latest EDH PIM log shows activation and no mail warnings; it does not report successful reads or empty matches. |
| 2026-11-27 | 21:10 CET | Developer | Quality | Live read-only probe (counts only): Outlook attaches; the default Inbox of both stores has 0 subfolders, and no folder at depth 1-4 of either store is named like any of the 9 Actor folders here. So the read is a genuine empty match; the code path itself works. Added one `[Mail] read: candidates= inboxFolders= indicators= (flag=)` info line (written on change, counts only) so the next EDH log separates the cases. User must name or create Actor-named folders directly under the Inbox of the default store. Suite 912 pass. |
| 2026-11-27 | 21:10 CET | Quality | Project Manager | `proceed` at 8aad7e5f: counts-only `[Mail]` log lines added, suite 912 pass. Developer's probe found no Actor-named folder directly under the default Inbox, so the missing indicators are an empty match; the User must place Actor-named folders directly under the Inbox, or the Architect widens the spec. Live indicator check remains User Validation. |
| 2026-11-27 | 20:46 CET | Project Manager | Developer | The User requested opt-in diagnostics in the existing Jarvis PIM log. Refine successful/skipped read diagnostics to Debug with aggregate counts and elapsed time; failures remain warnings. Folder scope is unchanged. |
| 2026-11-27 | 21:30 CET | Developer | Quality | The `[Mail] read:` line moved from Info to Debug (the channel's log level is the opt-in; no new setting) and now carries candidates, inboxFolders, matched, indicators, flag and elapsed ms; skip reasons also at Debug; failures stay at Warn; no names or content. 2 tests added, suite 914 pass. Re-review needed. |
| 2026-11-27 | 21:30 CET | Quality | Project Manager | `proceed` at 17c768b8: diagnostics at Debug with elapsed time, counts only, 914 tests pass, mutation confirms the tests pin the level. Live check stays User Validation. |
| 2026-11-27 | 20:54 CET | Project Manager | Developer | Read-only Outlook probe reproduced a false negative: one unread mail had `IsMarkedAsTask` and MAPI flag status `2`, but the production `GetTable` filter returned no rows. The probed folder itself is outside the configured Inbox scope. Diagnose the flag lookup without widening folder scope. |
| 2026-11-27 | 22:00 CET | Developer | Architect | Live probe: `[FlagStatus] = 2` matches nothing on the store while `>= 2` matches the real flags exactly; READ_SCRIPT changed to `>= 2`. Spec text `= 2` (spec_pim.rst read step and snippet) needs your update; then the Tester's fake-Outlook test (3 fail on the old string) follows the spec. Counts only, no names or content. |
| 2026-11-27 | 22:10 CET | Architect | Tester | SPEC_ACTOR_MAIL now states the filter `[FlagStatus] >= 2` (read step 4, snippet, new AC-14). Your fake-Outlook test filter-string check must follow it; 3 tests fail on `= 2` until then. Lookup cost above 3000 items stays untimed. |
| 2026-11-27 | 22:20 CET | Tester | Quality | Fake-Outlook filter check follows AC-14 (`[FlagStatus] >= 2`); 23/23 pass, and reverting the script to `= 2` fails 3 tests. Fake models the measured filter only, not Outlook's behaviour; the live match stays with User validation. |
| 2026-11-27 | 22:10 CET | Quality | Project Manager | `proceed` at 4bc4ac79: flag filter `>= 2` confirmed on the live Outlook (`= 2` matched 0 folders, `>= 2` 12; counts only), 914 tests pass, mutation back to `= 2` fails 3. Lookup cost on large folders and the indicators in the EDH remain User Validation. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** 2026-11-27 18:32 CET (scope; Contract release is a separate gate)

### Goal

Move Outlook mail status collection out of Core and into PIM. Show pending Outlook follow-up flags on Actor nodes ahead of unread mail so a read message that still requires action remains visible.

### Value

People who organize mail by Actor can see where a follow-up is pending. PIM owns the Outlook integration; Core renders Actor indicators without reading the mailbox itself.

### Scope

1. **Move without changing the existing behavior for PIM users.** PIM supplies the unread indicator for the existing same-named folders directly under the default Outlook Inbox. Preserve matching and ambiguity rules, refresh and cleanup behavior, and existing icon precedence. Without PIM, Core neither reads Outlook mail nor shows its indicators.
2. **Add follow-up visibility.** At least one actively flagged message in the mapped folder takes precedence over unread mail, whether the flagged message is read or unread. Completed follow-ups do not count as pending. Chat activity and recording keep their existing precedence over mail indicators. The existing Outlook opt-in governs the indicators.

Mailbox access for this feature remains read-only and attaches only to already running Outlook. Scope covers the Core–PIM boundary, directly affected specifications, verification, and user-facing documentation. Backlog: K81.

Initial impact discovery from `MOD_PIM` and `REQ_ACTOR_MAIL` points to the Actor mail story and design, tree and scan behavior, Outlook enablement, and the Core mark and Recorder priority contracts. The Architect determines the final specification impact and how PIM supplies status without reversing the Core–PIM dependency.

### Observable Outcome

- Step 1 is independently verified: with PIM and Outlook integration enabled, the existing unread indication and refresh behavior are preserved; Core alone performs no Outlook mail read. No duplicate or stale indicator remains after a provider is disabled or removed.
- Step 2 is independently verified: with both conditions present the flag wins; clearing or completing the last pending flag reveals unread mail if present, otherwise the mail indicator disappears. Chat activity and recording still take precedence. Check that the added lookup does not prevent timely unread updates in representative Outlook folders.
- After Quality verification, the User can validate in the Extension Development Host with existing Outlook mail. Evidence records only the observed indicators and transitions, not mailbox contents or real folder names.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-27 18:42 CET) |
| Version control | yes | Project Manager | Local branch `feature/pim-actor-mail-indicators` retained; squash-integrated into `development` at `35998eb7` | merged |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete (none affected) |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | proceed |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

New Needs are `approved`; changed Needs that were `implemented` are `approved` again, except `SPEC_ACTOR_SCANNER` (wording only). The three `*_ACTOR_MAIL` Needs keep their IDs and move into the PIM files.

| Artifact | Change | Rationale |
|---|---|---|
| `US_ACTOR_MAIL` (`us_actor.rst` to `us_pim.rst`) | modify, move | Retitled "Mail Indicators on Actor Nodes", tracked by `MOD_PIM`. AC-4, AC-5, AC-6, AC-7 amended for the flag; new AC-8 (pending flag wins over unread), AC-9 (transition), AC-10 (icons come with PIM). |
| `US_ACTOR_ACTIVITY` | modify | AC-4 names the mail and flag icons. |
| `REQ_ACTOR_MAIL` (`req_actor.rst` to `req_pim.rst`) | modify, move | AC-1..12 adapted to PIM as supplier; new AC-13 flag, AC-14 transition, AC-15 Core-PIM boundary, AC-16 cleanup, AC-17 flag lookup never delays unread, AC-18 names as data. |
| `REQ_ENG_ACTORINDICATOR` (`req_eng.rst`) | add | Core API `indicateActor`: a tier below node marks. |
| `REQ_ENG_ACTORLIST` | modify | AC-6 `onDidScanActors`. |
| `REQ_ENG_ACTORMARK` | modify | AC-2 refers to indicators instead of the unread-mail icon. |
| `REQ_OLK_ENABLE` | modify | AC-2 includes the mail read; AC-3 reload applies to the providers only, mail indicators follow the setting at once. |
| `REQ_EXP_REACTIVECACHE`, `REQ_COM_STATE`, `REQ_REC_BUTTON` | modify | Wording: indicator instead of unread-mail icon. |
| `SPEC_ACTOR_MAIL` (`spec_actor.rst` to `spec_pim.rst`) | rewrite, move | `ActorMailStatus` plus stateless `readActorMail` in PIM; script with `FlagStatus`, time budget, reconcile, cleanup, AC-1..12. |
| `SPEC_ENG_ACTORINDICATOR` (`spec_eng.rst`) | add | `indicate()` in `ActorTreeProvider`, wiring of both API members, removal of `ActorMailState` from Core. |
| `SPEC_ENG_API`, `SPEC_ENG_ACTORLIST`, `SPEC_ENG_ACTORMARK` | modify | Interface members `indicateActor` and `onDidScanActors`; AC-12, AC-5, AC-2/3. |
| `SPEC_ACTOR_TREE`, `SPEC_ACTOR_SCANNER`, `SPEC_COM_STATE` | modify | Render order with the indicator tier; scan event wording; scanner links `SPEC_ENG_ACTORINDICATOR` instead of `SPEC_ACTOR_MAIL`. |
| `SPEC_MOD_PIM_PKG`, `SPEC_OLK_SETTINGS` | modify | PIM may use `listActors`, `onDidScanActors`, `indicateActor`; mail indicators are the exception to the reload rule. |
| `MOD_PIM`, `MOD_ACTOR` | modify | Module text names the mail indicators and the indicator tier. |
| `AC_ACTOR_MAIL_FLAG_JOURNEY` (`ac_actor_mail.rst`) | add | Flag set, still wins when unread appears, completion, periodic scan, clearing, and Core without PIM. Existing two journeys stay; file title and intro reworded. |

| Decision or check | Evidence |
|---|---|
| Boundary: Core exposes two additive `JarvisCoreApi` members (`indicateActor`, `onDidScanActors`; version stays 2). PIM uses only these and `listActors`, so the dependency does not reverse. Priority per node: activity, then marks (recording), then indicator. | `SPEC_ENG_ACTORINDICATOR`, `REQ_ENG_ACTORINDICATOR` AC-2 |
| "Provider" in the Contract scope is read as the Outlook integration of PIM; no new Strategy interface and no sub-toggle. `jarvis.outlook.enabled` governs and is read live. | `SPEC_ACTOR_MAIL`, `REQ_OLK_ENABLE` AC-3 |
| Flag semantics: pending is `FlagStatus` 2; completed (1) and none (0) do not count. Lookup `GetTable('[FlagStatus] >= 2')` needs only "at least one" and runs only for folders named like a unique Actor. | `SPEC_ACTOR_MAIL` Read step 4, AC-14 |
| Filter value: `= 2` returned nothing on the live store while `>= 2` matched the per-item ground truth, so the spec states `>= 2` as the measured filter. The cause of the `= 2` result is open; nobody has explained it. | Developer probe in the Contract's Implementation section (7010ce0c), counts only; `SPEC_ACTOR_MAIL` Read step 4 |
| Timeliness: unread is read for all folders first; flag lookups run in a 5 s budget inside the 10 s limit; a skipped or failed lookup counts as no flag and unread is still shown, one log line. | `REQ_ACTOR_MAIL` AC-17, `SPEC_ACTOR_MAIL` AC-9 |
| Actor names reach the script as data (for example an environment variable), never in script text. | `REQ_ACTOR_MAIL` AC-18 |
| Strict Sphinx build `python -m sphinx -W --keep-going -E -b html .` in `docs/`: no warning. `npx vitest run src/tests/acceptance-criteria-format.test.ts`: 5 passed. No `draft`, `open` or `deprecated` status in `docs/*.rst`. | run at the handover commit |
| Settled by the Developer's probe: a positive flag match on real flagged items with `>= 2`. Not covered: an end-to-end read in the Extension Development Host, which is User Validation. | Developer probe, see the row above |
| Open: the flag lookup cost on large folders is not measured. A single `GetTable` call cannot be interrupted, so the budget is checked between folders; the 10 s limit is the hard stop. | `SPEC_ACTOR_MAIL` Residual |
| Known limit: `scripts/check_contract_needs.py` flags `approved` Needs and changed stories not named in User Validation; the Project Manager names the changed stories (`US_ACTOR_MAIL`, `US_ACTOR_ACTIVITY`) and `AC_ACTOR_MAIL_*` there. | expected, not mine to fix |

**For the next owners.** Admin: no infrastructure change is expected from the specification; check the package build and test tooling for the new `packages/pim` files. Developer: remove `ActorMailState`, `MailLike` and the `jarvis.outlook.enabled` listener from Core, add `indicators` to `ActorTreeProvider` and wire the two API members; add `readActorMail` and `ActorMailStatus` in PIM and call `requestRead()` from the existing PIM setting handler. Tester: requirement tests trace to `REQ_ACTOR_MAIL` AC-1..18 and `REQ_ENG_ACTORINDICATOR`; the validation procedure is `AC_ACTOR_MAIL_FLAG_JOURNEY`. Technical Writer: user documents that describe the Actor mail icon now depend on PIM and gain the flag icon.

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Build: `packages/pim/build.js`, `packages/pim/tsconfig.json`, `.vscodeignore` | None. The bundle entry is `src/extension.ts`, so new files under `packages/pim/src` are bundled by esbuild and compiled by `tsc` without a list to extend. `.vscodeignore` excludes `src/**` and ships `out/**`, so the VSIX content rule is unchanged. | No edit. `npm run compile:packages` exits 0 at `fd031853`. |
| Build order Core before PIM | PIM takes `JarvisCoreApi` from `jarvis-core`, whose `types` is `packages/core/out/engine/index.d.ts`. The two new API members (`indicateActor`, `onDidScanActors`) reach PIM only after Core is compiled. Workspaces are `packages/*`, so `core` sorts before `pim` in `npm run compile:packages`, and `release.yml` runs `npm run compile` first. | No edit. The Developer must compile Core before type-checking PIM changes; a stale `packages/core/out` shows up as a missing member in PIM, not as a Core error. |
| Test tooling: `vitest.config.ts` | None. Tests live in `src/tests/**` and reach package code by relative import; the Core mail tests move to PIM's `readActorMail` and stay in `src/tests`. No new alias or runner. | No edit. `npx vitest run` 882 passed (77 files) at `fd031853`; `python -m unittest discover scripts` 24 OK; strict Sphinx build clean. |
| CI: `release.yml`, `docs.yml`, packaging | None. The change adds no package, secret or manifest dependency; PIM already depends on `enthali.jarvis-core`. | No edit. The clean-tree VSIX build is Quality's row. |
| Outlook script at run time | A new PowerShell read script runs on the user's machine, not in CI. Nothing in the repository tests it against a real flagged message (the Architect's open point). | Not an infrastructure change; verification belongs to Developer or Quality with a real Outlook, as the Contract already states. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Where the indicator lives in Core | `ActorTreeProvider.indicate()` next to `mark()`, sharing one private stack helper; `getTreeItem` precedence is error, waiting, working, mark, indicator. | Reuse `mark()` with a priority. | An indicator is the weakest tier and must never hide a mark or activity; a separate map keeps SPEC_ENG_ACTORINDICATOR AC-4. |
| Core-PIM boundary | `indicateActor` and `onDidScanActors` added to `JarvisCoreApi`; `version` stays 2. `ActorMailState`, `MailLike` and the `jarvis.outlook.enabled` listener removed from Core. | Bump the API version. | Both members are additive; PIM checks for them and logs one warning on an older Core. |
| Read trigger and coalescing | `ActorMailStatus` reads at activation, after every completed scan, and on `requestRead()` from the existing PIM setting handler; scans during a run collapse into one re-read. | Timer polling. | SPEC_ACTOR_MAIL: no other trigger; no timers. |
| Names reach PowerShell as data | `JARVIS_ACTOR_NAMES` environment variable holding JSON; `execFile` without `shell`. | Names interpolated in the script. | No quoting or injection surface (AC-10). |
| Flag lookup | `GetTable('[FlagStatus] >= 2')` per candidate folder, `-ccontains` on the name, 5 s stopwatch budget; a skipped lookup sets `checked:false`, keeps unread and logs one line. | Count flagged items via `Items`. | Fits the 10 s process limit (AC-9). |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/engine/actors/actorTreeProvider.ts`, `core/coreApi.ts`, `core/types.ts`, `extension.ts`, `actors/actorScanner.ts` | `indicate()`, two API members, Core mail code removed (`actors/actorMail.ts` deleted). | `npx vitest run` at the handover commit: 77 files, 889 tests passed. `npx tsc -p packages/core --noEmit` and `-p packages/pim`: clean. `npm run lint`: 0 errors. |
| `packages/pim/src/ActorMailStatus.ts`, `outlookIntegration/OutlookActorMail.ts`, `extension.ts` | New PIM reader and reconciler; setting handler calls `requestRead()`. | `src/tests/actor-mail.test.ts` (rewritten for PIM), `src/tests/actor-mark.test.ts` (migrated to `indicate()`). |
| `docs/**/*.rst` | 19 Needs set from `approved` to `implemented`. | `python scripts/check_contract_needs.py --contract docs/changes/pim-actor-mail-indicators.md` after the commit. |

**Flag filter, measured live (counts only):** on 8 mail folders holding 1-282 items with real pending flags (read per item through `PidTagFlagStatus` 0x10900003 as ground truth), `[FlagStatus] = 2` returned 0 in `GetTable` and `Items.Restrict`, as did the DASL form `= 2`; `= 0` and `<> 2` were correct. `> 1` and `>= 2` returned exactly the ground-truth count in every folder, in Jet and DASL, in `GetTable` and `Restrict`. `READ_SCRIPT` now uses `GetTable('[FlagStatus] >= 2')`. The spec text in `spec_pim.rst` (SPEC_ACTOR_MAIL read step, script snippet) and `src/tests/pim-actor-mail-indicators.test.ts` (fake Outlook, 3 tests, filter string check) still say `= 2` and fail until updated. **Still open:** the flag lookup cost on large folders (4 folders above 3000 items were not timed).

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Core reads no mail: `actorMail.ts` gone, no Outlook/mail-state code or `outlook.enabled` in Core; setting only in PIM; API `version` stays 2 | system | REQ_ACTOR_MAIL AC-15, REQ_ENG_ACTORINDICATOR | `src/tests/pim-actor-mail-indicators.test.ts` |
| PIM uses only `listActors`, `onDidScanActors`, `indicateActor`; `extension.ts` wires `requestRead` to `outlook.enabled`; `onStartupFinished` is in PIM `activationEvents` | system | REQ_ACTOR_MAIL AC-15, AC-19, SPEC_ACTOR_MAIL AC-12, AC-13 | same file |
| `JarvisEngine.indicateActor` delegation and throw when unwired; `onDidScanActors` fires per scan | system | REQ_ENG_ACTORINDICATOR, REQ_ENG_ACTORLIST AC-6 | same file |
| Journey over real engine, scanner and tree: flag, flag over unread, unread after completion, clearing, activity precedence, dispose | system | REQ_ACTOR_MAIL AC-1..18, AC_ACTOR_MAIL_FLAG_JOURNEY | same file |
| Real `READ_SCRIPT` in Windows PowerShell against a fake Outlook (accepts only the filter `[FlagStatus] >= 2`, SPEC_ACTOR_MAIL AC-14): candidate-only flag lookup, case-sensitive names, failing lookup keeps unread, 5 s budget, empty Inbox | system | SPEC_ACTOR_MAIL, REQ_ACTOR_MAIL AC-10, AC-18 | same file (skipped off Windows) |
| Needs moved to PIM files; flag journey validates `US_ACTOR_MAIL`; PIM and Core guides; no draft/open/deprecated Needs | system | US_ACTOR_MAIL | same file |
| Run `AC_ACTOR_MAIL_FLAG_JOURNEY` with real Outlook and a really flagged item; check lookup cost on a large folder | validation | US_ACTOR_MAIL | `docs/acceptance/ac_actor_mail.rst`, User validation |

**Method:** black-box from REQ/SPEC; Developer unit tests in `actor-mail.test.ts` and `actor-mark.test.ts` are not duplicated. **Defect found (3 tests fail):** `READ_SCRIPT` line `$wanted = @(ConvertFrom-Json $env:JARVIS_ACTOR_NAMES)` yields a nested array in Windows PowerShell 5.1 (`$wanted.Count` is 1, `$wanted[0]` is the array), so `$wanted -ccontains $r.name` is never true: no flag lookup ever runs and no flag icon can appear. Reproduced in `powershell` 5.1.26100; `ConvertFrom-Json ... | ForEach-Object { $_ }` unrolls it (`-ccontains` becomes true). The Developer's script tests are static and the reader test mocks `execFile`, so neither could see it.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/pim.md` | The guide never mentioned the mail icon. New section 'Mail indicators on Actors' from `US_ACTOR_MAIL` AC-1 to AC-10 and `REQ_ACTOR_MAIL`: folder of the Actor's name directly under the Inbox, exact case match, duplicate Actor names show nothing, flag icon (pending follow-up, read or unread) before mail icon (unread, no pending flag), one icon per node with activity, recording mark, flag, mail in that order, not live (PIM start, each ACTORS scan, change of `jarvis.outlook.enabled` without reload), read-only, never starts Outlook, silent when unreadable, needs PIM. Setting row for `jarvis.outlook.enabled` names the icons | this commit; `docs/build.ps1 -Clean` succeeded |
| `packages/pim/README.md` | Intro, feature bullet and setting row, same facts shortened | this commit |
| `docs/user guides/core.md`, `packages/core/README.md`, root `README.md` | They said the recording mark is followed by 'the mail icon' as if Core drew it; now: the follow-up flag and unread-mail icons that PIM adds (`REQ_ACTOR_MAIL` AC-15). Root README PIM feature list gains the mail indicators | this commit |
| Agents window remarks in Core guide and README ('ACTORS activity/mail markers do not work there') | none: still true | checked |
| `docs/releasenotes.md` | Release's. User-visible change worth a line: the mail icon is now supplied by PIM, so a Core-only installation no longer shows it; the flag icon is new | not edited |
| Rework after user validation (`b4529abc`, `ead9ebbd`) | PIM now activates on `onStartupFinished` (`REQ_ACTOR_MAIL` AC-19) and its settings group is titled 'Jarvis PIM'. No user document named the old 'Outlook' group. `pim.md` and `packages/pim/README.md` now say: settings are listed under Jarvis PIM (names still `jarvis.outlook.*`), and PIM starts once VS Code has finished starting, so the icons appear without opening a PIM view. This also corrects my first text, which said 'when the PIM extension starts' without saying when | this commit; `docs/build.ps1 -Clean` succeeded; not checked in a live Extension Development Host |

**Not verified by me:** the flag match and the lookup cost against a real Outlook (Developer's open point, Architect's open point). The text states the specified behaviour; if Quality or the User finds the flag filter does not match, the flag sentences in `pim.md` and the README must be corrected. I did not inspect the icon shapes beyond the codicon names `flag` and `mail` in `ActorMailStatus.ts`.
## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed` at 4bc4ac79 (earlier evidence at 2ed972b9 stands; the later delta moves the counts-only `[Mail]` diagnostics to Debug on the `Jarvis PIM` log channel, with elapsed time, no names or mail content, failures stay at Warn; two new tests in `actor-mail.test.ts`, and routing the line to Warn makes 9 of 32 tests there fail). The rework (`b4529abc`: PIM activates on `onStartupFinished`; `ead9ebbd`: settings group 'Jarvis PIM') is covered: the new AC-19 test fails when `onStartupFinished` is removed from `packages/pim/package.json` (1 of 23 fail, file restored) and passes with it. Earlier `proceed` evidence for the unchanged code stands (READ_SCRIPT fix confirmed by mutation). The flag filter changed to `[FlagStatus] >= 2` (`SPEC_PIM` AC-14) after the Developer and Tester measured that `= 2` matches nothing; I confirmed it read-only on the running Outlook (counts only): across two stores `= 2` matched 0 folders, `>= 2` and `> 1` each matched 12, and a per-item scan found a `FlagStatus` 2 item in 8 of those (folders over 3000 items were skipped, so 4 are unconfirmed); mutating the script back to `= 2` makes 3 of 23 tests fail. Not verified by me: why `= 2` matches nothing, and the flag lookup cost on large folders; the live indicator check in the Extension Development Host is User Validation. The Needs check lists AC-5 and AC-6 for the Needs User validation names; those are the Project Manager's closure steps.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Code read | `OutlookActorMail.ts`, `ActorMailStatus.ts`, Core `actorTreeProvider.ts` indicator tier, `coreApi.ts`, `types.ts`, PIM wiring | Diff `development...HEAD` read against the Needs and SPEC_ENG_ACTORINDICATOR | No finding | Static read; no live Extension Development Host |
| Mutation check | `READ_SCRIPT` unroll removed | `pim-actor-mail-indicators.test.ts`: 3 of 22 fail; file restored | Tests exercise the fixed defect | One mutation only |
| Live Outlook probe | Running Outlook, Inbox, Sent, Drafts; counts and timings only | `GetTable` and `Items.Restrict` with `[FlagStatus] = 2` return 0 on 89 items, 35 ms | No finding | No flagged item in the mailbox, no large folder; no mailbox content recorded |
| Needs check | `scripts/check_contract_needs.py` on the feature branch | Exit 1, only AC-4 for `US_ACTOR_ACTIVITY` and `US_ACTOR_MAIL` | Project Manager's naming step | none |
| Mutation check (rework) | `onStartupFinished` removed from PIM `package.json` | `pim-actor-mail-indicators.test.ts`: 1 of 23 fail; file restored | AC-19 test exercises the defect | One mutation only |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ 16233cb7 | pass: 78 files, 911 tests |
| Re-review run | `npx vitest run --testTimeout 15000`, `npm run compile:packages`, `npm run lint`, strict docs build, `python -m unittest discover scripts` @ 1db34796 | pass: 78 files, 911 tests; compile pass; 0 errors, 205 warnings; docs pass; OK. Delta to 16233cb7 in `packages`/`src`: `package.json` (`onStartupFinished`, group title), `README.md`, `pim-categories-default.test.ts` (title rename). Clean-tree VSIX build deferred to the re-review after the test exists.
| Full suite | `npx vitest run --testTimeout 15000` @ 2ed972b9 | pass: 78 files, 912 tests |
| Clean-tree VSIX build | detached worktree @ 2ed972b9, same steps as above | pass: seven VSIX built clean; PIM VSIX manifest: activationEvents `onStartupFinished`, `onView:jarvisCategories`, group 'Jarvis PIM', engine `^1.144.0` |
| Delta re-run | suite, `npm run compile:packages`, `npm run lint`, strict docs build @ 8aad7e5f; `git diff a2e8fa0f 8aad7e5f -- packages src` | pass: 912 tests; compile exit 0; 0 errors, 205 warnings; docs pass. Delta is 2 PIM source files only; no manifest or README change, so no new VSIX build. |
| Debug-level delta re-run | suite, `npm run compile:packages`, `npm run lint`, strict docs build @ 17c768b8; `git diff 6cf7b7cf 17c768b8 -- packages src` | pass: 914 tests; compile exit 0; 0 errors, 205 warnings; docs pass. `createOutputChannel('Jarvis PIM', { log: true })` provides `debug`. Delta is PIM source and tests only, so no new VSIX build. |
| Flag filter re-run and live probe | suite, `npm run compile:packages`, `npm run lint`, strict docs build @ 4bc4ac79; read-only Outlook probe of `GetTable` filters `= 2`, `>= 2`, `> 1` over all folders of both stores | pass: 914 tests; compile exit 0; 0 errors, 205 warnings; docs pass. Probe: `= 2` 0 folders, `>= 2` 12, `> 1` 12; per-item `FlagStatus` 2 confirmed in 8. Delta is the filter string, one SPEC and two tests, so no new VSIX build. | Mailbox contents and folder names not recorded; folders over 3000 items skipped in the per-item scan |
| Compile | `npm run compile:packages` @ 16233cb7 | pass |
| Lint | `npm run lint` @ 16233cb7 | 0 errors, 205 warnings |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ 16233cb7 | pass |
| Script tests | `python -m unittest discover scripts` @ 16233cb7 | OK |
| Clean-tree VSIX build | detached worktree @ 16233cb7: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` per package | pass: seven VSIX (core, core-gh, pim, recorder, mcp, flow, kanban) built clean |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Initial live EDH observation (`US_ACTOR_MAIL`, `US_ACTOR_ACTIVITY`) | Chat activity spinner was visible, but no unread or flag indicator appeared. The User requested grouping the Outlook settings under Jarvis PIM. | 2026-11-27 |
| Live EDH retest after startup rework (`US_ACTOR_MAIL`, `US_ACTOR_ACTIVITY`) | Chat activity was visible and PIM loaded Outlook categories, but neither mail indicator appeared. The live probe later showed that the folder was outside the supported Inbox scope and that the original flag filter missed a pending flag. | 2026-11-27 |
| Final live EDH retest (`US_ACTOR_MAIL`): a matching folder directly under the default Inbox had both unread mail and a pending flag | The flag appeared first. Clearing the flag in Outlook revealed the unread-mail icon, and the User accepted the result. Full acceptance journeys and large-folder timings were not reported as verified. | 2026-11-27 21:19 CET |

**Decision:** accepted

## Closure

**Owner:** Project Manager<br>
**Status:** closed

- [x] Every included artifact or gate has terminal status and completion evidence.
- [x] Intent and outcome are `approved`.
- [x] Quality has recorded `proceed`.
- [x] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [x] The feature branch is squash-integrated into `development`.
- [x] Current blocker is `none`.
- [x] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [x] Header Status is `closed`.

**Final outcome:** PIM owns the read-only Outlook lookup; Core renders the indicators. The User confirmed in the EDH that a pending flag takes precedence over unread mail and that clearing it reveals the unread icon. Integrated as `35998eb7` on `development`; Needs gate passed before integration. Statistics: `.syspilot/stats/pim-actor-mail-indicators-stat.md`.
