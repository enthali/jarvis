# Change Document: heartbeat-agent-model-selection

**Status**: in-progress
**Branch**: feature/heartbeat-agent-model-selection
**Created**: 2026-10-08
**Author**: PM
**Operation Mode**: autonomous. Exception: the System Designer agrees the User Story and the Requirements with the user (user-guided at those levels).

---

## Summary

The heartbeat agent step always calls a language model that is fixed in
the code to one vendor and one model family (Copilot, gpt-4o). The user
cannot choose which model an agent step uses. A model that is no longer
offered stops the step, and models from other providers (bring-your-own-key
models, a local model) cannot be used. The user wants to choose the vendor
and the model of an agent step. Acceptance criteria: (1) the user can choose
the vendor and the model an agent step calls; (2) there is no default model:
an agent step without a choice does not run, which the user accepted as a
breaking change (decided 2026-10-08, models are retired again and again);
(3) when the chosen model is not
available the step fails with a message that names the choice and says what
is available; (4) the user can find out which vendors and models are
available.

---

## Level 0: User Stories

**Status**: ✅ completed (approved by the user 2026-10-08)

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | unchanged | AC-2 names "LLM agent prompts" only; no model is named there. New story links to it |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_AUT_AGENTMODEL | Choose the Language Model of an Agent Step | optional (AC-6 added with D-12) |

### Decisions

- D-1 (user, 2026-10-08): The choice is made at the agent step itself, as two parameters, vendor and model. No Settings entry and no model picker: the user must know what he does, and the failure message tells him. Reason: there is one language-model call site, and a Settings UI cannot show a dynamic model list anyway.
- D-2 (user): No built-in vendor or model and no fallback. An agent step without a choice, or with one that is not available, fails with a message that names the choice and lists what is offered. Consequence, stated openly: existing agent steps without a choice fail until a vendor and a model are added; this replaces the criterion "an agent step without a choice keeps working as today" of the dispatch. Reason (user): models are retired again and again, a built-in default would be wrong sooner or later, and the user has to choose then in any case.
- D-3 (user): The user and the Actors that write jobs can look up the available vendors and models; an Actor can also register jobs whose agent steps carry the choice (`jarvis_registerJob`).
- D-12 (user, change request from the live test, 2026-10-08, confirmed point by point): The list shows exactly what the user writes into an agent step, and nothing beyond that. In the live run the display name (`name="GPT-6 Luna"`) was taken for the value of `model`. So: (1) a list entry is `vendor` and `model` only, the display name is dropped (`US_AUT_AGENTMODEL` AC-6, `REQ_AUT_LISTMODELS` AC-3); (2) the Actor tool `jarvis_listModels` follows the same rule, `[{vendor, model}]`: one list, same entries (`REQ_AUT_LISTMODELS` AC-2); (3) the failure message uses the same notation as the command, one entry per line, `vendor="x" model="y"`, instead of `vendor/model` joined by a slash, which cannot be split when an id contains a slash (`REQ_AUT_AGENTMODEL` AC-4, `REQ_AUT_LISTMODELS` AC-5, `SPEC_AUT_AGENTEXEC`, `SPEC_AUT_LISTMODELS`). Supersedes D-6 (display name in the list) and the format of D-10.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed (approved by the user 2026-10-08)

### Impacted Requirements

Found via links from User Stories above (impact queries from `US_AUT_HEARTBEAT`, `REQ_AUT_JOBEXEC`, `REQ_AUT_JOBCONFIG`).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_AUT_JOBEXEC | US_AUT_HEARTBEAT | modified | AC-5: the step uses the model named by its vendor and model instead of "the default Copilot model"; AC-7: refers to the exact interpolation field set |
| REQ_AUT_JOBCONFIG | US_AUT_HEARTBEAT | modified | AC-4: agent steps carry `vendor` and `model` |
| REQ_AUT_JOBREG | US_AUT_HEARTBEAT | unchanged | Scheduler API; the tool's step fields are covered by `REQ_AUT_AGENTMODEL` AC-5 |
| REQ_AUT_STEP_OUTPUT_VARS | US_AUT_HEARTBEAT | modified | AC-2: exact interpolation field set, now with `vendor` and `model` (replaces "any string field") |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_AUT_AGENTMODEL | Agent Step Language Model Choice | US_AUT_AGENTMODEL; REQ_AUT_JOBEXEC; REQ_AUT_JOBCONFIG; REQ_AUT_JOBREG | optional (AC-4 reworded with D-12) |
| REQ_AUT_LISTMODELS | List Available Language Models | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL | optional (AC-2, AC-3 changed, AC-5 added with D-12) |

### Conflicts Detected

- REQ_AUT_JOBEXEC AC-5 ("default Copilot model") vs the new story: resolved by modifying AC-5.

### Decisions

- D-4 (SD): Missing `vendor` or `model` is a failure at execution, not a load-time warning (D-2: the call tries the choice and reports). No validation at load time, because availability can only be known when the call is made.
- D-5 (SD): The list shows entries exactly as a step must name them, so a choice copied from the list always matches (`REQ_AUT_AGENTMODEL` AC-2, `REQ_AUT_LISTMODELS` AC-3). What a "model" name is in terms of the VS Code API is decided at L2.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed (reviewed and approved by the user 2026-10-08)

### Impacted Design Elements

Found via links from the Requirements above (impact queries `--direction in` from `REQ_AUT_JOBEXEC` and `REQ_AUT_JOBCONFIG`; cross-check at depth 2 over `SPEC_AUT_AGENTEXEC`).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_AUT_AGENTEXEC | REQ_AUT_JOBEXEC; REQ_AUT_AGENTMODEL | modified | Fixed selector and "no LM model available" removed; model looked up in the `selectChatModels()` list by exact `vendor` and `id`; failure message; helpers; AC-1..6; verify first. D-12: `ModelEntry` without `name`, new `formatModelEntry`, failure message lists one entry per line, AC-4 |
| SPEC_AUT_JOBSCHEMA | REQ_AUT_JOBCONFIG; REQ_AUT_AGENTMODEL | modified | `HeartbeatStep` gains `vendor`, `model`; no load-time validation |
| SPEC_AUT_JOBREG | REQ_AUT_JOBREG; REQ_AUT_AGENTMODEL | modified | `jarvis_registerJob` input schema lists the two fields; AC-1 |
| SPEC_AUT_STEP_OUTPUT_VARS | REQ_AUT_STEP_OUTPUT_VARS | modified | AC-6 interpolation fields include `vendor`, `model` (D-8) |
| SPEC_UAT_HEARTBEAT_* (`spec_uat_heartbeat.rst` T-20), `us_uat_heartbeat.rst` T-7/T-20, `req_uat_heartbeat.rst` AC-4 | UAT stories | modified (wording) | Agent steps of the acceptance tests name an available model |
| SPEC_AUT_EXECUTOR, SPEC_AUT_OUTPUTCHANNEL, SPEC_AUT_QUEUEEXEC, tree provider specs | — | unchanged | No agent-model content; failure reporting uses the existing path |
| SPEC_ENG_API (`JarvisCoreApi`) | — | unchanged | `HeartbeatStep` is re-exported; the new fields are additive, version stays |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_AUT_LISTMODELS | List Available Language Models Command and Tool | REQ_AUT_LISTMODELS; SPEC_AUT_AGENTEXEC; SPEC_ENG_REGISTER_TOOL (D-12: entries `vendor` and `model` only, command written with `formatModelEntry`, tool JSON and `modelDescription` without `name`, AC-3) |

### Conflicts Detected

- `REQ_AUT_STEP_OUTPUT_VARS` AC-2 said "any string field" and `REQ_AUT_JOBEXEC` AC-7 "all string fields", while `SPEC_AUT_STEP_OUTPUT_VARS` AC-6 and `interpolateStep` use a fixed list (and `type` and `outputVar` are string fields that must not be interpolated). Not caused by this CR, but the new fields touch it. Resolved here: the requirements now state the exact field set, including `vendor` and `model` (D-8); the spec AC-6 says "exactly these fields". `US_AUT_HEARTBEAT` AC-19 ("their string fields") is story-level wording and stays.

### Decisions

- D-6 (SD): `model` is the `id` of the `LanguageModelChat`; the list also shows the display `name`, which is never matched (superseded in part by D-12: the display name is no longer shown). Reason: `id` is the unique handle, `family` can cover several versions.
- D-7 (SD): The executor matches against the list returned by `vscode.lm.selectChatModels()` without a selector (exact, case-sensitive `vendor` and `id`), instead of passing a selector to the API. Reason: the list, the failure message and the match then read one source, so a choice copied from the list always matches, and no selector semantics have to be verified.
- D-8 (SD): `vendor` and `model` take `${VAR}` interpolation like the other value fields; the field set is now stated exactly in `REQ_AUT_STEP_OUTPUT_VARS` AC-2, `REQ_AUT_JOBEXEC` AC-7 and `SPEC_AUT_STEP_OUTPUT_VARS` AC-6 (user agreed to fix the old inconsistency at once, 2026-10-08). Easy to reverse if unwanted: remove the two names from the field list.
- D-9 (SD): The command writes to the shared `Jarvis` log channel; no new UI. Reason: the user wants nothing beyond selection, and log lines can be copied into the YAML.
- D-10 (SD): Failure message: `language model not available: vendor=<"x"|(missing)>, model=<"y"|(missing)>` and `Available: vendor/model, ...` or `(none)`; one template for the missing and the unavailable case. (The list notation `vendor/model, ...` is superseded by D-12: one entry per line as `vendor="x" model="y"`; the template is unchanged.)
- D-11 (SD): No load-time check (D-4); the Heartbeat tree is unchanged.
- Verify first (Dev): `selectChatModels()` without selector returns the models of every vendor the user can use, including bring-your-own-key and local ones, and the `id` shown is usable as `model`. If not, back to SD.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed (Sphinx `-W` clean, 0 warnings; re-run after D-12)

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_AUT_AGENTMODEL AC-1, AC-2, AC-3 | REQ_AUT_AGENTMODEL; REQ_AUT_JOBCONFIG (AC-4); REQ_AUT_JOBEXEC (AC-5) | SPEC_AUT_AGENTEXEC; SPEC_AUT_JOBSCHEMA; SPEC_AUT_STEP_OUTPUT_VARS | ✅ |
| US_AUT_AGENTMODEL AC-4 | REQ_AUT_LISTMODELS | SPEC_AUT_LISTMODELS | ✅ |
| US_AUT_AGENTMODEL AC-6 (D-12) | REQ_AUT_LISTMODELS (AC-2, AC-3, AC-5); REQ_AUT_AGENTMODEL (AC-4) | SPEC_AUT_LISTMODELS (AC-3); SPEC_AUT_AGENTEXEC (AC-4, `formatModelEntry`) | ✅ |
| US_AUT_AGENTMODEL AC-5 | REQ_AUT_AGENTMODEL (AC-5) | SPEC_AUT_JOBREG (AC-1) | ✅ |

### Artefakt-Removal-Check

Removed: the fixed model selector `{ vendor: 'copilot', family: 'gpt-4o' }`, the message `no LM model available`, and the wording "default Copilot model". Searched all tracked files for `gpt-4o`, `no LM model available`, `default Copilot model`, `family: 'gpt-4o'`.

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| fixed selector, message, "default Copilot model" | `packages/core/src/apps/session/heartbeat.ts` lines 245-247: Dev replaces per `SPEC_AUT_AGENTEXEC`. `src/tests/heartbeat-step-output-vars.test.ts` mocks `selectChatModels` and uses agent steps without `vendor`/`model`: Dev updates. `testdata/heartbeat/heartbeat.yaml` line 36 agent step: needs `vendor`/`model` (Dev/Test) | `spec_aut.rst`, `req_aut.rst`: fixed in this CR. `.jarvis` memory and backlog of CM and PM mention the old behaviour as motive: not touched, owned by them | `docs/changes/v0.1.0/background-agent.md`, `val-background-agent.md`: 4 mentions, acceptable historic stranding |

- [x] All class (a) active code/workflow references listed with an owner (Dev); fixed by Dev in implementation
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [x] I-1: The `jarvis_registerJob` input schema in `packages/core/package.json` does not list `outputVar` either (existing gap, not in scope); to PM if it matters.
- [x] I-2: Breaking change, accepted by the user (D-2): existing agent steps fail until `vendor` and `model` are added. The release notes need a migration line (Dev).
- [x] I-3 (VE F-2, resolved): `SPEC_AUT_AGENTEXEC` held its Acceptance Criteria and the verify-first paragraph twice, because an edit of mine was applied twice; the second copy is removed, the first stays unchanged.
- [x] I-4 (VE F-1, resolved): examples and fixtures with agent steps checked and brought in line with D-2: the YAML example of `SPEC_AUT_STEP_OUTPUT_VARS` now has `vendor` and `model`; the public `HeartbeatStep` copy in `SPEC_ENG_API` (`spec_eng.rst`) gains the two optional fields (it had been missed, and it also lacks `outputVar`, an older gap left alone); `US_UAT_HEARTBEAT` AC-5 names the model of the step; `SPEC_UAT_HEARTBEAT` notes that the fixture names Copilot and gpt-4o and that the tester replaces the pair when the machine does not offer it. `testdata/heartbeat/heartbeat.yaml` already carries both fields (Dev). No other agent step example exists in the specs.
- [x] I-5 (live run by the user via PM, resolved in the touched places): the heartbeat UAT specs told the tester to set `jarvis.heartbeatConfigFile`, removed in v0.5.11 (fixed path `<workspace root>/.jarvis/heartbeat.yaml`; step paths resolve relative to that folder, `configPaths.getHeartbeatPath`, `SPEC_CFG_PATHRESOLVER`). Fixed: `SPEC_UAT_HEARTBEAT_FILES` has a new paragraph "Placement for a test run" (copy `heartbeat.yaml`, `prompts/`, `scripts/` into the workspace's `.jarvis` folder, reload; a missing folder fails the jobs that use it; adapted values such as the model pair are changed in the copy); `SPEC_UAT_HEARTBEATVIEW_PROCEDURES` T-9 step 1 and T-12 step 1 refer to it; `US_UAT_HEARTBEAT` T-5 is now "Config file at the fixed path" (the "override via setting" case cannot exist any more) and its T-7 expects `agent-response.txt` in the `.jarvis` folder. The model-pair note of I-4 stays consistent (the tester edits the copy).
- [ ] I-6 (PRE-EXISTING debt, not fixed here, for the PM backlog): the removed setting `jarvis.heartbeatConfigFile` is still named as live in other active documents.
  - Contradictions between spec levels and with the code (the setting and the workspace-storage default are described as current, while `REQ_CFG_GROUPS`, `req_cfg.rst` line 325, `spec_cfg.rst` line 398 and the code say fixed path): `us_cfg.rst` `US_CFG_HEARTBEAT` AC-1 (workspace storage) and AC-2 (setting overrides); `req_cfg.rst` `REQ_CFG_HEARTBEATPATH` AC-1, AC-2, AC-4 and AC-3 ("no `.jarvis/heartbeat.yaml` fallback", the opposite of the code); `spec_cfg.rst` line 183 (group layout example still lists the setting).
  - User-facing documentation contradicting `package.json`: `README.md` (root) settings table, line ~70.
  - Stale UAT setup text only: `spec_uat_heartbeat_pause.rst` line 26 and `spec_uat_listjobs.rst` line 36 (pre-conditions), `us_uat_tree_node_open_file.rst` T-1 (line 28) and T-3 (line 45; T-3 sets the setting to a missing path, so its premise needs a new design, not only new wording).
  - Intentional, no action: `spec_cfg.rst` lines 55-96 (inside the deprecated `SPEC_CFG_HEARTBEATSETTINGS`, marked superseded), 398 and 768-772 (replacement and migration text).

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation

---

## Release Note (for the Release Engineer)

PM decision 2026-10-08: the release notes are written at release time by the
Release Engineer; `docs/releasenotes.md` has only version sections and no
Unreleased section, and no version is invented in this change. The Release
Engineer takes the text below from here. It belongs under Breaking Changes of
the release that contains this change.

> **Heartbeat agent steps now require `vendor` and `model`.** An agent step
> names the language model it calls with the two fields `vendor` and `model`
> (the model's id). There is no default and no fallback: an existing agent step
> without both fields fails before it sends its prompt, and the failure message
> names the choice and lists the models that are available. Add `vendor` and
> `model` to every agent step of your heartbeat jobs. To see the valid values,
> run "Jarvis: List Language Models" (output channel Jarvis) or use the tool
> `jarvis_listModels`.

Open at the time of writing: whether every vendor (bring-your-own-key, local)
appears in that list on a given machine has not been checked in a real VS Code
yet (verify-first of `SPEC_AUT_AGENTEXEC`, with the user). The Release Engineer
must not claim support for a specific vendor before that is answered.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** Quality Manager. **Addressee:** Project Manager.
**Review date:** 2026-10-08
**Reviewed revision:** `b853edd`, `feature/heartbeat-agent-model-selection`.
**Restoration:** Restored from the review recorded in this session after CM
found the shared tree clean with the placeholder still present. The reason
the earlier edit is absent is unresolved. The evidence below belongs to the
original review; this restoration does not claim a new verification run.
**Verdict:** Automated/static review PASS; overall acceptance PARTIAL because
the live-catalog Verify-first and T-1..T-9/U-1 remain unexecuted. No new code or
normative-spec finding identified. No model-provider support inferred from mocks.

#### Per-Level Results

| Level | MECE / Trace Result | Basis |
|-------|---------------------|-------|
| L0 | PASS for this review unit | US_AUT_AGENTMODEL adds explicit choice/discovery to the existing job story. The accepted breaking change is stated in AC-3; no default/fallback or picker is invented. |
| L1 | PASS for static consistency; live acceptance OPEN | REQ_AUT_AGENTMODEL and REQ_AUT_LISTMODELS separate execution choice/failure from catalog discovery. JOBEXEC/JOBCONFIG and the exact interpolation field set agree with that boundary. |
| L2 | PASS for code/spec consistency and focused automation; Verify-first OPEN | Fresh unfiltered catalog, exact case-sensitive vendor/id match, shared list entries, failure before send/output, RegisterJob persistence and interpolation follow the design. |
| Schema / Trace | PASS | Fresh strict Sphinx build parsed all 120 sources with zero schema warnings; story-to-requirement-to-design and focused test/protocol links are intact. |

#### Findings

No new findings. Earlier VE F-1/F-2/F-3 are resolved in the reviewed source:
the agent-step example supplies vendor/model, SPEC_AUT_AGENTEXEC has one AC list
and Verify-first block, and the protocol points to the actual test files.
The fixture's Copilot/gpt-4o pair is an example, not a default; the UAT/protocol
explicitly requires replacing it with an offered pair when it is absent.

The existing CD I-1 gaps around outputVar in public/schema documentation remain
disclosed and outside this change; QM neither fixes nor duplicates them here.
The live catalog is an open acceptance item, not a proven implementation defect.

#### Independent Evidence

- Focused tests: 28/28 PASS across heartbeat-agent-model and
	heartbeat-step-output-vars. They exercise exact matching, missing/unknown
	choices, no default, no request/output and job abort, prompt-read ordering,
	successful response/output behavior, interpolation, fresh listing, manifest
	wiring and persistence. They mock the catalog, not real provider behavior.
- Full compile-all equivalent: all seven packages compiled; Flow and Kanban
	extension/webview bundles passed. Fresh Sphinx -E -a -W --keep-going passed.
	The full 480-test suite and old-code mutation run remain VE evidence, not QM
	reruns. No packaging or real-model request is claimed by QM.
- Independent development...HEAD scope check at the reviewed revision: core
	executor/extension/manifest, the two focused tests, fixture, related specs/UAT,
	three change artifacts and root README. No unrelated add-on implementation
	changes were in the delta.
- Root README documents both required fields, exact model ID, no default/fallback
	and discovery routes. The Package README is not the changed README. Release
	Note migration text is staged in this CD for the Release Engineer, per PM's
	decision not to invent an Unreleased/version section. It is not yet published.
	No stale fixed-model/default wording found in docs/releasenotes.md.
- The affected catalog-dependent new/modified elements remain approved; no
	premature promotion is requested. The draft output-variable elements retain
	their pre-existing status; static passing evidence does not silently redefine it.

#### Unexecuted Acceptance

- T-1..T-9: all NOT RUN by QM. No available live ListModels tool or controllable
	desktop EDH/profile was exposed during the review; browser tooling cannot drive
	that host. T-1 catalog/provider IDs, T-2 command/LM-tool/MCP parity, T-3 real
	request, T-4 consent, T-5 quota, T-6 live failure notifications/empty catalog,
	T-7 legacy-step behavior, T-8 live Actor registration and T-9 interpolation
	with actual offered IDs remain open. No fake/static check is a manual PASS.
- U-1 remains user-owned and NOT RUN. Whether configured BYOK/local vendors are
	returned by unfiltered selectChatModels and whether copied IDs work must be
	observed on the real profile. If a provider is absent or an ID unusable, return
	evidence to SD rather than guess a default/fallback or claim support.
- The existing protocol provides the execution path for the user/EDH operator.
	Consent and quota checks require their stated prerequisites; do not manufacture
	quota exhaustion. PM owns disposition of the remaining live acceptance and
	handover to Release for the staged migration text.
- QM restores only this Findings Report; no code, normative spec, status, manual
	result or another actor's memory is changed.

#### PM Decisions

2026-10-08, PM, on the committed Round 1 (`2f2dcad`, restored; the evidence is
the original review's, not a new run):

- Fix now: none. QM reports no new code or specification finding.
- Defer: the outputVar gaps in the `jarvis_registerJob` schema and the
  SPEC_ENG_API step copy (finding I-1) go to backlog #53. Reason: they exist
  independently of this change and QM and SD both kept them out of scope.
- Live acceptance (T-1..T-9, U-1) is not accepted as skipped. It is the
  remaining gate before the user's "Merge OK". The user runs it in an Extension
  Development Host. The minimum for the merge decision is the Verify-first:
  list the models, copy one entry into an agent step as `model`, run the job.
  Whether the rest runs before the merge is the user's choice and is open until
  he answers. If a vendor is missing or an id is rejected, the evidence goes to
  the System Designer; no default or fallback is introduced.
- The staged release note text stays in this CD for the Release Engineer.

2026-10-08 evening, PM, user decision on the live acceptance: the verify-first
ran for Copilot (list shown, `copilot/gpt-6-luna` ran, response file written)
and the user saw BYOK/local vendors in the list. The remaining live cases
(T-7 no default, a job run with a BYOK/local id, T-2, T-4, T-5, T-6, T-8, T-9)
are not run before the merge. The user accepts that risk: if one of them fails
in use, it is fixed afterwards as a defect. This is accepted as-is and not a
pass; the results stay `NOT RUN` in the protocol. The release note keeps its
open point that the use of BYOK/local models is unproven.

### Round 2

**Reviewer:** Quality Manager. **Addressee:** Project Manager.
**Date:** 2026-10-08. **Reviewed HEAD:** `3dd1623`; D-12 code/spec/protocol/CD
are unchanged from `aa14064` (independent diff checked).
**Scope:** US_AUT_AGENTMODEL AC-6; REQ_AUT_LISTMODELS AC-2/AC-3/AC-5;
REQ_AUT_AGENTMODEL AC-4; SPEC_AUT_AGENTEXEC; SPEC_AUT_LISTMODELS AC-3;
the specified heartbeat UAT placement text and protocol evidence/mapping.
**Verdict:** PASS for the changed parts, no new findings. Live acceptance remains
PARTIAL as recorded in the protocol; the user's risk acceptance is not a test PASS.

#### Per-Level Results

| Level | MECE / Trace Result | Basis |
|-------|---------------------|-------|
| L0 | PASS | AC-6 states the user-facing intent: only the values needed by an agent step, no misleading display name. The fixed-path T-5/T-7 wording agrees with the UAT placement design. |
| L1 | PASS | Two-field entries and tool parity are required by LISTMODELS AC-2/AC-3. LISTMODELS AC-5 owns the shared notation; AGENTMODEL AC-4 links to it rather than defining a competing format. No default/fallback is added. |
| L2 | PASS for implementation/static verification | ModelEntry maps only vendor/id; command and failure list share formatModelEntry. Failure entries are one per line, sorted, with Available: (none) for an empty catalog. The tool serializes only vendor/model. Lookup, failure-before-send and interpolation remain unchanged. |
| Schema / Trace | PASS | Fresh strict Sphinx build parsed all 120 sources with zero schema warnings. D-12 story/requirement/design links and the protocol's added AC table retain the intended chain. |

#### Findings

No new finding against D-12 or the changed UAT setup. Removing the display name
addresses the observed confusion without adding a picker or changing model
selection. The old vendor/model slash-pair list is replaced by named fields;
a slash within a model ID therefore does not have to be split.

Round 1 conclusions remain applicable to the unchanged lookup and no-default
behavior. The earlier VE F-1/F-2/F-3 corrections remain present. Existing
outputVar and wider removed-setting debt stay in backlog #53/#54; they are not
new findings or silently fixed by QM.

#### Independent Verification

- 31/31 focused tests PASS across heartbeat-agent-model and
	heartbeat-step-output-vars. D-12 data shape, shared notation, multiline failure
	entries, display-name omission and the retained lookup/output/interpolation
	behavior are exercised. Command/tool wiring checks inspect source/manifest;
	they are not live handler or MCP executions.
- Full compile-all equivalent PASS across all seven packages and Flow/Kanban
	extension/webview bundles. Fresh Sphinx -E -a -W --keep-going PASS with zero
	warnings. VE's 483-test suite and nine-failure old-code run remain VE evidence,
	not claimed as independent QM reruns.
- T-1/T-2/T-6 procedures match D-12, including exactly two tool fields, the
	command's named-field notation, one available entry per line and the empty
	list case. The added D-12 Evidence and Live Checks table maps all changed ACs
	to automated evidence and T-2/T-6; the named tests exist and run.
- T-1/T-3 are clearly attributed to the user via PM/CM and explicitly predate
	D-12. Their reported Copilot run and visible BYOK/local vendors are not a live
	verification of the new output format or successful BYOK/local execution.
- UAT placement consistently copies the fixture, prompts and scripts into the
	disposable workspace's .jarvis directory. Agent output paths resolve there;
	the removed configuration setting is not used by the changed setup text.

#### Live Exclusions and User Decision

QM did not execute a new desktop EDH/profile check: no controllable Development
Host or exposed live ListModels tool is available through these tools. Browser
automation cannot drive that host. D-12 T-1/T-3 format assertions and T-2, T-4,
T-5, T-6, T-7, T-8, T-9 and U-1 remain NOT RUN by QM. Specifically unverified:
live command/tool/MCP parity, new failure notifications, consent/quota, real
legacy no-default behavior, Actor registration, actual-ID interpolation and a
BYOK/local model request. No mocked result is counted as a manual PASS.

The user's decision recorded by PM to accept these remaining risks before merge
is respected, not reopened and not rewritten as successful testing. No new
merge gate, vendor support claim or status promotion is introduced by QM.

#### Shared-Tree Guard and Handover

Initial status showed only CM's uncommitted context; QM requested its owner to
commit it and did not touch it. Before editing this report, git status and
git diff --stat -- docs/changes were clean. Round 2 is appended only; Round 1,
PM decisions and the existing specification/release-note text are preserved.
QM changes only this CD and commits only this file for PM disposition.

#### PM Decisions

2026-10-08, PM, on the committed Round 2 (`3292cd3`):

- Fix now: none. QM reports PASS for the changed parts and no new finding.
- Defer: nothing new; #53 and #54 stay on the backlog.
- Live cases stay `NOT RUN` and are not a merge gate, per the user's recorded
  decision above. This applies to the D-12 list formatting too: the user has
  not seen the new list output live. If it looks wrong in use, it is fixed
  afterwards as a defect.
- The change is ready for the user's "Merge OK".

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
