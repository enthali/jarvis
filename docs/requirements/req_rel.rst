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
