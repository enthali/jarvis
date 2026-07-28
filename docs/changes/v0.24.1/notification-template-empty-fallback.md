# Change Document: notification-template-empty-fallback

**Status**: draft
**Branch**: feature/notification-template-empty-fallback
**Created**: 2026-07-28
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fix a bug where a message is marked `notified: true` even though no chat
command was ever issued, if `jarvis.messages.notificationTemplate` resolves
to an empty string. The message is silently lost with zero error, warning,
or log signal.

**Root cause**: `jarvis.messages.notificationTemplate` can hold an explicit
empty string (`""`) at the VS Code User-settings scope. VS Code's Settings UI
persists `""` the moment a text field is touched and cleared — only "Reset
Setting" (gear icon) removes the key and restores the package.json-declared
default. In `packages/core/src/extension.ts`, both the `jarvis.sendMessages`
command (~line 589) and the auto-delivery poll loop (~line 1444) compute
`const stub = applyTemplate(cfg.get<string>('messages.notificationTemplate', ''), {...})`
and pass it to `injectPrompt(destination, stub, {...})`. In
`packages/core/src/engine/sessions/injectPrompt.ts`, delivery of this text
(step 4, both the `sendPromptModeSetting`/`sendPromptModePreserving` variants)
is guarded by `if (text)` — introduced in CR #52 to skip delivery when there
is genuinely nothing to say. When `stub` is `''`, this guard causes step 4 to
be skipped entirely: no chat command runs, no exception is thrown, no log
entry is written. Both call sites in `extension.ts` then unconditionally mark
the message `notified: true` afterward, regardless of whether `injectPrompt`
actually delivered anything.

Confirmed via live A/B testing (Research spike, branch
`research-message-delivery-noop`, not merged): empty template → silent
failure; restoring a non-empty template → full `UserPromptSubmit` hook trace
confirms real delivery. This is unrelated to CR #54 (the
`sendPromptModeSetting`/`sendPromptModePreserving` mode-handling split) —
that logic is correct and is simply never reached, since the empty-text
short-circuit fires first regardless of which variant is called.

**Contributing factor**: The init-prompt path (`sendPromptModeSetting`,
new-session branch) has a hardcoded `DEFAULT_INIT_PROMPT` fallback
(`injectPrompt.ts` line 43, applied when `rawInitTemplate.trim()` is empty),
so newly-spawned sessions still receive a real chat turn even with an empty
template. The notification-template path has no equivalent fallback, despite
the setting's package.json description implying a built-in default applies
when empty. This asymmetry makes new sessions look healthy while existing
sessions appear completely broken — it misdirected the initial investigation
toward the existing-session code path rather than the shared, upstream
empty-string cause.

**Fix direction**:
(a) Add a built-in `DEFAULT_NOTIFICATION` fallback in `injectPrompt.ts`,
applied whenever the resolved notification text is empty or whitespace-only,
symmetric to the existing `DEFAULT_INIT_PROMPT` handling for the init-prompt
path. Both `extension.ts` call sites must use this fallback so `text` passed
into `injectPrompt` is never empty by construction.
(b) `injectPrompt` must not silently treat empty `text` as success — if the
resolved text is still empty after the fallback (defensive; should not
normally occur), log a clear failure/warning rather than the current silent
no-op.

**Explicitly out of scope**: gating `notified: true` on confirmed delivery.
Without a bounded retry/backoff/dead-letter design, that would turn any
delivery failure (not just this one) into an infinite re-injection loop
instead of a silent drop — trading one bug for a worse one. This is a
separate, larger design question, not part of this fix.

**Acceptance criteria**:
(a) an empty or whitespace-only `jarvis.messages.notificationTemplate`
results in the built-in default notification text actually being submitted
to chat, for both `jarvis.sendMessages` and the auto-delivery poll loop;
(b) a message is never marked `notified: true` without a chat submission
having actually been attempted with non-empty text;
(c) `injectPrompt` logs a clear warning/error if it is ever asked to deliver
empty text (defensive path, should not occur after (a));
(d) existing behavior for non-empty templates, the init-prompt path, and the
`sendPromptModeSetting`/`sendPromptModePreserving` mode-handling split (CR
#54) is unchanged;
(e) existing test suite passes; add unit tests covering: empty/whitespace
template resolves to the built-in default (not an empty string), and
`injectPrompt` does not silently succeed on empty text.

**GitHub Issue(s)**: #56

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| US_MSG_NOTIFICATION_TEMPLATE | Configurable Auto-Delivery Notification Template | modified | AC-2/AC-5 already promised the empty→default fallback; the promise was never kept on the notification path. New AC-6 (how the setting became empty is irrelevant) and AC-7 (a non-submitted notification is never silent). Status `implemented` → `draft`, plus link to US_INJ_INJECT (the story depends on the primitive's delivery contract). |
| US_INJ_INJECT | Prompt Injection Primitive | modified | New AC-7: injecting nothing is a legitimate outcome, but never an invisible one. Parent for the observability requirement on the primitive. |

### New User Stories

None. This CR restores behaviour that US_MSG_NOTIFICATION_TEMPLATE AC-2/AC-5
already promised and adds the observability property that would have made the
gap self-reporting. Neither justifies a new story — a new story here would
duplicate an existing one and create the first MECE overlap at Level 0.

### Decisions

- **D0.1 — No new User Story.** The defect is a non-conformance to an existing
  story, not a missing capability. The story text needed sharpening (AC-6),
  not replacing.
- **D0.2 — AC-6 is written from the user's viewpoint, not the API's.** The
  distinction that caused the bug (setting key absent vs. persisted `""`) is
  invisible in the Settings UI. Stating it as a user-facing equivalence
  requirement — "both look identical to me, so they must behave identically" —
  keeps the *why* at Level 0 and the VS Code mechanics at Level 1/2 where they
  belong.
- **D0.3 — AC-7 is scoped to observability, not to delivery guarantees.** "A
  notification that is never submitted is never silent" is satisfiable within
  this CR. "A message is never lost" is not, and would be an unfundable
  promise at Level 0 while the CD explicitly defers delivery gating.
- **D0.4 — Status `implemented` → `draft` for US_MSG_NOTIFICATION_TEMPLATE.**
  The element now carries acceptance criteria that are not implemented.
  Leaving it at `implemented` would assert something untrue about the code.

### Horizontal Check (MECE)

- [x] No contradictions with existing User Stories — US_MSG_AUTODELIVERY (the
      notified-flag story) is untouched; nothing in this CR claims delivery is
      confirmed, so the two stories stay disjoint.
- [x] No redundancies — the empty-template case lives in exactly one story
      (US_MSG_NOTIFICATION_TEMPLATE); the empty-payload case lives in exactly
      one story (US_INJ_INJECT). Configuration display semantics stay in the
      CFG/Design layer and are not restated as a story.
- [x] Gaps identified and addressed — the gap was that no story said what
      happens when a delivery submits nothing. US_INJ_INJECT AC-7 closes it.

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

Found via links from the User Stories above (US_MSG_NOTIFICATION_TEMPLATE →
REQ_MSG_NOTIFICATION_TEMPLATE, REQ_MSG_SEND, REQ_MSG_AUTODELIVER_POLL;
US_INJ_INJECT → REQ_INJ_PRIMITIVE, REQ_INJ_TOOL, REQ_INJ_COMMAND).

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| REQ_MSG_NOTIFICATION_TEMPLATE | US_MSG_NOTIFICATION_TEMPLATE | modified | AC-8 (fallback must be in code, `package.json` default is display-only), AC-9 (one constant, one resolution helper), AC-10 (text handed to the primitive is non-empty by construction; defensive warning). Status → `draft`; links += REQ_INJ_PRIMITIVE. |
| REQ_INJ_PRIMITIVE | US_INJ_INJECT | modified | AC-7 reworded: emptiness evaluated after trimming, and the word "silently" removed — it was the defect, written into the requirement. New AC-9: skipped submissions are logged, explicitly *not* as a warning. |
| REQ_MSG_AUTODELIVER_POLL | US_MSG_AUTODELIVERY | modified | AC-4 amended: `notified: true` records "attempted", not "confirmed"; that is only defensible because AC-10 makes the submitted text non-empty. The out-of-scope decision on delivery gating is recorded normatively rather than only in this CD. |
| REQ_MSG_SEND | US_MSG_CHATQUEUE | unchanged | Already delegates composition to REQ_MSG_NOTIFICATION_TEMPLATE (AC-3) and delivery to REQ_INJ_PRIMITIVE (AC-2). Both now carry the fix; restating it here would duplicate. |
| REQ_MSG_AUTODELIVER_TAG | US_MSG_AUTODELIVERY | unchanged | Describes the `notified` field's data semantics only. The when-to-set question belongs to REQ_MSG_AUTODELIVER_POLL AC-4 and is amended there. |
| REQ_ENT_AGENTPROMPT_TEMPLATE | US_ENT_AGENTSESSION_PROMPT | unchanged | The init-prompt fallback is the working reference pattern; deliberately not touched (CD acceptance (d)). |
| REQ_INJ_TOOL / REQ_INJ_COMMAND | US_INJ_INJECT | unchanged | Both delegate to REQ_INJ_PRIMITIVE; they inherit AC-7/AC-9 without restatement. |

### New Requirements

None. Every needed obligation attached to an existing requirement. Creating a
"notification fallback" requirement separate from REQ_MSG_NOTIFICATION_TEMPLATE
would split one setting's behaviour across two elements — the exact split that
let the fallback go missing on one path while existing on the other.

### Conflicts Detected

- ⚠️ **REQ_INJ_PRIMITIVE AC-7 vs. CD fix direction (b).** The CD asks
  `injectPrompt` to "log a clear warning/error" on empty text. But AC-7 (from
  GH #52) makes empty text a *legitimate* contract used by
  `jarvis.openAgentSession` and `jarvis.newSession` on every open. A warning
  there would fire during ordinary operation.
  - **Resolution:** split by who knows the *intent*. The primitive logs the
    skip at `info` (REQ_INJ_PRIMITIVE AC-9) — enough to diagnose, not enough
    to cry wolf. The *warning* moves one layer up to the notification
    resolution helper (REQ_MSG_NOTIFICATION_TEMPLATE AC-10), which is only
    reached when the caller genuinely intended to deliver a notification. This
    satisfies the CD's intent (c) — "logs a clear warning/error if it is ever
    asked to deliver empty text" — at the only place where "asked to deliver"
    is knowable. Flagged to PM/CM as a deviation from the literal wording, with
    this rationale.
- ⚠️ **REQ_MSG_NOTIFICATION_TEMPLATE AC-1 vs. SPEC_CFG_MANIFEST.** AC-1 already
  required the fallback, and SPEC_CFG_MANIFEST asserted a
  notification-template constant existed "in `extension.ts`". No such constant
  ever existed. The requirement was conformant on paper and unimplemented in
  fact for the entire life of the feature.
  - **Resolution:** AC-8 now states *where* the fallback must live and why the
    `package.json` default cannot serve as one; SPEC_CFG_MANIFEST's note is
    corrected and explicitly records the false claim so it is not re-derived
    from git history as a regression.

### Decisions

- **D1.1 — The `package.json` default is display-only, normatively.** Stated as
  AC-8 rather than left as design trivia. A persisted `""` shadows the declared
  default, and `get(key, '')` does not fire because the key *exists*. Any future
  string setting with a "leave empty for the built-in default" description has
  the same trap; writing it at requirement level makes it findable.
- **D1.2 — One constant, one resolution helper (AC-9).** The defect's real
  shape is a duplicated concept implemented once. Requiring a single
  resolution point makes the asymmetry structurally impossible rather than
  merely fixed.
- **D1.3 — Non-empty by construction (AC-10), not by guard.** The alternative —
  hardening the primitive's guard into an error — was rejected: it would break
  the open/focus-only contract that GH #52 introduced for good reasons, and it
  would place the fix at the layer that had no defect.
- **D1.4 — `notified: true` stays unconditional (AC-4 amendment).** Adopted
  from the CD's out-of-scope section, but recorded *in the requirement*. The
  reason ("without bounded retry, gating converts a silent drop into an
  unbounded re-injection loop") is precisely the kind of rationale that gets
  lost and then re-litigated as a bug report; it now sits next to the criterion
  it constrains.
- **D1.5 — Trim-based emptiness in AC-7.** Previously the template layer
  treated whitespace-only as empty while the primitive treated it as
  deliverable. Two definitions of "empty" on one path is how the gap survived;
  the CR collapses them to one.

### Horizontal Check (MECE)

- [x] No contradictions with existing Requirements — REQ_INJ_PRIMITIVE AC-7
      keeps the GH #52 contract intact (empty is not an error); AC-9 only adds
      observability. REQ_MSG_SENDPROMPT AC-6 / REQ_INJ_PRIMITIVE AC-8 (the
      GH #54 mode-preservation split) are untouched, satisfying CD acceptance (d).
- [x] No redundancies — the fallback rule appears once (AC-1/AC-8/AC-9), the
      non-emptiness obligation once (AC-10), the log obligation once (AC-9 of
      REQ_INJ_PRIMITIVE). REQ_MSG_SEND and REQ_MSG_AUTODELIVER_POLL reference
      rather than restate.
- [x] All new/changed ACs trace to a User Story AC — AC-8/AC-9/AC-10 →
      US_MSG_NOTIFICATION_TEMPLATE AC-2/AC-5/AC-6; REQ_INJ_PRIMITIVE AC-9 →
      US_INJ_INJECT AC-7; REQ_MSG_AUTODELIVER_POLL AC-4 →
      US_MSG_NOTIFICATION_TEMPLATE AC-7.

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

Found via links from the Requirements above.

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| SPEC_MSG_SENDCOMMAND | REQ_MSG_SEND, REQ_MSG_NOTIFICATION_TEMPLATE | modified | Stub composition switched from `applyTemplate(cfg.get(...))` to `resolveNotificationText(...)`; links += SPEC_MSG_NOTIFICATION_RESOLVE. Incidental correction: the "built-in default after substitution" example still showed the pre-`message-api-rename` text (`jarvis_readMessage`, wrong line order), contradicting REQ_MSG_NOTIFICATION_TEMPLATE AC-7 — corrected while rewriting the block. |
| SPEC_MSG_AUTODELIVER_POLL | REQ_MSG_AUTODELIVER_POLL | modified | Same composition switch; new design note tying the unconditional `notified: true` marking to the non-emptiness guarantee. |
| SPEC_INJ_INJECT | REQ_INJ_PRIMITIVE | modified | Step 4: trim-based emptiness, the `info`-level log line with its level rationale, and a note stating explicitly that this step is *not* the fix — the guard was correct; the caller was wrong. |
| SPEC_CFG_MANIFEST | REQ_MSG_NOTIFICATION_TEMPLATE | modified | Note corrected (the claimed `extension.ts` constant never existed) and extended with the shadowing mechanics; links += SPEC_MSG_NOTIFICATION_RESOLVE. Status left at `implemented` — the `package.json` manifest itself is unchanged by this CR; only its explanatory note was wrong. |
| SPEC_ENT_AGENTSESSION_INITPROMPT | REQ_ENT_AGENTPROMPT_TEMPLATE | modified (doc-only) | Cross-reference to the now-symmetric notification constant. No behavioural change — CD acceptance (d) preserved. |
| SPEC_MSG_SENDPROMPT | REQ_MSG_SENDPROMPT | unchanged | The GH #54 variant split is downstream of the guard and never reached in the defect. Confirmed untouched. |

### New Design Elements

| ID | Title | Links |
|----|-------|-------|
| SPEC_MSG_NOTIFICATION_RESOLVE | Notification Text Resolution | REQ_MSG_NOTIFICATION_TEMPLATE, REQ_INJ_PRIMITIVE, SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL, SPEC_INJ_INJECT, SPEC_CFG_MANIFEST |

Contains the `DEFAULT_NOTIFICATION` constant (verbatim, pinned against the
`package.json` default), the `resolveNotificationText` helper, the trim-based
fallback rule, the defensive warning, and the full failure analysis of GH #56.

### Conflicts Detected

- ⚠️ **Where does `DEFAULT_NOTIFICATION` live — `extension.ts` or
  `injectPrompt.ts`?** SPEC_CFG_MANIFEST claimed `extension.ts`; the two call
  sites are in `extension.ts`; the symmetric `DEFAULT_INIT_PROMPT` lives in
  `injectPrompt.ts` (moved there by the `agent-session-reinit-fix` CR to make
  it a single source of truth).
  - **Resolution:** `injectPrompt.ts`, per the CD's "symmetric to
    `DEFAULT_INIT_PROMPT`". Co-locating the two constants is the point: the
    next reader of either one sees both, which is exactly what did not happen
    when the notification fallback was omitted. `extension.ts` is already the
    dumping ground for both call sites; adding the constant there would place
    the two halves of one concept in two files again.
- ⚠️ **Does `resolveNotificationText` read the setting itself?** Reading
  `vscode.workspace.getConfiguration` inside the helper would make both call
  sites shorter.
  - **Resolution:** no — the raw value is passed in. AC-6 (read per delivery,
    uncached) is satisfied either way, but taking the string as a parameter
    keeps the helper unit-testable without a VS Code configuration host, which
    CD acceptance (e) requires. The call sites keep their `cfg.get(...)`.

### Decisions

- **D2.1 — A dedicated design element, not another paragraph in
  SPEC_MSG_SENDCOMMAND.** The template logic previously existed only as
  duplicated prose inside the two call-site specs. That is the design-level
  mirror of the code defect: one concept, two homes, and a fallback that made
  it into neither. SPEC_MSG_NOTIFICATION_RESOLVE gives it one home that both
  call sites reference.
- **D2.2 — `info`, not `warn`, for the skipped submission.** Rationale is
  written into the spec, not just here: a warning that fires on a normal path
  gets filtered out by readers, which is the same blindness that let GH #56
  run undetected. A log level chosen for volume rather than for meaning is a
  design decision and is documented as one.
- **D2.3 — The failure analysis stays in the spec, not only in this CD.** Two
  properties were load-bearing and undocumented: that the `package.json`
  default does not survive an explicit `""`, and that the init-prompt path's
  fallback masks the notification path's absence of one. Both are now in
  SPEC_CFG_MANIFEST and SPEC_ENT_AGENTSESSION_INITPROMPT respectively, so the
  next change touching either sees them without reading change history.
- **D2.4 — SPEC_INJ_INJECT records what the CR does *not* change.** An explicit
  note that step 4's guard was correct prevents a future reader from "fixing"
  it into an error and silently re-breaking the GH #52 open/focus-only contract.

### Horizontal Check (MECE)

- [x] No contradictions with existing Designs — SPEC_MSG_SENDPROMPT (GH #54)
      and SPEC_ENT_AGENTSESSION_INITPROMPT behaviour unchanged; the new element
      sits strictly upstream of `injectPrompt` and does not touch placement,
      focus-restore, or mode handling.
- [x] All new SPECs link to Requirements — SPEC_MSG_NOTIFICATION_RESOLVE links
      REQ_MSG_NOTIFICATION_TEMPLATE and REQ_INJ_PRIMITIVE.
- [x] No overlap between SPEC_MSG_NOTIFICATION_RESOLVE and SPEC_INJ_INJECT —
      the boundary is intent: composition and the delivery-intent warning
      upstream, submission and the intent-free skip log downstream.

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_MSG_NOTIFICATION_TEMPLATE (AC-1…AC-5) | REQ_MSG_NOTIFICATION_TEMPLATE AC-1…AC-7 | SPEC_MSG_NOTIFICATION_RESOLVE, SPEC_MSG_SENDCOMMAND, SPEC_MSG_AUTODELIVER_POLL, SPEC_CFG_MANIFEST | ✅ |
| US_MSG_NOTIFICATION_TEMPLATE AC-6 (empty is empty, however it got there) | REQ_MSG_NOTIFICATION_TEMPLATE AC-8, AC-9 | SPEC_MSG_NOTIFICATION_RESOLVE, SPEC_CFG_MANIFEST | ✅ |
| US_MSG_NOTIFICATION_TEMPLATE AC-7 (never silent) | REQ_MSG_NOTIFICATION_TEMPLATE AC-10, REQ_MSG_AUTODELIVER_POLL AC-4, REQ_INJ_PRIMITIVE AC-9 | SPEC_MSG_NOTIFICATION_RESOLVE, SPEC_MSG_AUTODELIVER_POLL, SPEC_INJ_INJECT | ✅ |
| US_INJ_INJECT AC-7 (no invisible no-op) | REQ_INJ_PRIMITIVE AC-7, AC-9 | SPEC_INJ_INJECT step 4 | ✅ |

Sphinx build (`python -m sphinx -b html docs docs/_build/html -W --keep-going`):
**succeeded, zero warnings** — all `:links:` targets resolve, no dangling IDs.

**CD acceptance criteria coverage:**

| CD AC | Covered by |
|-------|-----------|
| (a) empty/whitespace template → built-in default submitted, both paths | REQ_MSG_NOTIFICATION_TEMPLATE AC-1/AC-8/AC-9; SPEC_MSG_NOTIFICATION_RESOLVE; SPEC_MSG_SENDCOMMAND; SPEC_MSG_AUTODELIVER_POLL |
| (b) never `notified: true` without a non-empty submission attempt | REQ_MSG_NOTIFICATION_TEMPLATE AC-10; REQ_MSG_AUTODELIVER_POLL AC-4 |
| (c) clear warning/error when asked to deliver empty text | REQ_MSG_NOTIFICATION_TEMPLATE AC-10 (warning, delivery intent known) + REQ_INJ_PRIMITIVE AC-9 (info, intent unknown) — see the Level 1 conflict resolution for why it is split |
| (d) non-empty templates, init prompt, GH #54 split unchanged | REQ_ENT_AGENTPROMPT_TEMPLATE / SPEC_ENT_AGENTSESSION_INITPROMPT and SPEC_MSG_SENDPROMPT explicitly listed as unchanged |
| (e) unit tests | Not specified at design level — see "Issues Found" #3 (Test Designer's scope). D2 note: `resolveNotificationText` takes the raw string as a parameter specifically so this is testable without a VS Code host. |

### Artefakt-Removal-Check

This CR removes no artefact (no file, field, configuration key, or ID is
deleted). One *false* claim was removed from prose — SPEC_CFG_MANIFEST's
reference to a notification-template constant "in `extension.ts`" — but the
artefact never existed, so there is nothing to grep for. The corrected note
records the removal in place, so a reader comparing against git history does
not mistake it for a deleted constant.

- [x] No artefacts removed — check not applicable
- [x] Stale prose reference corrected in place, with the correction disclosed
      in the spec text itself

### Issues Found

- [x] **Issue 1 — Deviation from CD fix direction (b), for PM/CM awareness.**
      The CD asks `injectPrompt` to log a *warning* on empty text. Specified as
      `info` at the primitive plus a `warning` at the notification resolver.
      Rationale in the Level 1 conflict resolution: empty text is a legitimate,
      frequent contract at the primitive (GH #52), so a warning there is a
      false alarm on every session open. The CD's *intent* — never silent, and
      loud where delivery was intended — is fully met. Raised rather than
      silently implemented, per escalation discipline.
- [x] **Issue 2 — Spec status hygiene (recurring, already flagged in CR #51).**
      `REQ_MSG_NOTIFICATION_TEMPLATE` and `US_MSG_NOTIFICATION_TEMPLATE` were
      marked `implemented` while a documented acceptance criterion (AC-1, the
      fallback) had never been implemented on the notification path. `status`
      is currently asserted by hand with no mechanical check against code or
      tests. This CR sets both to `draft`; the general problem — that
      `implemented` carries no evidence — is outside a bug-fix CR's scope and
      belongs to CM.
- [x] **Issue 3 — Test coverage design not specified here.** CD acceptance (e)
      requires unit tests (empty/whitespace template → default; `injectPrompt`
      does not silently succeed on empty text). No UAT-level spec elements were
      created — the existing UAT family for this area
      (`us_uat_agent_prompt_tuning` / `req_uat_agent_prompt_tuning`) covers the
      template settings and would need extension. Handed to the Test Designer
      via CM rather than pre-empted here.
- [x] **Issue 4 — `applyTemplate` is duplicated (observation, not fixed).**
      It exists as a module-private copy in both `extension.ts` and
      `injectPrompt.ts`, while SPEC_ENT_AGENTSESSION_INITPROMPT describes it as
      "the shared helper". Harmless today (the two copies are identical) and
      out of scope, but it is the same one-concept-two-homes pattern that
      produced this defect. Recorded for a future cleanup CR.

### Sign-off

- [x] All levels completed (no ⚠️ DEPRECATED markers remaining)
- [x] All conflicts resolved (2 at Level 1, 2 at Level 2 — each with a recorded
      resolution and rationale)
- [x] Traceability verified (Sphinx `-W` build clean; all four US→REQ→SPEC
      chains complete)
- [x] Ready for implementation


---

## QM Findings

*QM writes findings directly into this section after each review round. PM records
decisions (fix-now / defer / accept-as-is) with rationale in the same section.
Multiple review rounds are appended as sub-sections. Existing CDs without this
section are unaffected — the section is additive, never required retroactively.*

### Round 1

**Reviewed by:** QM
**Review date:** 2026-07-28

#### Findings

| # | Level | Element ID | Finding | Severity |
|---|-------|------------|---------|----------|
| 1 | Process | — | `git log develop..HEAD` shows 4 commits, not the 2 disclosed by CM (`8ea8900`, `49eda09`). Two undisclosed: `8685c09` ("rebuild CD as literal template copy; add npm run new-change scaffold" — created this CD file, added `scripts/new-change.mjs`, one `package.json` script entry, PM memory) and `a7ca148` ("allow actor memory commits directly to develop on non-mergeable branches" — touches only `.github/agents/syspilot.pm.tailoring.md`). Both independently confirmed benign and outside this CR's functional scope (`git show --stat` on each) — no risk to this verdict — but this is a recurrence of the undisclosed-commit pattern previously flagged and considered resolved after CR #46 R7–R9. | low |
| 2 | L2/UAT | SPEC_UAT_APT (T-10) | `spec_uat_agent_prompt_tuning.rst` T-10 ("notification empty → fallback") already specifies exactly the behavior this CR restores, and predates this CR (unmodified by it) — meaning the correct expected behavior was on record before GH #56 was ever filed. Two scoped gaps remain, consistent with the CD's own Issue 3 (Test Designer handoff, not resolved here): T-10 exercises only the manual deliver-now path, not the auto-delivery poll loop (T-8's counterpart is untested for the empty-fallback case); and no scenario exercises AC-6 (Settings-UI-persisted `""` vs. key-absent, the actual GH #56 trigger mechanism) or AC-7 (the log-diagnosability guarantee). | low (non-blocking, matches CD's own Issue 3) |

**Independent verification (code, specs, tests, build):**

Read the full CD (Level 0/1/2, all 7+7 decisions, all 6 conflicts, all 4 issues) — thorough and well-reasoned; the log-level split (`info` at the primitive, `warn` at the resolver) is correctly justified and correctly implemented. Read `injectPrompt.ts` in full: `DEFAULT_NOTIFICATION` co-located with `DEFAULT_INIT_PROMPT` as specified; `resolveNotificationText` trims, falls back, applies substitution, and warns only on the defensive (should-not-occur) empty-after-fallback path; step 4's guard is `if (text.trim())` with an `info`-level skip log. Both `extension.ts` call sites (`jarvis.sendMessages` ~L589, auto-delivery poll ~L1445) confirmed via direct read to call `resolveNotificationText` (not raw `applyTemplate`), and `notified: true` is still set unconditionally afterward — matches AC-4's amendment (safe now that the stub is non-empty by construction).

Read in full and cross-checked against code: `US_MSG_NOTIFICATION_TEMPLATE` AC-6/7, `US_INJ_INJECT` AC-7, `REQ_MSG_NOTIFICATION_TEMPLATE` AC-8/9/10, `REQ_INJ_PRIMITIVE` AC-7/9, `REQ_MSG_AUTODELIVER_POLL` AC-4, `SPEC_MSG_NOTIFICATION_RESOLVE` (new), `SPEC_MSG_SENDCOMMAND`, `SPEC_MSG_AUTODELIVER_POLL`, `SPEC_INJ_INJECT` step 4, `SPEC_CFG_MANIFEST`'s corrected note — all trace cleanly and match the code and each other exactly, including the corrected (previously false) `SPEC_CFG_MANIFEST` claim about an `extension.ts` constant.

Tests: `notification-template-empty-fallback.test.ts` (10 assertions) read in full — a genuine improvement over recent CRs' methodology: its first `describe` block imports and calls the real exported `resolveNotificationText`/`DEFAULT_NOTIFICATION` directly (including pinning the constant against `package.json`'s declared default), which is real behavioral testing, not just source-text matching. The remaining two blocks (call-site wiring, step-4 guard pattern) are static text matching — reasonable given `extension.ts`'s VS Code-runtime coupling. `msg-notify-default-text.test.ts` and `agent-session-reinit-fix.test.ts` correctly updated to match the new architecture (confirmed via grep, no stale references to the old inline `applyTemplate` pattern).

Full `compile all` — clean. Independently re-ran `npx vitest run` — 323/323 passed, 31/31 files (matches CM's/Dev's claim).

**Overall: CLEAR.** No blocking issues. Two low-severity, non-blocking items recorded above for PM: the disclosure-practice recurrence, and the scoped UAT-coverage gap (which the CD itself already flagged and handed to Test Designer via CM in Issue 3 — QM's finding here only sharpens *which* two properties are still uncovered, it does not introduce a new ask).

#### PM Decisions

| # | Finding # | Decision | Rationale |
|---|-----------|----------|-----------|
| 1 | | | |
| 2 | | | |

---

## Appendix: Link Discovery Results

```
{paste output from get_need_links.py as needed}
```

---

*Generated by syspilot Change Agent*
