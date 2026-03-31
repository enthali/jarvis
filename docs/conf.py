# Configuration file for the Sphinx documentation builder.
# Jarvis - VS Code Extension
#
# https://www.sphinx-doc.org/en/master/usage/configuration.html

import os
import sys

# -- Project information -----------------------------------------------------

project = 'Jarvis'
copyright = '2026, Jarvis Contributors'
author = 'Jarvis Contributors'
release = '0.1.0'

# -- General configuration ---------------------------------------------------

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.intersphinx',
    'sphinx.ext.todo',
    'sphinx.ext.graphviz',
    'sphinx_needs',
    'myst_parser',
]

html_show_sourcelink = False

templates_path = ['_templates']
exclude_patterns = [
    '_build',
    'Thumbs.db',
    '.DS_Store',
    '.venv',
    'venv',
    'changes/*',
]

# -- Options for HTML output -------------------------------------------------

html_theme = 'furo'
html_static_path = ['_static']
html_title = 'Jarvis'

# -- Sphinx-Needs Configuration ----------------------------------------------
# https://sphinx-needs.readthedocs.io/

needs_types = [
    # User Stories - WHY (Stakeholder perspective)
    dict(
        directive="story",
        title="User Story",
        prefix="US_",
        color="#E8D5B7",
        style="node"
    ),
    # Requirements - WHAT (System behavior)
    dict(
        directive="req",
        title="Requirement",
        prefix="REQ_",
        color="#BFD8D2",
        style="node"
    ),
    # Design Specifications - HOW (Technical approach)
    dict(
        directive="spec",
        title="Design Specification",
        prefix="SPEC_",
        color="#FEDCD2",
        style="node"
    ),
    # Implementation - WHERE (Code location)
    dict(
        directive="impl",
        title="Implementation",
        prefix="IMPL_",
        color="#DF744A",
        style="node"
    ),
    # Test Cases - VERIFY (Validation)
    dict(
        directive="test",
        title="Test Case",
        prefix="TEST_",
        color="#DCB239",
        style="node"
    ),
]

# Extra options for needs
needs_extra_options = [
    "priority",
    "rationale",
    "acceptance_criteria",
]

# Status options
needs_statuses = [
    dict(name="draft", description="Draft - Work in progress"),
    dict(name="open", description="Open - Identified but not yet started"),
    dict(name="approved", description="Approved - Ready for implementation"),
    dict(name="implemented", description="Implemented - Code exists"),
    dict(name="verified", description="Verified - Tested and validated"),
    dict(name="deprecated", description="Deprecated - No longer used"),
]

# Priority options
needs_priority = [
    dict(name="mandatory", description="Must have - Critical requirement"),
    dict(name="high", description="Should have - Important requirement"),
    dict(name="medium", description="Could have - Nice to have"),
    dict(name="low", description="Won't have this time - Future consideration"),
]

# Require explicit IDs
needs_id_required = True

# Configure needs file output
needs_build_json = True
needs_build_json_per_id = True

# Use Graphviz for needflow diagrams
needs_flow_engine = "graphviz"

# Configure needflow to use SVG
needs_flow_configs = {
    'needflow': {
        'engine': 'dot',
        'format': 'svg',
    }
}

# -- MyST Parser Configuration -----------------------------------------------
# https://myst-parser.readthedocs.io/

myst_enable_extensions = [
    "colon_fence",
    "deflist",
    "html_image",
]

# -- Intersphinx Configuration -----------------------------------------------

intersphinx_mapping = {
    'python': ('https://docs.python.org/3', None),
}

# -- Todo Extension Configuration --------------------------------------------

todo_include_todos = True
