# Change Document: prompt-injection-tool

**Status**: in-progress
**Branch**: feature/prompt-injection-tool
**Created**: 2026-07-24
**Author**: PM
**Operation Mode**: user-guided

**GitHub Issue(s)**: #43

---

## Summary

Expose Jarvis's existing prompt-injection mechanism as a reusable tool
(`jarvis_injectPrompt(actor, text)`) plus a command, so that any prompt or
slash-command — notably `/compact`, but also `/rename` and free-form text — can
be injected directly into the chat input of a named actor's session (opening or
spawning that actor's session if none is live; targeting a registered actor /
project / event, never an arbitrary leftover session). Today this injection
primitive is hard-wired at three internal call sites — session-start init
prompt, message-notification stub, and `/rename` — and is not exposed, so agents
and users cannot programmatically trigger slash-commands such as `/compact`
(these cannot travel through the Jarvis message queue, since a queued "/compact"
is merely text an agent reads rather than an executed command). The change also
consolidates those three existing call sites onto the single new primitive so
the injection logic lives in exactly one place. This unblocks GitHub issue #22
(auto-compact sessions after a completed CR): with the tool in place, a user, a
heartbeat job, or the syspilot PM can loop over `jarvis_listActors` and inject
`/compact` per actor — no CR-coupling, participant-tracking, or dedicated
broadcast/automation is needed. Acceptance: injecting `/compact` into an actor
demonstrably compacts that actor's session, and session-start init, message
notification, and `/rename` all route through the single consolidated primitive.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_ENT_AGENTSESSION_PROMPT | Disciplined & Configurable Agent-Session Init Prompt | modified | AC-5/AC-6 injection logic moves to the new primitive; template expansion stays |
| US_MSG_CHATQUEUE | Chat Message Queue | modified | AC-4 notification injection becomes a consumer of the new primitive |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_INJ_INJECT | Prompt Injection Primitive — single primitive for all session communication | mandatory |

### Decisions

- D1: New theme **INJ** (Prompt Injection) — the primitive is foundational to all session communication; it doesn't belong in MSG (which is one consumer) or ENT (which is tree/entity metadata). Own theme, own files.
- D2: Single US, not two — the primitive *is* the consolidation; splitting "new capability" from "refactoring" would be artificial since one doesn't exist without the other.
- D3: `/rename` listed as AC-7 with an exception clause — it targets the focused editor, not a named entity, so it may legitimately stay outside the primitive's entity-resolution pipeline.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_MSG_CHATQUEUE and US_ENT_AGENTSESSION_PROMPT retain their domain concerns (queue storage, template content); only the injection mechanism moves to US_INJ_INJECT
- [x] Gaps identified and addressed — `/rename` exception acknowledged in AC-7

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_SEND | US_MSG_CHATQUEUE | modified | AC-6..AC-8 session-resolve + inject pipeline to be replaced by `REQ_INJ_PRIMITIVE` call |
| REQ_MSG_AUTODELIVER_POLL | US_MSG_AUTODELIVERY | modified | AC-3, AC-8 duplicated injection pipeline to be replaced by `REQ_INJ_PRIMITIVE` call |
| REQ_ENT_AGENTPROMPT_TEMPLATE | US_ENT_AGENTSESSION_PROMPT | modified | AC-5 injection call sites to route through `REQ_INJ_PRIMITIVE`; template expansion stays here |
| REQ_MSG_AGENTSESSION | US_MSG_STABLESESSION | modified | AC-1..AC-4 init sequence (rename + init prompt) absorbed by `REQ_INJ_PRIMITIVE` AC-4 |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_INJ_PRIMITIVE | Prompt Injection Primitive | US_INJ_INJECT | mandatory |
| REQ_INJ_TOOL | Prompt Injection LM Tool | US_INJ_INJECT; REQ_INJ_PRIMITIVE | mandatory |
| REQ_INJ_COMMAND | Prompt Injection Command | US_INJ_INJECT; REQ_INJ_PRIMITIVE | mandatory |

### Conflicts Detected

- ⚠️ REQ_INJ_PRIMITIVE AC-6 vs REQ_MSG_SEND AC-6..AC-8 + REQ_MSG_AUTODELIVER_POLL AC-3/AC-8: **non-exclusive** — the same session-resolve → open/create → mode-prime → inject pipeline is currently specified in three places. REQ_INJ_PRIMITIVE AC-6 mandates a single call site; the consumer REQs must delegate to it.
  - Resolution: REQ_MSG_SEND and REQ_MSG_AUTODELIVER_POLL will be amended at Level 2 to replace their inline injection logic with a call to `injectPrompt()`. Their ACs that describe session resolution, mode priming, and text injection become "delegate to REQ_INJ_PRIMITIVE" references.
- ⚠️ REQ_INJ_PRIMITIVE AC-4 vs REQ_MSG_AGENTSESSION AC-1..AC-4: **non-exclusive** — the agent session init sequence (open chat, rename, send init prompt) is currently specified in REQ_MSG_AGENTSESSION and will be absorbed by the primitive's spawn-session path.
  - Resolution: REQ_MSG_AGENTSESSION's init sequence ACs will reference REQ_INJ_PRIMITIVE; the rename and init prompt steps become part of the primitive's session-spawn logic.

### Decisions

- D1: `REQ_ENT_AGENTPROMPT_TEMPLATE` retains ownership of template content, placeholder definitions, and setting registration. Only the *injection mechanism* moves to INJ. Clean separation: ENT defines *what* to inject, INJ defines *how*.
- D2: Three new REQs (primitive, tool, command) rather than one monolithic REQ — the primitive is internal API, the tool and command are distinct exposure surfaces with their own UX contracts.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [ ] **Redundancies detected** — REQ_MSG_SEND, REQ_MSG_AUTODELIVER_POLL, and REQ_MSG_AGENTSESSION each specify their own injection pipeline; REQ_INJ_PRIMITIVE consolidates this. Flagged as conflicts above with resolutions.
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_ENT_AGENTSESSION | REQ_ENT_AGENTSESSION | modified | Inline session-resolve + mode-prime + inject code block replaced by init prompt composition + `injectPrompt()` call |
| SPEC_MSG_SENDCOMMAND | REQ_MSG_SEND | modified | Inline session-resolve + inject logic replaced by `injectPrompt()` call |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_AUTODELIVER_POLL | modified | Inline session-resolve + inject logic replaced by `injectPrompt()` call, wrapped in focus-snapshot/restore |
| SPEC_MSG_AGENTSESSION | REQ_MSG_AGENTSESSION | modified | Inline new-session sequence replaced by `injectPrompt()` call with `skipInitPrompt: true` |
| SPEC_ENT_AGENTSESSION_INITPROMPT | REQ_ENT_AGENTPROMPT_TEMPLATE | modified | Template expansion stays; trigger-point list updated to note that injection routes through `SPEC_INJ_INJECT` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_INJ_INJECT | Prompt Injection Primitive | REQ_INJ_PRIMITIVE |
| SPEC_INJ_TOOL | Prompt Injection LM Tool | REQ_INJ_TOOL; SPEC_INJ_INJECT |
| SPEC_INJ_COMMAND | Prompt Injection Command | REQ_INJ_COMMAND; SPEC_INJ_INJECT |

### Conflicts Detected

- ⚠️ SPEC_INJ_INJECT vs SPEC_MSG_SENDCOMMAND (lines 200–270): **non-exclusive** — SPEC_MSG_SENDCOMMAND currently implements its own session-resolve → open/create → mode-prime → inject pipeline. SPEC_INJ_INJECT absorbs this as the single implementation.
  - Resolution: SPEC_MSG_SENDCOMMAND replaces its inline logic with `await injectPrompt(node.destination, stub, { placement: 'main' })`.
- ⚠️ SPEC_INJ_INJECT vs SPEC_MSG_AUTODELIVER_POLL (lines 1130–1190): **non-exclusive** — same duplicated pipeline.
  - Resolution: SPEC_MSG_AUTODELIVER_POLL replaces its inline logic with `await injectPrompt(sessionName, stub, { placement: 'secondary' })`, keeping focus-snapshot/restore as the caller's responsibility.
- ⚠️ SPEC_INJ_INJECT vs SPEC_MSG_AGENTSESSION (steps 1–6): **non-exclusive** — the full new-session sequence (mode-prime, open, rename, init prompt) is absorbed by the primitive's spawn path.
  - Resolution: SPEC_MSG_AGENTSESSION replaces its inline sequence with `await injectPrompt(entity.name, initPrompt, { skipInitPrompt: true })`.

### Decisions

- D1: `injectPrompt` takes an `options.placement` parameter (`'main'` | `'secondary'`) to support both user-initiated (Main) and system-initiated (Secondary) placement targets. Default is `'main'`.
- D2: `injectPrompt` takes an `options.skipInitPrompt` flag for callers like `openAgentSession` that pass their own init prompt as `text` — avoids double-injection.
- D3: Focus-snapshot/restore is NOT part of the primitive — callers that need it (auto-delivery) wrap the call. Keeps the primitive single-purpose.
- D4: `/rename` stays as an inline helper within the primitive's spawn sequence — it targets the focused editor, not a named entity, so it's not a consumer of `injectPrompt`.
- D5: Error handling: entity-not-found throws; all other errors propagate. No error swallowing in the primitive — callers decide UX (tool returns message, command shows warning, poll loop logs and continues).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [ ] **Redundancies detected** — three consumer SPECs currently implement their own injection pipeline; SPEC_INJ_INJECT consolidates this. Flagged as conflicts above with resolutions.
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_INJ_INJECT | REQ_INJ_PRIMITIVE | SPEC_INJ_INJECT | ✅ |
| US_INJ_INJECT | REQ_INJ_TOOL | SPEC_INJ_TOOL | ✅ |
| US_INJ_INJECT | REQ_INJ_COMMAND | SPEC_INJ_COMMAND | ✅ |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

For each removed artefact, run a project-wide grep on all plausible name variants and classify results:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `{artefact name}` | {files + lines fixed / none} | {files + lines fixed / none} | {count — acceptable historic stranding} |

- [ ] All class (a) active code/workflow references fixed in this CR
- [ ] All class (b) active documentation references fixed in this CR
- [ ] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue 1: ...
- [ ] Issue 2: ...

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** {DATE}

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L? | {ID} | {description} | high / medium / low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now / defer / accept-as-is | {rationale} |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
