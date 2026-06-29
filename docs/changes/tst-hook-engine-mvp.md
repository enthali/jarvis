# Test Protocol: hook-engine-mvp

**Change Document:** [hook-engine-mvp.md](hook-engine-mvp.md)
**Verification Report:** [val-hook-engine-mvp.md](val-hook-engine-mvp.md)
**Branch:** `feature/hook-engine-mvp`
**UAT Specs:** `SPEC_HOOK_CONFIG` (AC-1–AC-6), `SPEC_HOOK_BRIDGE` (AC-1–AC-4), `SPEC_HOOK_INTAKE` (AC-1–AC-5), `SPEC_HOOK_LOG` (AC-1–AC-4)
**Tester:** Automated (vitest) + Manual (VS Code Extension Development Host, Agent Hooks Preview)
**Date:** 2026-06-28

---

## Pre-conditions / Setup

1. Compile the branch: `npx tsc -p packages/core` — must be clean (0 errors).
2. Unit tests executable: `npx vitest run` — baseline green.
3. For manual E2E (Group F): VS Code with **Agent Hooks (Preview)** available; an agent session that fires lifecycle events.
4. A clean test workspace (no pre-existing `.jarvis/hooks/`).

---

## Group A — Self-Install (Unit / Integration)

### TC-1 — Hook config and bridge are written to `.jarvis/hooks/`

*UAT ref: SPEC_HOOK_CONFIG AC-1, AC-3 / REQ_HOOK_INTAKE AC-1*

**Pre-condition:** Activate the engine in a workspace with no `.jarvis/hooks/`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run activation. | `.jarvis/hooks/jarvis-hooks.json` exists. | |
| 2 | Parse the config. | It registers all eight events, each invoking `node .jarvis/hooks/bridge.mjs`. | |
| 3 | Check `.jarvis/hooks/bridge.mjs` exists. | Bridge script written. | |

---

### TC-2 — Workspace settings merge (not overwrite)

*UAT ref: SPEC_HOOK_CONFIG AC-2 / REQ_HOOK_INTAKE AC-1*

**Pre-condition:** `.vscode/settings.json` already contains a `chat.hookFilesLocations` entry (e.g. `{".github/hooks": true}`).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run activation. | `chat.hookFilesLocations` in `.vscode/settings.json` now includes `".jarvis/hooks": true`. | |
| 2 | Verify pre-existing entries. | The prior `.github/hooks` entry is preserved (merge, not overwrite). | |
| 3 | Inspect user/machine settings. | No user/machine setting was modified. | |

---

### TC-3 — Port file written after listener binds

*UAT ref: SPEC_HOOK_CONFIG AC-4, AC-5 / SPEC_HOOK_INTAKE AC-1*

**Pre-condition:** Activation with the HTTP listener enabled.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run activation. | `.jarvis/hooks/port` contains the bound ephemeral port as plain text. | |
| 2 | Compare to the listener's actual port. | The value equals `httpServer.address().port`. | |
| 3 | Inspect `jarvis-hooks.json` across two activations. | The config is unchanged (carries no port); only `.jarvis/hooks/port` changes. | |

---

### TC-4 — Activation is best-effort (never throws)

*UAT ref: SPEC_HOOK_CONFIG AC-6*

**Pre-condition:** Simulate a failure writing `.jarvis/hooks/` (e.g. read-only path).

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run activation with the self-install failing. | Activation completes successfully; the failure is logged, not thrown. | |
| 2 | Verify the rest of the extension activates normally. | No regression to other features. | |

---

## Group B — Bridge (Unit)

### TC-5 — Bridge reads stdin and POSTs to the port-file port

*UAT ref: SPEC_HOOK_BRIDGE AC-1, AC-2 / REQ_HOOK_INTAKE AC-1*

**Pre-condition:** A mock HTTP server on a known port; `.jarvis/hooks/port` contains that port; pipe an event JSON to the bridge's stdin.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run `node bridge.mjs` with event JSON on stdin. | The bridge reads the full JSON. | |
| 2 | Verify the mock server received a `POST /hooks`. | Body equals the input JSON. | |
| 3 | Verify the target port. | Equals the value in `.jarvis/hooks/port`. | |

---

### TC-6 — Bridge always returns `{"continue": true}` and exit 0

*UAT ref: SPEC_HOOK_BRIDGE AC-3 / REQ_HOOK_INTAKE AC-6*

**Pre-condition:** Various failure modes.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run the bridge with a valid POST target. | stdout is `{"continue": true}`; exit code 0. | |
| 2 | Run with the port file **missing**. | stdout is `{"continue": true}`; exit 0 (no crash). | |
| 3 | Run with the POST target unreachable (transport error). | stdout is `{"continue": true}`; exit 0 (error swallowed). | |
| 4 | Confirm the bridge never emits a blocking output (`continue:false`, exit 2). | Agent is never blocked or influenced. | |

---

### TC-7 — Bridge has no non-stdlib dependency

*UAT ref: SPEC_HOOK_BRIDGE AC-4*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Inspect `bridge.mjs` imports. | Only `node:*` standard modules (`http`, `fs`, `url`, `path`). | |

---

## Group C — HTTP Intake Listener (Unit / Integration)

### TC-8 — Listener binds an ephemeral port independent of MCP

*UAT ref: SPEC_HOOK_INTAKE AC-1, AC-5 / REQ_HOOK_INTAKE AC-5*

**Pre-condition:** Activate with `jarvis.mcpEnabled = false`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Run activation with MCP disabled. | The hook listener still binds `127.0.0.1` on an ephemeral port. | |
| 2 | Verify the bound port is non-fixed. | Two activations may yield different ports (OS-assigned). | |
| 3 | Confirm the port is written to `.jarvis/hooks/port`. | Matches the bound port. | |

---

### TC-9 — `POST /hooks` parses body and calls `HookEngine.receive()`

*UAT ref: SPEC_HOOK_INTAKE AC-2, AC-3 / REQ_HOOK_INTAKE AC-2*

**Pre-condition:** Listener running; spy on `HookEngine.receive`.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | POST a valid hook event JSON to `/hooks`. | Body is parsed into a `HookEvent` (`eventName`, `sessionId?`, `timestamp?`, raw `payload`). | |
| 2 | Verify `HookEngine.receive(event)` is called once with that event. | Dispatch occurred. | |
| 3 | Verify the HTTP response. | `200` with `{"continue": true}`. | |

---

### TC-10 — `receive()` is the stable intake contract (bus-ready)

*UAT ref: SPEC_HOOK_INTAKE AC-4 / REQ_HOOK_INTAKE AC-4*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Inspect `HookEngine`. | `receive(event: HookEvent)` is the single intake entry; the MVP routes it to the logger sink. | |
| 2 | Confirm no bus/subscriber logic is present in the MVP. | Direct sink call only (bus is a documented future extension). | |

---

### TC-11 — Listener starts on activate, stops on deactivate

*UAT ref: SPEC_HOOK_INTAKE AC-5*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Activate. | Listener is bound and accepting connections. | |
| 2 | Deactivate. | Listener is closed; the port is released. | |

---

## Group D — Logging Sink (Unit)

### TC-12 — Events logged to the Jarvis channel with `[Hook]` tag

*UAT ref: SPEC_HOOK_LOG AC-1, AC-2, AC-4 / REQ_HOOK_LOG AC-1, AC-2, AC-4*

**Pre-condition:** Mock `LogOutputChannel`; call `HookEngine.receive()` with a sample event.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `receive()` with a `PostToolUse` event carrying `session_id`. | One log entry on the "Jarvis" channel, prefixed `[Hook]`. | |
| 2 | Inspect the entry. | Includes the event name, the session id, and the full payload. | |
| 3 | Verify no separate output channel was created. | Reuses the existing "Jarvis" `LogOutputChannel`. | |

---

### TC-13 — Sink takes no action beyond logging

*UAT ref: SPEC_HOOK_LOG AC-3 / REQ_HOOK_LOG AC-3*

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Call `receive()` with any event. | Only a log entry is produced — no bus dispatch, no triggered action, no memory injection, no per-session routing. | |

---

## Group E — All 8 Events (Unit)

### TC-14 — Each of the eight lifecycle events is handled

*UAT ref: REQ_HOOK_INTAKE AC-1 / SPEC_HOOK_CONFIG AC-1*

**Pre-condition:** For each event name, POST a representative payload to `/hooks`.

| # | Event | Expected | ✓/✗ |
|---|-------|----------|------|
| 1 | `SessionStart` | Parsed, `receive()` called, `[Hook] SessionStart …` logged. | |
| 2 | `UserPromptSubmit` | Parsed, logged. | |
| 3 | `PreToolUse` | Parsed, logged. | |
| 4 | `PostToolUse` | Parsed, logged. | |
| 5 | `PreCompact` | Parsed, logged. | |
| 6 | `SubagentStart` | Parsed, logged. | |
| 7 | `SubagentStop` | Parsed, logged. | |
| 8 | `Stop` | Parsed, logged. | |

---

## Group F — End-to-End (Manual, Agent Hooks Preview)

### TC-15 — E2E: real agent activity appears in the Jarvis Output Channel

*UAT ref: US_HOOK_OBSERVE AC-1, AC-2 (acceptance criterion)*

**Pre-condition:** VS Code Dev Host with the extension active and Agent Hooks Preview enabled; `.jarvis/hooks/` self-installed; an agent session.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Start an agent session in the workspace. | A `SessionStart` `[Hook]` entry appears in the "Jarvis" Output Channel. | |
| 2 | Submit a prompt that causes tool use. | `UserPromptSubmit`, `PreToolUse`, `PostToolUse` `[Hook]` entries appear. | |
| 3 | Inspect the logged payloads. | Each entry shows the event's JSON (incl. `session_id` where present). | |
| 4 | Confirm the agent runs normally. | No blocking, no behavioural change — the bridge never influenced the agent. | |

---

### TC-16 — E2E: multi-instance isolation

*UAT ref: SPEC_HOOK_CONFIG (multi-instance) / SPEC_HOOK_INTAKE AC-1*

**Pre-condition:** Two VS Code windows open on **different** workspaces, both with the extension active.

| # | Step | Expected | ✓/✗ |
|---|------|----------|------|
| 1 | Check each workspace's `.jarvis/hooks/port`. | Each contains a different port (per-workspace, OS-assigned). | |
| 2 | Trigger agent activity in window A. | Only window A's "Jarvis" channel logs the events. | |
| 3 | Trigger activity in window B. | Only window B's channel logs — no cross-talk. | |

---

## Summary of Test Coverage

| Group | TCs | Method | Coverage |
|-------|-----|--------|----------|
| A — Self-Install | TC-1…TC-4 | Unit/Integration | SPEC_HOOK_CONFIG AC-1–AC-6 |
| B — Bridge | TC-5…TC-7 | Unit | SPEC_HOOK_BRIDGE AC-1–AC-4 |
| C — HTTP Intake | TC-8…TC-11 | Unit/Integration | SPEC_HOOK_INTAKE AC-1–AC-5 |
| D — Logging Sink | TC-12, TC-13 | Unit | SPEC_HOOK_LOG AC-1–AC-4 |
| E — All 8 Events | TC-14 | Unit | REQ_HOOK_INTAKE AC-1 |
| F — E2E Manual | TC-15, TC-16 | Manual | Acceptance criterion + multi-instance |
