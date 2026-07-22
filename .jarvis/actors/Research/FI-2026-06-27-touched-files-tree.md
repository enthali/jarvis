# FI-2026-06-27 — Files with Edit Changes Under Session Nodes

**Trigger:** PM request — "Under each session/project/event in the Jarvis tree, show the files an agent most recently touched — with a click to open the file (or diff) alongside the chat."

---

## Idee

Jeder Jarvis-Entity (Session, Project, Event) bekommt im Tree **Kind-Elemente** ("Touched Files"), die die Dateien auflisten, die der Agent in dieser Session bearbeitet hat. Klick → Datei öffnen (oder Diff gegen Git-Basis).

---

## Architektur: Hook → Bridge → REST API → Persistenz → Tree

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  PostToolUse    │     │  Python Bridge   │     │  Jarvis REST API │
│  Hook (VS Code) │────▶│  (.github/hooks/ │────▶│  /api/sessions/  │
│  stdin: JSON    │     │   track_files.py)│     │  {id}/touched    │
└─────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Tree Refresh   │◀────│  TreeDataProvider│◀────│  SQLite/JSON     │
│  (session node) │     │  reads DB        │     │  touched_files   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

---

## 1. Hook-Konfiguration (`.github/hooks/track-files.json`)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "type": "command",
        "command": "python .github/hooks/track_files.py",
        "timeout": 10
      }
    ]
  }
}
```

**Hook Input (stdin):**
```json
{
  "timestamp": "2026-06-27T15:30:00.000Z",
  "cwd": "/workspace/my-project",
  "session_id": "abc-123-uuid",
  "hook_event_name": "PostToolUse",
  "tool_name": "replace_string_in_file",
  "tool_input": { "filePath": "src/extension.ts", "oldString": "...", "newString": "..." },
  "tool_use_id": "tool-456"
}
```

---

## 2. Python Bridge (`.github/hooks/track_files.py`)

```python
#!/usr/bin/env python3
import sys, json, os, requests

FILE_TOOLS = {
    'editFiles', 'replace_string_in_file', 'create_file', 
    'write_file', 'delete_file', 'insert_edit_into_file'
}

def main():
    try:
        event = json.load(sys.stdin)
    except json.JSONDecodeError:
        sys.exit(0)

    tool = event.get('tool_name')
    if tool not in FILE_TOOLS:
        sys.exit(0)

    session_id = event.get('session_id')
    if not session_id:
        sys.exit(0)

    # Extract file paths from tool_input
    files = []
    inp = event.get('tool_input', {})
    if 'files' in inp:
        files = inp['files']
    elif 'filePath' in inp:
        files = [inp['filePath']]
    elif 'path' in inp:
        files = [inp['path']]

    if not files:
        sys.exit(0)

    api_url = os.getenv('JARVIS_API_URL', 'http://localhost:31415')
    try:
        requests.post(
            f'{api_url}/api/sessions/{session_id}/touched-files',
            json={'files': files, 'tool': tool},
            timeout=5
        )
    except Exception:
        pass  # silent fail

if __name__ == '__main__':
    main()
```

---

## 3. REST API Endpoint (in `extension.ts`)

```typescript
// Activation: HTTP Server schon vorhanden (MCP ports 31410/31413/31414/31420)
server.post('/api/sessions/:sessionId/touched-files', async (req, res) => {
  const { sessionId } = req.params;
  const { files, tool } = req.body;

  // Map Copilot sessionId → Jarvis Entity (project/session/event)
  const entityName = await sessionMapper.getEntityForCopilotSession(sessionId);
  if (!entityName) {
    return res.status(404).json({ error: 'Unknown session' });
  }

  // Persist
  await touchedFilesDb.upsert(entityName, files, tool, sessionId);
  
  // Trigger tree refresh
  sessionTreeProvider.refresh();
  
  res.json({ ok: true });
});
```

**Session Mapping:** Bei `jarvis.openAgentSession` / `jarvis_createSession` Tool:
```typescript
// Store mapping: copilotSessionId → jarvisEntityName
await sessionMapper.set(copilotSessionId, entityName);
```

---

## 4. Persistenz: SQLite (besser als JSON für Concurrent Writes)

```sql
-- packages/core/src/engine/touchedFilesDb.ts
CREATE TABLE touched_files (
  id INTEGER PRIMARY KEY,
  entity_name TEXT NOT NULL,           -- Jarvis entity (project/session/event)
  copilot_session_id TEXT NOT NULL,    -- Für Debugging/Correlation
  file_path TEXT NOT NULL,
  tool TEXT NOT NULL,                  -- Welches Tool hat geschrieben
  timestamp TEXT NOT NULL,             -- ISO 8601
  status TEXT DEFAULT 'active',        -- 'active' | 'cleared'
  UNIQUE(entity_name, file_path)
);

CREATE INDEX idx_touched_entity ON touched_files(entity_name);
CREATE INDEX idx_touched_status ON touched_files(status);
```

**DAO:**
```typescript
async function upsert(entity: string, files: string[], tool: string, copilotSessionId: string) {
  const now = new Date().toISOString();
  for (const file of files) {
    await db.run(`
      INSERT INTO touched_files (entity_name, copilot_session_id, file_path, tool, timestamp, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(entity_name, file_path) DO UPDATE SET
        tool = excluded.tool,
        timestamp = excluded.timestamp,
        status = 'active'
    `, [entity, copilotSessionId, file, tool, now]);
  }
}

async function getActive(entity: string): Promise<TouchedFile[]> {
  return db.all(`
    SELECT file_path, tool, timestamp FROM touched_files
    WHERE entity_name = ? AND status = 'active'
    ORDER BY timestamp DESC
  `, [entity]);
}

async function clear(entity: string, filePath: string) {
  await db.run(`
    UPDATE touched_files SET status = 'cleared' WHERE entity_name = ? AND file_path = ?
  `, [entity, filePath]);
}
```

---

## 5. TreeDataProvider Integration

**Option A: Kinder unter Session-Node (empfohlen)**
```typescript
// In GenericTreeDataProvider.getChildren() für LeafNode (entity)
if (element.kind === 'leaf') {
  const entity = this._scanner.getEntity(element.id);
  const touched = await touchedFilesDb.getActive(entity.name);
  
  if (touched.length > 0) {
    return [
      ...touched.map(f => ({
        kind: 'child' as const,
        descriptor: {
          label: path.basename(f.file_path),
          tooltip: f.file_path,
          command: { command: 'vscode.open', title: 'Open', arguments: [vscode.Uri.file(f.file_path)] },
          contextValue: 'jarvisTouchedFile',
          iconPath: new vscode.ThemeIcon('file-code')
        },
        parentKind: this._config.kind
      })),
      // ... existing children from getChildren hook
    ];
  }
}
```

**Option B: Separate View "Touched Files"** — falls Baum zu voll wird.

---

## 6. Inline Action: "Clear" (Delisting v1)

```json
// package.json menus
"view/item/context": [
  {
    "command": "jarvis.clearTouchedFile",
    "when": "view == jarvisSessions && viewItem == jarvisTouchedFile",
    "group": "inline"
  }
]
```

```typescript
// Command handler
const clearTouchedFileCommand = vscode.commands.registerCommand(
  'jarvis.clearTouchedFile',
  async (node: TouchedFileNode) => {
    await touchedFilesDb.clear(node.entityName, node.filePath);
    sessionTreeProvider.refresh();
  }
);
```

---

## 7. Auto-Delisting (v2 — später)

| Ansatz | Machbarkeit |
|--------|-------------|
| `git status --porcelain` auf tracked files prüfen | ✅ Einfach, zuverlässig |
| FileSystemWatcher auf Save-Events | ⚠️ Rauschen (User vs Agent) |
| Hash-Vergleich (letzter bekannter Stand) | ✅ Robust, aber State nötig |

**Empfehlung v2:** Background-Job (Heartbeat alle 5 Min) → `git status` → Files ohne unstaged changes → `status = 'cleared'`.

---

## Was wir schon haben

| Komponente | Status |
|------------|--------|
| HTTP/MCP Server in Extension | ✅ (Ports 31410/31413/31414/31420) |
| Python Bridge Pattern | ✅ (bereits genutzt) |
| Session ↔ Entity Mapping | ✅ (JarvisSession, session.yaml) |
| SQLite (`sql.js`) | ✅ (sessionLookup.ts) |
| GenericTreeDataProvider mit Children-Hook | ✅ (SPEC_ENG_TREEFACTORY S5) |
| Inline Actions in Tree | ✅ (jarvis.openAgentSession, etc.) |

---

## Offene Fragen

1. **Scope:** Nur Sessions? Oder auch Projects/Events? (PM: "sessions, projects, and events")
2. **Session-ID Mapping:** Wie robust ist `copilotSessionId → jarvisEntity`? (Chat View vs Terminal vs CLI)
3. **Multi-Workspace:** Entity-Name eindeutig pro Workspace?
4. **Diff-Action:** `vscode.diff` gegen `HEAD` oder Working Tree?

---

## Nächste Schritte (wenn CR)

1. Spike: Hook + Bridge + API + DB + Tree-Integration (1 Branch)
2. UAT: "Sehe ich die Dateien, die der Agent grade editiert hat?"
3. CR an PM mit AC: Inline Clear, Auto-Clear v2 später

---

## Referenzen

- [Agent Hooks (Preview)](https://code.visualstudio.com/docs/agent-customization/hooks)
- [Hooks Reference](https://code.visualstudio.com/docs/agents/reference/hooks-reference)
- [VS Code Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [workspace.fs API](https://code.visualstudio.com/api/references/vscode-api#workspace.fs)