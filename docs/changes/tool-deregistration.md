# Change: tool-deregistration (REJECTED)

**Status:** rejected
**Branch:** feature/tool-deregistration (deleted locally, never merged, never pushed)
**Mode:** autonomous
**Origin:** PM CR 2026-05-19
**Outcome:** Rejected on 2026-05-19 after user UAT exposed a fundamental design flaw. Retained as an Architectural Decision Record / Lessons Learned.

---

## Rejection Summary (read this first)

**Decision:** Do not pursue runtime LM tool registration in Jarvis.

**Reason:** VS Code's Language Model Tool API is effectively **static** for the
tool-picker UI. Calling `dispose()` on a registration returned by
`vscode.lm.registerTool()` does **not** remove the tool entry from the user's
Tool Picker — the picker continues to display it. Subsequent invocations then
fail because the backend handler is gone, producing a *worse* user experience
than the pre-change state (where tools were always callable, even if the
feature reported "not enabled").

**Consequences:**

- AC-2 (toggle off → tool disappears without reload) — **technically
  unachievable** with the current VS Code API.
- AC-3 (toggle on → tool reappears) — same.
- The change actually regressed the UX for any disabled-then-re-toggled tool.

**Replacement strategy:** None needed. The VS Code Tool Picker already lets
users disable individual tools by hand. That UX is sufficient.

**What stays on `develop`:** Nothing. All code and spec changes that lived on
`feature/tool-deregistration` are discarded. The branch was never pushed to
origin and was deleted locally.

**Follow-up observations (filed for PM, not actioned here):**

- LM tools are registered without a `jarvis_` prefix while MCP tools use one.
  Naming-discrepancy candidate for a separate mini-CR.

---

## Lessons Learned

1. **Validate API capability before approving the CR.** The Change Document
   asserted "no Extension Host reload required" as an AC without verifying that
   the VS Code LM Tool API actually supports that. A 30-minute prototype
   (register → dispose → check picker) would have caught the flaw before
   System Designer, Test Engineer, and Dev Engineer cycles ran.
2. **Distinguish API contract from API behaviour.** `Disposable` returned by
   `vscode.lm.registerTool` follows the disposable *contract* (call dispose to
   release resources) but its observable *behaviour* on the Tool Picker is
   not what one would assume by analogy with other registry APIs.
3. **MCP runtime gating was scoped out for a good reason** — the same
   limitation actually applies to LM tools too, so we should have been
   sceptical from the start.
4. **Cost of the lesson:** ~4 commits (spec + UAT + implement + MECE) on a
   throwaway branch; no impact on `develop`. Acceptable as a learning cost
   given the resulting ADR.

---

## Original Change Document (preserved for context)

The text below is the CR as it was approved by PM before UAT discovered the
flaw. It is kept verbatim so future readers understand exactly what was
proposed and why the approach failed.

### Summary

Make LM tool registration **feature-toggle aware** at runtime. A tool whose
backing feature is disabled MUST NOT appear in the LM tool catalogue. When a
user toggles a feature on/off in the Settings UI, the corresponding tool
appears/disappears immediately — no Extension Host reload required.

Tools belonging to permanently-on capabilities (cross-session messaging API)
remain always registered.

### Why

After `settings-cleanup` (CR1), every feature has a clean
`jarvis.<feature>.enabled` toggle. Today all LM/MCP tools are registered
unconditionally during `activate()`. Consequences:

- LLM sees tools whose backend will throw "not enabled" — confusing failure mode.
- Tool namespace is polluted, pushing the LLM toward irrelevant tools.
- Disabled feature still occupies a tool slot.

The proposed fix was to let the toggle state directly drive tool registration —
add when on, dispose when off — so the catalogue would always mirror what the
user has enabled. **This proved impossible with the current VS Code LM API.**

### Acceptance Criteria (user-visible) — none of these are achievable

1. A tool of a disabled feature does not appear in the LM tool catalogue.
2. Disabling a feature in the Settings UI removes the corresponding tool from
   the LM catalogue **without** an Extension Host reload.
3. Re-enabling a feature in the Settings UI re-registers the corresponding
   tool, making it immediately available again.
4. Tools belonging to always-on capabilities (cross-session messaging:
   `jarvis_sendToSession`, `jarvis_readMessage`, `jarvis_listSessions`) are
   always registered regardless of any feature toggle.

### Tool → feature-toggle mapping (proposed; not implemented)

| Tool name | Feature gate(s) | Notes |
|---|---|---|
| `jarvis_sendToSession` | — (always on) | Core cross-session API |
| `jarvis_readMessage` | — (always on) | Core cross-session API |
| `jarvis_listSessions` | — (always on) | Core cross-session API |
| `jarvis_listProjects` | `jarvis.projects.enabled` | |
| `jarvis_listSessionEntities` | `jarvis.sessions.enabled` | |
| `jarvis_registerJob` | `jarvis.heartbeat.enabled` | |
| `jarvis_unregisterJob` | `jarvis.heartbeat.enabled` | |
| `jarvis_listJobs` | `jarvis.heartbeat.enabled` | |
| `jarvis_setReminder` | `jarvis.messages.enabled` AND `jarvis.reminders.enabled` | Reminders are a sub-feature of Messages |
| `jarvis_listReminders` | `jarvis.messages.enabled` AND `jarvis.reminders.enabled` | |
| `jarvis_cancelReminder` | `jarvis.messages.enabled` AND `jarvis.reminders.enabled` | |
| `jarvis_category` | `jarvis.pim.showCategories` | |
| `jarvis_task` | `jarvis.outlook.enabled` AND `jarvis.outlook.tasks.enabled` | |

## Process Log

- 2026-05-19: PM submitted CR. CM accepted (autonomous mode).
- 2026-05-19: Branch `feature/tool-deregistration` created from `develop`
  (post agent-prompt-tuning merge `2fa564b`). Workflow note: CM had branched
  before PM approval; PM corrected the workflow and CM acknowledged.
- 2026-05-19: PM approved. System Designer wrote US_DEV_TOOLGATING,
  REQ_DEV_TOOLGATING, SPEC_DEV_TOOLCOORDINATOR; updated SPEC_MSG_DUALREGISTRATION
  and SPEC_MSG_MCPSERVER (commit `5c1a554`).
- 2026-05-19: Test Engineer authored 12 UAT scenarios (T-1..T-12) across 5 UAT
  stories (commit `e462358`).
- 2026-05-19: Dev Engineer implemented the `gatedTools[]` coordinator with
  `syncTool`/`syncAll` and a single `onDidChangeConfiguration` listener;
  refactored 10 gated tools (commit `2354338`). TS clean, Sphinx clean.
- 2026-05-19: MECE Round 1 — 3 Minor doc-only findings, all fixed
  (commit `ac86b00`).
- 2026-05-19: User UAT in Extension Development Host. **T-2..T-7 FAIL**:
  toggling a feature off does not remove the tool from the VS Code Tool
  Picker; subsequent invocations fail with backend-not-registered errors.
  Tool Picker is a static surface for `vscode.lm` registrations.
- 2026-05-19: PM **rejected** the CR. CM switched to develop and deleted the
  feature branch locally (never pushed). This document was preserved as an ADR
  on develop; all code, spec, and UAT artefacts from the branch are discarded.
