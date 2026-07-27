# Change Document: notification-agent-mode-reset

**Status**: draft
**Branch**: feature/notification-agent-mode-reset
**Created**: 2026-07-27
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fix a regression where delivering a message notification to an already-open
session with a custom agent mode (`entity.agent` set) resets that session's
chat mode back to the generic built-in "Agent" mode, undoing the mode-persistence
fix from GH #25 (`agent-mode-persistence`, v0.17.1). Affects both
`jarvis.sendMessages` (manual "Play" button on a message group) and the
auto-delivery poll loop — i.e. every actor that receives an async message via
`jarvis_sendMessage`/auto-delivery while running in a custom persona mode.

**Root cause**: `injectPrompt.ts` branch 3a (existing session) calls
`reapplyAgentMode(entity.agent, entityName)` — which correctly restores the
custom mode via the mode-specific command `workbench.action.chat.open${agent}`
— but then unconditionally falls through to step 4 (`sendPromptToFocusedAgentChat(text)`)
whenever `text` is non-empty. Step 4 submits via the **generic**
`workbench.action.chat.openAgent` command, which switches the session back to
the built-in generic "Agent" mode, immediately clobbering what step 2 just
restored. Message-notification callers always pass non-empty `text` (the
notification stub), so this reproduces on every delivery.

This is a known regression: [docs/changes/v0.5.8/hotfix-agent-reset.md](../v0.5.8/hotfix-agent-reset.md)
already diagnosed and fixed this exact symptom for the auto-delivery path
specifically, by switching its text submission to plain
`workbench.action.chat.open` (no `mode` param, no `sendPromptToFocusedAgentChat`).
That path-specific fix was flattened away when prompt injection was later
consolidated into the shared `injectPrompt.ts` primitive (`SPEC_INJ_INJECT`) —
all callers, including auto-delivery, now go through the shared, mode-resetting
step 4.

**Fix direction**: In `injectPrompt.ts` branch 3a, when `text` is non-empty,
submit via `workbench.action.chat.open({ query, isPartialQuery: false })`
**without** a `mode` parameter — proven safe by the v0.5.8 hotfix (generic
`chat.open` without `mode` does not alter an already-focused chat editor's
mode; VS Code only binds mode at session creation for that command). Reserve
`chat.openAgent` / `mode: 'agent'` submission for the new-session path (3b)
only, where forcing generic Agent mode (absent a custom `entity.agent`) is the
intended default. Since `sendPromptToFocusedAgentChat` is the one remaining
choke point for all prompt submission (single entry point achieved by CR #52),
this fix should live inside it — parameterized or branch-aware — rather than
reintroducing a path-specific duplicate.

**Acceptance criteria**:
(a) an existing session with a custom `entity.agent` set retains that custom
mode after receiving a message notification (manual send AND auto-delivery);
(b) the notification stub is still submitted as a real chat message in both
cases (behavior unchanged apart from mode preservation);
(c) new-session spawn behavior (3b) is unaffected — still ends up in the
correct primed/generic mode as today;
(d) existing test suite passes; add/update tests covering mode-preservation on
notification delivery to an existing custom-mode session.

**GitHub Issue(s)**: #54

---

## Findings

**Root cause confirmed, and it is derivable — not merely empirical.**

The CD describes the fix as "proven safe by the v0.5.8 hotfix". That is true,
but the specs already contained the *explanation*; it had simply never been
connected to this code path. `SPEC_MSG_OPENCHAT`'s GH #25 amendment documents
that VS Code registers a per-mode command `workbench.action.chat.open<ModeName>`
for every discovered mode, and that — unlike the generic
`workbench.action.chat.open` — those commands carry a bound `this.mode` and
therefore switch the **focused chat editor's** mode in place.

`workbench.action.chat.openAgent` is simply the member of that family for the
built-in "Agent" mode. So step 4 clobbering the mode is not an accident of
VS Code internals: it is the *same mechanism* `reapplyAgentMode()` deliberately
exploits to restore a custom mode, invoked one step later in the opposite
direction. Step 3a restores, step 4 overwrites.

This reframing matters for the spec, because it turns "use `chat.open` without
`mode` — it was proven to work in v0.5.8" into a rule with a stated reason:
**submission must never use a mode-bound command against a session whose mode
is already established.** A rule with a reason survives the next refactor; the
v0.5.8 fix did not, precisely because it was recorded as a path-specific
workaround rather than as a property of the submission helper.

### Level 1 — Requirements

| ID | Links to | Change | Rationale |
|---|---|---|---|
| REQ_INJ_PRIMITIVE | US_INJ_INJECT | modified | New AC-8: injecting into an already-existing session preserves that session's agent mode and must not undo the custom mode restored under AC-3 |
| REQ_MSG_SENDPROMPT | US_MSG_STABLESESSION | modified | New AC-6 (mode-preserving submission variant, must avoid the mode-bound command family, fallback must request no mode) and AC-7 (variant chosen by caller, never inferred from global state). AC-2 qualified as applying to the mode-setting variant only |
| REQ_MSG_SEND | US_MSG_CHATQUEUE | modified | New AC-7: notifying an already-open session does not change its agent mode, for both the manual send and auto-delivery paths — the user-observable statement of the bug |

### Level 2 — Design

| ID | Links to | Change | Rationale |
|---|---|---|---|
| SPEC_MSG_SENDPROMPT | REQ_MSG_SENDPROMPT | modified | Two submission variants introduced (mode-setting / mode-preserving); added the command-taxonomy explanation of *why* `chat.openAgent` resets mode; recorded the v0.5.8 precedent and why it was lost; corrected the stale file location (`extension.ts` → `injectPrompt.ts`) and the stale caller list |
| SPEC_INJ_INJECT | REQ_INJ_PRIMITIVE | modified | Step 4 made branch-aware: mode-preserving after 3a, mode-setting still acceptable after 3b; variant selected by the step from its own branch, not exposed as a caller option |
| SPEC_MSG_AGENTSESSION | REQ_MSG_AGENTSESSION | modified | Its existing/new-session sequences still documented the pre-#52 `skipInitPrompt: true` + caller-composed prompt shape — stale, and it would have contradicted the step-4 rules written here |

### Decisions

**Decision 1 — the variant is chosen by `SPEC_INJ_INJECT` step 4, not by the
caller and not by the helper.**
Three placements were possible: a new `injectPrompt` option, autodetection
inside `sendPromptToFocusedAgentChat`, or branch-derived selection inside
step 4. A caller-facing option would re-expose the mistake `skipInitPrompt`
already made in CR #52 — an implementation detail leaking into the API, which
callers then get wrong. Autodetection inside the helper would require it to
inspect global editor state, making it non-deterministic and untestable.
Step 4 already knows which branch ran; that is where the knowledge lives.
`REQ_MSG_SENDPROMPT` AC-7 states this explicitly so it is not re-litigated.

**Decision 2 — `REQ_MSG_SENDPROMPT` AC-2 amended rather than only supplemented.**
AC-2 stated unconditionally that the primary submission mechanism SHALL be
`chat.openAgent`. Adding AC-6 alongside it would have left two ACs in direct
contradiction. AC-2 is now scoped to the mode-setting variant. Same MECE
correction pattern as CR #52's AC-5.

**Decision 3 — the spec states the constraint, not the command.**
Per the CR instruction not to prescribe implementation, the normative text is
"SHALL NOT use a command carrying a bound mode; the fallback SHALL request no
mode". The concrete known-good command (`workbench.action.chat.open` with
`isPartialQuery: false`, no `mode`) is recorded as *evidence* from v0.5.8, not
as mandated code. Dev remains free to choose the helper's shape (extra
parameter, second exported function, …).

**Decision 4 — `SPEC_MSG_AGENTSESSION` updated although not listed in the CR.**
It still documented the pre-#52 call shape as fact. Left alone it would have
contradicted both the shipped code and the step-4 semantics written by this CR.
Same category as CR #52's Decision 3.

### Flagged: related gap on the new-session path (out of scope)

Branch 3b primes a custom agent mode at creation (when `entity.agent` is set)
and then submits the init prompt through the **mode-setting** variant. By the
taxonomy above, that submission resets the freshly primed custom mode back to
generic "Agent" — the same coupling as this bug, one branch over.

It is deliberately **not** fixed here: CD acceptance criterion (c) scopes 3b as
unchanged, and the user impact is far smaller (a brand-new session has no prior
conversation whose persona continuity is broken). It is recorded as a note in
`SPEC_INJ_INJECT` step 4 so it is not later re-discovered as a fresh defect,
and raised here for the Change Manager to decide whether it warrants its own
issue.

A cheap follow-up exists: since submission is never a legitimate occasion to
set mode, making the mode-preserving variant the *only* variant would close
both cases. That was not proposed as this CR's fix because it changes
new-session behaviour for entities *without* a custom agent (a session would
then be born in whatever mode the selector last held, instead of being forced
to Agent) — a real behavioural change that needs its own validation.

---

## QM Findings

### Round 1 (2026-07-27)

**Verdict: BLOCK**

CM's request included a complete `git log develop..HEAD --oneline` (3 commits).
Independently re-ran — matches exactly, no undisclosed commits. First review
of this CR.

**Code — verified sound.** `injectPrompt.ts` read in full. `sendPromptModeSetting`
and `sendPromptModePreserving` are two distinct private functions, correctly
differing only in which VS Code command they submit through (`chat.openAgent`
vs. plain `chat.open`, no `mode` param). `isExistingSession` is set `true` only
in branch 3a, `false`-by-default otherwise. Step 4 dispatches on it exactly as
the CD describes: `if (text) { if (isExistingSession) sendPromptModePreserving
(text); else sendPromptModeSetting(text); }`. Branch 3b's own init-prompt
submission (`sendPromptModeSetting(initPrompt)`) is untouched — matches CD's
acceptance criterion (c). Full `compile all` (all packages) clean. Independently
re-ran `npx vitest run` — 290/290 passed, 28/28 files (matches CM's claim).

**Requirements — verified sound.** `REQ_MSG_SENDPROMPT` AC-6/AC-7 and AC-2's
new scoping ("mode-setting variant (AC-6)"), `REQ_INJ_PRIMITIVE` AC-8,
`REQ_MSG_SEND` AC-7 — all read in full, wording is precise and traces cleanly
(`REQ_MSG_SEND` AC-7 → `REQ_INJ_PRIMITIVE` AC-8 → `REQ_MSG_SENDPROMPT` AC-6).
`SPEC_MSG_AGENTSESSION`'s existing/new-session sequences are correctly
updated, no stale `skipInitPrompt` references remain.

**Finding 1 — BLOCKING: `SPEC_MSG_SENDPROMPT` and `SPEC_INJ_INJECT`, the two
spec elements this very CD lists as "modified", still describe/show a
function name this same CR's own code commit renamed away.**
`SPEC_MSG_SENDPROMPT` (`docs/design/spec_msg.rst` ~line 1846) opens with
"Private async helper ``sendPromptToFocusedAgentChat``..." and includes a
"**Reference implementation (mode-setting variant, unchanged)**" code block
literally defining `async function sendPromptToFocusedAgentChat(query)`.
That function no longer exists under that name anywhere in the code — the
actual mode-setting helper is `sendPromptModeSetting`. Labeling the sample
"unchanged" is actively misleading: the surrounding prose correctly explains
there are now two variants and that "the implementation shape... is left to
implementation", but the illustrative code block was never updated or removed
once the actual shape (two separately-named functions) was known.
`SPEC_INJ_INJECT` step 3b (`docs/design/spec_inj.rst` ~line 84) has the same
issue: "...then submit via ``sendPromptToFocusedAgentChat(initPrompt)``" —
should read `sendPromptModeSetting(initPrompt)` to match the code this same
CR shipped. (Not flagging as part of this CR's required scope, but noting for
awareness: `SPEC_ENT_AGENTSESSION_INITPROMPT` in `docs/design/spec_ent.rst`
~line 198 has the identical stale reference, pre-existing and not touched by
this CD's Level 2 table.)

This is not pre-existing spec drift discovered incidentally — it is a spec
element this CR's own commit (`48b94fd`) edited, describing code this CR's own
next commit (`62f3d9e`) renamed, and the two were never reconciled. Given this
exact category ("SPEC_MSG_SENDPROMPT example uses a helper not present in
code") was already flagged once before (v0.6.0, ADV-NEW-1, deferred) and is
recurring, and given it's cheap to fix (rename in the code sample, adjust the
opening description to "two private async helpers" instead of singular),
requesting this be corrected before CLEAR.

**Finding 2 — non-blocking, recurring: no UAT scenario exercises the exact
regression this CR fixes.** Read `spec_uat_sessioninitprompt.rst` in full —
it has scenarios for new-session-via-tree-click (T-1/T-2), existing-session-
via-tree-click-with-empty-text (T-3, doesn't reach step 4 at all since #52),
and auto-delivery-to-a-deleted/new-session (T-4) — but none for
"auto-delivery/notification delivered to an **existing** session with a
**custom agent mode**", which is the exact combination that reproduces GH #54
and is the only path where step 4 runs with non-empty text against an
already-mode-set session. This is the second CR in a row (after CR #52) where
the specific fixed behavior has zero manual-verification coverage despite an
existing, actively-maintained UAT file for the same feature area. Flagging
for a decision (same non-blocking handling as CR #44/#52), but noting the
recurrence since a third instance would suggest a process gap rather than
a one-off.

**Finding 3 — non-blocking, methodology note (same as CR #52 R1):** The new
TC-6 assertions (and the updated TC-1/TC-2) are again static source-text
`toContain`/`toMatch` checks against `fs.readFileSync`'d source, not
runtime/behavioral tests invoking `injectPrompt()` with mocked `vscode`
commands and asserting which command was actually called. Already noted once;
repeating briefly since it applies again, not as a new discovery.

**Overall**: BLOCK on Finding 1 only — a quick, in-scope spec-text correction.
Everything else (code, REQ text, most SPEC text, build, tests) verified sound.
Findings 2 and 3 are non-blocking and can be addressed or deferred at PM's
discretion. Sent to PM only.

### Round 2 (2026-07-27)

**Verdict: CLEAR**

`git log develop..HEAD` re-run — 6 commits, exactly matching CM's disclosed
list (including my own Round 1 doc commit `9115282`, correctly included).

**Finding 1 (Round 1 BLOCK) — resolved cleanly.** `git show 358067f --stat`
confirms only `docs/design/spec_inj.rst` and `docs/design/spec_msg.rst` were
touched, as disclosed. Grepped both files for
`sendPromptToFocusedAgentChat|sendPromptModeSetting|sendPromptModePreserving`:
zero remaining hits for the old name in either file. `SPEC_MSG_SENDPROMPT`'s
description now reads "Two private async helpers ``sendPromptModeSetting``
and ``sendPromptModePreserving``..." and its reference code block correctly
defines `async function sendPromptModeSetting(query: string)`. `SPEC_INJ_INJECT`
step 3b now reads "...submit via ``sendPromptModeSetting(initPrompt)``". Read
both sections in full — the fix didn't just rename in place, it reads
coherently with the surrounding prose (no orphaned "unchanged" claim now that
the name matches). No mirror-image regression introduced.

Non-blocking Findings 2 (UAT gap) and 3 (test methodology) — PM decisions
noted (UAT gap accepted with automated-only coverage per CR #52 precedent;
methodology note acknowledged, no rework requested). No further action needed
this round.

**Build/tests:** Full `compile all` (all packages) — clean. Independently
re-ran `npx vitest run` — 290/290 passed, 28/28 files (unchanged from Round
1, as expected for a spec-text-only fix).

**Overall**: CLEAR. No open findings remain. Sent to PM only.
