# Read-only helper for the embeddings PoC: lists the direct subfolders of the Inbox with their item counts (names only, no mail content).
# Usage: pwsh -File list-folders.ps1
$ErrorActionPreference = 'Stop'
$ol = New-Object -ComObject Outlook.Application
$inbox = $ol.GetNamespace('MAPI').Folders.Item(1).Store.GetDefaultFolder(6)
$out = foreach ($f in $inbox.Folders) { [pscustomobject]@{ Name = [string]$f.Name; Count = [int]$f.Items.Count } }
ConvertTo-Json -InputObject @($out) -Compress
