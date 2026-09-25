Actor Name Validation: User Acceptance Test
===========================================

.. spec:: Actor Name Validation User Journey
   :id: SPEC_UAT_ACTOR_NAMES
   :status: approved
   :links: US_ACTOR_CREATE

   **User story:** ``US_ACTOR_CREATE`` AC-1 and AC-2.

   **Preparation (Engineering):** Open a disposable Extension Development
   Host with a single existing Actor named ``UAT Existing`` in the
   configured Actor root. Confirm its chat is available for the User to
   open; do not add another Actor with the same YAML name.

   **User action:** From ACTORS ``+``, try the name ``bad/name`` and
   observe the input validation. Try ``UAT Existing`` and observe the
   duplicate response. Cancel the name input on another attempt, then
   open the original ``UAT Existing`` Actor from the tree.

   **Expected observation:** The invalid name is rejected. The existing
   name reports a duplicate without replacing the original Actor.
   Cancellation creates nothing; only the prepared Actor remains and
   still opens normally.

   **Teardown (Engineering):** Restore the disposable setup.