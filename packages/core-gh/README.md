# Jarvis (End-of-Life — Migration Shim)

> **This extension is deprecated.** It exists only to migrate users to
> [`enthali.jarvis-core`](https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-core).

## What happens

On activation this extension will:

1. Attempt to install **Jarvis Core** (`enthali.jarvis-core`) from the VS Code Marketplace.
2. If the Marketplace is unreachable (e.g. corporate/private network), fall back to installing the `.vsix` from GitHub Releases.
3. Once Jarvis Core is installed, uninstall itself and prompt a window reload.

If both install channels fail, the shim stays installed and retries on the next VS Code startup. A notification offers manual-install links.

## Links

- Marketplace: <https://marketplace.visualstudio.com/items?itemName=enthali.jarvis-core>
- GitHub: <https://github.com/enthali/Jarvis>
