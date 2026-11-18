Self-Update Acceptance Criteria
===============================

These criteria validate the update check, notification and install flow of the
distribution module (``MOD_DISTRIBUTION``) against the live GitHub API.

**Setup:** A published GitHub release with a ``.vsix`` asset exists at
``enthali/jarvis/releases/latest`` and the machine has internet access. To
simulate an outdated version without a new release, temporarily set
``"version": "0.0.1"`` in ``package.json``, run ``npm run compile``, press F5 to
start the Extension Development Host and revert ``package.json`` after the test.
``jarvis.checkForUpdates`` is ``true`` (default) unless a criterion says
otherwise.

.. ac:: The update is offered, installed, and no longer offered when current
   :id: AC_REL_SELFUPDATE_JOURNEY
   :status: approved
   :validates: US_REL_SELFUPDATE

   **Given** an older version of Jarvis than the latest GitHub release is
   installed (``"version": "0.0.1"`` as described in the setup)

   1. **When** I reload the VS Code window, and separately run
      ``Jarvis: Check for Updates`` from the Command Palette, and click "Release
      Notes"
      **Then** both the reload and the command show the notification
      ``Jarvis v{latest} is available (current: v0.0.1)`` with the buttons
      "Release Notes" and "Download & Install", and "Release Notes" opens the
      GitHub release page in the default browser.
   2. **When** I run ``Jarvis: Check for Updates`` again and click "Download &
      Install"
      **Then** a reload prompt ``Jarvis has been updated. Reload to activate
      v{new}.`` with a "Reload Now" button appears, "Reload Now" reloads the
      window, and the Extensions view lists the installed Jarvis extensions at
      v{new}.
   3. **When** the installed version matches or exceeds the latest GitHub release
      (revert ``package.json`` and restart the EDH, or use the updated
      installation), I reload the VS Code window and then run
      ``Jarvis: Check for Updates``
      **Then** the reload shows no notification and no error in the Output
      Channel; the command shows ``Jarvis is up to date (v{current}).``

.. ac:: The setting switches off only the automatic check
   :id: AC_REL_SELFUPDATE_SETTING
   :status: approved
   :validates: US_REL_SELFUPDATE

   **Given** an older version is installed and ``jarvis.checkForUpdates`` is
   ``false``
   **When** I reload the VS Code window and then run ``Jarvis: Check for Updates``
   **Then** the reload shows no update notification; the command still shows the
   update notification.
