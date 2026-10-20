# Project Manager — Jarvis

## Working Principles

- **Merge gate = user validation only (2026-08-05)**: PM merges into development ONLY after the user explicitly confirms "OK to merge" following their own manual test. QM CLEAR is a necessary prerequisite but not the trigger — the user validates behavior, QM verifies artefacts. Never merge on QM CLEAR alone. Commit gate: a CLEARED covers only the text QM read; compare the final text with the cleared text before any OK.
- **EDH F5 (debug) can hang on the Node inspector handshake, unrelated to our code (2026-09-27)**: "Extension host did not start in 10 seconds... needs a debugger" plus "no data provider registered" survived a full reboot and profile isolation — ruled out our code (a plain, non-debug launch of `core` alone activated cleanly, tree visible) and ruled out the profile. Root cause: the F5 debug-attach handshake itself. Fix: use **Ctrl+F5 ("Run Without Debugging")** instead of F5 when just running/validating, not debugging. Separately (still worth keeping, but NOT the cause of this hang): the installed Marketplace `enthali.jarvis-core` can collide with the `--extensionDevelopmentPath` dev instance of the same extension ID — most `extensionHost` configs in `.vscode/launch.json` pass `--user-data-dir=${workspaceFolder}/jarvis-edh-profile` (auto-gitignored via `jarvis-*`) as a general hygiene measure; removed from "Run All" during this troubleshooting, re-add if desired.
- **Stale files reappear in the worktree (11 cases: 2026-09-27, 2026-10-02, 2026-10-03, 2026-10-04, 2026-10-08 seven times)**: tracked files suddenly show an uncommitted diff that is the exact inverse of already-committed work, with no Git operation behind it. **Case 7 (10-08 local 21:48:01, CD)**: write came 37 s after my commit `a160299e` (21:47:24) and 9 s after CM's delivery receipt (21:47:52); blob = CD at `c25b385e`; SD found and restored it. Case 8 (21:55:08, `spec_actor.rst`, blob = version before SD commit `b64a39c2`, 77 s after Dev commit `4a7a527d`) restored by PM under the standing rule. Case 9 (21:58:38, CD, QM restored): 3 s after a CM message to QM, the third delivery-then-rewrite in a row on 10-08. Case 10 (22:22:00, `spec_uat_kanban_mgmt.rst`, blob `e7bf050a` = kanban-management-tools commit `244ace6d` of 2026-08-26, same stale blob as 10-04; PM restored 22:26): a persistent source, written back repeatedly, not a one-off. **Case 11 (10-08 23:33:43)**: 12 files at the same second (root and 9 package.json, releasenotes.md, Release Engineer context.md), each equal to an earlier committed version (mostly `aab6a523` of 09-27, a commit named "Agent host session ..."), found by the Release Engineer in his preflight about 2 min after my release request reached his session; PM restored under the standing rule, patch in %TEMP%. A bulk revert of a whole session baseline, which fits the chat checkpoint idea better than a single stale buffer. **RDP event log checked 10-08 (Get-WinEvent, TerminalServices-LocalSessionManager)**: reconnect 20:25:11 fits case 6 (20:25-26); cases 7-10 (21:48, 21:55, 21:58, 22:22) fall in connected phases (reconnect 21:50:11, disconnect 22:02, reconnect 22:07:59, nothing after), so RDP explains at most case 6, deliveries fit 7-9; Open Editors showed only chat sessions, no file tab, so a stale text editor buffer is unlikely. I misread the `M` at 21:48:09 as SD's edit in progress: when an actor has not announced an edit of a file, a diff on it right after a delivery is stale until blob-checked. Case 4 gave proof: both stale files (`spec_msg.rst`, `spec_uat_kanban_mgmt.rst`) are byte-identical (same blob hash) to their version just before SD's L2 commit `e876b885`, i.e. the exact pre-edit baseline of one session's edit set, written 37 s and 4 min after SD's next commit. So it is an older committed state, not random content, and it hits the files one session edited. Cause not proven; user's working hypothesis: the chat sessions' Keep/Undo buttons restoring a session baseline when two sessions edited the same file (fits better than my first guess, a stale editor buffer with `files.autoSave: afterDelay`). Handling: run `git status` before any merge/dispatch; compare the working blob hash with the parent of the commit it inverts (`git hash-object` vs `git rev-parse <commit>^:<path>`); tell CM so actors read `git show HEAD:<path>`; ask the user; restore from HEAD only after consent (case 4 restored 2026-10-08). **Standing rule (user, 2026-10-08)**: PM restores a file from HEAD WITHOUT asking when it differs from HEAD and is byte-identical to an earlier committed version of the same file (nothing can be lost); every other case is asked first. **Lead (PM, 2026-10-08)**: for the 5 write times with a known timestamp (10-02 CD, 10-03, 10-04 twice, 10-08 16:36; NOT 09-27, no timestamp was recorded) the stale write came 3-23 s after a Jarvis message delivery in `.jarvis/messages/log.json` (UTC; 10-02 Heartbeat to QM, 10-03 PM to CM were the only messages within minutes); chance ≈ 0.2 % per case. **Case 6 (10-08 local 20:25-26, SD's 11 files) does NOT fit**: no message in the log between 20:10 and 20:29, so the delivery link holds for 5 of 6 only. Case 6 also shows a persistent source: `spec_msg.rst` (27ef974e) and `spec_uat_kanban_mgmt.rst` (e7bf050a) came back with exactly the stale blobs of case 4, although both had been restored from HEAD in between, and the other 9 files were in the state of SD's approval commit 69e2329b (so Verify's later `implemented` statuses would have been lost). An old copy is stored somewhere and written again. SD restored them himself after saving a patch; all 11 stale blobs are earlier committed versions (checked from the index lines of his patch), so the standing rule was met. The user did not touch files on 10-08, so it is not (only) a manual Keep/Undo. Guess, unproven: VS Code restores a chat session's stored baseline of its edit set (SD's own session is the prime suspect for cases 4 and 6). **RDP lead (user's idea 2026-10-08: VS Code runs on machine KRAKEN, controlled via RDP; data from the Windows event log `Microsoft-Windows-TerminalServices-LocalSessionManager/Operational`, IDs 24 disconnect / 25 reconnect, readable without admin)**: case 6 came 18 s after a reconnect (20:25:12), case 3 70 s after one, case 5 4.5 min after one; cases 2 and 4 happened while the session had been disconnected for days / hours. A message delivery preceded 5 of the 6 write times (3-25 s), a reconnect 2 of 6 (0-120 s), together all 6. Chance per hit about 0.4 % (message window) and 0.6 % (reconnect window), but the windows were chosen after seeing the data, so it is a lead, not proof. Common idea: a window/session wake-up (a delivery opening a chat, an RDP reconnect) triggers the restore. Test (user): with a clean tree, reconnect RDP / deliver a message into a session with pending edits and watch `git status`; the event log gives the reconnect times, no notes needed. Protection: QM/Verify build from `git archive HEAD`, `git status` at start and end. Planned test (user, 2026-10-08): the user stops clicking Keep for now; once everything is in Git and no change is in the pipeline, test both ways: click Keep in an old session with pending edits, and let Jarvis deliver a message into that session, each time watching `git status`; compare blob hashes of changed files (PM can do it).
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
  actor folder (`.jarvis/actors/Project Manager/`). No `git checkout`,
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

- **F4 approved (2026-10-17)**: user OKs spec_uat line 39 (T-1 end-to-end) and the setup naming `UAT Kanban Actor`. Apply only after the current actor requests finish; then SEND SD the instruction. Nothing committed yet.
- **Shipped in v0.31.0 (2026-10-20)**: kanban-list-details and actor-tree-mail-marker. Both have open manual validation (NOT RUN rows in the release notes); the user chose to include kanban-list-details despite its PARTIAL validation.
- **Next: migration to syspilot 0.10 (backlog #69, bundles #40 and #48)**: actor folders move out of this repo with it (Repo Maintainer, 2026-10-20). PM has not seen 0.10 yet; look at it or ask the user before planning.
- **Validation ownership (2026-10-19, user)**: the user executes manual/validation tests; PM only records the user's observations (user may review). Neither TD nor VE executes. Interim for kanban-list-details: PM records T-1, T-21, T-27, T-28(b) in a PM section of the CD; tst- cases point to it.
- **Test access rules (2026-10-19, user, general)**: unit tests unrestricted; EDH integration tests may read Outlook only, never change mail; test actors live only in `testdata` (Outlook folders `Inbox\Test1`, `Inbox\Test2`); no other real mail folder is used for tests, and real folder names never appear in OSS documents; Outlook tests need `jarvis.outlook.enabled: true` in the testdata settings.
- **Automate before routing to the user (2026-10-19, user)**: before a check goes to the user, ask whether it is automatable. Checks on file content, tool counts, or IDs are verification and belong in tests. The user validates only what needs human judgment. Mistake made 2026-10-19: I requested T-21 field values as user validation.
- **Spike email-triage-embeddings-poc (2026-10-07, Research), findings in** —
  Research measured with `bge-m3` via Ollama (findings under
  `.jarvis/actors/Research/email-triage/findings-2026-10.md`): project documents
  alone top-1 about 4 of 15, with folder mails 10-11 of 15 (top-3 13 of 15),
  score and gap do not separate "no project" (small samples, one model, the
  second model was not downloaded). User conclusion 2026-10-08: embeddings are
  not enough, "no project" needs a language model call; embeddings stay a
  possible shortlist stage later (parked). Open: Research's worktree
  `C:\workspace\jarvis-email-poc` still exists with the local, unpushed branch
  `research/email-triage-embeddings-poc`; ask Research to close it. Original brief: branch from `development`, work under
  `experiments/email-triage-embeddings/`, project data (`context.md`,
  `actor.yaml` from the OneDrive Projekte folder), the 20 newest inbox mails read
  only via the Pantheon scripts, local Ollama, console output top 10. Idea
  context (hybrid LLM plus embeddings, learning from folders, vectors in RAM plus
  a local cache, later changes "Projekt-Index" then "Zuweisung") is in
  `ideas/llm-gateway.md`, third section.
- **Open after v0.29.0 (2026-10-03)**: automatic retry after the first-start TLS failure (user's call); backlog #45, #47, #48; backlog #46 (retire `ideas/recording-design.md`) is handled by the 2026-10-20 cleanup. Not read: licence file of `Microsoft.Windows.AI.MachineLearning.dll` and the npm/NuGet terms (PM caveat on record). Field evidence: a 49 min real meeting (2026-10-05) and recorder sessions over 3 h (2026-10-09) ran without a defect; audio source is always the first one (backlog #50).
- **QM may propose simplifications (2026-10-03)**: the user told QM it may
  propose a simpler solution over strict spec adherence, with the spec
  changed openly, when user value is not materially hurt. Evaluate such
  proposals as UX/requirement decisions with benefits and losses stated; the
  user decides, SD revises, nothing is relaxed silently.
- **Private Actor repo (2026-10-20)**: actor folders move out of this repo into a separate private repo with the syspilot 0.10 migration. Public Git history is not erased by this move.

## Recently Shipped

- **v0.31.0 (2026-10-20)**: kanban-list-details and actor-tree-mail-marker. Release notes and CDs in `docs/changes/v0.31.0/`.
- **v0.30.0 (2026-10-08)**: actor-identity-via-agent-file and heartbeat-agent-model-selection. Breaking changes are in the release notes.
- Older releases: `docs/releasenotes.md` and `docs/changes/v<version>/`.

## Ideas

- [Parallel feature teams, retro, actor namespace](ideas/parallel-teams.md) — one team per worktree, pairwise memory retro, namespace for actor names (user thoughts 2026-10-03, nothing decided)
- **US/REQ/SPEC — is the SPEC level redundant? (2026-08-20)**: SPEC often ends up
  just restating the code. Idea: try dropping it for one new feature as an
  experiment. Not trivial — the 3-level structure is hardwired throughout
  syspilot (agents, traceability, MECE/Trace engineers); current syspilot
  version doesn't give the flexibility needed yet. Parked, revisit later.
- [LLM access for scripts](ideas/llm-gateway.md) — expose `vscode.lm` to local scripts (OpenAI-style endpoint vs MCP); blocked on GitHub licence/Bosch clarification and auth design (2026-10-07)
- [PIM Modularization](ideas/pim-modularization.md) — drop per-component enable/disable settings, go installable-sub-extensions instead
- [Reorganize `.jarvis/` layout](ideas/jarvis-dotfolder-layout.md) — group flat state files per module; parked, not urgent (2026-07-21)
- Calendar auto-recording (from the retired recording design, 2026-04): start and stop a recording with a calendar event. Not decided.
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
- **AHP migration research spike (planned week of 2026-07-28; status not recorded, ask the user)**: VS Code 1.130
  confirmed AHP as the platform direction. FI-2026-07-21 documents the right
  path: `editorService.openEditor({ resource })` + Session-URIs instead of
  `chat.open` hack. Goal: assess what it takes to migrate Jarvis session-layer
  to AHP-native. No GH issue yet — create one after the spike when scope is clear.
  Also investigate during spike (obs. 2026-07-23, likely 1.130): opening an
  actor session can spawn a phantom "broken" chat in a 2nd editor tab; split
  view mirrors one session synchronously into both panes (same session, not
  two actors). Fits AHP session-layer rework — assess together.
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

