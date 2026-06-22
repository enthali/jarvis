# QM Scan State

Updated after every cycle. Read this first to know where to pick up.

## Last Periodic Run

- **Date:** 2026-06-18 (manual — heartbeat job not yet active at that time)
- **Report:** none filed separately — findings sent directly to PM via Jarvis message

## Standing Check Status

| ID | Last Run | Last Result |
|---|---|---|
| SC-001 | 2026-06-18 | 11 findings → reported to PM; CR scheduled |
| SC-002 | — | — |
| SC-003 | — | — |
| SC-004 | — | — |
| SC-005 | — | — |

## CR Review Log

| Change | Reviewed | MECE | Trace | Code-vs-Spec | UAT | Key Findings | PM Decision |
|---|---|---|---|---|---|---|---|
| remove-open-recording-icon | 2026-06-09 | PASS | PASS | PASS | T-1..T-5 auto ✓ / T-6..T-9 manual pending | F-1 MINOR: releasenotes Artefakt class; F-2 INFO: CR header stale; F-3 INFO: val-report missing pre-merge | pending |
| modular-install | 2026-06-20 | L0 FAIL→PASS / L1 FAIL→advisory / L2 FAIL→advisory | PASS (all chains) | n/a | n/a | 4 blocking fixed by CM; 5 advisories accepted | QM CLEAR — proceed to merge |

## Known Releases (at last scan)

v0.0.1, v0.1.0, v0.1.1, v0.2.0, v0.3.0, v0.3.1, v0.4.0, v0.5.0, v0.5.1, v0.5.2, v0.5.3, v0.5.4, v0.5.5, v0.5.6, v0.5.7, v0.5.8, v0.5.9, v0.5.10, v0.5.11, v0.6.0, v0.6.1, v0.7.0

## Known Root-Level Changes (at last scan — completed CRs reviewed by QM)

- remove-open-recording-icon.md ✓ reviewed

## Pending

- SC-002 through SC-005: not yet run (first run on next Friday heartbeat)
- remove-open-recording-icon PM decision: outstanding
