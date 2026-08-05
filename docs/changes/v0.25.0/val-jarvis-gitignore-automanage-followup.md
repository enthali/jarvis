# Validation Report: jarvis-gitignore-automanage-followup

**Change Request**: jarvis-gitignore-automanage-followup (follow-up to GH #60)
**Change Document**: [jarvis-gitignore-automanage-followup.md](jarvis-gitignore-automanage-followup.md)
**Branch**: `feature/jarvis-gitignore-automanage-followup`
**Verified by**: Verify Engineer
**Date**: 2026-08-05
**Verdict**: ✅ **PASSED** — with two findings, neither blocking

---

## Scope

**No specification element changed.** The System Designer's outcome was that both
gaps are conformance gaps against requirements already at `:status: implemented`,
and that two of the four originally tasked fixes are *forbidden* by those same
requirements. Verification therefore has two halves, and the second matters as
much as the first:

1. the one change that was made conforms to the requirement that mandates it;
2. the changes that were forbidden were genuinely **not** made.

Confirmed no `.rst` file is touched on this branch — the CD's "no spec change
required" claim is true of the artefact, not only of the narrative.

---

## Half 1 — the change that was made

### Gap 1: `jarvis.gitignore.autoManage` declaration restored

`REQ_CFG_IGNOREAUTOMANAGE` AC-1 (boolean, default `true`) and AC-6
(workspace-scoped) were already `implemented`; the manifest had stopped matching
them since merge `9a4611b`.

| Claim | Evidence | Result |
|---|---|---|
| Group restored in `contributes.configuration` | [package.json](../../packages/core/package.json) — diff replaces the stray blank line F-2 identifies as the scar | ✅ |
| Placed between `Reminders` and `Updates` (D-1) | group order read from parsed JSON: Actors, Messages, Prompt Templates, Heartbeat, Reminders, **Gitignore**, Updates, Hooks | ✅ |
| `type: boolean`, `default: true` — AC-1 | parsed property: `{"type":"boolean","default":true,...}` | ✅ |
| `scope: "resource"` — AC-6, `jarvis.hooks.autoInstall` precedent | parsed property: `"scope":"resource"` | ✅ |
| Description matches D-1 verbatim | parsed property compared to the CD's JSON block | ✅ |
| Manifest still parses; exactly one `Gitignore` group | `ConvertFrom-Json` OK, 8 groups, no duplicate | ✅ |

**The declaration matches what the code actually reads**, which is the property a
manifest restore can most easily get wrong:
[gitignoreManager.ts](../../packages/core/src/engine/core/gitignoreManager.ts#L103-L104)
reads `getConfiguration('jarvis.gitignore').get('autoManage', true)`. Section and
key compose to `jarvis.gitignore.autoManage`, and the code default (`true`)
equals the declared default. So the restore changes **visibility only**, not
behaviour — exactly the claim F-1/D-1 makes. ✅

### `.gitignore`

The branch's net contribution to the root `.gitignore` is **nothing**: commit
`19062ff` added eight stopgap lines and `da3e62c` removed the same eight.
`git diff development..HEAD -- .gitignore` is empty.

This is the correct outcome, not an omission — F-4 and F-5 establish that those
entries must not exist. Recorded explicitly because the Change Manager's handover
describes item 2 as "stopgap manual entries removed", and a reviewer diffing the
branch against `development` will find no `.gitignore` change to inspect. The
removal is real; it is a round trip inside the branch.

---

## Half 2 — the changes that were forbidden, verified absent

| Forbidden fix | Requirement forbidding it | Evidence it was not made |
|---|---|---|
| Add `.github/hooks/capture.jsonl` to the ignore region | `REQ_CFG_IGNOREPATTERNS` AC-4 (no entry for a path Jarvis does not write); `REQ_CFG_FILEPREFIX` AC-3 | `WORKSPACE_PATHS` untouched — no diff in `configPaths.ts`; no such entry anywhere | 
| Add the three flat message paths (`.jarvis/messages.json`, `message-log.json`, `autodelivery.json`) | `REQ_CFG_IGNOREPATTERNS` AC-1/AC-4; they are superseded paths Jarvis no longer writes (`REQ_CFG_STATEMIGRATION` AC-3) | `WORKSPACE_PATHS` untouched; the three files remain visible in `git status` |

`configPaths.ts` carries no diff on this branch. The registry still describes what
Jarvis writes today. ✅

Two adjacent facts checked because the findings depend on them:

- `.github/hooks/capture.jsonl` is **gone** from the working tree, as F-4
  recommends. The directory now holds only `jarvis-hooks.json`.
- `.github/hooks/` no longer appears in `git status` — it is covered by the
  managed region's `.github/hooks/jarvis-*` entry, since the one remaining file
  matches that glob. This independently confirms the GH #60 region is doing its
  job, which is the premise the whole CR rests on.

---

## Build and tests

| Check | Result |
|---|---|
| `compile all` (7 packages + 2 webview builds) | ✅ clean |
| `npx vitest run` | ✅ 398 passed / 398, 39 files — unchanged, as expected for a manifest-only change |
| `packages/core/package.json` JSON validity | ✅ parses |

Sphinx not re-run: no `.rst` file is touched on this branch.

---

## Findings

### 1 — medium: the Summary's acceptance criterion (2) is not met, and this CR cannot meet it

The Summary states: *"a clean workspace running the current extension shows no
untracked/modified files under `.jarvis/` or `.github/hooks/` other than the
durable paths already carved out."*

`git status` on this branch shows three:

```
?? .jarvis/autodelivery.json
?? .jarvis/message-log.json
?? .jarvis/messages.json
```

This is not an implementation shortfall. The CD's own Level 0/1/2 analysis
(F-5, F-6) concludes that hiding these files is forbidden and would conceal
pending user data, and its **Open** section escalates the residue as a decision
the specification cannot settle. The acceptance criterion was written before that
analysis and was never restated afterwards, so the CD now promises an outcome its
own findings rule out.

The precedent for handling this exists in this repository: `touched-files-cleanup`
carries an explicit *"Note for PM — the Summary changed shape"* section listing
the statements its Level 0 pivot invalidated. This CD makes the same kind of
pivot and lacks the equivalent note.

**Not blocking**, and I agree with the Change Manager that it should not block:
the shipped behaviour is correct and the escalation is properly recorded. But the
criterion as written will read as failed to anyone who checks it against
`git status`, which is precisely what a release-readiness reviewer does.

**Recommendation:** restate acceptance criterion (2) to the outcome actually
delivered, and let the Open section carry the rest. The System Designer's own
reading favours option 3 (retire migration under `REQ_CFG_STATEMIGRATION` AC-8,
naming a release boundary); that decision is the user's, not this report's.

### 2 — low: three file changes on the branch fall outside the declared scope

The commit list was disclosed in full and matches `git log` exactly. The
*effects* of three commits are absent from the handover's "WHAT CHANGED", and
none is mentioned in the CD:

| File | Change | Commit |
|---|---|---|
| `.vscode/settings.json` | removes `jarvis.scanInterval: 1` and `jarvis.heartbeatInterval: 300` | `300c893` |
| `testdata/.gitignore` | new file, ignores `.github` under `testdata/` | `c91a901` |
| `testdata/.jarvis/actors/Session 1/context.md` | one line added — message delivery to Session 2/3 is reliable only when the agent name in `actor.yaml` is quoted | `c91a901` |

None affects product code, the CR's acceptance criteria, the build, or the tests.
The first changes this repository's own developer settings; the other two are
test-workspace housekeeping.

The third is worth a second look by someone other than me: a fixture memory note
recording that message delivery depends on quoting in `actor.yaml` describes a
product sharp edge, and it is currently written down only in test data.

---

## Status updates applied

**None.** No specification element changed, and every requirement this CR
restores conformance to (`REQ_CFG_IGNOREAUTOMANAGE`, `REQ_CFG_IGNOREPATTERNS`,
`REQ_CFG_STATEMIGRATION`, `REQ_CFG_FILEPREFIX`, `REQ_CFG_FILEMIGRATION`) is
already `:status: implemented`.

---

## Observation carried forward

`REQ_CFG_GROUPS` requires exactly eleven configuration groups in a fixed order.
The manifest now has eight, of which four are not on that list (Actors, Prompt
Templates, Gitignore, Hooks). The CD records this and correctly declines to fix
it here. Confirmed by inspection, and noted so the count in this report is not
mistaken for a new divergence: restoring the Gitignore group added the eighth.
