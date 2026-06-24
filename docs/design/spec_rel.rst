Release Design Specifications
==============================

.. spec:: Version in package.json
   :id: SPEC_REL_SEMVER
   :status: implemented
   :links: REQ_REL_SEMVER

   **Description:**
   ``package.json`` is the single source of truth for the Jarvis version number.
   The version field SHALL follow Semantic Versioning (MAJOR.MINOR.PATCH).
   No other file duplicates or shadows this version.


.. spec:: Extension Packaging Setup
   :id: SPEC_REL_VSCEPKG
   :status: draft
   :links: REQ_REL_VSCEPKG

   **Description:**

   In the npm-workspaces monorepo, ``vsce package`` without ``--no-dependencies``
   traverses hoisted production dependencies to paths outside the package root
   (``../../node_modules/…``), which vsce rejects.  The solution is to **bundle**
   each code extension with esbuild so all runtime deps are inlined, then package
   with ``vsce package --no-dependencies``.

   This spec covers the **core** package (``packages/core``) only.

   **1. Bundle script — ``packages/core/build.js``**

   An esbuild-based Node script that:

   * Entry point: ``src/extension.ts``
   * Output: ``out/extension.js`` (CommonJS, platform ``node``, target ``node20``)
   * Externals: ``vscode`` (always provided by the host)
   * Inlined: ``cron-parser``, ``js-yaml``, ``sql.js`` (all third-party runtime deps)
   * Source maps: enabled
   * Minification: optional (``--minify`` flag)
   * Watch mode: optional (``--watch`` flag)
   * WASM handling: after the build, copies
     ``<repo-root>/node_modules/sql.js/dist/sql-wasm.wasm`` to ``out/sql-wasm.wasm``

   **2. ``sql.js`` WASM runtime resolution**

   ``sql.js`` requires a WebAssembly binary (``sql-wasm.wasm``) at runtime.
   esbuild cannot bundle ``.wasm`` files, so ``build.js`` copies the WASM next to
   the output bundle.  The source code (``engine/sessionLookup.ts``) uses a
   conditional ``locateFile`` override:

   .. code-block:: typescript

      const bundledWasm = path.join(__dirname, 'sql-wasm.wasm');
      const SQL = fs.existsSync(bundledWasm)
          ? await initSqlJs({ locateFile: (file: string) => path.join(__dirname, file) })
          : await initSqlJs();

   * **Packaged extension** (``out/extension.js``): ``__dirname`` resolves to
     ``out/``, the copied WASM is found → ``locateFile`` override used.
   * **Dev host (F5)**: the code runs from ``out/`` compiled by ``tsc`` where no
     WASM copy exists → ``fs.existsSync`` returns false → ``initSqlJs()`` default
     resolution (from ``node_modules/sql.js/dist/``) is used.  Dev host is
     unaffected.

   **3. ``packages/core/package.json`` scripts**

   .. code-block:: json

      "scripts": {
        "compile": "tsc -p ./",
        "bundle": "node build.js",
        "vscode:prepublish": "npm run compile && npm run bundle",
        "package": "vsce package --no-dependencies"
      }

   * ``vscode:prepublish``: runs TypeScript compilation followed by the esbuild
     bundle.  vsce invokes this automatically before packaging.
   * ``package``: calls vsce with ``--no-dependencies`` so no dependency traversal
     occurs.

   **4. ``packages/core/.vscodeignore``**

   Excludes from the VSIX:

   * ``src/**`` — TypeScript sources
   * ``build.js`` — build tooling
   * ``node_modules/**`` — all deps are inlined in the bundle
   * ``tsconfig.json`` — build config
   * ``**/*.map`` — source maps
   * ``**/*.ts`` (with ``!out/**/*.d.ts`` exception for type declarations if needed)

   Includes in the VSIX:

   * ``out/`` — bundled extension + WASM
   * ``resources/`` — icons, assets
   * ``schemas/`` — JSON schemas
   * ``package.json``, ``README.md``

   **5. Root ``package.json`` ``"package"`` script**

   .. code-block:: json

      "package": "cd packages/core && npx vsce package --no-dependencies"

   Core-only for this change.  Multi-package packaging is deferred to a future CR.

   **6. Acceptance Criteria (testable)**

   * AC-1: ``npm run package`` from repo root completes without error and produces
     exactly one ``jarvis-<version>.vsix`` under ``packages/core/``
   * AC-2: The VSIX contains no ``../../`` paths
   * AC-3: VSIX file size < 5 MB
   * AC-4: All 148 tests still pass after the build change
   * AC-5: F5 (Run Core) launches the extension without bundling errors (dev host
     unaffected)


.. spec:: Docs GitHub Actions Workflow
   :id: SPEC_REL_DOCSWORKFLOW
   :status: implemented
   :links: REQ_REL_DOCSWORKFLOW

   **Description:**
   Create ``.github/workflows/docs.yml``:

   .. code-block:: yaml

      name: Deploy Docs to GitHub Pages

      on:
        push:
          branches: [main]

      permissions:
        contents: read
        pages: write
        id-token: write

      jobs:
        deploy:
          runs-on: ubuntu-latest
          environment:
            name: github-pages
            url: ${{ steps.deployment.outputs.page_url }}
          steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-python@v5
              with:
                python-version: '3.x'
            - run: pip install sphinx sphinx-needs furo myst-parser
            - run: python -m sphinx -b html docs docs/_build/html -W --keep-going
            - uses: actions/upload-pages-artifact@v3
              with:
                path: docs/_build/html
            - id: deployment
              uses: actions/deploy-pages@v4

   Note: GitHub Pages must be configured in repo Settings → Pages → Source: GitHub Actions.


.. spec:: Release GitHub Actions Workflow
   :id: SPEC_REL_RELEASEACTION
   :status: implemented
   :links: REQ_REL_RELEASEACTION

   **Description:**
   Create ``.github/workflows/release.yml``.

   .. note::

      The complete current workflow (including the Marketplace publish step and the
      corrected ``files`` glob) is documented in **SPEC_REL_MKTPUBLISH**.
      This spec covers the original GitHub Release step only.

   .. code-block:: yaml

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
                node-version: '22'
            - run: npm ci
            - run: npm run compile
            - run: npm run package
            - name: Create GitHub Release
              uses: softprops/action-gh-release@v2
              with:
                files: 'packages/core/*.vsix'
                generate_release_notes: true


.. spec:: Branch Naming in copilot-instructions
   :id: SPEC_REL_BRANCHNAMING
   :status: implemented
   :links: REQ_REL_BRANCHNAMING

   **Description:**
   Add a `## Git Workflow` section to `.github/copilot-instructions.md` that documents
   the `feature/<change-name>` naming convention, squash merge requirement, no-push rule,
   and no-direct-commits policy.


.. spec:: Release Agent Merge Policy Documentation
   :id: SPEC_REL_AGENTPOLICY
   :status: implemented
   :links: REQ_REL_AGENTPOLICY

   **Description:**
   The Release Agent SHALL contain:

   1. A `Decisions` table entry: `merge=squash`
   2. A `## Merge to main` section with the squash merge command and a note that
      feature branches must NOT be pushed to origin after merging.


.. spec:: Marketplace Metadata in package.json
   :id: SPEC_REL_MKTMETA
   :status: draft
   :links: REQ_REL_MKTMETA

   **Description:**
   ``packages/core/package.json`` SHALL include the following marketplace fields:

   .. code-block:: json

      {
        "icon": "resources/jarvis-128.png",
        "keywords": ["assistant", "productivity", "projects", "events", "sessions", "reminders", "heartbeat"],
        "categories": ["Other"],
        "galleryBanner": { "color": "#1e1e2e", "theme": "dark" }
      }

   * ``icon``: 128×128 PNG relative to the ``packages/core/`` root.
     A placeholder PNG is committed to ``packages/core/resources/jarvis-128.png``.
     A proper icon is a future improvement.
   * ``keywords``: used by Marketplace search ranking.
   * ``categories``: ``"Other"`` is the correct bucket for assistant/utility extensions.
   * ``galleryBanner``: dark-theme banner matching the VS Code dark theme palette.

   A user-facing ``packages/core/README.md`` SHALL exist with:

   * A short description of Jarvis and its features
   * Feature bullet list
   * Basic usage / getting started instructions
   * Link to the GitHub repository

   **Acceptance Criteria (testable)**

   * AC-1: ``packages/core/package.json`` contains ``icon``, ``keywords``, ``categories``, ``galleryBanner``
   * AC-2: ``packages/core/resources/jarvis-128.png`` exists and is a valid 128×128 PNG
   * AC-3: ``packages/core/README.md`` exists and contains all three required
     sections: (1) a user-facing description with feature list,
     (2) a getting-started / usage section, and (3) a link to the GitHub repository
   * AC-4: ``vsce package --no-dependencies`` still succeeds after these additions


.. spec:: CI Marketplace Publish Step
   :id: SPEC_REL_MKTPUBLISH
   :status: draft
   :links: REQ_REL_MKTPUBLISH

   **Description:**
   ``.github/workflows/release.yml`` SHALL be extended with a publish step after the
   GitHub Release step:

   .. code-block:: yaml

      - name: Publish to VS Code Marketplace
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
        run: npx vsce publish --packagePath packages/core/jarvis-*.vsix --no-dependencies

   * Uses ``--packagePath`` to publish the already-built VSIX — no double-bundle.
   * ``VSCE_PAT`` is read from the ``VSCE_PAT`` repository secret.
   * The GitHub Release step above remains unchanged.

   **Updated ``release.yml``:**

   .. code-block:: yaml

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
                node-version: '22'
            - run: npm ci
            - run: npm run compile
            - run: npm run package
            - name: Create GitHub Release
              uses: softprops/action-gh-release@v2
              with:
                files: 'packages/core/*.vsix'
                generate_release_notes: true
            - name: Publish to VS Code Marketplace
              env:
                VSCE_PAT: ${{ secrets.VSCE_PAT }}
              run: npx vsce publish --packagePath packages/core/jarvis-*.vsix --no-dependencies

   Note: ``files: 'packages/core/*.vsix'`` is updated from ``'*.vsix'`` to reflect
   the actual VSIX location in the monorepo.

   **Acceptance Criteria (testable)**

   * AC-1: ``.github/workflows/release.yml`` contains the ``Publish to VS Code Marketplace`` step
   * AC-2: The step uses ``--packagePath`` pointing to ``packages/core/jarvis-core-*.vsix``
   * AC-3: The ``VSCE_PAT`` env var is sourced from ``secrets.VSCE_PAT``
   * AC-4: The Create GitHub Release step ``files`` pattern covers all VSIX locations

   .. note::
      The complete current workflow (including all add-on publish steps and the
      ``packages/core-gh`` legacy build) is described in **SPEC_REL_COREGH**.


.. spec:: Legacy GitHub Release Package (enthali.jarvis)
   :id: SPEC_REL_COREGH
   :status: draft
   :links: REQ_REL_RELEASEACTION

   **Description:**
   ``packages/core-gh/`` is a thin packaging-only directory that produces the
   legacy ``enthali.jarvis`` VSIX for GitHub Releases, sharing the compiled bundle
   from ``packages/core/``.

   **Directory layout (committed):**

   .. code-block:: text

      packages/core-gh/
        package.json        ← name="jarvis", same contributes as core
        README.md           ← explains legacy status, links to jarvis-core
        .vscodeignore       ← excludes *.map, *.d.ts
        resources/          ← jarvis.svg, jarvis-128.png (copies from core)
        schemas/            ← session.schema.json (copy from core)
        # out/ is NOT committed; CI copies it from packages/core/out/ at release time

   **Key rules:**

   * ``packages/core-gh/`` has **no** ``src/``, **no** ``build.js``, **no** ``vscode:prepublish``.
     The extension behaviour is 100% determined by ``out/extension.js`` copied from core.
   * The ``contributes`` block in ``core-gh/package.json`` MUST be kept in sync with
     ``core/package.json`` whenever commands, views, or settings are added to core.
     (This constraint is removed once ``core-gh`` is EOL'd in a future CR.)
   * ``enthali.jarvis`` is NOT published to the Marketplace — GitHub Release upload only.

   **CI steps for core-gh packaging (in release.yml):**

   .. code-block:: yaml

      - name: Copy bundle to core-gh
        run: |
          mkdir -p packages/core-gh/out
          cp packages/core/out/extension.js packages/core-gh/out/extension.js
          cp packages/core/out/sql-wasm.wasm packages/core-gh/out/sql-wasm.wasm
      - name: Package enthali.jarvis (legacy)
        run: cd packages/core-gh && npx vsce package --no-dependencies

   **Complete release.yml CI sequence:**

   1. ``npm ci`` + ``npm run compile`` + esbuild bundle (core)
   2. Package ``enthali.jarvis-core`` from ``packages/core/``
   3. Copy bundle → ``packages/core-gh/out/`` + package ``enthali.jarvis``
   4. Package add-ons (``pim``, ``recorder``, ``mcp``) — each runs own ``vscode:prepublish``
   5. GitHub Release — upload all VSIXs (core, core-gh, pim, recorder, mcp)
   6. Marketplace publish — ``jarvis-core`` + add-ons only (NOT ``jarvis``)

   **Acceptance Criteria (testable)**

   * AC-1: ``packages/core-gh/`` directory exists with ``package.json``, ``README.md``, ``resources/``, ``schemas/``
   * AC-2: ``packages/core-gh/package.json`` ``name`` is ``"jarvis"``; no ``vscode:prepublish``
   * AC-3: After copying ``out/`` from core, ``cd packages/core-gh && vsce package --no-dependencies`` succeeds
   * AC-4: ``enthali.jarvis`` VSIX is uploaded to GitHub Release
   * AC-5: ``enthali.jarvis`` VSIX is NOT in any marketplace publish step

   <!-- Implementation: SPEC_REL_AGENTPOLICY -->
   <!-- Requirements: REQ_REL_AGENTPOLICY -->


.. spec:: No-Push Constraint in Release Agent
   :id: SPEC_REL_BRANCHRETENTION
   :status: implemented
   :links: REQ_REL_BRANCHRETENTION

   **Description:**
   The Release Agent `Constraints` block SHALL include the instruction:
   "Do NOT push feature branches to origin after merging."

   <!-- Implementation: SPEC_REL_BRANCHRETENTION -->
   <!-- Requirements: REQ_REL_BRANCHRETENTION -->


.. spec:: No Direct Commits Policy in copilot-instructions
   :id: SPEC_REL_NOHOTFIX
   :status: implemented
   :links: REQ_REL_NOHOTFIX

   **Description:**
   The `## Git Workflow` section in `.github/copilot-instructions.md` SHALL explicitly
   state that all changes including hotfixes go through the Change process — no direct
   commits to `main`.


.. spec:: Sphinx Configuration Migration to needs_fields + requirements.txt
   :id: SPEC_REL_SPHINXCOMPAT
   :status: implemented
   :links: REQ_REL_SPHINXCOMPAT

   **Description:**
   Three changes to fix CI docs deploy and synchronise local/CI environments:

   1. Create `docs/requirements.txt` pinning: `sphinx==9.1.0`, `sphinx-needs==8.0.0`,
      `furo==2025.12.19`, `myst-parser==5.0.0`.

   2. Update `.github/workflows/docs.yml`: replace inline pip install with
      `pip install -r docs/requirements.txt`.

   3. Update `docs/conf.py`: remove `needs_extra_options`, `needs_statuses`,
      `html_static_path`; add `needs_fields` dict with `priority`, `rationale`,
      `acceptance_criteria` (plain string fields) and `status` with enum constraint.

   <!-- Implementation: SPEC_REL_SPHINXCOMPAT -->
   <!-- Requirements: REQ_REL_SPHINXCOMPAT -->


.. spec:: GitHub API Fetch and Version Compare
   :id: SPEC_REL_UPDATECHECK
   :status: implemented
   :links: REQ_REL_UPDATECHECK; SPEC_DEV_LOGCHANNEL

   **Description:**
   Create a new module ``src/updateCheck.ts`` with the core update-check logic.

   **GitHub API call:**

   .. code-block:: typescript

      import * as https from 'https';

      interface GitHubRelease {
        tag_name: string;
        html_url: string;
        assets: { name: string; browser_download_url: string }[];
      }

      function fetchLatestRelease(): Promise<GitHubRelease> {
        const options = {
          hostname: 'api.github.com',
          path: '/repos/enthali/jarvis/releases/latest',
          headers: { 'User-Agent': 'Jarvis-VSCode-Extension' }
        };
        return new Promise((resolve, reject) => {
          https.get(options, res => {
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}`));
              res.resume();
              return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
          }).on('error', reject);
        });
      }

   **Version comparison:**

   .. code-block:: typescript

      function isNewer(remote: string, local: string): boolean {
        const r = remote.replace(/^v/, '').split('.').map(Number);
        const l = local.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
          if ((r[i] || 0) > (l[i] || 0)) return true;
          if ((r[i] || 0) < (l[i] || 0)) return false;
        }
        return false;
      }

   **Exported entry point** ``checkForUpdates(context, silent)``:

   * Calls ``fetchLatestRelease()``
   * Compares ``tag_name`` with ``context.extension.packageJSON.version``
   * If newer → calls notification flow (SPEC_REL_UPDATENOTIFY)
   * If equal/older and ``silent === false`` → shows "up to date" message
   * On error and ``silent === true`` → swallow silently


.. spec:: Update Notification UX
   :id: SPEC_REL_UPDATENOTIFY
   :status: implemented
   :links: REQ_REL_UPDATENOTIFY; REQ_REL_UPDATEINSTALL

   **Description:**
   Show an information notification with two action buttons when an update is available.

   **Notification:**

   .. code-block:: typescript

      const action = await vscode.window.showInformationMessage(
        `Jarvis v${newVersion} is available (current: v${currentVersion})`,
        'Release Notes',
        'Download & Install'
      );

   **"Release Notes" handler:**

   .. code-block:: typescript

      if (action === 'Release Notes') {
        vscode.env.openExternal(vscode.Uri.parse(release.html_url));
      }

   **"Download & Install" handler:**

   1. Find the first asset where ``name`` ends with ``.vsix``
   2. If no ``.vsix`` asset found → show error and open ``html_url`` as fallback
   3. Download the ``.vsix`` via HTTPS to ``os.tmpdir() + '/' + asset.name``
   4. Install via:

      .. code-block:: typescript

         await vscode.commands.executeCommand(
           'workbench.extensions.installExtension',
           vscode.Uri.file(tmpPath)
         );

   5. After install, prompt reload:

      .. code-block:: typescript

         const reload = await vscode.window.showInformationMessage(
           `Jarvis has been updated. Reload to activate v${newVersion}.`,
           'Reload Now'
         );
         if (reload === 'Reload Now') {
           vscode.commands.executeCommand('workbench.action.reloadWindow');
         }

   6. Clean up the temporary ``.vsix`` file after install.


.. spec:: Command Registration and Activation Hook
   :id: SPEC_REL_UPDATECOMMAND
   :status: implemented
   :links: REQ_REL_UPDATECOMMAND; SPEC_DEV_LOGCHANNEL

   **Description:**
   Register the manual command and wire the automatic check into the activation flow.

   **package.json command entry:**

   .. code-block:: json

      {
        "command": "jarvis.checkForUpdates",
        "title": "Jarvis: Check for Updates"
      }

   **In ``extension.ts`` activate():**

   .. code-block:: typescript

      import { checkForUpdates } from './updateCheck';

      // Automatic check (silent = true → no "up to date" message, errors swallowed)
      const autoCheck = vscode.workspace
        .getConfiguration('jarvis')
        .get<boolean>('checkForUpdates', true);
      if (autoCheck) {
        checkForUpdates(context, true);
      }

      // Manual command (silent = false → shows "up to date" or errors)
      context.subscriptions.push(
        vscode.commands.registerCommand('jarvis.checkForUpdates', () =>
          checkForUpdates(context, false)
        )
      );


.. spec:: Extension Package Contract
   :id: SPEC_REL_PKGCONTRACT
   :status: implemented
   :links: REQ_REL_PKGCONTRACT

   **Description:**
   Every publishable Jarvis extension (core and all add-ons) SHALL conform to a
   uniform package contract. The contract ensures all extensions can be packaged
   with the same CI strategy: ``vsce package --no-dependencies`` after esbuild
   bundling.

   **Required files per package:**

   ``build.js``
      esbuild script. Entry: ``src/extension.ts``. Output: ``out/extension.js``.
      Options: ``bundle: true``, ``format: 'cjs'``, ``platform: 'node'``,
      ``target: 'node20'``, ``sourcemap: true``, ``minify`` via ``--minify`` argv flag.
      ``external: ['vscode', 'jarvis-core']``.
      Add-on runtime production deps (e.g. ``@modelcontextprotocol/sdk``) are
      **inlined** (not listed as external).

   ``.vscodeignore``
      Excludes: ``src/``, ``node_modules/``, ``tsconfig.json``, ``build.js``,
      ``**/*.map``, ``**/*.ts``. Preserves ``out/``.

   **Required ``package.json`` entries:**

   .. code-block:: json

      {
        "scripts": {
          "bundle": "node build.js",
          "vscode:prepublish": "npm run compile && npm run bundle"
        },
        "devDependencies": {
          "esbuild": "^0.25.0"
        }
      }

   **Rationale:**
   Without bundling, ``vsce`` in an npm-workspaces monorepo either fails (``../../``
   path resolution error) or produces bloated VSIXs that include hoisted
   dependencies from the root. Bundling with ``external: ['vscode', 'jarvis-core']``
   ensures the VSIX is self-contained while keeping the runtime peer dependency
   resolved by the VS Code extension host.
