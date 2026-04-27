# Test Protocol: new-entity-category

**Date**: 2026-04-13
**Change Document**: docs/changes/new-entity-category.md  
**Result**: PASSED

## Test Results

| # | Test-ID | Beschreibung | Schritte | Erwartetes Ergebnis | Status |
|---|---------|--------------|----------|---------------------|--------|
| 1 | T-27 | Projekt auto-category | `+` in Projects-Bar; Name `"UAT-AutoCat"` eingeben | Kategorie `"Project: UAT-AutoCat"` in Outlook angelegt (blau); Entity-Ordner erstellt | PASSED |
| 2 | T-28 | Event auto-category | `+` in Events-Bar; Name `"UAT-AutoCat Conf"`; Datum `2099-12-31` | Kategorie `"Event: UAT-AutoCat Conf"` in Outlook angelegt (pink); Event-Ordner erstellt | PASSED |
| 3 | T-29 | Guard disabled | `outlookEnabled=false`; `+` in Projects-Bar; Name `"UAT-GuardTest"` | Entity erfolgreich angelegt; KEINE neue Outlook-Kategorie; kein User-sichtbarer Fehler | PASSED |

## Notes

- Fehler beim Kategorie-Anlegen blockieren das Entity-Anlegen nicht (try/catch in extension.ts).
- Naming Convention wird im `newProject`/`newEvent` Handler enforced: Präfix "Project: " bzw. "Event: " wird automatisch vorangestellt.
- Guard prüft `outlookEnabled === true` UND `categoryService.hasProviders()`.
