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
   :status: implemented
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
   * Inlined: ``cron-parser``, ``js-yaml`` (all third-party runtime deps)
   * Source maps: enabled
   * Minification: optional (``--minify`` flag)
   * Watch mode: optional (``--watch`` flag)
   * No other file is copied next to the bundle: the Core bundle carries no
     WebAssembly file (``sql.js`` and ``sql-wasm.wasm`` are removed by the
     ``retire-legacy-session-lookup`` CR)

   **2. Dev host resolution**

   The bundle is the only artefact the packaged extension needs at runtime. The
   dev host (F5) runs the code compiled by ``tsc`` from ``out/`` and needs no
   copy step.

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

   * ``out/`` — bundled extension
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
   * AC-6: The Core VSIX contains no ``.wasm`` file, and ``packages/core`` declares
     no ``sql.js`` dependency


.. spec:: Docs GitHub Actions Workflow
   :id: SPEC_REL_DOCSWORKFLOW
   :status: implemented
   :links: REQ_REL_DOCSWORKFLOW; REQ_REL_SPHINXCOMPAT

   **Description:**
   ``.github/workflows/docs.yml`` has two jobs, ``build`` and ``deploy``:

   .. code-block:: yaml

      name: Deploy Docs to GitHub Pages

      on:
        push:
          branches: [main]

      permissions:
        contents: read

      concurrency:
        group: pages
        cancel-in-progress: false

      jobs:
        build:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v7
            - uses: actions/setup-python@v7
              with:
                python-version: '3.x'
            - run: pip install -r docs/requirements.txt
            - run: python -m sphinx -b html docs docs/_build/html -W --keep-going
            - uses: actions/upload-pages-artifact@v5
              with:
                path: docs/_build/html

        deploy:
          needs: build
          runs-on: ubuntu-latest
          permissions:
            pages: write
            id-token: write
          environment:
            name: github-pages
            url: ${{ steps.deployment.outputs.page_url }}
          steps:
            - id: deployment
              uses: actions/deploy-pages@v5

   **Design notes:**

   * **Why two jobs:** in ``v0.35.0`` the three ``main`` pushes failed because
     ``deploy-pages`` ran 485 ms after ``upload-pages-artifact`` in the same job
     and found 0 artifacts (run ``45509708853``). With ``needs: build`` the
     deployment starts only after the upload job has ended, on a new runner. This
     removes the same-job timing; it does not prove that GitHub's artifact index is
     never late, so a failed ``deploy`` is repeated on its own, without a new
     Sphinx build. That second property is the reason the jobs are separate.
   * **Permissions:** ``build`` only reads the repository. The job-level
     ``permissions`` of ``deploy`` replace the workflow default, so it holds
     ``pages: write`` and ``id-token: write`` and nothing else.
   * **Concurrency:** group ``pages`` with ``cancel-in-progress: false`` is the
     GitHub Pages recommendation: a running deployment finishes, and of several
     queued runs only the newest stays.
   * **Action versions:** current majors at ``2026-11-25`` (GitHub releases):
     ``actions/checkout`` ``v7``, ``actions/setup-python`` ``v7``,
     ``actions/upload-pages-artifact`` ``v5``, ``actions/deploy-pages`` ``v5``.
     ``checkout``, ``setup-python`` and ``deploy-pages`` declare ``using: node24``
     in their ``action.yml``; ``upload-pages-artifact`` is a composite action that calls
     ``actions/upload-artifact@v7``, which declares ``using: node24``.
   * **Dependencies:** installed from ``docs/requirements.txt``
     (``REQ_REL_SPHINXCOMPAT`` AC-6), not from inline package names.
   * **Release gate:** ``docs/Jarvis Contracts/release.md``, Publication, lists the
     ``docs.yml`` run on ``main`` as a second workflow to watch and as a row in
     the Publication evidence (``REQ_REL_DOCSWORKFLOW`` AC-9).

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
   :status: implemented
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
   :status: implemented
   :links: REQ_REL_MKTPUBLISH

   **Description:**
   ``.github/workflows/release.yml`` runs on every ``v*`` tag. After the GitHub
   Release step it publishes the already-packaged VSIX of ``enthali.jarvis-core`` and
   of each supported add-on (PIM, Recorder, MCP, Flow, Kanban) to the Marketplace,
   one step per extension. The legacy ``enthali.jarvis`` shim has no publish step.

   **Authentication.** The workflow holds no Marketplace credential. It sets
   ``permissions: contents: write`` and ``id-token: write``; ``vsce publish --oidc``
   then requests a GitHub OIDC token for the audience ``marketplace.visualstudio.com``
   and exchanges it at the Marketplace for a session token valid up to 15 minutes.
   Each ``vsce publish --oidc`` invocation requests and exchanges its own token, so
   the six sequential steps need no shared state and no token is reused (``vsce``
   4.1.1, ``src/oidc.ts``). ``--oidc`` never falls back to a PAT: a failed exchange
   fails the step. The step has this shape, shown for core:

   .. code-block:: yaml

      permissions:
        contents: write
        id-token: write

      - name: Publish enthali.jarvis-core to Marketplace
        run: npx vsce publish --oidc --packagePath packages/core/jarvis-core-*.vsix --no-dependencies

   * Uses ``--packagePath`` to publish the already-built VSIX — no double-bundle.
   * No ``env`` block and no ``secrets.*`` reference: the identity is the run itself.
   * The add-on steps use the same shape with ``packages/<name>/jarvis-<name>-*.vsix``.
   * ``@vscode/vsce`` in the root ``package.json`` is ``^4.1.1``; ``--oidc`` is not in
     the 3.x line the repository used before, so the upgrade is part of this design.
   * Actions are on their Node-24 majors: ``actions/checkout@v7``,
     ``actions/setup-node@v7``, ``softprops/action-gh-release@v3``. ``node-version``
     stays ``'22'``, which is the toolchain for the build and satisfies the ``vsce``
     4.x engine range ``>= 22``; the action majors concern the runtime of the
     actions themselves, not that toolchain.
   * Channel flags are added to these steps by ``SPEC_REL_CHANNEL``; the shape above
     is the release channel.
   * The Marketplace side is a Trusted Publishing policy on publisher ``enthali``
     bound to repository ``enthali/jarvis`` and workflow file ``release.yml`` with no
     environment. It lives in the Marketplace, outside this repository, and is
     configured by the repository owner. The workflow cannot publish until it exists.
   * The GitHub Release step (``softprops/action-gh-release``) comes first and uploads
     ``packages/{core,core-gh,pim,recorder,mcp,flow,kanban}/*.vsix``, so a failed
     Marketplace publish leaves the GitHub Release in place.
   * The workflow packages each extension with ``vsce package --no-dependencies`` in
     its package directory before the Release step; core is bundled first with
     ``node packages/core/build.js --minify``.

   **Acceptance Criteria (testable)**

   * AC-1: ``.github/workflows/release.yml`` contains a ``Publish … to Marketplace``
     step for ``enthali.jarvis-core`` and for each of PIM, Recorder, MCP, Flow and
     Kanban, and none for ``enthali.jarvis``
   * AC-2: Each step uses ``--packagePath`` pointing to
     ``packages/<name>/jarvis-<name>-*.vsix`` (``packages/core/jarvis-core-*.vsix``
     for core)
   * AC-3: Every publish step runs ``vsce publish --oidc`` and ``release.yml``
     contains neither ``VSCE_PAT`` nor ``secrets.VSCE_PAT``
   * AC-4: The Create GitHub Release step ``files`` pattern covers all VSIX locations
     and precedes every publish step
   * AC-5: The workflow ``permissions`` contain ``id-token: write`` and
     ``contents: write``
   * AC-6: The root ``package.json`` declares ``@vscode/vsce`` at ``^4.1.1`` or newer
     and ``package-lock.json`` resolves it to ``4.1.1`` or newer
   * AC-7: ``release.yml`` uses ``actions/checkout@v7``, ``actions/setup-node@v7`` and
     ``softprops/action-gh-release@v3``, and no action pinned to a Node-20 major

   .. note::
      The complete current workflow (including all add-on publish steps and the
      ``packages/core-gh`` legacy build) is described in **SPEC_REL_COREGH**.


.. spec:: Release Channels in release.yml
   :id: SPEC_REL_CHANNEL
   :status: implemented
   :links: REQ_REL_CHANNEL

   **Description:**
   ``release.yml`` derives the channel from ``github.ref_name`` once, as a job
   environment variable, and uses it in three places: the ``vsce package`` steps,
   the ``vsce publish`` steps, and the GitHub Release step. The trigger stays
   ``tags: ['v*']``, which already matches ``v0.35.1-pre``.

   .. code-block:: yaml

      jobs:
        release:
          env:
            CHANNEL_FLAG: ${{ endsWith(github.ref_name, '-pre') && '--pre-release' || '' }}

      - name: Package enthali.jarvis-core
        run: cd packages/core && npx vsce package --no-dependencies $CHANNEL_FLAG

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v3
        with:
          prerelease: ${{ endsWith(github.ref_name, '-pre') }}

      - name: Publish enthali.jarvis-core to Marketplace
        run: npx vsce publish --oidc --packagePath packages/core/jarvis-core-*.vsix --no-dependencies $CHANNEL_FLAG

   The other five Marketplace packages follow the same shape. The unquoted
   ``$CHANNEL_FLAG`` expands to nothing on a release, so the release channel runs
   exactly the commands it ran before. The legacy shim's package step carries no
   flag.

   **Design notes:**

   * **Why the flag goes to both** ``package`` **and** ``publish``. ``vsce package
     --pre-release`` writes the Marketplace pre-release property into the VSIX;
     that is what makes the upload a pre-release. ``vsce publish --pre-release``
     with ``--packagePath`` uploads nothing different, but it refuses a VSIX that
     was not packaged as a pre-release (``vsce`` 4.1.1, ``src/publish.ts``).
     Both flags come from the one expression, so a mismatch fails the step
     instead of publishing a version on the wrong channel.

   * **Why the manifests are untouched.** ``vsce`` 4.1.1 rejects a SemVer
     pre-release suffix in the manifest version
     (``src/publish.ts``: "The VS Marketplace doesn't support prerelease
     versions"). The channel lives in the tag and the flag; ``package.json`` stays
     ``MAJOR.MINOR.PATCH``.

   * **Why the update check needs no change.** ``SPEC_REL_UPDATECHECK`` reads
     ``/releases/latest``, which GitHub defines to exclude pre-releases, so
     marking the GitHub Release as a pre-release is what keeps it out of the
     check. The check is not edited and must not be changed to list releases. The
     consequence is that a user on the GitHub update path who runs a pre-release
     is not notified of a newer pre-release by that path; the Marketplace
     delivers pre-releases to users who opted in.

   * **Why the Release Contract is part of the design.** The tag is irreversible
     once pushed, and the channel is chosen by its spelling. Recording the channel
     in the Contract header makes the spelling a checked decision.
     ``docs/Jarvis Contracts/release.md`` is not governed by a Need of its own;
     ``REQ_REL_CHANNEL`` AC-7 is the trace for it, as ``REQ_REL_DOCSWORKFLOW``
     AC-9 is for the ``docs.yml`` check.

   **Acceptance Criteria (testable)**

   * AC-1: ``release.yml`` keeps its file name and ``on.push.tags`` of ``['v*']``,
     and no other workflow file publishes to the Marketplace
   * AC-2: ``release.yml`` defines ``CHANNEL_FLAG`` from
     ``endsWith(github.ref_name, '-pre')`` as ``--pre-release`` or the empty string
   * AC-3: The ``vsce package`` steps of core, PIM, Recorder, MCP, Flow and Kanban
     and the six ``vsce publish`` steps each contain ``$CHANNEL_FLAG``; the
     ``vsce package`` step of the legacy shim does not
   * AC-4: The Create GitHub Release step sets ``prerelease`` from
     ``endsWith(github.ref_name, '-pre')``
   * AC-5: ``version`` in the root and every ``packages/*/package.json`` matches
     ``^\d+\.\d+\.\d+$``
   * AC-6: ``docs/Jarvis Contracts/release.md`` contains the ``Channel`` header
     field, the tag rules ``v{version}`` and ``v{version}-pre``, and the
     ``(Pre-Release)`` heading rule
   * AC-7: ``docs/user guides/getting-started.md`` or ``core.md`` names *Switch to
     Pre-Release Version* and *Switch to Release Version*


.. spec:: Legacy Package → Migration Shim (enthali.jarvis)
   :id: SPEC_REL_COREGH
   :status: implemented
   :links: REQ_REL_RELEASEACTION; REQ_REL_RETIRENORELEASE; REQ_MOD_READINESS

   **Description:**
   ``packages/core-gh/`` produces the legacy ``enthali.jarvis`` VSIX for GitHub
   Releases. It is no longer a re-export of ``core`` — it is a self-contained
   **migration shim** with its own minimal bundle. It does not share
   ``out/extension.js`` with ``packages/core/``. Its version follows the repository
   version, like every other package.

   **Directory layout (committed):**

   .. code-block:: text

      packages/core-gh/
        package.json        ← name="jarvis", ``contributes`` empty (migration only)
        build.js            ← esbuild script bundling src/extension.ts
        src/extension.ts    ← migration shim entry point (see SPEC_REL_RETIRESHIM)
        src/migrate.ts      ← migration logic (install/uninstall/fallback)
        README.md           ← explains EOL status, links to jarvis-core
        .vscodeignore       ← excludes src/, node_modules/, tsconfig.json, build.js,
                              *.map, *.ts; preserves out/extension.js
        tsconfig.json, LICENSE
        resources/          ← jarvis.svg, jarvis-128.png

   **Manifest reduction (``core-gh/package.json``):**

   * ``contributes`` is ``{}`` — no views, commands, menus, configuration or
     yamlValidation; the shim registers no UI.
   * ``activationEvents`` is ``onStartupFinished`` only.
   * ``main`` points to ``./out/extension.js`` (the shim's own bundle).
   * ``icon`` is ``resources/jarvis-128.png`` and ``engines.vscode`` is ``^1.144.0``
     like the other packages.
   * Follows the package contract (SPEC_REL_PKGCONTRACT) with one deviation:
     ``vscode:prepublish`` is ``npm run bundle`` alone, because the shim has no
     ``tsc`` compile step. ``build.js`` and the ``esbuild`` devDependency are present.

   **Key rules:**

   * ``core-gh`` has its **own** ``src/`` and ``build.js``; there is no
     "contributes must stay in sync with core" constraint.
   * CI does not copy ``packages/core/out/`` into ``core-gh``; ``core-gh`` builds its
     own bundle via ``vscode:prepublish``.
   * ``enthali.jarvis`` is NOT published to the Marketplace — GitHub Release upload only.
   * The workflow rebuilds and uploads the shim on **every** release tag, at the
     repository version, as ``jarvis-{version}.vsix``. The self-update check maps the
     installed ``enthali.jarvis`` to exactly that asset name (SPEC_REL_UPDATENOTIFY),
     so a legacy installation updating from any release receives the shim and
     migrates (REQ_REL_RETIRENORELEASE).

   **CI steps for core-gh packaging (in release.yml):**

   .. code-block:: yaml

      - name: Package enthali.jarvis (legacy migration shim)
        run: cd packages/core-gh && npx vsce package --no-dependencies

   **Complete release.yml CI sequence:**

   The sequence is ``npm ci``, compile, bundle core with ``--minify``, package
   ``enthali.jarvis-core``, build and package the legacy ``enthali.jarvis`` migration
   shim, then package the supported add-ons (PIM, Recorder, MCP, Flow, Kanban), each
   with its own ``vscode:prepublish``. The GitHub Release uploads those VSIXs;
   Marketplace publication (SPEC_REL_MKTPUBLISH) covers core and supported add-ons
   only, not the legacy shim or retired Suite.


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
   * AC-6: ``release.yml`` packages ``packages/core-gh`` on every release tag and its
     GitHub Release ``files`` list includes ``packages/core-gh/*.vsix``, so each
     release carries ``jarvis-{version}.vsix`` for the self-update mapping
   * AC-7: The release workflow has no Suite package step, Suite VSIX GitHub
     Release asset, or Suite Marketplace publish step; historical GitHub
     Release assets are not deleted by this workflow change.


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
      ``enthali.jarvis-kanban``       ``jarvis-kanban-{version}.vsix``
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
   :status: implemented
   :links: REQ_REL_NOTESTARGET; REQ_REL_NOTESMARKER; REQ_REL_NOTESONCE; REQ_REL_NOTESCOMMAND; REQ_REL_NOTESSETTING; REQ_CFG_FIXEDPATHS; REQ_CFG_PATHSINGLESOURCE; REQ_CFG_IGNOREPATTERNS; SPEC_CFG_PATHRESOLVER; SPEC_DEV_LOGCHANNEL

   **Description:**
   New module ``packages/core/src/engine/core/releaseNotes.ts`` shows the GitHub
   release page for the installed version in the editor's own browser view —
   automatically the first time that version runs, and on demand from the
   Command Palette. The page is found by asking GitHub which of ``v{version}``
   and ``v{version}-pre`` exists (``REQ_REL_NOTESTARGET``). Contributed by
   ``enthali.jarvis-core`` only.

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
   contributions rather than amending that snapshot.

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

      const RELEASES_URL = 'https://github.com/enthali/jarvis/releases';
      const LOOKUP_TIMEOUT_MS = 5000;

      // true: the release exists; false: it does not; undefined: cannot tell.
      async function releaseExists(tag: string): Promise<boolean | undefined> {
          try {
              const res = await fetch(
                  `https://api.github.com/repos/enthali/jarvis/releases/tags/${tag}`,
                  {
                      headers: { 'User-Agent': 'Jarvis-VSCode-Extension' },
                      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS)
                  }
              );
              if (res.status === 200) { return true; }
              return res.status === 404 ? false : undefined;
          } catch {
              return undefined;
          }
      }

      async function notesUri(version: string): Promise<vscode.Uri> {
          for (const tag of [`v${version}`, `v${version}-pre`]) {
              const exists = await releaseExists(tag);
              if (exists === undefined) { break; }
              if (exists) {
                  return vscode.Uri.parse(
                      `https://github.com/enthali/jarvis/releases/tag/${tag}`
                  );
              }
          }
          return vscode.Uri.parse(RELEASES_URL);
      }

      async function openInEditor(uri: vscode.Uri): Promise<boolean> {
          const commands = await vscode.commands.getCommands(true);
          if (!commands.includes(INTEGRATED_BROWSER)) { return false; }
          await vscode.commands.executeCommand(SIMPLE_BROWSER_OPEN, uri);
          return true;
      }

      async function open(version: string, log?: vscode.LogOutputChannel): Promise<void> {
          const uri = await notesUri(version);
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

   * **Why the module now asks GitHub, and only inside** ``open()``. The channel
     is in the tag and not in the manifest (``REQ_REL_CHANNEL``), so the installed
     version no longer determines the URL. The request is made in ``open()``
     and nowhere earlier, so every path that returns before it — marker equal,
     no workspace, silent first run, setting off — still makes no request. The
     marker is written before ``open()`` runs, so a failing lookup cannot
     disturb it.

   * **Why the first non-answer ends the lookup.** ``404`` for ``v{version}``
     means "try the other tag"; a timeout, an error or a rate limit means GitHub
     was not asked successfully, and a second request would meet the same
     condition. The release list is the target in both cases: it exists whatever
     the reason the lookup failed.

   * **The tag order is fixed, release first.** Both tags cannot exist for one
     version (``REQ_REL_CHANNEL`` keeps versions strictly increasing across
     channels), so the order only decides how many requests a pre-release user
     costs: two, against one for a release.

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
   * AC-6: With a marker differing from the installed version, the setting
     ``true`` and the lookup answering ``200`` for ``v{installed}``, exactly one
     ``simpleBrowser.api.open`` call is made, with a ``Uri`` of
     ``https://github.com/enthali/jarvis/releases/tag/v{installed}``, after
     exactly one lookup request, and ``vscode.env.openExternal`` is not called
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
     resolves, and even if a lookup request never resolves
   * AC-15: ``vscode.env.openExternal`` appears in this module only on the
     user-chosen branch of AC-10
   * AC-16: With the lookup answering ``404`` for ``v{installed}`` and ``200`` for
     ``v{installed}-pre``, two requests are made, in that order, and the ``Uri``
     is ``https://github.com/enthali/jarvis/releases/tag/v{installed}-pre``
   * AC-17: With the lookup answering ``404`` for both tags, the ``Uri`` is
     ``https://github.com/enthali/jarvis/releases``
   * AC-18: With the first lookup request failing, timing out, or answered with
     a status other than ``200`` or ``404``, no second request is made, the
     ``Uri`` is ``https://github.com/enthali/jarvis/releases``, the notes are still
     opened, and no error is shown
   * AC-19: Lookup requests are sent to
     ``https://api.github.com/repos/enthali/jarvis/releases/tags/{tag}`` with a
     ``User-Agent`` header, with no ``Authorization`` header, and with a time
     limit
   * AC-20: The manual command of AC-11 resolves the target as in AC-6, AC-16,
     AC-17 and AC-18


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
   * AC-9 (``vscode-minimum-1-144`` CR): Every publishable extension's
     ``package.json`` has ``"engines": { "vscode": "^1.144.0" }``. The
     repository root manifest and the workspace entries in ``package-lock.json``
     carry the same value, so the lockfile does not contradict the manifests.

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
   :status: implemented
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
   :status: implemented
   :links: REQ_REL_RETIREINSTALL; SPEC_REL_UPDATECHECK

   **Description:**
   ``ensureCoreInstalled()`` in ``packages/core-gh/src/migrate.ts`` detects
   ``enthali.jarvis-core`` and, if absent, installs it — Marketplace first, GitHub
   ``.vsix`` fallback when the Marketplace install fails. The fallback follows the
   release lookup, asset naming and install command of SPEC_REL_UPDATECHECK /
   SPEC_REL_UPDATENOTIFY. ``migrate.ts`` carries its own copy of the lookup
   (``fetchLatestRelease``) and download (``downloadToTmp``) because the shim bundle
   cannot import the core implementation.

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
          const release = await fetchLatestRelease();
          const asset = release.assets.find(a =>
            a.name === `jarvis-core-${release.tag_name.replace(/^v/, '')}.vsix`);
          if (!asset) { return false; }
          const tmp = await downloadToTmp(asset.browser_download_url);
          await vscode.commands.executeCommand(
            'workbench.extensions.installExtension', vscode.Uri.file(tmp)
          );
          fs.unlink(tmp, () => {});
          return true;
        } catch {
          return false;
        }
      }

   **Acceptance Criteria:**

   * AC-1: Presence is detected via ``vscode.extensions.getExtension('enthali.jarvis-core')``.
   * AC-2: If absent, a Marketplace install is attempted with the extension ID.
   * AC-3: On Marketplace failure, the ``jarvis-core-{version}.vsix`` asset of the
     latest GitHub Release is downloaded and installed, with the same asset naming
     as SPEC_REL_UPDATENOTIFY.
   * AC-4: Returns ``true`` if ``jarvis-core`` is present or successfully installed via
     either channel; ``false`` if both channels fail.


.. spec:: Legacy Self-Uninstall and Reload
   :id: SPEC_REL_RETIREUNINSTALL
   :status: implemented
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
   :status: implemented
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


.. spec:: Contract Needs Check Script
   :id: SPEC_REL_NEEDSCHECK
   :status: implemented
   :links: REQ_REL_NEEDSCHECK

   **Description:**
   A Python script ``scripts/check_contract_needs.py`` implements the check. It builds the
   documentation of two commits, reads their ``needs.json`` output, and evaluates the
   Contract.

   Procedure:

   1. Resolve the base ref (default ``development``) and the merge base with the branch head.
      Resolve the Contract path from the branch name ``feature/<name>`` when none is given.
   2. Build the documentation at the merge base in a temporary git worktree and at the
      head, each with ``sphinx-build -b needs``, and load both ``needs.json`` files.
   3. A Need is changed when its ID is missing from the base data or its ``status`` or
      ``content`` differs; links are not compared.
   4. Parse the Contract: the User Validation section (its status line and the ``Validation``
      table cells) and the ``Test Execution`` subsection of Quality Review, collecting every
      ``US_*`` and ``AC_*`` ID each one mentions. The status line counts as satisfied when it
      opens with ``accepted`` or ``explicit User delegation``, after an optional
      ``not applicable:``; the same words open a ``Status:`` or ``Decision:`` line of the
      section.
   5. For each changed Need apply the status rule of its type. A ``story``
      must be named in User Validation. An ``ac`` must be ``verified`` when
      named in User Validation or Test Execution and ``approved`` otherwise. When User
      Validation names a changed Need, its status line must be satisfied. Print one line
      per violation as ``<ID>: <rule>``; exit 1 if any exist, else 0.

   The script is run by the Project Manager as the last gate before the squash integration
   into ``development``; whether CI also runs it is decided with Admin when the workflow is
   changed. The statuses it requires are defined in the Jarvis Ontology.

   **Acceptance Criteria:**

   * AC-1: ``--contract`` and ``--base`` override the two defaults of REQ_REL_NEEDSCHECK AC-1.
   * AC-2: Both builds use the same ontology file of the head, so a status vocabulary change
     is not itself reported as a content change.
   * AC-3: The script contains no network call and changes no file of the repository; the
     worktree and build output live in a temporary directory that is removed on exit.
   * AC-4: A unit test per rule of REQ_REL_NEEDSCHECK AC-3 to AC-7 feeds the script two
     small ``needs.json`` fixtures and a Contract fixture and asserts the exit code and the
     named IDs.
