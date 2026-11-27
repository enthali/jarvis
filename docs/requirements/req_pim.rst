PIM Requirements
================

.. req:: Category Provider Interface (Strategy Pattern)
   :id: REQ_PIM_PROVIDER
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES

   **Description:**
   The extension SHALL define a common ``ICategoryProvider`` interface that all
   category sources implement. The interface enables a Strategy Pattern where
   providers are interchangeable and new sources can be added without modifying
   the orchestration layer.

   **Acceptance Criteria:**

   * AC-1: The interface SHALL define ``source: string`` — a unique identifier
     for the provider
   * AC-2: The interface SHALL define ``getCategories(): Promise<Category[]>``
     to read all categories from the source
   * AC-3: The interface SHALL define
     ``setCategory(name: string, color: number): Promise<void>`` to create or
     update a category
   * AC-4: The interface SHALL define
     ``deleteCategory(name: string): Promise<void>`` to remove a category
   * AC-5: The interface SHALL define
     ``renameCategory(oldName: string, newName: string): Promise<void>`` to
     rename a category
   * AC-6: Each ``Category`` object SHALL carry a ``source`` tag identifying
     which provider supplied it
   * AC-7: Each ``Category`` object MAY carry an optional ``id`` field
     containing the provider-specific unique identifier; operations (delete,
     rename) SHALL prefer ``id`` over ``name`` when available


.. req:: Generic Domain Cache
   :id: REQ_PIM_CACHE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES; REQ_AUT_SCHEDULER

   **Description:**
   The extension SHALL provide a generic ``DomainCache<T>`` mechanism for
   in-memory caching of domain data (starting with categories). The cache SHALL
   be refreshable via the heartbeat scheduler.

   **Acceptance Criteria:**

   * AC-1: The cache SHALL expose ``get(): T | undefined`` to retrieve cached data
   * AC-2: The cache SHALL expose ``invalidate(): void`` to clear cached data
   * AC-3: The cache SHALL expose ``refresh(): Promise<T>`` to reload data from
     the source and update the cache
   * AC-4: Cache refresh SHALL be triggerable via a heartbeat job at the
     configured scan interval
   * AC-5: The cache SHALL be generic (``DomainCache<T>``) so it can be reused
     for future PIM domains (Tasks, Calendar, Contacts)


.. req:: Category Service
   :id: REQ_PIM_SERVICE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATEGORIES; REQ_PIM_PROVIDER; REQ_PIM_CACHE

   **Description:**
   The extension SHALL provide a ``CategoryService`` that manages an array of
   category providers and a domain cache, orchestrating fan-out writes and
   merged reads.

   **Acceptance Criteria:**

   * AC-1: The service SHALL manage one or more ``ICategoryProvider`` instances
   * AC-2: ``get`` operations SHALL return cached data; cache-miss SHALL trigger
     a cache refresh from all providers, merging results
   * AC-3: ``set`` without ``provider`` parameter SHALL broadcast to all
     providers; with ``provider`` SHALL target only the named provider
   * AC-4: ``delete`` without ``provider`` parameter SHALL broadcast to all
     providers; with ``provider`` SHALL target only the named provider
   * AC-5: ``rename`` without ``provider`` parameter SHALL broadcast to all
     providers; with ``provider`` SHALL target only the named provider
   * AC-6: After ``set``, ``delete``, or ``rename``, the cache SHALL be
     invalidated so the next ``get`` fetches fresh data
   * AC-7: The service SHALL own the cache — providers are stateless


.. req:: Category Management Tool (LM/MCP)
   :id: REQ_PIM_CATTOOL
   :status: implemented
   :priority: mandatory
   :links: US_PIM_CATTOOL; REQ_PIM_SERVICE; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL register a ``jarvis_category`` tool available via
   both Language Model API and MCP server for programmatic category management.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``action: "get" | "set" | "delete" | "rename"``
   * AC-2: The tool SHALL accept optional ``name`` (string), ``filter``
     (string), ``provider`` (string), ``oldName`` (string), and ``newName``
     (string) parameters
   * AC-3: ``get`` without filter SHALL return all categories from cache; with
     filter SHALL return categories matching the prefix or source
   * AC-4: ``set`` SHALL create or update a category via ``CategoryService``
   * AC-5: ``delete`` SHALL remove a category via ``CategoryService``
   * AC-6: ``rename`` SHALL rename a category via ``CategoryService``;
     requires both ``oldName`` and ``newName`` parameters
   * AC-7: The tool SHALL NOT enforce naming conventions — that is the caller's
     responsibility
   * AC-8: The tool SHALL be registered once through the engine's tool registry
     (``SPEC_ENG_REGISTER_TOOL``); MCP availability follows from that registry
     (``SPEC_MOD_MCP_PKG``) without a tool-specific MCP registration
   * AC-9: When no category providers are configured (this includes
     ``jarvis.outlook.categories.enabled`` being ``false``), the tool SHALL
     return an informational error message that names the settings
     ``jarvis.outlook.enabled`` and ``jarvis.outlook.categories.enabled``


.. req:: Categories Sidebar Tree View
   :id: REQ_PIM_CATVIEW
   :status: approved
   :priority: optional
   :links: US_PIM_CATVIEW; REQ_PIM_SERVICE; REQ_EXP_TREEVIEW; REQ_OLK_CATENABLE

   **Description:**
   The extension SHALL provide a "Categories" tree view in the Jarvis sidebar
   displaying all cached categories from all configured providers.

   **Acceptance Criteria:**

   * AC-1: A "Categories" tree view SHALL appear in the Jarvis sidebar as the
     5th section while ``jarvis.outlook.enabled`` and
     ``jarvis.outlook.categories.enabled`` are both ``true``
   * AC-2: Each category SHALL be displayed as a leaf node with its name and
     source tag
   * AC-3: A refresh button (``$(refresh)``) in the title bar SHALL trigger an
     immediate cache refresh
   * AC-4: The view SHALL be controlled by ``jarvis.outlook.categories.enabled``
     (default: ``false``) under the master switch ``jarvis.outlook.enabled``
     (``REQ_OLK_CATENABLE``)
   * AC-5: When no providers are configured, the view SHALL display
     "no categories"
   * AC-6: The ``when``-clause SHALL be:
     ``config.jarvis.outlook.enabled == true && config.jarvis.outlook.categories.enabled == true``
   * AC-7: A context menu on category nodes (``contextValue: jarvisCategory``)
     SHALL offer "Rename Category" — opening an input box pre-filled with
     the current name, then renaming via ``CategoryService``
   * AC-8: A context menu on category nodes SHALL offer "Delete Category" —
     showing a confirmation dialog, then deleting via ``CategoryService``
   * AC-9: Both context menu commands SHALL be hidden from the Command Palette


.. req:: Task Provider Interface (Strategy Pattern)
   :id: REQ_PIM_TASKPROVIDER
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS

   **Description:**
   The extension SHALL define a common ``ITaskProvider`` interface that all
   task sources implement, enabling a Strategy Pattern for interchangeable
   task providers.

   **Acceptance Criteria:**

   * AC-1: The interface SHALL define ``source: string`` — a unique provider
     identifier
   * AC-2: The interface SHALL define ``getTasks(): Promise<Task[]>`` to read
     all tasks from the source
   * AC-3: The interface SHALL define ``setTask(task: Partial<Task>): Promise<Task>``
     to create a new task
   * AC-4: The interface SHALL define
     ``modifyTask(id: string, changes: Partial<Task>): Promise<void>``
     to update an existing task
   * AC-5: The interface SHALL define ``deleteTask(id: string): Promise<void>``
     to remove a task
   * AC-6: The ``Task`` model SHALL include: ``id`` (string), ``subject``
     (string), ``dueDate?`` (ISO date string), ``status`` (enum of 5 values),
     ``priority`` (enum of 3 values), ``isComplete`` (boolean), ``completedDate?``
     (read-only string), ``body?`` (optional string, on-demand only),
     ``categories`` (string[]), and ``source`` (string)
   * AC-7: ``completedDate`` SHALL be read-only — it is a side-effect of
     setting ``isComplete: true``; providers MUST NOT accept direct writes to it


.. req:: Task Service + Domain Cache
   :id: REQ_PIM_TASKSERVICE
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKPROVIDER; REQ_PIM_CACHE

   **Description:**
   The extension SHALL provide a ``TaskService`` that manages an array of task
   providers and a ``DomainCache<Task[]>``.

   **Note (v1):** ``setTask`` / ``modifyTask`` / ``deleteTask`` target the **first
   registered provider only**. Multi-provider fan-out will be introduced when a
   second ``ITaskProvider`` is added.

   **Acceptance Criteria:**

   * AC-1: The service SHALL manage one or more ``ITaskProvider`` instances
   * AC-2: ``getTasks(filter?)`` SHALL return cached data; cache-miss SHALL
     trigger a refresh; filters: ``category`` (string), ``status`` (string),
     ``dueBefore`` (ISO date string)
   * AC-3: ``setTask`` / ``modifyTask`` / ``deleteTask`` SHALL delegate to the
     **first registered provider** and immediately call ``cache.invalidate()`` + ``cache.refresh()``
     (single-provider by design in v1; multi-provider fan-out deferred)
   * AC-4: The service SHALL expose ``hasProviders(): boolean``
   * AC-5: Cache refresh SHALL be schedulable via a ``syncTaskRefreshJob()``
     helper (analogous to ``syncCategoryRefreshJob()``) that registers a
     ``"Jarvis: Task Refresh"`` heartbeat job when providers are available and
     ``scanInterval > 0``


.. req:: Task Editor (Custom Editor)
   :id: REQ_PIM_TASKEDITOR
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKSERVICE

   **Description:**
   The extension SHALL provide a ``TaskEditorProvider`` that opens a Custom
   Editor when the user clicks a task tree node, enabling inline task editing.

   **Acceptance Criteria:**

   * AC-1: The editor SHALL be a VS Code Custom Editor (``CustomEditorProvider``),
     NOT a Webview panel
   * AC-2: Editable fields: ``subject`` (text input), ``body`` (textarea),
     ``dueDate`` (date picker — leaving empty is supported; clearing an existing
     date is not supported in v1), ``status`` (dropdown), ``priority`` (dropdown),
     ``categories`` (multi-select from ``CategoryService.getCategories()`` cache)
   * AC-3: Read-only display fields: ``source`` (provider badge),
     ``completedDate`` (shown as read-only text whenever the task is completed,
     displaying ``—`` when the completed date value is empty)
   * AC-4: An "Open in Outlook" button is **not implemented in v1**; task
     editing stays entirely inside the VS Code custom editor
   * AC-5: Field changes SHALL auto-save via ``TaskService.modifyTask()`` →
     provider → cache invalidate + immediate refresh; ``status``, ``priority``,
     ``dueDate``, and ``categories`` save immediately on DOM ``change``;
     ``subject`` and ``body`` use a 300 ms debounce on DOM ``input``


.. req:: Task Management Tool (LM/MCP)
   :id: REQ_PIM_TASKTOOL
   :status: implemented
   :priority: mandatory
   :links: US_PIM_TASKS; REQ_PIM_TASKSERVICE; REQ_MSG_MCPSERVER

   **Description:**
   The extension SHALL register a ``jarvis_task`` tool available via both
   Language Model API and MCP server for programmatic task management.

   **Acceptance Criteria:**

   * AC-1: The tool SHALL accept ``action: "get" | "set" | "modify" | "delete"``
   * AC-2: ``get`` SHALL accept optional ``category`` (string), ``status``
     (string), ``dueBefore`` (ISO date), and ``includeBody`` (boolean,
     default ``false``) parameters
   * AC-3: ``set`` SHALL accept ``subject``, ``body``, ``dueDate``, ``priority``,
     ``isComplete``, ``categories``, and optional ``provider`` parameters;
     **due date deletion (setting to empty) is not supported in v1** — the field
     can only be set or changed, not cleared
   * AC-4: ``modify`` SHALL accept ``id`` (required) plus any subset of the
     writable ``Task`` fields; ``completedDate`` SHALL be rejected if supplied
   * AC-5: ``delete`` SHALL accept ``id`` (required)
   * AC-6: Without ``provider`` the operation targets the **first registered provider**
     (single-provider by design in v1); multi-provider fan-out is deferred
   * AC-7: The tool SHALL be registered once through the engine's tool registry
     (``SPEC_ENG_REGISTER_TOOL``); MCP availability follows from that registry
     (``SPEC_MOD_MCP_PKG``) without a tool-specific MCP registration
   * AC-8: When no task providers are configured, the tool SHALL return an
     informational error message


.. req:: Mail Indicators on Actor Nodes
   :id: REQ_ACTOR_MAIL
   :status: implemented
   :priority: optional
   :links: US_ACTOR_MAIL; REQ_ACTOR_TREE; REQ_COM_STATE; REQ_ENG_ACTORMARK; REQ_ENG_ACTORINDICATOR; REQ_ENG_ACTORLIST; REQ_OLK_ENABLE; REQ_CFG_SCANINTERVAL; REQ_EXP_REACTIVECACHE

   **Description:**
   While ``jarvis.outlook.enabled`` is ``true``, the PIM add-on SHALL show on an Actor node a flag
   icon when the Outlook mail folder of the same name, directly under the Inbox, holds mail with a
   pending follow-up flag, and a mail icon when it holds unread mail and no pending follow-up flag.
   PIM supplies the icons through the indicator API of the core (``REQ_ENG_ACTORINDICATOR``); the
   core itself neither reads Outlook mail nor shows these icons. The state is read after each
   completed scan of the ACTORS view and is kept only as the indicator PIM set on each Actor. The
   icons take their place in the priority order of AC-6.

   **Acceptance Criteria:**

   * AC-1: An icon SHALL be shown on the Actor whose ``name`` (``REQ_ACTOR_TREE`` AC-3)
     equals the name of an Outlook folder that is a direct child of the Inbox of the default
     mail store.
   * AC-2: The name comparison SHALL be exact and case-sensitive, as the name rule of
     ``REQ_ACTOR_SCHEMA`` AC-7. Folders nested deeper than one level below the Inbox SHALL NOT
     be considered.
   * AC-3: When two or more Actors carry the same name (``REQ_ACTOR_SCHEMA`` AC-7), no Actor
     with that name SHALL show an icon.
   * AC-4: The mail icon SHALL be shown while that folder holds at least one unread item and no
     pending follow-up flag (AC-13). A folder without unread items SHALL NOT show the mail icon.
   * AC-5: The state SHALL be read once when PIM activates, after every completed scan of the
     ACTORS view (``REQ_ENG_ACTORLIST`` AC-6), whether or not the Actor list changed: the periodic
     background rescan (``REQ_CFG_SCANINTERVAL``), the manual rescan (``REQ_ACTOR_TREE`` AC-7) and
     the other scans. It SHALL also be read after a change of ``jarvis.outlook.enabled``, which
     takes effect without a window reload. Between these reads the icons SHALL NOT change. No
     Outlook event SHALL be subscribed, and no mail state SHALL be kept beyond the indicator set
     on each Actor. The tree SHALL be refreshed only when an indicator is set or removed, and an
     unchanged read SHALL set or remove none (``REQ_EXP_REACTIVECACHE`` AC-4).
   * AC-6: An Actor node SHALL show at most one icon, by this priority: the activity
     state of the chat other than Idle (``REQ_COM_STATE`` AC-5), then the mark of a
     recording (red, ``REQ_REC_BUTTON`` AC-3), then the follow-up flag icon, then the unread-mail
     icon (``REQ_ENG_ACTORINDICATOR`` AC-2). Without any of them the node shows no icon.
   * AC-7: Each source keeps its own entry. When a higher-priority icon ends, the next one still
     present SHALL be shown at the next tree refresh, and the node SHALL NOT be left without an
     icon while a lower-priority icon still applies.
   * AC-8: The feature SHALL only read Outlook. It SHALL NOT mark mail as read or unread, set,
     complete or clear a flag, change, move or send mail, or change any folder.
   * AC-9: The feature SHALL NOT start Outlook. An Outlook that is not running is treated as
     not readable (AC-10).
   * AC-10: When Outlook cannot be read (the platform is not Windows, Outlook is not running,
     Outlook reports an error, or the read does not finish in time), no Actor SHALL show a mail
     or flag icon, the failure SHALL be written to the log, and no message SHALL be shown to the
     user.
   * AC-11: While ``jarvis.outlook.enabled`` is ``false``, no Outlook call SHALL be made for the
     mail icons and none SHALL be shown (``REQ_OLK_ENABLE`` AC-2).
   * AC-12: The icons SHALL NOT alter any other Actor-node behavior (label, click command,
     context menu, children).
   * AC-13: An Actor whose folder holds at least one mail with a pending follow-up flag, whether
     that mail is read or unread, SHALL show the flag icon instead of the mail icon. A flag that is
     completed or cleared SHALL NOT count as pending.
   * AC-14: When the last pending follow-up flag of the folder ends, the next read SHALL show the
     mail icon while unread mail remains and no icon otherwise (AC-6 applies).
   * AC-15: The core SHALL NOT read Outlook mail or decide which Actors have mail. Without PIM no
     Actor node SHALL show a mail or flag icon. PIM SHALL use only ``listActors``,
     ``onDidScanActors`` and ``indicateActor`` of the core API for this feature; when the core
     lacks one of the two new members, PIM SHALL log it and show no icon.
   * AC-16: PIM SHALL hold at most one indicator per Actor. Disabling the integration, deactivating
     PIM, and an Actor that no longer qualifies SHALL remove its indicator, and repeated reads
     SHALL NOT leave duplicates.
   * AC-17: The follow-up lookup SHALL NOT prevent the unread state from being supplied in time.
     It SHALL run only for folders whose name matches exactly one Actor and SHALL stay within a time
     budget shorter than the limit of the whole read (AC-10). A lookup that is skipped or fails
     SHALL count as no pending flag and the unread state SHALL still be supplied, with one log
     line for the read.
   * AC-18: Actor names SHALL reach the Outlook read as data and SHALL NOT be concatenated into
     the text of the script that runs it.
   * AC-19: PIM SHALL activate once the window has finished starting, without any PIM view having
     been opened, so that the indicators appear without further action by the User.
