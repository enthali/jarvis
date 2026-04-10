Self-Update UAT Design Specifications
=======================================

.. spec:: Self-Update Test Protocol Structure
   :id: SPEC_UAT_SELFUPDATE_FILES
   :status: implemented
   :links: REQ_UAT_SELFUPDATE_TESTDATA

   **Description:**
   No test data files are required for the self-update feature. All tests are
   manual UI scenarios that exercise the live GitHub API and VS Code notification
   system.

   **Test setup requirements:**

   * A published GitHub release with a ``.vsix`` asset must exist at
     ``enthali/jarvis/releases/latest``
   * Internet connectivity is required for T-1 through T-7
   * T-8 and T-9 require the ability to block network access (e.g. disable Wi-Fi
     or DNS block ``api.github.com``)

   **Version manipulation for testing:**

   To simulate an outdated version without publishing a new release:

   1. Temporarily edit ``package.json`` to set ``"version": "0.0.1"``
   2. Run ``npm run compile``
   3. Press F5 to launch the Extension Development Host
   4. Verify the update notification appears
   5. Revert ``package.json`` after testing

   **Test matrix:**

   .. list-table::
      :header-rows: 1
      :widths: 10 30 20 40

      * - Test
        - Scenario
        - Config
        - Expected
      * - T-1
        - Auto check, update available
        - checkForUpdates: true
        - Notification with version and two buttons
      * - T-2
        - Auto check, up to date
        - checkForUpdates: true
        - No notification
      * - T-3
        - Manual command, update available
        - (any)
        - Same notification as T-1
      * - T-4
        - Manual command, up to date
        - (any)
        - "Jarvis is up to date" message
      * - T-5
        - Release Notes button
        - (any)
        - Browser opens release page
      * - T-6
        - Download & Install button
        - (any)
        - .vsix installed, reload prompt
      * - T-7
        - Config disables auto check
        - checkForUpdates: false
        - No auto notification; manual still works
      * - T-8
        - Network failure (auto)
        - checkForUpdates: true
        - Silent, no crash
      * - T-9
        - Network failure (manual)
        - (any)
        - Graceful handling, no crash
