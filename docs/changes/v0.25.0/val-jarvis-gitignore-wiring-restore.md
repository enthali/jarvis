# Validation Report: jarvis-gitignore-wiring-restore

**Change Request**: jarvis-gitignore-wiring-restore (v0.25.0 release blocker)
**Change Document**: [jarvis-gitignore-wiring-restore.md](jarvis-gitignore-wiring-restore.md)
**Branch**: `feature/jarvis-gitignore-wiring-restore` (tip `4cc7168`)
**Verified by**: Verify Engineer
**Date**: 2026-08-05
**Verdict**: ✅ **PASSED** (Round 2) — Round 1 was PARTIAL; both outstanding contributions have since been restored and re-verified

> **Round 2, 2026-08-05, tip `f293cf9`.** Finding 1 is resolved. The verdict
> above supersedes Round 1's PARTIAL. Round 1 is retained below unedited as the
> record of what was found and why; the Round 2 section at the end carries the
> re-verification.

---

## Summary

The single commit does exactly what it says, and does it cleanly. But the task
required re-checking whether `9a4611b` dropped more than the two restored blocks.
**It did.** Two further contributions from the same commit are still missing
today, and one of them makes this CR's own release-notes restore
non-functional: the command handler is registered, but the Command Palette entry
that reaches it is absent.

Recommend extending this CR by two lines of `package.json` rather than merging
it as-is and opening a third follow-up for the same regression.

This report also **corrects two false claims in my own earlier verification**
(§5). They are the reason the gap survived to this point.

---

## 1. Scope and baseline

`9a4611b` is not a merge commit — it has a single parent, `2db1ee1`. The
Change Documents describe it as a merge; the correct baseline for "what was
lost" is therefore the plain diff `2db1ee1 → 9a4611b`, which is what I used.

| Commit | Time | Event |
|---|---|---|
| `2db1ee1` | 08-04 10:27 | last good state |
| `9a4611b` | 08-05 10:09 | touched-files-cleanup — drops the wiring |
| `d8c086d` | 08-05 10:43 | my verification sweep (see §5) |
| `4cc7168` | 08-05 15:23 | this CR |

---

## 2. The declared change — verified verbatim

`9a4611b` deleted exactly 22 lines from `extension.ts`, enumerated from the diff
rather than from the CD: the two imports, `setIgnoreManagerLogger(log)`,
`applyGitignore()`, the `onDidChangeConfiguration` listener and its subscription
push, `void announceIfNewVersion(context, log)`, the `jarvis.showReleaseNotes`
`registerCommand`, and `showReleaseNotesCommand` in the subscriptions array.

**Verification method:** rather than compare the CR's diff to the CD's prose, I
diffed the branch tip directly against the pre-regression state:

```
git diff 2db1ee1 HEAD -- packages/core/src/extension.ts
```

The result contains **only additions** — the three `touched-files-cleanup`
command registrations and their subscription entries, which legitimately belong
to `9a4611b`. There is not a single deletion hunk. That is a stronger statement
than "the restore matches the CD": nothing whatsoever from the pre-regression
`extension.ts` is missing, and nothing was silently altered while restoring.

| Restored item | Result |
|---|---|
| `import { applyGitignore, setIgnoreManagerLogger }` | ✅ verbatim |
| `setIgnoreManagerLogger(log)` | ✅ verbatim |
| `applyGitignore()` on activation | ✅ verbatim |
| `onDidChangeConfiguration` → `jarvis.gitignore.autoManage` + subscription | ✅ verbatim |
| `import { announceIfNewVersion, showReleaseNotes }` | ✅ verbatim |
| `void announceIfNewVersion(context, log)` | ✅ verbatim |
| `registerCommand('jarvis.showReleaseNotes', …)` + subscription | ✅ verbatim |

**Why this mattered independently of the CD:** the previous CR
(`jarvis-gitignore-automanage-followup`) restored the `jarvis.gitignore.autoManage`
*declaration* and I verified that the code reading it composes the right key —
but `applyGitignore()` was never called at activation, so the setting was
declared, readable, and inert. The declaration and the caller were lost by the
same commit and restored by two different CRs.

| Check | Result |
|---|---|
| `npx tsc -p packages/core` | ✅ clean |
| `npx vitest run` | ✅ 398 / 398, 39 files |

---

## 3. Finding 1 — HIGH: two contributions from `9a4611b` are still missing

`9a4611b` also deleted from `packages/core/package.json`. Current state of the
branch, read from the parsed manifest:

| Artefact deleted by `9a4611b` | Status today | Restored by |
|---|---|---|
| `Gitignore` configuration group | ✅ present | previous follow-up CR |
| `jarvis.checkForUpdates` setting | ✅ present (group `Updates`) | survived — re-added in the same commit |
| **`jarvis.showReleaseNotes` command contribution** | ❌ **ABSENT** | — |
| **`jarvis.releaseNotes.showOnUpdate` setting** | ❌ **ABSENT** | — |

### 3a. `jarvis.showReleaseNotes` — this CR's own restore is incomplete without it

This CR restores `vscode.commands.registerCommand('jarvis.showReleaseNotes', …)`.
`registerCommand` alone does **not** place a command in the Command Palette —
that requires the `contributes.commands` entry, which `9a4611b` removed:

```json
{ "command": "jarvis.showReleaseNotes", "title": "Jarvis: Show Release Notes" }
```

Consequence: after this CR merges, the handler exists and is unreachable by the
only route a user has. `REQ_REL_NOTESCOMMAND` ("manual command, works regardless
of the automatic counterpart's setting") remains unsatisfied, and `US_REL_WHATSNEW`
loses the on-demand half of its story.

This is inside the CR's stated purpose — the commit message says "restore
gitignore + release-notes activation wiring lost in `9a4611b`". The release-notes
wiring is not fully restored.

### 3b. `jarvis.releaseNotes.showOnUpdate` — the opt-out is unreachable

[releaseNotes.ts](../../packages/core/src/engine/core/releaseNotes.ts#L88-L89)
reads `getConfiguration('jarvis.releaseNotes').get('showOnUpdate', true)`. With
the declaration absent, the default `true` applies and **the user has no way to
turn it off** — it cannot be found in the Settings UI.

This is the same defect class as the Gitignore group, with a sharper edge:
GH #63's own L0 Finding 4 introduced this setting precisely because release-notes
announcement "leaves the editor entirely and takes over the user's browser" and
"was the only one proposed without a switch". Shipping v0.25.0 — the release
whose notes this feature exists to show — with the switch unreachable would
reproduce the exact condition that finding rejected.

### Recommendation

Restore both in this CR. It is two lines, it is the same regression from the
same commit, and it is the difference between this CR achieving its stated goal
and not. Deferring means a third CR for one `9a4611b` fallout.

---

## 4. Was anything else dropped?

I enumerated **every** deletion `9a4611b` made across all twelve files it
touched, not only `extension.ts`. Outside the two files already discussed, the
deletions fall into two harmless classes, checked individually:

- **Specification text in `spec_ent.rst`, `req_ent.rst`, `us_ent.rst`** — these
  are the touched-files-cleanup rewrites (old AC-6/AC-7/AC-8/AC-13 wording,
  the `jarvisEntityFileFolder` reuse rationale, `:status:` transitions). Replaced
  by design, verified as intended content in the touched-files-cleanup report.
- **`treeFactory.ts` / `touchStore.ts` deletions** — superseded code paths
  (`jarvisEntityFileFolder` on touched-file folders, the unfiltered
  `getEntries` call), replaced in the same commit.
- **`jarvis.removeTouchedFile` command/menu entries in `package.json`** —
  deleted and re-added in the same commit; verified present today.

No further silent losses found. The blast radius of `9a4611b` is: the two
`extension.ts` blocks (fixed here) and four `package.json` contributions, of
which **two remain outstanding** (Finding 1).

---

## 5. Correction to my own earlier verification

`d8c086d` — my verification sweep for the five root-level CDs — landed **34
minutes after** `9a4611b` introduced this regression. Two claims in
[val-jarvis-release-notes-on-update.md](val-jarvis-release-notes-on-update.md)
were therefore false at the moment I wrote them:

| Claim I made | Reality at `d8c086d` |
|---|---|
| `REQ_REL_NOTESCOMMAND` — "verified against `showReleaseNotes` + command contribution" | the command contribution was already absent |
| `REQ_REL_NOTESSETTING` — "verified against `jarvis.releaseNotes.showOnUpdate`" | the setting was already absent |

I verified `releaseNotes.ts` — the module — and wrote the table rows as though I
had checked the manifest contributions too. I had not. The module was fine; the
declarations that make it reachable were gone, and my report asserted otherwise.
Both elements were then swept to `:status: implemented` on the strength of that
assertion.

**This is the reason the gap survived** the release-readiness review: the
artefact whose job is to catch exactly this said it had been checked.

**Status consequence, needing a decision I should not take alone.**
`REQ_REL_NOTESCOMMAND` and `REQ_REL_NOTESSETTING` are currently `:status:
implemented` against a manifest that does not satisfy them.

- If Finding 1 is fixed in this CR, both statuses become true again and nothing
  further is needed — this is the outcome I recommend.
- If Finding 1 is deferred, both must be reverted to `:status: approved` until
  the contributions return.

I have not changed either status in this report, because the correct action
depends on that decision. Flagging rather than churning.

**What I have changed in my own practice:** a requirement that mandates a
manifest contribution is verified against the parsed manifest, not against the
module that consumes it. Recorded in my memory as a standing check.

---

## 6. Status updates applied

**None.** This CR changes no specification element. The two statuses that
*should* change depend on the Finding 1 decision — see §5.

---

## Verdict detail

| Aspect | Result |
|---|---|
| Declared scope (`extension.ts` wiring) | ✅ complete, verbatim, no drift |
| Build / tests | ✅ clean, 398/398 |
| Stated goal ("restore wiring lost in `9a4611b`") | ⚠️ **not reached** — two contributions outstanding |
| Release-blocker status | ⚠️ still blocking: `REQ_REL_NOTESCOMMAND` unsatisfied |

**Not a rejection of the work done** — what was restored was restored correctly,
and the verbatim check confirms it. The CR is two lines short of its own goal.

---

# Round 2 — 2026-08-05, tip `f293cf9`

**Verdict: ✅ PASSED.** Finding 1 resolved. No new findings.

CM decided fix-in-CR (statuses untouched); Dev landed `f293cf9`, touching
`packages/core/package.json` only — 3 insertions, 1 deletion.

## R2.1 — Finding 1 resolved

Both artefacts read from the **parsed manifest**, not from the diff — this is
the check whose absence caused the miss recorded in §5:

| Property | Required | Actual | Result |
|---|---|---|---|
| `jarvis.showReleaseNotes` in `contributes.commands` | present | present | ✅ |
| — title | `Jarvis: Show Release Notes` | identical | ✅ |
| — **not** suppressed by a `commandPalette` `when: false` entry | absent | absent | ✅ reachable |
| `jarvis.releaseNotes.showOnUpdate` group | `Updates` | `Updates` | ✅ |
| — type / default | `boolean` / `true` | `boolean` / `true` | ✅ |
| — **scope** | `application` | `application` | ✅ |
| — description | pre-regression text | identical | ✅ |

The scope is the one worth stating rather than ticking. `application` is not the
neighbouring pattern: `jarvis.gitignore.autoManage`, restored two commits
earlier in the same file, is `resource`. They differ for a reason — the
installed version is a property of the installation, so its opt-out belongs to
the installation, whereas the `.gitignore` region belongs to a workspace.
Copying the adjacent entry would have produced a plausible, wrong value that
nothing would have failed on.

`REQ_REL_NOTESCOMMAND` and `REQ_REL_NOTESSETTING` are now satisfied by the
artefact, so their `:status: implemented` is correct without any edit — the
outcome CM's decision was chosen to produce.

## R2.2 — no drift alongside the fix

| Check | Result |
|---|---|
| `git diff 2db1ee1 HEAD -- packages/core/src/extension.ts` — deletion hunks | ✅ none |
| `packages/core/package.json` parses | ✅ |
| `npx tsc -p packages/core` | ✅ clean |
| `npx vitest run` | ✅ 398 / 398, 39 files |

The manifest diff against `2db1ee1` now contains only `touched-files-cleanup`'s
own additions (`removeTouchedFiles` / `cleanupTouchedFiles` commands and menus,
`windowDays` setting) plus one deliberate difference, recorded next.

## R2.3 — recorded so it is not re-discovered as drift

The **Gitignore** group is not byte-identical to its pre-regression form: it now
sits between `Reminders` and `Updates` (previously after `Hooks`) and its
description reads "maintains a marked region … transient runtime paths" rather
than "keeps a marked block … files it generates".

Both differences are deliberate. They come from
`jarvis-gitignore-automanage-followup` D-1, which specified the position and the
wording, and I verified the restore against D-1 verbatim in
[that report](val-jarvis-gitignore-automanage-followup.md). Recorded here
because anyone diffing this manifest against `2db1ee1` will see it and would
otherwise reasonably read it as a second regression.

## R2.4 — observation, out of scope: one dead command contribution

While cross-checking every contributed command id against the ids actually
registered — the invariant that generalises §5's lesson — 36 contributed ids
were compared against 30 registered in `extension.ts`. Five of the six
apparent orphans are registered in
[heartbeat.ts](../../packages/core/src/apps/session/heartbeat.ts#L661-L712)
(`runHeartbeatJob`, `runJob`, `pauseHeartbeatJob`, `resumeHeartbeatJob`,
`refreshHeartbeat`) — not orphans, just registered elsewhere.

The sixth is real: **`jarvis.newEntity` is contributed but registered nowhere**
in any package.

- **Not caused by this regression.** It is equally absent at `2db1ee1`, and
  `git log -S "jarvis.newEntity" -- packages/core/src/extension.ts` returns no
  commit — the registration never lived in that file.
- **No user impact.** It carries `"when": "false"` in `commandPalette`, so it is
  not reachable and cannot fail visibly. It appears superseded by
  `jarvis.newSession` / `jarvis.newActor`.
- **But the specification still describes it as live.**
  `SPEC_ACT_NEWENTITY` refers to the "`jarvis.newEntity` Session branch
  (`src/extension.ts` newEntityCommand)", and `REQ_ACT_*` and several UAT specs
  give it procedures. That code does not exist.

Out of scope here — reported for PM to route, not fixed. Flagged because it is
the same shape as the defect this CR exists to repair: a manifest contribution
with nothing behind it. The difference is that this one is hidden, so no reader
would ever notice.

**Suggestion, one line and cheap:** the contributed-vs-registered cross-check
used above is a test this repository could keep. It would have caught the
`showReleaseNotes` loss at the moment `9a4611b` landed, instead of two CRs and
one incorrect verification report later.
