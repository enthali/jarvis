# Change Contract: vscode-minimum-1-144

**Status:** active<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-16<br>
- **Operation Mode**: autonomous - each actor decides on its own and asks the User when genuinely unsure; the Architect consults the User on specification decisions.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-16 | 22:13 CET | Project Manager | Architect | User approved the Contract release. The requested minimum is VS Code 1.144.0; assess specification impact before implementation. |
| 2026-11-16 | 22:45 CET | Architect | Developer | Spec change needed: `engines.vscode` `^1.144.0` added as AC-9 of `REQ_REL_PKGCONTRACT` and `SPEC_REL_PKGCONTRACT` (both approved); strict build passes. Manifests, root manifest and lockfile workspace entries are yours. |
| 2026-11-16 | 22:41 CET | Developer | Technical Writer | All eight manifests and lockfile entries are `^1.144.0`; tests green. Three documents still say 1.95.0 (see Documentation Impact). Admin's row is still pending. |
| 2026-11-16 | 23:00 CET | Technical Writer | Admin | Three documents now say VS Code 1.144.0 or later; the 1.143.1 evidence remarks stay as history of what was tested; strict build passes; Admin row is yours. |
| 2026-11-16 | 23:20 CET | Admin | Tester | Six Marketplace VSIXs package with engine `^1.144.0`; no CI or workflow change; sandbox already pins 1.144.0. `core-gh` is not covered by `Build-Vsix.ps1`. |
| 2026-11-16 | 23:40 CET | Tester | Quality | Added `src/tests/vscode-minimum-engine.test.ts` (manifests, lockfile, `@types/vscode` floor; 11 pass); no UAT scenario needed; documentation wording left to User validation. |
| 2026-11-16 | 23:55 CET | Quality | Project Manager | Quality Review is `proceed`, Open Findings `None`, at 9eeccf7e. User validation is next; AC-9 statuses stay `approved` until their owner decides. |
## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User request, 2026-11-16: “da jarvis-core ahp braucht ist unsere mindest anforderung 1.144.0 das müssten wir anpassen”

### Goal

Declare VS Code 1.144.0 as Jarvis's minimum supported version consistently in extension manifests and current user-facing installation requirements.

### Value

Users and the Marketplace should not be told that Jarvis supports VS Code versions below the minimum needed by Jarvis Core's Agent Host Protocol integration.

### Scope

Update the root manifest and all seven package manifests, the corresponding root and workspace entries in `package-lock.json`, and current documentation that states or implies a lower minimum. Preserve historical release evidence as historical evidence, not as a current support claim.

### Observable Outcome

All applicable manifests declare `^1.144.0`; lockfile workspace metadata agrees; current installation and Core documentation say VS Code 1.144.0 or later is required and do not imply that 1.95.0 is a usable minimum.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved |
| Version control | yes | Project Manager | Local branch `feature/vscode-minimum-1-144`; squash-integrated into `development` at closure; branch retained | active / merged |
| Product specification | yes | Architect | Determine whether a specification change is required for the minimum supported VS Code version | complete |
| Infrastructure impact | yes | Admin | Assess CI, packaging and manifest impact; record required action or none | complete |
| Documentation impact | yes | Technical Writer | Current affected documentation agrees on the minimum version | complete |
| Implementation and unit verification | yes | Developer | Manifests and lockfile agree on the minimum version; validation recorded | complete |
| Test design | yes | Tester | Determine appropriate tests or record why no requirement-level test is needed | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | proceed |
| User validation | yes | User | User confirms the declared minimum is represented accurately | accepted |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_REL_PKGCONTRACT` AC-9 | add (status `implemented` to `approved`) | No requirement named a minimum VS Code version, so manifests and tests had nothing to trace to. The minimum is a package-contract property: one `engines.vscode` value for every publishable package. |
| `SPEC_REL_PKGCONTRACT` AC-9 | add (status `implemented` to `approved`) | Fixes `^1.144.0` in each package manifest, the root manifest and the lockfile workspace entries. |

| Decision or check | Evidence |
|---|---|
| Why one minimum for all: core's AHP client needs the Agent Host of 1.144.0, and every add-on declares a dependency on core. | `REQ_COM_*` / `SPEC_COM_*` (Agent Host client); add-on dependency in `REQ_MOD_ADDONS`. |
| No other spec states a minimum or `1.95`; user guides (`core.md`, `getting-started.md`) are Technical Writer scope. | Grep of `docs/**/*.rst` for `1.95`, `engines`, `^1.` finds no minimum claim. |
| Historical release evidence (`releasenotes.md`, `releases/v0.32.0.md`: "checked on 1.143.1 and 1.144.0") stays as it is. | Scope of the Contract. |
| Strict build | `python -m sphinx -W -b html .` exits 0. |
| Status after Quality `proceed` at 9eeccf7e: both elements set from `approved` to `implemented` (manifests at b761150d, test at 9eeccf7e). Only the status changed, no text. | Architect, 2026-11-16. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Package manifests and release packaging | Minimum VS Code engine version changes | None needed beyond the Developer's manifest change. `Build-Vsix.ps1` packaged the six Marketplace VSIXs at 0.33.0 and each `extension.vsixmanifest` carries engine `^1.144.0`; `vsce` accepts it with `@types/vscode` `^1.85.0` (types stay at or below `engines`). Legacy `core-gh` is not built by that script; its manifest says `^1.144.0` and `release.yml` packages it the same way @ `ad702ae1`. |
| `release.yml` | No workflow change | No VS Code version is pinned in CI; the workflow only runs `vsce package` and `vsce publish`. |
| Windows Sandbox | Pinned VS Code already equals the new minimum | `Start-Sandbox.ps1` pins `1.144.0`; no change. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Set minimum supported VS Code version | Update root and package manifests and lockfile to `^1.144.0` | Update documentation only | The manifest is the install-compatibility declaration; documentation-only would leave the Marketplace minimum inconsistent. |
| Lockfile update | `npm install --package-lock-only --ignore-scripts` | Hand-edit eight entries | The tool changed exactly the eight `engines.vscode` lines. |
| `@types/vscode` `^1.85.0` | Left unchanged | Raise to 1.144 | Outside the AC-9 scope; it is the typing floor, not the install minimum, and stays below `engines`, as `vsce` requires. Open for the Architect if types should follow. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `package.json`, `packages/{core,core-gh,flow,kanban,mcp,pim,recorder}/package.json`, `package-lock.json` | `engines.vscode` is `^1.144.0` in all eight manifests and eight lock entries | `npx vitest run @ this commit`: 61 files, 677 tests passed |
| Remaining for the Technical Writer | `docs/user guides/core.md` line 3, `getting-started.md` line 7 and `packages/core/README.md` line 69 still say 1.95.0 | n/a |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Every manifest (root plus each `packages/*`, discovered) declares `engines.vscode` `^1.144.0`; lockfile entries agree; `@types/vscode` not above the engine | system | `REQ_REL_PKGCONTRACT` AC-9, `SPEC_REL_PKGCONTRACT` AC-9 | `src/tests/vscode-minimum-engine.test.ts` (11 tests pass; `npx vitest run src/tests/vscode-minimum-engine.test.ts`) |
| Packaged VSIX carries the engine | system | same | Quality's `Build-Vsix.ps1` run; Admin recorded six VSIXs at `^1.144.0` |
| Documentation states 1.144.0 or later | validation | Contract Observable Outcome | User validation; no requirement-level document test (the user guides are prose) |

No UAT scenario: the manifest check is fully automatable and the live install refusal on an older VS Code is VS Code's behaviour, not Jarvis's.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** pending | complete | not applicable

| Document | Required update | Evidence |
|---|---|---|
| `packages/core/README.md` | State VS Code 1.144.0 or later as the minimum; remove the misleading 1.95.0 manifest-minimum claim. | done, this commit |
| `docs/user guides/core.md` | State the minimum consistently and retain only accurate current compatibility guidance. | done, this commit |
| `docs/user guides/getting-started.md` | State VS Code 1.144.0 or later is required for installation/use. | done, this commit; also the Agent Host remark |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed`. Open Findings is `None`. Reviewed at 9eeccf7e.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Full branch diff against the merge base with `development` | 7 commits, 16 files: 8 manifests, 8 lock entries, REQ/SPEC AC-9, 3 documents, 1 test, Contract | Only `engines.vscode` lines changed in manifests and lockfile (16 lock-diff lines = 8 pairs); no `packages/*/src` change; `git grep 1.95` outside historic files and the Contract finds nothing | None | none |
| Documentation honesty | `core.md`, `getting-started.md`, `packages/core/README.md` | Each says 1.144.0 or later; the 1.143.1 evidence remark is kept as tested history and names 1.144.0 as the declared minimum | None | Wording acceptance is User validation |
| Mutation check | `src/tests/vscode-minimum-engine.test.ts` | `packages/pim/package.json` set to `^1.95.0`: 1 of 11 tests failed; file restored with `git checkout --` | None | none |
| Specification trace | `REQ_REL_PKGCONTRACT` and `SPEC_REL_PKGCONTRACT` AC-9 | AC-9 text matches the manifests, root and lockfile; the test header cites both IDs | Observation at 9eeccf7e: both elements were `approved` though implemented and tested; the Architect moved both to `implemented` at d0945ed8 (status only), so the observation is resolved | none |

### Test Execution

When package manifests or READMEs change, Quality also packages all VSIXs with `test-environments/windows-sandbox/Build-Vsix.ps1` without starting the Sandbox.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ 9eeccf7e | pass |
| Lint | `npm run lint` @ 9eeccf7e | pass: 0 errors, 163 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ 9eeccf7e | pass: 62 files, 688 tests |
| Strict docs build | `python -m sphinx -W -b html docs docs/_build/html` @ 9eeccf7e | pass |
| Re-review of status-only delta | `git diff 9eeccf7e c33bbdf6 -- packages src package.json package-lock.json` (empty); `python -m sphinx -W -b html docs docs/_build/html` @ c33bbdf6 | pass: d0945ed8 only moved `REQ_REL_PKGCONTRACT` and `SPEC_REL_PKGCONTRACT` from `approved` to `implemented`; the AC-9 criteria are implemented and tested, so the judgment stays `proceed` |
| VSIX packaging | `Build-Vsix.ps1` @ 9eeccf7e | pass: six Marketplace VSIXs at 0.33.0; each `extension.vsixmanifest` has Engine `^1.144.0`; `core-gh` is not built by the script, its manifest is checked by the new test |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

Keep this table synchronized with currently open findings, including every failing test. For each finding, Quality transfers current responsibility to the owner of the affected artifact. When Quality confirms the required outcome, remove the row. At closure this table contains `None`.

| Artifact | Current finding | Required outcome |
|---|---|---|
| None | | |

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** pending | accepted | changes requested | not applicable

After Quality's `proceed`, the Project Manager presents the observable outcome. The User confirms the documented and declared minimum; the Project Manager records the decision here.

| Validation | Observation | Date |
|---|---|---|
| Review minimum VS Code version in manifests and current installation documentation | Accepted: `^1.144.0` is consistently declared; current docs require 1.144.0 or later, and 1.143.1 is retained only as historical test evidence. | 2026-11-16 |

**Decision:** accepted

## Closure

**Owner:** Project Manager<br>
**Status:** pending | closed

- [ ] Every included artifact or gate has terminal status and completion evidence.
- [ ] Intent and outcome are `approved`.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [ ] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [ ] Current blocker is `none`.
- [ ] Header Status is `closed`.

**Final outcome:** {accepted result and integration commit}
