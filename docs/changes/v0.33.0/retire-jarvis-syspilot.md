# Change Contract: retire-jarvis-syspilot

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-15<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-15 | 10:09 | Project Manager | Architect | User approved Contract release; remove the Syspilot package and active repo/build/docs integration, preserve history, and defer Marketplace delisting/version to Release. |
| 2026-11-15 | 11:00 | Architect | Developer | Syspilot lifecycle specs deleted and every other spec reference removed; strict build passes. Code, tests, `release.yml` and user guides are listed under Product specification as left for their owners. |
| 2026-11-15 | 10:20 | Developer | Admin | Package, code, tests, `.mcp.json`, `.gitignore` done; full suite green. `release.yml`, `launch.json`, `tasks.json` and `package-lock.json` still name syspilot; the `.code-workspace` "sysPilot" folder and `.vscodeignore` `.syspilot/**` were left unassigned. |
| 2026-11-15 | 10:45 | Admin | Technical Writer | Release workflow, launch/tasks and lockfile no longer name syspilot; `.vscodeignore` `.syspilot/**` and the "sysPilot" workspace folder kept (docs framework, not the extension). |
| 2026-11-15 | 11:30 | Technical Writer | Tester | Syspilot guide deleted and its links removed; README carries a retirement notice (unreleased; Release assigns version and carries it into `docs/releasenotes.md`); Tester row is yours to decide. |
| 2026-11-15 | 11:45 | Tester | Quality | Test design complete; existing T-10 and absence/mapping tests cover the change, no new scenario; residual scan clean; live T-10 not executed. |
| 2026-11-15 | 12:05 | Quality | Project Manager | Judgment `proceed`, no open findings; added the blank line missing before the next heading in this log. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User confirmed retiring jarvis-syspilot in a Change, with Marketplace delisting deferred to a separate Release Contract, and selected autonomous mode in chat on 2026-11-15; this continues the User decision recorded on 2026-11-10.

### Goal

Jarvis no longer maintains or ships the jarvis-syspilot extension; its Marketplace listing is handled separately under a Release Contract.

### Value

Jarvis maintainers and users benefit from an explicit support boundary and removal of an integration extension that the User has decided will no longer be developed.

### Scope

Remove packages/syspilot and its active references in package manifests, dependencies, tests, build/release workflows, and current user-facing documentation. Preserve historical release and change records unless the Architect identifies a live reference that must change. Do not unpublish the Marketplace listing in this Change; record it as a separate Release action. Release version and whether to bundle already-closed fixes are deferred to release planning.

### Observable Outcome

No active package or release workflow builds or publishes jarvis-syspilot; active documentation no longer presents it as maintained; focused tests and package/build checks pass; historical records are retained; Marketplace delisting is explicitly assigned to a later Release Contract.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved |
| Version control | yes | Project Manager | Local branch `feature/retire-jarvis-syspilot`; squash-integrated into `development` at `1999480f`; the branch is retained | merged |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | proceed |
| User validation | yes / not applicable: {explicit User delegation recorded in this row} | User | Observable outcome is accepted or changes are requested | pending / accepted / changes requested / not applicable |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `US_SPL_LIFECYCLE` (`us_spl.rst`), `REQ_SPL_*` (`req_spl.rst`), `SPEC_SPL_*` (`spec_spl.rst`), `SPEC_MOD_SPL_PKG` | remove | The lifecycle feature exists only in the retired package; git history and `docs/changes` keep the record, as for the earlier hook removal. Toctrees and the `SPL` theme in `namingconventions.rst` removed. |
| `REQ_MOD_ADDONS` AC-7, `REQ_MOD_READINESS` AC-2/AC-3, `US_MOD_READINESS` AC-2, `SPEC_MOD_READINESS` AC-2/AC-3 | modify | Syspilot is retired, not "experimental"; Marketplace unpublish is a User action in a later Release Contract. Modelled on the Suite retirement (`SPEC_MOD_SUITE`). |
| `SPEC_MOD_MONOREPO`, `SPEC_MOD_ADDON_ONBOARDING` | modify | Layout and shipped add-on list no longer name syspilot. |
| `REQ_REL_UPDATEINSTALL`, `SPEC_REL_UPDATENOTIFY`, `SPEC_REL_COREGH` | modify | The VSIX mapping drops the syspilot row; an installed unmapped ID is not updated or removed (`REQ_REL_UPDATEINSTALL` AC-1, unchanged). Release sequence no longer packages syspilot. |
| `US_UAT_SELFUPDATE` AC-5/AC-6/T-10, `REQ_UAT_SELFUPDATE` AC-5, `SPEC_UAT_SELFUPDATE` T-10 | modify | T-10 now checks that an unmapped extension is left alone. The duplicate AC-6 is dropped. |
| `SPEC_ENG_*` (core API, tool references, `listActors` consumers), `REQ_ENG_*`, `SPEC_CFG_*`, `REQ_CFG_*`, `SPEC_DEV_*` | modify | Remove syspilot as sender, tool package, settings group, state file `.jarvis/syspilot-state.json` and launch/compile target. Registered tool count 21 to 19. |

| Decision or check | Evidence |
|---|---|
| Unchanged on purpose: the syspilot agent files, the syspilot Change process and the syspilot docs framework are not the extension. | `us_rel`, `req_rel` AC for hotfix process, `spec_dev` agent steps, `docs/index.rst`. |
| Historical records stay: `docs/changes/**`, `docs/releasenotes.md`, `docs/releases/**`. | Scope of this Contract. |
| Marketplace unpublish of `enthali.jarvis-syspilot` is a User action in a later Release Contract. | `REQ_MOD_READINESS` AC-2. |
| Strict build | `python -m sphinx -W -b html .` exits 0 at the commit of this handover. |
| Left for other owners | Developer: `packages/syspilot`, `packages/core` (`types.ts`, `updateCheck.ts` idToVsix, README), tests `coreApi`, `extension-readiness-disclosure`, `syspilot-migration`, `syspilot-versioncheck`, `update-install-mapping`, `.mcp.json`. Admin: `release.yml`, `.vscode/launch.json` and `tasks.json`, `package-lock.json`. Technical Writer: `docs/user guides/syspilot.md` and its links in `index.md`, `core.md`, `getting-started.md`, root README. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.github/workflows/release.yml` | Packaged, released and published syspilot | Three syspilot steps/globs removed; YAML parses. |
| `.vscode/launch.json`, `tasks.json` | Syspilot launch configs and compile tasks | Syspilot-only configs and tasks removed; "compile all" and the former "except Syspilot" config merged into "Run All (Core + PIM + Recorder + MCP + Flow + Kanban)"; both parse. |
| `package-lock.json` | Workspace entry and nested esbuild entries | Regenerated with `npm install --package-lock-only`, stale entry removed; 0 syspilot matches, second run stable. Stale `node_modules/jarvis-syspilot` junction deleted. |
| `.vscodeignore` `.syspilot/**`, `.vscode/jarvis.code-workspace` "sysPilot" folder | Concern the syspilot docs framework, not the extension | Left unchanged (same reason as Architect's "unchanged on purpose"); Developer's other open items `test-environments/windows-sandbox/README.md` and the `Syspilot Setup Engineer` fixture are not Admin's. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Installed syspilot extension after update | Mapping row removed; an installed unmapped ID is neither updated nor removed | Keep a removal row | `REQ_REL_UPDATEINSTALL` AC-1 leaves unmapped IDs alone; `update-install-mapping.test.ts` covers it. |
| Sender example and `SPEC_SPL_NOTIFY` references | `jarvis-pim` and `SPEC_ENG_API AC-8` | Delete the examples | Keeps the API documentation concrete. |
| Stale untracked `packages/suite` (only a gitignored VSIX) | Deleted from disk | Leave it | It failed the Suite-absence test; not tracked, so no diff. |
| Not touched | `.vscode/jarvis.code-workspace` "sysPilot" folder, root `.vscodeignore` `.syspilot/**`, `test-environments/windows-sandbox/README.md`, fixture actor `testdata/.jarvis/actors/Syspilot Setup Engineer` | Remove them | Not assigned in the Contract; they relate to the syspilot docs framework or fixtures. Admin or Architect decide. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/syspilot/**` | removed | `extension-readiness-disclosure.test.ts` AC-2 asserts the directory is absent |
| `syspilot-migration.test.ts`, `syspilot-versioncheck.test.ts` | removed with the package | n/a |
| `core`: `updateCheck.ts`, `configPaths.ts`, `types.ts`, `coreApi.ts`, README | syspilot row, state path and references removed | `update-install-mapping`, `coreApi`, `tool-reference-namespace` (19 tools) tests |
| `.mcp.json`, `.gitignore` | syspilot entries removed | n/a |
| `agents-window-and-flow-click`, `ahp-interface-surface` tests | `syspilot` dropped from package lists | `npx vitest run`: 61 files, 677 tests passed; `tsc --noEmit` clean for all six packages |
| Remaining for others | Admin: `release.yml`, `launch.json`, `tasks.json`, `package-lock.json`. Writer: syspilot user guide and its links. | n/a |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Unmapped installed extension (e.g. `enthali.jarvis-syspilot`) neither updated nor removed | system / validation | `REQ_REL_UPDATEINSTALL` AC-1, `REQ_UAT_SELFUPDATE` AC-5 | `us_uat_selfupdate.rst` T-10; `update-install-mapping.test.ts` |
| `packages/syspilot` absent | system | `REQ_MOD_READINESS` AC-2 | `extension-readiness-disclosure.test.ts` |
| Registered tool count 19, no syspilot in core API | system | `SPEC_ENG_*` | `coreApi`, `tool-reference-namespace` tests |

No new scenario needed: Architect's T-10 already covers the one behavioural change; the rest is removal, proven by absence tests. Residual scan of tracked files outside `docs/changes`, `docs/releases`, releasenotes: only the intended README notice, spec/req retirement notes, T-10 and the two tests. The four test files pass (45 tests); strict `sphinx -W` build passes. Live T-10 execution not run.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/syspilot.md` | deleted (retired package) | this change's commit |
| `docs/user guides/index.md`, `core.md`, `getting-started.md` | guide links, toctree entry and 'Syspilot was not checked' remarks removed | same |
| Root `README.md` | 'EXPERIMENTAL' banner replaced by a retirement notice: no longer developed or shipped, installed copy neither updated nor removed by Jarvis, uninstall manually; 0.31.1 history sentence made past tense; syspilot framework line unchanged | same |
| `docs/releasenotes.md` | Retirement note for a future public release | Deferred to the later Release Contract; no release selected in this Change | not applicable |
| `test-environments/windows-sandbox/README.md` | no edit: already states Syspilot is excluded | checked |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed`. The `jarvis-syspilot` package and every active build, release, manifest, test and user-guide reference are gone; specs state the retirement and the unmapped-extension behaviour; no open finding. Marketplace delisting and the version stay with a later Release Contract, as scoped.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Residual scan | `git grep -i syspilot` outside `docs/changes`, `docs/releases`, `docs/releasenotes.md`, `.syspilot` @ 76848482 | Remaining hits are the syspilot docs framework (skills, agents, `docs/conf.py`, ontology, `.vscodeignore`, workspace folder), the intended README notice, retirement ACs in spec/req/UAT, `actor` fixtures and tests using `syspilot.*` agent names, and the two tests that name the retired ID; none in `packages/`, `release.yml`, `.vscode/launch.json`/`tasks.json`, `package.json`, `.mcp.json`, `package-lock.json`; none in the six built VSIX | no finding | Judging "framework, not extension" rests on the Architect's decision recorded in the Contract |
| Relationship trace | `REQ_MOD_READINESS` AC-2, `REQ_MOD_ADDONS` AC-7, `REQ_REL_UPDATEINSTALL` AC-1, `REQ_UAT_SELFUPDATE` AC-5/T-10; `updateCheck.ts` mapping, tests | The mapping row is removed, so an installed unmapped ID is left alone; `update-install-mapping.test.ts` asserts no download or uninstall for `enthali.jarvis-syspilot`; absence test AC-2 asserts the package directory is gone; tool count 19 asserted | no finding | Semantic read, no Sphinx-Needs link query |
| Peer coverage (MECE) | The retired-extension statements in `spec_mod.rst`, `req_mod.rst`, `us_mod.rst` (Suite and Syspilot) | Both retirements are stated in parallel form, each with its own ACs; no contradiction with the unchanged syspilot-agent and Change-process text | no finding | Peer set chosen by me |
| Test review | Edited tests | They assert the changed behaviour (absence, mapping, count); sender examples moved to `jarvis-pim`. Observation: whitespace slip in `tool-reference-namespace.test.ts` (title "unique     across", over-indented `expect`) is cosmetic | observation only | No mutation run: removal change, absence tests are the evidence |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ 76848482 | pass: 61 files, 677 tests |
| Type check | `npx tsc --noEmit -p packages/core` @ 76848482 | pass |
| Strict docs build | `python -m sphinx -W -b html docs` @ 76848482 | pass |
| Config parse | `release.yml` (YAML), `.mcp.json`, `package.json` (JSON) @ 76848482 | pass |
| VSIX packaging | `pwsh -NoProfile -File test-environments/windows-sandbox/Build-Vsix.ps1` @ 76848482 | pass: six packages 0.32.0; no `syspilot` text in any VSIX |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

None

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome. The User executes the validation procedures and communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| Automated retirement evidence | User accepted the automated evidence: retired package absent, unmapped installed extension neither updated nor removed, and no syspilot in six built VSIX; no EDH T-10 run requested. Marketplace delisting remains for a later Release Contract. | 2026-11-15 |

**Decision:** accepted — User selected acceptance based on automated evidence on 2026-11-15.

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
- [x] Header Status is `closed`.

**Final outcome:** User accepted the automated retirement evidence; the Syspilot package and active integration were removed and squash-integrated into `development` at `1999480f`. The feature branch is retained. Marketplace delisting and release notes are deferred to a later Release Contract.
