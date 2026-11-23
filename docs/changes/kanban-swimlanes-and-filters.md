# Change Contract: kanban-swimlanes-and-filters

**Status:** accepted<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-22<br>
**Related GitHub Issue(s):** #55, #47 (swimlanes portion only; drag-and-drop write-back stays open)<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-22 | 17:08 CET | Project Manager | Architect | User approved Contract release (autonomous). Scope covers GH #55 (refresh), GH #47 swimlanes portion (read-only tab state, no YAML write), and K72/K17/K14 tool filters and schema fixes. |
| 2026-11-22 | 17:20 CET | Architect | Admin | Specification complete and strict build passes. K14 and K17 are already delivered in code and tests, so no specification change for them. Changed stories `US_KAN_BOARD`, `US_KAN_QUERY`, `US_KAN_LANES` must be named in User Validation. |
| 2026-11-22 | 17:19 CET | Admin | Developer | No infrastructure change is needed; build, test, CI and docs build stay as they are. The Needs check fails by design until your Needs reach `implemented`. |
| 2026-11-22 | 17:40 CET | Developer | Technical Writer | Refresh, lanes and `fields` filters are implemented and tested; Needs set to `implemented` except the two SKILLCONTENT Needs, which wait for your skill text. |
| 2026-11-22 | 18:10 CET | Technical Writer | Tester | Skill, Kanban guide, Kanban README and root README describe the ields filter, the ields filter-values result, Refresh and swimlanes; both SKILLCONTENT Needs set to implemented; strict docs build passes; Test design row is yours. |
| 2026-11-22 | 17:45 CET | Tester | Quality | Handler-level `fields` and filter-values tests and a Refresh manifest test added, all pass; lanes and Refresh behaviour have no automated test (no DOM environment, host needed) and rest on `AC_KAN_LANES_JOURNEY`, which is not executed. |
| 2026-11-22 | 17:50 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`. Name `US_KAN_BOARD`, `US_KAN_LANES`, `US_KAN_QUERY` and `AC_KAN_LANES_JOURNEY` in User Validation; the journey is unexecuted and lane/Refresh rest on it. `fields: {}` acts as no filter and is not stated in the requirement (Architect). |
| 2026-11-23 | 21:41 CET | Project Manager | Architect | User validated and accepted `US_KAN_BOARD`, `US_KAN_LANES`, `US_KAN_QUERY` and `AC_KAN_LANES_JOURNEY` in the Extension Development Host. `AC_KAN_LANES_JOURNEY` is still `approved`, so `check_contract_needs.py` hits AC-5 until you set it to `verified` as specification owner; return to PM for squash-integration and closure. |
| 2026-11-23 | 21:45 CET | Architect | Project Manager | `AC_KAN_LANES_JOURNEY` set to `verified`; Needs check is clean. Product Specification text corrected: three Needs were `draft` before and went to `implemented`, not `approved`. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-22 17:01 CET (scope and read-only swimlane session state settled with the User).

### Goal

Users can refresh an open Kanban board in one click and group cards horizontally into read-only swimlanes by any declared single-select field or by labels, while actors can filter board queries by declared fields and update item labels cleanly through the Kanban tools.

### Value

Boards with ~30+ items (such as the Project Manager's backlog) currently require scanning long flat columns in the UI and pulling the full item list in chat when filtering by declared fields like `priority`, and stale custom-editor tabs require closing and reopening. Adding read-only swimlanes, a refresh button, and declared-field tool filtering makes large boards fast to navigate for both humans and actors without introducing concurrent YAML write-back conflicts.

### Scope

- **Editor refresh action (GH #55):** Add a refresh action in the Kanban custom editor title bar alongside the existing text-editor toggle so the user can force an immediate re-read and re-render of the board YAML.
- **Read-only swimlanes in the Kanban viewer (GH #47, swimlanes portion):**
  - Provide a swimlane selector in the board header with `None` (default), every declared `single_select` field other than `status` (lanes ordered by declared `options`, plus an uncategorized lane for items without a value), and `Labels` (lanes ordered alphabetically, plus an unlabelled lane).
  - When grouped by `Labels`, an item carrying multiple labels appears in every matching label swimlane; column header totals count unique items per column rather than duplicating counts across lanes.
  - Swimlanes are collapsible and live purely as in-memory view state of the open tab: selection survives refreshes and file-watcher updates while the tab stays open, resets to `None` when reopened, and never writes to the `.kanban.yaml` file or hidden storage.
  - Drag-and-drop write-back, Save button, and actor change notifications from GH #47 remain outside this Change; GH #47 stays open for Phase 2 write-back.
- **Kanban tool query & schema improvements (backlog K72, K17, K14):**
  - `jarvis_listKanbanItems` (K72): support filtering by declared fields (`single_select` exact match, `text` case-insensitive substring match) in addition to `status` and `labels`.
  - `jarvis_listKanbanFilterValues` (K72): include declared `single_select` fields and their options with item counts alongside `status` and `labels`.
  - `jarvis_updateKanbanItem` (K17): type `changes` in the tool input schema so `labels` accepts `string[]` as documented while field values remain strings.
  - `jarvis_addKanbanItem` (K14): state clearly in the rejection error when `id` is supplied that item IDs are auto-assigned and cannot be provided by the caller.
- **Candidate impact starting point (`MOD_KANBAN`):** `US_KAN_BOARD`, `US_KAN_QUERY`, `US_KAN_TOOLS`, `US_KAN_SKILL`, and their linked `REQ_KAN_*` / `SPEC_KAN_*` / `AC_KAN_*` Needs, plus Kanban skill/user documentation.

### Observable Outcome

- Clicking the Refresh button in the Kanban custom editor title bar re-reads the YAML file from disk and re-renders the board immediately without modifying the file.
- Selecting a `single_select` field (e.g. `priority`) or `Labels` in the board header renders horizontal collapsible swimlanes across the status columns; multi-label cards appear in each of their label lanes while column counts stay deduplicated; switching views leaves `git status` clean, and reopening the tab starts at `None`.
- Calling `jarvis_listKanbanFilterValues` returns counts for declared `single_select` fields, and calling `jarvis_listKanbanItems` filters items by declared `single_select` and `text` fields.
- Calling `jarvis_updateKanbanItem` with a `string[]` for `changes.labels` succeeds through the tool schema, and supplying `id` to `jarvis_addKanbanItem` returns an error stating that `id` is auto-assigned.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-22 17:08 CET) |
| Version control | yes | Project Manager | Local branch `feature/kanban-swimlanes-and-filters`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked; strict Sphinx build passes (see Product Specification) | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (2026-11-23 21:40 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

New and changed Needs were set `approved` on the Contract scope (autonomous mode); `US_KAN_BOARD`, `SPEC_KAN_FILEOPEN` and `SPEC_KAN_RENDERER` were `draft` before and stayed `draft` until the Developer moved them to `implemented` (corrected 2026-11-23; the earlier text said all were `approved`). `REQ_KAN_SKILLCONTENT` and `SPEC_KAN_SKILLCONTENT` moved from `implemented` back to `approved` because their content changed. After User validation (2026-11-23) `AC_KAN_LANES_JOURNEY` is `verified`, as the Needs check requires for an `ac` the Contract names.

| Artifact | Change | Rationale |
|---|---|---|
| `US_KAN_BOARD` | modify: AC-7 (bring the board up to date with the file in one step) | GH #55 |
| `US_KAN_LANES` | add (`tracked_by: MOD_KANBAN`) | GH #47 swimlanes portion: read-only grouping into lanes, tab state only |
| `US_KAN_QUERY` | modify: AC-7 reworded, AC-8 added (narrow by the value of a declared field) | K72 |
| `REQ_KAN_REFRESH` | add | Refresh action |
| `REQ_KAN_LANES` | add | Lane selector, lane membership, deduplicated column totals, collapse, tab-local state |
| `REQ_KAN_LIST` | modify: AC-1, AC-2; add AC-12 to AC-14 | `fields` object filter: `single_select` exact match, `text` case-insensitive substring |
| `REQ_KAN_FILTERVALUES` | modify: AC-2, AC-5, AC-6; add AC-9, AC-10 | Return shape `{path, statuses, fields, labels}` with counts for `single_select` fields |
| `REQ_KAN_SKILLCONTENT` | modify: add AC-11; status back to `approved` | Skill text must describe the `fields` filter |
| `SPEC_KAN_FILEOPEN` | modify: step 5 and AC-5 | Refresh button in the custom editor title bar |
| `SPEC_KAN_REFRESH` | add | Command `jarvis.refreshKanbanBoard`, one `postBoardData` set per Uri, active-tab fallback |
| `SPEC_KAN_LANES` | add | Webview state `laneBy` and `collapsed`, lane identity, ordering, totals taken before placement |
| `SPEC_KAN_RENDERER` | modify: pointer to `SPEC_KAN_LANES` in Filtering | Keeps the lane rules in one place |
| `SPEC_KAN_LIST` | modify: `fields` input, validation order, AC-11, AC-13 to AC-15 | K72 |
| `SPEC_KAN_FILTERVALUES` | modify: step 6, AC-2, AC-10; add AC-11, AC-12 | K72 |
| `SPEC_KAN_SKILLCONTENT` | modify: Tools table, Workflow, AC-10; status back to `approved` | K72 |
| `AC_KAN_LANES_JOURNEY` (`docs/acceptance/ac_kanban_lanes.rst`) | add; linked from `docs/acceptance/index.rst` | Journey for `US_KAN_BOARD`, `US_KAN_LANES`: lane layout, title-bar Refresh, tab-local state; limited to what only the open view shows |
| `AC_KAN_MGMT_READ_JOURNEY` | modify: step 3 | Journey for `US_KAN_QUERY`: field filter and filter values through the Actor |

| Decision or check | Evidence |
|---|---|
| Impact analysis | Direct reading of the Kanban Needs, `kanbanEditorProvider.ts`, `kanbanPanel.ts`, `webview/kanban.ts`, `boardQuery.ts`, `extension.ts`, `package.json`; no impact script run |
| K14 and K17 need no specification change | Already delivered: `packages/kanban/package.json:171` types `changes.additionalProperties` as `anyOf [string, string[]]`, `extension.ts:150` returns `Cannot supply "id" — ids are auto-assigned.`; `src/tests/kanban-write-handlers.test.ts` T-6a, T-6b, T-6d, T-6e; `REQ_KAN_UPDATE` AC-11 and `REQ_KAN_ADD` AC-4 already state it. The Developer confirms conformance; the PM closes backlog items 14 and 17 (still "In Progress") |
| Lane names | `Uncategorized` (no value) and `Unlabelled` (no label); lane identity is kind plus name, so an option named "Uncategorized" is not the synthetic lane |
| Which lanes are drawn | Option lanes always; label lanes, `Uncategorized` and `Unlabelled` only while they hold a card; label lanes in code-point order |
| Selector change | Changing the selector expands all lanes; a field removed from the board resets the selection to `None`; nothing is persisted or sent to the host |
| Refresh scope | Only in the custom editor `jarvis.kanbanEditor`. The command-opened panel has no title bar and keeps `refreshKanbanPanel()` |
| `fields` filter | An object keyed by declared non-status field names; `text` is a case-insensitive substring, an empty `text` value is an error; validation order is fixed in `SPEC_KAN_LIST` step 4 |
| Filter values | Only `single_select` fields are listed; counts include only cards with a declared status (D-10) |
| Journeys | Test only what the open view shows; lane membership and column totals are proven at requirement level (`REQ_KAN_LANES`), not repeated in the journey |
| Build and format | `python -m sphinx -W --keep-going -b html .` in `docs/` exits 0; `npx vitest run src/tests/acceptance-criteria-format.test.ts` passes (5 tests) |
| Developer must update | `src/tests/kanban-board-query.test.ts:320-322` asserts the old `listKanbanItems` description strings, which `SPEC_KAN_LIST` AC-11 changes |
| Technical Writer pointers | `docs/user guides/kanban.md` (tool table), `packages/kanban/README.md` (tool rows), `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` (Tools table, Workflow step 5) |
| User Validation must name the changed stories | `US_KAN_BOARD`, `US_KAN_QUERY`, `US_KAN_LANES` (Needs check); recorded by the PM, not edited here |
| Open for the PM, outside this Contract | `REQ_KAN_RENDERER` AC-4 still promises `priority:High` syntax, which the plain-text filter does not implement; not changed here |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `.github/workflows/release.yml` | none: no package added, removed or renamed; the change stays inside `packages/kanban` and `docs/` | none; the workflow already packages and publishes `packages/kanban` |
| Build and test tooling (`npm run compile`, `lint`, `test`; vitest) | none: no new dependency, script or configuration is required by the specification | none; Developer adds the new command and tests inside the existing setup |
| Documentation build (Sphinx) and `acceptance-criteria-format` test | none: the new journey `docs/acceptance/ac_kanban_lanes.rst` is linked from `docs/acceptance/index.rst` | verified at `ba81156b`: `python -m sphinx -b html docs <tmp> -W --keep-going -E` exits 0 |
| Needs check `scripts/check_contract_needs.py` | none to the script; it fails today by design, since the changed Needs are `approved` or `draft` and the User Validation rows are empty | run at `ba81156b`: exit 1 with `REQ_REL_NEEDSCHECK` AC-3 and AC-4 hits only. The PM runs it as the last gate; the Developer sets `implemented`, the PM names `US_KAN_BOARD`, `US_KAN_QUERY`, `US_KAN_LANES` in User Validation |
| `docs/Jarvis Contracts/change.md` | none | none |

Observation for the Architect and the PM: `US_KAN_BOARD`, `SPEC_KAN_FILEOPEN` and `SPEC_KAN_RENDERER` were `draft` before this Change and are still `draft` after it, while the Specification section says all changed Needs are `approved`. The Needs check reports them at AC-3 like the others; who sets their status is theirs to decide.

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Where the `fields` filter lives | `parseFieldFilters` inside `selectItems` in `boardQuery.ts`, validated in the order of `SPEC_KAN_LIST` step 4, after the `status` check | Validate in the handler | The module is pure and tested directly (D-12); the handler only passes `fields` through |
| How Refresh reaches the right editor | Module-level `Map<uri, Set<postBoardData>>` in `kanbanEditorProvider.ts`; the command calls the set of the invoking Uri, with an active-tab fallback | Reload the webview; call `refreshKanbanPanel` | One read path for change events and Refresh (`SPEC_KAN_REFRESH`); the webview keeps its lane state |
| Lane state | Module variables `laneBy`, `collapsed` in `webview/kanban.ts`; no `setState`, no host message | Persist in webview state | `REQ_KAN_LANES` AC-8: gone when the tab is reopened |
| Column totals with lanes | Taken from the shown set before cards are placed in lanes | Sum over lanes | A multi-label card would count twice (`REQ_KAN_LANES` AC-6) |
| Need statuses | Set `implemented` for the REQ, SPEC and US Needs of this Contract except `REQ_KAN_SKILLCONTENT` and `SPEC_KAN_SKILLCONTENT` | Leave all to the Architect | The Contract says the Developer sets `implemented`; the skill Needs follow the Technical Writer's text, so I left them. The three `draft` Needs (`US_KAN_BOARD`, `SPEC_KAN_FILEOPEN`, `SPEC_KAN_RENDERER`) are now `implemented` too, since this Contract changes their behaviour |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/kanban/src/boardQuery.ts` | `fields` filter (exact for `single_select`, case-insensitive substring for `text`, errors per step 4); `filterValues` returns `fields` | `npx vitest run` @ this commit: 67 files, 723 tests pass; new K72 tests in `src/tests/kanban-board-query.test.ts` |
| `packages/kanban/src/extension.ts` | passes `fields` to `selectItems`, returns `fields` from `jarvis_listKanbanFilterValues`, new descriptions, registers `jarvis.refreshKanbanBoard` | same run; description assertions updated (`kanban-board-query.test.ts` AC-11, AC-10) |
| `packages/kanban/package.json` | `fields` in tool input schema, new model descriptions, command `jarvis.refreshKanbanBoard` with palette and `editor/title` entries under `activeCustomEditorId == jarvis.kanbanEditor` | same run |
| `packages/kanban/src/kanbanEditorProvider.ts` | refresher map, `refreshKanbanEditors`, `activeKanbanEditorUri` | `npx tsc -p packages/kanban --noEmit` clean; no unit test (needs a VS Code host) |
| `packages/kanban/webview/kanban.ts` | lane selector, lanes, collapse, column totals | webview build passes; no unit test (DOM script), covered by `AC_KAN_LANES_JOURNEY` |
| `src/tests/kanban-filtervalues-handler.test.ts`, `kanban-tool-handlers.test.ts` | result keys now include `fields` | same run |
| `docs/requirements/req_kan.rst`, `docs/design/spec_kan.rst`, `docs/userstories/us_kan.rst` | status `implemented` for the Needs named above | Needs check run after commit |

K14 and K17: conformance confirmed, no new code. `packages/kanban/package.json` types `changes.additionalProperties` as `anyOf [string, string[]]`, and `kanban-write-handlers.test.ts` T-6a, T-6b, T-6d, T-6e pass in the run above.

Open for the Technical Writer: `SKILL.md`, `docs/user guides/kanban.md` and `packages/kanban/README.md` must describe the `fields` filter and the `fields` result (`REQ_KAN_SKILLCONTENT` AC-11); the two skill Needs stay `approved` until then.

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| `fields` filter through the real handler: `single_select` exact (case significant), `text` part ignoring case, AND with `status`/`labels`, a miss is an empty list, `{}` lists all, an item without a text value does not match, file unchanged (hash), `details` changes no match | system | `REQ_KAN_LIST` AC-1, AC-2, AC-12..AC-14 | `src/tests/kanban-tool-handlers.test.ts`, describe "fields filter through the real handlers" (23 pass in the file) |
| Invalid `fields` (not an object, `status`, undeclared key, non-string or null value, undeclared option, empty text) returns an error naming the key and the accepted fields or valid options | system | `REQ_KAN_LIST` AC-12..AC-14 | same file |
| `jarvis_listKanbanFilterValues` `fields`: every other `single_select` field and option in declared order, `count: 0` kept, no `text` field, undeclared status or option not counted, `fields: []` without such a field, every name copied from the result matches in the list filter | system | `REQ_KAN_FILTERVALUES` AC-5, AC-9, AC-10 | same file |
| Refresh is contributed with title and icon; title bar entry and Command Palette entry only under `activeCustomEditorId == jarvis.kanbanEditor`, same group as "Open as Text", offered in no other menu | system | `REQ_KAN_REFRESH` AC-1, `SPEC_KAN_REFRESH` AC-1 | `src/tests/kanban-refresh-manifest.test.ts` (4 pass) |
| Module-level K72 cases (Developer) and K14/K17 (`kanban-write-handlers.test.ts` T-6a..T-6e) | system | `REQ_KAN_LIST`, `REQ_KAN_ADD` AC-4, `REQ_KAN_UPDATE` AC-11 | existing; I did not repeat them |
| Lanes, column totals, collapse, tab-local state and Refresh behaviour (re-read without change event, view state kept, only the invoking board, parse error) | validation | `REQ_KAN_LANES` AC-1..AC-9, `REQ_KAN_REFRESH` AC-2..AC-6 | `AC_KAN_LANES_JOURNEY` (`docs/acceptance/ac_kanban_lanes.rst`), run in an Extension Development Host; **not executed**: the lane logic is in a DOM webview script and the repo has no DOM test environment (no jsdom/happy-dom), and the refresh map needs a VS Code host. Adding jsdom is a tooling decision for Admin and the Project Manager, not taken here. The journey is `approved`, not named in this Contract's Test Execution so far |

**Observation (no finding open):** all new tests pass at `01832605`; no defect found in the `fields` filter or filter values. `fields: {}` is accepted and behaves as no filter; the requirement does not say so explicitly (`REQ_KAN_LIST` AC-3 and AC-12), so the Architect may want to state it.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` | Tools table and Workflow step 5 describe `fields` (`single_select` exact option, `text` case-insensitive part, all entries must match, errors instead of empty lists) and the single-select options in filter values (`REQ_KAN_SKILLCONTENT` AC-11) | this commit |
| `docs/user guides/kanban.md` | Tool table as above; new section 'Working in the board view' for Refresh and read-only swimlanes; `jarvis_updateKanbanFields` row no longer promises renaming (`REQ_KAN_FIELDS` AC-11) | this commit; `docs/build.ps1 -Clean` succeeded |
| `packages/kanban/README.md` | Same tool rows (second copy of the guide); board view sentence; same rename correction | this commit |
| Root `README.md` | Kanban feature bullets name swimlanes, Refresh and the `fields` filter; no version section, because the change is unreleased and Release assigns the version | this commit |
| `REQ_KAN_SKILLCONTENT`, `SPEC_KAN_SKILLCONTENT` | Status `approved` to `implemented`: the skill text now meets AC-11 and the spec's Workflow text; Developer handed these two Needs over | this commit; `npx vitest run` of the skill and acceptance-format tests passes (7) |
| `docs/releasenotes.md` | open for Release at release time | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed` at `d0851bce`. Open Findings is `None`. The tool side (`fields` filter, filter values, K14/K17) is implemented and tested at handler level and holds under a mutation check. The Refresh command and the lane view have no automated test (DOM script and VS Code host); I read the code against `SPEC_KAN_LANES` and `SPEC_KAN_REFRESH` and found no deviation, but only `AC_KAN_LANES_JOURNEY`, run in an Extension Development Host, proves them, and Quality cannot drive one. That journey belongs in User Validation.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against merge base 6a802725 | 20 files: kanban package, 4 docs sets, 4 test files | `boardQuery.ts` `fields` validation and matching, `extension.ts`, `kanbanEditorProvider.ts` refresher map and disposal, `webview/kanban.ts` lanes, against `SPEC_KAN_LIST`, `SPEC_KAN_LANES`, `SPEC_KAN_REFRESH` | No deviation found; column totals come from the shown set before lane placement; lane state is module-local, never posted to the host | Lane and Refresh code read, not executed |
| Mutation check | `boardQuery.ts` text match changed from case-insensitive to case-sensitive | 2 tests failed (`kanban-board-query` 1, `kanban-tool-handlers` 1); file restored, tree clean | Tests exercise the case rule | One mutation only |
| Needs check | `scripts/check_contract_needs.py` | exit 1; only `US_KAN_BOARD`, `US_KAN_LANES`, `US_KAN_QUERY` at `REQ_REL_NEEDSCHECK` AC-4 (not named in User Validation) | Expected; the Project Manager names them | None |
| Packaging | six VSIXs | kanban VSIX contains `out/webview/kanban.js` and the `jarvis.refreshKanbanBoard` command; all engines `^1.144.0` | None | |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ d0851bce | pass |
| Lint | `npm run lint` @ d0851bce | pass: 0 errors, 174 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ d0851bce | pass: 68 files, 733 tests |
| Script tests | `python -m unittest discover scripts` @ d0851bce | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ d0851bce | pass |
| VSIX packaging | `Build-Vsix.ps1` @ d0851bce | pass: six VSIXs at 0.34.0 (the script's summary table threw a formatting error after packaging when piped; the files were built) |
| `AC_KAN_LANES_JOURNEY` | not run by Quality | needs an Extension Development Host; open for User Validation |

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
| `AC_KAN_LANES_JOURNEY` in Extension Development Host (`US_KAN_BOARD`, `US_KAN_LANES`), plus handler-level verification of declared-field queries (`US_KAN_QUERY`) | User executed validation in the Extension Development Host and confirmed the swimlane selector, collapsible lanes, deduplicated column totals, title-bar Refresh action, tab-local view state, and declared-field queries passed. | 2026-11-23 |

**Decision:** accepted (2026-11-23 21:40 CET)

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
