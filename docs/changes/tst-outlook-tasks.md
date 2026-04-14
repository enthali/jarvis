# Test Protocol: outlook-tasks

**Date**: 2026-04-15
**Change Document**: docs/changes/outlook-tasks.md
**Result**: PASSED (with known limitation on T-47)

## Test Results

| # | Test-ID | Beschreibung | Schritte | Erwartetes Ergebnis | Status |
|---|---------|--------------|----------|---------------------|--------|
| 1 | T-30 | Guard: tasks sub-toggle off | `outlookEnabled=true`, `outlook.tasks.enabled=false`, Fenster neu laden | Kein OutlookTaskProvider registriert; keine Task-Nodes im Tree | PASSED |
| 2 | T-31 | Guard: outlookEnabled=false | `outlookEnabled=false`, `outlook.tasks.enabled=true`, Fenster neu laden | Kein Task-Provider; keine COM-Aktivität | PASSED |
| 3 | T-32 | jarvis_task get: alle Tasks | `action:"get"` aufrufen | Alle Tasks mit subject, dueDate, isComplete, categories, source:"outlook" | PASSED (180 Tasks geladen) |
| 4 | T-33 | jarvis_task get: category-Filter | `action:"get" filter:{ "category":"Project: Alpha" }` | Nur Tasks mit passendem Kategorie-Präfix | PASSED |
| 5 | T-34 | jarvis_task get: status-Filter | `action:"get" filter:{ "status":"open" }` | Nur offene Tasks | PASSED |
| 6 | T-35 | jarvis_task get: dueBefore-Filter | `action:"get" filter:{ "dueBefore":"2026-12-31" }` | Nur Tasks mit dueDate vor dem Stichtag | PASSED |
| 7 | T-36 | jarvis_task set: neuen Task anlegen | `action:"set" subject:"UAT-Task-New" dueDate:"2027-01-01" categories:["Project: Alpha"]` | Task in Outlook angelegt; folgendes `get` enthält ihn | PASSED |
| 8 | T-37 | jarvis_task set: Priority ändern | `action:"set" subject:"UAT-Task-New" priority:"high"` | Priority in Outlook aktualisiert | PASSED |
| 9 | T-38 | jarvis_task set: Task abschließen | `action:"set" subject:"UAT-Task-New" isComplete:true` | Task als erledigt markiert; completedDate befüllt | PASSED |
| 10 | T-39 | jarvis_task delete | `action:"delete" subject:"UAT-Task-New"` | Task aus Outlook entfernt; nicht mehr in `get` | PASSED |
| 11 | T-40 | Tree: Uncategorized Tasks Section | Projekttree öffnen, Tasks ohne Projektzuordnung vorhanden | "Uncategorized Tasks (n)" erscheint oberhalb aller Projektknoten | PASSED |
| 12 | T-41 | Tree: Task-Nodes unter Projekt | Task mit Kategorie "Project: Beta Rollout" → Projekt "Beta Rollout" aufklappen | Task erscheint als Kind-Node unter dem Projektknoten | PASSED (nach Prefix-Fix) |
| 13 | T-42 | Badge: offene Tasks n | 2 offene Tasks für Projekt, keine überfällig | description zeigt `2` neben Projektname | PASSED |
| 14 | T-43 | Badge: bald fällige Tasks (n !) | Task mit dueDate in ≤5 Tagen | Gelbes circle-filled Icon + description | PASSED |
| 15 | T-44 | Badge: überfällige Tasks ⚠ | Task mit dueDate in Vergangenheit | Gelbes warning Icon + description | PASSED |
| 16 | T-45 | Editor öffnet sich | Task-Node klicken | Custom Editor öffnet mit allen Feldern | PASSED |
| 17 | T-46 | Editor: Feld ändern → Auto-Save | Subject oder Status ändern | Änderung nach 300ms/sofort in Outlook; "Saved." erscheint | PASSED |
| 18 | T-47 | Editor: "Open in Outlook" Schaltfläche | Button klicken | Outlook öffnet den Task | NOT APPLICABLE (Button entfernt — `outlook://` Protokoll nicht registriert auf Windows) |
| 19 | T-48 | Editor: completedDate read-only | Editor für erledigten Task öffnen | completedDate als reiner Text angezeigt, kein Input-Feld | PASSED |
| 20 | T-49 | COM: Apostroph im Tasknamen | Task mit Apostroph im Namen abrufen | Kein PowerShell-Fehler; Name korrekt zurückgegeben | PASSED |
| 21 | T-50 | COM: isComplete → completedDate | In Outlook erledigten Task via `get` abrufen | `isComplete:true` und `completedDate` befüllt | PASSED |
| 22 | T-51 | Heartbeat: TaskService.refresh() | `jarvis.refreshTasks` Command via Heartbeat auslösen | Tasks aktualisiert; Output Channel loggt Refresh | PASSED |

## Notes

- **T-41**: Initialer Fehler — Tree baute `"Project: " + name` → Doppelpräfix bei YAML-Name "Project: Beta Rollout". Behoben: YAML-Name wird as-is als Kategorie-Key verwendet.
- **T-47**: `outlook://` URI-Protokoll ist auf Windows nicht standardmäßig registriert. Button wurde vollständig entfernt (kein Mehrwert ohne funktionierende Protokollregistrierung).
- **T-32**: JSON-Sanitierung nötig — PowerShell `ConvertTo-Json` lässt rohe Steuerzeichen (U+0000–U+001F) im Output. Fix: Strip vor `JSON.parse()`.
- **T-33**: Filter verwendete initial `Array.includes(exact)` statt Präfix-Match. Behoben: `t.categories.some(c => c.toLowerCase().startsWith(catLower))`.
- **Badges**: Ursprünglich als Text-Suffixe (`⚠`, `(n !)`, `(n)`) implementiert. Während UAT auf `item.description` + `ThemeIcon` mit `ThemeColor` umgestellt — visuell deutlich besser.
- **Editor**: Auto-Save (kein expliziter Save-Button) während UAT ergänzt; Kategorien-Auswahl auf aufklappbares Multi-Select umgestellt.
- **newProject/newEvent**: Entfernte automatische Präfix-Einfügung (`"Project: " + input`) — Name wird as-is an `categoryService.setCategory()` gegeben; Farbe wird von `resolveColor()` anhand des Namens automatisch bestimmt.
- **T-51**: `jarvis.refreshTasks` und `jarvis.refreshCategories` Commands waren in `syncTaskRefreshJob()`/`syncCategoryRefreshJob()` referenziert aber nicht registriert — Heartbeat-Jobs schlugen fehl. Commands sind jetzt korrekt als `registerCommand` eingetragen.
