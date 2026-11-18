Product Structure
=================

The product structure is the entry point of the specification graph. The single
Root stands for the Jarvis VS Code extension as a product. Each module is one
capability of it. Every User Story names exactly one module with ``:tracked_by:``,
so a change is located by reading the Root, choosing the modules it touches, and
starting the impact analysis from their stories. A functional dependency between
modules is stated on the dependent story with ``:relates_to:``, not by placing a
story in two modules. The rules are in the Jarvis Ontology.

.. root:: Jarvis VS Code Extension
   :id: ROOT_JARVIS
   :status: approved

   The Jarvis VS Code extension: Actors with their own identity and memory,
   messaging and automation between them, the modules that connect Jarvis to Kanban,
   Outlook and meetings, and the packaging and release of all of it. Every module
   below is part of this one product.

Modules
-------

.. mod:: Actor
   :id: MOD_ACTOR
   :status: approved
   :tracked_by: ROOT_JARVIS

   The Actor as an entity (identity, creation, chat session, context) and how it
   is shown and operated in the Jarvis Explorer: the ACTORS tree, its node marks,
   context actions and file children, and opening source files from tree nodes.

.. mod:: Messaging
   :id: MOD_MESSAGING
   :status: approved
   :tracked_by: ROOT_JARVIS

   Messages between Actors and from external tools: sending, addressing and
   sender identity, delivery and its control, the audit log and history, the MCP
   server for external tools, and editor-group placement of delivered chats.

.. mod:: Automation
   :id: MOD_AUTOMATION
   :status: approved
   :tracked_by: ROOT_JARVIS

   Time-driven and manual work for Actors: heartbeat jobs and agent steps (with
   their model choice and destination validation) and time-scheduled reminders.

.. mod:: Configuration
   :id: MOD_CONFIG
   :status: approved
   :tracked_by: ROOT_JARVIS

   How Jarvis is configured and where it keeps its files: settings groups and
   per-feature toggles, fixed runtime paths, the runtime file layout, the
   identifiable Jarvis-owned workspace files and the automatically maintained
   ignore entries.

.. mod:: Kanban
   :id: MOD_KANBAN
   :status: approved
   :tracked_by: ROOT_JARVIS

   Convention-based Kanban boards kept as YAML: the board view, board discovery,
   the board tools for Actors, queries on a board, the skill and its content,
   and named freeform text fields.

.. mod:: PIM
   :id: MOD_PIM
   :status: approved
   :tracked_by: ROOT_JARVIS

   Personal information management through exchangeable providers: category
   synchronisation and its tool and view, task synchronisation, and the Outlook
   COM bridge that serves as the Outlook provider.

.. mod:: Recorder
   :id: MOD_RECORDER
   :status: approved
   :tracked_by: ROOT_JARVIS

   Meeting recording for an Actor: capture, enabling the feature, the transcript
   during and after the meeting, and notifying the Actor of a new transcript.

.. mod:: Flow
   :id: MOD_FLOW
   :status: approved
   :tracked_by: ROOT_JARVIS

   The views that make message traffic visible: the message flow chord diagram
   and the message log viewer.

.. mod:: Distribution
   :id: MOD_DISTRIBUTION
   :status: approved
   :tracked_by: ROOT_JARVIS

   How Jarvis reaches its users and stays current: modular installation and
   readiness, Copilot asset provisioning, packaged behavioural rules, tool
   naming, the package contract, versioning, release, self-update, release
   notes, marketplace presence, legacy retirement, and documentation publishing.

.. mod:: Development
   :id: MOD_DEV
   :status: approved
   :tracked_by: ROOT_JARVIS

   How Jarvis itself is developed: manual extension testing, developer
   conventions, structured logging and the Git branch and merge workflow.
