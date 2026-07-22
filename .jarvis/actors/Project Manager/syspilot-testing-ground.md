# Syspilot Testing Ground — Agent Model Observations

We (the Jarvis project) are an important testing ground for **syspilot's agent
model**. This file captures methodology feedback from our runs. It is NOT a
Jarvis harness change and NOT a Jarvis CR — it feeds back into syspilot.

## Agent consolidation discussion (2026-07-20)

User proposal: MECE + TRACE could become skills; Designer + Implementer could
be one actor (shared context models → token savings).

Refined position (agreed):

- **MECE + TRACE stay separate.** They deliver *independent* reviews by
  themselves — critical for quality. If folded into skills, the *invocation
  site* must stay fixed (CM invokes them, never the Designer self-reviewing its
  own spec).
- **Designer + Implementer merge = risky.** The real concern is **artifact
  ownership dilution**: if the implementer silently changes the design without
  updating the spec, the QM reviews code-vs-spec and sees a consistent pair —
  the design-code drift escapes *all* gates. The implementer is the only one
  who knows the drift happened. An independent QM does NOT catch this; it only
  catches spec-code mismatch. (PM initially claimed QM catches design-impl
  drift — that was wrong; corrected by user.)
- **Token cost is real even locally.** Spec-driven loops + regular artifact
  reads make token usage high. Reducing agent passes is a selling point
  regardless of cloud vs. local.
- **Scope:** this is a *syspilot* methodology topic, not a Jarvis harness
  change. Lands as syspilot feedback, not a Jarvis CR.

## Empirical evidence from our runs

- **#39 (jarvis-syspilot):** QM Round 1 caught a spec-text drift
  (`.jarvis/sessions/` vs `.jarvis/actors/`) — demonstrates the value of
  independent review passes.
- The **Design → Implementer handoff** is where silent drift would live; our
  current separation forces an explicit spec artifact as the contract, which
  is the only thing the QM can objectively check against.
- Black-ops night (2026-07-20, #40 + #39): pipeline ran clean on a mixed-model
  setup (CM=qwen local, QM=Haiku, PM=Hy3) — confirms harness quality beats
  model size for coordination tasks.

## MECE/TRACE model-diligence gap (2026-07-20/21)

msg-notify-sender-id (#40) shipped with the built-in notification default text
never actually updated (sender line missing at all 3 declaration sites; wrong/
deprecated tool name referenced at 2 of 3) despite REQ_MSG_NOTIFICATION_TEMPLATE
AC-3/AC-7 explicitly requiring both — QM Round 1 said CLEAR.

PM initially misdiagnosed this as a **process gap** (MECE/Trace only verify
links/traceability structurally, not literal spec-prose-vs-code-text content).
User corrected this: links are only the *algorithmic* part (finding entities)
— *content* review of what's behind those links IS the actors' actual job.
So this isn't a role-design gap, it's a **model diligence gap**: MECE was
already on Sonnet 5, TRACE was still on Haiku 4.5 (the likely culprit — not
meticulous enough for exact-text AC verification). User is moving TRACE to
Sonnet as a result. Lesson: when review agents miss content-level defects,
check model assignment before redesigning the process — don't assume the
architecture is at fault when it might just be an underpowered model
assigned to a content-heavy checking role.

## UATs not actually run in autonomous mode (2026-07-21)

`SPEC_UAT_SPL` defines 21 manual Extension-Host scenarios (T-1..T-21) for
jarvis-syspilot (#39) — including T-3 ("first run — copy and notify"), which
would fetch the real upstream file and immediately have hit the same 404
that PM+user found today (`SPEC_UAT_SPL_FILES` AC-2 itself has the wrong
upstream path, matching the code — spec and code agreed with each other,
both wrong relative to the real `enthali/syspilot` repo layout). Root cause,
per the user: autonomous mode has no human in the loop to actually execute
UAT scenarios — "User Acceptance Test" requires a user. They haven't been
run for a while; pipeline-green (unit tests + MECE + Trace) was silently
treated as sufficient. Known gap, not a surprise to the user — proper fix
needs an ontology extension (planned for the next syspilot version, user is
actively working on it) so UAT execution has a defined place/owner in
autonomous mode. Until then: pipeline-green ≠ user-accepted, and spec-code
agreement can still be jointly wrong when both were authored against an
incorrect external assumption (moving upstream repo layout, in this case).
## Process overhead for small iterative fixes (2026-07-21)

`dev-launchconfig-syspilot` went through 6 small fix rounds (bootstrap.json
removal, first-run control-flow bug, logging, auto-delivery registration,
notification text reword) each running the *full* pipeline (System Designer →
Test Designer → Dev Engineer → MECE → Trace → QM). For a one-line text/logic
tweak this is disproportionate — user flagged it as "riesiger Aufwand für so
einen kleinen Change."

Idea worth exploring: a **fix-iteration mode** where, while a branch is still
open/unmerged, rapid rounds only run System Designer (spec) → Dev Engineer
(code) → Test Designer (tests) — skipping MECE/Trace per round — and a single
consolidated QM pass (which already runs MECE+Trace internally) happens once
at the end, over the *entire accumulated diff*, not just the last round.
Caveat: if a later round reverses an earlier decision (as happened here —
Round 4 removed what Round 2 had just fixed), QM must see the whole diff, not
a per-round slice — but that already seems to be the norm. Not yet decided
whether/how to adopt; parking here as a concrete methodology candidate for
syspilot, not a Jarvis CR.