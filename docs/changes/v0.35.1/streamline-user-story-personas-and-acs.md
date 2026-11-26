# Change Contract: streamline-user-story-personas-and-acs

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-25<br>
**Related GitHub Issue(s):** #32, #33<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-25 | 07:25 CET | Project Manager | Architect | User approved Contract release (autonomous, zero runtime code changes expected). Scope covers GH #32 (remove implementation details from User Story ACs, specifically `US_MSG_MCPSERVER` AC-2 and a full sweep across `docs/userstories/`) and GH #33 (streamline User Story persona roles across `docs/userstories/` to a clean, defined set). |
| 2026-11-25 | 07:32 CET | Architect | Admin | Product specification complete: personas settled in `docs/namingconventions.rst` (Jarvis User, Actor, Jarvis Developer), all 68 stories normalized, `US_MSG_MCPSERVER` AC-2 and PIM story ACs reworded to outcomes, `REQ_`/`SPEC_MSG_MCPSERVER` aligned to `packages/mcp`. Zero `packages/` changes; strict build passes. |
| 2026-11-25 | 07:34 CET | Admin | Developer | No infrastructure change needed. Needs check stays red until the 28 `approved` Needs are `implemented` and the PM names the 43 stories in User Validation. |
| 2026-11-25 | 07:40 CET | Developer | Technical Writer | 28 Needs set to `implemented`; no `packages/` change. Documentation row is next; the Tester's persona and forbidden-identifier test follows. |
| 2026-11-25 | 08:00 CET | Technical Writer | Tester | User documents reviewed against the story and MCP changes: none states a persona or an internal API name; one stale extension ID found in `packages/mcp/README.md` and left unfixed because the Contract allows no `packages/` change (see Documentation Impact); strict docs build passes. Test design row is yours; check that the ## Test Design heading is present. |
| 2026-11-25 | 08:10 CET | Tester | Quality | Test design complete: 14 static tests in `user-story-personas-and-acs.test.ts`, mutation-checked; suite 834 pass, lint 0 errors. The zero-`packages/` check is a diff check for you. |
| 2026-11-25 | 08:30 CET | Quality | Project Manager | Quality review is `proceed`, Open Findings `None`. The Needs check still lists the 43 changed stories for User Validation (AC-4); Contract delegation allows acceptance on this evidence. |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-25 07:23 CET (autonomous execution approved to resolve GH #32 and GH #33, then close both issues referencing upcoming v0.36.0).

### Goal

Every User Story in `docs/userstories/` uses a unified, consistent set of persona roles (`GH #33`) and states acceptance criteria purely in terms of user- or actor-observable outcomes without leaking internal API/function names (`GH #32`), with zero runtime code changes.

### Value

Across `docs/userstories/*.rst`, persona openings currently mix ad-hoc variants (`Jarvis User`, `Jarvis user`, `VS Code user`, `Actor`, `Jarvis Actor operating in a chat session`, `LLM agent`, `LLM operating within a Jarvis actor session`, `Jarvis administrator`, `board author`, `Jarvis Developer`), and `US_MSG_MCPSERVER` AC-2 still names `vscode.lm.registerTool()` (which is both an implementation detail at User Story level and outdated after the move to `engine.registerTool` / AHP). Unifying personas and keeping implementation details in `REQ_*`/`SPEC_*` makes the top specification layer clean and durable.

### Scope

- **Streamline User Story personas across `docs/userstories/*.rst` (GH #33):**
  - Define and document the canonical persona vocabulary (e.g. **Jarvis User** / **User**, **Actor**, and **Jarvis Developer** — Architect selects and documents the exact canonical forms in `docs/namingconventions.rst` or the story conventions so a regression test can pin them, preserving helpful context qualifiers only in the "who..." / **I want** / **so that** clause rather than inventing one-off role nouns like `LLM agent`, `Jarvis administrator`, or `board author`).
  - Normalize every `.. story::` (`**As a**` / `**As an**`) across all 13 `docs/userstories/us_*.rst` files to use only the canonical persona roles.
- **Remove implementation details from User Story acceptance criteria (GH #32):**
  - Items 1 (`registerDualTool()` in `us_pim.rst`) and 2 (`US_MSG_LISTJARVISSESSIONS`) from GH #32 were already resolved in earlier Changes; fix Item 3 (`US_MSG_MCPSERVER` AC-2 in `docs/userstories/us_msg.rst`, which still names `vscode.lm.registerTool()`) so it states the observable outcome (every Jarvis tool registered in the shared registry is also exposed through the MCP server), and align `REQ_MSG_MCPSERVER` / `SPEC_MSG_MCPSERVER` if needed so no technical detail is lost or contradicts `packages/mcp`.
  - Sweep all other `docs/userstories/us_*.rst` acceptance criteria for leaked internal TypeScript function/method/module names (excluding legitimate user-facing setting keys, command titles, or LM tool names where the tool/setting itself is the user/actor surface) and reword any offenders to observable outcomes.
- **Zero runtime code changes:** No files under `packages/` may be modified (`docs/` and `src/tests/` only).

### Observable Outcome

- Zero files under `packages/` are modified.
- Every `.. story::` in `docs/userstories/*.rst` uses one of the canonical persona roles, enforced by a static test in `src/tests/`.
- `US_MSG_MCPSERVER` AC-2 and all other User Story ACs in `docs/userstories/*.rst` contain no leaked internal API calls such as `vscode.lm.registerTool()` or `registerDualTool()`, enforced by a static test.
- Zero `draft`, `open`, or `deprecated` Needs exist; strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py`, `npm run lint`, and the full Vitest suite pass with zero errors.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-25 07:23 CET) |
| Version control | yes | Project Manager | Local branch `feature/streamline-user-story-personas-and-acs`; squash-integrated into `development` at closure; the branch is retained | merged (`74e67463`) |
| Product specification | yes | Architect | Canonical personas defined, all `us_*.rst` stories normalized (#33), `US_MSG_MCPSERVER` AC-2 and any other leaked implementation details in `us_*.rst` cleaned (#32), strict Sphinx build passes | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | User-facing documents reviewed, or none is affected | complete |
| Implementation and unit verification | yes | Developer | All touched `story`/`req`/`spec` Needs set to `implemented` and suite verified (zero `packages/` changes) | complete |
| Test design | yes | Tester | Static regression test in `src/tests/` enforcing canonical User Story personas and forbidding internal API calls in `docs/userstories/*.rst` | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete (see Quality Review) |
| User validation | not applicable: explicit User delegation (2026-11-25 07:23 CET) to run autonomously like overnight cleanups and accept on automated evidence when zero runtime files change and Quality records `proceed` | User | Observable outcome is accepted or changes are requested | accepted (explicit User delegation, 2026-11-25 07:23 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `docs/namingconventions.rst` (section Personas) | modify | Settles the vocabulary: **Jarvis User**, **Actor**, **Jarvis Developer**. Opening form `**As a** Jarvis User,` / `**As an** Actor,` / `**As a** Jarvis Developer,`; qualifiers belong in **I want** / **so that**; ACs name no internal TypeScript function, method, class or module. Dropped the unused persona "Jarvis Test Engineer" (no story and no other document uses it). |
| 44 Stories in `docs/userstories/us_*.rst` (list below) | modify | All 68 stories now open with exactly one canonical persona (52 Jarvis User, 8 Actor, 8 Jarvis Developer). Case fixes (`Jarvis user`, `As the User`), one-off role nouns replaced, qualifiers moved into the I-want/so-that clause. |
| `US_MSG_MCPSERVER` AC-2 (#32) | modify | States the outcome: every Jarvis tool in the shared registry is also exposed through MCP with the same name and input schema, except the message tools of AC-7. `vscode.lm.registerTool()` is gone. |
| `US_PIM_CATEGORIES`, `US_PIM_TASKS`, `US_PIM_CATVIEW` ACs (#32) | modify | Removed `CategoryService`, `ICategoryProvider`, `DomainCache<T>`, `TaskService.*`, `TaskEditorProvider`, `modifyTask()` and the "Strategy Pattern" label; ACs are now outcomes. Nothing was dropped: provider interface, cache, service, editor and tool detail already live in `REQ_PIM_CACHE`, `REQ_PIM_PROVIDER`, `REQ_PIM_SERVICE`, `REQ_PIM_TASKPROVIDER`, `REQ_PIM_TASKSERVICE`, `REQ_PIM_TASKEDITOR`, `REQ_PIM_TASKTOOL`. |
| `REQ_MSG_MCPSERVER` AC-3 | modify | Was "Each LM Tool"; now "each tool in the shared Jarvis tool registry", which is what `packages/mcp/src/extension.ts` serves via `getRegisteredTools()`. |
| `SPEC_MSG_MCPSERVER` | modify | Was stale: described `src/mcpServer.ts`, `registerMcpTool()` and one long-lived `McpServer`. None of these exist in `packages/mcp`. Now matches `packages/mcp/src/mcpServer.ts` (`ToolProvider` called per request, fresh `McpServer` per POST) and defers package and lifecycle to `SPEC_MOD_MCP_PKG`. |

Stories changed (PM to name in User Validation): US_ACTOR_ACTORS, US_ACTOR_CREATE, US_ACTOR_CREATETOOL, US_ACTOR_TREE, US_ACTOR_WHOAMI, US_CFG_AUTOGITIGNORE, US_CFG_FEATURETOGGLES, US_CFG_FIXEDPATHS, US_CFG_GROUPS, US_CFG_RUNTIMELAYOUT, US_CFG_WORKSPACEFILES, US_COM_AUTHORITY, US_COM_DELIVERY, US_COM_HISTORY, US_COM_NAME, US_COM_SENDER, US_DEV_LOGGING, US_KAN_BOARD, US_KAN_DISCOVER, US_KAN_LANES, US_KAN_QUERY, US_KAN_SKILL, US_KAN_TEXTFIELD, US_KAN_TOOLS, US_MOD_ACTORRULES, US_MOD_INSTALL, US_MOD_READINESS, US_MOD_SKILL_PROVISION, US_MOD_TOOLREF, US_MSG_LOGGING, US_MSG_MCPSERVER, US_MSG_REMINDERS, US_PIM_CATEGORIES, US_PIM_CATTOOL, US_PIM_CATVIEW, US_PIM_TASKS, US_REC_CAPTURE, US_REC_DISPATCH, US_REC_ENABLE, US_REC_LIVEVIEW, US_REC_TRANSCRIPT, US_REL_MARKETPLACE, US_REL_RETIRELEGACY.

| Decision or check | Evidence |
|---|---|
| Persona pattern the Tester pins | Per story block exactly one line matches `^\s*\*\*As (an?)\*\* (Jarvis User\|Actor\|Jarvis Developer),\s*$`; article is `an` for Actor and `a` otherwise. Checked over all 68 stories: zero violations. |
| Forbidden in story ACs (Tester) | Identifiers in the AC text, in or out of backticks: `\w+(Service\|Provider\|Registry\|Manager\|Cache)\b`, `\b[a-z]+[A-Z]\w*\(`, `\w+\(\)`, `\.ts\b`, `\bvscode\.`, `\bengine\.`, `DomainCache`, `registerTool`. Zero matches today. Allowed: setting keys, command titles, tool names and tool parameters, file names and paths. |
| Persona choices for ambiguous stories | `US_COM_SENDER` (Actor or User) and `US_KAN_BOARD`, `US_MSG_REMINDERS`, `US_MOD_TOOLREF` ("or agent / model") became **Jarvis User**: each so-that clause is about what the person trusts or sees; the ACs already say which calls the agent makes. `US_KAN_TOOLS/QUERY/SKILL`, `US_PIM_CATTOOL`, `US_ACTOR_WHOAMI/CREATETOOL` became **Actor** (an LLM working in a chat). Reviewable by the PM. |
| Impact analysis | Incoming links of `US_PIM_CATEGORIES`, `US_PIM_TASKS`, `US_MSG_MCPSERVER` checked before editing; no link or ID changed, statuses unchanged. |
| Build and format | Strict Sphinx build `-W --keep-going -E` exits 0; `acceptance-criteria-format` 5/5; zero `draft`/`open`/`deprecated` in `docs/`; zero `packages/` changes. |
| Open for the PM (not swept) | Story ACs still name settings, file names/paths, tool names and tool parameters (for example `US_CFG_FIXEDPATHS`, `US_PIM_CATTOOL` AC-2, `US_MSG_MCPSERVER` AC-3/AC-4/AC-6). The Contract excludes these. The user's broader L0 rule (no file, setting or tool names in story ACs) would be a separate Contract. |
| Observation | `check_contract_needs.py` still reports the changed Needs as `approved` (Developer sets `implemented`) and stories not named in User Validation (PM). |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Docs build, Needs check, CI, manifests | none | Branch touches only `docs/` (13 `.rst` files and the Contract); no file under `packages`, `src`, `.github`, `.vscode`, `scripts`. Strict Sphinx build exits 0. `check_contract_needs.py` exits 1 as designed with 71 hits: 28 changed Needs are `approved` (Developer sets `implemented`) and 43 changed stories are not named in User Validation (Project Manager; the list in Product Specification matches the 43 reported). |
| Tests reading `docs/userstories` | none | Only `acceptance-criteria-format.test.ts` and `purge-deprecated-and-stale-specs.test.ts` read the stories; both pass (19 tests). No script or workflow parses story text or personas. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Which Needs to set | The 28 `approved` Needs the Needs check lists (26 stories, `REQ_MSG_MCPSERVER`, `SPEC_MSG_MCPSERVER`) set to `implemented` | none | The Contract changes only documentation and zero `packages/` files, so no runtime change is needed; each edit changes only the `:status:` line (diff: 28 insertions, 28 deletions). |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `docs/userstories`, `docs/requirements/req_msg.rst`, `docs/design/spec_msg.rst` (9 files) | 28 Needs `approved` to `implemented` | `npx vitest run` @ working tree: 73 files, 820 tests pass; Needs check after commit: see handover log |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Every story has exactly one persona line, and it is `Jarvis User`, `Actor` or `Jarvis Developer`; article `an` for Actor, `a` otherwise | validation | GH #33, Observable Outcome 2 | `src/tests/user-story-personas-and-acs.test.ts` |
| `docs/namingconventions.rst` defines the three personas and no longer lists `Jarvis Test Engineer` | validation | GH #33 | `src/tests/user-story-personas-and-acs.test.ts` |
| No story AC contains a class name (Service/Provider/Registry/Manager/Cache), camelCase call, `name()`, `.ts`, `vscode.`, `engine.`, `DomainCache` or `registerTool` (one case per pattern) | validation | GH #32, Observable Outcome 3 | `src/tests/user-story-personas-and-acs.test.ts` |
| `US_MSG_MCPSERVER` AC-2 states the MCP outcome without the registration call | validation | GH #32 item 3 | `src/tests/user-story-personas-and-acs.test.ts` |

Method: static text checks over `docs/userstories/us_*.rst` (13 files, 68 stories), using the patterns the Architect recorded in Product Specification. Mutation-checked: a foreign persona, a wrong article, `registerTool` in an AC and a `CategoryService` mention each fail the suite. Setting keys, file names and tool names stay allowed, as the Contract excludes them. "Zero `packages/` changes" is not tested; it is a diff check for Quality. Full suite 74 files, 834 tests pass; lint 0 errors.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/mcp.md`, `packages/mcp/README.md` | `SPEC_MSG_MCPSERVER` and `REQ_MSG_MCPSERVER` AC-3 now say what `packages/mcp` does (all tools of the shared registry, input schemas from the manifests, Agent Host tools not exposed). Both documents already said exactly that | checked, no edit needed for the Change |
| `packages/mcp/README.md` | Stale, not caused by this Change: names `enthali.jarvis` (the retired shim) as the Jarvis core extension in two places; core is `enthali.jarvis-core` (`extensionDependencies` in `packages/mcp/package.json`). **Not fixed here**: the Contract outcome is zero files under `packages/`. Open for the Project Manager: fix in the next Change that touches the MCP package, or as an editorial fix on `development` after closure | found by `rg` over README, guides and package READMEs; the old ID otherwise appears only in `core-gh.md`, where it correctly names the shim |
| `docs/user guides/pim.md`, `packages/pim/README.md` | `US_PIM_*` ACs lost internal class names; user documents never used them | checked |
| All guides and READMEs | Persona wording (`Jarvis User`, `Actor`, `Jarvis Developer`) | none: the user documents contain no User Story personas; 'persona' there means the Actor's own persona, a different thing |
| `docs/releasenotes.md` | none: no runtime or user-visible behaviour changes | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `b5f201a7`. The Change is documentation and one test file; the personas and ACs match the Intent and the tests pin them. Open Findings is `None`.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Scope diff | `git diff development...HEAD`: 13 `.rst`, the Contract and `src/tests/user-story-personas-and-acs.test.ts` | `--name-only` over `packages src scripts .github` lists only the new test; zero `packages/` files | no finding | none |
| Persona scan | all 68 `.. story::` openings in `docs/userstories/us_*.rst` | 52 Jarvis User, 8 Actor, 8 Jarvis Developer, no other form | no finding | persona fit per story is the Architect's judgment, reviewable by the PM |
| Identifier scan | story text for `registerTool`, `registerDualTool`, `vscode.`, `engine.`, `.ts`, `DomainCache` | zero matches | no finding | settings, file names and tool names stay allowed by the Contract |
| Spec vs code | `SPEC_MSG_MCPSERVER` against `packages/mcp/src/mcpServer.ts` and `extension.ts` | `ToolProvider` per request, fresh `McpServer` per POST, tools from `getRegisteredTools()`: matches | no finding | none |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ b5f201a7 | pass: 74 files, 834 tests |
| Lint, strict docs, script tests | `npm run lint`; `python -m sphinx -W --keep-going -b html docs docs/_build/html -E`; `python -m unittest discover scripts` @ b5f201a7 | pass: 0 errors (204 warnings); docs build; `OK` |
| Needs check | `python scripts/check_contract_needs.py` @ b5f201a7 | 43 hits, all AC-4 (stories not named in User Validation, the PM's step); no other hit |
| Mutation check | `**As a** Jarvis User,` changed to `Jarvis user` in `us_pim.rst` | pass: 2 of 14 persona tests fail; file restored |
| VSIX build | not run: no `packages/`, manifest, README or build file changed | not applicable |

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
| Automated verification of all 43 modified User Stories (`US_ACTOR_ACTORS`, `US_ACTOR_CREATE`, `US_ACTOR_CREATETOOL`, `US_ACTOR_TREE`, `US_ACTOR_WHOAMI`, `US_CFG_AUTOGITIGNORE`, `US_CFG_FEATURETOGGLES`, `US_CFG_FIXEDPATHS`, `US_CFG_GROUPS`, `US_CFG_RUNTIMELAYOUT`, `US_CFG_WORKSPACEFILES`, `US_COM_AUTHORITY`, `US_COM_DELIVERY`, `US_COM_HISTORY`, `US_COM_NAME`, `US_COM_SENDER`, `US_DEV_LOGGING`, `US_KAN_BOARD`, `US_KAN_DISCOVER`, `US_KAN_LANES`, `US_KAN_QUERY`, `US_KAN_SKILL`, `US_KAN_TEXTFIELD`, `US_KAN_TOOLS`, `US_MOD_ACTORRULES`, `US_MOD_INSTALL`, `US_MOD_READINESS`, `US_MOD_SKILL_PROVISION`, `US_MOD_TOOLREF`, `US_MSG_LOGGING`, `US_MSG_MCPSERVER`, `US_MSG_REMINDERS`, `US_PIM_CATEGORIES`, `US_PIM_CATTOOL`, `US_PIM_CATVIEW`, `US_PIM_TASKS`, `US_REC_CAPTURE`, `US_REC_DISPATCH`, `US_REC_ENABLE`, `US_REC_LIVEVIEW`, `US_REC_TRANSCRIPT`, `US_REL_MARKETPLACE`, `US_REL_RETIRELEGACY`; zero `packages/` files modified) | Explicit User delegation (2026-11-25 07:23 CET): 74 test files / 834 tests pass (including 14 mutation-checked persona and implementation-detail tests across all 68 stories), 24 script tests pass, lint 0 errors, and strict Sphinx build clean. | 2026-11-25 |

**Decision:** explicit User delegation on automated evidence (2026-11-25 07:23 CET)

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

**Final outcome:** Accepted via explicit User delegation on automated verification on 2026-11-25 (zero `packages/` files modified). Defines the three canonical User Story personas (`Jarvis User`, `Actor`, `Jarvis Developer`) in `docs/namingconventions.rst` and normalizes all 68 User Stories across `docs/userstories/us_*.rst` (GH #33); removes leaked internal API names (`vscode.lm.registerTool()`) from `US_MSG_MCPSERVER` AC-2 and PIM story ACs while aligning `REQ_MSG_MCPSERVER` and `SPEC_MSG_MCPSERVER` with `packages/mcp` (GH #32); and enforces both rules permanently in `src/tests/user-story-personas-and-acs.test.ts` (834 tests pass). Squash-integrated into `development` as `74e67463`; feature branch `feature/streamline-user-story-personas-and-acs` retained; statistics recorded in `.syspilot/stats/streamline-user-story-personas-and-acs-stat.md`. Scheduled to ship in upcoming v0.36.0.
