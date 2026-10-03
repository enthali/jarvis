# Project Manager — Jarvis

## Working Principles

- **Merge gate = user validation only (2026-08-05)**: PM merges into development ONLY after the user explicitly confirms "OK to merge" following their own manual test. QM CLEAR is a necessary prerequisite but not the trigger — the user validates behavior, QM verifies artefacts. Never merge on QM CLEAR alone.
- **EDH F5 (debug) can hang on the Node inspector handshake, unrelated to our code (2026-09-27)**: "Extension host did not start in 10 seconds... needs a debugger" plus "no data provider registered" survived a full reboot and profile isolation — ruled out our code (a plain, non-debug launch of `core` alone activated cleanly, tree visible) and ruled out the profile. Root cause: the F5 debug-attach handshake itself. Fix: use **Ctrl+F5 ("Run Without Debugging")** instead of F5 when just running/validating, not debugging. Separately (still worth keeping, but NOT the cause of this hang): the installed Marketplace `enthali.jarvis-core` can collide with the `--extensionDevelopmentPath` dev instance of the same extension ID — most `extensionHost` configs in `.vscode/launch.json` pass `--user-data-dir=${workspaceFolder}/jarvis-edh-profile` (auto-gitignored via `jarvis-*`) as a general hygiene measure; removed from "Run All" during this troubleshooting, re-add if desired.
- **Public repo — nothing goes out without user approval (2026-07-08)**:
  the jarvis repo is public. Anything posted externally (GitHub issue
  creation, comments, closing issues, PRs, releases) requires explicit
  user sign-off on the exact content BEFORE it's posted — draft first,
  ask, then post. Never fire-and-report.
- **Deferred findings stay local first (2026-08-07)**: do not default a
  deferred finding to a public GitHub issue. Record it in PM-local memory and
  revisit public backlog handling with the user; the public-work policy needs
  a later joint review.
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
- **NEVER send a change to CM without the user's explicit OK (2026-09-30,
  user's words: "never ever again", supersedes 2026-08-21)**: after filling
  the CD's header/Summary, show it to the user and wait for an explicit
  go-ahead BEFORE sending the CR to CM — regardless of operation mode
  (autonomous, user-guided, unattended — doesn't matter). Silence, "create
  the change", or "prepare it" is not an OK to send.
  Mistake made 2026-09-30: dispatched recorder-redesign to CM in autonomous
  mode without showing the CD; user had no chance to review. The CD's
  Summary was also over-prescriptive — PM wrote a full solution (Nemotron,
  ONNX, phase plan) when the user only stated intent ("update recorder
  using similar methodology than vscode voice input"). The Summary is
  intent + motivation only — NOT a solution design.
  Previous mistake 2026-08-21: same pattern in user-guided mode.
- **A change never contains solution details (2026-09-30)**: no technologies,
  models, libraries, phase plans, or component lists in the CD — not in the
  Summary, not in the tables. Research papers may be referenced as input, but
  must not pre-empt the solution; the design is System Designer's and the
  user's work. Don't word acceptance criteria that imply a solution either.
- **Stacked feature branches when a CR has no standalone user-visible behavior
  (2026-08-24)**: if a CR is QM-cleared but the user can't meaningfully
  validate it alone (e.g. an infra/mechanism CR whose only observable effect
  needs a dependent CR's content), don't force a merge on QM CLEAR alone —
  branch the dependent CR directly off the first CR's unmerged feature branch
  (not off `development`), hold both un-merged, and merge in sequence once the
  user validates them together. One CD per CR still applies; only the git
  branch parentage stacks.
- **Stacked branches WILL conflict on the second squash-merge (2026-08-24)**:
  squash commits carry no parent info, so merging the second (stacked) branch
  into `development` re-conflicts on every file the first branch already
  touched, even though the second branch is a strict superset. Resolve with
  `git checkout --theirs` (the incoming/second branch) for all such files —
  it already contains the first branch's content plus its own. Exception: any
  file PM edited directly on `development` after the first squash-merge (e.g.
  a CD's `Status: merged` field) needs manual reconciliation, not a blind
  `--theirs`.
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
- **Backlog vs. Ideas (revised 2026-08-20 — dogfooding)**: internal backlog
  now lives in [backlog.kanban.yaml](backlog.kanban.yaml) (open it via
  `jarvis_openKanbanBoard`, edit items via `jarvis_updateKanbanItem` or direct
  YAML edit), never duplicated here. GitHub Issues are reserved for EXTERNAL
  reports only (someone else filing an issue on the public repo) — PM no
  longer files or works its own backlog there. The 23 issues open before this
  switch stay in GH as legacy, closed out as done, not migrated. Ideas = may
  or may not happen — one file per idea under
  `.jarvis/actors/Project Manager/ideas/`,
  listed below as a link + one-line description only (no content inline).

## Active CR

- **No active CR (2026-10-03)** — `recorder-redesign` merged into `development`
  as squash commit `2980be1` (rebased from `7983df0` onto `origin/development`;
  user's explicit "Merge OK"), NOT pushed (local `development` is 2 commits
  ahead of origin: the squash and my memory commit), not yet released. The user
  wants a release after the merge. Feature branch
  `feature/recorder-redesign` retained. Before a release (user decisions open):
  publication gate D-28 (licence of Microsoft.Windows.AI.MachineLearning.dll
  not read, whether SDK telemetry leaves the machine) — the tag push publishes
  via CI, so D-28 must be decided first; version number (new feature, so a
  minor bump, my suggestion 0.29.0). Release-note entries to pass to the Release
  Engineer: U-3 blocked (laptop microphone/speakers cannot be disabled), U-4
  one-hour test not conducted (5 min at about 30-40 % CPU without problems, no
  memory readings), echo coverage limited to the user's hardware, T-1..T-17
  not run, 12 elements stay `approved`. Open: automatic retry after the first
  start's TLS failure (undecided), backlog #45 (rec tool infix AC), #46 (retire
  `ideas/recording-design.md` now that the change has landed), #47 (test
  automation), #48 (ontology status vocabulary). U results: U-1, U-2, U-5 passed
  per the user; evidence is his statements and pasted log, no proxy log.
- **Git state after the merge (2026-10-03)**: the extra worktrees
  `jarvis-dev-docs` and `jarvis-nemotron-spike` are closed on the user's order
  (their folders deleted; the spike's test transcripts were not needed). Branch
  `research/recorder-nemotron-spike` stays, in sync with origin. The main tree is
  on `development` again, clean. Lesson: a branch checked out in another worktree
  cannot be checked out in the main tree, so a squash needed a temporary worktree.
  The old feature branch still holds the single-commit history, not needed again.
- **Shared-tree lesson (2026-10-03)**: an unknown actor left
  `packages/recorder/package.json` modified (identical to `development`),
  which failed 7 tests in the shared tree while the committed branch passed.
  Restored with the user's OK. When tests differ between the shared tree and a
  clean checkout, check `git status` for foreign uncommitted files first.
- **QM may propose simplifications (2026-10-03)**: the user told QM it may
  propose a simpler solution over strict spec adherence, with the spec
  changed openly, when user value is not materially hurt. Evaluate such
  proposals as UX/requirement decisions with benefits and losses stated; the
  user decides, SD revises, nothing is relaxed silently.
- **Open sequencing decision (2026-09-27, user decides next session)**:
  user needs backlog #42 (Actor identity via agent mode, replaces
  `jarvis_whoAmI`) and #41 (Recorder redesign) for their own job — both
  would double as a practical test of migrating to Syspilot 0.10 (already
  on `development`, not yet adopted here). Open question the user is
  weighing: clean up the project ontology under 0.10 *before* that
  migration, or deliberately defer the ontology cleanup since it delivers
  no functional benefit on its own and #42/#41 are the urgent items. User
  will decide next session whether to start with the Syspilot 0.10 update
  or with #42 first — do not assume either order, ask.
- **WhoAmI follow-up** — defer hook-dependent `jarvis_whoAmI` recovery until AHP;
  superseded by backlog #42's agent-mode identity approach once that lands.
- **Post-change watch: private Actor repo** — after a future active CR, remove
  `.jarvis/actors/` from OSS Git tracking without deleting local files, ignore
  it in OSS, then initialize a separate private repo in that folder and connect
  it to a new private GitHub repo. Keep Actors in place until the configurable
  external path is released; existing public Git history is not erased by this
  move.

## Recently Shipped

- **retire-legacy-actor-kinds merged** 2026-09-27 into `development` (`1a30326`,
  pushed). Phase 2 of one-kind-consolidation: old kind-based Project/Event/
  legacy-Actor specs and code fully removed (not just deprecated); backlog
  #31/#32 gaps ported into the Actor kind first, per user's port-before-delete
  decision. QM Round 4 CLEAR (direct); VE PASSED. User validated core
  behavior manually (Actor creation, messaging, auto-delivery, path change).
  One user-found regression during that manual test — `packages/flow`'s
  activation guard wasn't updated for this change's `JarvisCoreApi.version`
  bump to 2, so Flow silently failed to activate — fixed (`6df1b5e`) and
  user-confirmed via manual smoke-check. Formal User UAT deliberately NOT RUN,
  deferred to backlog #40 (UAT ontology redesign). Also fixed as a same-session
  tooling lesson: an EDH hang some rounds in was NOT a code/profile defect but
  the local F5 debugger-attach handshake — use Ctrl+F5 ("Run Without
  Debugging") when validating, not debugging; recorded in Working Principles.
- **v0.27.2 released** 2026-09-19 (tag `v0.27.2` on `main` at `b7bbfa8`,
  back-merged to `development` at `c1036bd`). Patch release of two fixes:
  (1) `whoami-hookless-error` — honest error message when hooks disabled
  (error text: "Unable to determine your identity automatically (hooks disabled
  or unavailable). Please confirm your identity with the user."); (2)
  `focus-restore-toggle` — configurable focus restore after delivery via
  `jarvis.messaging.restoreFocusAfterDelivery` (bool, default true). Both QM
  Round 2 CLEAR; 406/406 tests; val-reports created. CDs archived to
  `docs/changes/v0.27.2/`.
- **v0.27.1 released** 2026-09-01 (tag `v0.27.1` on `main` at `d70ba52`,
  back-merged to `development` at `356d263`). Patch release of
  `whoami-all-entity-kinds` — `jarvis_whoAmI` now resolves Actor, Project,
  and Event identities through the complete scanner registry; zero/multiple
  matches return the existing ambiguity error. QM Round 3 CLEAR; 406/406
  tests passed. CD archived to `docs/changes/v0.27.1/`.
- **whoami-all-entity-kinds merged** 2026-08-31 into `development` (backlog
  item 20). `jarvis_whoAmI` now resolves Actor, Project, and Event identities
  through the complete scanner registry; zero/multiple matches return the
  existing ambiguity error. QM Round 3 CLEAR after stale guarding tests and
  `SPEC_ACT_WHOAMI` AC-2 were corrected; 406/406 tests passed. Backlog item 22
  tracks the verification-protocol gap that let those stale tests reach QM.
- **v0.27.0 released** 2026-08-26 (tag `v0.27.0` on `main` at `3079cec`,
  back-merged to `development` at `ec0455a`). Solo release of
  `actor-kernel-instructions-delivery` — no other change was on `development`
  since v0.26.0, and the next work is expected in PIM, not core, so it wasn't
  worth holding back a day. CD archived to `docs/changes/v0.27.0/`. One
  transient artifact found post-release: a stray uncommitted `.gitignore`
  edit dropped the `!packages/*/assets/**` negation — traced to a
  not-yet-reloaded Extension Development Host running pre-fix code in
  memory (fix itself, from v0.26.0's module-skill-provisioning QM round, is
  intact in HEAD/src/compiled `out/`). Discarded the stray change, no repo
  action needed; recommended reloading this dev window.
- **actor-kernel-instructions-delivery** (backlog item 19) — merged to
  `development` 2026-08-26 (`6a96081`). Ships the three `jarvis-actor.*`
  instruction files (kernel/memory/authoring, dot-separated names — required
  by the provisioning helper's namespace-prefix gate) from
  `packages/core/assets/instructions/` via the existing `provisionModuleAssets`
  mechanism. `jarvis.actor.autoProvision` defaults **false** (optional assets
  → default false, vs. kanban's required-asset default true — same
  underlying principle, not a contradiction). Content baseline consolidated
  from 5 drifted workspace copies (jarvis/syspilot/Automobil/Assistant/sonar):
  kernel = Automobil's superset, memory = common + "Memory First" rule,
  authoring = common version. User reversed the prior "private IP" stance —
  released under the project's MIT license. QM CLEARED twice (Round 1 MECE,
  Round 2 independent QM review — live diff, byte-compared content, clean
  `tsc`+`vitest`), one Low process finding (CM's dispatch template should say
  "PM" not "Change Manager" for findings routing) routed to CM to fix, not
  blocking. User-confirmed merge 2026-08-26.
- **v0.26.0 released** 2026-08-26 (tag `ae51eb8` on `main`, back-merged to
  `development` at `0a8f836`). Ships kanban-management-tools,
  kanban-skill-content, module-skill-provisioning (features) +
  kanban-update-validation, agent-mode-reset-race (fixes). No GH issues
  closed (none of the 5 CDs carried a formal GitHub Issue line).
- **touched-files-created-files** (backlog item 9) — CLOSED 2026-08-26 as
  **not reproducible**, no code changed, CD deleted (nothing to archive). SD
  reproduced live with the user on Windows + WSL2: `create_file` has been in
  `TOUCH_RULES` since the feature's original commit, created files are
  tracked and render correctly, 35/35 corpus files since 2026-08-24 tracked.
  Real finding routed separately: `TOUCH_RULES`'s 4-tool allowlist silently
  drops writes from any tool not on it (no log at any level) — logged as
  backlog item 18 (observability, log unmatched tool_names before extending
  the list).
- **kanban-update-validation** merged to `development` 2026-08-26 (F-1 follow-up,
  stacked on `feature/kanban-management-tools`). `jarvis_updateKanbanItem` now
  delegates to the shared `validateItemValues` helper instead of its old
  status-only inline check — closes F-1, all four write tools now share one
  write-validation contract. QM CLEARED (Round 1), one Low deferred (backlog
  item 17, `changes.labels` schema type). User-validated together with
  `kanban-management-tools`.
- **kanban-management-tools** merged to `development` 2026-08-26 (backlog items
  3, 11, 12, 13). Four new tools: `jarvis_addKanbanItem`, `jarvis_deleteKanbanItem`,
  `jarvis_listKanbanItems` (filtered, compact projection), `jarvis_updateKanbanFields`
  (add/remove field or select option). Dispatched unattended overnight
  2026-08-24; QM CLEARED (Round 3, 2 Lows deferred to backlog item 14). Two
  USER REVIEW REQUIRED flags resolved with the user 2026-08-26: F-1 (weaker
  validation in the pre-existing `jarvis_updateKanbanItem`) spun off as its own
  CR (`kanban-update-validation`, stacked, pending merge); F-2 (field/option
  rename not offered) accepted as-is, bulk-rename idea captured as backlog
  item 15. All 8 kanban tools user-validated live in the EDH before merge.
- **agent-mode-reset-race** merged to `development` 2026-08-24 (backlog item 8).
  Fixed the Agent Mode misassignment bug: added a target-identity check before
  the mode-set command executes (skip + warn on mismatch instead of blindly
  firing), moved the success log inside that check, plus an unrelated
  delivery-loop re-entrancy guard. Took 4 QM rounds — Round 3 caught a
  self-inflicted AC-7 regression (a "fix the spec" decision got executed
  backwards, code synced to a buggy spec sample and dropped an error catch);
  corrected before merge. User-validated live in the EDH. Clean squash-merge,
  no stacking (independent branch off `development`).
- **module-skill-provisioning** + **kanban-skill-content** merged to `development`
  2026-08-24 (squashed in that order; stacked-branch second squash-merge produced
  expected conflicts on files both CRs touched — resolved by taking the incoming
  branch's version everywhere except the first CD's Status field, since the second
  branch was a strict superset). Delivered: generic module asset self-install
  mechanism, real jarvis-kanban skill content (ontology, ownerName convention,
  freeform text field). Closed backlog items 1, 2, 4, 5.
- **v0.25.0** released 2026-08-05 @ `bcb5c96`. Contains: touched-files-cleanup, gitignore
  automanage followup, wiring restore (gitignore + release-notes), kanban+suite in
  self-update mapping. Issues #58/#59/#60/#63 closed.
- **touched-files-cleanup** merged @ 9a4611b. Display-filter design (window + dead-file
  hiding), bulk removal, cleanup command. Introduced regression in same merge (gitignore
  + release-notes wiring deleted) — fixed in wiring-restore CR before release.
- jarvis-kanban (#46) released as v0.24.0 on 2026-07-26.

## Ideas

- **US/REQ/SPEC — is the SPEC level redundant? (2026-08-20)**: SPEC often ends up
  just restating the code. Idea: try dropping it for one new feature as an
  experiment. Not trivial — the 3-level structure is hardwired throughout
  syspilot (agents, traceability, MECE/Trace engineers); current syspilot
  version doesn't give the flexibility needed yet. Parked, revisit later.
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

