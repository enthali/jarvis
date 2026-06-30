# Historical Findings — Research Archive

Index of research findings from past investigations. Each entry links to a detailed research document.

---

## FIND-2026-04-16 — Background Agent Sessions (Proposed APIs Research)

**Kurz:** VS Code proposed APIs = Sackgasse (Provider-Pattern). Copilot CLI headless ✅. SQLite `session-store.db` = shared state CLI ↔ VS Code. MCP-bridge ✅. Ping-Problem → PTY/Named-Pipe solutions.

**Detail:** [FIND-2026-04-16-background-agent-sessions.md](FIND-2026-04-16-background-agent-sessions.md)

---

## FIND-2026-04-17 — Experiments: VS Code Terminal Inject + node-pty

**Kurz:** WriteConsoleInput ❌ for Copilot CLI. node-pty PTY-wrapper ✅ (breakthrough). VS Code `terminal.sendText(text+'\r', false)` ✅ — no wrapper needed. No CLI+Chat View parallel. UUID preset via `--resume=<uuid>` ✅.

**Detail:** [FIND-2026-04-17-experiments-terminal-inject.md](FIND-2026-04-17-experiments-terminal-inject.md)

---

## FIND-2026-05-23 — Custom Agent Binding + Architecture Review

**Kurz:** `workbench.action.chat.open { mode }` akzeptiert Custom-Agent-Namen. Agent-Binding per `agent`-Feld in YAML. Architecture Review 11 Findings (F1–F11). Copilot Memory für Workflow-Wissen disabled.

**Detail:** [FIND-2026-05-23-custom-agent-and-architecture.md](FIND-2026-05-23-custom-agent-and-architecture.md)

---
