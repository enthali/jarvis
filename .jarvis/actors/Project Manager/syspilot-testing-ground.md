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
