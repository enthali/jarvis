# Jarvis Roadmap

*Last updated: 2026-06-17*

## Current State

- **Latest release:** v0.7.0 "Entity Parity (BREAKING)" (2026-06-03) — tag `v0.7.0`, pushed to origin, installed on dev instance
- **develop HEAD:** `75fd390` clean, compile + tests green (44/44)
- **No open feature branches**

## On develop (next release candidates — bundled into v0.8.0)

| Change | Merged | Notes |
|--------|--------|-------|
| `remove-open-recording-icon` | `a3a5d45` | Removed the dead per-entity recording icon (resolved B-1). Closed v0.7.0 entity-parity risk #1. |
| `initprompt-extract-overflow` | `658fb59` | Default init prompt gains the extract-to-file rule (lean context.md ↔ knowledge graph). |
| `listprojects-shape-parity` | `4ef7d38` | `jarvis_listProjects` now returns `{name, summary, agent, folder}` (resolved F-18). |

> Decision (2026-06-17): no intermediate v0.7.1 — these three ship bundled with the modularization as **v0.8.0**.

---

## Backlog — Bugs / Tech Debt (small, ready to pick)

| Change | Priority | Origin | Scope |
|--------|----------|--------|-------|
| `chat-burst-race-fix` | MEDIUM | B-2 (v0.7.0) | Fast successive session-clicks (8–9 in a burst) cause init-prompts to land in wrong chat windows + occasional empty chat. Reproduction is non-deterministic. |
| `scanner-warn-channel` | MEDIUM | B-3/B-4/B-5 (v0.7.0) | Scanner currently emits warnings via `console.warn` (invisible). Route through shared `OutputChannel` + add missing WARNs (e.g. project/event with `agent` key but missing string value). |
| `lint-config-eslint9` | MEDIUM | B-8 (v0.7.0 release) | `npm run lint` fails — `eslint.config.js` missing (ESLint 9 migration). Pre-existing since v0.5.x, now release-blocker-adjacent. |
| `auto-delivery-destination-lifecycle` | LOW | B-7 (v0.7.0) | UAT gap: registered destination disappears mid-job → fire-time soft-skip works, but no explicit user-facing path tested for the "destination removed after register" lifecycle. |
| `spec-helper-orphan-cleanup` | LOW | pre-v0.6.0 | Multiple orphaned helper specs: `SPEC_MSG_SENDPROMPT`, `SPEC_MSG_AGENTSESSION` step-3, `openPinnedResource()` drift. Decision per helper: introduce in code OR deprecate spec. Spec-refactor (Designer beteiligen). |
| `doc-cosmetic-cleanup` | LOW | F-10/F-12/F-15 (v0.7.0) | Test-plan agent-name mismatches with testdata, T-14 expectation wording, scanner-WARN doc gaps. *(F-18 listProjects shape resolved by `listprojects-shape-parity`.)* |
| `readme-tools-refresh` | LOW | CM (2026-06-12) | README "Message Queue & Session Tools" omits `listProjects`/`listEvents`/`createProject`/`createEvent` entirely (gap from v0.4.0/v0.7.0). Housekeeping doc CR. |

> **Resolved & merged:** `recording-feature-decision` (B-1) → `remove-open-recording-icon`; `doc-cosmetic-cleanup` F-18 → `listprojects-shape-parity`.

---

## Backlog — Process / Upstream (syspilot maintainer)

| Item | Priority | Notes |
|------|----------|-------|
| `syspilot-duty-hygiene` | MEDIUM | Manager-Agent files (PM, CM) mix outcome-formulated duties with prozedurale Workflow-Steps. Cleanup: Duties = nur outcomes, Step-Material in Workflow konsolidieren. Bereits eine falsche Duty (`Post-Release-Instance-Update`) in Jarvis-PM entdeckt + lokal entfernt. |
| `syspilot-delegation-norm` | MEDIUM | Manager-Agents tendieren zu defensive-verbose Subagent-Prompts, die Specialist-Workflows überschreiben. Konkretes Schadensbeispiel: v0.7.0 Tag-Push entfiel weil PM "do not push to origin" als Pauschal-Verbot kommuniziert hat. Norm jetzt lokal in `copilot-instructions.md` verankert — gehört upstream ins Manager-Template. |

---

## Strategic / Larger Items

### Core/Add-on Modularization → v0.8.0 (ACTIVE EPIC)

**Status:** Planned, paused after planning (2026-06-17). Architecture decided, critical path **proven by spike**.

Split the monolithic `enthali.jarvis` into a kind-agnostic **session engine** (core) + optional **PIM** and **Recorder** add-ons via an IoC plugin registry. Core keeps id `enthali.jarvis` (in-place update). syspilot-only install = zero project/event surface.

- **Epic doc (CR chain A→B→C):** [docs/changes/v0.8.0-modularization-epic.md](../../../docs/changes/v0.8.0-modularization-epic.md)
- **Research report:** `.jarvis/sessions/Research/modularization-report.md`
- **Spike:** `experiments/spike-core` + `experiments/spike-addon` (branch `research-modularization`)
- **Tracking:** [enthali/jarvis#2](https://github.com/enthali/jarvis/issues/2)
- **Absorbs/retires:** F5, F11. **Re-scoped:** F1/F2/F10.
- **Next dispatch when resumed:** CR A1 (engine contract), optionally preceded by a pre-B0 characterization-test CR.

### Outlook Integration (v0.5.x feature-complete milestone)

**Status:** Categories + Tasks done (v0.5.0). Calendar/Contacts/Inbox geplant via **Script+Skill** (kein Extension-Code).

| Feature | Sidebar | Status |
|---------|---------|--------|
| Categories Sync | yes | done v0.5.0 |
| Tasks | yes | done v0.5.0 |
| Calendar | no | planned (Script+Skill) |
| Contacts | no | planned (Script+Skill) |
| Inbox | no | planned (Script+Skill) |

Constraint: Windows + Outlook Classic (COM), kein Graph/OAuth.

### Generic VS Code Command Bridge

`jarvis_executeCommand(commandId, args)` + Skill, damit Agents beliebige VS Code Commands ausführen können ohne eigene Tool-Wrapper. Eröffnet Automation-Surface massiv.

### Outlook Script+Skill Library

Wiederverwendbare PowerShell-Library für COM-Zugriff. Voraussetzung für Calendar/Contacts/Inbox.

### Detail Pages (Webview)

Webview-basierte Detail-Pages für Project/Event (Felder, Edit-UI). Aktuell nur Tree + raw YAML.

### Dashboard

Übersicht: Tasks, Due-Dates, Backlog-Trend, Recording-Coverage etc. Sammel-View über alle Provider.

### Teams Integration

TeamsProvider analog Outlook-Triplet (ITeamsProvider + DomainCache + Service).
- Read+Send: bereits via MCP Teams Tools möglich
- Mark-as-read: Playwright-Skript (deep-link nav, Teams markiert auto-read)
- Auth: funktional
- ToS-Graybereich für internen Use akzeptiert
- **Prerequisite:** Outlook feature-complete

### Calendar Auto-Recording

Calendar appointment startet → Recorder startet automatisch. Hängt an Calendar-Integration + Recording-Decision (B-1).

---

## Far Horizon

### RAG für Projects und Events

Wenn Projekte und Events Dokumente ablegen (context.md, Recording-Transkripte, Anhänge, Mail-Exporte, Spec-Snippets), wäre ein **per-Projekt/per-Event RAG-System** wertvoll: lokaler Vektor-Index pro Entity-Ordner, Agent kann gegen den Entity-Kontext semantisch abfragen ohne den gesamten Workspace zu durchsuchen.

Offene Fragen:
- Embedding-Modell: lokal (z.B. Ollama/llama.cpp) oder cloud?
- Index-Storage: pro-Entity `.rag/`-Subfolder oder zentral mit Entity-Tag?
- Re-Index-Trigger: file-watcher pro Entity-Ordner + manuelles `jarvis.reindex`?
- Tool-Surface: `jarvis_searchEntity({ entityName, query, topK })` als MCP-Tool
- Privacy: rein lokal, kein Cloud-Roundtrip

Voraussetzung: Recording stabil (B-1 decision), kritische Mass an Dokumenten pro Entity vorhanden.

---

## Research Closed

### CLI Agent Sessions (closed 2026-04-17)

VS Code proposed APIs (chatSessionsProvider, chatParticipantPrivate) sind Dead End — Provider-Pattern, kein Consumer-Inject. Copilot CLI + `terminal.sendText()` funktioniert (PoC implementiert + UAT bestanden), aber Blocker: Readiness-Detection fragil, MCP-Conflict bei Resume, Foreground-Requirement. Entscheidung: aktuelles Konzept (Chat View + Play Button + Message Queue) bleibt. `feature/cli-agent-sessions` als Referenz aufgehoben.

---

## Release History

| Version | Date | Theme |
|---------|------|-------|
| **v0.7.0** | 2026-06-03 | Entity Parity (BREAKING: listSessions tool-swap, listEvents+createProject+createEvent, KISS folder naming, 3-state agent scanner, unified openChatForEntity) |
| v0.6.1 | 2026-05-23 | Agent-mode + init-prompt hotfix (mode-primed creation pattern, default-include agent picker, verbatim session folder names) |
| v0.6.0 | 2026-05-22 | Agent-aware Sessions (session-agent-binding, destination validators for sendToSession + heartbeat queue, spec-timing-cleanup) |
| v0.5.11 | 2026-05-20 | Sessions stack v1 (BREAKING: settings reorg, sessions feature, reminders, listJobs, agent-prompt-tuning, createSession) |
| v0.5.10 | 2026-05-18 | Context-file auto-discovery + heartbeat pause/resume |
| v0.5.9 | 2026-05-07 | open-context inline button, devcontainer session lookup, heartbeat toast |
| v0.5.8 | 2026-05-05 | Hotfix: auto-delivery agent-mode reset |
| v0.5.7 | — | stable-session-open helpers |
| v0.5.6 | — | message-logging |
| v0.5.5 | — | auto-delivery (5-sec poll, notification template) |
| v0.5.4 | 2026-04-27 | hotfix |
| v0.5.3 | — | tree-search, settings-grp verification |
| v0.5.2 | — | tree-node-open-file |
| v0.5.1 | — | task-view-format, session-recording UI + watcher |
| v0.5.0 | — | Outlook categories + tasks |
| v0.4.0 | — | qa-doc, listProjects, settings-grp, context-actions, event-sort |
| v0.3.1 | — | qa-fix-critical, heartbeat-job-tools, sender-fix |
| v0.3.0 | — | Scanner Refresh, Heartbeat, MCP Server |

---

## Architecture Decisions

### CM Scope (2026-05-20)
Change Manager ist ausschliesslich für Product-Changes + Feature-Branches zuständig. Sonst nichts. Repo-Housekeeping, Session-State-Refresh, .jarvis/-Cleanup macht PM selbst oder delegiert an die jeweilige Session.

### .jarvis/ ist per-Installation privat (2026-05-20)
.jarvis/ (Sessions, heartbeat.yaml, autodelivery, messages, message-log) gehört NICHT ins Repo. Wholesale .jarvis/ in .gitignore. Default-Configs (z.B. Default-Heartbeat-Job) ggf. via Template in resources/ + Init-Logik bei erstem Start.

### Delegation Discipline (2026-06-04)
Verankert in `copilot-instructions.md`. Manager-Prompts an Subagents enthalten WAS/WARUM/INPUT/OUTPUT — niemals WIE. Specialist-Workflow nicht überschreiben.

### Change Docs flat in docs/changes/ (2026-06-04)
CRs werden flach in `docs/changes/<name>.md` angelegt, NICHT vorab in einen Versions-Subfolder. Versionierung passiert beim Release durch `syspilot.release` (Step 3: Archive). Vorgriff auf Release-Entscheidung ist falsch (CR könnte verschoben/zurückgehalten werden).
