# Change Document: manual-test

**Status**: approved
**Branch**: feature/manual-test
**Created**: 2026-03-31
**Author**: Change Agent

---

## Summary

Add a manual user acceptance test step to the Implement Agent workflow. After code is compiled, the agent launches a VS Code Extension Development Host and presents the user with a change-specific checklist of what to verify manually. Test results are persisted as test protocol documents in `docs/changes/` and verified by the Verify Agent.

---

## Level 0: User Stories

**Status**: ✅ completed

### New User Stories
- US_EXP_MANUALTEST: Manual Extension Testing

### Modified User Stories

#### US_EXP_MANUALTEST: Add AC-5

Added acceptance criterion:

* AC-5: Test questions and results are persisted as a document for traceability

---

## Level 1: Requirements

**Status**: 🔄 revised

### New Requirements
- REQ_EXP_LAUNCHCONFIG: VS Code Launch Configuration (implemented)
- REQ_EXP_TESTSUMMARY: User-Facing Test Summary (implemented)
- **REQ_EXP_TESTPROTOCOL**: Test Result Persistence (**new**)

#### REQ_EXP_TESTPROTOCOL: Test Result Persistence

```rst
.. req:: Test Result Persistence
   :id: REQ_EXP_TESTPROTOCOL
   :status: draft
   :priority: mandatory
   :links: US_EXP_MANUALTEST

   **Description:**
   After the user confirms or rejects the manual test, the Implement Agent SHALL
   persist the test protocol as ``docs/changes/tst-<change-name>.md``.
   The protocol SHALL include: change name, date, each test item with its
   REQ ID, AC reference, and pass/fail result.

   The Verify Agent SHALL check that a test protocol exists and that all
   items passed before marking specs as implemented.

   **Acceptance Criteria:**

   * AC-1: A test protocol file is created at ``docs/changes/tst-<change-name>.md``
   * AC-2: The protocol lists each tested REQ with AC reference and pass/fail
   * AC-3: The Verify Agent checks the protocol exists and all items passed
```

---

## Level 2: Design

**Status**: 🔄 revised

### New Design Elements
- SPEC_EXP_LAUNCHCONFIG: Launch Configuration File (implemented)
- SPEC_EXP_IMPLTEST: Implement Agent Manual Test Step (implemented — **needs update**)
- **SPEC_EXP_TESTPROTOCOL**: Test Protocol Format (**new**)

#### SPEC_EXP_TESTPROTOCOL: Test Protocol Format

```rst
.. spec:: Test Protocol Format
   :id: SPEC_EXP_TESTPROTOCOL
   :status: draft
   :links: REQ_EXP_TESTPROTOCOL

   **Description:**
   After the manual test ``ask_questions`` step, the Implement Agent creates
   ``docs/changes/tst-<change-name>.md`` with the following format:

   .. code-block:: markdown

      # Test Protocol: <change-name>

      **Date**: YYYY-MM-DD
      **Change Document**: docs/changes/<change-name>.md
      **Result**: PASSED | FAILED

      ## Test Results

      | # | REQ ID | AC | Description | Result |
      |---|--------|-----|-------------|--------|
      | 1 | REQ_xxx | AC-1 | ... | ✅ Pass |
      | 2 | REQ_xxx | AC-2 | ... | ❌ Fail |

      ## Notes

      {Optional user freeform notes from ask_questions}

   **Verify Agent integration:**
   The Verify Agent SHALL read ``docs/changes/tst-<change-name>.md`` and:

   * Check that the file exists
   * Check that the overall result is PASSED
   * Include test protocol status in the verification report
```

#### SPEC_EXP_IMPLTEST: Update (add protocol persistence)

The existing step 6 in ``syspilot.implement.agent.md`` needs an additional sub-step
after the user confirms/rejects:

   6. Save test results to ``docs/changes/tst-<change-name>.md``

### Key Decisions
1. Agent uses `code --extensionDevelopmentPath=` (CLI); launch.json is for interactive F5
2. Manual test step placed after quality gates, before documentation/commit
3. `ask_questions` tool for pass/fail confirmation
4. **Test protocol persisted in `docs/changes/tst-<change-name>.md`** — same folder as change docs, prefixed with `tst-`
5. **Verify Agent checks protocol** — no protocol or failed items = verification fails

---

## Final Consistency Check

**Status**: ✅ passed

### Traceability

| User Story | Requirements | Design | Complete? |
|------------|--------------|--------|-----------|
| US_EXP_MANUALTEST (AC-1) | REQ_EXP_LAUNCHCONFIG | SPEC_EXP_LAUNCHCONFIG | ✅ impl |
| US_EXP_MANUALTEST (AC-2, AC-3, AC-4) | REQ_EXP_TESTSUMMARY | SPEC_EXP_IMPLTEST | ✅ impl |
| US_EXP_MANUALTEST (AC-5) | REQ_EXP_TESTPROTOCOL | SPEC_EXP_TESTPROTOCOL | ✅ approved |

### Sign-off
- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] User approved
- [x] RST files written with status: approved

### Sign-off
- [x] All levels completed
- [x] All conflicts resolved
- [x] Traceability verified
- [x] User approved
- [x] RST files written with status: approved
