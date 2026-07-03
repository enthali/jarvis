# Project Manager — Jarvis

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

