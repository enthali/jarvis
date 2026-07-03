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
   * - ``PRJ``
     - Project entity kind (single-kind: project-specific US/REQ/SPEC)
     - ``US_PRJ_PROJECTFILTER``, ``REQ_PRJ_LISTPROJECTS``
   * - ``EVT``
     - Event entity kind (single-kind: event-specific US/REQ/SPEC, date sorting)
     - ``US_EVT_DATESORT``, ``REQ_EVT_DATESORT``
   * - ``ACT``
     - Actor entity kind (single-kind: Hewitt actor model, ex-"Session" — persistent
       agent-bound context; mailbox=queue, state=context.md,
       heartbeat=activator+supervisor; "Session" retired as a Jarvis concept,
       reserved for platform VS Code/Copilot chat sessions)
     - ``US_ACT_ACTORS``, ``REQ_ACT_SCHEMA``, ``SPEC_ACT_TREE``
   * - ``ENT``
     - Jarvis Entity (generic, user-facing, cross-kind concepts that apply to
       ≥ 2 of Project/Event/Actor — has a US level, unlike ENG)
     - ``US_ENT_ENTITY``, ``REQ_ENT_TREECLICK``, ``SPEC_ENT_AGENT_PICKER``
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
     - Engine contract (kind-agnostic core API: kind registration, tool injection,
       generic scanner & tree; **plumbing, not user-facing — no US level**)
     - ``REQ_ENG_CONTRACT``, ``SPEC_ENG_API``
   * - ``HOOK``
     - Hook Engine (agent lifecycle hook intake, dispatch foundation in jarvis-core)
     - ``US_HOOK_OBSERVE``, ``REQ_HOOK_INTAKE``, ``SPEC_HOOK_PROXY``
   * - ``FLOW``
     - Message Flow Visualization (separate add-on module, D3 chord diagram of
       inter-agent message flow, Webview Panel editor tab)
     - ``US_FLOW_CHORDVIEW``, ``REQ_FLOW_WEBVIEWPANEL``, ``SPEC_FLOW_CHORDRENDER``
   * - ``UAT``
     - User Acceptance Tests
     - ``US_UAT_SAMPLEDATA``, ``REQ_UAT_VALID_SAMPLES``

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
     - End user of the Jarvis extension — manages projects and events in VS Code
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
