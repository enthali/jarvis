Acceptance Criteria
===================

Acceptance criteria are the things a person must observe and judge by hand. They
are Needs of type `ac`, each linked to the story it validates; the rules are in
the Jarvis Ontology. Deterministic checks and corner cases belong to the
requirement-level tests, not here.

Where to run the procedures
---------------------------

Use the VS Code editor with the Extension Development Host and the fixtures
named in each procedure. The Windows Sandbox is an option on Windows, not
a prerequisite for the procedures below. These groups describe prerequisites,
not pass records.

* **Windows with Outlook Classic:** :doc:`ac_actor_mail` and
  :doc:`ac_outlookcategories`. The mail icon procedure also uses the
  Windows-only Recorder.
* **Windows or Linux with PowerShell in the extension host environment:**
  :doc:`ac_heartbeat` and :doc:`ac_heartbeat_pause`. The full Heartbeat
  procedure also needs Python and an available agent model. If using a
  Codespace, install the runtimes there rather than on the client machine.
* **Windows or Linux, including a Codespace with the stated setup:**
  :doc:`ac_listjobs`, :doc:`ac_kanban_lanes`, :doc:`ac_mcpserver`, :doc:`ac_mod_actorrules`,
  :doc:`ac_selfupdate`, :doc:`ac_skill_provisioning` and
  :doc:`ac_tree_node_open_file`. For MCP, the client must be able to reach
  the endpoint from the host where it is listening.
* **Use a desktop setup with an authenticated agent and working Actor
  chats for the full journey:** :doc:`ac_actor_identity`,
  :doc:`ac_actor_phase1`, :doc:`ac_autodelivery`, :doc:`ac_flow`,
  :doc:`ac_kanban_mgmt`, :doc:`ac_kanban_skill`, :doc:`ac_kanban_update_valid`,
  :doc:`ac_messagelogging`, :doc:`ac_msgqueue` and :doc:`ac_reminders`.
  These procedures do not require a Windows-only component, but depend on
  opening or using Actor chats and, in some cases, receiving messages.
  The Codespaces check verified Agent Host discovery and outbound messaging,
  not these full journeys.

.. toctree::
   :glob:
   :hidden:

   ac_*

All Acceptance Criteria
-----------------------

.. needlist::
   :types: ac
