# MECE Findings: dev-launchconfig-syspilot — Combined Rounds 5+6 (Final)

**Date:** 2026-07-21
**Scope:** L1 (REQ_SPL_NOTIFY) + L2 (SPEC_SPL_NOTIFY, SPEC_SPL_STARTUP, SPEC_SPL_MANUAL) + UAT tiers (T-3, T-5, T-8, T-23)
**Commits reviewed:** 2c0296a, 53cfcde, 35b2ac1 (Round 5), 24e7688, d19fd41, cadfb23 (Round 6)
**Status:** PARTIAL — one low-severity requirements-level contradiction remains

This report supersedes the original Round 5-only report. The prior finding
(G-1: `notifyActor`/`resolveMessagesPath` signature and workspace-root
ambiguity) is now **CLOSED** — System Designer's 24e7688 resolved it. One new
low-severity finding (G-2) was found at the requirements level during the
Round 6 wording change.

## 1. Message Template: Character-for-Character Verification

| Source | Text |
|---|---|
| `UPDATE_NOTIFICATION_TEXT` (versionCheck.ts) | `Please ask the user whether they want to install this update now, skip this version by calling jarvis.SyspilotSkipThisVersion(), or postpone it for N days via jarvis.delaySyspilotUpdate(N).` |
| `SPEC_SPL_NOTIFY` message template | `Please ask the user whether they want to install this update now, skip this version by calling jarvis.SyspilotSkipThisVersion(), or postpone it for N days via jarvis.delaySyspilotUpdate(N).` |
| `SPEC_SPL_NOTIFY` pseudocode `text` literal | Same string, split across three template-literal lines — identical concatenated result. |
| Regression test (`syspilot-versioncheck.test.ts:106-108`) | Asserts `toBe()` on the identical string. |

**Result:** ✅ Exact match, including "they" and all three tool names
(`jarvis.SyspilotSkipThisVersion()`, `jarvis.delaySyspilotUpdate(N)`), across
implementation, spec, and regression test.

## 2. Stale Wording Sweep

Searched the entire `docs/` tree for `"no install option"`, `"skip/delay
only"`, and `"run.*workflow"` patterns.

**Result:** ✅ Zero matches anywhere in the active REQ/SPEC/UAT surface.
`SPEC_UAT_SPL`, `REQ_UAT_SPL_TESTS`, and `US_UAT_SPL` all consistently use
"three choices: install now / skip / postpone" language in T-3, T-5, and T-8.

**Exception found (see G-2 below):** `REQ_SPL_NOTIFY` AC-1 retains "two
opt-out options: delay ... or skip" — not a "run workflow" or "no install"
phrase, but a **contradiction** with sibling AC-2's "three choices" framing.

## 3. Pseudocode Signature Verification (Round 5 G-1 — CLOSED)

| Site | Declaration/Call | Match |
|---|---|---|
| `SPEC_SPL_NOTIFY` pseudocode | `notifyActor(api: JarvisCoreApi, workspaceRoot: string, log: vscode.LogOutputChannel)` | ✅ matches `versionCheck.ts:80` |
| `SPEC_SPL_NOTIFY` call site | `addAutoDelivery(resolveMessagesPath(workspaceRoot), 'Syspilot Setup Engineer')` | ✅ matches `versionCheck.ts:89` |
| `SPEC_SPL_STARTUP` pseudocode | `await notifyActor(api, workspaceRoot, log);` | ✅ matches `versionCheck.ts:182` |
| `SPEC_SPL_MANUAL` (referenced, same call) | `await notifyActor(api, workspaceRoot, log);` | ✅ matches `versionCheck.ts:230` |

**Result:** ✅ Round 5 finding G-1 is fully resolved. All declaration and
call sites for `notifyActor` and `resolveMessagesPath` now carry
`workspaceRoot` consistently in spec and code.

## 4. Round 5 Auto-Delivery Registration + T-23 Compatibility

- `SPEC_SPL_NOTIFY` AC-4 unchanged in substance: `addAutoDelivery(...)`
  called after queuing, idempotent, same reminders-feature pattern.
- `SPEC_UAT_SPL` T-23 unchanged: still verifies `autodelivery.json` contains
  `"Syspilot Setup Engineer"` with no manual action, scenario count still
  "T-1 through T-23".
- Regression test `registers the actor for auto-delivery ... idempotently`
  still present and passing.

**Result:** ✅ Fully intact and compatible with the Round 6 wording change —
auto-delivery registration is independent of message text content.

## 5. New Finding: G-2 (Requirements-Level Contradiction)

**Severity:** Low
**Level:** L1 requirements
**Location:** `REQ_SPL_NOTIFY` AC-1

```
* AC-1: The message text SHALL instruct the actor to ask the user whether
  they want to install this update now, and offer two opt-out options:
  delay notifications for N days, or skip this version permanently.
```

versus the same requirement's AC-2:

```
* AC-2: ... Three choices are presented to the user: install now, skip
  this version, or postpone for N days.
```

**Problem:** AC-1 frames the interaction as "ask about install" + "two
opt-out options" (using "delay"), while AC-2 explicitly says "three
choices" (using "postpone"). This is not a functional defect — the SPEC,
code, and UAT all agree on the three-choice model with "postpone" — but
the REQ-level AC-1 was not updated in the Round 6 wording pass and now
reads inconsistently against its own AC-2, and against the terminology
used everywhere else ("postpone" vs "delay").

**Recommendation:** Amend REQ_SPL_NOTIFY AC-1 to read consistently with
AC-2, e.g.:

```
* AC-1: The message text SHALL instruct the actor to ask the user to
  choose one of three options: install this update now, skip this
  version permanently, or postpone notifications for N days.
```

This is a documentation-only correction; no spec, code, or test change is
required beyond this wording.

## 6. Quality Gates

| Gate | Result |
|---|---|
| Focused regression (`syspilot-versioncheck.test.ts`) | ✅ 18/18 passing |
| Full suite (`npm test`) | ✅ 266/266 passing, 26 files |
| TypeScript (`packages/core`, `packages/syspilot`) | ✅ 0 errors |
| Sphinx build | ✅ 0 warnings |

## Conclusion

Rounds 5 and 6 are functionally complete and internally consistent across
SPEC, code, and UAT. The single remaining issue (G-2) is a low-severity,
requirements-level wording inconsistency within `REQ_SPL_NOTIFY` itself —
not a spec/code/test mismatch. Recommend a one-line REQ_SPL_NOTIFY AC-1
correction, then this change is fully clear for merge.

**Overall verdict:** PARTIAL (documentation-only fix outstanding); no
code, spec, or test changes required.

## Historical Note (Original Round 5 Report)

The original Round 5-only report recommended running the focused syspilot
regression suite and Sphinx build after G-1 was addressed, then re-running
the L2 MECE review. That has now been done as part of this combined report;
G-1 is closed (see Section 3).