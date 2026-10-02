# Recorder Redesign — VS Code Speech vs. Eigenbau

**Datum:** 2026-09-30
**Status:** Spike abgeschlossen, Entscheidungen offen (siehe „Spike-Tests“ und „Offene Fragen“); korrigiert 2026-09-30 nach Rückfrage des System Designers

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
- Nur als Fallback, falls `foundry-local-sdk` nicht nutzbar ist

### Option 4: VS-Code-Architektur nachbauen — mit `foundry-local-sdk` (nicht entschieden)

> Korrigiert 2026-09-30. Frühere Fassung: „`onnxruntime-node` direkt (★ Entscheidete Option)“,
> begründet mit „VS Code beweist täglich, dass `onnxruntime` + Nemotron funktioniert“. Das war nicht belegt.

**Herkunft:** Der Nutzer wollte „Dictation nachbauen“ und sagte: „wir sollten onnx wie VS Code
bauen, weil es auf meinem Rechner funktioniert“. Den Paketnamen `onnxruntime-node` habe ich (Research)
hinzugefügt, bevor der Spike zeigte, dass VS Code `foundry-local-sdk` nutzt. Der Nutzer hat nie
zwischen SDK und rohem `onnxruntime-node` entschieden; sein „ja“ bezog sich auf den Spike-Plan.

**Was das Argument belegt:** Nemotron läuft auf diesem Rechner über VS Codes Weg
(`foundry-local-sdk`). Es belegt nichts über rohes `onnxruntime-node`. Das wurde **nie getestet**,
und ob es RNNT-Streaming für Nemotron bietet, ist **ungeprüft**.

**Tragfähige Lesart:** „wie VS Code“ heißt `foundry-local-sdk`; das ist der einzige getestete Weg
(siehe Spike-Ergebnis). Die Entscheidung darüber liegt beim Nutzer/PM.

---

## Audio-Capture (modellunabhängig)

Alle Optionen brauchen Audio-Capture. Drei Wege:

| Weg | Wie | Aufwand | Streaming? |
|-----|------|---------|-----------|
| **Webview + getUserMedia** | Web Audio Worklet → PCM16 → PostMessage → ExtHost | Mittel | ✅ |
| **Native Node Module** (`naudiodon`) | PortAudio binding → PCM16 direkt | Niedrig | ✅ |
| **Bestehendes `recorder.py`** | Schreibt WAV → Extension transkribiert beim Stop | Am niedrigsten | ❌ (Batch) |

Keiner der drei Wege wurde getestet; der Spike nutzte nur fertige WAV-Dateien.

---

## Empfohlener Phasen-Plan

> Korrigiert 2026-09-30: Dies ist der ursprüngliche Plan von Research, nicht eine Vorgabe von
> jemand anderem. Dass `recorder.py` und Batch-beim-Stopp zuerst kommen, war meine Einordnung
> (geringster Aufwand), keine Nutzer-Anforderung; der Nutzer sagte nur, ein Live-Mitschrieb sei
> nicht nötig, aber 30 s Latenz seien lang. Streaming vs. Batch ist eine offene Produktentscheidung.
> Phase 1 wurde mit `foundry-local-sdk` statt `onnxruntime-node` durchgeführt; maßgeblich ist
> der Abschnitt „Spike-Ergebnis“. Tests und Dateibaum unten beschreiben den alten Plan.

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
- `foundry-local-sdk` als Dependency (Version offen: Spike 2.1.0, VS Code pinnt 1.2.3)
- Streaming-Transcript → `jarvis.internalAppendMessage` wie bisher
- Config: Model-Path/Cache-Dir statt `whisperPath`

### Phase 3: Voll integriert (optional)

Live-Streaming-Anzeige im UI (wie VS Code's Diktat-Transcript).
Audio-Worklet im Webview für Echtzeit-PCM16.

---

## Was der Redesign eliminiert

| Komponente | Aktuell | Nach Redesign |
|-----------|--------|---------------|
| Python `recorder.py` | Audio-Capture | Offen: Capture-Weg nicht entschieden und nicht getestet |
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

### Netzwerk-Blocker: Befund belegt, Mechanismus offen (2026-09-30, korrigiert nach Extension-Host-Test)

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

**Hypothese zum Mechanismus (nicht bewiesen):** String-Suche im DLL-Binary zeigt `WinHttp`,
kein `libcurl`; WinHTTP liest keine `HTTPS_PROXY`-Variablen, sondern die System-Proxy-Config
(`netsh winhttp show proxy` → hier `DirectAccess`; `import proxy source=ie` → `Access Denied`).
Das passt zu den Beobachtungen, belegt aber nicht, dass WinHTTP die Ursache ist. VS Codes
eigener Quellcode (`localTranscriptionService.ts`) geht davon aus, dass der native Download
die Env-Variablen liest, und setzt sie deshalb aus `http.proxy`; das widerspricht der Hypothese.
**Update 2026-10-01:** Für SDK 1.2.3 widerlegt — der Core liest `HTTPS_PROXY` und bekommt vom Proxy HTTP 407 (siehe „L2-Antworten“, Abschnitt 4).

**Extension-Host-Test (belegt):** Mini-Extension, Commit `59458c1` auf dem Research-Branch
(`experiments/nemotron-spike/extension-host/`). Im echten Extension Host (VS Code 1.139.0) waren
`http.proxy` gesetzt und `HTTPS_PROXY`/`HTTP_PROXY` korrekt befüllt, zusätzlich nach VS Codes
Muster aus `http.proxy` gebrückt. Ergebnis:
- Node-HTTPS (direkt und mit explizitem Proxy-Agent) → HTTP 200; eine Nemotron-Repo-Datei
  (README, 54.239 Bytes) wurde über den Proxy geladen. VS Code patcht HTTP im Extension Host
  (`http.proxySupport=override`).
- Der native Foundry-Katalog lieferte **0 Modelle**. SDK-Log: `transport failure` für alle
  7 Regionen nach je ~10 ms. `model.download()` wurde nie erreicht.
- Derselbe Node-HTTPS-Aufruf im Terminal scheitert mit `ENOTFOUND`.

**Offen:** (1) Warum scheitert der native Layer trotz korrekter Env-Variablen? (2) Wie kam das
Modell in `chatDictationModels`? Laut VS Code-Quellcode läuft `model.download()` über dieselbe
native Schicht; `installDictationModelAction.ts` importiert alternativ aus einem lokalen ZIP.
Die frühere Vermutung (WinHTTP-Config zum Download-Zeitpunkt gesetzt / anderes Netz) ist
unbelegt. Wer es klären kann: der Nutzer (Herkunft des Modells auf diesem Rechner).

**Konsequenz für Phase 2:** Für die Modell-Beschaffung nicht auf den nativen SDK-Katalog
verlassen. Auf diesem Rechner belegt: der Katalog funktioniert auch im Extension Host nicht;
ein Extension-eigener HTTP-Download über VS Codes Proxy funktioniert.

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
- **A)** Jarvis lädt die Modell-Dateien selbst via Node-HTTPS (im Extension Host von VS Code
  proxy-gepatcht; nur mit einer kleinen Datei belegt, nicht mit den ~700 MB Gewichten) und
  registriert sie per `CatalogType.Local`. **Offen:** Quell-URL des Foundry-Pakets (mit
  `genai_config.json`); das HuggingFace-ONNX-Repo aus dem Paper hat ein anderes Format.
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

## L2-Antworten für den System Designer (2026-10-01)

Evidenz: **belegt** = hier ausgeführt (Windows, VS Code 1.139.0, Extension-Host Node 24.20.0, Firmenproxy, ein Rechner);
**Quelle gelesen** = Code/Doku gelesen, nicht ausgeführt; **nicht geprüft**. Code: Branch `research/recorder-nemotron-spike`,
`experiments/nemotron-spike/sdk123/` (Commit `662d0d9`).

### 1. Audio-Capture (Mikrofon + Lautsprecher)

| Weg | Ergebnis | Evidenz |
|-----|----------|---------|
| (b) Webview `getUserMedia`/`getDisplayMedia` | `getUserMedia`: NotAllowedError; `getDisplayMedia`: durch Permissions-Policy gesperrt. Ausgeschieden. | belegt |
| (c) Helferprozess: PowerShell 7 + C# (WASAPI per COM-Interop, `Add-Type` im Speicher) | Mikrofon und Lautsprecher-Loopback gleichzeitig aufgenommen; keine Datei, keine Admin-Rechte, keine Installation (pwsh 7.6.6, FullLanguage). AppLocker-Regeln existieren, blockierten nichts. Andere Rechner, Windows PowerShell 5.1, Constrained Language Mode: nicht geprüft. | belegt |
| (a) Natives Node-Modul (naudiodon2 2.5.0) | `install: node-gyp rebuild` (Kompilieren mit MSVC + Python), keine Prebuilds laut npm-Metadaten. PortAudio upstream hat `PaWasapi_IsLoopback()`. Ob naudiodon2s PortAudio Loopback liefert und ein Prebuild für VS Codes Node-ABI machbar ist: nicht geprüft. | Quelle gelesen |

Befunde aus (c), belegt: Loopback 48 kHz/2 ch/float32; Mikrofon 48 kHz/**4 ch**/float32 → Mixdown und Resampling auf 16 kHz mono
PCM16 sind nötig (nicht implementiert). Der Loopback liefert **keine Pakete bei Stille** (erstes Paket 1,6 s nach Start, als die Wiedergabe
begann) → der Helfer muss Stille einfügen, sonst stimmt die Zeitachse nicht. In der VSIX läge nur ein Skript (Text), kein Binärfile.
Linux/macOS: nicht geprüft.

Mischung: **Pro geladenem Modell ist nur eine Live-Session gleichzeitig aktiv** (zweite Session: „A streaming session is already active“, belegt).
Mikrofon und Lautsprecher müssen daher vor der Engine zu einem Mono-Strom gemischt werden; getrennte Sessions pro Quelle (zweites Modell
oder zweiter Prozess) sind nicht geprüft. Das Stereo-Schema der heutigen PowerShell-Aufnahme (Mikro links, Lautsprecher rechts) geht so nicht 1:1.

### 2. Echo

- Loopback liefert den System-Mix ohne Echo-Unterdrückung; er existiert laut Windows-Doku „primarily to support AEC“, also als Referenzsignal (Quelle gelesen).
- Windows kann auf dem Mikrofonpfad AEC als Audio-Processing-Object anwenden, abhängig von Treiber und Stream-Kategorie (`Communications`) (Quelle gelesen).
  Ob das bei meiner Probe aktiv war: nicht geprüft.
- Messung (belegt, ein Gerät, eine Lautstärke): 8,6 s Wiedergabe über Lautsprecher, Loopback-RMS 0,17–0,27, Mikrofon-RMS höchstens 0,013
  (≈ 5 % der Amplitude). Rückkopplung hier gering, aber nicht null; auf andere Geräte nicht übertragbar.
- Folge: Bei offenen Lautsprechern kann die Gegenseite doppelt im Transkript stehen; Headset beseitigt das. Die Engine hat keine AEC;
  eine eigene müsste den Loopback als Referenz nutzen (nicht geprüft).

### 3. Engine-API (foundry-local-sdk 1.2.3)

- Aufrufe (belegt, im Node-Prozess und im Extension Host): `FoundryLocalManager.createAsync({appName, modelCacheDir})` →
  `catalog.getModel('nemotron-3.5-asr-streaming-0.6b')` → `model.load()` → `model.createAudioClient().createLiveTranscriptionSession()` →
  `settings.sampleRate=16000, channels=1, bitsPerSample=16, language` → `await session.start()` → `session.append(Uint8Array)` →
  `for await (r of session.getStream())` → `await session.stop()` → `dispose()`, `model.unload()`.
- Format: rohes PCM16 little-endian, mono, 16 kHz; VS Code sendet 4096-Sample-Chunks (8192 Byte). Push-Queue: 100 Chunks (`pushQueueCapacity`).
- Ereignisse (belegt): Interim = **Textdeltas** (z. B. „ Wir test“, „en Ne“). Stille erzeugt **kein** Ereignis. **Ein** `is_final` erst bei `stop()`,
  mit dem **gesamten** Text der Session (35-s-Clip: 36 Ereignisse, 1 final). `start_time`/`end_time` waren leer. Endpointing mitten im Strom: nicht beobachtet.
- Latenz (belegt, 14-Kern-Rechner, Zufuhr in Echtzeit): Interim 0,2–0,9 s hinter dem Audio im Node-Prozess, 0,23–0,42 s im Extension Host;
  `stop()` 0,40–0,55 s. Die 20-s-Zusagen sind hier mit großem Abstand erfüllt. Schwächere Rechner, Aufnahmen über 35 s: nicht geprüft.
- Ausführungsort: läuft im Extension Host (belegt), dort aber Event-Loop-Verzögerung bis 335 ms (p99 294 ms) und RSS ca. +290 MB während der
  Transkription; Modell laden 2–4 s. VS Code nutzt einen Utility-Prozess (Quelle gelesen). Absturz des nativen Codes im Host und Kindprozess-Betrieb: nicht geprüft.
- Sprache: `language: 'auto'` wird akzeptiert. Mit den Windows-TTS-Samples waren Englisch und Mischsprache auch mit `en` schlecht erkannt (Ursache nicht
  geklärt); die Samples belegen die Anforderung „Deutsch/Englisch gemischt ohne Sprachwahl“ nicht. Echte Sprache: nur in VS Codes eigenem Diktat beobachtet.

### 4. Modell und Runtime hinter dem Firmenproxy

- Der native Core (SDK 1.2.3, .NET) liest `HTTPS_PROXY` und bekommt vom Proxy **HTTP 407** (Proxy-Authentifizierung) für `ai.azure.com` (SDK-Log, belegt).
  Node-HTTPS im Extension Host (VS Codes Netzwerkschicht) kommt durch. Downloads der nativen Schicht (Katalog, Modell) scheitern also, Downloads im Extension Host nicht.
  Die WinHTTP-Hypothese ist für SDK 1.2.3 widerlegt (der Core nutzt .NET `HttpClient`); für SDK 2.1.0 weiterhin unbekannt.
- VS Code hatte das Modell, weil der Katalog am 2026-09-29 22:08 erfolgreich geladen wurde (`foundry.modelinfo.json`, `detectedRegion=westeurope`). In welchem
  Netz das war, ist nicht geprüft.
- Runtime: Tarball `https://main.vscode-cdn.net/dictation-runtime/foundry-local/1.2.3/win32-x64.tgz`, **18,6 MB in 1,4 s** im Extension Host geladen (belegt).
  Layout: `prebuilds/<target>/foundry_local_napi.node` + `foundry-local-core/<target>/*.dll`. Die URL steht in VS Codes `product.json`; ob Dritte sie nutzen dürfen
  und wie stabil sie ist: ungeklärt. Entpacken: VS Code nutzt das npm-Paket `tar` (Quelle gelesen), selbst nicht getestet. Alternative Quelle (SDK-Installationsskript): NuGet
  (nuget.org war im Extension Host erreichbar), nicht getestet.
- Modell: 756 MB, Katalogquelle `azureml://registries/azureml/models/nemotron-3.5-asr-streaming-0.6b-generic-cpu/versions/3`, Cache-Layout
  `<cacheDir>\Microsoft\nemotron-3.5-asr-streaming-0.6b-generic-cpu-3\v3\`. VS Code kann offline aus einem „official CPU model package“ (ZIP/OCI-Layout) importieren
  (Befehl „Chat: Install Dictation Model from Local Package…“, Doku gelesen). Wo dieses Paket herunterladbar ist: nicht geprüft.
- Mit VS Codes Cache als `modelCacheDir` (aus `context.globalStorageUri` ableitbar: `<VS-Code-Datenordner>\chatDictationModels`) findet SDK 1.2.3 Modell und Katalogdatei
  (48 Modelle, 85 ms), lädt und transkribiert live, ohne Netzwerk (belegt). Voraussetzung: Diktat wurde einmal genutzt oder das Modell importiert.
  Risiko: VS-Code-intern; die Runtime-Version (`chatDictationRuntime/1.2.3`) ändert sich mit VS Code.
- Research-Sicht (Entscheidung beim Nutzer): SDK 1.2.3 + Runtime per Extension-Host-Download + Modell aus VS Codes Cache oder lokalem Paket. Fehlt das Modell, zeigt
  Jarvis einen Hinweis (VS-Code-Diktat einmal starten oder Paket importieren). Ein eigener Modell-Download in Node ist ungeprüft (Registry-Protokoll unbekannt).

### 5. Wortzählung und Zusammenbruch

- Wörter lassen sich aus den Interim-Deltas zählen (Text kommt an, belegt).
- Fehler (Quelle `liveAudioSession.js` gelesen, nicht provoziert): fataler Push-Fehler → `append()` lehnt ab und der Stream-Iterator wirft `Push failed (code=…)`;
  `start()`/`stop()` werfen `Error starting/stopping audio stream session`. Es gibt **kein** Ereignis „keine Erkennung“, und Stille erzeugt keine Ereignisse (belegt).
  Zusammenbruch erkennt man deshalb über Fehler oder einen eigenen Watchdog (VS Code: 60-s-Timeout um `iterator.next()`, Quelle gelesen), kombiniert mit Pegel > Schwelle ohne Wörter.
  Prozessende ist nur bei einem Kindprozess beobachtbar; ein Absturz im Extension Host reisst den Host mit (nicht geprüft).

### Spikes, falls gewünscht (vor Start mit dem Nutzer abstimmen)

1. Ende-zu-Ende: Helfer mischt Mikrofon + Loopback zu 16 kHz mono PCM16 (mit Stille-Füllung) und speist die Live-Session; Echo mit offenen Lautsprechern; echte DE/EN-Sprache.
2. Kindprozess-Betrieb der Engine (Isolation, Exit-Erkennung, Absturzverhalten).
3. Eigener Modell-Download im Extension Host (Quelle und Protokoll klären, 756 MB über den Proxy).
4. Fehlerfälle der SDK provozieren (falsches Format, Modell entladen), für REQ_REC_FAILURE.

## Nachtrag L2: SDK 2.1.0 (Entscheidung des Nutzers 2026-10-01)

Der Nutzer entschied: SDK 2.1.0 aus dem offiziellen Kanal, Modell aus VS Codes Cache, Engine im Kindprozess, nur Windows. Evidenz wie oben (belegt / gelesen / nicht geprüft).
**Wichtig:** Alle Messwerte der L2-Antworten (Latenz, Ereignisformen, „eine Session pro Modell“, Event-Loop-Verzögerung) stammen von **SDK 1.2.3**.
Mit 2.1.0 wurde der Live-Pfad **nicht geprüft**; dort liefen nur Modell laden und `transcribeStreaming(<WAV-Datei>)`.
2.1.0 hat den deprecated `AudioClient.createLiveTranscriptionSession()` (Entfernung „Ende 2026“, gelesen) und die neue `AudioSession` mit `ItemQueue`
(`Item.bytes(pcm)` pushen, `markFinished()`; gelesen in `session.d.ts`/`item-queue.d.ts`).

**1. Laufzeitbestandteile win-x64 und Herkunft** (gelesen: `npm pack --dry-run`, `install-native.cjs`, `deps_versions.json`)

| Bestandteil | Quelle | Größe |
|-------------|--------|--------|
| `dist/` (reines JS, importiert nur `node:*`), `foundry_local_node.node`, `foundry_local_preload.node`, `foundry_local.dll`, `Microsoft.Windows.AI.MachineLearning.dll` (WinML 2.4.89) | npm-Tarball `foundry-local-sdk@2.1.0` (alle Plattformen) | Tarball 32,7 MB (entpackt 89,1 MB); win-x64-Dateien zusammen ca. 13 MB |
| `onnxruntime.dll` (ORT 1.30.0) | NuGet `Microsoft.ML.OnnxRuntime` 1.30.0, Pfad `runtimes/win-x64/native/` | nupkg 149,9 MB, DLL 16,5 MB |
| `onnxruntime-genai.dll` (GenAI 0.17.1) | NuGet `Microsoft.ML.OnnxRuntimeGenAI.Foundry` 0.17.1 | nupkg 33,2 MB, DLL 8,6 MB |

GitHub-Releases enthalten nichts davon (nur CLI/MSIX und Quellen). Auf der Platte ca. 38 MB; laut Skript über das Netz ca. 216 MB (das Skript lädt die ganzen nupkgs;
Teil-Download per Range-Request: nicht geprüft). Programmatisch: Der Loader erwartet `<Paketwurzel>/prebuilds/win32-x64/foundry_local_node.node` oder die Config
`libraryPath` (Ordner mit `foundry_local.dll`; ORT wird aus demselben Ordner vorgeladen; gelesen in `native.js`). Das Installationsskript nutzt rohes `https.get` ohne Proxy-Agent
und `adm-zip`; im Extension Host läuft derselbe Aufruf über VS Codes Netzwerkschicht (analoge Aufrufe im Probe belegt: nuget.org 200, 18,6-MB-Tarball). Unterschied zu meiner
manuellen Variante: keine bekannt, dieselben Dateien. Nicht geprüft: programmatischer Ende-zu-Ende-Lauf, Hash-Prüfung (im gelesenen Teil des Skripts nicht gefunden).
Leftover-Hinweis: Ordner `foundry-local-core/` im Spike gehört zu 1.2.3, nicht zu 2.1.0.

**2. Kindprozess:** Das Addon nutzt Node-API (`node-addon-api` in `package.json`, `engines: node >=20`). Geladen und benutzt in Node 26.7.0 (Terminal) und im Extension Host
(Electron, Node 24.20.0), jeweils belegt. Welche Node-Binary der Kindprozess nutzt: nicht geprüft (system-Node ist nicht vorauszusetzen; Kandidat `process.execPath` = `Code.exe`
mit `ELECTRON_RUN_AS_NODE=1`). Nicht geprüft: DLL-Suche bei Nicht-ANSI-Pfaden (SDK 1.2.1 hatte dafür einen Fix; `%APPDATA%`-Pfade können Sonderzeichen enthalten).

**3. Modell über lokalen Katalog:** `FoundryLocalManager.create({appName, modelCacheDir, …})` → `manager.getCatalog(CatalogType.Local)` →
`catalog.registerModel(<Ordner …\v3>, '<id>', MutableModelInfo)` (DisplayName, `ModelType='nemotron_speech'`, `Task='automatic-speech-recognition'`) → `model.load()`. Zuvor `getModelVariant(id)`:
Die Registrierung bleibt im `modelCacheDir` bestehen, ein zweites `registerModel` wirft „already registered“ (belegt). Der Spike (`common.mjs`, Tests A/B/D/E) nutzte genau das auf 2.1.0 mit
VS Codes Modellordner (belegt). Debug-Log eines Nachlaufs (belegt): Manager-Erzeugung und Registrierung ohne Katalog-/Regionsabruf, „loading model from <VS-Code-Pfad>“, das Modell wird in place geladen,
nicht kopiert. Der öffentliche Katalog (`AzureModelCatalog`) wird angelegt, aber nicht abgefragt, solange man `manager.catalog`/`getModels()` nicht benutzt. Die Abschlusszeile „geladen“ wurde im Nachlauf nicht mitgeschrieben (Test A war PASS).

**4. Lizenzen** (gelesen, Rechtsbewertung nicht von mir)

| Komponente | Lizenz | Stand |
|------------|--------|-------|
| `foundry-local-sdk` (npm, inkl. `foundry_local.dll`) | MIT (`package.json`; Repo-`LICENSE`: Abschnitt „FOUNDRY LOCAL SDK – MIT“) | gelesen |
| Foundry Local CLI | Microsoft Software License Terms (enthält Verbote wie Mitbündeln in Anwendungen; gilt nur für die CLI, die nicht benutzt wird) | gelesen |
| ONNX Runtime, ONNX Runtime GenAI | MIT (Upstream-`LICENSE`); nuspec: Lizenzdatei `LICENSE`, Autor Microsoft; Datei im nupkg nicht gelesen | gelesen / teils nicht geprüft |
| `Microsoft.Windows.AI.MachineLearning.dll` (im npm-Tarball) | nuspec verweist auf `license.txt`; Inhalt **nicht gelesen** | nicht geprüft |
| Modell `nemotron-3.5-asr-streaming-0.6b` | Foundry-Katalogeintrag: MIT; NVIDIA-Modellkarte: `openmdw-1.1`. Der Widerspruch ist ungeklärt; relevant nur bei Weitergabe, nicht bei Nutzung aus VS Codes Cache | gelesen, Widerspruch offen |

In den gelesenen Lizenztexten (MIT, Repo-`LICENSE`) steht kein Verbot, die Bestandteile zur Laufzeit herunterzuladen. Die Nutzungsbedingungen von nuget.org/npm: nicht gelesen.
Die Repo-`LICENSE` verweist auf `ThirdPartyNotices` und sagt, Modelle unterlagen den Lizenzen des jeweiligen Modells.

**5. Telemetrie** (gelesen: `README.md`, `sdk_v2/cpp/docs/Privacy.md`; Beobachtung im Log: belegt)
Foundry Local sendet standardmäßig Trace-Events über 1DS an Microsoft; laut Doku nicht erfasst: Prompts, Modellausgaben, Audioinhalte, Geräte-Rohkennungen, Secrets.
Abschalten (Doku): `disableNonessentialTelemetry: true` in der Manager-Config (vor dem Erzeugen) oder Umgebungsvariable `ORT_TELEMETRY_DISABLED=1`; ein minimales `ProcessInfo`-Event kann trotzdem gesendet werden
(Kommentar in `configuration.d.ts`). Im Log belegt: beim Erzeugen „1DS initialized“, `ProcessInfo` (u. a. AppName, Prozessname, CPU-Anzahl, RAM) und `HardwareInfo`.
Datenschutzerklärung: https://go.microsoft.com/fwlink/?LinkID=824704. Ob die Events hinter dem Proxy tatsächlich ankommen oder an 407 scheitern: nicht geprüft.

**6. Größe und Zeit:** einmalig ca. 216 MB laut Skript (32,7 + 149,9 + 33,2), auf der Platte ca. 38 MB; das Modell (756 MB) kommt aus VS Codes Cache, kein Download.
Zeit über den Proxy: nur ein Messwert (18,6 MB in 1,4 s aus dem Extension Host, anderer Host). Die großen NuGet-/npm-Downloads aus dem Extension Host: nicht geprüft;
unsere frühere manuelle NuGet-Beschaffung mit `Invoke-WebRequest` hat funktioniert (nicht gemessen). curl im Terminal bekommt von nuget.org 407, Node im Extension Host nicht.

## Test 2026-10-02: offizieller Modellpfad SDK 2.1.0 hinter dem Proxy (Extension Host)

Mini-Extension `experiments/nemotron-spike/sdk210/ext/` (Commit `642e930`), VS Code 1.139.0, Extension-Host Node 24.20.0. Komponenten wie `SPEC_REC_COMPONENTS` in den Extension-Speicher
assembliert, SDK per `import()` von dort geladen, `FoundryLocalManager.create` mit eigenem `modelCacheDir` und `disableNonessentialTelemetry: true`.

- **Assemblierung (belegt):** funktioniert im Extension Host über den Proxy. npm-Tarball 34,3 MB in ca. 8 s inklusive Entpacken (85 Dateien), `Microsoft.ML.OnnxRuntime` 157,2 MB in 17,7 s,
  `Microsoft.ML.OnnxRuntimeGenAI.Foundry` 34,8 MB in 5,7 s; zusammen ca. 226 MB in ca. 32 s. Es traten keine Weiterleitungen auf andere Hosts auf (nur `registry.npmjs.org`, `api.nuget.org`).
  Einheiten: meine früheren Größen (32,7 / 149,9 / 33,2 MB) waren MiB; dezimal sind es 34,3 / 157,2 / 34,8 MB.
  Der Abgleich mit `dist.integrity` der Registry wurde protokolliert, die Zeile ging beim Aufräumen verloren: nicht belegt.
- **Laden (belegt):** Addon, `foundry_local.dll`, `onnxruntime.dll`, `onnxruntime-genai.dll` aus `<Speicher>/foundry-local/2.1.0/prebuilds/win32-x64/` ohne `libraryPath`; Manager erzeugt.
- **Fund (Code gelesen, ohne die Datei nicht getestet):** `dist/foundryLocalManager.js` liest beim Import `../package.json` (Version, wirft sonst). Die Extraktionsliste in `SPEC_REC_COMPONENTS`
  (`dist/**` und `prebuilds/win32-x64/*`) enthält `package/package.json` nicht; ich habe sie mitextrahiert.
- **Katalog (belegt):** **0 Modelle** (95 ms und 118 ms). SDK-Log: Regionserkennung „status 0“, alle 7 Regionen „transport failure“ nach je 2–4 ms, **kein HTTP-Statuscode** im Log (SDK 1.2.3 meldete 407);
  `getModel` → „Model with alias … not found“. `model.download` wurde nicht erreicht, es wurde nichts heruntergeladen, `model.load` auf einem heruntergeladenen Modell: nicht getestet.
- **Lauf 1 (Umgebung, wie VS Code sie im Host setzt):** `HTTPS_PROXY=HTTP_PROXY=http://127.0.0.1:3128`, `NO_PROXY` gesetzt. Dort lauscht der lokale Proxy **Px** (`C:\Program Files\px\python.exe`, Port 3128);
  die Benutzer-Umgebungsvariable `HTTPS_PROXY` hat denselben Wert. **Lauf 2 (aus `http.proxy` gebrückt):** `http://rb-proxy-de.bosch.com:8080`. Beide Läufe identisch. In den SDK-1.2.3-Läufen gestern
  stand im Host noch `rb-proxy-de…:8080`; die Umgebung des Nutzers hat sich seitdem geändert. Mit Px wurde SDK 1.2.3 nicht getestet.
- **Mechanismus:** unbekannt. Antworten nach 2–4 ms ohne HTTP-Status sehen nach einem Abbruch vor jeder Verbindung aus (Vermutung, nicht belegt).
- **Einstellung für Proxy/Zugangsdaten (nur gelesen):** `FoundryLocalConfig` kennt `appName, appDataDir, modelCacheDir, logsDir, logLevel, webServiceUrls, serviceEndpoint, disableNonessentialTelemetry, libraryPath,
  additionalSettings` (freie String-Map, an den Core durchgereicht, Schlüssel nicht dokumentiert). Die MS-Learn-Referenz (Konfigurationstabellen) und das SDK-README nennen keinen Proxy-/Credential-Schlüssel;
  das README spricht von Zugangsdaten nur für die NuGet-Installation. Im Ordner `sdk_v2/cpp/docs` (nur Dateinamen gelesen) gibt es kein Proxy-Dokument. Ein früherer Versuch mit geratenen Proxy-Schlüsseln in `additionalSettings` blieb wirkungslos.
- **Telemetrie aus (belegt):** Das Log zeigt `DeviceIdStatus=Disabled`; das `ProcessInfo`-Event wird trotzdem erzeugt (wie in der Doku angekündigt).
- **Aufräumen:** Der Test lud kein Modell; sein Speicher enthielt nur die Komponenten (37 MB). Fünf DLLs im Ordner `%APPDATA%\Code\User\globalStorage\research.fl210-download-probe` sind durch die zwei geöffneten
  Extension-Development-Host-Fenster gesperrt und müssen nach deren Schließen gelöscht werden.

**Nachtrag 2026-10-02 (später am Tag): SDK 1.2.3 über Px — Korrektur der 407-Aussage.**
Proxy-Variablen sind eine Konvention: Ein Programm muss sie selbst lesen und seine Anfragen an den Proxy schicken; gesetzt allein verändert nichts. Aktuelle Netzlage (belegt, lesend gemessen):
Px (`127.0.0.1:3128`, lauscht auf allen Adaptern, hängt den Upstream-Proxy mit Authentifizierung vor) ist als `HTTPS_PROXY`/`HTTP_PROXY` auf Benutzerebene eingetragen; Windows nutzt für WinINET ein PAC-Skript,
für WinHTTP gilt „DirectAccess“. Externe Namen löst der Firmen-DNS nicht auf (`api.nuget.org`: Name nicht vorhanden); das macht der Proxy. curl kommt über Px und über `rb-proxy-de:8080`
durch (200/400), ohne Proxy nicht. Das lokale Netz `10.1.1.x` ist nicht erreichbar (die Route `10.1.0.0/22` läuft mit Metrik 1 durch das VPN).
**SDK 1.2.3 (das SDK von VS Code, .NET-Core) mit leerem privatem Cache und `HTTPS_PROXY=http://127.0.0.1:3128`:** Katalog **48 Modelle in 2,3 s**, `getModel` liefert
`nemotron-3.5-asr-streaming-0.6b-generic-cpu:3` (`isCached=false`) — belegt, im Terminal-Node, nicht im Extension Host. Der 407 vom 2026-10-01 trat auf, als `HTTPS_PROXY` direkt auf `rb-proxy-de:8080` zeigte
(der Proxy verlangt Authentifizierung, Px liefert sie). Die Aussage in „L2-Antworten“, Abschnitt 4 („nativer Core bekommt 407“), gilt also nur für diese Einstellung. Der Modell-Download (756 MB) mit 1.2.3
ist nicht getestet. SDK 2.1.0 scheitert dagegen mit Px und mit `rb-proxy-de:8080` gleich (Vermutung: ignoriert die Variablen). VS Code setzt `HTTPS_PROXY` aus `http.proxy` (hier `rb-proxy-de:8080`) und überschreibt damit die
Px-Variable; ob sein Download damit heute 407 bekäme, ist nicht geprüft.

## Test 2026-10-02 (nachmittags): SDK 1.2.3, offizieller Modellpfad im Extension Host

Mini-Extension `experiments/nemotron-spike/sdk123/ext-dl/` (SDK 1.2.3 mit der Runtime aus VS Codes `chatDictationRuntime`, eigener `modelCacheDir` im Extension-Speicher, nicht VS Codes Cache).
Zwei frische Hosts, jeweils Katalog → `model.download` → `model.load`. Alles belegt (im Extension Host ausgeführt).

| Lauf | `HTTPS_PROXY` im Host | Katalog | Download | `model.load` |
|------|------------------------|---------|----------|--------------|
| 1 „inherited“ | `http://127.0.0.1:3128` (Px) | 48 Modelle in 3,8 s | 793 MB in 67,5 s | OK |
| 2 „bridged“ (aus `http.proxy`, wie VS Code es setzt) | `http://rb-proxy-de.bosch.com:8080` | 48 Modelle in 0,45 s | 793 MB in 53,8 s | OK |

- Das heruntergeladene Modell ist **bitgleich** zu VS Codes Cache: 16 Dateien, 757 MiB, SHA-256 aller 16 Dateien identisch.
- **Korrektur meiner 407-Erklärung vom Vormittag:** Heute funktionieren beide Proxys, auch `rb-proxy-de:8080` ohne Px (curl: 200). Der 407 vom 2026-09-30/10-01 ist damit keine feste Eigenschaft des
  Firmenproxys, sondern hängt von etwas ab, das ich nicht kenne (Netzzustand, VPN, Anmeldestatus; nicht geprüft). Die Aussage „407 gilt nur, wenn die Variable direkt auf `rb-proxy-de` zeigt“ ist **nicht haltbar**.
- **Folgerung (belegt im Vergleich):** Am selben Tag, im selben Host, mit denselben Proxy-Einstellungen scheitert SDK 2.1.0 (Katalog 0 Modelle) und SDK 1.2.3 funktioniert (Katalog, Download, Laden).
  Der offizielle Modellpfad ist also eine Eigenschaft der SDK-Version, nicht des Netzes. Warum 2.1.0 scheitert, ist weiter unbekannt.
- **Einschränkung SDK 1.2.3:** `createAudioClient().transcribe(<WAV-Datei>)` scheitert mit diesem Modell („MultiModalProcessor cannot be created. nemotron_speech is not a registered multi-modal model type“).
  Die Live-Session von 1.2.3 lief in den früheren Tests; die dateibasierte API nicht.
- Aufgeräumt: beide Modellkopien (je 793 MB) und die 2.1.0-Komponenten sind gelöscht.

## Test 2026-10-02 (abends): SDK 1.2.3 aus offiziellen Kanälen, Kindprozess, Vergleich mit VS Codes Kopie

Mini-Extension `experiments/nemotron-spike/sdk123/ext-asm/` plus `compare-vscode.mjs`, Commit `1e79ef8`. Nichts aus VS Codes `chatDictationRuntime` genommen; das Modell wurde nur in place aus VS Codes
Cache gelesen. Evidenz: **belegt** = im Extension Host ausgeführt (Vergleich: lokales Node-Skript), **gelesen**, **nicht geprüft**. Größen dezimal.

**1. Offizielle Assemblierung (belegt):** Hosts nur `registry.npmjs.org` und `api.nuget.org`, keine Weiterleitungen beobachtet. Der Installer des SDK (gelesen: `install-standard.cjs`, `deps_versions.json`) holt diese vier Pakete:

| Paket | Größe | Zeit | gebraucht (win-x64) |
|-------|--------|------|-------------------|
| npm `foundry-local-sdk@1.2.3` | 0,234 MB | 3,2 s | `dist/*.js`, `package.json`, `deps_versions.json`, `LICENSE.txt`, `prebuilds/win32-x64/foundry_local_napi.node` (0,15 MB); SHA-512 gleich `dist.integrity` der Registry |
| NuGet `Microsoft.AI.Foundry.Local.Core` 1.2.3 | 92,2 MB | 8,1 s | `Microsoft.AI.Foundry.Local.Core.dll` 23,6 MB |
| NuGet `Microsoft.ML.OnnxRuntime.Foundry` 1.26.0 | 29,1 MB | 2,8 s | `onnxruntime.dll` 15,3 MB, `onnxruntime_providers_shared.dll` 22 KB |
| NuGet `Microsoft.ML.OnnxRuntimeGenAI.Foundry` 0.14.1 | 149,3 MB | 9,8 s | `onnxruntime-genai.dll` 6,2 MB |

Gesamt **270,8 MB** in ca. 29 s, auf der Platte ca. 46 MB. Extraktionsregel des Installers: alle `.dll` unter `runtimes/win-x64/native/` jedes NuGet-Pakets nach `foundry-local-core/win32-x64/`, dazu eine
kleine `package.json` dort; Layout der Laufzeit: `<Wurzel>/prebuilds/win32-x64/foundry_local_napi.node` und `<Wurzel>/foundry-local-core/win32-x64/*.dll`. Die Typdateien (`*.d.ts`, `*.js.map`) braucht die Laufzeit nicht
(VS Code liefert sie auch nicht aus). Ob `dist` die `package.json` zur Laufzeit liest, ist für 1.2.3 nicht geprüft (ich habe sie mitextrahiert).

**2. Sonderbau? Nein (belegt, SHA-256 und Zeilenvergleich).** Alle 5 nativen Dateien (`foundry_local_napi.node`, `Microsoft.AI.Foundry.Local.Core.dll`, `onnxruntime.dll`, `onnxruntime-genai.dll`,
`onnxruntime_providers_shared.dll`) sind **bytegleich** zu VS Codes `chatDictationRuntime\1.2.3`; in dessen Runtime liegt nichts, was nicht im offiziellen Satz wäre. VS Codes SDK-Ordner (in `node_modules.asar`, Version 1.2.3):
`package.json`, `deps_versions.json` und `LICENSE.txt` gleich; 16 der 19 `.js`-Dateien weichen ab, und zwar **nur** durch (a) eine umgeschriebene letzte Zeile `//# sourceMappingURL=https://main.vscode-cdn.net/sourcemaps/…`
(15 Dateien) und (b) in `dist/detail/coreInterop.js` zusätzlich zwei mit `VSCODE_PATCH` markierte Blöcke, die `VSCODE_FOUNDRY_LOCAL_NATIVE_DIR` für Addon- und Core-Pfad bevorzugen. `*.d.ts` und `*.js.map` fehlen bei VS Code.

**3. Kindprozess (belegt):** `child_process.fork(worker, [], { execPath: process.execPath, env: { ELECTRON_RUN_AS_NODE: '1' }, serialization: 'advanced', stdio: ['ignore','pipe','pipe','ipc'] })` aus dem Extension Host:
Kind läuft als `Code.exe` mit Node v24.20.0, lädt das SDK aus dem Extension-Speicher (`import()`), `getModel` und `model.load` (Modell in place aus VS Codes Cache), `createLiveTranscriptionSession`; Bereitschaft nach 5,0 s, Kind-RSS 798 MB.
35-s-Clip in 4096-Sample-Blöcken in Echtzeit: 35 Interim-Ereignisse + 1 final; **Verzögerung hinter dem Audio min 24 / Median 159 / max 228 ms; `finish` (stop + final) 670 ms**; der Text stimmt mit den früheren Läufen überein.
Event-Loop des Hosts während des Kindlaufs: max 86 ms, p99 22 ms (im Host selbst waren es bis 335 ms). **Kill:** `child.kill()` (SIGTERM) → `exit`-Ereignis im Parent nach 201 ms (`code=null`, `signal=SIGTERM`); Host danach unverändert
(gleiche PID, Timer laufen, Extension-API erreichbar). Das normale Ende liefert `exit code=0`.

**4. Telemetrie in 1.2.3 (gelesen und belegt):** `FoundryLocalConfig` von 1.2.3 hat **keine** Telemetrie-Option (nur `appName` „for logs and telemetry“; `additionalSettings` „internal use only“). Der Test setzte `ORT_TELEMETRY_DISABLED=1` und
`additionalSettings: { DisableNonessentialTelemetry: 'true' }` (der Schlüssel von 2.1.0, für 1.2.3 geraten). Wirkung im Log: **keine sichtbare**. Beide Logs enthalten die `[Telemetry]`-Zeilen (`CoreInitialize`, `ModelList`,
`ListDownloadedModels`, `ModelLoad` je einmal; `CoreAudioTranscribe` je Audioblock: 139 bei 35 s Audio, 16 beim nach 4 s beendeten Lauf). Das Log erwähnt weder den Schlüssel noch ein Abschalten. Ob die Ereignisse tatsächlich gesendet werden: nicht geprüft.

**5. Lizenzen der nativen Komponenten 1.2.3 (gelesen; keine Rechtsbewertung):**

| Komponente | Lizenz |
|------------|--------|
| npm `foundry-local-sdk` 1.2.3 | MIT (`LICENSE.txt`, `package.json`) |
| `Microsoft.ML.OnnxRuntime.Foundry` 1.26.0, `Microsoft.ML.OnnxRuntimeGenAI.Foundry` 0.14.1 | MIT (`LICENSE` im Paket), mit umfangreichen `ThirdPartyNotices.txt` |
| **`Microsoft.AI.Foundry.Local.Core` 1.2.3** | **„MICROSOFT SOFTWARE LICENSE TERMS – FOUNDRY LOCAL CORE“, nicht MIT** (`LICENSE.txt`, 12,7 KB) |

Wesentliche Bedingungen der Core-Lizenz (gelesen): Nutzungsrecht: „install and use … to **develop and test** your applications“. Verteilung nur nach Abschnitt 2 („Distributable Code“: die Objektcode-Form der Software, die in der
„distributables file list in the software“ steht – diese Liste habe ich nicht gesehen –, wenn die Anwendung wesentliche Hauptfunktion hinzufügt, Verteiler und Endnutzer an gleichwertig schützende Bedingungen gebunden werden und Microsoft freigestellt wird);
Abschnitt 3: kein Teilen, Veröffentlichen, Verteilen oder Verleihen außer nach Abschnitt 2, kein Anbieten als eigenständiges Produkt; „By using the software, you accept these terms“. Abschnitt 4: Datenerfassung, Abmeldung nur von „many, but not all“
Szenarien „as described in the product documentation“ (eine Abmeldeanleitung für 1.2.3 habe ich nicht gefunden). Abschnitt 7: die Software kann selbst nach Updates suchen und sie installieren. Ob ein Laufzeit-Download durch eine Erweiterung „Verteilung“ im Sinne
von Abschnitt 2 ist und wer Bedingungen zustimmen muss: **nicht bewertet, Rechtsfrage** (D-28). Zum Vergleich: Bei SDK 2.1.0 steht der Kern (`foundry_local.dll`) im MIT-lizenzierten npm-Paket (nur die WinML-DLL darin ist ungeklärt) und es gibt die Telemetrie-Option.

Aufgeräumt: alle heruntergeladenen Komponenten (46 MB Extension-Speicher, temporäre Pakete) sind gelöscht.

## Test 2026-10-02 (spätabends): SDK 2.1.0, Live-Audio im Kindprozess

Mini-Extension `experiments/nemotron-spike/sdk210/ext-live/` (Commit `4ed2d7c`). Alles im Extension Host bzw. im von ihm geforkten Kindprozess ausgeführt (**belegt**). SDK 2.1.0 aus den offiziellen Kanälen
(npm + NuGet `Microsoft.ML.OnnxRuntime` 1.30.0 und `Microsoft.ML.OnnxRuntimeGenAI.Foundry` 0.17.1, zusammen 226,4 MB in ca. 30 s) im Extension-Speicher; `fork` mit `ELECTRON_RUN_AS_NODE=1`, `process.execPath`, `advanced`, `ipc`;
`disableNonessentialTelemetry: true` und `ORT_TELEMETRY_DISABLED=1`; Modell über den **lokalen Katalog** (`getModelVariant`, sonst `registerModel`) in place aus VS Codes Cache geladen. 35-s-Clip, 4096-Sample-Blöcke, Echtzeit.

| | `AudioSession` + `ItemQueue` (Ziel-API) | `createAudioClient().createLiveTranscriptionSession()` (veraltet) |
|--|----------------------------------------|----------------------------------------------------|
| läuft im Kindprozess | ja, Ende mit `exit code=0` | ja, Ende mit `exit code=0` |
| Bereit (Manager, Registrierung, `model.load`, Session) | 5,2 s (erster Lauf), 10,1 s (zweiter Lauf) | 4,0–4,1 s |
| Kind-RSS | ca. 770 MB | ca. 770 MB |
| Ereignisse | 133 `speechSegment`-Items, alle `kind: 'none'`, Textdeltas | 133 Interim-Deltas + 1 `final` bei `stop()` |
| Verzögerung hinter dem Audio | min 4 / Median 105 / p95 253 / max 263 ms | min 2 / Median 44 / p95 260 / max 315 ms |
| Ende (`markFinished`/`stop` bis Endergebnis) | 302–375 ms | 301–558 ms |
| Endergebnis | `await stream.response`: `speechResult`, `finishReason: 'stop'`, `text` = aggregierter Text; `segments` = 133 (jedes Delta ein Segment) | `final`-Ereignis mit dem gesamten Text |
| Zeitstempel, `utteranceStart` | `startTimeMs`/`endTimeMs` leer, `utteranceStart: false` | `start_time`/`end_time` leer |

- **Unterschied zu 1.2.3 (belegt):** Der Text enthält in 2.1.0 **Sprach-Tags** wie `<de-DE>`, als eigene Delta-Ereignisse nach Pausen (bei 5,9 s, 22,8 s und 31,0 s Audio, 3 von 133 Ereignissen). In den 1.2.3-Läufen
  kamen sie nicht vor. Die Spec muss sie entfernen (oder bewusst nutzen); der Tag für den englischen und den gemischten Teil lautete ebenfalls `de-DE` (TTS-Samples, keine Aussage über echte Sprache).
- Kein Katalog-, Regions- oder Netzwerkzugriff in beiden SDK-Logs (keine Zeilen zu `Region`, `ai.azure`, `transport`); `getModelVariant` meldete beim ersten Lauf „not in cache, fetching from catalog source“ und fiel danach auf `registerModel` zurück.
- **Telemetrie in 2.1.0 (belegt):** `ORT_TELEMETRY_DISABLED` wird erkannt: „[Telemetry] Disabled via ORT_TELEMETRY_DISABLED; non-essential 1DS upload disabled (ProcessInfo still uploads)“.
- Verglichen mit 1.2.3 im Kindprozess (min 24 / Median 159 / max 228 ms, Ende 670 ms): Latenzen und Ende ähnlich; Modell laden etwa gleich schnell.
- Aufgeräumt: Extension-Speicher mit den Komponenten (39 MB) gelöscht.

## Spike-Tests (Stand 2026-09-30)

| Test | Was | Status |
|------|-----|--------|
| A | Modell laden (`foundry-local-sdk`, lokaler Catalog, VS-Code-Cache) | ✅ |
| B | Batch: WAV → Text | ✅ TTS-Stimme, 7,3 s |
| C | Qualität | ✅ nur an VS Codes eigenem Diktat beobachtet, nicht mit unserem Code |
| D | Streaming: WAV in Chunks → interim Results | ✅ 46 Chunks; nicht aus Mikrofon |
| E | `language` auto/de/en | ✅ nur TTS-Stimme |
| F | Extension Host: natives SDK lädt; Node-HTTPS über Proxy | ✅ teilweise: Katalog liefert 0 Modelle, nur 54-KB-Datei geladen |
| – | rohes `onnxruntime-node` + Nemotron | nie getestet |
| – | Mikrofon-Capture, VAD, Modell-/Runtime-Beschaffung, SDK 1.2.3 | siehe Abschnitt „L2-Antworten“ (2026-10-01): SDK 1.2.3, Capture per PowerShell/WASAPI und Runtime-Download belegt; VAD, Modell-Download offen |

## Offene Fragen

Entscheider ist der Nutzer/PM, sofern nicht anders vermerkt.

1. **Quelle Modellpaket und Runtime:** Foundry-Paket (mit `genai_config.json`) ohne bekannte URL;
   Runtime-Tarball-URL steht in VS Codes `product.json`, wurde aber nicht geladen oder getestet.
2. **SDK-Version:** 2.1.0 (Spike) vs. 1.2.3 (VS Code) plus dessen Runtime ungetestet.
3. **Mikrofon-Capture:** Webview-`getUserMedia` oder natives Node-Modul, beides ungetestet.
4. **VAD/Endpointing:** `silero_vad.onnx` liegt im Paket, `use_vad` ungetestet.
5. **Streaming oder Batch:** Produktentscheidung.
6. **Ausführungsort:** VS Code nutzt einen Utility-Prozess; Modell laden und Transkribieren im
   Extension Host wurde nicht getestet, Latenz nur an WAV-Dateien gemessen.
7. **Rohes `onnxruntime-node`:** nur relevant, falls das SDK ausfällt; nie getestet.

---

## Quellen

- VS Code Source: `src/vs/platform/localTranscription/`, `src/vs/workbench/contrib/chat/browser/speechToText/`
- VS Code Doku: `https://code.visualstudio.com/docs/configure/accessibility/voice`
- Nemotron Modell: `https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b`
- ONNX INT4: `onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4` (HuggingFace)
- NeMo-Speech.cpp: `https://github.com/NVIDIA/NeMo-Speech.cpp`
- VS Code Speech Extension: `ms-vscode.vscode-speech`
