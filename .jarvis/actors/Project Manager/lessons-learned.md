# PM Lessons Learned

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
