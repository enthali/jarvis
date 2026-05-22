# Change Document: spec-timing-cleanup

**Status:** in-progress
**Mode:** autonomous
**Branch:** `feature/spec-timing-cleanup`
**Source:** PM Change Request (2026-05-22)
**Change Manager:** Jarvis CM session
**Base commit (develop):** `2d4bf65`

---

## CR Intent (from PM)

Two recently merged CRs — `chat-editor-reuse-on-session-open` and
`list-session-entities-gating-bug` (both archived under
`docs/changes/v0.5.11/`) — closed with `PASS-WITH-ADVISORIES` and 9 deferred
MECE advisories combined (6 + 3). Before cutting v0.6.0 ("Agent-aware
Sessions") we want this spec debt closed so traceability is clean and new
changes don't compound on a muddy foundation.

**This is doc-only. Zero `src/` changes.**

### User-visible Acceptance Criteria

1. All 9 deferred advisories (6 from `chat-editor-reuse-on-session-open`,
   3 from `list-session-entities-gating-bug`) are either **closed** or
   explicitly **accepted with rationale** in the corresponding archived
   Change Document.
2. Sphinx build clean (no new warnings under `-W --keep-going -E`).
3. No new orphan IDs introduced.
4. Pre-existing orphan IDs from v0.3.1 (e.g. `REQ_AUT_JOBREG_TOOLS` /
   `SPEC_AUT_JOBREG_TOOLS`) remain out of scope — this is NOT a broad
   orphan sweep.
5. No code changes under `src/`. Only `docs/**`.
6. Compile + Lint unchanged green (sanity, since no code touched).

### Out of Scope

- Pre-existing orphan IDs from v0.3.1 or earlier
- Restructure of spec themes or naming conventions
- New specs for not-yet-implemented features

### PM Sequential Rule

Last CR before v0.6.0 release. After merge, PM triggers
`syspilot.release` for v0.6.0 ("Agent-aware Sessions").

---

## Intent Gate

CR is intent-only. No implementation prescriptions beyond "doc-only, no
src/" (which is a legitimate scope constraint, not a how-to). Mode
autonomous. Proceed.

---

## Workflow Tailoring (CM decision)

This is a **doc-only cleanup CR with no new behavior, no new specs, no
code changes**. The standard engineer chain is tailored accordingly:

| Step | Standard | This CR | Rationale |
|------|----------|---------|-----------|
| 0. Branch | required | done | `feature/spec-timing-cleanup` from `develop@2d4bf65` |
| 1a. Change Document | required | done | this file |
| 2. System Designer | required | **SKIPPED** | No new US/REQ/SPEC nodes. Only edits to existing spec text that already exists. |
| 3. Test Engineer (UAT) | required | **SKIPPED** | No new behavior to test. CR AC-2 (sphinx clean) + AC-6 (compile/lint unchanged) verified by CM directly. |
| 4. Dev Engineer | required | **SKIPPED** | CR AC-5 forbids `src/` changes. |
| 5. MECE final | required | **REQUIRED** | Verify all 9 advisories closed; verify traceability after spec edits; confirm no new MECE issues introduced. |
| 6. Documentation Engineer | required | **REQUIRED** | Workhorse for this CR. Addresses all 9 advisories. |
| 7. Notify PM + QM | required | required | Standard. |
| 8. PM merge approval | required | required | Standard. |
| 9. Squash-merge | required | required | Standard. |
| 10. Post-merge | required | required | Standard. |

This tailoring is recorded as a lesson learned: doc-only cleanup CRs may
skip Designer/UAT/Dev when no new behavior or specs are introduced.

---

## Advisories to Address (9 total)

### From `docs/changes/v0.5.11/chat-editor-reuse-on-session-open.md` (6)

| # | Affected | Description |
|---|----------|-------------|
| C-A1 | `SPEC_EXP_AGENTSESSION` + `SPEC_MSG_AUTODELIVER_POLL` | Near-duplicate "URI-reuse bug fix Rationale" sections. Neither cross-links to `SPEC_MSG_OPENCHAT` as canonical helper. |
| C-A2 | `SPEC_UAT_CHATEDITORREUSE` T-5 | Labeled `*CR AC: 5*` — actually tests the auto-delivery path (`SPEC_MSG_AUTODELIVER_POLL`). CR AC-5 is covered by T-4. Label drift. |
| C-A3 | `SPEC_MSG_OPENCHAT` | "Callers" list omits the auto-delivery poll loop callsite added by that CR. |
| C-A4 | `SPEC_MSG_OPENCHAT` | Prescribes `try/catch` + fallback with no delay; actual `openNewChatEditor()` has no `try/catch` and an 800 ms internal delay. Spec vs impl drift. |
| C-A5 | `SPEC_EXP_AGENTSESSION` | Code block prescribes extra `await new Promise(...800)` after `openNewChatEditor()` (1600 ms total). Actual code uses only the helper-internal 800 ms. |
| C-A6 | `SPEC_MSG_AUTODELIVER_POLL` | Code block shows 800 ms after `renameFocusedChatSession()`; actual code has none. |

### From `docs/changes/v0.5.11/list-session-entities-gating-bug.md` (3)

| # | Affected | Description |
|---|----------|-------------|
| L-A1 | `SPEC_SES_TOOLS` | Handler-sketch description string is stale vs. actual code / `package.json` `modelDescription` (richer in code). |
| L-A2 | `SPEC_UAT_LISTSESSIONENTITIESGATING` T-2 | Row labeled `*CR AC: 1*` — should be `*CR AC: 2*` (T-2 tests Feature DISABLED path → AC-2). |
| L-A3 | `SPEC_UAT_LISTSESSIONENTITIESGATING` T-3 | Row labeled `*CR AC: 3, 4*` — `US_UAT_LISTSESSIONENTITIESGATING` has only AC-1..AC-3; should be `*CR AC: 3*`. |

---

## Process Log

| Step | Status | Engineer | Output / Notes |
|------|--------|----------|----------------|
| 0. Branch | done | CM | `feature/spec-timing-cleanup` from `develop@2d4bf65` |
| 1a. Change Document | done | CM | this file |
| 2. System Designer | SKIPPED | — | per workflow tailoring (no new specs/REQs) |
| 3. UAT artifacts | SKIPPED | — | per workflow tailoring (no new behavior) |
| 4. Implementation | SKIPPED | — | per workflow tailoring (CR AC-5: no src/ changes) |
| 6. Documentation | done | syspilot.docu | commits `c6c1736` (initial 9-advisory closure), `f8b576b` (N-A1/N-A2/N-A3 fix-pass), `83ec2ac` (N-A4 mini-round), `782a648` (N-A5 mini-round), `4d3b108` (ADV-NEW-3 mini-round); 5 spec files + 2 archived change docs touched; sphinx clean; compile clean |
| 5. MECE final | done | syspilot.mece | PASS — timing-drift = 0 outstanding. Pass 1 (`c6c1736` + `f8b576b`): PASS-WITH-ADVISORIES (N-A4 deferred, 3 of 4 N-advisories closed in `f8b576b`). Pass 2 (after `83ec2ac`): PASS-WITH-ADVISORIES (N-A5 found in `SPEC_MSG_SENDCOMMAND`). Pass 3 (after `782a648`): PASS-WITH-ADVISORIES (ADV-NEW-3 prose drift; ADV-NEW-1/2 out-of-scope orphan-helper finding). Pass 4 (after `4d3b108`): PASS — timing-drift = 0. ADV-NEW-1/2 PM-deferred to separate post-v0.6.0 CR `spec-sendprompt-helper-cleanup`. |
| 7. Notify | done | CM | PM + QM via Jarvis (initial notification at `d9531d0`; race-condition disclosure after `782a648`) |
| 8. Merge approval | done | PM | APPROVE (Option A): close ADV-NEW-3, keep N-A4/N-A5 fixes, defer ADV-NEW-1/2 to separate CR |
| 9. Squash-merge | pending | CM | feature → develop |
| 10. Post-merge | pending | CM | commit hash + branch name to PM |

> Note: Step 6 (Documentation) runs **before** step 5 (MECE) in this CR
> because MECE has nothing to check until the spec text is edited.

---

## Engineer Reports

_(populated as engineers return)_

### syspilot.docu (Documentation Engineer) — 2026-05-22

**Status:** complete
**Commits:**
- `c6c1736` — initial 9-advisory closure (C-A1..C-A6, L-A1..L-A3)
- `f8b576b` — fix-pass for 3 MECE-found incomplete closures (N-A1, N-A2, N-A3)
- `83ec2ac` — mini-round 1: N-A4 (SPEC_MSG_SENDPROMPT + SPEC_MSG_AGENTSESSION phantom 800ms)
- `782a648` — mini-round 2: N-A5 (SPEC_MSG_SENDCOMMAND phantom 800ms + outdated rename API)
- `4d3b108` — mini-round 3: ADV-NEW-3 (SPEC_MSG_AUTODELIVER_POLL prose drift)

All 9 original advisories closed; both archived change docs annotated with Advisory Closure tables. Three rounds of MECE-found same-class follow-ups (N-A4, N-A5, ADV-NEW-3) closed within the same CR per PM policy "fix all instances of the same drift NOW".

### syspilot.mece (MECE Final Check) — 2026-05-22

**Final verdict:** PASS — timing-drift = 0 outstanding.
**HEAD reviewed:** `4d3b108`

All 9 original advisories (C-A1..C-A6, L-A1..L-A3) verified closed. All MECE-found same-class follow-ups (N-A1..N-A5, ADV-NEW-3) closed within this CR. Sphinx + compile clean. Only `docs/**` files in scope.

**MECE pass history:**

| Pass | After commit | Verdict | New findings |
|------|--------------|---------|--------------|
| 1 | `f8b576b` | PASS-WITH-ADVISORIES | N-A1/N-A2/N-A3 closed in same commit; N-A4 surfaced |
| 2 | `83ec2ac` | PASS-WITH-ADVISORIES | N-A4 closed; N-A5 surfaced (same drift class in `SPEC_MSG_SENDCOMMAND`) |
| 3 | `782a648` | PASS-WITH-ADVISORIES | N-A5 closed; ADV-NEW-3 surfaced (prose drift, same class); ADV-NEW-1/2 surfaced (different class — orphan helper) |
| 4 | `4d3b108` | **PASS** | ADV-NEW-3 closed; timing-drift = 0 |

**MECE-found follow-ups (final disposition):**

| # | Affected | Class | Disposition |
|---|----------|-------|-------------|
| N-A1 | `SPEC_SES_TOOLS` handler sketch `.map()` missing `agent` | typo/incomplete | **CLOSED** in `f8b576b` |
| N-A2 | `SPEC_SES_TOOLS` double-comma typo in `registerDualTool` description | typo | **CLOSED** in `f8b576b` |
| N-A3 | `SPEC_UAT_LISTSESSIONENTITIESGATING` T-1 ME violation with T-2 (both claimed AC) | label | **CLOSED** in `f8b576b` |
| N-A4 | `SPEC_MSG_SENDPROMPT` + `SPEC_MSG_AGENTSESSION` phantom outer 800ms | timing drift | **CLOSED** in `83ec2ac` |
| N-A5 | `SPEC_MSG_SENDCOMMAND` phantom 800ms + outdated inline `chat.open` with `/rename` | timing drift | **CLOSED** in `782a648` |
| ADV-NEW-3 | `SPEC_MSG_AUTODELIVER_POLL` prose: "first sends `/rename`" → "first calls `renameFocusedChatSession(sessionName)`" | timing drift (prose) | **CLOSED** in `4d3b108` |
| ADV-NEW-1 | `SPEC_MSG_SENDPROMPT` example uses `sendPromptToFocusedAgentChat('/rename ...')` — helper not present in code | orphan-helper structural | **DEFERRED** (PM Option A): out-of-class, scope to separate post-v0.6.0 CR `spec-sendprompt-helper-cleanup` (Designer-involved). |
| ADV-NEW-2 | `SPEC_MSG_AGENTSESSION` step 3 same `sendPromptToFocusedAgentChat('/rename ...')` pattern | orphan-helper structural | **DEFERRED** with ADV-NEW-1. |

**Sphinx last line:** `build succeeded.`
**git diff develop..HEAD:** 8 files, 0 `src/**`, all `docs/**`.

### Lesson Learned (CM)

During iterative MECE passes, the engine found three same-class drift instances beyond the original 9 (N-A4, N-A5, ADV-NEW-3) and one structural finding of a different class (ADV-NEW-1/2: spec describes a helper that does not exist in code). CM did not autonomously fix the structural finding — escalated to PM, who confirmed scope discipline (Option A: close same-class, defer different-class to dedicated CR). Captures the principle: "fix all instances of the same drift NOW" must be paired with "escalate when a different class surfaces". Candidate ADR after v0.6.0.

