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
   * AC-6: The "Download & Install" flow updates exactly the ``enthali.jarvis*``
     extensions the user currently has installed — each gets the VSIX that corresponds
     to its extension ID; a single "Reload Now" prompt follows once all are installed
   * AC-7: If no installed ``enthali.jarvis*`` extension matches any asset in the
     release, the release page is opened as fallback (no silent failure)


.. story:: See What Changed After an Update
   :id: US_REL_WHATSNEW
   :status: approved
   :priority: required
   :links: US_REL_RELEASE; US_REL_SELFUPDATE

   *Context: US_REL_SELFUPDATE already offers release notes* **before** *an
   update — for a version the user does not yet have, as an aid to deciding
   whether to install it. Nothing covers the moment* **after** *the update, when
   the user has the new version and the question changes from "should I take
   this?" to "what did I just get?". Releases 0.25.0 and later change the
   on-disk* ``.jarvis/`` *layout (#59) and edit the user's* ``.gitignore``
   *(#60), so that second question now has consequences the user can see in
   their own working tree.*

   *Which is also why the announcement belongs to the workspace rather than to
   the machine. What the notes ask of the user is work in a project: check a
   diff, accept a moved file, resolve a breaking change. A user who read the
   notes in one project has not thereby fixed the other four, and by the time
   they open the fourth — possibly weeks later — they will not remember what
   the release changed. Being told again in the project where the work is due
   is not repetition; it is the announcement arriving where it can be acted on.*

   **As a** Jarvis User,
   **I want** Jarvis to show me what changed the first time I run a version I
   have not run before, and to let me reopen those notes whenever I want,
   **so that** I understand changes Jarvis has made to my workspace instead of
   discovering them as unexplained diffs.

   **Acceptance Criteria:**

   * AC-1: The first time Jarvis runs a version the user has not run before, the
     release notes for **that installed version** are shown without the user
     asking
   * AC-2: Within a workspace, running that same version again does not show
     the notes again, however often the user reopens it. Running a different
     version in between and then coming back does show them again: what is
     remembered per workspace is the last version announced there, not every
     version ever run
   * AC-3: A first-ever installation is not treated as an update: nothing is
     shown, and the installed version is recorded as already seen. A user who
     has just chosen to install Jarvis is looking at the editor, and has not
     asked to be sent anywhere else
   * AC-4: The user can bring up the current version's notes at any time,
     whether or not they were shown automatically
   * AC-5: The automatic behaviour can be turned off, and turning it off leaves
     the on-demand way of reading the notes intact
   * AC-6: One update is one announcement **per workspace**. Several windows on
     the same workspace, and the several Jarvis extensions the user may have
     installed, do not multiply it. Opening a different workspace does announce
     again, and that is the intent, not an oversight
   * AC-7: If the notes for the installed version cannot be reached, the user
     is left with something they can act on, not with silence
   * AC-8: The notes appear inside the editor. Reading them does not move the
     user out of VS Code and into a separate application. Where Jarvis cannot
     render them in the editor it may offer a way out to an external browser,
     but the user decides to take it — finishing an update is not a reason to
     change which window the user is looking at
   * AC-9: A window with no folder open shows nothing and remembers nothing.
     There is no project to act in, and the user meets the notes at the first
     workspace they do open


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


.. story:: Legacy Extension Retirement
   :id: US_REL_RETIRELEGACY
   :status: draft
   :priority: mandatory
   :links: US_REL_SELFUPDATE

   *Context: The extension was renamed from ``enthali.jarvis`` to
   ``enthali.jarvis-core``. Users still on the obsolete ``enthali.jarvis`` ID must
   be migrated to the renamed extension. Reuses the GitHub Releases delivery path
   from US_REL_SELFUPDATE; the migrated user is then served by US_REL_MARKETPLACE.*

   **As a** user still on the obsolete ``enthali.jarvis`` extension,
   **I want** the final legacy release to automatically migrate me to
   ``enthali.jarvis-core`` and then remove itself,
   **so that** I am never stranded on the dead extension ID, and two Jarvis
   instances never operate on the same ``.jarvis`` project data at once.

   **Acceptance Criteria:**

   * AC-1: The final ``enthali.jarvis`` release is a migration shim: on activation it
     registers **no** Jarvis surfaces (no sessions view, no heartbeat, no message
     processing) — guaranteeing only one active Jarvis instance per workspace.
   * AC-2: The shim notifies the user that Jarvis has moved, then ensures
     ``enthali.jarvis-core`` is installed — trying the VS Code Marketplace first, and
     falling back to a GitHub Releases ``.vsix`` install when the Marketplace is
     unreachable (e.g. corporate/private marketplace).
   * AC-3: Once ``enthali.jarvis-core`` is present, the shim uninstalls itself and
     prompts the user to reload the window.
   * AC-4: If neither install channel succeeds, the shim does **not** uninstall
     itself; it shows a notification with a manual-install link to
     ``enthali.jarvis-core`` and retries the migration on the next startup.
   * AC-5: No ``enthali.jarvis`` release is published after this final shim. The shim
     release remains downloadable so existing users still land on it and migrate.
