<#
.SYNOPSIS
Builds the VSIX files that the Windows Sandbox test installs (core, pim, recorder, mcp, flow, kanban).

.DESCRIPTION
Sandbox tool, called by Start-Sandbox.ps1, which reads the build-manifest.json written here.
It is not the packaging step of the Change Contract: Quality packages with the platform-neutral recipe
in docs/Jarvis Contracts/change.md. enthali.jarvis (core-gh) is built by release.yml, not by this script.
Windows only (PowerShell, node.exe, npm.cmd).
#>
[CmdletBinding()]
param(
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$node = (Get-Command node.exe -ErrorAction Stop).Source
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$vsce = Join-Path $repoRoot 'node_modules\.bin\vsce.cmd'
if (-not (Test-Path -LiteralPath $vsce)) {
    throw "VS Code Extension CLI is missing. Run npm ci in $repoRoot first."
}

$commit = (& git -C $repoRoot rev-parse --short HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Could not read the Git commit.' }
$gitStatus = & git -C $repoRoot status --porcelain --untracked-files=no
if ($LASTEXITCODE -ne 0) { throw 'Could not read Git status.' }

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $runName = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), $commit
    $OutputDirectory = Join-Path $PSScriptRoot ('.local\runs\' + $runName)
}

$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

function Invoke-Checked {
    param(
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    Write-Host ("`n> {0} {1}" -f $FilePath, ($Arguments -join ' ')) -ForegroundColor Cyan
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "Command failed with exit code ${LASTEXITCODE}: $FilePath $($Arguments -join ' ')"
        }
    } finally {
        Pop-Location
    }
}

Invoke-Checked -FilePath $npm -Arguments @('run', 'compile') -WorkingDirectory $repoRoot
Invoke-Checked -FilePath $node -Arguments @('packages/core/build.js', '--minify') -WorkingDirectory $repoRoot

$packages = @('core', 'pim', 'recorder', 'mcp', 'flow', 'kanban')
$artifacts = @()
foreach ($packageName in $packages) {
    $packageDirectory = Join-Path $repoRoot ("packages\{0}" -f $packageName)
    $manifestPath = Join-Path $packageDirectory 'package.json'
    $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
    $vsixPath = Join-Path $OutputDirectory ("{0}-{1}.vsix" -f $manifest.name, $manifest.version)
    $vsceArguments = @('package', '--no-dependencies', '--out', $vsixPath)
    if (-not $manifest.repository) {
        Write-Warning "$($manifest.name) has no repository field; explicitly allowing packaging without it."
        $vsceArguments += '--allow-missing-repository'
    }

    Invoke-Checked -FilePath $vsce -Arguments $vsceArguments -WorkingDirectory $packageDirectory
    if (-not (Test-Path -LiteralPath $vsixPath)) { throw "VSIX was not created: $vsixPath" }

    $file = Get-Item -LiteralPath $vsixPath
    $artifacts += [pscustomobject]@{
        package = $manifest.name
        version = $manifest.version
        file = $file.Name
        bytes = $file.Length
        sha256 = (Get-FileHash -LiteralPath $vsixPath -Algorithm SHA256).Hash
    }
}

$buildManifest = [ordered]@{
    created = (Get-Date).ToString('o')
    commit = $commit
    workingTreeHasTrackedChanges = -not [string]::IsNullOrWhiteSpace(($gitStatus -join ''))
    packages = $artifacts
}
$manifestJson = $buildManifest | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText(
    (Join-Path $OutputDirectory 'build-manifest.json'),
    $manifestJson + [Environment]::NewLine,
    (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "`nBuilt VSIX artifacts in $OutputDirectory" -ForegroundColor Green
$artifacts | Format-Table package, version, bytes, sha256 -AutoSize
Write-Output $OutputDirectory