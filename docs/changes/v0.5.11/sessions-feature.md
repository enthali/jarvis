# Change: sessions-feature

**Status:** in-progress
**Branch:** feature/sessions-feature
**Mode:** autonomous
**Origin:** PM CR 2026-05-18

## Summary

Introduce a new entity type **Sessions** — a lightweight alternative to Projects
for development and work sessions. Functions like Projects but uses a leaner
schema (only `name` and `summary`) and is targeted at Copilot-agent sessions,
dev workflows, and short-lived work contexts. Independent of Projects/Events
toggles.

## Why

"Projects" as a label is confusing for developers (a VS Code workspace is also
a project). Sessions is a neutral term and fits Dev workflows, Copilot-agent
sessions, and shorter-lived work contexts.

## Schema (`session.yaml`)

```yaml
name: "my-feature"
summary: "Short description of what this is about"
```
Plus `context.md` in the same folder.

## Acceptance Criteria

1. New feature `jarvis.sessions.enabled` (default: **on**). Path configurable
   via `jarvis.sessions.folders` (list, like Projects).
2. Sessions tree in the sidebar (analogous to Projects tree), `contextValue`
   `jarvisSession`.
3. `session.yaml` schema with `name` and `summary` fields. JSON Schema in
   `schemas/session.schema.json`.
4. `jarvis.openContext` works on session nodes (opens `context.md`).
5. New LM+MCP tool `jarvis_listSessionEntities` returns the list of session
   entities (distinct from `jarvis_listSessions` which lists chat sessions).
6. `jarvis.newEntity` command supports session creation (alongside
   newProject/newEvent).
7. Sessions feature is independent of Projects/Events — can be active alone.

## Design Decisions

- **Tool naming**: `jarvis_listSessionEntities` (or `jarvis_listSessionFolders`)
  to avoid collision with the existing chat-session tool `jarvis_listSessions`.
  Final name decided at design time.
- **Scanner reuse**: Re-use `YamlScanner` (the existing convention-file
  scanner). Add `session.yaml` as a recognized leaf marker in addition to
  `project.yaml` / `event.yaml`. The scanner emits a third entity kind
  `'session'`.
- **Tree provider**: `SessionTreeProvider` mirroring `ProjectTreeProvider`
  (filter for `kind === 'session'`). No own filter UI in this CR (filtering
  parity with Projects/Events can be a follow-up).
- **Sessions folder default**: empty array. User must configure
  `jarvis.sessions.folders` to populate (same UX as Projects).
- **`jarvis.newEntity` UX**: command shows a QuickPick: Project / Event /
  Session. The Session branch creates a folder with `session.yaml` and
  `context.md`.
- **No Outlook/Category linkage** — Sessions are lightweight, no PIM
  integration in this CR.
- **Sessions path is fixed** under `<workspace>/.jarvis/sessions/` (no user
  setting). Aligned with messages / reminders / heartbeat fixed-path pattern.
- **Init prompt is identity-style** and lives in `spec_exp.rst` because it
  benefits all entity kinds (projects, events, sessions). The triggering
  requirement (`REQ_SES_AGENTPROMPT`) lives in `req_ses.rst` as part of this CR.

## Process Log

- 2026-05-18 — Initial spec written. Design decision: reuse YamlScanner;
  SessionTreeProvider modelled on ProjectTreeProvider.
- 2026-05-18 — User UAT iteration 1 found Sessions defaulted to
  `<workspace>/sessions` (not `.jarvis`). PM accepted design pivot: fixed path
  under `.jarvis/sessions/`, drop `jarvis.sessions.folders` setting.
  Implemented in `c61ef75`.
- 2026-05-19 — User UAT iteration 2 found no `+` button and no
  **Open Agent Session** context entry on the Sessions view. Added
  `jarvis.newSession`, view/title `+` and Rescan buttons, full context-menu
  parity with Projects/Events. Implemented in `89e4439`.
- 2026-05-19 — User UAT iteration 3 requested better init prompt
  (identity-style, with `context.md` path explanation) and auto-open on create.
  Implemented in `c5ace8a`.
- 2026-05-19 — Spec-sync pass: added `REQ_SES_CONTEXTMENU`,
  `REQ_SES_AGENTPROMPT`, `SPEC_SES_CONTEXTMENU`, `SPEC_EXP_AGENTSESSION_INITPROMPT`;
  updated UAT (T-4, T-5, +T-5a, +T-11) and Change Document.

## Affected Specs

| Level | ID | File | Change |
|---|---|---|---|
| US | `US_SES_SESSIONS` (new) | `docs/userstories/us_ses.rst` | new story (theme SES) |
| REQ | `REQ_SES_TOGGLE` (new) | `docs/requirements/req_ses.rst` | feature toggle + folder setting |
| REQ | `REQ_SES_SCHEMA` (new) | `docs/requirements/req_ses.rst` | session.yaml schema |
| REQ | `REQ_SES_TREE` (new) | `docs/requirements/req_ses.rst` | tree view |
| REQ | `REQ_SES_NEWENTITY` (new) | `docs/requirements/req_ses.rst` | newEntity supports Session |
| REQ | `REQ_SES_LISTTOOL` (new) | `docs/requirements/req_ses.rst` | LM+MCP listSessionEntities tool |
| REQ | `REQ_SES_OPENCONTEXT` (new) | `docs/requirements/req_ses.rst` | openContext on session |
| SPEC | `SPEC_SES_SCANNER` (new) | `docs/design/spec_ses.rst` | YamlScanner extension |
| SPEC | `SPEC_SES_TREE` (new) | `docs/design/spec_ses.rst` | SessionTreeProvider |
| SPEC | `SPEC_SES_SCHEMA` (new) | `docs/design/spec_ses.rst` | session.schema.json + package.json yamlValidation |
| SPEC | `SPEC_SES_TOOLS` (new) | `docs/design/spec_ses.rst` | tool registration |
| SPEC | `SPEC_SES_MANIFEST` (new) | `docs/design/spec_ses.rst` | package.json view + settings entries |
| REQ | `REQ_SES_CONTEXTMENU` (new) | `docs/requirements/req_ses.rst` | session context-menu parity |
| REQ | `REQ_SES_AGENTPROMPT` (new) | `docs/requirements/req_ses.rst` | agent-session identity prompt |
| SPEC | `SPEC_SES_CONTEXTMENU` (new) | `docs/design/spec_ses.rst` | view/item/context entries for jarvisSession |
| SPEC | `SPEC_EXP_AGENTSESSION_INITPROMPT` (new) | `docs/design/spec_exp.rst` | identity prompt template (cross-entity) |
| SPEC | `SPEC_CFG_MANIFEST` (update) | `docs/design/spec_cfg.rst` | fill Sessions group with jarvis.sessions.enabled only (paths are fixed under .jarvis/sessions/) |
| SPEC | `SPEC_CFG_PATHRESOLVER` (update) | `docs/design/spec_cfg.rst` | Added getSessionsDir() and ensureSessionsDir() helpers |

## Theme

New theme code **SES** (Sessions). Added to copilot-instructions.md theme list.

## Process Log

- 2026-05-18: PM submitted CR. CM accepted (autonomous mode).
- 2026-05-18: Branch `feature/sessions-feature` created from `develop` (post CR1 merge).
- 2026-05-18: Change document created.
