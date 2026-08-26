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
- **A delay cannot establish a precondition** — it only makes violations rarer
  while hiding that they still happen. When a command acts on ambient state
  (whatever is focused/selected/current), specify a check of that state
  immediately before the call, and skip on mismatch. `reapplyAgentMode` fired
  a focus-targeted mode command guarded only by `setTimeout(400)`.
- **A log line that asserts an unverified fact is part of the defect.** The same
  helper logged `re-applied mode "X" to session "Y"` using the *intended* name
  while the command hit whatever was focused — so the logs asserted the opposite
  of what happened, and the bug went unroot-caused for days. Success must be
  claimed only on the branch where the check passed.

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
- **Read the source issue, not only the intake summary of it.** On
  `kanban-skill-content` the intake restated GH #57 wrongly twice: it asked to
  add a `notes` field that already existed end-to-end, and to document an
  `ownerName` convention that inverted the implemented one — while dropping the
  gap the reporter said cost the most time. A summary is a lossy re-encoding;
  when a CR cites an issue, the issue is the requirement.
- **Traceability holds only if `:links:` says so.** Modifying a SPEC to realise
  a new REQ does not link them — I edited three kanban specs for
  `REQ_KAN_TEXTFIELD` and left it childless until the depth-2 impact query
  showed it. Always re-run the query from each new element after writing L2.
- **Inserting code moves the landmarks other tests navigate by.** A source-level
  test sliced `extension.ts` between the update tool and the *next tool comment*;
  my `kanban-management-tools` CR inserted four tools into that gap, so the slice
  silently grew from one handler to five and kept passing. When a CR adds code
  between existing markers, grep the test tree for those markers.
- **A deliberately-created spec contradiction needs a scheduled closer, not just
  a flag.** F-1 (`REQ_KAN_WRITEVALID` said "every write tool" while
  `REQ_KAN_UPDATE` AC-7 froze one out) was the right call under unattended mode,
  but it left two approved requirements disagreeing. Flagging bought the time;
  closing it needed its own CR. When flagging a conflict, name the closing CR.
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
