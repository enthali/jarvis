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

## Verify Engineer Runs Before QM, Not After

Insert Verify Engineer between Dev Engineer's implementation and the QM
notification (generic workflow step 9): SEND to Verify Engineer first, wait
for `docs/changes/val-<name>.md` to exist on the branch, only then notify
QM. QM's review presumes `val-<name>.md` already exists — QM checks
completeness/consistency, it does not substitute for spec-to-code
verification.

Decided 2026-08-05, after Release Engineer's SC-004 archive gate blocked
v0.25.0: 5 merged CRs had QM sign-off but no `val-*.md`, because nothing in
the pipeline invoked Verify Engineer at all. Fixing this in
`syspilot.cm.agent.md` directly was reverted — that file is syspilot-managed
and gets overwritten on the next syspilot update; this tailoring file is the
correct, durable place for the override.
