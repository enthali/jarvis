# Change: initprompt-extract-overflow

| Field | Value |
|-------|-------|
| Status | in-progress |
| Branch | `feature/initprompt-extract-overflow` (off `develop` @ `a3a5d45`) |
| Author | Project Manager |
| Type | Enhancement (prompt-content) |

## Summary

Extend the default agent-session initialization prompt
(`jarvis.agentSession.initPromptTemplate`) with one additional discipline
bullet that gives the agent a **scaling valve** for `context.md`: when a topic
outgrows a few bullets, the agent moves it into a dedicated file beside
`context.md` and leaves behind a one-line summary plus a relative link.

**Motivation:** The current default prompt is purely *subtractive* — every
existing bullet tells the agent what to drop, prune, or replace. This keeps
`context.md` lean but provides no sanctioned path for knowledge that genuinely
deserves to persist yet is too large for a single line. Sessions either bloat
`context.md` or lose the knowledge. The new bullet resolves that tension: lean
`context.md` ↔ a growing, linked knowledge graph in the entity folder.

**Exact wording of the new (6th) bullet, appended to the existing
"Keep it minimal and action-oriented" list, after the "2 weeks" gate:**

> - When a topic grows past ~5 bullets, move it to a dedicated file beside `context.md` and leave a one-line summary with a relative link in `context.md`.

**Design decisions baked into the wording (PM-fixed, not open):**

- **"move it to a dedicated file beside `context.md`"** — same folder level, so
  the externalized knowledge lives in the entity folder, is versioned with it,
  and is reachable from the session-start context.
- **"a relative link"** — portable; no absolute paths leak into the file.
- **No deictic pronoun ("here"/"there")** — `context.md` is named explicitly as
  both the source and the destination of the summary line, removing ambiguity
  about where the residual line goes.

## Scope

- **Generic across all entity kinds** (project / event / session). The prompt is
  `${kind}`-generic and stays that way; no per-kind divergence.
- Single string change to the `default` of
  `jarvis.agentSession.initPromptTemplate` in `package.json`.
- Traceability updates: `US_EXP_AGENTSESSION`, `REQ_SES_AGENTPROMPT` /
  `REQ_EXP_AGENTPROMPT_TEMPLATE`, `SPEC_EXP_AGENTSESSION_INITPROMPT`.
- UAT spec `spec_uat_agent_prompt_tuning` (and its US/REQ) must reflect the new
  bullet in the default-prompt expectation (T-1 currently asserts the bullet
  set).

## Out of scope

- No change to the override mechanism, placeholders, or settings schema shape.
- No change to how the prompt is sent or to `context.md` creation logic.

---

## Level 0 — User Stories

### Impact Analysis

| US ID | Title | Status | Verdict |
|-------|-------|--------|---------|
| `US_EXP_AGENTSESSION_PROMPT` | Disciplined & Configurable Agent-Session Init Prompt | draft | **AFFECTED** — AC-1 describes bullet discipline; new AC-8 added for the overflow rule |
| `US_UAT_APT_INITPROMPT` | Agent Session Init Prompt Acceptance Tests | implemented | **AFFECTED** — T-1 asserts the bullet set; new AC-7 + T-7 added for the new bullet |
| `US_EXP_AGENTSESSION` | Open Agent Session from Explorer | approved | Not affected — mentions "init prompt is sent" but does not specify content |
| `US_UAT_AGENTSESSION` | Open Agent Session from Explorer Acceptance Tests | approved | Not affected — T-3 tests prompt presence, not specific bullet wording |

### New User Stories

None. The change is a natural extension of `US_EXP_AGENTSESSION_PROMPT` (new AC-8).

### Changes Made

| File | Element | Change |
|------|---------|--------|
| `docs/userstories/us_exp.rst` | `US_EXP_AGENTSESSION_PROMPT` | Added AC-8: scaling-valve rule for extract-overflow |
| `docs/userstories/us_uat_agent_prompt_tuning.rst` | `US_UAT_APT_INITPROMPT` | Added AC-7 + T-7: test verifies extract-overflow bullet in default prompt |

### Decisions

- D-1: No new US created. The extract-overflow bullet is an additional discipline rule on the existing prompt, fitting AC scope of `US_EXP_AGENTSESSION_PROMPT`.
- D-2: `US_UAT_APT_INITPROMPT` gets a new test scenario (T-7) rather than modifying T-1, because T-1 tests the *existing* bullets and T-7 specifically asserts the new one.
- D-3: `US_EXP_AGENTSESSION` and `US_UAT_AGENTSESSION` are not affected — they describe the *mechanism* (open session, send prompt) not the *content* (what the prompt says).

### MECE Horizontal Check (L0)

- **Completeness:** All US that mention init-prompt content or test the default bullet set are covered. No US outside `US_EXP_AGENTSESSION_PROMPT` and `US_UAT_APT_INITPROMPT` specifies prompt *wording*. ✓
- **No overlaps:** AC-8 is distinct from AC-1/AC-2 (subtractive discipline vs. scaling valve). T-7 is distinct from T-1 (T-1 checks existing bullets; T-7 checks the new one). ✓
- **No gaps:** The new bullet applies to all entity kinds — `US_EXP_AGENTSESSION_PROMPT` is already `${kind}`-generic, so no per-kind US is needed. ✓

---

## Level 1 — Requirements

### Impact Analysis

| REQ ID | Title | Status | Verdict |
|--------|-------|--------|---------|
| `REQ_EXP_AGENTPROMPT_TEMPLATE` | Agent-Session Init Prompt Template Setting | draft | **AFFECTED** — AC-7 added: default prompt SHALL include extract-overflow bullet |
| `REQ_UAT_APT_INITPROMPT` | Init Prompt Template UAT Requirements | implemented | **AFFECTED** — AC-7 + T-7 added: test verifies new bullet presence |
| `REQ_SES_AGENTPROMPT` | Agent-Session Init Prompt | implemented | Not affected — defines send mechanism, not prompt content |
| `REQ_EXP_AGENTSESSION` | Open Agent Session Command | implemented | Not affected — invokes prompt path, does not define content |
| `REQ_UAT_APT_NOTIFICATION` | Notification Template UAT Requirements | implemented | Not affected — covers notification template, not init prompt |
| `REQ_UAT_APT_CFG` | Settings UI Visibility UAT Requirements | implemented | Not affected — tests settings UI presence, not prompt wording |

### New Requirements

None. The change extends existing REQs only.

### Conflicts

None detected.

### Changes Made

| File | Element | Change |
|------|---------|--------|
| `docs/requirements/req_exp.rst` | `REQ_EXP_AGENTPROMPT_TEMPLATE` | Added AC-7: default prompt SHALL include extract-overflow bullet verbatim as last discipline item |
| `docs/requirements/req_uat_agent_prompt_tuning.rst` | `REQ_UAT_APT_INITPROMPT` | Added AC-7 + T-7: test scenario verifying new bullet appears as last discipline list item |

### Decisions

- D-1: No new REQ created. The extract-overflow bullet is an additional acceptance criterion on the existing template setting REQ.
- D-2: `REQ_UAT_APT_INITPROMPT` gets AC-7 + T-7 rather than modifying AC-1/T-1 because T-1 asserts the previously existing bullet set and T-7 specifically asserts the new one.
- D-3: `REQ_SES_AGENTPROMPT`, `REQ_EXP_AGENTSESSION`, `REQ_UAT_APT_NOTIFICATION`, `REQ_UAT_APT_CFG` are not affected — they concern mechanism or unrelated templates, not init-prompt content.

### MECE Horizontal Check (L1)

- **Completeness:** All REQs that define init-prompt content or test the default bullet set are covered. No REQ outside `REQ_EXP_AGENTPROMPT_TEMPLATE` and `REQ_UAT_APT_INITPROMPT` specifies prompt wording. ✓
- **No overlaps:** AC-7 in `REQ_EXP_AGENTPROMPT_TEMPLATE` specifies the rule; AC-7/T-7 in `REQ_UAT_APT_INITPROMPT` specifies how to verify it — distinct concerns. ✓
- **No gaps:** The new bullet is `${kind}`-generic; no per-kind REQ needed. ✓

---

## Level 2 — Design Specifications

### Impact Analysis

| SPEC ID | File | Status | Verdict |
|---------|------|--------|---------|
| `SPEC_EXP_AGENTSESSION_INITPROMPT` | `docs/design/spec_exp.rst` | draft | **AFFECTED** — contains the `DEFAULT_INIT_PROMPT` literal; new bullet appended |
| `SPEC_UAT_AGENT_PROMPT_SCENARIOS` | `docs/design/spec_uat_agent_prompt_tuning.rst` | implemented | **AFFECTED** — new T-14 scenario added for extract-overflow bullet verification |
| `SPEC_CFG_MANIFEST` | `docs/design/spec_cfg.rst` | implemented | Not affected — shows `"default": ""` for the setting; actual prompt text lives in `SPEC_EXP_AGENTSESSION_INITPROMPT` |
| `SPEC_MSG_SENDCOMMAND` | `docs/design/spec_msg.rst` | implemented | Not affected — references `SPEC_EXP_AGENTSESSION_INITPROMPT` for prompt content; no literal duplication |
| `SPEC_MSG_AUTODELIVER_POLL` | `docs/design/spec_msg.rst` | implemented | Not affected — same as above; delegates prompt content to `SPEC_EXP_AGENTSESSION_INITPROMPT` |

### New Specifications

None. The change extends two existing SPECs only.

### Changes Made

| File | Element | Change |
|------|---------|--------|
| `docs/design/spec_exp.rst` | `SPEC_EXP_AGENTSESSION_INITPROMPT` | Appended 6th bullet to `DEFAULT_INIT_PROMPT` code block (verbatim PM-locked wording) |
| `docs/design/spec_uat_agent_prompt_tuning.rst` | `SPEC_UAT_AGENT_PROMPT_SCENARIOS` | Added T-14 scenario (extract-overflow bullet presence); updated description count from thirteen to fourteen |

### Decisions

- D-1: No new SPEC created. The bullet is a content addition to an existing constant defined in `SPEC_EXP_AGENTSESSION_INITPROMPT`.
- D-2: UAT scenario numbered T-14 (not T-7) at SPEC level to avoid renumbering the existing notification scenarios T-7 through T-11. The REQ-level `REQ_UAT_APT_INITPROMPT` T-7 maps to SPEC-level T-14.
- D-3: `SPEC_CFG_MANIFEST`, `SPEC_MSG_SENDCOMMAND`, `SPEC_MSG_AUTODELIVER_POLL` are not affected — they reference `SPEC_EXP_AGENTSESSION_INITPROMPT` for the prompt literal and do not duplicate it.

### MECE Horizontal Check (L2)

- **Completeness:** All SPECs that contain or reference the `DEFAULT_INIT_PROMPT` literal are covered. Only `SPEC_EXP_AGENTSESSION_INITPROMPT` owns the text; all others delegate. ✓
- **No overlaps:** `SPEC_EXP_AGENTSESSION_INITPROMPT` owns the template content; `SPEC_UAT_AGENT_PROMPT_SCENARIOS` owns the test procedure — distinct concerns. ✓
- **No gaps:** T-14 verifies the exact verbatim wording and its position as the last list item. No per-kind branching needed (template is `${kind}`-generic). ✓

---

## Test Protocol

**Protocol document:** [tst-initprompt-extract-overflow.md](tst-initprompt-extract-overflow.md)

| TC | Description | AC traced |
|----|-------------|-----------|
| TC-1 | Extract-overflow bullet present verbatim (session entity) | `SPEC_EXP_AGENTSESSION_INITPROMPT` bullet wording; T-14 |
| TC-2 | Extract-overflow bullet is last item in discipline list | `SPEC_EXP_AGENTSESSION_INITPROMPT` bullet position; T-14 |
| TC-3 | Prompt for project entity contains the bullet identically | `SPEC_EXP_AGENTSESSION_INITPROMPT` cross-entity scope; T-14 |
| TC-4 | Prompt for event entity contains the bullet identically | `SPEC_EXP_AGENTSESSION_INITPROMPT` cross-entity scope; T-14 |
| TC-5 | Existing five bullets unchanged in wording and order | `SPEC_EXP_AGENTSESSION_INITPROMPT` non-regression |
| TC-6 | Custom template override still suppresses default | `SPEC_UAT_AGENT_PROMPT_SCENARIOS` T-3 regression guard |

---

## Verification Log

**MECE Final Check (2026-06-12) — PASS-with-disputed-finding**

QM raised one finding flagged as "FAIL-blocking" plus one related minor. CM reviewed and rejected both as out-of-scope for this CR:

- **QM F-1 (rejected — out of scope, pre-existing):** Inconsistent template-literal escaping across the three `defaultInitPrompt` copies in `src/extension.ts` (copy 1 uses `\${kind}`, copies 2–3 use `${kind}`).
  - **Verification:** `git blame` shows lines 833–840 and 2584–2591 originate from commit `28d2f7e0` (2026-05-23), three weeks before this CR. Only the two new bullet lines (841–842, 2592–2593) belong to this CR (`2e0fc959`).
  - **Functional analysis:** Copies 2–3 substitute `kind`/`name` at template-literal construction; copy 1 substitutes them via `applyTemplate()`. Both paths produce identical rendered prompts. `contextPath` is correctly escaped (`\`${contextPath}\``) in all three copies. All 36 tests pass; compile clean.
  - **CM decision:** Pre-existing style inconsistency outside this CR's scope (per CM session memory: "Repo housekeeping / chores without product impact are NOT in CM scope"). Disclosed to PM as an observation; not bundled here. PM may open a separate refactor CR if desired.

- **QM F-2 (rejected — derivative):** Test gap that the new test file does not assert `defaultInitPrompt` contains the literal `${kind}` placeholder. Derivative of F-1; same out-of-scope rationale applies.

**Verbatim wording drift check:** ✓ PASS — the extract-overflow bullet appears character-for-character identical in `src/extension.ts` (3 copies), `package.json` `default`, `SPEC_EXP_AGENTSESSION_INITPROMPT`, `REQ_EXP_AGENTPROMPT_TEMPLATE` AC-7, and the test fixture `NEW_BULLET`.

**Artefakt classification:**
- (a) Active code: in sync with new state; no stale "five bullets" assertions
- (b) Active docs: in sync (US/REQ/SPEC all carry AC-8 / AC-7 / 6th bullet respectively)
- (c) Historical `docs/changes/v*/`: none reference the prompt bullet count

**MECE verdict for this CR's scope:** PASS — no redundancies, no in-scope gaps, no in-scope contradictions, full test coverage of the new bullet across all four required dimensions (presence verbatim, position-is-last, per-kind identity, non-regression of pre-existing bullets).

