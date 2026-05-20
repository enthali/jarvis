# Change: context-file-discovery

> **Retroaktiv erstellt am 2026-05-18** durch Change Manager auf Anweisung des
> PM nach Release v0.5.10. Das ursprüngliche Change-Dokument war auf der
> Feature-Branch nicht im `docs/changes/`-Pfad angelegt worden; nur das
> Test-Protokoll (`tst-context-file-discovery.md`) wurde mit dem Squash-Merge
> nach `develop` (Commit `81d5f8b`) übertragen und später nach
> `docs/changes/v0.5.10/` archiviert. Dieses Dokument fasst die ursprüngliche
> Change auf Basis der Specs und des Test-Protokolls zusammen.

## Status

- Created: 2026-05-07
- Reconstructed: 2026-05-18
- Branch (historisch): `feature/context-file-discovery`
- Squash-Merge: `81d5f8b` auf `develop`
- Release: v0.5.10
- Mode: autonomous

## Intent

Der Open-Context-Button im Jarvis Explorer funktionierte nur, wenn die
`context.md` direkt im Projekt- bzw. Event-Ordner lag. Bei Projekten mit
Unterordnern pro Rolle (z.B. `pm/context.md`, `qm/context.md`) lief die
Aktion ins Leere und zeigte nur eine Info-Nachricht.

Der Button soll `context.md` zusätzlich eine Ebene tief in Unterordnern
finden. Bei mehreren Treffern soll der User per QuickPick auswählen können.

## Acceptance Criteria

1. **Direct hit (Regression)** — Liegt `context.md` direkt im Entity-Ordner,
   wird sie wie bisher geöffnet (kein Picker).
2. **One-level subfolder discovery** — Fehlt die Datei direkt, scannt der
   Befehl Unterordner eine Ebene tief.
3. **Hidden folders excluded** — Verzeichnisse, deren Name mit `.` beginnt,
   werden vom Scan ausgeschlossen.
4. **Single subfolder hit** — Wird genau eine `context.md` in einem
   Unterordner gefunden, wird sie ohne Picker geöffnet.
5. **Multiple matches → QuickPick** — Bei mehreren Treffern erscheint ein
   VS Code QuickPick mit relativen Pfaden zur Auswahl.
6. **No match → info message** — Wird nichts gefunden, erscheint eine
   Info-Nachricht (kein Editor-Open auf nicht existierende Datei).
7. **Folder nodes unchanged** — Reine Ordner-Nodes zeigen den Button weiterhin
   nicht.

## Affected Specs

| ID | File | Change |
|---|---|---|
| `US_EXP_OPENCONTEXT` | docs/userstories/us_exp.rst | Erweitert um AC-3..AC-7 (Subfolder-Discovery, QuickPick, Hidden-Exclude) |
| `REQ_EXP_OPENCONTEXT` | docs/requirements/req_exp.rst | Erweitert um AC-1..AC-8 (Resolution-Stufen, QuickPick, Info-Message) |
| `SPEC_EXP_OPENCONTEXT_CMD` | docs/design/spec_exp.rst | 3-Schritte-Resolution (direct → 1-level scan → QuickPick → info) |
| UAT: `US_UAT_OPENCONTEXT`, `REQ_UAT_OPENCONTEXT`, `SPEC_UAT_OPENCONTEXT` | docs/{userstories,requirements,design}/...opencontext.rst | T-1..T-9 |

## Implementation Notes

- `src/extension.ts` — `jarvis.openContext` Handler:
  - Schritt 1: `<folder>/context.md` direkt prüfen → falls vorhanden, öffnen.
  - Schritt 2: `readdirSync` mit `withFileTypes: true`, hidden folders
    (`name.startsWith('.')`) ausfiltern, in jedem verbleibenden Subfolder
    nach `context.md` suchen.
  - Schritt 3: Liste der Treffer:
    - 0 → `vscode.window.showInformationMessage('No context.md found …')`
    - 1 → öffnen
    - n>1 → `vscode.window.showQuickPick` mit relativen Pfaden
  - try/catch um `readdirSync` (Permission-Errors fallen auf Info-Message).
- Testdata-Ergänzung (`testdata/projects/`):
  - `withsub/{project.yaml, sub/context.md}` — T-6 (single subfolder)
  - `multi/{project.yaml, pm/context.md, qm/context.md}` — T-7 (QuickPick)
  - `hidden/{project.yaml, .hidden/context.md}` — T-8 (hidden excluded)

## Test Plan (UAT)

Siehe `tst-context-file-discovery.md` (in diesem Ordner) — T-1..T-9, alle PASS.

## Quality Gates (historisch, beim Merge)

- TypeScript compile: clean
- Sphinx `-W --keep-going -E`: 0 warnings
- MECE: 3 must-fix Findings (Permission-Error try/catch, fsPath vs fullPath,
  Placeholder-Mismatch) behoben vor Merge
- UAT: 9/9 PASS

## Decisions

- Scan-Tiefe **eine Ebene** — tiefer wäre teuer und meist unerwünscht
  (Projekte sind typischerweise flach strukturiert).
- Hidden folders (`.git`, `.vscode`, etc.) immer ausgeschlossen — niemand
  erwartet `context.md` in `.git/`.
- Direct hit hat absoluten Vorrang — Backward-Compat zum bisherigen
  Verhalten.
