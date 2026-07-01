# Project Manager — Jarvis

## Issue #18 — Files Touched by Agent (in progress)

**User need:** With 50+ sessions, user loses track of which files a session has modified. Critical for orientation and forensics.

**VS Code native overlap:** June 27 VS Code update added "See which files have changed when using the Agent Host" (#318891) — confirmed this is AHP-only (Copilot CLI), does not apply to our normal chat sessions. Building our own.

**Step 1 — entity-files-tree (2026-07-01):** Expandable file children (context.md, YAML, agent file) on Session/Project/Event tree nodes. Pipeline complete, awaiting QM + merge.

**Step 2+ (not yet scoped):** Hook-based tracking of files touched during a session — user wants to go step by step, not all at once.

**Design-doc drift found during step 1 (CM notable item):** Design docs still reference separate Project/Event/Session TreeProvider classes — these were already unified into one `GenericTreeDataProvider` in a prior CR. Implemented in the correct unified location. **Watch for this in other pending/future CDs that may still reference the old per-entity-kind TreeProvider model** — may need a doc correction pass.

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

## Backlog

Single source of truth: [open GitHub Issues](https://github.com/enthali/jarvis/issues). See `.github/agents/syspilot.pm.tailoring.md`.

**Housekeeping (close on GitHub if not already closed):**
- **Issue #7** — WSL2 username fallback, shipped v0.13.3 (commit 8fa838e)
- **Issue #2** — PIM already extracted as separate installable add-on (jarvis-pim package, on Marketplace)

## Spec Status Fixes (quick wins)

- **US_EXP_OPENCONTEXT** — marked `draft` but implemented. Set to `implemented` after confirming ACs match behavior. (Found by System Designer during entity-files-tree review.)
- **US_EXP_SIDEBAR** — "leaf node" definition predates entity-files-tree expandability change, reads stale standalone. (QM Round 2 finding #3, deferred.)

## Technical Debt

## Technical Debt

- **SES/EXP Theme Boundary** — resolved by entity-taxonomy-rename CR (merged to develop, 2026-07-01). Session kind → Actor kind, EXP narrows to sidebar frame, new ENT theme for generic cross-kind concepts.
- **Future: `.jarvis/sessions/` folder rename** (queued after #3 freshmind/housekeeping). Additive-only migration: new workspaces get `.jarvis/actors/`; existing `.jarvis/sessions/` folders are NOT force-migrated (active sessions run out of that folder — forced rename mid-flight breaks orchestration; no safe quiesce mechanism exists yet without #3). Sequencing: entity-taxonomy-rename (done) → #3 (freshmind/housekeeping) → folder-rename code CR.
- **Release agent copies instead of moves change docs** — v0.14.0 release left duplicate change docs at `docs/changes/` root (should only exist under `docs/changes/v0.14.0/`). Cleaned up manually 2026-07-01. Check this on every future release.

## Parallel Work — Research in Progress

User is having Research do a stocktake on running parallel CRs via git worktrees (multiple CM/Dev Engineer pairs at once). Related: prior S2S push to expose Jarvis messages to Copilot CLI — CLI sessions could work in a worktree too. Not scoped yet.

## Active Plans

- [Marketplace Transition Plan](marketplace-transition-plan.md) — **COMPLETED** (v0.13.0 retire-jarvis-legacy)

## Ideas

- [Kanban Board](ideas/kanban-board.md)
- [sendToSession → sendMessage rename](ideas/sendmessage-rename.md) — parked 2026-06-09

## Lessons Learned

See [lessons-learned.md](lessons-learned.md).

