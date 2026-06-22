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
