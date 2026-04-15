---
name: jarvis.verify-extensions
description: "Jarvis-specific verification extensions: Test Protocol Check and detailed Validation Report format. USE FOR: verification of Jarvis changes by the Verify Engineer. Extends the generic syspilot verify workflow with project-specific checks."
---

# Jarvis Verify Extensions

Project-specific additions to the Verify Engineer workflow for the Jarvis
VS Code extension project.

## Test Protocol Check

<!-- Implementation: SPEC_DEV_VERIFYPROTOCOL -->
<!-- Requirements: REQ_DEV_TESTPROTOCOL -->

Before writing the Validation Report, check for a manual test protocol at
`docs/changes/tst-<change-name>.md`:

1. **File exists?**
   - Found → read and continue
   - Missing → note in report, ask user to clarify before proceeding

2. **Overall result is PASSED?**
   - Check for `**Result**: PASSED` in the file header
   - PASSED → proceed
   - FAILED → stop, do not mark as implemented, hand off to implement agent

3. **No individual FAIL rows?**
   - Scan the Test Results table for any `FAIL` entries
   - Any FAIL found → report as issue

4. **Include in validation report:**

```markdown
## Test Protocol

**File**: docs/changes/tst-<change-name>.md
**Result**: PASSED | MISSING | FAILED

| # | REQ ID | AC | Description | Result |
|---|--------|-----|-------------|--------|
| (rows from tst file) |
```

## Validation Report Format

The validation report (`docs/changes/val-<name>.md`) must use this structure:

```markdown
# Validation Report: [Feature/Change Name]

**Date**: YYYY-MM-DD
**Change Document**: [link or reference]
**Status**: PASSED | PARTIAL | FAILED

## Summary

| Category | Total | Verified | Issues |
|----------|-------|----------|--------|
| Requirements | n | n | 0 |
| Designs | n | n | 0 |
| Implementations | n | n | 0 |
| Tests | n | n | 0 |
| Traceability | n | n | 0 |

## Requirements Coverage

| REQ ID | Description | SPEC | Code | Test | Status |
|--------|-------------|------|------|------|--------|

## Acceptance Criteria Verification

### REQ_xxx_1
- [x] AC-1: [criterion] — Evidence: [file path + line]
- [ ] AC-2: [criterion] — **MISSING**

## Test Protocol
(see Test Protocol Check above)

## Issues Found

### Issue 1: [Title]
- **Severity**: High | Medium | Low
- **Category**: Requirements | Design | Code | Test | Traceability
- **Description**: [What's wrong]
- **Expected**: [What should be]
- **Actual**: [What is]
- **Recommendation**: [How to fix]

## Traceability Matrix

| Requirement | Design | Implementation | Test | Complete |
|-------------|--------|----------------|------|----------|

## Conclusion

[Overall assessment and next steps]
```

## Code Verification Checklist (Jarvis-specific)

For TypeScript implementation files in `src/`:

| Check | Question |
|-------|----------|
| Traceability | Does code reference SPEC IDs in comments? |
| Completeness | Are all design items implemented? |
| Quality | Does it follow Jarvis project conventions? |
| PowerShell | JSON sanitization applied (U+0000–U+001F)? |
| When-clauses | Boolean configs use explicit `== true`? |
| Error handling | Optional integrations wrapped in try/catch? |
