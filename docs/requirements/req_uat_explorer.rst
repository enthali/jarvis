Explorer UAT Requirements
==========================

.. req:: Valid Sample Files
   :id: REQ_UAT_VALID_SAMPLES
   :status: implemented
   :priority: mandatory
   :links: US_UAT_SAMPLEDATA

   **Description:**
   The repo SHALL contain valid YAML test files for projects and events under
   ``testdata/projects/`` and ``testdata/events/``, conforming to the respective
   JSON Schemas.

   **Acceptance Criteria:**

   * AC-1: ``testdata/projects/`` contains at least 3 schema-valid project YAML files
   * AC-2: ``testdata/events/`` contains at least 3 schema-valid event YAML files
   * AC-3: Files cover a variety of status values
   * AC-4: All mandatory fields (``name``, etc.) are present and correctly typed
   * AC-5: ``testdata/projects/`` and ``testdata/events/`` each contain at least one subfolder
     with at least one valid YAML file to enable subfolder-display testing


.. req:: Invalid Sample Files
   :id: REQ_UAT_INVALID_SAMPLES
   :status: implemented
   :priority: mandatory
   :links: US_UAT_SAMPLEDATA

   **Description:**
   The same ``testdata/`` folders SHALL additionally contain YAML files with
   deliberate errors to enable out-of-bounds and error-handling tests.

   **Acceptance Criteria:**

   * AC-1: At least 2 invalid files exist in ``testdata/projects/``
   * AC-2: At least 2 invalid files exist in ``testdata/events/``
   * AC-3: Invalid cases cover: missing ``name`` field, invalid status value, empty file
