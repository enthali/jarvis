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

   =============================== ======================================
   Extension ID                    VSIX filename (``{id}-{ver}.vsix``)
   =============================== ======================================
   ``enthali.jarvis``              ``jarvis-{version}.vsix``
   ``enthali.jarvis-core``         ``jarvis-core-{version}.vsix``
   ``enthali.jarvis-pim``          ``jarvis-pim-{version}.vsix``
   ``enthali.jarvis-recorder``     ``jarvis-recorder-{version}.vsix``
   ``enthali.jarvis-mcp``          ``jarvis-mcp-{version}.vsix``
   ``enthali.jarvis-flow``         ``jarvis-flow-{version}.vsix``
   ``enthali.jarvis-syspilot``     ``jarvis-syspilot-{version}.vsix``
   =============================== ======================================

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


.. req:: Release Notes Target
   :id: REQ_REL_NOTESTARGET
   :status: implemented
   :priority: required
   :links: US_REL_WHATSNEW

   **Description:**
   Both the automatic trigger (``REQ_REL_NOTESONCE``) and the manual command
   (``REQ_REL_NOTESCOMMAND``) open the same page: the GitHub release for the
   installed version. This requirement owns *which* page and *how* it is
   reached, so the two consumers cannot drift apart.

   **Why the URL is constructed rather than resolved:**
   ``REQ_REL_UPDATECHECK`` obtains ``html_url`` from the GitHub API, because it
   is asking a question only the API can answer — what the *latest* release is.
   Here the version is already known locally, so resolving it would add a
   network call on every activation, a second consumer of the 60 requests/hour
   the update check already lives within, and a failure mode when offline. The
   price is that the URL can name a page that does not exist.

   **Why the editor's own browser rather than the system default:**
   The notes are read directly after an update, while the user is working. The
   system default browser answers a different need — ``REQ_REL_UPDATENOTIFY``
   sends the user *away* to decide whether to install something, which is a
   decision made outside the editor. Here the user has already decided, has the
   new version, and is reading about work Jarvis has done to their own working
   tree. Taking their window away to do that is a cost with no matching reason,
   which is what ``US_REL_WHATSNEW`` AC-8 records.

   **Why availability is checked before the view is opened:**
   ``simpleBrowser.api.open`` does not always open the same thing. It first
   tests whether ``workbench.action.browser.open`` exists and delegates to that
   integrated browser when it does; otherwise it falls back to its own
   iframe-based webview. The GitHub release page cannot be shown in that
   fallback: it is served with ``X-Frame-Options: deny`` and
   ``Content-Security-Policy: frame-ancestors 'none'``, so the frame is refused
   and the user is left with an empty pane. The command still resolves
   successfully, so the failure cannot be detected after the fact — it has to be
   ruled out before the call, which is what AC-3 does.

   **Acceptance Criteria:**

   * AC-1: The target SHALL be
     ``https://github.com/enthali/jarvis/releases/tag/v{version}``, where
     ``{version}`` is the installed version of ``enthali.jarvis-core`` as read
     from ``context.extension.packageJSON.version``
   * AC-2: The target SHALL be opened inside VS Code, in the editor's own
     browser view, via the command ``simpleBrowser.api.open``. Jarvis SHALL NOT
     use ``vscode.env.openExternal`` as the delivery path for the notes
   * AC-3: Jarvis SHALL establish that the integrated browser is available —
     by testing for the command ``workbench.action.browser.open`` — before
     invoking AC-2. If it is not available, Jarvis SHALL NOT invoke AC-2 and
     SHALL take AC-6 instead
   * AC-4: Jarvis SHALL NOT itself issue any network request to produce or
     validate the target, and SHALL NOT use an authenticated or rate-limited
     endpoint. The browser view fetches the page it displays; that is the
     browser doing its job, not Jarvis validating the target
   * AC-5: A version that was never released SHALL be allowed to produce a
     "not found" page in the browser view. This is the accepted consequence of
     AC-4 and SHALL NOT be worked around by suppressing the open, because
     Jarvis cannot distinguish "not released" from "not released *yet*" without
     the network call AC-4 forbids
   * AC-6: Where the notes cannot be opened in the editor — AC-3 unmet, or the
     open itself failing — the user SHALL be shown a message containing the URL
     and offering to open it externally. Leaving the editor SHALL happen only
     because the user chose that control, never on Jarvis's initiative
     (``US_REL_WHATSNEW`` AC-7 and AC-8). Failure SHALL NOT be swallowed
     silently and SHALL NOT block activation


.. req:: Last-Shown Version Marker
   :id: REQ_REL_NOTESMARKER
   :status: implemented
   :priority: required
   :links: US_REL_WHATSNEW; REQ_REL_NOTESONCE; REQ_CFG_FIXEDPATHS; REQ_CFG_IGNOREPATTERNS

   **Description:**
   A marker records the version for which release notes have already been
   handled in a workspace, so that a version announces itself once there and
   not on every start.

   **Why this is workspace state:**
   The version is a property of the installation, and the *work the notes ask
   for* is not: it is a diff to check, a moved file to accept, a breaking
   change to resolve — in a project. A marker held once per machine would let
   the first project the user happens to open absorb the announcement for all
   the others, which is where ``US_REL_WHATSNEW`` AC-6 now puts the boundary.
   ``.jarvis/syspilot-state.json`` already keeps a version marker per workspace
   for the same kind of reason, and this marker sits beside it.

   **Why per-workspace does not mean shared:**
   A marker that is committed suppresses the notes for everyone who pulls it —
   one developer's update would silence the announcement for the whole team,
   the exact failure the per-workspace choice exists to avoid. The marker is
   therefore transient runtime state under ``.jarvis/``, which
   ``REQ_CFG_IGNOREPATTERNS`` AC-1 keeps out of version control by
   construction, including for paths added after that requirement was written.

   **Acceptance Criteria:**

   * AC-1: The marker SHALL be a fixed runtime path under
     ``<workspaceRoot>/.jarvis/``, enumerated in ``REQ_CFG_FIXEDPATHS`` and
     obtained from the central path resolver like every other runtime path
     (``REQ_CFG_PATHSINGLESOURCE``). It SHALL NOT introduce a workspace-root
     resolution rule of its own
   * AC-2: The marker SHALL be transient runtime state in the sense of
     ``REQ_CFG_IGNOREPATTERNS`` AC-7 — Jarvis regenerates it and nothing is
     lost if it is deleted — and SHALL therefore be covered by the maintained
     ``.gitignore`` region without a separately maintained entry
     (``REQ_CFG_IGNOREPATTERNS`` AC-6)
   * AC-3: When no workspace folder is open there SHALL be no marker and no
     announcement, handled as ``REQ_CFG_FIXEDPATHS`` AC-3 already prescribes for
     every runtime path: warn once, short-circuit, throw nothing
     (``US_REL_WHATSNEW`` AC-9)
   * AC-4: The marker SHALL survive VS Code restarts and extension updates —
     surviving the update is the whole point, since the update is what it
     measures
   * AC-5: Loss of the marker SHALL NOT be an error condition. An absent marker
     is indistinguishable from a workspace that has not yet seen this Jarvis
     and is handled as one (``REQ_REL_NOTESONCE`` AC-2)
   * AC-6: Exactly one Jarvis extension SHALL read and write the marker, so
     that the nine ``enthali.*`` extensions do not announce one update nine
     times in the same workspace
   * AC-7: A marker that reaches version control despite AC-2 — because
     ``REQ_CFG_IGNOREAUTOMANAGE`` is off, or because it was added deliberately
     — SHALL be accepted as the user's own state and SHALL NOT be worked around
     by making the filename user- or machine-specific. The residual effect is
     that collaborators on that repository may not be shown the notes; naming
     the file per user would trade one visible consequence for a class of
     orphaned files nobody ever cleans up


.. req:: Automatic Display on First Run of a Version
   :id: REQ_REL_NOTESONCE
   :status: implemented
   :priority: required
   :links: US_REL_WHATSNEW; REQ_REL_NOTESMARKER; REQ_REL_NOTESTARGET; REQ_REL_NOTESSETTING

   **Description:**
   On activation, Jarvis compares the installed version against the marker and
   opens the release notes when they differ.

   **Why an absent marker is not always a first run:**
   The marker starts appearing with the release that introduces it, so on that
   release every existing workspace is missing one. Reading "absent" as "first
   run" would make the introducing release the one release that announces
   itself nowhere — and that release is the one carrying the ``.jarvis/``
   layout and ``.gitignore`` changes the notes exist to warn about. The two
   cases are distinguishable without new state: a workspace Jarvis has written
   to before has a ``.jarvis/`` directory, and one that is new to Jarvis does
   not.

   **Acceptance Criteria:**

   * AC-1: If the marker is present and differs from the installed version, and
     ``REQ_REL_NOTESSETTING`` permits it, the target SHALL be opened
   * AC-2: If the marker is absent, the installed version SHALL be recorded,
     and whether the notes are opened SHALL depend on whether the workspace has
     used Jarvis before: a workspace with no ``.jarvis/`` directory is new to
     Jarvis and SHALL be recorded silently (``US_REL_WHATSNEW`` AC-3); a
     workspace that already has one has run an earlier Jarvis and SHALL be
     treated as an update
   * AC-3: The marker SHALL be written before the notes are opened. If the
     write fails, the notes SHALL NOT be opened — an open that is not recorded
     repeats on every subsequent activation, which is worse than not opening
   * AC-4: If the marker equals the installed version, activation SHALL open
     nothing, show no notification, and make no network request
   * AC-5: Windows on the same workspace that activate concurrently, before the
     first has written the marker, MAY each open the notes once. This SHALL NOT
     be prevented by a lock file or comparable coordination: the cost is one
     additional tab on one occasion, and the remedy would be new persistent
     state with a stale-lock failure mode of its own. The limit of the guarantee
     is stated here rather than claimed away
   * AC-6: A marker naming a *newer* version than the installed one — a
     rollback — SHALL be treated like any other difference and SHALL open the
     notes for the version now installed. The marker records the last version
     handled, not the set of versions ever seen
   * AC-7: This behaviour SHALL be independent of ``jarvis.checkForUpdates``.
     That setting governs polling GitHub for a version the user does not have;
     this one concerns the version they are running. The two SHALL NOT be
     merged into a single switch
   * AC-8: Opening the notes SHALL NOT delay or block the rest of activation


.. req:: Manual Release Notes Command
   :id: REQ_REL_NOTESCOMMAND
   :status: implemented
   :priority: required
   :links: US_REL_WHATSNEW; REQ_REL_NOTESTARGET

   **Description:**
   A Command Palette command opens the installed version's release notes on
   demand.

   **Acceptance Criteria:**

   * AC-1: A command ``jarvis.showReleaseNotes`` titled
     ``Jarvis: Show Release Notes`` SHALL be available in the Command Palette
   * AC-2: It SHALL open the target from ``REQ_REL_NOTESTARGET`` for the
     installed version, whatever the marker says
   * AC-3: It SHALL NOT write the marker. The command is a read; letting it
     write would mean using it once silently disables the automatic
     announcement of the version the user is about to receive
   * AC-4: It SHALL work regardless of ``jarvis.releaseNotes.showOnUpdate``,
     mirroring ``REQ_REL_UPDATECOMMAND`` against ``jarvis.checkForUpdates``
   * AC-5: The command SHALL be contributed by exactly one Jarvis extension, so
     that installing several does not produce several palette entries


.. req:: Release Notes Auto-Open Setting
   :id: REQ_REL_NOTESSETTING
   :status: implemented
   :priority: required
   :links: US_REL_WHATSNEW; REQ_REL_NOTESONCE

   **Description:**
   A setting governs whether the release notes open by themselves.

   **Why a setting exists at all:**
   Every automatic activation-time behaviour in Jarvis has one —
   ``jarvis.checkForUpdates``, ``jarvis.hooks.autoInstall``,
   ``jarvis.gitignore.autoManage``. This is the only one of the four that puts
   something in front of the user unasked: the others raise a notification, or
   change files quietly. An editor tab that opens by itself is the kind of
   thing a user wants a switch for. It is also the cheapest of the four to make
   optional, because ``REQ_REL_NOTESCOMMAND`` keeps the capability: switching it
   off removes an interruption, not a feature.

   **Acceptance Criteria:**

   * AC-1: A setting ``jarvis.releaseNotes.showOnUpdate`` (boolean, default
     ``true``) SHALL be contributed in the existing ``Updates`` group
   * AC-2: The setting SHALL have application scope. The behaviour it governs is
     per-installation, and a per-folder value would promise a distinction the
     marker cannot make
   * AC-3: When ``false``, no automatic open SHALL occur
   * AC-4: When ``false``, the marker SHALL still be advanced to the installed
     version. Freezing it would mean that enabling the setting later replays the
     notes of whichever version was current when it was disabled
   * AC-5: The setting SHALL NOT affect ``REQ_REL_NOTESCOMMAND``
     (``US_REL_WHATSNEW`` AC-5)


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
