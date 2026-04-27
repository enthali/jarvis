# Test Protocol: outlook-categories

**Date**: 2026-04-13
**Change Document**: docs/changes/outlook-categories.md  
**Result**: PASSED

## Test Results

| # | Test-ID | Beschreibung | Schritte | Erwartetes Ergebnis | Status |
|---|---------|--------------|----------|---------------------|--------|
| 1 | T-1 | Provider registriert bei outlookEnabled=true | `outlookEnabled=true`, Fenster neu laden | Output Channel loggt Provider-Registrierung; `hasProviders()` = true | PASSED |
| 2 | T-2 | Kein Provider bei outlookEnabled=false | `outlookEnabled=false`, Fenster neu laden | Kein Provider registriert; null Provider | PASSED |
| 3 | T-3 | Cache befüllt via get | `jarvis_category action:get` aufrufen | Kategorien zurück mit name, color, source: "outlook" | PASSED |
| 4 | T-4 | Heartbeat-Refresh | Kategorie in Outlook anlegen, Heartbeat-Tick abwarten | Neue Kategorie erscheint beim nächsten `get` | PASSED |
| 5 | T-5 | Manueller Refresh | Kategorie in Outlook anlegen, Refresh-Icon klicken | Neue Kategorie erscheint sofort | PASSED |
| 6 | T-6 | get all | `jarvis_category action:get` | Alle Outlook-Kategorien mit name, color, source zurück | PASSED |
| 7 | T-7 | get gefiltert | `jarvis_category action:get filter:"Project:"` | Nur Kategorien mit "Project:" zurückgegeben | PASSED |
| 8 | T-8 | set | `jarvis_category action:set name:"UAT-Test-Set"` | Kategorie angelegt; in Outlook und nachfolgendem `get` sichtbar | PASSED |
| 9 | T-9 | delete | `jarvis_category action:delete name:"UAT-Test-Set"` | Kategorie entfernt; nicht mehr in `get` oder Outlook | PASSED |
| 10 | T-10 | rename via Tool | `jarvis_category action:rename oldName/newName` | Umbenannt in Outlook; Farbe erhalten; alter Name weg | PASSED |
| 11 | T-11 | Fehler ohne Provider | `outlookEnabled=false`, dann `jarvis_category action:get` | Fehlermeldung: keine PIM-Provider verfügbar | PASSED |
| 12 | T-12 | MCP-Aufruf | `jarvis_category` via MCP-Client aufrufen | Gleiche Ergebnisse wie LM-Tool-Aufruf | PASSED |
| 13 | T-13 | View sichtbar | `showCategories=true`, Sidebar öffnen | "Categories" erscheint als 5. View; Nodes alphabetisch sortiert | PASSED |
| 14 | T-14 | View ausgeblendet | `showCategories=false` | "Categories"-Bereich nicht sichtbar in Sidebar | PASSED |
| 15 | T-15 | Node-Details | Categories-View aufklappen | Nodes zeigen Name; Tooltip/Beschreibung enthält source: outlook | PASSED |
| 16 | T-16 | Refresh-Icon | Kategorie in Outlook anlegen, Refresh-Icon klicken | Neue Kategorie erscheint im Tree | PASSED |
| 17 | T-17 | Rename via Kontextmenü | Rechtsklick → Rename Category → neuen Namen eingeben | Eingabebox vorausgefüllt; Tree und Outlook aktualisiert | PASSED |
| 18 | T-18 | Delete via Kontextmenü | Rechtsklick → Delete Category → bestätigen | Kategorie aus Tree und Outlook entfernt | PASSED |
| 19 | T-19 | Kein Provider, View sichtbar | `outlookEnabled=false`, `showCategories=true` | "no categories" Placeholder im Tree | PASSED |
| 20 | T-20 | Lesen via COM | `get` mit laufendem Outlook | Alle Kategorien mit source: "outlook" zurückgegeben | PASSED |
| 21 | T-21 | Farb-Heuristik | `get` mit "Project: Alpha", "Event: Beta", "General" | "Project: Alpha" → blau; "Event: Beta" → pink; "General" → keine Farbe | PASSED |
| 22 | T-22 | set mit Farbe | `set name:"Project: UAT-Color"` | Kategorie in Outlook mit blauer Farbe angelegt | PASSED |
| 23 | T-23 | delete via COM | `delete name:"Project: UAT-Color"` | Kategorie aus Outlook entfernt; in Outlook-UI bestätigt | PASSED |
| 24 | T-24 | Rename erhält Farbe | Rename "UAT-Test-Rename" → "UAT-Test-Renamed2" | Gleiche Farbe in Outlook; alter Name nicht mehr vorhanden | PASSED |
| 25 | T-25 | Category.id befüllt | `get`, Debug-Log prüfen | Jede Kategorie hat nicht-leere `id` aus COM `CategoryID` | PASSED |
| 26 | T-26 | Disabled-Guard | `outlookEnabled=false`, Output Channel prüfen | Kein COM/PowerShell-Log-Eintrag; keine Child-Prozesse | PASSED |

## Notes

- T-6 war initial ein Benutzer-Fehler (hatte `outlookEnabled` statt `pim.showCategories` umgeschaltet) — nach Korrektur PASSED.
- Während des UAT wurde die `package.json` angepasst: Settings-Gruppen "Outlook" und "Categories" wurden zur Gruppe "PIM" zusammengeführt.
- Die boolean `when`-Klausel erfordert `== true` (z.B. `config.jarvis.pim.showCategories == true`), reines Binding ohne Vergleich funktioniert nicht.
