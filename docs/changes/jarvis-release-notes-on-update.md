# Change Document: jarvis-release-notes-on-update

**Status**: in-progress
**Branch**: feature/jarvis-release-notes-on-update
**Created**: 2026-07-31
**Author**: Project Manager
**Operation Mode**: autonomous

---

## Summary

GH #63: after Jarvis updates, the user has no in-editor way to see what
changed — increasingly important now that #58/#59/#60 change on-disk
`.jarvis/` layout and auto-edit `.gitignore`. On activation of **core only**
(single writer — same premise as #60), if the installed extension version
differs from the last version for which release notes were announced, open
`https://github.com/enthali/jarvis/releases/tag/v{version}` in the user's
default browser (URL constructed, not resolved — offline-safe; a visible 404
beats a silent skip). A Command-Palette command ("Jarvis: Show Release Notes")
opens the current version's notes on demand. Opt-out:
`jarvis.releaseNotes.showOnUpdate` (boolean, default `true`, scope
`application`) in the existing Updates group — gates automatic announcement
only, not the manual command.

**CM confirmed (2026-07-31) — Issue 1 / CD scope item 3:** the last-shown
marker is **not** workspace/`jarvis-*`/`WORKSPACE_PATHS` state. What is
versioned is `context.extension.packageJSON.version` (installation property).
A per-workspace marker yields once-per-version-**per-folder**, fails with no
folder open, and can be committed (one developer's update suppresses notes
for everyone who pulls). Syspilot's workspace marker is correct for *workspace
method files*, not for this. Normative storage: **`context.globalState`**
(per-installation, survives extension updates, no path — cannot later be
swept into WORKSPACE_PATHS). First use of `globalState` in this codebase is
intentional.

**CM confirmed — Issue 2 / AC (1):** "at most once per version" is a **bound**,
not a hard guarantee under concurrent multi-window activation (normal after
update). Write-before-open is required; residual duplicate tabs are named;
cross-window lock files are **forbidden**.

**CM confirmed — Issue 3 / AC (3):** first install still only silently records
the current version as seen (no open). Rationale is not "avoid a burst of past
releases" (one tag URL cannot burst) but: a first install is not an update;
do not navigate the user away from the editor they just opened.

**CM confirmed — Issue 4:** opt-out setting is in scope (addition to original
CD).

Acceptance criteria: (1) automatic open is bounded to once per newly-installed
version under normal single-window activation, with concurrent-window residual
disclosed; (2) manual command anytime (independent of opt-out for auto);
(3) first-ever install silently records current version as seen, does not open;
(4) marker in `globalState`, not workspace paths; (5) core-only announcement;
(6) `jarvis.releaseNotes.showOnUpdate` gates auto only. GitHub Issue: #63.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_REL_SELFUPDATE` | Self-Update Check | unchanged, adjacent | covers the notes for a version the user does **not** have yet; this CR covers the one they now do |
| `US_REL_RELEASE` | Extension Release | unchanged, precondition | AC-1/AC-4 are why a tag page exists and has content |
| `US_CFG_RUNTIMELAYOUT` | Runtime Layout | unchanged, constraint | AC-5: several Jarvis extensions activate with no ordering guarantee |
| `US_SPL_LIFECYCLE` | Syspilot Method Lifecycle | unchanged, evidence | owns the workspace-scoped version marker the CD points at — see Finding 1 |

### New User Stories

| ID | Title | Priority |
|----|-------|----------|
| `US_REL_WHATSNEW` | See What Changed After an Update | required |

Placed in the REL theme (`Release & CI/CD`, `docs/namingconventions.rst`) beside
the existing update stories rather than in a new theme: it is the second half of
a mechanism whose first half is already there.

### Findings from Impact Analysis

**Finding 1 — the marker cannot live in workspace state, and the precedent the
CD points at is precedent for the opposite.**

The CD asks the marker to follow "the `jarvis-*` transient-state naming
convention established in #58/#60". Those conventions are workspace-relative by
construction — `WORKSPACE_PATHS` and `getIgnoreEntries()` exist precisely to
describe paths *below a workspace root*, because what they feed is a
`.gitignore` in that root.

What this CR versions is not a workspace artefact. `context.extension.packageJSON.version`
is a property of the installation. Storing its marker per workspace yields "once
per version **per folder**": a user with six project folders is sent to the same
release page six times for one update — spread over days, one at a time, each
looking like a fresh bug. The CD's safety argument ("worst case the user is
shown notes again once") is what makes this look tolerable. It is not once, and
it does not converge.

The nearest precedent is real and was checked: `packages/syspilot/src/types.ts`
persists `lastSeenUpstreamVersion` and `skippedVersion` in
`.jarvis/syspilot-state.json` at the workspace root. That is **correct for
syspilot** — what syspilot versions is the method files installed into that
workspace, so the folder is the right unit. Copying the storage here copies the
mechanism and leaves the reason behind.

Two further consequences of the same mistake: with no folder open there is no
workspace root to write to, and Jarvis activates anyway; and a marker inside
`.jarvis/` is a file the user may commit, so one developer's update would
suppress the notes for everyone who pulls.

→ The marker belongs in `context.globalState`, which is per-installation and
survives extension updates. Grep confirms `globalState` is used nowhere in the
codebase today, so this is the first use and is specified explicitly at L2.

**Finding 2 — "at most once per version" is not a property a marker can
guarantee, and the requirement should not claim it.**

VS Code restores every window at startup, and each window activates the
extension independently. After an update the common path is exactly that: reload
or restart, several windows come back at once, each reads the marker before any
of them has written it. `globalState.update()` is asynchronous and offers no
cross-window transaction.

This is not a reason to build a locking scheme. It is a reason to write the
requirement as the mechanism can actually satisfy it — the marker is written
before the browser is opened, and the residual concurrent-first-activation case
is named rather than papered over (`REQ_REL_NOTESONCE` AC-5).

**Finding 3 — the URL is constructed here and resolved everywhere else.**

`updateCheck.ts` opens `release.html_url` as returned by the GitHub API. The CD
specifies `https://github.com/enthali/jarvis/releases/tag/v{version}`, built by
string template. The two differ where it matters: a constructed URL can name a
page that does not exist. Any build whose version was never tagged — a developer
running from source, or the window between the Release Agent's version bump and
the tag push — sends the user to a GitHub 404.

Kept as constructed anyway, for a stated reason: resolving costs a network call
on every activation, a second consumer of the 60 requests/hour the update check
already shares, and a failure mode when offline. The 404 is visible, harmless
and self-explaining; a swallowed API error is none of those. The case is
covered by the opt-out from Finding 4 for the people it actually affects, who
are the developers of this repository.

**Finding 4 — no opt-out was specified, and this is the most intrusive of the
four automatic activation behaviours Jarvis has.**

`jarvis.checkForUpdates`, `jarvis.hooks.autoInstall` and — as of #60 —
`jarvis.gitignore.autoManage` each gate an automatic activation-time behaviour.
This one leaves the editor entirely and takes over the user's browser, and was
the only one proposed without a switch. The opt-out is also cheap here in a way
it is not for the others: CD item 4's manual command keeps the capability, so
turning it off removes an interruption rather than a feature.

Added as `jarvis.releaseNotes.showOnUpdate` (default `true`), in the existing
`Updates` settings group. Reported to CM/PM as an addition to CD scope.

**Finding 5 — out of scope, reported: the self-update flow silently skips two
shipped extensions.**

`REQ_REL_UPDATEINSTALL`'s mapping table and the `idToVsix` literal in
`updateCheck.ts` both list seven extension IDs. Nine `enthali.*` extensions ship
from `packages/`: the seven listed plus `enthali.jarvis-kanban` and
`enthali.jarvis-suite`. The code selects installed extensions with
`id.startsWith('enthali.jarvis')`, so both **are** detected and then dropped by
the unmatched-filename filter.

The consequence is worse than an omission: because core does match, the
"no matching assets" fallback (`REQ_REL_UPDATEINSTALL` AC-5) never fires, so a
user with core and kanban installed gets core updated, kanban left behind, and
no indication either way. That is the silent partial update AC-5 exists to
prevent. Not touched by this CR.

### Decisions

**Decision 1 — the story is written about the moment, not about the
mechanism.** `US_REL_SELFUPDATE` already owns "there is a newer version";
`US_REL_WHATSNEW` owns "you are now running a version you have not run before".
Keeping the split at the moment rather than at the trigger is what stops the two
being merged later into one story that no longer says which of the two release
pages a user is looking at.

**Decision 2 — AC-3 keeps the CD's first-install rule and replaces its
reason.** The CD justifies it as avoiding "a burst of every past release". The
specified mechanism opens exactly one tag URL, so a burst is not among the
things that could happen. The rule is still right for a different reason, and
that reason is written into AC-3: a first install is not an update, and the user
has just acted deliberately inside the editor.

**Decision 3 — AC-6 states the multiplication risk once, at story level.** Three
independent multipliers exist (folders, windows, installed Jarvis extensions)
and each has a different technical answer at L1/L2. Stating them separately at
L0 would put mechanism into the story; leaving them out would let each be solved
in isolation and the third be forgotten.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — `US_REL_SELFUPDATE` AC-2
      and `US_REL_WHATSNEW` AC-1 open the same kind of page at disjoint moments
      (before vs. after installation) and are not alternatives to one another.
- [x] No redundancies — no existing story covers post-update orientation;
      checked across `us_rel.rst`, `us_spl.rst`, `us_cfg.rst`, `us_dev.rst`.
- [x] Gaps identified and addressed — the CD left the opt-out (Finding 4) and
      the unreachable-notes case (AC-7) unstated; both are now story-level ACs.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from the User Stories above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_REL_UPDATECHECK` | `US_REL_SELFUPDATE` | unchanged, referenced | supplies the resolved-URL precedent `REQ_REL_NOTESTARGET` deliberately departs from |
| `REQ_REL_UPDATENOTIFY` | `US_REL_SELFUPDATE` | unchanged, referenced | AC-2 is the browser-opening mechanism reused |
| `REQ_REL_UPDATECOMMAND` | `US_REL_SELFUPDATE` | unchanged, template | manual command that works regardless of its automatic counterpart's setting |
| `REQ_REL_UPDATEINSTALL` | `US_REL_SELFUPDATE` | **not modified — escalated** | mapping table omits two shipped extensions (L0 Finding 5) |
| `REQ_CFG_IGNOREPATTERNS` | `US_CFG_AUTOGITIGNORE` | unchanged, boundary | `REQ_REL_NOTESMARKER` AC-1 states the marker is *outside* it |
| `REQ_SPL_STATE` | `US_SPL_LIFECYCLE` | unchanged, evidence | the workspace-scoped version marker and why it stays that way |
| `REQ_HOOK_AUTOINST` | `US_HOOK_CONTROL` | unchanged, template | opt-out setting shape |

### New Requirements

Split by the question each one answers, so that no two own the same decision.

| ID | Title | Question it owns | Links |
|----|-------|------------------|-------|
| `REQ_REL_NOTESTARGET` | Release Notes Target | *which page, reached how* | `US_REL_WHATSNEW` |
| `REQ_REL_NOTESMARKER` | Last-Shown Version Marker | *what remembers it* | `US_REL_WHATSNEW`, `REQ_REL_NOTESONCE` |
| `REQ_REL_NOTESONCE` | Automatic Display on First Run of a Version | *when it happens by itself* | `US_REL_WHATSNEW`, `REQ_REL_NOTESMARKER`, `REQ_REL_NOTESTARGET`, `REQ_REL_NOTESSETTING` |
| `REQ_REL_NOTESCOMMAND` | Manual Release Notes Command | *how on demand* | `US_REL_WHATSNEW`, `REQ_REL_NOTESTARGET` |
| `REQ_REL_NOTESSETTING` | Release Notes Auto-Open Setting | *how to turn it off* | `US_REL_WHATSNEW`, `REQ_REL_NOTESONCE` |

### Conflicts Detected

**⚠️ Conflict 1 — CD scope item 3 vs. what the marker measures.** The CD directs
the marker to follow the `#58/#60` transient-path conventions and to integrate
with `WORKSPACE_PATHS` / `getIgnoreEntries()`. Those are workspace-relative by
construction, and the installed extension version is not a workspace property
(L0 Finding 1).

- **Resolution:** `REQ_REL_NOTESMARKER` AC-1 places the marker in
  per-installation state and states explicitly that it is *not* a
  `REQ_CFG_FIXEDPATHS` file and *not* an entry of `REQ_CFG_IGNOREPATTERNS`.
  Written as an exclusion rather than left unmentioned, because the CD's
  instruction is the natural reading and will be re-proposed otherwise.
  **This changes CD scope item 3.**

**⚠️ Conflict 2 — `US_REL_WHATSNEW` AC-2 as first written was contradicted by
the mechanism that satisfies it.** "Running the same version again does not show
them again" is false for a rollback: after 0.25.0, a user who reinstalls 0.24.1
has a marker that differs, and the notes open for a version they have run
before. A marker that recorded *every* version ever run would avoid it, at the
cost of unbounded state for a case that occurs when someone deliberately
downgrades — and for whom the notes of the version now installed are the useful
ones anyway.

- **Resolution:** the mechanism is kept and the story AC is corrected to say
  what is remembered — the last version announced, not every version run.
  `REQ_REL_NOTESONCE` AC-6 states the rollback case in the same terms.

**⚠️ Conflict 3 — nothing prevented the announcement from multiplying by nine.**
Per-installation extension state is scoped *per extension*. Nine `enthali.*`
extensions ship from `packages/`; had the marker been left to "the extension",
each would have kept its own and one update would have opened nine tabs. The
same hazard as GH #60's single-writer question, from the same premise
(`US_CFG_RUNTIMELAYOUT` AC-5: no activation-order guarantee).

- **Resolution:** `REQ_REL_NOTESMARKER` AC-6 and `REQ_REL_NOTESCOMMAND` AC-5
  assign both the marker and the palette entry to exactly one extension.

**⚠️ Conflict 4 — the CD's acceptance criterion (1) claims a guarantee the
mechanism cannot give.** "At most once per newly-installed version" fails for
concurrently activating windows, which is the *normal* path after an update:
VS Code restores every window at once and each activates independently
(L0 Finding 2).

- **Resolution:** `REQ_REL_NOTESONCE` AC-3 fixes the write-before-open ordering,
  and AC-5 names the residual case and forbids the lock file that would
  otherwise be built to close it. **This narrows CD acceptance criterion (1)
  from a guarantee to a bound.**

### Decisions

**Decision 1 — five requirements, one question each.** The feature is small
enough to write as one requirement, and that is how the coupling would have been
lost: the target is shared by the automatic and manual paths, and a single
requirement would have let one of them drift. The split is by question
(*which page / what remembers / when automatically / how on demand / how to turn
off*), which is what makes it checkable that nothing is owned twice.

**Decision 2 — the marker is advanced even when the setting is off**
(`REQ_REL_NOTESSETTING` AC-4). Freezing it looks more conservative and is worse:
a user who disables the setting during 0.25.0 and re-enables it during 0.28.0
would be sent to the 0.25.0 notes. The setting governs whether the user is
interrupted, not whether Jarvis keeps track.

**Decision 3 — the manual command does not write the marker**
(`REQ_REL_NOTESCOMMAND` AC-3). It keeps the marker's meaning single — the
version whose *activation* has been handled — and avoids a coupling in which
reading the notes today silently cancels the announcement of the version
arriving tomorrow.

**Decision 4 — the constructed URL and its 404 are accepted, in writing**
(`REQ_REL_NOTESTARGET` AC-3/AC-4). Suppressing the open for versions that may
not be released requires the network call AC-3 forbids, because Jarvis cannot
tell "never released" from "not released yet". A visible GitHub 404 is a failure
the user can read; a silently skipped open is not. The people it affects are
the developers of this repository, between the version bump and the tag push,
and `jarvis.releaseNotes.showOnUpdate` is their switch.

**Decision 5 — `application` scope for the setting** (`REQ_REL_NOTESSETTING`
AC-2). The marker is per-installation, so a per-folder value would offer a
distinction the mechanism cannot honour. Noted for CM: the existing
`jarvis.checkForUpdates` has no explicit scope and therefore defaults to
`window`, which has the same mismatch. Not changed here — it is an unrelated
element with `:status: implemented`.

**Decision 6 — `REQ_REL_UPDATEINSTALL` is left alone.** Its mapping table is
incomplete (L0 Finding 5) and fixing it would be a one-line change. It is a
different user story, a different failure, and `:status: implemented`; folding
it in would bury a silent partial-update defect inside a release-notes CR.
Escalated instead.

### Horizontal Check (MECE)

- [x] All new Requirements link to a User Story — all five to
      `US_REL_WHATSNEW`, each discharging named ACs.
- [x] No overlaps — the target is defined once and referenced twice; the marker
      is written by exactly one requirement's rules; the setting is read by one.
- [x] No gaps against `US_REL_WHATSNEW` — AC-1 → `NOTESONCE` AC-1; AC-2 →
      `NOTESONCE` AC-4/AC-6 and `NOTESMARKER` AC-1/AC-3; AC-3 → `NOTESONCE`
      AC-2; AC-4 → `NOTESCOMMAND`; AC-5 → `NOTESSETTING` AC-3/AC-5; AC-6 →
      `NOTESMARKER` AC-1/AC-6 and `NOTESONCE` AC-5; AC-7 → `NOTESTARGET`
      AC-4/AC-5.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from the Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_REL_UPDATECOMMAND` | `REQ_REL_UPDATECOMMAND` | unchanged, template | activation-hook + command-registration shape reused verbatim |
| `SPEC_REL_UPDATENOTIFY` | `REQ_REL_UPDATENOTIFY` | unchanged, referenced | the `openExternal` precedent |
| `SPEC_REL_UPDATECHECK` | `REQ_REL_UPDATECHECK` | unchanged, contrast | resolves its URL through the API; the new element records why it does not |
| `SPEC_SPL_STATE` | `REQ_SPL_STATE` | unchanged, evidence | the workspace-scoped version marker, correct in its own context |
| `SPEC_CFG_IGNOREMANAGER` | `REQ_CFG_IGNOREBLOCK` | unchanged, precedent | single-writer constraint and its premise |
| `SPEC_CFG_MANIFEST` | `REQ_CFG_GROUPS` | **not modified — escalated** | stale snapshot, already escalated by GH #60 |
| `SPEC_DEV_LOGCHANNEL` | — | unchanged, linked | logging channel used by the new module |

No existing design element is modified by this CR.

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| `SPEC_REL_RELEASENOTES` | Release Notes on Update | `REQ_REL_NOTESTARGET`, `REQ_REL_NOTESMARKER`, `REQ_REL_NOTESONCE`, `REQ_REL_NOTESCOMMAND`, `REQ_REL_NOTESSETTING`, `SPEC_DEV_LOGCHANNEL` |

### Conflicts Detected

**⚠️ Conflict 5 — the requirement level demands per-installation state and the
design level had no such mechanism to point at.** `globalState` is used nowhere
in the codebase; every piece of persisted Jarvis state today is a file under a
workspace root. The path of least resistance at design time was therefore a file
— which would have re-introduced exactly what `REQ_REL_NOTESMARKER` AC-1 rules
out, one level further down where it is harder to see.

- **Resolution:** `SPEC_REL_RELEASENOTES` names `context.globalState` explicitly
  and records why not `globalStorageUri`, which is the file-shaped alternative
  that satisfies the letter of AC-1 and invites the same mistake back. The
  deciding property is stated: `globalState` has no path, so it cannot later be
  swept into `WORKSPACE_PATHS` or a `.gitignore` region by someone tidying up
  runtime files.

**⚠️ Conflict 6 — `REQ_REL_NOTESSETTING` AC-4 forces an ordering that reads like
a bug.** The setting must be checked *after* the marker is written, so the guard
cannot sit at the top of the function where every reader will expect it.

- **Resolution:** kept, with the reason written next to the code rather than in
  a commit message. An unexplained late guard is a refactor waiting to happen,
  and the refactor is silent: it breaks only for users who disable the setting
  and re-enable it several versions later.

### Decisions

**Decision 7 — one new element, no existing element amended.** The feature has a
manifest contribution, a state key, a module and an activation hook — the parts
`SPEC_CFG_MANIFEST` and `SPEC_REL_UPDATECOMMAND` would each have absorbed one of.
Both are `:status: implemented` snapshots, and `SPEC_CFG_MANIFEST` is known
stale (escalated by GH #60). Following `SPEC_HOOK_AUTOINST`, the element carries
its own contributions and says so.

**Decision 8 — the setting joins the existing `Updates` group.** No new group is
created, so `REQ_CFG_GROUPS` is neither extended nor contradicted by this CR.
That is a consequence worth recording rather than luck: it is why this CR does
not have to wait for the group re-baseline that #60 escalated.

**Decision 9 — the marker key is frozen and is not derived from the setting
id.** They resemble each other (`jarvis.releaseNotes.*`), so a future rename of
the setting invites a matching rename of the key. That would orphan every
installed user's marker at once, and the symptom — one spurious browser tab for
everybody, exactly once — is indistinguishable from the feature working.

**Decision 10 — `setKeysForSync` is specified as *not* called, with its
reason.** Specifying an omission is unusual; here the omission is a one-line
change that reads as an improvement, and its failure mode is silent: a second
machine that received the update never shows the notes. The alternative failure
— one tab per machine — is correct behaviour, not a defect.

**Decision 11 — the first-install branch is kept separate from the
version-changed branch.** `if (seen !== installed) { open(); }` covers both and
is shorter. The two cases are identical in the data and opposite in intent, and
collapsing them opens a browser tab at the end of every fresh installation.

**Decision 12 — activation does not await the notes path.** `void` rather than
`await`, so a browser that never returns cannot hold up the rest of activation
(`REQ_REL_NOTESONCE` AC-8, `SPEC_REL_RELEASENOTES` AC-11).

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — the new element reuses
      `SPEC_REL_UPDATECOMMAND`'s registration shape and `SPEC_REL_UPDATENOTIFY`'s
      opening mechanism, and states where it departs from `SPEC_REL_UPDATECHECK`
      and why.
- [x] All new SPECs link to Requirements — `SPEC_REL_RELEASENOTES` links all
      five new requirements; each has at least one AC discharging it.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_REL_WHATSNEW` (new) | `REQ_REL_NOTESTARGET`, `REQ_REL_NOTESMARKER`, `REQ_REL_NOTESONCE`, `REQ_REL_NOTESCOMMAND`, `REQ_REL_NOTESSETTING` | `SPEC_REL_RELEASENOTES` | ✅ |
| `US_REL_SELFUPDATE` (parent) | `REQ_REL_UPDATECHECK`, `REQ_REL_UPDATENOTIFY`, `REQ_REL_UPDATECOMMAND`, `REQ_REL_UPDATEINSTALL` | `SPEC_REL_UPDATECHECK`, `SPEC_REL_UPDATENOTIFY`, `SPEC_REL_UPDATECOMMAND` | ✅ unchanged |
| `US_REL_RELEASE` (parent) | `REQ_REL_RELEASEACTION` | `SPEC_REL_RELEASEACTION` | ✅ unchanged |
| `US_SPL_LIFECYCLE` | `REQ_SPL_STATE` | `SPEC_SPL_STATE` | ✅ unchanged, evidence only |

Every new element is reachable from `US_REL_WHATSNEW`, and every new
requirement is discharged by at least one AC of `SPEC_REL_RELEASENOTES`.

**Story acceptance criteria to both levels:**

| `US_REL_WHATSNEW` | Requirement | Design |
|---|---|---|
| AC-1 shown on first run of a version | `REQ_REL_NOTESONCE` AC-1 | AC-4 |
| AC-2 not shown again for the same version | `REQ_REL_NOTESONCE` AC-4/AC-6, `REQ_REL_NOTESMARKER` AC-1/AC-3 | AC-3 |
| AC-3 first install is silent | `REQ_REL_NOTESONCE` AC-2 | AC-2 |
| AC-4 available on demand | `REQ_REL_NOTESCOMMAND` AC-1/AC-2 | AC-1/AC-8 |
| AC-5 can be switched off, command survives | `REQ_REL_NOTESSETTING` AC-3/AC-5, `REQ_REL_NOTESCOMMAND` AC-4 | AC-5/AC-8 |
| AC-6 does not multiply | `REQ_REL_NOTESMARKER` AC-1/AC-6, `REQ_REL_NOTESCOMMAND` AC-5, `REQ_REL_NOTESONCE` AC-5 | AC-10 |
| AC-7 no silence when unreachable | `REQ_REL_NOTESTARGET` AC-4/AC-5 | AC-7 |

`REQ_REL_NOTESMARKER` AC-4 and `SPEC_REL_RELEASENOTES` AC-9 discharge no story
AC. They exist to forbid a one-line change that would silently break
`US_REL_WHATSNEW` AC-1 on a second machine — recorded here so the absence of a
story link is a deliberate choice and not a broken trace.

### Artefakt-Removal-Check

**Not applicable — this CR removes no artefact.** No file, field, configuration
key or element ID ceases to exist; no element is deprecated. The CR is purely
additive at every level: one story, five requirements, one design element, and
no modification to any existing element.

The one edit to existing text is `US_REL_WHATSNEW` AC-2 itself, corrected within
this CR after L1 Conflict 2 showed the mechanism contradicted it.

### Issues Found

- [x] **Issue 1 — the marker cannot be workspace state (L0 Finding 1, L1
      Conflict 1).** The CD directs it to follow the #58/#60 transient-path
      conventions; those are workspace-relative, and the installed version is a
      property of the installation. A per-workspace marker announces one update
      once per folder. **CM confirmed 2026-07-31** — Summary updated:
      `context.globalState`, not WORKSPACE_PATHS / jarvis-*.
- [x] **Issue 2 — "at most once per version" was not achievable (L0 Finding 2,
      L1 Conflict 4).** Restored windows activate concurrently. Write-before-open
      ordering is required, the residual case is named, and the lock file that
      would close it is forbidden. **CM confirmed** — AC (1) is a bound, not a
      hard multi-window guarantee.
- [x] **Issue 3 — the CD's rationale for its own criterion (3) does not hold
      (L0 Decision 2).** No "burst of past releases" is possible from a mechanism
      that opens one tag URL. The criterion is kept; the reason is replaced.
      **CM confirmed.**
- [x] **Issue 4 — no opt-out was specified (L0 Finding 4).** Added as
      `jarvis.releaseNotes.showOnUpdate`. **CM confirmed** — in scope.
- [x] **Issue 5 — the announcement could have multiplied by nine (L1
      Conflict 3).** Global state is per-extension; assigned to `core` alone.
- [ ] **Issue 6 — the self-update flow silently skips two shipped extensions
      (L0 Finding 5).** `REQ_REL_UPDATEINSTALL` and `idToVsix` list seven of the
      nine `enthali.*` extensions; `jarvis-kanban` and `jarvis-suite` are
      detected and then dropped. Because core matches, AC-5's fallback never
      fires. Open — separate CR.
- [ ] **Issue 7 — `REQ_CFG_GROUPS` and `SPEC_CFG_MANIFEST` remain stale.**
      Carried over from GH #60. Sidestepped here only because the new setting
      joins an existing group. Open — same CR as Issue 6 would suit.
- [ ] **Issue 8 — `jarvis.checkForUpdates` has no declared scope and therefore
      defaults to `window`**, although what it governs is per-installation, the
      same mismatch `REQ_REL_NOTESSETTING` AC-2 avoids for the new setting. Not
      changed: unrelated element, `:status: implemented`. Open.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (6 conflicts; Conflicts 1/4 and Issues 1–4
      confirmed by CM 2026-07-31 — Summary matches specs)
- [x] Traceability verified, including every story AC to both levels, with the
      two deliberately unlinked ACs disclosed
- [x] Sphinx `-W --keep-going` clean at every commit
- [x] All new elements set to `:status: approved`: `US_REL_WHATSNEW`,
      `REQ_REL_NOTESTARGET`, `REQ_REL_NOTESMARKER`, `REQ_REL_NOTESONCE`,
      `REQ_REL_NOTESCOMMAND`, `REQ_REL_NOTESSETTING`, `SPEC_REL_RELEASENOTES`
- [x] Ready for implementation

#### Implementation scope handed to the Developer

Specification only — no source was modified by the System Designer.

1. `packages/core/src/engine/core/releaseNotes.ts` — new module per
   `SPEC_REL_RELEASENOTES` (`MARKER_KEY`, `notesUri`, `open`,
   `announceIfNewVersion`, `showReleaseNotes`).
2. `packages/core/src/extension.ts` — `void announceIfNewVersion(context, log)`
   during activation, and register `jarvis.showReleaseNotes` into
   `context.subscriptions`.
3. `packages/core/package.json` — the command entry, and
   `jarvis.releaseNotes.showOnUpdate` (boolean, default `true`, scope
   `application`) inside the existing `Updates` group.
4. Tests — `SPEC_REL_RELEASENOTES` AC-2 to AC-8 are all expressible against a
   faked `globalState` and a stubbed `openExternal`; AC-9 and AC-10 are
   grep-shaped checks over the workspace.

**Not in scope, reported:** the working tree carries untracked residue from
earlier CRs — `.github/hooks/`, `.jarvis/messages.json`,
`.jarvis/message-log.json`, `.jarvis/autodelivery.json`. As noted in GH #60,
the last three are the superseded paths `SPEC_CFG_STATEMIGRATION` removes after
a union write.


---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-31

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. | — |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 7 commits, exact match to CM's message, correct order, zero undisclosed commits.

Read the CD in full: another strong self-correction from this System Designer, in the same vein as #60. The CD directed the marker to follow the `#58/#60` `WORKSPACE_PATHS`/`jarvis-*` transient-path convention; SD correctly identified that the installed extension version is a property of the *installation*, not the workspace, and that a workspace-scoped marker would announce one update once per open folder — silently, and without converging. The nearest precedent (`syspilot-state.json`'s workspace-scoped version marker) was checked and correctly distinguished: right for syspilot (versions the workspace's method files), wrong for this (versions the installation). `context.globalState` was chosen instead, and is confirmed to be the first use of `globalState` anywhere in this codebase (grepped). A second, independent correction: the CD's acceptance criterion "at most once per version" was narrowed to a bound rather than a guarantee, because restored windows activate concurrently and no lock file is an acceptable remedy — the CD explicitly forbids building one. Also disclosed and correctly reasoned: the constructed (not resolved) tag URL accepting a possible 404 rather than spending a network call per activation; the opt-out setting added as new CD scope, reported to CM/PM rather than silently introduced.

All code independently verified against spec: `releaseNotes.ts` (`MARKER_KEY`, `notesUri`, `open`, `announceIfNewVersion`, `showReleaseNotes`) matches `SPEC_REL_RELEASENOTES`'s embedded code verbatim — write-before-open ordering, first-install branch kept separate from the version-changed branch, setting read only after the marker write (matching Decision 6's stated reason for the "backwards-looking" ordering), `void announceIfNewVersion(...)` (not awaited) at activation. `extension.ts` wires activation + registers `jarvis.showReleaseNotes` into `context.subscriptions`. `package.json` contributes the command and `jarvis.releaseNotes.showOnUpdate` (boolean, default `true`, scope `application`) correctly placed inside the existing `Updates` group beside `jarvis.checkForUpdates`.

`release-notes.test.ts` read in full: genuine behavioral tests — imports and calls the real exported `announceIfNewVersion`/`showReleaseNotes` against a faked `globalState` Map and mocked `vscode.env.openExternal`/`window.showInformationMessage`/`workspace.getConfiguration`, no simulated/duplicated logic anywhere (the gap flagged and fixed across #58/#59/#60 R1 does not recur here). All 8 tests map 1:1 onto AC-2 through AC-8. AC-9 (`setKeysForSync` never called with `MARKER_KEY`) and AC-10 (only `core` registers the command/reads-writes the marker) independently grepped and confirmed true across the whole codebase — no occurrence outside `packages/core`.

Full `compile all` — clean. Independently re-ran `npx vitest run` — 385/385 passed, 38/38 files, matching CM's disclosed count exactly.

UAT: no scenario family exists for this area (consistent with #58/#60's precedent), not raised as a new gap. Issues 6/7/8 (self-update omits kanban/suite; `REQ_CFG_GROUPS`/`SPEC_CFG_MANIFEST` stale; `jarvis.checkForUpdates` scope mismatch) are disclosed, correctly scoped out, and consistent with prior CRs' escalations — not re-raised.

**Overall: CLEAR.** No findings. This is the first of the recent CR sequence (#58/#59/#60) where the real production function was tested directly from Round 1, without needing a fix-now round for test methodology. Ready to close from QM's side.

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| — | — | — | — |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
