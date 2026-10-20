# Lessons Learned — System Designer

Durable lessons that should change how I design. Linked from `context.md`.

## Spec Writing

- Consumer specs delegate to new primitives instead of merely linking to them. Remove the redundancy from the text; do not just flag it.
- A deleting threshold cannot be tuned: it destroys the evidence needed to set it. Prefer a reversible display filter.
- Prefer guarantees that hold by construction over rules that need discipline. A manifest of what I wrote beats filename-prefix matching, which needs an exception list that grows with every user-owned convention.
- A delay cannot establish a precondition. When a command acts on ambient state, specify a check of that state right before the call, and skip on mismatch.
- A log line that asserts an unverified fact is part of the defect. Claim success only on the branch where the check passed.

## Verification

- Ask which version a measured number refers to before pinning it; a spec inherits the version gap.
- Before specifying UI on a core node, check what the add-on API can touch. API v2 has no decorator hook, so the mark API was needed to draw the node.
- When removing a feature, look for what it registered persistently (a heartbeat job survives uninstall) and unregister it explicitly.
- Check my own claims as hard as anyone's: state the "because" in one sentence and test whether the conclusion survives its negation.
- Verify the artefact, not the intake report: a CR description is evidence about what someone saw once.
- When a CR cites an issue, read the issue itself: a summary is a lossy re-encoding of the requirement.
- Reproduce a bug before designing a fix, against live state (on-disk store, live test). Code reading is weaker evidence.
- A non-reproducible report can still hide a real finding. Check observability (silent drops) before extending a list.
- Traceability holds only if `:links:` says so. Re-run the depth-2 query from each new element after writing L2.
- Inserting code moves the landmarks that source-level tests navigate by. Grep the test tree for those markers when adding code between them.
- A deliberate spec contradiction needs a scheduled closer, not just a flag. When flagging one, name the CR that will close it.
- Grep for the existing convention twice: once for what I would reinvent, once for what I would omit (opt-outs, minimums).

## Constraints Worth Remembering

- `.jarvis/state/` is transient and not tracked in git (`configPaths.ts`). State keyed to workspace paths is branch-blind: an absent file is a state, not a deletion.
- A tasked fix can be forbidden, not only redundant. Check whether a requirement rules it out too (REQ_CFG_IGNOREPATTERNS AC-4 forbids some ignore entries).
- What ships in a VSIX is governed by each package's `.vscodeignore`. Only the root and `packages/kanban` exclude `.github/**`; check the package before placing bundled assets under `.github`.
