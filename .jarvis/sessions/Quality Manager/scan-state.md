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
| modular-install | 2026-06-20 | L0 FAIL→PASS / L1 FAIL→advisory / L2 FAIL→advisory | PASS (all chains) | n/a | n/a | 4 blocking fixed by CM; 5 advisories accepted | QM CLEAR |
| wsl2-session-lookup | 2026-06-22 | PASS | PASS | n/a | n/a | Advisory: REQ AC-10 silent on USERNAME-unset error (SPEC handles it) | QM CLEAR |
| wsl2-artifacts | 2026-06-23 | n/a (doc-only) | n/a | PASS | TC-1..TC-3 auto ✓ / TC-4 manual pending | Advisory: TC-3 language loose on throw-vs-fallback | QM CLEAR |
| ci-core-bundle | 2026-06-23 | PASS | PASS | n/a | n/a | Advisory: REQ AC-1/AC-3 (vsce devDep, publisher) not in SPEC ACs | QM CLEAR |
| marketplace-publish | 2026-06-23 | PASS | PASS | PASS | n/a | F-1 MINOR: US→US :links: unconventional; F-2 MINOR: SPEC_MKTMETA AC-3 under-specifies README; F-3 MINOR: SPEC_RELEASEACTION code block stale (files glob) | QM CLEAR |
| extension-rename | 2026-06-24 | PASS | PASS | PASS | n/a | F-1 resolved: releasenotes.md v0.10.0 corrected to enthali.jarvis-core; F-2 resolved: REQ_REL_RELEASEACTION + AC-5 added; SPEC_REL_COREGH links fixed | QM CLEAR |
| extension-pkg-contract | 2026-06-24 | PASS | PASS | PASS | n/a | F-1/F-2/F-3 resolved (US→US link removed, SPEC ACs added, status aligned); needs_warnings for US→US deferred (101 violations — separate CR, PM informed) | QM CLEAR |
| lockfile-sync-ac | 2026-06-24 | n/a (spec-only, no new US) | PASS | n/a | n/a | No findings | QM CLEAR |
| addon-icons | 2026-06-24 | n/a (spec-only, no new US) | PASS | n/a | n/a | No findings | QM CLEAR |
| selective-updater | 2026-06-24 | PASS (AC-6/AC-7 added) | PASS | PASS | n/a | No findings; code-vs-spec exact match on all 6 handler steps; Artefakt-Removal verified | QM CLEAR |
| icon-alignment | 2026-06-25 | PASS | PASS | PASS | n/a | 6 findings (icon field in core-gh, test/val artifacts) — all addressed by PM | QM CLEAR |
| wsl2-username-fallback | 2026-06-27 | PASS | PASS | PASS | n/a | process.env fallback verified PASSED; minor SPEC status updates pending | QM APPROVED |
| agent-session-api | 2026-06-27 | PASS | PASS | PASS | 9/11 auto ✓, 2 manual PENDING | JarvisSession type + listJarvisSessions() API clean | QM CLEAR |
| hook-engine-mvp | 2026-06-29 | PASS | PASS | PASS | 16 TCs (15 auto ✓, 1 manual E2E ✓) | HookEngine, HookIntake, HookConfig; 4 new SPECs | QM CLEAR |
| hook-autoinstall-setting | 2026-06-29 | PASS | PASS | PASS | 8 TCs ✓ | jarvis.hooks.autoInstall setting; SPEC_HOOK_AUTOINST added during verification | QM CLEAR |
| hook-event-router | 2026-06-30 | PASS | PASS | PASS | 35 TCs across 8 groups ✓ | Event routing registry, on/off methods, --event parameter, typed dispatch; US_HOOK_OBSERVE AC-4 fulfilled | QM CLEAR |
| hook-files-relocate | 2026-06-30 | n/a (structural) | PASS | PASS | 147/147 tests ✓ | Moved hook files to engine/hooks/, imports updated, build clean | QM CLEAR |
| engine-restructure | 2026-06-30 | n/a (structural) | PASS | PASS | 148/148 tests ✓ | Moved 8 core files to engine/core/ and engine/sessions/, index.ts re-exports, build clean | QM CLEAR |

## Known Releases (at last scan)

v0.0.1, v0.1.0, v0.1.1, v0.2.0, v0.3.0, v0.3.1, v0.4.0, v0.5.0, v0.5.1, v0.5.2, v0.5.3, v0.5.4, v0.5.5, v0.5.6, v0.5.7, v0.5.8, v0.5.9, v0.5.10, v0.5.11, v0.6.0, v0.6.1, v0.7.0

## Known Root-Level Changes (at last scan — completed CRs reviewed by QM)

- remove-open-recording-icon.md ✓ reviewed

## Pending

- SC-002 through SC-005: not yet run (first run on next Friday heartbeat)
- remove-open-recording-icon PM decision: outstanding
