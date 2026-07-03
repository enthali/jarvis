# Future Ideas — Research Backlog

Strategische Ideen, die noch keine Change Requests sind, aber nicht verloren gehen sollen.
Trigger, Hintergrund, ungefähre Richtung — keine Specs, keine Tasks.

Sortierung: jüngste oben.

---

## FI-2026-07-03 — Actor Monitoring / Supervision-Fallback-Strategie

**Trigger:** Zweiter Vorfall eines hängenden Agenten (diesmal Claude Haiku via GH Copilot). Bisher kein Mechanismus, das automatisch zu bemerken oder zu recovern.

**Kurz:** Die „Supervision"-Hälfte der North-Star-These aus [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) ist noch unausgearbeitet. Nächster Schritt (nicht jetzt): Hook-Logs beim nächsten Vorfall auswerten, ob sich ein Hänger/Fehler dort erkennen lässt. Grobe Fallback-Idee: bei LLM-Fehler 2-3x retry, danach Modellwechsel + erneuter Versuch. Fehler passieren — wir müssen sie nur catchen.

**Status:** Idee, noch nicht erarbeitet. Nächstes Research-Thema.

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
