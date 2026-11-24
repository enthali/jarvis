# Change Contract: kanban-cleanup

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-24<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-24 | 20:13 CET | Project Manager | Architect | User approved Contract release (autonomous, pre-authorized to chain to Package 2 once closed). Scope covers Kanban cleanup cards K16 (archiving convention in `SKILL.md`), K62 + K68 (`kanban-ownername-required.test.ts` + cold-run check), K63 (confirm/specify `labelsOf` non-string label filtering already in `boardQuery.ts:29`), and K78 (`REQ_KAN_RENDERER` AC-4 plain-text filter + `fields: {}` in `REQ_KAN_LIST`). Zero runtime product code changes expected. |
| 2026-11-24 | 20:20 CET | Architect | Admin | Specification done: K78 and K16 specified (five Needs now `approved`); K63 was already specified and needs no change. No story changed, so User Validation names no `US_*`. Strict Sphinx build passes. |
| 2026-11-24 | 20:21 CET | Admin | Developer | No infrastructure change needed. K16 goes into the tracked skill source `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`, not the gitignored `.github/skills` mirror. Needs check stays red until the 5 `approved` Needs are `implemented`. |
| 2026-11-24 | 20:30 CET | Developer | Technical Writer | `REQ_KAN_RENDERER`, `REQ_KAN_LIST`, `SPEC_KAN_LIST` are `implemented`; no runtime code changed. `REQ_KAN_SKILLCONTENT` and `SPEC_KAN_SKILLCONTENT` stay `approved` until the archiving text is in `SKILL.md`; set them `implemented` with it. The K62 test refactor is not done and goes to the Tester. |
| 2026-11-24 | 20:50 CET | Technical Writer | Tester | Archiving procedure is in SKILL.md and the Kanban guide; REQ_KAN_SKILLCONTENT and SPEC_KAN_SKILLCONTENT set to implemented; skill and format tests pass; strict docs build passes. Test design row is yours; the ## Test Design heading is missing again in this Contract. |
| 2026-11-24 | 20:40 CET | Tester | Quality | K62 owner tests now drive the real handlers of all nine tools; K63/K78 already covered in `kanban-tool-handlers.test.ts`; K16/K78 spec assertions added; K68 not reproducible (5 cold runs pass). Full suite 796 pass. `kanban-owner-ambiguity.test.ts` deleted (covered by the real-handler case). |
| 2026-11-24 | 20:45 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`; 796 tests pass, six clean-tree VSIXs build, Needs check exits 0. No story changed, so User Validation names no `US_*`. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-24 20:11 CET (autonomous execution and zero-runtime-code expectation settled for both Kanban cleanup and follow-on Sidebar/Spec/Test cleanup).

### Goal

The Kanban skill documents how actors archive `Done` items when boards grow large (`K16`), Kanban specifications match shipped runtime behavior on plain-text filtering, empty `fields: {}`, and non-string label filtering (`K78`, `K63`), and Kanban owner-resolution tests exercise real handlers rather than a copied helper (`K62`, `K68`) — all without modifying runtime extension code.

### Value

Closing the last five Kanban cleanup cards removes misleading specification claims (`priority:High` webview filter syntax that was never built, unspecified `fields: {}` and non-string label projection behavior), teaches actors a clean convention for keeping large boards lean without inventing new storage formats, and eliminates a brittle copied-logic test.

### Scope

- **Document Kanban archiving convention in skill (`K16`):**
  - Add a concise archiving section/pattern to `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` (and update `REQ_KAN_SKILLCONTENT` / `SPEC_KAN_SKILLCONTENT` + user guide if appropriate): when a board grows large, move `Done` items to a separate archive board file (e.g. `archive.kanban.yaml` via `boardName: "archive"`) using the existing create/add/delete tools rather than splitting items into individual files.
  - Note: keep any mirrored provisioned skill copy under `.github/skills/jarvis-kanban.board/SKILL.md` consistent if tracked, or verify gitignore/test expectations.
- **Align Kanban specifications with shipped runtime behavior (`K78`, `K63` — zero runtime code change):**
  - **`K78` (`REQ_KAN_RENDERER` AC-4 & `REQ_KAN_LIST`):** Update `REQ_KAN_RENDERER` AC-4 (`docs/requirements/req_kan.rst`, and `SPEC_KAN_RENDERER` if needed) so it describes the shipped case-insensitive plain-text substring filter across item fields rather than promising unimplemented `priority:High` syntax. State explicitly in `REQ_KAN_LIST` that `fields: {}` behaves as no field filter.
  - **`K63` (`SPEC_KAN_LIST` / `REQ_KAN_LIST` non-string labels):** `packages/kanban/src/boardQuery.ts:29` (`labelsOf`) already filters out non-string entries in both compact projection and `details: true`, matching `filterValues`. Pin this existing behavior explicitly in `SPEC_KAN_LIST` (and `REQ_KAN_LIST` if appropriate) and cover it with a test — no runtime code change needed.
- **Replace copied `resolveOwner` test logic & verify handler stability (`K62`, `K68`):**
  - Refactor or retire the copied `resolveOwner` helper in `src/tests/kanban-ownername-required.test.ts` so all 9 Kanban tools' `ownerName` validation (`missing` and `unknown/ambiguous`) is exercised against the real registered tool handlers (extending `kanban-tool-handlers.test.ts` or rewiring `kanban-ownername-required.test.ts` to invoke the real handlers).
  - Verify repeated/cold runs of `src/tests/kanban-tool-handlers.test.ts` (including Ajv schema validation initialization) so the historical one-off cold-run observation in `K68` is either explained/eliminated or confirmed non-reproducible.

### Observable Outcome

- Zero runtime TypeScript files under `packages/*/src/` or `packages/*/webview/` are modified (`packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`, `docs/`, and `src/tests/` only).
- `SKILL.md` documents the `archive` board convention (`K16`); `REQ_KAN_RENDERER` AC-4, `REQ_KAN_LIST`, and `SPEC_KAN_LIST` match the shipped code (`K78`, `K63`); `kanban-ownername-required.test.ts` no longer duplicates `resolveOwner` (`K62`), and `kanban-tool-handlers.test.ts` passes reliably (`K68`).
- Strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py`, `npm run lint`, and the full Vitest suite pass with zero errors.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-24 20:11 CET) |
| Version control | yes | Project Manager | Local branch `feature/kanban-cleanup`; squash-integrated into `development` at closure; the branch is retained | merged (`b0c376c0`) |
| Product specification | yes | Architect | `REQ_KAN_RENDERER`, `REQ_KAN_LIST`, `SPEC_KAN_LIST`, `REQ_KAN_SKILLCONTENT`, `SPEC_KAN_SKILLCONTENT` updated and checked | complete (see Product Specification) |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | `SKILL.md` archiving pattern (`K16`) and any affected Kanban guide/README updated | complete |
| Implementation and unit verification | yes | Developer | Need statuses set to `implemented` and unit/test suite verified (zero runtime product code changes) | complete |
| Test design | yes | Tester | Real-handler `ownerName` tests (`K62`), non-string label projection test (`K63`), cold-run check (`K68`), and skill/spec assertions pass | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | not applicable: explicit User delegation (2026-11-24 20:11 CET) to accept on automated evidence and chain to Package 2 when zero runtime product code changes occur and Quality records `proceed` | User | Observable outcome is accepted or changes are requested | accepted (explicit User delegation, 2026-11-24 20:11 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_KAN_RENDERER` (`req_kan.rst`) | modify (`draft` → `approved`) | AC-4 described a `priority:High` filter that was never built; it now states the shipped case-insensitive plain-text substring filter over id, name, field values, labels and notes, without syntax (K78) |
| `REQ_KAN_LIST`, `SPEC_KAN_LIST` | modify (`implemented` → `approved`) | New `REQ_KAN_LIST` AC-15 and `SPEC_KAN_LIST` AC-16 and step 4 text: `fields: {}` is an object that passes every check, adds no filter and returns no error (K78) |
| `REQ_KAN_SKILLCONTENT`, `SPEC_KAN_SKILLCONTENT` | modify (`implemented` → `approved`) | New AC-12 and AC-11 and a Workflow paragraph: archiving convention with an `archive` board, add before delete, new id on the archive board, fields the archive board must declare (K16) |

| Decision or check | Evidence |
|---|---|
| K63 needs no specification change | `REQ_KAN_LIST` AC-11 and `SPEC_KAN_LIST` step 6, AC-12 and the "Why non-string label entries are dropped" rationale already pin `labelsOf` filtering in both shapes (`boardQuery.ts` `labelsOf`); the `kanban-tool-validation` Contract wrote them. `kanban-tool-handlers.test.ts` already holds "non-string labels in list projection" (REQ_KAN_LIST AC-11); the Tester decides whether that covers the card |
| `fields: {}` is already tested | `kanban-tool-handlers.test.ts` calls `fields: {}` and expects all six items; the spec now states the rule it checks |
| `SPEC_KAN_RENDERER` unchanged | Its Filtering section and AC-3 already say plain text, no special syntax, case-insensitive; only the requirement was wrong |
| Archive convention uses existing tools | `jarvis_createKanbanBoard` with `boardName` writes `<boardName>.kanban.yaml` with `status` and `priority` only (`SPEC_KAN_CREATE`); `REQ_KAN_ADD` AC-4 assigns ids; `REQ_KAN_WRITEVALID` AC-3 rejects undeclared keys. No tool, schema or runtime code is needed, which matches the zero-runtime-code outcome |
| No story changes | `US_KAN_SKILL` and the other stories are untouched, so User Validation names no `US_*` of this Contract |
| Build and format | Strict Sphinx build exit 0; `acceptance-criteria-format.test.ts` 5/5; all edited files CRLF |
| Status | The five Needs above stand at `approved` because their content changed; the Developer returns them to `implemented`, until then `check_contract_needs.py` reports them |
| For the Technical Writer (K16) | `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`: add the archiving procedure to the end of Workflow as `SPEC_KAN_SKILLCONTENT` describes; check whether a mirrored copy under `.github/skills/jarvis-kanban.board/` is tracked and keep it equal |
| For the Tester and Developer (K62, K68) | No specification change. `kanban-ownername-required.test.ts` and `kanban-owner-ambiguity.test.ts` copy private helpers out of the source text; the real behaviour is `REQ_KAN_CREATE` AC-3 to AC-5 and `SPEC_KAN_CREATE` AC-5 |
| Left alone | `SPEC_KAN_RENDERER` Rendering rules has two bullets run together on one line (`notes ... below).   * (kanban-skill-content CR)`); outside this scope |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Docs build, Needs check, CI, manifests | none | Branch touches only `docs/`; `git diff development...HEAD` lists no file under `packages`, `src`, `.github`, `.vscode`, `scripts`. Strict Sphinx build exits 0. `check_contract_needs.py` exits 1 as designed: exactly the 5 Needs `REQ_KAN_RENDERER`, `REQ_KAN_LIST`, `SPEC_KAN_LIST`, `REQ_KAN_SKILLCONTENT`, `SPEC_KAN_SKILLCONTENT` are `approved` until the Developer sets them `implemented`. |
| K16 skill mirror | none | `.github/skills/jarvis-kanban.board/SKILL.md` is gitignored (`jarvis-*`) and untracked. The tracked skill source is `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md`, the file the two skill-reading tests (`kanban-board-query.test.ts`, `kanban-skill-ownername-guard.test.ts`) read. The local mirror already differs by 3 lines and is not a deliverable. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Need statuses | `REQ_KAN_RENDERER`, `REQ_KAN_LIST`, `SPEC_KAN_LIST` set to `implemented`; `REQ_KAN_SKILLCONTENT` and `SPEC_KAN_SKILLCONTENT` stay `approved` | Set all five now | The archiving text they describe is not in `SKILL.md` yet; the Technical Writer delivers it, then sets the two to `implemented`. The three set now describe shipped runtime behaviour, unchanged |
| Runtime code | None changed | none | Contract outcome is zero runtime files; `labelsOf` filtering and `fields: {}` already match the specification |
| K62 copied `resolveOwner` helper | Not touched by me | Refactor now | Test refactoring is the Tester's row (real-handler `ownerName` tests) |
| K68 cold-run check | Five consecutive `--no-cache` runs of `kanban-tool-handlers.test.ts`, all pass | Dig into Ajv initialisation | Not reproducible; no change made |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `docs/requirements/req_kan.rst`, `docs/design/spec_kan.rst` | Three Needs `approved` to `implemented` | `npx vitest run`: 70 files, 764 tests pass |
| `src/tests/kanban-tool-handlers.test.ts` | none | 5 x `npx vitest run src/tests/kanban-tool-handlers.test.ts --no-cache`: 23 passed each |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| All nine real tool handlers: missing/empty `ownerName` → `ownerName required`; unknown name and a name shared by two Actors → `actor unknown`; one match resolves (K62) | system | `REQ_KAN_CREATE` AC-3, AC-4, AC-5; `SPEC_KAN_CREATE` AC-5 | `src/tests/kanban-ownername-required.test.ts` (rewritten; the copied `resolveOwner` source-scraping is gone) |
| `ownerName` required in every tool `inputSchema`; exactly the nine tools declared | system | `SPEC_KAN_CREATE` AC-5 | same file |
| Non-string labels dropped in compact and `details: true`, counted the same by filter-values (K63) | system | `REQ_KAN_LIST` AC-11; `SPEC_KAN_LIST` AC-12 | `src/tests/kanban-tool-handlers.test.ts` (existing, adequate; unchanged) |
| `fields: {}` returns every item, no error (K78) | system | `REQ_KAN_LIST` AC-15; `SPEC_KAN_LIST` AC-16 | `src/tests/kanban-tool-handlers.test.ts` (existing, unchanged); wording pinned in `src/tests/kanban-cleanup.test.ts` |
| Skill teaches the `archive` board with existing tools, add before delete, no archive tool; Needs `implemented` (K16) | system | `REQ_KAN_SKILLCONTENT` AC-12; `SPEC_KAN_SKILLCONTENT` AC-11 | `src/tests/kanban-cleanup.test.ts` |
| Renderer filter described as plain-text, case-insensitive, no `field:value` syntax; webview filter does not parse it (K78) | system | `REQ_KAN_RENDERER` AC-4 | same file |

Run: full `npx vitest run` @ branch working tree: 70 files, 796 tests pass; `npm run lint`: 0 errors. K68: 5 consecutive `--no-cache` runs of `kanban-tool-handlers.test.ts`, 23 passed each; not reproducible, no change. Mutation check (throwaway edits, restored): first-match owner pick and accepting an empty `ownerName` each fail 9 tests; changing the skill board name and the renderer AC-4 text each fail 1. Not exercised: the webview filter's runtime behaviour (browser script, no export); only its source is asserted and `SPEC_KAN_RENDERER` AC-3 remains for UAT. `kanban-owner-ambiguity.test.ts` deleted: its one source-text assertion (`.filter(` not `.find(`) is now covered by the real-handler ambiguity case. The `## Test Design` heading is restored.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` | K16: archiving procedure at the end of Workflow (`archive` board, add before delete, new `id` with the old one in `notes`, fields declared on the archive board first, `ownerName` always passed) per `SPEC_KAN_SKILLCONTENT` AC-11 | this commit; `board already exists` checked against `extension.ts`; `kanban-board-query` and `kanban-skill-ownername-guard` tests pass |
| `docs/user guides/kanban.md` | New section 'Archiving finished cards' | this commit; `docs/build.ps1 -Clean` succeeded |
| `packages/kanban/README.md`, root `README.md` | none: tool and feature lists are unchanged | checked |
| Mirror `.github/skills/jarvis-kanban.board/SKILL.md` | none: gitignored and untracked, not a deliverable (Admin's finding) | not touched |
| K78, K63 | none: the plain-text filter and `fields: {}` are not described in user documents, and non-string label handling is already in the guide since `kanban-tool-validation` | checked |
| `REQ_KAN_SKILLCONTENT`, `SPEC_KAN_SKILLCONTENT` | status `approved` to `implemented` now that the text exists (Developer's handover) | this commit |
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `9513411c`. Open Findings is `None`. No runtime TypeScript changed: the branch touches `SKILL.md`, docs and tests only, as the outcome requires. The skill text matches `SPEC_KAN_SKILLCONTENT`, the owner tests now run the real handlers, and 796 tests pass. The Needs check exits 0 and no story changed, so User Validation names no `US_*`.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base | `git diff development...HEAD -- packages src` | Only `SKILL.md` (7 lines), `kanban-cleanup.test.ts` (new), `kanban-ownername-required.test.ts` (rewritten), `kanban-owner-ambiguity.test.ts` (deleted) | No finding; the deleted test's `.filter(` assertion is covered by the real-handler ambiguity case | Webview filter runtime is not tested (source assertion only; `SPEC_KAN_RENDERER` AC-3 stays for UAT) |
| Mutation check of owner resolution | `resolveOwnerByName` in `packages/kanban/src/extension.ts` made to take the first match (throwaway, restored) | `kanban-ownername-required.test.ts` fails 9 tests | No finding | |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ 9513411c | pass |
| Lint | `npm run lint` @ 9513411c | pass: 0 errors, 172 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ 9513411c | pass: 70 files, 796 tests |
| Script tests | `python -m unittest discover scripts` @ 9513411c | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ 9513411c | pass |
| Needs check | `python scripts/check_contract_needs.py` @ 9513411c | exit 0 |
| VSIX packaging, clean tree | detached worktree at 9513411c: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` for core, pim, recorder, mcp, flow, kanban | pass: six VSIXs at 0.34.0, no `.wasm`; the Kanban VSIX `SKILL.md` contains the archiving section |

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
| Automated verification and clean-tree VSIX inspection (no `US_*` or `AC_*` Need changed; zero runtime code files modified) | Explicit User delegation (2026-11-24 20:11 CET): 70 test files / 796 tests pass (real-handler owner tests across all 9 tools, mutation-checked), 24 script tests pass, lint 0 errors, strict Sphinx build clean, Needs check exit 0, and six clean-tree VSIXs verified. | 2026-11-24 |

**Decision:** explicit User delegation on automated evidence (2026-11-24 20:11 CET)

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

**Final outcome:** Accepted via explicit User delegation on automated verification and clean-tree VSIX inspection on 2026-11-24 (zero runtime TypeScript files modified). Documents the `archive` board convention in `SKILL.md`, the Kanban guide, and `REQ_KAN_SKILLCONTENT` / `SPEC_KAN_SKILLCONTENT` (K16); aligns `REQ_KAN_RENDERER` AC-4 with the shipped plain-text substring filter and states `fields: {}` as no filter in `REQ_KAN_LIST` / `SPEC_KAN_LIST` (K78, lifting `REQ_KAN_RENDERER` from `draft` to `implemented`); confirms `labelsOf` non-string label filtering is already specified and tested (K63); rewrites `kanban-ownername-required.test.ts` to exercise all nine real tool handlers and retires the superseded `kanban-owner-ambiguity.test.ts` (K62); and confirms `kanban-tool-handlers.test.ts` passes 5 consecutive `--no-cache` cold runs (K68). Squash-integrated into `development` as `b0c376c0`; feature branch `feature/kanban-cleanup` retained; statistics recorded in `.syspilot/stats/kanban-cleanup-stat.md`. Not released.
