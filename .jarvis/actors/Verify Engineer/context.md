# Session Context: Verify Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.verify`).
This file captures operational details not covered there.

## Findings

- Val reports verify the CD's *declared scope against shipped code*, not the CD's narrative — that is what makes the report worth writing.
- Two accepted spec-vs-code divergences live on in touched-files-cleanup (helper module location; `inline@N` menu ordering). Recorded in its val report so the acceptance travels with the artefact.
- Escalated, still open: self-update mapping omits `jarvis-kanban` and `jarvis-suite` (GH #63 L0 Finding 5) — core matches, so the "no matching assets" fallback never fires and add-ons are silently left behind on update.
- No UAT scenario family exists for the CFG/HOOK/REL areas — standing gap, PM-accepted, tracked GH #61.

## Next

- None open. v0.25.0 archive gate satisfied (10 val-*.md now exist); PM re-triggers Release Engineer.

