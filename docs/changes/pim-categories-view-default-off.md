# Change Contract: pim-categories-view-default-off

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-04<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered. Specifics agreed with the User on 2026-11-04: none beyond the mode (changed from user-guided to autonomous at the User's request, because the change is small).

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-04 | 14:38 | Project Manager | Architect | Contract initialized and released by the User; Operation Mode is autonomous. Scope B only: the default of `jarvis.pim.showCategories` changes to `false`; view, commands, tool and task `categories` field stay. Specification statements naming the default are at least `us_pim.rst`, `req_pim.rst`, `spec_pim.rst` (manifest snippet and setting), `spec_cfg.rst` and the `us_uat_outlookcategories` set. |
| 2026-11-04 | 14:55 | Architect | Developer | Specification done: default is `false` in `US_PIM_CATVIEW` AC-4, `REQ_PIM_CATVIEW` AC-4 and `SPEC_PIM_CATVIEW` (setting snippet); all three are `draft` until User approval. Implement the `package.json` default `false` plus unit tests; `when` clause unchanged. Known to the Developer's attention: the UAT set, `spec_cfg` and `spec_olk` name no default, so they are unchanged. |
| 2026-11-04 | 14:55 | Developer | Technical Writer | Implemented: `packages/pim/package.json` default `false`, new test `src/tests/pim-categories-default.test.ts`; build and Build-Vsix pass, unit tests pass (one load-dependent timeout in `legacy-hook-files.test.ts`, passes alone). Spec elements were approved at ab4502b. |
| 2026-11-04 | 15:40 | Technical Writer | Tester | Guide `pim.md` and `packages/pim/README.md` now state default `false`; strict docs build passes. Product Specification recorded complete with User approval evidence (PM request). Release still needs a migration note in `releasenotes.md`. Test Design is next. |
| 2026-11-04 | 18:55 | Tester | Quality | Test Design done: Developer's manifest test reviewed (2 pass); new validation scenario T-52 (hidden by default) added to `US_UAT_CATVIEW` and `SPEC_UAT_CATVIEW_FILES`, NOT RUN; strict docs build passes. Pre-existing UAT inconsistencies (T-13/T-19 key name, T-19 vs `when` clause) noted in Test Design for the Architect. Release note still open. |
| 2026-11-04 | 18:58 | Quality | Project Manager | Review done: judgment `proceed` @ 3b7177a, Open Findings None; full suite 701/701, build, Build-Vsix and strict docs build pass, mutation of the default fails the new test. T-52 is NOT RUN and is the User's validation. Observations for the Architect (REQ AC-6/SPEC `when` clause drift, T-13/T-19 key name and T-19 versus `when`) and the open release note are non-blocking. |
| 2026-11-09 | 11:50 | Project Manager | none | User accepted T-52; Contract closed and squash-integrated into `development`. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-04, in chat with the Project Manager: PIM no longer uses Outlook categories the way it once did; the Categories tree should not be shown by default. Of the three scope options offered (A remove the tree, B default off, C remove the whole category feature, backlog #23), the User chose B: "Tree nicht mehr per Default anzeigen (Setting-Default false); sonst nichts ändern".

### Goal

The Categories view in the Jarvis sidebar is no longer shown by default. The default of `jarvis.pim.showCategories` changes from `true` to `false`; a user who sets it to `true` (with `jarvis.outlook.enabled`) still gets the view.

### Value

Users who enable Outlook no longer get a Categories tree that PIM does not use the way it was designed for. The view stays available to those who want it, so nobody loses a function.

### Scope

Changes: the default value of `jarvis.pim.showCategories` and every statement that names that default (specification, user-facing documentation, tests).

Stays unchanged: the Categories view itself and its `when` clause, the Refresh, Rename and Delete Category commands, the tool `jarvis_pim_category`, the `categories` field of the task tool, and `jarvis.outlook.enabled` (default `false`). Removing the category feature as a whole stays with backlog #23 and is not part of this change.

### Observable Outcome

- With default settings plus `jarvis.outlook.enabled: true`, the sidebar shows no Categories view.
- With `jarvis.pim.showCategories: true` and `jarvis.outlook.enabled: true`, the Categories view appears as before.
- The setting default is `false` in the manifest, and specification and user documentation state the same default.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (User, 2026-11-04 14:37, chat with the Project Manager: "stell ihn auf autonomous um und schick ihn los") |
| Version control | yes | Project Manager | Local branch `feature/pim-categories-view-default-off`; squash-integrated into `development` at closure; the branch is retained | merged |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete (see Product Specification) |
| Infrastructure impact | not applicable: only a setting default changes; the Sandbox script `Start-VSCode.ps1` and the test workspaces set `showCategories` explicitly (Admin confirms or flips this row) | Admin | Affected infrastructure artifacts are updated, or none is affected | not applicable |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | done (see Documentation Impact) |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | done (see Implementation And Unit Verification) |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | done (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | done: `proceed` @ 3b7177a, Open Findings None (see Quality Review) |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (User, 2026-11-09) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | done |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

**Approval evidence:** User approved US/REQ/SPEC_PIM_CATVIEW on 2026-11-04 via the Project Manager; elements approved at de815e4, status set in ab4502b. Recorded by the Technical Writer on the Project Manager's request; the Architect's strict build passed.

| Artifact | Change | Rationale |
|---|---|---|
| `US_PIM_CATVIEW` (`us_pim.rst`) | modify AC-4: view is hidden by default, user can turn it on (outcome only, no setting name); status `draft` | Approved scope B; the story carries no mechanism |
| `REQ_PIM_CATVIEW` (`req_pim.rst`) | modify AC-4: default `true` to `false`; status `draft` | Mechanism of the default belongs to the requirement |
| `SPEC_PIM_CATVIEW` (`spec_pim.rst`) | modify setting snippet: `"default": false`; status `draft` | The manifest snippet is what the Developer implements |

| Decision or check | Evidence |
|---|---|
| Impact analysis by text search of `docs/` for `showCategories` and Categories-default statements | Statements of a default exist only in the three elements above (plus the historic `changes/v0.5.0/val-outlook-categories.md`, a closed record, left as is) |
| Unchanged, because they set the value explicitly or name no default | `US_UAT_CATVIEW` T-13..T-19 and `SPEC_UAT_*` set `showCategories` in their setup; `SPEC_CFG_VIEWGATING` and `spec_olk.rst` name only the `when` clause and the shared group; `when` clause stays |
| Strict Sphinx build | `docs/build.ps1` (`-W`) passes; CRLF kept |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** done

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Where to assert the default | Manifest-reading vitest in `src/tests/` (pattern of `mcp-default.test.ts`); no package-local tests exist for `pim` | Test inside `packages/pim` | The root vitest run is the existing home for manifest invariants |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/pim/package.json` | `jarvis.pim.showCategories` default `true` to `false`; `when` clause unchanged | `npx vitest run` @ ab4502b + working tree: 700 of 701 passed; the one failure (`legacy-hook-files.test.ts`, source-tree walk) hit a timeout under full-suite load and passes alone (11 of 11) |
| `src/tests/pim-categories-default.test.ts` (new) | Asserts type boolean, default `false`, and the unchanged `when` clause | passes in the full run (2 tests) |
| Build | `npm run build` and `Build-Vsix.ps1` succeed (all VSIX built) | @ ab4502b |

Open for the Technical Writer: `packages/pim/README.md` and docs name the setting without a default; `.vscode/jarvis.code-workspace` already sets `false`, `testdata` and the Sandbox `Start-VSCode.ps1` set `true` explicitly.

## Test Design

**Owner:** Tester<br>
**Status:** done

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Manifest declares `jarvis.pim.showCategories` boolean, default `false` (AC-4) | system | `REQ_PIM_CATVIEW` AC-4 | `src/tests/pim-categories-default.test.ts` (Developer's; reviewed, 2 tests pass @ 0ff2a63 + working tree) |
| `when` clause still requires `showCategories` and `outlook.enabled` (AC-6 scope guard) | system | `REQ_PIM_CATVIEW` AC-6 | same file |
| T-52 — View hidden by default (setting unset, Outlook on; hidden, then visible after setting `true`; Settings UI default unchecked) | validation | `US_PIM_CATVIEW` AC-4, `US_UAT_CATVIEW` AC-1 | `us_uat_outlookcategories.rst` (`US_UAT_CATVIEW`), `spec_uat_outlookcategories.rst` (`SPEC_UAT_CATVIEW_FILES`); NOT RUN |
| T-13, T-14 — explicit `true` / `false` still show / hide the view | validation | `US_PIM_CATVIEW` AC-1 | existing, unchanged; T-14 sets `false` explicitly so it cannot prove the default, hence T-52 |

Strict docs build (`docs/build.ps1`) passes with the T-52 addition; CRLF kept.

Observations for the Architect (no blocker; existing text left unchanged, change only after approval):
- `US_UAT_CATVIEW` T-13 and T-19 name `jarvis.outlookEnabled`; the manifest key is `jarvis.outlook.enabled`.
- T-19 (`outlook.enabled=false`, `showCategories=true`, expects a "no categories" placeholder) contradicts the manifest `when` clause, which hides the view when Outlook is off; `REQ_PIM_CATVIEW` AC-6 and `SPEC_PIM_CATVIEW` show the shorter clause without `outlook.enabled`.
- T-52 execution (live Extension Development Host) is part of User validation or Quality's run; none was run here.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** done

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/pim.md` | Categories section: view is hidden by default, shown when both settings are `true`; settings table default `true` to `false` | Source: `packages/pim/package.json` default `false`; strict build run below |
| `packages/pim/README.md` | Features bullet states hidden by default; Configuration gets a settings row with default `false` (second copy, kept in step with the guide) | same |
| Root `README.md`, `getting-started.md`, `core.md`, `index.md` | None: they name no Categories default | text search for `categor` |
| `docs/releasenotes.md` | Not edited (Release owns it): the next release needs a migration note that users who relied on the visible view must set `jarvis.pim.showCategories` to `true` | open for Release |

## Quality Review

**Owner:** Quality<br>
**Status:** done

**Current judgment:** `proceed`. Verification is clean at 3b7177a: the manifest default is `false`, the `when` clause is unchanged, the new tests fail when the default is flipped, and the full suite, build and VSIX packaging pass. The value is not yet confirmed: UAT T-52 is NOT RUN and belongs to User validation. Observations below are not blocking.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Diff audit of the whole branch | `git diff ab4502b^ HEAD` (10 files), `git log main..HEAD` (5 commits) | Code change is one manifest line plus one test file; everything else is docs; no deletion hunks beyond the contract | none | Base taken from the first branch commit |
| Default-statement sweep | `docs/` (rst, md), `packages/`, `testdata`, `.vscode`, Sandbox script | Statements of a default: US AC-4, REQ AC-4, SPEC snippet, guide, package README: all `false`; `testdata` and `Start-VSCode.ps1` set `true` explicitly; no remaining `default: true` for the setting outside the closed record `changes/v0.5.0` | none | Text search only |
| US to REQ to SPEC to test chain | `US_PIM_CATVIEW` AC-4, `REQ_PIM_CATVIEW` AC-4, `SPEC_PIM_CATVIEW`, `pim-categories-default.test.ts`, `US_UAT_CATVIEW` T-52 | Chain is consistent for the default; T-52 is the only test that observes the default without setting it | observation O-1, O-2 | T-52 not executed (live Extension Development Host) |
| Unit-test mutation | flip manifest default to `true` | `pim-categories-default.test.ts` fails 1 of 2, file restored from git, tree clean | none | One mutant |

Observations (not blocking, for the Architect via the Project Manager):
- O-1: `REQ_PIM_CATVIEW` AC-6 and the `SPEC_PIM_CATVIEW` manifest snippet state `config.jarvis.pim.showCategories == true`; the manifest and `SPEC_CFG` use `... == true && config.jarvis.outlook.enabled == true`. The Developer's second test asserts the longer clause and the Test Design traces it to AC-6, which does not state it. Spec drift older than this change.
- O-2: the Tester's T-13/T-19 findings (key name `jarvis.outlookEnabled`, T-19 versus the `when` clause) are confirmed; `US_PIM_CATVIEW` AC-1 and the REQ name the setting (legacy, unedited).
- O-3: the release note with the migration hint is still open for Release; it does not block `proceed`.

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full unit suite | `npx vitest run --testTimeout 15000` @ 3b7177a | pass: 62 files, 701 of 701 tests |
| `src/tests/pim-categories-default.test.ts` (mutation: default `true`) | `npx vitest run src/tests/pim-categories-default.test.ts` @ 3b7177a + mutant | fail as expected: 1 of 2 (default test); restored via `git checkout`, tree clean |
| Build | `npm run build` @ 3b7177a | pass |
| VSIX packaging | `pwsh test-environments\windows-sandbox\Build-Vsix.ps1` @ 3b7177a | pass: 6 VSIX built; pim VSIX has `showCategories` default `false`, `repository` field present, README states "hidden by default" and the setting row |
| Strict docs build | `docs\build.ps1` @ 3b7177a | pass |
| UAT T-52 | live Extension Development Host | NOT RUN; part of User validation |

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
| T-52 — View hidden by default | User, in chat with the Project Manager: "funktioniert wie besprochen" (the Categories view is hidden by default and appears with the setting on). Not recorded step by step. | 2026-11-09 |

**Decision:** accepted (User, 2026-11-09). Follow-up raised by the User in the same message, outside this Contract's scope: the Categories view only works while `jarvis.outlook.enabled` is on; the User wants a category setting under Outlook like `jarvis.outlook.tasks.enabled`. It becomes its own Change.

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

**Final outcome:** Accepted by the User on 2026-11-09. The default of `jarvis.pim.showCategories` is `false`; view, commands and tools are unchanged. Integrated into `development` as one squash commit (hash in the follow-up record); branch `feature/pim-categories-view-default-off` retained. Open for Release: migration note in `releasenotes.md`. Non-blocking observations for the Architect: `when` clause in `REQ_PIM_CATVIEW` AC-6 and `SPEC_PIM_CATVIEW` differs from the manifest; T-13/T-19 key name; T-19 versus `when`.
