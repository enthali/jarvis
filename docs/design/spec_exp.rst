Explorer Design Specifications
===============================

.. spec:: Extension Manifest & Activation
   :id: SPEC_EXP_EXTENSION
   :status: implemented
   :links: REQ_EXP_ACTIVITYBAR

   **Description:**
   The extension is scaffolded as a standard VS Code TypeScript extension.

   **Manifest (package.json):**

   * ``name``: ``jarvis``
   * ``displayName``: ``Jarvis``
   * ``activationEvents``: ``onView:jarvisProjects``, ``onView:jarvisEvents``
   * ``contributes.viewsContainers.activitybar``: One entry with id ``jarvis-explorer``,
     title ``Jarvis``, and a custom icon (``resources/jarvis.svg``)
   * ``contributes.views.jarvis-explorer``: Two views — ``jarvisProjects`` (title "Projects")
     and ``jarvisEvents`` (title "Events")

   **Activation:**
   The extension activates lazily when either tree view becomes visible.
   The ``activate()`` function registers both TreeDataProviders.

   **Project structure:**

   .. code-block:: text

      src/
        extension.ts          — activate/deactivate entry point
        projectTreeProvider.ts — TreeDataProvider for projects
        eventTreeProvider.ts   — TreeDataProvider for events
      resources/
        jarvis.svg            — Activity Bar icon
      package.json
      tsconfig.json


.. spec:: Tree Data Providers
   :id: SPEC_EXP_PROVIDER
   :status: implemented
   :links: REQ_EXP_TREEVIEW, REQ_EXP_DUMMYDATA

   **Description:**
   Two classes implement ``vscode.TreeDataProvider<TreeItem>``:

   * ``ProjectTreeProvider`` — returns hardcoded project items
   * ``EventTreeProvider`` — returns hardcoded event items

   Both providers follow the same pattern:

   * ``getTreeItem(element)``: Returns the element directly (it is already a TreeItem)
   * ``getChildren(element)``: If no parent, returns the list of root-level items.
     Items are leaf nodes (no children).

   **TreeItem properties:**

   * ``label``: The item name (e.g. "Project: Auto Strategy")
   * ``collapsibleState``: ``None`` (leaf items)
   * ``contextValue``: ``"project"`` or ``"event"`` (for future context menus)

   **Dummy data:**

   Projects:

   * "Project: Auto Strategy"
   * "Project: Cloud Migration"
   * "Project: Partner Portal"

   Events:

   * "Event: embedded world"
   * "Event: CES 2027"


.. spec:: Launch Configuration File
   :id: SPEC_EXP_LAUNCHCONFIG
   :status: approved
   :links: REQ_EXP_LAUNCHCONFIG

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
   :id: SPEC_EXP_IMPLTEST
   :status: approved
   :links: REQ_EXP_TESTSUMMARY

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
   :id: SPEC_EXP_TESTPROTOCOL
   :status: approved
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
      | 1 | REQ_xxx | AC-1 | ... | PASS |
      | 2 | REQ_xxx | AC-2 | ... | FAIL |

      ## Notes

      {Optional user freeform notes from ask_questions}

   **Verify Agent integration:**
   The Verify Agent SHALL read ``docs/changes/tst-<change-name>.md`` and:

   * Check that the file exists
   * Check that the overall result is PASSED
   * Include test protocol status in the verification report
