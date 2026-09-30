# Recorder Redesign — VS Code Speech vs. Eigenbau

**Datum:** 2026-09-30
**Status:** Research abgeschlossen, Ready für PM/CR

---

## Ausgangslage

Der aktuelle Recorder (`packages/recorder`) nimmt Audio über `recorder.py` (Python-Subprocess) auf
und transkribiert über ein externes Whisper-Setup (Docker). Schwerwiegende Abhängigkeiten: Python,
Docker, File-Polling, Sidecar-JSON. VS Code hat inzwischen eingebautes Speech Recognition — kann das
den ganzen Docker/Whisper-Stack ersetzen?

---

## VS Code Built-in Dictation (aus Source-Code analysiert)

### Architektur (3-Schicht-Pipeline)

```
Renderer (Browser/Main Thread)
  Web Audio API (AudioContext + Worklet)
    → getUserMedia() → Mic stream → PCM16 mono 16kHz → 4096 sample chunks
    → ChatSpeechToTextService
      → encodeRawPcm16Buffer(samples)
      → IPC: pushAudio(VSBuffer)
        │
        ▼ IPC (Utility Process)
Utility Process (Node.js)
  LocalTranscriptionService
    → FoundryLocal SDK (onnxruntime + onnxruntime-genai)
      → FoundryLocalManager (model catalog, download, load)
      → IModel (loaded Nemotron model)
      → LiveAudioTranscriptionSession
        ├─ session.append(Uint8Array)  ← PCM chunks
        ├─ session.stop() → final transcript
        └─ async iterator → interim results (streaming)
      → TranscriptAccumulator (interim→final, dedup)
```

### Modell: NVIDIA Nemotron 3.5 ASR Streaming 0.6B

- **Architektur:** Cache-Aware FastConformer-RNNT, 24 Encoder-Layers, 600M Parameter
- **Streaming:** Cache-aware design — keine redundanten Overlap-Berechnungen, 80ms–1120ms Chunk-Größen
- **Multilingual:** 40 Language-Locales (19 transcription-ready, 13 broad-coverage, 8 adaptation-ready)
  - DE: WER ~8.2% (1.12s chunk, LangID) — ausreichend
  - EN: WER ~7.9%
- **Eingebaut:** Punctuation & Capitalization, automatische Spracherkennung (`target_lang=auto`)
- **Lizenz:** OpenMDW-1.1
- **HuggingFace:** `nvidia/nemotron-3.5-asr-streaming-0.6b`
- **ONNX INT4:** `onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4`

### VS Code Implementierungsdetails

| Datei | Funktion |
|------|----------|
| `chatSpeechToTextService.ts` | Audio-Capture (Web Audio Worklet), PCM16-Encode, IPC-Dispatch, State-Machine |
| `localTranscriptionService.ts` (node) | Foundry Local SDK, Model-Download/Load, Streaming-Session, Audio-Append-Queue |
| `localTranscriptionService.ts` (electron-browser) | Renderer-Proxy, Utility-Process-Worker, Proxy-Config |
| `localTranscriptionService.ts` (browser) | Null-Implementation (Web = unsupported) |
| `localTranscription.ts` (common) | Interface `ILocalTranscriptionService` |
| `installDictationModelAction.ts` | Model aus lokalem ZIP installieren |
| `dictationLanguage.ts` | Sprache-Auflösung (Display-Language → Locale → Fallback) |

### Kern-Erkenntnis: Keine Extension API

Die gesamte `LocalTranscriptionService`-Pipeline ist **internal**. Die `ILocalTranscriptionService`-
Schnittstelle ist nicht als VS Code Extension API exposed. Die Diktat-Commands
(`Voice: Start Dictation in Editor/Terminal`, `Chat: Dictate`) schreiben immer ins aktive
Editor/Terminal-Feld — nicht in eine Variable oder Datei.

**Konsequenz:** Man kann VS Code's eingebautes Diktat nicht programmatisch für unseren Use Case nutzen.

### VS Code Settings (Referenz)

| Setting | Default | Bedeutung |
|---------|---------|-----------|
| `dictation.enabled` | `true` | Kill-Switch für Diktat |
| `dictation.model` | `nemotron-3.5-asr-streaming-0.6b` | On-Device-Modell; `mai` = Cloud |
| `dictation.showTranscript` | `true` | Live-Transcript anzeigen |
| `dictation.experimental.llmCleanup` | `true` | LLM für Punctuation/Capitalization nach ASR |
| `agents.voice.language` | `auto` | Sprach-Hint für Diktat |

### Plattform-Support

On-Device läuft auf: Windows x64/Arm64, macOS Apple Silicon, Linux x64/Arm64 (glibc 2.34+).
Nicht unterstützt: Intel Mac, 32-bit/Arm32, musl (Alpine). Fallback: VS Code Speech Extension
(`ms-vscode.vscode-speech`).

---

## Optionen für den Recorder-Redesign

### Option 1: VS Code Built-in Diktat triggern (Verworfen)

- Commands per `vscode.commands.executeCommand()` aufrufen
- ❌ Diktat geht ins aktive Editor/Terminal-Feld, nicht in Variable/Datei
- ❌ Keine API-Kontrolle über Start/Stop/Transcript-Empfang
- ❌ Nur eine Session gleichzeitig, 20-Minuten-Limit
- **Fazit:** Unbrauchbar für programmatischen Use Case.

### Option 2: `@huggingface/transformers` + ONNX Nemotron (Verworfen)

```js
import { pipeline } from '@huggingface/transformers';
const asr = await pipeline('automatic-speech-recognition',
    'onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4');
const transcript = await asr(audioBlob, { language: 'de', task: 'transcribe' });
```

- ✅ NPM-Package, kein Docker, kein Python
- ✅ On-device (ONNX Runtime, CPU)
- ✅ Volle programmatische Kontrolle (Audio → Transcript als Return-Value)
- ❌ **Primär Batch** — CTC-basiertes Strided Chunking, kein RNNT-Streaming
- ❌ `chunk_length_s` Default 30s → hohe Latenz bis Output
- ❌ INT4-Quantisierung ist Community-Upload, nicht offiziell von NVIDIA
- ❌ Kein VAD/Endpointing — müssen wir selbst bauen
- **Fazit:** Falsche Architektur für unseren Use Case. Transformers.js ist für
  CTC-Modelle (Whisper/Wav2Vec2) gebaut, nicht für RNNT-Streaming (Nemotron).

### Option 3: NeMo-Speech.cpp (Alternative)

NVIDIA veröffentlicht `NeMo-Speech.cpp` — lightweight C++ Runtime für genau dieses Modell:
`https://github.com/NVIDIA/NeMo-Speech.cpp`

- ✅ Cache-Aware Streaming RNNT (gleiches Modell wie VS Code)
- ✅ VAD + Endpointing eingebaut
- ✅ GGUF — effizient, CPU-only
- ✅ Multilingual (40 Locales)
- ❌ Native Binary (kompilieren oder distributieren, kein npm)
- Nur als Fallback falls `onnxruntime-node` nicht funktioniert

### Option 4: `onnxruntime-node` direkt (★ Entscheidete Option)

VS Code nutzt `onnxruntime + onnxruntime-genai`. `onnxruntime-node` ist ein npm-Package.
Wir bauen genau diese Architektur nach.

**Entscheidungsgrund:** VS Code beweist täglich auf unserem Rechner dass
`onnxruntime` + Nemotron funktioniert. Wir müssen nicht raten ob es geht — wir wissen es.
Auch: Transformers.js (Option 2) ist für CTC-Modelle gebaut (Batch/Strided), nicht für
RNNT-Streaming. Wir brauchen aber Streaming, und RNNT-Streaming ist genau das was
`onnxruntime-genai` bietet.

- ✅ NPM-Package, kein Docker, kein Python, keine native Binary
- ✅ **Bewiesen auf unserem Rechner** — VS Code läuft damit jeden Tag
- ✅ RNNT Cache-Aware Streaming (gleiches Modell wie VS Code)
- ✅ Volle programmatische Kontrolle über Audio-Pipeline
- ✅ Audio-Capture via Web Audio API (Webview) oder Node native — beides npm-basiert
- ⚠️ VAD/Endpointing muss implementiert werden (VS Code nutzt Foundry Local dafür;
  wir können `onnxruntime-genai`'s eingebautes Streaming nutzen oder eigenes VAD)
- ⚠️ Mehr Low-Level-Code als Transformers.js, aber VS Code Source als Referenz

---

## Audio-Capture (modellunabhängig)

Alle Optionen brauchen Audio-Capture. Drei Wege:

| Weg | Wie | Aufwand | Streaming? |
|-----|------|---------|-----------|
| **Webview + getUserMedia** | Web Audio Worklet → PCM16 → PostMessage → ExtHost | Mittel | ✅ |
| **Native Node Module** (`naudiodon`) | PortAudio binding → PCM16 direkt | Niedrig | ✅ |
| **Bestehendes `recorder.py`** | Schreibt WAV → Extension transkribiert beim Stop | Am niedrigsten | ❌ (Batch) |

---

## Empfohlener Phasen-Plan

### Phase 1: Prototyp-Spike auf Research-Branch (≈1–2 Tage)

`onnxruntime-node` + Nemotron ONNX + bestehendes `recorder.py` für Audio-Capture.

**Ziel:** Beweisen dass `onnxruntime-node` + Nemotron in unserer Umgebung läuft,
mit voller Kontrolle über Audio-Stream und Transcript-Output.

```
research/recorder-nemotron-spike/
├── package.json              ← onnxruntime-node, @huggingface/transformers (für Modell-Download)
├── transcribe.mjs            ← Test A+B: WAV-Datei → onnxruntime → Transcript
├── stream-test.mjs           ← Test D: WAV in Chunks → onnxruntime-genai Streaming → interim Results
├── auto-lang-test.mjs        ← Test E: target_lang=auto bei gemischter Sprache
└── README.md                 ← Ergebnisse notieren
```

**Tests:**

| Test | Was wir prüfen | Status |
|------|---------------|--------|
| A | `onnxruntime-node` lädt Nemotron ONNX in Node.js | Offen |
| B | Batch-Transkription (WAV → Text) | Offen |
| C | Qualität für Meeting-Transcripts | ✅ Bewiesen (Live-Diktat) |
| D | Streaming: Chunks einspeisen → interim Results via `onnxruntime-genai` | Offen (Hauptfrage) |
| E | `target_lang=auto` — Sprachwechsel mid-stream erkennen | Offen (Bonus) |

**Was wir nach Phase 1 wissen:**
- Läuft `onnxruntime-node` + Nemotron ohne VS Code's Foundry Local SDK?
- Funktioniert Streaming (interim Results) oder nur Batch?
- Wie viel Code brauchen wir für VAD/Endpointing?
- Performance/Latenz auf CPU?
- Modell-Grösse und Ladezeit?

### Phase 2: Extension-Integration (nach Spike, als CR)

Wenn Phase 1 erfolgreich: Integration in `packages/recorder`.
- Audio-Capture replaces `recorder.py` (Webview + getUserMedia oder Node native)
- `onnxruntime-node` als Dependency
- Streaming-Transcript → `jarvis.internalAppendMessage` wie bisher
- Config: Model-Path/Cache-Dir statt `whisperPath`

### Phase 3: Voll integriert (optional)

Live-Streaming-Anzeige im UI (wie VS Code's Diktat-Transcript).
Audio-Worklet im Webview für Echtzeit-PCM16.

---

## Was der Redesign eliminiert

| Komponente | Aktuell | Nach Redesign |
|-----------|--------|---------------|
| Python `recorder.py` | Audio-Capture | Bleibt (Phase 1) → entfällt (Phase 2/3) |
| Docker + Whisper | Transkription | ❌ Weg |
| `whisperPath` Config | Pfad zum Whisper-Setup | ❌ Weg |
| File-Polling-Heartbeat | `jarvis.checkTranscripts` alle 2 Min | ❌ Weg |
| Sidecar-JSON | Project-Zuordnung | ❌ Weg |
| `output/` Verzeichnis | Whisper-Output | ❌ Weg |
| `.stop` / `.recording.json` | Process-State | Bleibt oder wird vereinfacht |

## Was bleibt

- `RecordingManager` (Start/Stop, Status-Bar, State-File)
- `jarvis.startRecording` / `jarvis.stopRecording` Commands
- Menu-Integration in Project/Event-Nodes
- `jarvis.internalAppendMessage` Dispatch an Session

---

## Live Findings (2026-09-30, VS Code Diktat)

Während der Recherche wurde VS Code's eingebautes Diktat live genutzt (Deutsch + Englisch).
Beobachtungen:

- **Qualität ausreichend:** Deutsche und englische Diktate sind gut verständlich, auch bei
  gemischter Sprache im selben Satz. Das gröbere Problem sind fehlende Gross-/Kleinschreibung,
  nicht Worterkennung.
- **Englisch minimal besser als Deutsch** — bestätigt FLEURS-WER (EN ~7.9%, DE ~8.2%).
- **Mixed-Language im selben Satz funktioniert bereits:** VS Code setzt zwar eine feste
  Sprache (`agents.voice.language`), aber das Modell verarbeitet Deutsch und Englisch
  gleichzeitig im selben Utterance. Bewiesen am Live-Prompt: *"Yes, that would be a
  reasonable testssanter we Spraken sogar umzuschalten..."* — Deutsch und Englisch gemischt,
  beides erkannt. Nicht perfekt ("Moldh" statt "Model"), aber erkennbar. Das Modell macht
  pro-Chunk Spracherkennung, nicht pro Session gesperrt.
- **Feature-Möglichkeit:** Wenn wir `target_lang=auto` explizit nutzen (was VS Code nicht
  tut), könnten wir diese Mixed-Language-Erkennung optimieren — ein Feature das VS Code
  selbst nicht aktiv nutzt.
- **LLM-Cleanup ist sichtbar:** `dictation.experimental.llmCleanup=false` lässt rohe ASR-Output
  ohne Capitalization durch; mit `=true` werden Gross-/Kleinschreibung und Zeichensetzung
  nachgebessert. Für Meeting-Transcripts ist das wichtig.

---

## Spike-Ergebnis (2026-09-30): ✅ Alle Tests bestanden

Branch: `research/recorder-nemotron-spike` (gepusht, Commit `8271514`).
Code + README + Ergebnisse: `experiments/nemotron-spike/`.

**Kernfund:** VS Code nutzt nicht direkt `onnxruntime-genai`, sondern das npm-Package
**`foundry-local-sdk`** (High-Level-API mit `model.createAudioClient().transcribeStreaming()`).
Kein Low-Level-ONNX-Code nötig — genau die Architektur, die wir für den Recorder brauchen.

| Test | Ergebnis |
|------|----------|
| A — Modell lädt | ✅ Lokal (VS Codes Cache), kein Netzwerk nötig |
| B — Batch-Transkription | ✅ 7.3s, korrekte Umlaute, fast perfekt |
| D — Streaming | ✅ 46 Chunks, echte interim Results |
| E — Mixed-Language `auto` | ✅ Unterschiedliche Ergebnisse je Sprachmodus |

### Netzwerk-Blocker: Ursache vollständig geklärt (2026-09-30, mit Beweis per curl + DLL-Analyse)

`npm install` versucht `Microsoft.ML.OnnxRuntime` von NuGet zu laden — das schlägt fehl,
weil `install-native.cjs` rohes `node:https` ohne jede Proxy-Unterstützung nutzt (keine
Env-Var-Auswertung im Skript selbst).

**Der spannendere Fund: die native `foundry_local` C++-Bibliothek ignoriert jede
Proxy-Konfiguration, die wir ihr geben können.** Getestet und mit Beweis verifiziert:

1. `HTTPS_PROXY`/`HTTP_PROXY` mit falschem Proxy (`localhost:3128`) → Fehler
2. Dieselben Env-Vars mit dem **korrekten** VS-Code-Proxy (aus `settings.json`:
   `http.proxy: "http://rb-proxy-de.bosch.com:8080"`) → identischer Fehler
3. `additionalSettings`-Bag mit Proxy-Schlüsseln in mehreren Schreibweisen → identischer Fehler
4. Env-Var-Propagation im Prozess per `console.log(process.env.HTTPS_PROXY)` bestätigt korrekt
5. DNS-Flush + Routing-Tabelle geprüft (zwei Default-Routen: WLAN Metric 0, VPN/Ethernet
   Metric 1) — nach Flush identisches Ergebnis, also nicht routing-/VPN-bedingt

**Beweis dass das Netzwerk grundsätzlich funktioniert:** Aus dem DLL-Binary per String-Suche
die drei tatsächlichen Foundry-Catalog-Hostnamen extrahiert (`ai.azure.com`,
`api.catalog.azureml.ms`, `foundrypackages-*.azurefd.net`). Mit `curl.exe` und demselben
Proxy (`rb-proxy-de.bosch.com:8080`) sind **alle drei direkt erreichbar** (200/404/200 —
valide HTTP-Antworten). Ohne Proxy ist jeglicher Direktzugriff tot (`github.com`/`google.com`
→ `000`, kein Connect). Das Firmennetz erzwingt den Proxy für alles; der Proxy selbst
funktioniert einwandfrei für jeden proxy-fähigen Client.

**Root Cause:** String-Suche im DLL-Binary zeigt `WinHttp` (Windows' natives HTTP-API),
kein `libcurl`. **WinHTTP liest keine `HTTPS_PROXY`/`HTTP_PROXY`-Umgebungsvariablen** — das
ist reine Unix/curl-Konvention. WinHTTP braucht entweder die System-weite Proxy-Config
(`netsh winhttp show proxy` → hier `DirectAccess`, leer) oder PAC-Auflösung, die die
aufrufende App explizit anfordern muss. Versuch, die IE/PAC-Einstellung mit
`netsh winhttp import proxy source=ie` in den WinHTTP-Store zu importieren →
ebenfalls `Access Denied` (Admin-Rechte nötig, nicht eskaliert).

**Warum VS Code selbst funktioniert:** Electron/Chromium hat eine eigene, PAC-fähige
Netzwerk-Schicht, komplett unabhängig von WinHTTP. Dass das Nemotron-Modell bereits im
lokalen `chatDictationModels`-Cache lag, heißt vermutlich: Entweder war die System-weite
WinHTTP-Proxy-Config zum Download-Zeitpunkt gesetzt (z.B. durch IT-Policy, seither
zurückgesetzt), oder der Download lief über ein anderes Netzwerk.

**Konsequenz für Phase 2:** Das ist kein Terminal-spezifisches Problem — es würde
**auch als echte VS-Code-Extension nicht automatisch funktionieren**. Der Aufruf
`catalog.getModel()` geht direkt in die native C++-Bibliothek, an VS Codes eigener
PAC-fähiger Netzwerk-Schicht vorbei. Jarvis kann sich für die Modell-Beschaffung nicht auf
den SDK-eigenen Catalog-Netzwerkzugriff verlassen, wenn PAC-basierte Firmen-Proxies im
Spiel sind.

**Lösung für den Spike (funktioniert, ist aber ein Workaround):**
1. `FOUNDRY_LOCAL_SKIP_INSTALL=1 npm install` — SDK ohne nativen Download installieren
2. ORT/GenAI-DLLs per `Invoke-WebRequest` (PowerShell/curl nutzen Proxy korrekt) von NuGet holen
3. `foundry_local_node.node` + `foundry_local.dll` kommen **im npm-Paket selbst** (per
   `npm pack` extrahiert, nicht von NuGet)
4. Modell-Catalog-Lookup umgangen: stattdessen das von VS Code bereits heruntergeladene
   Modell per **lokalem Catalog** registriert (`CatalogType.Local`,
   `catalog.registerModel(path, id, meta)`) — kein natives Netzwerk nötig

**Für Produktiv-Integration (Phase 2):** Modell-Beschaffung darf nicht über den nativen
SDK-Catalog laufen. Zwei Optionen:
- **A)** Jarvis lädt die Modell-Dateien selbst via Node's `https`/`fetch` (PAC/Proxy-fähig
  mit `https-proxy-agent`, liest VS Codes `http.proxy`-Setting aus) direkt von einer
  bekannten URL herunter, legt sie lokal ab, registriert sie dann per `CatalogType.Local`
  — wie wir es im Spike gemacht haben, nur mit eigenem Download statt VS-Code-Cache-Reuse.
- **B)** Falls VS Codes Diktat-Feature bereits aktiv war, dessen Cache-Verzeichnis
  wiederverwenden (fragil — Pfad/Struktur ist VS-Code-intern, kann sich ändern).
→ Option A ist robuster und wird für Phase 2 empfohlen.

### Qualitäts-Detail (Test E, Mixed-Language)

Bei synthetischer TTS-Stimme (Windows SAPI) war der Codeswitch-Teil ("we are switching
between") schlecht erkannt — vermutlich TTS-Ausspracheartefakt, nicht Nemotron-Schwäche.
Mit echter menschlicher Sprache (siehe Live-Chat-Test oben) war Codeswitch klar erkennbar.
Test-Empfehlung für Phase 2: mit echten Sprachaufnahmen statt TTS validieren.

### Offene Punkte für Phase 2

1. Netzwerk-Workaround produktionsreif machen (Modell-Distribution ohne NuGet-Abhängigkeit
   beim Install, ohne VS-Code-Cache-Abhängigkeit zur Laufzeit)
2. Live-Mikrofon-Audio-Capture (Spike testete nur WAV-Dateien)
3. VAD (`silero_vad.onnx` ist im Modell-Package enthalten, `use_vad` Option nicht getestet)
4. Modell-Distribution-Strategie für Endnutzer (eigener Download vs. VS-Code-Cache-Reuse)

## Spike-Tests (aktualisiert)

| Test | Was wir prüfen | Status |
|------|---------------|--------|
| A | Modell lädt in Node.js (`@huggingface/transformers` + ONNX) | Offen |
| B | Batch-Transkription (WAV → Text) | Offen |
| C | Qualität für Meeting-Transcripts | ✅ Bewiesen (Live-Diktat) |
| D | Streaming: Chunks einspeisen → interim Results | Offen (Hauptfrage) |
| E | `language: 'auto'` — Sprachwechsel mid-stream erkennen | Offen (Bonus-Feature) |

## Offene Fragen

1. **onnxruntime-genai Streaming:** Bietet `onnxruntime-genai` (npm) eine
   Streaming-Session-API wie VS Code's Foundry Local `LiveAudioTranscriptionSession`?
   → Test D.
2. **VAD/Endpointing:** Brauchen wir eigenes Voice Activity Detection, oder
   übernimmt `onnxruntime-genai` das? VS Code nutzt Foundry Local dafür.
3. **Modell-Format:** Welches ONNX-Format brauchen wir? VS Code nutzt das
   Foundry-Local-Modell-Package. Für `onnxruntime-node` brauchen wir das
   rohe ONNX-Modell (z.B. von HuggingFace).
4. **CPU-Performance:** Latenz auf CPU beim Streaming? VS Code nutzt Utility
   Process (separater Thread) — brauchen wir das auch?
5. **Modell-Download-Größe:** Wie groß ist das ONNX-Modell? (Original ~600M Parameter)

---

## Quellen

- VS Code Source: `src/vs/platform/localTranscription/`, `src/vs/workbench/contrib/chat/browser/speechToText/`
- VS Code Doku: `https://code.visualstudio.com/docs/configure/accessibility/voice`
- Nemotron Modell: `https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b`
- ONNX INT4: `onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4` (HuggingFace)
- NeMo-Speech.cpp: `https://github.com/NVIDIA/NeMo-Speech.cpp`
- VS Code Speech Extension: `ms-vscode.vscode-speech`
