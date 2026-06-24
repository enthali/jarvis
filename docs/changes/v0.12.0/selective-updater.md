# Change Document: selective-updater

**Status**: in-progress
**Branch**: feature/selective-updater
**Created**: 2026-06-24
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

The current auto-updater in `packages/core/src/engine/updateCheck.ts` uses `release.assets.find(a => a.name.endsWith('.vsix'))` — it picks the first VSIX found in the GitHub Release. Now that a release contains multiple VSIXs (jarvis-core, jarvis-pim, jarvis-recorder, jarvis-mcp, plus the legacy jarvis), this always installs the wrong package for non-legacy users. The fix: detect which `enthali.jarvis*` extensions the user currently has installed, map each to its expected VSIX filename in the release, and download + install only those. A single reload is offered after all matched VSIXs are installed.

---

## Level 0: User Stories

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REL_SELFUPDATE | Self-Update Check | modified | AC-6 and AC-7 added |

### New User Stories

None — change fits under existing `US_REL_SELFUPDATE`.

### Decisions

- No new US needed; selective install is a correctness fix to the existing user goal ("always run the latest version"), not a new capability.

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
| REQ_REL_UPDATEINSTALL | US_REL_SELFUPDATE | modified | Rewritten; now specifies selective install with ID→VSIX mapping |
| REQ_REL_UPDATENOTIFY | US_REL_SELFUPDATE | modified | AC-3 updated to reference selective flow |

### New Requirements

None.

### Conflicts Detected

None. Old AC-1 ("first `.vsix` asset") replaced — no prior requirement depended on it being first.

### Decisions

- ID→filename mapping is captured in the REQ as a normative table so QM can verify it in code without reading implementation.
- AC-5 replaces old AC-5 ("no `.vsix`") with the richer fallback condition (no *matching* asset for any installed extension).

### Horizontal Check (MECE)

- [x] No contradictions
- [x] No redundancies
- [x] All REQs link to User Stories

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_REL_UPDATENOTIFY | REQ_REL_UPDATENOTIFY; REQ_REL_UPDATEINSTALL | modified | "Download & Install" handler rewritten with selective logic + mapping table |

### New Design Elements

None.

### Conflicts Detected

None.

### Decisions

- `vscode.extensions.all` filtered by `id.startsWith('enthali.jarvis')` — avoids coupling to a hardcoded list of extension IDs while remaining scoped to Jarvis extensions.
- Mapping table is hardcoded in `updateCheck.ts` (mirrors the table in SPEC); adding a new extension requires updating both the spec table and the code map — explicit and reviewable.
- Single `withProgress` covers all downloads; each install runs sequentially to avoid VS Code install-extension race conditions.
- Cleanup (`fs.unlink`) runs per-file immediately after install, not batched.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_REL_SELFUPDATE (AC-6, AC-7) | REQ_REL_UPDATEINSTALL (rewritten), REQ_REL_UPDATENOTIFY (AC-3) | SPEC_REL_UPDATENOTIFY (handler rewritten) | ✅ |

### Artefakt-Removal-Check

Old logic `release.assets.find(a => a.name.endsWith('.vsix'))` removed from `updateCheck.ts`.

Grep for `endsWith('.vsix')` and `endsWith(".vsix")`:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|---|---|---|---|
| `find(a => a.name.endsWith('.vsix'))` | none — removed from updateCheck.ts | none — SPEC_REL_UPDATENOTIFY updated | `v0.2.0/val-self-update.md` line 41 references old AC-1 — acceptable historic stranding |

- [x] All class (a) active code/workflow references fixed in this CR
- [x] All class (b) active documentation references fixed in this CR
- [x] Class (c) historical Change Documents accepted as acceptable historic stranding

### Issues Found

None.

### Sign-off

- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] Ready for implementation
| SYSPILOT_US_NEW_1 | As a..., I want..., so that... | mandatory |

### Decisions

- Decision 1: ...
- Decision 2: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing User Stories
- [ ] No redundancies
- [ ] Gaps identified and addressed

---

## Level 1: Requirements

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_xxx | US_xxx | modified | ... |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| SYSPILOT_REQ_NEW_1 | ... | US_xxx | mandatory |

### Conflicts Detected

- ⚠️ REQ_xxx vs REQ_yyy: {description}
  - Resolution: {decision}

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing Requirements
- [ ] No redundancies
- [ ] All new REQs link to User Stories

---

## Level 2: Design

**Status**: ⏳ not started | 🔄 in progress | ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_xxx | REQ_xxx | modified | ... |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SYSPILOT_SPEC_NEW_1 | ... | REQ_xxx, SYSPILOT_REQ_NEW_1 |

### Conflicts Detected

- ⚠️ SPEC_xxx vs SPEC_yyy: {description}
  - Resolution: {decision}

### Decisions

- Decision 1: ...

### Horizontal Check (MECE)

- [ ] No contradictions with existing Designs
- [ ] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ⏳ not started | ✅ passed | ❌ failed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_xxx | REQ_xxx | SPEC_xxx | ✅ |
| SYSPILOT_US_NEW_1 | SYSPILOT_REQ_NEW_1 | SYSPILOT_SPEC_NEW_1 | ✅ |

### Artefakt-Removal-Check

*Fill in only when this CR removes an artefact (file, field, configuration key, REQ-ID).*

For each removed artefact, run a project-wide grep on all plausible name variants and classify results:

| Removed Artefact | Class (a): Code/Workflow refs | Class (b): Doc refs | Class (c): Historic Change Docs |
|------------------|-------------------------------|---------------------|---------------------------------|
| `{artefact name}` | {files + lines fixed / none} | {files + lines fixed / none} | {count — acceptable historic stranding} |

- [ ] All class (a) active code/workflow references fixed in this CR
- [ ] All class (b) active documentation references fixed in this CR
- [ ] Class (c) historical Change Documents accepted as "acceptable historic stranding" and disclosed above

### Issues Found

- [ ] Issue 1: ...
- [ ] Issue 2: ...

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
