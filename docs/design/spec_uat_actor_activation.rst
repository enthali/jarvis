Actor Message Receipt: User Acceptance Test
===========================================

.. spec:: Actor Message Receipt
   :id: SPEC_UAT_ACTOR_ACTIVATION
   :status: draft
   :links: US_ACTOR_ACTORS

   **User story:** ``US_ACTOR_ACTORS`` AC-3.

   **Preparation (Engineering):** In a disposable Extension Development
   Host, provide a named test Actor with a known, non-sensitive memory
   marker. Prepare a heartbeat and a reminder addressed to this Actor,
   each with a distinct message label and a trigger the User can request.
   Tell the User the Actor name, marker, message labels, and where to find
   its group in the Messages tree. Do not trigger either sender until the
   User has closed the Actor chat. Start with Auto-Delivery OFF for this
   destination; do not change the preference on behalf of either sender.

   **User action (OFF):** Open the Actor and confirm its memory marker,
   then close its chat. Ask Engineering to trigger the heartbeat and
   reminder. Without reopening the Actor chat, wait for both messages
   to appear under the Actor in the Messages tree. Confirm that the
   group remains under manual delivery and no automatic chat notification
   opens. Use the group's play button to notify the Actor manually;
   open its chat if needed and ask what it remembers.

   **Expected observation (OFF):** Both labelled messages are queued for
   the closed Actor. Neither sender switches on Auto-Delivery or opens
   a chat. Manual notification is available; when the session opens,
   the Actor still has its own memory marker.

   **User action (ON):** With the Actor chat closed again, enable
   Auto-Delivery for that destination in the Messages tree. Ask
   Engineering to trigger a second labelled heartbeat message. Observe
   the chat notification without using the manual play button.

   **Expected observation (ON):** The second message is queued and the
   existing delivery mechanism notifies the Actor automatically because
   Auto-Delivery was enabled before the heartbeat ran. The sender did
   not select the delivery mode.

   **Teardown (Engineering):** Remove the disposable jobs and restore the
   Actor's original Auto-Delivery preference.