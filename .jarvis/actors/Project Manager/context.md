# Project Manager — Jarvis

## Working Principles

- **Merge gate = user validation only (2026-08-05)**: PM merges into development ONLY after the user explicitly confirms "OK to merge" following their own manual test. QM CLEAR is a necessary prerequisite but not the trigger — the user validates behavior, QM verifies artefacts. Never merge on QM CLEAR alone.
- **Public repo — nothing goes out without user approval (2026-07-08)**:
  the jarvis repo is public. Anything posted externally (GitHub issue
  creation, comments, closing issues, PRs, releases) requires explicit
  user sign-off on the exact content BEFORE it's posted — draft first,
  ask, then post. Never fire-and-report.
- **Shared Git Workspace — Finger weg outside own folder while a CR runs**:
  while another CR is actively in the pipeline (CM/Designer/Dev Engineer
  working on a feature branch), PM may ONLY `git commit` files inside its own
  session folder (`.jarvis/sessions/Project Manager/`). No `git checkout`,
  `pull`, `push`, or touching any other branch/file — even read-only-looking
  operations like `checkout development` to inspect something disrupt the
  shared working tree. Where PM's own commits land (which branch is checked out at
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
- **Copy the template literally — never paraphrase its structure (2026-07-28)**:
  the CD is the contract between agents. PM's part is the header fields
  (Status/Branch/Created/Author/Operation Mode) + Summary (root cause, fix
  direction, ACs, GitHub Issue line) — Level 0/1/2, Final Consistency Check,
  and QM Findings stay as the template's own skeleton, untouched, for System
  Designer/QM to fill. Use `npm run new-change -- <name>` (creates the branch
  + copies/renames the template) instead of hand-authoring a CD's structure.
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
  here. Ideas = may or may not happen — one file per idea under
  `.jarvis/actors/Project Manager/ideas/`,
  listed below as a link + one-line description only (no content inline).

## Active CR

- None in pipeline. Follow-up CRs in flight (unattended, 2026-08-05):
  - `jarvis-newentity-cleanup`: remove dead `jarvis.newEntity` contribution (never registered, pre-existing)
  - `jarvis-manifest-invariant`: add test asserting all contributed command IDs are registered

## Recently Shipped

- **v0.25.0** released 2026-08-05 @ `bcb5c96`. Contains: touched-files-cleanup, gitignore
  automanage followup, wiring restore (gitignore + release-notes), kanban+suite in
  self-update mapping. Issues #58/#59/#60/#63 closed.
- **touched-files-cleanup** merged @ 9a4611b. Display-filter design (window + dead-file
  hiding), bulk removal, cleanup command. Introduced regression in same merge (gitignore
  + release-notes wiring deleted) — fixed in wiring-restore CR before release.
- jarvis-kanban (#46) released as v0.24.0 on 2026-07-26.

## Ideas

- [PIM Modularization](ideas/pim-modularization.md) — drop per-component enable/disable settings, go installable-sub-extensions instead
- [Session Recording](ideas/recording-design.md) — meeting recording + transcription pipeline
- Recorder on built-in VS Code dictation (deferred, 2026-08-05) — see Research's
  `.jarvis/actors/Research/future-ideas.md` FI-2026-08-05; blocked on unverified
  assumption (extension-facing access to the dictation model). Not planned.
- **PIM/Outlook PS1 COM scripts (2026-08-05)**: user developing Outlook interface
  as PowerShell COM scripts with local Ollama for email triage, in
  `c:\workspace\Assistant`. Very promising; nearly directly portable to Jarvis.
  Watch GH #34 scope — the Gmail/IMAP half may already be solved via IMAP-into-Outlook;
  the Outlook COM script approach may replace or supplement the provider abstraction.

## Watch Items

- **GH #34 scope may shrink (2026-07-23)**: user is consolidating Gmail into
  Outlook via IMAP in the `c:\workspace\Assistant` spike — works well so far.
  If it holds up, the "provider abstraction (Outlook/Gmail)" half of #34 may
  become unnecessary. Not acting yet — revisit #34's scope once IMAP approach
  proves stable. The other half (import agents/skills from Assistant spike,
  incl. two agent.md persona files the user likes) still stands independently.
- **AHP migration research spike (planned, week of 2026-07-28)**: VS Code 1.130
  confirmed AHP as the platform direction. FI-2026-07-21 documents the right
  path: `editorService.openEditor({ resource })` + Session-URIs instead of
  `chat.open` hack. Goal: assess what it takes to migrate Jarvis session-layer
  to AHP-native. No GH issue yet — create one after the spike when scope is clear.
  Also investigate during spike (obs. 2026-07-23, likely 1.130): opening an
  actor session can spawn a phantom "broken" chat in a 2nd editor tab; split
  view mirrors one session synchronously into both panes (same session, not
  two actors). Fits AHP session-layer rework — assess together.
- **CR #51 (agent-mode-reset fix) merged but not yet released (2026-07-28)**:
  live mode resets still happen (PM + CM both hit it mid-CR-#56) until the
  next release ships. Not a new bug — expected until then.
- **Terminal context leaks across actor sessions (2026-07-30)**: the
  "Terminals" block injected into every turn showed OTHER actors' (CM/Dev
  Engineer/QM) commands, not just this session's own — because VS Code
  terminals are workspace-scoped, not chat-session-scoped. User disabled
  `chat.agentSessionProjection.enabled` as the likely cause; not yet
  confirmed whether it fully stops the leak. Don't assume a "Last Command"
  in a Terminal block was run by this session.
- **HookIntake possible multi-window misattribution (2026-08-04, deferred)**:
  Research flagged (code-read, not measured) that two VS Code windows on the
  same workspace could both start a hook-intake HTTP server and write the
  same workspace-relative port file — last writer wins, so touch-tracking
  could fire for the wrong window's session. User: park until actually
  observed, don't open as a defect yet.

## Syspilot Testing Ground

- [Agent model observations](syspilot-testing-ground.md) — MECE/TRACE stay separate; Designer+Implementer merge risks artifact-ownership dilution (silent drift escapes QM); token cost real even locally; syspilot feedback, not Jarvis CR

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

## Deferred Issues (DEFER)

When the user is unreachable during an autonomous run (black-ops mode — e.g.
asleep), **DEFER** a finding by appending it to
[deferred-issues.md](deferred-issues.md) instead of creating a GitHub issue
(which always needs explicit approval). On the user's return, bring the list
back up and go through it together, proposing GH issues (or other handling)
per entry. Tracked-for-later, never dropped.

