# v0.5.4 Hotfix

*2026-04-27*

Hotfix release — no new features.

## Changes

- **sphinx-build**: Fixed escaped backticks and unclosed inline literal in `spec_rec.rst` (Sphinx `-W` build broken since v0.5.1)
- **messages-ux**: Message session groups default to collapsed; added `$(refresh)` button to Messages view title bar (`jarvis.refreshMessages`)
- **release-agent**: Fixed workflow — all preparation (version, release notes, archival, validation) now on `develop` before squash-merge; mandatory back-merge step added
