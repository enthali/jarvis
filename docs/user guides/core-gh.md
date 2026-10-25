# Jarvis Migration Shim (end of life)

The extension `enthali.jarvis` (package `core-gh`) is deprecated. It exists only to move users to [Jarvis Core](core.md) (`enthali.jarvis-core`).

## What happens on activation

1. It tries to install Jarvis Core from the VS Code Marketplace.
2. If the Marketplace is unreachable, for example in a corporate network, it installs the `.vsix` from GitHub Releases instead.
3. Once Jarvis Core is installed, it uninstalls itself and prompts you to reload the window.

If both channels fail, the shim stays installed and retries on the next VS Code start. A notification offers links for a manual install.

## Configuration

This package has no settings.
