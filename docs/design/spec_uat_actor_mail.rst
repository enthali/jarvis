Actor Mail Marker Change User Test Scenarios
============================================

All scenarios are design only; execution results live in the change Test
Protocol. Use a disposable Extension Development Host (EDH) on
``feature/actor-tree-mail-marker`` with the testdata workspace
(``testdata/test.code-workspace``) and ``packages/core``, ``packages/pim`` and
``packages/recorder`` enabled. Before starting, set ``jarvis.outlook.enabled``
to ``true`` in ``testdata/.vscode/settings.json``; that folder file currently
sets ``false`` and overrides the workspace file. Keep ``jarvis.scanInterval`` at
``1``, so the periodic scan runs about once a minute. The Actors ``Test1`` and
``Test2`` are the fixtures in ``testdata/.jarvis/actors``. Outlook folder names
other than ``Test1`` and ``Test2`` are not referenced. The tester does not
change mail through Jarvis; where a step says so, the tester changes read state
or closes or starts Outlook by hand. Module integration, compilation, and
package checks are outside User UAT.

.. spec:: Actor Mail Marker User Outcomes
   :id: SPEC_UAT_ACTOR_MAIL
   :status: draft
   :links: REQ_UAT_ACTOR_MAIL

   Manual scenarios (T-1 to T-14):

   * T-1 (US_ACTOR_MAIL AC-2): From the baseline (no unread mail in Test1 or
     Test2; mark any such mail read first), open the ACTORS view and wait for
     the first scan. Expect no mail icon on Test1 or Test2 and no notification.
   * T-2 (US_ACTOR_MAIL AC-1, AC-3): Mark one mail in Test2 unread in Outlook.
     Click the ACTORS Refresh button. Expect the mail icon in front of the name
     Test2 and no icon on Test1.
   * T-3 (US_ACTOR_MAIL AC-3): From the T-2 state, mark one mail in Test1 unread
     and do not click Refresh. Before any scan, Test1 shows no icon. Then wait up
     to 2 minutes without any click; expect the icon on Test1 from the periodic
     scan, and Test2 still shows its icon.
   * T-4 (US_ACTOR_MAIL AC-2, AC-3): From the T-3 state, mark all mail in Test2
     read in Outlook and click Refresh. Expect no icon on Test2 and the icon
     still on Test1.
   * T-5 (US_ACTOR_MAIL AC-2, AC-3): Mark all mail in Test1 read in Outlook and
     do not click Refresh; wait up to 2 minutes. Expect the icon on Test1 to
     disappear from the periodic scan. Both Actors now show no icon.
   * T-6 (US_ACTOR_MAIL AC-5): Close the EDH with Test1 and Test2 both read. Mark
     one mail in Test1 unread while the EDH is closed. Start the EDH again and
     wait for the first scan. Expect the icon on Test1 without any click and no
     icon on Test2. Then mark the Test1 mail read again.
   * T-7 (US_ACTOR_MAIL AC-4): Mark one mail in Test2 unread, click Refresh, and
     expect the icon on Test2. Start a recording on Test2 from its node. While it
     runs, expect the red dot on Test2 and no mail icon. End the recording with
     the end-recording button in the transcript view and wait until the
     transcript is complete. Expect the mail icon on Test2 again at the next tree
     refresh; if the tree did not refresh by itself, click Refresh and expect the
     icon.
   * T-8 (US_ACTOR_MAIL AC-4; US_ACTOR_ACTIVITY AC-1, AC-2): With Test2 unread and
     its icon shown, open the Test2 chat from its node and send a prompt that
     makes the agent run several tool calls, such as listing two folders and
     summarizing each. While the turn runs, expect the green dot on Test2 and no
     mail icon. When the turn ends, expect the mail icon back without a Refresh
     click. If the turn ends before the green dot is seen, repeat with a longer
     prompt; an unseen state is not a pass.
   * T-9 (US_ACTOR_MAIL AC-4): With Test2 unread, start a long agent turn in the
     Test2 chat as in T-8. While the turn runs, start a recording on Test2 and
     expect the red dot only. End the recording in the transcript view while the
     turn still runs; expect the green dot, not the mail icon, at the next tree
     refresh. When the turn ends, expect the mail icon. If the turn ends before the
     recording is ended, repeat with a longer turn.
   * T-10 (US_ACTOR_MAIL AC-6): With Test2 unread and its icon shown, close
     Outlook by hand and click Refresh. Expect no mail icon on any Actor, no error
     notification, and one warning line about the Outlook read in the Jarvis log.
     Expect no OUTLOOK.EXE process to be started by Jarvis.
   * T-11 (US_ACTOR_MAIL AC-6): Start Outlook by hand; Test2 mail is still unread.
     Click Refresh and expect the mail icon on Test2 again.
   * T-12 (US_ACTOR_MAIL AC-9): With Test2 unread in Outlook, set
     ``jarvis.outlook.enabled`` to ``false`` in ``testdata/.vscode/settings.json``
     and reload the window. Expect no mail icon on any Actor after the first scan.
     Set the value back to ``true``, reload, and expect the icon on Test2.
   * T-13 (US_ACTOR_MAIL AC-8): With Test2 unread, keep the EDH open through two
     periodic scans (about 3 minutes) and click Refresh twice. Then check in
     Outlook that the Test2 mail is still unread and that no mail or folder moved.
     Mark it read afterwards.
   * T-14 (US_ACTOR_MAIL AC-7): With Test2 showing the mail icon, click the Test2
     node and expect its chat to open. Right-click the node and expect the same
     Actor menu as in T-1. Expand the node and expect the same children as in T-1.
     The label text is only the name Test2.

   Checks outside the manual run (T-15 to T-21). These are deterministic, so they
   are not run by hand. Unit tests written by Dev Engineer at implementation own
   them, and their names are assigned then. They are listed here so that every
   acceptance criterion has a case:

   * T-15 (REQ_ACTOR_MAIL AC-2): A folder two levels below the Inbox with the
     Actor's name and unread mail gives no icon. The reader opens direct children
     of the Inbox only.
   * T-16 (REQ_ACTOR_MAIL AC-2): A folder named in a different case, such as
     ``test1`` for the Actor ``Test1``, gives no icon.
   * T-17 (REQ_ACTOR_MAIL AC-3): When two Actors carry the same name and the
     resolver reports ambiguous, neither shows the icon.
   * T-18 (REQ_ACTOR_MAIL AC-10; SPEC_ACTOR_MAIL AC-7): A failed read (non-zero
     exit, timeout, or output that is not a JSON array) empties the set, writes one
     log warning, and shows no message.
   * T-19 (REQ_ACTOR_MAIL AC-11; SPEC_ACTOR_MAIL AC-4): While the setting is
     ``false``, no PowerShell process is started.
   * T-20 (SPEC_ACTOR_MAIL AC-3, AC-8; REQ_EXP_REACTIVECACHE AC-4): A read starts
     after every completed scan, and the change callback fires only when the set
     of Actor ids changes. No Outlook subscription or timer exists.
   * T-21 (REQ_ACTOR_MAIL AC-8; SPEC_ACTOR_MAIL AC-6): The read script uses only
     the properties named in SPEC_ACTOR_MAIL and calls no method that changes an
     item, flag, folder, or store.
