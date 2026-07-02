Entity Tree Context Menu User Acceptance Tests
================================================

.. story:: Entity Tree Context Menu Acceptance Tests
   :id: US_UAT_ENTITY_CONTEXTMENU
   :status: draft
   :priority: optional
   :links: US_ENT_ENTITYPARITY; US_ENT_ENTITY_FILES_TREE; US_ENT_OPENCONTEXT

   **As a** Jarvis Test Engineer running in the Extension Development Host,
   **I want** a set of manual acceptance test scenarios for the new
   right-click context menu (Open / Copy Path / Copy Full Path) on
   file-child nodes and on Project/Event/Actor entity root nodes,
   **so that** I can verify the menu appears with the correct entries for
   both node kinds, that Open behaves identically to left-click, that Copy
   Path and Copy Full Path produce the correct absolute OS paths (folder-only
   vs. including filename), and that folder (grouping) nodes and the Command
   Palette are correctly excluded.

   **Acceptance Criteria:**

   * AC-1: A test verifies that right-clicking a file-child node
     (``context.md``/YAML/agent file) shows exactly 3 entries: Open, Copy
     Path, Copy Full Path (maps to REQ_ENT_ENTITY_CONTEXTMENU AC-1/AC-6 /
     T-1).
   * AC-2: A test verifies that clicking Open on a file-child node opens the
     file identically to left-clicking the node (maps to
     REQ_ENT_ENTITY_CONTEXTMENU AC-1 / T-2).
   * AC-3: A test verifies that Copy Path on a file-child node copies the
     absolute OS path of the containing folder (no filename) to the
     clipboard (maps to REQ_ENT_ENTITY_CONTEXTMENU AC-3/AC-5 / T-3).
   * AC-4: A test verifies that Copy Full Path on a file-child node copies
     the absolute OS path including the filename to the clipboard (maps to
     REQ_ENT_ENTITY_CONTEXTMENU AC-4/AC-5 / T-4).
   * AC-5: A test verifies that right-clicking each of the 3 entity root
     kinds (Project, Event, Actor) shows the same 3 entries (maps to
     REQ_ENT_ENTITY_CONTEXTMENU AC-2/AC-6 / T-5).
   * AC-6: A test verifies that clicking Open on an entity root node opens
     the agent chat identically to left-clicking the node (maps to
     REQ_ENT_ENTITY_CONTEXTMENU AC-2 / T-6).
   * AC-7: A test verifies that Copy Path on an entity root node copies the
     entity's own folder path to the clipboard (maps to
     REQ_ENT_ENTITY_CONTEXTMENU AC-3/AC-5 / T-7).
   * AC-8: A test verifies that Copy Full Path on an entity root node
     resolves to the identical value as Copy Path (no filename exists at
     root level), and that both entries remain visible rather than one
     being conditionally hidden (maps to REQ_ENT_ENTITY_CONTEXTMENU AC-4 /
     T-8).
   * AC-9: A test verifies that folder (grouping) nodes show none of these
     3 entries on right-click (maps to REQ_ENT_ENTITY_CONTEXTMENU AC-7 /
     T-9).
   * AC-10: A test verifies that Copy Path and Copy Full Path do not appear
     in the Command Palette (maps to REQ_ENT_ENTITY_CONTEXTMENU AC-8 /
     T-10).

   **Test Scenarios (summary):**

   * T-1: Right-click a file-child node → menu shows Open, Copy Path, Copy
     Full Path (with a visual separator between Open and the Copy
     entries).
   * T-2: Click Open on a file-child node → file opens, identical to
     left-click.
   * T-3: Click Copy Path on a file-child node → clipboard contains the
     containing folder's absolute path (no filename).
   * T-4: Click Copy Full Path on a file-child node → clipboard contains
     the file's absolute path including filename.
   * T-5: Right-click each of Project/Event/Actor root nodes → menu shows
     the same 3 entries for all 3 kinds.
   * T-6: Click Open on an entity root node → agent chat opens, identical
     to left-click.
   * T-7: Click Copy Path on an entity root node → clipboard contains the
     entity's folder path.
   * T-8: Click Copy Full Path on an entity root node → clipboard contains
     the identical value as T-7; both entries remain visible.
   * T-9: Right-click a folder (grouping) node → none of the 3 entries
     appear.
   * T-10: Open Command Palette → "Copy Path" / "Copy Full Path" do not
     appear.
