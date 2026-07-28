# Change Document: whoami-session-id-resolution

**Status**: draft
**Branch**: feature/whoami-session-id-resolution
**Created**: 2026-07-27
**Author**: PM
**Operation Mode**: autonomous

---

## Summary

Fix a bug where `jarvis_whoAmI` intermittently resolves the wrong actor
identity, or errors with "not a registered actor", within a single,
unchanged chat session — reproduced as: correct → wrong actor → "not
registered" → correct again, across successive calls with no session
restart between them.

**Root cause**: In `packages/core/src/extension.ts`, the `jarvis_whoAmI`
tool handler resolves identity from `vscode.window.tabGroups.activeTabGroup
.activeTab.label` — i.e. from whichever editor tab currently has focus in
VS Code — not from the chat session that actually called the tool. If the
user's editor focus has moved to a different file (another actor's
`context.md`, or an unrelated file) between/during tool calls, the resolved
identity drifts to whatever that focused file implies, independent of which
session invoked the tool.

**Fix direction**: Resolve identity from the calling session's own hook
`session_id`, not from editor focus. The correlation mechanism already
exists and is proven elsewhere: `getEntityNameForSessionId(sessionId)`
(`packages/core/src/engine/sessions/sessionLookup.ts`) resolves a hook
`session_id` to an actor name via the same `state.vscdb` chat-session-store
lookup used by `lookupSessionUUID`, and is already relied on by
`activityTracker.ts` and `touchTracker.ts` for hook-driven state. The hook
bridge (`docs/design/spec_hook.rst`, `.github/hooks/bridge.mjs`) delivers
`PreToolUse`/`PostToolUse` events carrying both `session_id` and `tool_name`
in the payload — a `PreToolUse` event for `tool_name === "jarvis_whoAmI"`
carries the session_id of the actual calling session.

Open design question for System Designer/Dev Engineer to resolve (not
pre-decided by PM): the hook event arrives asynchronously over HTTP, while
the VS Code tool handler runs synchronously in-process — a correlation
strategy is needed to pair a specific `jarvis_whoAmI` invocation with its
own `PreToolUse` event (e.g. buffering the most recent matching event and
consuming it in the handler), including how to behave if no matching event
has arrived yet, or if two actors call `jarvis_whoAmI` in close succession.

**Acceptance criteria**:
(a) `jarvis_whoAmI`, called repeatedly from one unchanged chat session,
always resolves that session's own bound actor, regardless of which editor
tab currently has focus;
(b) calling `jarvis_whoAmI` from a session with no editor tab focused at
all (or focus on an unrelated file) still resolves correctly;
(c) the existing error paths (no match found → "not a registered actor")
still fire only when the calling session genuinely has no bound actor, not
as a side effect of focus;
(d) existing test suite passes; add/update tests covering session-id-based
resolution and the focus-independence property.

**GitHub Issue(s)**: #51

---

## Findings

### The open design question has a better answer than "buffer and hope"

PM framed the correlation problem as a race: the hook event arrives
asynchronously over HTTP, the tool handler runs synchronously in-process, so we
buffer the most recent event and define fallbacks for when it has not arrived.

I traced the actual delivery path and the framing is too pessimistic — **there
is a protocol-level happens-before guarantee**, and it is worth building on
explicitly rather than working around:

1. `hookIntake.ts` calls `this.hookEngine.receive(event)` **before**
   `res.end()`, and `SPEC_HOOK_ROUTE` dispatch is synchronous.
2. The bridge (`hookConfig.ts`, `BRIDGE_SOURCE`) writes `{"continue": true}`
   only from the response's `end` handler.
3. VS Code waits for a hook to complete before proceeding to the tool.

Chained: **an invocation's own `PreToolUse` event has always been dispatched to
subscribers before the tool handler runs.** Not "usually" — always, whenever
the hook fires at all.

That converts the design from "guess which event belongs to me" into "read the
value that is already there", which is a materially stronger position.

**But the guarantee was nowhere written down.** It is currently an incidental
property of three separate files, any of which could be changed by a
well-intentioned refactor. Responding to the bridge *before* dispatching is a
natural latency optimisation, and it would break `whoAmI` silently — the event
still arrives, just too late, and no intake test would notice. That is exactly
the failure mode of the v0.5.8 agent-mode fix (CR #54): a real property
recorded only where it was first used, flattened away by the next refactor. So
this CR makes the ordering normative at the listener — `REQ_HOOK_INTAKE` AC-9
and `SPEC_HOOK_INTAKE` — where it binds anyone who touches the intake path,
not only the consumer that first needed it.

### Where the guarantee does not hold, and what must happen there

Hooks disabled (`jarvis.hooks.autoInstall: false`), missing or stale
`.github/hooks/port`, transport failure, or VS Code's 10 s hook timeout — in
all of these the bridge still returns `{"continue": true}` and the tool runs
with no event delivered. A fallback is therefore genuinely required.

The fallback is **the error, not a guess** (`REQ_ACT_WHOAMI` AC-7). This is the
single most important behavioural statement in this CR, and it deserves its
rationale: focus-based resolution did not fail loudly, it failed *plausibly*.
It returned a real actor's real `context.md`. An actor acting on that answer
loads another actor's memory and proceeds under a false role, and nothing in
the result distinguishes it from a correct answer. A tool that reliably says
"ask the user" is safe; one that occasionally lies is not. Any mechanism that
would let a wrong-but-plausible answer through is therefore rejected — which
is also why the spec forbids reintroducing focus resolution *as a fallback*,
not merely as the primary mechanism.

### Why a single "most recent event" slot is not sufficient

Jarvis is explicitly a multi-actor workspace — this CR was itself dispatched
between concurrently running actor sessions. Two sessions invoking
`jarvis_whoAmI` in close succession is ordinary, not pathological. A
single-slot buffer answers one of them with the other's `session_id`: the same
silent misattribution this CR exists to remove, with a different cause. FIFO
pairing is no better — it is a probabilistic guess dressed as a rule, and when
it mis-pairs it fails plausibly again.

The chosen rule sidesteps the guess entirely: entries that **agree** on
`session_id` are unambiguous however many there are; entries that **disagree**
mean the caller is undeterminable, and undeterminable returns the error.

### Level 0 — User Stories

| ID | Change | Rationale |
|---|---|---|
| `US_ACT_WHOAMI` | modified | AC-4: the answer depends only on *which session asked*, never on what is focused; repeated calls from one session agree. AC-5: an undeterminable caller is told so rather than guessed at, stated from the actor's own perspective (adopting another actor's memory is the harm). Supplies the WHY for the new REQ ACs |

### Level 1 — Requirements

| ID | Links to | Change | Rationale |
|---|---|---|---|
| `REQ_ACT_WHOAMI` | `US_ACT_WHOAMI`; `REQ_ACT_LISTTOOL`; **`REQ_HOOK_INTAKE`** (new link) | modified | AC-1/AC-2/AC-3 de-coupled from "active tab label". AC-6: identity derives from the calling session and nothing else; focus APIs excluded as primary *and* as fallback; result invariant under focus change. AC-7: never return an unattributable identity — ambiguity and absence both yield the error. AC-8: the error is not reachable via focus. AC-9: the dependency on hook intake is explicit and degrades to the error |
| `REQ_HOOK_INTAKE` | `US_HOOK_OBSERVE` | modified | AC-9: dispatch happens-before the HTTP response, making the PreToolUse-precedes-handler ordering a contract. Explicitly notes that respond-then-dispatch must not be introduced and that AC-6 (non-blocking) is unaffected |
| `REQ_UAT_WHOAMI` | — | modified | T-4 verification rewritten from "inspect the `!activeTab` guard" (a guard that ceases to exist) to focus-independence plus inspection that no focus API is read |

### Level 2 — Design

| ID | Links to | Change | Rationale |
|---|---|---|---|
| `SPEC_ACT_WHOAMI` | `REQ_ACT_WHOAMI`; `SPEC_ACT_TOOLS`; **`SPEC_HOOK_ROUTE`**, **`SPEC_HOOK_INTAKE`** (new links) | modified | Focus heuristic struck through and normatively withdrawn with its failure analysis; resolution via `getEntityNameForSessionId()`; correlation strategy as five required properties; 4-step algorithm; single error string with cause logged not returned; `tool_name` verification warning; hook-intake dependency documented as an accepted limitation. Obsolete full handler sketch replaced by a one-line resolver contract |
| `SPEC_HOOK_INTAKE` | `REQ_HOOK_INTAKE` | modified | New "Dispatch-before-response ordering" section with the ordering diagram, the normative statement, why it is recorded at the listener, and the exact conditions under which it does not hold. New AC-6 |
| `SPEC_UAT_WHOAMI` | `REQ_UAT_WHOAMI`; … | modified | T-4 replaced: "No active tab — graceful error" tested a guard this CR deletes. New T-4 reproduces the GH #51 symptom (invoke, open another actor's `context.md`, invoke again) and requires an unchanged answer |

### Decisions

**Decision 1 — correlation by ordering, not by token.**
No shared identifier exists between `LanguageModelToolInvocationOptions`
(`toolInvocationToken` is opaque and not comparable to anything in the hook
payload) and the hook event. Correlation is therefore established through the
`SPEC_HOOK_INTAKE` happens-before guarantee, and that guarantee is promoted
from incidental behaviour to a stated contract so it cannot be optimised away.

**Decision 2 — the buffer is defined by five behavioural properties, not by a
data structure.** Filter at capture (only `jarvis_whoAmI` events); consume on
read; expire on age; disagreement is an error; absence is an error. Dev chooses
the structure. The freshness window is specified by its bounds (well above hook
round-trip, well below `whoAmI` call cadence) rather than as a constant,
because the correct value depends on measurements Dev will have and I do not.

**Decision 3 — ambiguity returns the error rather than a heuristic pick.**
Rationale above. Explicitly rejects both "most recent wins" and FIFO pairing.

**Decision 4 — no fallback identity source of any kind.**
`SPEC_ACT_WHOAMI` forbids reintroducing focus resolution even as a fallback.
Without this the fix erodes the first time someone finds `whoAmI` returning an
error in a hooks-disabled workspace and "restores" the old path as a
convenience.

**Decision 5 — one error string for all failure causes, cause written to the
log.** The actor's remedy is identical in every case (ask the user), so
branch-specific error text would give the model differences to reason about
without giving it any useful new action. Diagnosis stays possible via the
Jarvis Output Channel.

**Decision 6 — `tool_name` must be confirmed against a live payload before the
matching predicate is fixed.** Called out in the spec rather than assumed. This
exact path has already produced one silent, long-lived defect from an
unverified payload-key assumption: `HookEvent.sessionId` read `parsed.sessionId`
(camelCase) and was therefore always `undefined` (`REQ_HOOK_INTAKE` AC-8). A
wrong `tool_name` predicate fails identically — empty buffer, every call
returns the error, nothing points at the cause. The tool is reachable both as
an LM tool and over MCP, so more than one form may occur.

**Decision 7 — the ordering guarantee is recorded at the intake listener, not
at `whoAmI`.** Deliberately mirrors the CR #53 reasoning. Note that in CR #53 I
declined to generalise the correlation mechanism itself into its own spec
element, because no second consumer is known — generalising there would have
been speculative. The distinction: #51 promotes an *existing shared property of
a shared component* to a contract; it does not build an abstraction for a
hypothetical second user.

### Flagged for the Change Manager — not resolved here

1. **`SPEC_ACT_WHOAMI` `:status:` is `draft` while the tool ships.** Left
   as-is; status hygiene across `spec_act.rst` is outside this CR.

2. **Configuration mismatch is silent.** With `jarvis.sessions.enabled: true`
   and `jarvis.hooks.autoInstall: false`, `jarvis_whoAmI` is registered and
   always errors. The spec documents this as an accepted limitation. Whether
   Jarvis should warn the user (or gate registration on hook intake too) is a
   product decision for PM, not a spec fix — flagged, not decided.

3. **UAT scope.** I replaced T-4 because it verified a guard this CR deletes —
   leaving it would have put a knowingly false scenario in the test protocol.
   I did **not** redesign the wider UAT set. `US_UAT_WHOAMI` / `REQ_UAT_WHOAMI`
   / `SPEC_UAT_WHOAMI` still frame T-1/T-2 preconditions around the session
   being the "active tab" — no longer false, but no longer load-bearing either,
   and the suite has no scenario for the concurrent-callers ambiguity path
   (`SPEC_ACT_WHOAMI` AC-8) or the hooks-disabled degradation. That is Test
   Designer's lane; recommend dispatching it.

## QM Findings

### Round 1 (2026-07-27)

**Verdict: CLEAR**

`git log develop..HEAD` — 3 commits, exactly matching CM's disclosed list and
order (CD → spec → code).

**Root cause and fix — verified correct.** Read the full `jarvis_whoAmI`
handler in `packages/core/src/extension.ts`: the correlation buffer filters on
`PreToolUse` events where `tool_name` (checked via `endsWith`) matches, is
drained via `splice(0)` on read (consume-on-read), filters by
`WHOAMI_FRESHNESS_MS` (10s, expire-on-age), returns `undefined` on
`uniqueIds.size > 1` (ambiguity-is-error, no tie-break) or empty fresh set
(absence-is-error) — all five behavioural properties from `SPEC_ACT_WHOAMI`
implemented exactly as specified. `getEntityNameForSessionId` is the same
import already used by `activityTracker.ts`/`touchTracker.ts`, confirmed via
grep — no new lookup path introduced, as the CD claimed. Grepped the whole
file for `activeTab|tabGroups|activeTextEditor`: the only remaining hits are
in unrelated tab-management code (session-tab reuse, lines ~200-342), not in
the whoAmI handler — the focus APIs are fully removed from this handler
specifically, matching the CD's precise (not workspace-wide) claim.

**Happens-before guarantee — traced and confirmed, not just asserted.**
Read `hookIntake.ts`: `this.hookEngine.receive(event)` is called before
`res.writeHead`/`res.end`, confirming the CD's step 1 claim directly in code
(not just taking the CD's word for it). `parsed.session_id` (snake_case) is
read correctly into `HookEvent.sessionId` — confirms the prior AC-8 bug
(camelCase `parsed.sessionId`, referenced in this CD as a cautionary
precedent) stays fixed and wasn't reintroduced.

**Specs — read in full, all trace cleanly and match code exactly.**
`US_ACT_WHOAMI` AC-4/AC-5, `REQ_ACT_WHOAMI` AC-6/AC-7/AC-8/AC-9,
`REQ_HOOK_INTAKE` AC-9, `SPEC_ACT_WHOAMI` (full calling-session-resolution
section, 5 buffer properties, 4-step algorithm, AC-4/AC-7/AC-8/AC-9),
`SPEC_HOOK_INTAKE` (new "Dispatch-before-response ordering" section + AC-6)
all read verbatim — wording is precise, WHY→WHAT→HOW chain genuinely
connects, and every AC's stated behaviour matches what the code does line for
line. `package.json`'s `languageModelTools` entry for `jarvis_whoAmI` matches
the spec's code block exactly. `SPEC_UAT_WHOAMI` T-4 read in full — correctly
replaced: reproduces the exact GH #51 symptom (invoke → open another actor's
`context.md` → invoke again → unrelated file → invoke again, same answer
every time), traces to `REQ_ACT_WHOAMI` AC-6/AC-8, `US_ACT_WHOAMI` AC-4,
`SPEC_ACT_WHOAMI` AC-4/AC-7 — no longer verifies the deleted `!activeTab`
guard.

**UAT tailoring — noted, not evaluated as a finding, per instruction.** CM's
review request stated this bug-fix CR's Test Designer/UAT-chain dispatch is
tailored out and that QM should not flag the absence of UAT as a finding.
The CD's own "Flagged for the Change Manager" item 3 independently recommends
dispatching Test Designer for the wider UAT redesign (concurrent-ambiguity
path, hooks-disabled degradation) — consistent with, not contradicted by, the
tailoring note. Honoring the instruction: not raised as a finding this round.

**Tests — same recurring methodology note, not a new finding.**
`whoami-session-id-resolution.test.ts` read in full (TC-1..TC-5, 15
assertions) — all are static source-text pattern matching against
`extensionSrc`/`whoAmISection` slices (`toContain`/`toMatch`/`not.toContain`),
not behavioral tests invoking the handler with a mocked `hookEngine`/VS Code
API. This is the same methodology already noted for CR #52/#54/#53 — recorded
here for completeness, not raised again as a fresh or blocking item.

**Build/tests:** Full `compile all` — clean. Independently re-ran
`npx vitest run` — 313/313 passed, 30/30 files (matches CM's claim).

**Overall**: CLEAR. Code, requirements, and design specs are correct,
complete, and mutually consistent; the CD's central technical claim (the
happens-before ordering guarantee) was independently verified in code, not
just trusted. No blocking issues. Two items already flagged by the CD to CM
(spec status hygiene, silent hooks-disabled/sessions-enabled mismatch) are
PM/CM-lane product decisions, not QM findings — left as the CD recorded them.
Sent to PM only.

