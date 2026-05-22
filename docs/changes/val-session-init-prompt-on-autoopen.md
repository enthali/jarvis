# Verification Report: session-init-prompt-on-autoopen

**Change Document:** [session-init-prompt-on-autoopen.md](session-init-prompt-on-autoopen.md)
**Branch:** `feature/session-init-prompt-on-autoopen`
**Implementation commit:** `3d41d6a` (initial); scope extension: `6143eb2`; F-1+F-2: `43c9055` + `1d8f590`
**MECE final commit:** `0e6b6b0` (initial); MECE reload: PASS-WITH-ADVISORIES (3 LOW addressed in docu sync); MECE F-1+F-2: FAIL → fix-pass `1d8f590` + docu sync → pending re-verify
**Verdict:** PASS-WITH-ADVISORIES — pending MECE re-verify (F-1+F-2) and User-UAT round 2

---

## Summary

This CR fixes a v0.6.0 regression where agent-mode and init-prompt were not
reliably applied when sessions were opened via auto-delivery or tree-click.
A scope extension (AC-5, PM superseding direction 2026-05-22 20:35Z) also
fixes the agent discovery default-include policy: files without an explicit
`user-invocable` key are now included in the picker instead of silently
excluded.

**Root cause confirmed:** `workbench.action.openChat` (used by
`openNewChatEditor()`) creates a session in the user's currently-active mode.
The pre-fix sequence (create → rename → `chat.open { query, mode }`) silently
discarded the `mode` parameter because mode cannot be changed after session
creation via a `chat.open` call on an already-active session.

**Fix pattern adopted:** Mode-primed creation — caller executes
`workbench.action.chat.open { mode: entity.agent }` + 300 ms settle *before*
`openNewChatEditor()`. Three call sites patched: `openAgentSession`,
`sendMessages` (new-session branch), and `autoDeliver` poll (new-session
branch).

**Acceptance Criteria coverage:**

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Tree-click new session → correct agent-mode + init-prompt | ✓ covered |
| AC-2 | Tree-click existing session → no re-apply | ✓ covered |
| AC-3 | Auto-delivery to deleted/new session → correct agent-mode + init-prompt | ✓ covered |
| AC-4 | Both open paths produce identical agent-mode + init-prompt | ✓ covered |
| AC-5 | Agent picker shows files without explicit `user-invocable` key (default-include opt-out) | ✓ covered (scope ext, T-E6) |

---

## Test Coverage

Test scenarios from `SPEC_UAT_SESSIONINITPROMPT` (see
`docs/design/spec_uat_sessioninitprompt.rst`):

| ID | Scenario | Path | AC |
|----|----------|------|----|
| T-1 | New session via tree-click — agent field present | new-session, tree-click | AC-1 |
| T-2 | New session via tree-click — no agent field | new-session, tree-click | AC-1 (no-agent) |
| T-3 | Existing session via tree-click — no re-apply | existing-session | AC-2 |
| T-4 | Auto-delivery to deleted session — agent mode + init-prompt | new-session, auto-delivery | AC-3 |
| T-5 | Cross-path equivalence — tree-click vs auto-delivery | both | AC-4 |
| T-E1 | Edge: no `agent` field — init-prompt still sent | new-session | — |
| T-E2 | Edge: entity lookup miss — graceful skip (no mode-prime, no init-prompt) | new-session | — |
| T-E3 | Edge: typo in `agent` field — no crash; spec gap noted | new-session | — |
| T-E4 | Edge: multiple messages queued — init-prompt sent once | new-session, auto-delivery | — |
| T-E5 | Edge: tree-click to session in background tab — focused, not re-opened | existing-session | AC-2 |
| T-E6 | Edge: agent file without `user-invocable` key → included in picker | default-include | AC-5 |

Manual user verification pending after merge to develop.

---

## Automated Checks (Engineer-executed)

| Check | Result |
|-------|--------|
| `npm run compile` | Clean — 0 errors, 0 warnings |
| `python -m sphinx -b html docs docs/_build/html -W --keep-going -E -q` | Clean — 0 warnings, 0 errors |

---

## Known Limitations

- **T-E3 (invalid agent name):** A session with `agent: totally.unknown.mode`
  in `session.yaml` triggers the mode-prime step with an unrecognised mode
  identifier. VS Code silently falls back to the current user mode. The
  extension does not crash. This edge case is handled defensively but is not
  specified normatively in `SPEC_MSG_AGENTSESSION`. Deferred to a follow-on CR
  for normative handling.

---

## Scope Extension — AC-5 (default-include agent discovery)

**PM superseding direction:** 2026-05-22 20:35Z — fix in this CR (no separate CR).

**Root cause:** `REQ_SES_AGENT_DISCOVERY` AC-2 had been self-invented as
default-deny (`user-invocable` missing or false → exclude).  Agent files without
an explicit `user-invocable` key were silently absent from the picker, blocking
User-UAT verification.

**Fix:** `isExplicitlyExcluded()` helper returns `true` only when
`user-invocable: false` is present.  All other files (key absent or
`user-invocable: true`) are included.  US/REQ/SPEC rewritten for
default-include opt-out policy (commit `3578c7b`); helper added and algorithm
switched (commit `6143eb2`).

**New test case:**

| ID | Scenario | AC |
|----|----------|----|
| T-E6 | Agent file without `user-invocable` key → included in picker (default-include) | AC-5 |

Test protocol (`tst-session-init-prompt-on-autoopen.md`) updated with T-E6 and
two new precondition test files (`no-uikey-agent.agent.md`,
`optout-agent.agent.md`); commit `0967af3`.

---

## MECE Final Advisories

**Status:** PASS-WITH-ADVISORIES

### Initial MECE (pre-scope-extension)

| Advisory | Severity | Decision |
|----------|----------|----------|
| Inline init-prompt template duplicated across 3 call sites (openAgentSession, sendMessages, autoDeliver) | LOW | Accepted — intentional code-locality choice. Deferred to `spec-helper-orphan-cleanup` CR. |
| T-E4 wording minor ambiguity | LOW | Accepted as-is. |

### MECE Reload (post-scope-extension — 2026-05-22)

| ID | Advisory | Severity | Decision |
|----|----------|----------|----------|
| A-1 | `SPEC_SES_AGENT_DISCOVERY` File touchpoint note missing `isExplicitlyExcluded()` | LOW | Fixed in this docu sync |
| A-3 | `SPEC_SES_AGENT_DISCOVERY` design decisions: "deduplicated" bullet semantically contradictory | LOW | Fixed in this docu sync |
| A-4 | Process Log rows 12–15 still showing `pending` | LOW | Fixed in this docu sync |

All 5 LOW advisories addressed or accepted. No HIGH or MEDIUM open.

---

## Scope Extension Round 2 — F-1 + F-2

**PM direction:** 2026-05-23 — agent identity unification (F-1: frontmatter `name:` takes precedence over filename-stem) + session folder verbatim naming (F-2: no slug/kebab transform).

**CM design decision (F-FAIL-2):** `validateInput` mechanism (real-time inline validation in showInputBox) preferred over `showErrorMessage` (post-OK toast). The `validateInput` approach provides immediate feedback and disables the OK button until the name is valid — UX-superior. Code wiring correct; only spec + test text needed alignment.

**New test cases:**

| ID | Scenario | AC |
|----|----------|----|
| T-F1-1 | Agent with frontmatter `name:` appears in picker by display name | F-1 |
| T-F1-2 | Agent without `name:` key appears as filename stem | F-1 |
| T-F1-3 | Session created with "Change Manager" stores `agent: Change Manager` | F-1 |
| T-F1-4 | Opening session with `agent: Change Manager` invokes mode "Change Manager" | F-1 |
| T-F1-5 | Existing `agent: syspilot.cm` (filename stem) still resolves — backward compat | F-1 |
| T-S1 | Create session "Change" — folder `Change` created verbatim | F-2 |
| T-S2 | Create session "Change Manager" (with space) — folder created verbatim | F-2 |
| T-S3 | Create session "a/b" — inline error shown, no folder created | F-2 + REQ_SES_NEWENTITY AC-9 |
| T-S4 | Pre-staged `change-manager/` with `name: Change Manager` — identity from name field | F-1 + F-2 |

**MECE round 1 verdict:** FAIL — F-FAIL-1 (validateInput missing dot/control/reserved checks) fixed in `1d8f590`; F-FAIL-2 (spec + T-S3 text misaligned to showErrorMessage) fixed in this docu sync. A-1/A-2/A-3 LOW advisories addressed (A-1: readFrontmatterBool retained intentionally; A-2: agent field example extended; A-3: REQ_SES_AGENT_COMPAT backward-compat note added).

**Expected MECE re-verify:** PASS — pending commission by CM.

---

## Verdict

**PASS-WITH-ADVISORIES** — pending MECE re-verify (F-1+F-2) and User-UAT round 2.

All 5 original acceptance criteria covered (AC-1..AC-4; AC-5 scope extension).
F-1 + F-2 acceptance criteria implemented and documented.
Mode-primed creation pattern correctly adopted at all 3 call sites.
`isExplicitlyExcluded()` implements default-include opt-out for agent discovery.
Sphinx build and `npm compile` clean. No HIGH/MEDIUM issues outstanding.
