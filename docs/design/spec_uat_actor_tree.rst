ACTORS Tree: User Acceptance Test
=================================

.. spec:: ACTORS Tree User Journey
   :id: SPEC_UAT_ACTOR_TREE
   :status: approved
   :links: US_ACTOR_TREE

   **User story:** ``US_ACTOR_TREE`` AC-1, AC-2, AC-5, and AC-6.

   **Preparation (Engineering):** In a disposable Extension Development
   Host, prepare one named Actor directly inside the configured Actor
   root, a second named Actor one folder deeper, and a legacy tree item.
   Tell the User all three names. Close any chat for the direct Actor.

   **User action:** Open Jarvis Explorer and expand ACTORS and the legacy
   tree. Look for both prepared Actor names; inspect the ACTORS title
   bar and leaves for grouping, kind filters, or archive controls.
   Click the visible direct Actor twice, checking the chat tabs after
   each click.

   **Expected observation:** The direct Actor appears beneath ACTORS,
   the nested Actor does not, and the legacy item remains in its own
   tree. No grouping, kind filter, or Jarvis archive control appears.
   The first click opens the Actor's chat and the second reuses it.

   **Teardown (Engineering):** Restore the disposable setup.