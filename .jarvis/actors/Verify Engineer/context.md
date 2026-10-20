# Session Context: Verify Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.verify`).
This file captures operational details not covered there. Verification lessons are in [memory/verification-lessons.md](memory/verification-lessons.md).

## Operating rules

- Commit path-scoped: `git commit --only -m "<msg>" -- <paths>`. The shared index can hold other actors' staged files; leave them staged.
- Re-read a file before editing; the shared working tree can change between reads.
- In a verdict, name manual cases NOT RUN and state residual risks explicitly.

## Open items

- `actor-tree-mail-marker` is squash-merged to `development` as `a32c888` and released in v0.31.0 (release `eca06ef`; change documents archived in `3030222` under `docs/changes/v0.31.0/`). Automated PASS for the scope at `2168e2a`.
- Manual UAT NOT RUN: T-1 to T-14; T-8 and T-9 are blocked (agent hooks disabled in the EDH, user-reported 2026-10-20). The PM-required subset is T-2 to T-6 and T-10 to T-12, open on released code, not a merge gate.
- Record gaps (raise; archive untouched until the user or PM decides, per Repo Maintainer 2026-10-20): the v0.31.0 test protocol records all 22 cases NOT RUN, including automated T-15 to T-22.
- Val report is stale against the released protocol and test file: case table (lines 242-249) omits T-22 (credited as automated at line 41) and says 'no Dev test' for T-15, T-16, T-21; lines 150 and 251 say T-15 to T-21 Evidence reads 'Not yet written' (the protocol has no such text).
- Stale after release: 'before merge' in the val report (lines 53, 118, 133) and the protocol (line 70); flag, do not edit.
- Residual risk: the `extension.ts` listener for `jarvis.outlook.enabled` has no automated test; T-12 is its only check. The read script has not been run against Outlook.
- D-L1-7: approval of the draft elements is open; draft statuses remain on `development`. D-L1-8: setting-name drift (`jarvis.outlookEnabled` in REQ_OLK_ENABLE and SPEC_OLK_SETTINGS vs shipped `jarvis.outlook.enabled`) is a deferred doc change on the PM backlog; the name still appears in the OLK files on `development`.
- Touched-files (v0.25.1): manual WSL gate O-1 and an AC-24 record-key residual (low), per `docs/changes/v0.25.1/val-touched-files-wsl-existence.md`. AC-24 wording is absent from `docs/design/spec_actor.rst`, where `SPEC_ACTOR_TOUCHEDFILES` reads `approved`; not re-checked.
- UAT gap: no `spec_uat_*` family for the Hook Engine (GH #61, open, Backlog), nor for CFG or REL.
