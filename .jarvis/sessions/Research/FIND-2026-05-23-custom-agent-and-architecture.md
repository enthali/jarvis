# FIND-2026-05-23 — Custom Agent Binding + Architecture Review

**Datum:** 2026-05-23

---

## Finding: workbench.action.chat.open { mode } akzeptiert Custom-Agent-Namen

`.github/agents/<name>.agent.md` ohne explizites `name:` Frontmatter → Mode = Dateiname ohne `.agent.md`. Validiert per Spike auf `experiment/agent-mode-spike` (commit `acd46bb`). Funktioniert produktiv, kein proposed API nötig.

---

## Decision: Agent-Binding pro Entity über `agent`-Feld in YAML

`session.yaml` `agent: <mode>` wird beim Öffnen an `workbench.action.chat.open` durchgereicht. Schema + UI-Picker + `jarvis_createSession`-Tool-Param implementiert. „No agent" als explizite Option vorhanden.

---

## Finding: Architecture Review erstellt — 11 Findings (F1–F11)

Dokument: `.jarvis/sessions/Research/architecture-review-2026-05.md`. Top 3 nach Priorität:

- **F5** — Frontend/Core-Trennung, unifizierte `findEntity` / `createEntity` / `openEntity` für alle 3 Kinds (Sessions ist Testballon, F5 generalisiert auf Events + Projects)
- **F11** — `extension.ts` ist 2484 Zeilen → Modularisierung in `features/<x>/index.ts`-Struktur
- **F1** — Heartbeat wird Polling-Bus für alles; System-Jobs von User-Jobs trennen

---

## Decision: Copilot Memory für Workflow-Wissen disabled

**Global User Settings:**
```
github.copilot.chat.tools.memory.enabled: false
github.copilot.chat.copilotMemory.enabled: false
```

**Begründung:** Workflow-Wissen = Code, gehört ins Repository, nicht in Copilots opaken AppData-Storage (siehe `.github/copilot-instructions.md`, Memory Considerations Section).

---

## Next: Tech-Debt-Abbau in den nächsten Tagen

CRs werden einzeln aus dem Review-Doc abgeleitet und an PM gegeben. Reihenfolge nach Prio-Tabelle im Review. Produktive Umsetzung läuft über `syspilot.cm` — Research liefert nur Findings.
