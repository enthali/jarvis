# Historical Findings — Research Archive

Index of research findings from past investigations. Each entry links to a detailed research document.

---

## FIND-2026-04-16 — Background Agent Sessions (Proposed APIs Research)

**Kurz:** VS Code proposed APIs = Sackgasse (Provider-Pattern). Copilot CLI headless ✅. SQLite `session-store.db` = shared state CLI ↔ VS Code. MCP-bridge ✅. Ping-Problem → PTY/Named-Pipe solutions.

**Detail:** [FIND-2026-04-16-background-agent-sessions.md](FIND-2026-04-16-background-agent-sessions.md)

---

## FIND-2026-04-17 — Experiments: VS Code Terminal Inject + node-pty

**Kurz:** WriteConsoleInput ❌ for Copilot CLI. node-pty PTY-wrapper ✅ (breakthrough). VS Code `terminal.sendText(text+'\r', false)` ✅ — no wrapper needed. No CLI+Chat View parallel. UUID preset via `--resume=<uuid>` ✅.

**Detail:** [FIND-2026-04-17-experiments-terminal-inject.md](FIND-2026-04-17-experiments-terminal-inject.md)

---

## FIND-2026-05-23 — Custom Agent Binding + Architecture Review

**Kurz:** `workbench.action.chat.open { mode }` akzeptiert Custom-Agent-Namen. Agent-Binding per `agent`-Feld in YAML. Architecture Review 11 Findings (F1–F11). Copilot Memory für Workflow-Wissen disabled.

**Detail:** [FIND-2026-05-23-custom-agent-and-architecture.md](FIND-2026-05-23-custom-agent-and-architecture.md)

---

## FI-2026-07-01 — EXP/SES Theme-Boundary-Inkonsistenz

**Kurz:** Drei Epochen desselben Entity-Konzepts (EXP alt / SES später / ENG generisch). Generische Cross-kind-Features fragmentiert + SPEC-doppelt. Wurzel: „Session" dreifach gebucht (Umbrella/Kind/Interaktion). **Konvergierte Entscheidung:** Umbrella = **Jarvis Entity**; Kinds = **Project/Event/Actor** (Kind „Session"→**Actor**, Hewitt-Aktormodell: Mailbox=Queue, State=context.md, Heartbeat/Auto-Delivery=Aktivator); „Session" retired (Plattform-Wort). Theme: generisch→ENT, Plumbing→ENG, Kinds→PRJ/EVT/ACT, EXP=Rahmen. Ein gestufter spec-only CR. Constraints: globale Adress-Eindeutigkeit, Cross-Instance-Messaging (A2A-Projekt).

**Detail:** [FI-2026-07-01-exp-ses-theme-boundary.md](FI-2026-07-01-exp-ses-theme-boundary.md)

---

## FI-2026-07-01 — Editor-Group-Placement für Actor-Sessions

**Kurz:** Interimslösung fürs Fokus-Hüpf-Problem bei Auto-Delivery (AHP löst das nur für CLI-Sessions, nicht VS-Code-Chat-Tabs). Drei semantische Ziele ohne festen Spalten-Vertrag: **Main** (Spalte 1, fest, Klick) · **Docs** (Spalte 2, fest, Entity-Files) · **Secondary** (letzte existierende Spalte, dynamisch, Delivery). Kein State nötig — nur Existenz-Check zur Laufzeit. Empirisch validiert im Spike (Close+Reopen robust, Auto-Split von fehlenden Spalten bestätigt, Auxiliary Windows transparent adressierbar). Drei Bugs gefunden+behoben (konfundierter Test, Runaway-Column-Creation, Chat-Tab-Snapshot ohne URI). **Phase 2 (Fokus-Restore) empirisch bestätigt und final validiert** — Fokus-Wechsel funktioniert einwandfrei. Die echte Produktiv-Mechanik (Chat-Query-Submission statt Datei-Edit) erwies sich als **robuster** als der erste Test-Stellvertreter (Datei-Edit-Rejection war ein Testartefakt, überträgt sich nicht auf echte Chat-Injection — bestand sogar vollen Keyboard-Autofire-Stresstest). Verbleibendes Mini-Risiko (1-2 Zeichen im ~520ms-Fenster bei exakt gleichzeitigem Tippen) ist praktisch irrelevant, da der Konsument ein LLM im Chat ist (tolerant gegenüber Tippfehlern). Kein weiterer Optimierungsbedarf für v1. Sidebar-Chat-View und Auxiliary-Window-als-Secondary geprüft und verworfen/zurückgestellt. Bereit für CR (Phase 1+2 zusammen).

**Detail:** [FI-2026-07-01-editor-group-placement.md](FI-2026-07-01-editor-group-placement.md)

---
