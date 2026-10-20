# Session Context: Verify Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.verify`).
This file captures operational details not covered there. Verification lessons are in [memory/verification-lessons.md](memory/verification-lessons.md).

## Operating rules

- Commit path-scoped: `git commit --only -m "<msg>" -- <paths>`. The shared index can hold other actors' staged files; leave them staged.
- Re-read a file before editing; the shared working tree can change between reads.
- In a verdict, name manual cases NOT RUN and state residual risks explicitly.

## Open items

- `actor-tree-mail-marker` is on `feature/actor-tree-mail-marker`, not `development`. Its report (`docs/changes/val-actor-tree-mail-marker.md`, last changed in `6c566f5`) gives PASS for the automated scope at `2168e2a`.
- Merge gate (PM decision, 2026-10-19): manual T-2 to T-6 and T-10 to T-12 must be run and recorded before merge; they are user-run and NOT RUN.
- Residual risk: the `extension.ts` listener for `jarvis.outlook.enabled` has no automated test; T-12 is its only check. The read script has not been run against Outlook.
- PM decisions pending: approval of the draft elements (D-L1-7); setting-name drift `jarvis.outlookEnabled` vs shipped `jarvis.outlook.enabled` (D-L1-8, deferred doc change).
- Touched-files (v0.25.1): manual WSL gate O-1 and an AC-24 record-key residual (low), per `docs/changes/v0.25.1/val-touched-files-wsl-existence.md`. AC-24 wording is absent from `docs/design/spec_actor.rst`, where `SPEC_ACTOR_TOUCHEDFILES` reads `approved`; not re-checked.
- UAT gap: no `spec_uat_*` family for the Hook Engine (GH #61, open, Backlog), nor for CFG or REL.
