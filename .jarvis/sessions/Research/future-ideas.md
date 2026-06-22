# Future Ideas — Research Backlog

Strategische Ideen, die noch keine Change Requests sind, aber nicht verloren gehen sollen.
Trigger, Hintergrund, ungefähre Richtung — keine Specs, keine Tasks.

Sortierung: jüngste oben.

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
