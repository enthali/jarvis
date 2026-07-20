# FI-2026-06-28 — Hook Engine (Jarvis Core)

**Status:** MVP in Arbeit — Issue #17 / `hook-engine-mvp` (observe/log-only, bewusst vision-agnostisch). Vision-Layers 2/3 bleiben aus dem Change-Design raus.  
**Layer:** 1 von 3 (Fundament · **Jarvis Core**)  
**Verwandt:** [FI-2026-06-28-jarvisagents.md](FI-2026-06-28-jarvisagents.md) (Layer 2), [FI-2026-06-28-jarvisagent-consumers.md](FI-2026-06-28-jarvisagent-consumers.md) (Layer 3)

---

> ## North Star
> **Jarvis: A purely event-driven actor system with heartbeats for liveness and supervision.**
>
> Drei Schichten, exakt gemappt: **event-driven** = die Hook Engine (dieses Dokument) · **actor system** = die Actor-Entities + Mailbox/Queue (Hewitt, siehe [FI-2026-07-01](FI-2026-07-01-exp-ses-theme-boundary.md)) · **heartbeats for liveness & supervision** = der Heartbeat als Grain-Aktivator *und* Supervisor.
>
> Systemisch: Ein rein reaktives (event-getriebenes) System kann verhungern, wenn keine externen Events kommen — schlafende Actors, nie zugestellte Messages. Der **Heartbeat-Tick ist das eine Uhr-Event**, das Baseline-Liveness garantiert und Actors überwacht/reaktiviert. Damit bleibt „purely event-driven" konsistent.

---

## Trigger

VS Code Agent Hooks (Preview) liefern JSON-konfigurierte Lifecycle-Events. JSON „schreit nach TypeScript". Statt jeder Consumer baut seine eigene Hook-Verdrahtung → eine generische, domänen-neutrale **Hook Engine** in Jarvis Core.

## Idee

Ein Hook-Dispatcher in der Extension:

- **Node.js-Proxy** fängt die VS-Code-Hook-Calls ab (stdin/stdout JSON), **Verarbeitung läuft in der Extension** (TypeScript, typisiert).
- Die 8 Lifecycle-Events werden an registrierte Handler geroutet:  
  `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SubagentStart`, `SubagentStop`, `Stop`.
- **Pro Session enable/disable** — nicht jede Session will Hook-Steuerung.
- Wir kennen die Session-ID → Handler können session-spezifisch reagieren.

## Warum domänen-neutral (der entscheidende Punkt)

Die Hook Engine ist **kein syspilot-Feature**. Sie ist ein generischer Steuerungs-Bus für jede Jarvis-Entity:

- **Memory** — Wissen bei `PreCompact` ablegen, bei `SessionStart` laden.
- **Event-Flow** — eine Event-Session kennt den Event-Workflow, Hooks reichen Schritte weiter.
- **Project-Flow** — eine Projekt-Session kennt den Projekt-Workflow.
- **Inbox-Triage-Kette** — Triage → Email-Notification → Task-Notification nahtlos verketten.
- Einzelne Subworkflows oder Worksteps lassen sich **von außen steuern**.

→ Jarvis liefert die Engine. Was darauf läuft (Agenten, Memory, Flows), ist Sache der Layer darüber.

**Erster Consumer: Memory.** Wissen bei `PreCompact` ablegen, bei `SessionStart` laden — das ist der erste konkrete Anwendungsfall der Hook Engine, noch vor JarvisAgents (Layer 2).

## Keine Sackgasse — Jarvis dockt an und steuert

Die Hook-API ist **kein VS-Code-Sonderweg**: **GitHub Copilot CLI** und **Claude Code** haben zu 100 % dieselbe Hook-API. Daraus folgt mehr als nur Portabilität — es dreht die Richtung um:

> **Jarvis (in VS Code) dockt an Copilot CLI und Claude Code an und steuert sie über dieselbe Hook-API als spec-driven Agents.**

Nicht „Jarvis läuft auch woanders“, sondern **Jarvis wird der Orchestrator**, der externe Agent-Hosts antreibt. Die drei Substrate — VS Code Chat, Copilot CLI, Claude Code — werden alle über denselben Mechanismus steuerbar. Das schließt direkt an die Terminal-Inject-Experimente an ([FIND-2026-04-17](FIND-2026-04-17-experiments-terminal-inject.md)): damals manuell per `sendText`, jetzt sauber per Hook-API.

**100 % identisches Interface.** Copilot CLI und Claude Code haben dasselbe Hook-Interface **inkl. der JSON-Datenstruktur** — einer hat beim anderen abgeschrieben; GH und Anthropic arbeiten gefühlt sehr eng zusammen. Claude kann sogar **etwas mehr**. Ein Hook-Handler läuft damit ohne Anpassung gegen beide Hosts.

Effekt: ein Agent-Spec (Layer 2) läuft host-agnostisch — derselbe spec-driven Agent kann in VS Code, in der Copilot CLI oder in Claude Code gefahren werden.

**Verdacht (offen):** Würde nicht überraschen, wenn **AHP (Agent Host Protocol)** letztlich auch nur auf denselben Hooks aufsetzt. Dann wäre die Hook Engine die noch fundamentalere Schicht und AHP ein höherer Abstraktions-Layer darüber — nicht eine Alternative, sondern ein Consumer. Zu prüfen gegen [FI-2026-05-23 AHP](future-ideas.md). Falls bestätigt: Hook Engine first, AHP als optionaler Layer.

## Strategischer Boden: VS Code als langlebiges Substrat

Die Wette „an die VS Code Chat View andocken" ist **risikoarm, nicht riskant** — weil das Ökosystem auf VS Code konvergiert statt zu divergieren:

- **VS Code ist OSS** und seit Jahren der Innovationstreiber im Editor-Raum. Es gibt keinen Anreiz, sich ernsthaft davon wegzuforken.
- **Cursor, Antigravity & Co.** sind letztlich VS-Code-Forks — abhängig vom selben Source.
- **Claude-Extension, opencode, etc.** nutzen alle **die VS Code Chat View** (nicht die GH-Copilot-Chat-View). „Alles dieselbe Suppe."

→ **Konsequenz:** Ein Docking-Mechanismus, der gegen die VS Code Chat View funktioniert, gilt mit hoher Wahrscheinlichkeit **für alle** (Forks + CLI-Hosts) mit. Wir wetten auf den gravitativen Mittelpunkt, nicht auf einen einzelnen Anbieter.

## Architektur-Entscheidung

**Option 1 gewählt:** Generische Hook Engine in **Jarvis Core** (domänen-neutral). Alles darüber sitzt als separater Layer obendrauf — JarvisAgents (Layer 2) ist ein **eigenes Modul, nicht Core**. Saubere Trennung, maximal wiederverwendbar.

## Strategische Reihenfolge (Regret-Sortierung, System Designer 2026-06-28)

1. **Layer 1 Hook Engine bauen** — low-regret, *und* die billige **Sonde** für die Linchpin-Frage (Session-Linking).
2. **Memory als 1. Consumer** — konkreter Wert, unabhängig vom Agent-Framework.
3. **JarvisAgents (Layer 2) bewusst zurückstellen**, bis (a) Hook-Logs zeigen, dass Session-Linking trägt, und (b) geklärt ist, was VS Codes native Features schon abdecken.

## Geklärt (2026-06-28)

- **API-Stabilität / GA — kein Problem.** Bei **Copilot CLI** sind exakt dieselben Hooks **bereits GA**, bei **Claude Code** auch (Claude kann sogar etwas mehr). Die VS-Code-Preview ist der Nachzügler, nicht der Blocker.
- **Proxy-Performance — kein Problem.** Bei LLM-Latenzen fällt die Proxy-Brücke nicht ins Gewicht. **Caveat:** nicht 1000 Files bei *jedem* Prompt lesen → selektive/clevere Context-Injektion nötig (Detail in Layer 2).
- **`/compact` gezielt auslösbar — ja, getestet.** `/compact` lässt sich als Prompt injizieren, genau wie `/rename` (bereits validiert, [FIND-2026-04-17](FIND-2026-04-17-experiments-terminal-inject.md)). Der `PreCompact`-Hook erlaubt, die Vorab-Aktion (Knowledge-Dump) zu triggern. **Läuft komplett vorab, ohne LLM.**
- **Identisches Interface inkl. JSON-Struktur** — Copilot CLI ↔ Claude Code, siehe oben.

## Hook-API verifiziert (VS-Code-Doku, via System Designer)

- **8 Events bestätigt:** SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart, SubagentStop, Stop.
- **Transport:** Event kommt als **JSON auf stdin** in einen `command`. Common Fields: `timestamp`, `cwd`, `session_id`, `hook_event_name`, `transcript_path` (+ event-spezifisch).
- **Output steuert den Agenten:** stdout `{"continue":false,…}`, **Exit 2 = block**, `hookSpecificOutput.permissionDecision` (allow/deny/prompt). **„Most restrictive wins."**
- **Config-Location konfigurierbar** via `chat.hookFilesLocations` → Jarvis legt alles nach **`.jarvis/hooks/`** (nicht `.github/`).

## MVP-Architektur (Design-Stand `hook-engine-mvp`)

- `.jarvis/hooks/jarvis-hooks.json` (alle 8 Events) + `bridge.mjs` (Node) → **self-install** bei Aktivierung.
- **Transport: dedizierter HTTP-Listener in core**, **ephemeral Port** (`listen(0)`), Port-File `.jarvis/hooks/port` → Multi-Instanz-tauglich (3–5 parallele Fenster). **Kein** File-Spool (Sackgasse), **kein** MCP-Zwang.
- **X-as-Code:** `chat.hookFilesLocations` wird in **Workspace-Settings** (`.vscode/settings.json`) gemerged, **nie** User/Machine → keine Host-Pollution.

### Prinzip: Subscriber-conditional Blocking

- Die Bridge **wartet nur** auf Events mit *entscheidendem* Subscriber. MVP = nur Logger (Pure Sink) → sofort Exit 0 / `continue:true`, **null Latenz**.
- Zukünftiges Blocking **pro Event, nur für Decider** → Observe-only-Events bleiben latenzfrei.
- **Offen (Layer 2):** mehrere Decider auf einem Event → **Decision-Merge** nötig (most-restrictive-wins über *unsere* Subscriber).

## Offene Fragen

- **🔑 Linchpin (Docking / Session-Linking):** Korreliert die Hook-`session_id` mit Jarvis' `state.vscdb`-Session-UUID? **Der Log-only-MVP ist genau die Sonde, die das misst.** Plus: feuern wirklich alle 8 Events in der Preview?
- **Hook-Registry (MVP-Ansatz):** nur 8 Hooks — erstmal **alle 8 nach VS Code routen und loggen**, dann live lernen, was tatsächlich drinsteht. (= genau der laufende `hook-engine-mvp`.)
- **Docking-Details:** ID ↔ Hook-Mapping, Discovery, Lifecycle, Channel.
  - **Copilot CLI:** recht klar. Prototyp **`session2session`** existiert (Session-DB reverse-engineered). **Fakt:** Session-Management + DB bei Copilot CLI und VS Code **identisch**, obwohl beide *nicht* parallel laufen — CLI in eigener, VS-Code-unabhängiger Instanz. (Geteiltes DB-Schema = Docking-Hebel.)
  - **Claude Code:** VS-Code-Extension nutzt **die VS Code Chat View** (nicht GH-Copilot-Chat-View) — wie opencode & Co. „Alles dieselbe Suppe."
- **Selektive Context-Injektion:** Strategie gegen Über-Lesen pro Prompt — konzeptionell Layer 2.

## Risiken / Blind-Spots (via System Designer)

- **Spawn-Cost:** Pre/PostToolUse feuern **pro Tool-Call** → Node-Spawn-Churn. Bei LLM-Latenz ok; **persistenter Bridge-Prozess** wäre spätere Optimierung.
- **Security (RCE-Vektor):** agent-editierbares `bridge.mjs` = Remote-Code-Execution-Risiko → **Hook-Scripte vor Auto-Edit schützen**. Eines von mehreren (Approval-Bypass …).
- **Teardown** auf Disable/Uninstall noch offen (stale Config harmlos).

## Referenzen

- VS Code Agent Hooks: Config nach **`.jarvis/hooks/`** (`chat.hookFilesLocations`)
- Copilot CLI / Claude Code Hooks (GA, identisches JSON-Interface)
- Prototyp **`session2session`** — Copilot-CLI-Session-DB reverse-engineered (Asset fürs Docking/Session-Linking)
- CR `docs/changes/hook-engine-mvp.md` + `docs/{userstories,requirements,design}/*_hook.rst` (`:status: draft`)
- [FIND-2026-04-17-experiments-terminal-inject.md](FIND-2026-04-17-experiments-terminal-inject.md) — Session-Steuerung ohne UI-Fokus, `/rename`- & `/compact`-Inject getestet
