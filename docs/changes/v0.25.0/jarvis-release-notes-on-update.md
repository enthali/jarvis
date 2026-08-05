# Change Document: jarvis-release-notes-on-update

**Status**: merged
**Branch**: feature/jarvis-release-notes-on-update
**Created**: 2026-07-31
**Author**: Project Manager
**Operation Mode**: user-guided

---

## Reopened (2026-07-31)

Merged (development `e4ace83`), but PM validation before release found the
release notes open in the user's external default browser. That is not the
intent — they should open inside VS Code (internal browser view), so the
user stays in the editor. PM did not specify "external browser" as intent;
it was an implementation detail that made it into the Summary below without
PM/user agreement. Requesting System Designer pick the mechanism this time,
not PM.

## Reopen Delta (2026-07-31)

Two separate corrections were made after reopening. They are recorded here
rather than by rewriting the original findings, which remain an accurate
record of what was decided the first time.

### Delta 1 — the notes open inside the editor

**Mechanism chosen:** `vscode.commands.executeCommand('simpleBrowser.api.open',
uri)`, guarded by a probe for `workbench.action.browser.open` in
`getCommands(true)`.

**Why this one.** It is the only supported extension-facing entry point to the
editor's own browser. `simpleBrowser.api.open` is not a single behaviour: it
tests for `workbench.action.browser.open` and delegates to the integrated
browser when present, and otherwise renders the page in an iframe-based webview
of its own. GitHub serves the release page with `X-Frame-Options: deny` and
`frame-ancestors 'none'` (verified against
`https://github.com/enthali/jarvis/releases/tag/v0.24.1`), so the iframe
fallback yields an empty pane — and the command still resolves successfully,
leaving nothing to detect afterwards. The probe is therefore not defensive
padding: it is the only point at which that failure is still observable, and it
converts a blank pane into the message of `REQ_REL_NOTESTARGET` AC-6.

**A correction to my own analysis, recorded because it nearly became
normative.** From those same two headers I first concluded that the release page
"cannot be displayed inside VS Code at all", and was on the way to specifying
the external browser as unavoidable. That conflates framing with top-level
navigation: the headers forbid the page being placed *in a frame*, not the
integrated browser navigating to it. The user challenged the conclusion; it was
checked by opening the page in the integrated browser, which loads it. The
verified residue of the finding is what survives above, and it applies to the
iframe fallback only.

`vscode.env.openExternal` is no longer the delivery path. It remains reachable
on exactly one branch — the user choosing **"Open in Browser"** on the fallback
message — because the alternative to offering it is showing the user a URL and
no way to follow it.

### Delta 2 — the marker is per-workspace, not per-installation

**This overturns the CM-confirmed decision in Issue 1**, at the user's
direction. It is a reversal of a premise, not a refinement of a detail, and is
flagged as such rather than folded quietly into the Summary.

The original reasoning ran from "the version is a property of the installation"
to "the marker belongs to the installation". The user's premise is different
and it is the product premise, not the storage one: what the notes ask of the
reader is *work in a project* — a diff to check, a moved file to accept, a
breaking change to resolve. A user who read the notes in one project has not
thereby fixed the other four, and by the time they open the fourth, possibly
weeks later, they will not remember what the release changed. Under that
premise the six-tabs-for-six-folders behaviour that Finding 1 treats as the
defect is the intended behaviour, and `US_REL_WHATSNEW` AC-6 — which said the
opposite in as many words — was inverted rather than reinterpreted.

The two consequences Finding 1 raised against per-workspace storage are
answered, not waived:

- **No folder open.** `REQ_CFG_FIXEDPATHS` AC-3 already prescribes the
  behaviour for every runtime path — warn once, short-circuit, throw nothing.
  Nothing new is needed, and `US_REL_WHATSNEW` AC-9 states the user-facing
  consequence: a window with no folder shows nothing and remembers nothing.
- **A committed marker suppresses the notes for a whole team.** The marker is
  transient state under `.jarvis/state/`, which `REQ_CFG_IGNOREPATTERNS` AC-1
  keeps out of version control by construction. `REQ_REL_NOTESMARKER` AC-7
  states what happens if it is committed anyway and refuses the usual
  workaround (user- or machine-specific filenames), naming the residual risk
  instead.

**Storage location.** `<workspaceRoot>/.jarvis/state/release-notes.json`,
resolved by a new `getReleaseNotesStatePath()` in `configPaths.ts` alongside a
`getStateDir()`/`ensureStateDir()` pair (`SPEC_CFG_PATHRESOLVER` amendment).
`.jarvis/state/` already exists, already holds transient state
(`state/touched-files/`), and is already declared `transient` in
`WORKSPACE_PATHS` — so the marker reaches the maintained `.gitignore` region
with no new entry and no second list to keep in step. A file directly under
`.jarvis/` would have needed one.

**A new problem the reversal creates, and its resolution.** With a
per-workspace marker, every existing workspace lacks one on the very release
that introduces the feature — so reading "absent marker" as "first run" would
make that release the one release that announces itself nowhere, and it is the
release carrying the `.jarvis/` layout and `.gitignore` changes the notes exist
to warn about. The two cases are separable without new state: a workspace Jarvis
has written to before has a `.jarvis/` directory; one that is new to Jarvis does
not. Written into `REQ_REL_NOTESONCE` AC-2 with its reason.

### Elements touched by the reopen

| ID | Level | Change | Status |
|----|-------|--------|--------|
| `US_REL_WHATSNEW` | L0 | Context extended (per-project premise); AC-2 and AC-6 rewritten; AC-8 (in-editor) and AC-9 (no folder) added | `draft` → re-approved |
| `REQ_REL_NOTESTARGET` | L1 | Delivery via the editor's browser; probe rationale; fallback AC | `draft` → re-approved |
| `REQ_REL_NOTESMARKER` | L1 | Storage reversed to `.jarvis/`; "why this is not workspace state" replaced; Settings-Sync AC removed; AC-7 residual risk added | `draft` → re-approved |
| `REQ_REL_NOTESONCE` | L1 | AC-2 split by `.jarvis/` presence; wording de-browserised | `draft` → re-approved |
| `REQ_REL_NOTESSETTING` | L1 | Rationale replaced only — no AC changed | stays `approved` |
| `SPEC_REL_RELEASENOTES` | L2 | Probe + `simpleBrowser.api.open`; marker moved to a state file; ACs renumbered 1–15 | `draft` → re-approved |
| `SPEC_CFG_PATHRESOLVER` | L2 | GH #63 amendment: `getStateDir()`, `ensureStateDir()`, `getReleaseNotesStatePath()` | stays `implemented` |
| `REQ_CFG_FIXEDPATHS` | L1 | One entry added to the enumeration | stays `implemented` |

Two status decisions are deliberate and recorded so they are not read as
oversights:

- **`REQ_REL_NOTESSETTING` stays `approved`.** Only its rationale changed — the
  old one argued the setting exists because the notes leave the editor, which is
  no longer true. The replacement argues from what is still true: it is the only
  one of the four requirements that puts something in front of the user unasked.
  No acceptance criterion moved, so there is nothing for re-approval to check.
- **`REQ_CFG_FIXEDPATHS` and `SPEC_CFG_PATHRESOLVER` stay `implemented`** while
  gaining an entry that is not yet implemented. The pending part is tracked by
  `SPEC_REL_RELEASENOTES`, which is the element under change; demoting two
  implemented elements would misreport the rest of what they govern. The
  precedent is the GH #59 amendment already carried in `SPEC_CFG_PATHRESOLVER`.

## Summary

GH #63: after Jarvis updates, the user needs an in-editor way to see what
changed — increasingly important now that #58/#59/#60 change on-disk
`.jarvis/` layout and auto-edit `.gitignore`. On activation of **core only**
(single writer — same premise as #60), if the installed extension version
differs from the last version announced **in this workspace**, open
`https://github.com/enthali/jarvis/releases/tag/v{version}` (URL constructed,
not resolved) **inside VS Code's browser**, not the system default browser.

**Delivery (Reopen Delta 1 — settled with user 2026-07-31):** probe
`getCommands(true)` for `workbench.action.browser.open`; if present, open via
`vscode.commands.executeCommand('simpleBrowser.api.open', uri)`. If absent,
show a message with a user-chosen **"Open in Browser"** action that may call
`vscode.env.openExternal`. Automatic path never uses `openExternal`.
`openExternal` is confined to that user-chosen fallback only
(`SPEC_REL_RELEASENOTES` AC-15).

**Marker (Reopen Delta 2 — settled with user 2026-07-31; overturns CM's first-pass
Issue 1 confirmation of `globalState`):** per-workspace file
`<workspaceRoot>/.jarvis/state/release-notes.json` via
`getReleaseNotesStatePath()`. Product premise: notes ask for work **in a
project**; once-per-folder is intended. No folder open: warn-once /
short-circuit (`REQ_CFG_FIXEDPATHS` AC-3). Commit residual named; `.jarvis/state/`
already transient under ignore machinery.

**Introducing-release heuristic (Issue 10 — decided, not open):** absent marker
+ existing `.jarvis/` → announce (Jarvis has run here before); absent marker +
no `.jarvis/` → first-time workspace, record seen only, do not open
(`REQ_REL_NOTESONCE` AC-2). Residual: deleted `.jarvis/` looks "new" once.

Command-Palette **"Jarvis: Show Release Notes"** opens current notes on demand.
Opt-out: `jarvis.releaseNotes.showOnUpdate` (boolean, default `true`, scope
`application`) gates automatic announcement only.

**Still holds from first pass (CM 2026-07-31):** AC (1) once-per-version is a
**bound** under concurrent multi-window activation (write-before-open; no lock
file); first-ever-for-workspace silent record without open; opt-out in scope;
core-only.

**Historical first-pass CM confirmations (Issue 1 = globalState; Summary said
"default browser") are superseded by Reopen Deltas 1–2 above.** Detail of the
first-pass reasoning remains in the Reopen section and Issues history; this
Summary is the current CM-owned intent.

Acceptance criteria: (1) automatic open bounded once per newly-installed
version **per workspace** under normal single-window activation, concurrent
residual disclosed; (2) manual command anytime; (3) workspace new to Jarvis
(no `.jarvis/`) silently records current version, does not open; (4) marker at
`.jarvis/state/release-notes.json`, not `globalState`; (5) core-only; (6)
opt-out gates auto only; (7) in-editor delivery with probe; `openExternal` only
on user-chosen fallback; (8) introducing release uses `.jarvis/`-presence
heuristic. GitHub Issue: #63.

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
| `US_CFG_RUNTIMELAYOUT` (reopen) | `REQ_CFG_FIXEDPATHS`, `REQ_CFG_PATHSINGLESOURCE`, `REQ_CFG_IGNOREPATTERNS` | `SPEC_CFG_PATHRESOLVER` | ✅ amended, not restructured |

Every new element is reachable from `US_REL_WHATSNEW`, and every new
requirement is discharged by at least one AC of `SPEC_REL_RELEASENOTES`. The
reopen adds no element at any level; it changes the content of elements that
already existed, and amends three approved `CFG` elements the marker now
depends on.

**Story acceptance criteria to both levels** (design AC numbers are the
renumbered 1–15 list):

| `US_REL_WHATSNEW` | Requirement | Design |
|---|---|---|
| AC-1 shown on first run of a version | `REQ_REL_NOTESONCE` AC-1 | AC-6 |
| AC-2 not shown again for the same version in that workspace | `REQ_REL_NOTESONCE` AC-4/AC-6, `REQ_REL_NOTESMARKER` AC-1/AC-4 | AC-5 |
| AC-3 a workspace new to Jarvis is silent | `REQ_REL_NOTESONCE` AC-2 | AC-3/AC-4 |
| AC-4 available on demand | `REQ_REL_NOTESCOMMAND` AC-1/AC-2 | AC-1/AC-11 |
| AC-5 can be switched off, command survives | `REQ_REL_NOTESSETTING` AC-3/AC-5, `REQ_REL_NOTESCOMMAND` AC-4 | AC-7/AC-11 |
| AC-6 one announcement per workspace | `REQ_REL_NOTESMARKER` AC-6, `REQ_REL_NOTESCOMMAND` AC-5, `REQ_REL_NOTESONCE` AC-5 | AC-13 |
| AC-7 no silence when unreachable | `REQ_REL_NOTESTARGET` AC-5/AC-6 | AC-10 |
| AC-8 the notes appear inside the editor | `REQ_REL_NOTESTARGET` AC-2/AC-3 | AC-6/AC-15 |
| AC-9 no folder open, nothing shown or remembered | `REQ_REL_NOTESMARKER` AC-3 | AC-2 |

`REQ_REL_NOTESMARKER` AC-4 and `SPEC_REL_RELEASENOTES` AC-12 discharge no story
AC. AC-4 states the property the whole mechanism rests on — a marker that did
not survive the update would measure nothing — and AC-12 discharges
`REQ_CFG_PATHSINGLESOURCE` AC-1 rather than anything the user can observe. Both
are recorded here so the absence of a story link reads as a deliberate choice
and not as a broken trace.

### Artefakt-Removal-Check

**Originally not applicable; the reopen makes it applicable.** No file,
configuration key or element ID ceases to exist, and no element is deprecated.
What the reopen removes is normative text inside elements that remain:

| Removed | From | Why nothing is orphaned |
|---|---|---|
| The Settings-Sync acceptance criterion | `REQ_REL_NOTESMARKER` | It constrained `globalState`, which is no longer the storage. Nothing links to it, and a file under `.jarvis/` is not synced |
| `MARKER_KEY` and every `globalState` access | `SPEC_REL_RELEASENOTES` | Replaced by the state file; `SPEC_REL_RELEASENOTES` AC-12 now forbids the access outright, so the removal is checkable rather than merely intended |
| The `setKeysForSync` acceptance criterion (old AC-9) | `SPEC_REL_RELEASENOTES` | Discharged a requirement that no longer exists |
| `vscode.env.openExternal` as the delivery path | `REQ_REL_NOTESTARGET`, `SPEC_REL_RELEASENOTES` | Retained on one user-chosen branch and confined there by AC-15, so the removal is of the *default*, not of the capability |

The implementation merged at `e4ace83` uses `globalState` and `openExternal`
today. Removing them is therefore a Developer task with a test consequence, not
a paper change — see the implementation scope below.

### Issues Found

- [x] **Issue 1 — the marker cannot be workspace state (L0 Finding 1, L1
      Conflict 1).** The CD directs it to follow the #58/#60 transient-path
      conventions; those are workspace-relative, and the installed version is a
      property of the installation. A per-workspace marker announces one update
      once per folder. **CM confirmed 2026-07-31** — Summary updated:
      `context.globalState`, not WORKSPACE_PATHS / jarvis-*.
      **⚠️ Reversed on reopen at the user's direction** — see Reopen Delta 2.
      Once-per-folder is the intent, not the defect; the two consequences named
      here are answered rather than waived. This entry is kept as written
      because it records what was confirmed at the time.
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
- [ ] **Issue 9 — the notes cannot be promised a specific editor group.** The
      user asked for group one. `simpleBrowser.api.open` accepts a
      `showOptions` argument but **drops it** when it delegates to
      `workbench.action.browser.open` (verified in `microsoft/vscode`,
      `extensions/simple-browser/src/extension.ts`) — that is, on exactly the
      path this CR takes. Passing `{ viewColumn: ViewColumn.One }` would
      therefore be honoured only on the iframe fallback the probe exists to
      avoid, so it is **not** specified: a normative promise no supported call
      can keep is worse than a stated gap. Whether
      `workbench.action.browser.open` takes options of its own was not
      established. Open — for the Developer to investigate; if it does, it is a
      one-AC amendment.
- [x] **Issue 10 — an absent marker had two meanings and needed a tie-breaker.**
      With a per-workspace marker, every existing workspace lacks one on the
      release that introduces the feature — so reading "absent" as "first run"
      would silence the very release carrying the `.jarvis/` layout and
      `.gitignore` changes the notes exist to warn about. **Decided with the
      user in the reopen session:** the `.jarvis/` directory is the
      tie-breaker — present means an earlier Jarvis ran here, absent means the
      workspace is new to Jarvis. Written into `REQ_REL_NOTESONCE` AC-2 with
      its reason. The residual is stated rather than approved away: a user who
      deleted `.jarvis/` is read as new and is not shown the notes — silent and
      one-off, preferred to announcing in every workspace ever opened.
- [ ] **Issue 11 — `SPEC_CFG_PATHRESOLVER` has drifted from its
      implementation.** The spec places the module at `src/configPaths.ts`; it
      is at `packages/core/src/engine/core/configPaths.ts`. The spec's
      `getJarvisDir()` inlines `workspaceFolders[0]`; the code factors it into
      `getWorkspaceRoot()`, which is the better shape. Found while amending the
      element, not introduced here. Reported to PM. Open — separate CR.
- [ ] **Issue 12 — the workspace root is resolved outside the resolver in eight
      places.** `treeFactory.ts`, `extension.ts` and `heartbeat.ts` build
      `workspaceFolders?.[0]… ?? ''` inline, which turns "no workspace" into a
      path under the process working directory instead of a short-circuit.
      `REQ_CFG_PATHSINGLESOURCE` AC-1 already calls that a defect, so the fix
      needs no new element at any level. Reported to PM as a conformance gap.
      Open — separate CR.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (first-pass Conflicts 1/4 and Issues 1–4; reopen
      Deltas 1–2 settled with user; CM Summary updated 2026-07-31 to match)
- [x] Traceability verified, including every story AC to both levels, with the
      two deliberately unlinked ACs disclosed
- [x] Sphinx `-W --keep-going` clean at every commit
- [x] All new elements set to `:status: approved`: `US_REL_WHATSNEW`,
      `REQ_REL_NOTESTARGET`, `REQ_REL_NOTESMARKER`, `REQ_REL_NOTESONCE`,
      `REQ_REL_NOTESCOMMAND`, `REQ_REL_NOTESSETTING`, `SPEC_REL_RELEASENOTES`
- [x] Ready for implementation

#### Sign-off — reopen (2026-07-31)

- [x] Both deltas carried through all three levels; no level was skipped
- [x] No normative text now requires or implies the system default browser as
      the delivery path; `vscode.env.openExternal` survives only on the
      user-chosen branch, confined by `SPEC_REL_RELEASENOTES` AC-15
- [x] Traceability table and story-AC discharge table re-derived for the two
      new story ACs and the renumbered design ACs
- [x] Artefakt-Removal-Check redone — four removals of normative text, each
      with its orphan check
- [x] Sphinx `-W --keep-going` clean on a rebuilt `_build`
- [x] Re-approved: `US_REL_WHATSNEW`, `REQ_REL_NOTESTARGET`,
      `REQ_REL_NOTESMARKER`, `REQ_REL_NOTESONCE`, `SPEC_REL_RELEASENOTES`.
      `REQ_REL_NOTESSETTING` and `REQ_REL_NOTESCOMMAND` never left `approved`
- [x] **The specification is complete. Nothing in it awaits a decision.** Both
      deltas were settled with the user in the reopen session, which is what
      that session was for; Issue 10 is a decision, not a question. Issue 9 is
      a factual unknown about a VS Code command, handed to the Developer to
      establish during implementation — it changes no requirement and gates
      nothing.
- [x] Dispatch to the Developer — CM 2026-07-31: Summary updated for Deltas
      1–2; Dev dispatched. Spec was already complete; this was CM housekeeping
      + dispatch, not a further product decision.

#### Implementation scope handed to the Developer

Specification only — no source was modified by the System Designer. The module
already exists (merged at `e4ace83`); the reopen changes two of its mechanisms,
so this is a rework, not a first implementation.

1. `packages/core/src/engine/core/configPaths.ts` — add `getStateDir()`,
   `ensureStateDir()` and `getReleaseNotesStatePath()` per the GH #63 amendment
   to `SPEC_CFG_PATHRESOLVER`. `WORKSPACE_PATHS` needs **no** new entry:
   `.jarvis/state/` is already declared `transient`.
2. `packages/core/src/engine/core/releaseNotes.ts` — replace `MARKER_KEY` and
   both `globalState` calls with `readState()`/`writeState()` over
   `getReleaseNotesStatePath()`; add the no-workspace short-circuit and the
   `.jarvis/`-presence branch; replace `vscode.env.openExternal` as the delivery
   path with the probe plus `simpleBrowser.api.open`, keeping `openExternal`
   only on the **"Open in Browser"** branch.
3. `packages/core/src/extension.ts` — unchanged in shape:
   `void announceIfNewVersion(context, log)` and the registered command stay as
   they are.
4. `packages/core/package.json` — the setting's `description` text changes
   ("Open the release notes in the editor…"); the key, type, default and scope
   do not.
5. Tests — `src/tests/release-notes.test.ts` currently stubs `openExternal` and
   fakes `globalState`. **Both seams move.** The open seam becomes
   `vscode.commands.executeCommand` (with `getCommands` stubbed to control the
   probe), and the marker seam becomes the file at
   `getReleaseNotesStatePath()`. `SPEC_REL_RELEASENOTES` AC-2 to AC-11 are
   expressible against those two; AC-12, AC-13 and AC-15 are grep-shaped checks
   over the workspace. AC-2 (no workspace folder) is new and has no existing
   test.

**Open questions carried to the Developer:** Issue 9 (whether
`workbench.action.browser.open` accepts show options — the group-one request
depends on it).

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

### Round 2 — Reopen Rework (2026-07-31)

**Reviewed by:** QM
**Review date:** 2026-07-31
**Scope:** Reopen Deltas 1–2 only (delivery mechanism → in-editor `simpleBrowser.api.open`; marker storage → per-workspace `.jarvis/state/release-notes.json`), per CM's dispatch.

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| — | — | — | None. | — |

**Independent verification (git log, code, specs, build):**

Git log fully disclosed — 10 commits, exact match to CM's message (`d18b6cd` through `90eff9f`), correct order, zero undisclosed commits.

All three re-approved levels read in full and cross-checked against the CD's own "Elements touched by the reopen" table:
- `US_REL_WHATSNEW` — AC-2 and AC-6 correctly rewritten to the per-workspace premise; AC-8 (in-editor) and AC-9 (no-folder) present and match the CD's stated wording exactly.
- `REQ_REL_NOTESTARGET` — AC-2/AC-3/AC-6 correctly specify `simpleBrowser.api.open`, the `workbench.action.browser.open` probe, and the user-chosen `openExternal` fallback; AC-1/AC-4/AC-5 (URL construction, no network validation) carried over unchanged from first pass, correctly.
- `REQ_REL_NOTESMARKER` — storage reversed to `<workspaceRoot>/.jarvis/` (AC-1/AC-2); AC-7 (committed-marker residual) present and correctly refuses a user/machine-specific filename workaround, consistent with the CD's own reasoning.
- `REQ_REL_NOTESONCE` — AC-2 correctly split on `.jarvis/`-presence as the introducing-release tie-breaker (Issue 10); AC-5's concurrent-activation bound (no lock file) carried over unchanged from first pass.
- `SPEC_REL_RELEASENOTES` — full embedded code block (`readState`/`writeState`/`notesUri`/`openInEditor`/`open`/`announceIfNewVersion`/`showReleaseNotes`) compared line-by-line against `packages/core/src/engine/core/releaseNotes.ts` — verbatim match, including the `knownWorkspace` sampled-before-`writeState()` ordering and the setting-read-after-marker-write ordering, both independently re-derivable from the design notes' own stated reasons.
- `SPEC_CFG_PATHRESOLVER` — GH #63 amendment paragraph and the `getStateDir()`/`ensureStateDir()`/`getReleaseNotesStatePath()` code block compared against `packages/core/src/engine/core/configPaths.ts` — verbatim match; `.jarvis/state/` confirmed already present in `WORKSPACE_PATHS` as `transient` (no new `.gitignore` entry needed, as claimed).

`extension.ts` (`void announceIfNewVersion(context, log)`, unchanged in shape) and `package.json` (command unchanged; setting `description` now reads "in the editor…", key/type/default/scope unchanged) independently confirmed against the CD's "Implementation scope" list — both match exactly, no drift beyond what was disclosed.

`release-notes.test.ts` read in full: both test seams moved as the CD specified — the open seam is now `vscode.commands.executeCommand`/`getCommands` (mocked), the marker seam is now the real file at a mocked `getReleaseNotesStatePath()` written to/read from a real temp directory via `fs`. 12 tests present, mapping 1:1 onto AC-2 through AC-11 as claimed: no-workspace warn (AC-2), no-marker/no-`.jarvis/` silent record (AC-3), no-marker/existing-`.jarvis/` opens (AC-4), marker-equals-installed no-op (AC-5), marker-differs+setting-true opens via `simpleBrowser.api.open` with no `openExternal` call (AC-6), marker-differs+setting-false no-open-but-marker-advances (AC-7), marker-write-failure no-open (AC-8), corrupt-marker-file treated as absent (AC-9), integrated-browser-absent shows fallback message (AC-10), user-chooses-"Open in Browser" calls `openExternal` (AC-10), manual command opens current version + leaves marker untouched (AC-11), manual command works with no workspace (AC-11). No simulated/duplicated logic — every test drives the real exported `announceIfNewVersion`/`showReleaseNotes`.

Full `compile all` (`npx tsc -p packages/core`) — clean. Independently re-ran `npx vitest run` — 389/389 passed, 38/38 files, matching CM's disclosed count exactly (+4 over the first-pass 385, consistent with the claimed 12 tests replacing the prior 8).

Issue 9 (whether `workbench.action.browser.open` accepts its own `showOptions`, needed for the group-one placement request) was left uninvestigated by the Developer — consistent with the CD's own sign-off text that this is "a factual unknown... it changes no requirement and gates nothing," not a blocking gap. Not re-raised.

Issues 6/7/8/11/12 are disclosed, explicitly scoped to separate CRs by the CD itself, and consistent with prior CRs' escalations — not re-raised.

**Overall: CLEAR.** No findings. Both reopen deltas are correctly and completely carried through all three levels and into code/tests with no drift, no undisclosed commits, and no test-methodology gap. Ready to close from QM's side.

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
