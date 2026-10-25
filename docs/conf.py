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
    'releases/*',
]

# -- Options for HTML output -------------------------------------------------

html_theme = 'furo'
html_static_path = ['_static']
html_css_files = ['needs-dark-mode.css']
html_title = 'Jarvis'

# -- Sphinx-Needs Configuration ----------------------------------------------
# https://sphinx-needs.readthedocs.io/
# The ontology (types, fields, statuses, build options) lives in
# docs/jarvis-ontology.toml — the single source for Sphinx and the syspilot skills.
# Implementation: SPEC_REL_SPHINXCOMPAT
# Requirements: REQ_REL_SPHINXCOMPAT

needs_from_toml = "jarvis-ontology.toml"

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
