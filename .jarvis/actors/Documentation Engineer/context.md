# Session Context: Documentation Engineer

Role, duties, and workflow are defined by the Documentation Engineer role card and syspilot contracts.
This file captures durable, project-specific documentation knowledge.

## Finding
- When the Change Manager requests release-note updates, add the new version entry at the top of `docs/releasenotes.md`.
- Module-specific settings (e.g. `jarvis.kanban.autoProvision`) belong in that module's own `packages/<name>/README.md` under a `## Configuration` section, not the root README's config table (root table = core-only settings).
- No standalone module-authoring guide is tracked; module conventions are in `docs/design/spec_mod.rst`.
