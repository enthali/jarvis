# Project Manager — Jarvis

## Change Flow Discipline

One CR to CM at a time. Wait for merge confirmed before sending the next.
CM is a change executor, not a planner. Planning and sequencing stay in PM session.

CR sequence:
1. Discuss sequence with user, plan here
2. Send CR 1 to CM
3. Wait for "merged" confirmation
4. Send CR 2 to CM

## Change Request Defaults

- **Operation mode: user-guided** (default — user sits in while specs are written)
- Autonomous only if user explicitly agrees
- PM creates the feature branch and commits the change document before sending to CM

## Current State (2026-06-24)

**Released: v0.12.0** — all four extensions on VS Code Marketplace (enthali.jarvis-core, jarvis-pim, jarvis-recorder, jarvis-mcp), icons present, selective updater working.

**Known constraints:**
- Work machines use corporate private marketplace → can't install from public marketplace there; VSIX install from GitHub Release is the workaround
- `enthali.jarvis` (legacy GitHub Releases stub) still exists but not yet retired

**Release process lessons (apply on every release agent invoke):**
- Version bump must cover ALL `packages/*/package.json` — not just root
- When moving a tag: `git tag <tag> <sha>` with explicit SHA, never rely on chained commands
- See [lessons-learned.md](lessons-learned.md) for full history

## Next Queue (in order)

1. **version-bump-ac** — autonomous CR: add AC to SPEC_REL_RELEASEACTION requiring all workspace package.json files to be bumped (same pattern as lockfile-sync-ac)
2. **Issue #4** — `jarvis_listAgentSessions` + `registerAgentSessionProvider` in `JarvisCoreApi` (prerequisite for #3)
3. **Issue #3** — `jarvis.freshmind` + `jarvis.housekeeping` commands (depends on #4)
4. **retire-jarvis-legacy** — `enthali.jarvis` one-time migration to `enthali.jarvis-core`
5. **US→US link audit** — conf.py `needs_warnings` guard (deferred from extension-pkg-contract)

## Roadmap Source of Truth

The roadmap is built from [open GitHub Issues](https://github.com/enthali/jarvis/issues). The PM reviews open issues, prioritizes them manually, and drives the backlog that way. This ensures:
- Always current (no stale documents)
- External feedback included
- Dependencies documented in issue comments

## Active Plans

- [Marketplace Transition Plan](marketplace-transition-plan.md) — name decided: jarvis-core; step 1 done (v0.11.x/v0.12.0); step 2 (EOL enthali.jarvis) is item #4 in queue above

## Ideas

- [Kanban Board](ideas/kanban-board.md)
- [sendToSession → sendMessage rename](ideas/sendmessage-rename.md) — parked 2026-06-09

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

