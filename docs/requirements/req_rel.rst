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
   :links: US_REL_RELEASE

   **Description:**
   A GitHub Actions workflow SHALL trigger on ``push: tags: v*``, build the
   extension package, and create a GitHub Release with the ``.vsix`` as an asset.

   **Acceptance Criteria:**

   * AC-1: Workflow file ``.github/workflows/release.yml`` exists
   * AC-2: Trigger is ``push: tags: v*``
   * AC-3: The ``.vsix`` file is attached to the GitHub Release as a downloadable asset
   * AC-4: The GitHub Release name equals the tag name (e.g. ``v0.1.0``)


.. req:: Extension Packaging
   :id: REQ_REL_VSCEPKG
   :status: implemented
   :priority: mandatory
   :links: US_REL_RELEASE

   **Description:**
   The extension SHALL be packaged as a ``.vsix`` file using ``@vscode/vsce``.
   The ``publisher`` field in ``package.json`` SHALL be set to ``enthali``.

   **Acceptance Criteria:**

   * AC-1: ``@vscode/vsce`` is listed as a devDependency
   * AC-2: ``npm run package`` produces a ``.vsix`` file without errors
   * AC-3: ``publisher`` in ``package.json`` is ``enthali``
   * AC-4: Runtime dependencies (``node_modules/``) SHALL be included in the
     ``.vsix`` package — ``.vscodeignore`` SHALL NOT exclude ``node_modules/**``


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
   * AC-3: A **"Download & Install"** button triggers the download-and-install
     flow (see REQ_REL_UPDATEINSTALL)
   * AC-4: If the user dismisses the notification, no further action is taken


.. req:: Download and Install .vsix
   :id: REQ_REL_UPDATEINSTALL
   :status: implemented
   :priority: mandatory
   :links: US_REL_SELFUPDATE

   **Description:**
   The "Download & Install" action SHALL download the ``.vsix`` asset from the
   GitHub release and install it into VS Code, then prompt for a window reload.

   **Acceptance Criteria:**

   * AC-1: The first asset whose ``name`` ends with ``.vsix`` from the release's
     ``assets`` array is used as the download URL (``browser_download_url``)
   * AC-2: The file is downloaded to a temporary directory
   * AC-3: The ``.vsix`` is installed via
     ``vscode.commands.executeCommand('workbench.extensions.installExtension',
     vscode.Uri.file(path))``
   * AC-4: After successful installation, a reload prompt is shown:
     ``"Jarvis has been updated. Reload to activate v{new}."`` with a
     **"Reload Now"** button
   * AC-5: If no ``.vsix`` asset is found, the user is informed and the
     release page is opened as a fallback


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
