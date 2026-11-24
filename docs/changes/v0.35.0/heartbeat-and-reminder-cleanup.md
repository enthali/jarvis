# Change Contract: heartbeat-and-reminder-cleanup

**Status:** closed<br>
**Current responsibility:** Project Manager<br>
**Current blocker:** none<br>
**Created:** 2026-11-24<br>
- **Operation Mode**: autonomous - every actor decides on its own; when genuinely unsure, it asks the user directly and pauses only its own step until answered.

## Handover log

Append one line as the last act before handing over, in the same commit that changes Current responsibility. The note says what you did and states facts that change the next owner's situation; evidence stays in your own section.

| Date | Time | From | To | Note |
|---|---|---|---|---|
| 2026-11-24 | 01:36 CET | Project Manager | Architect | User pre-authorized chaining to Package A (`heartbeat-and-reminder-cleanup`, autonomous mode) once Package B closed. Scope covers K53 (`outputVar` in `jarvis_registerJob` schema + `SPEC_ENG_API`), K54 (retire stale `jarvis.heartbeatConfigFile` claims across specs, acceptance setups, and docs), K28 (align Reminder tool specs with `engine.registerTool` shared registry), and K29 (align Core README/guide reminder notification wording with actual Actor queue delivery). |
| 2026-11-24 | 01:44 CET | Architect | Admin | Specification for K53, K54, K28, K29 is complete; five K55 draft Needs moved to `approved` and several `implemented` Needs to `approved` by content edits; `REQ_CFG_HEARTBEATPATH` and `SPEC_MSG_DUALREGISTRATION` deleted. Strict Sphinx build passes; `check_contract_needs.py` reports the `approved` Needs until the Developer returns them to `implemented`. |
| 2026-11-24 | 01:44 CET | Admin | Developer | No infrastructure change is needed. The Needs check reports exactly the 14 `approved` Needs and 3 unnamed stories, so it matches the Architect's list. |
| 2026-11-24 | 01:52 CET | Developer | Technical Writer | `outputVar` is in the `jarvis_registerJob` schema (manifest only; `types.ts` needed no change); the 14 `approved` Needs are `implemented`. The K29 wording in `packages/core/README.md` and `docs/user guides/core.md` is untouched. |
| 2026-11-24 | 02:10 CET | Technical Writer | Tester | K29 fixed in the Core guide and Core README (one-off reminders queued as Actor messages, no notification of their own); Heartbeat section now documents outputVar; no document claimed jarvis.heartbeatConfigFile or egisterDualTool; strict docs build passes. Test design row is yours. |
| 2026-11-24 | 08:05 CET | Tester | Quality | 12 requirement-level tests in `src/tests/heartbeat-and-reminder-cleanup.test.ts` pass and were mutation-checked; `## Test Design` heading restored. |
| 2026-11-24 | 08:15 CET | Quality | Project Manager | Verification is `proceed`, Open Findings `None`; 764 tests pass and six clean-tree VSIXs build. Name `US_CFG_HEARTBEAT`, `US_PIM_CATTOOL` and `US_PIM_TASKS` in User Validation; the Needs check reports them until then. |
## Intent And Outcome

**Owner:** Project Manager<br>
**Status:** approved<br>
**Approval evidence:** User, 2026-11-24 01:14 CET (chained Package A pre-authorized for immediate start after Package B).

### Goal

Actors registering heartbeat jobs see `outputVar` in the `jarvis_registerJob` tool schema (`K53`), while specifications, acceptance procedures, and user documentation no longer reference the removed `jarvis.heartbeatConfigFile` setting (`K54`), obsolete `registerDualTool()` reminder mechanics (`K28`), or inaccurate reminder VS Code notification claims (`K29`).

### Value

`HeartbeatStep.outputVar` is already implemented in the executor, yet omitting it from the `jarvis_registerJob` input schema hides step-output chaining from actors (`K53`). Removing the remaining `jarvis.heartbeatConfigFile`, `registerDualTool()`, and reminder-notification discrepancies (`K54`, `K28`, `K29`) aligns the Core manifest, `SPEC_ENG_API`, configuration/reminder specifications, and READMEs with shipped runtime behavior.

### Scope

- **Expose `outputVar` in `jarvis_registerJob` schema & `SPEC_ENG_API` (backlog K53):**
  - Add `outputVar` (`type: "string"`, optional step property alongside `vendor`/`model` etc.) to the `steps.items.properties` of `jarvis_registerJob` in `packages/core/package.json` (and verify `vendor`/`model` remain properly declared).
  - Add `outputVar?: string` to the `HeartbeatStep` interface definition in `SPEC_ENG_API` (`docs/design/spec_eng.rst`, and `packages/core/src/engine/core/types.ts` if `HeartbeatStep` is duplicated or re-exported there) and align `REQ_AUT_JOBREG` / `SPEC_AUT_JOBREG` / `REQ_AUT_STEP_OUTPUT_VARS` if needed.
- **Remove stale `jarvis.heartbeatConfigFile` claims (backlog K54):**
  - Reconcile `US_CFG_HEARTBEAT` (`docs/userstories/us_cfg.rst`), `REQ_CFG_HEARTBEATPATH` (`docs/requirements/req_cfg.rst` — delete if wholly superseded by `REQ_CFG_FIXEDPATHS` per the no-`deprecated` ontology rule, rewiring any links cleanly, or update to match `.jarvis/heartbeat.yaml` and `jarvis.heartbeatInterval`), and `docs/design/spec_cfg.rst` so nothing claims `jarvis.heartbeatConfigFile` is a live setting.
  - Check acceptance procedures (`docs/acceptance/ac_heartbeat*.rst`, `ac_explorer*.rst` or successor journeys of the old `spec_uat_heartbeat_pause` / `spec_uat_listjobs` / `us_uat_tree_node_open_file`) and user-facing docs (`README.md`, `docs/user guides/core.md`, `packages/core/README.md`) and remove any lingering `jarvis.heartbeatConfigFile` references.
- **Reconcile Reminder tool specification with shared Core registry (backlog K28):**
  - Update `REQ_MSG_REMINDERS_TOOLS`, `SPEC_MSG_REMINDERSTOOLS` (and adjacent `REQ_MSG_REMINDERS_VIEW` if stale on `registerDualTool` / pre-AHP wording) to describe registration via `engine.registerTool` / shared Core tool registry rather than the retired `registerDualTool()`, without adding redundant runtime registration code.
- **Correct Core README / guide Reminder delivery wording (backlog K29):**
  - Inspect actual reminder delivery and announcement behavior in `packages/core/src/apps/session/reminderDelivery.ts` / `extension.ts` and align `packages/core/README.md` (and `docs/user guides/core.md` / root `README.md` if affected) so reminder descriptions accurately describe queueing as Actor messages rather than claiming non-existent VS Code toast notifications.

### Observable Outcome

- `packages/core/package.json` exposes `outputVar` on `jarvis_registerJob` step items, matching `HeartbeatStep` in runtime code and `SPEC_ENG_API`.
- Zero live claims of `jarvis.heartbeatConfigFile` or `registerDualTool` remain in specifications, acceptance journeys, or user-facing READMEs/guides, and Reminder documentation matches actual queue-delivery behavior.
- Strict Sphinx build (`-W --keep-going -E`), `scripts/check_contract_needs.py` (with zero `deprecated` Needs), `npm run compile:packages`, `npm run lint`, the full Vitest suite, and clean-tree VSIX packaging pass.

## Artifacts, Ownership And Process Gates

**Applicability:** Each artifact owner decides and updates its own row.

| Artifact or gate | Included | Owner | Completion evidence | Status |
|---|---|---|---|---|
| Intent and outcome | yes | Project Manager | Goal, value, scope, and observable outcome are explicit and approved | approved |
| Contract release | yes | User | User authorization to start the change; set by the User only | approved (2026-11-24 01:14 CET) |
| Version control | yes | Project Manager | Local branch `feature/heartbeat-and-reminder-cleanup`; squash-integrated into `development` at closure; the branch is retained | merged (`e4f1b65c`) |
| Product specification | yes | Architect | Changed specification artifacts for K53, K54, K28, K29 are linked and checked | complete (see Product Specification) |
| Infrastructure impact | yes | Admin | Affected infrastructure artifacts are updated, or none is affected | complete |
| Documentation impact | yes | Technical Writer | Affected user-facing documents (K54, K29, `outputVar` in Core docs if applicable) are updated | complete |
| Implementation and unit verification | yes | Developer | `packages/core/package.json` (`outputVar` schema, K53), any `types.ts` alignment, and Need statuses updated with passing unit tests | complete |
| Test design | yes | Tester | Requirement-level tests trace to the changed specification (`outputVar` schema, removed `heartbeatConfigFile`, reminder registry) | complete (see Test Design) |
| Quality review and test execution | yes | Quality | Current judgment is `proceed` and `Open Findings` is `None` | complete |
| User validation | yes | User | Observable outcome is accepted or changes are requested | accepted (2026-11-24 09:08 CET) |
| Closure | yes | Project Manager | Final outcome and integration state are recorded | closed |

## Product Specification

**Owner:** Architect<br>
**Status:** complete

| Artifact | Change | Rationale |
|---|---|---|
| `SPEC_ENG_API` (`spec_eng.rst`) | modify (`draft` → `approved`) | `HeartbeatStep` block lists `outputVar?`; new AC-11 ties the interface to the `jarvis_registerJob` schema (K53) |
| `REQ_AUT_JOBREG`, `SPEC_AUT_JOBREG` | modify (`implemented` → `approved`) | New step-field acceptance criterion (AC-5 / AC-2): the tool accepts and persists every `HeartbeatStep` field, `outputVar` included (K53) |
| `REQ_CFG_HEARTBEATPATH` | remove | Its only subject, the setting `jarvis.heartbeatConfigFile`, no longer exists; the path is fixed (`REQ_CFG_FIXEDPATHS`). `REQ_AUT_JOBCONFIG` link rewired to `REQ_CFG_FIXEDPATHS` (K54) |
| `US_CFG_HEARTBEAT` (`us_cfg.rst`) | modify (story content; status `implemented` kept) | Retitled "Heartbeat Check Interval"; one outcome AC for the scan interval; the config-file-path ACs are gone (K54) |
| `SPEC_CFG_VIEWGATING` | modify (`approved`) | Menu gating stated as a plain rule on `jarvis.messages.enabled` / `jarvis.heartbeat.enabled`; no path setting is tested (K54) |
| `SPEC_MSG_DUALREGISTRATION` | remove | `registerDualTool()` no longer exists; lifecycle, status bar and settings are covered by `SPEC_MOD_MCP_PKG`. Link removed from `SPEC_MSG_REMINDERSTOOLS`, `SPEC_ACTOR_CREATETOOL` and `SPEC_PIM_CATTOOL` (K28) |
| `SPEC_MSG_REMINDERSTOOLS`, `REQ_MSG_REMINDERS_TOOLS` | modify (`draft` → `approved`) | Registered once through `engine.registerTool`; MCP derived from the shared registry (K28) |
| `REQ_MSG_REMINDERS_VIEW` | modify (`draft` → `approved`) | AC-2 gate is `jarvis.messages.enabled` and `jarvis.reminders.enabled`; the removed `jarvis.messagesFile` gate is gone (K28) |
| `REQ_MSG_REMINDERS_DELIVER` | modify (`draft` → `approved`) | New AC-7: a due reminder fires once, raises no VS Code notification of its own, and is queued as a message to the Actor (K29, specification side) |
| `SPEC_AUT_LISTJOBS_TOOL`, `REQ_AUT_LISTJOBS_TOOL` | modify (`SPEC_AUT_LISTJOBS_TOOL` `implemented` → `approved`) | `registerDualTool()` replaced by `engine.registerTool`; requirement AC-3 reworded (K28) |
| `SPEC_PIM_CATTOOL`, `SPEC_PIM_TASKTOOL`, `REQ_PIM_CATTOOL`, `REQ_PIM_TASKTOOL`, `US_PIM_CATTOOL`, `US_PIM_TASKS` | modify (`SPEC_PIM_TASKTOOL`, `REQ_PIM_TASKTOOL` `implemented` → `approved`) | Same `registerDualTool()` claim; tools are named `jarvis_pim_category` / `jarvis_pim_task` and registered once via `api.registerTool`. Story ACs reworded to outcomes ("also available to MCP clients") (K28) |

| Decision or check | Evidence |
|---|---|
| Code facts behind the changes | Every tool uses `engine.registerTool` (`packages/core/src/extension.ts`, `packages/pim/src/extension.ts`); MCP derives tools from `getRegisteredTools()` and the manifest `inputSchema` (`packages/mcp/src/extension.ts`); `reminderDelivery.ts` appends a message and raises no notification; `HeartbeatStep.outputVar` exists in `heartbeat.ts` |
| Zero live claims | `git grep` for `registerDualTool`, `DUALREGISTRATION`, `heartbeatConfigFile`, `HEARTBEATPATH` outside `docs/changes` and `releasenotes.md`: only the two "removed settings" lists in `req_cfg.rst` and `spec_cfg.rst` remain, which are retirement notes. `docs/acceptance/**`, `docs/user guides/**` and the READMEs hold no claim |
| Build and format | Strict Sphinx build exit 0; `acceptance-criteria-format.test.ts` 5/5 |
| Draft needs moved | `SPEC_ENG_API`, `REQ_MSG_REMINDERS_TOOLS`, `REQ_MSG_REMINDERS_VIEW`, `REQ_MSG_REMINDERS_DELIVER`, `SPEC_MSG_REMINDERSTOOLS` were K55 drafts; editing them for this change moves them to `approved`. The Developer returns every `approved` Need above to `implemented`; `check_contract_needs.py` reports them until then |
| For User Validation (changed stories) | `US_CFG_HEARTBEAT`, `US_PIM_CATTOOL`, `US_PIM_TASKS` |
| For the Developer | Add `outputVar` (string) to `jarvis_registerJob` `inputSchema.steps.items.properties` in `packages/core/package.json`; the registered handler already forwards `steps` whole to `scheduler.registerJob` (`extension.ts` line 553-556), so only the manifest schema lacks the field; add a unit test for the schema if none exists |
| For the Technical Writer (K29) | `packages/core/README.md` line 9 and `docs/user guides/core.md` line 36 say reminders are cron-based and appear as VS Code notifications. They are one-off (`deliverAt`); a due reminder is queued as a message to the named Actor, and the existing delivery policy notifies. The root `README.md` needs no change |
| Left alone, out of this scope | `SPEC_MSG_MCPSERVER` / `REQ_MSG_MCPSERVER` (AC-2..4) still describe an in-core MCP server module (`registerMcpTool`); the real design is `packages/mcp`. `REQ_MSG_REMINDERS_PERSIST` AC-5 names `src/reminders.ts` (real: `src/apps/session/reminders.ts`); `SPEC_MSG_REMINDERSVIEW` is `draft`; `US_MSG_EDITORPLACEMENT` / `REQ_MSG_EDITORPLACEMENT` contradict `REQ_COM_OPEN` AC-4; `REQ_PIM_CATTOOL` / `REQ_PIM_TASKTOOL` descriptions still say `jarvis_category` / `jarvis_task`; `SPEC_AUT_STEP_OUTPUT_VARS` and `REQ_AUT_STEP_OUTPUT_VARS` are `draft` (K55) |

## Infrastructure Impact

**Owner:** Admin<br>
**Status:** complete

| Infrastructure artifact | Impact | Required action and evidence |
|---|---|---|
| `scripts/check_contract_needs.py` and its tests | none: the Change uses only statuses the script already accepts; no `deprecated` Need remains | none; `python -m unittest discover scripts`: 24 tests OK |
| Needs check on this Contract | Must report only what the Architect and the Contract name | `python scripts/check_contract_needs.py --contract docs/changes/heartbeat-and-reminder-cleanup.md` @ `9087742d`: exit 1, 14 Needs at `approved` (AC-3: `REQ_AUT_JOBREG`, `REQ_AUT_LISTJOBS_TOOL`, `REQ_MSG_REMINDERS_DELIVER`, `REQ_MSG_REMINDERS_TOOLS`, `REQ_MSG_REMINDERS_VIEW`, `REQ_PIM_CATTOOL`, `REQ_PIM_TASKTOOL`, `SPEC_AUT_JOBREG`, `SPEC_AUT_LISTJOBS_TOOL`, `SPEC_CFG_VIEWGATING`, `SPEC_ENG_API`, `SPEC_MSG_REMINDERSTOOLS`, `SPEC_PIM_CATTOOL`, `SPEC_PIM_TASKTOOL`) and the three stories not yet named in User Validation (AC-4: `US_CFG_HEARTBEAT`, `US_PIM_CATTOOL`, `US_PIM_TASKS`). It passes when the Developer sets `implemented` and the PM names the stories |
| `package.json` of `packages/core` (`jarvis_registerJob` schema, `outputVar`) | Manifest change belongs to the Developer's row (K53); no build, bundling or packaging step reads that schema field | none from Admin |
| Build, lint, test tooling, `release.yml`, `.vscode/`, `.github/`, workspace file | none: `git grep` for `heartbeatConfigFile`, `registerDualTool`, `DUALREGISTRATION`, `HEARTBEATPATH` in `.github`, `.vscode`, `scripts`, the manifests, `build.js` files, `.vscodeignore` and `jarvis.code-workspace` finds nothing | none |
| Documentation build | Spec files only; no toctree or `conf.py` change | strict `python -m sphinx -b html docs <tmp> -W --keep-going -E` @ `9087742d`: exit 0 |

## Implementation And Unit Verification

**Owner:** Developer<br>
**Status:** complete

| Decision | Chosen approach | Relevant alternatives | Rationale and evidence |
|---|---|---|---|
| Where `outputVar` is declared | Only the manifest `inputSchema` of `jarvis_registerJob` gets `outputVar` (string, with description) | Also touch `types.ts` | `types.ts` re-exports `HeartbeatStep` from `heartbeat.ts`, which already declares `outputVar?: string`; the handler forwards `steps` whole to `scheduler.registerJob` |
| Schema test | One assertion added to the existing `SPEC_AUT_JOBREG AC-1` schema test | A new test file | The test already reads the same schema block |
| Need status | The 14 `approved` Needs of Product Specification set to `implemented` | none | `REQ_REL_NEEDSCHECK` AC-3 |

| Artifact | Change | Unit test evidence |
|---|---|---|
| `packages/core/package.json` | `outputVar` added to `jarvis_registerJob` step items | `src/tests/heartbeat-agent-model.test.ts` asserts `props.outputVar.type` |
| `src/tests/heartbeat-agent-model.test.ts` | Schema assertion for `outputVar` | see run below |
| 14 Needs in `docs/requirements`, `docs/design` | `:status:` set to `implemented` | `scripts/check_contract_needs.py` after commit: only the three User-validation hits (PM) expected |
| Run | `npx vitest run`: 69 files, 752 tests pass; `npx tsc -p packages/core --noEmit`: clean | see handover commit |

## Test Design

**Owner:** Tester<br>
**Status:** complete

| Test | Kind | Traces to | Location |
|---|---|---|---|
| `jarvis_registerJob` schema declares every step field, `outputVar` a string; registered job keeps `outputVar` in `heartbeat.yaml` and upserts by name | system | `REQ_AUT_JOBREG` AC-1, AC-5; `SPEC_ENG_API` AC-11 | `src/tests/heartbeat-and-reminder-cleanup.test.ts` |
| No manifest setting, spec, guide or README claims `jarvis.heartbeatConfigFile`; retired Needs `REQ_CFG_HEARTBEATPATH`, `SPEC_MSG_DUALREGISTRATION` not referenced; `US_CFG_HEARTBEAT` names no config-file path | system | `REQ_CFG_FIXEDPATHS`, `US_CFG_HEARTBEAT` | same file |
| No `registerDualTool` in specs or sources; three reminder tools declared in the manifest and registered once via `engine.registerTool`; Reminders view gated on `messages.enabled` and `reminders.enabled` | system | `REQ_MSG_REMINDERS_TOOLS` AC-4, AC-5; `REQ_MSG_REMINDERS_VIEW` AC-2 | same file |
| `REQ_MSG_REMINDERS_DELIVER` AC-7 text; Core guide and README say queued as a message, no VS Code notification, no cron; delivery code shows no notification | system | `REQ_MSG_REMINDERS_DELIVER` AC-7 | same file |

Run: `npx vitest run src/tests/heartbeat-and-reminder-cleanup.test.ts` @ branch HEAD: 12 passed. Mutation check (throwaway edits, restored, tree clean): removing `outputVar` from the schema, a notification claim in the README, `cron` in the guide, a renamed reminder tool registration and a live `heartbeatConfigFile` claim each fail exactly one test. The Test design heading was missing at `0e429e8a`; restored here. `US_CFG_HEARTBEAT`, `US_PIM_CATTOOL`, `US_PIM_TASKS` need no validation procedure from me: the Needs check expects the PM to name them in User Validation.

## Documentation Impact

**Owner:** Technical Writer<br>
**Status:** complete

| Document | Required update | Evidence |
|---|---|---|
| `docs/user guides/core.md` Reminders | K29: 'cron-based or one-off ... VS Code notifications' was false; reminders are set once with a delivery time, a due reminder fires once and is queued as a message to the Actor, the normal delivery setting governs the announcement; names the three reminder tools and the view gating | this commit; code facts: `reminderDelivery.ts` calls `appendMessage` only, `jarvis_setReminder` takes `deliverAt`, view gated on `jarvis.messages.enabled` and `jarvis.reminders.enabled` (`package.json`) |
| `packages/core/README.md` Features | Same correction, one line | this commit |
| `docs/user guides/core.md` Heartbeat | K53: `outputVar` documented (python, powershell, agent steps; `` in later steps of the same run; unknown names left as written; not kept across runs) | this commit; matches `heartbeat.ts` and `REQ_AUT_STEP_OUTPUT_VARS` AC-1, AC-3, AC-4 (that Need is still `draft`, K55) |
| README, guides, package READMEs | K54, K28: no mention of `jarvis.heartbeatConfigFile` or `registerDualTool` | none needed: search found none |
| Root `README.md` | none: names reminders only as a feature, as the Architect noted | checked |
| `docs/releasenotes.md` | Release decides; the reminder wording is a correction, not a behaviour change | not edited |
## Quality Review

**Owner:** Quality<br>
**Status:** complete

**Current judgment:** `proceed` at `bf671b97`. Open Findings is `None`. The only product change is `outputVar` in the `jarvis_registerJob` manifest schema and one README line; the built Core VSIX carries the field and the corrected reminder wording matches `reminderDelivery.ts`. 764 tests pass and six clean-tree VSIXs build. The Needs check leaves only the three stories the Project Manager names in User Validation.

### Applied Review Methods

| Method | Selected scope | Evidence | Findings | Limits |
|---|---|---|---|---|
| Branch diff against the merge base | `git diff development...HEAD -- packages src` | Four files: `packages/core/package.json` (one line), `packages/core/README.md` (one line), one assertion in `heartbeat-agent-model.test.ts`, the Tester's new test file | No finding | Runtime behaviour of a live Heartbeat run is not executed (the User deferred it earlier) |

### Test Execution

Quality executes the tests the change affects, and reviews the Developer's unit tests for whether they exercise the specified behaviour of their unit. When the change touches packages, manifests, READMEs or build files, Quality builds all six VSIX from a clean tree (`npm ci`, `npm run compile`, `node packages/core/build.js --minify`, then `vsce package --no-dependencies` per package: core, pim, recorder, mcp, flow, kanban; `--allow-missing-repository` only if a manifest lacks `repository`), checks the contents, and records it as its own row.

| Test or run | Command and commit | Result |
|---|---|---|
| Build all packages | `npm run compile:packages` @ bf671b97 | pass |
| Lint | `npm run lint` @ bf671b97 | pass: 0 errors, 172 warnings |
| Full suite | `npx vitest run --testTimeout 15000` @ bf671b97 | pass: 70 files, 764 tests (12 new) |
| Script tests | `python -m unittest discover scripts` @ bf671b97 | pass |
| Strict docs build | `python -m sphinx -W --keep-going -b html docs docs/_build/html -E` @ bf671b97 | pass |
| Needs check | `python scripts/check_contract_needs.py` @ bf671b97 | exit 1: only `US_CFG_HEARTBEAT`, `US_PIM_CATTOOL`, `US_PIM_TASKS` AC-4 (not named in User Validation); expected, the Project Manager names them |
| VSIX packaging, clean tree | detached worktree at bf671b97: `npm ci --ignore-scripts`, `npm run compile`, `node packages/core/build.js --minify`, `vsce package --no-dependencies` for core, pim, recorder, mcp, flow, kanban | pass: six VSIXs at 0.34.0, engine `^1.144.0`, no `.wasm`; the Core manifest lists `outputVar` among the `jarvis_registerJob` step properties |
| Mutation check of the schema test | removed `outputVar` from the Core manifest by regex (throwaway, restored) | inconclusive: the edit left invalid JSON, so both files failed to load; I rely on the Tester's recorded mutation checks |

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
| Automated verification and clean-tree VSIX inspection for `US_CFG_HEARTBEAT`, `US_PIM_CATTOOL`, and `US_PIM_TASKS` | User accepted on the automated evidence: 70 test files / 764 tests pass (including 12 mutation-checked system tests), 24 script tests pass, lint 0 errors, strict Sphinx build clean, and clean-tree VSIX packaging verified with `outputVar` in `jarvis_registerJob` schema. | 2026-11-24 |

**Decision:** accepted (2026-11-24 09:08 CET)

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

**Final outcome:** Accepted by the User on 2026-11-24 on automated verification and clean-tree VSIX inspection. Exposes `outputVar` in `jarvis_registerJob`'s input schema (`packages/core/package.json`), `SPEC_ENG_API`, and the Core guide (K53); deletes `REQ_CFG_HEARTBEATPATH` and updates `US_CFG_HEARTBEAT` to remove stale `jarvis.heartbeatConfigFile` claims (K54); deletes `SPEC_MSG_DUALREGISTRATION` and aligns Reminder, `listJobs`, and PIM tool specifications with `engine.registerTool` (K28, also lifting five K55 draft Needs to `implemented`); and corrects Core README and Core guide Reminder delivery wording to one-off Actor-queue delivery (K29). Squash-integrated into `development` as `e4f1b65c`; feature branch `feature/heartbeat-and-reminder-cleanup` retained; statistics recorded in `.syspilot/stats/heartbeat-and-reminder-cleanup-stat.md`. Not released.
