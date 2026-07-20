# Quality Report — Friday Heartbeat Cycle

**Datum:** 2026-07-17
**Quality Manager:** Quality Manager Session
**Scope:** Standing Checks SC-001 through SC-005 (full portfolio) + release/CR scan since last cycle (2026-06-18)
**Review Unit:** `docs/userstories/**`, `docs/design/spec_*.rst`, `docs/changes/**` (repo-wide, incl. version archives)

---

## Executive Summary

Routine periodic scan. No blocking issues. Two new finding sets opened (SC-002, SC-004), both resolved same-day by PM decision (defer / accept-as-is). One structural check (SC-003) and one branch-hygiene check (SC-005) passed clean. SC-001 unchanged from prior cycle.

| Severity | Count |
|---|---:|
| Medium | 0 |
| Low | 17 (3 SC-002 + 14 SC-004) |
| Informational | 11 (SC-001, unchanged) |

**Release assessment:** no impact on releasability. All findings are documentation-wording or historical-artifact gaps, not behavioral defects.

---

## Findings

### SC-001 — US Persona compliance: 11 findings (re-confirmed, unchanged since 2026-06-18)

No new US personas introduced since last run. Outstanding items, all tracked under [GH #33](https://github.com/enthali/jarvis/issues/33) "Streamline persona roles in User Stories" *(correction 2026-07-17 — see PM Correction section below; originally misattributed to a non-existent "Jarvis Agent persona CR")*:

- `us_dev.rst` — "Jarvis user and developer" (combined/non-atomic persona)
- `us_evt.rst`, `us_msg.rst` (x1), `us_pim.rst`, `us_prj.rst` — 4x "LLM agent working in a Jarvis workspace" (pending persona)
- `us_msg.rst` — "Jarvis administrator" (undefined persona)
- `us_msg.rst` — 3x combined "...or LLM agent" phrasing
- `us_rel.rst` — "VS Code user" and "user still on the obsolete enthali.jarvis extension" (both undefined personas)

**PM decision (2026-07-17):** confirmed unchanged, tracked under GH #33 "Streamline persona roles in User Stories" (see PM Correction section below). No escalation.

### SC-002 — Spec-in-US disguise: 3 findings (first run)

Implementation detail leaking into User Story acceptance criteria (belongs at REQ/SPEC level):

1. `docs/userstories/us_pim.rst` — `US_PIM_CATEGORY` AC-8 names the function `registerDualTool()`.
2. `docs/userstories/us_msg.rst` — `US_MSG_LISTJARVISSESSIONS` AC-1 specifies the API method signature `JarvisCoreApi.listJarvisSessions()` and its return shape `{name, summary, agent, kind, folder}`.
3. `docs/userstories/us_msg.rst` — `US_MSG_MCPSERVER` AC-2 names the VS Code API call `vscode.lm.registerTool()`.

All 3 are established/shipped features; the fix is a wording cleanup with no behavior change.

**PM decision (2026-07-17):** **Defer.** Backlog issue [GH #32](https://github.com/enthali/jarvis/issues/32) filed ("docs: remove implementation details from User Story acceptance criteria"). Low priority, bundled into a future docs-cleanup CR.

### SC-003 — Orphaned SPEC elements: PASS, 0 findings

Every SPEC element across `docs/design/spec_*.rst` has a `:links:` field to at least one REQ. Verified via automated scan of all `.. spec::` blocks.

### SC-004 — UAT story without val-report: 14 findings (first run, repo-wide incl. version archives)

`tst-*.md` files with no matching `val-*.md`: `session-agent-binding`, `devcontainer-session-lookup`, `context-file-discovery`, `heartbeat-feedback-toast`, `heartbeat-pause-resume`, `open-context`, `list-jobs-tool`, `validate-session-destination`, `create-session-tool`, `validate-heartbeat-queue-destination`, `agent-prompt-tuning`, `tree-search`, `session-tree-click-behavior`, `sessions-feature`.

**PM decision (2026-07-17):** **Accept-as-is.** These predate the `val-` convention; SC-005 confirms the convention now holds for current/root-level CDs. No active quality risk, no rework justified for closed/shipped changes.

### SC-005 — Stale root-level Change Documents: PASS, 0 findings

Both root-level in-progress CDs (`actor-touched-files.md`, `message-log-viewer.md`) have active feature branches (`feature/actor-touched-files`, `feature/message-log-viewer`).

---

## Release / CR Scan

22 releases shipped since last scan (v0.8.0–v0.19.0, confirmed via `git tag`).

**Self-identified housekeeping gap:** the CR Review Log in `scan-state.md` wasn't appended-to since `message-flow-diagram` (2026-07-03), even though several later CRs were reviewed live via CM-completion Jarvis notifications (`unified-entity-tree`, `actor-owned-files-tree`, `actor-activity-indicator`, `message-log-viewer`, etc.). Each of those still passed its own CM-pipeline quality gate + QM sign-off message at the time — this is a logging/traceability gap in the ledger, not an unreviewed-quality gap. PM acknowledged (2026-07-17): no action needed, backfill opportunistically.

---

## Disposition

All findings closed same-day via PM decision. No follow-up QM action required this cycle.

---

## PM Response (verbatim, 2026-07-17)

> Danke für den Heartbeat-Report. Entscheidungen:
>
> **SC-002 (3 Findings, spec-in-US-Wortlaut)**: Defer. Backlog-Issue angelegt: GH #32 (docs: remove implementation details from User Story acceptance criteria). Niedrige Priorität, wird in ein zukünftiges Docs-Cleanup-CR gebündelt, kein aktives Risiko.
>
> **SC-004 (14 Findings, tst- ohne val-)**: Accept-as-is. Das sind historische Lücken von vor der val-Konvention (SC-005 zeigt, dass die Konvention für aktuelle/root-level CDs jetzt greift). Kein aktives Qualitätsrisiko, kein Nacharbeitsaufwand gerechtfertigt für abgeschlossene/ausgelieferte Changes. Keine weitere Aktion.
>
> **SC-001**: bestätigt unverändert, bleibt an die geplante "Jarvis Agent"-Persona-CR gekoppelt, keine Eskalation nötig.
>
> **SC-003/SC-005**: PASS, zur Kenntnis genommen.
>
> **Dein Logging-Gap (CR Review Log seit 2026-07-03)**: verstanden, reine Nachführungssache, kein Handlungsbedarf von meiner Seite — bitte wie vorgeschlagen opportunistisch nachtragen.

---

## PM Correction (2026-07-17, follow-up)

PM flagged that the SC-001 reference above ("geplante 'Jarvis Agent'-Persona-CR") was mistaken — no such GH issue ever existed. SC-001's 11 findings are now tracked under [GH #33 — "Streamline persona roles in User Stories"](https://github.com/enthali/jarvis/issues/33), filed deliberately minimal. All SC-001 references in this report, `scan-state.md`, and `review-matrix.md` have been corrected accordingly. No change to the underlying findings or severity — tracking-issue correction only.
>
> Danke fürs gründliche Scannen.

