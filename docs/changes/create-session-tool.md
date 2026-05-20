# Change: create-session-tool

**Status:** completed
**Origin:** PM CR 2026-05-19 06:56 UTC
**Mode:** autonomous (default until PM specifies otherwise)
**Branch:** `feature/create-session-tool` (squash-merged into `develop`)

---

## Summary

Add a new LM + MCP tool `jarvis_createSession` that programmatically creates a
new session folder (`<workspace>/.jarvis/sessions/<name>/`) with `session.yaml`
and an empty `context.md`, optionally seeded with an initial message in the
new session's message queue. Idempotent: existing session is detected and
returned as success without overwriting anything.

## Why

LLMs running inside an existing session frequently want to spawn a sub-session
(e.g. "create a research session for X", "spawn QualityManager session"). The
current ecosystem covers:

- `jarvis_sendToSession` — talk to an *existing* session
- Manual UI — create a new session by hand in the Sessions Tree

The gap: programmatic creation from inside a chat. `jarvis_createSession`
closes the loop so an LLM can orchestrate session topology end-to-end without
asking the human to click through the tree UI.

## Acceptance Criteria (verbatim from CR)

1. Tool `jarvis_createSession` is registered via LM and MCP when
   `jarvis.sessions.enabled=true`.
2. Successful call creates session folder + `session.yaml` + `context.md`.
3. Sessions Tree shows the new session within 2 seconds without manual refresh.
4. Optional `initialMessage` lands in the new session's message queue and is
   read on the next inbox poll.
5. If the session already exists: tool returns success with
   `session "<name>" already exists; no action taken`. No file is overwritten,
   no `initialMessage` is sent.
6. With `jarvis.sessions.enabled=false`: tool is not registered (same gating
   semantics as `jarvis_listSessionEntities`).

## Tool Surface

| Parameter | Type | Required | Purpose |
|---|---|---|---|
| `name` | string | yes | Session name; used verbatim as folder name |
| `summary` | string | no | Short description for `session.yaml` |
| `initialMessage` | string | no | First message enqueued for the new session right after creation |

**Response shape (proposed, to be locked in by System Designer):**

- Success (created): `{ created: true, path: ".jarvis/sessions/<name>" }`
- Success (already existed, idempotent): `{ created: false, reason: "session \"<name>\" already exists; no action taken", path: ".jarvis/sessions/<name>" }`

## Scope

**In scope:**

- New LM tool registration (via `registerDualTool`)
- New MCP tool registration (same handler)
- Both gated by `jarvis.sessions.enabled` (always-true today, but the gate is
  the same semantics as `jarvis_listSessionEntities` — see ADR
  `tool-deregistration.md` for why we don't try runtime add/remove)
- Folder + `session.yaml` + `context.md` creation
- Optional `initialMessage` enqueue via existing message queue helpers
- Rescan trigger so Sessions Tree updates within 2 s (AC-3)
- UAT scenarios for all 6 ACs

**Out of scope (per CR):**

- ~~Auto-opening the Agent Chat for the new session (UI variant only; this tool
  is headless)~~ — *was originally out of scope; reversed in UAT review
  (see Design Decision 2 revised).*
- Cross-project sessions — workspace root only
- Renaming, deleting, or copying sessions

## Verified Impact Analysis (System Designer — 2026-05-19)

Impact analysis executed via `syspilot.impact-python` skill (`get_need_links.py`).

### Starting points queried

| ID | Rationale |
|---|---|
| `US_SES_SESSIONS` | Parent US — all session-tool REQs link to it |
| `REQ_SES_LISTTOOL` | Closest analogue REQ (list tool gating pattern) |
| `REQ_SES_NEWENTITY` | Closest analogue REQ (session file creation logic) |

### Result — existing elements (context only, no modification required)

| ID | Type | Title | Verdict |
|---|---|---|---|
| `US_SES_SESSIONS` | US | Sessions Entity Type | Context — new US links here? No — new tool has distinct WHY |
| `REQ_SES_TOGGLE` | REQ | Sessions Feature Toggle | Context — gating described here, no change |
| `REQ_SES_LISTTOOL` | REQ | jarvis_listSessionEntities LM+MCP Tool | Analogue only — no change |
| `SPEC_SES_TOOLS` | SPEC | jarvis_listSessionEntities Tool Registration | Analogue only — no change |
| `SPEC_SES_NEWENTITY` | SPEC | newEntity Command — Session Branch | Reference for file layout + yaml format |
| `REQ_SES_NEWENTITY` | REQ | newEntity Command — Session Support | Reference for session.yaml content |

### New elements introduced by this CR

| ID | Type | File |
|---|---|---|
| `US_SES_CREATETOOL` | US | `docs/userstories/us_ses.rst` |
| `REQ_SES_CREATETOOL` | REQ | `docs/requirements/req_ses.rst` |
| `SPEC_SES_CREATETOOL` | SPEC | `docs/design/spec_ses.rst` |

### CR hypothesis vs. actual scope

The CR's "Suspected affected files" table was accurate. No additional elements
were pulled in; no existing REQ/SPEC required modification. The three new
sphinx-needs elements form a clean vertical stack.

## Design Decisions Already Made (PM-imposed)

1. **Idempotency over destructive create.** Repeated calls with the same
   `name` must NOT overwrite or re-enqueue. Prevents session inflation and
   accidental message duplication from retry loops.
2. ~~**Headless.** No automatic chat editor opening — keeps the tool safe to
   call from background contexts (heartbeat jobs, batch flows).~~
   *(Reversed after UAT — see Decision 2 revised below.)*

   **Design Decision 2 (revised after UAT — 2026-05-19):** After successful
   creation (`created: true`), the tool MUST auto-open the new session's agent
   chat, mirroring the `jarvis.newSession` UI command by calling
   `vscode.commands.executeCommand('jarvis.openAgentSession', leaf)` where
   `leaf = { kind: 'leaf', id: path.join(targetPath, 'session.yaml') }`.
   On idempotent skip (`created: false`), the tool MUST also trigger the same
   auto-open command so callers get a consistent open-session end-state
   regardless of whether creation or skip occurred.

   **Rationale:** UAT scenario T-11 (round-trip with `jarvis_sendToSession`)
   revealed that headless creation produces inert sessions — `sendToSession`
   lands in the queue but is never delivered because no chat editor is open.
   Auto-opening via `jarvis.openAgentSession` + the existing 5 s auto-delivery
   poll closes the loop naturally without requiring synchronous first-prompt
   wiring. Errors from `openAgentSession` MUST be caught and logged at `warn`
   level; they MUST NOT cause the tool to fail (session folder already exists;
   auto-open is best-effort).

3. **Workspace-root only.** No cross-project ambiguity.
4. **Same gating semantics as other session tools.** Registered at startup
   if `jarvis.sessions.enabled=true`; otherwise not registered. No runtime
   toggle handling (see ADR `tool-deregistration.md`).

## Open Questions for PM (none blocking — defaults proposed)

1. **Naming convention for the session folder when `name` contains
   filesystem-unfriendly characters (spaces, `/`, `:`, etc.)?**
   *Default proposal:* reject with error `invalid session name: <reason>`.
   Document allowed character set in the tool description and in
   `session.yaml` schema docs. Slug-ification would silently mutate the name
   and break the user's expectation of using `name` verbatim with
   `jarvis_sendToSession` afterwards.
2. **`session.yaml` minimum fields?**
   *Default proposal:* `name` (required, equals folder name); `summary` (only
   if provided by tool call). Match whatever the manual UI variant currently
   writes — System Designer to verify.

## Process Log

- 2026-05-19 06:56 UTC: PM submitted CR via Jarvis message queue.
- 2026-05-19 08:5x UTC: CM Intent Gate passed (CR well-formed, no
  implementation instructions). Change Document drafted on `develop` working
  tree (uncommitted). **Awaiting PM approval before branching and invoking
  System Designer.**
- 2026-05-19 (branch `feature/create-session-tool`, HEAD b55bf1c): PM approved
  change document including both default proposals (invalid name → error, not
  slug; session.yaml minimal with name + optional summary). CM branched and
  invoked System Designer.
- 2026-05-19: System Designer executed impact analysis, wrote US/REQ/SPEC
  (`US_SES_CREATETOOL`, `REQ_SES_CREATETOOL`, `SPEC_SES_CREATETOOL`), verified
  Sphinx build clean. Spec committed on `feature/create-session-tool`.
- 2026-05-19: MECE Round 1 advisory: 2 Major + 2 Minor + 1 Nit findings, all
  5 applied by System Designer.
- 2026-05-19: REQ AC-9 added to close traceability gap surfaced during Test
  Engineer pass for T-10 precondition prefix.
- 2026-05-19: MECE final pass: 2 Major + 2 Minor + 1 Nit doc findings, all
  applied (F1: T-10 UAT trace gap for REQ AC-9; F2: SPEC_SES_CREATETOOL
  gating prose corrected; F4: T-10 expected-result text corrected; F5:
  escaping parenthetical added to serialisation prose). Code finding F3 sent
  to Dev Engineer in parallel.
- 2026-05-19: Documentation Engineer updated copilot-instructions.md (tool inventory: count 9→14, added jarvis_listJobs, jarvis_setReminder, jarvis_listReminders, jarvis_cancelReminder, jarvis_createSession with gating note) and README.md (LM Tools list: added jarvis_createSession one-liner).
- 2026-05-19: UAT T-11 revealed headless creation produces inert sessions — `sendToSession` lands in queue but delivery never happens because the chat is not open. PM reversed Decision 2 in CM session, accepting UAT-driven deviation from original CR. System Designer applying auto-open extension: REQ AC-10 added, SPEC_SES_CREATETOOL updated, T-12 and T-13 added to UAT spec.
