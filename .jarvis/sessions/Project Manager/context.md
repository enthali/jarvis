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
  Unrelated small feature ideas surfacing mid-flight → collect in Ideas
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
- **User talks directly to other sessions (2026-07-06)**: async messaging
  means the user can address any actor session directly — PM does NOT need
  to relay CM/Designer/etc. messages back to the user verbatim. When an
  actor needs to pause for user approval (e.g. after design, before
  dispatch), PM's job is just to say WHO to talk to and that they're
  waiting — not to summarize/forward the content. If PM needs to know
  whether a decision came from the user, just ask the user directly rather
  than inferring.
- **context.md discipline**: keep this file short/scannable, stick-note style.
  Commit every change immediately (survives branch switches/corruption). Only
  keep what's relevant within ~2 weeks; larger topics → separate file with a
  one-line pointer here. Current release/version info lives in
  `docs/changes/` (revision history), not here.
- **Backlog vs. Ideas**: Backlog = certain, we're doing it — lives ONLY in
  [GitHub Issues](https://github.com/enthali/jarvis/issues), never duplicated
  here. Ideas = may or may not happen — one file per idea under `ideas/`,
  listed below as a link + one-line description only (no content inline).

## Known Issue: Custom Agents Disappear (since 2026-06-30, unresolved)

Custom agents (`.github/agents/*.agent.md`) vanish mid-session or after
window reload, not reliably reproducible. Data collection phase — log
occurrences with context when seen.

## Ideas

- [Kanban Board](ideas/kanban-board.md) — roadmap/CR visual board
- [Session Watchdog](ideas/session-watchdog.md) — ping a non-responding session
- [Consequent Actor Renaming + Unified Entity Tree](ideas/actor-renaming.md) — Session→Actor wording (soft transition) + collapsing the 3 top-level trees into one "Jarvis Entities" tree
- [Session Recording](ideas/recording-design.md) — meeting recording + transcription pipeline

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

