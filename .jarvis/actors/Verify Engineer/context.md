# Session Context: Verify Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.verify`).
This file captures operational details not covered there.

## Findings

- Val reports verify the CD's *declared scope against shipped code*, not the CD's narrative — that is what makes the report worth writing.
- Check acceptance criteria against the CD's *own later findings*, not only against code: a Summary written pre-analysis can promise an outcome the analysis went on to forbid (gitignore-automanage-followup AC-2). `touched-files-cleanup` shows the fix — an explicit "Summary changed shape" note.
- When a CR's outcome is "do not make this fix", verify the non-change as evidence: diff the file that would have changed and show it is untouched.
- Two accepted spec-vs-code divergences live on in touched-files-cleanup (helper module location; `inline@N` menu ordering). Recorded in its val report so the acceptance travels with the artefact.
- Escalated, still open: self-update mapping omits `jarvis-kanban` and `jarvis-suite` (GH #63 L0 Finding 5) — core matches, so the "no matching assets" fallback never fires and add-ons are silently left behind on update.
- No UAT scenario family exists for the CFG/HOOK/REL areas — standing gap, PM-accepted, tracked GH #61.

## Next

- None open. v0.25.0 gate satisfied; gitignore-automanage-followup verified PASSED on its branch (6234a7e).


