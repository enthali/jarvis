# syspilot.design — Jarvis Project Tailoring

## Add-on Onboarding Preflight

When a CR introduces a new `packages/<name>` add-on extension, read
`SPEC_MOD_ADDON_ONBOARDING` and verify every checklist item before closing
the design phase:

1. **Release CI** (`SPEC_REL_COREGH`): the add-on has a `vsce package` step,
   a GitHub Release VSIX entry, and a Marketplace publish step in
   `.github/workflows/release.yml`.
2. **Self-update VSIX mapping — requirement** (`REQ_REL_UPDATEINSTALL`): the
   add-on's extension ID → VSIX filename row is present in the mapping table.
3. **Self-update VSIX mapping — design** (`SPEC_REL_UPDATENOTIFY`): the
   add-on's extension ID → VSIX filename row is present in the design-level
   mapping table.
4. **Self-update code** (`packages/core/src/engine/core/updateCheck.ts`): the
   `idToVsix` map includes the add-on's extension ID.
5. **Add-on registry requirement** (`REQ_MOD_ADDONS`): a new AC is added for
   the add-on, following the established pattern.
6. **Monorepo layout** (`SPEC_MOD_MONOREPO`): the package appears in the
   "Target layout" code block and the description's package count is updated.

This checklist exists because past releases shipped with incomplete add-on
wiring (`jarvis-flow` missing from the self-update VSIX mapping,
`jarvis-syspilot` missing from the CI release pipeline).
