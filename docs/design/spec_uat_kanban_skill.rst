Kanban Skill Content UAT Design Specifications
===============================================

.. spec:: Kanban Skill Content — Test Scenarios and Expected Outcomes
   :id: SPEC_UAT_KAN_SKILL
   :status: approved
   :links: REQ_UAT_KAN_SKILL

   **Description:**
   Step-by-step procedures and expected outcomes for the kanban-skill-content
   acceptance scenarios, executed in an Extension Development Host with
   ``packages/core`` + ``packages/kanban`` active, workspace
   ``testdata/test.code-workspace``.

   Module integration (compile/package/CI) is out of UAT scope.

   **Test Setup:**

   * EDH launched from ``feature/kanban-skill-content`` (stacked on
     ``feature/module-skill-provisioning``).
   * Workspace ``testdata/test.code-workspace`` open; kanban extension active.
   * Assets provisioned into workspace: ``.github/skills/jarvis-kanban.board/``
     and ``.github/instructions/jarvis-kanban.yaml.instructions.md`` (installed
     by the provisioning mechanism on activation).
   * Jarvis Output Channel open (View → Output → Jarvis).

   **Expected Outcomes:**

   .. list-table::
      :header-rows: 1
      :widths: 8 42 50

      * - Scenario
        - Action
        - Expected Result

      * - T-1

          Text field: board with declared ``text`` field validates clean

          *AC: REQ_KAN_TEXTFIELD AC-1, AC-3;
          REQ_KAN_SCHEMA AC-6*
        - Copy ``testdata/kanban/sample-with-textfield.kanban.yaml`` to
          ``testdata/.jarvis/actors/Change Manager/sample-tf.kanban.yaml``
          (it declares a ``description`` field of ``type: text`` with at
          least one item carrying a ``description`` value).

          Call ``jarvis_verifyKanbanSchema`` with
          ``boardName: "sample-tf", ownerName: "Change Manager"``.
        - Response: ``{ board: "...", errors: [], warnings: [] }``
          (or warnings only for pre-existing items — no errors from the text
          field). No activation error. Clean verification.

      * - T-2

          Text field: value renders as a labelled pair on the card

          *AC: REQ_KAN_RENDERER AC-3a; SPEC_KAN_RENDERER*
        - From T-1. Call ``jarvis_openKanbanBoard`` with the same board.
          Inspect the card that has a ``description`` value.
        - Card shows ``description: <value>`` as a labelled key-value pair
          (same position as ``priority`` or other declared field values).
          The label ``description`` is visible — not bare text as ``notes``
          appears. No undeclared-key warning for the ``description`` entry.

      * - T-3

          Backward compatibility: existing board validates and renders unchanged

          *AC: REQ_KAN_TEXTFIELD AC-5; SPEC_KAN_SCHEMA AC-8*
        - Use the original ``testdata/kanban/sample.kanban.yaml`` fixture (no
          ``type: text`` fields). Call ``jarvis_verifyKanbanSchema`` on it.
          Then open the board.
        - Verification result: ``errors: []``. Board renders with the same
          columns and cards as before this CR. No change in behavior.

      * - T-4

          Invalid: ``text`` field with ``options`` is a structural error

          *AC: REQ_KAN_TEXTFIELD AC-2; SPEC_KAN_SCHEMA AC-7*
        - Create a temporary ``bad-text-opts.kanban.yaml`` containing a field
          of ``type: text`` with an ``options`` array:

          .. code-block:: yaml

             title: Bad Board
             fields:
               - name: status
                 type: single_select
                 options:
                   - name: Open
               - name: notes_field
                 type: text
                 options:
                   - name: should-not-be-here
             items: []

          Call ``jarvis_verifyKanbanSchema`` on this file.
        - Response includes at least one structural error (``errors`` array
          non-empty) — the ``text`` field carrying ``options`` is rejected.
          Board does not render. No unexpected activation error.

      * - T-5

          Invalid: ``single_select`` without ``options`` is a structural error

          *AC: REQ_KAN_TEXTFIELD AC-2; SPEC_KAN_SCHEMA AC-7*
        - Create a temporary ``bad-ss-no-opts.kanban.yaml``:

          .. code-block:: yaml

             title: Bad Board
             fields:
               - name: status
                 type: single_select
             items: []

          Call ``jarvis_verifyKanbanSchema`` on this file.
        - Response includes at least one structural error — ``single_select``
          without ``options`` is rejected.

      * - T-6

          Invalid: ``status`` field of ``type: text`` is a semantic error

          *AC: REQ_KAN_TEXTFIELD AC-4; SPEC_KAN_VERIFY*
        - Create a temporary ``bad-text-status.kanban.yaml``:

          .. code-block:: yaml

             title: Bad Board
             fields:
               - name: status
                 type: text
             items: []

          Call ``jarvis_verifyKanbanSchema`` on this file.
        - Response includes a semantic error naming ``status`` must be
          ``single_select`` (in the ``errors`` array). Not merely a warning.

      * - T-7

          Undeclared item key: warning, not error

          *AC: REQ_KAN_SKILLCONTENT AC-3; SPEC_KAN_VERIFY*
        - Create a temporary ``undeclared-key.kanban.yaml``:

          .. code-block:: yaml

             title: Test Board
             fields:
               - name: status
                 type: single_select
                 options:
                   - name: Open
             items:
               - id: 1
                 name: An item
                 status: Open
                 silentTrap: this key is not declared

          Call ``jarvis_verifyKanbanSchema`` on this file.
        - Response: ``errors: []`` (the file is structurally and semantically
          valid). ``warnings`` array contains an entry about
          ``silentTrap`` not being defined in ``fields[]``. The board
          renders without showing the ``silentTrap`` value.

      * - T-8

          Instructions ``applyTo``: applies to ``kanban.yaml`` filename

          *AC: REQ_KAN_INSTRUCTIONS AC-6; SPEC_KAN_INSTRUCTIONS AC-1*
        - Open one of the standard ``kanban.yaml`` board files in the VS Code
          text editor (e.g.
          ``testdata/.jarvis/actors/Change Manager/kanban.yaml``).
          Open the Copilot panel or check active instructions context for the
          editor.
        - The ``jarvis-kanban.yaml.instructions.md`` instructions file is
          shown as active for this editor. (Previously the glob
          ``**/*.kanban.yaml`` missed ``kanban.yaml``; the fixed glob
          ``**/{kanban.yaml,*.kanban.yaml}`` must match it.)

      * - T-9

          Instructions content: ``name`` not ``title``; ``nextId`` optional

          *AC: REQ_KAN_INSTRUCTIONS AC-1, AC-2; SPEC_KAN_INSTRUCTIONS AC-2*
        - Open ``.github/instructions/jarvis-kanban.yaml.instructions.md``
          in the text editor.
        - File states the item's title-like property is ``name``, not
          ``title``. File states ``nextId`` is optional (not required).
          Neither of the two pilot errors (``title``, required ``nextId``)
          is present. ``applyTo`` frontmatter is
          ``"**/{kanban.yaml,*.kanban.yaml}"``.

      * - T-10

          Skill sections: all required sections present

          *AC: REQ_KAN_SKILLCONTENT AC-1..AC-6;
          SPEC_KAN_SKILLCONTENT AC-1*
        - Open ``.github/skills/jarvis-kanban.board/SKILL.md`` in the
          text editor.
        - All eight sections are present: **Tools**, **Owner Resolution**,
          **Board Anatomy**, **Field Types**, **Item Properties**,
          **Pitfalls**, **Example**, **Workflow**. Each section is
          non-empty.

      * - T-11

          Skill: Owner Resolution says omit, not pre-resolve

          *AC: REQ_KAN_SKILLCONTENT AC-4;
          SPEC_KAN_SKILLCONTENT AC-3*
        - Open skill; read the **Owner Resolution** section.
        - Section says: omit ``ownerName`` to address the calling actor's
          own board. Section does **not** instruct the reader to call
          ``jarvis_whoAmI`` first and pass the result. The anti-pattern
          (calling ``jarvis_whoAmI`` then passing the name) is either
          absent or explicitly warned against.

      * - T-12

          Skill: Pitfalls names the undeclared-key silent-failure trap

          *AC: REQ_KAN_SKILLCONTENT AC-3;
          SPEC_KAN_SKILLCONTENT AC-4*
        - Open skill; read the **Pitfalls** section.
        - Section contains an entry for the "undeclared item key" trap.
          The entry states the observable symptom: the board renders, the
          verification looks clean, and the value is simply absent from
          the rendered card. The word "warning" (vs "error") is present.
