# Change Document: jarvis-gitignore-automanage-followup

**Status**: merged
**Branch**: feature/jarvis-gitignore-automanage-followup
**Created**: 2026-08-05
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

Follow-up to the `jarvis-gitignore-automanage` CR (GH #60). Two gaps discovered
during v0.25.0 release-readiness review, both traced back to that CR:

1. The `jarvis.gitignore.autoManage` setting is read by the extension at
   runtime (with a default of `true`), but its `contributes.configuration`
   entry in `packages/core/package.json` was accidentally deleted by the
   `touched-files-cleanup` merge (`9a4611b`) — a bad section-replace while
   adding `jarvis.touchedFiles.windowDays` dropped the entire preceding
   "Gitignore" properties block. The setting still works (default applies)
   but is invisible in the VS Code Settings UI since that merge, even though
   it shipped correctly in v0.24.1. Fix: restore the deleted configuration
   entry.
2. The managed `.gitignore` region is generated from the `WORKSPACE_PATHS`
   registry (`configPaths.ts`), which has not been kept in sync with newer
   runtime artifacts introduced after #60 shipped: `.jarvis/message-log.json`,
   `.jarvis/autodelivery.json`, `.jarvis/messages.json`, and the hook-engine
   bridge files under `.github/hooks/` (`bridge.mjs`, `capture.jsonl`, `port`)
   are all transient runtime state that currently leaks into `git status` as
   untracked/uncommittable clutter.

Acceptance:

- AC-1: `jarvis.gitignore.autoManage` appears and is toggleable in the VS Code Settings UI. *(Delivered: restored in `packages/core/package.json` by `3978460`.)*
- AC-2 (revised): the hook-engine artifacts (`.github/hooks/jarvis-*`) are covered by the managed region and do not appear as untracked. *(Delivered: already covered by GH #58's `jarvis-*` entry; stopgap manual lines removed by `da3e62c`.)*

**AC-2 original text restated:** "no untracked/modified files under `.jarvis/` or `.github/hooks/`" — this was written before Level 0 analysis. The analysis found that the three flat message paths (`.jarvis/message-log.json`, `.jarvis/autodelivery.json`, `.jarvis/messages.json`) cannot be added to the ignore region: they are superseded #59 locations, Jarvis no longer writes them, and hiding them would silence the only signal that undelivered messages exist there (`REQ_CFG_IGNOREPATTERNS` AC-4, `REQ_CFG_STATEMIGRATION`). Those files remain visible in `git status` by design. A future CR may retire the migration path under `REQ_CFG_STATEMIGRATION` AC-8 — see Open section.

This is a release blocker for v0.25.0 (AC-1 is the blocker; AC-2 original scope is infeasible and its actual delivery is described above).

---

## HALT lifted — 2026-08-05

The working tree was cleaned (phantom reverts from an editor panel, not an
actor; root cause confirmed by PM). The section below is retained as the record
of why specification work stopped. Level 0 analysis follows it.

---

## USER DECISION REQUIRED — specification work halted before Level 0

**Raised by:** System Designer, 2026-08-05, before any spec element was read or edited.
**Effect:** no Level 0/1/2 work has started. Nothing in this CR is in progress.

The shared working tree carries uncommitted changes to the three files this CR
must edit — `docs/userstories/us_cfg.rst`, `docs/requirements/req_cfg.rst`,
`docs/design/spec_cfg.rst` — plus nine others. They are not mine, and one class
of them is destructive.

**What the changes are.** The working tree reverts `:status: implemented` back
to `:status: approved` on at least `REQ_CFG_FILEPREFIX`, `REQ_CFG_FILEMIGRATION`,
`REQ_CFG_MSGDIR`, `REQ_CFG_PATHSINGLESOURCE`, `REQ_CFG_STATEMIGRATION`,
`SPEC_CFG_WORKSPACEFILES`, `SPEC_CFG_STATEMIGRATION`, `SPEC_CFG_IGNOREMANAGER`,
and further elements in `req_rel.rst`, `spec_rel.rst`, `spec_hook.rst`,
`us_cfg.rst`, `us_rel.rst`. Four Change Documents are reverted the same way.
`docs/design/spec_kan.rst` additionally loses 61 lines with no status change,
so that one is content, not bookkeeping.

**Why this is a hazard rather than a nuisance.** `implemented` was set by
`d8c086d docs(ve): Verification Reports for the 5 root-level CDs + status sweep`,
which is the v0.25.0 verification bookkeeping. The working-tree content is the
*pre-sweep* state, carried across a branch operation rather than authored. Any
commit that stages these files — including a commit whose purpose is this CR —
silently undoes that sweep. The revert would be invisible in review, because the
diff a reviewer reads is the one the commit message describes.

**Why I did not resolve it myself.** `git checkout --` on those paths is
irreversible for whoever owns them, and I cannot tell from the tree whether the
`spec_kan.rst` deletion is stale carry-over like the rest or somebody's live
work — the two are indistinguishable once mixed. Committing selected hunks would
leave the rest of the reversion sitting in the tree for the next actor to hit.

**Why I did not work around it by reading committed content instead.** I can read
the correct text with `git show HEAD:<path>`, but I cannot *write* to those files
without my edit landing on top of the reversion. Analysing now and writing later
would also mean every quotation in this document was taken from a text nobody had
yet decided to keep.

**What I need before Level 0 can start:** the working tree clean for
`docs/userstories/us_cfg.rst`, `docs/requirements/req_cfg.rst` and
`docs/design/spec_cfg.rst` — by whoever owns those changes, not by me. The other
nine files do not block this CR, but the same reversion is sitting in them and
will hit the next actor who commits.

---

## Level 0 / 1 / 2 — outcome: no specification change is required, and two of the four tasked fixes must not be made

This is not a scope reduction reached by trimming. Both gaps were analysed
against the requirements that already govern them, and the specification turns
out to have anticipated all four cases. Three of them are conformance gaps
against `implemented` requirements, needing no new spec at any level; the
fourth is a fix the specification actively forbids.

The findings are recorded per gap rather than per level, because no level has
an impacted element.

### Gap 1 — `jarvis.gitignore.autoManage` — conformance gap, no spec change

**F-1: the requirement already mandates the missing declaration.**
`REQ_CFG_IGNOREAUTOMANAGE` (`:status: implemented`) AC-1: *"The setting SHALL
be contributed as a boolean with default `true`."* AC-6 adds that it SHALL be
workspace-scoped. The specification is not silent, incomplete or ambiguous
here — the artefact simply stopped matching it.

**F-2: the loss is mechanical and its cause is known.** The merge `9a4611b`
dropped the entire `Gitignore` group from `contributes.configuration` in
`packages/core/package.json` while adding the `Hooks` group entries for
`touched-files-cleanup`. The scar is still visible: a stray blank line remains
in the `configuration` array where the group was, between `Reminders` and
`Updates`.

**D-1: no element is amended. Dev restores the group.** Adding a requirement
that says what `REQ_CFG_IGNOREAUTOMANAGE` AC-1 already says would create a
second owner for one obligation, and a second place to keep in sync. The
restored group is:

```json
{
  "title": "Gitignore",
  "properties": {
    "jarvis.gitignore.autoManage": {
      "type": "boolean",
      "default": true,
      "scope": "resource",
      "description": "When true (default), Jarvis maintains a marked region in the workspace .gitignore listing its transient runtime paths. Set to false to remove the region."
    }
  }
}
```

`scope: "resource"` is what implements AC-6 and matches the precedent set by
`jarvis.hooks.autoInstall`, which AC-6 names as the model.

### Gap 2 — `WORKSPACE_PATHS` — the four paths split three ways, and none of them is a registry gap

**F-3: `.github/hooks/bridge.mjs` and `.github/hooks/port` no longer exist.**
They were renamed to `jarvis-bridge.mjs` and `jarvis-port` by the
`jarvis-hook-file-prefix` CR (GH #58). `hookConfig.ts` generates the current
names and carries `SUPERSEDED_FILES = ['bridge.mjs', 'port']` for cleanup;
`REQ_CFG_FILEMIGRATION` AC-1 requires that removal on every activation. The
existing `WORKSPACE_PATHS` entry `.github/hooks/jarvis-*` already covers what
is generated today. Nothing to add — the observation predates GH #58.

**F-4: `.github/hooks/capture.jsonl` is not generated by Jarvis at all, and
ignoring it is forbidden.** It is research residue from a one-off manual
capture tap (`FI-2026-07-17-hook-payloads-file-touch.md`, which records
*"capture.jsonl liegt unter .github/hooks/ und kann gelöscht werden"* and lists
removing the tap as a closing step). No shipped source references it.
`REQ_CFG_IGNOREPATTERNS` AC-4 — *"No entry SHALL match a path Jarvis does not
write"* — and `REQ_CFG_FILEPREFIX` AC-3 both prohibit the entry. The file
should be deleted from the affected working tree; it is a one-machine leftover,
not a product behaviour.

**F-5: the three flat message paths are superseded, not new — and Jarvis does
not write them.** `.jarvis/messages.json`, `.jarvis/message-log.json` and
`.jarvis/autodelivery.json` are the pre-GH-#59 locations. `REQ_CFG_MSGDIR`
relocated them to `.jarvis/messages/{queue,log,autodelivery}.json`, and
`WORKSPACE_PATHS` already covers `.jarvis/messages/` as a directory.
`REQ_CFG_STATEMIGRATION` AC-3 is explicit: *"Writes SHALL go to the current
path only. The superseded path SHALL never be re-created once removed."*

This inverts the tasking. `REQ_CFG_IGNOREPATTERNS` AC-1 scopes the region to
paths Jarvis *writes*; AC-4 forbids entries matching paths it does not. Adding
the three flat paths would violate both.

**F-6: their presence is a symptom with a real cause, and ignoring them would
conceal it.** `REQ_CFG_STATEMIGRATION` AC-4 requires the superseded file to be
removed once its content is present at the current path, and AC-6 requires
migration to be *silent in the steady state*. A superseded file that is still
present means the steady state has not been reached — the union write that
must precede its removal has not run for that file. That is worth diagnosing,
and `git status` is currently the only place it is visible.

There is also a reason not to hide these three specifically: they can hold
**pending user data**. `REQ_CFG_STATEMIGRATION` opens by noting that *"a dropped
entry here is an undelivered message, and it is undelivered silently."* An
ignore entry over a file that may contain undelivered messages removes the last
signal that the message exists.

**D-2: no element is amended for Gap 2.** The registry describes what Jarvis
writes, and it describes it correctly. Three of the four paths are not written
by current Jarvis; the fourth is not written by Jarvis at all.

### Open

**USER DECISION REQUIRED — a superseded path may linger indefinitely, and no
requirement covers that.** This is the residue of Gap 2 once the wrong fix is
set aside, and I could not settle it from the specification.

`REQ_CFG_STATEMIGRATION` removes a superseded file only when the writing owner
performs a union write (AC-4, AC-7). In a workspace where that writer never
runs — no message is ever sent, or the file's writer was retired — the file
stays untracked forever. The specification has no criterion for that state: it
is neither an error, nor covered by the ignore region, nor cleaned up.

The three candidate resolutions each cost something, and choosing between them
is a product decision rather than a design one:

1. **Leave it.** The visibility is a correct signal that migration is
   incomplete. Cost: permanent `git status` noise in every workspace that
   upgraded but is idle — which is the complaint this CR opened with.
2. **Extend the ignore region to superseded paths.** Cost: amends
   `REQ_CFG_IGNOREPATTERNS` AC-1 and AC-4, and hides files that may hold
   undelivered messages.
3. **Retire migration for these three files under `REQ_CFG_STATEMIGRATION`
   AC-8**, which requires *"an explicit decision recorded in a Change Document,
   naming the release from which the superseded path is no longer read"* —
   then delete them unconditionally, as `REQ_CFG_FILEMIGRATION` AC-1 does for
   hook files. Cost: a release boundary must be named, and any workspace that
   skipped it loses whatever those files still held.

My own reading favours 3, because it is the only one that ends the condition
rather than managing it, and AC-8 exists precisely to make that decision
explicit. But it turns on how long a user may skip a release, which I do not
have and should not assume.

### Not impacted — checked

| ID | Why not |
|---|---|
| `REQ_CFG_IGNOREAUTOMANAGE` | AC-1 and AC-6 already mandate the setting. Gap 1 is non-conformance, not an omission. |
| `REQ_CFG_FIXEDPATHS` | Its enumeration already lists the current message paths and `.jarvis/state/release-notes.json`. The flat paths it names are correctly labelled as relocated. |
| `REQ_CFG_IGNOREPATTERNS` | AC-1 and AC-4 already decide all four tasked entries — against adding them. |
| `SPEC_CFG_PATHRESOLVER` | `WORKSPACE_PATHS` matches what Jarvis writes today: `.jarvis/messages/`, `.jarvis/state/`, `.jarvis/logs/`, `.github/hooks/jarvis-*` and the two flat YAML files. |
| `SPEC_CFG_WORKSPACEFILES` | The registry and ignore-region content it documents are unchanged by the above. |
| `SPEC_CFG_IGNOREMANAGER` | Consumes `getIgnoreEntries()`; unaffected. |
| `REQ_CFG_FILEPREFIX`, `REQ_CFG_FILEMIGRATION` | Already implemented correctly — they are the reason F-3 has nothing to fix. |

### Observation for PM — out of scope, reported separately

`REQ_CFG_GROUPS` (`:status: implemented`) requires `contributes.configuration`
to contain exactly eleven groups in a fixed order: Projects, Events, Sessions,
Messages, Heartbeat, Reminders, MCP, PIM, Outlook, Recording, Updates.
`packages/core/package.json` contains seven, of which three are not on that
list: Actors, Prompt Templates, Hooks. Six of the eleven are absent — most of
them because PIM, Outlook, Recording and MCP settings now live in their own
packages' manifests, a split that postdates the requirement.

This is a genuine conformance gap, not a discovery of this CR's making, and it
is larger than this CR: restoring the Gitignore group under D-1 adds an eighth
group that `REQ_CFG_GROUPS` also does not list. Doing the restore does not make
the divergence worse in kind, and blocking it on a requirement rewrite would
hold a release blocker behind unrelated work.

Noted here because the restore touches the array the requirement governs, and
a later reader comparing the two should find the discrepancy already recorded
rather than think it was missed.

---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
This section did not exist in this CD prior to Round 1 — added by QM per its own
charter, since the CD had no Issues/Sign-off/Appendix scaffold at all.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-08-05

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. | — |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 14 commits, exact match to CM's message, correct order, zero undisclosed commits.

Confirmed no `.rst` file is touched on this branch — the CD's "no specification change is required" claim holds of the artefact, not only of the narrative. Independently read `REQ_CFG_IGNOREAUTOMANAGE` (AC-1: boolean default `true`; AC-6: workspace-scoped) and `REQ_CFG_IGNOREPATTERNS` (AC-1: covers every written transient path; AC-4: no entry for a path Jarvis does not write) and `REQ_CFG_STATEMIGRATION` (AC-3: writes go to the current path only; AC-4: superseded file removed only after a union write; AC-8: retirement requires an explicit CD decision naming a release) directly — all three exactly support the CD's F-1/F-4/F-5/F-6 reasoning as quoted. The SD's conclusion (Gap 1 is a pure conformance gap; two of Gap 2's four tasked fixes are actively forbidden by requirements already `implemented`) holds under independent re-derivation from the requirement text, not just from the CD's own paraphrase of it.

Gap 1 fix independently verified: `packages/core/package.json`'s restored `Gitignore` group sits between `Reminders` and `Updates` exactly as D-1 specifies (`type: boolean`, `default: true`, `scope: "resource"`, description matching D-1 verbatim) — confirmed by direct read, group count is 8. `gitignoreManager.ts` reads `getConfiguration('jarvis.gitignore').get('autoManage', true)`, composing to the identical key the manifest declares — the restore changes visibility only, not runtime default behavior, matching F-1/D-1's claim.

Gap 2 forbidden-fixes independently verified absent: `configPaths.ts` (`WORKSPACE_PATHS`) carries no diff on this branch; `.gitignore`'s net diff across the branch is empty (`19062ff`'s 8 stopgap lines exactly reversed by `da3e62c`); `.github/hooks/capture.jsonl` is confirmed deleted from the working tree (only `jarvis-hooks.json` remains), matching F-4's recommendation.

VE's Verification Report (`6234a7e`) read in full and independently re-derived rather than taken on faith: Finding 1 (Medium — CD's original Summary AC-2 promised an outcome the CD's own later analysis rules out) was already fixed by `dcfc17b` before this round started — confirmed the restated text in the CD's Summary matches VE's recommendation. Finding 2 (Low — three commits outside declared scope: `.vscode/settings.json` dev-setting removal, new `testdata/.gitignore`, one line in test-fixture actor memory about `actor.yaml` name-quoting affecting delivery reliability) independently confirmed via `git diff --stat`: no product code file outside `packages/core/package.json` is touched, matching VE's characterization exactly. Concur this is non-blocking; the fixture note is worth a look by whoever owns message delivery, as VE suggests, but is not this CR's defect.

Full `npx tsc -p packages/core` — clean. Independently re-ran `npx vitest run` — 398/398 passed, 39/39 files, matching VE's disclosed count exactly (unchanged, as expected for a manifest-only + net-zero `.gitignore` change).

The `REQ_CFG_GROUPS` eleven-groups-fixed-order observation (out of scope, reported to PM separately by the CD itself) independently re-confirmed: 8 groups present, 4 not on that requirement's list (Actors, Prompt Templates, Gitignore, Hooks) — consistent with VE's count, not a new divergence introduced by this CR's own restore.

**Overall: CLEAR.** No findings of my own beyond what VE already surfaced and PM/Dev already resolved (VE F1, fixed pre-review) or accepted (VE F2, non-blocking). The Level 0 analysis correctly distinguishes a genuine conformance gap from two tasked fixes the specification actively forbids, and both halves are independently verified against the requirement text and the actual artefact. Ready to close from QM's side.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | No findings to decide | QM CLEAR round 1, no findings raised. Merging. |

---

*Generated by syspilot Change Agent*
