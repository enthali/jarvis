Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = -2

$outDir = "C:\workspace\jarvis\experiments\nemotron-spike\samples"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# 16kHz, 16-bit, mono — required by foundry-local-sdk audio client
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
    16000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono
)

$synth.SetOutputToWaveFile("$outDir\sample-de.wav", $format)
$synth.Speak("Hallo, das ist ein Test fuer die Spracherkennung. Wir testen Nemotron heute mit einem deutschen Satz.")
$synth.SetOutputToNull()

$synth.SetOutputToWaveFile("$outDir\sample-en.wav", $format)
$synth.Speak("Hello, this is a test for speech recognition. We are testing Nemotron today with an English sentence.")
$synth.SetOutputToNull()

$synth.SetOutputToWaveFile("$outDir\sample-mixed.wav", $format)
$synth.Speak("Hello, das ist ein Test. We are switching between English und Deutsch in einem Satz.")
$synth.SetOutputToNull()

Write-Host "Generated 16kHz samples in $outDir"
Get-ChildItem $outDir
