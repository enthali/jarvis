# T-1: Write a sentinel file to verify the scheduled cron job ran.
# Expected: file created at testdata/heartbeat/sentinel.txt; timestamp updated each minute.
$sentinelPath = Join-Path $PSScriptRoot "..\sentinel.txt"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Set-Content -Path $sentinelPath -Value "Heartbeat T-1 ran at $timestamp"
Write-Output "Sentinel written: $sentinelPath"
