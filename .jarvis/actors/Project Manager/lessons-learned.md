# PM Lessons Learned

### Committed CD content reverted twice in the shared tree, probably a stale editor buffer (2026-10-08)
In heartbeat-agent-model-selection the QM Round 1 entry vanished, and later the SD found the committed QM entry and my PM decisions reverted to the template (85 deletions) before it restored from HEAD. Cause not proven; it fits an editor window holding an old buffer of the CD that was saved over the file. Third case the same evening in `req_aut.rst` and `spec_aut.rst` (reverted to wording older than HEAD). Git reflog shows no checkout, reset or stash, so a program wrote old content. The user sees it at home too and suspects screen lock then suspend while an actor works; unproven. Next time, before restoring: note the file's LastWriteTime, look at the VS Code Timeline of the file for a save at that time, run `git reflog -10`, and report to CM. Before editing a CD, compare it with HEAD (`git diff --stat`); after commits, check `git status` for an unexpected modified CD and never save an old buffer. Ask the user to close editor tabs of CDs that other actors write to.

### CD carried the first customer and a list of exclusions into the Summary (2026-10-08)
For `heartbeat-agent-model-selection` I wrote the email triage as motivation and "not part of this change: JSON format, quotas, ..." into the CD. The user struck both: the customer is not relevant to the function, and the exclusions came only from the triage context, not from the requirements. A named exclusion is remembered and acted on by the next actor. A CD states the wanted function and its acceptance criteria, nothing about who might use it and nothing about what is not wanted; parked ideas belong in the backlog or ideas, not in the CD.

### Parallel work, first experience: what already hurt with ONE shared working tree (2026-10-03)
The user starts his first test of two parallel changes (recorder here, backlog #42 on another machine) and wants to learn what syspilot needs for parallel work; this is raw material, not a design. Friction seen so far, each from this session: (1) one shared working tree means one checked-out branch for all actors — an unknown actor's uncommitted `packages/recorder/package.json` failed 7 tests in the shared tree while a clean checkout passed; (2) a branch checked out in another worktree cannot be checked out in the main tree, so a squash-merge needed a temporary worktree and a fast-forward in the owning one; (3) extra worktrees that actors create for themselves are invisible to the others and hold files outside Git (ignored folders, test data) that deletion destroys; (4) actors leave uncommitted edits in shared files (QM's findings in the CD, memory files) that others must commit or work around; (5) a squash-merge drops the ancestry, so `git log development..branch` lists every commit again and commits made on the branch after the squash do not reach `development`; (6) shared single-writer files collide — backlog item IDs collided between branches (#43), and actor memory files diverge per branch; (7) a status word such as `implemented` meant different things to different actors (code exists vs verified), which only showed when several actors judged the same element. For the other machine's merge expect (6) and (5). Add observations here as the second change progresses; do not turn them into a process before the user asks.

### Logged a broad-match gitignore pattern as a bug without checking intent first (2026-08-24)
Filed backlog item 10 as a bug — `jarvis-*` in `configPaths.ts` WORKSPACE_PATHS matches at any depth, not just root-level VSIX artifacts — based on the symptom (a CD file got silently ignored) without asking whether the broad match was deliberate. User clarified: intentional, anything named `jarvis-*` anywhere is extension-delivered and should never be tracked, regardless of depth. Closed as working-as-intended. Going forward: an unexpectedly-broad match rule is not automatically a bug — check for stated intent (comments, commit history, or just ask) before logging it as a defect.

### Operation Mode changed directly with CM mid-CR, PM not notified (2026-07-29)
During CR #58, the user told CM directly to flip the CD's Operation Mode from `user-guided` to `autonomous` at CM's first checkpoint, without looping PM in — PM only discovered the change later by noticing an unexplained commit (`docs(cd): flip to autonomous mode...`) in the git log. No harm done here (user confirmed the change was intentional), but PM's own record of the CR's mode was silently stale in the meantime. Going forward: Operation Mode is a PM-set header field — settle it with the user *before* dispatching the CR to CM, and if it needs to change mid-flight, that goes through PM (SEND), not directly to CM, so PM's picture of the CR stays accurate.

### runSubagent used for a persistent actor (Release Engineer) instead of SEND (2026-07-28)
Dispatched the v0.24.1 release via `runSubagent` — it executed fine (verified clean via git reflog, no stash/other-actor damage), but Release Engineer is a real Jarvis actor with its own `context.md`. Running it as a stateless subagent meant it never called `whoAmI`, never read its own memory, and never wrote to it — its context.md still said "v0.24.0" afterward. Caught by the user in real time. Fix: backfilled the actor via a SEND message so it can update its own memory (ownership rule — PM doesn't write another actor's memory directly). Going forward: any actor listed in `jarvis_listActors` gets `jarvis_sendMessage`, never `runSubagent` — subagents are for stateless/exploratory work only, never for a role with persistent memory.

### Treated an unreviewed prior CD as the convention instead of the template itself (2026-07-28)
Drafted `notification-template-empty-fallback`'s CD by imitating `kanban-yaml-comment-preservation.md`'s shape (Summary + Findings, no Level 0/1/2/Final-Consistency-Check headers) instead of copying `.github/templates/change-document.md` verbatim. That precedent was itself a process deviation that only shipped because the user hadn't reviewed it before send — not a settled convention. User caught it immediately: "the change document is the contract between the agents so why do you change its format?" Fixed by rebuilding the CD as a literal template copy (only header fields + Summary filled in). Added `scripts/new-change.mjs` (`npm run new-change -- <name>`) to remove the manual-authoring temptation entirely: it brances off `develop` and copies/renames the template mechanically, so there's no format decision left to drift on.

### README readiness check must include packages/core/README.md, not just root + module README (2026-07-26)
During CR #46 release-readiness audit I checked root `README.md` and `packages/kanban/README.md` but skipped `packages/core/README.md` — which is actually the content shown on the Marketplace listing for `jarvis-core` (the entry point most users see). It still had the old Add-ons table (missing Jarvis Kanban) and a stale "install via Jarvis Suite" link (Suite is deprecated). User caught it by pasting the live Marketplace text. Fix applied post-release (won't go live until the next publish). Going forward: README readiness check = root README + the specific new module's README + `packages/core/README.md`'s Add-ons table, every time a new module ships.

### New package's lint gap only caught at release time, not during CR QM rounds (2026-07-26)
`packages/kanban` used `require('yaml')` (forbidden by `@typescript-eslint/no-require-imports`) in two files; it passed all 9 QM rounds of CR #46 and only surfaced when the Release Engineer ran a full release-time lint/build pass. QM's rounds checked tests/traceability/spec-match but apparently didn't run (or didn't block on) `npm run lint` for the new package. Fix going forward: confirm `npm run lint` is part of QM's standard verification for any CR that adds a new package, not just `npm test`/compile.

### Platform-first cut: separate foundation primitives from user-requests (2026-07-24)
When a user-request (e.g. #22 "auto-compact sessions") requires a missing platform primitive, create a separate foundation issue (#43 "prompt-injection tool") rather than rewriting the user-request. The user-request stays open as the motivating story; the foundation issue is what gets implemented and closed. This keeps user-requests clean and platform features independently trackable. Resolution: comment on the user-request with the exact usage pattern (3 lines), then close it. No skill file or doc page needed when the pattern is trivially composable from the new tool.

### QM's gate is not skippable by CR size — MECE/Trace PASS is input, not a substitute (2026-07-21)
Merged `msg-notify-default-text-fix` to `develop` after MECE QUALITY PASS + Trace verification, self-authoring the CD's QM Findings section as "cleared, no dedicated QM pass needed — it's a small follow-up fix." QM's independent Round 2 review (run *after* the merge) confirmed the change was functionally correct, but flagged the sequencing itself as the real problem: only QM renders the CLEAR/BLOCK gate signal, and CM had explicitly routed the CR to QM "per standard workflow" — PM merged ahead of that step. No harm this time (QM's own review came back CLEAR), but the rule going forward: **never merge before QM has posted its own CLEAR/BLOCK message directly**, regardless of how small or low-risk the CR looks — size is not a valid reason to shortcut a role.

### Harness quality beats model size — separation of duties is the real lever (2026-07-20)
The "intelligence" lives in the harness, not the model. A clean role description + sharp tool boundaries + stepwise delegation shifts the *intellectual load* from the model onto the *structure* — then a mid-size local model (qwen 3.6) runs coordination (CM) just fine. Concrete principles, validated against the BOSCH-colleague "I do it all in one session with skills" objection:
- **Mental separation of responsibilities is mandatory.** A spec writer cannot review its own spec (its context is poisoned for neutral review); a tester cannot have been the coder (same problem). Two worlds: the *mental* split matters as much as the *model* split.
- **Match model to responsibility, not to hype.** syspilot was *developed* on Sonnet 3.6 and ran stable there — that's a different bar than *running* it. Haiku as reviewer delivers inconsistencies; qwen sits in between and suffices for coordination. No need for "pink elephants" (Opus/Fable) to develop SW *structurally*.
- **Reserve the heavy models for genuinely heavy steps.** Big architectural planning *might* warrant Sonnet/Opus — but the black-ops merges we did (2026-07-20, #40 + #39) needed none of it. Don't pay for reasoning the harness already provides.
Takeaway for agent tuning / Suite-retirement decision: keep roles small and tools uncomplicated; every over-complex tool forces the model into inference it shouldn't do, and that's where small models fail.

### Dispatching a new CR while Release Engineer was active on shared worktree (2026-07-14)
Sent `agent-mode-persistence` to CM while the Release Engineer was mid-process (uncommitted version-bump and file renames staged/unstaged on `develop`). The "separate branches = safe in parallel" reasoning is wrong when there is only one shared working directory — any `git checkout` by any agent moves that single working tree, potentially carrying another agent's uncommitted changes to the wrong branch or creating conflicts. Rule tightened in `syspilot.pm.tailoring.md`: the Release process counts as an active CR; do not dispatch to CM while a release is in progress. No concurrent CRs on a single worktree, period.

### Preparing the next CR while one is autonomously running still requires a status check first (2026-07-13)
Repeated the "Finger weg" mistake from 2026-07-02, in a new shape: dispatched `actor-migration-command` autonomously, then — without checking whether it had actually completed — did `git checkout develop` + created a new branch for the next CR (`actor-tool-rename`) "in parallel while it runs." System Designer was mid-design on the still-running CR, uncommitted; the checkout yanked the shared working tree out from under it. No data was lost (uncommitted mods travel with `git checkout` when there's no conflict), but it could easily have gone wrong. Fix: before creating any new branch or switching branches, always `git log --oneline <branch> -3` (or check the inbox) to confirm the currently-running CR has actually reached a commit/checkpoint — autonomous mode doesn't mean "safe to ignore," it just means fewer PM checkpoints.

### Release agent change-doc archival can leave duplicates (v0.14.0)
Verify after release that archived change docs land only under `docs/changes/v{x.y.z}/`, not also duplicated at the `docs/changes/` root. Happened once (v0.14.0), cleaned up manually — check this every release until the release agent guards against it itself.

### Release agent only bumps root package.json — spec gap (2026-06-24)
SPEC_REL_RELEASEACTION does not require bumping ALL workspace package.json files — only the root. In an npm monorepo, each sub-package (core, pim, recorder, mcp, core-gh) has its own version field. The release agent missed them all, CI built v0.11.2 VSIXs under the v0.12.0 tag. Fix: add an AC to SPEC_REL_RELEASEACTION requiring the version bump to cover every `packages/*/package.json` in the workspace.

### Moving a git tag: always specify the commit explicitly (2026-06-24)
When moving a tag (delete + recreate), always use `git tag <tag> <sha>` with the explicit commit hash — never rely on a chain like `git tag -d <tag>; git tag <tag>` where a mid-chain failure leaves the local tag deleted but the new one uncreated, causing the subsequent push to go to the wrong commit. The safe pattern: `git tag -d v0.x.y; git push origin :refs/tags/v0.x.y; git tag v0.x.y <sha>; git push origin v0.x.y`.

### Meta-architecture first when introducing new concepts (2026-06-24)
When a CR introduces a new structural pattern (e.g. marketplace packaging, multi-package CI), ask: "does the spec have a contract/template for this pattern?" If not, create the meta spec first (US→REQ→SPEC for the pattern), then implement against it. Patching missing files after the fact is a symptom — a missing spec contract is the root cause. The extension-pkg-contract CR demonstrated this: defining SPEC_REL_PKGCONTRACT first caused the implementation to naturally produce all required files.

### Never interrupt a running CM process with corrective messages (2026-06-24)
If a note is for PM only (e.g. a mode correction), do NOT relay it to CM mid-process. Interrupting a running change breaks the CM's sequential workflow. Corrections to the change document take effect when CM reads it next.

### CR default mode is user-guided (2026-06-24)
Always set Operation Mode: user-guided in the change document unless the user explicitly agrees to autonomous. User-guided means the user sits in while specs are written, not just reviews a fait accompli afterward.

### Verify-Agent must not fabricate UAT results (2026-04-15)
UAT results must never be filled in by an agent — only real manual executions count. CM must leave UAT lines as PENDING until the human fills them in.

### Release quality: QM clear ≠ release-ready (2026-04-15)
If REQ/SPEC doesn't match the actual implementation, don't release — even if UAT technically passed. Spec/implementation mismatch is a release blocker. Fix docs first, then release.

### CM is not a chore servant (2026-05-20)
CM handles product changes and feature branches only. Repo housekeeping, session state refresh, .jarvis/ cleanup are PM's own responsibility or delegated to the relevant session directly.

### Race condition in PM message threads (2026-05-22)
Messages are queued; recipient works strictly serially. SUPERSEDES markers don't help (recipient reads the old one first and acts on it). Only defense: think carefully before sending. With parallel CM threads: read both fully, then send ONE consolidated reply.

### user-guided does not mean Designer asks PM (2026-05-29)
Subagents (Designer, MECE) cannot write to other sessions. Designer's askQuestions goes to the user in the active chat, not to PM. PM gets checkpoints via CM messages.

### 'graceful default' can mean silently broken (2026-05-29)
When a field is optional with a "graceful default", always ask: what happens when the field is empty? If the answer is "it uses whatever was last active", that's not graceful — it's silently broken.

### Mirror first, then analyse (2026-05-29)
On every user bug report: first summarize the observed symptom in own words (strictly descriptive, no cause hypothesis) and confirm with the user BEFORE starting code audit, hypotheses, or CM escalation. For compound reports: list each symptom separately.

### Defensive verbosity overrides specialist workflow (2026-06-04)
PM prompts contain WHAT/WHY/INPUT/OUTPUT — not HOW. If something is already in copilot-instructions.md or the agent file: do NOT repeat it. Repeating process steps overrides the specialist's workflow and causes exactly the failures it tries to prevent.
