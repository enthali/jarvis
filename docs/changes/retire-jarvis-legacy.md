# Change Document: retire-jarvis-legacy

**Status**: in-progress
**Branch**: feature/retire-jarvis-legacy
**Created**: 2026-06-25
**Author**: PM
**Operation Mode**: user-guided

---

## Summary

The legacy `enthali.jarvis` extension (formerly published simply as "jarvis", delivered via GitHub Releases) must guide its remaining users to the renamed marketplace extension `enthali.jarvis-core` and then remove itself — so that no user is stranded on the obsolete extension ID, and so that two Jarvis instances never operate on the same `.jarvis` project data at the same time. This is the **final** `enthali.jarvis` release; no further legacy releases follow.

User-visible behavior:

- **Stays fully functional until migration.** Users who delay migrating keep a working extension, not a dead stub.
- **Hard self-retire when the new extension is present.** On startup, if `enthali.jarvis-core` is already installed, the legacy extension retires itself immediately (uninstalls) and does **not** bring up its own Jarvis surfaces (sessions view, heartbeat, message processing). Motivation: both extensions share the same `.jarvis` project resources; concurrent operation would duplicate heartbeats and message handling and could corrupt user work. Two active Jarvis instances on one workspace must never happen.
- **Marketplace first.** If the new extension is not installed, the legacy extension tells the user that Jarvis has moved and offers to open the marketplace listing for `enthali.jarvis-core`.
- **GitHub fallback for restricted environments.** If the marketplace version cannot be obtained (e.g. corporate/private marketplace where the public listing is unavailable), the legacy extension offers to install `enthali.jarvis-core` from GitHub Releases instead — reusing the existing update-delivery path so users behind a corporate marketplace are not left stuck.

Acceptance criteria: (1) with `enthali.jarvis-core` installed, the legacy extension uninstalls itself on next startup and surfaces no duplicate views/heartbeat/message processing; (2) without it, the user is offered the marketplace install; (3) when the marketplace is unavailable, the user is offered the GitHub install of `enthali.jarvis-core`; (4) until migration the legacy extension remains fully usable; (5) no `enthali.jarvis` release is published after this one.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_REL_SELFUPDATE | GitHub Self-Update | referenced | Migration shim reuses the GitHub Releases delivery path; not modified |
| US_REL_MARKETPLACE | Marketplace Discoverability | referenced | Migrated user is served by the Marketplace listing; not modified |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| US_REL_RETIRELEGACY | Legacy Extension Retirement | mandatory |

### Decisions

- Decision 1: Final `enthali.jarvis` release is a **migration shim**, not a fully-functional extension. This **supersedes CR AC-4** ("stays fully functional / not a dead stub") — the design session chose the simpler, more reliable migration-shim approach. **Flagged back to CM.**
  - **CM acknowledgment (2026-06-26):** User confirmed during design session that AC-4 was intentionally superseded. The final legacy release is a migration-only shim.
- Decision 2: Migration is automatic (notify-then-proceed), not user-gated.
- Decision 3: Install order — Marketplace first, GitHub `.vsix` fallback when Marketplace unreachable.
- Decision 4: If both install channels fail, the shim does NOT self-uninstall; it shows a manual-install link and retries next startup (never a dead-end).
- Decision 5: `enthali.jarvis-core` needs **no changes** — VS Code reconciles extensions by `publisher.name`, so post-migration updates are handled automatically; the existing `jarvis.checkForUpdates` setting is the manual escape hatch.
- Decision 6: VS Code sideload-vs-marketplace update reconciliation is the one assumption; downgraded from blocker to optional spike because the `checkForUpdates` setting covers the downside.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories (US_REL_SELFUPDATE / US_REL_MARKETPLACE referenced, not modified)
- [x] No redundancies
- [x] Gaps identified and addressed (manual-fallback dead-end gap closed by AC-4)

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_REL_UPDATEINSTALL | US_REL_SELFUPDATE | referenced | GitHub `.vsix` install mechanism reused by the shim's fallback; not modified |
| REQ_REL_UPDATECHECK | US_REL_SELFUPDATE | referenced | Existing self-update check delivers the shim release to legacy users; not modified |

### New Requirements

| ID | Title | Links | Priority |
|----|-------|-------|----------|
| REQ_REL_RETIRESHIM | Migration Shim Activation | US_REL_RETIRELEGACY | mandatory |
| REQ_REL_RETIREINSTALL | Migration Install with Channel Fallback | US_REL_RETIRELEGACY; REQ_REL_UPDATEINSTALL | mandatory |
| REQ_REL_RETIREUNINSTALL | Legacy Self-Uninstall and Reload | US_REL_RETIRELEGACY | mandatory |
| REQ_REL_RETIREFALLBACK | Migration Failure Fallback | US_REL_RETIRELEGACY | mandatory |
| REQ_REL_RETIRENORELEASE | Final Legacy Release Policy | US_REL_RETIRELEGACY | mandatory |

### Conflicts Detected

None. Existing self-update REQs are reused (linked), not modified.

### Decisions

- Decision 1: Reuse `REQ_REL_UPDATEINSTALL` for the GitHub `.vsix` fallback install rather than duplicating download/install logic.
- Decision 2: Five REQs map 1:1 to the five US ACs (shim activation, install+fallback, self-uninstall, failure handling, release policy).
- Decision 3: Marketplace install uses the extension ID; GitHub fallback uses the `jarvis-core-{version}.vsix` asset.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements
- [x] No redundancies (install mechanism reused, not re-specified)
- [x] All new REQs link to User Stories

### Note

- ⚠️ Pre-existing: `docs/requirements/req_rel.rst:236` malformed table in `REQ_REL_UPDATEINSTALL` (the `enthali.jarvis-recorder` row overflows its column). Unrelated to this CR; not fixed here.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_REL_COREGH | REQ_REL_RETIRENORELEASE | modified | core-gh converts from core-bundle re-export to self-contained migration shim; CI stops copying core's `out/`; final GitHub-only release |
| SPEC_REL_UPDATECHECK | REQ_REL_RETIREINSTALL | referenced | `fetchLatestRelease()` + download/install reused by the GitHub fallback; not modified |
| SPEC_REL_UPDATENOTIFY | REQ_REL_RETIREINSTALL | referenced | VSIX download-to-tmp + `installExtension` mechanism reused; not modified |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_REL_RETIRESHIM | Migration Shim Activation | REQ_REL_RETIRESHIM; SPEC_REL_COREGH |
| SPEC_REL_RETIREINSTALL | Ensure jarvis-core Installed (Channel Fallback) | REQ_REL_RETIREINSTALL; SPEC_REL_UPDATECHECK |
| SPEC_REL_RETIREUNINSTALL | Legacy Self-Uninstall and Reload | REQ_REL_RETIREUNINSTALL |
| SPEC_REL_RETIREFALLBACK | Migration Failure Fallback | REQ_REL_RETIREFALLBACK |

### Conflicts Detected

None. Existing self-update SPECs are reused (linked), not modified.

### Decisions

- Decision 1: `packages/core-gh` (the `enthali.jarvis` package) is the shim's home — it transforms from a thin core re-export into a self-contained migration shim with its own `src/` and `build.js`.
- Decision 2: CI no longer copies `packages/core/out/` into core-gh; core-gh builds its own minimal bundle via `vscode:prepublish`.
- Decision 3: GitHub `.vsix` fallback reuses `fetchLatestRelease()` + download/install from the self-update specs rather than duplicating.
- Decision 4: Migration orchestration (`migrate()`) lives in `src/migrate.ts`: `ensureCoreInstalled()` → `retireSelf()` on success, or manual-link + retry on failure.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs
- [x] All new SPECs link to Requirements

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_REL_RETIRELEGACY | REQ_REL_RETIRESHIM | SPEC_REL_RETIRESHIM | ✅ |
| US_REL_RETIRELEGACY | REQ_REL_RETIREINSTALL | SPEC_REL_RETIREINSTALL | ✅ |
| US_REL_RETIRELEGACY | REQ_REL_RETIREUNINSTALL | SPEC_REL_RETIREUNINSTALL | ✅ |
| US_REL_RETIRELEGACY | REQ_REL_RETIREFALLBACK | SPEC_REL_RETIREFALLBACK | ✅ |
| US_REL_RETIRELEGACY | REQ_REL_RETIRENORELEASE | SPEC_REL_COREGH | ✅ |

Verified via `get_need_links.py` impact queries (US→REQ and REQ→SPEC, `--direction in`).

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
