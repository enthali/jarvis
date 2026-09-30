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

### Option 2: `@huggingface/transformers` + ONNX Nemotron (★ Phase 1)

```js
import { pipeline } from '@huggingface/transformers';
const asr = await pipeline('automatic-speech-recognition',
    'onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4');
const transcript = await asr(audioBlob, { language: 'de', task: 'transcribe' });
```

- ✅ NPM-Package, kein Docker, kein Python
- ✅ On-device (ONNX Runtime, CPU)
- ✅ Volle programmatische Kontrolle (Audio → Transcript als Return-Value)
- ✅ Selbe Modell-Familie wie VS Code (Nemotron 3.5 ASR)
- ⚠️ **Streaming-Support unsicher** — Transformers.js ASR ist primär Batch (record→stop→transcribe),
  nicht Live-Streaming wie Foundry Local
- ⚠️ `@huggingface/transformers` v5.13.0+ nötig für Nemotron; ältere → `whisper-base` Fallback
- ⚠️ INT4-Quantisierung ist Community-Upload, nicht offiziell von NVIDIA

### Option 3: NeMo-Speech.cpp (★ Phase 2 — für Streaming)

NVIDIA veröffentlicht `NeMo-Speech.cpp` — lightweight C++ Runtime für genau dieses Modell:
`https://github.com/NVIDIA/NeMo-Speech.cpp`

```bash
# GGUF-Modell
hf download nvidia/nemotron-3.5-asr-streaming-0.6b \
  nemotron-3.5-asr-streaming-0.6b.q8_0.gguf --local-dir models
# Transcribe
nemo-speech transcribe audio.wav --model models/...q8_0.gguf --language de-DE
```

- ✅ Cache-Aware Streaming RNNT (gleiches Modell wie VS Code)
- ✅ VAD + Endpointing eingebaut
- ✅ GGUF — effizient, CPU-only
- ✅ Multilingual (40 Locales)
- ❌ Native Binary (kompilieren oder distributieren, kein npm)
- Ähnlich zu `recorder.py`-Ansatz, aber besseres Modell, kein Docker, kein Python
- CLI-basiert: kann als `child_process.spawn()` aus Extension laufen

### Option 4: `onnxruntime-node` direkt (★ Phase 3 — voll integriert)

VS Code nutzt `onnxruntime + onnxruntime-genai`. `onnxruntime-node` ist ein npm-Package.

- ✅ NPM-Package, kein Docker
- ✅ Selbe Technologie wie VS Code
- ❌ VAD, Endpointing, RNNT-Decoding selbst implementieren
- ❌ Sehr viel Low-Level-Code
- Nur sinnvoll wenn voll integrierte Live-Streaming-Pipeline gewünscht

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

### Phase 1: Quick-Spike (≈1 Tag)

`@huggingface/transformers` + `onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4`
+ bestehendes `recorder.py` für Audio-Capture.

- recorder.py läuft wie bisher, schreibt WAV
- Extension transkribiert beim Stop mit Transformers.js
- **Beweist:** Nemotron on-device in Node.js funktioniert, Qualität gut genug
- **Eliminiert:** Docker, Whisper-Setup, File-Polling-Heartbeat, Sidecar-JSON
- Python bleibt nur für Audio-Capture (kann später auch ersetzt werden)

### Phase 2: Streaming (wenn Live-Transcript gewünscht)

NeMo-Speech.cpp als `child_process.spawn()` statt `recorder.py`.
Gleiches Interface (file-basiert oder stdin/stdout-pipe), aber mit Streaming
und Cache-Aware RNNT.

### Phase 3: Voll integriert (optional)

Webview + getUserMedia + `onnxruntime-node` für Live-Streaming direkt in der
Extension, ohne externen Prozess. Entspricht VS Code's Architektur.

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

## Spike-Tests (aktualisiert)

| Test | Was wir prüfen | Status |
|------|---------------|--------|
| A | Modell lädt in Node.js (`@huggingface/transformers` + ONNX) | Offen |
| B | Batch-Transkription (WAV → Text) | Offen |
| C | Qualität für Meeting-Transcripts | ✅ Bewiesen (Live-Diktat) |
| D | Streaming: Chunks einspeisen → interim Results | Offen (Hauptfrage) |
| E | `language: 'auto'` — Sprachwechsel mid-stream erkennen | Offen (Bonus-Feature) |

## Offene Fragen

1. **Transformers.js Streaming:** Unterstützt `@huggingface/transformers` Streaming-ASR mit
   Nemotron, oder nur Batch? → Test D.
2. **INT4-Qualität:** Ist die INT4-Quantisierung gut genug vs. FP32? → Test B Vergleich.
3. **Modell-Download-Größe:** Wie groß ist das ONNX INT4-Modell? (Original ist ~600M Parameter)
4. **CPU-Performance:** Latenz auf CPU beim Transkribieren? (VS Code nutzt Utility Process)
5. **NeMo-Speech.cpp Windows-Build:** Gibt es Prebuilt-Binaries für Windows, oder muss kompiliert werden?
6. **`target_lang=auto` in Transformers.js:** Wird dieser Parameter vom `onnx-community`-Modell
   unterstützt, oder nur im Original NeMo/Transformers? → Test E.

---

## Quellen

- VS Code Source: `src/vs/platform/localTranscription/`, `src/vs/workbench/contrib/chat/browser/speechToText/`
- VS Code Doku: `https://code.visualstudio.com/docs/configure/accessibility/voice`
- Nemotron Modell: `https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b`
- ONNX INT4: `onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4` (HuggingFace)
- NeMo-Speech.cpp: `https://github.com/NVIDIA/NeMo-Speech.cpp`
- VS Code Speech Extension: `ms-vscode.vscode-speech`
