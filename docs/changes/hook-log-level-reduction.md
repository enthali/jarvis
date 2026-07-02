# Change Document: hook-log-level-reduction

**Status**: draft
**Branch**: feature/hook-log-level-reduction (not yet created)
**Created**: 2026-07-02
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Reduce the verbosity of hook event logging at the default "info" log level. Currently `logHookEvent()` (SPEC_HOOK_LOG) always logs the event name plus the full JSON payload at `log.info()` — e.g. `[Hook] PreToolUse — {"timestamp":"2026-07-...`. This is too noisy for the default-visible log level during normal use. Target: at `info` level, log only the module tag + event name (`[Hook] PreToolUse`); the full payload (event name + complete JSON) moves to `log.trace()`, only visible when trace logging is explicitly enabled. No functional/behavioral change — pure log-level/verbosity split, same sink (SPEC_DEV_LOGCHANNEL "Jarvis" output channel), no new channel.

**Not yet dispatched to CM** — this CD is a PM-side draft prepared while `entity-tree-context-menu` is in flight, so it's ready to send as soon as that CR clears. Not committed to git yet; branch not yet created.

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

**Status**: ⏳ not started

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_HOOK_OBSERVE | (existing) | unchanged | Parent US for REQ_HOOK_LOG; likely no US-level change needed — verbosity is a REQ/SPEC-level concern |

### New User Stories

_None expected._

### Decisions

-

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ⏳ not started

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_HOOK_LOG | US_HOOK_OBSERVE | modified | Split info/trace verbosity; AC-2 needs rewording |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|

### Conflicts Detected

-

### Decisions

-

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ⏳ not started

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_HOOK_LOG | REQ_HOOK_LOG | modified | logHookEvent() split into info (event name only) + trace (full payload) |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|

### Conflicts Detected

-

### Decisions

-

### Horizontal Check (MECE)

- [ ] No contradictions with existing Designs
- [ ] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ⏳ not started

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|

### Artefakt-Removal-Check

_Not applicable — no artefact removed, only log-level/format change._

### Issues Found

-

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

### Round 1

**Reviewed by:** QM
**Review date:** {DATE}

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
