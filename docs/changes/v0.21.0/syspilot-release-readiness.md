# Change Document: syspilot-release-readiness

**Status**: merged (develop, commit 08515f7)
**Branch**: feature/syspilot-release-readiness
**Created**: 2026-07-22
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

Before releasing the new `jarvis-syspilot` module, a pre-release check found
that it is not actually reachable by users: the CI release pipeline never
packages or publishes it, and the legacy self-update flow doesn't know about
it either, so anyone relying on either path would never receive it. The
module's README also describes an outdated notification flow. Separately,
the `jarvis-suite` "install everything" extension pack no longer makes sense
now that Jarvis spans genuinely different audiences (personal-assistant
users vs. software-engineering teams) — it is being deprecated rather than
extended with syspilot. Finally, the investigation showed that "does every
add-on actually get onboarded everywhere it needs to be" has quietly failed
before (a prior release shipped without `jarvis-flow` in the self-update
mapping) and failed again here — so this change also establishes a single
add-on onboarding checklist, anchored where every add-on already must be
registered, so this class of gap stops recurring.

**User-visible acceptance criteria:**
- Installing/updating `jarvis-syspilot` from the Marketplace works like every
  other add-on (package + publish steps exist and produce a working release).
- Users on the legacy self-update flow who have `jarvis-syspilot` installed
  receive it in the "Download & Install" update flow like any other add-on.
- The `jarvis-syspilot` README accurately describes the current
  install/skip/delay notification behavior.
- `jarvis-suite` is clearly marked as deprecated, pointing users to install
  individual components instead; it is not extended with syspilot.
- A discoverable onboarding checklist exists so that a future new add-on
  package cannot ship without being wired into every place a working add-on
  needs to be registered.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MOD_INSTALL | Modular Add-on Install | unchanged | Already covers "every add-on must be installable"; AC text generic — the release-readiness gaps are a spec/code accuracy fix against this existing story |
| US_REL_SELFUPDATE | Self-Update Download & Install | unchanged | Already covers "self-update delivers every installed add-on"; VSIX mapping fix restores the intended behavior |

### New User Stories

None.

### Decisions

- Decision 1: No new US needed. All three work-streams (release-pipeline gap, VSIX mapping gap, add-on onboarding process) are implementation/spec-accuracy corrections against already-specified user stories — not new user needs.
- Decision 2: Suite deprecation (marking it as deprecated, not adding syspilot to it) is consistent with US_MOD_INSTALL's intent that each add-on is independently installable; no new US needed for the deprecation.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies
- [x] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MOD_ADDONS | US_MOD_INSTALL | modified | AC-7 added (syspilot); description updated; links SPEC_MOD_ADDON_ONBOARDING |
| REQ_REL_UPDATEINSTALL | US_REL_SELFUPDATE | modified | Added flow and syspilot rows to VSIX mapping table; also fixed pre-existing flow gap while touching the table |

### New Requirements

None.

### Decisions

- Decision 1: No new REQ elements. Gaps are spec-accuracy corrections (missing VSIX entries, missing AC) to existing requirements whose user-story intent was already correct.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies
- [x] All new REQs link to User Stories (N/A — no new REQs)

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_REL_COREGH | REQ_MOD_ADDONS, REQ_REL_UPDATEINSTALL | modified | CI sequence steps 4–6: flow + syspilot packaging/upload/publish steps added |
| SPEC_REL_UPDATENOTIFY | REQ_REL_UPDATEINSTALL | modified | Added syspilot row to VSIX filename mapping table |
| SPEC_MOD_SUITE | REQ_MOD_ADDONS | modified | Status set to deprecated; description + ACs rewritten to reflect deprecation (no further add-ons will be added) |
| SPEC_MOD_SPL_PKG | — | amended | Removed stale AC-6 (MCP copy-paste error — no corresponding code artifact existed) |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MOD_ADDON_ONBOARDING | Add-on Onboarding Checklist | REQ_MOD_ADDONS |

### Decisions

- Decision 1: New SPEC_MOD_ADDON_ONBOARDING is a 6-item checklist (release.yml, idToVsix mapping, SPEC_REL_UPDATENOTIFY table, SPEC_REL_COREGH CI steps, REQ_MOD_ADDONS AC, core README add-ons table) anchored at REQ_MOD_ADDONS so impact scans from any new add-on REQ automatically surface it.
- Decision 2: A new `.github/agents/syspilot.design.tailoring.md` preflight rule was added so System Designer receives a reminder to run the onboarding checklist for every future add-on CR. Prevents recurrence of this class of gap.
- Decision 3: Suite deprecation: `packages/suite/package.json` description and README updated to note deprecated status; extensionPack does NOT include `enthali.jarvis-syspilot`. Rationale: Jarvis now spans audiences (personal assistant vs. software engineering); an "install everything" pack is no longer appropriate.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MOD_INSTALL | REQ_MOD_ADDONS (AC-7 + SPEC_MOD_ADDON_ONBOARDING) | SPEC_REL_COREGH, SPEC_MOD_SUITE, SPEC_MOD_ADDON_ONBOARDING, SPEC_MOD_SPL_PKG | ✅ |
| US_REL_SELFUPDATE | REQ_REL_UPDATEINSTALL (flow + syspilot rows) | SPEC_REL_UPDATENOTIFY, SPEC_REL_COREGH | ✅ |

### Artefakt-Removal-Check

`SPEC_MOD_SPL_PKG` AC-6 removed (copy-paste error from MCP spec). No corresponding code artifact existed — this was a spec-only cleanup. No class (a) or class (b) references needed fixing.

- [x] All class (a) active code/workflow references fixed in this CR (N/A — none existed)
- [x] All class (b) active documentation references fixed in this CR (N/A — none existed)
- [x] Class (c) historical Change Documents: N/A

### Issues Found

None. All gaps were proactively found during a pre-release check and fixed before any release attempt.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified (MECE PASS zero findings commit b38dcf6; Trace PASS zero findings)
- [x] Validation: 270/270 tests, TypeScript clean, lint 0 errors (193 baseline warnings), Sphinx 0 warnings
- [ ] Ready for merge — **awaiting PM manual verification**

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-22

#### Scope

Full review per CM notification: (1) release-readiness gaps (`release.yml` packaging/publish, `updateCheck.ts` `idToVsix` map, README wording), (2) `jarvis-suite` deprecation, (3) new `SPEC_MOD_ADDON_ONBOARDING` checklist + `.github/agents/syspilot.design.tailoring.md` preflight rule.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | CD hygiene | syspilot-release-readiness.md | The CD's "Final Consistency Check" section contains leftover unfilled template boilerplate trailing after the properly-completed content: a duplicate unchecked Artefakt-Removal-Check block, a placeholder "Issue 1: ...— Issue 2: ..." list, and a second, entirely unchecked "Sign-off" block — none of which were deleted when the real content above them was filled in. Purely cosmetic/documentation-hygiene; does not affect the validity of the completed L0-L2 work or the real Sign-off block, but could confuse a future reader about whether the CD is actually finished. | low |

#### Independent Verification (for the record)

- `.github/workflows/release.yml` — confirmed `packages/syspilot` has its own package step (line 47-48), is included in the GitHub Release upload glob (`packages/syspilot/*.vsix`, line 65), and has its own Marketplace publish step (lines 96-99) — matches the val report's CI-sequence table exactly.
- `packages/core/src/engine/core/updateCheck.ts:132` — confirmed `idToVsix` includes `'enthali.jarvis-syspilot': \`jarvis-syspilot-${newVersion}.vsix\`` — matches REQ/SPEC mapping tables exactly.
- `packages/suite/package.json` — confirmed description contains `[DEPRECATED]` + redirect language, and `extensionPack` array does NOT include `enthali.jarvis-syspilot` (5 entries: core/pim/recorder/mcp/flow only).
- `docs/design/spec_mod.rst` — `SPEC_MOD_SUITE`, `SPEC_MOD_SPL_PKG`, `SPEC_MOD_ADDON_ONBOARDING` all confirmed present; `SPEC_MOD_ADDON_ONBOARDING`'s `:links:` confirmed bidirectional with `REQ_MOD_ADDONS`.
- `.github/agents/syspilot.design.tailoring.md` — confirmed "Add-on Onboarding Preflight" section present, faithfully restating the 6-item `SPEC_MOD_ADDON_ONBOARDING` checklist.
- Did not independently re-derive the full UAT T-10/T-16/T-17 diffs — accepted MECE's line-referenced verification (Section 7 of the val report, including its own T-16 non-blocking wording observation) as sufficient given the small, mechanical nature of the scenario additions.

#### Hold Status

Per established practice for this module (dev-launchconfig-syspilot precedent): **QM's CLEAR signal remains held** pending PM's manual verification. Finding #1 is low-severity/cosmetic and does not itself block merge.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now (done) | Leftover duplicate template boilerplate removed from the Final Consistency Check section (commit 433368a). QM independently re-confirmed: section now ends cleanly after the real Sign-off block, no orphaned placeholders remain. Finding closed. |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
