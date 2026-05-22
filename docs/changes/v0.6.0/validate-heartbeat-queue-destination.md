# Change Document: validate-heartbeat-queue-destination

**Status:** in-progress
**Mode:** autonomous
**Branch:** `feature/validate-heartbeat-queue-destination`
**Source:** PM Change Request (2026-05-22)
**Change Manager:** Jarvis CM session
**Base commit (develop):** `1a887e0`

---

## CR Intent (from PM)

Heartbeat jobs may contain `queue` steps that send messages to named chat
sessions. Today, a `queue` step with a non-existent destination runs
through without visible error — the message silently disappears. This
makes heartbeat automation unreliable: typos or renamed sessions go
undetected.

`validate-session-destination` (already on `develop`) validates at runtime
inside `jarvis_sendToSession`. For heartbeats we want validation **earlier**
— at job registration / load time, not at fire time — so misconfigurations
surface immediately, not at 3 AM.

### User-visible Acceptance Criteria

1. Loading `heartbeat.yaml` validates every `queue` step's `destination`
   against the list of known named sessions.
2. Invalid destinations raise a **visible warning** (notification + log
   entry) containing job name, step index, and invalid destination value.
3. Job MUST NOT fire the invalid step — either the step is skipped or the
   whole job is paused (designer decides UX in design step).
4. `jarvis_registerJob` tool: invalid destination → tool returns an error,
   job is NOT persisted.
5. Valid destinations → no behavior change (no regression for existing
   jobs).
6. Manual-session detection (sessions without a `state.vscdb` entry) uses
   the same resolver as `validate-session-destination`.

### Out of Scope

- Auto-correction / fuzzy-matching destinations
- Validation of non-`queue` step types (python, powershell, command, agent)
- UI editor for `heartbeat.yaml`

### PM Sequential Rule

Next CR is `spec-timing-cleanup`. PM waits for merge of this one first.

---

## Intent Gate

CR is intent-only. One UX decision deferred to designer (AC-3: skip step
vs. pause job). PM hints align with `validate-session-destination`
resolver pattern. Mode autonomous. Proceed.

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/validate-heartbeat-queue-destination` from `develop@1a887e0` |
| 1a. Change Document | done | CM | this file |
| 2. Impact + Design | done | syspilot.design | commits `4ab42b7`+`07c2fea`; 1 US + 5 REQ + 4 SPEC added; D-1 = Option C (skip step, continue job) |
| 3. UAT artifacts | done | syspilot.uat | commits `9adf602`+`47e4840`; T-1..T-10 covering all 6 ACs; 4 observability advisories (minor) |
| 4. Implementation | done | syspilot.implement | commit `52327a1`; `src/heartbeat.ts` + `src/extension.ts`; compile clean; no new lint violations; no SPEC deviations; one note for MECE/Docu: verify REQ wording matches SPEC error format (`Destination session "${dest}" does not exist. / Valid destinations: ...`) |
| 5. MECE final | done | syspilot.mece | PASS-WITH-ADVISORIES (3 advisories for Docu: A-1 SPEC_AUT_QUEUEEXEC back-link, A-2 NOREGRESSION traceability, A-3 informational pre-existing orphans) |
| 6. Documentation | done | syspilot.docu | commit `a1e890c`; 10/10 status → implemented; A-1 + A-2 applied; A-3 intentionally skipped (out of scope); copilot-instructions synced; sphinx clean |
| 7. Notify | pending | CM | PM + QM via Jarvis |
| 8. Merge approval | pending | PM | fix/defer/accept |
| 9. Squash-merge | pending | CM | feature → develop |
| 10. Post-merge | pending | CM | commit hash + branch name to PM |

---

## Decisions

| # | Topic | Decision |
|---|-------|----------|
| D-1 | UX on invalid destination at load time | **Skip step, continue job (Option C — hybrid)**: load-time warning is informational (notification + log.warn, job not paused); at fire time the invalid queue step is skipped (soft skip: `{success:true}` returned, `log.warn` emitted), remaining steps continue. |
| D-2 | Resolver reuse | Reuse existing session-destination resolver from `validate-session-destination` (same function/module — no parallel resolver) |
| D-3 | Validation trigger points | (a) heartbeat.yaml load, (b) `jarvis_registerJob` tool — both paths must validate |

---

## Engineer Reports

### syspilot.design (2026-05-22)

**Commit:** `4ab42b7`

**New node IDs:**

| Level | ID |
|-------|----|
| US | `US_AUT_HEARTBEAT_VALIDATION` |
| REQ | `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` |
| REQ | `REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` |
| REQ | `REQ_AUT_REGISTERJOB_VALIDATION` |
| REQ | `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` |
| REQ | `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` |
| SPEC | `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` |
| SPEC | `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` |
| SPEC | `SPEC_AUT_REGISTERJOB_VALIDATION` |
| SPEC | `SPEC_AUT_HEARTBEAT_RESOLVER_REUSE` |

**Impact-analysis touched IDs (read-only — no content changes):**

| Layer | ID | Reason |
|-------|----|--------|
| US | `US_AUT_HEARTBEAT` | Parent US; new US links to it |
| REQ | `REQ_AUT_JOBCONFIG` | AC-5 documents `destination` field (linked from new REQ) |
| REQ | `REQ_AUT_JOBREG` | `registerJob` API extended by new validation REQ |
| REQ | `REQ_AUT_JOBEXEC` | Step execution linked from invalid-step-behavior REQ |
| REQ | `REQ_MSG_DEST_ERROR` | Error-format contract reused verbatim (no change) |
| REQ | `REQ_MSG_SESSIONLOOKUP` | Resolver origin (linked from RESOLVER_REUSE REQ) |
| REQ | `REQ_MSG_SESSIONFILTER` | Filter function (linked from RESOLVER_REUSE REQ) |
| SPEC | `SPEC_AUT_QUEUEEXEC` | `executeQueueStep` pseudocode superseded by INVALID_STEP_BEHAVIOR SPEC |
| SPEC | `SPEC_AUT_JOBREG` | `registerJob` implementation referenced by REGISTERJOB_VALIDATION |
| SPEC | `SPEC_MSG_SENDTOSESSION` | Resolver reuse anchor; error-format template source |
| SPEC | `SPEC_MSG_SESSIONLOOKUP` | Linked from RESOLVER_REUSE SPEC |

**D-1 UX Decision: skip step, continue job (Option C — hybrid)**

Load-time: `validateLoadedJobs()` called fire-and-forget from `reload()`; emits `showWarningMessage` + `log.warn` per invalid step; job is NOT paused or removed. Fire-time: `executeQueueStep` re-validates destination; if still invalid, returns `{ success: true }` (soft skip) and logs a warning — subsequent steps in the job continue. Rationale: pausing the whole job (Option B) would collateral-damage unrelated steps in multi-step jobs. Background automation favours maximising useful work; the load-time notification provides the earliest user feedback; fire-time skip is a safety net consistent with the fail-soft character of the existing executor.

**Files modified:**

- `docs/userstories/us_aut.rst` (+35 lines — US_AUT_HEARTBEAT_VALIDATION)
- `docs/requirements/req_aut.rst` (+100 lines — 5 new REQs)
- `docs/design/spec_aut.rst` (+228 lines — 4 new SPECs)

**Sphinx last line:** `build succeeded.`

---

### syspilot.uat (2026-05-22)

**Commit:** `9adf602`

**T-ID count:** 10 test cases (T-1 … T-10)

**Coverage matrix:**

| REQ ID | T-IDs |
|--------|-------|
| `REQ_AUT_HEARTBEAT_LOAD_VALIDATION` AC-1,2,3 | T-1, T-2, T-3, T-4, T-10 |
| `REQ_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` AC-1,2,3 | T-5, T-10 |
| `REQ_AUT_REGISTERJOB_VALIDATION` AC-1,2,3 | T-7, T-8 |
| `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` AC-1,2,3 | T-1, T-8, T-9 |
| `REQ_AUT_HEARTBEAT_RESOLVER_REUSE` AC-1,2,3 | T-6 |

All 6 acceptance criteria from the CR are covered:
- AC-1 (load-time validation) → T-1, T-2, T-3, T-4
- AC-2 (visible warning with job/step/destination) → T-2, T-3, T-4
- AC-3 (invalid step skipped at fire time) → T-5
- AC-4 (registerJob rejects invalid destination) → T-7
- AC-5 (valid destinations — no regression) → T-1, T-8, T-9
- AC-6 (resolver reuse for manual sessions) → T-6

**Advisories / observability limitations:**

1. **T-3 / T-4 — rapid notifications:** Multiple `showWarningMessage` calls may
   auto-dismiss before the tester can read them. The "Jarvis" Output channel is
   the reliable verification source and is the authoritative pass criterion.
2. **T-5 — ExecResult.success not directly visible:** Job success/failure is
   inferred from the absence of a failure notification + presence of valid message
   in `messages.json`. The internal `{ success: true }` return of the skip path
   cannot be confirmed via VS Code UI alone.
3. **T-9 — round-trip delay (REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION AC-3):**
   The "no additional delay for non-queue steps" requirement cannot be measured
   under manual test conditions. Absence of visible regression accepted as pass.
4. **T-10 — undefined behavior for empty destination:** The SPEC pseudocode uses
   a truthy guard (`step.destination`) that silently bypasses validation for empty
   strings. Downstream behavior (what `appendMessage` does with `destination=""`)
   is implementation-defined. Tester should observe and report without pass/fail
   judgment — this is an advisory, not a failure criterion.

**Files created:**

- `docs/changes/tst-validate-heartbeat-queue-destination.md` (566 lines, 10 test cases)

**Sphinx last line:** `build succeeded.`

### syspilot.mece (MECE Final Check) — 2026-05-22

**Verdict:** PASS-WITH-ADVISORIES
**Commit reviewed:** `52327a1` (implementation)

**Scope:** AUT-theme cross-level consistency (US/REQ/SPEC/UAT/impl) + MSG cross-theme touch.

| Check | Result |
|-------|--------|
| Error format alignment (REQ_MSG_DEST_ERROR ↔ SPEC_AUT_REGISTERJOB_VALIDATION ↔ impl) | PASS |
| Resolver reuse (`getAllSessions` + `filterNamedSessions` shared between heartbeat.ts + extension.ts) | PASS |
| SPEC_AUT_QUEUEEXEC cross-reference to SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR | Advisory A-1 |
| Step index 0-based consistency (SPEC pseudocode / T-3 / impl) | PASS |
| Backward compatibility (REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION) | PASS |
| Orphan IDs REQ_AUT_JOBREG_TOOLS / SPEC_AUT_JOBREG_TOOLS | Informational |

**Standard MECE:**
- Mutually Exclusive: PASS — `SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR` is a clean delta-spec of `SPEC_AUT_QUEUEEXEC` (linked, not duplicated)
- Collectively Exhaustive: PASS-WITH-ADVISORIES — REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION has no SPEC back-link (A-2)
- Contradictions: none

**Advisories for Docu step:**

| # | Affected | Action |
|---|----------|--------|
| A-1 | `SPEC_AUT_QUEUEEXEC` | Add `:links: SPEC_AUT_HEARTBEAT_INVALID_STEP_BEHAVIOR`; add `superseded by` prose note |
| A-2 | `REQ_AUT_HEARTBEAT_VALIDATION_NOREGRESSION` | Add this REQ to `:links:` of `SPEC_AUT_HEARTBEAT_LOAD_VALIDATION` to close traceability gap |
| A-3 | `extension.ts` code comments | Orphan IDs `SPEC_AUT_JOBREG_TOOLS`/`REQ_AUT_JOBREG_TOOLS` — pre-existing v0.3.1 issue, track separately, OUT OF SCOPE |

**Sphinx last line:** `build succeeded.`

