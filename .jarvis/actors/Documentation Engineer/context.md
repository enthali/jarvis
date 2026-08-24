# Session Context: Documentation Engineer

Role, duties, and workflow are defined in the agent description (`syspilot.docu`).
This file captures operational details not covered there.

## Finding
- Root `README.md` "Explorer Sidebar" section is the canonical place for user-facing tree behavior docs; `packages/core/README.md` and `packages/pim/README.md` are marketing-level only, rarely need updates.
- Release notes (`docs/releasenotes.md`) are updated per-CR as part of documentation deliverables — the CM requests this explicitly for each CR. New version entry goes at the top.
- Module-specific settings (e.g. `jarvis.kanban.autoProvision`) belong in that module's own `packages/<name>/README.md` under a `## Configuration` section, not the root README's config table (root table = core-only settings).
- No standalone "module authoring guide" doc exists in this repo — module conventions live only in `docs/design/spec_mod.rst` (design spec, owned by CR's own Level 2, not a DE deliverable).
