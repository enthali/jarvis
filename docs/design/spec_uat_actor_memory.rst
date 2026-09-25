Actor Memory Across Sessions: User Acceptance Test
==================================================

.. spec:: Actor Memory Across Sessions
   :id: SPEC_UAT_ACTOR_MEMORY
   :status: approved
   :links: US_ACTOR_ACTORS

   **User story:** ``US_ACTOR_ACTORS`` AC-2 and AC-4.

   **Preparation (Engineering):** Open a disposable Extension Development
   Host with a single new-convention test Actor visible under ACTORS. Keep
   its initial memory empty and tell the User its name. Do not use a
   production Actor or open the test Actor's chat on the User's behalf.

   **User action:** Open the test Actor from ACTORS. Ask it to remember a
   chosen, non-sensitive codeword for future sessions. Wait until it
   confirms the memory, then close the chat tab. Open the same Actor from
   ACTORS again and ask for the codeword and its name without repeating
   the codeword in the question.

   **Expected observation:** The Actor recalls the exact codeword and its
   own name after the chat was closed and reopened. A new chat session
   does not erase its memory or change its identity.

   **Teardown (Engineering):** Restore the disposable setup.