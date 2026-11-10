# Change Contract: outlook-categories-setting

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-09<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered. Agreed by the User on 2026-11-09: "mode autonomous, contract los schicken".

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-09 | 11:46 | Project Manager | Architect | User released the Contract in autonomous mode. Agreed scope: replace `jarvis.pim.showCategories` with `jarvis.outlook.categories.enabled` (default `false`), governing the provider and view under the Outlook master switch. Infrastructure impact is included; specification and implementation work are pending. |
| 2026-11-09 | 12:10 | Architect | Developer | Specification done and approved by the User directly (autonomous mode, chat with the Architect, 2026-11-09). New `REQ_OLK_CATENABLE` and `SPEC_OLK_CATENABLE` define `jarvis.outlook.categories.enabled` (default false, Outlook group); provider only when `jarvis.outlook.enabled` and the new setting are both true; view `when` needs both; `jarvis.pim.showCategories` and the "PIM" settings group are removed; no migration code. The tool error text now names both settings (`REQ_PIM_CATTOOL` AC-9). Admin (Sandbox script, workspace files) and Tester work from the same specification and are not blocked by yours. |
| 2026-11-09 | 13:22 | Developer | Technical Writer | Implemented: `packages/pim/package.json` (new setting default `false`, old setting and "PIM" group removed, view `when` needs both settings), `packages/pim/src/extension.ts` (provider guard, tool error text), test `src/tests/pim-categories-default.test.ts`; build, Build-Vsix and unit tests pass. `packages/pim/README.md` still names the removed setting; Admin files still set it. |
| 2026-11-09 | 13:45 | Technical Writer | Admin | Guide `pim.md` and `packages/pim/README.md` now name `jarvis.outlook.categories.enabled` (default `false`); strict docs build passes. Your files still set the removed key: `.vscode/jarvis.code-workspace`, `testdata/test.code-workspace`, `Start-VSCode.ps1`. Release still needs the migration note. |
| 2026-11-09 | 15:35 | Admin | Tester | The two workspace files and `Start-VSCode.ps1` now set `jarvis.outlook.categories.enabled` (test workspace and Sandbox `true`, `.vscode` workspace `false`); no file outside docs and the unit test names the old key; the Sandbox was not run. |
| 2026-11-09 | 15:40 | Tester | Quality | Test Design done: Developer's 5 manifest/source tests reviewed (pass); Architect's T-52/T-53 reviewed; new T-54 (master switch off, tool error, stale old key) added; all UAT scenarios NOT RUN; strict docs build passes. Release note still open. |
| 2026-11-09 | 15:45 | Quality | Architect | Review done: judgment `blocked` @ eedc812 by one finding on the specification (`SPEC_OLK_SETTINGS`/`SPEC_OLK_TASKENABLE` still place `jarvis.outlookEnabled`/`outlook.tasks.enabled` in a "PIM" group that this change removes). Verification is otherwise clean: full suite 704/704, build, Build-Vsix, strict docs build pass; two mutants fail the new tests. Open Findings has the row and the required outcome. |
| 2026-11-09 | 15:55 | Architect | Quality | F-1 fixed in `spec_olk.rst`: `SPEC_OLK_SETTINGS` and `SPEC_OLK_TASKENABLE` now name the "Outlook" group and the shipped key `jarvis.outlook.enabled` in the touched snippets (the guard snippet of `SPEC_OLK_SETTINGS` included); `SPEC_OLK_TASKENABLE` is now `approved` (User, 2026-11-09, ask form, wording only). Strict docs build passes. Changed element for re-check: `spec_olk.rst` only. The Open Findings row stays for you to remove. |
| 2026-11-09 | 16:05 | Quality | Project Manager | Re-check done: F-1 fixed (`SPEC_OLK_SETTINGS`/`SPEC_OLK_TASKENABLE` name the "Outlook" group; the one remaining "PIM" group mention is the removal statement), code unchanged since eedc812, strict docs build passes; judgment `proceed` @ 3b9d78c, Open Findings None. T-52 to T-54 are NOT RUN and are the User validation; release note with the migration hint is open for Release. |
| 2026-11-09 | 15:38 | Project Manager | User | Quality handoff at becfe6a verified and acknowledged. Presenting the verified outcome and T-52 to T-54 for live validation; no acceptance or integration yet. Clarified the Observable Outcome: the old key is not declared or used, but removal and migration statements may name it. Release migration note remains open. |
| 2026-11-10 | 13:58 | User | Project Manager | User accepted the presented outcome and validation request with "passt"; responsibility returns to the Project Manager for integration and closure. No per-step test observations were supplied. |
| 2026-11-10 | - | Project Manager | none | Squash-integrated into `development` at 3e0139e and verified that its tree matches the accepted feature branch; feature branch retained. Contract closed; migration note remains for Release. |

## Intent And Outcome
**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-09, in chat with the Project Manager, after `pim-categories-view-default-off` was accepted: Categories only work while Outlook is active, so the category switch should sit under Outlook like the one for Tasks. The User chose in the Project Manager's question form: `jarvis.outlook.categories.enabled` replaces `jarvis.pim.showCategories` ("Ersetzen: nur noch `jarvis.outlook.categories.enabled` steuert Backend und Ansicht, `jarvis.pim.showCategories` entfällt") with default `false` ("wie Tasks soll man es bewusst einschalten").

### Goal

A setting `jarvis.outlook.categories.enabled` (default `false`) governs the Outlook category integration in the same way `jarvis.outlook.tasks.enabled` governs the Outlook task integration: it lives in the Outlook settings group, and it is effective only when `jarvis.outlook.enabled` is `true`. When it is on, the Outlook category provider is registered and the Categories view is shown; when it is off, neither is. The setting `jarvis.pim.showCategories` is removed.

### Value

Users get one coherent Outlook switch per feature (tasks, categories) instead of a view switch in the PIM group plus an implicit backend that is always registered with Outlook. Users who enable Outlook for tasks only no longer get the category backend unasked.

### Scope

Changes: the new setting and the removal of `jarvis.pim.showCategories` in the manifest, the registration of the Outlook category provider and the `when` clause of the Categories view, every specification, test and document that names `jarvis.pim.showCategories`, and the test and Sandbox workspaces that set it (`.vscode/jarvis.code-workspace`, `testdata/test.code-workspace`, `test-environments/windows-sandbox/guest/Start-VSCode.ps1`).

Stays unchanged: the Categories view content, the Refresh, Rename and Delete Category commands, the tool `jarvis_pim_category`, the `categories` field of the task tool, `jarvis.outlook.enabled` and `jarvis.outlook.tasks.enabled`. Removing the whole category feature stays with backlog #23.

Resolved by the Architect and approved by the User (see Product Specification D2/D3): while the new setting is off, `jarvis_pim_category` returns the no-provider error and the task editor offers no category choices; the task `categories` field stays unchanged. There is no automatic migration because the old switch governed only the view, whereas the new switch also enables the provider. Release must add a migration note: users who had `jarvis.pim.showCategories` on set `jarvis.outlook.categories.enabled` to `true`.

### Observable Outcome

- Default settings plus `jarvis.outlook.enabled: true`: no Categories view and no Outlook category provider.
- `jarvis.outlook.enabled: true` plus `jarvis.outlook.categories.enabled: true`: the Categories view appears and lists the Outlook categories.
- `jarvis.outlook.enabled: false`: no Categories view, whatever the categories setting says.
- The Settings UI shows `jarvis.outlook.categories.enabled` in the Outlook group next to the Tasks setting, and `jarvis.pim.showCategories` is no longer declared or used as an active setting in manifests, specifications or user documents; removal and migration statements may still name the old key.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorized the start in chat with the Project Manager on 2026-11-09: "mode autonomous, contract los schicken" | approved |
| Version control | yes | Project Manager | Squash-integrated into `development` at `3e0139e`; tree equality with accepted branch verified; local branch `feature/outlook-categories-setting` retained | merged |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | approved (see Product Specification) |
| Infrastructure impact | yes: the Sandbox script and the two workspace files set `jarvis.pim.showCategories` explicitly | Admin | Affected infrastructure artifacts are updated, or none is affected | done (see Infrastructure Impact) |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | done (see Documentation Impact) |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | done (see Implementation And Unit Verification) |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | done (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | done: `proceed` @ 3b9d78c, Open Findings None (see Quality Review) |
| User validation | yes | User | User accepted the presented outcome in chat on 2026-11-10: "passt" (see User Validation) | accepted |
| Closure | yes | Project Manager | User acceptance and integration at `3e0139e` recorded below; migration note tracked for Release | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-09, in chat with the Architect (ask form, "approve all"): the three decisions below and all changed elements.

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_OLK_CATENABLE` (`req_olk.rst`) | add | Requirement for the new sub-toggle, mirrors `REQ_OLK_TASKENABLE`; AC-6 states removal of the old setting and no migration |
| `SPEC_OLK_CATENABLE` (`spec_olk.rst`) | add | Manifest delta, view `when`, instantiation guard, behaviour while off, migration decision |
| `US_PIM_CATVIEW`, `US_OLK_COMBRIDGE` | modify | Outcome-only wording: view hidden by default, turned on via the Outlook categories feature (new AC-6) |
| `REQ_PIM_CATVIEW` AC-1/4/6, `REQ_PIM_CATTOOL` AC-9 | modify | Setting name, `when` clause now `outlook.enabled && outlook.categories.enabled` (also closes the drift of the closed Contract `pim-categories-view-default-off`); tool error names both settings |
| `SPEC_PIM_CATVIEW`, `SPEC_PIM_CATTOOL`, `SPEC_OLK_SETTINGS` | modify | `when` clause; "PIM" settings block removed; error texts; provider guard uses both toggles |
| `REQ_CFG_GROUPS`, `SPEC_CFG_MANIFEST`, `SPEC_CFG_TOGGLEGUARDS`, `SPEC_CFG_VIEWGATING` | modify | The "PIM" settings group no longer exists; guard and view gating name the new setting |
| `US_UAT_CATEGORIES`/`CATTOOL`/`CATVIEW`, `REQ_UAT_*_TESTDATA`, `SPEC_UAT_*_FILES` | modify | Setup and scenario names use the new setting; T-19 now tests the empty list (the view is unreachable without a provider); new T-53 (provider off while the categories toggle is off) |

| Decision or check | Evidence |
|---|---|
| D1: setting, gating and reload behaviour mirror tasks | `SPEC_OLK_CATENABLE`; reason: one coherent switch per Outlook feature (Contract Goal) |
| D2: behaviour while off: tool returns the existing no-provider error; task editor shows no category choices; task `categories` field untouched | `SPEC_OLK_CATENABLE` "Behaviour while the setting is off"; reason: the field belongs to the task, not to the provider |
| D3: no migration, release note only | `REQ_OLK_CATENABLE` AC-6; reason: the old setting governed only the view, a mapping would also switch on the provider; feature under review (backlog #23) |
| Impact analysis by text search over `docs/` for `showCategories`, `outlook.tasks.enabled`, `jarvisCategories`, "PIM" group | Remaining mentions of `jarvis.pim.showCategories` in `.rst` are removal statements only; `releasenotes.md`, `docs/changes/**` and user guides are history or Technical Writer scope |
| Open observation, not changed: neighbouring specs still spell the master switch `jarvis.outlookEnabled` (shipped key is `jarvis.outlook.enabled`) | Known drift, deferred by the PM in an earlier Contract; new text uses the shipped key |
| Strict Sphinx build | `docs/build.ps1` (`-W`) passes; CRLF kept; all 22 changed or new elements `approved` |
| F-1 (Quality): "PIM" group named in `SPEC_OLK_SETTINGS`/`SPEC_OLK_TASKENABLE` | Fixed; wording aligned to the shipped manifest ("Outlook" group, key `jarvis.outlook.enabled`); `SPEC_OLK_TASKENABLE` `approved` by the User, 2026-11-09, ask form. Reason it went unseen: my impact search looked for `showCategories`, not for the group name |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** done

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.vscode/jarvis.code-workspace` | Set the removed `jarvis.pim.showCategories: false` | Now `jarvis.outlook.categories.enabled: false` (same behaviour, matches the new default). |
| `testdata/test.code-workspace` | Set the removed `jarvis.pim.showCategories: true` (Outlook enabled there) | Now `jarvis.outlook.categories.enabled: true`, so the test workspace still shows Categories. |
| `test-environments/windows-sandbox/guest/Start-VSCode.ps1` | Wrote the removed key `true` next to `jarvis.outlook.enabled` | Now writes `jarvis.outlook.categories.enabled` = `$true`; the script parses without errors. No other file outside docs and the test names the old key (grep). Build and test tooling, CI and workflows are unaffected. The Sandbox was not run. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** done

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Reload handling of the new setting | None, mirrors `outlook.tasks.enabled`; the `when` clause reacts at once, the provider after reload | Config-change handler with reload prompt | `SPEC_OLK_CATENABLE` D1 "mirror tasks"; the tasks guard has no handler either |
| No-provider error text | Replaced the old text (`jarvis.outlookEnabled`) with the `SPEC_PIM_CATTOOL` text naming both settings | none | Spec text taken verbatim |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/pim/package.json` | "PIM" group and `jarvis.pim.showCategories` removed; `jarvis.outlook.categories.enabled` (default `false`) in "Outlook" group; view `when` needs `outlook.enabled` and `outlook.categories.enabled` | `npx vitest run` @ bef53ab + working tree: 704 of 704 passed on the rerun; the first full run showed one load-dependent failure (pre-existing timeout pattern), passes on rerun |
| `packages/pim/src/extension.ts` | Provider added only when `outlook.enabled` and `outlook.categories.enabled`; tool error text per spec | as above |
| `src/tests/pim-categories-default.test.ts` | Rewritten for the new setting, removal of the old one, `when` clause, guard, error text (5 tests) | pass |
| Build | `npm run build` and `Build-Vsix.ps1` succeed | @ bef53ab + working tree |

Open for the Technical Writer: `packages/pim/README.md` (features line and configuration table) still names `jarvis.pim.showCategories`; release note hint per `SPEC_OLK_CATENABLE`. Open for Admin: `.vscode/jarvis.code-workspace`, `testdata/test.code-workspace`, `Start-VSCode.ps1` still set the removed key.

## Test Design

**Owner:** Tester<br>
**Status:** done

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Setting declared boolean, default `false`, in the "Outlook" group (AC-1) | system | `REQ_OLK_CATENABLE` AC-1 | `src/tests/pim-categories-default.test.ts` (Developer's; reviewed, 5 tests pass @ 8142ea6 + working tree) |
| `jarvis.pim.showCategories` and "PIM" group not contributed (AC-6) | system | `REQ_OLK_CATENABLE` AC-6 | same file |
| View `when` needs both toggles, explicit `== true` form (AC-2, AC-4) | system | `REQ_OLK_CATENABLE` AC-2/AC-4, `REQ_PIM_CATVIEW` AC-6 | same file |
| Provider added only when both toggles are true (AC-3); tool error names both settings | system | `REQ_OLK_CATENABLE` AC-3, `REQ_PIM_CATTOOL` AC-9 | same file (source-pattern match on `extension.ts`) |
| T-52 — hidden by default, appears after setting `true`; Settings UI shows it in the Outlook group | validation | `US_PIM_CATVIEW` AC-4/AC-6 | `US_UAT_CATVIEW`, `SPEC_UAT_CATVIEW_FILES` (Architect's update of my earlier scenario); NOT RUN |
| T-53 — no provider registered while the categories toggle is off | validation | `REQ_OLK_CATENABLE` AC-3 | `US_UAT_CATEGORIES` (Architect's); NOT RUN |
| T-54 — master switch off overrides the categories toggle; tool no-provider error; stale old key has no effect | validation | `REQ_OLK_CATENABLE` AC-2/AC-3/AC-6, `US_PIM_CATVIEW` | `US_UAT_CATVIEW`, `SPEC_UAT_CATVIEW_FILES` (added by me); NOT RUN |
| T-13, T-14, T-19 — reworded by the Architect for both toggles | validation | `US_PIM_CATVIEW` AC-1/AC-5 | existing; reviewed |

Strict docs build passes with T-54; CRLF kept.

Limits: the provider-guard test matches source text of `extension.ts`, so a reformat of that block fails it without a behaviour change; the reload behaviour (AC-5) and the Sandbox/test-workspace settings are covered only by UAT, and the Sandbox was not run. Admin's workspace files were not re-tested by me beyond grep.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** done

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/pim.md` | Categories section: off by default, needs `jarvis.outlook.enabled` and `jarvis.outlook.categories.enabled`; old setting removed without migration; settings table row replaced | Source: `packages/pim/package.json` (default `false`, `when` clause); strict build below |
| `packages/pim/README.md` | Features line and settings table (second copy) name the new setting and its default, kept in step with the guide | same |
| Root `README.md`, `getting-started.md`, `core.md`, `index.md` | None: no mention of the removed setting | text search for `showCategories` |
| `docs/releasenotes.md` | Not edited (Release owns it): migration note per `REQ_OLK_CATENABLE` AC-6, users who had `jarvis.pim.showCategories` on set `jarvis.outlook.categories.enabled` to `true`; the earlier note for `pim-categories-view-default-off` is superseded by it | open for Release |

## Quality Review

**Owner:** Quality<br>
**Status:** done

**Current judgment:** `proceed`. Verification of code, manifest, workspaces and documents is clean at eedc812 (code unchanged at 3b9d78c); F-1 is fixed and re-checked. The value is not yet confirmed: UAT T-52 to T-54 are NOT RUN and belong to User validation. Observations O-1 to O-3 are not blocking.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Diff audit of the whole branch | `git diff 3102b21^ eedc812` (20 files); code diff `packages/pim` (manifest, `extension.ts`), test, workspaces, `Start-VSCode.ps1` | Code is manifest delta, one guard and one error text; the guard registers the provider only inside the master switch; old key removed from manifest, README, guide, workspaces, Sandbox script | none | Base is the first branch commit |
| Old-key sweep | repo-wide search for `pim.showCategories` and the "PIM" group | Remaining hits: removal statements in `REQ_OLK_CATENABLE`, `SPEC_OLK_CATENABLE`, `SPEC_PIM_CATVIEW`, T-54/T-18 text, the test; closed Contracts; `testdata/.vscode/settings.json` (gitignored, local file, still sets the old key: harmless, no effect) | F-1 | Text search |
| US to REQ to SPEC to test chain | `REQ_OLK_CATENABLE` AC-1..AC-6, `SPEC_OLK_CATENABLE`, `SPEC_OLK_SETTINGS`, `SPEC_OLK_TASKENABLE`, `REQ_PIM_CATVIEW`, `REQ_PIM_CATTOOL` AC-9, the 5 unit tests, T-52..T-54 | AC-1/2/3/4/6 are covered by tests or UAT; AC-5 (reload) by UAT only; the `when` clause drift of the earlier Contract is closed | F-1; observations O-1, O-2 | T-52..T-54 not executed |
| Unit-test mutation | (a) manifest default `true`; (b) provider guard on the new setting replaced by `if (true)` | both: new test file fails 1 of 5; files restored via `git checkout`, tree clean | none | The guard test matches source text (Tester noted) |

Finding F-1 and observations:
- F-1: `SPEC_OLK_SETTINGS` (edited here, now `approved`) still says to add the master switch to the `"PIM"` group, shows that group in its JSON, and `SPEC_OLK_TASKENABLE` says the tasks setting "stays in the existing PIM configuration group". This change removes the "PIM" group (`REQ_CFG_SETTINGSGROUPS`, `SPEC_OLK_CATENABLE`) and the shipped manifest puts both settings in "Outlook". Reason it matters: an approved element describes a group that no longer exists, and a reader of `SPEC_OLK_SETTINGS` gets the opposite of `SPEC_OLK_CATENABLE`.
- O-1: `extension.ts` task tool error still says `jarvis.outlookEnabled` (shipped key `jarvis.outlook.enabled`); outside this change's scope, same drift the Architect recorded.
- O-2: `SPEC_OLK_SETTINGS` code sample still reads `outlookEnabled`; the Architect's note covers this drift, so it is not a finding.
- O-3: the release note with the migration hint is open for Release and does not block.

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full unit suite | `npx vitest run --testTimeout 15000` @ eedc812 | pass: 62 files, 704 of 704 tests |
| `src/tests/pim-categories-default.test.ts` (mutants: default `true`; guard `if (true)`) | `npx vitest run src/tests/pim-categories-default.test.ts` @ eedc812 + mutant | fail as expected: 1 of 5 each; restored via `git checkout`, tree clean |
| Build | `npm run build` @ eedc812 | pass |
| VSIX packaging | `pwsh test-environments\windows-sandbox\Build-Vsix.ps1` @ eedc812 | pass: 6 VSIX built; pim VSIX has the new setting, the view `when` with both toggles, `repository` field, README names the new setting; no `pim.showCategories` in the bundle |
| Strict docs build | `docs\build.ps1` @ eedc812 | pass |
| Re-check after F-1 | `git diff eedc812 3b9d78c -- packages src` (empty); `docs\build.ps1` @ 3b9d78c | pass: code unchanged, strict build passes |
| UAT T-52, T-53, T-54 | live Extension Development Host / Sandbox | NOT RUN; part of User validation |

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
| Presented outcome and validation request T-52, T-53, T-54 | User replied "passt" in chat with the Project Manager. Outcome accepted; no individual execution results or step-by-step observations supplied. | 2026-11-10 |

**Decision:** accepted by the User on 2026-11-10 for this Change.

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

**Final outcome:** User accepted the outcome on 2026-11-10 ("passt"). `jarvis.outlook.categories.enabled` (default `false`, Outlook group) replaces `jarvis.pim.showCategories` and governs both provider and view under the Outlook master switch. Squash-integrated into `development` at `3e0139e`; the integrated tree matches the accepted feature branch, which is retained. Quality's verification remains applicable because integration introduced no code changes. Open for Release: the migration note supersedes the predecessor Change's hint; users explicitly enable `jarvis.outlook.categories.enabled`, with no automatic migration. Non-blocking O-1 (old master-switch name in the task tool error) remains deferred.
