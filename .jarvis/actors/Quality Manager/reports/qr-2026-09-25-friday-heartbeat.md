# Quality Report — Friday Heartbeat

**Date:** 2026-09-25
**Scope:** SC-001 through SC-005; release and completed-CR delta since 2026-08-21.
**Disposition:** Findings to Project Manager; no spec, implementation, User-UAT or merge decision by QM.

## Standing Checks

| Check | Result | Evidence and disposition requested |
|---|---|---|
| SC-001 — Persona | 12 findings: 11 existing + 1 new | `US_ACTOR_WHOAMI` uses "new simple Actor operating in a chat session" instead of one of the matrix's three allowed personas. Existing 11 remain tracked under GH #33. PM to decide whether Actor becomes an allowed persona or the story wording changes; do not infer product intent from the label alone. |
| SC-002 — Implementation detail in US | 4 findings: 3 existing + 1 new | `US_ACTOR_ACTORS` AC-5 names kind registration, kind-driven scanner and multi-tree-root infrastructure. This is mechanism-level text in a User Story, already implicated in one-kind-consolidation QM Round 2 Finding 1; PM/User approved the *kindless behavior*, so relocation must preserve that decision. Existing 3 are deferred under GH #32. |
| SC-003 — SPEC without REQ link | 6 new findings | All 308 `.. spec::` directives have nonempty `:links:`, but the six approved `SPEC_UAT_ACTOR_*` files link only to their product User Stories, not to REQs. ADR-7 deliberately omits new product L2 and the approved UAT design uses direct US links; the SC-003 pass criterion still requires a REQ on **every** SPEC. PM to resolve the matrix/approved-UAT-contract mismatch rather than silently treating US links as REQ links. |
| SC-004 — `tst-` without `val-` | 16 historical findings, unchanged | Exact per-directory pairing across 84 protocols finds the same 16 historical gaps as 2026-08-21, all under the prior PM accept-as-is disposition. No new `tst-`-without-`val-` gap. |
| SC-005 — Root CD stale | PASS | Only `one-kind-consolidation.md` is root-level in-progress; `feature/one-kind-consolidation` exists and is checked out. |

## Release And CR Scan

Four new tagged releases and matching change directories: v0.26.0, v0.27.0, v0.27.1, v0.27.2. Nine archived CRs are in those directories: `agent-mode-reset-race`, `kanban-management-tools`, `kanban-skill-content`, `kanban-update-validation`, `module-skill-provisioning`, `actor-kernel-instructions-delivery`, `whoami-all-entity-kinds`, `focus-restore-toggle`, and `whoami-hookless-error`. Seven have both `tst-` and `val-`; the two v0.27.2 CRs have `val-` but no `tst-`. Their validation reports document PM checks and prior QM-CLEAR, so this is an artifact-completeness gap, not evidence that those checks failed. PM to decide whether the protocols are intentionally waived or missing; the current SC-004 direction does not detect `val-`-without-`tst-`. Current `one-kind-consolidation` remains in progress and must not be counted as completed.

## Routing And Evidence Limits

The heartbeat asks for Last Run/Result in `review-matrix.md`, while that file itself says "Definitions only" and directs runtime state to `scan-state.md`. This report follows the existing separation and asks PM to correct the trigger text or decide a registry redesign. No standing-check definition was changed.

SC-001/002 are semantic reviews of candidate phrases, not proof that every technical noun in a User Story is invalid. SC-003 counts exact REQ targets in the `:links:` field, not indirect reachability through a User Story. SC-004 uses exact filenames in each directory, not release-wide basename matching. No User-UAT result or final change acceptance is inferred from this cycle.