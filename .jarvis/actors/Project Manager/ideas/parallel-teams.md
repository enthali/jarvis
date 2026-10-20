# Idea: Parallel feature teams, retro and actor namespace

**Status:** Idea. User thoughts 2026-10-03; first test: recorder here, #42 on another machine. Gather experience first; nothing decided. No backlog item yet; the user has not said yes to one. Moved out of `context.md` on 2026-10-20.

1. One team per worktree. Worktrees only on feature branches; the main workspace holds `development` and `main` with PM and Release Engineer. Merge by pull request or directly.
2. Each team has its own memory and a "retro" before a release (or after a change). Counterparts read each other's memory pairwise by role. This fits the kernel: read others' memory as evidence, change only your own, escalate disagreement to the user.
3. Biggest worry: actor names must be unique today, and messaging addresses by name, so two architects cannot coexist. Idea: a namespace where the address is role + team + project. A short name resolves inside the own team; a qualified name is needed across teams and projects. Structured fields are better than a flat string; a host layer may come later.
4. Cross-workspace and remote (cloud) sessions depend on AHP. Research recommends deferring AHP 2-3 months (commit `8afdccb`, note not read by PM).
5. Naming interacts with #42 (the agent file and identity sentence use the actor name). Tell the #42 side not to freeze the name form.
6. Open: who may message whom across projects.

See also the parallel-work entry in `lessons-learned.md` (memory root).
