# Outlook Tasks — Design Notes

*Work in progress — kein Change Request, noch nicht fertig durchgedacht*

## User Story (Kern)

Als Jarvis-Nutzer möchte ich meine Outlook-Tasks direkt unter dem zugehörigen Projekt/Event sehen,
damit ich projekt-orientiert fokussiert arbeiten kann ohne zwischen Views zu wechseln.

## Tree-Struktur

Tasks erscheinen **inline im Projekt/Event-Tree** (kein eigener Sidebar-View).

```
📁 Project: Foo (3)          ← Zahl = offene Tasks; Farbe = due-Status
  📂 Open Tasks (3)
    ☐ Prepare slides  — 2026-04-15
    ☐ Review contract — 2026-04-20
  📂 Completed Tasks (12)
    ✓ Kickoff meeting
📁 Event: Bar Conference (0)
📥 Uncategorized Tasks (2)   ← Tasks ohne Jarvis-Kategorie, am Ende des Trees
```

### Farbkodierung (Projekt-Node)

| Farbe | Bedingung |
|-------|-----------|
| Grün | alle Tasks OK oder keine Tasks |
| Gelb | mind. 1 Task due ≤ 5 Tage |
| Rot | mind. 1 Task overdue |
| Grau | TaskService nicht verfügbar / Outlook nicht erreichbar |

Zahl hinter Projektname = nur **offene** Tasks.

## Datenmodell `Task`

```typescript
interface Task {
  id: string              // Outlook EntryID — für modify/delete
  subject: string
  dueDate?: string        // ISO date
  status: "notStarted" | "inProgress" | "completed" | "deferred" | "waitingOnOther"
  priority: "low" | "normal" | "high"
  isComplete: boolean     // explizites Flag — unabhängig von status
  completedDate?: string  // read-only; wird gesetzt wenn isComplete → true
  body?: string           // optional, nur on-demand laden
  categories: string[]    // ← Link zu Projekten/Events
  source: string          // "outlook" | "gmail" | ...
}
```

### Besonderheit `isComplete` vs `status`

- `isComplete: true` setzen → Provider setzt `completedDate = today` (Outlook macht das nativ)
- `completedDate` ist **nie direkt schreibbar** — immer Seiteneffekt von `isComplete`
- OutlookProvider übersetzt; GmailProvider muss `completed`-Status auf `isComplete` mappen

## Cache-Architektur

Tree liest **ausschließlich aus Cache** — kein COM im Tree-Refresh.

```
Tree refresh
  └── TaskService.getTasks(category)   ← Cache, synchron
        └── open count + min(dueDate)  ← Farbentscheidung

Heartbeat (zyklisch)
  └── OutlookTaskProvider.refresh()    ← COM, async im Hintergrund
        └── Cache.set(tasks)
```

Gleiches Pattern wie `CategoryService` + `DomainCache<T>`.

## Task Viewer

Klick auf Task → Editor-View (Webview) öffnet:

**Bearbeitbar:**
| Feld | Input |
|------|-------|
| `subject` | Textfeld |
| `body` | Textarea |
| `dueDate` | Date-Picker |
| `status` | Dropdown (notStarted / inProgress / completed / deferred / waitingOnOther) |
| `priority` | Dropdown (low / normal / high) |
| `categories` | Multi-Select Picker — Liste aus `CategoryService.getCategories()` (Cache) |

**Read-only / Info:**
| Feld | Anzeige |
|------|---------|
| `source` | Provider-Badge ("Outlook") |
| `completedDate` | nur sichtbar wenn status = completed |
| `id` | nicht anzeigen |

**Conditional Button:** "Open in Outlook" — nur wenn `source === "outlook"`

**Save-Flow:**
```
User speichert (inkl. Kategorie-Änderung)
  → TaskService.modifyTask(id, changes)
    → OutlookTaskProvider schreibt nach Outlook (COM)
      → TaskCache.invalidate()
        → nächster Heartbeat: refresh()
          → Task erscheint unter neuem Projekt im Tree
```

Kategorie-Änderung ist der einzige "Pointer" zwischen Task und Projekt — kein separater Zuordnungs-Mechanismus nötig. Multi-Select (`string[]`) gilt gleich für Contacts später.

## MCP Tool `jarvis_task`

```
action: "get" | "set" | "modify" | "delete"
```

- `get`: Filter nach `category`, `status`, `dueBefore`; `includeBody?: boolean`
- `set`: neue Task anlegen (subject, category, dueDate, priority)
- `modify`: subject, body, dueDate, status, priority, isComplete per id
- `delete`: per id

## Entschiedene Design-Fragen

| Frage | Entscheidung |
|-------|-------------|
| Refresh-Frequenz | gleich wie Scan-Frequenz — nur langsam ändernde Daten, kein Push von außen |
| Refresh nach Änderung | sofortiger `TaskCache.invalidate()` + `refresh()` nach `modifyTask()` — nicht erst nächster Heartbeat |
| Uncategorized Tasks | oben als Inbox/Warnbereich anzeigen (nicht unten — würde untergehen) |
| Task Viewer | Custom Editor (kein Webview) |
| `body` bei `get` | eigener Parameter `includeBody?: boolean` — LLM holt typischerweise Tasks ohne Body, kann explizit nachfordern |
| Completed Tasks im Tree | immer collapsed by default, separat unter Open Tasks |
| Projekt-Nodes im Tree | collapsed by default; beim Aufklappen nur Open Tasks direkt sichtbar, Completed separat collapsed |
| Task-Anzahl am Projekt | offene Anzahl im Label `Project: Foo (3)` + kleines Warnsignal bei overdue — **keine Projektfarbe** (zu viel Semantik) |
| Task-Zuordnung ändern | Kontextmenü + Kategorie-Picker im Viewer; kein Drag & Drop in v1 |

## Ideen-Liste (nicht in v1)

- **Drag & Drop** — Task per Drag auf Projekt-Node verschieben (Kategorie-Zuordnung ändern). Kontextmenü bleibt immer als Fallback.
