# Change Document: release-setup

**Status**: approved
**Branch**: feature/release-setup
**Created**: 2026-03-31
**Author**: Change Agent

---

## Summary

Set up the release pipeline for Jarvis: automated GitHub Pages deployment of Sphinx docs, and GitHub Release creation with a `.vsix` extension package. Both pipelines are triggered by pushing a Git tag (`v*`). Semantic versioning governs version numbers.

---

## Level 0: User Stories

**Status**: ✅ approved

### New User Stories

#### US_REL_DOCS: Documentation Publishing

```rst
.. story:: Documentation Publishing
   :id: US_REL_DOCS
   :status: draft
   :priority: mandatory

   **As a** Jarvis developer,
   **I want** the Sphinx documentation to be automatically published to GitHub Pages,
   **so that** users and contributors can browse requirements, design specs, and change
   history online.

   **Acceptance Criteria:**

   * AC-1: Every push to ``main`` triggers a docs build and deploy
   * AC-2: The docs are accessible at ``https://enthali.github.io/Jarvis``
   * AC-3: The deploy fails visibly if the Sphinx build has errors
```

#### US_REL_RELEASE: Extension Release

```rst
.. story:: Extension Release
   :id: US_REL_RELEASE
   :status: draft
   :priority: mandatory

   **As a** Jarvis user,
   **I want** to install the Jarvis extension from a GitHub Release,
   **so that** I can use a stable, versioned build without cloning the source.

   **Acceptance Criteria:**

   * AC-1: Pushing a Git tag ``v*`` creates a GitHub Release automatically
   * AC-2: The release includes a ``.vsix`` file as downloadable asset
   * AC-3: The version in ``package.json`` matches the git tag
   * AC-4: The release notes list what changed
```

#### US_REL_VERSION: Semantic Versioning

```rst
.. story:: Semantic Versioning
   :id: US_REL_VERSION
   :status: draft
   :priority: mandatory

   **As a** Jarvis developer,
   **I want** version numbers to follow Semantic Versioning (MAJOR.MINOR.PATCH),
   **so that** users can understand the impact of updates and the release process
   is predictable.

   **Acceptance Criteria:**

   * AC-1: ``package.json`` version follows ``MAJOR.MINOR.PATCH`` format
   * AC-2: The syspilot Release Agent knows how to bump the version before tagging
```

### Decisions

- Marketplace publish deferred — add as separate change `US_REL_MARKETPLACE` after first successful releases
- Publisher: `enthali` (GitHub username, used in package.json and future marketplace setup)
- Docs URL target: `https://enthali.github.io/Jarvis`

### Horizontal Check (MECE)

- ✅ No overlap with EXP theme user stories
- ✅ Three concerns clearly separated: Docs (US_REL_DOCS), Release artifact (US_REL_RELEASE), Versioning (US_REL_VERSION)
- ✅ No contradictions

---

## Level 1: Requirements

**Status**: ✅ approved

### New Requirements

#### REQ_REL_SEMVER: Semantic Versioning

```rst
.. req:: Semantic Versioning
   :id: REQ_REL_SEMVER
   :status: draft
   :priority: mandatory
   :links: US_REL_VERSION

   **Description:**
   The Jarvis extension SHALL use Semantic Versioning (MAJOR.MINOR.PATCH).
   ``package.json`` is the single source of truth for the version number.

   **Acceptance Criteria:**

   * AC-1: ``package.json`` ``version`` field follows ``MAJOR.MINOR.PATCH`` format
   * AC-2: The version is readable by the GitHub Actions release workflow to name the release
```

#### REQ_REL_DOCSWORKFLOW: Docs CI/CD Workflow

```rst
.. req:: Docs CI/CD Workflow
   :id: REQ_REL_DOCSWORKFLOW
   :status: draft
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
```

#### REQ_REL_RELEASEACTION: Release GitHub Action

```rst
.. req:: Release GitHub Action
   :id: REQ_REL_RELEASEACTION
   :status: draft
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
```

#### REQ_REL_VSCEPKG: Extension Packaging

```rst
.. req:: Extension Packaging
   :id: REQ_REL_VSCEPKG
   :status: draft
   :priority: mandatory
   :links: US_REL_RELEASE

   **Description:**
   The extension SHALL be packaged as a ``.vsix`` file using ``@vscode/vsce``.
   The ``publisher`` field in ``package.json`` SHALL be set to ``enthali``.

   **Acceptance Criteria:**

   * AC-1: ``@vscode/vsce`` is listed as a devDependency
   * AC-2: ``npm run package`` produces a ``.vsix`` file without errors
   * AC-3: ``publisher`` in ``package.json`` is ``enthali``
```

### Decisions

- `package.json` is the single version source of truth (not `.syspilot/version.json` which is syspilot-internal)
- Branch protection rules: deferred (scope creep)
- All REL specs go into new files: `us_rel.rst`, `req_rel.rst`, `spec_rel.rst`

### Horizontal Check (MECE)

- ✅ REQ_REL_SEMVER ← US_REL_VERSION
- ✅ REQ_REL_DOCSWORKFLOW ← US_REL_DOCS
- ✅ REQ_REL_RELEASEACTION ← US_REL_RELEASE
- ✅ REQ_REL_VSCEPKG ← US_REL_RELEASE
- ✅ No overlaps, no gaps, all US covered

---

## Level 2: Design

**Status**: ✅ approved

### New Design Elements

#### SPEC_REL_SEMVER: Version in package.json

```rst
.. spec:: Version in package.json
   :id: SPEC_REL_SEMVER
   :status: draft
   :links: REQ_REL_SEMVER

   **Description:**
   ``package.json`` is the single source of truth for the Jarvis version number.
   The version field SHALL follow Semantic Versioning (MAJOR.MINOR.PATCH).
   No other file duplicates or shadows this version.
```

#### SPEC_REL_VSCEPKG: Extension Packaging Setup

```rst
.. spec:: Extension Packaging Setup
   :id: SPEC_REL_VSCEPKG
   :status: draft
   :links: REQ_REL_VSCEPKG

   **Description:**
   Configure ``package.json`` for packaging:

   * ``"publisher": "enthali"``
   * Add devDependency: ``"@vscode/vsce": "^3.0.0"``
   * Add script: ``"package": "vsce package"``

   Run ``npm install`` to update ``package-lock.json``.
   Verify with ``npm run package`` — produces ``jarvis-0.0.1.vsix``.
```

#### SPEC_REL_DOCSWORKFLOW: Docs GitHub Actions Workflow

```rst
.. spec:: Docs GitHub Actions Workflow
   :id: SPEC_REL_DOCSWORKFLOW
   :status: draft
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
   (Already done manually.)
```

#### SPEC_REL_RELEASEACTION: Release GitHub Actions Workflow

```rst
.. spec:: Release GitHub Actions Workflow
   :id: SPEC_REL_RELEASEACTION
   :status: draft
   :links: REQ_REL_RELEASEACTION

   **Description:**
   Create ``.github/workflows/release.yml``:

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
                files: '*.vsix'
                generate_release_notes: true
```

### Decisions

- Version stays ``0.0.1`` — hello-world scope, no real features yet
- GitHub Pages already activated manually (Settings → Pages → Source: GitHub Actions)
- Release notes: ``generate_release_notes: true`` (GitHub-generated from commits between tags)

### Horizontal Check (MECE)

- ✅ SPEC_REL_SEMVER → REQ_REL_SEMVER ← US_REL_VERSION
- ✅ SPEC_REL_VSCEPKG → REQ_REL_VSCEPKG ← US_REL_RELEASE
- ✅ SPEC_REL_DOCSWORKFLOW → REQ_REL_DOCSWORKFLOW ← US_REL_DOCS
- ✅ SPEC_REL_RELEASEACTION → REQ_REL_RELEASEACTION ← US_REL_RELEASE
- ✅ Full traceability US → REQ → SPEC at all levels

---

## Final Consistency Check

**Status**: ✅ approved

### Traceability

| US | REQ | SPEC |
|----|-----|------|
| US_REL_VERSION | REQ_REL_SEMVER | SPEC_REL_SEMVER |
| US_REL_DOCS | REQ_REL_DOCSWORKFLOW | SPEC_REL_DOCSWORKFLOW |
| US_REL_RELEASE | REQ_REL_RELEASEACTION | SPEC_REL_RELEASEACTION |
| US_REL_RELEASE | REQ_REL_VSCEPKG | SPEC_REL_VSCEPKG |

✅ Full vertical traceability confirmed at all levels.

