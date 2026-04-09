# Change Document: sphinx-compat

**Status**: approved
**Branch**: feature/sphinx-compat
**Created**: 2026-04-01
**Author**: Jarvis Team

---

## Summary

The GitHub Actions docs-deploy workflow failed because the CI runner installed sphinx-needs ≥ 7.0.0,
which deprecated `needs_extra_options` and `needs_statuses`. Additionally, `docs/_static` is not
tracked in git so the CI sees a `html_static_path` warning. With `-W` treating warnings as errors,
the build stopped. This change migrates `docs/conf.py` to the current sphinx-needs API (`needs_fields`)
and removes the untracked `_static` path reference.

---

## Level 0: User Stories

**Status**: ✅ completed

### Impacted User Stories

| ID | Title | Impact | Notes |
|----|-------|--------|-------|
| `US_REL_DOCS` | Deploy Sphinx Docs to GitHub Pages | bug fix | CI deploy broke due to deprecated sphinx-needs config |

### New User Stories

None — this is a bug fix under the existing `US_REL_DOCS`.

### Decisions

- No new US needed: the acceptance criterion "docs accessible at https://enthali.github.io/Jarvis" is not met until the CI is fixed; fixing the CI is in scope of `US_REL_DOCS`.

### Horizontal Check (MECE)

- ✅ No contradictions with existing User Stories
- ✅ No redundancies
- ✅ No gaps — `US_REL_DOCS` fully covers the intent

---

## Level 1: Requirements

**Status**: ✅ completed

### Impacted Requirements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `REQ_REL_DOCSWORKFLOW` | `US_REL_DOCS` | no change | Still correct — CI should build and deploy; bug is in conf.py, not workflow structure |

### New Requirements

```rst
.. req:: Sphinx Configuration Compatibility
   :id: REQ_REL_SPHINXCOMPAT
   :status: approved
   :priority: mandatory
   :links: US_REL_DOCS

   **Description:**
   The Sphinx docs build configuration SHALL use only non-deprecated sphinx-needs API and
   SHALL pin all documentation dependencies to known-good versions so that CI and local
   builds are reproducible and identical.

   **Acceptance Criteria:**

   * AC-1: Sphinx build on CI completes with 0 warnings (``build succeeded.`` message)
   * AC-2: ``docs/conf.py`` uses ``needs_fields`` instead of deprecated ``needs_extra_options``
   * AC-3: ``docs/conf.py`` uses ``needs_fields`` status enum instead of deprecated ``needs_statuses``
   * AC-4: No ``html_static_path`` warning for a missing ``_static`` directory
   * AC-5: ``docs/requirements.txt`` defines pinned versions of all Sphinx dependencies
   * AC-6: ``docs.yml`` installs from ``docs/requirements.txt`` instead of inline package names
   * AC-7: Local build succeeds after ``pip install -r docs/requirements.txt``
```

### Decisions

- Migrate to `needs_fields` (sphinx-needs 8.0.0 API) — no deprecated options remain.
- Introduce `docs/requirements.txt` to pin versions — CI and local always identical.
- Pin to current latest: `sphinx==9.1.0`, `sphinx-needs==8.0.0`, `furo==2025.12.19`, `myst-parser==5.0.0`.
- Remove `html_static_path = ['_static']` — no custom static files exist.
- Keep status validation: fold `needs_statuses` enum into `needs_fields["status"]`.

### Horizontal Check (MECE)

- ✅ No contradictions with `REQ_REL_DOCSWORKFLOW`
- ✅ No redundancies
- ✅ `REQ_REL_SPHINXCOMPAT` links to `US_REL_DOCS`

---

## Level 2: Design

**Status**: ✅ completed

### Impacted Design Elements

| ID | Linked From | Impact | Notes |
|----|-------------|--------|-------|
| `SPEC_REL_DOCSWORKFLOW` | `REQ_REL_DOCSWORKFLOW` | no change | Workflow YAML unchanged |

### New Design Elements

```rst
.. spec:: Sphinx Configuration Migration to needs_fields + requirements.txt
   :id: SPEC_REL_SPHINXCOMPAT
   :status: approved
   :links: REQ_REL_SPHINXCOMPAT

   **Description:**
   Three changes to fix CI docs deploy and synchronise local/CI environments:

   **1. Create ``docs/requirements.txt``:**

   .. code-block:: text

      sphinx==9.1.0
      sphinx-needs==8.0.0
      furo==2025.12.19
      myst-parser==5.0.0

   **2. Update ``.github/workflows/docs.yml``** — replace inline pip install with:

   .. code-block:: yaml

      - run: pip install -r docs/requirements.txt

   **3. Update ``docs/conf.py``:**

   - Remove: ``needs_extra_options = [...]``
   - Remove: ``needs_statuses = [...]``
   - Remove: ``html_static_path = ['_static']``
   - Add:

   .. code-block:: python

      needs_fields = {
          "priority": {},
          "rationale": {},
          "acceptance_criteria": {},
          "status": {
              "schema": {
                  "enum": [
                      "draft", "open", "approved",
                      "implemented", "verified", "deprecated",
                  ],
              },
          },
      }

   After all edits, run locally: ``pip install -r docs/requirements.txt``
   and verify with: ``python -m sphinx -b html docs docs/_build/html -W --keep-going``
```

### Decisions

- `needs_priority` is a custom conf.py list, not a sphinx-needs option — not related to warnings; leave as-is.
- `priority`, `rationale`, `acceptance_criteria` defined as plain `{}` string fields (default schema is `{"type": "string"}`).

### Horizontal Check (MECE)

- ✅ No contradictions with existing SPECs
- ✅ `SPEC_REL_SPHINXCOMPAT` links to `REQ_REL_SPHINXCOMPAT`

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability Verification

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| `US_REL_DOCS` | `REQ_REL_SPHINXCOMPAT` (new) | `SPEC_REL_SPHINXCOMPAT` (new) | ✅ |

### Sign-off

- ✅ All levels completed
- ✅ All conflicts resolved
- ✅ Traceability verified
- ✅ Ready for implementation

---

*Generated by syspilot Change Agent*
