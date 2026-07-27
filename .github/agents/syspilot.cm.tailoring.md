# syspilot.cm — Jarvis Project Tailoring

## Bug-Fix CRs Skip Per-CR UAT

For Change Requests that fix a bug (no new user-facing flow), skip step 4
(SEND to Test Designer for UAT artifact generation). Automated test coverage
written by Dev Engineer is sufficient per CR. Manual/UAT verification of bug
fixes happens jointly with the user before release, batched across all
bug-fix CRs in that release — not after each individual CR.

This does not apply to CRs that introduce new user-facing behavior/flows —
those still get a full UAT chain per the generic workflow. If a CR mixes a
bug fix with new behavior, treat it as a feature CR (full UAT) unless PM's
Change Document says otherwise.

Decided 2026-07-27, after the same non-blocking QM finding ("no UAT scenario
for this fix") recurred on 3 consecutive bug-fix CRs (#52, #54, #53).
