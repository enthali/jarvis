# FI-2026-06-27 — Embedded File Explorer in Jarvis View

**Trigger:** PM request — "Instead of switching between Jarvis sidebar and VS Code file explorer, embed a file tree renderer directly inside the Jarvis Explorer panel. The Jarvis view becomes 'mission control'."

---

## Idee

Einen **eigenen File-Tree-Provider** als zusätzliche View im bestehenden `jarvis` ViewContainer registrieren. Der Tree zeigt den Workspace-Dateibaum (oder einen konfigurierbaren Root-Pfad) an, mit Inline-Aktionen (Open, Reveal in Explorer, Open in Terminal, Diff, etc.).

---

## Technische Machbarkeit

| Machbarkeit

| Frage | Antwort |
|-------|---------|
| Kann man eine zweite file-explorer-ähnliche TreeView in einen bestehenden ViewContainer hängen? | **Ja.** `package.json` → `contributes.views["jarvis"]` mehrere Views erlaubt. Jede bekommt eigenen `TreeDataProvider`. |
| Kann man `vscode.workspace.fs.readDirectory` für rekursiven Baum nutzen? | **Ja.** Liefert `Thenable<[string, FileType][]>`. Lazy-Loading on expand. |
| Gibt es ein VS Code API für "file explorer panel" zum Einbetten? | **Nein.** Kein `createFileExplorer()`. Der eingebaute Explorer ist **keine Komponente**, sondern ein Produkt (~15k LOC, interne APIs). Eigenbau nötig. |

---

## Implementierungs-Skizze

### 1. `package.json` — View registrieren
```json
"contributes": {
  "views": {
    "jarvis": [
      { "id": "jarvisProjects", "name": "Projects" },
      { "id": "jarvisEvents", "name": "Events" },
      { "id": "jarvisSessions", "name": "Sessions" },
      { "id": "jarvisFileExplorer", "name": "Files", "icon": "$(file)" }
    ]
  }
}
```

### 2. `FileTreeDataProvider` (ca. 200 LOC)
```typescript
class FileTreeDataProvider implements vscode.TreeDataProvider<FileNode> {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChange.event;

  constructor(private root: vscode.Uri) {}

  getTreeItem(element: FileNode): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label, element.collapsibleState);
    item.resourceUri = element.uri;
    item.contextValue = element.isDirectory ? 'jarvisFileExplorerDir' : 'jarvisFileExplorerFile';
    
    if (!element.isDirectory) {
      item.command = { command: 'vscode.open', title: 'Open', arguments: [element.uri] };
    }
    return item;
  }

  async getChildren(element?: FileNode): Promise<FileNode[]> {
    const target = element?.uri ?? this.root;
    const entries = await vscode.workspace.fs.readDirectory(target);
    return entries.map(([name, type]) => ({
      label: name,
      uri: vscode.Uri.joinPath(target, name),
      isDirectory: type === vscode.FileType.Directory,
      collapsibleState: type === vscode.FileType.Directory 
        ? vscode.TreeItemCollapsibleState.Collapsed 
        : vscode.TreeItemCollapsibleState.None
    }));
  }
}
```

### 3. Activation
```typescript
const fileExplorerProvider = new FileTreeDataProvider(vscode.workspace.workspaceFolders[0].uri);
const fileExplorerView = vscode.window.createTreeView('jarvisFileExplorer', { 
  treeDataProvider: fileExplorerProvider,
  showCollapseAll: true
});
context.subscriptions.push(fileExplorerView);
```

### 4. Inline Actions (package.json menus)
```json
"menus": {
  "view/item/context": [
    { "command": "vscode.open", "when": "view == jarvisFileExplorer && viewItem == jarvisFileExplorerFile", "group": "inline" },
    { "command": "revealInExplorer", "when": "view == jarvisFileExplorer", "group": "inline" },
    { "command": "openInTerminal", "when": "view == jarvisFileExplorer", "group": "inline" },
    { "command": "vscode.diff", "when": "view == jarvisFileExplorer", "group": "navigation" }
  ]
}
```

---

## Trade-offs

| Pro | Contra |
|-----|--------|
| Vollständige Kontrolle (Filter, Custom Context Menus, Inline Actions) | Drag-Drop, Rename, Delete, Git-Decorations selbst bauen |
| Kein Kontextwechsel — "Mission Control" UX | Wartung: VS Code Explorer bekommt Features gratis, wir nicht |
| Integriert in Jarvis-Workflow (rechte Maustaste → Jarvis-Actions) | ~200 LOC initial, aber wächst mit Features |

---

## Alternativen (verworfen)

| Alternative | Grund |
|-------------|-------|
| VS Code Explorer-Implementierung kopieren (OSS) | ~15k LOC, interne APIs (`IFileService`, `IWorkbenchLayoutService`, SCM-Integration), bricht bei jedem Release |
| Webview mit eigener Baum-Implementierung | Overkill, keine native TreeView-UX |
| `vscode.window.showOpenDialog` + QuickPick | Kein persistenter Baum, nur Picker |

---

## Offene Fragen

1. **Root-Pfad konfigurierbar?** Setting `jarvis.fileExplorer.root` (default: Workspace Root)
2. **Hidden Files anzeigen?** Setting `jarvis.fileExplorer.showHidden`
3. **Git-Decorations?** `vscode.window.registerFileDecorationProvider` möglich, aber Aufwand
4. **Multi-Root Workspace?** Ja, `workspaceFolders` iterieren

---

## Nächste Schritte (wenn CR)

1. Spike-Branch `research/file-explorer-embed` — Provider + View + Basis-Actions
2. UAT: "Kann ich ohne Kontextwechsel Dateien öffnen/vergleichen?"
3. Entscheidung: CR an PM oder "nice to have" parken

---

## Referenzen

- [VS Code Tree View API](https://code.visualstudio.com/api/extension-guides/tree-view)
- [workspace.fs.readDirectory](https://code.visualstudio.com/api/references/vscode-api#workspace.fs)
- [View Containers](https://code.visualstudio.com/api/extension-guides/tree-view#view-container)