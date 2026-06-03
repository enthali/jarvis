# Verification Report: entity-parity

**Change Document:** [entity-parity.md](entity-parity.md)
**Test Protocol:** [tst-entity-parity.md](tst-entity-parity.md)
**Branch:** `feature/entity-parity` (merged into `develop`)
**Target release:** v0.7.0 (BREAKING)
**Base commit (develop):** `7ec65b0`
**Final feature-branch commit:** `6035e68`
**Merge commit (develop):** `e6279c9`
**Develop HEAD at verification:** `b4199fa`
**Verifier:** Quality Manager
**Date:** 2026-06-03
**Verdict:** **PASS-with-deferred-backlog**

---

## Summary

This CR delivers full feature parity for the three YAML-backed entity types
(Sessions, Projects, Events). YAML is the source of truth; the chat-session
is an ephemeral view. Implements the breaking v0.7.0 tool-surface swap,
KISS folder-naming, schema strictness (Option C: `agent` required, fail-open
on legacy YAMLs), uniform inline icons, tree-click parity with mode-primed
chat-open, destination-validation union, and a shared validator threaded
through `sendToSession` + heartbeat job registration (anti-drift).

Mid-CR the lazy-bind picker was removed by user decision (v11): tree-click
on an unbound entity now opens the default chat directly — no picker, no
YAML mutation. A unified `openChatForEntity()` helper consolidates the four
chat-open call sites (`openAgentSession`, `newProject`, `newEvent`,
`newSession`). The `view/item/context` menu regex was anchored in v11.4 to
prevent Messages-Tree items from inheriting entity inline icons.

**Acceptance Criteria coverage:**

| AC | Description | Status |
|----|-------------|--------|
| AC-1 | Tool-surface swap: `jarvis_listSessions` ↔ `jarvis_listChatSessions`, new `jarvis_listEvents` / `jarvis_createProject` / `jarvis_createEvent` (BREAKING) | ✓ covered |
| AC-2 | KISS folder-naming for `jarvis.newProject` + `jarvis.newEvent` (raw name 1:1, `validateInput`, no migration) | ✓ covered |
| AC-3 | Schema strictness Option C: `agent` required on projects/events; `summary` required on events; legacy YAMLs fail-open with warn-log | ✓ covered |
| AC-4 | UX parity: tree-click opens chat in assigned agent mode for all three entity types; uniform inline icons | ✓ covered |
| AC-5 | Destination-validation union {YAML entities} ∪ {active chat-session titles} for `sendToSession`; auto-delivery opens chat on first inbound | ✓ covered |
| AC-6 | Shared destination validator used by `sendToSession` AND heartbeat job registration — no drift | ✓ covered (anti-drift fix-pass: `056c7d9`) |

---

## Test Coverage

Tests defined in [tst-entity-parity.md](tst-entity-parity.md) — 12 groups
spanning the full intent surface:

| Group | Scope | Anchored UAT spec |
|-------|-------|-------------------|
| A | Tool surface swap + `listEvents` | `SPEC_UAT_LISTSESSIONS_SWAP`, `SPEC_UAT_LISTEVENTS` |
| B | `jarvis_createProject` tool | `SPEC_UAT_CREATEPROJECT` |
| C | `jarvis_createEvent` tool | `SPEC_UAT_CREATEEVENT` |
| D | Schema strictness (Option C) | `SPEC_UAT_ENTITY_PARITY` |
| E | Agent picker semantics — interactive `new*` commands | `SPEC_UAT_NEWENTITY_PICKER` |
| F | Tree-click default-chat behaviour (v11; lazy-bind removed) | `SPEC_UAT_ENTITY_PARITY` |
| G | Inline icons | `SPEC_UAT_ENTITY_PARITY` |
| H | Tree-click parity and init-prompt | `SPEC_UAT_ENTITY_PARITY` |
| I | Folder-naming KISS | `SPEC_UAT_ENTITY_PARITY` |
| J | Destination-validation union (`sendToSession`) | `SPEC_UAT_SAFE_SEND_UNION` |
| K | Heartbeat shared validator | `SPEC_UAT_HEARTBEAT_DEST_VALID` |
| L | Auto-delivery regression | `SPEC_UAT_ENTITY_PARITY` |

Regression-test additions during CR execution:

- T-25b — newSession default-agent path (F-4 regression after v8 fix-pass)
- T-37b — Messages-Tree items do NOT show entity inline icons (F-16
  regression after v11.4 fix-pass)

**Manual UAT execution:** PASS for all sampled scenarios across all twelve
groups (PM/User-confirmed prior to merge `e6279c9`).

---

## Automated Checks

| Check | Result |
|-------|--------|
| `npm run compile` (`develop` @ `b4199fa`) | Clean — 0 errors, 0 warnings |
| `python -m sphinx -b html docs docs/_build/html -W --keep-going -E` | Clean — `build succeeded`, 0 warnings, 0 errors |

---

## QM Targeted-Check Findings — Disposition Summary

The CR ran with on-the-fly QM↔CM↔PM mechanic-fix triage. Findings raised
during the change and their dispositions:

### Resolved within the CR

| ID | Severity | Title | Resolution |
|----|----------|-------|------------|
| F-1 | HIGH | Legacy `jarvis_listSessionEntities` still registered alongside renamed `jarvis_listSessions` (BREAKING contract violation) | Fixed `44c47f9` + clerical scrub `8a8e077` (QM PASS) |
| F-3 | advisory | Stale `modelDescription` for removed tool | Auto-resolved by F-1 fix |
| F-4 | HIGH | `newSessionCommand` default-agent path triggered double-prompt via delegation to `openAgentSession` (scanner coerces empty string → undefined → re-fires picker) | Designer `8679042` + dev `6166470` + docs `658d5e8`; QM PASS |
| F-6 | HIGH | `spec_uat_agent_prompt_tuning` T-12/T-13 expected settings under "Sessions"/"Messages" groups but code grouped under "Prompt Templates" — would have caused verbatim UAT failure | Docs `42c0e4a`; QM PASS |
| F-7 | MEDIUM | Stale lazy-bind references in `spec_uat_entity_parity.rst`, `us_uat_entity_parity.rst`, `req_uat_entity_parity.rst`, `tst-entity-parity.md` after v11 lazy-bind removal | Docs `42c0e4a`; QM PASS |
| F-8 | LOW (clerical) | `extension.ts` comment "default agent" inconsistent with renamed "No agent" picker label | Docs `42c0e4a`; QM PASS |
| F-9 | HIGH | Stale "default agent" picker-label residues in 4 newentity-picker UAT docs (incl. user-action steps `Select "default agent"`) — would have caused verbatim UAT failure | Docs `cddf615`; QM PASS |
| F-16 | MEDIUM | `view/item/context` regex `/^jarvis(Project\|Event\|Session)/` was prefix-match — Messages-Tree items (`jarvisSessionAutoDeliver`, `jarvisSessionManual`) inherited entity inline icons + context menu | Fixed `bc98202` (anchored regex `/^jarvis(Project\|Event\|Session)(\+recording)?$/`) + regression test T-37b; QM PASS |

### Deferred to backlog (PM-accepted, non-blocking for v0.7.0)

| ID | Severity | Title | Notes |
|----|----------|-------|-------|
| F-2 | LOW | Lazy-bind not idempotent per SPEC | Moot after v11 lazy-bind removal |
| F-5 | — | (deferred to `entity-parity-followups`) | |
| F-10 | doc | (PM-accepted backlog) | |
| F-12 | doc | (PM-accepted backlog) | |
| F-13 | doc | (PM-accepted backlog) | |
| F-14 | cosmetic | (PM-accepted backlog) | |
| F-15 | cosmetic | (PM-accepted backlog) | |
| F-18 | scanner warning | (PM-accepted backlog) | |
| B-1 | backlog | recording-icon dead feature | |
| B-2 | backlog | chat-burst race | |
| B-7 | backlog | UAT destination-disappeared edge case | |
| F-17 | positive finding | agent-validation against available chat-modes | Tracked for follow-up CR |

All deferred items have been accepted by PM as non-blocking for the v0.7.0
release; they will be addressed in follow-up CRs.

---

## Process Notes

- **Operation mode:** `user-guided` (PM-confirmed 2026-05-29 05:13Z).
- **CR Intent Gate:** PASS — CR was intent-level even though it named tool
  IDs and schema fields, because these constitute the public API surface of
  a BREAKING release.
- **Fix-pass cycles:** v1 → v11.4 (multiple designer/dev/docs iterations
  driven by user feedback during UAT and three rounds of QM targeted
  checks).
- **Pre-merge "merge jetzt OK?" check:** Honoured (Lesson Learned).
- **Merge:** `feature/entity-parity` → `develop` as `e6279c9` (non-fast-
  forward merge commit, BREAKING v0.7.0).
- **Post-merge:** `b4199fa` moved the CR docs out of a premature
  `docs/changes/v0.7.0/` folder back to the flat `docs/changes/<name>.md`
  layout per `docs/namingconventions.rst` (Change Documents are
  version-agnostic until the release agent bundles them).

---

## Verdict

**PASS-with-deferred-backlog**

All six acceptance criteria are covered by test design and verified by
manual UAT (PM/User). Eight findings raised during the CR were resolved
inside the change and re-verified by QM. Twelve further items are
PM-accepted as deferred backlog and do not block the v0.7.0 release.
Automated checks (`npm run compile`, `sphinx -W -E`) are clean on develop
HEAD `b4199fa`. The merge to `develop` (`e6279c9`) is verified.
