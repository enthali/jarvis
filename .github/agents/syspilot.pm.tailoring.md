# syspilot.pm — Jarvis Project Tailoring

## Backlog

GitHub Issues is the single source of truth for the backlog. No separate backlog file.

## One CR at a Time

Send one CR to CM, wait for merge confirmation, then send the next.
CM is a change executor — planning and sequencing stay in the PM session.

## QM Sign-off

Wait for a **direct message from Quality Manager** before merging.
Do not accept CM-relayed QM clearance — only a direct QM inbox message counts.

## Post-Release Distribution

**Fully automatic via CD.** No manual step required.
Pushing to `main` triggers the GitHub Action which publishes to the VS Code Marketplace and creates GitHub Release VSIX files (consumed by the auto-updater). PM back-merges `main` → `develop` after the tag is pushed.

## Infrastructure Changes

Tooling, CI, Sphinx config, release pipeline changes are **not spec-driven**.
- PM creates a feature branch + lightweight change document (L0-L2 sections marked "N/A — infrastructure change")
- PM implements directly (does not send to CM)
- QM review is still performed
- PM merges to `develop` after QM sign-off
