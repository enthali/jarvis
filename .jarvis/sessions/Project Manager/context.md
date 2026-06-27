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

## Current State (2026-06-27)

**Released: v0.13.2** — all four extensions on VS Code Marketplace (enthali.jarvis-core, jarvis-pim, jarvis-recorder, jarvis-mcp), icons present, selective updater working, release agent patched with early Sphinx validation.

**Known constraints:**
- Work machines use corporate private marketplace → can't install from public marketplace there; VSIX install from GitHub Release is the workaround
- `enthali.jarvis` (legacy GitHub Releases stub) retired via migration shim (v0.13.0)

**Release process lessons (apply on every release agent invoke):**
- Version bump must cover ALL `packages/*/package.json` — not just root
- When moving a tag: `git tag <tag> <sha>` with explicit SHA, never rely on chained commands
- Sphinx validation runs BEFORE version bump/docs move (early gate)
- See [lessons-learned.md](lessons-learned.md) for full history

## Next Queue (prioritized from GitHub Issues)

1. **Issue #4** — `jarvis_listAgentSessions` + `registerAgentSessionProvider` in `JarvisCoreApi` (prerequisite for #3)
2. **Issue #3** — `jarvis.freshmind` + `jarvis.housekeeping` commands (depends on #4)
3. **Issue #7** — WSL2 fix: `USERNAME ?? USER` environment variable fallback
4. **Issue #9** — version-bump-ac: add AC to SPEC_REL_RELEASEACTION
5. **Issue #10** — US→US link audit: conf.py `needs_warnings` guard
6. **Issue #1** — End-user documentation — getting started with Jarvis for syspilot
7. **Issue #2** — Extract PIM features as separate installable add-on
8. **Issue #11** — Message Flow Visualization with Chord Diagram (medium, visualization)

**Research / Long-term:**
- **Issue #6** — Agent Host Protocol: send messages to chat sessions without stealing focus (2-3 weeks research, not next cycle)

**Won't Fix:**
- **Issue #8** — Remove GitHub Releases auto-updater: **REQUIRED** for corporate/private marketplace environments

## Roadmap Source of Truth

The roadmap is built from [open GitHub Issues](https://github.com/enthali/jarvis/issues). The PM reviews open issues, prioritizes them manually, and drives the backlog that way. This ensures:
- Always current (no stale documents)
- External feedback included
- Dependencies documented in issue comments

## Active Plans

- [Marketplace Transition Plan](marketplace-transition-plan.md) — **COMPLETED** (v0.13.0 retire-jarvis-legacy)

## Ideas

- [Kanban Board](ideas/kanban-board.md)
- [sendToSession → sendMessage rename](ideas/sendmessage-rename.md) — parked 2026-06-09

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

