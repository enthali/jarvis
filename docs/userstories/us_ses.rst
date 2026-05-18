Sessions User Stories
=====================

.. story:: Sessions Entity Type
   :id: US_SES_SESSIONS
   :status: implemented
   :priority: required

   **As a** Jarvis user,
   **I want** a 'Sessions' entity type — a lightweight project alternative with
   just ``name`` and ``summary`` — so that I can track Copilot agent sessions,
   dev work sessions, and other short-lived contexts without the heavyweight
   Project schema.

   **Acceptance Criteria:**

   * AC-1: A ``jarvis.sessions.enabled`` boolean setting (default: true) gates
     the Sessions feature. Sessions are discovered under the fixed path
     ``<workspaceRoot>/.jarvis/sessions/`` (no folder setting). When
     disabled, no Sessions tree, commands, or tools are active.
   * AC-2: A Sessions tree view appears in the Jarvis Explorer sidebar when
     enabled, listing all session entities alphabetically by name. Each leaf
     node has ``contextValue`` ``jarvisSession``.
   * AC-3: A ``session.yaml`` schema with exactly ``name`` (required) and
     ``summary`` (optional) fields is recognized by the YAML scanner. A JSON
     Schema is provided for editor validation.
   * AC-4: The existing ``jarvis.openContext`` command works on session tree
     nodes and opens the ``context.md`` file adjacent to ``session.yaml``.
   * AC-5: A new LM+MCP tool ``jarvis_listSessionEntities`` returns the list of
     session entities (``name``, ``summary``, ``folder``). It is distinct from
     ``jarvis_listSessions``, which lists chat sessions.
   * AC-6: The existing ``jarvis.newEntity`` command supports session creation
     as a third option alongside Project and Event. It creates a folder with
     ``session.yaml`` and an empty ``context.md`` under the fixed path
     ``<workspaceRoot>/.jarvis/sessions/`` (created on demand).
   * AC-7: The Sessions feature is independent of the Projects and Events
     features — it can be active when both are disabled.
   * AC-8: Session tree nodes expose the same context-menu actions as Project
     and Event nodes (Open Context, Open Agent Session, Reveal in Explorer,
     Reveal in OS, Open in Terminal).
   * AC-9: Opening a new agent session for any entity kind sends a kind-aware
     identity prompt naming the entity and its ``context.md`` path.
