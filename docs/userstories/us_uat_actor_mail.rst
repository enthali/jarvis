Actor Mail Marker Change User Acceptance Tests
==============================================

.. story:: Actor Mail Marker User Test
   :id: US_UAT_ACTOR_MAIL
   :status: draft
   :priority: optional
   :links: US_ACTOR_MAIL; US_ACTOR_ACTIVITY; US_REC_CAPTURE

   **As a** Jarvis user, **I want** to see in the ACTORS tree which Actors have
   unread Outlook mail, and which mark wins when several apply, **so that** I
   can tell from VS Code which Actor needs attention.

   **Acceptance Criteria:**

   * AC-1: After a rescan, the Actor whose Outlook folder directly under the
     Inbox holds unread mail shows the mail icon in front of its name; no other
     Actor does (T-2, T-3).
   * AC-2: An Actor without such a folder, or whose folder has no unread mail,
     shows no mail icon. A folder nested deeper in the Inbox, or a name that
     differs in case, does not count (T-1, T-4, T-5, T-15, T-16).
   * AC-3: The icon changes only at a scan, the manual Refresh or the periodic
     scan. A change in Outlook between two scans is not shown before the next
     scan (T-2 to T-5, T-20).
   * AC-4: A node shows one mark at a time: recording (red), then active session
     (green), then unread mail. When a higher mark ends, the next one still
     present is shown (T-7 to T-9).
   * AC-5: No mail state survives an EDH restart; after the first scan the icon
     reflects Outlook (T-6).
   * AC-6: While Outlook cannot be read, no Actor shows the mail icon and no
     message is shown. When Outlook is readable again, the icon returns at the
     next rescan (T-10, T-11, T-18).
   * AC-7: The mail icon does not change an Actor node's click, menu, or children
     (T-14).
   * AC-8: Jarvis never marks, moves, or changes mail or folders in Outlook
     (T-13, T-21).
   * AC-9: While ``jarvis.outlook.enabled`` is ``false``, no mail icon is shown
     and no Outlook read is made (T-12, T-19).
