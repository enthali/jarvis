# FI-2026-05-23 — AHP (Agent Host Protocol) als Foundation

**Trigger:** Microsoft veröffentlicht AHP v0.2.0 (MIT, WebSocket, immutable state + pure reducers + write-ahead reconciliation).  
Repo: `github.com/microsoft/agent-host-protocol`. Reference Server in `vscode/src/vs/platform/agentHost/node/`.

---

## Idee

AHP ist die architektonische Lösung, die `chatSessionsProvider` / `chatParticipantPrivate` nicht sein konnten — Consumer-Pattern statt Provider-Pattern (Sackgasse, 2026-04-16). Multi-Client synchronisierte Writes.

---

## Was es bei uns lösen würde

| Finding | Wie AHP hilft |
|---------|---------------|
| **F3** — Race-Condition-Workarounds (300/800 ms Settles) | Überflüssig, weil AHP write-ahead reconciliation hat |
| **F5-Teilaspekt** — `sendToSession` als Chat-API-Hack | Wäre ein sauberer Multi-Writer-Client |
| **Generell** — Trennung Jarvis ↔ VS Code | Saubere Trennung: Jarvis als Agent-Host-Konsument, VS Code als einer von mehreren möglichen Hosts |

---

## Status

Tiefere Recherche deferred — Branch ist busy mit Sessions-Test-Balloon.

**Nächste Schritte, wenn Branch frei:**
1. AHPX (Tyler Leonhardt) als TS-Client-Referenz studieren
2. Operations + Auth-Modell auf Loopback klären
3. Verhältnis zu gh-CLI-Sessions verifizieren

---

## Referenzen

- [Agent Host Protocol Repo](https://github.com/microsoft/agent-host-protocol)
- [AHPX TypeScript Client](https://github.com/tylerleonhardt/ahpx)
- [VS Code Reference Server](https://github.com/microsoft/vscode/tree/main/src/vs/platform/agentHost/node)