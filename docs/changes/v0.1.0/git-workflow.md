# Change Document: git-workflow

**Status**: approved
**Branch**: feature/git-workflow
**Created**: 2026-04-01
**Author**: Change Agent

---

## Summary

Define the Git branch and merge workflow for Jarvis: feature branches per change,
squash merge to main, branches kept locally but not pushed after release, and all
changes (including hotfixes) going through the syspilot Change process.

---

## Level 0: User Stories

**Status**: ✅ approved

### New User Stories

#### US_REL_GITWORKFLOW: Git Branch & Merge Workflow

```rst
.. story:: Git Branch & Merge Workflow
   :id: US_REL_GITWORKFLOW
   :status: draft
   :priority: mandatory

   **As a** Jarvis developer,
   **I want** a defined Git workflow for feature branches and merging to main,
   **so that** the main branch stays clean with one commit per feature and the
   release process is reproducible.

   **Acceptance Criteria:**

   * AC-1: Feature branches follow the naming convention ``feature/<change-name>``
   * AC-2: Feature branches are merged into ``main`` via squash merge (one commit per feature)
   * AC-3: Feature branches are kept locally after merge but NOT pushed to origin
   * AC-4: All changes including hotfixes go through the syspilot Change process — no direct commits to ``main``
   * AC-5: The Release Agent documents and follows the merge strategy
```

#### US_DEV_CONVENTIONS: Developer Conventions Documentation

```rst
.. story:: Developer Conventions Documentation
   :id: US_DEV_CONVENTIONS
   :status: draft
   :priority: mandatory

   **As a** Jarvis developer,
   **I want** all project conventions (naming, Git workflow) documented in one place,
   **so that** I can quickly look up the rules without searching across multiple files.

   **Acceptance Criteria:**

   * AC-1: ``docs/namingconventions.rst`` contains a Git Workflow section
   * AC-2: The Git Workflow section covers branch naming, merge strategy, retention, and no-hotfix rule
   * AC-3: The Release Agent and copilot-instructions reference ``namingconventions.rst`` as the single source of truth
```

### Decisions

- Branches kept locally for history, not pushed to origin after merge
- No exceptions to Change process — hotfixes also go through Change → Implement → Verify
- `initial-setup` branch is syspilot-internal, no action needed here
- **New finding**: Git conventions belong in `namingconventions.rst` (DEV theme), referenced by release specs

### Horizontal Check (MECE)

- ✅ US_REL_GITWORKFLOW: release-process concern (when/how to merge)
- ✅ US_DEV_CONVENTIONS: developer-tooling concern (where conventions are documented)
- ✅ No overlap — process vs. documentation are distinct
- ✅ No contradictions with existing US_REL_* or US_DEV_MANUALTEST

---

## Level 1: Requirements

**Status**: ✅ approved

### New Requirements

#### REQ_REL_BRANCHNAMING: Branch Naming Convention

```rst
.. req:: Branch Naming Convention
   :id: REQ_REL_BRANCHNAMING
   :status: draft
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   Every change SHALL be developed on a dedicated feature branch named
   ``feature/<change-name>``, where ``<change-name>`` matches the Change Document name.
   The convention SHALL be documented in ``docs/namingconventions.rst``.

   **Acceptance Criteria:**

   * AC-1: Every Change Document has a corresponding ``feature/<change-name>`` branch
   * AC-2: Branch name matches the Change Document filename (without ``.md``)
```

#### REQ_REL_AGENTPOLICY: Release Agent Merge Policy

```rst
.. req:: Release Agent Merge Policy
   :id: REQ_REL_AGENTPOLICY
   :status: draft
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   The Release Agent SHALL document and enforce the merge strategy.
   Feature branches SHALL be merged into ``main`` via squash merge,
   producing one clean commit per feature on ``main``.

   **Acceptance Criteria:**

   * AC-1: The Release Agent's Release Decisions table contains the merge strategy
   * AC-2: Merge to ``main`` uses ``git merge --squash feature/<name>``
   * AC-3: The squash commit message on ``main`` summarizes the change
```

#### REQ_REL_BRANCHRETENTION: Branch Retention Policy

```rst
.. req:: Branch Retention Policy
   :id: REQ_REL_BRANCHRETENTION
   :status: draft
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   Feature branches SHALL be kept locally after merge for history and traceability.
   They SHALL NOT be pushed to origin after the squash merge is complete.

   **Acceptance Criteria:**

   * AC-1: Feature branches are not pushed to origin after being merged to ``main``
   * AC-2: Feature branches remain available locally for reference
```

#### REQ_REL_NOHOTFIX: No Direct Commits to main

```rst
.. req:: No Direct Commits to main
   :id: REQ_REL_NOHOTFIX
   :status: draft
   :priority: mandatory
   :links: US_REL_GITWORKFLOW

   **Description:**
   All changes to the codebase, including hotfixes, SHALL go through the
   syspilot Change process (Change → Implement → Verify) on a feature branch.
   Direct commits to ``main`` are not permitted except for the squash merge commit itself.

   **Acceptance Criteria:**

   * AC-1: No commits are made directly on ``main`` outside of squash merges
   * AC-2: Hotfixes start a Change Document and feature branch like any other change
```

#### REQ_DEV_CONVENTIONS: Developer Conventions Documentation

```rst
.. req:: Developer Conventions Documentation
   :id: REQ_DEV_CONVENTIONS
   :status: draft
   :priority: mandatory
   :links: US_DEV_CONVENTIONS

   **Description:**
   All project conventions SHALL be documented in ``docs/namingconventions.rst``
   as the single source of truth. This includes ID naming and Git workflow rules.

   **Acceptance Criteria:**

   * AC-1: ``docs/namingconventions.rst`` contains a "Git Workflow" section
   * AC-2: The Git Workflow section covers: branch naming, squash merge, retention, no direct commits
   * AC-3: ``copilot-instructions.md`` and the Release Agent reference ``namingconventions.rst``
```

### Decisions

- REQ_REL_AGENTPOLICY covers both AC-2 (squash merge) and AC-5 (agent documents policy)
- REQ_DEV_CONVENTIONS makes `namingconventions.rst` the single source of truth — REQ_REL_BRANCHNAMING references it rather than duplicating
- 5 REQs total: 4 REL + 1 DEV

### Horizontal Check (MECE)

- ✅ No overlap: naming, policy, retention, no-hotfix, conventions-doc are distinct concerns
- ✅ All 5 ACs from US_REL_GITWORKFLOW covered
- ✅ US_DEV_CONVENTIONS AC-1/2/3 fully covered by REQ_DEV_CONVENTIONS
- ✅ No contradictions with existing REL or DEV requirements

---

## Level 2: Design

**Status**: ✅ approved

### New Design Elements

#### SPEC_DEV_CONVENTIONS: Git Workflow Section in namingconventions.rst

```rst
.. spec:: Git Workflow Section in namingconventions.rst
   :id: SPEC_DEV_CONVENTIONS
   :status: draft
   :links: REQ_DEV_CONVENTIONS

   **Description:**
   Add a "Git Workflow" section to ``docs/namingconventions.rst`` as the single
   source of truth for all Git conventions:

   .. code-block:: rst

      Git Workflow
      ------------

      * **Branch naming**: ``feature/<change-name>`` — must match Change Document filename
      * **Merge strategy**: Squash merge into ``main`` (``git merge --squash feature/<name>``)
      * **Branch retention**: Keep branches locally; do NOT push to origin after merge
      * **No direct commits**: All changes (including hotfixes) go through the Change process
```

#### SPEC_REL_BRANCHNAMING: Branch Convention Reference in copilot-instructions

```rst
.. spec:: Branch Convention Reference in copilot-instructions
   :id: SPEC_REL_BRANCHNAMING
   :status: draft
   :links: REQ_REL_BRANCHNAMING

   **Description:**
   Add a "Git Workflow" section to ``copilot-instructions.md`` that references
   ``namingconventions.rst`` and summarises the branch naming rule:

   .. code-block:: markdown

      ## Git Workflow

      Each change lives on ``feature/<change-name>`` (matches Change Document name).
      See ``docs/namingconventions.rst`` for full conventions.
```

#### SPEC_REL_AGENTPOLICY: Squash Merge Workflow Step in Release Agent

```rst
.. spec:: Squash Merge Workflow Step in Release Agent
   :id: SPEC_REL_AGENTPOLICY
   :status: implemented
   :links: REQ_REL_AGENTPOLICY

   **Description:**
   The Release Agent Decisions table SHALL contain the merge strategy entry
   (already present). Add an explicit "Merge to main" workflow section:

   .. code-block:: markdown

      ## Merge to main

      git merge --squash feature/<change-name>
      git commit -m "feat: <change-name> — <one-line summary>"

   Note: ``merge strategy: squash merge`` already exists in Release Decisions table.
   Status set to ``implemented`` as this was committed retroactively.
```

#### SPEC_REL_BRANCHRETENTION: No-Push Rule in Release Agent

```rst
.. spec:: No-Push Rule in Release Agent
   :id: SPEC_REL_BRANCHRETENTION
   :status: draft
   :links: REQ_REL_BRANCHRETENTION

   **Description:**
   Add a note to the Release Agent workflow after the squash merge step:

   .. code-block:: markdown

      > ⚠️ Do NOT push feature branches to origin after merging.
      > Keep them locally for traceability.
```

#### SPEC_REL_NOHOTFIX: No-Hotfix Rule in copilot-instructions

```rst
.. spec:: No-Hotfix Rule in copilot-instructions
   :id: SPEC_REL_NOHOTFIX
   :status: draft
   :links: REQ_REL_NOHOTFIX

   **Description:**
   Add to the "Git Workflow" section in ``copilot-instructions.md``:

   .. code-block:: markdown

      All changes including hotfixes go through the Change process.
      No direct commits to ``main``.
```

### Decisions

- SPEC_REL_AGENTPOLICY: `merge strategy` already in Release Decisions → status `implemented`
- SPEC_DEV_CONVENTIONS is the primary source; SPEC_REL_BRANCHNAMING adds a short reference in copilot-instructions
- `copilot-instructions.md` = quick reference for agents; `namingconventions.rst` = full specification

### Horizontal Check (MECE)

- ✅ SPEC_DEV_CONVENTIONS → REQ_DEV_CONVENTIONS ← US_DEV_CONVENTIONS
- ✅ SPEC_REL_BRANCHNAMING → REQ_REL_BRANCHNAMING ← US_REL_GITWORKFLOW
- ✅ SPEC_REL_AGENTPOLICY → REQ_REL_AGENTPOLICY ← US_REL_GITWORKFLOW (implemented)
- ✅ SPEC_REL_BRANCHRETENTION → REQ_REL_BRANCHRETENTION ← US_REL_GITWORKFLOW
- ✅ SPEC_REL_NOHOTFIX → REQ_REL_NOHOTFIX ← US_REL_GITWORKFLOW
- ✅ Full traceability confirmed across all levels

---

## Final Consistency Check

**Status**: ✅ approved

### Traceability

| US | REQ | SPEC |
|----|-----|------|
| US_DEV_CONVENTIONS | REQ_DEV_CONVENTIONS | SPEC_DEV_CONVENTIONS |
| US_REL_GITWORKFLOW | REQ_REL_BRANCHNAMING | SPEC_REL_BRANCHNAMING |
| US_REL_GITWORKFLOW | REQ_REL_AGENTPOLICY | SPEC_REL_AGENTPOLICY (implemented) |
| US_REL_GITWORKFLOW | REQ_REL_BRANCHRETENTION | SPEC_REL_BRANCHRETENTION |
| US_REL_GITWORKFLOW | REQ_REL_NOHOTFIX | SPEC_REL_NOHOTFIX |

✅ All 5 ACs of US_REL_GITWORKFLOW covered.
✅ All 3 ACs of US_DEV_CONVENTIONS covered.
✅ No orphaned elements.
