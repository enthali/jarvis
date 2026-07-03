# Future Ideas — Research Backlog

Strategische Ideen, die noch keine Change Requests sind, aber nicht verloren gehen sollen.
Trigger, Hintergrund, ungefähre Richtung — keine Specs, keine Tasks.

Sortierung: jüngste oben.

---

## FI-2026-07-03 — Actor Monitoring: Self-Reminder-Watchdog (statt Hook-basiert)

**Trigger:** Dritter Vorfall eines hängenden Agenten (Nemotron via GH Copilot, „Response contained no choices" — LLM-Inferenz-Fehler). Hook-Log analysiert: Sequenz bricht nach dem letzten `PostToolUse` einfach ab, kein `Stop`-Hook.

**Befund — Hooks decken diese Fehlerklasse strukturell nicht ab:** Der Fehler passiert **zwischen** Prompt und Antwort, auf LLM-Inferenz-Ebene (interner Copilot-Chat-Code, `_provideLanguageModelResponse`) — keiner der 8 Hook-Events (SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, SubagentStart, SubagentStop, Stop) instrumentiert diese Schicht. Ein Hook-basierter Watchdog würde hier **nichts** sehen — nicht übersehen, sondern strukturell blind.

**Bessere Idee (PM, 2026-07-03): Self-Reminder statt Hook-Detection.** Prozessunabhängig, nutzt nur bestehende Werkzeuge (`jarvis_setReminder`, `jarvis_cancelReminder`, dieselbe Delivery-Pipeline wie normale Messages — reitet auf der gestern validierten Editor-Group-Placement-Infrastruktur). Jeder Agent setzt sich **bei jedem SEND** einen Reminder, der später prüft, ob er selbst geantwortet hat:

```
[Jarvis Watchdog] Self-check: Did I already send a RESPOND to the last message I received?

- If YES: do nothing — this reminder is stale.
- If NO: set the next watchdog reminder now, then resume my job where I left off, complete it,
  and send the RESPOND.
```

**Doppelter Nutzen:**
1. Der **hängende Agent selbst** bekommt durch die eigene Reminder-Nachricht potenziell den Reset-Kick aus dem gescheiterten Turn (neue eingehende Message → frischer Turn-Versuch, transienter Provider-Fehler vermutlich vorbei).
2. **Wartende Agenten** (z.B. QM) merken über ihre eigene Reminder, dass eine erwartete RESPOND noch aussteht — unabhängig von der Ausfallursache beim Partner.

**Verfeinerungen:**
- **Nicht alle Hänger sind gleich (2026-07-03, zweiter Fund):** Lokales Modell (qwen3.6 27b) hängt aus einem anderen Grund — KV-Cache-Laden dauert länger als GH Copilots Timeout erlaubt. Das ist **nicht transient**, ein einzelner Reset-Kick reicht nicht, der nächste Versuch würde genauso timeouten. Ein einmaliger Reminder ist dafür zu schwach.
- **Fix: Self-Renewing Chain statt Einmal-Reminder.** Im „NO"-Zweig setzt der Agent sofort den **nächsten** Watchdog-Reminder (bevor er die eigentliche Arbeit fortsetzt) — falls auch dieser Versuch hängt, greift der nächste. Die Kette bricht erst, wenn RESPOND tatsächlich gesendet wird.
- Canceln bei erfolgreichem RESPOND ist damit wieder **notwendig** (nicht mehr nur optionale Effizienz) — sonst läuft die Kette nach Erledigung der Aufgabe einfach weiter. Aber: das gehört nicht in den Reminder-Text selbst, sondern in die **Definition von RESPOND** („einen RESPOND senden heisst auch: den eigenen pending Watchdog-Reminder canceln"). Falls das Cancel mal zu spät kommt und der Reminder trotzdem feuert: harmloser No-op („If YES: do nothing"), kein Risiko.
- „resume my job ... complete it ... send when done" statt „send RESPOND now" — verhindert eine hastige, unfertige Antwort; der Agent soll erst die eigentliche Arbeit fortsetzen.
- **Generisches Pattern, kein Sonderfall:** jeder Agent, der ein SEND empfängt, muss RESPONDen — auch der PM. Kein Akteur ist ausgenommen.
- **Nebeneffekt:** die Menge offener Watchdog-Reminder ist quasi ein Live-Abbild davon, welche Agenten gerade aktiv sein sollten — ein informelles „wer ist gerade dran"-Register, geschenkt durch den Mechanismus. Nicht wasserdicht, aber ein zusätzliches Netz.
- Bleibt eine **Disziplin-Regel auf Orchestrierungs-Ebene** in `syspilot.orchestration-jarvis` (SEND/RESPOND-Vokabular-Skill) — hängt komplett an der SEND/RESPOND-Semantik, kein Jarvis-Kern-Thema.
- **Layering noch präziser (2026-07-03, Live-Experiment):** der reine Reset-Kick braucht gar kein SEND/RESPOND-Wissen — er funktioniert schon rein über den generischen Notification-Prompt (`jarvis.messages.notificationTemplate`: "...dann setz dir einen Self-Check-Reminder..."), ganz ohne Skill. Sauberer Schnitt:
  - **Jarvis (Pflicht):** Notification-Prompt trägt den Reset-Kick selbst — reine Infrastruktur, kein Orchestrierungs-Wissen nötig.
  - **Jarvis (optional):** die Reminder-Kette (Re-Arm statt Einmal-Reminder) — ebenfalls generisch, kein SEND/RESPOND-Bezug.
  - **syspilot (optional, "rounder"):** der Skill fügt die SEND/RESPOND-spezifische Präzisierung hinzu (was genau "did I respond" heisst, wann canceln) — macht's robuster, ist aber nicht Voraussetzung fürs Überleben eines hängenden Turns.
- **Live-Beobachtung (Change Manager/System Designer, 2026-07-03):** CM interpretierte das Pattern als Supervisor-Variante — setzte nicht nur einen Self-Check für sich selbst, sondern auch einen externen Reminder direkt auf die Zielsession ("verify System Designer session is still active/on-task"). Nicht falsch, aber eine Erweiterung über den reinen Self-Check hinaus — wert, im Auge zu behalten.
- **5 Minuten sind zu knapp für längere/user-guided Arbeit** (Design-Sessions laufen oft länger) — Intervall muss ggf. rollen-/kontextabhängig angepasst werden, statt fix.

**Status:** ✅ **Live validiert (2026-07-03).** Test-Reminder an „Quality Manager" gesetzt (`jarvis_setReminder`, generisches Template s.o.). Während der Wartezeit trat *zufällig* ein echter Vorfall auf derselben Session ein — exakt dieselbe „Response contained no choices"-LLM-Inferenz-Fehlerklasse wie beim ursprünglichen Trigger. Der Reminder feuerte kurz danach; QM nahm die Arbeit direkt wieder auf (Dateien gelesen/editiert) — **vollständige Recovery**, kein manuelles Eingreifen nötig. Bestätigt beide Hypothesen: (1) Reset-Kick funktioniert, (2) generisches Template ohne Recipient/Task-Parameter liest sich sauber im Self-Check. Nächster Schritt: probeweise lokal in `syspilot.orchestration-jarvis` einbauen und live am Quality Manager testen (Skill-Änderung + Hinweis-Message an laufende Sessions, da Skills nicht automatisch neu eingelesen werden).

**Update (2026-07-03, laufendes Experiment):** Skill probeweise auf Branch `experiment/self-reminder-watchdog-skill` umgesetzt (SEND/RECEIVE/RESPOND konsolidiert, Watchdog in RECEIVE/RESPOND eingebettet, `readMessage`-Signaturfehler + toter `runSubagent`-Rest + `agents:`-Frontmatter-Sektion entfernt). Zusätzlich `jarvis.messages.notificationTemplate` in `.vscode/settings.json` testweise erweitert, damit der Reset-Kick bereits ohne Skill-Kenntnis greift. PM per Message über das Experiment informiert.

---

## FI-2026-06-28 — Hook Engine (Jarvis Core) · Layer 1

**Status:** MVP in Arbeit (`hook-engine-mvp`, observe/log-only). API verifiziert, MVP-Architektur steht (`.jarvis/hooks/` + HTTP-Listener, ephemeral Port).  
**Kurz:** Domänen-neutraler Hook-Dispatcher in Jarvis **Core**. 8 Lifecycle-Events, per-session on/off. **Keine Sackgasse:** Copilot CLI + Claude Code haben dieselbe Hook-API → Jarvis dockt an und **steuert sie als spec-driven Agents**. Erster Consumer: Memory. Linchpin: korreliert Hook-`session_id` mit Jarvis-Session? → MVP misst das.

**Detail:** [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md)

---

## FI-2026-06-28 — JarvisAgents (Spec-Assembled Agent Framework) · Layer 2

**Status:** **Bewusst zurückgestellt** — erst nach Hook-Log-Beweis (Session-Linking) + Klärung, was VS Codes native Custom Agents schon abdecken.  
**Kurz:** Separates **Modul** (nicht Core) auf der Hook Engine. Leerer JarvisAgent (Shell) der nach Spec läuft. **Kern-Wert: Handoff-Kontinuität** — eine Session morpht durch die Rollen (CM→Designer→Implementer→Verifier), Kontext bleibt live statt kaltem Re-Read bei jedem Wechsel. KV-Cache warm, Context-Reset gezielt an Rollen-Naht. Differentiator ggü. native Custom Agents (separate Session pro Agent).

**Detail:** [FI-2026-06-28-jarvisagents.md](FI-2026-06-28-jarvisagents.md)

---

## FI-2026-06-28 — JarvisAgent Consumers (syspilot · PIM · …) · Layer 3

**Kurz:** Jedes Projekt bringt eigene Agent-Families als Spec. **syspilot** (Projekt-Koordinator, Systems Engineer, Quality Manager — QM ohne Change-Context). **PIM** (Inbox, PM, Event, Travel — bald produktiv zuhause; Killer-Case: spec-driven Gmail + Outlook). Beide parallel über Specs. Jarvis = Engine, Projekt = Agenten.

**Detail:** [FI-2026-06-28-jarvisagent-consumers.md](FI-2026-06-28-jarvisagent-consumers.md)

---

## FI-2026-06-28 — Workflow-as-Spec (der selbst-auditierende Prozess)

**Kurz:** Nicht nur das Produkt, der **Prozess selbst** ist spec-driven (US/REQ/SPEC pro Agent). syspilot ist schon fast da — JarvisAgents spart den `.agent.md`-Übersetzungsschritt. **Impact + MECE auf den Prozess** → Killer-Case Functional-Safety-Audit (26262/DO-178): „wo hat der Prozess Lücken?" BAM. **Selbst-schließender Kreis:** Lücke gefunden → PM-Change → Prozess-Update als Spec → zurück in den Workflow.

**Detail:** [FI-2026-06-28-workflow-as-spec.md](FI-2026-06-28-workflow-as-spec.md)

---

## FI-2026-05-29 — Per-Agent Model Selection (BYOK-Era)

**Trigger:** VS Code 1.122.1 — BYOK ohne GitHub-Sign-In + Custom Endpoint Provider in Stable.

**Idee:** Heute laufen alle syspilot-Agents gegen das aktive Copilot-Modell.
Mit BYOK + Ollama/Custom-Endpoint kann jeder Agent sein passendes Modell deklarieren —
analytische Agents lokal & klein, kreative/coding-Agents weiter Frontier.

**Modell-Zuordnung (Vorschlag):**

| Agent | Aufgabentyp | Modell-Kandidat |
|---|---|---|
| `syspilot.mece` | strukturierte Spec-Analyse | lokal (z.B. Qwen3-30B-A3B, fallback Qwen2.5-7B) |
| `syspilot.trace` | ID-Pattern-Matching über Specs | lokal, klein (7B reicht) |
| `syspilot.verify` | Regel-basiertes Checken | lokal, klein–mittel |
| `syspilot.docu` | Doku-Synchronisation | lokal, mittel |
| `syspilot.design` | RST-Specs schreiben | Frontier |
| `syspilot.implement` | TypeScript-Code | Frontier (Coding-Modell) |
| `syspilot.cm` / `syspilot.pm` | Orchestrierung / Strategie | Frontier |

**Vorteile:**
- Kosten/Quota — kleine analytische Agents fressen heute Copilot-Calls für Aufgaben, die das nicht rechtfertigen
- Latenz — lokales Modell antwortet in 1–2 s, kein Netzwerk
- Privacy — interne Spec-Inhalte gehen bei sensiblen Projekten nicht mehr raus
- Air-gapped Einsatzfähigkeit für regulierte Branchen

**Voraussetzungen / offene Fragen:**
- Agent-Frontmatter-Schema um `model:` + `fallback:` erweitern (greift VS Code das überhaupt? oder muss Custom-Endpoint-Proxy das routen?)
- Custom-Endpoint-Proxy (kleiner Express-Server, Chat-Completions-Format) als saubere Routing-Variante prüfen
- BYOK-Onboarding in `syspilot.setup` integrieren
- Utility-Models (`chat.utilityModel`, `chat.utilitySmallModel`) brauchen separate Config — UX-Friktion
- NES/Inline-Suggestions brauchen weiterhin GitHub-Sign-In — kein "vollständig GitHub-frei"

**Persönlicher Datenpunkt:** Qwen3-30B-A3B leistet zuhause gute Dienste; 7B sollte für MECE/Trace genügen.

**Status:** strategisch, nicht akut. Slot suchen, wenn Tech-Debt-Welle abgeebbt ist.

---

## FI-2026-05-23 — AHP (Agent Host Protocol) als Foundation

**Trigger:** Microsoft veröffentlicht AHP v0.2.0 (MIT, WebSocket, immutable state + pure reducers + write-ahead reconciliation).
Repo: `github.com/microsoft/agent-host-protocol`. Reference Server in `vscode/src/vs/platform/agentHost/node/`.

**Idee:** AHP ist die architektonische Lösung, die `chatSessionsProvider` / `chatParticipantPrivate` nicht sein konnten —
Consumer-Pattern statt Provider-Pattern (Sackgasse, 2026-04-16). Multi-Client synchronisierte Writes.

**Was es bei uns lösen würde:**
- F3 — Race-Condition-Workarounds (300/800 ms Settles): überflüssig, weil AHP write-ahead reconciliation hat
- F5-Teilaspekt — `sendToSession` wäre ein sauberer Multi-Writer-Client statt Chat-API-Hack
- Generell: saubere Trennung zwischen Jarvis als Agent-Host-Konsument und VS Code als einer von mehreren möglichen Hosts

**Status:** tiefere Recherche deferred — Branch ist busy mit Sessions-Test-Balloon.
Wenn Branch frei: AHPX (Tyler Leonhardt) als TS-Client-Referenz studieren, Operations + Auth-Modell auf Loopback klären,
Verhältnis zu gh-CLI-Sessions verifizieren.
