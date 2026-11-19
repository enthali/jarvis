Naming Conventions
==================

Overview
--------

Jarvis is a single-project repository. Unlike multi-family setups (e.g., the syspilot framework itself),
we do **not** use a family prefix. IDs are shorter and more readable.

ID Format
---------

.. code-block:: text

   <TYPE>_<THEME>_<SHORT_SLUG>

- **TYPE**: The specification level (``US``, ``REQ``, ``SPEC``)
- **THEME**: Abbreviated domain or component (2–5 chars, uppercase)
- **SHORT_SLUG**: Descriptive name in 2–4 words, UPPERCASE, underscores

Examples:

- ``US_EXP_SIDEBAR`` — User Story, Explorer theme, Sidebar feature
- ``REQ_EXP_TREEVIEW`` — Requirement, Explorer theme, TreeView
- ``SPEC_EXP_PROVIDER`` — Design Spec, Explorer theme, Provider

Theme Abbreviations
-------------------

.. list-table::
   :header-rows: 1
   :widths: 15 40 45

   * - Theme
     - Domain
     - Examples
   * - ``EXP``
     - Explorer / Sidebar UI
     - ``US_EXP_SIDEBAR``, ``REQ_EXP_TREEVIEW``
   * - ``DEV``
     - Developer Tooling (testing, agents, CI config)
     - ``US_DEV_MANUALTEST``, ``REQ_DEV_LAUNCHCONFIG``
   * - ``CFG``
     - Configuration / Settings
     - ``US_CFG_FOLDERS``, ``REQ_CFG_PATHS``
   * - ``ACTOR``
     - Actor, the only kind of persistent participant (``context.md``
       memory, message addressability, loose session binding)
     - ``US_ACTOR_ACTORS``, ``REQ_ACTOR_TREE``, ``SPEC_ACTOR_SCANNER``
   * - ``REL``
     - Release & CI/CD
     - ``US_REL_PUBLISH``, ``REQ_REL_VSIX``
   * - ``OLK``
     - Outlook Integration (COM Bridge, Outlook-specific provider)
     - ``US_OLK_COMBRIDGE``, ``REQ_OLK_COMBRIDGE``
   * - ``PIM``
     - Personal Information Management (generic category layer, provider interface, cache, service, tool, tree view)
     - ``US_PIM_CATEGORIES``, ``REQ_PIM_PROVIDER``, ``SPEC_PIM_SERVICE``
   * - ``MOD``
     - Modular delivery (core/add-on split, packaging, install combinations)
     - ``US_MOD_INSTALL``, ``REQ_MOD_ZEROTRACE``, ``SPEC_MOD_MONOREPO``
   * - ``ENG``
     - Engine contract (core API for add-ons: tool injection, tool registry,
       Actor list; **plumbing, not user-facing — no US level**)
     - ``REQ_ENG_CONTRACT``, ``SPEC_ENG_API``
   * - ``FLOW``
     - Message Flow Visualization (separate add-on module, D3 chord diagram of
       inter-agent message flow, Webview Panel editor tab)
     - ``US_FLOW_CHORDVIEW``, ``REQ_FLOW_WEBVIEWPANEL``, ``SPEC_FLOW_CHORDRENDER``
   * - ``AC``
     - Acceptance Criteria (type ``ac``): ``AC_<AREA>_<NAME>``, where the area is the
       theme of the story the criterion validates; ``MOD_`` modules and ``ROOT_JARVIS``
       form the product structure
     - ``AC_ACTOR_PHASE1_MEMORY``, ``MOD_PIM``

New themes can be added as the project grows. Keep them short (2–5 chars) and consistent.

Slug Guidelines
---------------

1. Keep slugs short: 2–4 words maximum
2. Be specific: ``TREEVIEW`` not ``THE_VIEW_COMPONENT``
3. Use domain language: terms a VS Code extension developer would recognize
4. ALL CAPS: ``US_EXP_SIDEBAR`` not ``us_exp_sidebar``
5. Underscores only: no hyphens, no dots

File Naming
-----------

.. list-table::
   :header-rows: 1
   :widths: 30 40 30

   * - Location
     - Content
     - Pattern
   * - ``docs/userstories/``
     - User Stories by theme
     - ``us_<theme>.rst``
   * - ``docs/requirements/``
     - Requirements by theme
     - ``req_<theme>.rst``
   * - ``docs/design/``
     - Design Specs by theme
     - ``spec_<theme>.rst``
   * - ``docs/acceptance/``
     - Acceptance Criteria by feature
     - ``ac_<feature>.rst``
   * - ``docs/product/``
     - Root and modules
     - ``index.rst``
   * - ``docs/changes/``
     - Change Documents
     - ``<short-name>.md``

Personas
--------

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - Persona
     - Description
   * - **Jarvis User**
     - End user of the Jarvis extension — manages Actors in VS Code
   * - **Jarvis Developer**
     - Maintainer of the Jarvis extension — builds, tests, releases, and documents the extension
   * - **Jarvis Test Engineer**
     - Tests and validates Jarvis extension features using defined test datasets

Git Workflow
------------

.. Implementation: SPEC_DEV_CONVENTIONS
.. Requirements: REQ_DEV_CONVENTIONS

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Convention
     - Rule
   * - **Branch naming**
     - ``feature/<change-name>`` — must match Change Document filename (without ``.md``)
   * - **Merge strategy**
     - Squash merge into ``main``: ``git merge --squash feature/<name>`` followed by one clean commit
   * - **Branch retention**
     - Keep branches locally after merge; do **not** push to origin after squash merge
   * - **No direct commits**
     - All changes including hotfixes go through the Change process — no commits directly on ``main``
