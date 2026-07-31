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
     Generated from ``resources/jarvis.svg`` by ``scripts/generate-icons.mjs``.
     The icon depicts a right-pointing play triangle with a serif J inside.
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


.. spec:: Legacy Package → Migration Shim (enthali.jarvis)
   :id: SPEC_REL_COREGH
   :status: draft
   :links: REQ_REL_RELEASEACTION; REQ_REL_RETIRENORELEASE

   **Description:**
   ``packages/core-gh/`` produces the legacy ``enthali.jarvis`` VSIX for GitHub
   Releases. In its **final** release it is no longer a re-export of ``core`` — it is
   converted into a self-contained **migration shim** with its own minimal bundle.
   It no longer shares ``out/extension.js`` from ``packages/core/``.

   **Directory layout (committed):**

   .. code-block:: text

      packages/core-gh/
        package.json        ← name="jarvis", minimal contributes (migration only)
        build.js            ← esbuild script bundling src/extension.ts
        src/extension.ts    ← migration shim entry point (see SPEC_REL_RETIRESHIM)
        src/migrate.ts      ← migration logic (install/uninstall/fallback)
        README.md           ← explains EOL status, links to jarvis-core
        .vscodeignore       ← excludes src/, *.map, *.ts; preserves out/
        resources/          ← jarvis.svg, jarvis-128.png
        schemas/            ← (removed — shim contributes no yamlValidation)

   **Manifest reduction (``core-gh/package.json``):**

   * ``viewsContainers``, ``views``, ``commands``, ``menus``, ``configuration`` and
     ``yamlValidation`` contributions are **removed** — the shim registers no UI.
   * ``activationEvents`` is reduced to ``onStartupFinished`` only.
   * ``main`` points to ``./out/extension.js`` (the shim's own bundle).
   * Adopts the package contract (SPEC_REL_PKGCONTRACT): ``build.js``,
     ``bundle`` / ``vscode:prepublish`` scripts, ``esbuild`` devDependency.

   **Key rules:**

   * ``core-gh`` now has its **own** ``src/`` and ``build.js``; the prior
     "contributes must stay in sync with core" constraint is **removed** (this is the
     EOL CR that SPEC_REL_COREGH previously anticipated).
   * CI **no longer copies** ``packages/core/out/`` into ``core-gh``; ``core-gh``
     builds its own bundle via ``vscode:prepublish``.
   * ``enthali.jarvis`` is NOT published to the Marketplace — GitHub Release upload only.
   * This is the **final** ``enthali.jarvis`` release; the VSIX remains downloadable so
     existing users still receive it via the self-update check (REQ_REL_UPDATECHECK)
     and are migrated.

   **CI steps for core-gh packaging (in release.yml):**

   .. code-block:: yaml

      - name: Package enthali.jarvis (legacy migration shim)
        run: cd packages/core-gh && npx vsce package --no-dependencies

   **Complete release.yml CI sequence:**

   1. ``npm ci`` + ``npm run compile`` + esbuild bundle (core)
   2. Package ``enthali.jarvis-core`` from ``packages/core/``
   3. Build + package ``enthali.jarvis`` migration shim from ``packages/core-gh/``
      (own ``vscode:prepublish`` — no bundle copy from core)
   4. Package add-ons (``pim``, ``recorder``, ``mcp``, ``flow``, ``syspilot``) — each runs own ``vscode:prepublish``
   5. GitHub Release — upload all VSIXs (core, core-gh shim, pim, recorder, mcp, flow, syspilot)
   6. Marketplace publish — ``jarvis-core`` + add-ons only (NOT ``jarvis``)

   **Acceptance Criteria (testable)**

   * AC-1: ``packages/core-gh/`` contains ``package.json``, ``build.js``,
     ``src/extension.ts``, ``README.md``, ``resources/``
   * AC-2: ``core-gh/package.json`` ``name`` is ``"jarvis"``; ``contributes`` declares
     no views, commands, or yamlValidation; ``activationEvents`` is
     ``["onStartupFinished"]``
   * AC-3: ``cd packages/core-gh && npm run bundle && vsce package --no-dependencies``
     succeeds **without** copying any bundle from ``packages/core/``
   * AC-4: ``enthali.jarvis`` shim VSIX is uploaded to GitHub Release
   * AC-5: ``enthali.jarvis`` VSIX is NOT in any marketplace publish step
   * AC-6: No ``enthali.jarvis`` release is produced after this shim release


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
   The "Download & Install" action runs the selective install flow covering all installed
   ``enthali.jarvis*`` extensions.

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

   **"Download & Install" handler (selective):**

   1. Build the extension ID → VSIX filename mapping:

      =============================== ======================================
      Extension ID                    VSIX filename
      =============================== ======================================
      ``enthali.jarvis``              ``jarvis-{version}.vsix``
      ``enthali.jarvis-core``         ``jarvis-core-{version}.vsix``
      ``enthali.jarvis-pim``          ``jarvis-pim-{version}.vsix``
      ``enthali.jarvis-recorder``     ``jarvis-recorder-{version}.vsix``
      ``enthali.jarvis-mcp``          ``jarvis-mcp-{version}.vsix``
      ``enthali.jarvis-flow``         ``jarvis-flow-{version}.vsix``
      ``enthali.jarvis-syspilot``     ``jarvis-syspilot-{version}.vsix``
      =============================== ======================================

   2. Collect installed ``enthali.jarvis*`` extension IDs via
      ``vscode.extensions.all``.

   3. For each installed ID, look up the expected VSIX filename and find the
      matching asset in ``release.assets``.

   4. If no assets match → show error and open ``html_url`` as fallback.

   5. Download each matched asset to ``os.tmpdir()`` via HTTPS, install via:

      .. code-block:: typescript

         await vscode.commands.executeCommand(
           'workbench.extensions.installExtension',
           vscode.Uri.file(tmpPath)
         );

      Clean up the temporary file after each install.

   6. After all installs succeed, show a single reload prompt:

      .. code-block:: typescript

         const reload = await vscode.window.showInformationMessage(
           `Jarvis has been updated. Reload to activate v${newVersion}.`,
           'Reload Now'
         );
         if (reload === 'Reload Now') {
           vscode.commands.executeCommand('workbench.action.reloadWindow');
         }


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


.. spec:: Release Notes on Update
   :id: SPEC_REL_RELEASENOTES
   :status: approved
   :links: REQ_REL_NOTESTARGET; REQ_REL_NOTESMARKER; REQ_REL_NOTESONCE; REQ_REL_NOTESCOMMAND; REQ_REL_NOTESSETTING; REQ_CFG_FIXEDPATHS; REQ_CFG_PATHSINGLESOURCE; REQ_CFG_IGNOREPATTERNS; SPEC_CFG_PATHRESOLVER; SPEC_DEV_LOGCHANNEL

   **Description:**
   New module ``packages/core/src/engine/core/releaseNotes.ts`` shows the GitHub
   release page for the installed version in the editor's own browser view —
   automatically the first time that version runs, and on demand from the
   Command Palette. Contributed by ``enthali.jarvis-core`` only.

   **Manifest contributions (**\ ``packages/core/package.json``\ **):**

   .. code-block:: json

      {
        "command": "jarvis.showReleaseNotes",
        "title": "Jarvis: Show Release Notes"
      }

   Added to the existing ``Updates`` configuration group, beside
   ``jarvis.checkForUpdates``:

   .. code-block:: json

      "jarvis.releaseNotes.showOnUpdate": {
        "type": "boolean",
        "default": true,
        "scope": "application",
        "description": "Open the release notes in the editor the first time a newly installed Jarvis version runs. The command \"Jarvis: Show Release Notes\" works regardless of this setting."
      }

   No new settings group is introduced, so ``REQ_CFG_GROUPS`` is neither
   extended nor contradicted here. That requirement and ``SPEC_CFG_MANIFEST``
   are both stale and were escalated by GH #60; this element defines its own
   contributions rather than amending that snapshot, following the
   ``SPEC_HOOK_AUTOINST`` precedent.

   **Marker file:**

   .. code-block:: typescript

      import * as fs from 'fs';
      import {
          getJarvisDir, ensureStateDir, getReleaseNotesStatePath
      } from '../core/configPaths';

      interface ReleaseNotesState { lastShownVersion?: string; }

      function readState(): ReleaseNotesState | undefined {
          const file = getReleaseNotesStatePath();
          if (!file || !fs.existsSync(file)) { return undefined; }
          try {
              return JSON.parse(fs.readFileSync(file, 'utf8')) as ReleaseNotesState;
          } catch {
              return undefined;
          }
      }

      function writeState(version: string): void {
          ensureStateDir();
          const file = getReleaseNotesStatePath()!;
          fs.writeFileSync(
              file, JSON.stringify({ lastShownVersion: version }, null, 2), 'utf8'
          );
      }

   **Target and opening:**

   .. code-block:: typescript

      const INTEGRATED_BROWSER = 'workbench.action.browser.open';
      const SIMPLE_BROWSER_OPEN = 'simpleBrowser.api.open';

      function notesUri(version: string): vscode.Uri {
          return vscode.Uri.parse(
              `https://github.com/enthali/jarvis/releases/tag/v${version}`
          );
      }

      async function openInEditor(uri: vscode.Uri): Promise<boolean> {
          const commands = await vscode.commands.getCommands(true);
          if (!commands.includes(INTEGRATED_BROWSER)) { return false; }
          await vscode.commands.executeCommand(SIMPLE_BROWSER_OPEN, uri);
          return true;
      }

      async function open(version: string, log?: vscode.LogOutputChannel): Promise<void> {
          const uri = notesUri(version);
          try {
              if (await openInEditor(uri)) { return; }
              log?.warn(`[ReleaseNotes] integrated browser unavailable: ${uri.toString()}`);
          } catch (e) {
              log?.warn(`[ReleaseNotes] in-editor open failed: ${e}`);
          }
          const choice = await vscode.window.showInformationMessage(
              `Jarvis release notes: ${uri.toString()}`,
              'Open in Browser'
          );
          if (choice) { void vscode.env.openExternal(uri); }
      }

   **Automatic path:**

   .. code-block:: typescript

      export async function announceIfNewVersion(
          context: vscode.ExtensionContext,
          log?: vscode.LogOutputChannel
      ): Promise<void> {
          if (!getReleaseNotesStatePath()) {
              log?.warn('[ReleaseNotes] no workspace folder open, nothing to announce');
              return;
          }

          const installed: string = context.extension.packageJSON.version;
          const seen = readState()?.lastShownVersion;
          if (seen === installed) { return; }

          // Must be sampled before writeState(): ensureStateDir() creates
          // .jarvis/ and would make every workspace look known.
          const jarvisDir = getJarvisDir();
          const knownWorkspace = !!jarvisDir && fs.existsSync(jarvisDir);

          try {
              writeState(installed);
          } catch (e) {
              log?.error(`[ReleaseNotes] marker write failed, not opening: ${e}`);
              return;
          }

          if (seen === undefined && !knownWorkspace) {
              log?.info(`[ReleaseNotes] workspace new to Jarvis, recorded v${installed}`);
              return;
          }

          const enabled = vscode.workspace
              .getConfiguration('jarvis.releaseNotes')
              .get<boolean>('showOnUpdate', true);
          if (!enabled) { return; }

          log?.info(`[ReleaseNotes] ${seen ?? 'unrecorded'} → v${installed}, opening notes`);
          await open(installed, log);
      }

   **Manual path:**

   .. code-block:: typescript

      export async function showReleaseNotes(
          context: vscode.ExtensionContext,
          log?: vscode.LogOutputChannel
      ): Promise<void> {
          await open(context.extension.packageJSON.version, log);
      }

   **In** ``extension.ts`` **activate():**

   .. code-block:: typescript

      // Deliberately not awaited: activation must not wait on a browser view
      // (REQ_REL_NOTESONCE AC-8).
      void announceIfNewVersion(context, log);

      const showReleaseNotesCommand = vscode.commands.registerCommand(
          'jarvis.showReleaseNotes',
          () => showReleaseNotes(context, log)
      );

   **Design notes:**

   * **Why the integrated browser is probed for rather than assumed.**
     ``simpleBrowser.api.open`` is not one behaviour. It tests for
     ``workbench.action.browser.open`` and delegates to the integrated browser
     when present; otherwise it renders the page in its own iframe-based
     webview. GitHub serves the release page with ``X-Frame-Options: deny`` and
     ``frame-ancestors 'none'``, so in the fallback the frame is refused and the
     user gets an empty pane — while the command resolves successfully, leaving
     nothing to detect afterwards. Probing first turns a blank pane into the
     message of ``REQ_REL_NOTESTARGET`` AC-6.

   * **Why the probe is not too early at activation time.**
     ``workbench.action.browser.open`` is a workbench command, registered by
     VS Code itself rather than by an extension, so its presence does not depend
     on activation order. ``simpleBrowser.api.open`` is contributed by a
     built-in extension that declares ``onCommand:simpleBrowser.api.open``, so
     executing it activates that extension on demand.

   * **Why** ``.jarvis/state/`` **and not a new top-level runtime file.** That
     directory already exists, already holds transient state, and is already
     declared ``transient`` in ``WORKSPACE_PATHS``. The marker therefore reaches
     the maintained ``.gitignore`` region without a new entry and without a
     second list to keep in step — which is what ``REQ_CFG_IGNOREPATTERNS``
     AC-6 asks for. A file directly under ``.jarvis/`` would have needed one.

   * **Why the path comes from the resolver.** ``getReleaseNotesStatePath()``
     is the only way this module learns where the marker lives, and its
     ``undefined`` return is the module's "no workspace open" signal
     (``REQ_CFG_FIXEDPATHS`` AC-3). Resolving the workspace root here instead
     would be the defect ``REQ_CFG_PATHSINGLESOURCE`` AC-1 names, and the
     ``?? ''`` that usually accompanies it would turn "no workspace" into a
     path under the process working directory.

   * **Why** ``knownWorkspace`` **is sampled before the marker is written.**
     ``writeState()`` calls ``ensureStateDir()``, which creates ``.jarvis/``
     on the way to ``.jarvis/state/``. Reading the directory's existence
     afterwards would report every workspace as known and open the notes in
     brand-new projects, which ``US_REL_WHATSNEW`` AC-3 forbids. The two lines
     look independent and are not.

   * **Why the setting is read after the marker is written.** The guard reads
     as though it belongs at the top of the function, and moving it there is the
     obvious tidy-up. It would implement ``REQ_REL_NOTESSETTING`` AC-4
     backwards: with the setting off, the marker would stop advancing, and
     turning the setting back on months later would send the user to the notes
     of whichever version was current when they turned it off.

   * **A marker that cannot be parsed is treated as absent.** ``readState()``
     swallows the parse error deliberately: the file holds one regenerable
     string, and ``REQ_REL_NOTESMARKER`` AC-5 makes its loss a non-event. The
     alternative — surfacing a JSON error to the user during activation —
     reports a problem they did not cause and cannot act on.

   * **The two silent cases are kept apart on purpose.** Collapsing them into
     ``if (seen !== installed) { open(); }`` is shorter and opens a tab in
     every project the user opens for the first time, which
     ``REQ_REL_NOTESONCE`` AC-2 forbids; collapsing the other way, into
     ``if (seen === undefined) { return; }``, silences the release that
     introduces the marker in every existing workspace. The distinguishing
     evidence is the ``.jarvis/`` directory, not the marker.

   * **Only** ``core`` **registers this.** All nine ``enthali.*`` extensions
     activate in the same workspace, so nine of them would write the same
     marker file and race to announce the same update, and each would
     contribute its own palette entry. Same single-writer constraint, and the
     same premise, as ``SPEC_CFG_IGNOREMANAGER`` (``US_CFG_RUNTIMELAYOUT``
     AC-5: no activation order is guaranteed).

   * **No network call is made by this module.** The URL is built from a version
     already known locally. The browser view then fetches the page, as any
     browser would; what ``REQ_REL_NOTESTARGET`` AC-4 rules out is Jarvis
     resolving or validating the target itself. ``SPEC_REL_UPDATECHECK`` uses
     the API because only the API knows what the newest release is; that reason
     does not apply to a version the extension host is currently running.

   **Acceptance Criteria:**

   * AC-1: ``packages/core/package.json`` contributes the command and the
     setting exactly as shown, and the setting appears in the ``Updates`` group
   * AC-2: With no workspace folder open, activation opens nothing, writes
     nothing, throws nothing, and logs one warning
   * AC-3: With no marker file and no ``.jarvis/`` directory, activation opens
     nothing and leaves ``.jarvis/state/release-notes.json`` holding the
     installed version
   * AC-4: With no marker file, an existing ``.jarvis/`` directory and the
     setting ``true``, activation opens the notes for the installed version
   * AC-5: With the marker equal to the installed version, activation opens
     nothing, shows no notification and makes no network request
   * AC-6: With a marker differing from the installed version and the setting
     ``true``, exactly one ``simpleBrowser.api.open`` call is made, with a
     ``Uri`` of ``https://github.com/enthali/jarvis/releases/tag/v{installed}``,
     and ``vscode.env.openExternal`` is not called
   * AC-7: With a marker differing from the installed version and the setting
     ``false``, nothing is opened and the marker is advanced to the installed
     version
   * AC-8: If the marker write throws, nothing is opened
   * AC-9: A marker file that is absent, empty, or unparseable produces the
     behaviour of AC-3/AC-4 and no user-visible error
   * AC-10: If ``workbench.action.browser.open`` is absent from
     ``getCommands(true)``, ``simpleBrowser.api.open`` is not invoked. In that
     case, and in the case where it is invoked and throws, an information
     message containing the URL and an **"Open in Browser"** control is shown;
     ``vscode.env.openExternal`` is called if and only if that control is chosen
   * AC-11: The manual command opens the installed version's notes irrespective
     of marker and setting, leaves the marker unchanged, and works with no
     workspace folder open
   * AC-12: The module obtains the marker path only from
     ``getReleaseNotesStatePath()`` and contains no ``workspaceFolders``
     reference and no ``globalState`` access
   * AC-13: No package other than ``core`` registers ``jarvis.showReleaseNotes``
     or reads or writes the marker file
   * AC-14: Activation completes even if ``simpleBrowser.api.open`` never
     resolves
   * AC-15: ``vscode.env.openExternal`` appears in this module only on the
     user-chosen branch of AC-10


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

   **Acceptance Criteria:**

   * AC-1: Each extension package contains a ``build.js`` esbuild script that bundles
     ``src/extension.ts`` into ``out/extension.js`` with ``format: cjs``,
     ``platform: node``, ``target: node20``, ``sourcemap: true``, and ``--minify``
     support via a ``process.argv`` flag.
   * AC-2: ``vscode`` and ``jarvis-core`` are always listed as esbuild ``external``
     entries; no other workspace-peer packages are bundled.
   * AC-3: ``package.json`` defines ``bundle: "node build.js"`` and
     ``vscode:prepublish: "npm run compile && npm run bundle"``.
   * AC-4: ``esbuild`` is listed in ``devDependencies``.
   * AC-5: A ``.vscodeignore`` file excludes ``src/``, ``node_modules/``,
     ``tsconfig.json``, ``build.js``, ``**/*.map``, and ``**/*.ts``
     while preserving ``out/``.
   * AC-6: All extensions are packaged with ``vsce package --no-dependencies``.
   * AC-7: After any workspace package dependency change, ``npm install`` is run at
     the monorepo root and the updated ``package-lock.json`` is committed. ``npm ci``
     succeeds locally before a release tag is pushed.
   * AC-8: Every publishable extension's ``package.json`` includes an ``icon`` field
     pointing to ``resources/jarvis-128.png`` (128×128 PNG). The PNG is generated
     from ``resources/jarvis.svg`` via ``scripts/generate-icons.mjs``. The
     ``resources/`` directory is NOT excluded by ``.vscodeignore``.

   **Rationale:**
   Without bundling, ``vsce`` in an npm-workspaces monorepo either fails (``../../``
   path resolution error) or produces bloated VSIXs that include hoisted
   dependencies from the root. Bundling with ``external: ['vscode', 'jarvis-core']``
   ensures the VSIX is self-contained while keeping the runtime peer dependency
   resolved by the VS Code extension host.


.. spec:: Icon Generation and Alignment
   :id: SPEC_REL_ICONALIGN
   :status: implemented
   :links: REQ_REL_ICONALIGN; REQ_REL_PKGCONTRACT

   **Description:**
   All Jarvis icons are derived from a single monochromatic SVG source file.
   A generation script produces all derived icon files, which are committed to
   the repository.

   **Source of Truth:**

   ``resources/jarvis.svg``
      Monochromatic SVG (``viewBox="0 0 24 24"``, ``stroke="currentColor"``).
      Used directly by ``core`` and ``core-gh`` as the VS Code activity bar icon.
      The icon depicts a right-pointing play triangle with a serif J inside.

   **Generation Script:**

   ``scripts/generate-icons.mjs``
      Reads the source SVG and produces:

      * **SVG copies** → ``packages/core/resources/jarvis.svg``,
        ``packages/core-gh/resources/jarvis.svg``
      * **128×128 marketplace PNGs** → ``packages/{core,core-gh,mcp,pim,recorder}/resources/jarvis-128.png``

      The marketplace PNG renders the same triangle and J with brand colours
      (light-blue fill ``#6cc2e0``, white J ``#ffffff``, dark background
      ``#1e1e2e`` with rounded corners).

      Requires ``sharp`` (listed in root ``devDependencies``).
      Invoked via ``npm run generate-icons``.

   **Icon Modification Process:**

   1. Edit ``resources/jarvis.svg``
   2. Run ``npm run generate-icons``
   3. Commit all generated files

   **Acceptance Criteria:**

   * AC-1: ``resources/jarvis.svg`` is a valid monochromatic SVG using only
     ``currentColor`` — no hardcoded colour values.
   * AC-2: ``scripts/generate-icons.mjs`` produces SVG copies for ``core`` and
     ``core-gh``, and 128×128 PNGs for all five publishable packages.
   * AC-3: The marketplace PNG uses the same triangle + J shape as the SVG source,
     rendered with brand colours.
   * AC-4: ``npm run generate-icons`` is defined in the root ``package.json``.
   * AC-5: Generated files are committed to the repository — no CI pipeline change
     is required.


.. spec:: Migration Shim Activation
   :id: SPEC_REL_RETIRESHIM
   :status: draft
   :links: REQ_REL_RETIRESHIM; SPEC_REL_COREGH

   **Description:**
   ``packages/core-gh/src/extension.ts`` is the migration shim entry point. Its
   ``activate()`` registers **no** Jarvis runtime surfaces and runs the migration
   sequence only.

   **activate() implementation:**

   .. code-block:: typescript

      import * as vscode from 'vscode';
      import { migrate } from './migrate';

      export function activate(context: vscode.ExtensionContext): void {
        // Register NO views, NO heartbeat, NO message processing, NO commands.
        // The shim's only job is to migrate to enthali.jarvis-core and remove itself.
        void vscode.window.showInformationMessage(
          'Jarvis has moved to "Jarvis Core" (enthali.jarvis-core). Migrating…'
        );
        void migrate(context);
      }

      export function deactivate(): void { /* nothing */ }

   **Acceptance Criteria:**

   * AC-1: ``activate()`` registers no tree views, no heartbeat scheduler, no
     message-queue processing, and no Jarvis commands.
   * AC-2: On activation an information notification states that Jarvis has moved to
     ``enthali.jarvis-core`` and migration is in progress.
   * AC-3: ``activate()`` delegates all migration work to ``migrate()`` and returns
     immediately (non-blocking).


.. spec:: Ensure jarvis-core Installed (Channel Fallback)
   :id: SPEC_REL_RETIREINSTALL
   :status: draft
   :links: REQ_REL_RETIREINSTALL; SPEC_REL_UPDATECHECK

   **Description:**
   ``ensureCoreInstalled()`` detects ``enthali.jarvis-core`` and, if absent, installs
   it — Marketplace first, GitHub ``.vsix`` fallback when the Marketplace is
   unreachable. The GitHub fallback reuses the release-fetch and install mechanism
   from SPEC_REL_UPDATECHECK / SPEC_REL_UPDATENOTIFY.

   **Implementation:**

   .. code-block:: typescript

      const CORE_ID = 'enthali.jarvis-core';

      async function ensureCoreInstalled(): Promise<boolean> {
        // Already present?
        if (vscode.extensions.getExtension(CORE_ID)) {
          return true;
        }
        // 1) Marketplace install (by extension ID)
        try {
          await vscode.commands.executeCommand(
            'workbench.extensions.installExtension', CORE_ID
          );
          return true;
        } catch { /* fall through to GitHub */ }

        // 2) GitHub Releases .vsix fallback (corporate/private marketplace)
        try {
          const release = await fetchLatestRelease();          // reused
          const asset = release.assets.find(a =>
            a.name === `jarvis-core-${release.tag_name.replace(/^v/, '')}.vsix`);
          if (!asset) return false;
          const tmp = await downloadToTmp(asset.browser_download_url); // reused
          await vscode.commands.executeCommand(
            'workbench.extensions.installExtension', vscode.Uri.file(tmp)
          );
          return true;
        } catch {
          return false;
        }
      }

   **Acceptance Criteria:**

   * AC-1: Presence is detected via ``vscode.extensions.getExtension('enthali.jarvis-core')``.
   * AC-2: If absent, a Marketplace install is attempted with the extension ID.
   * AC-3: On Marketplace failure, the ``jarvis-core-{version}.vsix`` GitHub asset is
     downloaded and installed (mechanism reused from SPEC_REL_UPDATENOTIFY).
   * AC-4: Returns ``true`` if ``jarvis-core`` is present or successfully installed via
     either channel; ``false`` if both channels fail.


.. spec:: Legacy Self-Uninstall and Reload
   :id: SPEC_REL_RETIREUNINSTALL
   :status: draft
   :links: REQ_REL_RETIREUNINSTALL

   **Description:**
   ``retireSelf()`` uninstalls the legacy ``enthali.jarvis`` extension and prompts a
   single window reload. Called only after ``ensureCoreInstalled()`` returns ``true``.

   **Implementation:**

   .. code-block:: typescript

      const LEGACY_ID = 'enthali.jarvis';

      async function retireSelf(): Promise<void> {
        await vscode.commands.executeCommand(
          'workbench.extensions.uninstallExtension', LEGACY_ID
        );
        const reload = await vscode.window.showInformationMessage(
          'Jarvis has migrated to Jarvis Core. Reload to complete.',
          'Reload Now'
        );
        if (reload === 'Reload Now') {
          void vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      }

   **Acceptance Criteria:**

   * AC-1: ``enthali.jarvis`` is uninstalled via
     ``workbench.extensions.uninstallExtension``.
   * AC-2: A single reload prompt with a **"Reload Now"** button is shown; choosing it
     reloads the window.
   * AC-3: ``retireSelf()`` is invoked only when ``jarvis-core`` is confirmed present.


.. spec:: Migration Failure Fallback
   :id: SPEC_REL_RETIREFALLBACK
   :status: draft
   :links: REQ_REL_RETIREFALLBACK

   **Description:**
   When ``ensureCoreInstalled()`` returns ``false`` (both channels failed), the shim
   does **not** uninstall itself; it shows a manual-install notification and relies on
   the next activation to retry.

   **Migration orchestration (``migrate()``):**

   .. code-block:: typescript

      export async function migrate(_ctx: vscode.ExtensionContext): Promise<void> {
        const ok = await ensureCoreInstalled();
        if (ok) {
          await retireSelf();              // SPEC_REL_RETIREUNINSTALL
          return;
        }
        // Failure path: keep the shim installed, guide the user, retry next startup.
        const MKT = 'https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-core';
        const GH  = 'https://github.com/enthali/jarvis/releases/latest';
        const pick = await vscode.window.showWarningMessage(
          'Could not install Jarvis Core automatically. Please install it manually.',
          'Open Marketplace', 'Open GitHub Releases'
        );
        if (pick === 'Open Marketplace') {
          void vscode.env.openExternal(vscode.Uri.parse(MKT));
        } else if (pick === 'Open GitHub Releases') {
          void vscode.env.openExternal(vscode.Uri.parse(GH));
        }
        // No uninstall — migration is re-attempted on the next activation.
      }

   **Acceptance Criteria:**

   * AC-1: If both install channels fail, ``retireSelf()`` is **not** called — the
     legacy extension remains installed.
   * AC-2: A notification offers manual-install links to the ``jarvis-core``
     Marketplace listing and the GitHub Releases page.
   * AC-3: Because activation re-runs on every startup, the migration is retried until
     it succeeds.
