# jarvis-syspilot Module — Agreed Scope (for GH #39)

Firm decisions from the PM + user discussion 2026-07-20. This is the
authoritative model for the change request — **not** the `bootstrap.json`
framing in issue #39, which is outdated.

## Contract (corrected)

- The interface between Jarvis and syspilot is the **Frontmatter version in
  `syspilot.setup.agent.md`** — NOT `bootstrap.json`.
- `bootstrap.json` is syspilot-internal (how the Setup Agent pulls itself out
  of the swamp). We only copy it blindly along with the agent.
- Source of truth for the upstream agent: a **syspilot Release Tag** (typically
  head of `main`) at `syspilot/agents/syspilot.setup.agent.md`. Pinned, trusted.

## Flow

1. On VS Code **startup**: does `.github/agents/syspilot.setup.agent.md` exist locally?
   - **No** → copy the current (release-tag-pinned) agent + bootstrap.json,
     then send a "update / initial setup available" message.
   - **Yes** → read Frontmatter version, compare with upstream version.
2. **Versions differ** → ensure the **"Syspilot Setup Engineer"** actor exists
   (create if missing) → send it a message.
3. **Message = our injected prompt** (not syspilot behaviour):
   "A new syspilot version is available. Install it, suspend for X days, or
   skip this version?"
   - Suspend → agent calls **`jarvis.delaySyspilotUpdate(<days>)`**, aborts setup.
   - Skip → agent calls **`jarvis.SyspilotSkipThisVersion()`**; we remember the
     version and stop notifying for it.
4. **Manual trigger**: command **`jarvis.syspilotUpdate`** forces a re-check and
   **ignores both** suspend and skip state.
5. **Weekly**: user optionally configures a heartbeat job on the command. The
   module itself only does startup + command — no internal scheduler.

## Opt-out

- Complete opt-out = uninstall the module. No separate "don't manage" state.

## Key names (locked)

- Actor: **"Syspilot Setup Engineer"**
- Module tools: `jarvis.delaySyspilotUpdate(<days>)`, `jarvis.SyspilotSkipThisVersion()`
- Command: `jarvis.syspilotUpdate`

## Notes for the System Designer

- Design against THIS model, not issue #39's `bootstrap.json` text.
- Supply-chain requirement: agent fetched only from a pinned syspilot Release Tag.
- The module never asks for install consent and never installs — it detects
  and hands off; syspilot decides and installs.
