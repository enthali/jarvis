Configuration Design Specifications
=====================================

.. spec:: VS Code Settings for Folder Paths and Scan Interval
   :id: SPEC_CFG_SETTINGS
   :status: implemented
   :links: REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL

   **Description:**
   Add a ``contributes.configuration`` block to ``package.json``:

   .. code-block:: json

      {
        "jarvis.projectsFolder": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the folder containing project YAML files."
        },
        "jarvis.eventsFolder": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the folder containing event YAML files."
        },
        "jarvis.scanInterval": {
          "type": "number",
          "default": 120,
          "minimum": 20,
          "description": "Background scan interval in seconds (minimum 20)."
        }
      }

   <!-- Implementation: SPEC_CFG_SETTINGS -->
   <!-- Requirements: REQ_CFG_FOLDERPATHS, REQ_CFG_SCANINTERVAL -->
