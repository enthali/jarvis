# Nemotron ASR Spike

Spike: Beweist dass `foundry-local-sdk` (npm) + Nemotron 3.5 ASR on-device in Node.js laeuft.
Gleiches SDK das VS Code fuer eingebautes Diktat nutzt.

## Ergebnis: ✅ Alle Tests bestanden

`foundry-local-sdk` laeuft in Node.js, streamt Audio zu Nemotron und liefert interim +
finale Transkripte — ohne Docker, ohne Python. Kein Low-Level-ONNX-Code noetig, die SDK
kapselt Model-Loading, Streaming, VAD.

## Setup

```bash
cd experiments/nemotron-spike
npm install                        # benoetigt FOUNDRY_LOCAL_SKIP_INSTALL=1 falls NuGet
                                    # nicht erreichbar ist (siehe "Netzwerk-Blocker" unten)
```

## Netzwerk: Stand 2026-09-30

Nachgetragen nach dem Extension-Host-Test (`extension-host/`). Die fruehere Aussage, die
Ursache sei geklaert (WinHTTP ignoriert Env-Variablen), war nicht belegt und ist entfernt.

**Belegt:**
- Das `npm install`-Skript laedt ONNX Runtime von NuGet mit rohem `node:https` ohne Proxy;
  im Terminal scheitert das. Umgehung siehe unten.
- Der native Katalog-Lookup scheitert im Terminal **und** im Extension Host: SDK-Log zeigt
  `transport failure` fuer alle 7 Regionen nach je ~10 ms, Katalog hat 0 Modelle, `download()`
  wird nie erreicht. Env-Variablen waren im Host korrekt gesetzt (`http.proxy`, Host-Port geprueft).
- Im Extension Host funktioniert normales Node-HTTPS: HTTP 200, und eine Nemotron-Repo-Datei
  (README, 54.239 Bytes) wurde ueber den Proxy geladen. Nur eine kleine Datei, nicht die
  ~700 MB Modellgewichte.
- VS Code selbst setzt `HTTPS_PROXY`/`HTTP_PROXY` aus `http.proxy` vor dem SDK-Aufruf
  (`localTranscriptionService.ts`); diese Bruecke nachzubauen aenderte nichts.
- Das Modell wurde auf diesem Rechner beim ersten Start des VS-Code-Chats von VS Code
  selbst geladen (Angabe des Nutzers).

**VS Code Quellcode (gelesen, nicht ausgefuehrt):**
- Die native Runtime (`foundry_local_napi.node` + Core-DLLs) kommt als Tarball von
  `product.json` `dictationRuntime.urlTemplate` (`main.vscode-cdn.net/dictation-runtime/foundry-local/1.2.3/{target}.tgz`),
  geladen per Node-HTTPS mit `https-proxy-agent`. Cache: `%APPDATA%\Code\chatDictationRuntime\1.2.3\`.
- VS Code pinnt SDK **1.2.3** und patcht dessen Loader per postinstall, damit die Env-Variable
  `VSCODE_FOUNDRY_LOCAL_NATIVE_DIR` beachtet wird. Dieser Spike nutzt SDK **2.1.0**.
- Modell-Download laeuft dort ueber `model.download()` (native Schicht); alternativ gibt es
  einen Import aus lokalem ZIP (`installDictationModelAction.ts`).

**Nicht belegt / offen:**
- Warum die native Schicht hier trotz korrekter Env-Variablen scheitert (WinHTTP-Hypothese
  passt zu den Beobachtungen, ist aber nicht bewiesen und widerspricht VS Codes Annahme).
- Wie der VS-Code-Download auf diesem Rechner erfolgreich war, obwohl der Spike-Katalog-Lookup
  scheitert (andere SDK-Version 1.2.3 vs 2.1.0, anderes Netz zum Zeitpunkt, oder anderer Pfad).
- Ob der Spike mit SDK 1.2.3 plus VS-Codes Runtime-Tarball laeuft.

**Was funktioniert hat:**
1. `FOUNDRY_LOCAL_SKIP_INSTALL=1 npm install` — installiert das SDK ohne den nativen Download
2. ORT/GenAI-DLLs manuell per `Invoke-WebRequest` (PowerShell respektiert den Proxy) von NuGet
   geladen und in `node_modules/foundry-local-sdk/prebuilds/win32-x64/` kopiert
3. `foundry_local_node.node`, `foundry_local_preload.node`, `foundry_local.dll` kommen bereits
   **im npm-Paket selbst** (nicht von NuGet) — via `npm pack` extrahiert

**Beobachtung:** Der Model-**Catalog**-Lookup (`manager.catalog.getModel(id)`) braucht
Netzwerk (Azure-Regionen) und scheitert hier (siehe oben).

**Workaround:** VS Code hat das Nemotron-Modell bereits lokal gecacht unter
`%APPDATA%\Code\chatDictationModels\Microsoft\nemotron-3.5-asr-streaming-0.6b-generic-cpu-3\v3\`.
Wir registrieren dieses Modell direkt im **lokalen Catalog** (`CatalogType.Local`,
`catalog.registerModel(path, id, metadata)`) — kein Netzwerk-Call noetig. Siehe `common.mjs`.

## Tests

| Test | Script | Ergebnis |
|------|--------|----------|
| A | `node test-a-load.mjs` | ✅ PASS — Modell laedt lokal, kein Netzwerk noetig |
| B | `node test-b-batch.mjs samples/sample-de.wav` | ✅ PASS — Transkript in 7.3s, korrekt inkl. Umlaute |
| D | `node test-d-stream.mjs samples/sample-de.wav` | ✅ PASS — 46 Chunks, echtes Streaming |
| E | `node test-e-auto-lang.mjs samples/sample-mixed.wav` | ✅ PASS — auto/de/en liefern unterschiedliche Ergebnisse |

Testdaten: `samples/*.wav` — 16kHz mono WAVs, generiert per Windows TTS (`generate-samples.ps1`).

## Detaillierte Ergebnisse

### Test B — Batch (sample-de.wav)
```
Input:  "Hallo, das ist ein Test fuer die Spracherkennung. Wir testen Nemotron
         heute mit einem deutschen Satz."
Output: "Hallo, das ist ein Test für die Spracherkennung. Wir testen Nemotron
         heute mit einem deutschen Satz"
Zeit:   7291ms (CPU, kein Warmup)
```
Nahezu perfekt — korrekte Umlaute, korrekte Satzstruktur.

### Test D — Streaming (sample-de.wav)
```
46 Chunks empfangen, finales Transkript identisch mit Batch-Ergebnis.
Zeit: 6625ms gesamt (marginal schneller als Batch, gleiche Audio-Laenge)
```
Bestaetigt: `transcribeStreaming()` liefert echte interim Results (nicht nur
ein finales Ergebnis am Ende), analog zu VS Code's Diktat-UI.

### Test E — Mixed Language (sample-mixed.wav)
```
Input (TTS): "Hello, das ist ein Test. We are switching between English und
              Deutsch in einem Satz."

auto: "Hello, das ist ein Test V A R Switching Betwain Englisch und Deutsch in einem Satz"
de:   "Hello, das ist ein Test V A R Switching Betwain Englisch und Deutsch in einem Satz"
en:   "Hello, dast is ingway English und Deutsch in einem Satz"
```
`auto` und `de` identisch (Modell faellt bei `auto` offenbar auf Deutsch zurueck fuer
diesen Take), `en` deutlich abweichend. Codeswitch-Teil ("we are switching between")
wird schlecht erkannt — vermutlich TTS-Artefakt (Windows-Stimme spricht Codeswitch
unnatuerlich aus), nicht zwingend ein Nemotron-Problem. Mit echter menschlicher
Sprache (siehe Live-Chat-Test in Research-Paper) war Codeswitch klar erkennbar.

## Offene Punkte fuer Phase 2 (Extension-Integration)

Entscheidungen liegen beim Nutzer/PM, nicht hier.

1. **Native Runtime bereitstellen:** Quelle und SDK-Version offen. Zu pruefen: SDK 1.2.3 plus
   VS-Code-Runtime-Tarball statt SDK 2.1.0 mit manuell kopierten DLLs.
2. **Modell bereitstellen:** Quelle des Foundry-Pakets (mit `genai_config.json`) unbekannt;
   das HuggingFace-ONNX-Repo aus dem Paper hat ein anderes Format. Optionen: eigener
   Node-HTTPS-Download (Gewichte noch nicht getestet), ZIP-Import, oder VS-Code-Cache
   mitnutzen (Pfad ist VS-Code-intern).
3. **Audio-Capture:** Nur WAV-Dateien getestet, nicht Live-Mikrofon-Streaming.
4. **VAD:** `silero_vad.onnx` liegt im Modell-Package, `use_vad` nicht getestet.
5. **Produktentscheidung:** Streaming (Live-Transkript) oder Transkript erst nach Stopp.

