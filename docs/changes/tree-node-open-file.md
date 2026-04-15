# Change Document: tree-node-open-file

**Status**: approved
**Branch**: feature/tree-node-open-file
**Created**: 2026-04-15
**Author**: Change Agent (autonomous)

---

## Summary

Adds click-to-navigate behaviour for two tree node types in the Jarvis Explorer:
clicking a Heartbeat Job node opens `heartbeat.yaml` and reveals the line where
that job is defined; clicking a Message node opens the messages JSON file and
reveals the position of that message. Both use `openTextDocument` +
`showTextDocument` + `revealRange`. No new editor type, no side effects.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_EXP_SIDEBAR | Project & Event Explorer | context | Heartbeat and Message views are sub-features of the sidebar |
| US_EXP_OPENYAML | Open YAML from Tree Item | context | Related pattern — same open-file mechanic, different node types |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_EXP_OPENFILE | Open Source File from Tree Node | optional |

### Decisions

- D-1: Single US covers both node types (Heartbeat + Message) — same intent "click to navigate to source file"
- D-2: Theme EXP (Explorer UI) — navigation feature, not automation or messaging
- D-3: `US_EXP_OPENYAML` is not modified — it already covers YAML-file navigation for projects/events; the new US extends the concept to heartbeat and message nodes

### Horizontal Check (MECE)

- ✅ No contradiction with `US_EXP_OPENYAML` — that story covers project/event YAML files; `US_EXP_OPENFILE` covers heartbeat config and message queue files
- ✅ No redundancy — no existing US covers clicking heartbeat or message nodes
- ✅ No gap — both affected node types (heartbeat job, message) are covered by one US

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_EXP_OPENYAML | US_EXP_OPENYAML | context | Existing open-file pattern used as reference |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_EXP_HEARTBEAT_OPENFILE | Open heartbeat.yaml at Job Line | US_EXP_OPENFILE | optional |
| REQ_EXP_MESSAGE_OPENFILE | Open messages file at Message Position | US_EXP_OPENFILE | optional |

### Decisions

- D-4: Two separate REQs — the two node types target different source files and use different position-lookup strategies
- D-5: `REQ_EXP_HEARTBEAT_OPENFILE` — line lookup by job name match in heartbeat.yaml
- D-6: `REQ_EXP_MESSAGE_OPENFILE` — position lookup by message index in the JSON queue file
- D-7: Fallback to line 0 (start of file) when position cannot be determined — fail-open, no error dialog

### Horizontal Check (MECE)

- ✅ No contradiction with existing REQs — `REQ_EXP_OPENYAML` covers project/event only
- ✅ All new REQs link to `US_EXP_OPENFILE`
- ✅ No gaps — both node types have a dedicated REQ

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_EXP_EXTENSION | SPEC_EXP_HEARTBEAT_OPENFILE, SPEC_EXP_MESSAGE_OPENFILE | additive | Two new commands registered in `package.json` and `extension.ts` |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_EXP_HEARTBEAT_OPENFILE | Open Heartbeat Job in heartbeat.yaml | REQ_EXP_HEARTBEAT_OPENFILE |
| SPEC_EXP_MESSAGE_OPENFILE | Open Message in messages JSON file | REQ_EXP_MESSAGE_OPENFILE |

### Decisions

- D-8: Command `jarvis.openHeartbeatJob` registered in `extension.ts`; invoked via `TreeItem.command` on `JobNode`
- D-9: Command `jarvis.openMessageFile` registered in `extension.ts`; invoked via `TreeItem.command` on `MessageLeafNode`
- D-10: Line search for heartbeat job: read file content, split by lines, find first line containing `name: <jobName>` or `- name: <jobName>`; use that line index
- D-11: Position search for message: compute line offset from JSON structure by finding the Nth `"text":` occurrence (matching by index)
- D-12: Both use `vscode.workspace.openTextDocument` + `vscode.window.showTextDocument` + `editor.revealRange` with `InCenterIfOutsideViewport`
- D-13: No changes to `heartbeatTreeProvider.ts` or `messageTreeProvider.ts` for the contextValue — `heartbeatJob` and `messageItem` already exist; only `TreeItem.command` is added

### Horizontal Check (MECE)

- ✅ No contradiction with `SPEC_EXP_OPENYAML_CMD` — different node types, different command IDs
- ✅ All new SPECs link to their respective REQs
- ✅ No gaps — each REQ has exactly one SPEC

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|-------------|--------|-----------|
| US_EXP_OPENFILE | REQ_EXP_HEARTBEAT_OPENFILE | SPEC_EXP_HEARTBEAT_OPENFILE | ✅ |
| US_EXP_OPENFILE | REQ_EXP_MESSAGE_OPENFILE | SPEC_EXP_MESSAGE_OPENFILE | ✅ |

### Cross-Level Consistency

- US intent ("click a tree node to open and navigate to its source file") → REQ behaviour ("SHALL open file and reveal position") → SPEC implementation (openTextDocument + showTextDocument + revealRange) ✅

### MECE Across Levels

- All aspects of `US_EXP_OPENFILE` are covered by exactly two REQs (one per node type) ✅
- Both REQs are addressed by exactly one SPEC each ✅

---

## UAT Artifacts

*To be generated by syspilot.uat after implementation.*

---

## Notes

- Implementation files: `src/extension.ts` (command registration), `src/heartbeatTreeProvider.ts` (TreeItem.command), `src/messageTreeProvider.ts` (TreeItem.command)
- No new files required
- `package.json` additions: two commands + two `view/item/context` menu entries
