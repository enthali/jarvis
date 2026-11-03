Auto Delivery User Acceptance Tests
=====================================

.. story:: Auto Delivery Acceptance Tests
   :id: US_UAT_MSG_AUTODELIVERY
   :status: draft
   :priority: optional
   :links: US_COM_DELIVERY; US_COM_AUTHORITY; US_COM_NAME

   **As a** Jarvis Test Engineer,
   **I want** manual acceptance test scenarios for automatic delivery,
   **so that** I can verify that an Actor with automatic delivery is told that
   messages wait, and that a delivery never opens a chat or moves the User's focus.

   **Acceptance Criteria:**

   * AC-1: The Messages tree always shows an "Auto Delivery" group node, even when no
     Actor is registered (T-1).
   * AC-2: A node in the manual root has the context menu entry "Enable Direct
     Delivery"; enabling it moves the node into the "Auto Delivery" group and persists
     the change to ``autodelivery.json`` (T-2, T-3, T-4).
   * AC-3: A node in the "Auto Delivery" group has the entry "Disable Direct Delivery"
     that moves it back and removes it from ``autodelivery.json`` (T-5, T-6).
   * AC-4: A queued message for an Actor in the group is announced in its chat without
     the User pressing Play (T-7).
   * AC-5: An announced message is not announced again (T-8).
   * AC-6: The Play button works for an Actor in the group and does not cause a second
     announcement of the same messages (T-9).
   * AC-7: A delivery opens no editor tab and adds no editor column (T-10).
   * AC-8: A delivery leaves the focus where it was, in an editor and in the integrated
     terminal (T-11, T-12).
   * AC-9: A delivery to an Actor whose chat tab is open and focused is not suppressed
     (T-13).

   **Test Scenarios:**

   The inbox and the list of Actors with automatic delivery are the files
   ``queue.json`` and ``autodelivery.json`` in ``<workspace>/.jarvis/messages/``. To
   queue a message for ``TestTarget`` run the job ``t8-queue-message`` of
   ``testdata/heartbeat/heartbeat.yaml``. A delivery is the announcement in the chat
   of the Actor (``REQ_COM_NOTIFY``). The delay between the queued message and the
   announcement is not specified; record what you observe. An unseen result is
   recorded NOT RUN, not PASS.

   **T-1 — "Auto Delivery" group node always visible**
     Setup: No Actor registered for automatic delivery (``autodelivery.json`` absent
     or empty).
     Action: Open the Jarvis Explorer and expand the Messages view.
     Expected: An "Auto Delivery" group node is visible, distinct from the manual root.

   **T-2 — "Enable Direct Delivery" on a manual node**
     Setup: One message queued for ``TestTarget``, so the node is in the manual root.
     Action: Right-click the ``TestTarget`` node.
     Expected: The context menu contains "Enable Direct Delivery".

   **T-3 — Enable moves the node into the group**
     Action: Choose "Enable Direct Delivery" on ``TestTarget``.
     Expected: The node leaves the manual root and appears in the "Auto Delivery"
     group without a manual rescan.

   **T-4 — autodelivery.json is written**
     Action: Open ``<workspace>/.jarvis/messages/autodelivery.json`` after T-3.
     Expected: Valid JSON that lists ``TestTarget``.

   **T-5 — "Disable Direct Delivery" in the group**
     Action: Right-click ``TestTarget`` inside the "Auto Delivery" group.
     Expected: The context menu contains "Disable Direct Delivery".

   **T-6 — Disable moves the node back**
     Action: Choose "Disable Direct Delivery".
     Expected: The node returns to the manual root while messages are queued;
     ``autodelivery.json`` no longer lists ``TestTarget``.

   **T-7 — Announcement without Play**
     Setup: ``TestTarget`` is in the group; its chat exists and is idle.
     Action: Run the ``t8-queue-message`` job. Do not press Play.
     Expected: The chat of ``TestTarget`` shows the announcement (the number of waiting
     messages and the request to receive them). The message text is not in the
     announcement. The node shows the messages as announced or its count changes.

   **T-8 — No second announcement**
     Setup: T-7 completed.
     Action: Wait one minute without queuing anything.
     Expected: No second announcement for the same message appears in the chat.

   **T-9 — Play for a node in the group**
     Setup: ``TestTarget`` is in the group; a new message is queued and announced.
     Action: Press Play on the node.
     Expected: The chat gets one announcement for all waiting messages; no error; a
     later watcher pass adds no further announcement for them.

   **T-10 — A delivery opens nothing**
     Setup: Two editor columns are open (an Actor chat in column 1, ``context.md`` in
     column 2). The chat of ``TestTarget`` is not open in any column. ``TestTarget`` is
     in the group.
     Action: Run the ``t8-queue-message`` job and wait for the announcement.
     Expected: No tab for ``TestTarget`` opens and no column is added; the announcement
     is visible when the User opens the chat (click the node) or in the Agents window.

   **T-11 — Focus stays in the editor**
     Setup: ``TestTarget`` in the group, its chat closed; ``README.md`` open and focused.
     Action: Run the job and wait for the announcement.
     Expected: ``README.md`` keeps the focus the whole time. NOT RUN if the focus cannot
     be observed.

   **T-12 — Focus stays in the terminal**
     Setup: As T-11 with the integrated terminal focused instead of ``README.md``.
     Expected: The terminal keeps the focus the whole time.

   **T-13 — Delivery to a focused chat**
     Setup: The chat tab of ``TestTarget`` is open and focused; ``TestTarget`` is in the
     group.
     Action: Run the job.
     Expected: The announcement arrives in that chat; delivery is not suppressed
     because the tab is focused; no error is shown.

   **Retired:** the former placement scenarios (Secondary column, split of a second
   column when only Main is open) and the focus snapshot and restore around a delivery
   test behaviour that ``REQ_COM_OPEN`` AC-4 removed: a delivery moves no focus and
   opens no tab. The model for documents and the diagram panel
   (``REQ_MSG_EDITORPLACEMENT``) is not part of this set.
