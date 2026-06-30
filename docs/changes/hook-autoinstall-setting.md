# Change Document: hook-autoinstall-setting

**Status**: in-progress
**Branch**: feature/hook-autoinstall-setting
**Created**: 2026-06-29
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Add a `jarvis.hooks.autoInstall` VS Code setting (default: `true`) to control whether Jarvis automatically installs and manages the Hook Engine bridge files in the workspace. When `true` (default), behaviour is unchanged — Jarvis self-installs `.github/hooks/jarvis-hooks.json`, `bridge.mjs`, and the port file on activation. When set to `false`, Jarvis removes those files and the workspace settings entry, then stops managing them — giving users full control over their own hook configuration. Acceptance criterion: setting `false` removes all Jarvis-managed hook files; setting `true` restores them on next activation.

---

## Related Github Issues

- #17 Hook Engine MVP (parent feature)

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_HOOK_OBSERVE | Observe Agent Lifecycle Hooks (MVP) | none | Parent context; no modification needed |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_HOOK_CONTROL | Control Hook Auto-Installation | optional |

### Decisions

- Decision 1: New US rather than extending US_HOOK_OBSERVE — the existing US is about *observing* hooks (developer persona); the new US is about *controlling* installation (user persona with workspace-management concern).
- Decision 2: Priority `optional` — mirrors parent US_HOOK_OBSERVE; the hook engine itself is optional, and this is a refinement of it.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories
- [x] No redundancies — US_HOOK_OBSERVE covers intake/logging; US_HOOK_CONTROL covers install/teardown gating
- [x] Gaps identified and addressed — the opt-out gap in the MVP (noted in SPEC_HOOK_CONFIG "Teardown (deferred)") is now covered

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_HOOK_INTAKE | US_HOOK_OBSERVE | none | Intake contract unchanged; the new setting gates *installation*, not intake logic |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_HOOK_AUTOINST | Hook Auto-Install Setting | US_HOOK_CONTROL | optional |

### Conflicts Detected

- None. REQ_HOOK_AUTOINST gates the *file management* path; REQ_HOOK_INTAKE defines the *intake contract*. They are orthogonal — when autoInstall=false, no files are written and no listener starts, but the intake contract itself is unchanged (it simply isn't instantiated).

### Decisions

- Decision 1: The setting gates both file management AND the intake listener — when false, no hook events are received or logged. This is intentional: without the bridge files, VS Code has nothing to invoke, so the listener would be idle anyway. Stopping it avoids resource waste.
- Decision 2: Teardown removes only known Jarvis-managed files, never the `.github/hooks/` directory — other tools (user hooks, CI) may live there.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies — REQ_HOOK_INTAKE covers *what* intake does; REQ_HOOK_AUTOINST covers *whether* intake is activated
- [x] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_HOOK_CONFIG | REQ_HOOK_INTAKE | context only | The new spec references SPEC_HOOK_CONFIG's steps but does not modify it — SPEC_HOOK_CONFIG remains as-is (it defines what happens *when* self-install runs) |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_HOOK_AUTOINST | Hook Auto-Install Setting | REQ_HOOK_AUTOINST; SPEC_HOOK_CONFIG |

### Conflicts Detected

- None. SPEC_HOOK_AUTOINST is a gate *around* SPEC_HOOK_CONFIG, not a modification of it. SPEC_HOOK_CONFIG's "Teardown (deferred)" note explicitly anticipated this feature.

### Decisions

- Decision 1: Separate SPEC element rather than modifying SPEC_HOOK_CONFIG — the existing spec is `implemented` and describes *what* self-install does; the new spec describes *whether* it runs and the teardown reverse path.
- Decision 2: Runtime config-change listener included — allows toggling without restart (better UX, avoids stale state).
- Decision 3: `scope: "resource"` (workspace-scoped) — each workspace can independently opt in/out, matching the per-workspace nature of `.github/hooks/`.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_HOOK_CONTROL | REQ_HOOK_AUTOINST | SPEC_HOOK_AUTOINST | ✅ |

### Artefakt-Removal-Check

*Not applicable — this CR adds new artefacts, does not remove any.*

### Issues Found

- None.

### Sign-off

- [ ] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [ ] All conflicts resolved
- [ ] Traceability verified
- [ ] Ready for implementation

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** {DATE}

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | L? | {ID} | {description} | high / medium / low |

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | 1 | fix-now / defer / accept-as-is | {rationale} |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
