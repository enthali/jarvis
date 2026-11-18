Kanban Skill and Text Field Acceptance Criteria
===============================================

The kanban skill and instructions and the ``text`` field type of the Kanban
module, executed by the User in an Extension Development Host with
``packages/core`` and ``packages/kanban`` active and the workspace
``testdata/test.code-workspace`` open. The module has provisioned
``.github/skills/jarvis-kanban.board/SKILL.md`` and
``.github/instructions/jarvis-kanban.yaml.instructions.md`` into the workspace.
Board files are placed in ``testdata/.jarvis/actors/Change Manager/``; every
kanban tool call passes the ``ownerName`` of the Actor.

.. ac:: An Actor authors a valid board from the skill alone, explains an undeclared key, and a text field renders
   :id: AC_KAN_SKILL_AUTHOR_JOURNEY
   :status: approved
   :validates: US_KAN_SKILL; US_KAN_TEXTFIELD

   **Given** an Actor ``Change Manager`` with an open chat in the workspace with the
   provisioned skill and instructions, and no mention of ``kanban.schema.json`` in
   any request; ``testdata/kanban/sample-with-textfield.kanban.yaml`` copied to
   ``sample-tf.kanban.yaml`` (it declares a ``description`` field of
   ``type: text`` and has an item with a ``description`` value), and
   ``testdata/kanban/sample.kanban.yaml`` (no text field) copied to ``kanban.yaml``,
   both in ``testdata/.jarvis/actors/Change Manager/``

   1. **When** the tester asks the Actor to create a board named ``release`` with a
      ``priority`` single_select field, a ``blocker`` text field and three items
      that use them, and to verify it
      **Then** the verification of ``release`` shows no errors and no warnings, the
      opened board shows every value of the three items on its cards, and the
      Actor did not open ``kanban.schema.json`` and did not call ``jarvis_whoAmI``
      to find its ``ownerName``.

   2. **When** the tester adds the key ``silentTrap`` (no entry of ``fields``
      declares it) to item 1 of the ``release`` board in the text editor, and asks
      the Actor to verify the board and to explain why the value of ``silentTrap``
      does not appear on the card
      **Then** the verification reports no error and one warning naming
      ``silentTrap``, the card shows no ``silentTrap`` value, and the Actor explains
      that the key is not declared in ``fields`` and is therefore not rendered.

   3. **When** the tester verifies and opens the boards ``sample-tf`` and the one
      from ``kanban.yaml``
      **Then** the board ``sample-tf`` verifies without errors and its card shows
      ``description: <value>`` as a labelled pair like the other declared fields,
      and the board from ``sample.kanban.yaml`` verifies without errors and shows
      the same columns and cards as before.

.. ac:: The kanban instructions apply to both board filename conventions
   :id: AC_KAN_SKILL_INSTRUCTIONS_ACTIVE
   :status: approved
   :validates: US_KAN_SKILL

   **Given** the boards ``kanban.yaml`` and ``sample-tf.kanban.yaml`` in
   ``testdata/.jarvis/actors/Change Manager/``
   **When** the tester opens each file in the text editor and looks at the
   instructions that Copilot lists as applied for the editor
   **Then** ``jarvis-kanban.yaml.instructions.md`` is listed for both files.
