Self-Update User Acceptance Tests
===================================

.. story:: Self-Update Check Acceptance Tests
   :id: US_UAT_SELFUPDATE
   :status: implemented
   :priority: optional
   :links: US_REL_SELFUPDATE; REQ_REL_UPDATECHECK; REQ_REL_UPDATENOTIFY; REQ_REL_UPDATEINSTALL; REQ_REL_UPDATECOMMAND; REQ_CFG_UPDATECHECK

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for the self-update check feature,
   **so that** I can verify the update notification, download, install, and
   configuration flows end-to-end before release.

   **Acceptance Criteria:**

   * AC-1: Test scenarios cover: automatic check at activation, manual command,
     notification buttons, download & install, up-to-date message, and config toggle
   * AC-2: At least one test verifies the "Release Notes" button opens the browser
   * AC-3: At least one test verifies the "Download & Install" flow completes
   * AC-4: At least one test verifies ``jarvis.checkForUpdates = false`` suppresses
     the automatic check
   * AC-5: At least one test verifies network failure is handled silently

   **Test Scenarios:**

   **T-1 — Automatic check shows notification when update is available**
     Setup: Install an older version of Jarvis (or temporarily set a low version
     in ``package.json``, e.g. ``0.0.1``). Ensure ``jarvis.checkForUpdates``
     is ``true`` (default).
     Action: Reload the VS Code window.
     Expected: An information notification appears:
     ``"Jarvis v{latest} is available (current: v0.0.1)"`` with two buttons:
     "Release Notes" and "Download & Install".

   **T-2 — Automatic check silent when up to date**
     Setup: Ensure the installed version matches or exceeds the latest GitHub
     release. ``jarvis.checkForUpdates`` is ``true``.
     Action: Reload the VS Code window.
     Expected: No notification appears. No errors in the Output Channel.

   **T-3 — Manual command shows notification when update is available**
     Setup: Same as T-1 (older version installed).
     Action: Run ``Jarvis: Check for Updates`` from the Command Palette.
     Expected: Same notification as T-1.

   **T-4 — Manual command shows up-to-date message**
     Setup: Same as T-2 (current version installed).
     Action: Run ``Jarvis: Check for Updates`` from the Command Palette.
     Expected: An information message: ``"Jarvis is up to date (v{current})."``

   **T-5 — "Release Notes" button opens browser**
     Setup: Trigger the update notification (T-1 or T-3).
     Action: Click the "Release Notes" button.
     Expected: The GitHub release page (``html_url``) opens in the default browser.

   **T-6 — "Download & Install" completes successfully**
     Setup: Trigger the update notification (T-1 or T-3).
     Action: Click the "Download & Install" button.
     Expected: The ``.vsix`` file is downloaded, installed, and a reload prompt
     appears: ``"Jarvis has been updated. Reload to activate v{new}."`` with a
     "Reload Now" button. Clicking "Reload Now" reloads the window.

   **T-7 — Config disables automatic check**
     Setup: Set ``jarvis.checkForUpdates`` to ``false`` in VS Code settings.
     Install an older version.
     Action: Reload the VS Code window.
     Expected: No update notification appears at activation. Running the manual
     command ``Jarvis: Check for Updates`` still works and shows the notification.

   **T-8 — Network failure handled silently (automatic)**
     Setup: Disconnect from the internet or block ``api.github.com``.
     ``jarvis.checkForUpdates`` is ``true``.
     Action: Reload the VS Code window.
     Expected: No notification, no error toast, no crash. Extension activates
     normally.

   **T-9 — Network failure shows error (manual command)**
     Setup: Disconnect from the internet or block ``api.github.com``.
     Action: Run ``Jarvis: Check for Updates`` from the Command Palette.
     Expected: The command completes without crash. Behaviour is graceful
     (silent or brief warning — no stack trace shown to user).
