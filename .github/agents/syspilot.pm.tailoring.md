# syspilot.pm — Jarvis Project Tailoring

## Backlog

GitHub Issues is the single source of truth for the backlog. No separate backlog file.

## Change Initialization — GitHub Issue Reference

If a Change Document addresses tracked GitHub issue(s), add a
`**GitHub Issue(s)**:` line under the Summary section (e.g. `**GitHub
Issue(s)**: #12, #13`). This lets the Release Engineer close those issues
automatically when the change ships (see `syspilot.release.tailoring.md`).

## Post-Merge Housekeeping Checkpoint

When a CR merges (workflow step 13), before moving on to the next CR, do
the following **interactively with the user** — this is a deliberate
experiment (not yet a generic mechanism) feeding the future housekeeping
capability tracked in GH #23:

1. **GitHub issue comment**: comment on the issue(s) this CR addressed —
   merged to develop, ships in the next release (do not close yet —
   closure happens at release time, see `syspilot.release.tailoring.md`).
2. **Session file review** — actively re-read `context.md` and
   `lessons-learned.md` from disk right now, rather than relying on what
   was read earlier in this conversation. Unlike agent `.md` files, these
   are not injected automatically every turn — an earlier in-session read
   can be stale, and this checkpoint is also the natural moment to refresh
   working memory before a future `/compact` might trim away the history
   that held it. (The `ideas/*.md` link list in `context.md` is enough on
   its own to know what ideas exist — no need to re-read every individual
   idea file here, only when one becomes a real candidate.)
   - Drop stale/superseded content.
   - Capture new lessons learned from this CR, if any.
   - Check for contradictions between an existing recorded lesson and how
     this CR actually played out. If found, don't resolve it silently —
     bring both sides to the user and reflect together on whether the old
     lesson still holds, or whether the new experience should refine or
     replace it.
3. **Roadmap reflection**: review Ideas + open GitHub Issues together with
   the user, pick the next candidate for the queue.

## One CR at a Time (Single Worktree Constraint)

Jarvis currently has **one Git worktree** — all agent sessions share the same
physical working directory. **Do not dispatch a new CR to CM while any other
agent (CM, System Designer, Dev Engineer, Release Engineer, etc.) is actively
working** — "actively working" means their pipeline is in flight and uncommitted
changes may exist on disk.

The fact that two CRs would use separate feature branches does NOT make it
safe to run them concurrently — a `git checkout` by any agent will move the
shared working directory, potentially sweeping another agent's uncommitted work
onto the wrong branch or into an undefined state.

Rule: send one CR to CM, wait until CM reports back **and** no uncommitted
changes exist on disk (`git status` clean), then send the next.

The Release process counts as an active CR for this purpose — do not dispatch
to CM while a release is in progress.

This constraint will be lifted when Git worktrees are introduced (tracked via GH
CLI; not yet available). Until then, sequential single-CR dispatch is mandatory.

## QM Sign-off

Wait for a **direct message from Quality Manager** before merging.
Do not accept CM-relayed QM clearance — only a direct QM inbox message counts.

## Merge Discipline

QM CLEAR is necessary but not sufficient to merge. Even after QM sign-off,
**always ask the user for explicit confirmation before merging** — never
merge automatically just because QM cleared. Report the QM result, then wait
for the user's go-ahead.

## Shared Git Workspace

Jarvis has no worktree isolation — all agent sessions share one working copy
on one branch at a time. Only touch git (commit/checkout/reset/stash) when
actively holding the ball in the workflow. If another session (CM/System
Designer/Dev Engineer) may be working on the current branch/CD, do not edit
the Change Document, spec, or code, and do not run any git command — wait
for that session to report back first. Your own session directory
(`.jarvis/sessions/Project Manager/`) is always safe to edit freely.

## Post-Release Distribution

**Fully automatic via CD.** No manual step required.
Pushing to `main` triggers the GitHub Action which publishes to the VS Code Marketplace and creates GitHub Release VSIX files (consumed by the auto-updater). PM back-merges `main` → `develop` after the tag is pushed.

## Infrastructure Changes

Tooling, CI, Sphinx config, release pipeline changes are **not spec-driven**.
- PM creates a feature branch + lightweight change document (L0-L2 sections marked "N/A — infrastructure change")
- PM implements directly (does not send to CM)
- QM review is still performed
- PM merges to `develop` after QM sign-off

This exception is **narrowly scoped** to tooling/CI/build/release-pipeline
config — it does NOT cover actual product code fixes or features (e.g. a
tree-provider bug, a new tree behavior), even when small and even when the
user explicitly authorizes PM to implement directly without the full CM
pipeline. Mistake made 2026-07-14: skipped creating a Change Document
entirely for two direct product-code fixes (unified-tree async-children bug,
bold category labels) landed in v0.17.2, reasoning they were "small" —
this broke traceability/archival (`docs/changes/v0.17.x/` had nothing to
archive for a shipped release). Rule: ANY product code change — regardless
of who implements it or how small — gets at least a lightweight Change
Document (same L0-L2 "N/A" pattern is fine for tiny fixes) so the Release
Engineer has something to archive and traceability isn't silently broken.
"User said I can skip the pipeline" only waives the CM/QM *process*, never
the CD itself.
