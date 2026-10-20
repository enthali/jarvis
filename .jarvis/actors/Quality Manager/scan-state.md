# QM Scan State

Updated after every cycle. Read this first to know where to pick up.

## Known Limitation — Missed Heartbeat Triggers

The Friday periodic heartbeat fires only if this VS Code session is running at trigger time. There is no catch-up. A stale `Last Run` date is therefore not automatically a QM logging failure.

## Last Periodic Run

- **Date:** 2026-10-02 (Friday heartbeat)
- **Report:** [reports/qr-2026-10-02-friday-heartbeat.md](reports/qr-2026-10-02-friday-heartbeat.md). No periodic run is recorded after this date.

## Standing Check Status (as of 2026-10-02)

| ID | Last Result |
|---|---|
| SC-001 | 14 findings: 11 under GH #33 (persona roles) and 3 in `us_actor.rst` (`US_ACTOR_WHOAMI`, `US_ACTOR_CREATETOOL`, `US_ACTOR_LISTTOOL`). Tracked under GH #33 (pending item). Note the count each cycle. |
| SC-002 | 4 findings: 3 deferred under GH #32; 1 further (`US_ACTOR_ACTORS` AC-5) carried. |
| SC-003 | 0 findings, RESOLVED (was 6). |
| SC-004 | 16 historic gaps, accept-as-is. |
| SC-005 | PASS. Only `remove-newactor-legacy-quickpick.md` remains at root level. |

## Open Items

- **actor-tree-mail-marker** (branch `feature/actor-tree-mail-marker`, not on `development`; CM-triggered 2026-10-20): verdicts sent to CM and PM. Closure of Round 2 findings 4 and 5 confirmed (108166c, ece06bc); AC-5 full stop confirmed at HEAD ffaf2da (commit 191654a). Round 1 rows 1 to 3: closure proposed, pending PM acceptance. Residual risk for the user: the extension listener on `jarvis.outlook.enabled` has no automated test; manual T-12 is NOT RUN. Source: the CD's `## QM Findings` section on that branch.
- **Heartbeat instruction conflict:** the `review-matrix.md` "Last Run" instruction conflicts with the definitions-only matrix and this file's contract. Unresolved for 3 cycles; see [reports/qr-2026-09-25-friday-heartbeat.md](reports/qr-2026-09-25-friday-heartbeat.md).
- **Artefacts with `val-` but no `tst-`:** `focus-restore-toggle`, `whoami-hookless-error`, `remove-newactor-legacy-quickpick`. Listed under SC-004 pending items; no PM disposition recorded in this file beyond that.
- **remove-open-recording-icon:** PM decision last recorded as outstanding (2026-10-02). Re-confirm with PM.
- **one-kind-consolidation and retire-legacy-actor-kinds:** the VE PARTIAL and User UAT NOT RUN dispositions sit with the PM backlog (#27 to #30, #40). Not QM-owned.

## Known Releases

Latest recorded at 2026-10-02: v0.28.0. Re-derive from git tags each cycle. The full list lives in the git history of this file.

## Known Root-Level Changes

- `remove-newactor-legacy-quickpick.md`: status complete. Has `val-` but no `tst-` (see Open Items).
- The one-kind and retire-legacy CDs are archived in `docs/changes/v0.28.0/`.

## CR Review Log

Condensed on 2026-10-20. CRs from icon-alignment through remove-newactor-legacy-quickpick were reviewed; each reached CLEAR or final sign-off, with non-blocking items routed to PM. Per-CR rounds, findings, and verdicts are in each CD's `## QM Findings` section and in the git history of this file. Earlier CRs (v0.8.0 to v0.19.0) were not backfilled into this log.
