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
   Configure ``package.json`` for packaging:

   * ``"publisher": "enthali"``
   * Add devDependency: ``"@vscode/vsce": "^3.0.0"``
   * Add script: ``"package": "vsce package"``

   Run ``npm install`` to update ``package-lock.json``.
   Verify with ``npm run package`` — produces ``jarvis-<version>.vsix``.

   **``.vscodeignore`` constraints:**

   The ``.vscodeignore`` file controls which files are excluded from the
   ``.vsix`` package.  Because Jarvis does **not** use a bundler (no webpack,
   no esbuild), runtime dependencies in ``node_modules/`` must be shipped
   inside the package.  Therefore ``node_modules/**`` SHALL NOT appear in
   ``.vscodeignore``.


.. spec:: Docs GitHub Actions Workflow
   :id: SPEC_REL_DOCSWORKFLOW
   :status: implemented
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


.. spec:: Release GitHub Actions Workflow
   :id: SPEC_REL_RELEASEACTION
   :status: implemented
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

   <!-- Implementation: SPEC_REL_AGENTPOLICY -->
   <!-- Requirements: REQ_REL_AGENTPOLICY -->


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
