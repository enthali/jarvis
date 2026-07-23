# Verification Report — heartbeat-step-output-vars — Round 1

**Verifier:** Quality Engineer MECE
**Branch:** `feature/heartbeat-step-output-vars`
**Commits reviewed:** `4d4d096` (System Designer L0/L1/L2), `4dd7f9a` (Test Designer T-19..T-25), `42f38a9` (Dev Engineer implementation)

## 1. REQ/SPEC ACs — Mutually Exclusive, Collectively Exhaustive

Reviewed `US_AUT_HEARTBEAT` AC-19, `REQ_AUT_JOBCONFIG` AC-6, `REQ_AUT_JOBEXEC`
AC-7/AC-8, `REQ_AUT_STEP_OUTPUT_VARS` (7 ACs), `SPEC_AUT_JOBSCHEMA` (schema
amendment), `SPEC_AUT_EXECUTOR`/`SPEC_AUT_AGENTEXEC` (amendments),
`SPEC_AUT_STEP_OUTPUT_VARS` (8 ACs).

**Verdict: PASS.** Each item covers a distinct concern with no overlap:

- `REQ_AUT_JOBCONFIG` AC-6 — schema/load-time field validation only.
- `REQ_AUT_JOBEXEC` AC-7/AC-8 — runtime execution semantics (vars map, interpolation, LAST_STDERR).
- `REQ_AUT_STEP_OUTPUT_VARS` — the dedicated requirement collecting the full behavioral contract (capture sources, interpolation targets, scope, undefined handling, name validation, logging, isolation from OS env).
- `SPEC_AUT_STEP_OUTPUT_VARS` — design-level realization of the same 7 REQ ACs, expressed as 8 SPEC ACs (1:1 mapping except SPEC splits "ExecResult fields" (AC-1) and "spawnStep/executeAgentStep return values" (AC-2/AC-3) out of REQ's single AC-7).

No gaps: every REQ AC has a corresponding SPEC AC. No redundancy: SPEC ACs are additive/refining, not duplicative, of REQ ACs.

## 2. Implementation vs spec match

**Verdict: PASS**, verified by direct reading of `packages/core/src/apps/session/heartbeat.ts` post-`42f38a9`:

| Behavior | Spec | Code | Match |
|---|---|---|---|
| `outputVar` field on `HeartbeatStep` | AC (JOBCONFIG AC-6) | `outputVar?: string;` added to interface | ✅ |
| `ExecResult.output`/`.stderr` | SPEC AC-1 | Added to `ExecResult` interface | ✅ |
| `spawnStep` accumulates full stdout/stderr | SPEC AC-2 | `stdoutFull`/`stderrFull` buffers, returned alongside existing bounded `stderrTail` | ✅ |
| `executeAgentStep` returns `output: text` | SPEC AC-3 | `return { success: true, output: text };` | ✅ |
| `vars` map + per-step interpolation | SPEC AC-4, AC-6 | `executeJob` builds `vars`, calls `interpolateStep()` before each `runStep` | ✅ |
| `LAST_STDERR` overwrite (script steps only, most-recent, even if empty) | SPEC AC-5 | `if (result.stderr !== undefined) { vars['LAST_STDERR'] = result.stderr; ... }` — matches "even if empty string" since `stderrFull` is always a string (`''` if none) | ✅ |
| Undefined var left as-is | SPEC AC-7 | `regex replace` callback returns original match `m` when `!(k in vars)` | ✅ |
| `outputVar` name validation at load | SPEC AC-8 | `loadJobs` applies `VAR_NAME_RE`, warns + strips invalid names | ✅ |

**Logging scope check (item 2 of CM's request):** the spec pseudocode explicitly
shows an info-level log only for the `outputVar` capture case; the Dev Engineer
additionally added an info log for every `LAST_STDERR` write:

```
if (result.stderr !== undefined) {
    vars['LAST_STDERR'] = result.stderr;
    outputChannel.info(`[Heartbeat] var LAST_STDERR set by ${interpolated.type} step`);
}
```

This is a **legitimate, desired extension**, not scope creep: `REQ_AUT_STEP_OUTPUT_VARS`
AC-6 says "**whenever a variable is captured (filled)**, the extension SHALL
log ... to the Output Channel" — `LAST_STDERR` is a variable per AC-8's own
wording ("a well-known variable `LAST_STDERR`"), so logging its writes is
required by the REQ's general wording even though the SPEC pseudocode only
illustrated the `outputVar` case. Recommend a one-line SPEC amendment adding
an explicit AC or pseudocode line for the `LAST_STDERR` log, since it's
current behavior that isn't literally spelled out at the design level —
non-blocking, documentation-completeness only.

## 3. `spawnStep` signature deviation

**Verdict: Non-issue — pseudocode should be corrected, not the code.**

Confirmed the real signature is unchanged by this CR:

```ts
function spawnStep(
    executable: string,
    args: string[],
    outputChannel: vscode.LogOutputChannel,
    stepType: HeartbeatStep['type']
): Promise<ExecResult>
```

vs. the SPEC pseudocode's `(..., configDir: string)`. Confirmed via grep that
both call sites (`python`, `powershell`) pass `stepType` literal strings
(`'python'`/`'powershell'`), and `stepType` is used in the `success: false`
branches to populate `error.stepType` — required for step-type-aware error
reporting elsewhere in the codebase. Additionally, the real `spawnStep` never
sets `cwd` on the spawned process at all (`cp.spawn(executable, args, { shell: false })`) —
`configDir` isn't needed as a `spawn()` option because `resolveScriptPath()`
already resolves the script path to an absolute path before calling
`spawnStep`, so a `configDir` parameter would be redundant.

**Recommendation:** `SPEC_AUT_STEP_OUTPUT_VARS`'s pseudocode should be corrected
to show the real signature (`..., outputChannel, stepType`) instead of the
invented `configDir` variant — this is a pre-existing pseudocode simplification
error, not a contract the implementation should have followed. No code change
needed; a one-line spec correction is recommended.

## 4. `interpolateStep()` isolation from `applyTemplate()`

**Verdict: PASS.** Grep-confirmed zero references to `applyTemplate` anywhere
in `packages/core/src/apps/session/heartbeat.ts`. `applyTemplate` remains
exclusively in `extension.ts` (used for actor-init prompts and notification
stubs, an unrelated concern). The two interpolation mechanisms are fully
separate as required.

## 5. Queue/command steps — outputVar no-op

**Verdict: PASS**, verified at code level (not exercised by a dedicated unit
test — see §7). `executeQueueStep` and the inline `command` branch in
`runStep()` both return `{ success: true }` with no `output` field. In
`executeJob`, the capture guard is `if (result.output && interpolated.outputVar)`
— since `result.output` is `undefined` for queue/command steps, no variable
is ever set, and no warning/error is raised. Silent no-op confirmed correct.

## 6. T-19..T-25 UAT linkage

**Verdict: PASS — clean, non-overlapping.** Each scenario targets a distinct
AC with no redundancy:

| Scenario | Concern |
|---|---|
| T-19 | Basic chaining: script step `outputVar` → later step interpolation |
| T-20 | Agent step `outputVar` capture (the one path *not* covered by the unit test suite — see §7) |
| T-21 | `LAST_STDERR` overwrite semantics across two script steps |
| T-22 | Undefined variable reference left literal |
| T-23 | Scope isolation — no cross-run persistence |
| T-24 | Info-level logging on capture |
| T-25 | `outputVar` on queue/command silently ignored |

## 7. `heartbeat-step-output-vars.test.ts` coverage vs claimed ACs

**Verdict: PASS with one real gap.** Commit message claims coverage of
"AC-2/5/6/7/8" (SPEC numbering). Verified each of the 4 tests:

| Test | SPEC ACs actually exercised |
|---|---|
| `AC-2/AC-6`: script stdout captured + interpolated into later step | AC-2 (spawnStep output), AC-4 (vars map + info log), AC-6 (interpolation) — but **only exercises the `run` field**, not the other 5 interpolation targets (`text`, `prompt`, `outputFile`, `destination`, `sender`) named in AC-6/REQ AC-2 |
| `AC-5`: LAST_STDERR overwritten every script step | AC-5 ✅ |
| `AC-8`: invalid outputVar name stripped + warned | AC-8 ✅ |
| `AC-7`: undefined token left as-is | AC-7 ✅ |

**Gap identified:** no test exercises **SPEC AC-3** (`executeAgentStep`
returns response text in `output`) or an `agent`-type step's `outputVar`
capture path at all — the only place this is verified is manually, via UAT
T-20. Given `agent` steps are one of only two capture-eligible step families
(REQ AC-1), and T-20 is a manual/UAT-only check, this is a legitimate,
non-trivial unit-test coverage gap, not merely a nuance. Recommend Test/Dev
Engineer add a 5th unit test mocking an agent step to close this gap before
the CR is considered fully covered at the automated level.

Also note: the claimed AC set ("AC-2/5/6/7/8") omits AC-1 (structural,
reasonable to omit), AC-3 (agent output — the actual gap above), and AC-4
(vars map + logging — implicitly exercised by test 1 but not explicitly
named in the claim). Not a discrepancy, just worth flagging for precision in
future commit messages.

## 8. Quality gates (this branch)

| Gate | Result |
|---|---|
| `npx tsc -p packages/core --noEmit` | 0 errors |
| `npm test` (full vitest suite) | 270/270 passing (27 test files) — matches claim exactly |
| `npm run lint` | 163 problems (0 errors, 163 warnings) — matches claim exactly |
| `python -m sphinx -b html docs docs/_build/html -W --keep-going` | build succeeded, 0 warnings |

## Findings Summary

| # | Item | Verdict |
|---|---|---|
| 1 | REQ/SPEC MECE | ✅ PASS |
| 2 | Implementation vs spec (incl. LAST_STDERR logging extension) | ✅ PASS — logging extension is legitimate per REQ AC-6's general wording; recommend SPEC amendment for completeness (non-blocking) |
| 3 | `spawnStep` signature deviation | ✅ Non-issue — recommend correcting SPEC pseudocode, not code |
| 4 | `interpolateStep()` vs `applyTemplate()` isolation | ✅ PASS |
| 5 | Queue/command `outputVar` no-op | ✅ PASS (code-verified) |
| 6 | T-19..T-25 linkage | ✅ PASS |
| 7 | Unit test coverage vs claimed ACs | ⚠️ PASS with a real gap — no unit test for agent-step `output` capture (SPEC AC-3); UAT-only (T-20) |
| 8 | Quality gates | ✅ PASS (tsc, 270/270 tests, lint 163/163 matches claim, sphinx clean) |

**Overall verdict: PASS**, with two non-blocking documentation follow-ups
(§2 SPEC logging amendment, §3 SPEC pseudocode signature correction) and one
recommended (non-blocking) test-coverage addition (§7, agent-step unit test)
before this CR is considered complete at the unit-test level.

---

## Round 2 (narrow re-check)

**Scope:** verify the 3 fixes addressing Round 1's non-blocking findings only.

1. **Agent-step `outputVar` unit test (`f4a1ad9`)** — ✅ **PASS**. New test
   `AC-3: agent step response captured into outputVar and interpolated into a
   later step + prompt path templated` genuinely exercises the previously-gapped
   path: mocks `vscode.lm.selectChatModels`/`sendRequest`, verifies the agent
   response text (`'agent-result'`) is captured into `AGENT_OUT` and
   interpolated into a subsequent step's `run` field, and additionally verifies
   `prompt` field interpolation (`prompt-${METRICS}.md` → `prompt-42.md` via
   `fs.readFileSync` call argument) — closing both the SPEC AC-3 gap and the
   "only `run` field tested" nuance noted in Round 1 §7 for the `prompt` field
   specifically. `oc.info` assertion confirms the capture log fires. Closes
   the Round 1 gap.

2. **`SPEC_AUT_EXECUTOR`/`SPEC_AUT_STEP_OUTPUT_VARS` pseudocode fix (`381e4b2`)** — ✅ **PASS**.
   Diff confirmed: `executeJob` pseudocode now includes the
   `outputChannel.info('[Heartbeat] var LAST_STDERR set by ${step.type} step')`
   call matching real code; `spawnStep` pseudocode signature corrected to
   `(executable, args, outputChannel, stepType)`, `configDir`/`cwd` removed,
   `stepType: step.type` → `stepType` (matching the real parameter, not a
   step-object property access). As a side effect this also silently fixed
   another minor pre-existing inconsistency not previously flagged: the old
   pseudocode's `output: stdout.trimEnd()` on the success path is now
   `output: stdout` — matching the real implementation's `stdoutFull` (untrimmed).
   Both pseudocode blocks now match the real `heartbeat.ts` exactly.

3. **T-24 wording fix (`ec6119d`)** — ✅ **PASS**. Both `us_uat_heartbeat.rst`
   and `spec_uat_heartbeat.rst` corrected from "step name or index" to "step
   type (e.g. `"set by powershell step"`)", matching the real log message
   format (`` `[Heartbeat] var ${var} set by ${interpolated.type} step` ``).
   Commit message's note that `REQ_AUT_STEP_OUTPUT_VARS` AC-6 is unaffected is
   correct — that AC only requires "logged... at info level", no claim about
   name/index/type wording.

**Quality gates re-run on current HEAD (`ec6119d`):**

| Gate | Result |
|---|---|
| `npx tsc -p packages/core --noEmit` | 0 errors |
| `npm test` | 271/271 passing (27 test files) — matches claim |
| `npm run lint` | 168 problems (0 errors, 168 warnings) — matches claim |
| `python -m sphinx -b html docs docs/_build/html -W --keep-going` | build succeeded, 0 warnings |

**Round 2 verdict: PASS.** All 3 Round 1 non-blocking findings are correctly
and completely addressed. No new issues introduced. No outstanding items
remain for this CR.
