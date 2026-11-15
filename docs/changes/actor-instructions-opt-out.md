# Change Contract: actor-instructions-opt-out

**Status:** accepted<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-14<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-14 | 18:17 | Project Manager | Architect | User approved Contract release; the agreed default-on/opt-out scope is ready for specification review. |
| 2026-11-14 | 23:30 | Architect | Project Manager | Spec aligned to default `true` (5 drafts, user approval needed); UAT docs (Tester) and release-note migration note (Technical Writer) still to do; Developer/Tester/Writer/Infra rows left for you to include. |
| 2026-11-14 | 23:10 | Project Manager | Architect | User clarified autonomous mode requires no separate specification approval; proceed with owner decisions, User validation remains at the end. |
| 2026-11-14 | 23:20 | Architect | Developer | Five spec elements now `approved`; code default and runtime fallback to `true` (`packages/core/package.json`, `extension.ts:77`) plus tests are open; Tester, Technical Writer rows still to be decided by their owners. |
| 2026-11-14 | 23:20 | Developer | Tester | Default and runtime fallback are `true`, unit test passes; UAT artifacts still expect default off (T-1, AC-1, AC-3, AC-6) and need your update; release-note migration note is open for the Technical Writer. |
| 2026-11-14 | 23:40 | Technical Writer | Quality | Core guide setting default and Getting Started updated; unreleased migration note added to Getting Started (Release assigns version and carries it into `docs/releasenotes.md`); `docs/build.ps1 -Clean` succeeded. |
| 2026-11-15 | 00:45 | Quality | Project Manager | Judgment `proceed`, no open findings; removed a stray `$&` line from this log; `packages/suite` leftover fails one unrelated test locally. |
## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User requested switching Actor instruction provisioning to opt-out and selected autonomous mode in chat on 2026-11-14.

### Goal

Core Actor instructions are provisioned by default; setting jarvis.actor.autoProvision to false opts out and removes the files Jarvis provisioned.

### Value

Jarvis users, including the seven current office users, receive the Actor instructions without per-workspace setup, while workspaces that do not use Actors can explicitly opt out.

### Scope

Change the default of jarvis.actor.autoProvision to true and align its runtime fallback, approved requirement, setting documentation, and focused tests. Do not change the instruction contents or Kanban provisioning. Users with no explicit setting will receive the files on activation after upgrade; explicit false remains an opt-out.

### Observable Outcome

The contributed setting and runtime fallback default to true; tests prove default provisioning and explicit-false cleanup; the requirement and user-facing setting documentation describe the same default and opt-out.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved |
| Version control | yes | Project Manager | Local branch `feature/actor-instructions-opt-out`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete |
| Infrastructure impact | not applicable: no build, CI, workflow, or test-tooling changes | Admin | No infrastructure artifacts changed | not applicable |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | proceed |
| User validation | yes / not applicable: {explicit User delegation recorded in this row} | User | Observable outcome is accepted or changes are requested | pending / accepted / changes requested / not applicable |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

All five modified elements are `approved` (autonomous mode; no separate specification approval gate per the PM's handoff 20b6b551):

| Artifact | Change | Rationale |
|---|---|---|
| `US_MOD_ACTORRULES` (us_mod.rst) | modify AC-2, AC-3, AC-4 | AC-3 "nothing written unless opt-in" contradicted the approved default; now: rules arrive by default, opt-out leaves none |
| `REQ_MOD_ACTORRULES` AC-3 (req_mod.rst) | modify | default `true`; runtime fallback equals contributed default |
| `REQ_MOD_SKILL_OPTOUT` AC-4a (req_mod.rst) | modify | old principle (optional assets default `false`) forbade the new default; now three cases, default is the module's decision |
| `REQ_MOD_ACTORRULES_MIGRATE` AC-4, AC-5 | modify | with default `true`, workspaces holding pre-convention files get duplicate rules on first activation after upgrade; migration note must ship with the release |
| `SPEC_MOD_ACTORRULES` (spec_mod.rst), `jarvis.actor.autoProvision` block in `spec_cfg.rst` | modify | call-site fallback, settings JSON, AC-1..3 aligned to default `true` |

| Decision or check | Evidence |
|---|---|
| Impact analysis (id grep, both directions) | Consumers: `REQ_UAT_MOD_ACTORRULES`, `US_UAT_MOD_ACTORRULES`, `SPEC_UAT_MOD_ACTORRULES` (T-1 "default off", AC-1, AC-3, AC-6 "never opted in"), `req_cfg.rst` AC-6 (group membership only, unchanged), `req_actor.rst`/`spec_actor.rst` (references only) |
| UAT artifacts not edited | They are test design (Tester); T-1 expects no files by default and must now expect files by default |
| Release-note duty | `REQ_MOD_ACTORRULES_MIGRATE` AC-4: release notes must carry the duplicate-files migration note (Technical Writer) |
| Strict build | `python -m sphinx -W -b html docs` passes |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| How to test the runtime fallback | Source-pattern check on `extension.ts` plus a real `provisionModuleAssets` run with `enabled: true` and `false` in a temp workspace | Drive `activate()` of core | `activate()` pulls in the Agent Host client (`ws`, not installed here); the fallback is one call site, the provisioning function holds the behaviour |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/package.json` | `jarvis.actor.autoProvision` default `true`, description per spec | `src/tests/actor-autoprovision-default.test.ts` |
| `packages/core/src/extension.ts` | fallback `true` | same |
| `README.md` | setting table and feature line: default `true`, opt out with `false` | n/a |
| `src/tests/actor-autoprovision-default.test.ts` | new: defaults, provisioning with three files byte-identical, `false` removes exactly those and keeps `mermaid.instructions.md` | `npx vitest run`: 640 passed, 1 failed + 3 suites failed, all outside this change (`ws` module not installed for 3 AHP suites; `packages/suite` still present on disk for the readiness test) |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| T-1 Default on: three files provisioned with setting unset | validation | `US_UAT_MOD_ACTORRULES` AC-1, `REQ_MOD_ACTORRULES` AC-3 | `docs/design/spec_uat_mod_actorrules.rst` |
| T-2 Explicit false then true restores files | validation | `US_UAT_MOD_ACTORRULES` AC-2 | same |
| T-3..T-6 unchanged (idempotency, opt-out, isolation, old files) | validation | `US_UAT_MOD_ACTORRULES` AC-3..6 | same |

UAT user story, requirement (AC-3, AC-7) and spec updated to default `true`; live EDH execution not run here. Strict `sphinx -W` build passes.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/core.md` | `jarvis.actor.autoProvision` default `true`; opt-out removes provisioned files | this change's commit |
| `docs/user guides/getting-started.md` | `(the default)` wording; new section 'Updating with Actor instructions on by default' covering duplicate rules from hyphenated copies and unversioned data loss (`REQ_MOD_ACTORRULES_MIGRATE` AC-1, 2, 4, 5) | this change's commit; `docs/build.ps1 -Clean` succeeded |
| Root `README.md` | Already states default `true` (Developer) | checked, no edit |
| `docs/releasenotes.md` | Release carries the migration note at release time | open for Release |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed`. Default `true` is consistent from US through requirement, spec, UAT design, manifest, runtime fallback, tests, user docs and the built core VSIX; no open finding. The release-note migration note is a Release duty, already recorded in the Documentation row.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Relationship trace | `US_MOD_ACTORRULES`, `REQ_MOD_ACTORRULES` AC-3, `REQ_MOD_ACTORRULES_MIGRATE` AC-4/5, `REQ_MOD_SKILL_OPTOUT` AC-4a, `SPEC_MOD_ACTORRULES`, `spec_cfg.rst` block, UAT US/REQ/SPEC, `package.json`, `extension.ts:77`, README, core guide, Getting Started; grep of `autoProvision`/`ACTORRULES` across docs and packages | Every current statement says default `true` with `false` as opt-out; only `docs/releasenotes.md:178` still says opt-in, a historic entry. `sphinx -W` build passes @ c6361209 | no finding | Semantic check by reading, no Sphinx-Needs link query |
| Peer coverage (MECE) | The five edited spec elements and `REQ_MOD_SKILL_OPTOUT` AC-4a's three default cases | AC-4a cases (required, default-on optional, on-request) do not overlap; `US` AC-3 and `REQ` AC-3 and `SPEC` AC-1..3 agree; UAT T-1/T-2 cover unset and false-then-true, T-3..T-6 unchanged | no finding | Peer set chosen by me from the Architect's impact table |
| Test review | `src/tests/actor-autoprovision-default.test.ts` | Runs real `provisionModuleAssets` for enabled `true` (byte-identical, three files) and `false` (only those removed, foreign file kept); fallback is a source-pattern check | no finding; the fallback check is textual because `activate()` needs the Agent Host client (residual risk named by the Developer) | Live EDH UAT not run (Tester states so) |
| Built artifact | `jarvis-core-0.32.0.vsix` | Packaged manifest `default: true`; bundle contains `get("autoProvision",!0)` and the three `jarvis-actor.*` assets | no finding | VSIX not installed |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ c6361209 (after `npm install`, `ws` was missing) | pass except `extension-readiness-disclosure.test.ts` AC-1: `packages/suite` exists on disk but is untracked (`git ls-files` empty), so a local leftover outside this change |
| New test | `actor-autoprovision-default.test.ts` @ c6361209 | pass (2 tests) |
| Strict docs build | `python -m sphinx -W -b html docs` @ c6361209 | pass |
| VSIX packaging | `pwsh -NoProfile -File test-environments/windows-sandbox/Build-Vsix.ps1` @ c6361209 | pass: six packages 0.32.0; core manifest and bundle checked |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

None

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| EDH T-1..T-6 | User reports the EDH test is complete; Actor instruction auto-provisioning is now opt-out; validation passed. | 2026-11-15 |

**Decision:** accepted — User reported validation passed on 2026-11-15.

## Closure

**Owner:** Project Manager<br>
**Status:** pending | closed

- [x] Every included artifact or gate has terminal status and completion evidence.
- [x] Intent and outcome are `approved`.
- [x] Quality has recorded `proceed`.
- [x] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [x] Current blocker is `none`.
- [ ] Header Status is `closed`.

**Final outcome:** User accepted the default-on Actor instruction provisioning and validated opt-out in the EDH. Integration into `development` is pending.
