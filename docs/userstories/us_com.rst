Actor Communication User Stories
================================

.. story:: Actors Send and Receive Messages
   :id: US_COM_SEND
   :status: approved
   :priority: mandatory

   **As an** Actor,
   **I want** to send messages to other Actors and to receive messages sent to
   me,
   **so that** Actors can coordinate their work without the User relaying every
   message.

   **Acceptance Criteria:**

   * AC-1: An Actor can send a message to another Actor. The message waits for
     the receiver until the receiver has read it.
   * AC-2: A message reaches its receiver even when the receiver is not
     working at that moment.
   * AC-3: An Actor reads its waiting messages oldest first. A message that
     has been read is no longer waiting.
   * AC-4: Waiting messages survive a restart of the environment.
   * AC-5: The User can see which Actors have messages waiting and how many.
   * AC-6: The User can delete a waiting message.


.. story:: Messages Name Their Sender and Fail Visibly When Misaddressed
   :id: US_COM_SENDER
   :status: approved
   :priority: mandatory

   **As an** Actor or the User,
   **I want** every message to name its true sender, and a message to an
   unknown recipient to fail visibly,
   **so that** I can trust who a message is from and am never led to believe
   that a lost message was delivered.

   **Acceptance Criteria:**

   * AC-1: Every message shows who sent it. That is the one that really sent it,
     never one that the sending Actor only claims to be.
   * AC-2: Sending to an unknown receiver fails with an error that names the
     offending value and lists the valid ones. Nothing is queued.


.. story:: Actors Find Other Actors
   :id: US_COM_FIND
   :status: approved
   :priority: required

   **As an** Actor,
   **I want** to find out which other Actors exist,
   **so that** I can address them without asking the User.

   **Acceptance Criteria:**

   * AC-1: An Actor can obtain the Actors it can address, each with its name
     and a short description.


.. story:: Messages Cannot Pose as the User
   :id: US_COM_AUTHORITY
   :status: approved
   :priority: mandatory

   **As the** User,
   **I want** an Actor to be able to tell messages from other Actors apart from
   my own instructions,
   **so that** no message can give an Actor orders in my name.

   **Acceptance Criteria:**

   * AC-1: For everything that reaches an Actor, the Actor can tell whether it
     is an instruction of the User or the content of a message from another
     Actor.
   * AC-2: The content of a message never reaches an Actor as if the User had
     written it. In the User's voice an Actor is told at most that messages are
     waiting.


.. story:: The User Controls Whether Messages Make Actors Act
   :id: US_COM_DELIVERY
   :status: approved
   :priority: required

   **As the** User,
   **I want** to control whether an incoming message only waits for an Actor or
   also tells the Actor that it is waiting,
   **so that** I decide when my Actors start working on their own.

   **Acceptance Criteria:**

   * AC-1: A message can be stored without telling the Actor. It then waits
     until the Actor looks for it or the User asks the Actor to.
   * AC-2: A message can instead be stored and the Actor told that it is
     waiting. The Actor then handles it without the User acting.
   * AC-3: The setting survives a restart.


.. story:: The User Can Follow Every Delivery and Review the History
   :id: US_COM_HISTORY
   :status: approved
   :priority: optional

   **As the** User,
   **I want** to see every delivery and to review the history of all messages,
   **so that** I can follow what my Actors tell each other, also after the
   messages have been read or deleted.

   **Acceptance Criteria:**

   * AC-1: For every delivery the User can tell whether the receiving Actor was
     told that a message was waiting.
   * AC-2: Every message sent is kept in a history that reading or deleting a
     message never shortens.
   * AC-3: The User can find, back up and clear the history together with the
     other message data.
   * AC-4: Keeping the history is the User's choice. It is off by default.
   * AC-5: A delivery that did not reach the Actor is never silent: the User
     can find out from the record that it did not.


.. story:: An Actor's Chat Is Recognisable
   :id: US_COM_NAME
   :status: approved
   :priority: required

   **As the** User,
   **I want** an Actor's chat to carry the Actor's name from the moment it
   exists,
   **so that** I always know whose chat I am looking at.

   **Acceptance Criteria:**

   * AC-1: A new chat of an Actor carries the Actor's name immediately.
   * AC-2: Opening an Actor finds its existing chat instead of creating a second
     one.
   * AC-3: When a chat is created for an Actor, the Actor knows who it is and
     where its memory is before it handles anything else (``US_ACTOR_ACTORS``
     AC-7).
