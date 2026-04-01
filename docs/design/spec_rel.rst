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
   Verify with ``npm run package`` — produces ``jarvis-0.0.1.vsix``.


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
