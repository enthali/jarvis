Release User Stories
====================

.. story:: Documentation Publishing
   :id: US_REL_DOCS
   :status: implemented
   :priority: mandatory

   **As a** Jarvis Developer,
   **I want** the Sphinx documentation to be automatically published to GitHub Pages,
   **so that** users and contributors can browse requirements, design specs, and change
   history online.

   **Acceptance Criteria:**

   * AC-1: Every push to ``main`` triggers a docs build and deploy
   * AC-2: The docs are accessible at ``https://enthali.github.io/Jarvis``
   * AC-3: The deploy fails visibly if the Sphinx build has errors


.. story:: Extension Release
   :id: US_REL_RELEASE
   :status: implemented
   :priority: mandatory

   **As a** Jarvis Developer,
   **I want** to release the Jarvis extension as a GitHub Release,
   **so that** users can install a stable, versioned build without cloning the source.

   **Acceptance Criteria:**

   * AC-1: Pushing a Git tag ``v*`` creates a GitHub Release automatically
   * AC-2: The release includes a ``.vsix`` file as downloadable asset
   * AC-3: The version in ``package.json`` matches the git tag
   * AC-4: The release notes list what changed


.. story:: Semantic Versioning
   :id: US_REL_VERSION
   :status: implemented
   :priority: mandatory

   **As a** Jarvis Developer,
   **I want** version numbers to follow Semantic Versioning (MAJOR.MINOR.PATCH),
   **so that** users can understand the impact of updates and the release process
   is predictable.

   **Acceptance Criteria:**

   * AC-1: ``package.json`` version follows ``MAJOR.MINOR.PATCH`` format
   * AC-2: The syspilot Release Agent knows how to bump the version before tagging


.. story:: Git Branch & Merge Workflow
   :id: US_REL_GITWORKFLOW
   :status: implemented
   :priority: mandatory
   :links: US_DEV_CONVENTIONS

   **As a** Jarvis Developer,
   **I want** a defined Git workflow for feature branches and merging to main,
   **so that** the main branch stays clean with one commit per feature and the
   release process is reproducible.

   **Acceptance Criteria:**

   * AC-1: Feature branches follow the naming convention `feature/<change-name>`
   * AC-2: Feature branches are merged into `main` via squash merge (one commit per feature)
   * AC-3: Feature branches are kept locally after merge but NOT pushed to origin
   * AC-4: All changes including hotfixes go through the syspilot Change process — no direct commits to `main`
   * AC-5: The Release Agent documents and follows the merge strategy


.. story:: Self-Update Check
   :id: US_REL_SELFUPDATE
   :status: implemented
   :priority: optional
   :links: US_REL_RELEASE; US_REL_VERSION

   **As a** Jarvis User,
   **I want** Jarvis to check for newer versions on GitHub at startup (and on demand)
   and offer to install the update,
   **so that** I always run the latest version without manually checking the releases page.

   **Acceptance Criteria:**

   * AC-1: On extension activation, Jarvis queries the GitHub Releases API for the latest
     release and compares the tag version against the installed version
   * AC-2: If a newer version is available, a notification shows the available version and
     offers "Release Notes" (opens browser) and "Download & Install" (downloads ``.vsix``,
     installs, prompts reload)
   * AC-3: If the installed version is current or newer, no notification is shown
   * AC-4: A command ``Jarvis: Check for Updates`` triggers the same check manually; if
     already up to date, an informational message confirms this
   * AC-5: A setting ``jarvis.checkForUpdates`` (default ``true``) controls whether the
     automatic check runs at activation; the manual command works regardless


.. story:: VS Code Marketplace Discoverability
   :id: US_REL_MARKETPLACE
   :status: draft
   :priority: mandatory

   *Context: Complements US_REL_RELEASE (GitHub Releases) by adding a second
   distribution channel. The GitHub Releases auto-update path must remain
   unchanged.*

   **As a** VS Code user,
   **I want** to find and install Jarvis directly from the VS Code Marketplace,
   **so that** I can discover and install it without visiting GitHub or downloading a
   ``.vsix`` manually.

   **Acceptance Criteria:**

   * AC-1: ``enthali.jarvis`` is searchable on the VS Code Marketplace by name and keyword
   * AC-2: The extension page shows a meaningful description, icon, and repository link
   * AC-3: After a release tag is pushed, the CI automatically publishes the new version
     to the Marketplace without manual intervention
   * AC-4: The existing GitHub Releases auto-update path continues to work unchanged


.. story:: Extension Package Contract
   :id: US_REL_PKGCONTRACT
   :status: implemented
   :priority: mandatory

   *Context: Complements US_REL_RELEASE (GitHub Releases) and US_REL_MARKETPLACE
   (Marketplace publishing) by establishing the structural prerequisites that make
   both distribution channels reliable across all extension packages.*

   **As a** Jarvis Developer,
   **I want** all extension packages in the monorepo to follow a uniform build and
   packaging contract,
   **so that** the release CI can compile, bundle, and publish every extension
   reliably with a single consistent strategy.

   **Acceptance Criteria:**

   * AC-1: Each extension is packageable via ``vsce package --no-dependencies`` after
     esbuild bundling without CI-specific workarounds
   * AC-2: Adding a new extension to the monorepo requires no CI changes — it just
     follows the contract
   * AC-3: A packaging failure in any single extension is visible and fails the CI job
