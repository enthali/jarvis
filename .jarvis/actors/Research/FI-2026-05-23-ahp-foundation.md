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

**SHIPPING in VS Code 1.129.1** (2026-07). AHP ist nicht mehr Zukunftsmusik — der Agent Host läuft als eigener Prozess (`--type=agentHost`, WebSocket-Server), Local = message port, Remote = AHP/WS. Empirisch verifiziert inkl. lokaler Modelle (BYOK, Qwen 3.6 35B). Details + Stage-0-Kompatibilität: [FI-2026-07-21-agent-host-stage0-compat.md](FI-2026-07-21-agent-host-stage0-compat.md).

**Verifiziert (2026-07-21):**
- Agent-Host- und klassische Sessions teilen `state.vscdb` → Jarvis-Lookup sieht sie ohne Codeänderung.
- Der `sendToSession`-Chat-API-Hack (`chat.open`) erreicht den Agent-Host-Prozess **nicht** — richtiger Weg ist `editorService.openEditor({ resource: <session-uri> })` (Resource-URI statt Query-String).
- Session-Identität = URI/UUID (`agenthost-content:///sessionId/…`), **nicht** der drift-fähige Anzeigename.

**Nächste Schritte:**
1. AHPX (Tyler Leonhardt) als TS-Client-Referenz studieren
2. Operations + Auth-Modell auf Loopback klären
3. AHP-Wire-Log-JSONL als Beobachtungskanal (Stage 2) evaluieren
4. Prüfen, ob `editorService.openEditor({ resource })` aus einer Extension stabil triggerbar ist (Stage 4 = evtl. Command-Swap statt Neubau)

---

## Referenzen

- [Agent Host Protocol Repo](https://github.com/microsoft/agent-host-protocol)
- [AHPX TypeScript Client](https://github.com/tylerleonhardt/ahpx)
- [VS Code Reference Server](https://github.com/microsoft/vscode/tree/main/src/vs/platform/agentHost/node)