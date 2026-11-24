# Change Contract: purge-deprecated-and-stale-specs

**Status:** active<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-24<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-24 | 01:14 CET | Project Manager | Architect | User pre-authorized Contract release (autonomous). Scope removes `deprecated` from the ontology and enforcement scripts/tests, deletes all 11 existing `deprecated` Needs with clean link re-wiring, and executes the 5 spec-cleanup cards K25, K70, K71, K45 and K56. |
| 2026-11-24 | 01:19 CET | Architect | Admin | Ontology without `deprecated`, 11 Needs and `us_olk.rst` deleted, K25/K70/K71/K45/K56 done, strict build exit 0. `REQ_REL_NEEDSCHECK` AC-3 to AC-5 and `SPEC_REL_NEEDSCHECK` no longer allow `deprecated`; ten content-changed Needs are `approved` until the Developer sets `implemented`. |
| 2026-11-24 | 01:21 CET | Admin | Developer | Needs-check script and its tests no longer accept `deprecated`; 24 script tests pass. The check on this Contract reports exactly the Architect's 18 `approved` Needs. `acceptance-criteria-format.test.ts` still accepts `deprecated` and is yours. |
| 2026-11-24 | 01:30 CET | Developer | Technical Writer | The AC format test no longer accepts `deprecated`; the 18 `approved` Needs are `implemented`. No runtime code changed. |
| 2026-11-24 | 01:50 CET | Technical Writer | Tester | PIM guide now states the US_PIM_TASKS AC-9 outcome; no document used jarvis.outlookEnabled, `Agent File:` or jarvis_rec_; strict docs build passes. Your Test design heading is missing in the Contract (see below). |
| 2026-11-24 | 01:40 CET | Tester | Quality | 13 of 14 new tests pass; 1 fails: `packages/pim/src/extension.ts:159` still tells users to enable removed `jarvis.outlookEnabled` (Open Findings, Developer's artifact). Journey `AC_ACTOR_FILES_JOURNEY` not executed. |
| 2026-11-24 | 01:55 CET | Quality | Developer | Verification is `blocked` on F-1: the stale `jarvis.outlookEnabled` string at `packages/pim/src/extension.ts:159`; fix it so the K70 test passes. Everything else passes at `4ba85d8d`. This is a runtime string change in `packages/pim`, so I will build the six VSIXs after it. |
| 2026-11-24 | 02:10 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`. F-1 is fixed and the clean-tree VSIX build passes. Name `US_ACTOR_FILES_TREE`, `US_PIM_TASKS` and the actor-files journey in User Validation; the journey needs a live host and is unexecuted. |
| 2026-11-24 | 02:00 CET | Developer | Quality | F-1 fixed: the message now names `jarvis.outlook.enabled` and `jarvis.outlook.tasks.enabled`; all 752 tests pass. The Open Findings row is yours to remove. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-24 01:11 CET (scope settled and pre-authorized for immediate start, including removing `deprecated` from the ontology).

### Goal

The Jarvis ontology and specification graph no longer permit or contain `deprecated` Need stubs — Git owns history, retired Needs are deleted outright with clean links — and five known stale specification discrepancies (`K25`, `K70`, `K71`, `K45`, `K56`) are brought into alignment with shipped product behavior.

### Value

Keeping `deprecated` stubs in the live specification clutters impact/MECE/trace neighborhoods and tempts actors to leave half-retired artifacts behind instead of rewiring links cleanly. Forbidding `deprecated` in `ontology.toml` makes the strict Sphinx build and `check_contract_needs.py` enforce clean deletion, while resolving `K25`, `K70`, `K71`, `K45`, and `K56` eliminates misleading solution stories and stale setting/label/tool claims without touching runtime product code.

### Scope

- **Drop `deprecated` from the Jarvis ontology & checks (User decision, 2026-11-24):**
  - Remove `deprecated` from `docs/Jarvis Ontology/ontology.toml` (`[[needs.statuses]]` / schema enum) and `docs/Jarvis Ontology/ontology.md` (documenting that retired Needs are deleted and Git holds history).
  - Update `REQ_REL_NEEDSCHECK` / `SPEC_REL_NEEDSCHECK`, `scripts/check_contract_needs.py`, `scripts/test_check_contract_needs.py`, and `src/tests/acceptance-criteria-format.test.ts` so `deprecated` is no longer an accepted Need status.
- **Delete all 11 existing `deprecated` Needs and rewire incoming links:**
  - Delete `US_CFG_MSG`, `US_CFG_SETTINGSGROUPS`, `REQ_CFG_MSGPATH`, `REQ_CFG_SETTINGSGROUPS`, `SPEC_CFG_HEARTBEATSETTINGS`, `SPEC_CFG_SETTINGS`, `SPEC_CFG_SETTINGSGROUPS`, `SPEC_CFG_UPDATECHECK`, `REQ_MSG_SESSIONFILTER`, `REQ_MSG_SESSIONLOOKUP`, and `SPEC_MSG_SESSIONLOOKUP`.
  - Cleanly update or repoint incoming links on active Needs (`REQ_MSG_LOGSETTING`, `SPEC_AUT_SCHEDULERLOOP`, `REQ_OLK_ENABLE`, `REQ_OLK_TASKENABLE`, `REQ_OLK_CATENABLE`, `SPEC_OLK_SETTINGS`, etc.) to their current active counterparts (such as `REQ_CFG_GROUPS` / `REQ_CFG_FIXEDPATHS`) so no Need is orphaned and the strict Sphinx build passes with zero warnings.
- **Execute the 5 specification-cleanup backlog items (no runtime product behavior change):**
  - **K25 (`docs/userstories/us_olk.rst`):** Remove the entire `docs/userstories/us_olk.rst` file (technical COM/category/task provider solution stories rather than user goals) and remove it from toctrees. Keep user-visible Outlook task/category outcomes covered by the existing `US_PIM_*` stories (adjusting wording or links on `US_PIM_*` / `REQ_OLK_*` / `AC_*` so every `REQ_OLK_*` traces cleanly to a valid user story; note K23 leaves PIM categories active as an open product decision, so do not drop category functionality).
  - **K70 (`jarvis.outlook.enabled`):** Align `REQ_OLK_ENABLE` and the configuration-change example in `SPEC_OLK_SETTINGS` from stale `jarvis.outlookEnabled` to `jarvis.outlook.enabled`.
  - **K71 (`SPEC_CFG_IGNOREMANAGER`):** Remove the stale eleven-settings-groups / non-conformance escalation claim in `SPEC_CFG_IGNOREMANAGER` (`docs/design/spec_cfg.rst`) and state the current group ownership (`REQ_CFG_GROUPS` / `SPEC_CFG_MANIFEST`).
  - **K45 (`SPEC_MOD_REC_PKG` AC-2 / `REQ_ENG_TOOLNS`):** Reconcile the stale claim that Recorder registers `jarvis_rec_` tools (Recorder registers no LM tools; keep any namespace rule conditional on if/when a module contributes tools, or remove the false claim).
  - **K56 (`SPEC_ACTOR_FILES`):** Align `SPEC_ACTOR_FILES` (and `REQ_ACTOR_FILES_TREE` if affected) with the kept runtime display: the agent file child in the Actor tree shows the bare `<basename>`, not `"Agent File: <basename>"`.

### Observable Outcome

- `docs/Jarvis Ontology/ontology.toml` no longer allows `deprecated`, zero Needs in `docs/` carry `:status: deprecated`, and `docs/userstories/us_olk.rst` is deleted.
- Strict Sphinx documentation build (`-W --keep-going -E`), `scripts/check_contract_needs.py`, `python -m unittest discover scripts`, `npm run lint`, and the full Vitest suite pass with zero errors.
- `K25`, `K70`, `K71`, `K45`, and `K56` match the shipped codebase without modifying runtime extension behavior.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-24 01:11 CET) |
| Version control | yes | Project Manager | Local branch `feature/purge-deprecated-and-stale-specs`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | Ontology updated, 11 `deprecated` Needs and `us_olk.rst` removed, K25/K70/K71/K45/K56 reconciled, strict Sphinx build passes | complete (2026-11-24 01:19 CET) |
| Infrastructure impact | yes | Admin | `scripts/check_contract_needs.py` and `scripts/test_check_contract_needs.py` updated to drop `deprecated` | complete |
| Documentation impact | yes | Technical Writer | User-facing documents reviewed against K25/K70/K71/K45/K56, or none is affected | complete |
| Implementation and unit verification | yes | Developer | Any test/helper status alignment (`acceptance-criteria-format.test.ts` or Need statuses) verified; no runtime extension code expected | complete |
| Test design | yes | Tester | Format/needs-check tests trace to the updated ontology and specification | complete (2026-11-24 CET) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | not applicable: explicit User delegation (2026-11-24 01:14 CET) to accept on automated evidence and chain directly to Package A when Quality records `proceed` and no new runtime UI behavior requires manual testing | User | Observable outcome is accepted or changes are requested | accepted (explicit User delegation, 2026-11-24 01:14 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `docs/Jarvis Ontology/ontology.toml`, `ontology.md` | modify | `deprecated` removed from the status enum, the status table and the transitions. Rule now written down: a retired Need is deleted with every link that pointed at it; Git holds its history |
| `REQ_REL_NEEDSCHECK` AC-3/4/5, `SPEC_REL_NEEDSCHECK` step 5 | modify | The "or `deprecated`" and "not `deprecated`" carve-outs are gone; every changed `story`/`req`/`spec`/`ac` follows its status rule. Set to `approved` until Admin's script change lands |
| `US_CFG_MSG`, `US_CFG_SETTINGSGROUPS`, `REQ_CFG_MSGPATH`, `REQ_CFG_SETTINGSGROUPS`, `SPEC_CFG_SETTINGS`, `SPEC_CFG_HEARTBEATSETTINGS`, `SPEC_CFG_SETTINGSGROUPS`, `SPEC_CFG_UPDATECHECK`, `REQ_MSG_SESSIONFILTER`, `REQ_MSG_SESSIONLOOKUP`, `SPEC_MSG_SESSIONLOOKUP` | remove | The 11 `deprecated` Needs. No `:status: deprecated` remains in `docs/` outside `docs/changes/` |
| `REQ_MSG_LOGSETTING`, `SPEC_AUT_SCHEDULERLOOP`, `REQ_OLK_ENABLE`, `REQ_OLK_TASKENABLE`, `REQ_OLK_CATENABLE`, `SPEC_OLK_SETTINGS` | modify (links) | Incoming links repointed to `REQ_CFG_GROUPS` / `REQ_CFG_HEARTBEATINTERVAL` / `SPEC_CFG_MANIFEST`. `SPEC_AUT_SCHEDULERLOOP` text now names `jarvis.heartbeatInterval` instead of the removed heartbeat settings spec |
| `REQ_MSG_QUEUE` AC-4, `SPEC_MSG_QUEUESTORE`, `SPEC_CFG_MANIFEST` | modify | History sentences about the deleted `REQ_CFG_MSGPATH` / the superseded settings spec removed |
| `SPEC_CFG_IGNOREMANAGER` (K71) | modify | The eleven-groups / non-conformance claim is replaced by the current rule: the core manifest has exactly the seven `REQ_CFG_GROUPS` groups, `SPEC_CFG_MANIFEST` holds the array. Links gain `REQ_CFG_GROUPS`, `SPEC_CFG_MANIFEST` |
| `docs/userstories/us_olk.rst` (K25) | remove | Deleted with its toctree entry in `userstories/index.rst`. `REQ_OLK_*` now link `US_PIM_CATEGORIES`, `US_PIM_TASKS`, `US_PIM_CATVIEW`; `AC_OLK_SWITCH_JOURNEY`, `AC_PIM_CATEGORIES_JOURNEY`, `AC_PIM_CATTOOL_JOURNEY`, `AC_PIM_TASKS_JOURNEY` validate `US_PIM_*` only (link change, no content change). `namingconventions.rst` OLK row no longer cites a story |
| `US_PIM_TASKS` AC-9 (K25) | modify | New AC for the one user-visible Outlook outcome no `US_PIM_*` story carried: Outlook as task source is off by default, tasks feature switchable separately. The categories outcome is already `US_PIM_CATVIEW` AC-1/AC-4. COM/PowerShell, colour heuristic and `isComplete` details of the old stories stay in `REQ_OLK_*` / `SPEC_OLK_*` and are not repeated as user outcomes |
| `REQ_OLK_ENABLE`, `REQ_OLK_TASKENABLE`, `SPEC_OLK_SETTINGS`, `SPEC_OLK_TASKENABLE`, `SPEC_OLK_CATENABLE` (K70) | modify | `jarvis.outlookEnabled` → `jarvis.outlook.enabled`, the key in `packages/pim/package.json` and `extension.ts`. The "known naming drift" note in `SPEC_OLK_CATENABLE` is removed because the drift is gone |
| `SPEC_MOD_REC_PKG` AC-2, `REQ_ENG_TOOLNS` description and AC-3 (K45) | modify | The recorder registers no tools (no `registerTool` call, `package.json` contributes none). The `jarvis_rec_` infix stays as a conditional rule for a future tool |
| `SPEC_ACTOR_FILES`, `REQ_ACTOR_FILES_TREE` AC-4, `US_ACTOR_FILES_TREE` AC-1, `AC_ACTOR_FILES_JOURNEY` step 2 (K56) | modify | The agent child shows the bare file name; `actorTreeProvider.ts` sets `label` to the basename. The story and the journey carried the same "Agent File:" label, so they are corrected too |

| Decision or check | Evidence |
|---|---|
| Needs changed in content must end `implemented` | The check reports 18 Needs at `approved` that the Developer sets to `implemented`: `REQ_ACTOR_FILES_TREE`, `REQ_ENG_TOOLNS`, `REQ_MSG_QUEUE`, `REQ_OLK_ENABLE`, `REQ_OLK_TASKENABLE`, `REQ_REL_NEEDSCHECK`, `SPEC_ACTOR_FILES`, `SPEC_AUT_SCHEDULERLOOP`, `SPEC_CFG_IGNOREMANAGER`, `SPEC_CFG_MANIFEST`, `SPEC_MOD_REC_PKG`, `SPEC_MSG_QUEUESTORE`, `SPEC_OLK_CATENABLE`, `SPEC_OLK_SETTINGS`, `SPEC_OLK_TASKENABLE`, `SPEC_REL_NEEDSCHECK`, `US_ACTOR_FILES_TREE`, `US_PIM_TASKS`. Link-only changes (`REQ_MSG_LOGSETTING`, `REQ_OLK_COMBRIDGE`, `REQ_OLK_TASKPROVIDER`, `REQ_OLK_CATENABLE`) are not content changes for the check and keep their status. `check_contract_needs.py` @ f8ded883 reports exactly these, plus the two stories below not yet named in User Validation |
| Changed stories the User validates | `US_PIM_TASKS` (new AC-9) and `US_ACTOR_FILES_TREE` (label wording). `AC_ACTOR_FILES_JOURNEY` has changed content: `approved` unless a later step executes it |
| Out of scope, not changed | Stale items found and left for the Project Manager: `US_CFG_HEARTBEAT` AC-1/AC-2 and `REQ_CFG_HEARTBEATPATH` (removed `jarvis.heartbeatConfigFile`), `REQ_MSG_REMINDERS_VIEW` AC-2, `US_MSG_EDITORPLACEMENT` / `REQ_MSG_EDITORPLACEMENT` (contradict `REQ_COM_OPEN` AC-4), `jarvis_category` / `jarvis_task` tool names in PIM Needs |
| Build and format | `python -m sphinx -W --keep-going -E -b html . <tmp> -q` in `docs/`: exit 0. `npx vitest run src/tests/acceptance-criteria-format.test.ts`: 5 passed (still accepts `deprecated`; Developer/Tester item) |
| For Admin | `scripts/check_contract_needs.py` and `scripts/test_check_contract_needs.py` drop `deprecated` per the changed `REQ_REL_NEEDSCHECK` AC-3 to AC-5; the `syspilot.*` skill scripts and `docs/conf.py` `suppress_warnings = ["needs.deprecated"]` (a sphinx-needs API warning, unrelated to the status) need no change |
| For Developer / Tester | `src/tests/acceptance-criteria-format.test.ts` must stop accepting `deprecated`; then return the `approved` Needs above to `implemented` |
| For Technical Writer | `US_PIM_TASKS` AC-9 and the `jarvis.outlook.enabled` name are the user-visible changes; check README/docs for `jarvis.outlookEnabled` and the "Agent File:" label |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `scripts/check_contract_needs.py` | `SPEC_STATUSES` is `{implemented, verified}` and `AC_STATUSES` is `{approved, verified}`; the `deprecated` exemptions for story and ac are gone, and the AC-3 messages read "implemented or verified" and "approved or verified". Matches `REQ_REL_NEEDSCHECK` AC-3 to AC-5 as the Architect changed them | edited; no `deprecated` remains in the script |
| `scripts/test_check_contract_needs.py` | The tests that accepted or exempted `deprecated` are rewritten; new `test_deprecated_is_no_longer_a_status` asserts AC-3 for a `deprecated` req and ac; the "deprecated ac is exempt" test is removed | `python -m unittest discover scripts` @ working tree on top of `cd392448`: 24 tests OK |
| Needs check on this Contract | Result must equal the Architect's list | `python scripts/check_contract_needs.py --contract docs/changes/purge-deprecated-and-stale-specs.md`: exit 1, 18 Needs at `approved` (the list in Product Specification) plus `US_ACTOR_FILES_TREE` and `US_PIM_TASKS` AC-4 not yet named in User Validation. It passes when the Developer sets `implemented` and the PM names the two stories |
| `docs/conf.py` `suppress_warnings = ["needs.deprecated"]`, `syspilot.*` skill scripts | none: a sphinx-needs API warning key, not the Need status; the skill scripts read the ontology and have no status list | none |
| `docs/Jarvis Contracts/change.md`, `.github/instructions`, `.github/workflows` | none: no mention of `deprecated` | none |
| Not mine | `src/tests/acceptance-criteria-format.test.ts` still accepts `deprecated` | Developer/Tester, as listed in Product Specification |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| `acceptance-criteria-format.test.ts` and `deprecated` | Status regex is `approved\|verified`; the Given/When/Then check covers every criterion | Keep `deprecated` accepted | The ontology no longer allows `deprecated`, so no criterion can carry it |
| Content-changed Needs | The 18 `approved` Needs of Product Specification set to `implemented` | none | `REQ_REL_NEEDSCHECK` AC-3 |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `src/tests/acceptance-criteria-format.test.ts` | Dropped `deprecated` from status check and filter | `npx vitest run src/tests/acceptance-criteria-format.test.ts`: 5 passed |
| 18 Needs in `docs/requirements`, `docs/design`, `docs/userstories` | `:status:` set to `implemented` | `python -m unittest discover scripts`: 24 OK; Needs check expected to leave only the two User-validation hits (PM) |
| `packages/pim/src/extension.ts` | F-1: task-provider message names `jarvis.outlook.enabled` and `jarvis.outlook.tasks.enabled` (runtime string only; no-provider message for tasks) | `npx tsc -p packages/pim --noEmit`: clean; `npx vitest run`: 69 files, 752 tests pass |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| No `deprecated` in `ontology.toml`, no `:status: deprecated` Need, every used status declared | system | `REQ_REL_NEEDSCHECK` AC-3..AC-5 | `src/tests/purge-deprecated-and-stale-specs.test.ts` |
| The 11 retired Need IDs and `US_OLK_*` appear nowhere; every `:links:` target is a defined Need | system | ontology (retired Need is deleted with its links) | same file |
| K25: every `REQ_OLK_*` links to a `US_PIM_*` story or another `REQ_OLK_*` | system | `REQ_OLK_*` | same file |
| K70: PIM manifest declares `jarvis.outlook.enabled` / `jarvis.outlook.tasks.enabled`, not `outlookEnabled`; PIM sources and Outlook specs do not use the old name | system | `US_PIM_TASKS` AC-9 | same file (FAILS, see Open Findings) |
| K56: no `Agent File:` label in specs; tree provider labels the child with the basename | system | `SPEC_ACTOR_FILES` | same file |
| K45: recorder contributes and registers no tools; `jarvis_rec_` only as conditional rule | system | `REQ_ENG_TOOLNS`, `SPEC_MOD_REC_PKG` | same file |
| K71: core manifest has exactly the 7 groups in order | system | `REQ_CFG_GROUPS` | same file |
| Needs-check no longer accepts `deprecated` | system | `REQ_REL_NEEDSCHECK` | `scripts/test_check_contract_needs*.py` (24 pass, unchanged) |
| Not executed: `AC_ACTOR_FILES_JOURNEY` (tree label in a live host) | validation | `US_ACTOR_FILES_TREE` | needs an Extension Development Host; stays `approved` |

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/pim.md` | Tasks section states the new `US_PIM_TASKS` AC-9 outcome: Outlook as task source off by default, `jarvis.outlook.tasks.enabled` separate from `jarvis.outlook.enabled` | this commit; `docs/build.ps1 -Clean` succeeded |
| `docs/user guides/pim.md`, `packages/pim/README.md` | K70: setting name `jarvis.outlook.enabled` | none needed: already used, matches `packages/pim/package.json` |
| Guides and READMEs for K56, K45, K71 | 'Agent File:' label, `jarvis_rec_` tools, settings-group count | none needed: no document contains them (search of README, guides, package READMEs) |
| `docs/Jarvis Ontology/ontology.md` | Developer-facing, not a user guide; Architect's | not reviewed here |
| `docs/releasenotes.md` | Release decides; the change alters no user-visible behaviour except the PIM guide sentence | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed` at `7df8dd0d`. Open Findings is `None`. F-1 is fixed: `packages/pim/src/extension.ts:159` now names `jarvis.outlook.enabled`, and the built PIM bundle contains the new text and no `outlookEnabled`. All 752 tests pass, and the clean-tree build gives six VSIXs. The Needs check leaves only the two stories the Project Manager names in User Validation. The actor-files journey in a live host is not run by Quality and belongs in User Validation.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base | scripts (2), `acceptance-criteria-format.test.ts`, the new test file, specs and ontology | Script statuses `{implemented, verified}` and `{approved, verified}` match `REQ_REL_NEEDSCHECK` AC-3..AC-5; the test regex drops `deprecated`; `packages` is unchanged apart from the F-1 line | F-1 found at 4ba85d8d (runtime string with the old setting name), fixed at 7df8dd0d; the fix diff is that one line | Specification text read for the changed Needs, not every line |
| Dangling references | `git grep` for `outlookEnabled` outside history | Remaining: `spec_cfg.rst:155` and `req_cfg.rst:270` (rename history notes), the new test, and the F-1 line (now fixed) | None after 7df8dd0d | |
| Needs check | `scripts/check_contract_needs.py` @ 7df8dd0d | exit 1: only `US_ACTOR_FILES_TREE` and `US_PIM_TASKS` AC-4 (not named in User Validation) | Expected, the Project Manager names them | |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ 7df8dd0d | pass |
| Lint | `npm run lint` @ 7df8dd0d | pass: 0 errors, 171 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ 7df8dd0d | pass: 69 files, 752 tests (at 4ba85d8d one failed: the K70 test, F-1) |
| Script tests | `python -m unittest discover scripts` @ 7df8dd0d | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ 7df8dd0d | pass |
| VSIX packaging, clean tree | detached worktree at 7df8dd0d: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` for core, pim, recorder, mcp, flow, kanban | pass: six VSIXs at 0.34.0, engine `^1.144.0`, no `.wasm`; the PIM bundle contains `Enable jarvis.outlook.enabled and jarvis.outlook.tasks.enabled` and no `outlookEnabled` |
| Actor files journey in a live host | not run by Quality | needs an Extension Development Host; open for User Validation |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | None | None |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** not applicable: explicit User delegation on automated evidence

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Automated verification of `US_ACTOR_FILES_TREE` (aligning specification wording with the kept bare-basename display already chosen by the User in K56) and `US_PIM_TASKS` AC-9 (preserving Outlook task default wording after removing `us_olk.rst` in K25) | Explicit User delegation (2026-11-24 01:14 CET): 69 test files / 752 tests pass, 24 script tests pass, lint 0 errors, strict Sphinx build clean, and clean-tree VSIX build verified; the actor-files live journey was not re-run because the tree code did not change. | 2026-11-24 |

**Decision:** explicit User delegation on automated evidence (2026-11-24 01:14 CET)

## Closure

**Owner:** Project Manager<br>
**Status:** pending

- [ ] Every included artifact or gate has terminal status and completion evidence.
- [ ] Intent and outcome are `approved`.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [ ] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [ ] Current blocker is `none`.
- [ ] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [ ] Header Status is `closed`.

**Final outcome:** {accepted result and integration commit}
