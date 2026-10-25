# Change Contract: extension-readiness-and-suite-retirement

**Status:** closed<br>
**Process owner:** Project Manager<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-10-23<br>
- **Operation Mode**: user-guided

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User approved the intent, user-guided Operation Mode, and Contract release in chat (2026-10-23). Scope widened on 2026-10-23 to remove the Suite completely. On 2026-10-24, the User also approved retiring the legacy Change generator, npm command, and template.

### Handover log

Owned by: Project Manager

Append one line as the last act before handing over to the next appropriate Actor in the development flow.

| Date | Time | From | To | Note |
|--|--|--|--|--|
|2026-10-23 | 21:12 | Project Manager | Architect | create spec |
|2026-10-23 | 21:12 | Architect | Project Manager | spec completion |
|2026-10-23 | 21:42 | Project Manager | Architect | User approved the specification; set the Need statuses to approved, then hand off directly to Technical Writer, not PM. |
|2026-10-23 | 21:44 | Architect | Technical Writer | User-approved Needs set to approved; strict Sphinx validation passed. |
|2026-10-23 | 21:52 | Technical Writer | Admin | Documentation impact complete; Admin can progress the pending infrastructure row. |
|2026-10-23 | 22:40 | Admin | Architect | User widened the scope to complete Suite removal; the approved specification must change first. Admin row pending; Product Specification and Documentation Impact rows reopen with their owners. |
|2026-10-24 | 10:16 | Architect | Admin | User approved the revised specification directly in chat; Needs set to approved, strict Sphinx passed. Admin can do the infrastructure work. |
|2026-10-24 | 10:27 | Admin | Developer | Infrastructure work complete. Open for you: `updateCheck.ts` line 133 and `src/tests/message-flow-manifest.test.ts` (its file fails to load without `packages/suite/package.json`). |
|2026-10-24 | 10:45 | Developer | Tester | Implementation and unit verification complete in `a67e1e3`: Suite mapping removed from `updateCheck.ts`, Suite manifest test removed, new `update-install-mapping.test.ts` covers `REQ_REL_UPDATEINSTALL` AC-1. Test design is yours. |
|2026-10-24 | 11:10 | Project Manager | Technical Writer | Quality identified `docs/user guides/suite.md` as a current support reference. Remove it and its links from `index.md` and `getting-started.md`; preserve historical release notes, run strict Sphinx, then hand directly to Quality for re-review. |
|2026-10-24 | 11:25 | Technical Writer | Quality | Removed Suite guide and navigation references; strict Sphinx passed without warnings. Documentation Impact complete; re-review is pending. |
|2026-10-24 | 11:44 | Project Manager | Technical Writer | User reports the Suite still appears in a User Guide view after removal. No Suite references appear in the current guide sources at `60f7b9c`; identify the rendered/source mismatch, resolve it, run strict Sphinx, then hand directly to Quality for re-review. |
|2026-10-24 | 11:55 | Technical Writer | Project Manager | Stale local HTML was the cause; clean rebuild refreshed the actual preview and removed orphaned Suite HTML. User directed return to PM; no further source change. |
|2026-10-24 | 11:58 | Project Manager | Quality | Re-review the regenerated preview output and verify the Suite page/navigation are absent; strict Sphinx and output evidence are recorded at `864ea07`. User reports Marketplace unpublish complete. |
|2026-10-24 | 12:52 | Quality | Project Manager | Judgment `proceed` at `841f464` stands; header reconciled to Project Manager in this commit. Quality holds no open action. The Quality Review evidence predates the scope expansion and needs re-judgment after the Project Manager updates scope. |
|2026-10-24 | 12:58 | Project Manager | Architect | User approved retirement of the legacy Change generator, `npm run new-change`, and its template. Specify impacts before Admin and Developer proceed. |
|2026-10-24 | 13:01 | Architect | Admin | No Need names the Change generator, npm command or template, so no specification change is required; evidence is in Product Specification. Check task/build/workflow references, then hand to the Developer. |
|2026-10-24 | 13:02 | Admin | Developer | Infrastructure check complete: only `package.json` line 29 and `scripts/new-change.mjs` reference the generator; the template is already removed. Delete the script and the npm alias. |
|2026-10-24 | 13:06 | Developer | Tester | Generator retired in `c80525b`: `scripts/new-change.mjs` deleted, `new-change` alias removed from `package.json`; the template was already absent. Test Design for the expanded scope is yours. |
|2026-10-24 | 13:15 | Tester | Quality | Test Design for the expanded scope complete: new `legacy-change-generator-retired.test.ts` and a Suite user-guide absence check; both Tester files pass 11 of 11 and fail when the retired files are re-created. Re-judgment of the expanded scope is yours. |
|2026-10-24 | 13:20 | Quality | Technical Writer | Quality's expanded-scope review found no test finding: all five affected files pass 27 of 27 and the full suite passes 665 of 665 at `23846aa`. Please complete the pending Documentation Impact review: verify maintained contributor docs do not direct users to the retired generator/template, run the clean strict Sphinx build, update your artifact row, and hand directly back to Quality. Quality Review remains in progress pending this gate. |
|2026-10-24 | 13:20 | Technical Writer | Quality | Contributor-documentation review complete: no current generator/template instructions, canonical Contract process verified, clean strict Sphinx and local preview checks passed. Final Quality judgment for the expanded scope remains yours. |
|2026-10-24 | 13:22 | Quality | Project Manager | Quality reviewed the expanded scope and records `proceed`; `Open Findings` is `None`. Five affected files pass 27 of 27; full suite passes 665 of 665; clean strict Sphinx passes and the rebuilt preview has no Suite page or navigation. User validation of the expanded scope remains pending. |


### Goal

Make the maturity and availability of Jarvis PIM and Jarvis Syspilot clear and accurate to users, remove the Jarvis Suite completely, and retire the obsolete Change scaffolder.

### Value

Users should not mistake an externally maintained email-triage skill that is not yet part of a Jarvis PIM release for a Jarvis PIM capability, rely on Jarvis Syspilot through the upcoming syspilot 0.10 release, or look for a Jarvis Suite that Jarvis no longer supports. Contributors should not generate new Changes from the obsolete pre-contract template.

### Scope

Prominently mark Jarvis PIM as `EXPERIMENTAL` and state that it does not provide email triage in Jarvis; email triage remains in an externally maintained skill that is not yet part of a Jarvis PIM release. Mark Jarvis Syspilot `EXPERIMENTAL — DO NOT USE` because the upcoming syspilot 0.10 release will break it. Remove the Jarvis Suite completely: delete `packages/suite`, its packaging, GitHub Release and Marketplace publish steps, and every current support or distribution reference; historical release notes stay as history. Remove the obsolete `.github/templates/change-document.md`, `scripts/new-change.mjs`, and the `new-change` npm script; do not replace the generator, since new Changes use the current Contract process and the old script creates obsolete Change documents. The Marketplace action is the User unpublishing `enthali.jarvis-suite`, which keeps the extension ID and statistics. Deleting already-published GitHub Release assets and permanently removing the Marketplace extension ID are open and are not performed without explicit clarification from the User. This change does not implement email triage, repair Syspilot, or unpublish PIM or Syspilot.

### Observable Outcome

The root README and affected extension pages prominently show the agreed warnings and PIM limitation. The repository has no `packages/suite` and no Suite packaging, release or publish step; future releases carry no Suite GitHub Release asset and no Suite Marketplace publication. The obsolete Change template, generator, and npm command are absent; `docs/Jarvis Contracts/change.md` remains the canonical process. The Suite listing is unpublished by the User, while its Marketplace statistics and extension ID are preserved; existing installations are not removed.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved |
| Version control | yes | Project Manager | Squash-integrated into `development` at `f3aed83`; feature branch retained | merged |
| Product specification | yes | Architect | No Need governs the retired generator, npm command or template; no specification change is required; the Suite Needs stay approved | complete |
| Infrastructure impact | yes | Admin | Confirm task/build/workflow references for the retired generator and command are removed or unaffected | complete |
| Documentation impact | yes | Technical Writer | Maintained contributor docs do not reference the retired generator/template; canonical Contract process verified; clean strict Sphinx and local preview checks pass | complete |
| Implementation and unit verification | yes | Developer | Legacy template, generator, and npm command removed; targeted verification recorded | complete |
| Test design | yes | Tester | Tests or explicit verification for removing the legacy generator and command are recorded | complete |
| Quality review and test execution | yes | Quality | Re-review all expanded scope and record `proceed` with `Open Findings` as `None` | complete |
| User validation | yes | User | Validate the expanded cleanup; prior Suite/readiness acceptance is recorded separately | pending |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `docs/userstories/us_mod.rst` (`US_MOD_READINESS`) | revise, approved | State that the Suite is unsupported and removed from the repository and future distribution, while preserving installations and recorded open decisions. |
| `docs/requirements/req_mod.rst` (`REQ_MOD_READINESS`) | revise, approved | Make complete Suite removal and its non-destructive historical boundaries verifiable. |
| `docs/design/spec_mod.rst` (`SPEC_MOD_MONOREPO`, `SPEC_MOD_READINESS`, `SPEC_MOD_SUITE`) | revise, approved | Remove Suite from the target package layout and specify full retirement, not Marketplace unpublishing alone. |
| `docs/design/spec_rel.rst` (`SPEC_REL_COREGH`) | revise, stays draft (its status before this change; content User-approved) | Correct the release sequence and exclude future Suite packaging, GitHub upload, and Marketplace publication. |
| `docs/requirements/req_rel.rst` (`REQ_REL_UPDATEINSTALL`) | revise, approved (was implemented; code still maps the Suite until the Developer removes it) | Remove the Suite VSIX mapping and define behavior for installed IDs not supported by the updater. |
| `docs/requirements/req_cfg.rst` (`REQ_CFG_FILEPREFIX`) | revise, approved | Remove the retired Suite package name from current examples. |

| Decision or check | Evidence |
|---|---|
| Keep existing approved PIM capability and modular-install requirements unchanged; add a readiness story and requirement because PIM specifications describe implementation capabilities, not maturity or email-triage claims. | `get_need_links.py US_MOD_INSTALL --direction both --depth 2` and `get_need_links.py SPEC_MOD_PIM_PKG --direction both --depth 2` (both with `--ontology docs/jarvis-ontology.toml`); reviewed PIM stories/requirements; no existing approved requirement governs these disclosures. |
| Replace the Marketplace-only Suite retirement with complete removal from the repository and future release channels; retain historical GitHub assets and the Marketplace ID unless the User separately decides otherwise. | User-approved widened intent recorded in Contract commit `d0c7cf2`; the User approved the exact revised Need wording directly in chat on 2026-10-24. |
| Correct stale release documentation: `SPEC_REL_COREGH` omitted Suite, while the current workflow packages it, uploads it to GitHub Releases, and publishes it to the Marketplace. | `SPEC_REL_COREGH` depth-2 query; direct inspection of `.github/workflows/release.yml`; `US_REL_MARKETPLACE` impact output includes publishing requirements. |
| Remove the Suite update mapping; installed Suite copies then receive no updates and are not uninstalled. Keep the existing fallback when no mapped installed extension matches any release asset. | `REQ_REL_UPDATEINSTALL` depth-2 query and current mapping; this consequence is explicit in the revised draft. |
| Remove the stale `jarvis-suite` example from the file-prefix requirement and the Suite entry from the target package layout. | `REQ_CFG_FILEPREFIX` and `SPEC_MOD_MONOREPO` depth-2 queries; current requirement and layout text. |
| The test `src/tests/message-flow-manifest.test.ts` reads `packages/suite/package.json` and names `SPEC_MOD_SUITE`; it will need removal or replacement by implementation/test owners after approval. | Targeted search in `src/**`; out of Architect's Product Specification ownership. |
| Previously published GitHub assets and permanent Marketplace extension-ID removal remain open; neither is authorized by the widened scope as currently recorded. | Current Contract Scope; no historical-asset or permanent-ID deletion requirement added to the draft. |
| Retiring `scripts/new-change.mjs`, the `new-change` npm script and `.github/templates/change-document.md` needs no Need change: no story, requirement or design spec names them. | Text search of `docs/requirements`, `docs/design`, `docs/userstories` for `new-change`, `change-document.md`, `.github/templates`: no hit; repo-wide search outside `docs/changes` and actor memory finds only `package.json` line 29 and `scripts/new-change.mjs`. `get_need_links.py` for `REQ_DEV_CONVENTIONS` (depth 2) and `US_DEV_CONVENTIONS` (depth 1) returns only `SPEC_DEV_CONVENTIONS`, `US_DEV_CONVENTIONS`, `US_REL_GITWORKFLOW`. |
| The generator and `package.json` alias still reference the deleted template, so `npm run new-change` fails on this branch until the Developer removes them. | `scripts/new-change.mjs` line 14 reads `.github/templates/change-document.md`; the template is absent. |
| Observation, outside this Contract: `REQ_DEV_TESTSUMMARY`, `SPEC_DEV_IMPLTEST`, `SPEC_DEV_TESTPROTOCOL` and `REQ_REL_BRANCHNAMING` (AC-2) still describe the pre-Contract "Change Document" process. They do not depend on the generator or template, so they are untouched here; their retirement or rewrite is for the Project Manager to schedule. | Read in `req_dev.rst`, `spec_dev.rst`, `req_rel.rst`. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.github/workflows/release.yml` | Removed the Suite package step, the `packages/suite/*.vsix` upload glob and the Suite Marketplace publish step. | Done; the workflow parses as YAML (21 steps) and contains no `suite` reference. |
| `packages/suite/` | Deleted the folder (`package.json`, `README.md`, `.vscodeignore`) and the dangling `node_modules/jarvis-suite` link. | Done; `npm run compile:packages` exits 0. |
| `package-lock.json` | Removed the `node_modules/jarvis-suite` and `packages/suite` entries. | Done; `npm install --package-lock-only --ignore-scripts` leaves the file unchanged, so the lock file is consistent. |
| Build, task and test tooling | No other reference found in `package.json`, `.vscode`, workflows or `scripts`; `npm run compile:packages` loses no step, because the Suite has no compile script. | Strict Sphinx build passes (exit 0). `npx vitest run`: 648 tests pass; the file `src/tests/message-flow-manifest.test.ts` fails to load (ENOENT `packages/suite/package.json`), which is the Developer's row. |
| Marketplace listing and published GitHub assets | The User unpublishes the listing with the publisher account. Deleting published assets and permanently removing the extension ID are open. | Not performed by Admin; recorded as User action. |
| Legacy Change generator | Only `package.json` line 29 (`new-change` alias) and `scripts/new-change.mjs` reference the generator; the template `.github/templates/change-document.md` was removed in `f737557`. Deleting the script and the alias is the Developer's row. | Checked at `0ac99bf`: text search over `package.json`, `package-lock.json`, `README.md`, `.gitignore`, `.vscodeignore`, `.vscode`, `.github` (workflows, instructions), `scripts`, `docs` sources, package manifests and sources, `src`, `testdata` and the lint, test and TypeScript configs finds no other reference; no task, workflow or build step calls the command. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| How to retire the Suite update mapping | Delete the single `enthali.jarvis-suite` entry in `idToVsix`; keep the existing no-match fallback | Add an explicit "unsupported" branch or uninstall the Suite | `REQ_REL_UPDATEINSTALL` AC-1 says an unmapped installed ID receives no update and is not removed; the existing lookup already behaves that way, so no new code path is needed. |
| How to cover `SPEC_MOD_SUITE` in tests | Remove the `SPEC_MOD_SUITE` block and `suitePkg` from `message-flow-manifest.test.ts`; keep the `SPEC_MOD_FLOW_PKG` tests | Replace it with a test against another manifest | The block asserted the Suite `extensionPack`; the Suite no longer exists, so nothing remains to assert. |
| How to test `checkForUpdates` | Mock `vscode` and `https` in a new unit test; real file writes go to the temp directory | Extract the mapping into a pure function | `checkForUpdates` had no test; mocking needed no production change, which keeps the diff to one deleted line. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/engine/core/updateCheck.ts` | Removed the `enthali.jarvis-suite` entry from `idToVsix` | `npx vitest run src/tests/update-install-mapping.test.ts @ a67e1e3`: 3 tests pass. Mutation check (Suite entry re-added): 2 of 3 fail; file restored. |
| `src/tests/message-flow-manifest.test.ts` | Removed the `SPEC_MOD_SUITE` block and the `packages/suite/package.json` read | `npx vitest run src/tests/message-flow-manifest.test.ts @ a67e1e3`: 3 tests pass; the file loads again. |
| `src/tests/update-install-mapping.test.ts` | New: supported ID is installed, Suite ID is skipped, Suite-only installation downloads nothing and opens the release page | `@ a67e1e3`: 3 tests pass. |
| `scripts/new-change.mjs`, `package.json`, `.github/templates/change-document.md` | Deleted `scripts/new-change.mjs` and the `new-change` entry in `package.json`; the template was already removed in `f737557`; no replacement generator | `@ c80525b`: `package.json` parses; `npm run` lists no `new-change`; repo search over `package.json`, `package-lock.json`, `README.md`, `scripts`, `.github`, `.vscode`, `src`, package sources/manifests and docs sources finds no `new-change` or `change-document.md`; `npm run compile:packages` exits 0; `docs/build.ps1` (strict, `-W`) exits 0. |

Build: `npm run compile:packages` exits 0 @ a67e1e3 and @ c80525b. Full run `npx vitest run` @ a67e1e3: 652 of 654 pass, 2 timeouts of 5000 ms in the kanban files; a second run: 653 of 654, one timing failure in `touched-files-write-race.test.ts`; @ c80525b: 659 of 661, the same two kanban timeouts. Each failing file passes in isolation (kanban files: 29 of 29 in 0.5 s; write-race file: 10 of 10), so the failures look load-related; the Suite and generator changes touch none of them. The docs build was incremental ("no targets are out of date"), since this step changes no documentation source.

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Readiness disclosure in README, PIM and Syspilot user guides and package descriptions | system | REQ_MOD_READINESS AC-1..AC-3, SPEC_MOD_READINESS AC-1..AC-3 | `src/tests/extension-readiness-disclosure.test.ts` |
| Suite package absent, release workflow and root manifests free of Suite | system | SPEC_MOD_SUITE AC-1..AC-2, REQ_MOD_READINESS AC-4, REQ_REL_RELEASEACTION AC-7 | `src/tests/extension-readiness-disclosure.test.ts` |
| Suite user guide absent and not linked from the guide index or Getting Started | system | REQ_MOD_READINESS AC-4 (Suite removed from the repository); Contract Observable Outcome | `src/tests/extension-readiness-disclosure.test.ts` |
| Legacy generator, template and `new-change` npm script absent; `docs/Jarvis Contracts/change.md` remains | system | Contract Observable Outcome (no Need governs the generator; Architect recorded this) | `src/tests/legacy-change-generator-retired.test.ts` |
| Suite-free update install mapping (Developer unit test, not Tester-authored) | unit | REQ_REL_UPDATEINSTALL AC-1 | `src/tests/update-install-mapping.test.ts` |
| Marketplace unpublish keeps ID and stats; existing installs remain; historical GitHub assets | validation (manual, User) | US_MOD_READINESS AC-3, REQ_MOD_READINESS AC-4 | User validation procedure; not automated |

The absence checks were mutation-tested: re-creating `scripts/new-change.mjs` and `docs/user guides/suite.md` makes one test in each Tester file fail; the files were removed again. The Documentation Impact review confirmed no maintained contributor document directs users to the retired generator or template.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `README.md` | Prominently disclose PIM and Syspilot maturity and state that email triage remains in an external skill, not a Jarvis PIM release. | Reviewed against `REQ_MOD_READINESS` AC-3 and `SPEC_MOD_READINESS` AC-3. |
| `packages/pim/README.md`, `docs/user guides/pim.md` | Mark PIM `EXPERIMENTAL`; state email triage is external and not part of a Jarvis PIM release. | Reviewed against `REQ_MOD_READINESS` AC-1 and `SPEC_MOD_READINESS` AC-1. |
| `packages/pim/package.json` | Carry the PIM maturity and email-triage boundary in the Marketplace description. | Marketplace description matches `REQ_MOD_READINESS` AC-1. |
| `packages/syspilot/README.md`, `docs/user guides/syspilot.md` | Mark Syspilot `EXPERIMENTAL — DO NOT USE`; state the upcoming syspilot 0.10 release will break compatibility. | Reviewed against `REQ_MOD_READINESS` AC-2 and `SPEC_MOD_READINESS` AC-2. |
| `packages/syspilot/package.json` | Carry the Syspilot warning and expected compatibility break in the Marketplace description. | Marketplace description matches `REQ_MOD_READINESS` AC-2. |
| `docs/user guides/suite.md`, `docs/user guides/index.md`, `docs/user guides/getting-started.md`, rendered User Guide view | Sources were already correct; refreshed stale `docs/_build/html` with `docs/build.ps1 -Clean`, removing the orphaned Suite page and navigation. | Actual output check: `user guides/suite.html` absent; no `suite.html` navigation link in rendered root index, guide index, or Getting Started. User confirmed the build-refresh explanation and directed handoff back to PM on 2026-10-24. |
| `.github/templates/change-document.md`, references to `new-change` | No maintained contributor-document source edit required: no current guide directs contributors to the retired generator or template; historical Change records remain unchanged. | Technical Writer source search for `new-change`, `change-document.md`, `change:new`, and `new:change` found only the active Contract and historical Changes within repository documentation. Read `docs/Jarvis Contracts/index.md` and `change.md`: they direct contributors to the canonical Contract process and a tailored copy at `docs/changes/<change>.md`. `docs/build.ps1 -Clean` completed successfully with strict Sphinx; output redirected to a log without a pipe. Actual preview check: no Suite HTML page or Suite navigation in rendered entry pages. |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** Proceed at `c04d780` for the expanded scope. The Suite/readiness disclosures and retirement, plus removal of the legacy Change template, generator, and npm command, match the approved Contract outcome. All five affected test files pass 27 of 27 at `23846aa`; the full suite passes 665 of 665 across 64 files. The clean strict Sphinx build passes at `c04d780`; the rebuilt preview contains no Suite HTML page or navigation links. Documentation Impact is complete, and no verification finding is open. User validation of the expanded cleanup remains pending with the Project Manager.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Spec-to-code semantic comparison | SPEC_MOD_SUITE AC-1..AC-2, REQ_MOD_READINESS AC-1..AC-4, REQ_REL_UPDATEINSTALL AC-1, and Contract Observable Outcome for retiring the legacy generator | At `23846aa`, `packages/suite`, `.github/templates/change-document.md`, and `scripts/new-change.mjs` are absent; `package.json` has no `new-change` script; the update mapping has no Suite entry; `docs/Jarvis Contracts/change.md` remains. The new test asserts these generator outcomes. | No finding | The Architect reports no Need governs generator retirement; its test traces to Contract Observable Outcome. No ontology graph query. |
| Horizontal coverage (MECE) | PIM and Syspilot readiness peers, current Suite support/distribution references, contributor documentation for the retired generator | Searches of `docs/**`, `README.md`, and `docs/Jarvis Actors/**` for `new-change` and `change-document.md` found only the active Contract and historical Change records; no maintained contributor guide match. Technical Writer confirmed the canonical Contract process and no maintained instructions for the retired generator. | No current documentation reference found; no finding. | Text search plus artifact-owner review; strict Sphinx and preview verified separately. |
| Relationship analysis (trace) | Readiness/Suite Needs and Contract Observable Outcome for generator retirement to their verification tests | Read directly: generator-retirement tests trace to Contract Observable Outcome because no Need governs it; Suite/readiness tests trace to approved Needs. | No finding | Depth 1 by reading; no graph query. |
| Unit test review | `legacy-change-generator-retired.test.ts`, `extension-readiness-disclosure.test.ts`, and `update-install-mapping.test.ts` against the expanded outcomes | New tests verify template/script/alias absence, canonical Contract retention, and Suite guide removal from navigation. All five affected files pass 27 of 27 at `23846aa`. | No finding; 3 generator tests and the Suite-guide absence assertion cover the newly added outcomes. | Mutation results are Tester-reported; Quality did not rerun mutation tests. |


### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit.

| Test or run | Command and commit | Result |
|---|---|---|
| Affected files: extension-readiness-disclosure, update-install-mapping, message-flow-manifest, touched-files-write-race, legacy-change-generator-retired | `npx vitest run <5 files>` @ `23846aa` | pass: 27 of 27 |
| Full suite | `npx vitest run` @ `23846aa` | pass: 665 of 665 across 64 files in 19.34 s |
| Strict documentation build and preview | `docs/build.ps1 -Clean` with output redirected to a log @ `c04d780` | pass: exit 0; no `user guides/suite.html`; 0 Suite navigation hits in rendered root index, guide index, and Getting Started |

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
| Marketplace unpublish | User reports unpublish completed | 2026-10-24 |
| User-facing documentation | User reviewed the documentation and confirmed it is correct | 2026-10-24 |
| Legacy Change scaffolder retirement | User confirms the documentation review and removal; accepted | 2026-10-24 |

**Decision:** The User accepted the expanded outcome in chat on 2026-10-24: Marketplace unpublish complete, documentation reviewed, and legacy generator/template removal confirmed.

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

**Final outcome:** Jarvis Suite and the legacy Change scaffolder removed; PIM/Syspilot readiness disclosed; User validation accepted; squash-integrated into `development` at `f3aed83`. Feature branch retained.
