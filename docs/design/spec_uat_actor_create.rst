Create an Actor: User Acceptance Test
=====================================

.. spec:: Create an Actor User Journey
   :id: SPEC_UAT_ACTOR_CREATE
   :status: approved
   :links: US_ACTOR_CREATE

   **User story:** ``US_ACTOR_CREATE`` AC-1 and AC-3 through AC-7.

   **Preparation (Engineering):** Open a disposable Extension Development
   Host with an empty new Actor root, an available chat agent, and the
   legacy New Entity entry point. Tell the User the name of the available
   agent. Keep production Actor and legacy folders out of this workspace.

   **User action:** Use ACTORS ``+`` to create an Actor called ``UAT New``;
   select the prepared agent. Find and open the new Actor. Open the
   legacy New Entity picker and inspect its choices without creating an
   item. Then use ACTORS ``+`` again to create ``UAT No Agent`` and
   dismiss the optional agent picker with Escape.

   **Expected observation:** Both Actors appear in ACTORS and can be
   opened without a manual refresh. The first uses the chosen agent;
   dismissing the agent picker still creates the second Actor. The
   legacy picker remains separately available with its former choices,
   and the new ACTORS picker offers only Actor creation.

   **Teardown (Engineering):** Remove the disposable Actors.