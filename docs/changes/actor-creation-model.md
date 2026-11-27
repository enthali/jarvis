# Change Contract: actor-creation-model

**Status:** accepted<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-27<br>
- **Operation Mode**: autonomous

- **autonomous** - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-27 | 22:28 CET | Project Manager | Architect | User approved Contract release at 22:28 CET. Explicit creation requires a description and allows a validated optional model; automatic agent preparation stays independent of the catalog. |
| 2026-11-27 | 22:36 CET | Architect | Developer | Specification complete and approved. The agent description falls back to the Actor name, where the code writes `Actor <name>` today. The tool input stays `summary`, now required. |
| 2026-11-27 | 23:10 CET | Developer | Technical Writer | Creation command and tool require a summary and take an optional validated model; the README text on creating an Actor is now out of date. Needs set implemented. |
| 2026-11-27 | 23:30 CET | Technical Writer | Admin | Getting Started now describes the three creation steps and the tool rules; Core guide and Core README name the required description and optional model; strict docs build passes. Your Infrastructure row is still undecided (the Architect expects none) and the Test design row follows; please pass the Contract to the Tester after yours. |
| 2026-11-27 | 22:42 CET | Admin | Tester | No infrastructure change needed; checks in my section. Removed the leftover template lines at the top of this file. |
| 2026-11-27 | 23:00 CET | Tester | Quality | Test design complete in `src/tests/actor-creation-model.test.ts` (41 tests, no defect found); full suite and lint green. `jarvis.newActor` is checked as text only; picker, Escape and the applied model are User validation. Core manifest and READMEs changed, so VSIX packaging applies. |
| 2026-11-27 | 23:05 CET | Quality | Project Manager | `proceed` at 890860b3: suite 957 pass, seven VSIX clean, two mutations caught. Picker, Escape and whether VS Code applies the written model are User Validation. Name `US_ACTOR_CREATE`, `US_ACTOR_CREATETOOL` and the two journey ACs there. The Implementation row still holds the template text `yes / not applicable: {reason...}` (Developer's row). |

## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** 2026-11-27 22:23 CET (scope; Contract release is a separate gate)

### Goal

Require a non-empty description when explicitly creating an Actor and allow an optional Copilot model for the generated agent file. Keep automatic agent preparation independent of model availability.

### Value

A purposeful description makes the custom agent identifiable in the picker. Optional model selection makes the intended model explicit without making it a prerequisite for creating or contacting an Actor.

### Scope

- The VS Code creation command and the Actor creation tool require a name and a description that is not blank. Model selection is optional; the UI offers a choice from the current catalog plus a no-model option. The tool accepts a model only if currently available. The Architect verifies which Copilot catalog values are usable in VS Code agent front matter.
- With no model specified, omit `model:` and do not query the model catalog for validation. With a model specified, validate before creating files or queuing the optional first message. An invalid tool value returns the current valid choices; an unavailable catalog reports that condition separately.
- When chat preparation or message delivery generates a missing agent file automatically, use the existing Actor summary if non-empty, otherwise the Actor name as its description. Omit `model:` and do not query the model catalog. Preserve existing agent model entries and custom content; a later catalog change does not cause Jarvis to revalidate the model during message delivery.
- Candidate impacts from `MOD_ACTOR`, `REQ_ACTOR_CREATETOOL`, and `REQ_COM_CHATNAME`: explicit creation command and tool, agent front matter, and automatic chat preparation. The Architect determines the final specification changes. Intended for the next release, subject to verification and acceptance.

### Observable Outcome

- Explicit creation rejects a blank description. A valid selected model appears in new agent front matter, while no model leaves that field absent. A rejected or unavailable model creates no Actor files and queues no first message.
- A legacy Actor with no summary and no agent file can receive a message through the normal chat preparation path: the new file has the Actor name as its description, no model, and no catalog dependency. An existing model entry is preserved.
- Validate the generated agent in the VS Code picker with and without a model, and verify invalid tool input returns usable model choices.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-27 22:28 CET) |
| Version control | yes | Project Manager | Local branch `feature/actor-creation-model`; squash-integrated into `development` at closure; the branch is retained | active |
| Product specification | yes | Architect | Changed specification artifacts are linked and checked | complete |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete (none affected) |
| Documentation impact | yes | Technical Writer | Affected user-facing documents are updated | complete |
| Implementation and unit verification | yes | Developer | Changed code and passing unit tests are recorded | complete |
| Test design | yes | Tester | Requirement-level tests and validation procedures trace to the changed specification | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | proceed |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | pending |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `US_ACTOR_CREATE` | modify: AC-3 (description required, model choice, cancel creates nothing), new AC-7 (the model the User chose) | The User-visible outcome of explicit creation changes. |
| `US_ACTOR_CREATETOOL` | modify: AC-2, new AC-9 (description required, optional model, refusals leave nothing behind) | Same outcome for the tool. |
| `REQ_ACTOR_CREATE` | modify: AC-4, AC-5, AC-8; new AC-11 (model picker) | Required summary, picker with "No model", Escape cancels at every step. |
| `REQ_ACTOR_CREATETOOL` | modify: AC-1, AC-2; new AC-10 (summary validation), AC-11 (model validation and its two errors) | Inputs and the order of checks before any write. |
| `REQ_ACTOR_WHOAMI` | new AC-13 (description rule), AC-14 (`model` only on explicit creation, never queried otherwise, existing entries preserved) | Defines the agent front matter for both explicit and automatic preparation. |
| `REQ_COM_CHATNAME` | modify: AC-5 | The description is the summary, or the Actor name when it is empty. |
| `SPEC_ACTOR_CREATE` | modify: `validateActorSummary`, `actorSummaryProblem`, `validateModel`, command flow steps 3–8, new AC-6, AC-7 | Shared validation lives in `actorCreation.ts`; the model list is injected. |
| `SPEC_ACTOR_CREATETOOL` | modify: algorithm steps 1–11, `languageModelTools` schema, AC-1, new AC-7 | `summary` required, optional `model`, the model check after the existence check. |
| `SPEC_ACTOR_WHOAMI` | modify: signature (`summary`, `model`), callers, step 5, file content, new "Model value" paragraph, new AC-11, AC-12 | Where the description and the `model` line are written, and why the identifier form is used. |
| `SPEC_COM_INJECT` | modify: "Description of the agent file" | The fallback is the Actor name. |
| `AC_ACTOR_CREATE_JOURNEY` | modify: steps 1–2, new step 3 | Summary can no longer be skipped; the model choice is part of the journey. |
| `AC_ACTOR_CREATE_REFUSAL_JOURNEY` | add | Refused tool calls leave nothing behind; a legacy Actor without summary still gets an agent. |
| `MOD_ACTOR` | unchanged | Its text already names creation and identity; no new capability category. |

All changed Needs are `approved`. No new setting, no change to `actor.yaml` (`summary` stays optional there, because hand-made legacy Actors have none) and no change to `REQ_ACTOR_SCHEMA`.

| Decision or check | Evidence |
|---|---|
| **Decision:** `summary` stays the one data field and the tool input; it becomes required and not blank. No second `description` input. Reason: the summary already is the agent `description` (`REQ_COM_CHATNAME` AC-5), so a second field would be a second name for the same value. Cost: a caller that omits `summary` is now rejected. If the User wants the input renamed, it is a rename in `SPEC_ACTOR_CREATETOOL` and its requirement. | `REQ_ACTOR_CREATETOOL` AC-1, AC-10 |
| **Finding, usable model values:** the `model` front-matter value is a string (or an array); the first available one wins and an omitted field uses the chat's selected model (VS Code custom-agent reference). In the VS Code 1.148.0 source the host resolves each value against the models of the session's harness: exact identifier first, then display name (case-insensitive, optional `(copilot)`), and for non-copilot vendors `<name> (<vendor>)`. Bring-your-own-key models match by identifier only. No match is logged ("Custom agent model preference is not available") and no model is applied, without an error in the chat. The qualified display name used in this repository's `.github/agents` is the form of the deprecated Local harness. | Read in `workbench.desktop.main.js` (resolver `tmt` / `cRe`); not observed live. |
| **Decision:** Jarvis writes the catalog `model` value (the identifier), the one form that resolves for every class of model, and the same value `jarvis_listModels` shows. The picker labels entries with the `model` value and the vendor, because that list has no display name (`REQ_AUT_LISTMODELS` AC-3). | `SPEC_ACTOR_WHOAMI` "Model value" |
| **Decision:** the catalog is `listAvailableModels()` (`SPEC_AUT_LISTMODELS`), injected into the handler (`listModels`), so `engine/` does not import `apps/`. The tool checks the model after the existence check, so an existing Actor still answers `created: false`, and before any write or message. No model means no catalog call. | `SPEC_ACTOR_CREATE`, `SPEC_ACTOR_CREATETOOL` step 6 |
| **Decision:** Escape in the summary input or the model picker cancels the creation (it used to skip the summary). With an unavailable list the picker offers only "No model" and logs a warning. | `REQ_ACTOR_CREATE` AC-8, AC-11 |
| **Decision:** automatic preparation passes no `model`; `ensureActorAgent` has no catalog access. An empty summary gives the Actor name as description. | `REQ_ACTOR_WHOAMI` AC-13, AC-14 |
| **Impact analysis:** `get_need_links.py` (both directions) on `REQ_ACTOR_CREATE`, `REQ_ACTOR_CREATETOOL`, `REQ_ACTOR_WHOAMI`, `REQ_COM_CHATNAME`, `SPEC_ACTOR_WHOAMI`, `SPEC_ACTOR_CREATETOOL`. The Kanban Needs that link to `REQ_ACTOR_WHOAMI` and `SPEC_ACTOR_WHOAMI` use only the existence of the agent, not its content; unchanged. | Script output at this commit |
| **Check:** strict Sphinx build (`-W --keep-going -E`) without warnings; `npx vitest run src/tests/acceptance-criteria-format.test.ts`: 5 passed. | This commit |

**Open points:**

- The model list of `vscode.lm` may name a model that the host does not offer to the session's harness. Such a model would pass validation and not be applied. The User checks this in the VS Code picker; the Developer reports a finding if a listed model is not applied.
- `AC_ACTOR_PHASE1_*` create Actors with "+" under a name only; the User is now also asked for the summary and a model. The criteria stay valid, the Tester may add the two inputs to their set-up.

**Notes for the next owners:**

- Code differs from the specification in these places: `descriptionOf` in `actorAgent.ts` writes `Actor <name>` for an empty summary (now the Actor name); `ensureActorAgent` needs the optional `model`; `jarvis.newActor` and `createActorHandler` need the summary check, the picker or `validateModel`, and the `listModels` dependency; the `jarvis_createActor` schema and `modelDescription` in `package.json`; unit tests that create an Actor without a summary.
- The Infrastructure and Documentation rows are for Admin and the Technical Writer to decide; my view is that no infrastructure is affected, while the README text on creating an Actor changes.

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| Build, packaging, `release.yml`, `docs.yml` | None. The change edits existing files of `packages/core` and the Core manifest's `jarvis_createActor` tool entry (`modelDescription`, `inputSchema`); no package, dependency, secret, build step or version marker is added. | No edit. `npm run compile:packages` exits 0, `node packages/core/build.js --minify` runs, and `vsce package --no-dependencies` of Core succeeds (75 files) at `f6e133bf`; the temporary VSIX was removed. |
| Test and lint baseline | None. New cases live in existing files under `src/tests`; `vitest.config.ts` is unchanged. | `npx vitest run` 916 passed (78 files); `npm run lint` 0 errors, 206 warnings; `python -m unittest discover scripts` 24 OK; strict Sphinx build `-W --keep-going -E` clean. |
| Tool manifest and `jarvis_listModels` | The manifest text points to `jarvis_listModels`, which is declared in the same manifest. | Checked by grep; no action. |
| Contract file | The file began with twelve lines of leftover template instructions above its title (reported by the Technical Writer). | Removed in this commit; header, Handover log and sections are unchanged. |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Where the model check lives | `validateModel` in `actorCreation.ts` with the catalog injected as `listModels`; `extension.ts` wires `listAvailableModels()` | `engine/` importing `apps/session/heartbeat` | Keeps `engine/` free of `apps/`, as SPEC_ACTOR_CREATETOOL states |
| Model check in the command | The QuickPick is the check; no `validateModel` call. A failing catalog logs a warning and offers only "No model" | Calling `validateModel` after the pick | Matches SPEC_ACTOR_CREATE: the user can only pick a listed value |
| `model` in the agent file | Written only when a new file is created; existing files keep their entries | Rewriting `model` on every ensure | `resolveActorForChat` passes none, so automatic preparation never touches the catalog or the model |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/src/engine/actors/actorCreation.ts` | `validateActorSummary`, `actorSummaryProblem`, `validateModel`; `writeActorFiles` requires the summary | `npx vitest run` @ this commit: 916 passed |
| `packages/core/src/engine/actors/actorAgent.ts` | optional `model` on creation; description falls back to the Actor name | `actorAgent.test.ts`: model line only in new files, existing entry kept |
| `packages/core/src/engine/actors/actorRuntime.ts` | `createActorHandler` order: name, summary, existing folder, model, write; new `listModels` dependency | `actorRuntime.test.ts`: refusals write and queue nothing; no catalog call without `model` |
| `packages/core/src/extension.ts` | `jarvis.newActor`: required summary, model QuickPick, Escape cancels; `listModels` wired | `npx tsc -p packages/core --noEmit`, `npm run lint`: 0 errors |
| `packages/core/package.json` | `jarvis_createActor` schema: `summary` required, `model` added, new `modelDescription` | `retire-legacy-session-lookup.test.ts` migrated |
| `src/tests/*.test.ts` | Migrated the three tests that created an Actor without a summary and the `Actor <name>` fallback | see above |
| `docs/**/*.rst` | 10 Needs set `implemented` | `check_contract_needs.py`: only AC-4 hits for the User stories remain |

Open: a model listed by `vscode.lm` may not be offered to the session's harness; it passes validation but would not be applied. Not testable by unit tests; the User checks in the picker.

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| Summary validators: missing, non-string, empty and white-space values rejected with `invalid actor summary:`; padded text accepted; InputBox problem string | system | REQ_ACTOR_CREATETOOL AC-10, REQ_ACTOR_CREATE AC-4 | `src/tests/actor-creation-model.test.ts` |
| Model validation: listed model, unlisted model (names value and lists `vendor`/`model`), empty list, unreadable catalog is a different error, exact match only | system | REQ_ACTOR_CREATETOOL AC-11 | same file |
| Tool order of checks: summary before existence and catalog; existing Actor answers `created:false` with an invalid model and no catalog call | system | REQ_ACTOR_CREATETOOL AC-7, AC-10, AC-11 | same file |
| Refusal (unlisted model, unreadable catalog) creates no folder or agent file, queues no first message, opens no chat, adds no Actor | system | REQ_ACTOR_CREATETOOL AC-11, US_ACTOR_CREATETOOL AC-9 | same file |
| Valid model reaches the agent file only; no model or empty model gives no `model:` line and no catalog call | system | REQ_ACTOR_CREATETOOL AC-11, REQ_ACTOR_WHOAMI AC-14 | same file |
| Legacy Actor, automatic preparation: Actor name as description, no model, multi-line summary on one line, existing `model` and body kept; chat preparation passes no model and reads no catalog | system | REQ_ACTOR_WHOAMI AC-13, AC-14, REQ_COM_CHATNAME AC-5 | same file |
| Manifest of `jarvis_createActor`: required `name` and `summary`, optional `model` and `initialMessage`, no `agent`, text points to `jarvis_listModels` | system | REQ_ACTOR_CREATETOOL AC-1 | same file |
| `jarvis.newActor` wiring (static): name, existence check, summary with inline validation, model picker with "No model" first and no agent picker; each Escape returns before files are written; model handed to the agent after writing | system | REQ_ACTOR_CREATE AC-3..AC-8, AC-11 | same file |
| Ten changed Needs are `implemented`; both create journeys approved and validating the two User stories; Getting Started, Core README state the rules | system | US_ACTOR_CREATE, US_ACTOR_CREATETOOL | same file |
| Run `AC_ACTOR_CREATE_JOURNEY` and `AC_ACTOR_CREATE_REFUSAL_JOURNEY` in the Extension Development Host: picker with and without a model, chat model picker shows the chosen model, invalid tool input lists usable models | validation | US_ACTOR_CREATE, US_ACTOR_CREATETOOL | `docs/acceptance/ac_actor_identity.rst`, User validation |

**Method:** black-box from REQ/SPEC; the Developer's cases in `actorRuntime.test.ts` and `actorAgent.test.ts` are not duplicated. Mutation-checked: 15 of 16 changes to code, manifest and Needs failed the new file (removed summary check, existence check moved after the model check, wrong error text, case-insensitive model match, blank summary accepted, `Actor <name>` fallback, removed Escape guards, removed inline validation, model passed in chat preparation, "No model" entry removed, `summary` not required, Need status changed). One survived: the wording ` (none)` for an empty list is not specified, so it is not asserted; only the `model not available:` prefix is.<br>
**Limits:** `jarvis.newActor` is checked as text, not run, because the Core extension cannot be activated in the unit harness; the picker, the Escape behaviour and whether VS Code applies the written `model` (Architect's open point) belong to User validation. `AC_ACTOR_PHASE1_*` still say "+" without naming the new inputs; they stay valid and I did not edit them. Full suite 79 files, 957 tests pass; lint 0 errors, 208 warnings (206 before; the two new ones are `as any` casts copied from the existing tests).

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/getting-started.md` 'Create your first actor' | Was one sentence ('Click + ... Jarvis creates the actor folder'). Now the three prompts (name, required description, model or No model), Escape cancels with nothing created, what is created (`actor.yaml`, `context.md` with name heading and description), the `jarvis_core_createActor` tool rules (name and non-blank `summary` required, optional `model` from `jarvis_listModels`, refusals create, queue and open nothing, `created: false` for an existing Actor), legacy Actors without a description keep working (agent description is the Actor name, no model, existing `model` line kept) (`US_ACTOR_CREATE` AC-1 to AC-7, `US_ACTOR_CREATETOOL` AC-9, `REQ_ACTOR_WHOAMI` AC-13, AC-14) | this commit; `docs/build.ps1 -Clean` succeeded |
| `docs/user guides/core.md`, `packages/core/README.md` | Agent file description now includes the Actor's description; Core README's 'does not prompt for an agent' could be read as 'asks for nothing' and now states the three inputs | this commit |
| Root `README.md` | none: names the creation tool only as a reference | checked |
| `docs/releasenotes.md` | Release's. User-visible change: creating an Actor now requires a description, and the tool call fails without `summary` | not edited |

**Not verified by me:** that VS Code applies the written `model` value. The Architect read the resolver in the VS Code source but did not observe it live; the guide therefore says an unavailable model is ignored without an error and the chat's own model is used, and does not promise that the Actor 'works with' the chosen model. Once the User has checked the picker, the sentence can be tightened.

**Observation (not mine):** the Contract file starts with leftover template instructions above its title (lines 1 to 12 up to 'Canonical Change Contract Template'), so the first heading is not the Contract title.
## Quality Review

**Owner:** Quality<br>
**Status:** proceed

**Current judgment:** `proceed` at 890860b3. Code, manifest and Needs agree: summary is required and validated before the existence check and any write, the model is checked only when given and against the injected catalog, automatic preparation passes no model and falls back to the Actor name, and `jarvis.newActor` cancels at every Escape. The 41 new tests and the Developer's migrated cases exercise this; removing the handler's summary check fails 2 tests and dropping the `model:` line fails 2. Not verified by me: `jarvis.newActor` (picker, Escape, applied model) is checked only as text because Core cannot be activated in the harness, and whether VS Code applies the written `model` value is the Architect's open point. Both are User Validation. `US_ACTOR_CREATE` and `US_ACTOR_CREATETOOL` are not yet named there (Project Manager's step).

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Code read | `actorCreation.ts`, `actorAgent.ts`, `actorRuntime.ts`, `extension.ts` (`jarvis.newActor`), Core manifest tool entry, READMEs | `git diff development...HEAD -- packages` read against `REQ_ACTOR_CREATE`, `REQ_ACTOR_CREATETOOL`, `REQ_ACTOR_WHOAMI` | No finding | `jarvis.newActor` not run |
| Mutation check | summary check removed from `createActorHandler`; `model:` front-matter line disabled | `actor-creation-model`, `actorRuntime`, `actorAgent` tests: 2 of 49 and 2 of 62 fail; files restored | Tests pin both behaviours | Two mutations only; the Tester reports 15 of 16 |
| Needs check | `scripts/check_contract_needs.py` on the feature branch | Exit 1, only AC-4 for `US_ACTOR_CREATE` and `US_ACTOR_CREATETOOL` | Project Manager's naming step | none |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Full suite | `npx vitest run --testTimeout 15000` @ 890860b3 | pass: 79 files, 957 tests |
| Compile | `npm run compile:packages` @ 890860b3 | pass |
| Lint | `npm run lint` @ 890860b3 | 0 errors, 208 warnings |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ 890860b3 | pass |
| Script tests | `python -m unittest discover scripts` @ 890860b3 | OK |
| Clean-tree VSIX build | detached worktree @ 890860b3: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` per package | pass: seven VSIX built clean; Core manifest tool: required `name,summary`, properties `name,summary,model,initialMessage`, engine `^1.144.0`, no `.wasm` |

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
| Live Actor creation (`US_ACTOR_CREATE`, `US_ACTOR_CREATETOOL`) with and without a model, including an imprecise model request | Actors were created with and without a model. An imprecise model request prompted for clarification with available choices, and the resulting Actors were created with the intended models. The User accepted the change. Escape, the automatic agent-file fallback, and full acceptance journeys were not reported as observed. | 2026-11-27 |

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
- [ ] The Project Manager ran the `syspilot.contract-statistics` skill after validation and the record exists in `.syspilot/stats/`.
- [ ] Header Status is `closed`.

**Final outcome:** {accepted result and integration commit}
