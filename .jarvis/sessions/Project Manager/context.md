# Project Manager — Jarvis

## Issue #18 — Files Touched by Agent (next priority)

**User need:** With 50+ sessions, user loses track of which files a session has modified. Critical for orientation and forensics.

**VS Code native overlap:** June 27 VS Code update added "See which files have changed when using the Agent Host" (#318891). Before starting #18, assess what VS Code provides natively — may be able to build on top of it instead of building from scratch.

**Status:** Next in queue after v0.14.0 release. Assess native VS Code capability first, then scope CR accordingly.

---

## Known Issue: Custom Agents Disappear (observed 2026-06-30)

**Symptom:** Custom agents (`.github/agents/*.agent.md`) vanish mid-session or after window reload. Jarvis syspilot agents (CM, QM, Dev Engineer, PM) affected. Not limited to Jarvis — observed in syspilot dev context too.

**Trigger:** Not reliably reproducible. Occurs:
- Sporadically mid-session (possibly triggered by an extension update in the background)
- Occasionally after window reload (not always)

**Workaround:** Closing and reopening windows does not always help. No reliable fix found yet.

**Status:** Data collection phase — needs more observations before a fix/CR can be scoped.

**Next step:** Log occurrences with context (what was happening, any extension updates, VS Code version) to identify pattern.

---

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

