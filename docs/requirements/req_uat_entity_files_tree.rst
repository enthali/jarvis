Entity File Children UAT Requirements
=======================================

.. req:: Entity File Children — Test Data and Verification Requirements
   :id: REQ_UAT_ENTITY_FILES_TREE
   :status: draft
   :priority: required
   :links: US_UAT_ENTITY_FILES_TREE; REQ_ENT_ENTITY_FILE_CHILDREN

   **Description:**
   Specifies the test data, workspace state, and per-AC verification criteria
   required to manually validate the Agent/Files category layer and recursive
   folder listing in the Extension Development Host.

   **(actor-owned-files-tree CR):** rewritten from the fixed-3-file-list test
   plan to the category-layer, recursive-folder-scan test plan.

   **Test Data Requirements:**

   * Open ``testdata/test.code-workspace`` in the Extension Development Host (F5).
   * ``jarvis.projects.enabled``, ``jarvis.events.enabled``, and
     ``jarvis.sessions.enabled`` must all be ``true`` (defaults).
   * Pre-existing project test data:

     - ``testdata/projects/alpha/project.yaml`` — ``agent: syspilot.cm``,
       ``context.md`` present. Add at least one extra file (e.g. ``notes.txt``)
       and one subfolder containing at least one file (e.g. ``drafts/idea.md``)
       to exercise recursive listing and mixed-file-type behavior.
     - ``testdata/projects/legacy-no-agent/project.yaml`` — no ``agent``
       field, ``context.md`` present.

   * Pre-existing event test data:

     - ``testdata/events/2026-06-15_DevCon 2026/event.yaml`` —
       ``agent: syspilot.cm``, ``context.md`` present.

   * Pre-existing session test data:

     - ``testdata/.jarvis/sessions/copilot-cm/session.yaml`` —
       ``agent: syspilot.cm``, ``context.md`` present.

   * ``.github/agents/syspilot.cm.agent.md`` must exist in the workspace root
     for the fail-open scenario (T-10) to be reproduced by **temporarily
     renaming** it after the "Agent" category has already been expanded once
     (so the module-level ``discoverAgentModes()`` cache has already
     resolved it), then restoring it after the test.
   * A hidden file (e.g. ``.jarvisnotes``) added to ``alpha``'s folder, to
     verify hidden-entry inclusion (T-5).

   **Acceptance Criteria:**

   * AC-1 (leaf nodes expandable, category nodes shown):
     For T-1, T-2, T-3, the tester SHALL expand ``alpha`` (Projects),
     ``copilot-cm`` (Sessions), and ``DevCon 2026`` (Events) and verify each
     shows an "Agent" category node followed by a "Files" category node.

   * AC-2 (no agent → no Agent category):
     For T-4, the tester SHALL expand ``legacy-no-agent`` and verify only
     the "Files" category node appears — no "Agent" category node at all.

   * AC-3 (recursive Files listing, alphabetical, hidden included):
     For T-5, the tester SHALL expand "Files" under ``alpha`` and verify
     every file and subfolder actually present (``context.md``,
     ``project.yaml``, ``notes.txt``, ``drafts/``, ``.jarvisnotes``) appears,
     in one alphabetically sorted list (not folders-first).
     For T-6, the tester SHALL expand the ``drafts`` subfolder and verify
     ``idea.md`` appears, using the same listing rule.

   * AC-4 (``.md`` files → Markdown Preview):
     For T-7, the tester SHALL click ``context.md`` and, separately, the
     "Agent" category's ``Agent File: syspilot.cm.agent.md`` child, and
     verify both open as rendered Markdown Preview (not the raw text
     editor).

   * AC-5 (non-``.md`` files → preview-mode tab):
     For T-8, the tester SHALL click ``project.yaml`` (or ``notes.txt``) and
     verify it opens in a preview-mode tab (italicized title) that is reused
     on a second single-click of a different non-``.md`` file, and becomes
     pinned (non-italicized) after a double-click or an edit.

   * AC-6 (tooltip shows full path):
     For T-9, the tester SHALL hover over a file child and a folder child
     (``drafts``) and verify the tooltip text is the full absolute
     filesystem path using forward slashes in both cases.

   * AC-7 (fail-open on Agent category with stale cache):
     For T-10, the tester SHALL first expand "Agent" on ``alpha`` (so the
     cache resolves the file), then rename
     ``.github/agents/syspilot.cm.agent.md`` to simulate later removal,
     collapse and re-expand the entity node (NOT reload the extension, to
     keep the cache stale as designed), verify the "Agent" category still
     appears, click its child, and verify a warning notification appears
     (e.g. "Jarvis: Cannot open file: ..."), no exception is thrown in the
     Output Channel, and no file is created at the expected path. The
     tester SHALL restore the renamed file after the test.

   * AC-8 (no regression to inline icons / click-to-chat):
     For T-11, the tester SHALL verify that ``alpha``, ``copilot-cm``, and
     ``DevCon 2026`` still show their existing inline icons
     (``$(go-to-file)``, ``$(notebook)``) and that clicking the entity node
     label itself (not the expand arrow) still opens the agent chat as
     before.

   * AC-9 (tree reflects added/removed files after rescan):
     For T-12, the tester SHALL add a new file to ``alpha``'s folder outside
     VS Code (or via a terminal), invoke "Jarvis: Rescan" (or wait for the
     scan interval to elapse), collapse and re-expand "Files" on ``alpha``,
     and verify the new file appears — without reloading the extension.

   * AC-10 (Copy Path / Copy Full Path unchanged):
     For T-13, the tester SHALL right-click a file child in "Files" and
     verify "Copy Path" and "Copy Full Path" both work exactly as they did
     before this CR (folder path vs. full file path respectively).

   * AC-11 (folder child Copy Path + context-menu isolation):
     For T-14, the tester SHALL right-click the ``drafts`` folder child
     under "Files" on ``alpha`` and verify:

     a. "Copy Path" yields the folder's own absolute path
        (``.../testdata/projects/alpha/drafts``); "Copy Full Path" yields
        the same absolute path (folder semantics — no filename appended).
     b. Entity-specific context-menu actions (e.g. "Open Agent Session",
        any inline action registered for ``viewItem == jarvisProject`` or
        ``viewItem == jarvisSession``) are **absent** from the right-click
        menu for the folder child. The same check SHALL be repeated on a
        plain file child (e.g. ``project.yaml``) to confirm isolation
        applies uniformly. Only generic items (Copy Path, Copy Full Path,
        Reveal in Explorer) shall appear — the contextValues
        ``jarvisEntityFile`` and ``jarvisEntityFileFolder`` must not match
        entity-node when-clauses.
