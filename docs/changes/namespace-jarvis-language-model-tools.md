# Change Contract: namespace-jarvis-language-model-tools

**Status:** active<br>
**Process owner:** Project Manager<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-10-24<br>
- **Operation Mode**: autonomous

## Handover log

Owned by: Project Manager

Append one line as the last act before handing over to the next appropriate Actor in the development flow.

| Date : Time | From | To | Note |
|---|---|---|---|
|2026-10-24 | 13:46 | Project Manager | Architect | User approved the Intent and Contract release, with autonomous Operation Mode. Determine required specification work for package-prefixed tool references and descriptions. |
|2026-10-24 | 14:00 | Architect | Admin | Specification complete and approved under the autonomous mode; strict Sphinx passed. Assess build, packaging and contribution-point impact, then hand to the Developer. |
|2026-10-24 | 14:03 | Admin | Developer | Infrastructure assessed: no build, CI or packaging step reads the tool references; only the four manifests and one test name them. Run `vsce package` for the four packages as evidence after your manifest edit. |
|2026-10-24 | 14:10 | Developer | Tester | 28 manifest entries and `kanban-board-query.test.ts` updated in `71b66f8`; `vsce package` exit 0 for all four, full vitest 665 of 665. Test Design is yours: my check of all 28 entries was a one-off script and is not committed. Documentation Impact (README, user guides) is still pending with the Technical Writer. |
|2026-10-24 | 14:14 | Tester | Technical Writer | Test Design complete; `tool-reference-namespace.test.ts` passes 23 of 24. The one failure is the documentation check for `REQ_ENG_TOOLREF` AC-6 and `SPEC_ENG_TOOLREF` AC-5: former `#` references remain in `README.md` line 44, `docs/user guides/core.md` line 29 and `docs/user guides/getting-started.md` line 21. Update them, run the test, then hand to Quality. |
|2026-10-24 | 14:17 | Technical Writer | Quality | Updated the three documents to package-namespaced chat references; focused tests pass 24 of 24, clean strict Sphinx and rendered Getting Started verification pass. Documentation Impact complete. |
|2026-10-24 | 14:44 | Quality | Project Manager | Quality reviewed the package-prefixed references and descriptions and records `proceed`; `Open Findings` is `None`. Focused and affected tests pass; clean strict Sphinx and all-package packaging checks pass. CLI listing/collision validation remains User-owned. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User approved the Contract Intent, autonomous Operation Mode, and Contract release in chat on 2026-10-24.

### Goal

Prevent Jarvis tool-reference collisions in CLI consumers by consistently prefixing Language Model Tool references and descriptions with their owning package namespace.

### Value

Users and models can distinguish Jarvis tools from other tools with generic labels such as `task` or `category`, avoiding ambiguous references across extensions.

### Scope

Update every contributed `languageModelTools` entry in packages that provide them (`core`, `pim`, `kanban`, and `syspilot`). Prefix each `toolReferenceName` with `jarvis_<package>_` and begin each `modelDescription` with the matching package prefix, such as `jarvis_core:` or `jarvis_pim:`. Update maintained prompt/documentation references to renamed tool references. Preserve the stable `name` identifiers unless Architect finds a concrete collision requiring a change. Do not change tool behavior or input schemas.

### Observable Outcome

All Language Model Tool references are package-namespaced and unique across Jarvis packages; descriptions begin with the matching package prefix. Automated verification covers every contributed tool and relevant references, and the reported CLI collision is no longer reproducible.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved |
| Version control | yes | Project Manager | Local branch `feature/namespace-jarvis-language-model-tools`; squash-integrated into `development` at closure; branch retained | active |
| Product specification | yes | Architect | Affected Needs and exact package-prefix rules are linked and approved | complete |
| Infrastructure impact | yes | Admin | Build, packaging, and contribution-point impacts are assessed | complete |
| Documentation impact | yes | Technical Writer | Three user documents updated; namespace tests pass 24 of 24; clean strict Sphinx and rendered guide check pass | complete |
| Implementation and unit verification | yes | Developer | Tool references/descriptions updated and targeted tests pass | complete |
| Test design | yes | Tester | Tests trace to approved requirements and cover all packages that contribute tools | complete |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | yes | User | CLI tool listing/reference behavior is accepted or changes are requested | pending |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `docs/userstories/us_mod.rst` (`US_MOD_TOOLREF`) | add, approved | State the user-visible outcome: Jarvis tools are told apart from other extensions' tools by reference and description. |
| `docs/requirements/req_eng.rst` (`REQ_ENG_TOOLREF`) | add, approved | Fix the exact rule: `toolReferenceName` is `jarvis_<package>_<former reference>`, `modelDescription` begins with `jarvis_<package>: `, references are unique, nothing else changes. |
| `docs/design/spec_eng.rst` (`SPEC_ENG_TOOLREF`) | add, approved | List the 28 references of core (15), kanban (9), pim (2), syspilot (2), the reason `name` stays, and the compatibility consequence. |
| `docs/design/spec_actor.rst`, `spec_aut.rst`, `spec_kan.rst`, `spec_msg.rst`, `spec_pim.rst`, `spec_spl.rst`; `docs/requirements/req_actor.rst`, `req_msg.rst` | modify | Replace the restated `toolReferenceName` and `modelDescription` values; link the specs to `REQ_ENG_TOOLREF`; `implemented` becomes `approved` where the text changed (code conforms only after implementation). |
| `REQ_MSG_READ` AC-6, `REQ_MSG_SENDTOSESSION` AC-6 (both deprecated), `REQ_UAT_MSG_TESTDATA` AC-3, `US_UAT_MSG` AC-8 | modify | The notice "[DEPRECATED AND DISABLED ...]" now follows the package prefix instead of being the first text. |
| `docs/design/spec_uat_listjobs.rst`, `spec_uat_sessiontools.rst` | modify | Tester procedures name the new `#` references; `#listSessions` was already stale and now names `jarvis_core_listChatSessions`. |

| Decision or check | Evidence |
|---|---|
| `name` stays. The 28 registered names are pairwise different and `registerTool` rejects duplicates; the collision lies in the generic references `task` and `category`. The MCP surface lists tools by `name`, so it is unaffected. | `packages/core`, `kanban`, `pim`, `syspilot` `package.json` `languageModelTools` (15, 9, 2, 2 entries; `recorder`, `flow`, `mcp` have none); `SPEC_ENG_REGISTER_TOOL` AC-2; `SPEC_ENG_TOOLREGISTRY` (`ToolDescriptor.name`). |
| Package segment is the suffix of `enthali.jarvis-<package>`. Reference is `jarvis_<package>_<former reference>`, so `task` becomes `jarvis_pim_task` and nothing is renamed beyond the prefix. | `SPEC_ENG_TOOLREF`; Contract Scope. |
| Decision, reversible: for the two deprecated core tools the package prefix comes first and `[DEPRECATED AND DISABLED — ...]` follows directly. Reason: the Contract asks for the package at the start of every description; the notice stays ahead of what the tool did, which is what `REQ_MSG_READ` AC-6 protects (visibility at discovery). Residual: the notice is no longer the first characters of the description. | `REQ_ENG_TOOLREF` AC-3; reworded `REQ_MSG_READ`, `REQ_MSG_SENDTOSESSION`, `REQ_UAT_MSG_TESTDATA`, `US_UAT_MSG`. |
| Compatibility: a former `#` reference no longer resolves. The contribution point has no alias property. Names, MCP exposure and the one agent file with a `tools:` list (it names extension ids) are unaffected. | VS Code contribution points reference, `contributes.languageModelTools` properties (checked 2026-10-24); `testdata/.github/agents/syspilot.setup.agent.md` line 3. |
| Scope is the manifest fields only. The description string passed to `registerTool` (what the MCP surface lists) is not part of the Contract and stays. | Contract Scope; `REQ_KAN_MODULE` AC-9 keeps it separate from `modelDescription`. |
| Status: the Operation Mode is autonomous, so the Architect set the new and changed Needs to `approved`; no further User approval round is planned. | Contract header; `docs/Jarvis Contracts/change.md` mode definitions. |
| Impact analysis from the new Needs reaches the restating specs and requirements. | `get_need_links.py REQ_ENG_TOOLREF --direction in --depth 1 --flat --ontology docs/jarvis-ontology.toml` returns 20 specs: `SPEC_ENG_TOOLREF` and the 19 actor, automation, kanban, messaging, PIM and Syspilot specs that restate manifest values; depth 2 both directions adds their requirements and parents. `US_MOD_TOOLREF` and `SPEC_ENG_TOOLREF` depth 1 return `REQ_ENG_TOOLREF` and their parents. The deprecated `SPEC_MSG_READMESSAGE` and `SPEC_MSG_SENDTOSESSION` are reworded but not linked, because deprecated Needs are history. |
| Strict Sphinx build passes. | `python -m sphinx -b html -W --keep-going docs docs/_build/html`: exit 0, build succeeded, 0 warnings. |
| For the next owners: manifests of the four packages (28 entries); `src/tests/kanban-board-query.test.ts` lines 322-334 assert exact `modelDescription` and `toolReferenceName` of two kanban tools; `README.md` line 44, `docs/user guides/core.md` line 29 and `docs/user guides/getting-started.md` line 21 use former `#` references. | Targeted searches of `src`, `packages/*/src`, `packages/*/assets`, `.github`, `README.md`, `docs/user guides`. |
| Observation outside this Contract, for the Project Manager: `US_PIM_CATTOOL`, `REQ_PIM_CATTOOL`, `SPEC_PIM_CATTOOL` and the task counterparts still name `jarvis_category` and `jarvis_task`, while the manifest and `REQ_ENG_TOOLNS` AC-3 say `jarvis_pim_category` and `jarvis_pim_task`; the `jarvis_sendMessage` snippet in `SPEC_MSG_SENDMESSAGE` differs from the manifest description. Left untouched: `name` is not in scope. | Read in `req_pim.rst`, `us_pim.rst`, `spec_pim.rst`, `spec_msg.rst`, `packages/pim/package.json`, `packages/core/package.json`. |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Build and compile (`npm run compile:packages`, tsc, esbuild bundles) | No impact: no TypeScript source changes, and no build script reads `toolReferenceName`. | `git grep -l toolReferenceName` outside `docs` returns five files: `packages/core`, `kanban`, `pim`, `syspilot` `package.json` and `src/tests/kanban-board-query.test.ts`. |
| Packaging and release (`vsce package`, `release.yml`, `.vscodeignore`) | No workflow or ignore rule names a tool reference; `vsce` reads the manifests as JSON. | Developer: `npx vsce package --no-dependencies --out <temp folder>` for `core`, `kanban`, `pim`, `syspilot` after the manifest edit, exit 0 as evidence in the Developer row. |
| Contribution point `languageModelTools` | `toolReferenceName` is required when `canBeReferencedInPrompt` is true; all 28 entries (core 15, kanban 9, pim 2, syspilot 2) have both. The 28 prefixed references are pairwise unique, use only letters, digits, `_` and `-`, and are at most 39 characters. The VS Code reference states no character or length rule and has no alias property, so former `#` references stop resolving. | Scan of the four manifests at `b13c6d8`; VS Code contribution points reference, `contributes.languageModelTools` (checked 2026-10-24). The character and length check is mine, not a documented rule. |
| Other consumers of tool references | None in tasks, workflows, scripts, configuration or provisioned instructions and skills; the MCP surface and the registry use `name`, which stays. The one agent file with a `tools:` list names extension ids. | Same `git grep`; `testdata/.github/agents/syspilot.setup.agent.md` line 3; `canBeReferencedInPrompt` appears only in the four manifests. |
| Test tooling | `src/tests/kanban-board-query.test.ts` asserts exact `toolReferenceName` and `modelDescription` of two tools and fails until the Developer updates it. `heartbeat-agent-model.test.ts` uses `toContain` on `modelDescription`; `kanban-ownername-required.test.ts` and `actorAgent.test.ts` read `name` only. | Read at `b13c6d8`; the Developer row owns the test update. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| How to edit the 28 manifest entries | A throwaway script that inserts `jarvis_<package>_` after each `"toolReferenceName": "` and `jarvis_<package>: ` after each `"modelDescription": "`, and refuses to write unless it finds 15, 9, 2 and 2 matches | Hand edits; parse and re-serialize with `JSON.stringify` | Hand edits risk a missed entry among 56 lines; re-serializing would reformat the manifests. The in-place insert keeps the diff at exactly 56 changed lines (28 references, 28 descriptions). |
| How to verify the edit against the spec | A second throwaway script compares each entry with `SPEC_ENG_TOOLREF` and with the manifest at `HEAD` before the change | Trust the script count | Checks per entry: reference equals the spec list, description is `jarvis_<package>: ` plus the old text, the two deprecated tools keep `[DEPRECATED AND DISABLED —` right after the prefix, every other field is equal, references are unique. Result: 28 entries, 0 problems. |
| Whether to repair the two exact-value assertions in `kanban-board-query.test.ts` or loosen them | Replace the expected strings with the new exact values | Switch to `toContain` | The test pins the manifest text on purpose (`SPEC_KAN_LIST` AC-11, `SPEC_KAN_FILTERVALUES` AC-10); the specs now state the prefixed values, so the exact check stays. |
| Former `#` references in shipped assets | None changed; none found | Rewrite assets | Search of `src`, `packages/*/src`, `packages/*/assets`, `packages/*/resources`, `resources`, `testdata` and `.github` for the 28 former references with a leading `#` finds no hit (`SPEC_ENG_TOOLREF` AC-5). `README.md` and `docs/user guides` are the Technical Writer's row. |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/package.json` | 15 entries: `toolReferenceName` and `modelDescription` prefixed `jarvis_core` | One-off check of all 28 entries against the spec and the old manifest: 28 entries, 0 problems. `npm run compile:packages` exit 0 @ 71b66f8. |
| `packages/kanban/package.json` | 9 entries prefixed `jarvis_kanban` | Same check. |
| `packages/pim/package.json` | 2 entries prefixed `jarvis_pim` | Same check. |
| `packages/syspilot/package.json` | 2 entries prefixed `jarvis_syspilot` | Same check. |
| `src/tests/kanban-board-query.test.ts` | Exact `modelDescription` and `toolReferenceName` of `jarvis_listKanbanItems` and `jarvis_listKanbanFilterValues` now prefixed | `npx vitest run` on this file plus `heartbeat-agent-model`, `kanban-ownername-required` and `actorAgent` tests @ 71b66f8: 96 of 96 pass. |

Packaging @ 71b66f8: `npx vsce package --no-dependencies --out <temp folder>` in `packages/core`, `kanban`, `pim` and `syspilot`: exit 0 each, four `.vsix` files created, then deleted. Full run `npx vitest run` from `C:\workspace\jarvis` @ 71b66f8: 64 files, 665 of 665 pass.

Limits: I added no committed test that covers all 28 entries; the one-off check is not in the repository, so the repeatable coverage of `SPEC_ENG_TOOLREF` AC-1..AC-4 is the Tester's row. I did not mutation-check the updated assertions. The Suite-retirement runs showed load-related failures in the full vitest run; this run showed none.

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Each of the 28 entries has the specified `toolReferenceName` (expected values taken from the `SPEC_ENG_TOOLREF` table, not read from the manifests) | system | REQ_ENG_TOOLREF AC-1, SPEC_ENG_TOOLREF AC-1, US_MOD_TOOLREF AC-1 | `src/tests/tool-reference-namespace.test.ts`, per package: core 15, kanban 9, pim 2, syspilot 2 |
| Each `modelDescription` begins with `jarvis_<package>: ` plus text; only the two deprecated tools carry `[DEPRECATED AND DISABLED —`, directly after the prefix | system | REQ_ENG_TOOLREF AC-2, AC-3; SPEC_ENG_TOOLREF AC-2; US_MOD_TOOLREF AC-2 | same file |
| References are unique across the four packages; registered names stay pairwise different; each package contributes exactly the specified tool set (none added or removed) | system | REQ_ENG_TOOLREF AC-4, AC-5; SPEC_ENG_TOOLREF AC-3, AC-4 (count); US_MOD_TOOLREF AC-1, AC-3 | same file |
| Every tool keeps a `jarvis_` `name`, `displayName`, `icon`, `inputSchema` and `canBeReferencedInPrompt: true` | system | REQ_ENG_TOOLREF AC-5; US_MOD_TOOLREF AC-3 | same file |
| No former `#` reference in README, package READMEs, package assets, user guides, `.github` instructions, skills, agents and prompts, `resources`, `testdata/.github` | system | REQ_ENG_TOOLREF AC-6; SPEC_ENG_TOOLREF AC-5; US_MOD_TOOLREF AC-4 | same file; fails at `4f37597` on three documents, see Documentation Impact |
| Unchanged `name`, `displayName`, `icon`, `tags`, `when`, `inputSchema`, `canBeReferencedInPrompt` against the pre-change manifests, and nothing else in the four manifests changed | system (one-off, not committed: a committed test cannot depend on git history) | REQ_ENG_TOOLREF AC-5; SPEC_ENG_TOOLREF AC-4 | Node script comparing `50ce9f5` with `4f37597`: 28 entries, 0 problems |
| In the CLI, the former `#task` and `#category` references no longer collide with another extension's tools | validation (manual, User) | US_MOD_TOOLREF AC-1, AC-4; Contract Observable Outcome | User validation procedure; not automated |

Evidence: `npx vitest run src/tests/tool-reference-namespace.test.ts` @ `4f37597`: 23 of 24 pass; the failure is the documentation check above (README.md:44, `docs/user guides/core.md`:29, `docs/user guides/getting-started.md`:21). Mutation checks on the manifest tests (each restored afterwards): duplicate reference 3 fail, wrong description prefix 2 fail, deprecated notice before the prefix 3 fail, a former reference kept 3 fail; all above the baseline of 1.

Not covered: that the chat tool picker or a CLI listing displays the new references (needs VS Code or the CLI; static analysis of the manifests only); whether the deprecated-notice wording passes `REQ_MSG_READ` AC-6 beyond its position; the Developer's `kanban-board-query.test.ts` assertions (the Developer's unit test, not re-reviewed here).

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `README.md` | Replace nine former chat references with their `jarvis_core_` or `jarvis_kanban_` references from `SPEC_ENG_TOOLREF`. | `npx vitest run src/tests/tool-reference-namespace.test.ts`: 24 of 24 pass, including the maintained-documentation reference scan. |
| `docs/user guides/core.md` | Replace six former references with `jarvis_core_` references. | Same focused test; `docs/build.ps1 -Clean` strict Sphinx build succeeds. |
| `docs/user guides/getting-started.md` | Replace `#createActor` with `#jarvis_core_createActor`. | Same focused test and clean build; actual `docs/_build/html/user guides/getting-started.html` contains the new reference. |

## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** Proceed at `9afa823`. All 28 `toolReferenceName` values and `modelDescription` prefixes conform to `REQ_ENG_TOOLREF` and `SPEC_ENG_TOOLREF`; package tool identities and behavior remain unchanged. The three maintained-document updates remove the former `#` references from README and user guides, and the test scan finds no stale references in its maintained documentation/assets scope. The clean strict Sphinx build succeeds, and all eight VS Code packages package without the missing-license warning. The focused tests pass 24 of 24 and the related affected test slice passes 120 of 120. No verification finding is open. Actual CLI listing and collision behavior remain for User validation.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Spec-to-code semantic comparison | `REQ_ENG_TOOLREF` AC-1..AC-6; `SPEC_ENG_TOOLREF` AC-1..AC-5; all 28 tool entries across core, kanban, pim and syspilot | Reviewed the 28-value spec table and parsed manifest values through `tool-reference-namespace.test.ts`; inspected manifest diffs. References and descriptions have the prescribed package prefixes; stable `name` values remain unchanged. | No finding | Developer's separate baseline comparison is one-off and not committed; Quality did not independently compare every non-target field against Git history. |
| Horizontal coverage (MECE) | Four package tool sets; README, package READMEs/assets, user guides, instructions, skills, agents, prompts, resources and testdata | The Tester-authored test scans maintained roots for all former `#` references and passes; broader docs-source search found only the intentional generic collision examples in `US_MOD_TOOLREF` and historical Change records. | No maintained-reference finding | Text scan, not manual review of every matching historical record. |
| Relationship analysis (trace) | `US_MOD_TOOLREF` → `REQ_ENG_TOOLREF` → `SPEC_ENG_TOOLREF` → manifest and documentation tests | Directly reviewed the story, requirement acceptance criteria, spec table and test trace mappings. | No finding | Depth 1 by direct reading; no ontology graph query. |
| Unit/system test review | `tool-reference-namespace.test.ts`; `kanban-board-query.test.ts`; `heartbeat-agent-model.test.ts`; `kanban-ownername-required.test.ts`; `actorAgent.test.ts` | Tester test encodes expected values from the spec, asserts all 28 references/descriptions/uniqueness and scans maintained references. Developer assertions check exact kanban values. | No finding | CLI listing behavior is not automatable in these tests; remains User validation. |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit.

| Test or run | Command and commit | Result |
|---|---|---|
| Namespace system test | `npx vitest run src/tests/tool-reference-namespace.test.ts` @ `9afa823` | pass: 24 of 24 |
| Affected test slice | `npx vitest run src/tests/tool-reference-namespace.test.ts src/tests/kanban-board-query.test.ts src/tests/heartbeat-agent-model.test.ts src/tests/kanban-ownername-required.test.ts src/tests/actorAgent.test.ts` @ `9afa823` | pass: 120 of 120 |
| Clean strict documentation build | `docs/build.ps1 -Clean` with output redirected to a log @ `b409b35` | pass: exit 0; rendered Getting Started contains `#jarvis_core_createActor` |
| VSIX packaging | `npx vsce package --no-dependencies` for all eight extension packages after MIT license fix `9afa823` | pass: all eight temporary archives created; no missing-license warning; archives removed |

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
| CLI tool listing and references | User confirmed the package-prefixed references resolve without the reported collision | 2026-10-24 |

**Decision:** accepted by the User in chat on 2026-10-24.

## Closure

**Owner:** Project Manager<br>
**Status:** pending | closed

- [ ] Every included artifact or gate has terminal status and completion evidence.
- [ ] Intent and outcome are `approved`.
- [ ] Quality has recorded `proceed`.
- [ ] Open Findings contains `None`.
- [x] User validation is `accepted`, or its explicit User delegation is recorded in the artifact row.
- [ ] The feature branch is squash-integrated into `development`.
- [ ] Current blocker is `none`.

**Final outcome:** {accepted result and integration commit}
