# Change: ci-core-bundle

## Summary

Rewrite `SPEC_REL_VSCEPKG` and update `REQ_REL_VSCEPKG` for the modular monorepo.
The core extension is now bundled with esbuild (inlining all third-party runtime
deps) and packaged with `vsce package --no-dependencies`, eliminating the
`../../` path errors caused by npm-workspaces hoisting.

## Problem

After the v0.8.0 modularization, `vsce package` traverses hoisted production
dependencies to `../../node_modules/…` paths outside the package root, which vsce
rejects on CI (`invalid relative path: extension/../../vitest.config.ts`).  The
monolith-era spec (`SPEC_REL_VSCEPKG`) mandated shipping `node_modules/` in the
VSIX — this is no longer viable in the workspaces layout.

## Affected Spec Elements

| Level | ID | Action |
|-------|-----|--------|
| REQ | `REQ_REL_VSCEPKG` | Rewritten — AC-4 inverted (no node_modules), AC-5/6/7 added |
| SPEC | `SPEC_REL_VSCEPKG` | Rewritten — esbuild bundle, .vscodeignore, WASM handling, new ACs |

## Design Decisions

- **D-1**: esbuild bundles `src/extension.ts` → `out/extension.js` (CJS, node20)
- **D-2**: `vscode` is external; `cron-parser`, `js-yaml`, `sql.js` are inlined
- **D-3**: `sql-wasm.wasm` copied next to bundle; `locateFile` conditional on file existence (dev host unaffected)
- **D-4**: `vsce package --no-dependencies` eliminates dependency traversal entirely
- **D-5**: Scope limited to `packages/core`; multi-package packaging deferred

## Scope Exclusions

- Multi-package (`pim`, `recorder`, `mcp`, `suite`) bundling/packaging
- `release.yml` restructuring (per-package loop)
- Marketplace publishing
- `dist/` folder

## Status

- [x] Spec updated (REQ, SPEC)
- [ ] Implementation
- [ ] Test protocol
- [ ] Verification
