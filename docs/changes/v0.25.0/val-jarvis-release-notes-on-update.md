# Validation Report: jarvis-release-notes-on-update

**Change Request**: jarvis-release-notes-on-update (GH #63)
**Change Document**: [jarvis-release-notes-on-update.md](jarvis-release-notes-on-update.md)
**Verified by**: Verify Engineer
**Date**: 2026-08-05
**Verdict**: ✅ **PASSED**

---

## Scope

Verified only what the Change Document declares as changed, **including the
Reopen Deltas** — this CR was merged once, reopened by PM validation, and
re-specified twice. The reopened state is what was verified.

### New elements

| ID | Level | Verified against |
|---|---|---|
| `US_REL_WHATSNEW` | L0 | discharged by the five `REQ_REL_NOTES*` requirements |
| `REQ_REL_NOTESTARGET` | L1 | probe + `simpleBrowser.api.open` in `releaseNotes.ts` |
| `REQ_REL_NOTESMARKER` | L1 | `.jarvis/state/release-notes.json` via `getReleaseNotesStatePath()` |
| `REQ_REL_NOTESONCE` | L1 | `announceIfNewVersion` + `.jarvis/`-presence heuristic |
| `REQ_REL_NOTESCOMMAND` | L1 | `showReleaseNotes` + command contribution |
| `REQ_REL_NOTESSETTING` | L1 | `jarvis.releaseNotes.showOnUpdate` |
| `SPEC_REL_RELEASENOTES` | L2 | `releaseNotes.ts` (spec embeds the actual code) |

### Modified elements

| ID | Change verified |
|---|---|
| `SPEC_CFG_PATHRESOLVER` | `getStateDir()`, `ensureStateDir()`, `getReleaseNotesStatePath()` added |
| `REQ_CFG_FIXEDPATHS` | one entry added to the enumeration |

Two status decisions in the CD are deliberate and were left alone:
`REQ_REL_NOTESSETTING` stays `approved`→`implemented` on its unchanged ACs
(only its rationale was replaced), and `REQ_CFG_FIXEDPATHS` /
`SPEC_CFG_PATHRESOLVER` stay `implemented` while gaining an entry.

---

## The two reversals, verified as shipped

Both Reopen Deltas overturn earlier decisions. Neither is a detail, so each was
checked in code rather than read from the CD.

**Delta 1 — the notes open inside the editor, not the system browser.**

| Claim | Evidence | Result |
|---|---|---|
| Probe for the integrated browser command | [releaseNotes.ts](../../packages/core/src/engine/core/releaseNotes.ts#L6) — `INTEGRATED_BROWSER = 'workbench.action.browser.open'` | ✅ |
| Delivery via `simpleBrowser.api.open` | [releaseNotes.ts](../../packages/core/src/engine/core/releaseNotes.ts#L7) | ✅ |
| `openExternal` reachable **only** on the user-chosen fallback branch | [releaseNotes.ts](../../packages/core/src/engine/core/releaseNotes.ts#L54) — `if (choice) { void vscode.env.openExternal(uri); }`; single occurrence in the module | ✅ |

The probe is load-bearing rather than defensive: GitHub serves the release page
with `frame-ancestors 'none'`, so `simpleBrowser.api.open`'s iframe fallback
would render an empty pane and still resolve successfully. Without the probe the
failure is unobservable. One occurrence of `openExternal`, on the branch behind
a user choice — verified by grep over the module, not assumed.

**Delta 2 — the marker is per-workspace, not per-installation.**

| Claim | Evidence | Result |
|---|---|---|
| Marker at `.jarvis/state/release-notes.json` | [releaseNotes.ts](../../packages/core/src/engine/core/releaseNotes.ts#L12) via `getReleaseNotesStatePath()` | ✅ |
| Resolver lives in `configPaths.ts` alongside `getStateDir`/`ensureStateDir` | [configPaths.ts](../../packages/core/src/engine/core/configPaths.ts#L125-L140) | ✅ |
| No folder open → short-circuit, no throw | [releaseNotes.ts](../../packages/core/src/engine/core/releaseNotes.ts#L61) — `if (!getReleaseNotesStatePath())` guard at entry | ✅ |
| Introducing-release heuristic keyed to `.jarvis/` presence | `getJarvisDir` imported and used in `announceIfNewVersion` | ✅ |
| `globalState` no longer used | grep: no `globalState` in `releaseNotes.ts` | ✅ |

`.jarvis/state/` is already declared `transient` in `WORKSPACE_PATHS` (GH #60),
so the marker reaches the maintained `.gitignore` region with no new entry —
confirmed against `getIgnoreEntries()`.

---

## Traceability

Every AC of `US_REL_WHATSNEW` is discharged at L1 and L2. Two design ACs
(`SPEC_REL_RELEASENOTES` AC-9/AC-10, the grep-shaped properties) discharge no
story AC and the CD discloses them as such — they forbid one-line changes whose
failure mode is silence. Verified as intentional and disclosed, not as orphans. ✅

---

## Build and tests

| Check | Result |
|---|---|
| `compile all` | ✅ clean |
| `npx vitest run` | ✅ 398 passed / 398, 39 files |

`release-notes.test.ts` calls the real exported `announceIfNewVersion` and
`showReleaseNotes` against a faked state file and mocked VS Code APIs — no
simulated logic, from Round 1.

---

## Findings

| # | Severity | Finding | Disposition |
|---|---|---|---|
| 1 | — | QM Round 1: CLEAR, no findings. | Closed |
| 2 | low | No UAT scenario family for this area. Consistent with GH #58/#60 precedent, tracked under GH #61. | Open, accepted |
| 3 | medium | **Escalated, out of scope (L0 Finding 5):** the self-update mapping in `REQ_REL_UPDATEINSTALL` and `idToVsix` omits `enthali.jarvis-kanban` and `enthali.jarvis-suite`. Because core *does* match, the "no matching assets" fallback never fires — a user with core and kanban installed gets core updated and kanban silently left behind. Not caused by this CR; **relevant to the v0.25.0 release** and re-surfaced here for PM. | Open, escalated |
| 4 | low | `REQ_CFG_GROUPS` / `SPEC_CFG_MANIFEST` stale; `jarvis.checkForUpdates` has the setting-scope mismatch this CR avoids. Disclosed by the CD. | Open, separate CR |

No blocking issue for this CR. Finding 3 is flagged for release attention
because it affects what a v0.25.0 self-update will actually install.

---

## Status updates applied

`US_REL_WHATSNEW`, `REQ_REL_NOTESTARGET`, `REQ_REL_NOTESMARKER`,
`REQ_REL_NOTESONCE`, `REQ_REL_NOTESCOMMAND`, `REQ_REL_NOTESSETTING`,
`SPEC_REL_RELEASENOTES`: `approved` → `implemented`.

`REQ_CFG_FIXEDPATHS`, `SPEC_CFG_PATHRESOLVER` already `implemented` — unchanged,
per the CD's deliberate decision.
