# Test Protocol: sphinx-compat

**Date**: 2026-04-01
**Change Document**: docs/changes/sphinx-compat.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| 1 | REQ_REL_SPHINXCOMPAT | AC-1 | Sphinx build on CI/local completes with 0 warnings | PASS |
| 2 | REQ_REL_SPHINXCOMPAT | AC-2 | conf.py uses `needs_fields` instead of deprecated `needs_extra_options` | PASS |
| 3 | REQ_REL_SPHINXCOMPAT | AC-3 | conf.py uses `needs_fields` status enum instead of deprecated `needs_statuses` | PASS |
| 4 | REQ_REL_SPHINXCOMPAT | AC-4 | No `html_static_path` warning for missing `_static` directory | PASS |
| 5 | REQ_REL_SPHINXCOMPAT | AC-5 | `docs/requirements.txt` exists with 4 pinned packages | PASS |
| 6 | REQ_REL_SPHINXCOMPAT | AC-6 | `docs.yml` installs from `docs/requirements.txt` | PASS |
| 7 | REQ_REL_SPHINXCOMPAT | AC-7 | Local `pip install -r docs/requirements.txt` succeeded | PASS |

## Notes

- sphinx-needs 8.0.0 requires `nullable: True` on custom fields without schema — added to `priority`, `rationale`, `acceptance_criteria`.
- Local: sphinx==9.1.0, sphinx-needs==8.0.0, furo==2025.12.19, myst-parser==5.0.0.
- Build output: `build succeeded.` with 0 warnings.
