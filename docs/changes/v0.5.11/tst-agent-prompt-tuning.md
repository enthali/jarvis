# Test Protocol: agent-prompt-tuning

**Date:** 2026-05-19
**Branch:** `feature/agent-prompt-tuning`
**Tester:** User (manual UAT in Extension Development Host, F5)
**Build:** TypeScript clean (`npm run compile`), Sphinx clean (`-W --keep-going -E`)

## Setup

- Workspace: `testdata/test.code-workspace`
- Existing session test data: `testdata/.jarvis/sessions/copilot-cm/` and `testdata/.jarvis/sessions/dev-feature-x/`
- All scenarios per `docs/design/spec_uat_agent_prompt_tuning.rst` (SPEC_UAT_AGENT_PROMPT_SCENARIOS).

## Results — Init Prompt (EXP)

| ID | Description | Result |
|---|---|---|
| T-1 | Default init prompt: new session via `+` button shows disciplined English default with absolute `context.md` path in backticks, "Use only" sentence, Decision/Finding/Next structure, 2-week gate question | **PASS** |
| T-2 | Placeholders `${kind}`, `${name}`, `${contextPath}` resolved correctly in default template | **PASS** |
| T-3 | Setting override `"Role: ${kind} ${name}. Memory: ${contextPath}."` renders exactly that one line with substitutions | **PASS** |
| T-4 | Empty setting `""` falls back to built-in disciplined English default | **PASS** |
| T-5 | Unknown placeholder `${nope}` left as-is; known `${name}` substituted | **PASS** |
| T-6 | Project entity (via `Jarvis: New Entity → Project`) shows `You are the project "..."` from default template | **PASS** |

## Results — Notification (MSG)

| ID | Description | Result |
|---|---|---|
| T-7 | Manual deliver-now (`Send Messages` action) shows new English default with `count=2` and `destination="TestSession"` | **PASS** |
| T-8 | Auto-delivery 5-second poll loop delivers identical English text with `count=1`; messages marked `notified:true` | **PASS** |
| T-9 | Setting override `"You have ${count} msgs for ${destination}."` renders exactly that text | **PASS** |
| T-10 | Empty notification setting falls back to built-in English default | **PASS** |
| T-11 | Unknown placeholder `${unknown}` left as-is; `${count}` substituted | **PASS** |

## Results — Settings UI (CFG)

| ID | Description | Result |
|---|---|---|
| T-12 | `jarvis.agentSession.initPromptTemplate` visible in Sessions group with disciplined English default value | **PASS** |
| T-13 | `jarvis.messages.notificationTemplate` visible in Messages group with English default value | **PASS** |

## MECE Findings

Round 1 — 2 Major + 1 Minor (commit `f3219e4`):
- M1: `SPEC_EXP_AGENTSESSION_INITPROMPT` showed stale `resolveInitPrompt` — replaced with shared `applyTemplate` helper.
- M2: `SPEC_CFG_MANIFEST` and `REQ_MSG_NOTIFICATION_TEMPLATE` clarified that `package.json` ships the full default text (not empty string).
- m1: Change document stale ID corrections (`jarvis.sendMessages`, `SPEC_MSG_SENDCOMMAND`, `SPEC_MSG_AUTODELIVER_POLL`).

## Summary

All 13 acceptance tests **PASS**.
Feature ready for merge to `develop`.
