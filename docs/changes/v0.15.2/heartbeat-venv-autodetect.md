# Change Document: heartbeat-venv-autodetect

**Status**: design-complete
**Branch**: feature/heartbeat-venv-autodetect
**Created**: 2026-07-02
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fixes GitHub Issue #20. The heartbeat Python step executor (`runStep()` in `packages/core/src/apps/session/heartbeat.ts`) falls back to the bare `python` on PATH whenever `python.defaultInterpreterPath` is unset. On typical setups the system interpreter lacks the project's dependencies (`openai`, `keyring`, `mcp`, `yaml`, etc.), so every Python heartbeat job fails silently with only a terse `job "<name>" failed — python exit N` notification — the real `ModuleNotFoundError` is only visible in debug-level output channel logs.

Fix: before falling back to bare `python`, auto-detect a workspace virtual environment. Resolution order: (1) `python.defaultInterpreterPath` if set (highest priority, unchanged), (2) auto-detected venv relative to the workspace root — check `.venv/Scripts/python.exe` / `.venv/bin/python`, then `venv/Scripts/python.exe` / `venv/bin/python`, (3) bare `python` on PATH (last-resort fallback, unchanged). Secondary/nice-to-have: on non-zero exit, surface the last few lines of captured stderr in the failure notification instead of just the exit code, so the root cause (e.g. `ModuleNotFoundError`) is visible without opening the debug-level output channel.

Small, scoped, code + spec.

---

## Level 0: User Stories

**Status**: ✅ complete — no impact

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_AUT_HEARTBEAT | Scheduled and Manual Automation Jobs | none | AC-2 ("Jobs can execute Python scripts...") and AC-7 (failure notification) already cover this at story granularity; interpreter-resolution order and stderr-tail detail are implementation-level, not user-facing story changes. |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| _none_ | | |

### Decisions

- No new/changed User Story needed. This is a reliability fix to an existing capability ("Jobs can execute Python scripts"), not a new user-facing capability.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed (none found)

---

## Level 1: Requirements

**Status**: ✅ complete

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_AUT_JOBEXEC | US_AUT_HEARTBEAT | amended | AC-1 rewritten: 3-tier interpreter resolution order (`python.defaultInterpreterPath` → auto-detected `.venv`/`venv` → bare `python`). |
| REQ_AUT_OUTPUT | US_AUT_HEARTBEAT | amended | New AC-5: failure notification SHALL include last up-to-3 lines of captured stderr when available. |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| _none_ | | | |

### Conflicts Detected

- None.

### Decisions

- Included the secondary/nice-to-have (stderr tail in notification) in scope, per CM's "your call" — low risk, directly addresses the silent-failure symptom in Issue #20, and reuses the existing `ExecResult.error` string field (no interface change).
- Stderr tail capped at 3 lines to keep the toast notification readable; full stream remains available at debug level in the Output Channel (unchanged).

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (no new REQs; both amended REQs already link to US_AUT_HEARTBEAT)

---

## Level 2: Design

**Status**: ✅ complete

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_AUT_EXECUTOR | REQ_AUT_JOBEXEC | amended | `python` step dispatch now calls new `resolvePythonInterpreter()` helper; full 3-tier resolution algorithm specified (code sample added). |
| SPEC_AUT_OUTPUTCHANNEL | REQ_AUT_OUTPUT | amended | `spawnStep()` gains a bounded (3-line) stderr ring buffer folded into `ExecResult.error` on non-zero exit; `notifyFailure()` itself unchanged (already surfaces `result.error`). |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| _none_ | | |

### Conflicts Detected

- None.

### Decisions

- No caching of the resolved interpreter path — re-resolved on every `python` step invocation (cheap `fs.existsSync` stats), so a venv created/removed between heartbeat ticks or after a workspace reload is picked up without requiring an extension restart.
- Stderr tail folded into the existing `ExecResult.error` string (no new interface field) to avoid touching the `agent`/`command`/`queue` `ExecResult` producers, which are out of scope for this CR.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements (no new SPECs; both amended SPECs already link to their REQs)

---

## Final Consistency Check

**Status**: ✅ complete

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_AUT_HEARTBEAT | REQ_AUT_JOBEXEC | SPEC_AUT_EXECUTOR | ✅ |
| US_AUT_HEARTBEAT | REQ_AUT_OUTPUT | SPEC_AUT_OUTPUTCHANNEL | ✅ |

`get_need_links.py --direction out` spot-checked on both amended REQs post-edit — link sets unchanged, no dangling references. Sphinx rebuild (`-W --keep-going`): 0 warnings.

### Artefakt-Removal-Check

_Not applicable — no artefact removed, purely an interpreter-resolution improvement._

### Issues Found

- None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (none found)
- [x] Traceability verified
- [x] Ready for implementation

---

### UAT Update (Test Designer, 2026-07-02)

Extended the existing `US_UAT_HEARTBEAT` → `REQ_UAT_HEARTBEAT_TESTDATA` →
`SPEC_UAT_HEARTBEAT_FILES` chain (no new UAT chain needed — both amended REQs
already had UAT coverage stubs):

- **AC-1 (interpreter resolution, `REQ_AUT_JOBEXEC` AC-1):** New AC-6 + T-8
  (parts a/b/c) verifies all 3 tiers and their precedence — auto-detected
  `.venv` (tier 2) checked before `venv`, bare `python` (tier 3) used only when
  neither exists. T-3 narrowed to explicitly cover tier 1
  (`python.defaultInterpreterPath`) only, since T-8 now owns tiers 2/3.
- **AC-5 (stderr tail, `REQ_AUT_OUTPUT` AC-5):** New AC-7 + T-4 split into (a)
  no-stderr baseline (unchanged toast, regression check) and (b) new
  stderr-tail case — script emits >3 stderr lines, toast shows only the last 3
  (ring-buffer bound verified), full stream still in the Output Channel at
  debug level.
- Test data: added `scripts/fail-with-stderr.py`; reused existing
  `scripts/venv-check.py` for T-8; documented `.venv`/`venv` folders for T-8 as
  tester-created (not committed to `testdata/`, environment-specific).

Verification: `sphinx-build -W --keep-going -E` — 0 warnings.
`get_need_links.py --direction both` on `US_UAT_HEARTBEAT` — no dangling links.

### UAT Fix (Test Designer, 2026-07-03)

MECE finding: `testdata/heartbeat/scripts/fail-with-stderr.py` was documented
(commit a11f2d3) but not actually created, and no job wired it into
`testdata/heartbeat/heartbeat.yaml` — `REQ_UAT_HEARTBEAT_TESTDATA` AC-7 unmet.

Fix: created `testdata/heartbeat/scripts/fail-with-stderr.py` (prints 5 lines
to stderr, exits 1 — last 3 lines are the ones expected in the failure toast)
and added job `t4b-fail-with-stderr` (schedule `manual`, `python` step) to
`testdata/heartbeat/heartbeat.yaml`, matching the design spec's file list
(`SPEC_UAT_HEARTBEAT_FILES`).

Verification: `sphinx-build -W --keep-going -E` — 0 warnings (docs unchanged,
only test data added).

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-03

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | **No findings.** All specification levels (L0/L1/L2) are clean, consistent, and complete. Traceability verified end-to-end. Full package-suite build clean (212/212 tests pass, sphinx 0 warnings). MECE gap (missing test data artifact `fail-with-stderr.py` + heartbeat.yaml job) was identified and fixed by Test Designer *before* QM review — process working as intended. | — |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | N/A — no findings | — |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
