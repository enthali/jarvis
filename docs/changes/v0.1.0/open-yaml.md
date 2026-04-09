# Change Document: open-yaml

**Status**: verified
**Branch**: feature/open-yaml
**Created**: 2026-04-07
**Author**: Jarvis Developer

---

## Summary

Add an inline action button to project and event leaf items in both tree views.
Hovering over a leaf item reveals a `$(go-to-file)` icon button; clicking it opens
the associated YAML file in the VS Code editor. `TreeItem.command` stays free for
a future detail view. Scope: open-only, no editing, no saving.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact |
|----|-------|--------|
| US_EXP_SIDEBAR | Project & Event Explorer | none |
| US_EXP_PROJECTFILTER | Project Folder Filter | none |
| US_EXP_EVENTFILTER | Future Event Filter | none |

### New User Stories

#### US_EXP_OPENYAML: Open YAML from Tree Item

```rst
.. story:: Open YAML from Tree Item
   :id: US_EXP_OPENYAML
   :status: draft
   :priority: optional

   **As a** Jarvis User,
   **I want** to open the YAML file of a project or event directly from the tree view,
   **so that** I can quickly view or edit the raw data in the VS Code editor.

   **Acceptance Criteria:**

   * AC-1: Each project leaf item shows an inline action button (go-to-file icon) on hover
   * AC-2: Each event leaf item shows an inline action button (go-to-file icon) on hover
   * AC-3: Clicking the button opens the associated YAML file in the VS Code editor
   * AC-4: Clicking on the tree item label itself does nothing (``TreeItem.command`` stays empty,
     reserved for a future detail view)
   * AC-5: Folder nodes do not have this button
```

### Decisions

- Decision 1: Inline action button only — `TreeItem.command` stays free for future detail view
- Decision 2: Applies to both Projects and Events leaf items
- Decision 3: Folder nodes excluded (AC-5)
- Decision 4: Icon is `$(go-to-file)`

### Horizontal Check (MECE)

- ✅ US_EXP_SIDEBAR: tree structure unchanged — button is additive
- ✅ US_EXP_PROJECTFILTER / US_EXP_EVENTFILTER: unrelated concerns, no overlap
- ✅ US_EXP_OPENYAML covers the full intent — both views, inline only, label reserved
- ✅ No contradictions

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

No existing requirements impacted. `contextValue` is already set correctly.
`LeafNode.id` as file path is already sufficient for the URI.

### New Requirements

#### REQ_EXP_OPENYAML: Open YAML from Tree Item

```rst
.. req:: Open YAML from Tree Item
   :id: REQ_EXP_OPENYAML
   :status: draft
   :priority: optional
   :links: US_EXP_OPENYAML

   **Description:**
   Project and event leaf items SHALL provide an inline action button that
   opens the associated YAML file in the VS Code editor.

   **Acceptance Criteria:**

   * AC-1: Project leaf items have ``contextValue = 'project'``;
     event leaf items have ``contextValue = 'event'`` (already the case)
   * AC-2: A ``view/item/context`` menu entry with ``when: viewItem == project``
     and a second entry with ``when: viewItem == event`` provide an inline
     ``$(go-to-file)`` button
   * AC-3: The command opens the file via ``vscode.commands.executeCommand('vscode.open', uri)``
     where ``uri`` is derived from the item's file path
   * AC-4: ``TreeItem.command`` is NOT set on leaf items (reserved for future detail view)
   * AC-5: Folder nodes (``contextValue = 'folder'``) have no inline button
```

### Horizontal Check (MECE)

- ✅ No modification to existing REQs needed — `contextValue` already set correctly in both providers
- ✅ REQ_EXP_OPENYAML is self-contained — single command + two menu entries
- ✅ No overlap with REQ_EXP_PROJECTFILTER, REQ_EXP_EVENTFILTER, or any filter requirement
- ✅ AC-4 explicitly preserves `TreeItem.command` for future use

---

## Level 2: Design

**Status**: ✅ completed

### Design Decisions

- No changes to either TreeProvider — `contextValue` is already `'project'` / `'event'` / `'folder'`
- `LeafNode.id` is the absolute file path — `vscode.Uri.file(element.id)` gives the file URI
- `TreeItem.command` remains unset on all leaf items
- Inline button grouped under `"inline"` group in `view/item/context`

### Impacted Specs

| ID | Title | Impact |
|----|-------|--------|
| SPEC_EXP_EXTENSION | Extension Manifest & Activation | modified — add `jarvis.openYamlFile` command registration + `REQ_EXP_OPENYAML` link |

### New SPEC: SPEC_EXP_OPENYAML_CMD

```rst
.. spec:: Open YAML Command
   :id: SPEC_EXP_OPENYAML_CMD
   :status: draft
   :links: REQ_EXP_OPENYAML

   **Description:**
   A command ``jarvis.openYamlFile`` opens the YAML file associated with a tree leaf item.

   **Handler:**

   The command receives the selected ``LeafNode`` as its argument (VS Code passes the
   element from the ``TreeDataProvider`` when the inline action is triggered).

   .. code-block:: typescript

      vscode.commands.registerCommand('jarvis.openYamlFile', (element: LeafNode) => {
          const uri = vscode.Uri.file(element.id);
          vscode.commands.executeCommand('vscode.open', uri);
      });

   **Registration in package.json:**

   * ``contributes.commands``: ``jarvis.openYamlFile`` with title "Open YAML File"
     and icon ``$(go-to-file)``
   * ``contributes.menus.view/item/context``: two entries, both with ``group: "inline"``

     .. code-block:: json

        [
          {
            "command": "jarvis.openYamlFile",
            "when": "viewItem == project",
            "group": "inline"
          },
          {
            "command": "jarvis.openYamlFile",
            "when": "viewItem == event",
            "group": "inline"
          }
        ]
```

### Modified SPEC_EXP_EXTENSION

```rst
   * Add ``REQ_EXP_OPENYAML`` to ``:links:``
   * Register ``jarvis.openYamlFile`` command in ``activate()``
```

### Horizontal Check (MECE)

- ✅ SPEC_EXP_PROVIDER: `contextValue` already set — no change
- ✅ SPEC_EXP_SCANNER: zero impact
- ✅ Filter command specs fully separate, no overlap
- ✅ SPEC_EXP_OPENYAML_CMD minimal and self-contained

---

## Final Consistency Check

**Status**: ✅ passed

| US | REQ | SPEC | Complete |
|----|-----|------|----------|
| US_EXP_OPENYAML | REQ_EXP_OPENYAML | SPEC_EXP_OPENYAML_CMD, SPEC_EXP_EXTENSION | ✅ |

Cross-level: US intent → REQ behavior → SPEC implementation consistent.
`TreeItem.command` reserved through all levels. Folder exclusion via `contextValue` through all levels.
All elements set to `:status: approved` and committed to RST files.
