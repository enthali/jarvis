# Quality Report — Friday Heartbeat

**Date:** 2026-10-02
**Scope:** SC-001 through SC-005; release and completed-CR delta since 2026-09-25.
**Disposition:** Findings to Project Manager; no spec, implementation, User-UAT or merge decision by QM.

## Standing Checks

| Check | Result | Evidence and disposition requested |
|---|---|---|
| SC-001 — Persona | 14 findings: 11 unchanged (GH #33) + 3 in `us_actor.rst` (was 1) | `US_ACTOR_WHOAMI` (flagged 2026-09-25) plus two more landed with the merge — `US_ACTOR_CREATETOOL` and `US_ACTOR_LISTTOOL` — all three use "Actor operating/working in a chat session" instead of an allowed persona (Jarvis User, Jarvis Developer, Jarvis Test Engineer). Same root pattern as the existing finding; recommend folding all three into the GH #33 disposition together rather than deciding WHOAMI alone. |
| SC-002 — Implementation detail in US | 4 findings: 3 existing + 1 unchanged | `US_ACTOR_ACTORS` AC-5 ("kind registration, kind-driven scanner and multi-tree-root infrastructure") is unchanged since 2026-09-25. No new instance found in the merged `us_actor.rst` stories (`CREATETOOL`/`LISTTOOL`/`ACTIVITY`/`CONTEXTACTIONS`/`FILES_TREE`/`TOUCHEDFILES`) — these cite tool/setting names only, consistent with prior practice of not flagging product-facing API names as mechanism detail. |
| SC-003 — SPEC without REQ link | **0 findings — RESOLVED, down from 6** | The six `SPEC_UAT_ACTOR_*` files flagged 2026-09-25 no longer exist. `docs/changes/retire-legacy-actor-kinds.md` (line ~167) records this as a disclosed, user-decided removal in the L2 pass (UAT redesign backlog #40), not an undisclosed regression. Re-counted all 221 `.. spec::` directives repo-wide: exactly 221 `:links:` fields, every one containing a `REQ_` target. PM may treat the 2026-09-25 SC-003 pending item as closed by removal rather than by decision. |
| SC-004 — `tst-` without `val-` | 16 historical findings, unchanged | Re-ran the exact per-directory pairing across all 85 `tst-` files (was 84; `+1` is `tst-retire-legacy-actor-kinds.md` now paired with its own `val-`). Same 16 historical gaps as every prior cycle, still under the standing accept-as-is disposition. No new gap. |
| SC-005 — Root CD stale | PASS | Two root-level CDs, both `Status: in-progress`: `one-kind-consolidation.md` and `retire-legacy-actor-kinds.md`. Both named feature branches (`feature/one-kind-consolidation`, `feature/retire-legacy-actor-kinds`) still exist. Matrix's literal criterion passes — see note below on staleness this doesn't catch. |

## Release And CR Scan

No new tagged release since v0.27.2 (none since 2026-09-25).

Both previously-tracked root-level CRs are **now merged into `development`**:
`one-kind-consolidation` (Phase 1, squash commit `8a0e45f`) and
`retire-legacy-actor-kinds` (Phase 2, squash commit `1a30326`), per the
user's explicit OK-to-merge in each case (PM's merge-gate principle).
Backfilled both into the CR Review Log below — this session performed QM
Rounds 1–4 of `retire-legacy-actor-kinds` directly (CLEAR, no open findings;
Flow API-v2 activation-guard regression independently re-verified fixed);
`one-kind-consolidation`'s six rounds (CLEAR for Phase-1 scope, two findings
DEFERRED/ACCEPTED to backlog #27/#30) were conducted and recorded in its own
CD in a prior session not covered by this QM session's own history, and are
backfilled here from the CD's own text, not from memory.

**Note on SC-005's blind spot:** both CDs' own `**Status**` field still
literally reads `in-progress` even though their code is merged — this is
consistent with the project's convention of archiving a CD (moving it under
`docs/changes/vX.Y.Z/`, flipping Status) only at release time, not at merge
time, so it is not flagged as a new finding. Flagging for awareness only in
case that convention is not what was intended here.

## Anomaly — Uncommitted Working-Tree Change (not a standing check, flagging for visibility)

`docs/changes/retire-legacy-actor-kinds.md` has an **uncommitted** local
modification on `development` that reverts the already-committed,
already-merged manual-smoke-check paragraph from "executed by the user
2026-09-27, PASS" back to "not executed — formal User UAT remains NOT RUN".
This is a real, mechanical `git diff` observation (not inferred), confirmed
via `git status --short` and `git diff -- <file>`. QM did not make this
edit, has not committed or discarded it, and does not know its origin or
intent — per kernel discipline, an uncommitted edit on a shared file is
treated as another actor's potential in-progress work, not QM's to resolve.
Flagging to PM because it silently contradicts a merged, QM/VE-reviewed
record of a PASSED manual check; recommend finding out who made this change
and why before it is lost or accidentally committed over.

## Routing And Evidence Limits

The heartbeat again asks for Last Run/Result in `review-matrix.md`, while
that file says "Definitions only" and routes runtime state to
`scan-state.md`. Same unresolved conflict flagged 2026-09-25 — still
carried forward, no PM decision recorded yet.

SC-001/002 are semantic reviews of candidate phrases, not proof every
technical noun in a User Story is invalid. SC-003 counts exact REQ targets
in `:links:`, not indirect reachability through a User Story. SC-004 uses
exact filenames per directory, not release-wide basename matching. No
User-UAT result or final change acceptance is inferred from this cycle.

## Addendum — PM Response (same day, 2026-10-02)

PM resolved the uncommitted working-tree anomaly: root cause confirmed
(not guessed) as this machine being behind another machine where the
Release Engineer had already shipped **v0.28.0** and archived
`retire-legacy-actor-kinds.md` (and `one-kind-consolidation.md`) to
`docs/changes/v0.28.0/`, with the correct "executed by the user
2026-09-27, PASS" text intact. PM merged that incoming history (no
conflicts) and pushed; the stale root-level copy no longer exists, so this
specific recurrence is structurally closed. The earlier 2026-09-27
occurrence of the same revert remains unexplained but is now moot — the
file path it affected is gone. QM independently confirmed post-merge: the
PASS paragraph is present and correct in
`docs/changes/v0.28.0/retire-legacy-actor-kinds.md` line 830, both CDs are
archived (no longer at `docs/changes/` root), their own `**Status**`
fields still read `in-progress` (unchanged archival convention, not a new
finding), and `git status` is clean.

This merge also brought in one new completed root-level CR not previously
tracked by this session: `remove-newactor-legacy-quickpick` (Status:
complete, `Operation Mode: autonomous`, QM CLEAR Round 1 recorded directly
in its own CD on 2026-09-30 — backfilled into the CR Review Log the same
way as `one-kind-consolidation`, not from this session's memory). Its
feature branch is already deleted post-merge, so SC-005 does not apply
(Status is `complete`, not `in-progress`). It has a `val-` but no `tst-`
— a third instance of the existing informal "val- without tst-" pattern
(joining `focus-restore-toggle`, `whoami-hookless-error`), distinct from
the formal SC-004 check (which requires every `tst-` to have a `val-`,
not the reverse) and carried forward as the same standing,
PM-acknowledged non-finding.

PM also responded directly on two open items: **SC-001** — GH #33
confirmed as the correct, intentionally low-priority home for all persona
findings (now including the two widened this cycle); no new PM decision
needed, continue tracking externally as before. **SC-003** —
acknowledged resolved by removal; nothing further needed.

`scan-state.md` updated accordingly: new release v0.28.0 recorded, CR
Review Log gained a backfilled row for `remove-newactor-legacy-quickpick`,
"Known Root-Level Changes" rewritten to reflect the archival, and the
Pending section closed out the anomaly and SC-003 items while carrying
forward the routing-instruction conflict (still unresolved) and the
now-three-instance val-without-tst observation.
