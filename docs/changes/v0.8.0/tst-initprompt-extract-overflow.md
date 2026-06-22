# Test Protocol: initprompt-extract-overflow

**Change Document:** [initprompt-extract-overflow.md](initprompt-extract-overflow.md)
**Verification Report:** [val-initprompt-extract-overflow.md](val-initprompt-extract-overflow.md)
**Branch:** `feature/initprompt-extract-overflow`
**UAT Specs:** `SPEC_EXP_AGENTSESSION_INITPROMPT`, `SPEC_UAT_AGENT_PROMPT_SCENARIOS` (T-14)
**Tester:** User (manual UAT in Extension Development Host)
**Date:** (fill in at execution)

---

## Pre-conditions / Setup

1. Compile the branch: `npm run compile` — must be clean (0 errors).
2. Launch the Extension Development Host via **F5** from `feature/initprompt-extract-overflow`.
3. Open workspace: `testdata/test.code-workspace`
   (File → Open Workspace from File…). This sets `testdata/` as the workspace root.
4. Verify that `jarvis.agentSession.initPromptTemplate` is **not set** (absent from
   workspace and user settings). Open VS Code Settings UI (`Ctrl+,`), search for
   `jarvis prompt template`, and confirm the field is empty.
5. Ensure the following test-data entities are present:

   **Sessions:**
   - At least one session folder under `testdata/.jarvis/sessions/` (e.g. `copilot-cm`)
     with a `session.yaml`.

   **Projects:**
   - `testdata/projects/alpha/` — `project.yaml` present.

   **Events:**
   - At least one event folder under `testdata/events/` with an `event.yaml`.

6. Open the **Jarvis** Output Channel (View → Output → Jarvis).
7. **Between scenarios that open new sessions:** you may need to delete any
   newly created session folder in `testdata/.jarvis/sessions/` to restore a
   clean state before the next scenario, unless stated otherwise.

---

## Group A — Verbatim Bullet Presence

### TC-1 — Extract-overflow bullet present verbatim (session entity)

*UAT ref: SPEC_EXP_AGENTSESSION_INITPROMPT (DEFAULT_INIT_PROMPT) /
SPEC_UAT_AGENT_PROMPT_SCENARIOS T-14*

**Pre-condition:** `jarvis.agentSession.initPromptTemplate` is not set.

**Test data:** A new session name, e.g. `extract-test-session`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | In the Sessions view title bar, click the **+** button. Enter session name `extract-test-session` and any summary. | New session folder is created; a Copilot agent chat opens automatically. | |
| 2 | In the chat input / first message, locate the bullet list under the "Keep it minimal and action-oriented:" heading. | A bullet list with multiple items is visible. | |
| 3 | Verify that the following text appears **exactly** (character-for-character, including backticks and punctuation):<br>`- When a topic grows past ~5 bullets, move it to a dedicated file beside \`context.md\` and leave a one-line summary with a relative link in \`context.md\`.` | The exact string above is present in the prompt. | |
| 4 | Check Output Channel. | No `[ERROR]` entries. | |
| 5 | **Teardown:** Delete the `testdata/.jarvis/sessions/extract-test-session/` folder. | Folder removed. | |

---

### TC-2 — Extract-overflow bullet is the last item of the discipline list

*UAT ref: SPEC_EXP_AGENTSESSION_INITPROMPT (bullet position) /
SPEC_UAT_AGENT_PROMPT_SCENARIOS T-14*

**Pre-condition:** `jarvis.agentSession.initPromptTemplate` is not set.

**Test data:** A new session name, e.g. `last-bullet-test`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Create a new session named `last-bullet-test`. | Copilot agent chat opens. | |
| 2 | In the chat message, locate the "Keep it minimal and action-oriented:" section. | Bullet list is visible. | |
| 3 | Read the bullets in order. Note the last bullet in the list. | The last bullet starts with `- When a topic grows past ~5 bullets`. | |
| 4 | Verify no further bullet (line starting with `-`) follows the extract-overflow bullet within that section. | No bullet follows it; the next content (if any) is either a blank line or the end of the message. | |
| 5 | **Teardown:** Delete the `testdata/.jarvis/sessions/last-bullet-test/` folder. | Folder removed. | |

---

## Group B — Generic Application (No Per-Kind Branching)

### TC-3 — Default prompt for a **project** entity contains the extract-overflow bullet

*UAT ref: SPEC_EXP_AGENTSESSION_INITPROMPT (cross-entity scope) /
SPEC_UAT_AGENT_PROMPT_SCENARIOS T-14 (no per-kind branching)*

**Pre-condition:** `jarvis.agentSession.initPromptTemplate` is not set.

**Test data:** A new project name, e.g. `extract-overflow-proj`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run **Jarvis: New Entity** → select **Project**. Enter project name `extract-overflow-proj` and any description. | New project folder is created; a Copilot agent chat opens. | |
| 2 | Verify `${kind}` is rendered as `project` in the chat (e.g. `You are the project "extract-overflow-proj"`). | `kind` is `project`. | |
| 3 | Verify the extract-overflow bullet appears verbatim (same text as TC-1, step 3). | Bullet is present and identical to the session variant. | |
| 4 | Verify the bullet is the last item in the discipline list (same check as TC-2, steps 3–4). | Bullet is last; nothing follows it in the list. | |
| 5 | **Teardown:** Delete the `testdata/projects/extract-overflow-proj/` folder. | Folder removed. | |

---

### TC-4 — Default prompt for an **event** entity contains the extract-overflow bullet

*UAT ref: SPEC_EXP_AGENTSESSION_INITPROMPT (cross-entity scope) /
SPEC_UAT_AGENT_PROMPT_SCENARIOS T-14 (no per-kind branching)*

**Pre-condition:** `jarvis.agentSession.initPromptTemplate` is not set.

**Test data:** A new event name, e.g. `Extract Overflow Test Event`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run **Jarvis: New Entity** → select **Event**. Enter event name `Extract Overflow Test Event` and any description. | New event folder is created; a Copilot agent chat opens. | |
| 2 | Verify `${kind}` is rendered as `event`. | `kind` is `event`. | |
| 3 | Verify the extract-overflow bullet appears verbatim (same text as TC-1, step 3). | Bullet is present and identical to the session/project variant. | |
| 4 | Verify the bullet is the last item in the discipline list. | Bullet is last; nothing follows it in the list. | |
| 5 | **Teardown:** Delete the new event folder created under `testdata/events/`. | Folder removed. | |

---

## Group C — Non-Regression on Existing Five Bullets

### TC-5 — Existing five discipline bullets are present, unchanged, and in correct order

*UAT ref: SPEC_EXP_AGENTSESSION_INITPROMPT (DEFAULT_INIT_PROMPT bullet set) —
non-regression check*

**Pre-condition:** `jarvis.agentSession.initPromptTemplate` is not set.

**Test data:** A new session name, e.g. `nonreg-test-session`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Create a new session named `nonreg-test-session`. | Copilot agent chat opens. | |
| 2 | In the chat message, locate the "Keep it minimal and action-oriented:" section. Verify bullet **1** reads exactly:<br>`- Store only long-lived items under Decision / Finding / Next.` | Exact text matches. | |
| 3 | Verify bullet **2** reads exactly:<br>`- One concise line per bullet. Prune aggressively.` | Exact text matches. | |
| 4 | Verify bullet **3** reads exactly:<br>`- Replace outdated bullets — never append logs.` | Exact text matches. | |
| 5 | Verify bullet **4** reads exactly:<br>`- Never store retries, raw tool output, or transient chatter.` | Exact text matches. | |
| 6 | Verify bullet **5** reads exactly:<br>`- Before writing, ask: "Will this still matter in 2 weeks?" If no, skip.` | Exact text matches. | |
| 7 | Verify bullet **6** (the new one) reads exactly as in TC-1, step 3. | Exact text matches. | |
| 8 | Verify there are exactly **6** bullets in the list (no duplications or deletions). | Bullet count is 6. | |
| 9 | **Teardown:** Delete the `testdata/.jarvis/sessions/nonreg-test-session/` folder. | Folder removed. | |

---

## Group D — Override Not Affected

### TC-6 — Custom template override still suppresses the default (regression guard)

*UAT ref: SPEC_UAT_AGENT_PROMPT_SCENARIOS T-3 (unchanged behavior) —
regression guard ensuring the change did not break the override path*

**Pre-condition:** Set `jarvis.agentSession.initPromptTemplate` (Workspace Settings) to
`Role: ${kind} ${name}. Memory: ${contextPath}.`

**Test data:** Session name `override-guard-test`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Open Settings UI (`Ctrl+,`), search `jarvis prompt template`, and paste the override value above. | Setting saved. | |
| 2 | Create a new session named `override-guard-test`. | Copilot agent chat opens. | |
| 3 | Verify the chat contains exactly the override text (with substitutions) and **not** the "Keep it minimal and action-oriented:" section. | Override text present; default bullet list absent. | |
| 4 | **Teardown:** Clear the `jarvis.agentSession.initPromptTemplate` setting back to empty. Delete the `testdata/.jarvis/sessions/override-guard-test/` folder. | Setting cleared; folder removed. | |

---

## Test Summary

| ID | Group | Description | AC traced |
|----|-------|-------------|-----------|
| TC-1 | A | Extract-overflow bullet present verbatim (session) | SPEC_EXP_AGENTSESSION_INITPROMPT (bullet wording); T-14 |
| TC-2 | A | Extract-overflow bullet is last item in discipline list | SPEC_EXP_AGENTSESSION_INITPROMPT (position); T-14 |
| TC-3 | B | Prompt for project entity contains the bullet identically | SPEC_EXP_AGENTSESSION_INITPROMPT (cross-entity); T-14 |
| TC-4 | B | Prompt for event entity contains the bullet identically | SPEC_EXP_AGENTSESSION_INITPROMPT (cross-entity); T-14 |
| TC-5 | C | Existing five bullets unchanged in wording and order | SPEC_EXP_AGENTSESSION_INITPROMPT (non-regression) |
| TC-6 | D | Custom override still suppresses default (regression guard) | SPEC_UAT_AGENT_PROMPT_SCENARIOS T-3 |

**Total test cases: 6**

---

## Testability Notes

All six scenarios are fully manually executable in the Extension Development Host with
the `testdata/test.code-workspace` fixture. No automated test runner is required.
No untestability concerns identified.
