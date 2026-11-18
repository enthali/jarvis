Actor Phase 1 Acceptance Criteria
=================================

The Phase 1 procedure of the Actor module, executed in a disposable Extension
Development Host. It follows one journey: create an Actor, remove its chat, come
back to it, then add a second Actor and let the two talk. It uses nothing but the
ACTORS tree, the chat and the Actors' own files.

The User validates the first and third criterion. The second criterion
(``AC_ACTOR_PHASE1_SECOND``) is technical verification by the Tester or Quality: it
checks separate ACTORS entries, chat routing and separate context files, and the
Contract names it in Quality's Test Execution, not in User validation. Creating the
second Actor stays setup for the third criterion.

.. ac:: Actor keeps its memory when its chat session is deleted
   :id: AC_ACTOR_PHASE1_MEMORY
   :status: verified
   :validates: US_ACTOR_CREATE; US_ACTOR_ACTORS

   **Given** an empty ACTORS tree, and an Actor created with the "+" button in
   its title bar under a new name (for example ``Alpha``), whose ``context.md``
   the tester has extended with a special word that appears nowhere else (for
   example ``pelican-42``), and whose chat session is open
   **When** the tester deletes the chat session of Alpha, then reopens Alpha from
   its node in the ACTORS tree and asks the new chat for the special word
   **Then** the Actor is still listed under the same name, the reopened chat is
   a new session, and it answers with the special word from ``context.md``.

.. ac:: A second Actor appears next to the first with its own memory
   :id: AC_ACTOR_PHASE1_SECOND
   :status: verified
   :validates: US_ACTOR_CREATE

   **Given** the Actor Alpha from the previous criterion
   **When** the tester creates a second Actor with the "+" button under another
   name (for example ``Beta``)
   **Then** both Actors are listed in the ACTORS tree, each node opens its own
   chat, and Beta's ``context.md`` does not contain Alpha's special word.

.. ac:: One Actor sends a message to the other
   :id: AC_ACTOR_PHASE1_MESSAGE
   :status: verified
   :validates: US_COM_SEND; US_COM_DELIVERY

   **Given** the Actor Alpha from the first criterion, and a second Actor Beta created
   with the "+" button under another name, each with an open chat
   **When** the tester asks Alpha to send Beta a message with a short text, and
   then asks Beta to read its waiting messages
   **Then** Beta reports the message with the text and with Alpha as the sender,
   and a second read by Beta finds no waiting message.
