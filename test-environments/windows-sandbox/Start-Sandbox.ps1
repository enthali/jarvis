[CmdletBinding()]
param(
    [switch]$SkipBuild,
    [string]$ArtifactDirectory,
    [string]$VSCodeArchive,
    [string]$ProxyUri,
    [ValidateRange(4096, 32768)]
    [int]$MemoryInMB = 8192,
    [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'

$scriptRoot = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptRoot '..\..')).Path
$localRoot = Join-Path $scriptRoot '.local'

$script:VSCodeVersion = '1.144.0'
$script:VSCodeCommit = '2c33b50b16c472efe58357d1d2a8a5414bc23fbf'
$script:VSCodeSha256 = '055722269e3c9531af0c50a8b757c14e8062a0d02fc973b038863d9732c567ea'
$script:VSCodeArchiveName = "VSCode-win32-x64-$($script:VSCodeVersion).zip"
$script:VSCodeDownloadUrl = "https://vscode.download.prss.microsoft.com/dbazure/download/stable/$($script:VSCodeCommit)/$($script:VSCodeArchiveName)"

function Get-WindowsDownloadsFolder {
    $shell = $null
    try {
        $shell = New-Object -ComObject Shell.Application
        $downloads = $shell.Namespace('shell:Downloads')
        $path = $downloads.Self.Path
        if ([string]::IsNullOrWhiteSpace($path)) {
            throw 'Windows did not return a path for its Downloads known folder.'
        }
        if (-not (Test-Path -LiteralPath $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
        return (Resolve-Path -LiteralPath $path).Path
    } finally {
        if ($shell) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
    }
}

function Get-PinnedArchiveHash {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "VS Code archive does not exist: $Path"
    }
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Assert-PinnedArchive {
    param([string]$Path)

    $actualHash = Get-PinnedArchiveHash -Path $Path
    if ($actualHash -ne $script:VSCodeSha256) {
        throw "VS Code archive checksum mismatch for '$Path'. Expected SHA-256 $($script:VSCodeSha256); got $actualHash."
    }
}

function Resolve-PinnedVSCodeArchive {
    param([string]$OverridePath, [string]$DownloadsFolder)

    $cacheFolder = Join-Path $DownloadsFolder 'JarvisSandbox'
    New-Item -ItemType Directory -Path $cacheFolder -Force | Out-Null
    $cachePath = Join-Path $cacheFolder $script:VSCodeArchiveName

    if (-not [string]::IsNullOrWhiteSpace($OverridePath)) {
        $sourcePath = (Resolve-Path -LiteralPath $OverridePath).Path
        Assert-PinnedArchive -Path $sourcePath
        if ([string]::Equals($sourcePath, $cachePath, [StringComparison]::OrdinalIgnoreCase)) {
            return $sourcePath
        }
        if (Test-Path -LiteralPath $cachePath) {
            Assert-PinnedArchive -Path $cachePath
            return $cachePath
        }
        Copy-Item -LiteralPath $sourcePath -Destination $cachePath
        Assert-PinnedArchive -Path $cachePath
        return $cachePath
    }

    if (Test-Path -LiteralPath $cachePath) {
        Assert-PinnedArchive -Path $cachePath
        return $cachePath
    }

    $standardDownloadsPath = Join-Path $DownloadsFolder $script:VSCodeArchiveName
    if (Test-Path -LiteralPath $standardDownloadsPath) {
        $existingHash = Get-PinnedArchiveHash -Path $standardDownloadsPath
        if ($existingHash -eq $script:VSCodeSha256) {
            Copy-Item -LiteralPath $standardDownloadsPath -Destination $cachePath
            Assert-PinnedArchive -Path $cachePath
            return $cachePath
        }
        Write-Warning "Existing Downloads archive does not match pinned VS Code $($script:VSCodeVersion); preserving it and downloading into Downloads\JarvisSandbox."
    }

    $temporaryPath = Join-Path $cacheFolder ("{0}.{1}.download" -f $script:VSCodeArchiveName, [guid]::NewGuid().ToString('N'))
    try {
        Write-Host "Downloading pinned VS Code $($script:VSCodeVersion) into the Windows Downloads folder..." -ForegroundColor Cyan
        Invoke-WebRequest -Uri $script:VSCodeDownloadUrl -OutFile $temporaryPath -TimeoutSec 600 -UseBasicParsing -ErrorAction Stop
        Assert-PinnedArchive -Path $temporaryPath
        if (Test-Path -LiteralPath $cachePath) {
            Assert-PinnedArchive -Path $cachePath
            Remove-Item -LiteralPath $temporaryPath -Force
            return $cachePath
        }
        Move-Item -LiteralPath $temporaryPath -Destination $cachePath
        Write-Host "Verified VS Code archive: $cachePath" -ForegroundColor Green
        return $cachePath
    } catch {
        if (Test-Path -LiteralPath $temporaryPath) { Remove-Item -LiteralPath $temporaryPath -Force }
        throw "Could not obtain verified VS Code $($script:VSCodeVersion). Ensure the Windows Downloads folder is writable and the official download is reachable, or supply -VSCodeArchive with the pinned ZIP. Details: $($_.Exception.Message)"
    }
}

$downloadsFolder = Get-WindowsDownloadsFolder
$VSCodeArchive = Resolve-PinnedVSCodeArchive -OverridePath $VSCodeArchive -DownloadsFolder $downloadsFolder

if (-not $SkipBuild) {
    if ([string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
        $commit = (& git -C $repoRoot rev-parse --short HEAD).Trim()
        if ($LASTEXITCODE -ne 0) { throw 'Could not read the Git commit.' }
        $runName = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $commit
        $ArtifactDirectory = Join-Path $localRoot ('runs\' + $runName)
    }

    & (Join-Path $scriptRoot 'Build-Vsix.ps1') -OutputDirectory $ArtifactDirectory
    if ($LASTEXITCODE -ne 0) { throw "VSIX build failed with exit code $LASTEXITCODE." }
}
elseif ([string]::IsNullOrWhiteSpace($ArtifactDirectory)) {
    $latestRun = Get-ChildItem -LiteralPath (Join-Path $localRoot 'runs') -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'build-manifest.json') } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latestRun) { throw 'No existing VSIX run found. Run without -SkipBuild or supply -ArtifactDirectory.' }
    $ArtifactDirectory = $latestRun.FullName
}

$ArtifactDirectory = (Resolve-Path -LiteralPath $ArtifactDirectory).Path
$logDirectory = Join-Path $localRoot 'guest-logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$manifestPath = Join-Path $ArtifactDirectory 'build-manifest.json'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw "Build manifest is missing: $manifestPath" }
$buildManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
foreach ($packageName in @('jarvis-core', 'jarvis-pim', 'jarvis-recorder', 'jarvis-mcp', 'jarvis-flow', 'jarvis-kanban')) {
    if (-not ($buildManifest.packages | Where-Object { $_.package -eq $packageName })) {
        throw "Required VSIX is missing from the build manifest: $packageName"
    }
}

if ([string]::IsNullOrWhiteSpace($ProxyUri)) {
    $hostProxy = @('HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy') |
        ForEach-Object { [Environment]::GetEnvironmentVariable($_) } |
        Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
        Select-Object -First 1
    if ($hostProxy) {
        try {
            $hostProxyUri = [Uri]$hostProxy
            if (-not $hostProxyUri.IsAbsoluteUri -or $hostProxyUri.Scheme -notin @('http', 'https')) {
                throw 'Proxy URI must use HTTP or HTTPS.'
            }
            if (-not [string]::IsNullOrEmpty($hostProxyUri.UserInfo)) {
                Write-Warning 'Host proxy has embedded credentials; they are not copied into Sandbox configuration.'
            } else {
                $proxyBuilder = New-Object System.UriBuilder($hostProxyUri)
                if ($hostProxyUri.IsLoopback) {
                    $gateway = Get-NetIPAddress -InterfaceAlias 'vEthernet (Default Switch)' -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                        Where-Object { $_.IPAddress -notlike '169.254*' } |
                        Select-Object -First 1
                    if ($gateway) {
                        $proxyBuilder.Host = $gateway.IPAddress
                    } else {
                        Write-Warning 'Host proxy uses loopback, but the Sandbox host-gateway address could not be determined.'
                    }
                }
                $ProxyUri = $proxyBuilder.Uri.GetLeftPart([System.UriPartial]::Authority)
            }
        } catch {
            Write-Warning 'Host proxy settings could not be parsed; Sandbox will start without proxy forwarding.'
            $ProxyUri = ''
        }
    }
}

$sandboxExe = Get-Command WindowsSandbox.exe -ErrorAction Stop
$guestSource = Join-Path $scriptRoot 'guest'
$wsbPath = Join-Path $localRoot 'jarvis-test.wsb'
$document = New-Object System.Xml.XmlDocument
$document.AppendChild($document.CreateXmlDeclaration('1.0', 'utf-8', $null)) | Out-Null
$configuration = $document.CreateElement('Configuration')
$document.AppendChild($configuration) | Out-Null

$networking = $document.CreateElement('Networking')
$networking.InnerText = 'Enable'
$configuration.AppendChild($networking) | Out-Null
$mappedFolders = $document.CreateElement('MappedFolders')
$configuration.AppendChild($mappedFolders) | Out-Null

function Add-MappedFolder {
    param(
        [string]$HostPath,
        [string]$SandboxPath,
        [bool]$IsReadOnly = $true
    )

    $folder = $document.CreateElement('MappedFolder')
    $hostElement = $document.CreateElement('HostFolder')
    $hostElement.InnerText = $HostPath
    $sandboxElement = $document.CreateElement('SandboxFolder')
    $sandboxElement.InnerText = $SandboxPath
    $folder.AppendChild($hostElement) | Out-Null
    $folder.AppendChild($sandboxElement) | Out-Null
    if ($IsReadOnly) {
        $readOnlyElement = $document.CreateElement('ReadOnly')
        $readOnlyElement.InnerText = 'true'
        $folder.AppendChild($readOnlyElement) | Out-Null
    }
    $mappedFolders.AppendChild($folder) | Out-Null
}

$guestRoot = 'C:\Users\WDAGUtilityAccount\Desktop'
Add-MappedFolder -HostPath $guestSource -SandboxPath (Join-Path $guestRoot 'JarvisBootstrap')
Add-MappedFolder -HostPath $ArtifactDirectory -SandboxPath (Join-Path $guestRoot 'JarvisArtifacts')
Add-MappedFolder -HostPath (Split-Path -Parent $VSCodeArchive) -SandboxPath (Join-Path $guestRoot 'JarvisDownloads')
Add-MappedFolder -HostPath $logDirectory -SandboxPath (Join-Path $guestRoot 'JarvisLogs') -IsReadOnly $false

$memory = $document.CreateElement('MemoryInMB')
$memory.InnerText = [string]$MemoryInMB
$configuration.AppendChild($memory) | Out-Null

$logonCommand = $document.CreateElement('LogonCommand')
$command = $document.CreateElement('Command')
$guestArchivePath = Join-Path (Join-Path $guestRoot 'JarvisDownloads') ([System.IO.Path]::GetFileName($VSCodeArchive))
$commandText = "powershell.exe -NoProfile -ExecutionPolicy Bypass -NoExit -File `"C:\Users\WDAGUtilityAccount\Desktop\JarvisBootstrap\Start-VSCode.ps1`" -ArtifactsPath `"C:\Users\WDAGUtilityAccount\Desktop\JarvisArtifacts`" -LogPath `"C:\Users\WDAGUtilityAccount\Desktop\JarvisLogs`" -VSCodeArchivePath `"$guestArchivePath`""
if (-not [string]::IsNullOrWhiteSpace($ProxyUri)) {
    $commandText += " -ProxyUri `"$ProxyUri`""
    $proxyInfo = [Uri]$ProxyUri
    Write-Host ("Sandbox proxy: {0}://{1}:{2}" -f $proxyInfo.Scheme, $proxyInfo.Host, $proxyInfo.Port)
} else {
    Write-Host 'Sandbox proxy: not configured'
}
$command.InnerText = $commandText
$logonCommand.AppendChild($command) | Out-Null
$configuration.AppendChild($logonCommand) | Out-Null

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.Encoding = New-Object System.Text.UTF8Encoding($false)
$writer = [System.Xml.XmlWriter]::Create($wsbPath, $settings)
try { $document.Save($writer) } finally { $writer.Dispose() }

Write-Host "Sandbox configuration: $wsbPath"
Write-Host "VSIX build: $ArtifactDirectory"
Write-Host "VS Code archive: $VSCodeArchive"
if (-not $NoLaunch) {
    Start-Process -FilePath $wsbPath
}