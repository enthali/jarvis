Modular Delivery User Stories
=============================

.. story:: Install Only the Capabilities I Need
   :id: US_MOD_INSTALL
   :status: approved
   :priority: required

   **As a** Jarvis user,
   **I want** to install only the capabilities I need — a lean core
   (sessions, messaging, reminders, heartbeat) with optional capability add-ons,
   **so that** my workspace isn't cluttered with views, settings, and tools I
   don't use.

   **Context:**
   Today everything ships in one extension. A user who only wants agent
   coordination still carries PIM (email/tasks/calendar/categories), the
   recorder, and MCP — with their views, settings, and tools present in the
   workspace. Splitting Jarvis into a kind-agnostic core plus opt-in add-ons
   lets a user install just the core and add the rest on demand, exactly as they
   would install any extension. Concrete add-ons (PIM, recorder, MCP) are
   identified at the requirement/specification level.

   **Acceptance Criteria:**

   * AC-1: Installing the core alone provides sessions, messaging, reminders,
     and heartbeat, fully functional.
   * AC-2: With the core alone, there is **zero** surface for any uninstalled
     add-on — no views, settings, commands, or tools for features that are
     not installed.
   * AC-3: Optional capability add-ons can be installed on top of the core to
     light up their respective features.
   * AC-4: Each add-on works independently — installing one does not require
     another (except the core dependency).
   * AC-5: Existing users keep their data and current workflows across the
     transition — no manual migration of entities, messages, or settings.
   * AC-6: Each capability bundle is a separately installable extension; the
     add-ons depend on the core and cannot be installed without it.
   * AC-7 (``module-skill-provisioning`` CR): When a module ships bundled Copilot
     Skill or Instructions assets, installing the module places those assets in
     the workspace's ``.github/`` tree automatically — no manual setup required.


.. story:: Module Copilot Asset Self-Provisioning
   :id: US_MOD_SKILL_PROVISION
   :status: approved
   :priority: required
   :links: US_MOD_INSTALL

   **As a** Jarvis user who installs a module,
   **I want** that module's bundled Copilot Skill and Instructions files
   automatically placed in my workspace's ``.github/skills/`` and
   ``.github/instructions/`` on activation — and kept current as I update
   the module —
   **so that** I get the right AI guidance without any manual setup.

   **Context:**
   Today, Copilot Skills and Instructions for Jarvis modules must either be
   hand-authored per-repo or installed via the syspilot manual installer agent
   (which is syspilot-specific). This story covers the runtime primitive:
   a module bundles its own AI guidance assets inside its VSIX and
   self-installs them from there — no network fetch, no user action.

   **Acceptance Criteria:**

   * AC-1: On activation, a module that ships bundled Skill and/or Instructions
     assets writes them into the workspace's ``.github/skills/`` and
     ``.github/instructions/`` without requiring any user action.
   * AC-2: Only the installing module's own namespaced assets are ever written
     or removed — user-authored files and other modules' files are never touched.
   * AC-3: If the module has been updated and a previously-bundled asset no
     longer exists in the new bundle, that asset is removed from the workspace
     on next activation (no orphans).
   * AC-4: Running activation again with identical bundle content produces no
     writes and no removals (idempotent).
   * AC-5: If no workspace folder is open, no action is taken and no error is
     surfaced to the user.
   * AC-6: Where a module chooses to make provisioning optional, turning it off
     removes the files that module previously installed, and turning it back on
     restores them on the next activation.
