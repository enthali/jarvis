# Change Contract: kanban-tool-validation

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-15<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered. For K63, the Architect will discuss the invalid-label behavior interactively with the User before settling the specification.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-15 | 01:12 | Project Manager | Architect | User approved Contract release for K14/K17/K62/K63 in autonomous mode; K63 behavior is for interactive User/Architect discussion. |
| 2026-11-15 | 01:40 | Architect | Developer | Spec done; K63 settled with the User: drop non-string labels silently in list; writes also reject non-array/non-string `labels`; K62 is test-only. Implementation row is yours to include; Tester and Technical Writer rows open. |
| 2026-11-15 | 01:18 | Developer | Tester | K14, K17, K63 implemented and K62 handler-level test written, unit tests pass; the write-handler tests I added carry T-6a..T-6d, the old T-6a expectation was changed to the new `id` message; UAT docs (`spec_uat_kanban_mgmt.rst`) are yours; Technical Writer row open. |
| 2026-11-15 | 01:25 | Tester | Technical Writer | UAT spec has T-6 amended, T-28 (labels write/update) and T-29 (list labels); handler tests confirmed; no code defects found; kanban skill/user guide mention of `labels` in update is yours to check. |
| 2026-11-15 | 01:50 | Technical Writer | Quality | Kanban user guide and package README updated for id rejection, labels array on add/update, non-string labels left out of list; skill text needed no change; no migration note needed; `docs/build.ps1 -Clean` succeeded. |
| 2026-11-15 | 01:35 | Quality | Project Manager | Judgment `proceed`, no open findings; the one failing local test comes from an untracked `packages/suite` leftover. |
## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User agreed to one Change for backlog items K14, K17, K62 and K63, in autonomous mode with an interactive Architect/User discussion of K63, in chat on 2026-11-15.

### Goal

Kanban item creation reports the supplied-id error accurately; item updates accept a valid labels array; list projection handles invalid non-string labels according to the agreed specification; tests exercise the real tool handlers.

### Value

Jarvis users and Actor agents get truthful tool errors and consistent Kanban label behavior, while handler-level tests reduce the risk of tests passing against duplicated logic instead of the actual tool surface.

### Scope

Scope is limited to backlog K14 (supplied-id creation error), K17 (labels-array update schema), K62 (review and correct duplicated owner-resolution test logic if needed), and K63 (invalid non-string labels in list projection). The Architect and User will settle K63 behavior interactively in the specification before implementation. Preserve historical test evidence; make no unrelated Kanban refactors or board-format changes.

### Observable Outcome

The specification states the K63 invalid-label behavior; tool schemas and errors match the specification; focused tests call the actual handlers for K14, K17, K62 and K63; Quality reports proceed with no open findings.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved |
| Version control | yes | Project Manager | Local branch `feature/kanban-tool-validation`; squash-integrated into `development` at `4132d5cf`; the branch is retained | merged |
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

| Artifact | Change | Rationale |
|---|---|---|
| `REQ_KAN_ADD` AC-4, `SPEC_KAN_ADD` AC-8 (K14) | modify / add | `id` inside `fields` got the message "must be set as a top-level parameter", which is false for `id`; it now gets "ids are auto-assigned" like a top-level `id` |
| `SPEC_KAN_WRITEVALID` rule 1, `id` note, AC-7 (K14, K17) | modify / add | helper owns the `id` error on both paths; helper also checks `labels` is an array of strings |
| `REQ_KAN_WRITEVALID` AC-7 (K17) | add | write tools must not produce a `labels` value that verify's schema rejects (user decision: reject on writes) |
| `REQ_KAN_UPDATE` AC-11, `SPEC_KAN_UPDATE` AC-13 (K17) | add | published schema typed every `changes` value as string, so a valid `labels` array could not be sent; now string or array of strings |
| `REQ_KAN_LIST` AC-11, `SPEC_KAN_LIST` step 6, AC-8, AC-12 (K63) | add / modify | non-string label entries are dropped silently in both shapes, matching filter-values; verify stays the reporter (user decision 2026-11-15) |
| K62 | no specification change | test-only; covered by handler-level tests |

| Decision or check | Evidence |
|---|---|
| K63 settled interactively with the User | Chose "drop silently" over error, warning field and pass-through; also chose write-side labels rejection |
| Impact analysis | Consumers: `SPEC_KAN_FILTERVALUES` (unchanged, already ignores non-strings), `SPEC_KAN_VERIFY` (schema already requires string labels, unchanged), `spec_uat_kanban_mgmt.rst` (Tester) |
| Status | `REQ_KAN_LIST`, `REQ_KAN_ADD` set `implemented` to `approved` (new ACs unimplemented); `REQ_KAN_UPDATE`/`SPEC_KAN_UPDATE` were already `draft` and stay so |
| Documentation | `SPEC_KAN_SKILLCONTENT` / kanban user guide may mention labels in update; Technical Writer to check |
| Strict build | `python -m sphinx -W -b html docs` passes |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Where the `labels` shape check lives | In `validateItemValues`, so add and update share it | Per-tool checks | SPEC_KAN_WRITEVALID rule 2 makes the helper the single place for value checks |
| Where `id` in `fields` is rejected | Removed `id` from the tool's `fields` built-in-key set; the helper's rule 1 now answers | Special-casing the message in the tool | One owner of the `id` error, as the spec states |
| Label projection | `labelsOf` in `boardQuery.ts` filters to string entries; list and filter-values share it | Separate filter in list | Both tools see one label set per card (SPEC_KAN_LIST step 6) |
| K62 | Replaced the two replicated-logic tests in `kanban-owner-ambiguity` and `kanban-ownername-required` by one test driving the real handler (empty, unknown, ambiguous, single owner); the source-assertion tests stay | Keep the copies | The copies tested their own code, not the handler |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/kanban/src/extension.ts` | `id` in `fields` falls to helper; `labels` array-of-strings check; update `changes` typed `string \| string[]` | `npx vitest run` @ this commit: 708 passed, 1 failed (`extension-readiness-disclosure` AC-1, `packages/suite` still on disk, outside this change) |
| `packages/kanban/src/boardQuery.ts` | `labelsOf` drops non-string entries | `kanban-tool-handlers.test.ts` (new label test) |
| `packages/kanban/package.json` | `changes` values: `anyOf` string, array of strings; description names `labels` | `kanban-write-handlers.test.ts` T-6d |
| `src/tests/kanban-write-handlers.test.ts` | T-6a updated to the new message; T-6a2, T-6c, T-6d added | with `packages/kanban` stashed, 4 of the new tests fail; with it, 130 kanban tests pass |
| `src/tests/kanban-tool-handlers.test.ts` | label projection test, owner resolution handler test (K62) | same |
| `src/tests/kanban-owner-ambiguity.test.ts`, `kanban-ownername-required.test.ts` | replicated-logic tests removed | same |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| T-6 amended: `id` rejected top-level and inside `fields` with one message | validation | `REQ_KAN_ADD` AC-4, `SPEC_KAN_ADD` AC-8 (K14) | `spec_uat_kanban_mgmt.rst`; `kanban-write-handlers.test.ts` T-6a, T-6a2, T-6b |
| T-28 labels shape refused on add/update; valid array written; schema allows array | validation | `REQ_KAN_WRITEVALID` AC-7, `REQ_KAN_UPDATE` AC-11 (K17) | same spec; `kanban-write-handlers.test.ts` T-6c, T-6d |
| T-29 list drops non-string labels in both shapes, equals filter-values set | validation | `REQ_KAN_LIST` AC-11, `REQ_KAN_FILTERVALUES` AC-8 (K63) | same spec; `kanban-tool-handlers.test.ts` |
| K62 owner resolution through the real handler | system | `REQ_KAN_CREATE` AC-3, AC-4 | `kanban-tool-handlers.test.ts` (no new UAT scenario: test-only item, existing T-1 setup covers the rule) |

UAT story AC-14, requirement AC-7 and spec updated; the two kanban handler test files pass (42 tests); strict `sphinx -W` build passes. Live EDH execution not run.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/kanban.md` | add: supplied `id` rejected (also in `fields`), `labels` array of strings; update: `labels` takes an array; list: non-string labels left out | this change's commit; `docs/build.ps1 -Clean` |
| `packages/kanban/README.md` | same facts in the tool table (second copy of the guide) | this change's commit |
| `packages/kanban/assets/skills/jarvis-kanban.board/SKILL.md` | no edit: it already says never supply the id and lists `labels` as `string[]`; Developer owns it | checked |
| Root `README.md` | no edit: tool list is unaffected | checked |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed`. K14, K17, K62 and K63 are consistent from requirement through spec, UAT design, code, tests, user docs and the built kanban VSIX; no open finding. Requirements and specs touched by new ACs are `approved`, not `implemented`, which is correct until the User validates.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Relationship trace | `REQ_KAN_ADD` AC-4, `REQ_KAN_WRITEVALID` AC-7, `REQ_KAN_UPDATE` AC-11, `REQ_KAN_LIST` AC-11 and their SPECs; UAT US AC-14, REQ AC-7, T-6/T-28/T-29; `extension.ts`, `boardQuery.ts`, kanban `package.json`; user guide and package README | Each new AC has code and a test: `id` message (`builtinProps` without `id`; T-6a, T-6a2), labels check in `validateItemValues` (T-6c), schema `anyOf` (T-6d), `labelsOf` filter (list test); strict `sphinx -W` build passes @ 8d441532 | no finding | Semantic read, no Sphinx-Needs link query |
| Peer coverage (MECE) | `labelsOf` shared by list and filter-values; `id` guard on add top-level, add `fields`, update `changes` | Both read tools use one label set (test asserts list equals filter-values counts); the helper owns the `id` error on all three paths; `fields` built-in message now names four keys, each with a top-level parameter | no finding | Peer set chosen by me |
| Test review | `kanban-write-handlers`, `kanban-tool-handlers`, trimmed owner tests | New tests drive the real handlers; K62 replaces two tests that ran their own copy of the logic, the source assertions stay. Mutation: `packages/kanban` restored to 2a00d6d8 makes 4 new tests fail (T-6a, T-6c, T-6d, list labels), restored afterwards, tree clean | no finding | Live EDH UAT not run (Tester states so) |
| Built artifact | `jarvis-kanban-0.32.0.vsix` | Packaged manifest has `changes` values `anyOf` string or string array; bundle contains `Invalid labels: must be an array of strings.` | no finding | VSIX not installed |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality also runs the VSIX packaging of all packages (`test-environments/windows-sandbox/Build-Vsix.ps1`, without starting the Sandbox) and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ 8d441532 | 708 passed, 1 failed: `extension-readiness-disclosure.test.ts` AC-1, because the untracked leftover `packages/suite` exists on disk; outside this change |
| Mutation of new tests | kanban handler tests with `packages/kanban` at 2a00d6d8 | 4 of 42 fail as intended; restored, `git status` clean |
| Strict docs build | `python -m sphinx -W -b html docs` @ 8d441532 | pass |
| VSIX packaging | `pwsh -NoProfile -File test-environments/windows-sandbox/Build-Vsix.ps1` @ 8d441532 | pass: six packages 0.32.0; kanban manifest and bundle checked |

Quality communicates its `proceed` judgment and supporting evidence directly to the Project Manager.

## Open Findings

None

## User Validation

**Owner:** User<br>
**Recorded by:** Project Manager<br>
**Status:** accepted

After Quality's `proceed`, the Project Manager presents the observable outcome and available evidence. The User reviews the evidence or executes validation procedures, then communicates the decision directly to the Project Manager, who records it here. If the User requests changes, the Project Manager transfers responsibility to the artifact owner who can produce the required outcome.

| Validation | Observation | Date |
|---|---|---|
| T-6, T-28, T-29 and K62 handler coverage | User accepted the change based on automated handler-level tests, Quality's `proceed`, strict docs build, and VSIX packaging; no additional EDH run requested. | 2026-11-15 |

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

**Final outcome:** User accepted the change based on automated evidence; K14, K17, K62 and K63 were squash-integrated into `development` at `4132d5cf`. The feature branch is retained.
