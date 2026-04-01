Release Requirements
====================

.. req:: Semantic Versioning
   :id: REQ_REL_SEMVER
   :status: approved
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
   :status: approved
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
   :status: approved
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
   :status: approved
   :priority: mandatory
   :links: US_REL_RELEASE

   **Description:**
   The extension SHALL be packaged as a ``.vsix`` file using ``@vscode/vsce``.
   The ``publisher`` field in ``package.json`` SHALL be set to ``enthali``.

   **Acceptance Criteria:**

   * AC-1: ``@vscode/vsce`` is listed as a devDependency
   * AC-2: ``npm run package`` produces a ``.vsix`` file without errors
   * AC-3: ``publisher`` in ``package.json`` is ``enthali``
