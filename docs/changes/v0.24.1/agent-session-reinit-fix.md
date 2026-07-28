# Change Document: agent-session-reinit-fix

**Status**: ready-for-merge
**Branch**: feature/agent-session-reinit-fix
**Created**: 2026-07-27
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fix a bug where clicking an actor/project/event tree node (default command
`jarvis.openAgentSession`, `SPEC_ENT_AGENTSESSION`) re-sends the full init
prompt as a real, submitted chat message into an **already-open** session —
every single click, not just on first spawn. Root cause: `jarvis.openAgentSession`
(in `extension.ts`) unconditionally composes the init prompt text and passes it to
`injectPrompt(...)`. `injectPrompt`'s own primitive (`SPEC_INJ_INJECT`,
`packages/core/src/engine/sessions/injectPrompt.ts`) already correctly gates its
*own* internal init-prompt composition to the new-session branch (3b) only — but
its final "4. Text injection" step unconditionally sends whatever `text` the
caller supplied, regardless of whether branch 3a (existing session, just opened)
or 3b (new session, spawned) was taken. The `skipInitPrompt: true` flag the
caller passes only suppresses the primitive's own internal composition in 3b; it
does not gate step 4.

**Fix direction**: `jarvis.openAgentSession` (and the equivalent path in
`jarvis.newSession`, if it has the same duplicated composition — check) should
stop composing its own init prompt and stop passing `skipInitPrompt`. Let
`injectPrompt`'s existing 3b-only logic (already correct) own init-prompt
composition entirely. `injectPrompt`'s step 4 should skip sending when no `text`
is supplied (empty string), so existing sessions are opened/focused silently
with no message submitted. This also removes the verbatim-duplicated
`DEFAULT_INIT_PROMPT` constant from `extension.ts` (single source of truth in
`injectPrompt.ts`).

**Acceptance criteria**:
(a) clicking an existing, already-initialized session's tree node opens/focuses
it without submitting any chat message;
(b) clicking a tree node for an entity with no session yet still spawns a new
session and sends exactly one init prompt, unchanged in content/behavior from
today;
(c) no regression to `jarvis.newSession`'s own init-prompt behavior if it shares
this code path;
(d) `DEFAULT_INIT_PROMPT` exists in exactly one place;
(e) existing test suite passes; add/update tests covering both the
existing-session (no message) and new-session (one message) paths.

**GitHub Issue(s)**: #52

---

## Findings

**Root cause confirmed.** `injectPrompt` step 4 (`sendPromptToFocusedAgentChat(text)`)
was unconditional — it ran on both the existing-session branch (3a) and the
new-session branch (3b). `skipInitPrompt: true` only suppressed the primitive's
*own* composition inside 3b; it never gated step 4. Because
`jarvis.openAgentSession` passed the composed init prompt as `text`, every
re-focus of an already-open session re-submitted it as a live chat message.

**Fix.** Step 4 guards on `if (text)`; callers that only want session
open/focus pass the empty string. Init-prompt composition is now owned
exclusively by step 3b, which makes `DEFAULT_INIT_PROMPT` in
`injectPrompt.ts` the single source of truth for the tree-click paths.

### Level 1 — Requirements

| ID | Links to | Change | Rationale |
|---|---|---|---|
| REQ_ENT_AGENTSESSION | US_ENT_AGENTSESSION | modified | New AC-8: clicking the tree button on an entity with an already-open session opens/focuses it without submitting any chat message (CD acceptance criterion (a)) |
| REQ_INJ_PRIMITIVE | US_INJ_INJECT | modified | New AC-7: empty `text` opens/focuses silently. AC-5 qualified with "subject to AC-7" so the two ACs do not contradict each other |

### Level 2 — Design

| ID | Links to | Change | Rationale |
|---|---|---|---|
| SPEC_INJ_INJECT | REQ_INJ_PRIMITIVE | modified | Step 4 guarded on non-empty `text`; `options.skipInitPrompt` marked deprecated; caller-migration entry rewritten for `SPEC_ENT_AGENTSESSION` and added for `SPEC_ACT_NEWENTITY` |
| SPEC_ENT_AGENTSESSION | REQ_ENT_AGENTSESSION | modified | Handler reduced to a bare `injectPrompt(entity.name, '', { placement: 'main' })`; local init-prompt composition and `skipInitPrompt` removed; design notes re-assign prompt ownership to `SPEC_INJ_INJECT` 3b |
| SPEC_ENT_AGENTSESSION_INITPROMPT | REQ_ACT_AGENTPROMPT | modified | Call site relocated from `extension.ts` to `injectPrompt.ts` (3b branch); `DEFAULT_INIT_PROMPT` documented as living in `injectPrompt.ts` (single source of truth) |
| SPEC_ACT_NEWENTITY | REQ_ACT_NEWENTITY | modified | Step 10 no longer composes an init prompt and no longer passes `skipInitPrompt` — matches the shipped code (CD acceptance criterion (c)) |
| SPEC_CFG_MANIFEST | — | modified | Fallback note pointed at the relocated `DEFAULT_INIT_PROMPT` constant |

### Decisions

**Decision 1 — `skipInitPrompt` deprecated, not removed.**
The CR direction was to stop using it. Removing it from the signature would be
a breaking change to an internal-but-widely-linked primitive for no functional
gain, so it is retained and documented as deprecated with an explicit
"new callers SHALL NOT pass it" rule.

**Decision 2 — REQ_INJ_PRIMITIVE AC-5 amended, not just supplemented.**
Adding AC-7 alone would have left AC-5 ("the function SHALL inject `text`")
stating an unconditional obligation that AC-7 contradicts. AC-5 now carries
"subject to AC-7". This is a MECE correction, not a scope expansion.

**Decision 3 — SPEC_ACT_NEWENTITY and SPEC_CFG_MANIFEST updated although not
listed in the CR.** Both documented the old behaviour as fact
(`skipInitPrompt: true` with caller-side composition; `DEFAULT_INIT_PROMPT`
living in `extension.ts`). Leaving them would have produced a spec that
contradicts both the shipped code and the specs changed above.

### Open item resolved

`JarvisCoreApi.openActorSession()` (`packages/core/src/engine/core/coreApi.ts`)
was identified during spec review as carrying the identical bug. It has been
fixed in commit `1cae470` (same branch) — local init-prompt composition
removed, now calls `inject(entityName, '', { placement: options?.placement })`.
CD acceptance criterion (d) is met: `DEFAULT_INIT_PROMPT` exists in exactly
one place (`injectPrompt.ts`).

---

## QM Findings

### Round 1 (2026-07-27)

**Verdict: CLEAR**

CM's request included a complete `git log develop..HEAD --oneline` (5 commits).
Independently re-ran — matches exactly, no undisclosed commits. First review of
this CR.

**Code — verified sound.** All three fix sites read directly and confirmed:

- `packages/core/src/engine/sessions/injectPrompt.ts` line ~169: step 4 now
  reads `if (text) { await sendPromptToFocusedAgentChat(text); }` — correctly
  gated. Branch 3b's own init-prompt composition (gated on `!skipInitPrompt`,
  defaulting to `false`) is untouched and still the sole source of the
  new-session init prompt.
- `packages/core/src/extension.ts`: `openAgentSession` handler calls
  `injectPrompt(entity.name, '', { placement: 'main' })`; `newActor` handler
  calls `injectPrompt(nameInput, '', { placement: 'main' })`. Neither passes
  `skipInitPrompt` or composes a local template. The still-present
  `injectPrompt(actor, text)` / `injectPrompt(picked.label, text)` call sites
  (the `jarvis_injectPrompt` tool and `jarvis.injectPrompt` command) are a
  distinct, arbitrary-text-injection feature, correctly untouched by this fix.
- `packages/core/src/engine/core/coreApi.ts` line 207: `openActorSession`
  now `return inject(entityName, '', { placement: options?.placement });` —
  the CD's own "Open item for the Change Manager" is resolved by this commit
  (see finding below — the CD text itself wasn't updated to reflect this).

**Specs — verified sound and consistent with code.** `REQ_ENT_AGENTSESSION`
AC-8, `REQ_INJ_PRIMITIVE` AC-5 (qualified "subject to AC-7") and new AC-7 all
read in full — wording is precise and matches the implemented guard exactly.
`SPEC_INJ_INJECT`, `SPEC_ENT_AGENTSESSION`, `SPEC_ENT_AGENTSESSION_INITPROMPT`
spot-checked, consistent with the code.

**Finding 1 — CD's own "Open item for the Change Manager" section is now stale
(non-blocking):** That section states `coreApi.openActorSession()` "**still**"
composes a local init prompt and blocks acceptance criterion (d). This was
true when written (commit `4b6bdc6`) but was fixed by the very next commit
(`1cae470`), which did not touch this CD file. The CD currently makes a false
claim about the state of the code. Recommend marking that section resolved
(or removing it with a one-line note that `1cae470` closed it) so the CD
accurately reflects final state before merge — this is the kind of
documentation-currency drift that has bitten past CRs when left uncorrected.

**Finding 2 — no UAT coverage for the actual behavior being fixed
(non-blocking, flagged for a decision):** `REQ_ENT_AGENTSESSION` AC-8 and
`REQ_INJ_PRIMITIVE` AC-7 — the core, user-visible behavior this entire CR
exists to fix (an already-open session no longer gets spammed with a
re-submitted init prompt on every tree click) — have **zero** UAT scenario
coverage anywhere in `docs/design/`. Both affected primitives already have
dedicated UAT files (`spec_uat_injectprompt.rst` for `REQ_INJ_PRIMITIVE`;
`spec_uat_sessiontreeclick.rst` / `spec_uat_stablesessionopen.rst` for
tree-click session behavior) — grepped both for the new ACs and for
"re-inject"/"already-open"/"existing session" phrasing, no hits. CD acceptance
criterion (e) only calls for automated test coverage, which exists (see
below), but a regression this specifically about live, interactive VS Code
chat-session focus/submission behavior is exactly the category automated
tests are weakest at catching in practice. Recommend either adding a scenario
to one of the existing UAT files (e.g. "click an already-open session's tree
button twice; verify no new chat message appears") or an explicit PM decision
that automated coverage is sufficient for this fix — flagging for a decision,
not blocking on it (precedent: CR #44's testdata-fixture gap was handled the
same way).

**Finding 3 — new automated tests are static source-text pattern matches, not
behavioral tests (non-blocking, methodology note):** All 10 new assertions in
`agent-session-reinit-fix.test.ts` (TC-1..TC-5) `fs.readFileSync` the three
source files and assert via `toMatch`/`toContain` regexes against the raw
text — none actually import and invoke `injectPrompt()` with a mocked
`vscode`/scanner/session-lookup and spy on `sendPromptToFocusedAgentChat` to
assert it was/wasn't called at runtime. This gives real but weak regression
protection: a cosmetically-similar refactor could break the guard while still
matching the regex, or vice versa. Not blocking — the tests pass and I
independently verified the actual code is correct by direct reading, not by
trusting these tests — but worth a note for future test additions on this
code path: prefer a runtime/behavioral test (mock `lookupSessionUUID`
returning a UUID vs. `undefined`, spy on the injection function, assert call
counts) over text-matching the implementation.

**Build/tests:** Full `compile all` (all packages) — clean. Independently
re-ran `npx vitest run` — 285/285 passed, 28/28 files.

**Overall**: CLEAR. Code and spec changes are correct, complete, and mutually
consistent; git log fully disclosed. Three non-blocking items flagged for
PM's attention: (1) CD's own Open Item section is now factually stale and
should be corrected before merge, (2) no UAT coverage exists for the
CR's core fixed behavior — recommend a scenario or an explicit decision to
skip it, (3) new automated tests are text-pattern-based rather than
behavioral — a methodology note for future similar fixes, not a rework
request for this CR. Verdict and findings sent to PM only.
