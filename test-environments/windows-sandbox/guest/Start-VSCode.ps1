[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactsPath,
    [Parameter(Mandatory = $true)]
    [string]$VSCodeArchivePath,
    [Parameter(Mandatory = $true)]
    [string]$LogPath,
    [string]$ProxyUri
)

$ErrorActionPreference = 'Stop'
$stateRoot = Join-Path $env:LOCALAPPDATA 'JarvisWindowsSandbox'
New-Item -ItemType Directory -Path $LogPath -Force | Out-Null
$transcriptPath = Join-Path $LogPath ('bootstrap-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
Start-Transcript -Path $transcriptPath | Out-Null

function Test-HttpsEndpoint {
    param(
        [string]$Name,
        [string]$Uri,
        [System.Net.IWebProxy]$Proxy
    )

    try {
        $request = [System.Net.HttpWebRequest]::Create($Uri)
        $request.Method = 'HEAD'
        $request.Timeout = 15000
        $request.AllowAutoRedirect = $true
        if ($Proxy) { $request.Proxy = $Proxy }
        $response = $request.GetResponse()
        try {
            Write-Host ("Network {0}: HTTP {1}" -f $Name, [int]$response.StatusCode) -ForegroundColor Green
        } finally {
            $response.Dispose()
        }
    } catch [System.Net.WebException] {
        $response = $_.Exception.Response
        if ($response) {
            $status = [int]$response.StatusCode
            $response.Dispose()
            if ($status -in @(401, 403, 404, 405)) {
                Write-Host ("Network {0}: reachable, HTTP {1}" -f $Name, $status) -ForegroundColor Green
                return
            }
            Write-Host ("Network {0}: HTTP {1}" -f $Name, $status) -ForegroundColor Yellow
        } else {
            Write-Host ("Network {0}: FAILED ({1})" -f $Name, $_.Exception.Message) -ForegroundColor Red
            $innerException = $_.Exception.InnerException
            while ($innerException) {
                Write-Host ("Network {0}: {1}: {2}" -f $Name, $innerException.GetType().Name, $innerException.Message) -ForegroundColor Yellow
                $innerException = $innerException.InnerException
            }
        }
    } catch {
        Write-Host ("Network {0}: FAILED ({1})" -f $Name, $_.Exception.Message) -ForegroundColor Red
    }
}

function Test-TcpEndpoint {
    param([string]$Name, [int]$Port)

    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $connect = $client.BeginConnect($Name, $Port, $null, $null)
        if (-not $connect.AsyncWaitHandle.WaitOne(3000, $false)) {
            Write-Host ("TCP {0}:{1}: timed out" -f $Name, $Port) -ForegroundColor Red
            return $false
        }
        $client.EndConnect($connect)
        Write-Host ("TCP {0}:{1}: connected" -f $Name, $Port) -ForegroundColor Green
        return $true
    } catch {
        Write-Host ("TCP {0}:{1}: FAILED ({2})" -f $Name, $Port, $_.Exception.GetType().Name) -ForegroundColor Red
        return $false
    } finally {
        $client.Dispose()
    }
}

function Expand-ZipWithProgress {
    param([string]$ArchivePath, [string]$Destination)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        $entries = @($archive.Entries)
        $totalBytes = ($entries | Measure-Object -Property Length -Sum).Sum
        $writtenBytes = 0L
        $destinationRoot = [System.IO.Path]::GetFullPath($Destination).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
        New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null

        for ($index = 0; $index -lt $entries.Count; $index++) {
            $entry = $entries[$index]
            $relativePath = $entry.FullName.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $targetPath = [System.IO.Path]::GetFullPath((Join-Path $destinationRoot $relativePath))
            if (-not $targetPath.StartsWith($destinationRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Archive entry escapes the extraction directory: $($entry.FullName)"
            }

            if ($entry.FullName.EndsWith('/')) {
                New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
                continue
            }

            $parentPath = Split-Path -Parent $targetPath
            New-Item -ItemType Directory -Path $parentPath -Force | Out-Null
            $inputStream = $entry.Open()
            $outputStream = [System.IO.File]::Open($targetPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
            try {
                $inputStream.CopyTo($outputStream)
            } finally {
                $outputStream.Dispose()
                $inputStream.Dispose()
            }

            $writtenBytes += $entry.Length
            $percent = if ($totalBytes -gt 0) { [Math]::Min(100, [int](100 * $writtenBytes / $totalBytes)) } else { 100 }
            Write-Progress -Activity 'Extracting VS Code' -Status ("{0}/{1}: {2}" -f ($index + 1), $entries.Count, $entry.Name) -PercentComplete $percent
        }
    } finally {
        $archive.Dispose()
        Write-Progress -Activity 'Extracting VS Code' -Completed
    }
}

try {
    Write-Host "Bootstrap log: $transcriptPath" -ForegroundColor Cyan
    Write-Host 'Checking network paths used by GitHub, Copilot, and the VS Code Marketplace...'
    $proxyNames = @('HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY') | Where-Object {
        -not [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_))
    }
    if ($proxyNames.Count -gt 0) {
        Write-Host ("Proxy environment variable names present: {0}" -f ($proxyNames -join ', '))
    } else {
        Write-Host 'No HTTP proxy environment variables are set in the Sandbox.' -ForegroundColor Yellow
    }

    try {
        $proxy = [System.Net.WebRequest]::DefaultWebProxy
        if ($proxy -and -not $proxy.IsBypassed([Uri]'https://github.com')) {
            $proxyUri = $proxy.GetProxy([Uri]'https://github.com')
            Write-Host ("System proxy for HTTPS: {0}:{1}" -f $proxyUri.Host, $proxyUri.Port)
        } else {
            Write-Host 'System proxy: direct connection'
        }
    } catch {
        Write-Host ("System proxy inspection failed: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
    }

    $webProxy = $null
    if (-not [string]::IsNullOrWhiteSpace($ProxyUri)) {
        $proxyAddress = [Uri]$ProxyUri
        $webProxy = New-Object System.Net.WebProxy($proxyAddress)
        [System.Net.WebRequest]::DefaultWebProxy = $webProxy
        $env:HTTP_PROXY = $ProxyUri
        $env:HTTPS_PROXY = $ProxyUri
        $internetSettings = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
        if (-not (Test-Path -LiteralPath $internetSettings)) {
            New-Item -Path $internetSettings -Force | Out-Null
        }
        New-ItemProperty -Path $internetSettings -Name ProxyServer -PropertyType String -Value $proxyAddress.Authority -Force | Out-Null
        New-ItemProperty -Path $internetSettings -Name ProxyEnable -PropertyType DWord -Value 1 -Force | Out-Null
        Write-Host 'Configured the isolated guest user proxy for browser-based sign-in.' -ForegroundColor Cyan
        Write-Host ("Using forwarded host proxy at {0}:{1}" -f $proxyAddress.Host, $proxyAddress.Port) -ForegroundColor Cyan
        Test-TcpEndpoint -Name $proxyAddress.Host -Port $proxyAddress.Port | Out-Null
    }

    Test-HttpsEndpoint -Name 'GitHub' -Uri 'https://github.com' -Proxy $webProxy
    Test-HttpsEndpoint -Name 'GitHub API' -Uri 'https://api.github.com' -Proxy $webProxy
    Test-HttpsEndpoint -Name 'Copilot API' -Uri 'https://api.githubcopilot.com' -Proxy $webProxy
    Test-HttpsEndpoint -Name 'VS Code Marketplace' -Uri 'https://marketplace.visualstudio.com' -Proxy $webProxy

    $archive = Get-Item -LiteralPath $VSCodeArchivePath -ErrorAction Stop
    if ($archive.Name -ne 'VSCode-win32-x64-1.144.0.zip') {
        throw "Unexpected VS Code archive; expected the pinned file VSCode-win32-x64-1.144.0.zip, got $($archive.Name)."
    }

    $codeRoot = Join-Path $stateRoot $archive.BaseName
    $codeExe = Join-Path $codeRoot 'Code.exe'
    $codeCli = Join-Path $codeRoot 'bin\code.cmd'
    if (-not (Test-Path -LiteralPath $codeExe)) {
        Write-Host "Extracting $($archive.Name) to the isolated Sandbox profile; progress is shown below." -ForegroundColor Cyan
        Expand-ZipWithProgress -ArchivePath $archive.FullName -Destination $codeRoot
    }
    if (-not (Test-Path -LiteralPath $codeExe)) { throw "Code.exe was not found in $codeRoot." }
    if (-not (Test-Path -LiteralPath $codeCli)) { throw "VS Code CLI was not found in $codeCli." }

    $userData = Join-Path $stateRoot 'user-data'
    $extensions = Join-Path $stateRoot 'extensions'
    $workspace = Join-Path $stateRoot 'workspace'
    New-Item -ItemType Directory -Path $userData, $extensions, $workspace -Force | Out-Null

    $actorDirectory = Join-Path $workspace '.jarvis\actors\Jarvis Sandbox Actor'
    New-Item -ItemType Directory -Path $actorDirectory -Force | Out-Null
    $actorYaml = "name: Jarvis Sandbox Actor`nsummary: Local Actor used to verify the isolated Jarvis VSIX installation.`n"
    [System.IO.File]::WriteAllText(
        (Join-Path $actorDirectory 'actor.yaml'),
        $actorYaml,
        (New-Object System.Text.UTF8Encoding($false))
    )

    $settingsDirectory = Join-Path $userData 'User'
    New-Item -ItemType Directory -Path $settingsDirectory -Force | Out-Null
    $userSettings = [ordered]@{
        'extensions.experimental.enableAgentsWindowCapability' = $true
    }
    if (-not [string]::IsNullOrWhiteSpace($ProxyUri)) {
        $userSettings['http.proxy'] = $ProxyUri
        $userSettings['http.proxySupport'] = 'override'
        $userSettings['http.proxyStrictSSL'] = $true
    }
    $userSettingsJson = $userSettings | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText(
        (Join-Path $settingsDirectory 'settings.json'),
        $userSettingsJson + [Environment]::NewLine,
        (New-Object System.Text.UTF8Encoding($false))
    )

    $workspaceSettingsDirectory = Join-Path $workspace '.vscode'
    New-Item -ItemType Directory -Path $workspaceSettingsDirectory -Force | Out-Null
    $workspaceSettings = [ordered]@{
        'jarvis.actor.autoProvision' = $true
        'jarvis.actors.openSessionOnCreate' = $true
        'jarvis.messages.enabled' = $true
        'jarvis.kanban.autoProvision' = $true
        'jarvis.pim.showCategories' = $true
        'jarvis.outlook.enabled' = $true
    }
    $settingsJson = $workspaceSettings | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText(
        (Join-Path $workspaceSettingsDirectory 'settings.json'),
        $settingsJson + [Environment]::NewLine,
        (New-Object System.Text.UTF8Encoding($false))
    )

    $installOrder = @('jarvis-core', 'jarvis-pim', 'jarvis-recorder', 'jarvis-mcp', 'jarvis-flow', 'jarvis-kanban')
    foreach ($packageName in $installOrder) {
        $vsix = Get-ChildItem -LiteralPath $ArtifactsPath -Filter "$packageName-*.vsix" -File |
            Sort-Object LastWriteTime -Descending |
            Select-Object -First 1
        if (-not $vsix) { throw "VSIX not found for $packageName in $ArtifactsPath." }

        Write-Host "Installing $($vsix.Name)..." -ForegroundColor Cyan
        & $codeCli --user-data-dir $userData --extensions-dir $extensions --install-extension $vsix.FullName --force
        if ($LASTEXITCODE -ne 0) { throw "VSIX installation failed for $packageName (exit code $LASTEXITCODE)." }
    }

    Write-Host 'Launching isolated VS Code with the sandbox test workspace...' -ForegroundColor Green
    & $codeExe --user-data-dir $userData --extensions-dir $extensions --new-window $workspace
    if ($LASTEXITCODE -ne 0) { throw "VS Code launch failed (exit code $LASTEXITCODE)." }
    Write-Host "Bootstrap complete. Log: $transcriptPath" -ForegroundColor Green
    Write-Host 'Sign in to GitHub Copilot inside this isolated VS Code profile to test authenticated Copilot operations.'
} catch {
    Write-Host ("BOOTSTRAP FAILED: {0}" -f $_.Exception.Message) -ForegroundColor Red
    Write-Host "Log: $transcriptPath" -ForegroundColor Yellow
    Read-Host 'Press Enter to keep this diagnostic window open'
    exit 1
} finally {
    Stop-Transcript | Out-Null
}