Developer Tooling Design Specifications
=========================================

.. spec:: Launch Configuration File
   :id: SPEC_DEV_LAUNCHCONFIG
   :status: implemented
   :links: REQ_DEV_LAUNCHCONFIG

   **Description:**
   Create ``.vscode/launch.json`` with:

   .. code-block:: json

      {
        "version": "0.2.0",
        "configurations": [
          {
            "name": "Run Extension",
            "type": "extensionHost",
            "request": "launch",
            "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
            "outFiles": ["${workspaceFolder}/out/**/*.js"],
            "preLaunchTask": "npm: compile"
          }
        ]
      }

   Also create ``.vscode/tasks.json`` with the compile task if not present.


.. spec:: Implement Agent Manual Test Step
   :id: SPEC_DEV_IMPLTEST
   :status: implemented
   :links: REQ_DEV_TESTSUMMARY

   **Description:**
   Add a new step to ``syspilot.implement.agent.md`` between "Quality Gates" and
   "Update Documentation":

   **Step: Manual User Acceptance Test**

   1. Compile the extension: ``npm run compile``
   2. Launch the Extension Development Host:
      ``code --extensionDevelopmentPath="${workspaceFolder}"``
   3. Present the user with a test checklist using ``ask_questions``:

      * Derive items from the Change Document's REQ acceptance criteria
      * Format as a confirmation prompt with pass/fail

   4. If user confirms: proceed to commit
   5. If user rejects: go back to fix issues

   The test summary format:

   .. code-block:: text

      ## Manual Test — {Change Name}

      Extension Development Host launched. Please verify:

      - [ ] {AC from REQ_1}
      - [ ] {AC from REQ_2}
      - ...

      Confirm all items pass?


.. spec:: Test Protocol Format
   :id: SPEC_DEV_TESTPROTOCOL
   :status: implemented
   :links: REQ_DEV_TESTPROTOCOL

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
      | 1 | REQ_xxx | AC-1 | ... | PASS |
      | 2 | REQ_xxx | AC-2 | ... | FAIL |

      ## Notes

      {Optional user freeform notes from ask_questions}

   **Verify Agent integration:**
   The Verify Agent SHALL read ``docs/changes/tst-<change-name>.md`` and:

   * Check that the file exists
   * Check that the overall result is PASSED
   * Include test protocol status in the verification report


.. spec:: Verify Agent Protocol Check
   :id: SPEC_DEV_VERIFYPROTOCOL
   :status: implemented
   :links: REQ_DEV_TESTPROTOCOL

   **Description:**
   Update ``syspilot.verify.agent.md`` to include a test protocol check step.
   Before marking specs as implemented, the Verify Agent SHALL:

   1. Check if ``docs/changes/tst-<change-name>.md`` exists
   2. Read the file and verify the overall ``**Result**`` is ``PASSED``
   3. Check that no row in the test results table contains ``FAIL``
   4. Include a "Test Protocol" section in the verification report:

      * ✅ Protocol found, result: PASSED → proceed
      * ⚠️ Protocol missing → note in report, ask user to clarify
      * ❌ Protocol found, result: FAILED → stop, do not mark as implemented

   The check is placed after code verification and before updating statuses.


.. spec:: Git Workflow Section in namingconventions.rst
   :id: SPEC_DEV_CONVENTIONS
   :status: implemented
   :links: REQ_DEV_CONVENTIONS

   **Description:**
   Add a "Git Workflow" section to `docs/namingconventions.rst` covering the four
   conventions: branch naming, squash merge strategy, branch retention, and no direct
   commits to `main`.

   The section is already documented as a list-table in `namingconventions.rst`.

   .. code-block:: rst

     .. list-table:: Git Workflow
        :header-rows: 1
        :widths: 30 70

        * - Convention
          - Rule
        * - Branch naming
          - `feature/<change-name>` where name matches the Change Document filename
        * - Merge strategy
          - Squash merge into `main` — one clean commit per feature
        * - Branch retention
          - Keep locally after merge; do NOT push to origin
        * - No direct commits
          - All changes including hotfixes go through the syspilot Change process

   <!-- Implementation: SPEC_DEV_CONVENTIONS -->
   <!-- Requirements: REQ_DEV_CONVENTIONS -->
