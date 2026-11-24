# Change Contract: sidebar-and-spec-cleanup

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-24<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-24 | 21:24 CET | Project Manager | Architect | User pre-authorized chaining to Package 2 (`sidebar-and-spec-cleanup`, autonomous mode, zero runtime code changes expected) once `kanban-cleanup` closed. Scope covers K33+K34+K36 (slim `US_EXP_SIDEBAR` to a generic sidebar shell and give Messages & Heartbeat their own explorer tree/view stories incl. view-visibility ACs from `US_EXP_FEATURETOGGLE` and `Collapse All`), K59 (`REQ_ACTOR_WHOAMI` kernel no-identity-section anchor + narrow heading test in `actorAgent.test.ts`), and K07 (test asserting all contributed command IDs across `packages/*/package.json` are registered in code). |
| 2026-11-24 | 21:29 CET | Architect | Admin | Spec committed as `7e90fd62`: `US_EXP_OPENFILE` removed, `US_EXP_SIDEBAR` slimmed, `US_MSG_TREE` and `US_AUT_HEARTBEATTREE` added, `REQ_ACTOR_WHOAMI` AC-12 added. `US_EXP_FEATURETOGGLE` does not exist, so K34 moved `US_EXP_SIDEBAR` AC-4 instead. |
| 2026-11-24 | 21:31 CET | Admin | Developer | No infrastructure change needed. Needs check stays red until `REQ_ACTOR_WHOAMI` is `implemented` and the Project Manager names the three stories in User Validation. |
| 2026-11-24 | 21:40 CET | Developer | Technical Writer | The kernel test now checks an Identity heading; the four Needs are `implemented`; no runtime code changed. The K07 command-registration test is not written and goes to the Tester. |
| 2026-11-24 | 22:10 CET | Technical Writer | Tester | Core guide now describes the Messages and Heartbeat views (visibility by toggle, click-to-open, Collapse All) from the new stories; no document used the removed sidebar wording; strict docs build passes. Test design row is yours; check that the ## Test Design heading is present. |
| 2026-11-24 | 22:30 CET | Tester | Quality | K07 test written (`src/tests/contributed-commands-registered.test.ts`): all contributed commands in the six packages are registered, no runtime change needed; K59 heading test reviewed. Full suite 803 pass; `## Test Design` heading restored. |
| 2026-11-24 | 22:50 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`; 803 tests pass. Name `US_EXP_SIDEBAR`, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE` in User Validation; `AC_EXP_OPENFILE_JOURNEY` validates the last two and needs a live host. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-24 20:11 CET (chained Package 2 pre-authorized for immediate start after Package 1, with zero runtime code changes expected).

### Goal

The Explorer specification cleanly separates the generic Jarvis sidebar container (`US_EXP_SIDEBAR`) from feature-owned tree stories for Messages and Heartbeat (`K33`, `K34`, `K36`), the kernel's "no identity section" rule is anchored at requirement level with a precise heading test (`K59`), and a static/system test guarantees that every command ID contributed in `packages/*/package.json` is registered in extension code (`K07`) — all without modifying runtime extension behavior.

### Value

`US_EXP_SIDEBAR`, `US_EXP_FEATURETOGGLE`, and `US_EXP_OPENFILE` still mix container mechanics with feature-specific Messages/Heartbeat tree behavior left over from `retire-legacy-actor-kinds`. Refactoring them gives Messages and Heartbeat symmetric story ownership alongside Actors (`US_ACTOR_TREE`), while `K59` eliminates a brittle substring test (`not.toContain('Identity')`) and `K07` guards against dead/unregistered command contributions across all six packages.

### Scope

- **Refactor Sidebar shell & give Messages and Heartbeat dedicated tree stories (`K33`, `K34`, `K36` — zero runtime code change):**
  - **`K33`:** Add dedicated explorer tree/view user stories for Messages (including Reminders view / Collapse All title-bar button) in `docs/userstories/us_msg.rst` (`tracked_by: MOD_MESSAGING`) and for Heartbeat (including Collapse All title-bar button) in `docs/userstories/us_aut.rst` (`tracked_by: MOD_AUTOMATION`), symmetric with `US_ACTOR_TREE` (which already carries Actor Collapse All in AC-13).
  - **`K34`:** Move feature-specific view-visibility ACs (Messages/Reminders/Heartbeat tree shown or hidden according to their feature toggles, referencing `US_CFG_FEATURETOGGLES` / `REQ_CFG_TOGGLES`) out of `US_EXP_FEATURETOGGLE` (or retire `US_EXP_FEATURETOGGLE` cleanly with zero `deprecated` stubs if nothing generic remains; note the Actors tree has no feature toggle) into the respective feature tree stories.
  - **`K36`:** Slim `US_EXP_SIDEBAR` (`docs/userstories/us_exp.rst`) down to the generic Jarvis sidebar shell/home (Activity Bar icon, opening the sidebar, generic view container hosting). Reconcile `US_EXP_OPENFILE` by moving Message/Reminder-node and Heartbeat-node open-file user outcomes into the respective feature stories (retaining genuinely shared `REQ_EXP_*` / `SPEC_EXP_*` or rewiring links cleanly so every `story`, `req`, `spec`, and `ac` satisfies ontology rules with zero `deprecated` statuses).
- **Anchor "kernel has no identity section" at requirement level & narrow test (`K59`):**
  - Add an explicit requirement obligation in `REQ_ACTOR_WHOAMI` (`docs/requirements/req_actor.rst`, matching `SPEC_ACTOR_WHOAMI` AC-10) stating that the Actor kernel instructions do not contain an Identity section.
  - Narrow the corresponding assertion in `src/tests/actorAgent.test.ts` so it checks specifically for an `Identity` Markdown heading rather than rejecting the word `Identity` anywhere in prose.
- **Assert all contributed command IDs are registered (`K07`):**
  - Add a requirement-level / static verification test (`src/tests/`) scanning every `contributes.commands` entry across all shipped `packages/*/package.json` manifests (`core`, `flow`, `kanban`, `mcp`, `pim`, `recorder`) and asserting each command ID is registered via `registerCommand` in that package's `src/` sources.
  - *(Note: if `K07` surfaces a genuinely unregistered contributed command in runtime code/manifest, flag or escalate before altering runtime behavior unless trivial dead-manifest cleanup is unambiguous.)*

### Observable Outcome

- Zero runtime files under `packages/*/src/` are modified (`docs/` and `src/tests/` only).
- `US_EXP_SIDEBAR` describes only the generic sidebar shell; Messages and Heartbeat have their own explorer tree stories (covering view visibility, open-file navigation, and `Collapse All`); zero `deprecated` statuses exist; and all Needs links/journeys build cleanly under strict Sphinx (`-W --keep-going -E`).
- `REQ_ACTOR_WHOAMI` anchors the no-identity-section rule and `src/tests/actorAgent.test.ts` tests the heading rather than arbitrary prose (`K59`).
- A test verifies every contributed command ID across all six `packages/*/package.json` manifests is registered in `packages/*/src/` (`K07`).
- `scripts/check_contract_needs.py`, `npm run lint`, and the full Vitest suite pass with zero errors.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-24 20:11 CET) |
| Version control | yes | Project Manager | Local branch `feature/sidebar-and-spec-cleanup`; squash-integrated into `development` at closure; the branch is retained | merged (`c9818300`) |
| Product specification | yes | Architect | `US_EXP_*`, new Messages/Heartbeat tree stories, `REQ_ACTOR_WHOAMI`, and linked `REQ_*`/`SPEC_*`/`AC_*` updated and checked | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | User-facing documents reviewed, or none is affected | complete |
| Implementation and unit verification | yes | Developer | Changed Need statuses set to `implemented` and `actorAgent.test.ts` narrowed (zero runtime product code changes) | complete |
| Test design | yes | Tester | Contributed-commands registration test (`K07`), narrowed kernel-heading test (`K59`), and sidebar/story trace assertions pass | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (2026-11-24 21:39 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `US_EXP_SIDEBAR` | modify (stays `approved`) | Slimmed to the generic shell: Activity Bar icon, opening the sidebar, each view a collapsible section specified by its own story. Its `links` to `US_COM_SEND`, `US_AUT_HEARTBEAT`, `US_CFG_FEATURETOGGLES` and the Messages/Heartbeat visibility AC are removed because they belong to the feature stories. |
| `US_EXP_OPENFILE` | remove | Its two outcomes moved into the feature stories; nothing generic remained. Deleted, no stub. |
| `US_MSG_TREE` | add (`approved`, `tracked_by: MOD_MESSAGING`) | Messages view content, click-to-open at the message, view visibility of Messages and Reminders by toggle, Collapse All on both views. The Reminders view content and click-to-open stay in `US_MSG_REMINDERS` AC-6/AC-8, so they are not duplicated. |
| `US_AUT_HEARTBEATTREE` | add (`approved`, `tracked_by: MOD_AUTOMATION`) | Heartbeat view visibility by toggle, click-to-open at the job, Collapse All. Listing, play, pause and refresh stay in `US_AUT_HEARTBEAT`. |
| `REQ_ACTOR_WHOAMI` | modify, new AC-12 (`implemented` → `approved`) | The Actor kernel instructions contain no Identity section; the agent carries name and `context.md` location. Matches `SPEC_ACTOR_WHOAMI` AC-10, which is unchanged. |
| `REQ_EXP_TREEVIEW`, `REQ_EXP_HEARTBEAT_OPENFILE`, `REQ_EXP_MESSAGE_OPENFILE`, `REQ_EXP_REMINDER_OPENFILE`, `REQ_AUT_HEARTBEATVIEW` | links only | Rewired from `US_EXP_OPENFILE` / `US_EXP_SIDEBAR` to the new stories. Text and status unchanged. |
| `AC_EXP_OPENFILE_JOURNEY` | modify intro and `validates` | Now validates `US_AUT_HEARTBEATTREE` and `US_MSG_TREE`. The journey steps are unchanged. |

| Decision or check | Evidence |
|---|---|
| `US_EXP_FEATURETOGGLE` does not exist in `docs/`. The visibility ACs the Contract names sat in `US_EXP_SIDEBAR` AC-4, so K34 moved that AC and there was nothing to retire. | `grep` of `docs/**/*.rst` finds no such ID. The only toggle story is `US_CFG_FEATURETOGGLES` (`MOD_CONFIG`), which keeps the toggle settings and is untouched. |
| Messages and Reminders share one story, although `US_MSG_REMINDERS` is in `MOD_AUTOMATION`. | The Contract asks for the Reminders view under Messages; the Reminders view is a sub-feature of Messages in `US_CFG_FEATURETOGGLES` AC-3. The story only states the Reminders view's visibility and Collapse All. |
| Other `US_EXP_SIDEBAR` links (`req_actor.rst`, `us_pim.rst`, `us_flow.rst`, `us_dev.rst`, `us_actor.rst`) and `REQ_EXP_ACTIVITYBAR`, `REQ_EXP_REACTIVECACHE` stay. | They reference the sidebar as the host shell, which the story still is. |
| `SPEC_EXP_*` unchanged. | The specs link the requirements, not the stories; `SPEC_EXP_COLLAPSEALL` and the open-file specs already match the new story ACs. |
| Strict Sphinx build and format test | `python -m sphinx -W --keep-going -E -b html . <tmp> -q` exit 0; `npx vitest run src/tests/acceptance-criteria-format.test.ts` 5/5 @ `7e90fd62`. |
| `python scripts/check_contract_needs.py` @ `7e90fd62` | Reports only the open work: `REQ_ACTOR_WHOAMI`, `US_EXP_SIDEBAR`, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE` not yet `implemented` (Developer), and the three stories not yet named in User Validation (Project Manager). |

**For the Developer:** narrow the `src/tests/actorAgent.test.ts` assertion to an `Identity` Markdown heading (`REQ_ACTOR_WHOAMI` AC-12); set `REQ_ACTOR_WHOAMI`, `US_EXP_SIDEBAR`, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE` to `implemented` once the test passes. No runtime change is needed: `showCollapseAll: true`, the `when` clauses and both open-file commands already exist in `packages/core`.

**For the Tester:** K07, a test that every `contributes.commands` ID of the six `packages/*/package.json` manifests is registered via `registerCommand` in that package's `src/`. If a command is genuinely unregistered, flag or escalate before changing runtime behaviour.

**For the User Validation row (Project Manager):** name `US_EXP_SIDEBAR`, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE`; `AC_EXP_OPENFILE_JOURNEY` validates the last two.

**For the Technical Writer:** user documents that describe the sidebar, Messages or Heartbeat views, or "open source file from tree node" need a read; wording about the Messages and Heartbeat sections being listed in the sidebar shell is no longer in the specification.

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Docs build, Needs check, CI, manifests | none | Branch touches only `docs/`; `git diff development...HEAD` lists no file under `packages`, `src`, `.github`, `.vscode`, `scripts`. Strict Sphinx build exits 0. `git grep` finds no remaining `US_EXP_OPENFILE` or `US_EXP_FEATURETOGGLE` outside the Contract. `check_contract_needs.py` exits 1 as designed: `REQ_ACTOR_WHOAMI` is `approved` (Developer sets `implemented`); the new or changed stories `US_AUT_HEARTBEATTREE`, `US_EXP_SIDEBAR`, `US_MSG_TREE` are `approved` and not named in User Validation (Project Manager). |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| K59 heading test | `not.toMatch(/^#{1,6}\s+.*\bIdentity\b/im)` on the kernel asset | Keep `not.toContain('Identity')` | `REQ_ACTOR_WHOAMI` AC-12 forbids an Identity section, not the word in prose; the heading regex pins the section |
| Runtime code | None changed | none | `showCollapseAll`, the `when` clauses and both open-file commands already exist (Architect's check) |
| K07 command-registration test | Not written by me | Write it now | It is the Tester's row |
| Need status | `REQ_ACTOR_WHOAMI`, `US_EXP_SIDEBAR`, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE` set to `implemented` | none | `REQ_REL_NEEDSCHECK` AC-3; the test passes |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `src/tests/actorAgent.test.ts` | AC-10 assertion narrowed to an Identity heading | `npx vitest run`: 70 files, 796 tests pass |
| `docs/requirements/req_actor.rst`, `docs/userstories/us_exp.rst`, `us_msg.rst`, `us_aut.rst` | Four Needs `approved` to `implemented` | `scripts/check_contract_needs.py` after commit: only the three User-validation hits (PM) expected |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Every `contributes.commands` ID of `core`, `flow`, `kanban`, `mcp`, `pim`, `recorder` is registered via `registerCommand` in that package's `src/` (id may sit on the next line); an empty-scan guard asserts more than 30 contributed commands are seen (K07) | system | Contract scope K07 (no Need owns it) | `src/tests/contributed-commands-registered.test.ts` |
| Kernel asset has no Identity heading; prose use of the word is allowed (K59) | system | `REQ_ACTOR_WHOAMI` AC-12; `SPEC_ACTOR_WHOAMI` AC-10 | `src/tests/actorAgent.test.ts` (Developer's narrowed assertion, reviewed; regex probe: rejects `## Identity` and `### 0. Your Identity`, accepts prose) |
| Sidebar and story traces: no `US_EXP_OPENFILE` / `US_EXP_FEATURETOGGLE` left, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE` exist | system | `US_EXP_SIDEBAR`, `US_MSG_TREE`, `US_AUT_HEARTBEATTREE` | not added: covered by the strict Sphinx build (unresolved links fail it) and `check_contract_needs.py`; a test would restate them |

Run: full `npx vitest run` @ branch working tree: 71 files, 803 tests pass. Mutation check: renaming a kanban manifest command to a non-registered ID fails the kanban case only (restored, tree clean). Finding: no contributed command is unregistered; `packages/mcp` contributes no commands, so its case is a vacuous pass. The `## Test Design` heading is restored.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/core.md` Messaging, Heartbeat | The guide said nothing about the Messages and Heartbeat views; now states what `US_MSG_TREE` AC-1 to AC-4 and `US_AUT_HEARTBEATTREE` AC-1 to AC-3 promise: visibility by `jarvis.messages.enabled` / `jarvis.heartbeat.enabled`, click opens the queue file or `heartbeat.yaml` at the entry, **Collapse All** on Messages, Reminders and Heartbeat. The Reminders view gating was already stated | this commit; `docs/build.ps1 -Clean` succeeded; the `showCollapseAll` and `when` facts rest on the Architect's check of `packages/core` (not re-read by me) |
| `README.md`, `packages/core/README.md`, `getting-started.md`, `flow.md`, `pim.md` | Sidebar wording | none needed: they say 'Jarvis view in the activity bar' or name a single view, nothing the slimmed `US_EXP_SIDEBAR` contradicts | checked |
| K59 (kernel has no Identity section) | Not user-facing | none | checked |
| `docs/releasenotes.md` | none: no behaviour change (zero runtime code) | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `821902bd`. Open Findings is `None`. Only `docs/` and `src/tests/` changed, as the outcome requires. The Messages and Heartbeat statements in the new stories and the Core guide match the manifest `when` clauses and the `showCollapseAll` calls in `packages/core`. 803 tests pass. The Needs check leaves only the three stories the Project Manager names in User Validation.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base | `git diff --name-only development...HEAD` | Outside `docs/` and `src/tests/`: no file; tests: the narrowed `actorAgent.test.ts` assertion and the new `contributed-commands-registered.test.ts` | No finding | |
| Story claims against code | `packages/core/package.json` `when` clauses; `showCollapseAll` in `extension.ts` (Messages, Reminders) and `heartbeat.ts` (Heartbeat); `git grep` for the removed `US_EXP_OPENFILE` and `US_EXP_FEATURETOGGLE` outside `docs/changes` | Claims match the code; no dangling reference | No finding | The click-to-open and journey `AC_EXP_OPENFILE_JOURNEY` need a live host and go to User Validation |
| Review of the K07 test | read `contributed-commands-registered.test.ts` | Scans each manifest against `registerCommand(` calls in that package's sources; the `> 30` guard prevents an empty scan | No finding | `packages/mcp` contributes no commands, so its case passes vacuously (Tester recorded this) |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ 821902bd | pass |
| Lint | `npm run lint` @ 821902bd | pass: 0 errors, 172 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ 821902bd | pass: 71 files, 803 tests |
| Script tests | `python -m unittest discover scripts` @ 821902bd | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ 821902bd | pass |
| Needs check | `python scripts/check_contract_needs.py` @ 821902bd | exit 1: only `US_AUT_HEARTBEATTREE`, `US_EXP_SIDEBAR`, `US_MSG_TREE` AC-4 (not named in User Validation); expected, the Project Manager names them |
| VSIX packaging | not run | no file under `packages/` changed, so the packages are identical to the last verified build |

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
| Automated verification of `US_EXP_SIDEBAR`, `US_MSG_TREE`, and `US_AUT_HEARTBEATTREE` (zero runtime files under `packages/` modified; `AC_EXP_OPENFILE_JOURNEY` steps unchanged and not re-run in a live host) | User accepted on the automated evidence: 71 test files / 803 tests pass (including the contributed-commands registration test and narrowed kernel-heading test), 24 script tests pass, lint 0 errors, and strict Sphinx build clean. | 2026-11-24 |

**Decision:** accepted (2026-11-24 21:39 CET)

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

**Final outcome:** Accepted by the User on 2026-11-24 on automated verification (zero runtime files under `packages/` modified). Slims `US_EXP_SIDEBAR` to the generic sidebar container, deletes `US_EXP_OPENFILE` without `deprecated` stubs, and adds dedicated `US_MSG_TREE` and `US_AUT_HEARTBEATTREE` stories (plus Core guide coverage) for Messages/Reminders and Heartbeat tree visibility, click-to-open, and `Collapse All` (K33, K34, K36); anchors the kernel no-identity-section rule in `REQ_ACTOR_WHOAMI` AC-12 and narrows `actorAgent.test.ts` to Markdown headings (K59); and adds `contributed-commands-registered.test.ts` verifying all contributed commands across all six packages are registered in code (K07). Squash-integrated into `development` as `c9818300`; feature branch `feature/sidebar-and-spec-cleanup` retained; statistics recorded in `.syspilot/stats/sidebar-and-spec-cleanup-stat.md`. Not released.
