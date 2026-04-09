# Change Document: test-data

**Status**: approved
**Branch**: feature/test-data
**Created**: 2026-04-02
**Author**: Jarvis Developer

---

## Summary

Introduce a new persona "Jarvis Test Engineer" and theme `TST` (Testing), plus a first User Story `US_UAT_SAMPLEDATA` with Requirements and Design Specs for a versioned test dataset in the repo. This enables reproducible feature testing without relying on live data.

---

## Level 0: User Stories

**Status**: 🔄 in progress

### New Persona

**Jarvis Test Engineer** — Tests and validates Jarvis extension features using defined test datasets.

### New Theme

**TST** — Testing: versioned test data, test infrastructure, reproducible test scenarios.

### New User Stories

#### US_UAT_SAMPLEDATA: Versioned Test Dataset

```rst
.. story:: Versioned Test Dataset
   :id: US_UAT_SAMPLEDATA
   :status: draft
   :priority: mandatory

   **As a** Jarvis Test Engineer,
   **I want** a versioned test dataset in the repo,
   **so that** I can test features reproducibly without relying on live data.

   **Acceptance Criteria:**

   * AC-1: Repo contains sample YAML files for Projects and Events under testdata/projects/ and testdata/events/
   * AC-2: Files conform to the JSON Schemas (project.schema.json, event.schema.json)
   * AC-3: At least 3 projects and 3 events with various status values
```

### Discussion: AC-3 (Launch Config)

Original proposal included: "Launch-Config / Workspace-Settings use testdata as default paths."
**User decision**: Omitted — paths only need to be set once manually, no automation needed. AC-3 removed in favor of just requiring sufficient test data coverage.

### Horizontal Check (MECE)

- ✅ No conflict with US_EXP_SIDEBAR (display feature) — this is about test infrastructure
- ✅ No conflict with US_CFG_PROJECTPATH (config feature) — this doesn't change config behavior
- ✅ No conflict with US_DEV_MANUALTEST — that's about the launch config, not test data
- ✅ New persona "Jarvis Test Engineer" is distinct from "Jarvis User" and "Jarvis Developer"

---

## Level 1: Requirements

**Status**: ✅ completed

### New Requirements

#### REQ_UAT_VALID_SAMPLES: Valid Sample Files

```rst
.. req:: Valid Sample Files
   :id: REQ_UAT_VALID_SAMPLES
   :status: draft
   :priority: mandatory
   :links: US_UAT_SAMPLEDATA

   **Description:**
   The repo SHALL contain valid YAML test files for projects and events under
   ``testdata/projects/`` and ``testdata/events/``, conforming to the respective
   JSON Schemas.

   **Acceptance Criteria:**

   * AC-1: ``testdata/projects/`` contains at least 3 schema-valid project YAML files
   * AC-2: ``testdata/events/`` contains at least 3 schema-valid event YAML files
   * AC-3: Files cover a variety of status values (e.g. active, completed, archived)
   * AC-4: All mandatory fields (``name``, etc.) are present and correctly typed
```

#### REQ_UAT_INVALID_SAMPLES: Invalid Sample Files

```rst
.. req:: Invalid Sample Files
   :id: REQ_UAT_INVALID_SAMPLES
   :status: draft
   :priority: mandatory
   :links: US_UAT_SAMPLEDATA

   **Description:**
   The same ``testdata/`` folders SHALL additionally contain YAML files with
   deliberate errors to enable out-of-bounds and error-handling tests.

   **Acceptance Criteria:**

   * AC-1: At least 2 invalid files exist in ``testdata/projects/``
   * AC-2: At least 2 invalid files exist in ``testdata/events/``
   * AC-3: Invalid cases cover: missing ``name`` field, invalid status value, empty file
```

### Horizontal Check (MECE)

- ✅ REQ_UAT_VALID_SAMPLES and REQ_UAT_INVALID_SAMPLES are complementary, no overlap
- ✅ No conflict with REQ_EXP_YAMLDATA (that REQ defines scanner behavior — invalid files are skipped; these REQs define the test files that exercise that behavior)
- ✅ No conflict with REQ_CFG_FOLDERPATHS — testdata paths are set manually by the Test Engineer

---

## Level 2: Design

**Status**: ✅ completed

### New Design Specs

#### SPEC_UAT_TESTDATA_FILES: Test Data File Set

```rst
.. spec:: Test Data File Set
   :id: SPEC_UAT_TESTDATA_FILES
   :status: draft
   :links: REQ_UAT_VALID_SAMPLES, REQ_UAT_INVALID_SAMPLES

   **Description:**
   The repo SHALL contain the following test data files under ``testdata/``.
   Valid files conform fully to the JSON Schemas. Invalid files contain deliberate
   errors to enable out-of-bounds and error-handling tests.

   **testdata/projects/**

   .. list-table::
      :header-rows: 1
      :widths: 35 45 20

      * - Filename
        - Description
        - Valid?
      * - ``project-alpha.yaml``
        - Full project, externalStatus + internalStatus set
        - ✅ valid
      * - ``project-beta.yaml``
        - Minimal project, only required fields (name + summary)
        - ✅ valid
      * - ``project-gamma.yaml``
        - Project with stakeholders list
        - ✅ valid
      * - ``project-invalid-no-name.yaml``
        - Missing required ``name`` field
        - ❌ invalid
      * - ``project-invalid-bad-name.yaml``
        - ``name`` does not match ``^Project: .+$`` pattern
        - ❌ invalid

   **testdata/events/**

   .. list-table::
      :header-rows: 1
      :widths: 35 45 20

      * - Filename
        - Description
        - Valid?
      * - ``event-conference.yaml``
        - Full event, status: registered, role: speaker
        - ✅ valid
      * - ``event-workshop.yaml``
        - Event, status: attended
        - ✅ valid
      * - ``event-meetup.yaml``
        - Event, status: cancelled
        - ✅ valid
      * - ``event-invalid-empty.yaml``
        - Empty file (no fields)
        - ❌ invalid
      * - ``event-invalid-bad-status.yaml``
        - ``status: does-not-exist`` (not in enum)
        - ❌ invalid
```

### Horizontal Check (MECE)

- ✅ Single SPEC covers both REQs — valid and invalid cases fully specified
- ✅ Filenames are explicit — a future Test Agent can reference them directly
- ✅ Invalid cases are distinct and non-overlapping (name missing, name pattern, empty, bad status)
