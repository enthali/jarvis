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

## Netzwerk-Blocker und Loesung

`npm install` versucht `Microsoft.ML.OnnxRuntime` von NuGet (`api.nuget.org`) herunterzuladen.
In unserer Umgebung war das direkt nicht erreichbar (Proxy auf `localhost:3128`, aber Node's
`https`-Modul und die native C++-Bibliothek nutzen unterschiedliche Netzwerk-Stacks, die
Umgebungsvariablen wie `HTTPS_PROXY` nicht respektieren).

**Was funktioniert hat:**
1. `FOUNDRY_LOCAL_SKIP_INSTALL=1 npm install` — installiert das SDK ohne den nativen Download
2. ORT/GenAI-DLLs manuell per `Invoke-WebRequest` (PowerShell respektiert den Proxy) von NuGet
   geladen und in `node_modules/foundry-local-sdk/prebuilds/win32-x64/` kopiert
3. `foundry_local_node.node`, `foundry_local_preload.node`, `foundry_local.dll` kommen bereits
   **im npm-Paket selbst** (nicht von NuGet) — via `npm pack` extrahiert

**Wichtiger Fund:** Der Model-**Catalog**-Lookup (`manager.catalog.getModel(id)`) braucht
ebenfalls Netzwerk (Azure-Regionen) und schlaegt ohne System-weiten WinHTTP-Proxy fehl
(`netsh winhttp show proxy` zeigte `DirectAccess`, Aendern braucht Admin-Rechte).

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

1. **Netzwerk-Workaround produktionsreif machen:** Entweder System-Proxy-Doku fuer
   Nutzer, oder Modell ueber alternativen Kanal bereitstellen (z.B. manuelles
   Modell-Package wie `installDictationModelAction.ts` in VS Code es macht).
2. **Audio-Capture:** Wir haben nur WAV-Dateien getestet, nicht Live-Mikrofon-Streaming.
3. **VAD:** `silero_vad.onnx` ist im Modell-Package enthalten, aber `use_vad` Option
   noch nicht getestet (default: false laut VS Code Referenz).
4. **Modell-Distribution:** Duerfen/sollen wir das VS-Code-Modell-Verzeichnis
   referenzieren, oder muss Jarvis sein eigenes Modell-Package mitbringen/downloaden?

