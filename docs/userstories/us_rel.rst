Release User Stories
====================

.. story:: Documentation Publishing
   :id: US_REL_DOCS
   :status: approved
   :priority: mandatory

   **As a** Jarvis developer,
   **I want** the Sphinx documentation to be automatically published to GitHub Pages,
   **so that** users and contributors can browse requirements, design specs, and change
   history online.

   **Acceptance Criteria:**

   * AC-1: Every push to ``main`` triggers a docs build and deploy
   * AC-2: The docs are accessible at ``https://enthali.github.io/Jarvis``
   * AC-3: The deploy fails visibly if the Sphinx build has errors


.. story:: Extension Release
   :id: US_REL_RELEASE
   :status: approved
   :priority: mandatory

   **As a** Jarvis user,
   **I want** to install the Jarvis extension from a GitHub Release,
   **so that** I can use a stable, versioned build without cloning the source.

   **Acceptance Criteria:**

   * AC-1: Pushing a Git tag ``v*`` creates a GitHub Release automatically
   * AC-2: The release includes a ``.vsix`` file as downloadable asset
   * AC-3: The version in ``package.json`` matches the git tag
   * AC-4: The release notes list what changed


.. story:: Semantic Versioning
   :id: US_REL_VERSION
   :status: approved
   :priority: mandatory

   **As a** Jarvis developer,
   **I want** version numbers to follow Semantic Versioning (MAJOR.MINOR.PATCH),
   **so that** users can understand the impact of updates and the release process
   is predictable.

   **Acceptance Criteria:**

   * AC-1: ``package.json`` version follows ``MAJOR.MINOR.PATCH`` format
   * AC-2: The syspilot Release Agent knows how to bump the version before tagging
