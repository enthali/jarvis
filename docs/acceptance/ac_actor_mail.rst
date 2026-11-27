Actor Mail Indicator Acceptance Criteria
========================================

These criteria validate the mail icon and the follow-up flag icon on Actor nodes
of the ACTORS tree (``MOD_ACTOR``, supplied by ``MOD_PIM``) against a real Outlook.

**Setup:** Use a disposable Extension Development Host (EDH) on the testdata
workspace (``testdata/test.code-workspace``) with ``packages/core``,
``packages/pim`` and ``packages/recorder`` enabled. Set
``jarvis.outlook.enabled`` to ``true`` in ``testdata/.vscode/settings.json``
before the EDH starts; that folder file overrides the workspace file, is
machine-local and gitignored. Keep ``jarvis.scanInterval`` at ``1``, so the
periodic scan runs about once a minute. The Actors ``Test1`` and ``Test2`` are the
fixtures in ``testdata/.jarvis/actors``. Outlook is running and its Inbox has the
direct subfolders ``Test1`` and ``Test2``, created outside the repository. You
set the read and unread state of mail and its follow-up flag by hand; Jarvis never
changes mail. For steps 3 and 4 of the first journey, a working microphone with
the recorder speech backend is present and the Actor chat can run an agent turn
that lasts several seconds. The last step of the third journey starts a second
EDH with only ``packages/core`` and ``packages/recorder`` enabled. Run the
journeys in order.

.. ac:: The mail icon follows Outlook and gives way to recording and activity
   :id: AC_ACTOR_MAIL_MARKS_JOURNEY
   :status: approved
   :validates: US_ACTOR_MAIL; US_ACTOR_ACTIVITY

   **Given** no unread mail in the Outlook folders ``Test1`` and ``Test2``, the
   ACTORS view open after its first scan, and the chat of ``Test2`` opened from
   its node (Jarvis finds the chat by the name ``Test2``)

   1. **When** I mark one mail in ``Test2`` unread and click the ACTORS Refresh
      button
      **Then** before the unread mail exists neither Actor shows a mail icon;
      after the Refresh ``Test2`` shows the mail icon in front of its name and
      ``Test1`` does not.
   2. **When** I mark one mail in ``Test1`` unread without clicking Refresh, and
      wait up to 2 minutes without any click
      **Then** ``Test1`` shows the mail icon after the periodic scan; ``Test2``
      keeps its icon.
   3. **When** I start a recording on ``Test2`` from its node, and later end it
      with the end-recording button in the transcript view and wait for the
      complete transcript
      **Then** while the recording runs ``Test2`` shows the red dot and no mail
      icon; afterwards it shows the mail icon again at the next tree refresh
      (after a Refresh click at the latest).
   4. **When** I send a prompt in the ``Test2`` chat that makes the agent run
      several tool calls, such as listing two folders and summarizing each,
      start a recording on ``Test2`` while the turn runs, and end the recording
      while the turn still runs
      **Then** while the turn runs ``Test2`` shows the animated spinner
      (Working), never the red dot or the mail icon, also while the recording
      runs; when the turn ends the mail icon is back without a Refresh click. A
      state I did not see (for example because the turn ended too early) is not
      a pass: repeat with a longer prompt.
   5. **When** I mark all mail in ``Test1`` and ``Test2`` read and click Refresh
      **Then** neither Actor shows a mail icon.

.. ac:: Unreadable Outlook shows no icon, and the icon changes nothing else
   :id: AC_ACTOR_MAIL_OUTLOOK_JOURNEY
   :status: approved
   :validates: US_ACTOR_MAIL

   **Given** one mail in ``Test2`` is unread (marked by hand) and ``Test2`` shows
   the mail icon after a Refresh click

   1. **When** I close Outlook by hand and click Refresh, then start Outlook by
      hand again and click Refresh
      **Then** with Outlook closed no Actor shows a mail icon; with Outlook
      running again ``Test2`` shows the mail icon.
   2. **When** I click the ``Test2`` node, right-click it and expand it
      **Then** the click opens the ``Test2`` chat, the context menu and the
      children are the same as on an Actor without the icon, and the label is
      only ``Test2``. I mark the mail read afterwards.


.. ac:: A pending follow-up flag shows the flag icon and ends with the flag
   :id: AC_ACTOR_MAIL_FLAG_JOURNEY
   :status: approved
   :validates: US_ACTOR_MAIL

   **Given** no unread mail and no flagged mail in the Outlook folders ``Test1`` and
   ``Test2``, and the ACTORS view open after its first scan

   1. **When** I flag a read mail in ``Test2`` for follow-up and click the ACTORS
      Refresh button
      **Then** ``Test2`` shows the flag icon in front of its name and ``Test1`` shows no
      icon.
   2. **When** I mark another mail in ``Test2`` unread and click Refresh
      **Then** ``Test2`` still shows the flag icon, not the mail icon.
   3. **When** I mark the flagged mail complete in Outlook and click Refresh
      **Then** ``Test2`` shows the mail icon, because the unread mail remains.
   4. **When** I flag a mail in ``Test1`` and wait up to 2 minutes without any click
      **Then** ``Test1`` shows the flag icon after the periodic scan; ``Test2`` keeps
      the mail icon.
   5. **When** I clear the flag in ``Test1``, mark all mail in ``Test1`` and ``Test2``
      read, and click Refresh
      **Then** neither Actor shows an icon.
   6. **When** I flag a mail in ``Test2``, mark another mail in ``Test2`` unread, close the
      EDH, start a second EDH on the same workspace with only ``packages/core`` and
      ``packages/recorder`` enabled, and wait for its first scan
      **Then** no Actor shows a mail icon or a flag icon.
