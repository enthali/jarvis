# Change: agent-prompt-tuning

**Status:** completed
**Branch:** feature/agent-prompt-tuning
**Mode:** autonomous
**Origin:** User observation 2026-05-19 (during CR2 UAT), PM-approved

## Summary

Tighten and make configurable two agent-facing string templates:

1. The identity-style **init prompt** sent to a newly opened agent chat session
   (too open-ended today — agents fill `context.md` like a data dump).
2. The **auto-delivery notification** prompt ("[Jarvis Message Service] Du hast
   N neue Nachrichten…") — currently German-only and hardcoded; needs to be
   English by default and user-configurable.

Both are short string templates with `${...}` placeholders driving agent
messaging, so they share the same substitution mechanism and ship together.

## Why

- `context.md` was designed as a small, action-oriented persistent memory.
- The current default init prompt does not communicate that intent, so agents
  append unbounded logs, raw tool output, and transient chatter.
- The auto-delivery notification is hardcoded in German, which breaks
  English-speaking sessions and cannot be customised.
- Different users / projects want different conventions — both prompts must be
  user-configurable.

## Scope

1. **Disciplined default init prompt** with clear authoring rules:
   - "Read it now" at the start (forces initial load).
   - "Use only `context.md` as persistent memory."
   - Structure: only Decision / Finding / Next bullets.
   - One concise line per bullet, prune aggressively, replace instead of append.
   - No retries / raw tool output / transient chatter.
   - "Will this still matter in 2 weeks?" as gate question.
2. **Configurable via Settings — init prompt**: new
   `jarvis.agentSession.initPromptTemplate` (string) with placeholders
   `${kind}`, `${name}`, `${contextPath}`. Default = the tuned prompt above.
3. **English auto-delivery notification by default** — replace the hardcoded
   German text with an English default.
4. **Configurable via Settings — notification**: new
   `jarvis.messages.notificationTemplate` (string) with placeholders `${count}`
   and `${destination}`. Default = the new English text.
5. **Backward-compatible**: existing behaviour (auto-open chat, /rename,
   identity prompt, 5-second poll loop, `notified:true` marking) is preserved.
   Only the prompt and notification texts and their sources change.

## Out of Scope

- Per-entity-kind separate templates (one template handles all kinds via
  `${kind}` placeholder).
- Variable interpolation beyond the three documented placeholders.
- Migration of existing `context.md` files.

## Design Decisions (initial)

- **Two settings, one substitution helper** — keep configuration minimal but
  factor out a single private `applyTemplate(template, vars)` helper in
  `extension.ts` so both templates share the same substitution rules.
- **Placeholders (init prompt)**: `${kind}`, `${name}`, `${contextPath}`
  (absolute path).
- **Placeholders (notification)**: `${count}`, `${destination}`.
- **Substitution rules** (shared): unknown placeholders left as-is (no error);
  missing values render empty; empty/whitespace-only setting falls back to the
  built-in default.
- **Setting groups**:
  - `jarvis.agentSession.initPromptTemplate` → **Sessions** group
    (heading "Agent Session").
  - `jarvis.messages.notificationTemplate` → **Messages** group
    (heading "Notification").
- **Code locations**:
  - Init prompt: `openAgentSessionCommand` in `src/extension.ts` (already
    central — used by `jarvis.openAgentSession` and indirectly by
    `jarvis.newSession`).
  - Notification: two call sites in `src/extension.ts` (deliver-now path inside
    `jarvis.sendMessages` ~ line 650, and auto-delivery 5-second poll loop
    ~ line 1848). Both must read the setting via the same helper.
- **Default notification text** (English): `[Jarvis Message Service] You have
  ${count} new message(s) in your inbox.\nRead them with the jarvis_readMessage
  tool (destination: "${destination}") until remaining = 0.`
- **Spec location**: `SPEC_EXP_AGENTSESSION_INITPROMPT` (cross-entity)
  covers the init prompt; `SPEC_MSG_SENDCOMMAND` and `SPEC_MSG_AUTODELIVER_POLL` are updated for the
  notification; both settings are listed in `SPEC_CFG_MANIFEST`.

## Affected Specs (planned)

| Level | ID | File | Change |
|---|---|---|---|
| US | `US_EXP_AGENTSESSION_PROMPT` (new) | `docs/userstories/us_exp.rst` | User story for disciplined + configurable init prompt |
| US | `US_MSG_NOTIFICATION_TEMPLATE` (new) | `docs/userstories/us_msg.rst` | User story for English-by-default + configurable notification |
| REQ | `REQ_EXP_AGENTPROMPT_TEMPLATE` (new) | `docs/requirements/req_exp.rst` | Setting + placeholders + default content (init prompt) |
| REQ | `REQ_MSG_NOTIFICATION_TEMPLATE` (new) | `docs/requirements/req_msg.rst` | Setting + placeholders + English default content (notification) |
| SPEC | `SPEC_EXP_AGENTSESSION_INITPROMPT` (update) | `docs/design/spec_exp.rst` | Template substitution, default text, placeholders |
| SPEC | `SPEC_MSG_SENDCOMMAND` (update) | `docs/design/spec_msg.rst` | Manual deliver-now path: replace hardcoded German stub with template substitution |
| SPEC | `SPEC_MSG_AUTODELIVER_POLL` (update) | `docs/design/spec_msg.rst` | Replace hardcoded German stub with template substitution; English default |
| SPEC | `SPEC_CFG_MANIFEST` (update) | `docs/design/spec_cfg.rst` | Two new settings: `jarvis.agentSession.initPromptTemplate` (Sessions group), `jarvis.messages.notificationTemplate` (Messages group) |

## Process Log

- 2026-05-19: User observed prompt is too open-ended during CR2 UAT.
  Proposed content-discipline rules and configurable template.
- 2026-05-19: CM agreed; PM approved separate CR after CR2 merge.
- 2026-05-19: CR2 merged (`ea1f9d4`). Branch `feature/agent-prompt-tuning`
  created from `develop`.
- 2026-05-19: Change document created.
- 2026-05-19: System Designer wrote all spec artifacts (autonomous run):
  - `US_EXP_AGENTSESSION_PROMPT` (new, draft) in `docs/userstories/us_exp.rst`
  - `REQ_EXP_AGENTPROMPT_TEMPLATE` (new, draft) in `docs/requirements/req_exp.rst`
  - `SPEC_EXP_AGENTSESSION_INITPROMPT` (updated: status→draft, links extended,
    description rewritten to cover template substitution, new default content,
    placeholder definitions, fallback rule, trigger points)
  - `SPEC_CFG_MANIFEST` (updated: `REQ_EXP_AGENTPROMPT_TEMPLATE` added to links;
    `jarvis.agentSession.initPromptTemplate` added to Sessions group in JSON block)
  - Sphinx build verified clean (no warnings).
- 2026-05-19: PM scope addition — fold auto-delivery notification template
  into this CR (English default + configurable via
  `jarvis.messages.notificationTemplate`). Scope, Design Decisions, and
  Affected Specs updated accordingly. System Designer re-invoked to add the
  MSG-side artifacts (US_MSG_NOTIFICATION_TEMPLATE, REQ_MSG_NOTIFICATION_TEMPLATE,
  SPEC_MSG_SENDCOMMAND update, SPEC_MSG_AUTODELIVER_POLL update, SPEC_CFG_MANIFEST second-setting update).
- 2026-05-19: System Designer wrote all MSG-side spec artifacts (autonomous run):
  - `US_MSG_NOTIFICATION_TEMPLATE` (new, draft) in `docs/userstories/us_msg.rst`
    — user story for English-by-default + configurable notification template;
    5 ACs covering default language, setting override, placeholders, both
    delivery paths, and empty-string fallback.
  - `REQ_MSG_NOTIFICATION_TEMPLATE` (new, draft) in `docs/requirements/req_msg.rst`
    — setting name, type, scope, group, verbatim built-in default text,
    placeholder substitution rules, shared `applyTemplate` helper mandate,
    no-cache read-on-delivery requirement.
  - `SPEC_MSG_SENDCOMMAND` (updated: status→draft; `REQ_MSG_NOTIFICATION_TEMPLATE`
    added to links; stub-format block replaced with `applyTemplate` call
    referencing the setting and shared helper; code block updated accordingly).
  - `SPEC_MSG_AUTODELIVER_POLL` (updated: status→draft;
    `REQ_MSG_NOTIFICATION_TEMPLATE` added to links; hardcoded German stub in
    tick-logic code block replaced with `applyTemplate` call).
  - `SPEC_CFG_MANIFEST` (updated: `REQ_MSG_NOTIFICATION_TEMPLATE` added to
    links; `jarvis.messages.notificationTemplate` string setting added to
    Messages group in JSON block alongside existing `jarvis.messages.logging`).
  - Sphinx build verified clean (no warnings).- 2026-05-19: Test Engineer wrote all UAT artifacts (autonomous run):
  - `US_UAT_APT_INITPROMPT` (new, implemented) — T-1..T-6 init prompt scenarios.
  - `US_UAT_APT_NOTIFICATION` (new, implemented) — T-7..T-13 notification + CFG scenarios.
  - `REQ_UAT_APT_INITPROMPT` (new, implemented) — test data + ACs for T-1..T-6.
  - `REQ_UAT_APT_NOTIFICATION` (new, implemented) — test data + ACs for T-7..T-11.
  - `REQ_UAT_APT_CFG` (new, implemented) — test data + ACs for T-12..T-13.
  - `SPEC_UAT_AGENT_PROMPT_SCENARIOS` (new, implemented) — 13-row expected-outcomes table.
  - All three files wired into `us_uat.rst`, `req_uat.rst`, `spec_uat.rst` toctrees.
  - Sphinx build verified clean (no warnings).
- 2026-05-19: Dev Engineer implemented all code changes (autonomous run):
  - `src/extension.ts`: Added `applyTemplate()` helper; replaced hardcoded init prompt in `openAgentSessionCommand` with `jarvis.agentSession.initPromptTemplate` setting + disciplined default; replaced German notification stub in both deliver-now path (~line 650) and auto-delivery poll loop (~line 1848) with `jarvis.messages.notificationTemplate` setting + English default.
  - `package.json`: Added `jarvis.agentSession.initPromptTemplate` to Sessions group and `jarvis.messages.notificationTemplate` to Messages group (both with `editPresentation: multilineText`, scope: window).
  - Promoted to `implemented`: `US_EXP_AGENTSESSION_PROMPT`, `US_MSG_NOTIFICATION_TEMPLATE`, `REQ_EXP_AGENTPROMPT_TEMPLATE`, `REQ_MSG_NOTIFICATION_TEMPLATE`, `SPEC_EXP_AGENTSESSION_INITPROMPT`, `SPEC_MSG_SENDCOMMAND`, `SPEC_MSG_AUTODELIVER_POLL` (SPEC_CFG_MANIFEST was already implemented).
  - `.github/copilot-instructions.md`: Updated extension.ts description to mention `applyTemplate()` and both configurable templates.
  - TS compile: clean. Sphinx build: clean (0 warnings).
- 2026-05-19: MECE Round 1 — 2 Major + 1 Minor findings, all fixed in `f3219e4`
  (M1: stale `resolveInitPrompt` in spec_exp.rst → shared `applyTemplate`;
  M2: spec_cfg.rst + req_msg.rst clarified package.json ships full default
  text; m1: stale IDs in change doc corrected). Sphinx clean after fixes.
- 2026-05-19: User UAT — all T-1..T-13 PASS. PM granted merge approval.
  Test protocol written to `docs/changes/tst-agent-prompt-tuning.md`.