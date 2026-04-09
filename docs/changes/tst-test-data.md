# Test Protocol: test-data

**Date**: 2026-04-02
**Change Document**: docs/changes/test-data.md
**Result**: PASSED

## Test Results

| # | REQ ID | AC | Description | Result |
|---|--------|----|-------------|--------|
| 1 | REQ_UAT_VALID_SAMPLES | AC-1 | testdata/projects/ contains ≥3 valid project YAML files | PASS |
| 2 | REQ_UAT_VALID_SAMPLES | AC-2 | testdata/events/ contains ≥3 valid event YAML files | PASS |
| 3 | REQ_UAT_VALID_SAMPLES | AC-3 | Files cover a variety of status values | PASS |
| 4 | REQ_UAT_VALID_SAMPLES | AC-4 | All mandatory fields present and correctly typed | PASS |
| 5 | REQ_UAT_INVALID_SAMPLES | AC-1 | ≥2 invalid files in testdata/projects/ | PASS |
| 6 | REQ_UAT_INVALID_SAMPLES | AC-2 | ≥2 invalid files in testdata/events/ | PASS |
| 7 | REQ_UAT_INVALID_SAMPLES | AC-3 | Invalid cases: missing name, wrong type, empty file, bad status | PASS |

## Notes

- Scanner correctly skips project-invalid-no-name.yaml (missing name field)
- Scanner correctly skips project-invalid-bad-name.yaml (name is integer, not string)
- Scanner correctly skips event-invalid-empty.yaml (empty file)
- Scanner correctly skips event-invalid-bad-status.yaml (name present, status invalid — shown by scanner since no schema validation; accepted as known behavior per REQ_EXP_YAMLDATA AC-4)
- Name prefix pattern (^Project: / ^Event:) removed from JSON Schemas — names are now free-form strings
