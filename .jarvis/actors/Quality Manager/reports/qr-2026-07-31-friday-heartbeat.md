# Quality Report — Friday Heartbeat Cycle

**Datum:** 2026-07-31
**Quality Manager:** Quality Manager Session
**Scope:** Standing Checks SC-001 through SC-005 (full portfolio) + release/CR scan since last cycle (2026-07-17)
**Review Unit:** `docs/userstories/**`, `docs/design/spec_*.rst`, `docs/changes/**` (repo-wide, incl. version archives)

---

## Executive Summary

Routine periodic scan. No blocking issues. SC-001, SC-002, SC-003, SC-005 unchanged/PASS.
SC-004 has **3 new findings** since the last cycle — distinct in character from the 14
previously-accepted historical gaps, because these three CRs were reviewed live by QM
and shipped after the val-report convention was established, yet no `val-*.md` was ever
written for them.

| Severity | Count |
|---|---:|
| Medium | 3 (SC-004, new) |
| Low | 17 (3 SC-002 + 14 SC-004, unchanged, already dispositioned) |
| Informational | 11 (SC-001, unchanged) |

**Release assessment:** no impact on releasability. The SC-004 findings are a
documentation/traceability gap (missing artifact for already-shipped, already-reviewed
changes), not a behavioral defect.

---

## Findings

### SC-001 — US Persona compliance: 11 findings (re-confirmed, unchanged since 2026-07-17)

No new US personas introduced since last run. The three new stories added this cycle
(`US_CFG_RUNTIMELAYOUT`, `US_CFG_AUTOGITIGNORE`, `US_REL_WHATSNEW`) all use conforming
personas ("Jarvis user" / "Jarvis User"). Outstanding items unchanged, tracked under
[GH #33](https://github.com/enthali/jarvis/issues/33) "Streamline persona roles in User Stories".

**PM decision carried forward (2026-07-17):** confirmed unchanged, tracked under GH #33. No escalation.

### SC-002 — Spec-in-US disguise: 3 findings (re-confirmed, unchanged since 2026-07-17)

Same 3 findings as last cycle (`US_PIM_CATEGORY` AC-8, `US_MSG_LISTJARVISSESSIONS` AC-1,
`US_MSG_MCPSERVER` AC-2). The three new stories added this cycle were checked and contain
no implementation detail (no function names, API signatures, or internal paths — only
user-visible artifacts like `.jarvis/` and `.gitignore`, consistent with existing practice
elsewhere in the same files).

**PM decision carried forward (2026-07-17):** **Defer.** Tracked under [GH #32](https://github.com/enthali/jarvis/issues/32). No action this cycle.

### SC-003 — Orphaned SPEC elements: PASS, 0 findings

Verified via automated scan: 285 `.. spec::` blocks, 285 `:id:` fields, 285 `:links:`
fields across `docs/design/spec_*.rst` — one-to-one, no gaps. Includes the 3 SPEC
elements added this cycle (`SPEC_CFG_STATEMIGRATION`, `SPEC_CFG_IGNOREMANAGER`,
`SPEC_REL_RELEASENOTES`), each independently confirmed to carry a `:links:` field during
their own CR reviews.

### SC-004 — UAT story without val-report: 17 findings (14 unchanged + **3 new**)

`tst-*.md` files with no matching `val-*.md`, repo-wide including version archives.
The 14 historical findings from 2026-07-17 are unchanged (predate the val- convention,
already accepted-as-is by PM). **Three new findings, not present last cycle:**

1. `docs/changes/v0.23.0/tst-jarvis-whoami.md` — no `val-jarvis-whoami.md` anywhere in `v0.23.0/`.
2. `docs/changes/v0.23.0/tst-prompt-injection-tool.md` — no `val-prompt-injection-tool.md` anywhere in `v0.23.0/`.
3. `docs/changes/v0.24.0/tst-jarvis-kanban.md` — no `val-jarvis-kanban.md` anywhere in `v0.24.0/`.

**Why these are flagged distinctly from the accepted historical set:** SC-005 already
confirms the val- convention holds for current root-level in-progress CDs, and all three
of these changes (`jarvis-whoami` #44, `prompt-injection-tool`, `jarvis-kanban` #46) were
reviewed live by QM with full UAT scenario verification recorded in the CR Review Log
(e.g. jarvis-whoami: "PASS (8 scenarios T-1..T-8)"; jarvis-kanban: "PASS (28 rows,
T-1..T-28)") — the review happened, but the formal `val-*.md` artifact was never produced
to accompany the `tst-*.md` when the change was archived into its version folder. This
looks like a process gap in how reviewed changes are archived, not a review-coverage gap.

**PM decision needed.** Suggested options: (a) backfill `val-*.md` for these 3 from the
QM sign-off record already in the CR Review Log, (b) accept-as-is like the historical
set since QM's own review record substitutes for the missing artifact, or (c) treat as a
standing-check candidate to prevent recurrence (e.g. archival step must include val- file).

### SC-005 — Stale root-level Change Documents: PASS, 0 findings

Three root-level CDs currently carry `Status: in-progress` (`jarvis-gitignore-automanage.md`,
`jarvis-messages-dir-grouping.md`, `jarvis-release-notes-on-update.md`) — all three have
active feature branches (`feature/jarvis-gitignore-automanage`,
`feature/jarvis-messages-dir-grouping`, `feature/jarvis-release-notes-on-update`).
The two root-level CDs present last cycle (`actor-touched-files.md`, `message-log-viewer.md`)
have since shipped and moved into version archives — expected churn.

---

## Release / CR Scan

8 new releases shipped since last scan (`v0.20.0` through `v0.24.1`, confirmed via `git tag`).

CR Review Log in `scan-state.md` is current: CRs #58 (jarvis-hook-file-prefix), #59
(jarvis-messages-dir-grouping), #60 (jarvis-gitignore-automanage), and #63
(jarvis-release-notes-on-update) were all reviewed live via CM-completion triggers during
this session and are already logged with full detail. No backfill needed this cycle for
those. The pre-existing "Known Root-Level Changes" ledger backfill gap (predating this
session, self-identified 2026-07-17, PM-acknowledged as opportunistic-only) remains open
and is not re-escalated.

---

## Disposition

SC-001, SC-002, SC-003, SC-005: no new action, prior PM decisions stand. SC-004: 3 new
findings require a PM decision (see above) — this is the only item requiring PM
disposition this cycle.

---
