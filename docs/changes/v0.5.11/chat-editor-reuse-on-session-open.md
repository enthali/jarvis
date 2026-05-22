# Change: chat-editor-reuse-on-session-open

**Status:** completed pending merge to develop
**Mode:** autonomous
**Priority:** HIGH — Blocker for v0.5.11
**Source:** PM (Jarvis message 2026-05-20T09:15:34Z, includes PM-commissioned research)
**Branch:** `feature/chat-editor-reuse-on-session-open` (from `develop` @ `4dadb49`)
**Research-Branch:** `research-open-chat-force-new` @ `335899d` (PM-validated fix, will be deleted post-merge)

## Intent

Programmatic opening of a NEW Jarvis session must always produce a dedicated chat editor — never recycle an existing one. Today the existing chat editor is reused, so init-prompt and conversation land in the wrong chat.

## Root Cause (per PM research)

`jarvis.openAgentSession` uses the constant URI `vscode-chat-session://local/new` for every NEW session. The first call creates an editor; every subsequent call "navigates" within the existing one instead of opening a fresh editor.

## Fix (per PM research)

Replace `vscode.open(vscode-chat-session://local/new)` with `vscode.commands.executeCommand('workbench.action.openChat')` — VS Code's internal "New Chat Editor" command (uses `getNewSessionUri()` + `openSession(..., ACTIVE_GROUP, { pinned: true })`) which generates a fresh URI per invocation.

Existing sessions (`vscode-chat-session://local/<sessionUUID>`) remain unchanged.

Implementation pattern: new helper `openNewChatEditor()` in `activate()`, replaces three callsites in `src/extension.ts`.

## Acceptance Criteria (user-visible)

1. Click on a Session-Tree entry opens that session in a dedicated chat editor. Known-UUID session: its editor is activated (already correct today).
2. `jarvis_createSession` with `initialMessage` opens the new session in its **own fresh chat editor**. Init-prompt and `initialMessage` land in that editor.
3. Manual "New Session" (UI) behaves identically: own chat editor per session.
4. Creating multiple new sessions in succession produces a separate editor each time — no reuse.
5. Two sessions created in quick succession via `jarvis_createSession` produce two separate chat editors.

## Scope

- `src/extension.ts`: introduce helper `openNewChatEditor()`; replace three callsites of `vscode.open(vscode-chat-session://local/new)`.
- `SPEC_EXP_AGENTSESSION_INITPROMPT` and related specs: Designer evaluates update need.
- UAT protocol with the 5 ACs as scenarios.

## Out of Scope

- Migration of existing sessions
- Refactor of session-lookup logic
- Changes to the UUID-based path (`local/<uuid>`)

## Approach

PM has validated the fix on `research-open-chat-force-new` @ `335899d`. CM may adopt the code as binding template, but the full workflow runs anyway: Designer (spec) → Test (UAT) → Dev (cherry-pick / re-apply + review) → MECE → Docu → Notify.

Research-Branch is **deleted post-merge** (no cleanup ticket).

## Process Log

- 2026-05-20: Received CR from PM via Jarvis (autonomous, high priority).
- 2026-05-20: Verified research-branch `research-open-chat-force-new` @ `335899d`; diff confirms 1 new helper + 3 callsite replacements in `src/extension.ts`; no other code touched.
- 2026-05-20: Change Document created on `feature/chat-editor-reuse-on-session-open` from `develop` @ `4dadb49`.

## Process Log — Test Engineer

### Files Created

| File | ID | Scenarios |
|---|---|---|
| `docs/userstories/us_uat_chateditorreuse.rst` | `US_UAT_CHATEDITORREUSE` | 5 |
| `docs/requirements/req_uat_chateditorreuse.rst` | `REQ_UAT_CHATEDITORREUSE` | 5 |
| `docs/design/spec_uat_chateditorreuse.rst` | `SPEC_UAT_CHATEDITORREUSE` | 5 |

### Files Updated (toctree registrations)

- `docs/userstories/us_uat.rst`
- `docs/requirements/req_uat.rst`
- `docs/design/spec_uat.rst`

### Scenario Count

5 scenarios (T-1 … T-5), one per Change-Document AC.

### Sphinx Result

`build succeeded` — clean (no warnings, no errors).

---

## Process Log — System Designer

### Impact Analysis

Ran `get_need_links.py` (direction: in, depth: 1) for each driving REQ:

| Starting REQ | Affected SPECs found |
|---|---|
| `REQ_SES_CREATETOOL` | `SPEC_SES_CREATETOOL` |
| `REQ_SES_TREECLICK` | `SPEC_SES_TREECLICK` |
| `REQ_MSG_AUTODELIVER_POLL` | `SPEC_MSG_AUTODELIVER_POLL` |

Additional reachability via code inspection:
- Callsite 1 (~line 648): `jarvis.sendMessages` → `SPEC_MSG_SENDCOMMAND` — **already correct** (prior change 2fa564b already updated this spec to show `openNewChatEditor()`; helper specs `SPEC_MSG_OPENCHAT`, `SPEC_MSG_PINNED`, `SPEC_MSG_SENDPROMPT`, `SPEC_MSG_AGENTSESSION` were also already written).
- Callsite 2 (~line 715): `jarvis.openAgentSession` → `SPEC_EXP_AGENTSESSION` — **updated**.
- Callsite 3 (~line 2032): auto-delivery poll → `SPEC_MSG_AUTODELIVER_POLL` — **updated**.

`SPEC_SES_CREATETOOL` and `SPEC_SES_TREECLICK` do not prescribe the URI-open mechanism directly (they call `jarvis.openAgentSession` via `executeCommand`); fix propagates via `SPEC_EXP_AGENTSESSION`. No AC text contradicts the new behavior — no changes needed to those two SPECs or their REQs.

`REQ_EXP_AGENTSESSION` already references `REQ_MSG_OPENCHAT` (added in 2fa564b); no REQ changes needed.

### Spec Changes Summary

| File | Element | Change |
|---|---|---|
| `docs/design/spec_exp.rst` | `SPEC_EXP_AGENTSESSION` | Status `implemented` → `draft`; added links `SPEC_MSG_OPENCHAT`, `SPEC_MSG_PINNED`, `SPEC_MSG_AGENTSESSION`; updated handler code block: existing-session path uses `openPinnedResource()`, new-session path uses `openNewChatEditor()`; added URI-reuse rationale section |
| `docs/design/spec_msg.rst` | `SPEC_MSG_AUTODELIVER_POLL` | Status `implemented` → `draft`; added link `SPEC_MSG_OPENCHAT`; updated else-branch in code block to use `openNewChatEditor()` + `renameFocusedChatSession()`; added URI-reuse rationale section |

No REQ or US changes required.

### Sphinx Build

`python -m sphinx -b html docs docs/_build/html -W --keep-going -E` — **clean** (`build succeeded`).

## Process Log — PM Merge Approval

**Date:** 2026-05-20
**Decision:** APPROVED (no further UAT — manual research-branch validation accepted).
**MECE Advisories A1–A6:** PM defers — fix opportunistically at next CR touching SPEC_EXP_AGENTSESSION / SPEC_MSG_AUTODELIVER_POLL / SPEC_MSG_OPENCHAT / SPEC_UAT_CHATEDITORREUSE. No own CR.
**Pre-existing lint issue (ESLint v9 vs .eslintrc.*):** deferred to post-release.
**Cleanup:** research-branch `research-open-chat-force-new` will be deleted post-merge (CM action).
Status bumped: US/REQ/SPEC_UAT_CHATEDITORREUSE → implemented. Change Document status → completed pending merge to develop.

---

## Process Log — Dev Engineer

### Code Review of Research Patch (`research-open-chat-force-new` @ `335899d`)

- `openNewChatEditor()` helper: well-named, async, single responsibility (executes `workbench.action.openChat` + 800 ms settle delay). ✓
- 800 ms sleep inside helper matches the prior per-callsite settle delay — preserved. ✓
- Three callsites replaced: `jarvis.sendMessages` (~line 648), `jarvis.openAgentSession` (~line 712), auto-delivery poll (~line 2032). ✓
- Old stale comment "create a new editor chat via URI with empty sessionId" removed at callsite 1. ✓
- No leftover references to `vscode-chat-session://local/new`. ✓
- No collateral damage to UUID-based path (`local/<b64>`). ✓
- **Verdict: clean — applied faithfully.**

### Files Changed

| File | Change |
|---|---|
| `src/extension.ts` | Added `openNewChatEditor()` helper (~line 106); replaced 3 callsites (hunks at ~648, ~712, ~2032) |
| `docs/design/spec_exp.rst` | `SPEC_EXP_AGENTSESSION`: `draft` → `implemented` |
| `docs/design/spec_msg.rst` | `SPEC_MSG_AUTODELIVER_POLL`: `draft` → `implemented` |

### Compile

`npm run compile` — **clean** (no errors, no warnings).

### Lint

`npm run lint` — pre-existing failure (ESLint v9 vs `.eslintrc.*` config, no `eslint.config.js`). No new lint output introduced by this patch.

### Sphinx

`python -m sphinx -b html docs docs/_build/html -W --keep-going -E` — **clean** (`build succeeded`).

## Process Log — MECE Final Check

**Date:** 2026-05-20
**Verdict:** PASS-WITH-ADVISORIES (6 non-blocking)

### Checks Summary

| # | Check | Result |
|---|-------|--------|
| 1 | Redundancy (URI-reuse rationale across both SPECs) | PASS — distinct contexts, near-identical wording (A1) |
| 2 | Gaps (AC coverage, traceability) | PASS — all 5 CR ACs covered by T-1..T-5 (with label drift A2) |
| 3 | Contradictions (specs vs code) | PASS — semantically aligned; timing drift A4/A5/A6 |
| 4 | Overlaps in UAT scenarios | PASS — T-1..T-5 test distinct observables |
| 5 | Implementation vs SPEC structure | PASS — helper signature, 3 callsites, no leftover `local/new` URIs |

### Advisories (non-blocking, deferrable)

- **A1:** `SPEC_EXP_AGENTSESSION` and `SPEC_MSG_AUTODELIVER_POLL` both contain near-duplicate "Rationale — URI-reuse bug fix" sections. Neither cross-links to `SPEC_MSG_OPENCHAT` as canonical helper.
- **A2:** `SPEC_UAT_CHATEDITORREUSE` T-5 labeled `*CR AC: 5*` — actually tests the auto-delivery path (`SPEC_MSG_AUTODELIVER_POLL`). CR AC-5 (successive `jarvis_createSession`) is covered by T-4. Label is misleading.
- **A3:** `SPEC_MSG_OPENCHAT` "Callers" list omits the auto-delivery poll loop (callsite at line ~2035 added by this CR). `SPEC_MSG_OPENCHAT` was not in update scope.
- **A4:** `SPEC_MSG_OPENCHAT` prescribes `try/catch` + fallback with no delay; actual `openNewChatEditor()` has no `try/catch` and a 800 ms internal delay. Pre-existing drift; PM validated the simplified implementation.
- **A5:** `SPEC_EXP_AGENTSESSION` code block prescribes an extra `await new Promise(...800)` after `openNewChatEditor()` (1600 ms total). Actual code uses only the helper-internal 800 ms.
- **A6:** `SPEC_MSG_AUTODELIVER_POLL` code block shows 800 ms after `renameFocusedChatSession()`; actual code has none.

### Decision

No blockers. All advisories are spec/doc drift (some pre-existing) — can be cleaned up opportunistically in a later editorial pass. Functional behavior is correct and validated by PM via research-branch.

## Advisory Closure (CR spec-timing-cleanup, 2026-05-22)

| Advisory | Action | Notes |
|----------|--------|-------|
| C-A1 | closed | Rationale sections in `SPEC_EXP_AGENTSESSION` and `SPEC_MSG_AUTODELIVER_POLL` reduced to 1–2 sentence summaries cross-linking to canonical `SPEC_MSG_OPENCHAT`; full rationale consolidated into `SPEC_MSG_OPENCHAT` Rationale section (`docs/design/spec_msg.rst`). |
| C-A2 | closed | `SPEC_UAT_CHATEDITORREUSE` T-5 label changed from `*CR AC: 5*` to `*CR AC: auto-delivery (SPEC_MSG_AUTODELIVER_POLL)*` (`docs/design/spec_uat_chateditorreuse.rst`). |
| C-A3 | closed | Auto-delivery poll loop added as third callsite in `SPEC_MSG_OPENCHAT` Callers list (`docs/design/spec_msg.rst`). |
| C-A4 | closed | `SPEC_MSG_OPENCHAT` Description, Implementation block, and Design decisions updated to match actual `openNewChatEditor()`: no try/catch, no fallback, 800 ms settle delay inside helper (`docs/design/spec_msg.rst`). |
| C-A5 | closed | Extra `await new Promise(...800)` after `openNewChatEditor()` removed from `SPEC_EXP_AGENTSESSION` code block (`docs/design/spec_exp.rst`); comment updated to note the delay is helper-internal. |
| C-A6 | closed | Both spurious 800 ms delays (before and after `renameFocusedChatSession`) removed from `SPEC_MSG_AUTODELIVER_POLL` code block (`docs/design/spec_msg.rst`); comment updated to note helper-internal delay. |
