# Change Document: hook-log-level-reduction

**Status**: in-progress
**Branch**: feature/hook-log-level-reduction
**Created**: 2026-07-02
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Reduce the verbosity of hook event logging at the default "info" log level. Currently `logHookEvent()` (SPEC_HOOK_LOG) always logs the event name plus the full JSON payload at `log.info()` — e.g. `[Hook] PreToolUse — {"timestamp":"2026-07-...`. This is too noisy for the default-visible log level during normal use. Target: at `info` level, log only the module tag + event name (`[Hook] PreToolUse`); the full payload (event name + complete JSON) moves to `log.trace()`, only visible when trace logging is explicitly enabled. No functional/behavioral change — pure log-level/verbosity split, same sink (SPEC_DEV_LOGCHANNEL "Jarvis" output channel), no new channel.


---

## Pre-Investigation Notes (PM, for whoever picks this up)

- Current implementation: `packages/core/src/engine/hooks/hookEngine.ts` (or wherever `logHookEvent()` lives per `SPEC_HOOK_LOG`) — single `log.info()` call:

  ```typescript
  function logHookEvent(log: vscode.LogOutputChannel, e: HookEvent): void {
      const sid = e.sessionId ? ` session=${e.sessionId}` : '';
      log.info(`[Hook] ${e.eventName}${sid} — ${JSON.stringify(e.payload)}`);
  }
  ```

- Relevant existing elements: `REQ_HOOK_LOG` (status: draft, priority: optional, links: `US_HOOK_OBSERVE`, `REQ_DEV_LOGGING`), `SPEC_HOOK_LOG` (status: implemented, links: `REQ_HOOK_LOG`, `SPEC_DEV_LOGCHANNEL`). `REQ_HOOK_LOG` AC-2/SPEC_HOOK_LOG AC-2 currently mandate that the full payload is included in the log entry — this AC needs to be corrected to scope "full payload" to trace level only, with `info` level scoped to event name only.
- Note `REQ_HOOK_LOG` is still `status: draft` despite `SPEC_HOOK_LOG` being `status: implemented` — worth flagging to System Designer as a possible pre-existing status inconsistency to fix in passing (not necessarily in scope, PM's call once CM picks this up).
- Target behavior:
  - `log.trace(...)`: unchanged today's format — `[Hook] <eventName>[ session=<id>] — <full JSON payload>`
  - `log.info(...)`: new, reduced — `[Hook] <eventName>` only (no payload, no session id — TBD whether session id stays at info level, System Designer's call)
- Likely a single small code change (split one `log.info()` call into a `log.trace()` + `log.info()` pair) plus REQ/SPEC AC updates — should be a quick, low-risk CR similar in size to `pim-treenode-filenode-fix`.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_HOOK_OBSERVE | (existing) | unchanged | Parent US for REQ_HOOK_LOG; confirmed no US-level change needed — verbosity is a REQ/SPEC-level concern only |

### New User Stories

None.

### Decisions

- Confirmed no new/modified US needed — this is a pure log-level/verbosity split with no change to the observable capability US_HOOK_OBSERVE describes (hook events are still fully observable, just at a different log level for the full payload).

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed — confirmed no US change required

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_HOOK_LOG | US_HOOK_OBSERVE | modified | AC-2 split into info (event name + session id only) / trace (full payload, unchanged format) verbosity levels; AC-5 extended to cover both levels; status inconsistency fixed (draft → implemented, matching SPEC_HOOK_LOG's already-``implemented`` status) |

### New Requirements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1 (session id placement, PM's open question): session id stays at ``info`` level alongside the event name. Rationale: it's a compact, single short string, not the verbose full-JSON payload that motivated this CR — keeping it at `info` preserves quick per-session triage from the default-visible log without reintroducing the noise this CR sets out to reduce.
- Decision 2: `REQ_HOOK_LOG` status corrected from `draft` to `implemented`, per PM's flagged pre-existing inconsistency (matches `SPEC_HOOK_LOG`, which was already `implemented`) — fixed in passing while already touching this REQ, not treated as a separate CR.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] N/A — no new REQs

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_HOOK_LOG | REQ_HOOK_LOG | modified | the sink's single `log.info()` call split into `this.logger.trace()` (full payload, unchanged format) + `this.logger.info()` (event name + session id only) |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- Decision 1: independently verified PM's pre-investigation against the actual code (`packages/core/src/engine/hooks/hookEngine.ts`) — found a minor discrepancy: the sink is `HookEngine`'s private `_sink(event)` method, not a standalone `logHookEvent()` function as PM's notes and the pre-existing SPEC code sample described. Corrected the SPEC's code sample and added a note documenting this correction, so Dev Engineer implements against an accurate spec.
- Decision 2: no new method/function introduced — the existing `_sink()` method gains one additional `this.logger.trace()` call; this is a pure split of one log statement into two, no control-flow or signature change.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] N/A — no new SPECs

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_HOOK_OBSERVE (unchanged) | REQ_HOOK_LOG | SPEC_HOOK_LOG | ✅ |

Build verification: `sphinx-build -b html . _build/html -W --keep-going` — 0 warnings, 0 errors.

### Artefakt-Removal-Check

Not applicable — no artefact removed, only a log-level/verbosity split (one log statement becomes two, at different levels).

### Issues Found

None.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation (Dev Engineer: split `_sink()`'s single `log.info()` call into `this.logger.trace()` + `this.logger.info()`, per the corrected `SPEC_HOOK_LOG`)

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-02

#### Findings

None. Independent QM review (not reusing CM-pipeline MECE/Trace results) covered:

- Code: read `HookEngine._sink()` directly in `packages/core/src/engine/hooks/hookEngine.ts` (~line 65) — confirmed exact split: `this.logger.trace(...)` (unchanged full-payload format) + `this.logger.info(...)` (event name + session id only, no payload). Matches `SPEC_HOOK_LOG`'s code sample line-for-line.
- Full package-suite build (core+pim+recorder+mcp) — re-run independently, clean.
- Full test suite — re-run independently, 190/190 pass. New test file (`hook-log-level-reduction.test.ts`) reviewed directly — genuine behavioral unit tests against a mocked logger (not static source-content assertions), correctly asserting: exactly one `trace` call (full payload) + one `info` call (name+session only, no payload leak, explicitly checked for a "secret" field not appearing in the info call), no-sessionId case, and dispatch/handler behavior unaffected by the sink split (AC-5).
- Traceability: re-verified via `get_need_links.py --direction both` on `REQ_HOOK_LOG`/`SPEC_HOOK_LOG` — both resolve correctly, status now consistently `implemented` on both (fixed pre-existing inconsistency).
- Spec-vs-code fidelity: independently confirmed `SPEC_HOOK_LOG`'s corrected code sample (private `_sink()` method, not the previously-described standalone `logHookEvent()` function) matches the actual implementation exactly.
- Full `sphinx-build -W --keep-going` — re-run independently, 0 warnings.
- "Assume spec root cause" self-check: n/a — no code-level defect found in this CR; the pre-existing REQ/SPEC status inconsistency and the standalone-function-vs-method spec inaccuracy were both correctly caught and fixed proactively (by PM and System Designer respectively) before implementation, consistent with the standing principle of fixing spec issues before they cause a code-level symptom.

No functional, traceability, or documentation-currency defects found. Small, clean, well-scoped CR.

#### PM Decisions

None needed — no findings this round.

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
