Modular Delivery UAT Requirements
=================================

.. req:: Modular Install Test Harness & Data
   :id: REQ_UAT_MODULAR_INSTALL
   :status: approved
   :priority: required
   :links: US_UAT_MODULAR_INSTALL; REQ_MOD_CORE; REQ_MOD_ADDONS; REQ_MOD_ZEROTRACE; REQ_MOD_NOMIGRATION; REQ_ENG_CONTRACT; REQ_ENG_SCANNER; REQ_ENG_TOOLNS

   **Description:**
   The repository SHALL provide the test infrastructure needed to execute the
   modular-install acceptance scenarios in an extension-host harness able to
   launch selected package combinations that mirror the real user install
   journey (core, then optionally add PIM and/or recorder).

   **Acceptance Criteria:**

   * AC-1: An extension-host harness can launch the host with a chosen set of
     packages — core only, core+pim, core+recorder, core+pim+recorder,
     core+mcp, core+pim+recorder (no flow), core+flow — for the acceptance
     scenarios ``T-1``..``T-12``.
   * AC-2: Zero-trace assertions (``T-2``, ``T-8``, ``T-10``) inspect the
     *static* manifest surface (views, settings, commands) plus the runtime
     tool registry, not only runtime visibility.
   * AC-3: No-migration verification (``T-6``) uses existing ``testdata/``
     entities and a representative ``jarvis.*`` settings set; no new entity
     fixtures are required beyond what already exists.
   * AC-4: Expected step-by-step outcomes for ``T-1``..``T-12`` are documented in
     the test protocol ``docs/changes/tst-modular-install.md``.
   * AC-5 (``message-flow-diagram`` CR): The harness can launch a
     core+``enthali.jarvis-flow`` combination for ``T-10``/``T-11``/``T-12``.
