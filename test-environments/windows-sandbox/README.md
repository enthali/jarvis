# Windows Sandbox

This on-demand test environment packages and installs Jarvis Core, PIM, Recorder, MCP, Flow, and Kanban into an isolated Windows Sandbox. Syspilot and the legacy Core shim are intentionally excluded.

## Requirements

- Windows 11 Pro or Enterprise with Windows Sandbox enabled.
- Node.js, npm, and dependencies installed in the Jarvis repository (`npm ci`).
- Network access to Microsoft's VS Code update service and download CDN when the pinned archive is not already present in the Windows Downloads folder. An explicit verified archive can be supplied with `-VSCodeArchive` for offline use.

## Start

From the repository root, run:

```powershell
.\test-environments\windows-sandbox\Start-Sandbox.ps1
```

The script locates Windows' configured Downloads known folder and caches the pinned VS Code 1.144.0 archive in its `JarvisSandbox` subfolder. If absent, it downloads the official Microsoft archive pinned to commit `2c33b50b16c472efe58357d1d2a8a5414bc23fbf` and verifies SHA-256 `055722269e3c9531af0c50a8b757c14e8062a0d02fc973b038863d9732c567ea`. A failed or offline download stops with a clear error; `-VSCodeArchive <path>` selects a local copy but it must match the pinned checksum. Existing files are preserved. The script then compiles Core, creates the minified Core bundle, and packages the six extensions with `vsce --no-dependencies` into a new `.local/runs/<timestamp>-<commit>/` directory. It records the commit, package versions, file sizes, and SHA-256 checksums in `build-manifest.json`, then generates and opens a Windows Sandbox configuration.

Use `-NoLaunch` to build and generate the configuration without opening Sandbox, `-SkipBuild` to reuse an existing build, or `-ArtifactDirectory <path>` to select one explicitly. `-VSCodeArchive <path>` is an offline override for a copy of the same pinned, checksum-verified archive. Use `-ProxyUri http://host:port` to override proxy discovery. If the host has an `HTTP_PROXY` or `HTTPS_PROXY` without embedded credentials, the launcher forwards it through the Windows Sandbox host gateway. Proxy values containing credentials are never copied. For example:

```powershell
.\test-environments\windows-sandbox\Start-Sandbox.ps1 -NoLaunch
.\test-environments\windows-sandbox\Start-Sandbox.ps1 -SkipBuild
.\test-environments\windows-sandbox\Start-Sandbox.ps1 -SkipBuild -ProxyUri http://proxy.example:3128
$downloads = (New-Object -ComObject Shell.Application).Namespace('shell:Downloads').Self.Path
.\test-environments\windows-sandbox\Start-Sandbox.ps1 -SkipBuild -VSCodeArchive (Join-Path $downloads 'VSCode-win32-x64-1.144.0.zip')
```

The generated `.wsb`, VSIX build output, and guest logs live under `.local/`, which is ignored by Git. The VS Code ZIP stays in the OS-configured Downloads folder under `JarvisSandbox`; only that dedicated cache folder is mapped into the guest, read-only. The bootstrap and VSIX artifacts are also read-only; only `guest-logs/` is writable from Sandbox. The existing ignored `scripts/jarvis-test.wsb` and archive under `docs/_build/vsix` are left untouched and are never searched automatically.

## Isolation And Network

Only the bootstrap scripts, selected build artifacts, and the VS Code archive are mapped into Sandbox, all read-only. VS Code is extracted inside Sandbox and uses separate user-data and extension directories; it does not reuse the host installation or host chats. A disposable workspace contains one `Jarvis Sandbox Actor` and settings to expose the Agents-window capability and Jarvis views.

The visible bootstrap console and transcript under `.local/guest-logs/` report connectivity to GitHub, the GitHub API, the Copilot API, and the VS Code Marketplace. Diagnostics report whether proxy environment variables exist without printing their values. If the Sandbox TCP probe to the host proxy times out while the host-side probe succeeds, the host firewall may be blocking the Default Switch subnet. The Default Switch gateway and subnet can change after a host restart; check the current adapter configuration and any existing firewall scope, then regenerate the Sandbox configuration before restarting it.

Any required inbound rule must be approved and configured by the User or IT for the current host endpoint, listening port and guest subnet. The launcher never changes firewall rules. Keep machine-specific addresses and proxy settings in local notes, not release artifacts. The bootstrap applies a supplied proxy to the guest user's Windows Internet Settings as well as VS Code, so browser-based sign-in uses the same route; host settings remain unchanged. If the proxy requires credentials or network access still fails, ask IT for the approved proxy and certificate setup; do not put proxy credentials in this repository or its logs. Copilot authentication is performed interactively inside the isolated VS Code profile.