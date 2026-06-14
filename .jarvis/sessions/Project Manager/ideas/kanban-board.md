# Idea: Kanban Board für Roadmap + CRs (+ optional Outlook-Tasks)

*Status: Idea / Brainstorm (2026-05-29)*
*Owner: PM*

## Was

Ein visuelles Board direkt in VS Code, das den Status von Backlog-Items und laufenden Change Requests sichtbar macht.

## Warum

- Roadmap-Markdown + `docs/changes/*.md` sind die Wahrheit, aber für „Überblick auf einen Blick" suboptimal
- PM-Workflow profitiert vom Spalten-Modell (Backlog → Planned → In Progress → Review → Done)
- Multi-CR-Phasen (wie `entity-parity` mit Designer/MECE/UAT-Checkpoints) wären visuell besser nachvollziehbar
- Tritt Konsistenzfragen früher zutage (z.B. „warum hängt Item X seit 3 Wochen in Review?")

## Open Design-Fragen

### 1. Datenquelle (Source of Truth)

| Option | Pro | Contra | Abhängigkeit |
|--------|-----|--------|--------------|
| (a) Markdown reuse | Bestehende Daten, kein neues Schema | Parsing brittle, status manuell pflegen | Markdown-Konvention |
| (b) Neues `roadmap.yaml`-Schema | Strukturiert, validierbar, eigenes Tool-Surface | Neuer Datentyp, mehr Pflege | YAML-Scanner-Erweiterung |
| (c) Outlook-Tasks via `jarvis_task` | Cross-Device, schon vorhandene Integration | Bindung an Microsoft-Stack, Outlook-Account Pflicht | PIM-Provider muss laufen |
| (d) Hybrid (b) + (c) | Beste UX (PM-pipeline in VS Code, persistente Tasks in Outlook) | Komplexer, zwei Daten-Modelle | beide |

### 2. Scope

- Nur Roadmap-Backlog (Pre-CR-Phase)?
- Auch aktive CRs (Status: Designer → Dev → QM → Merge)?
- Auch Outlook-Tasks pro Project/Event?
- Ein Board oder mehrere (Filter-basiert)?

### 3. Interaktion

- (a) Read-only Visualisierung (TreeView mit Spalten-Gruppierung — klein, schnell)
- (b) Webview mit Drag-Drop (Status durch Verschieben ändern — voller HTML/JS-Stack)
- (c) Marketplace-Extension nutzen (z.B. „Kanban", „VSCode Kanban") + unsere MD/YAML so formatieren, dass sie es lesen kann

### 4. Spalten

Vorschlag, abgeleitet von unserem Workflow:
- `Backlog` (Idee)
- `Planned` (in Roadmap, CR formuliert)
- `In Progress` (Branch offen)
- `Review` (UAT/QM)
- `Done` (gemerged)

Oder einfacher: `Todo / Doing / Done`.

## Abhängigkeiten zu externen Tools

- **Marketplace-Extension (Option c bei Interaktion):** Externes Plugin, Update-Drift-Risiko, evtl. eigener Schema-Zwang
- **Outlook (Option c/d bei Daten):** PIM-Provider muss laufen, Microsoft-Account, Categories-System; aber bereits existierende Jarvis-Integration via `jarvis_task`
- **Eigenbau:** keine externen Abhängigkeiten, voller Kontrolle, aber Implementierungsaufwand

## Mögliche Phasen-Aufteilung (wenn als CR formuliert)

1. `roadmap-schema` — YAML-Definition + Scanner-Erweiterung + `jarvis_listRoadmapItems` Tool
2. `kanban-view-readonly` — Webview mit Spalten-Rendering aus Daten
3. `kanban-interactive` (Phase 2) — Drag-Drop, Status-Persistierung
4. (optional) `kanban-outlook-tasks-integration` — Outlook-Tasks als zusätzliche Karten

## Sequencing

- Nicht vor `entity-parity`-Merge anfassen (Datenmodell könnte sich noch bewegen)
- Auch nicht vor `extension-modularization` Step 1–3 (sonst Monolith-Pfad-Konflikt)
- Realistisch: post-v0.7.0, eher v0.8.x Thema

## Status

Idee notiert. Noch keine CR-Entscheidung. PM wartet auf User-Input zu den 4 Open-Fragen oben.
