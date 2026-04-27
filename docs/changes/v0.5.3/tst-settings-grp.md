# Test Protocol: settings-grp

**Date**: PENDING  
**Change Document**: docs/changes/settings-grp.md  
**Result**: PENDING

## Test Results

| # | Test-ID | Beschreibung | Schritte | Erwartetes Ergebnis | Status |
|---|---------|--------------|----------|---------------------|--------|
| 1 | TST-CFG-01 | Settings-Dialog zeigt 6 Gruppen unter „Jarvis" | 1. VS Code öffnen. 2. `Ctrl+,` → Einstellungen öffnen. 3. Nach „Jarvis" suchen. | Unter dem Abschnitt „Jarvis" erscheinen genau 6 Untergruppen (z. B. Projects, Events, Messages, Heartbeat, Scanner, General). | PENDING |
| 2 | TST-CFG-02 | Frischer Start schreibt `heartbeatConfigFile` in Settings | 1. `.vscode/settings.json` öffnen und `jarvis.heartbeatConfigFile` entfernen (oder frischen Workspace verwenden). 2. Fenster neu laden (`Developer: Reload Window`). 3. `.vscode/settings.json` prüfen. | `jarvis.heartbeatConfigFile` ist auf einen Pfad unterhalb des workspace-storage-Ordners gesetzt (z. B. `…/heartbeat.yaml`). | PENDING |
| 3 | TST-CFG-03 | Frischer Start schreibt `messagesFile` in Settings | 1. `jarvis.messagesFile` aus `.vscode/settings.json` entfernen. 2. Fenster neu laden. 3. `.vscode/settings.json` prüfen. | `jarvis.messagesFile` ist auf einen Pfad unterhalb des workspace-storage-Ordners gesetzt (z. B. `…/messages.json`). | PENDING |
| 4 | TST-CFG-04 | jarvisEvents-View: unsichtbar wenn `eventsFolder` leer | 1. `jarvis.eventsFolder` in `.vscode/settings.json` auf `""` setzen. 2. Fenster neu laden. 3. Aktivitätsleiste / Explorer prüfen. | Die View „Jarvis Events" ist nicht sichtbar in der Seitenleiste. | PENDING |
| 5 | TST-CFG-05 | jarvisEvents-View: sichtbar wenn `eventsFolder` gesetzt | 1. `jarvis.eventsFolder` auf einen gültigen Ordnerpfad setzen. 2. Fenster neu laden. 3. Aktivitätsleiste / Explorer prüfen. | Die View „Jarvis Events" erscheint in der Seitenleiste. | PENDING |
| 6 | TST-CFG-06 | jarvisMessages-View: sichtbar nach erstem Start (Default-Path gesetzt) | 1. Frischen Workspace verwenden (kein `messagesFile` in Settings). 2. Extension aktivieren. 3. Seitenleiste prüfen. | `jarvis.messagesFile` wurde durch `populateDefaultPaths()` automatisch gesetzt → die View „Jarvis Messages" ist sichtbar. | PENDING |
| 7 | TST-CFG-07 | jarvisHeartbeat-View: sichtbar nach erstem Start (Default-Path gesetzt) | 1. Frischen Workspace verwenden (kein `heartbeatConfigFile` in Settings). 2. Extension aktivieren. 3. Seitenleiste prüfen. | `jarvis.heartbeatConfigFile` wurde durch `populateDefaultPaths()` automatisch gesetzt → die View „Jarvis Heartbeat" ist sichtbar. | PENDING |

## Notes

Dieses Protokoll wird vom Change Manager / QA-Verantwortlichen beim UAT ausgefüllt.  
`populateDefaultPaths()` wird in `activate()` direkt nach `initSessionLookup()` und vor `new MessageTreeProvider()` aufgerufen (Issue 1 fix).
