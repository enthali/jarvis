Actor Identity After Context Loss: User Acceptance Test
========================================================

.. spec:: Actor Identity After Context Loss
   :id: SPEC_UAT_ACTOR_IDENTITY
   :status: approved
   :links: US_ACTOR_WHOAMI

   **User story:** ``US_ACTOR_WHOAMI`` AC-1 and AC-3.

   **Preparation (Engineering):** In a disposable Extension Development
   Host, provide a single named Actor with a distinct, non-sensitive
   memory marker. Tell the User the Actor name and marker. Ensure there
   is no second Actor with the same name, and no unrelated chat has
   focus when the User opens the Actor from ACTORS.

   **User action:** Open the Actor from ACTORS, use ``/compact`` in its
   chat, then ask the Actor to identify itself and recover its own
   memory. Do not supply a folder path or tool arguments.

   **Expected observation:** The Actor identifies itself by the
   prepared name and finds its own memory marker after context loss,
   without asking the User for a file path or a second identity.

   **Teardown (Engineering):** Restore the disposable setup.