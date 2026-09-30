# Extension-host download probe

Runs in a real VS Code Extension Development Host. On startup (or via
`Nemotron: Test SDK Download` in the Command Palette), it checks:

1. Node HTTPS to NuGet, both directly and using the configured `http.proxy` explicitly.
2. A small Nemotron repository file downloaded via the configured proxy. This
   proves file transfer, not download of the model weights.
3. Foundry Local's **online** catalog and, if Nemotron is listed and not already
   cached, `model.download()` into the extension's private model cache.

The Output panel channel `Nemotron Download Probe` and
`%APPDATA%\Code\User\globalStorage\research.nemotron-download-probe\probe.log`
contain the results. Proxy credentials are never logged. The downloaded small
file is stored alongside the report as `nemotron-readme.md`.

## Windows setup

From this directory, run `npm install --ignore-scripts`. The SDK's native
prebuilds must be present in
`node_modules/foundry-local-sdk/prebuilds/win32-x64/`: the SDK install script
normally downloads its ONNX runtime dependencies from NuGet. In this spike,
the matching 2.1.0 native binaries from the earlier Nemotron experiment were
copied into that directory after installing. Start a new host with:

```powershell
code --new-window --extensionDevelopmentPath='C:\workspace\jarvis-nemotron-spike\experiments\nemotron-spike\extension-host' 'C:\workspace\jarvis-nemotron-spike\experiments\nemotron-spike\extension-host'
```

Use your actual checkout path if different. The host uses the current VS Code
user settings. The SDK model cache is private to this test; an already
downloaded VS Code dictation model cannot count as a successful SDK download.

## Interpretation

An HTTP 200 with an explicit proxy shows an extension can use the VS Code proxy
setting *when it passes that setting to a proxy-aware HTTP agent*. It does not
prove that native Foundry SDK requests inherit it. If the catalog returns zero
models, no `model.download()` can run; this is a catalog result, not evidence
that a model transfer failed. Full model download can be large if the catalog
eventually resolves Nemotron.

## Observed on 2026-09-30

- Extension Host (VS Code 1.139.0, Node 24.20.0): `http.proxy` configured,
   `http.proxySupport=override`; direct and explicitly proxied Node HTTPS to
   NuGet both returned HTTP 200.
- Extension's explicitly proxied request downloaded 54,239 bytes of the
   Nemotron repository README to its private storage. This is a real file
   transfer, **not** the model weights.
- A direct Node HTTPS request to the same NuGet endpoint from the terminal
   failed with `ENOTFOUND`, even though proxy environment variables were set.
- Foundry SDK 2.1.0's online catalog returned **zero** models inside the
   Extension Host; Nemotron lookup failed with `Model with alias ... not found`.
   `model.download()` was therefore **not reached**. The observations alone do
   not establish whether the empty catalog reflects native proxy handling,
   catalog configuration, region availability, or a missing catalog entry.