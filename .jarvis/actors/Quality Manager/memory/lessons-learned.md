# QM Lessons Learned

- Undisclosed bundled commits recur even after clean streaks — always run full `git log <lastReviewed>..HEAD` audit on every CR regardless of prior disclosure quality (CR#46 R4/R6; recurred CR#56 after 3 clean rounds).
- Diff each commit individually against its predecessor in multi-commit CRs — a later commit can silently revert an earlier fix built from a stale base (CR#46 R3).
- Bug-fix CRs recurringly ship zero new UAT coverage (#52/#54/#53) — check whether a relevant scenario already exists before assuming a total gap; CR#56's T-10 predated and already covered the fix, just needed extending.
- After any fix touching spec+code+UAT text together, re-verify the FULL REQ→SPEC→UAT chain, not just the named symptom — a location/label fix can introduce a new inverted mismatch (CR#46 R7→R8).
- Illustrative "reference implementation" code samples in specs must be reconciled once dev picks an actual implementation shape — don't leave them mislabeled "unchanged" (CR#54 R1).
- Spec-vs-code conflict ≠ automatic "code is wrong" — escalate to PM/user for a ruling rather than QM+CM resolving it alone; CM has no content authority (CR#46 R4/R5).
