# Research Report — CI/CD Packaging Pipeline for the Modular Monorepo

**Session:** Research
**Date:** 2026-06-22
**Requested by:** Project Manager (S2S)
**Scope:** Read-only research. No project files modified, no commits. (A throwaway
`.vsix` was generated locally during diagnosis and deleted.)
**Status of the build:** local `tsc` + 148 vitest tests pass; the **GitHub Actions
release workflow** fails. This is a CI-only failure.

---

## 0. Executive Summary

The v0.8.0 modularization split Jarvis into an npm-workspaces monorepo
(`packages/core, pim, recorder, mcp, suite`). Two release runs failed for **two
different reasons**:

| Run | Tag | Step | Root cause | Status |
|-----|-----|------|-----------|--------|
| **#24** | v0.8.0 | `npm ci` | `package-lock.json` out of sync — `Missing: jarvis-suite@0.7.0 from lock file` (the `suite` package was added to `workspaces` but the lockfile wasn't regenerated) | ✅ already fixed |
| **#25** | v0.8.0 | `npm run package` → `vsce package` | `invalid relative path: extension/../../vitest.config.ts` — vsce traverses **up to the monorepo root** while collecting dependencies | ❌ **live blocker** |

**The mechanism behind #25:** `vsce package` (without `--no-dependencies`) walks the
package's **production dependencies** and tries to include each one in the `.vsix`.
In an npm-workspaces monorepo two things make those paths point *outside* the
package, which vsce rejects:

1. **Hoisting** — `core`'s real runtime deps (`cron-parser`, `js-yaml`, `sql.js`)
   are installed in the **root** `node_modules`, not `packages/core/node_modules`.
   vsce resolves them to `../../node_modules/...` → `../` paths.
2. **Workspace-sibling deps** — every add-on declares `"jarvis": "*"`, which npm
   links to `../core`. vsce resolves that sibling to a `../` path too.

vsce refuses any file whose path escapes the extension root (`extension/../../...`)
→ hard error. A root `.vscodeignore` with `**` cannot fix this because the offending
paths come from vsce's **dependency collector**, not from the file-glob walk that
`.vscodeignore` filters.

**Recommended fix (one mechanism, generalizes to all 5 packages):**
**bundle each code extension with esbuild and package with `vsce package --no-dependencies`.**
This removes dependency traversal entirely, inlines third-party runtime deps into a
single `out/extension.js`, and is the same model VS Code recommends for every
published extension. The CI must also call the **per-package** package scripts, not
the root `npm run package`.

---

## 1. Why vsce traverses to the monorepo root (Q1)

`vsce package` runs in two phases:

1. **File collection** — walks the package directory, applying `.vscodeignore` /
   the `files` allowlist. This phase stays inside the package.
2. **Dependency collection** — unless `--no-dependencies` is passed, vsce asks npm
   for the package's **production** dependency tree and adds every resolved
   dependency directory to the VSIX. `devDependencies` are auto-excluded (per the
   VS Code publishing docs), but **production deps are always included**.

Phase 2 is the culprit. It is **not** git-root detection and **not** a vsce bug —
it is npm-workspaces hoisting interacting with vsce's "bundle my node_modules"
behaviour:

- npm workspaces **hoist** shared third-party deps to the repo-root `node_modules`
  to deduplicate. So `packages/core` has `cron-parser` etc. resolved at
  `../../node_modules/cron-parser`.
- vsce computes the archive path for each dep relative to the package root. A
  hoisted dep becomes `extension/../../node_modules/...`; vsce also pulls in
  root-level siblings it sees along the way (`vitest.config.ts`, `_patch_pkg.py`,
  `package-lock.json`, …).
- vsce validates that every archived path stays under `extension/`. `../../`
  escapes it → **`invalid relative path` error**.

**Reproduction (local, this machine):**

```
packages/core> npx vsce package
  …
  extension/
    ../
      ../ (3625 files) [195.41 MB]   ← the entire monorepo root, incl. root node_modules
```

Locally it *completed* (vsce tolerated `../` on Windows and produced a 195 MB
junk vsix); on the **CI clean `npm ci` layout** the same traversal hits the hard
`invalid relative path: extension/../../vitest.config.ts` reject. Same mechanism,
stricter outcome on CI.

With `--no-dependencies` the traversal disappears:

```
packages/core> npx vsce package --no-dependencies
  extension/
    out/ (extension.js, apps/, engine/)
    resources/  schemas/  package.json  readme.md
```

…but now **no `node_modules` ships at all** — so `cron-parser`, `js-yaml`,
`sql.js` would be missing at runtime (core uses plain `tsc`, nothing is bundled).
That is why `--no-dependencies` **alone** is not a complete fix for `core`/`mcp`.

---

## 2. The canonical way to package a workspace member (Q2)

The supported, documented pattern for any non-trivial extension — and the only one
that is robust inside an npm-workspaces monorepo — is **bundling**:

> *VS Code docs, "Bundling Extensions": bundle your extension into a single file so
> it loads faster and ships fewer files.* vsce even warns about it on every run
> ("This extension consists of 3782 files … you should bundle your extension").

With bundling:

- esbuild inlines all **third-party** runtime deps into `out/extension.js`.
- `vscode` is marked **external** (always provided by the host).
- the workspace-sibling `jarvis` is marked **external** for add-ons (provided at
  runtime by the installed core extension via `extensionDependencies` + the engine
  exports — see §6 design note).
- `vsce package --no-dependencies` then has **nothing to traverse** → no `../`
  paths → no root files → tiny, correct vsix.

Mechanisms considered and rejected:

| Option | Verdict |
|--------|---------|
| Root `.vscodeignore` `**` | ❌ Cannot remove dependency-collected paths; only filters the package's own file walk. Confirmed not to help. |
| `files` allowlist in package.json | ❌ Conflicts with `.vscodeignore` and still doesn't stop dependency collection. |
| `nohoist` / per-package `node_modules` | ❌ Fragile, fights npm workspaces, ships duplicate trees, doesn't kill the 3782-file warning. |
| `--no-dependencies` **without** bundling | ⚠️ Fixes traversal but **strips required runtime deps** for core/mcp → broken extension. OK only for packages with no third-party runtime deps (recorder, pim, suite). |
| **esbuild bundle + `--no-dependencies`** | ✅ **Recommended.** Removes traversal, ships deps correctly, one model for all packages, satisfies the perf warning. |

---

## 3. Minimal fix for `core` today + how it generalizes (Q3)

### 3.1 Per-package dependency profile (this drives the fix)

| Package | Third-party runtime deps | Sibling dep | Needs bundling? | Package command |
|---------|--------------------------|-------------|-----------------|-----------------|
| **core** | `cron-parser`, `js-yaml`, `sql.js` | — | **Yes** (must inline) | esbuild + `vsce package --no-dependencies` |
| **mcp** | `@modelcontextprotocol/sdk` | `jarvis` | **Yes** (must inline sdk; `jarvis` external) | esbuild + `--no-dependencies` |
| **recorder** | none | `jarvis` | No 3rd-party to inline; bundle still recommended | `--no-dependencies` (bundle optional) |
| **pim** | none | `jarvis` | same as recorder | `--no-dependencies` (bundle optional) |
| **suite** | none (extension pack, no code) | — | No | `--no-dependencies` |

### 3.2 Minimal change to unblock the release **today**

The smallest change that makes #25 pass is to **bundle core + mcp and use the
`--no-dependencies` scripts everywhere**:

1. Add esbuild as a root devDependency and a `bundle` script to `core` and `mcp`,
   e.g. (illustrative — not applied):
   ```jsonc
   // packages/core/package.json
   "scripts": {
     "esbuild": "esbuild ./src/extension.ts --bundle --outfile=out/extension.js --external:vscode --format=cjs --platform=node --minify",
     "vscode:prepublish": "npm run esbuild",
     "package": "vsce package --no-dependencies"
   }
   ```
   For `mcp`, additionally keep `jarvis` external: `--external:vscode --external:jarvis`.
2. `recorder`, `pim`, `suite` already have `"package": "vsce package --no-dependencies"`
   in their own package.json — they just need to be **invoked per package**.
3. **Stop calling the root `npm run package`.** Today it is
   `"package": "cd packages/core && npx vsce package"` — note it (a) only builds
   core and (b) **omits `--no-dependencies`**, which is the exact cause of #25.
   Replace the release step with a loop over the member packages (see §4).

> The same `esbuild + --no-dependencies` recipe generalizes verbatim to all code
> packages. `suite` is an Extension Pack (no `main`, no code) and packages cleanly
> with `--no-dependencies` as-is.

A `.vscodeignore` per package is still worthwhile (drop `src/`, `**/*.ts`,
`**/*.map`, `tsconfig.json`) to keep the vsix minimal, but it is **not** what fixes
#25 — bundling + `--no-dependencies` is.

---

## 4. Proposed `release.yml` structure (Q4)

The current workflow builds **only core** and uploads `*.vsix`:

```yaml
- run: npm ci
- run: npm run compile
- run: npm run package           # ← root script: core only, no --no-dependencies
- uses: softprops/action-gh-release@v2
  with:
    files: '*.vsix'
```

Proposed structure — build **all five** members and attach each vsix as a release
asset (illustrative, not applied):

```yaml
name: Release Extension
on:
  push:
    tags: ['v*']
permissions:
  contents: write
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'        # also clears the Node 20 deprecation warning
      - run: npm ci                  # passes once package-lock.json is in sync (fix #24)
      - run: npm run build           # compile:packages — builds every workspace
      - name: Package all members
        run: |
          for pkg in core pim recorder mcp suite; do
            ( cd "packages/$pkg" && npx vsce package --no-dependencies )
          done
      - name: Collect vsix artifacts
        run: |
          mkdir -p dist
          find packages -maxdepth 2 -name '*.vsix' -exec mv {} dist/ \;
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          files: 'dist/*.vsix'
          generate_release_notes: true
```

Notes:

- **Naming convention** — `vsce package` names the file `<name>-<version>.vsix`
  from each package.json: `jarvis-0.7.0.vsix`, `jarvis-pim-0.7.0.vsix`,
  `jarvis-recorder-0.7.0.vsix`, `jarvis-mcp-0.7.0.vsix`,
  `jarvis-suite-0.7.0.vsix`. This is exactly the per-extension naming the
  in-place updater (`src/updateCheck.ts` → GitHub-releases fetch) already expects,
  so no asset-matching changes are needed downstream.
- **Version skew** — root package.json is `0.8.0` but the member packages are still
  `0.7.0`. The release tag is `v0.8.0`. Decide whether the tag drives a version bump
  across members (recommend: a release step that sets every member to the tag
  version before packaging) so asset versions match the tag.
- **A `bundle`/prepublish step** runs automatically via each package's
  `vscode:prepublish`, so the explicit `npm run build` can be dropped once
  prepublish bundling is wired — kept here for clarity/fail-fast.
- Pin `vsce` (already a root devDependency `@vscode/vsce ^3.0.0`) and call it via
  `npx vsce` so CI uses the locked version, not a global one.

---

## 5. Marketplace forward-look (Q5)

We are **not** implementing Marketplace publishing now, but the pipeline must not
paint us into a corner. Findings:

- **The packaging fix is identical for both worlds.** `vsce publish` packages the
  extension exactly like `vsce package` (same file collection, same dependency
  handling, same `--no-dependencies` semantics). If the vsix is correct for a
  GitHub-release asset, it is correct for Marketplace. Bundling helps both.
- **Per-package publish.** Each member is published independently:
  `cd packages/<pkg> && vsce publish --no-dependencies`. The Extension Pack
  (`suite`) is published like any extension; the Marketplace resolves its
  `extensionPack` members by id at install time.
- **Publish order matters.** Publish `core` first, then `pim`/`recorder`/`mcp`
  (they declare `extensionDependencies: ["enthali.jarvis"]`), then `suite` last
  (its pack members must already exist). Same ordering the in-place updater uses.
- **Auth.** Marketplace publishing needs a publisher token. The VS Code docs now
  steer CI toward **Microsoft Entra ID / workload-identity federation**
  (`vsce publish --azure-credential`) over long-lived PATs (global PATs retire
  2026-12-01). For a future Marketplace job, prefer the Entra-ID path.
- **Dual-channel is fine.** GitHub-release vsix attachments (current, drives the
  in-place self-updater) and Marketplace publish can coexist from the same tag —
  add a separate `publish` job gated on a secret/flag so OSS forks still build
  release assets without credentials.

**Conclusion:** designing the release job around *per-package
`esbuild + vsce --no-dependencies`* keeps GitHub-release and Marketplace paths
identical; switching to Marketplace later is a `package`→`publish` swap plus auth,
not a re-architecture.

---

## 6. Design note / risk — the `jarvis` sibling dependency

Each add-on declares `"jarvis": "*"` and (likely) `import … from 'jarvis'`. With
`--no-dependencies` the core engine is **not** bundled into the add-on (correct —
it must remain a singleton provided by the installed core extension). But that means:

- If an add-on does a real **value** import from `jarvis` (not just types), bundling
  must mark `jarvis` as **external**, and the add-on must obtain the engine API at
  runtime via `vscode.extensions.getExtension('enthali.jarvis').exports` (the model
  proven in the MVP spike), **not** via Node module resolution — because the vsix
  ships no `node_modules/jarvis`.
- Safest contract: `jarvis` exposes **types only** for compile-time, and all runtime
  wiring goes through the engine `exports` + `extensionDependencies`. This matches
  the spike's "inline type copy / runtime exports" finding.

**Recommendation:** before wiring CI bundling, confirm each add-on's imports from
`jarvis` are type-only (or routed through `getExtension().exports`). If any add-on
imports engine *code* directly, that must be refactored or it will fail at runtime
once `--no-dependencies` strips the sibling. Flag as a CR-blocking check.

---

## 7. Recommended action sequence (for CM / implementer)

1. **(done)** Regenerate `package-lock.json` so `npm ci` passes (#24).
2. Add esbuild bundling to `core` and `mcp` (`vscode:prepublish` → esbuild;
   `--external:vscode`, plus `--external:jarvis` for mcp).
3. Confirm `pim`/`recorder`/`suite` package with `--no-dependencies` (they already
   have the script) and audit their `jarvis` imports are type-only (§6).
4. Replace the root `npm run package` release step with the per-package loop (§4).
5. Align member versions with the release tag.
6. Update `docs/design/spec_rel.rst` (`SPEC_REL_VSCEPKG` is stale — written for the
   old monolith; it must describe per-package bundle + `--no-dependencies`).
7. (Future) Add a gated `publish` job for Marketplace using `--azure-credential`.

---

## Appendix A — Evidence

- **Run #24** (`27972112526`): `npm error code EUSAGE … Missing: jarvis-suite@0.7.0
  from lock file`.
- **Run #25** (`27973336183`): `> cd packages/core && npx vsce package` →
  `##[error]invalid relative path: extension/../../vitest.config.ts`.
- **Local repro:** `npx vsce package` in `packages/core` archived
  `extension/../ (3625 files) [195.41 MB]`; `--no-dependencies` produced a clean
  `out/`-only tree but without runtime `node_modules`.
- **vsce/docs:** devDependencies auto-excluded; production deps always collected
  unless `--no-dependencies`; VS Code "Bundling Extensions" guidance; vsce perf
  warning ("3782 files … you should bundle").
