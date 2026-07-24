# Change Document: heartbeat-step-output-vars

**Status**: approved — merging
**Branch**: feature/heartbeat-step-output-vars
**Created**: 2026-07-23
**Author**: Project Manager (intake), Change Manager (pipeline)
**Operation Mode**: user-guided (default)

**GitHub Issue(s)**: #42

---

## Summary

Heartbeat job steps (`SPEC_AUT_JOBSCHEMA`, executed via `SPEC_AUT_EXECUTOR`/
`SPEC_AUT_AGENTEXEC`/`SPEC_AUT_QUEUEEXEC`) are currently fully isolated —
there is no way to carry output from one step into a later step in the same
job run. This forces workarounds (e.g. writing to intermediate files)
whenever step N needs data produced by step N-1, and it means a `queue` step
sending a message to an actor always sends the same static, job-defined
text on every run — which degrades signal quality for autonomous/heartbeat
delivery (repeated identical prompts read as noise rather than a concrete,
actionable trigger).

Proposed feature: an optional `outputVar` field on any step that produces
output (`powershell`/`python` script steps: captured stdout; `agent` steps:
captured response text), scoped to the current job execution. Subsequent
steps in the same run may reference a captured variable via `$VAR_NAME` /
`${VAR_NAME}` interpolation in any string field (`text`, `run`, `prompt`,
etc.), and optionally via an `env` map on script steps (environment variable
injection instead of inline string interpolation).

System Designer to scope during design: which step types support `outputVar`
as a source and which string fields support interpolation as a target;
interaction with existing template/substitution helpers (`applyTemplate()`
in `packages/core/src/extension.ts`); variable lifetime/scoping (single job
run only); behavior on missing/undefined variables (leave literal `$VAR_NAME`
as-is, matching `applyTemplate()`'s existing "unknown tokens left as-is"
convention, vs. hard failure); and whether this needs a new SPEC element
under `SPEC_AUT_JOBSCHEMA`/`SPEC_AUT_EXECUTOR` or new dedicated SPEC(s).

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Heartbeat Scheduled Job Execution | unchanged | Existing US already covers "execute job steps in sequence"; `outputVar` chaining extends the existing capability without requiring a new user story |

### New User Stories

None.

### Decisions

- Decision 1: No new US needed. `outputVar` and `${VAR}` interpolation are a natural extension of "steps execute in sequence" — not a distinct new user need. The existing US covers it at story granularity.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_AUT_JOBEXEC | US_AUT_HEARTBEAT | modified | AC-6 added (`outputVar` optional field); AC-7 added (`${VAR_NAME}` interpolation); AC-8 added (`LAST_STDERR` well-known variable) |
| REQ_AUT_OUTPUT | US_AUT_HEARTBEAT | modified | AC-1/AC-5 amended (outputVar source/validation); interpolation target semantics |

### New Requirements

None.

### Decisions

- Decision 1: Variable lifetime is single job run only — not persisted across runs or jobs.
- Decision 2: Missing/undefined variable references leave the literal `$VAR_NAME` string unchanged (matches `applyTemplate()`'s existing "unknown tokens left as-is" convention).
- Decision 3: `outputVar` on `queue`/`command` steps is silently ignored (no error) since those step types produce no capturable output.
- Decision 4: `LAST_STDERR` is a well-known variable always overwritten by script steps (python/powershell); non-script steps leave it unchanged.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (N/A — no new REQs)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_AUT_JOBSCHEMA | REQ_AUT_JOBEXEC | modified | `outputVar?: string` field added to step type definition |
| SPEC_AUT_EXECUTOR | REQ_AUT_JOBEXEC | modified | `executeJob()` pseudocode updated: `vars` map, `interpolateStep()` call before each step, `outputVar` capture after execution, `LAST_STDERR` update; load-time `outputVar` name validation |

### New Design Elements

None. The feature was designed as amendments to existing SPEC elements rather than new specs, following System Designer's round-2 pseudocode polish (commit 381e4b2).

### Decisions

- Decision 1: New `interpolateStep(step, vars)` helper handles `${VAR_NAME}` substitution across all string fields of a step object.
- Decision 2: `outputVar` name validation at load time — invalid names (not matching `[A-Z][A-Z0-9_]*`) emit a warning and are ignored (not a hard job-load failure).
- Decision 3: Variable scope is the `vars` map passed through `executeJob()`; scoping is single run, not shared across concurrent job executions.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (N/A — no new SPECs, amendments to existing)

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_AUT_HEARTBEAT | REQ_AUT_JOBEXEC (AC-6/7/8), REQ_AUT_OUTPUT | SPEC_AUT_JOBSCHEMA, SPEC_AUT_EXECUTOR | ✅ |

### Artefakt-Removal-Check

No artefacts removed. This CR is purely additive (new `outputVar` field, new `interpolateStep()` helper, `LAST_STDERR` convention). No deletions of code, settings, fields, or spec elements.

- [x] No artefact removals applicable in this CR

### Issues Found

None. MECE Round 1 found minor spec/code polish items (pseudocode accuracy, T-24 UAT log-wording) — all resolved before Round 2 MECE PASS (commit 77f4d47). Trace PASS in both rounds (verification-only, no commits needed).

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified (MECE Round 2 PASS commit 77f4d47; Trace Round 2 PASS)
- [x] Validation: 270/270 tests (5 new unit tests), TypeScript clean, lint 0 errors, Sphinx 0 warnings
- [x] Ready for merge — PM manual verification complete (see PM Decisions below)

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-23

#### Scope

Scoped review per CM notification: `outputVar` capture (script + agent steps), `${VAR_NAME}` interpolation via `interpolateStep()`, `LAST_STDERR` well-known variable, load-time name validation, and the MECE Round 1→Round 2 closeout (real test gap for agent-step capture + 2 spec-polish items).

#### Findings

None blocking. MECE's Round 1 real gap (missing unit test for `SPEC_AUT_STEP_OUTPUT_VARS` AC-3, agent-step `outputVar` capture) and its 2 spec-polish items (`spawnStep` pseudocode signature, T-24 log-wording precision) were all closed before Round 2 — QM independently re-confirmed all three closures below rather than trusting the val report's PASS verdict alone.

#### Independent Verification (for the record)

- `src/tests/heartbeat-step-output-vars.test.ts` — confirmed a 5th test now exists ("AC-3: agent step response captured into outputVar and interpolated into a later step + prompt path templated") exercising the previously-missing `executeAgentStep` → `outputVar` → later-step interpolation path, including cross-field interpolation (`prompt` templated before the agent runs, `AGENT_OUT` captured and interpolated into a subsequent `run` field) and the info-level log assertion.
- `docs/design/spec_aut.rst:1254` — `spawnStep` pseudocode signature confirmed corrected (no stale `configDir` param); matches the real `packages/core/src/apps/session/heartbeat.ts` signature `(executable, args, outputChannel, stepType)`.
- `docs/design/spec_aut.rst:163-165` — `executeJob` pseudocode confirmed to include the `LAST_STDERR` info-level log call, matching the shipped code exactly (`var LAST_STDERR set by ${step.type} step`).
- `docs/design/spec_uat_heartbeat.rst` T-24 / `docs/userstories/us_uat_heartbeat.rst` — log-wording confirmed corrected to identify the step by **type** (e.g. "set by powershell step"), not by job-configured name or array index, matching `heartbeat.ts`'s actual `outputChannel.info()` call templates exactly.
- `packages/core/src/apps/session/heartbeat.ts` — spot-checked `VAR_NAME_RE`, `interpolateStep()`, and the `executeJob()` capture guard (`if (result.output && interpolated.outputVar)`) directly; all match the SPEC/REQ ACs described in the val report.
- Did not re-run the full quality-gate suite this round (tsc/tests/sphinx) — accepted the val report's and CD's Round-2 confirmation (270/270 tests, TypeScript clean, Sphinx 0 warnings) given the depth of MECE's own reproduction work already on record for this CR.

#### Hold Status

Per established practice: **QM's CLEAR signal remains held** pending PM's manual re-test (GH #42 closure). No blocking findings.

#### PM Decisions

_(none required — no blocking findings)_

**PM manual verification (2026-07-23):** Beyond the committed mocked unit suite, PM independently
exercised the real (non-mocked) execution path with two temporary smoke tests (not committed):

1. A real `pwsh` subprocess step with `outputVar`, interpolated (`${VAR}`) into a real `queue` step,
   read back from a real queue file on disk (no `child_process`/`fs` mocking). Confirmed raw stdout is
   captured verbatim, including the trailing `\r\n` from `Write-Output` — no trimming, matching the
   as-designed behavior (no normalization was specced). Worth a heads-up for job authors: put `${VAR}`
   at the end of `text`/`prompt` fields, or trim in the script itself, if trailing whitespace matters.
2. A real YAML job file (not an object literal) through `loadJobs()`, confirming: a valid `outputVar`
   name survives parsing, an invalid name (AC-8) is warned and soft-rejected (`outputVar` set to
   `undefined`, job still loads), and the valid job then executes end-to-end with real `pwsh` + a real
   queue file exactly as in test 1.

Also reviewed call-site wiring risk (given GH #41 was itself a wiring bug): `executeJob()`'s signature
is unchanged by this CR, and all real call sites (`heartbeat.ts:450,606,674,701`, `extension.ts:530`)
pass arguments consistently, including the post-#41 `kindDrivenScanner` wiring. No integration risk
identified. Both temporary smoke-test files were deleted after verification (not for commit); full
committed suite re-confirmed green (271/271) after removal.

Decision: **merge.**

---

---

*Generated by syspilot Change Agent*
