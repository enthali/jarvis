Release Requirements
====================

.. req:: Semantic Versioning
   :id: REQ_REL_SEMVER
   :status: implemented
   :priority: mandatory
   :links: US_REL_VERSION

   **Description:**
   The Jarvis extension SHALL use Semantic Versioning (MAJOR.MINOR.PATCH).
   ``package.json`` is the single source of truth for the version number.

   **Acceptance Criteria:**

   * AC-1: ``package.json`` ``version`` field follows ``MAJOR.MINOR.PATCH`` format
   * AC-2: The version is readable by the GitHub Actions release workflow to name the release


.. req:: Docs CI/CD Workflow
   :id: REQ_REL_DOCSWORKFLOW
   :status: implemented
   :priority: mandatory
   :links: US_REL_DOCS

   **Description:**
   A GitHub Actions workflow SHALL build the Sphinx documentation and deploy it
   to GitHub Pages on every push to ``main``.

   **Acceptance Criteria:**

   * AC-1: Workflow file ``.github/workflows/docs.yml`` exists
   * AC-2: Trigger is ``push`` to branch ``main``
   * AC-3: Sphinx build errors stop the workflow and surface as a failed check
   * AC-4: Deployed docs are accessible at ``https://enthali.github.io/Jarvis``


.. req:: Release GitHub Action
   :id: REQ_REL_RELEASEACTION
   :status: implemented
   :priority: mandatory
   :links: US_REL_RELEASE; REQ_REL_PKGCONTRACT

   **Description:**
   A GitHub Actions workflow SHALL trigger on ``push: tags: v*``, build the
   extension package, and create a GitHub Release with the ``.vsix`` as an asset.
   The workflow SHALL produce both ``enthali.jarvis-core`` (marketplace) and the
   legacy ``enthali.jarvis`` (GitHub Releases only) VSIXs and upload both to the
   GitHub Release.

   **Acceptance Criteria:**

   * AC-1: Workflow file ``.github/workflows/release.yml`` exists
   * AC-2: Trigger is ``push: tags: v*``
   * AC-3: The ``.vsix`` file is attached to the GitHub Release as a downloadable asset
   * AC-4: The GitHub Release name equals the tag name (e.g. ``v0.1.0``)
   * AC-5: Both ``enthali.jarvis`` (legacy) and ``enthali.jarvis-core`` VSIXs are
     uploaded to the GitHub Release; ``enthali.jarvis`` is NOT published to the
     marketplace


.. req:: Extension Packaging
   :id: REQ_REL_VSCEPKG
   :status: draft
   :priority: mandatory
   :links: US_REL_RELEASE; REQ_REL_PKGCONTRACT

   **Description:**
   Each code extension package SHALL be bundled with esbuild and packaged as a
   ``.vsix`` file using ``@vscode/vsce --no-dependencies``.  Third-party runtime
   dependencies SHALL be inlined into the bundle; ``node_modules/`` SHALL NOT be
   shipped in the ``.vsix``.  The ``publisher`` field in each package's
   ``package.json`` SHALL be ``enthali``.

   **Acceptance Criteria:**

   * AC-1: ``@vscode/vsce`` is listed as a devDependency
   * AC-2: ``npm run package`` from the repository root produces a ``.vsix`` file
     without errors
   * AC-3: ``publisher`` in ``package.json`` is ``enthali``
   * AC-4: The ``.vsix`` SHALL NOT contain any ``../../`` paths
   * AC-5: The ``.vsix`` file size is reasonable (< 5 MB for core)
   * AC-6: All existing tests pass after the build-system change
   * AC-7: The F5 development host remains unaffected by the bundle step


.. req:: Feature Branch Naming
   :id: REQ_REL_BRANCHNAMING
   :status: implemented
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   All feature branches SHALL follow the naming convention `feature/<change-name>`
   where `<change-name>` matches the Change Document filename.

   **Acceptance Criteria:**

   * AC-1: Branch name starts with `feature/`
   * AC-2: Suffix matches the Change Document name (e.g. `feature/git-workflow`)


.. req:: Release Agent Merge Policy
   :id: REQ_REL_AGENTPOLICY
   :status: implemented
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   The Release Agent SHALL document and enforce the squash merge strategy so that
   `main` has one clean commit per feature.

   **Acceptance Criteria:**

   * AC-1: Release Agent documents squash merge command
   * AC-2: Release Agent notes that feature branches must NOT be pushed to origin after merging


.. req:: Feature Branch Retention
   :id: REQ_REL_BRANCHRETENTION
   :status: implemented
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   Feature branches SHALL be kept locally after merging to `main` but SHALL
   NOT be pushed to origin.

   **Acceptance Criteria:**

   * AC-1: After squash merge, the feature branch remains in local git history
   * AC-2: The branch is never pushed to origin after merging


.. req:: No Direct Commits to Main
   :id: REQ_REL_NOHOTFIX
   :status: implemented
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   All changes including hotfixes SHALL go through the syspilot Change process.
   No direct commits to `main` are allowed.

   **Acceptance Criteria:**

   * AC-1: `copilot-instructions.md` states no direct commits to main
   * AC-2: Hotfixes are explicitly listed as requiring the Change process


.. req:: Sphinx Configuration Compatibility
   :id: REQ_REL_SPHINXCOMPAT
   :status: implemented
   :priority: mandatory
   :links: US_REL_DOCS

   **Description:**
   The Sphinx docs build configuration SHALL use only non-deprecated sphinx-needs API and
   SHALL pin all documentation dependencies to known-good versions so that CI and local
   builds are reproducible and identical.

   **Acceptance Criteria:**

   * AC-1: Sphinx build on CI completes with 0 warnings (`build succeeded.` message)
   * AC-2: `docs/conf.py` uses `needs_fields` instead of deprecated `needs_extra_options`
   * AC-3: `docs/conf.py` uses `needs_fields` status enum instead of deprecated `needs_statuses`
   * AC-4: No `html_static_path` warning for a missing `_static` directory
   * AC-5: `docs/requirements.txt` defines pinned versions of all Sphinx dependencies
   * AC-6: `docs.yml` installs from `docs/requirements.txt` instead of inline package names
   * AC-7: Local build succeeds after `pip install -r docs/requirements.txt`


.. req:: GitHub Release Version Check
   :id: REQ_REL_UPDATECHECK
   :status: implemented
   :priority: mandatory
   :links: US_REL_SELFUPDATE

   **Description:**
   The extension SHALL query the GitHub Releases API for the latest release of
   ``enthali/jarvis`` and compare the ``tag_name`` against the installed extension
   version from ``context.extension.packageJSON.version``.

   **Acceptance Criteria:**

   * AC-1: A ``GET`` request to
     ``https://api.github.com/repos/enthali/jarvis/releases/latest`` is issued
     with a ``User-Agent`` header (required by GitHub API)
   * AC-2: The ``tag_name`` value (e.g. ``v0.1.2``) is stripped of the leading ``v``
     and compared component-wise (MAJOR.MINOR.PATCH) against the installed version
   * AC-3: No authentication token is used (public repo, 60 req/h rate limit is sufficient)
   * AC-4: Network errors or non-200 responses are silently ignored (no user disruption)


.. req:: Update Notification with Actions
   :id: REQ_REL_UPDATENOTIFY
   :status: implemented
   :priority: mandatory
   :links: US_REL_SELFUPDATE

   **Description:**
   When a newer release is detected, the extension SHALL display an information
   notification with action buttons.

   **Acceptance Criteria:**

   * AC-1: The notification message reads
     ``"Jarvis v{new} is available (current: v{current})"``
   * AC-2: A **"Release Notes"** button opens the release ``html_url`` in the
     default browser
   * AC-3: A **"Download & Install"** button triggers the selective download-and-install
     flow (see REQ_REL_UPDATEINSTALL); all matching extensions are updated in one flow
   * AC-4: If the user dismisses the notification, no further action is taken


.. req:: Selective Download and Install
   :id: REQ_REL_UPDATEINSTALL
   :status: implemented
   :priority: mandatory
   :links: US_REL_SELFUPDATE

   **Description:**
   The "Download & Install" action SHALL identify which ``enthali.jarvis*``
   extensions the user currently has installed, download the corresponding
   ``.vsix`` assets from the GitHub release, install them all, and then prompt
   for a single window reload.

   **Extension ID → VSIX filename mapping:**

   ========================= ===================================
   Extension ID              VSIX filename (``{id}-{ver}.vsix``)
   ========================= ===================================
   ``enthali.jarvis``        ``jarvis-{version}.vsix``
   ``enthali.jarvis-core``   ``jarvis-core-{version}.vsix``
   ``enthali.jarvis-pim``    ``jarvis-pim-{version}.vsix``
   ``enthali.jarvis-recorder`` ``jarvis-recorder-{version}.vsix``
   ``enthali.jarvis-mcp``    ``jarvis-mcp-{version}.vsix``
   ========================= ===================================

   **Acceptance Criteria:**

   * AC-1: All currently installed ``enthali.jarvis*`` extensions are detected;
     each is matched to its expected VSIX asset via the mapping above
   * AC-2: Only the matched assets are downloaded, each to a temporary directory
   * AC-3: Each ``.vsix`` is installed via
     ``workbench.extensions.installExtension`` with a ``vscode.Uri.file`` path
   * AC-4: After all installations succeed, a single reload prompt is shown:
     ``"Jarvis has been updated. Reload to activate v{new}."`` with a
     **"Reload Now"** button
   * AC-5: If no installed extension maps to any release asset, the user is
     informed and the release page is opened as a fallback


.. req:: Manual Update Check Command
   :id: REQ_REL_UPDATECOMMAND
   :status: implemented
   :priority: mandatory
   :links: US_REL_SELFUPDATE

   **Description:**
   A command ``Jarvis: Check for Updates`` SHALL trigger the same update-check
   logic as the automatic activation check.

   **Acceptance Criteria:**

   * AC-1: The command ``jarvis.checkForUpdates`` is available in the Command
     Palette
   * AC-2: If an update is available, the notification from REQ_REL_UPDATENOTIFY
     is shown
   * AC-3: If already up to date, an information message reads
     ``"Jarvis is up to date (v{current})."``


.. req:: Marketplace Metadata
   :id: REQ_REL_MKTMETA
   :status: draft
   :priority: mandatory
   :links: US_REL_MARKETPLACE

   **Description:**
   The ``packages/core/package.json`` SHALL include all fields required for a
   well-formed Marketplace listing: icon, keywords, categories, and gallery banner.

   **Acceptance Criteria:**

   * AC-1: ``icon`` field references a valid 128×128 PNG relative to the package root
   * AC-2: ``keywords`` contains at least five relevant terms
   * AC-3: ``categories`` contains at least one valid VS Code Marketplace category
   * AC-4: ``galleryBanner`` specifies ``color`` and ``theme``
   * AC-5: ``packages/core/README.md`` exists and contains a user-facing description,
     feature list, and basic usage instructions


.. req:: Automated Marketplace Publish
   :id: REQ_REL_MKTPUBLISH
   :status: draft
   :priority: mandatory
   :links: US_REL_MARKETPLACE; REQ_REL_PKGCONTRACT

   **Description:**
   The GitHub Actions release workflow SHALL publish the packaged ``.vsix`` to the
   VS Code Marketplace after creating the GitHub Release, using the ``VSCE_PAT``
   secret stored in the repository.

   **Acceptance Criteria:**

   * AC-1: A ``vsce publish`` step runs after the GitHub Release step in ``release.yml``
   * AC-2: The step uses the pre-built ``.vsix`` (``--packagePath``) to avoid double-bundling
   * AC-3: The ``VSCE_PAT`` secret is passed as ``VSCE_PAT`` environment variable
   * AC-4: The existing GitHub Release step is unchanged


.. req:: Extension Package Contract
   :id: REQ_REL_PKGCONTRACT
   :status: implemented
   :priority: mandatory
   :links: US_REL_PKGCONTRACT

   **Description:**
   Every publishable Jarvis extension package (core and all add-ons) SHALL follow a
   uniform package contract so that the release CI workflow can package all extensions
   with a single, consistent strategy.

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
   * AC-7: After any workspace package dependency change, ``npm install`` MUST be
     run at the monorepo root so that ``package-lock.json`` is updated; ``npm ci``
     MUST succeed locally before a release tag is pushed.
   * AC-8: Every publishable extension's ``package.json`` MUST include an ``icon``
     field referencing a 128×128 PNG relative to the package root. The PNG SHALL
     be generated from the single-source SVG via the icon generation script.


.. req:: Activity Bar Icon Alignment
   :id: REQ_REL_ICONALIGN
   :status: implemented
   :priority: mandatory
   :links: US_REL_PKGCONTRACT

   **Description:**
   All Jarvis extension icons SHALL be derived from a single source SVG so that the
   activity bar icon and all marketplace icons are visually consistent.

   **Acceptance Criteria:**

   * AC-1: A single monochromatic SVG at ``resources/jarvis.svg`` SHALL be the
     source of truth for all icon variants.
   * AC-2: The activity bar icon and marketplace PNG SHALL use the same visual
     concept (shape and letter).
   * AC-3: A generation script SHALL produce all derived icon files (SVG copies
     for activity-bar packages, 128×128 PNG for all publishable packages) from the
     single source.
   * AC-4: The SVG SHALL use ``currentColor`` (no hardcoded colours) so VS Code
     themes can style the activity bar icon.


.. req:: Migration Shim Activation
   :id: REQ_REL_RETIRESHIM
   :status: draft
   :priority: mandatory
   :links: US_REL_RETIRELEGACY

   **Description:**
   The final ``enthali.jarvis`` release SHALL behave as a migration shim. On
   activation it SHALL NOT register any Jarvis runtime surfaces and SHALL instead
   run the migration sequence only — guaranteeing that only one active Jarvis
   instance ever operates on a workspace's ``.jarvis`` data.

   **Acceptance Criteria:**

   * AC-1: On activation the extension registers **no** Jarvis surfaces: no sessions
     tree view, no heartbeat scheduler, no message-queue processing, no Jarvis
     commands other than what the migration sequence itself requires.
   * AC-2: On activation the extension displays an information notification stating
     that Jarvis has moved to ``enthali.jarvis-core`` and that migration is in progress.
   * AC-3: The migration sequence (detect → install → uninstall, or fallback) is the
     only behaviour the shim performs.


.. req:: Migration Install with Channel Fallback
   :id: REQ_REL_RETIREINSTALL
   :status: draft
   :priority: mandatory
   :links: US_REL_RETIRELEGACY; REQ_REL_UPDATEINSTALL

   **Description:**
   The shim SHALL ensure ``enthali.jarvis-core`` is installed. It SHALL first detect
   whether ``enthali.jarvis-core`` is already present; if absent, it SHALL install it
   from the VS Code Marketplace, falling back to a GitHub Releases ``.vsix`` install
   when the Marketplace is unreachable.

   **Acceptance Criteria:**

   * AC-1: Presence of ``enthali.jarvis-core`` is detected via
     ``vscode.extensions.getExtension('enthali.jarvis-core')``.
   * AC-2: If absent, the shim attempts a Marketplace install of
     ``enthali.jarvis-core`` (e.g. via ``workbench.extensions.installExtension`` with
     the extension ID).
   * AC-3: If the Marketplace install fails (e.g. corporate/private marketplace where
     the public listing is unreachable), the shim falls back to downloading and
     installing the ``jarvis-core-{version}.vsix`` GitHub Releases asset, reusing the
     mechanism defined in REQ_REL_UPDATEINSTALL.
   * AC-4: A successful install via either channel is treated as "``jarvis-core``
     present" for the purposes of REQ_REL_RETIREUNINSTALL.


.. req:: Legacy Self-Uninstall and Reload
   :id: REQ_REL_RETIREUNINSTALL
   :status: draft
   :priority: mandatory
   :links: US_REL_RETIRELEGACY

   **Description:**
   Once ``enthali.jarvis-core`` is present, the shim SHALL uninstall the legacy
   ``enthali.jarvis`` extension and prompt the user to reload the window.

   **Acceptance Criteria:**

   * AC-1: When ``enthali.jarvis-core`` is present (already installed or just
     installed), the shim triggers uninstall of ``enthali.jarvis`` via
     ``workbench.extensions.uninstallExtension``.
   * AC-2: After uninstall is requested, a single reload prompt is shown with a
     **"Reload Now"** button that reloads the window.
   * AC-3: No Jarvis surface is ever brought up by the shim before or after uninstall.


.. req:: Migration Failure Fallback
   :id: REQ_REL_RETIREFALLBACK
   :status: draft
   :priority: mandatory
   :links: US_REL_RETIRELEGACY

   **Description:**
   If neither the Marketplace nor the GitHub install channel succeeds in installing
   ``enthali.jarvis-core``, the shim SHALL NOT uninstall itself and SHALL guide the
   user to a manual install, retrying on the next startup.

   **Acceptance Criteria:**

   * AC-1: If both install channels fail, the shim does **not** call uninstall on
     ``enthali.jarvis`` (the user is never left without a working extension path).
   * AC-2: A notification is shown with a link to install ``enthali.jarvis-core``
     manually (Marketplace listing URL, with the GitHub Releases URL as alternative).
   * AC-3: The migration sequence is re-attempted on the next activation/startup.


.. req:: Final Legacy Release Policy
   :id: REQ_REL_RETIRENORELEASE
   :status: draft
   :priority: mandatory
   :links: US_REL_RETIRELEGACY

   **Description:**
   The migration shim SHALL be the final ``enthali.jarvis`` release. No further
   ``enthali.jarvis`` releases are published, and the shim release remains available
   for download so existing users still land on it and migrate.

   **Acceptance Criteria:**

   * AC-1: No ``enthali.jarvis`` (legacy ID) release is published after the shim
     release.
   * AC-2: The shim release remains downloadable from GitHub Releases so existing
     ``enthali.jarvis`` users continue to receive it via the self-update check
     (REQ_REL_UPDATECHECK) and are migrated.
