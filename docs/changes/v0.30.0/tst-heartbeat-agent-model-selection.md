# Test Protocol: heartbeat-agent-model-selection

- **Change Document:** [heartbeat-agent-model-selection](heartbeat-agent-model-selection.md)
- **Branch:** `feature/heartbeat-agent-model-selection`
- **Result:** PARTIAL (T-1/T-3 user-reported pre-D-12; D-12 live checks NOT RUN)

## Scope and Execution

This protocol covers the live VS Code model catalog, command and Actor-tool
access, real model requests, model-selection failures, job registration, and
`${VAR}` interpolation in `vendor` and `model`. Existing heartbeat UAT cases
T-7 and T-20 cover the basic agent response and output-variable chain; this
protocol adds model-selection-specific checks. Deterministic behavior already
covered by `src/tests/heartbeat-agent-model.test.ts` and
`src/tests/heartbeat-step-output-vars.test.ts` is cited below rather than
repeated as manual-only evidence. For D-12, the Change Manager reports a
483-test automated suite; focused automated evidence is named below. T-1 and T-3 are
earlier user-reported observations and do not verify D-12's list-entry or
failure-message format. All other manual results remain `NOT RUN`.

QM executes the QM cases in a Windows Extension Development Host (EDH). The
User executes U-1 against the User's actual VS Code model-provider setup.
Record `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN` for each case, with tester, date,
environment, and sanitized evidence. A missing prerequisite is `BLOCKED`, not
an assumed pass. A reported result not witnessed by QM is marked
`PASS (user-reported; source: ...)`, with its exact scope recorded; it is not
independent QM verification. Module integration, compilation, packaging, and
CI remain Engineering checks outside this manual protocol.

### Preconditions

- Launch the Extension Development Host from
  `feature/heartbeat-agent-model-selection`. Use a disposable VS Code profile
  for model-consent and no-provider cases.
- In a disposable workspace, copy (do not move) the checked-in
   `testdata/heartbeat/heartbeat.yaml`, `prompts/`, and `scripts/` into
   `<workspace root>/.jarvis/` (when the workspace itself is `testdata/`, the
   target is `testdata/.jarvis/`). Do not remove or modify the tracked source
   fixture: automated tests read it. The extension uses this fixed `.jarvis`
   path; do not set the removed `jarvis.heartbeatConfigFile` setting. Reload
   the EDH after copying and keep the `prompts/` and `scripts/` subdirectories.
   Prompt, script, and `outputFile` paths are relative to `.jarvis`, so an
   output file such as `agent-response.txt` is written there.
- Keep the Jarvis Output Channel open. Confirm the copied fixture's
  `prompts/hello.md` exists.
- Before configuring an agent step, run **Jarvis: List Language Models** and
   record each entry's exact `vendor` and `model` values. `model` is the listed
   model ID. Under D-12 the command shows no display name or other field. Never
   assume `copilot/gpt-4o` or any other built-in choice.
- The checked-in fixture's `t7-agent-hello` step names `vendor: copilot` and
   `model: gpt-4o`. If that exact pair is absent from the T-1 list, replace both
   fields in `.jarvis/heartbeat.yaml` with a pair listed by the command before
   successful agent runs. Apply the same rule to the existing heartbeat UAT
   procedures T-7 and T-20. For this protocol, use the listed pair for
   T-3..T-5 and T-9; U-1 uses a pair from the User's own list. This protocol's
   T-7 is a separate no-default check and intentionally removes both fields.
- Have an authorized provider with available quota for successful-request
  cases. T-4 needs a fresh consent state when the provider supports consent;
  T-5 needs a test account that is already quota-limited. Do not deliberately
  exhaust a real account's quota.
- For T-2 and T-8, have a test Actor chat using the Jarvis Language Model Tool
  API and the embedded MCP server available.
- In `.jarvis/scripts/`, create `tst-after-agent.ps1` with the following
   content and remove its marker file before each negative/error run:

   ```powershell
   [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'tst-after-agent-ran.txt'), 'ran')
   ```

- Keep all prompts non-sensitive. Use unique output and marker filenames for
  each run.

## Automated Evidence

These are coverage references, not manual results. The automated tests mock
`vscode.lm.selectChatModels()` and do not establish what a real VS Code profile
offers or how a real provider handles consent and quota.

| Behavior | Automated evidence |
|----------|--------------------|
| Exact vendor/model matching, no built-in choice, case sensitivity, and no display-name/family matching | `src/tests/heartbeat-agent-model.test.ts`: "asks selectChatModels without a selector and uses the matching model"; "the match is exact and case-sensitive, on vendor and on id"; "the display name is never matched, the family is not used"; source fixed-choice removal check |
| Missing, partial, unknown, and empty catalog errors; no model request/output and job abort | `src/tests/heartbeat-agent-model.test.ts`: "neither value given: no default, (missing) for both, list sorted"; "empty string and non-string values count as missing"; "only one of the two given"; "an unknown choice is named as given"; "no model available at all lists (none)"; "a failing step sends no prompt, writes no output file, and aborts the job" |
| Prompt-file read ordering and successful response/output behavior | `src/tests/heartbeat-agent-model.test.ts`: "an unreadable prompt file fails before the model list is asked"; "matching model: response in output, outputFile written, append honoured, outputVar captured" |
| `vendor` and `model` interpolation | `src/tests/heartbeat-agent-model.test.ts`: "both are interpolated from earlier step output before the lookup"; "an unresolved reference stays as written and shows in the failure message"; `src/tests/heartbeat-step-output-vars.test.ts`: agent output capture and prompt interpolation |
| D-12 list-entry shape and notation | `src/tests/heartbeat-agent-model.test.ts`: "entries carry vendor and model (= id) and nothing else, sorted by vendor then model, ignoring case"; "formatModelEntry is the one notation: vendor=\"v\" model=\"m\", values written as they are" |
| D-12 command/tool output | `src/tests/heartbeat-agent-model.test.ts`: "AC-1: the command prints one line per entry, values quoted, or says that none is available"; "AC-2: jarvis_listModels is a declared tool without input, registered through engine.registerTool, and returns JSON entries"; "SPEC_AUT_LISTMODELS AC-3: neither the command nor the tool output reads a display name" |
| D-12 failure-message shape | `src/tests/heartbeat-agent-model.test.ts`: "REQ_AUT_AGENTMODEL AC-4: the failure message shows no display name, one entry per line, same notation as the command"; "AC-4: an unknown choice is named as given, in quotes"; "AC-4: no model available at all lists (none) on the Available line" |
| List refresh, matching, schema, and persistence | `src/tests/heartbeat-agent-model.test.ts`: `listAvailableModels` refresh test; copy-match tests; command/tool manifest and wiring tests; registerJob schema and YAML persistence tests |

## Test Results

| ID | REQ ID | AC | Owner | Description | Result |
|----|--------|----|-------|-------------|--------|
| T-1 | REQ_AUT_LISTMODELS; REQ_AUT_AGENTMODEL | AC-1..4; AC-1,2 | User (reported via PM) | Live catalog; pre-D-12 list format | PASS (user-reported; source: PM via Change Manager, 2026-10-08; one Copilot entry, BYOK/local vendors visible, display name included; D-12 format NOT RUN) |
| T-2 | US_AUT_AGENTMODEL; REQ_AUT_LISTMODELS; SPEC_AUT_LISTMODELS | AC-6; AC-2,3,5; AC-3 | QM (EDH) | D-12 command notation and two-field tool parity | NOT RUN |
| T-3 | REQ_AUT_AGENTMODEL; REQ_AUT_JOBEXEC | AC-1,2; AC-5 | User (reported via PM) | Real request with pre-D-12 list format | PASS (user-reported; source: PM via Change Manager, 2026-10-08; copilot/gpt-6-luna ran; response file written) |
| T-4 | REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT | AC-5; AC-3 | QM (EDH) | VS Code model consent behavior | NOT RUN |
| T-5 | REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT | AC-5; AC-3 | QM (EDH) | Real provider quota rejection | NOT RUN |
| T-6 | REQ_AUT_AGENTMODEL; REQ_AUT_LISTMODELS; SPEC_AUT_AGENTEXEC; REQ_AUT_JOBEXEC; REQ_AUT_OUTPUT | AC-4; AC-5; AC-4; AC-4; AC-3 | QM (EDH) | D-12 missing/unknown/no-model failure format and notifications | NOT RUN |
| T-7 | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL | AC-1,3; AC-1,3 | QM (EDH) | Legacy agent step has no default and sends no prompt | NOT RUN |
| T-8 | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL | AC-5; AC-5 | QM (EDH) | Actor job registration persists both fields | NOT RUN |
| T-9 | REQ_AUT_STEP_OUTPUT_VARS; REQ_AUT_JOBEXEC | AC-2; AC-7 | QM (EDH) | Interpolate both model-selection fields | NOT RUN |
| U-1 | US_AUT_AGENTMODEL; REQ_AUT_AGENTMODEL; REQ_AUT_LISTMODELS | AC-1,2,4; AC-2; AC-3,4 | User | Verify the User's configured BYOK/local models | NOT RUN |

The PM reported to the Change Manager on 2026-10-08 that the User's list
command showed one Copilot model, BYOK/local vendors were visible, and an
agent step using `copilot/gpt-6-luna` ran and wrote its output file. These observations
predate D-12: the list included a display name, and neither observation covers
the new two-field list/tool shape or the new failure-message notation. They are
user-reported, not independent QM verification; the report does not establish
successful use of a BYOK/local model or specify the output file path.

**User decision (context only):** The CD records that the User chose not to
run the remaining live cases before merge and accepts the risk of fixing any
failure found in use afterwards. This is not a test result, waiver, or pass:
T-2, T-4..T-9, and U-1 remain `NOT RUN`.

## Execution Procedures

### QM: Extension Development Host

#### T-1: Live Catalog and Listed Model IDs

The table's user-reported result is from before D-12. The current output-format
assertions below are NOT RUN.

1. In the EDH, run **Jarvis: List Language Models** from the Command Palette.
2. In the Jarvis Output Channel, record the count and each entry line. Confirm
   the entry is formatted `[Models] vendor="<vendor>" model="<model>"` and
   contains no display name or additional field.
3. For each model provider configured and available in this EDH profile,
   confirm its models appear. If the profile has a BYOK or local provider,
   check that provider too. Run the command again after any provider-availability
   change made in this disposable profile and confirm the output reflects the
   current list.
4. Select one exact `vendor`/`model` pair from the output for T-3.

**Expected:** The command shows the models available to this VS Code profile
at call time. Each entry line contains only the exact `vendor` and `model`
values in the stated notation; there is no display name. If a configured
provider is absent, or a listed ID is rejected in T-3, stop the
model-availability verification and return that evidence to the System
Designer; do not substitute a guessed ID or fallback model.

#### T-2: Command and Actor Tool Parity

1. Capture the T-1 command output without changing model-provider availability.
   Confirm each command entry is `[Models] vendor="<vendor>" model="<model>"`
   with no display name.
2. In a test Actor chat using the Language Model Tool API, request
   `jarvis_listModels` with no input and inspect the returned JSON array.
3. Repeat through the embedded MCP server, also with no input.
4. Compare each returned entry with the command output. Check that every JSON
   entry has exactly the two fields `vendor` and `model`, no `name` or other
   field, and that both values exactly match the command line.

**Expected:** Both tool routes return the same current entries as the command,
one entry per available model, as JSON objects with only `vendor` and `model`,
and take no input. The command writes one line per entry as
`[Models] vendor="<vendor>" model="<model>"`; neither output includes a
display name. A tool error, missing route, extra field, or mismatching entry
is a failure; mocked registration checks do not substitute for either live
route.

#### T-3: Real Request to a Listed Model

The table's user-reported run predates D-12. It does not verify that a pair
copied from the new two-field list output works; that current-format check is
NOT RUN.

1. In the disposable workspace's `.jarvis/heartbeat.yaml`, set the
   `t7-agent-hello` job's agent step to `vendor` and `model` copied exactly
   from T-1. Keep `prompt: prompts/hello.md` and set `outputFile` to a unique
   filename such as `agent-response-t3-<id>.txt`; it resolves under `.jarvis/`.
2. Run **Jarvis: Run Heartbeat Job**, select `t7-agent-hello`, and wait for
   the request to finish.
3. Inspect the Jarvis Output Channel and
   `<workspace root>/.jarvis/agent-response-t3-<id>.txt`.

**Expected:** The step sends the prompt to the model named by the exact listed
`vendor` and `model`, and receives a response. The log names that exact pair
and response length, and the output file contains the model response. No
default or different model is used. If a pair copied from
the live list is rejected, stop and return the vendor, ID, and sanitized error
to the System Designer.

#### T-4: VS Code Model Consent

1. Use a disposable EDH profile with a provider configured but with no prior
   consent recorded for a listed model that requires first-use consent. Use
   the T-3 job in `.jarvis/heartbeat.yaml` with that exact listed pair and a
   unique `outputFile` filename under `.jarvis/`.
2. Run the job. If VS Code asks for model access, inspect the prompt and accept
   it. Confirm the job completes and the output file is written.
3. If the provider supports a consent-denial path, repeat in a fresh disposable
   profile and deny access. Inspect the error notification and Output Channel.

**Expected:** VS Code's real consent decision governs the request. After
consent is granted, an otherwise available model can respond and its response
file is written under `.jarvis/`. If consent is denied, Jarvis surfaces the
provider/API failure rather than reporting the listed model as unavailable.
If this provider does not use a consent prompt, record that observation; do not
infer consent behavior from a mocked request.

#### T-5: Real Provider Quota Rejection

1. Use a test provider account that is already at its real quota limit; do not
   spend requests to exhaust an account. Confirm the chosen `vendor` and
   `model` are still present in **Jarvis: List Language Models**.
2. Run the same kind of manual agent job with that exact pair and a unique
   `outputFile` filename under `.jarvis/`, followed by a PowerShell step running
   `scripts/tst-after-agent.ps1`.
3. Inspect the error notification, Jarvis Output Channel, output file, and
   whether a subsequent marker step ran.

**Expected:** The request fails with the provider's actual quota error, which
is surfaced through Jarvis's failure notification and Output Channel. It is
not rewritten as `language model not available`; no response output is written
under `.jarvis/`, and later steps do not run. If no naturally quota-limited
test account is available, leave this case `NOT RUN`; do not manufacture quota
exhaustion.

#### T-6: Missing, Unknown, and No-Model Failure Notifications

1. In `.jarvis/heartbeat.yaml`, make a manual test job whose first step is an
   agent step with `prompt: prompts/hello.md` and a unique `outputFile`
   filename (resolved under `.jarvis/`). Add a second PowerShell step running
   `scripts/tst-after-agent.ps1`. Confirm the output file and
   `.jarvis/scripts/tst-after-agent-ran.txt` are absent before each run.
2. Run the job once with both `vendor` and `model` omitted, once with only
   `vendor` omitted, and once with only `model` omitted. Use **Jarvis: Run
   Heartbeat Job** for these runs.
3. Run it with a `vendor` from T-1 and a deliberately nonexistent model ID.
   Repeat one missing or unknown case from the Heartbeat tree's inline Play
   action to exercise that notification route too.
4. In a separate disposable profile with no model providers available, confirm
   **Jarvis: List Language Models** reports that no model is available. Run a
   test step with placeholder values and inspect the failure.

**Expected:** Each failure produces an error notification naming the job and
agent step and a matching error in the Jarvis Output Channel. Missing values
are shown as `(missing)`; supplied unknown values are quoted as supplied. The
first line has the form
`language model not available: vendor=<"x"|(missing)>, model=<"y"|(missing)>`.
For a non-empty catalog, `Available:` is followed by one line per available
model, each formatted `vendor="<vendor>" model="<model>"` in sorted order;
there is no `vendor/model` slash pair and no display name. With no models, the
line is `Available: (none)`. The model is not called, the agent output file is
not created, the marker file is not created, and later steps do not run. If
this EDH cannot be configured with an empty live model catalog without
changing the User's normal profile, leave that subcase `NOT RUN` and record the
limitation.

#### T-7: Legacy Step Has No Default

1. In the `.jarvis/heartbeat.yaml` fixture copy, remove both `vendor` and
   `model` from the `t7-agent-hello` step. Keep `prompt: prompts/hello.md` and
   set a unique `outputFile` filename that does not exist under `.jarvis/`.
2. Run `t7-agent-hello` with **Jarvis: Run Heartbeat Job**.
3. Inspect the error notification, Jarvis Output Channel,
   `<workspace root>/.jarvis/<outputFile>` (which must not exist), and any VS
   Code model-consent/request UI.

**Expected:** The existing step fails with both values marked `(missing)` and
the currently available models listed. No model receives the prompt, no
response file is created, and no model-consent/request flow starts. The
executor may read the prompt file first as specified by
`SPEC_AUT_AGENTEXEC` AC-5; this case verifies failure before sending the
prompt to a model, not before reading the file. There is no fallback to
Copilot, `gpt-4o`, or another model.

#### T-8: Actor Registration Persists the Choice

1. In the test Actor chat for this workspace, call `jarvis_registerJob` with a
   unique job name, `schedule: "manual"`, and one agent step containing
   `prompt: "prompts/hello.md"` plus an exact `vendor`/`model` pair from T-1.
2. Open `<workspace root>/.jarvis/heartbeat.yaml` and locate the new job.
3. Refresh the Heartbeat view and confirm the job appears. Do not run it as
   part of this persistence case.

**Expected:** The tool accepts both step fields and the YAML entry persists
the exact `vendor` and `model` strings without omission or alteration.

#### T-9: Interpolate `vendor` and `model`

1. In `.jarvis/scripts/`, create `tst-agent-vendor.ps1` and
   `tst-agent-model.ps1`. Each script writes exactly one selected T-1 value to
   standard output without a trailing newline, for example:

   ```powershell
   [Console]::Write('copied-vendor-value')
   ```

   Double any apostrophe in a value when placing it in the PowerShell
   single-quoted string.
2. Add a manual job with these steps in order: a PowerShell step running
   `scripts/tst-agent-vendor.ps1` with `outputVar: TST_VENDOR`; a PowerShell
   step running `scripts/tst-agent-model.ps1` with `outputVar: TST_MODEL`; and
   an agent step with `vendor: "${TST_VENDOR}"`,
   `model: "${TST_MODEL}"`, `prompt: prompts/hello.md`, and a unique
   `outputFile`.
3. Run the job and inspect the variable and agent model log entries and the
   output file under `.jarvis/`.
4. Remove the temporary scripts from `.jarvis/scripts/` and the output file
   from `.jarvis/` in the disposable workspace.

**Expected:** The final agent lookup uses exactly the two values emitted by
the earlier steps. The log names the selected `vendor/model` pair and the
agent response is written. A literal `${TST_VENDOR}` or `${TST_MODEL}` in the
failure message, or a model-unavailable error for a listed pair, is a failure.

### User: Actual Model Providers

#### U-1: Verify BYOK and Local Model Availability

1. In the User's VS Code profile, run **Jarvis: List Language Models** and
   record the providers the User has configured, including BYOK and local
   providers where present.
2. For each configured BYOK/local provider, confirm at least one expected model
   appears. Copy its exact `vendor` and `model` values into
   `<workspace root>/.jarvis/heartbeat.yaml` in the disposable workspace, with
   a harmless prompt asking for a short fixed response and a unique
   `outputFile` filename.
3. Run the job and inspect the model log and response file under `.jarvis/`.
   Do not install, enable, or reconfigure a provider solely to make this test
   pass.

**Expected:** The command lists the User's usable provider/model pairs, and a
listed model ID can be used by an agent step. If a configured vendor is
missing or a listed ID is rejected, stop and return the observed vendor, ID,
and sanitized evidence to the System Designer. If the User has no BYOK or
local provider configured, leave that provider-specific portion `NOT RUN`;
the Copilot result does not establish BYOK/local coverage.

## Acceptance Criteria Mapping

| Element | Acceptance Criteria | Test Cases |
|---------|---------------------|------------|
| US_AUT_AGENTMODEL | AC-1, AC-3 | T-6, T-7 |
| US_AUT_AGENTMODEL | AC-2 | T-3, T-9, U-1 |
| US_AUT_AGENTMODEL | AC-4 | T-1, T-2, U-1 |
| US_AUT_AGENTMODEL | AC-5 | T-8 |
| REQ_AUT_AGENTMODEL | AC-1..5 | T-1, T-3..T-8, U-1 |
| REQ_AUT_LISTMODELS | AC-1, AC-3, AC-4 | T-1, T-2, T-6, U-1 |
| REQ_AUT_LISTMODELS | AC-2 | T-2 |
| REQ_AUT_JOBEXEC | AC-4, AC-5 | T-3..T-7 |
| REQ_AUT_STEP_OUTPUT_VARS | AC-2 | T-9 |
| SPEC_AUT_AGENTEXEC | AC-1..6 and Verify first | T-1, T-3..T-7, T-9, U-1 |
| SPEC_AUT_LISTMODELS | AC-1..4 | T-1, T-2, T-6 |
| SPEC_AUT_JOBREG | AC-1 | T-8 |
| SPEC_AUT_STEP_OUTPUT_VARS | AC-6 | T-9 |
| SPEC_AUT_OUTPUTCHANNEL | Failure notification and log path | T-4..T-7 |

### D-12 Evidence and Live Checks

| Element | AC | Automated evidence | Manual live check, owner, result |
|---------|----|--------------------|---------------------------------|
| US_AUT_AGENTMODEL | AC-6 | `src/tests/heartbeat-agent-model.test.ts`: "entries carry vendor and model (= id) and nothing else, sorted by vendor then model, ignoring case" | T-2, QM (EDH), NOT RUN |
| REQ_AUT_LISTMODELS | AC-2 | `src/tests/heartbeat-agent-model.test.ts`: "AC-2: jarvis_listModels is a declared tool without input, registered through engine.registerTool, and returns JSON entries" | T-2, QM (EDH), NOT RUN |
| REQ_AUT_LISTMODELS | AC-3 | `src/tests/heartbeat-agent-model.test.ts`: "entries carry vendor and model (= id) and nothing else"; "SPEC_AUT_LISTMODELS AC-3: neither the command nor the tool output reads a display name" | T-2, QM (EDH), NOT RUN |
| REQ_AUT_LISTMODELS | AC-5 | `src/tests/heartbeat-agent-model.test.ts`: "formatModelEntry is the one notation: vendor=\"v\" model=\"m\", values written as they are"; failure-format test compares available lines to `formatModelEntry` | T-2 and T-6, QM (EDH), NOT RUN |
| REQ_AUT_AGENTMODEL | AC-4 | `src/tests/heartbeat-agent-model.test.ts`: "REQ_AUT_AGENTMODEL AC-4: the failure message shows no display name, one entry per line, same notation as the command" | T-6, QM (EDH), NOT RUN |
| SPEC_AUT_LISTMODELS | AC-3 | `src/tests/heartbeat-agent-model.test.ts`: "SPEC_AUT_LISTMODELS AC-3: neither the command nor the tool output reads a display name" | T-2, QM (EDH), NOT RUN |
| SPEC_AUT_AGENTEXEC | AC-4 | `src/tests/heartbeat-agent-model.test.ts`: "REQ_AUT_AGENTMODEL AC-4: the failure message shows no display name, one entry per line, same notation as the command"; "AC-4: no model available at all lists (none) on the Available line" | T-6, QM (EDH), NOT RUN |

## Testability Concerns

- The D-12 ACs are directly testable: T-2 checks the live command and both
   tool routes; T-6 checks missing, unknown, and empty-catalog failure output.
   The named automated tests cover deterministic formatting and object shape;
   live command/tool/error behavior remains NOT RUN by the User's decision
   below, not untestable.
- Live provider enumeration, especially BYOK/local providers, is profile- and
  provider-dependent and is not established by mocked automated tests. T-1
  and U-1 are required before claiming those vendors are supported. A missing
  configured vendor or rejected listed ID is a stop condition for the System
  Designer.
- T-5 requires a real quota-limited account; do not consume quota to create
  that state. If no such account is available, keep the case `NOT RUN`.
- The empty-catalog subcase in T-6 requires a disposable profile in which
  `selectChatModels()` returns no models. If that state cannot be created
  safely, keep it `NOT RUN`; the automated empty-list test is not live-provider
  evidence.
- Consent behavior depends on the provider and its recorded authorization
  state. Only record what the real EDH displays; a provider that does not
  require a consent prompt cannot demonstrate the consent UI path.

## Sign-off

- [ ] Live model list and copied model IDs verified in QM EDH (T-1)
- [ ] Command and Actor tool routes verified (T-2)
- [ ] Real model request and consent/quota behavior recorded (T-3..T-5)
- [ ] Missing, unknown, empty-list, and legacy no-default failures verified (T-6, T-7)
- [ ] Actor registration and both interpolated fields verified (T-8, T-9)
- [ ] User's BYOK/local provider availability verified or explicitly left NOT RUN (U-1)
- [ ] Ready for verification phase