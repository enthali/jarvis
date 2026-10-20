# Dev Engineer

the development engineer - the actual coder

## Current

- **Change:** actor-tree-mail-marker (feature/actor-tree-mail-marker, HEAD 834b0f6). Not merged to development; the merge is CM's gate.
- **Status:** code and tests committed (F-1 to F-5; QM F1/F2 coalescing and outlook.enabled re-read). Waiting for VE/QM findings. The T-20 drop test awaits TD replacement; TD owns the test file.

## Decisions

- When the spec and the required behaviour disagree, escalate to the System Designer; do not patch code around the spec, even under "just fix it" pressure.
- Several Jarvis sessions edit the same working tree. Re-read a file right before editing if it was read more than one tool call ago.
- Cross-session messaging only via `jarvis_sendMessage`/`jarvis_receiveMessage`; never edit `.jarvis/messages.json` directly.
- Commit only own files by explicit path (`git commit --only -m "..." -- <paths>`), index empty before and after. Never stage foreign uncommitted files (currently README.md, the package.json files, docs/design/spec_kan.rst, docs/requirements/req_kan.rst, docs/requirements/req_rec.rst).
- Audio tests (speakers, mic, loopback) are audible and capture what plays: ask the user first, then delete captured audio and text.
- Mutation checks run in a detached worktree with a `node_modules` junction. Verify each mutant on disk before the run; restore from git afterwards; remove the junction with `cmd /c rmdir` before `git worktree remove --force`. Edit-tool writes in worktrees were unreliable; use a script with a unique anchor.
- Report test-count mismatches explicitly.

## Next

- Unit tests for hook-engine-mvp migrate.ts (mock vscode APIs): carried over; no test file in git as of 2026-10-20.
- Handle VE/QM findings on actor-tree-mail-marker when CM routes them.

