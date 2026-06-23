# Change: wsl2-session-lookup

## Summary

Extend `SPEC_MSG_SESSIONLOOKUP` to support **WSL2 remote** environments where
`globalStorageUri.fsPath` resolves to a WSL2 Linux path but `state.vscdb` lives
on the Windows host.

## Problem

In WSL2 remote mode, the VS Code extension host runs on Linux.
`globalStorageUri.fsPath` resolves to
`/home/<user>/.vscode-server/data/User/globalStorage/...` — but `state.vscdb`
lives on the Windows host at
`C:\Users\<username>\AppData\Roaming\Code\User\workspaceStorage\<hash>\state.vscdb`
(accessible from WSL2 at `/mnt/c/Users/<username>/AppData/Roaming/Code/User/...`).
The computed Linux path doesn't exist → `lookupSessionUUID` returns `undefined`
→ every `sendToSession` creates a duplicate.

## Affected Spec Elements

| Level | ID | Action |
|-------|-----|--------|
| US | `US_MSG_REMOTECOMPAT` | AC-5 added (WSL2 session lookup) |
| REQ | `REQ_MSG_SESSIONLOOKUP` | AC-10, AC-11 added (WSL2 detection + lookup correctness) |
| SPEC | `SPEC_MSG_SESSIONLOOKUP` | WSL2 path resolution section + `resolveUserDataPath()` helper + design decision |

## Design Decisions

- **D-1**: Detect WSL2 by reading `/proc/version` — standard, no external dependency
- **D-2**: Use `USERNAME` env var (not `APPDATA`) — `APPDATA` is not available in the user's WSL2 environment
- **D-3**: Hard-code `/mnt/c/Users/<USERNAME>/AppData/Roaming/Code/User` — this is the canonical VS Code user-data location on Windows, accessible from WSL2 via the default `/mnt/c` mount
- **D-4**: Workspace hash extraction unchanged — the hash is identical on both sides

## Status

- [x] Spec updated (US, REQ, SPEC)
- [ ] Implementation
- [ ] Test protocol
- [ ] Verification
