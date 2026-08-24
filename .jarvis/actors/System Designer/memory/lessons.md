# Lessons Learned — System Designer

Durable lessons that should change how I design. Linked from `context.md`.

## Spec Writing

- Consumer specs must be rewritten to delegate to new primitives, not just
  linked — redundancy must be eliminated in the spec text, not just flagged.
- **A deleting threshold cannot be tuned:** it destroys the evidence needed
  to judge whether it is set right. Prefer a display filter — same relief,
  reversible, and the user can see what the setting is hiding. Reshaped
  touched-files-cleanup end to end (CD F-3).
- **Prefer guarantees that hold by construction over guarantees that hold by
  rule.** Ownership tracked by a manifest of what I actually wrote beats
  filename-prefix matching: prefix matching cannot distinguish my file from a
  user's identically-named one, so it needs an exception list that must grow
  with every new user-owned convention (`syspilot.*.tailoring.md` is that list).
  A manifest needs no list — the isolation is structural.

## Verification

- **My own claims need the same verification as anyone's.** I committed a
  rationale in D-7 that was checkable-sounding and did not follow; nobody
  caught it because reviewers check the claim, not the unwritten mechanism.
  Before committing a "because", state it in one sentence and test whether
  the conclusion survives its negation.
- **Verify the artefact, not the intake report.** Two of one CR's four
  observations were stale — the files had been renamed by an earlier merged CR.
  A CR description is evidence about what someone saw once, not about the
  current tree.
- **Grep for the existing convention twice: once for what I'd be reinventing,
  once for what I'd be omitting.** `jarvis.scanInterval` already established
  `minimum: 0` + "0 = disabled", so `jarvis.touchedFiles.windowDays` cost no
  new convention. Inverted, the same grep found the gap in
  `module-skill-provisioning` L1: `jarvis.gitignore.autoManage` and
  `US_HOOK_CONTROL` both give an opt-out for workspace file auto-install, and
  my requirements had none.

## Constraints Worth Remembering

- **`.jarvis/state/` is not in git** (`transient` in WORKSPACE_PATHS), so any
  state keyed to workspace file paths is branch-blind — an absent file is
  indistinguishable from one that is simply not on this branch. Absence is a
  state, not an event; never treat it as a deletion trigger.
- **A tasked fix can be forbidden, not merely redundant.** My conformance-gap
  check asks "does a requirement already mandate this?" — extend it to "does
  one already rule it out?". `jarvis-gitignore-automanage-followup` asked for
  four ignore entries; `REQ_CFG_IGNOREPATTERNS` AC-4 forbids two of them.
- **What ships in a VSIX is governed by each package's `.vscodeignore`.**
  Every add-on excludes `.github/**`, so bundled assets placed there are
  silently absent from the packaged extension — a design that only fails after
  packaging. Check the ignore file before specifying any bundled-asset path.
