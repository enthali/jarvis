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

*Older entries (2026-06-09 through 2026-06-24, 11 CRs: remove-open-recording-icon,
modular-install, wsl2-session-lookup, wsl2-artifacts, ci-core-bundle,
marketplace-publish, extension-rename, extension-pkg-contract, lockfile-sync-ac,
addon-icons, selective-updater) — all QM CLEAR, no outstanding items. Full detail
in git history of this file.*

| Change | Reviewed | MECE | Trace | Code-vs-Spec | UAT | Key Findings | PM Decision |
|---|---|---|---|---|---|---|---|
| icon-alignment | 2026-06-25 | PASS | PASS | PASS | n/a | 6 findings (icon field in core-gh, test/val artifacts) — all addressed by PM | QM CLEAR |
| wsl2-username-fallback | 2026-06-27 | PASS | PASS | PASS | n/a | process.env fallback verified PASSED; minor SPEC status updates pending | QM APPROVED |
| agent-session-api | 2026-06-27 | PASS | PASS | PASS | 9/11 auto ✓, 2 manual PENDING | JarvisSession type + listJarvisSessions() API clean | QM CLEAR |
| hook-engine-mvp | 2026-06-29 | PASS | PASS | PASS | 16 TCs (15 auto ✓, 1 manual E2E ✓) | HookEngine, HookIntake, HookConfig; 4 new SPECs | QM CLEAR |
| hook-autoinstall-setting | 2026-06-29 | PASS | PASS | PASS | 8 TCs ✓ | jarvis.hooks.autoInstall setting; SPEC_HOOK_AUTOINST added during verification | QM CLEAR |
| hook-event-router | 2026-06-30 | PASS | PASS | PASS | 35 TCs across 8 groups ✓ | Event routing registry, on/off methods, --event parameter, typed dispatch; US_HOOK_OBSERVE AC-4 fulfilled | QM CLEAR |
| hook-files-relocate | 2026-06-30 | n/a (structural) | PASS | PASS | 147/147 tests ✓ | Moved hook files to engine/hooks/, imports updated, build clean | QM CLEAR |
| engine-restructure | 2026-06-30 | n/a (structural) | PASS | PASS | 148/148 tests ✓ | Moved 8 core files to engine/core/ and engine/sessions/, index.ts re-exports, build clean | QM CLEAR |
| entity-files-tree | 2026-07-01 | L0 PASS/2 gaps / L1 PASS/1 modality mismatch / L2 PASS/2 doc gaps | PASS (2 elements sampled) | PASS | n/a (UAT already exec'd by CM pipeline) | Round 2: stale CD summary + REQ MAY/SHALL — both fixed. Round 3 spot-check on agent-discovery bug-fix amendment: PASS, no scope creep, code matches amended spec. | QM FINAL SIGN-OFF — CLEAR |
| entity-taxonomy-rename | 2026-07-01 | L0 PASS (2 advisory) / L1 PASS / L2 PASS (1 medium: dual openContext/openSessionContext commands undisclosed; 1 low: residual "session" prose in SPEC_ENT_TREECLICK) | PASS (3 chains: US_ENT_ENTITY, US_ACT_ACTORS, SPEC_ENG_SCANNER) | n/a (spec-only, no code) | n/a | All 5 Round 1 findings resolved and independently re-verified (CD tables backfilled, disclosure line, prose fix, yamlScanner.ts comment, US_ENT_ENTITY downward links, US_PRJ_PROJECT/US_EVT_EVENT added). Round 3: small follow-up (REQ/SPEC_EXP_NEWPROJECT/NEWEVENT → PRJ/EVT relocation) — PASS, CLEAR. | QM FINAL SIGN-OFF — CLEAR |
| entity-open-context-cleanup | 2026-07-01 | n/a (REQ/SPEC rewrite, no new US) | PASS (REQ_ACT_TREECLICK/SPEC_ACT_TREECLICK retirement + REQ_ENT_OPENCONTEXT/SPEC_ENT_OPENCONTEXT_CMD unification) | PASS (code independently verified: extension.ts/package.json clean of dead command, preview:false on all 3 kinds) | PASS (T-9 non-existence, T-10 cross-kind) | Retired jarvis.openSessionContext (dead code), unified on jarvis.openContext for Project/Event/Actor — resolves the asymmetry flagged in entity-taxonomy-rename Round 1 Finding #2. 1 cosmetic finding (CD status markers stale vs actual completion). | QM CLEAR |
| editor-group-placement | 2026-07-02 | PASS (7 REQs: EDITORPLACEMENT/FOCUSRESTORE/AUTODELIVERY_OPTOUT new + 4 modified; 2 low maintainability suggestions) | PASS (FOCUSRESTORE chain + bug-fix verification) | PASS (extension.ts independently verified: resolveSecondaryColumn Math.max formula, snapshotFocus UUID-resolution bug fix, opt-out sequencing) | n/a (CD's own UAT extension, not separately re-run) | Main/Docs/Secondary placement model + Focus-Snapshot/Restore + Auto-Delivery active-use opt-out. CM caught a real bug (snapshotFocus encoding session name not UUID) pre-QM; independently re-verified fixed in both spec and live code with a passing dedicated test. **PM wants joint manual test with user before merge — do not treat QM clearance as auto-merge trigger.** | QM CLEAR (merge pending PM manual test) |


## Known Releases (at last scan)

v0.0.1, v0.1.0, v0.1.1, v0.2.0, v0.3.0, v0.3.1, v0.4.0, v0.5.0, v0.5.1, v0.5.2, v0.5.3, v0.5.4, v0.5.5, v0.5.6, v0.5.7, v0.5.8, v0.5.9, v0.5.10, v0.5.11, v0.6.0, v0.6.1, v0.7.0

## Known Root-Level Changes (at last scan — completed CRs reviewed by QM)

- remove-open-recording-icon.md ✓ reviewed

## Pending

- SC-002 through SC-005: not yet run (first run on next Friday heartbeat)
- remove-open-recording-icon PM decision: outstanding
