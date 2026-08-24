# Session Context: Verify Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.verify`).
This file captures operational details not covered there.

## Findings

- **A `:status: implemented` sweep asserts every AC of the element, not the ones a CR touched.** An unfinished clause is a known gap while `approved` and a false claim once `implemented` — check the whole AC list before agreeing to a status change. (AC-24 record-key clause, `SPEC_ENT_TOUCHEDFILES`.)
- **A requirement mandating a manifest contribution is verified against the parsed `package.json`, never against the module that consumes it.** I marked REQ_REL_NOTESCOMMAND/NOTESSETTING implemented having checked only `releaseNotes.ts`; both contributions were already deleted. The report that exists to catch that said it had been checked.
- **A test that constructs its own argument confirms the function, never the wiring.** touched-files-wsl-existence: `removeUnder`'s test passed a URI prefix the production call site never produces, so a silent no-op shipped green. When a CR changes a key/identity format, check every consumer of the old format against its *actual* caller.
- To prove "nothing was lost", diff the branch tip against the last-good commit and show the result has **no deletion hunks** — stronger than comparing the fix to the CD.
- A regression's blast radius is the full deletion set of the offending commit across *all* files, enumerated from git — not the subset a CD names.
- Val reports verify the CD's *declared scope against shipped code*, not the CD's narrative — that is what makes the report worth writing.
- Check acceptance criteria against the CD's *own later findings*, not only against code: a Summary written pre-analysis can promise an outcome the analysis went on to forbid (gitignore-automanage-followup AC-2). `touched-files-cleanup` shows the fix — an explicit "Summary changed shape" note.
- When a CR's outcome is "do not make this fix", verify the non-change as evidence: diff the file that would have changed and show it is untouched.
- Two accepted spec-vs-code divergences live on in touched-files-cleanup (helper module location; `inline@N` menu ordering). Recorded in its val report so the acceptance travels with the artefact.
- Escalated, still open: self-update mapping omits `jarvis-kanban` and `jarvis-suite` (GH #63 L0 Finding 5) — core matches, so the "no matching assets" fallback never fires and add-ons are silently left behind on update.
- No UAT scenario family exists for the CFG/HOOK/REL areas — standing gap, PM-accepted, tracked GH #61.

## Next

- `kanban-skill-content` PASSED verification (6eec368). Schema AC-6/AC-7/AC-8 satisfied; validator AC-5/AC-6/AC-7 satisfied; renderer AC-3a satisfied; skill content AC-1..AC-6 satisfied; instructions AC-1..AC-5 satisfied. All CD-identified issues (D-L0-1/L0-2/L1-4) resolved. Backward compat verified. Validation report committed. Responded to CM; ready for UAT.
- `module-skill-provisioning` PASSED verification (6b047a9). Ready to merge in sequence with kanban-skill-content.
- `touched-files-wsl-existence` PASSED R4 (dd912ce, local — never pushed). AC-27 reconciled, spec `implemented`. **Open:** AC-24's record-key clause is unimplemented under that marker — recommended amending AC-24 as AC-27 was. Manual WSL gate still outstanding (O-1 never answered).
- Open, for PM to route: `jarvis.newEntity` is contributed in `package.json` but registered nowhere; hidden by `when: false` so no user impact, yet `SPEC_ACT_NEWENTITY` still describes `newEntityCommand` in `extension.ts` as live. Pre-existing, predates `9a4611b`.
- Suggested to CM: keep the contributed-vs-registered command-id cross-check as a test — it would have caught the `showReleaseNotes` loss the moment `9a4611b` landed.


