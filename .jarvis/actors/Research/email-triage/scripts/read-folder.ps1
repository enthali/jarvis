# Read-only helper for the embeddings PoC: reads the newest mails of ONE Inbox subfolder (project folder = known truth).
# Never changes anything: no flags, no moves, no categories. JSON to stdout, nothing is written to disk.
# Usage: pwsh -File read-folder.ps1 -Folder 'GenAI' -Top 8 [-ReadOnly]   (-ReadOnly = only mails that are already read)
param(
    [Parameter(Mandatory)][string]$Folder,
    [int]$Top = 8,
    [switch]$ReadOnly
)
$ErrorActionPreference = 'Stop'
$ol = New-Object -ComObject Outlook.Application
$ns = $ol.GetNamespace('MAPI')
$inbox = $ns.Folders.Item(1).Store.GetDefaultFolder(6)
$target = $null
foreach ($child in $inbox.Folders) { if ($child.Name -eq $Folder) { $target = $child; break } }
if (-not $target) { Write-Output '[]'; exit 0 }
$items = $target.Items
$items.Sort('[ReceivedTime]', $true)
$out = [System.Collections.Generic.List[object]]::new()
foreach ($m in $items) {
    if ($m.Class -ne 43) { continue }
    if ($ReadOnly -and $m.UnRead) { continue }
    $body = [string]$m.Body
    $out.Add([pscustomobject]@{ Subject = [string]$m.Subject; ReceivedTime = $m.ReceivedTime.ToString('o'); Body = $body.Substring(0, [Math]::Min(6000, $body.Length)) })
    if ($out.Count -ge $Top) { break }
}
ConvertTo-Json -InputObject @($out) -Depth 3 -Compress
