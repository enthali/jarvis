# FI-2026-07-17 — Hook Payloads für File-Touch Tracking (PreToolUse / PostToolUse)

**Status:** Research-Spike abgeschlossen — empirisch belegt (Live-Capture, nicht aus dem Gedächtnis).
**Trigger:** Spike-Auftrag PM für **GH Issue #18** — „Explorer: show files touched by agent per session".
**Verwandt:** [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md) (Fundament), [FI-2026-06-27-touched-files-tree.md](FI-2026-06-27-touched-files-tree.md) (Feature-Idee).
**Ziel:** Datengrundlage für das Change Document *actor-owned-files-touched* (Active/Inactive pro Datei, read vs. write, „Recently Touched Files"-Tree in der Jarvis-Entities-View).

---

## Methode (empirisch, wie beim session_id-Linchpin)

Kein Raten aus dem Gedächtnis. Ich habe einen **temporären Capture-Tap** in die installierte
`/.github/hooks/bridge.mjs` eingebaut (defensiv in `try/catch`, damit die Non-Blocking-Garantie
nie verletzt wird) und die exakte Roh-Payload pro Hook-Event nach `.github/hooks/capture.jsonl`
geschrieben. Danach habe ich **echte** Tool-Calls ausgelöst — `create_file`, `read_file`,
`replace_string_in_file`, `multi_replace_string_in_file`, `grep_search`, `file_search`,
`run_in_terminal` — inkl. eines **absichtlich fehlschlagenden** Edits.

> **Aufräumen:** Der Tap ist temporär. `bridge.mjs` wird bei der nächsten Extension-Aktivierung
> aus `BRIDGE_SOURCE` überschrieben (self-install), damit ist der Tap automatisch weg.
> `capture.jsonl` liegt unter `.github/hooks/` und kann gelöscht werden.

Alle folgenden Payloads sind **1:1 aus `capture.jsonl`** übernommen (Session `bb8176a2-…`, 2026-07-17).

---

## 1. Payload-Schema (Top-Level)

Beide Events tragen identische Top-Level-Keys; **`PostToolUse` ergänzt genau ein Feld: `tool_response`.**

| Key | PreToolUse | PostToolUse | Beispielwert |
|---|:---:|:---:|---|
| `hook_event_name` | ✅ | ✅ | `"PreToolUse"` / `"PostToolUse"` (vom Bridge gesetzt) |
| `session_id` | ✅ | ✅ | `bb8176a2-5b5b-4a62-927a-52b5f10c8be1` |
| `tool_name` | ✅ | ✅ | `"replace_string_in_file"` |
| `tool_use_id` | ✅ | ✅ | `toolu_01BbcCwH2Bc7cBCS3izbtdUt__vscode-1784247516328` |
| `tool_input` | ✅ | ✅ | siehe §1a (tool-spezifisch) |
| `tool_response` | ❌ | ✅ | meist `""`, bei Terminal die Ausgabe |
| `timestamp` | ✅ | ✅ | `2026-07-17T00:28:52.002Z` (ISO 8601 UTC, ms) |
| `cwd` | ✅ | ✅ | `c:\workspace\jarvis` (Workspace-Root, absolut) |
| `transcript_path` | ✅ | ✅ | `…\transcripts\bb8176a2-…-52b5f10c8be1.jsonl` |

**Wichtig:** `session_id` liegt als snake_case im echten Payload — das ist der bereits gefixte
Bug aus [FI-2026-06-28-hook-engine.md](FI-2026-06-28-hook-engine.md). `session_id` == Chat-Session-UUID
(bestätigt: identisch mit dieser Research-Session). `cwd` ist immer der Workspace-Root, **nicht**
das Verzeichnis der bearbeiteten Datei.

### 1a. `tool_input` pro Tool (echte Captures)

```jsonc
// create_file
{ "filePath": "c:\\workspace\\jarvis\\.jarvis\\tmp\\spike-scratch-a.txt",
  "content": "alpha\nbeta\ngamma\ndelta\n" }

// read_file
{ "filePath": "c:\\workspace\\jarvis\\.jarvis\\tmp\\spike-scratch-a.txt",
  "startLine": 1, "endLine": 4 }

// replace_string_in_file
{ "filePath": "c:\\workspace\\jarvis\\.jarvis\\tmp\\spike-scratch-a.txt",
  "oldString": "alpha\nbeta\ngamma\ndelta",
  "newString": "alpha\nBETA-edited\ngamma\ndelta" }

// multi_replace_string_in_file  → filePath steckt PRO Eintrag in replacements[]
{ "explanation": "…",
  "replacements": [
    { "filePath": "c:\\workspace\\jarvis\\.jarvis\\tmp\\spike-scratch-a.txt",
      "oldString": "gamma\ndelta", "newString": "GAMMA\ndelta" },
    { "filePath": "c:\\workspace\\jarvis\\.jarvis\\tmp\\spike-scratch-b.txt",
      "oldString": "one\ntwo", "newString": "ONE\ntwo" } ] }

// run_in_terminal  → KEIN filePath
{ "command": "echo \"spike-marker-terminal\"",
  "explanation": "…", "goal": "…", "mode": "sync" }

// grep_search  → kein Touch; includePattern ist ein Glob, keine Datei
{ "query": "HookIntake", "isRegexp": false,
  "includePattern": "**/packages/core/src/engine/hooks/**", "defaultMaxResults": 20 }

// file_search  → kein Touch
{ "query": "**/hooks/bridge.mjs", "maxResults": 20 }
```

---

## 2. File-Path-Extraktion

| Tool | Pfad-Feld | Kardinalität | Absolut/Relativ |
|---|---|---|---|
| `create_file` | `tool_input.filePath` | 1 | **absolut** (`c:\…`) |
| `read_file` | `tool_input.filePath` | 1 | **absolut** |
| `replace_string_in_file` | `tool_input.filePath` | 1 | **absolut** |
| `multi_replace_string_in_file` | `tool_input.replacements[].filePath` | **n** (Array!) | **absolut** |
| `create_directory` | `tool_input.dirPath` (nicht getestet, aus Signatur) | 1 | absolut |
| `run_in_terminal` | — (kein Pfad) | 0 | — |
| `grep_search` | — (`includePattern` = Glob, nicht getouched) | 0 | — |
| `file_search` | — (`query` = Glob) | 0 | — |

**Konsequenzen fürs Feature:**
- Pfade sind **absolut** → vor Anzeige/Vergleich per `path.relative(cwd, filePath)` gegen den
  Workspace-Root (`cwd`) relativieren.
- `multi_replace_string_in_file` erzeugt **mehrere Touches aus einem Tool-Call** → über
  `replacements[]` iterieren; Dedupe pro Datei nötig (dieselbe Datei kann mehrfach vorkommen).
- Extraktion sollte **feldbasiert pro `tool_name`** erfolgen (kleine Mapping-Tabelle), nicht
  „irgendein Feld namens filePath suchen" — robuster gegen neue Tools.

---

## 3. Read/Write/Ignore-Klassifikation (Vorschlag)

| `tool_name` | Klasse | Pfad-Quelle |
|---|---|---|
| `read_file` | **read** | `filePath` |
| `create_file` | **write** | `filePath` |
| `replace_string_in_file` | **write** | `filePath` |
| `multi_replace_string_in_file` | **write** | `replacements[].filePath` (n) |
| `create_directory` | write (Ordner) | `dirPath` |
| `list_dir` | read (Ordner) | `path` |
| `grep_search` | **ignore** | — |
| `file_search` | **ignore** | — |
| `semantic_search` | **ignore** | — |
| `run_in_terminal` | **ignore*** | — |
| `get_errors`, `test*`, `run_task` | **ignore** | — |

> *`run_in_terminal` bewusst als **ignore**: Der Payload enthält keinen strukturierten Pfad,
> nur einen freien `command`-String. Datei-Extraktion aus Shell-Kommandos wäre Heuristik-Raten
> (mv/rm/cat/git…) und fehleranfällig → für die MVP-Tree bewusst draußen. Kann später als
> optionale Heuristik nachgezogen werden.

**Design-Empfehlung:** Klassifikation als **explizite Allowlist-Tabelle** `tool_name → {kind, pathField}`.
Unbekannte Tools defaulten auf `ignore` (fail-safe, kein Rausch im Tree).

---

## 4. Success/Failure-Signal — **kritischer Befund**

**`tool_response` trägt KEIN verlässliches Success/Failure-Flag.**

Empirisch: Für fast alle Tools ist `tool_response == ""` (leerer String) — sowohl bei Erfolg als
auch bei Fehler. Der **absichtlich fehlgeschlagene** `replace_string_in_file`
(id `toolu_01YFWrod4BkP7pjL9bA885WZ`, oldString matcht nichts) hatte in `PostToolUse`:

```jsonc
{ "tool_name": "replace_string_in_file", "tool_response": "" }   // ← identisch zum Erfolg
```

Der einzige Fall mit Inhalt war `run_in_terminal` (`tool_response` = Kommando-Ausgabe als String).
Es gibt **keinen** `success`/`exitCode`/`error`-Key im Payload.

**Folgerung fürs Feature:**
- Aus dem Hook allein lässt sich **nicht** entscheiden, ob ein Edit tatsächlich griff.
- **Empfehlung:** Ein `PostToolUse` für ein write-Tool als „Touch" werten (write intent). Das ist
  für einen „Recently Touched"-Tree völlig ausreichend und ehrlich — der Agent *hat* die Datei
  angefasst, unabhängig vom Ergebnis. Erfolg/Misserfolg **nicht** über Hooks tracken.
- Wer echten Erfolg braucht, müsste an anderer Stelle andocken (Datei-mtime-Vergleich Pre/Post
  oder VS Code FileSystemWatcher) — **out of scope** für die MVP, als Option vermerken.
- **Pre vs. Post für Touch:** `PostToolUse` verwenden (nach dem Versuch), nicht `PreToolUse` —
  sonst zählt man auch abgebrochene/verweigerte Calls.

---

## 5. Timestamp & Korrelation

- **Format:** ISO 8601 UTC mit Millisekunden — `2026-07-17T00:28:52.002Z`. Verlässlich sortierbar.
- **Korrelation Pre↔Post:** über **`tool_use_id`** — identisch in `PreToolUse` und `PostToolUse`
  desselben Calls (z. B. `toolu_01BbcCwH…__vscode-1784247516328` in beiden Events).
- Damit lässt sich pro Call die **Dauer** berechnen (Post.timestamp − Pre.timestamp) und ein
  „läuft gerade" erkennen (Pre gesehen, Post noch nicht).
- `tool_use_id` ist auch pro Session eindeutig genug als Dedupe-Key.

**Fürs Feature genügt `PostToolUse` allein** (enthält `tool_input` + `tool_name` + `session_id` +
`timestamp`). `PreToolUse` nur nötig, wenn man einen „in Arbeit"-Spinner pro Datei zeigen will.

---

## Empfohlenes Extraktions-Modell (fürs Change Document)

```ts
// tool_name → wie Pfade zu ziehen sind
type TouchKind = 'read' | 'write';
interface TouchRule { kind: TouchKind; extract: (input: any) => string[]; }

const TOUCH_RULES: Record<string, TouchRule> = {
  read_file:                     { kind: 'read',  extract: i => [i.filePath] },
  create_file:                   { kind: 'write', extract: i => [i.filePath] },
  replace_string_in_file:        { kind: 'write', extract: i => [i.filePath] },
  multi_replace_string_in_file:  { kind: 'write', extract: i => (i.replacements ?? []).map(r => r.filePath) },
  // alles andere → nicht im Mapping → ignore
};
// auf PostToolUse: rule = TOUCH_RULES[event.payload.tool_name]; sonst skip.
// Pfade: absolut → path.relative(payload.cwd, p); dedupe pro Datei; kind=write gewinnt über read.
```

## Offene Punkte / Nächste Schritte

- `create_directory` / `list_dir` Payloads nicht live erfasst (aus Signatur abgeleitet) — bei Bedarf
  im Change-Design kurz gegenchecken.
- Subagent-Tool-Calls: ob `PreToolUse`/`PostToolUse` auch innerhalb von `runSubagent` feuern und mit
  welcher `session_id` — **nicht getestet**, relevant falls Touches pro Subagent zugeordnet werden sollen.
- Capture-Tap + `capture.jsonl` nach Abschluss entfernen (auto-restore bei nächster Aktivierung).

---

*Empirische Rohdaten: `.github/hooks/capture.jsonl` (20 Events, Session bb8176a2, 2026-07-17).
Bereit zur Referenzierung aus dem Change Document `actor-owned-files-touched`.*
