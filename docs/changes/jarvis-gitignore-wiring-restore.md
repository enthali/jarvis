# Change Document: jarvis-gitignore-wiring-restore

**Status**: merged
**Branch**: feature/jarvis-gitignore-wiring-restore
**Created**: 2026-08-05
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

The `touched-files-cleanup` merge (`9a4611b`) did not just delete the
`Gitignore` `contributes.configuration` group from `package.json` (fixed by
`jarvis-gitignore-automanage-followup`) — it also silently deleted the
*activation wiring* in `packages/core/src/extension.ts` for two already-shipped
features, in the same bad edit:

1. **`jarvis-gitignore-automanage` (GH #60):** the import of
   `applyGitignore`/`setIgnoreManagerLogger`, the `setIgnoreManagerLogger(log)`
   call, the `applyGitignore()` call on activation, and the
   `onDidChangeConfiguration` listener for `jarvis.gitignore.autoManage` were
   all removed. Net effect: toggling the setting had zero effect on
   `.gitignore` and produced no log entry — confirmed by manual test in a
   separate workspace after the settings-UI fix landed.
2. **`jarvis-release-notes-on-update` (#63):** the import of
   `announceIfNewVersion`/`showReleaseNotes`, the `announceIfNewVersion()` call
   on activation, the `jarvis.showReleaseNotes` command registration, and its
   subscription entry were all removed the same way. Net effect: release notes
   are never shown on update and the command does nothing.

Both features' code modules, tests, specs and package.json contributions were
untouched and still correct — only the four-to-six lines of `extension.ts`
wiring that invoke them at activation were lost. This CR restores exactly that
wiring, verbatim from the pre-`9a4611b` state, with no other changes.

Acceptance: `applyGitignore()` runs on activation and on
`jarvis.gitignore.autoManage` config change (manual test: toggling the
setting updates `.gitignore` and logs to the Jarvis output channel);
`jarvis.showReleaseNotes` command works and release notes are announced on
first run after a version bump. This is a release blocker for v0.25.0.

---

## QM Findings

*QM writes findings directly into this section after each review round. This
CD had no Issues/Sign-off/QM Findings scaffold — added by QM per its own
charter, same pattern as `touched-files-cleanup` and
`jarvis-gitignore-automanage-followup`.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-08-05

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. | — |

**Independent verification:**

Git log fully disclosed — 7 commits, exact match to CM's message, correct order (including VE's own R1 PARTIAL → R2 PASSED cycle and its two memory commits), zero undisclosed commits.

Independently re-ran `git diff 2db1ee1 HEAD -- packages/core/src/extension.ts` — confirms VE's central claim: zero deletion hunks, only the `--- a/...` diff header starts with `-`. Everything from the pre-regression baseline is present; nothing silently altered while restoring. Directly confirmed by reading the file: `applyGitignore`/`setIgnoreManagerLogger` imported and called at activation (both the direct call and the `onDidChangeConfiguration` listener), `announceIfNewVersion`/`showReleaseNotes` imported, `announceIfNewVersion` called at activation, `jarvis.showReleaseNotes` registered and pushed to subscriptions.

Read `REQ_REL_NOTESCOMMAND` (AC-1: command `jarvis.showReleaseNotes` titled "Jarvis: Show Release Notes") and `REQ_REL_NOTESSETTING` (AC-1: boolean default `true` in `Updates` group; AC-2: `application` scope) directly — both exactly match the manifest as parsed. Grepped `package.json` for `showReleaseNotes`: exactly one contribution, no `commandPalette`/`when: false` suppression entry — reachable, resolving VE's Round 1 HIGH finding (the command handler existed but the palette entry did not). Confirmed `jarvis.releaseNotes.showOnUpdate` is `scope: "application"`, not `"resource"` like the neighbouring `jarvis.gitignore.autoManage` — deliberate, per VE's R2.3 note and `REQ_REL_NOTESSETTING` AC-2's own rationale (installation-scoped opt-out vs. workspace-scoped ignore region); confirmed this is a correct distinction, not a copy-paste slip.

Read VE's Verification Report in full, including its self-correction (§5): VE's own earlier sweep (`d8c086d`) had asserted `REQ_REL_NOTESCOMMAND`/`REQ_REL_NOTESSETTING` were verified against manifest contributions when only the consuming module (`releaseNotes.ts`) had actually been checked — VE disclosed this transparently rather than silently amending its prior report, and recorded a standing-check correction in its own memory. This is exactly the kind of self-disclosed process gap this repository's actors have shown a consistent pattern of surfacing (cf. touched-files-cleanup's AC-15a→AC-21 comment-drift disclosure). No action needed from QM beyond noting it holds up under independent re-check.

R2.4's `jarvis.newEntity` dead-contribution observation independently spot-checked: `git log -S "jarvis.newEntity" -- packages/core/src/extension.ts` — confirmed VE's claim that no commit ever added a registration for it in that file (pre-existing, not caused by `9a4611b`, correctly routed to PM as out-of-scope rather than fixed here).

Full `npx tsc -p packages/core` — clean. Independently re-ran `npx vitest run` — 398/398 passed, 39/39 files, matching VE's disclosed count exactly.

**Overall: CLEAR.** VE's Round 1 → Round 2 process is itself a model instance of the QM charter's "verify the artefact not the intake report" principle, applied by VE to its own prior work. No findings of my own beyond what VE already surfaced and resolved. Ready to close from QM's side.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | No findings to decide | QM CLEAR round 1, no findings raised. Merging. |

---

*Generated by syspilot Change Agent*
