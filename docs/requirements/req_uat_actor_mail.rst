Actor Mail Marker Change User Test Requirements
===============================================

.. req:: Actor Mail Marker Test Data
   :id: REQ_UAT_ACTOR_MAIL
   :status: draft
   :links: US_UAT_ACTOR_MAIL

   **Acceptance Criteria:**

   * AC-1: The EDH runs on the testdata workspace with ``jarvis.outlook.enabled``
     set to ``true`` in ``testdata/.vscode/settings.json``. That folder file
     overrides the workspace file, which already sets ``true``; the folder file
     is machine-local and gitignored, so the tester sets it before the EDH
     starts. The Actors ``Test1`` and ``Test2`` exist under ``.jarvis/actors``
     (T-1 to T-14).
   * AC-2: Outlook is running, and the Inbox has direct subfolders named
     ``Test1`` and ``Test2``. The tester sets the read and unread state by hand;
     Jarvis never changes mail. These folders are created in
     Outlook outside the repository (T-1 to T-14).
   * AC-3: A recording can be started on an Actor (a working microphone and the
     recorder speech backend are present), and the Actor chat can run an agent
     turn that lasts several seconds (T-7 to T-9).
