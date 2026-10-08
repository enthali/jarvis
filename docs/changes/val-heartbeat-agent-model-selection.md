# Validation Report: heartbeat-agent-model-selection

**Date**: 2026-10-08
**Change Document**: [heartbeat-agent-model-selection.md](heartbeat-agent-model-selection.md)
**Test Protocol**: [tst-heartbeat-agent-model-selection.md](tst-heartbeat-agent-model-selection.md)
**Branch / HEAD verified**: `feature/heartbeat-agent-model-selection` @ `9576930` (shared tree, clean)
**Status**: PARTIAL

Automated evidence is complete and passes. The live-catalog question (CD "Verify first" of `SPEC_AUT_AGENTEXEC`) and all manual cases (T-1..T-9, U-1) are NOT RUN, so the four new elements and the two modified ones that depend on them are not promoted. Three findings (one Medium, two Low) and one open item (release-notes migration line) are reported to the Change Manager; none was fixed by the VE.

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements (new + modified) | 6 | 6 (automated) | 0 |
| Designs (new + modified) | 6 | 6 (automated) | 2 (F-1, F-2) |
| Implementations | 3 files (`heartbeat.ts`, `extension.ts`, core `package.json`) | 3 | 0 |
| Tests | 23 new, 1 updated | 24 | 0 |
| Traceability | 3 chains | 3 | 1 (F-3, protocol paths) |

## Build and test evidence (HEAD `9576930`)

| Check | Result |
|-------|--------|
| Full monorepo build (`compile all` equivalent, 7 packages) | clean, exit 0 |
| `npx vitest run` | 480/480 pass, 51 files; no failures, no flaky run |
| ESLint on touched files (`heartbeat.ts`, `extension.ts`, both heartbeat tests) | 0 errors, 57 warnings (`no-explicit-any`; not new classes of issue) |
| Sphinx `-W --keep-going` | clean, 0 warnings (also after the two status edits below) |

### Old-code check (new tests against the previous `heartbeat.ts`)

`git show bd23ee4~1:packages/core/src/apps/session/heartbeat.ts` placed into a throwaway detached worktree (no stash, no change to the shared tree; worktree removed afterwards). Result: `heartbeat-agent-model.test.ts` **14 failed / 9 passed** of 23.

- The 14 failures are the executor, message, interpolation and `toModelEntries`/`listAvailableModels` tests (SPEC_AUT_AGENTEXEC AC-1..4, SPEC_AUT_STEP_OUTPUT_VARS AC-6, SPEC_AUT_LISTMODELS AC-3/AC-4), i.e. the tests detect the old fixed selector. They are real regression checks.
- The 9 that pass on old code do not depend on `heartbeat.ts`: manifest/wiring (`package.json`, `extension.ts`), `registerJob` schema and persistence, the fixture check, and AC-5/AC-6 (prompt read first, unchanged behaviour on a match). Passing on old code is expected for these.

## Requirements Coverage

| ID | Description | SPEC | Code | Test | Status |
|----|-------------|------|------|------|--------|
| US_AUT_AGENTMODEL | Choose model of an agent step | REQ_AUT_AGENTMODEL, REQ_AUT_LISTMODELS | heartbeat.ts, extension.ts | heartbeat-agent-model.test.ts | partial: live proof open (T-1..T-9, U-1) |
| REQ_AUT_AGENTMODEL | Agent step model choice | SPEC_AUT_AGENTEXEC, SPEC_AUT_JOBSCHEMA, SPEC_AUT_JOBREG | heartbeat.ts:240-296, core package.json | see AC table | AC-1,3,4,5 automated; AC-2 needs live catalog |
| REQ_AUT_LISTMODELS | List available models | SPEC_AUT_LISTMODELS | heartbeat.ts:240-251, extension.ts:991-1011 | see AC table | AC-3 automated; AC-1,2,4 wiring automated, live behaviour open |
| REQ_AUT_JOBEXEC (modified AC-5, AC-7) | model by vendor/model; exact field set | SPEC_AUT_AGENTEXEC | heartbeat.ts:283-296 | see AC table | AC-5 needs real request (T-3) |
| REQ_AUT_JOBCONFIG (modified AC-4) | agent steps carry vendor/model | SPEC_AUT_JOBSCHEMA | heartbeat.ts:35-36 | type + fixture test | verified |
| REQ_AUT_STEP_OUTPUT_VARS (modified AC-2) | exact interpolation field set | SPEC_AUT_STEP_OUTPUT_VARS AC-6 | heartbeat.ts:349 | heartbeat-agent-model.test.ts:188-216 | verified (automated) |

## Acceptance Criteria Verification

"Verified" = spec, code and an automated test agree at HEAD. "Protocol" = provable only in the EDH or on the user's machine; covered by the Test Protocol, **not verified**.

### SPEC_AUT_AGENTEXEC (modified)
- [x] AC-1 exact `vendor`+`id` lookup in `selectChatModels()` without selector, nothing built in: `heartbeat.ts:284-290`; tests L67-107 (incl. source scan that the old selector is gone)
- [x] AC-2 non-string/empty is missing: `heartbeat.ts:256-258` (`nonEmpty`); test L121
- [x] AC-3 `success:false`, `stepType:'agent'`, no prompt, no output file, job aborted: `heartbeat.ts:291-295`; test L150
- [x] AC-4 message names the choice in quotes or `(missing)`, sorted `vendor/model` list or `(none)`: `heartbeat.ts:260-268`; tests L112-148
- [x] AC-5 prompt read before lookup: `heartbeat.ts:283`; test L165
- [x] AC-6 unchanged behaviour on a match (output, outputFile/append, outputVar, `vendor/id` log line): `heartbeat.ts:296-`; test L172
- [ ] **Verify first** (real `selectChatModels()` returns every usable vendor incl. BYOK/local; listed `id` usable as `model`): **OPEN**, Protocol T-1, T-3, U-1. Dev's answer from API documentation is not EDH evidence.

### SPEC_AUT_LISTMODELS (new)
- [x] AC-1 command contributed with title "Jarvis: List Language Models", prints one line per entry (values quoted) or "no language model available": core `package.json` (command entry), `extension.ts:1000-1011`; tests L249-264. Live display: Protocol T-1.
- [x] AC-2 tool declared without input and registered via `engine.registerTool`, returns JSON entries: core `package.json` (tool entry), `extension.ts:991-998`; test L266. Live LM-API and MCP routes: Protocol T-2.
- [x] AC-3 entries carry `vendor`, `model` (= id), `name`; a copied entry always matches: `heartbeat.ts:243-249`; tests L219-234
- [x] AC-4 no cache, asks the API on every call: `heartbeat.ts:251-253`; test L236

### SPEC_AUT_JOBREG (modified), SPEC_AUT_JOBSCHEMA (modified)
- [x] `jarvis_registerJob` input schema lists `vendor`, `model` on step items: core `package.json`; test L275
- [x] `registerJob` persists both fields to `heartbeat.yaml`: test L289 (T-8 covers the Actor route live)
- [x] `HeartbeatStep` gains `vendor?`, `model?`; no load-time validation (D-4, D-11): `heartbeat.ts:35-36`. No AC exists for these two fields in SPEC_AUT_JOBSCHEMA itself (description only); noted, not a defect.

### SPEC_AUT_STEP_OUTPUT_VARS (modified) / REQ_AUT_STEP_OUTPUT_VARS (modified)
- [x] AC-6 / AC-2 exact field set `run, prompt, outputFile, destination, sender, text, vendor, model`; `type`, `append`, `outputVar` not interpolated: `heartbeat.ts:349`; tests L188-216, `heartbeat-step-output-vars.test.ts:188`

### Package declarations vs SPEC_AUT_LISTMODELS / SPEC_AUT_JOBREG
- [x] `jarvis.listModels` command and `jarvis_listModels` tool entry in `packages/core/package.json` match the spec's JSON block (name, displayName, modelDescription, `canBeReferencedInPrompt`, `toolReferenceName: listModels`, icon, empty `inputSchema`).
- [x] `jarvis_registerJob` step item schema adds `vendor` and `model` as strings with descriptions pointing at `jarvis_listModels`.

## Artefact-Removal Check (CD class a/b/c)

Searched `gpt-4o`, `no LM model available`, `default Copilot model`, `family: 'gpt…'` over `packages/`, `src/`, `testdata/`, `docs/`, README and `.github/`.

| Class | Result |
|-------|--------|
| (a) active code | clean. `heartbeat.ts` has no fixed selector or old message. Remaining `gpt-4o` strings are example values in tests/fixture (`testdata/heartbeat/heartbeat.yaml:39` names `model: gpt-4o` as an example choice, not a default) and the test that asserts the old strings are absent |
| (b) active docs | requirement/spec wording fixed ("default Copilot model" gone). Intended mentions remain: the removal statement in `SPEC_AUT_AGENTEXEC`, the example output line in `SPEC_AUT_LISTMODELS`. **One stale example remains, see F-1** |
| (c) historic | `docs/changes/v0.1.0/background-agent.md`, `val-background-agent.md`: untouched, accepted by the CD |

Other agent steps in tracked files: only `testdata/heartbeat/heartbeat.yaml` (updated) and the YAML example in F-1. No other `type: agent` YAML in the workspace.

## Test Protocol

**File**: docs/changes/tst-heartbeat-agent-model-selection.md
**Result**: NOT RUN (header and every row)

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| T-1 | REQ_AUT_LISTMODELS; REQ_AUT_AGENTMODEL | AC-1..4; AC-1,2 | Live catalog and listed model IDs | NOT RUN |
| T-2 | REQ_AUT_LISTMODELS | AC-1..4 | Command and `jarvis_listModels` tool parity | NOT RUN |
| T-3 | REQ_AUT_AGENTMODEL; REQ_AUT_JOBEXEC | AC-1,2; AC-5 | Real request to a listed model | NOT RUN |
| T-4 | REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT | AC-5; AC-3 | VS Code model consent behaviour | NOT RUN |
| T-5 | REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT | AC-5; AC-3 | Real provider quota rejection | NOT RUN |
| T-6 | REQ_AUT_AGENTMODEL; REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT | AC-3,4; AC-4; AC-3,4 | Missing, unknown, no-model failure notifications | NOT RUN |
| T-7 | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL | AC-1,3; AC-1,3 | Legacy agent step has no default, sends no prompt | NOT RUN |
| T-8 | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL | AC-5; AC-5 | Actor job registration persists both fields | NOT RUN |
| T-9 | REQ_AUT_STEP_OUTPUT_VARS; REQ_AUT_JOBEXEC | AC-2; AC-7 | Interpolate both fields | NOT RUN |
| U-1 | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL; REQ_AUT_LISTMODELS | AC-1,2,4; AC-2; AC-3,4 | User's BYOK/local models | NOT RUN |

Protocol check:
- Every case has an owner (QM EDH, or User for U-1) and maps to ACs; the AC mapping table covers every new AC and the modified `REQ_AUT_JOBEXEC`, `REQ_AUT_STEP_OUTPUT_VARS` ACs. `SPEC_AUT_AGENTEXEC` "Verify first" is mapped to T-1, T-3..T-7, T-9, U-1.
- Results are honest: all NOT RUN, the 480/23 automated figure is stated not to change any manual result, no pass is claimed. The protocol states that mocked tests do not establish what a real profile offers.
- No FAIL rows.
- Defect in the document: wrong test paths, see F-3.

## Spec Status Decisions

Rule: status follows verification; user-reported or mocked-SDK results are not EDH evidence.

| Element | Before | After | Reason / open case |
|---------|--------|-------|--------------------|
| US_AUT_AGENTMODEL | approved | approved | AC-2 (model that is really used) and AC-4 (user can find out what is available) depend on the live catalog: T-1, T-2, T-3, U-1 NOT RUN |
| REQ_AUT_AGENTMODEL | approved | approved | AC-2 needs a real request to a listed model and the Verify-first answer: T-1, T-3, U-1 NOT RUN |
| REQ_AUT_LISTMODELS | approved | approved | AC-1/AC-2/AC-4 are live behaviours (command output, LM-API and MCP routes, current list): T-1, T-2, U-1 NOT RUN |
| SPEC_AUT_LISTMODELS | approved | approved | AC-1/AC-2 live display and both tool routes: T-1, T-2 NOT RUN |
| SPEC_AUT_AGENTEXEC | implemented | **approved** | modified; Verify first (BYOK/local models returned, `id` usable) is open; T-1, T-3..T-7, T-9, U-1 NOT RUN. Not promoted, and no longer supportable as `implemented` while that open item sits in the same element |
| REQ_AUT_JOBEXEC | implemented | **approved** | AC-5 was changed to "model named by vendor/model"; its live proof is T-3 (also T-4, T-5), NOT RUN. Same reasoning as above |
| REQ_AUT_JOBCONFIG | implemented | implemented | AC-4 is a field contract (`vendor`, `model`, `prompt` …), proven by type, fixture and persistence tests; no live dependency |
| SPEC_AUT_JOBSCHEMA | implemented | implemented | additive optional fields, no load-time validation; proven by code and tests |
| SPEC_AUT_JOBREG | implemented | implemented | schema and persistence proven automatically (test L275, L289). Live Actor route is T-8, but the spec AC is the schema |
| REQ_AUT_STEP_OUTPUT_VARS | draft | draft | status was `draft` before this CR; not changed here. Automated evidence is complete; the status vocabulary decision is not the VE's |
| SPEC_AUT_STEP_OUTPUT_VARS | draft | draft | same |

Two `implemented` to `approved` changes are metadata only (no spec text, code or test touched). If the CM and PM read the two modified elements differently, they can be reverted individually; the reason is stated above.

## Issues Found

### F-1: Stale agent-step YAML example in SPEC_AUT_STEP_OUTPUT_VARS
- **Severity**: Low
- **Category**: Design (active documentation, artefact-removal class b)
- **Description**: The YAML example (`spec_aut.rst` L1519-1523) shows `- type: agent` with `prompt: prompts/summarize.md` and `outputVar: SUMMARY` but no `vendor` and `model`. Under D-2 this step fails.
- **Expected**: Example agent step names `vendor` and `model`, like the fixture.
- **Actual**: Example would fail if copied.
- **Recommendation**: SD adds `vendor` and `model` to the example.

### F-2: Acceptance Criteria and Verify-first block duplicated in SPEC_AUT_AGENTEXEC
- **Severity**: Medium (spec text; Sphinx does not detect it)
- **Category**: Design
- **Description**: In `docs/design/spec_aut.rst` the "Acceptance Criteria" list (AC-1..AC-6) and the "Verify first" paragraph appear twice in succession (L507-L524 and L530-L552), identical. It was committed that way (visible as added lines in `git diff development..HEAD`).
- **Expected**: One AC list and one Verify-first paragraph.
- **Actual**: Two identical copies; a reader and any AC extraction tool sees AC-1..6 twice.
- **Recommendation**: SD removes one copy. Text content is otherwise correct and matches the code.

### F-3: Test Protocol cites wrong test file paths
- **Severity**: Low
- **Category**: Traceability
- **Description**: `tst-heartbeat-agent-model-selection.md` (Scope section) cites `src/tests/heartbeat/heartbeat-agent-model.test.ts` and `src/tests/heartbeat/heartbeat-step-output-vars.test.ts`. The files are `src/tests/heartbeat-agent-model.test.ts` and `src/tests/heartbeat-step-output-vars.test.ts` (no `heartbeat/` folder).
- **Expected**: Paths that resolve.
- **Actual**: Paths do not exist; test names cited in the Automated Evidence table are correct.
- **Recommendation**: Test Designer corrects the two paths.

### Open item (not a defect): release-notes migration line
The line "existing agent steps need `vendor` and `model`" (CD I-2) is not written yet; routed to the documentation step after the VE, as the CM stated. Reported as open.

### Observations (no action requested)
- `SPEC_AUT_AGENTEXEC` still says "Implemented in `src/heartbeat.ts`"; the file is `packages/core/src/apps/session/heartbeat.ts`. The sentence predates this CR.
- The command is not gated by `jarvis.heartbeat.enabled` (unlike `jarvis_listJobs` per the v0.5.11 tool-deregistration note). The spec does not require gating; mentioned only so that the owner can confirm this is intended.
- A leftover folder `C:\workspace\jarvis-verify` (untracked, outside the repository, from the earlier recorder verification) holds an old `node_modules`. Not part of this CR; the VE did not delete it.

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|
| REQ_AUT_AGENTMODEL | SPEC_AUT_AGENTEXEC, SPEC_AUT_JOBSCHEMA, SPEC_AUT_JOBREG | heartbeat.ts, core package.json | heartbeat-agent-model.test.ts; T-1, T-3..T-8, U-1 | automated: yes; live: open |
| REQ_AUT_LISTMODELS | SPEC_AUT_LISTMODELS | heartbeat.ts, extension.ts, core package.json | heartbeat-agent-model.test.ts; T-1, T-2, T-6, U-1 | automated: yes; live: open |
| REQ_AUT_JOBEXEC (AC-5, AC-7) | SPEC_AUT_AGENTEXEC, SPEC_AUT_STEP_OUTPUT_VARS | heartbeat.ts | heartbeat-agent-model.test.ts; T-3..T-7, T-9 | automated: yes; live: open |
| REQ_AUT_JOBCONFIG (AC-4) | SPEC_AUT_JOBSCHEMA | heartbeat.ts | type + fixture test | yes |
| REQ_AUT_STEP_OUTPUT_VARS (AC-2) | SPEC_AUT_STEP_OUTPUT_VARS | heartbeat.ts | heartbeat-agent-model.test.ts, heartbeat-step-output-vars.test.ts; T-9 | automated: yes |

## Conclusion

**PARTIAL.** Implementation matches the specification and the Change Document; the build is clean, 480/480 tests pass, and the new tests demonstrably fail against the previous code. What is not proven is everything that depends on a real VS Code model catalog: whether `selectChatModels()` without a selector returns bring-your-own-key and local models and whether each `id` works as `model` (the open Verify-first), plus consent, quota, tool routes and the user's own providers (T-1..T-9, U-1, all NOT RUN). Those cases and the Verify-first answer decide promotion. If T-1 shows a vendor's models are missing, the design returns to the System Designer.

Next: SD fixes F-1 and F-2, Test Designer fixes F-3, then QM runs T-1..T-9 in the EDH and the user runs U-1; the release-notes migration line follows in the documentation step.

---

## Round 2: Verification of D-12 (list entry is `vendor` and `model` only, one notation)

**Date**: 2026-10-08
**Scope**: the delta `384efd3..58bbb72` (spec `ce7d918`, code `b441875`, protocol `58bbb72`, UAT wording `9208b32`, `c17328d`); targeted, unchanged parts not re-verified. HEAD later moved to `135002d`; the commits after `58bbb72` only touch actor memory/context.
**Verified at**: build, tests, eslint, old-code check, remnant greps and Sphinx on committed `69f0be4` (= `58bbb72` plus CM context commit) in a detached worktree (dependencies linked, removed afterwards), because the shared tree was dirty at that moment, see "Shared-tree state" below. The closing checks (F-1..F-3 closed, D-12 markers present, Sphinx before the commit) ran in the shared tree at `135002d` after `git status --short` and `git diff --stat -- docs` were both empty. No spec file was edited in this round.
**Status**: PARTIAL

### Result

| Check | Result |
|-------|--------|
| Full monorepo build (`compile all` equivalent) | clean, exit 0 |
| `npx vitest run` | 483/483 pass, 51 files |
| ESLint on `heartbeat.ts`, `extension.ts`, `heartbeat-agent-model.test.ts` | 0 errors, 39 warnings (`no-explicit-any`) |
| Sphinx `-W --keep-going` | clean, 0 warnings |
| D-12 spec, code and tests agree | yes, per AC below |
| New tests against previous code (`bd23ee4` versions of `heartbeat.ts`, `extension.ts`, `package.json`; identical to `b441875~1` for these files) | `heartbeat-agent-model.test.ts`: **9 failed / 17 passed** of 26 |
| Remnants of the old format | none |
| Earlier findings F-1, F-2, F-3 | closed at HEAD (agent step examples name vendor and model; AC block and Verify-first appear once; protocol paths resolve) |

The 9 failures are the D-12 tests: failure-message shape (3), entry shape (1), `formatModelEntry` (1, fails on the missing export), `listAvailableModels` shape (1), command output (1), tool description (1) and the check that command and tool read no display name (1). The 17 that pass are tests D-12 did not change.

### D-12 AC trace

"Verified" = committed spec, code and an automated test agree. Anything provable only in the EDH is listed under the protocol case and is **not verified**.

| Element | AC (D-12) | Code | Test | State |
|---------|-----------|------|------|-------|
| US_AUT_AGENTMODEL | AC-6 what the list shows is what is written into a step | `heartbeat.ts:240-249` | "entries carry vendor and model (= id) and nothing else" | automated: yes; live: T-2 NOT RUN |
| REQ_AUT_LISTMODELS | AC-2 tool returns the same list, same two values | `extension.ts:991-998` (`JSON.stringify(models)` of `listAvailableModels()`), core `package.json` `modelDescription` "`{ vendor, model }`" | "AC-2: jarvis_listModels is a declared tool…"; "neither the command nor the tool output reads a display name" | automated: yes (declaration and source wiring); live tool routes: T-2 NOT RUN |
| REQ_AUT_LISTMODELS | AC-3 entry has `vendor` and `model` and nothing else | `ModelEntry { vendor; model }`, `toModelEntries` maps two fields | same entry test; `Object.keys(e)` equals `['vendor','model']`; `JSON.stringify` contains no display name | automated: yes |
| REQ_AUT_LISTMODELS | AC-5 one notation naming both fields, command and failure message | `formatModelEntry` = `vendor="<v>" model="<m>"` (`heartbeat.ts:255-258`), used by `extension.ts:1007` and `modelUnavailableMessage` | "formatModelEntry is the one notation"; failure-format test compares the lines to `formatModelEntry` | automated: yes; live: T-2, T-6 NOT RUN |
| REQ_AUT_AGENTMODEL | AC-4 failure message names the choice and lists the offered models | `modelUnavailableMessage` (`heartbeat.ts:260-273`) | "the failure message shows no display name, one entry per line, same notation as the command"; "an unknown choice is named as given"; "neither value given"; "no model available at all lists (none) on the Available line" | automated: yes; live: T-6 NOT RUN |
| SPEC_AUT_AGENTEXEC | AC-4 message shape: first line with the choice or `(missing)`, `Available:`, one entry per line sorted, or `Available: (none)` | same | same | automated: yes; Verify-first still open (T-1 user-reported only, see below) |
| SPEC_AUT_LISTMODELS | AC-3 entries carry only `vendor` and `model`; command writes with `formatModelEntry` | `extension.ts:1000-1011` | "the command prints one line per entry…" (asserts `formatModelEntry(m)` call and no `name="${m.name}"`); display-name check on the whole command and tool block | automated: yes (source assertions, not an execution of the command); live: T-2 NOT RUN |

Failure message shape confirmed byte for byte by the tests: `language model not available: vendor="x", model="y"` then `Available:` then one `vendor="…" model="…"` line per model in `toModelEntries` order; empty catalog gives `Available: (none)` on the second line. Missing values appear as `(missing)`.

Observation: the command and tool wiring tests are assertions on the source text of `extension.ts` and `package.json`, not executions of the handler. Together with the behavioural tests of `toModelEntries`, `formatModelEntry` and `listAvailableModels`, this proves the data shape; what the user and an Actor really see is T-2.

### Remnant greps (committed HEAD)

- Old format (`{ vendor, model, name }`, `name="${…}"`, a `name` field in model entries, `vendor/model` joined message): none in `packages/core`, `docs/design`, `docs/requirements`, `docs/userstories`, `README.md` or tests. The hits that remain are unrelated log lines (`registerJob: name="…"`), test-internal comparison labels (`${e.vendor}/${e.model}`) and the assertion that `{ vendor, model, name }` is absent from the tool description.
- Removed setting `jarvis.heartbeatConfigFile`: absent from `spec_uat_heartbeat.rst`, `req_uat_heartbeat.rst`, `us_uat_heartbeat.rst` (the three UAT files this change touched); the only mention in the protocol is the instruction not to set it; not declared in `packages/core/package.json`.
- Wider debt, informational and already listed by the SD as backlog 54 (I-5/I-6), not part of this CR: mentions remain in `spec_cfg.rst` (7), `req_cfg.rst` (3), `us_cfg.rst` (1), `spec_uat_heartbeat_pause.rst` (1), `spec_uat_listjobs.rst` (1), `us_uat_tree_node_open_file.rst` (2) and `README.md` (1).

### Protocol check (`tst-heartbeat-agent-model-selection.md`)

- Header result is PARTIAL with the reason stated (T-1/T-3 user-reported and predating D-12; D-12 live checks NOT RUN); no FAIL row.
- T-1 and T-3 are recorded `PASS (user-reported; source: PM via Change Manager, 2026-10-08 …)`, each labelled as predating D-12 (the list then included a display name). They are not independent QM evidence and are not counted as such here.
- T-2 (D-12 command notation and two-field tool parity) and T-6 (failure format and notifications) are NOT RUN and describe exactly the D-12 shapes: `[Models] vendor="<v>" model="<m>"`, entries with exactly `vendor` and `model`, `Available:` followed by one such line each, `Available: (none)`, no `vendor/model` slash pair.
- T-4, T-5, T-7, T-8, T-9, U-1: NOT RUN. The user's decision (via PM, in the CD) not to run them before the merge is recorded; it is not a pass and does not change any result.
- The AC map (new section "D-12 Evidence and Live Checks") links US_AUT_AGENTMODEL AC-6, REQ_AUT_LISTMODELS AC-2/3/5, REQ_AUT_AGENTMODEL AC-4, SPEC_AUT_LISTMODELS AC-3 and SPEC_AUT_AGENTEXEC AC-4 to the test names above, which exist verbatim in `src/tests/heartbeat-agent-model.test.ts`. Test paths now resolve.
- The two live observations of the user (copilot entry and BYOK/local vendors visible; a job ran with `copilot/gpt-6-luna`) are a user statement. D-12 does not change the model lookup, so T-3 remains informative, but I have not seen it.

### Spec statuses (rule unchanged: promote only what rests on evidence I have)

| Element | Before | After | Reason / open case |
|---------|--------|-------|--------------------|
| US_AUT_AGENTMODEL | approved | approved | AC-2/AC-4/AC-6 live behaviour: T-2, U-1 NOT RUN; T-1/T-3 are user-reported and pre-D-12 |
| REQ_AUT_AGENTMODEL | approved | approved | AC-2 real request: only a user-reported run exists; AC-4 live notification: T-6 NOT RUN |
| REQ_AUT_LISTMODELS | approved | approved | AC-1/AC-2/AC-5 live command and both tool routes: T-2 NOT RUN |
| SPEC_AUT_LISTMODELS | approved | approved | AC-1/AC-2/AC-3 live display: T-2 NOT RUN |
| SPEC_AUT_AGENTEXEC | approved | approved | Verify-first (all vendors returned, `id` usable as `model`) answered only by a user statement; T-6, T-7, T-9 NOT RUN |
| REQ_AUT_JOBEXEC | approved | approved | AC-5 proof: T-3 user-reported only; T-4, T-5 NOT RUN |
| REQ_AUT_JOBCONFIG, SPEC_AUT_JOBSCHEMA, SPEC_AUT_JOBREG | implemented | implemented | not touched by D-12; contracts proven by tests |

No status changed in this round, so no spec file is touched; only this report is committed.

### Shared-tree state during this verification

When this round began the shared working tree held uncommitted edits to `docs/design/spec_aut.rst` and `docs/requirements/req_aut.rst` that contained the **pre-D-12** text (display `name` in `ModelEntry`, `vendor/model` joined message, REQ_AUT_LISTMODELS AC-5 removed). They were not mine and not part of any commit; had they been committed, D-12 would have been undone in the specs. The CM context records a stale editor buffer and a later commit states it was fixed; at the time of the final check the tree was clean and the committed D-12 text intact (`formatModelEntry` six times in `spec_aut.rst`, REQ_AUT_LISTMODELS AC-5 present). Because of this, the build, tests and greps above were run on committed HEAD in a detached worktree and not in the shared tree.

### Findings

None against the D-12 change. Open and unchanged: the Verify-first of `SPEC_AUT_AGENTEXEC`, the NOT RUN live cases (user decision recorded), the release-notes migration line (documentation step), and the wider `heartbeatConfigFile` debt (backlog 54).

### Round 2 verdict: PARTIAL

D-12 is implemented as specified and covered by tests that fail on the previous code. The CR stays PARTIAL because live behaviour (T-2, T-4..T-9, U-1) is NOT RUN and the only live evidence is user-reported and pre-D-12. No status is promoted.
