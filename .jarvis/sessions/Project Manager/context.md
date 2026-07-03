# Project Manager — Jarvis

## CR Queue (dispatch after message-flow-diagram merges)

1. **message-api-rename** — supersedes sendtosession-required-sender; combines
   GH issue #12 (API rename Phase 1) with the senderSession fix, per user
   2026-07-03: "better now and hard than later and soft" — one adoption pass
   instead of two.
   - New canonical `jarvis_sendMessage`: `senderSession` required + validated
     against `getValidDestinations()` (exact check, same as destination).
     Fails with error, not silent fallback:
     - Missing → `"senderSession is required"`
     - Invalid → `"Sender session \"${name}\" does not exist. Valid senders: ${list}"`
   - New canonical `jarvis_receiveMessage`: same behavior as today's
     `jarvis_readMessage`, renamed only.
   - Old `jarvis_sendToSession`/`jarvis_readMessage`: stay registered,
     UNCHANGED behavior (including the old active-tab-fallback bug — not
     worth fixing code scheduled for removal), just add deprecation warning.
   - Notification template default → `jarvis_receiveMessage`.
   - All `.github/agents/*.agent.md` + session `context.md` files updated to
     new names, always passing explicit `senderSession`.
   - `syspilot.orchestration-jarvis/SKILL.md` SEND/RECEIVE sections updated.
   - Phase 2 (GH issue #13, full removal of old names) stays a SEPARATE
     future CR, unchanged timeline (earliest 2026-09-30) — not part of this.
   - Old draft CD `docs/changes/sendtosession-required-sender.md` (commit
     `4c8d422`) is now superseded/obsolete — do not dispatch as-is, rewrite
     as message-api-rename instead.

2. **flow-time-lens** — Replaces the Fog-of-Time single fade slider (amends
   SPEC_FLOW_CHORDRENDER) with a two-handle message-index range slider
   ("lens": start = near/newest edge, end = far/oldest edge). Design agreed
   with user:
   - Ranks counted from true latest = rank 1, growing toward history.
   - Start handle at rank 1 = live-tracking (auto-advances on poll); anywhere
     else = anchored to that specific message, displayed rank grows as newer
     messages arrive. End handle always anchored-to-message the same way.
   - Default on open: start=rank 1, end=`min(loaded total, 500)`.
   - Gradient fade preserved within [start,end], floor lowered 0.15 → 0.05.
   - Drag tooltip shows the message's actual timestamp.
   - "+500" button: increases the sliding-window cap by 500 per press
     (500→1000→1500...), still slides at the new size (oldest drops off once
     full). No auto-load-near-edge (flagged as a future idea, not v1).
   - Dropped from original ask (deliberately, to keep scope small): no
     day/hour/minute unit selector, no VS Code settings (max-range,
     default-width, transparency config) — everything lives in the webview.
   - No CD drafted yet — discussed with user, not yet written up.

## Working Principles

- **Shared Git Workspace — Finger weg outside own folder while a CR runs**:
  while another CR is actively in the pipeline (CM/Designer/Dev Engineer
  working on a feature branch), PM may ONLY `git commit` files inside its own
  session folder (`.jarvis/sessions/Project Manager/`). No `git checkout`,
  `pull`, `push`, or touching any other branch/file — even read-only-looking
  operations like `checkout develop` to inspect something disrupt the shared
  working tree. Where PM's own commits land (which branch is checked out at
  the time) doesn't matter — everything gets merged eventually. Mistake made
  2026-07-02: checked out `develop` + pulled/pushed while `ui-improvements`
  was running on `feature/ui-improvements` — caught by the user before it
  caused harm.
- **CR Queuing**: while one CR is in the pipeline, draft the next small CR's
  Change Document locally (commit ok, never push/dispatch) to avoid idle gaps.
  Unrelated small feature ideas surfacing mid-flight → collect in Backlog
  below, don't fold into the running CR (avoids scope-churn, see
  `editor-group-placement`).
- **Branch + CD before dispatch**: CM cannot start a CR without an existing
  branch + template-copied CD — create both before/with the CR message, not
  just mention them.
- **Bugs are (almost always) spec problems**: check traceability/links first
  when debugging, not just the code diff — missing spec cross-links are a
  common root cause (see `pim-treenode-filenode-fix`).
- **No-Blame, Verify-Before-Send**: confirm shared understanding of a finding
  with the user before dispatching it into any process.
- **Ask first, then communicate**: for any open design/scope decision flagged
  back to PM (e.g. by CM/System Designer), ask the user FIRST and wait for
  their answer — don't decide unilaterally and send it onward, even with
  a seemingly-reasonable rationale. Mistake made 2026-07-03: decided
  SPEC_MOD_SUITE (defer jarvis-flow from the suite pack) alone and sent it
  to CM without asking; user's actual intent was the opposite (include it),
  requiring a correction round-trip. Decisions with real product/scope
  weight are the user's call, not PM's to make and announce.
  **Why this matters beyond correctness**: every CM round-trip is slow
  (full pipeline turn) — minimizing round-trips is itself a goal, so always
  ask before dispatching rather than guess-then-correct later.
- **context.md discipline**: keep this file short/scannable, stick-note style.
  Commit every change immediately (survives branch switches/corruption). Only
  keep what's relevant within ~2 weeks; larger topics → separate file with a
  one-line pointer here. Current release/version info lives in
  `docs/changes/` (revision history), not here.

## Backlog: Session Watchdog / Non-Responding Session Ping (idea, unscoped)

Idea from a Nemotron/OpenRouter-via-MECE/Trace/QM experiment (rate limits
occasionally cause a session to hang mid-turn): some kind of watchdog that
pings a session that's had the ball for a while without responding. NOT
ready to implement — deliberately no active intervention into sessions yet.
Natural follow-on once `/freshmind`/`/housekeeping` (#3) has its first
working version; revisit then, not now.

## Backlog: Consequent Actor Renaming (idea, unscoped, user 2026-07-03)

`entity-taxonomy-rename` (v0.15.0) renamed the internal/spec concept
Session → Actor (Hewitt actor model), but deliberately left the VS Code
UI-facing label as "Sessions Tree" per a documented storage/UI-decoupling
rule — at the time, justified partly by storage still being
`.jarvis/sessions/` + `session.yaml`.

User's actual long-term intent (revisited 2026-07-03, also prepping a
LinkedIn series on Actors): move consequently to "Actor" wording
everywhere, not just internally. Floated idea: honor/support the old
`.jarvis/sessions/`/`session.yaml` names for existing projects (backward
compat), but use the new Actor-based naming (folder + UI label + file
names) for anything created from now on. Explicitly NOT scoping or
deciding this tonight — "too much for this night" — just parking the
intent so it isn't lost. Revisit when there's bandwidth for a real design
discussion (storage migration path, back-compat shim design, UI label
change, docs/naming-convention updates).

## Delivered: Entity Tree Context Menu + UI Improvements (2026-07-02)

Items 1-5 (category-node copy, copy-file-name, context.md rendered preview,
Collapse All, Messages-tree group-node click-to-Main) all shipped via
`entity-tree-context-menu` + `ui-improvements`, both merged to develop,
user-confirmed working in Dev Host. No longer a backlog — see
`docs/changes/ui-improvements.md` for full details if needed.

## Known Issue: Custom Agents Disappear (since 2026-06-30, unresolved)

Custom agents (`.github/agents/*.agent.md`) vanish mid-session or after
window reload, not reliably reproducible. Data collection phase — log
occurrences with context when seen.

## Backlog / Debt (see GitHub Issues for full tracking)

- Single source of truth for feature backlog: [open GitHub Issues](https://github.com/enthali/jarvis/issues).
- `.jarvis/sessions/` → `.jarvis/actors/` folder rename: additive-only,
  queued after housekeeping (#3). Not yet scoped.
- Release agent: verify change-doc archival doesn't leave duplicates at
  `docs/changes/` root (happened once, v0.14.0 — cleaned up manually).

## Ideas

- [Kanban Board](ideas/kanban-board.md)
- [sendToSession → sendMessage rename](ideas/sendmessage-rename.md) — parked 2026-06-09

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

