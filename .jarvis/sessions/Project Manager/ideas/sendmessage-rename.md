# Idea: sendToSession → sendMessage Rename + listMessageDestinations

**Status:** Brainstorm (parked 2026-06-09)
**Origin:** v0.7.0 live-use — "Session"-Vokabular überladen

## Problem

Das Wort "Session" trägt drei verschmolzene Bedeutungen:

1. **Session-Entity** (YAML `session.yaml`, Entity-Typ seit v0.5.11)
2. **Chat-Session** (VS Code Chat-Tab)
3. **Sende-Ziel** (`sendToSession` — meint real "irgendein Entity oder Chat-Tab")

`sendToSession` heißt "send to session", akzeptiert aber Projects + Events + Sessions + offene Chat-Tabs (die `getValidDestinations`-Union). Der Name lügt. Ein wörtlich denkender Agent ruft `listSessions` auf, findet ein Project-Ziel nicht, und rät beim ersten Versuch falsch.

## Warum geparkt (2026-06-09)

v0.7.0 läuft in der Praxis besser als erwartet. Die Agenten lösen die Confusion
selbst auf — **max. 1 falscher Call, dann sitzt es**. Realer Schmerz ist fast
kosmetisch. Ein Breaking-Change der **alle Agent-Files umschreiben** würde
(sendToSession in tools-Listen + Prompt-Bodies) rechtfertigt sich dafür aktuell
nicht. Self-Healing der Agenten > Tool-Rename.

**Re-Trigger-Kriterium:** Wenn die Fehlrate steigt (mehrere Fehlversuche pro
Zustellung), oder wenn neue/schwächere Agent-Modelle die Confusion NICHT mehr
selbst auflösen, oder wenn ein anderes Breaking-Bündel ansteht in das der Rename
billig mit reinpasst.

## Konsolidiertes Konzept (falls reaktiviert)

| Aspekt | Entscheidung |
|---|---|
| **Neues Tool** | `sendMessage` (Name frei seit altem MCP-Server raus) — validiert gegen `getValidDestinations`-Union (YAML Session∪Project∪Event ∪ offene Chat-Tabs) |
| **Discovery** | `listMessageDestinations` — gibt dieselbe Union zurück (ehrliche Liste aller legitimen Ziele). Name bindet semantisch an Messages, nicht an abstraktes "Destination" |
| **Fehlerpfad** | Bei unbekanntem Ziel: Fehler + Liste gültiger Ziele (Sicherheitsnetz, nicht primärer Discovery-Pfad) |
| **Migration** | `sendToSession` bleibt als Alias → mappt auf `sendMessage` + Deprecation-Warning (Log für Betreiber + knapper Hinweis im Tool-Result für migrationswillige Agents). Alias fliegt beim nächsten Breaking-Bündel raus |
| **Zustellung** | Geschlossene Entities werden bei Delivery geöffnet (bestehender Auto-Delivery-Pfad, unverändert) |
| **Union-Scope** | Chat-Tabs BLEIBEN gültige Ziele (ad-hoc Research-Chats im Mail-Workflow nicht verlieren) |

## Kernerkenntnis

Der Rename allein heilt die **Discovery** nicht — `sendMessage` ist ehrlicher
(sagt nichts Falsches) aber stumm (sagt nicht wohin). Das Paar ist
`sendMessage` + `listMessageDestinations`. Beide tragen "Message" im Namen,
keiner lügt mehr über "Session".

## Lessons-Bezug

Der Auslöser-Bug war KEIN Bug: VS Code lief noch mit der alten Jarvis-Version
(Update installiert aber Window nicht neu gestartet). Echtes v0.7.0-Verhalten
ist korrekt. → Lesson: bei "Tool verhält sich alt" immer zuerst Build-Aktualität
(Window-Reload) prüfen bevor Code-Audit.
