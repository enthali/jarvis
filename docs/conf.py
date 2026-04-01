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

# Fields (sphinx-needs 7.0.0+ API)
# Implementation: SPEC_REL_SPHINXCOMPAT
# Requirements: REQ_REL_SPHINXCOMPAT
needs_fields = {
    "priority": {"nullable": True},
    "rationale": {"nullable": True},
    "acceptance_criteria": {"nullable": True},
    "status": {
        "schema": {
            "enum": [
                "draft", "open", "approved",
                "implemented", "verified", "deprecated",
            ],
        },
    },
}

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
