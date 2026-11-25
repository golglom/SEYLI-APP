#requires -Version 5.1
<#
  Verifie le projet seyli-expo :
    1. npm install
    2. npx expo install --fix
    3. npx tsc --noEmit

  Usage :
    powershell -ExecutionPolicy Bypass -File .\verify.ps1
    powershell -ExecutionPolicy Bypass -File .\verify.ps1 -LogPath .\mon-log.txt

  Le script continue apres une etape en echec pour produire un diagnostic complet,
  puis renvoie le code 1 si au moins une etape a echoue.
#>
[CmdletBinding()]
param(
    [string]$LogPath
)

$ErrorActionPreference = 'Continue'
$ProjectRoot = $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($LogPath)) {
    $LogPath = Join-Path $ProjectRoot ('verify-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
}
elseif (-not [System.IO.Path]::IsPathRooted($LogPath)) {
    $LogPath = Join-Path $ProjectRoot $LogPath
}

$npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
$npx = Get-Command npx.cmd -ErrorAction SilentlyContinue

if (-not $npm -or -not $npx) {
    Write-Host 'npm.cmd / npx.cmd introuvable dans le PATH. Installe Node.js puis relance.' -ForegroundColor Red
    exit 1
}

Set-Location -LiteralPath $ProjectRoot
$env:CI = '1'
$env:EXPO_NO_TELEMETRY = '1'

Start-Transcript -Path $LogPath -Force | Out-Null

$results = @()
try {
    Write-Host "Projet : $ProjectRoot" -ForegroundColor Cyan
    Write-Host "Log    : $LogPath" -ForegroundColor Cyan
    $nodeVersion = & node --version
    $npmVersion = & $npm.Source --version
    Write-Host ("PowerShell {0} | Node {1} | npm {2}" -f $PSVersionTable.PSVersion, $nodeVersion, $npmVersion) -ForegroundColor Cyan

    $steps = @(
        @{ Name = 'npm install';        File = $npm.Source; Args = @('install') },
        @{ Name = 'expo install --fix'; File = $npx.Source; Args = @('--yes', 'expo', 'install', '--fix') },
        @{ Name = 'tsc --noEmit';       File = $npx.Source; Args = @('--yes', 'tsc', '--noEmit') }
    )

    foreach ($step in $steps) {
        Write-Host ''
        Write-Host ("=== {0} ===" -f $step.Name) -ForegroundColor Yellow
        Write-Host ("Commande : {0} {1}" -f $step.File, ($step.Args -join ' ')) -ForegroundColor DarkGray

        $started = Get-Date
        $arguments = $step.Args
        & $step.File @arguments 2>&1 | ForEach-Object { Write-Host $_ }
        $code = $LASTEXITCODE
        $seconds = [math]::Round(((Get-Date) - $started).TotalSeconds, 1)

        $results += [pscustomobject]@{
            Step     = $step.Name
            ExitCode = $code
            Seconds  = $seconds
        }

        $color = if ($code -eq 0) { 'Green' } else { 'Red' }
        Write-Host ("=== {0} : exit {1} ({2}s) ===" -f $step.Name, $code, $seconds) -ForegroundColor $color
    }
}
finally {
    Write-Host ''
    Write-Host '=== Resume ===' -ForegroundColor Cyan
    if ($results.Count -gt 0) {
        $results | Format-Table -AutoSize | Out-String | Write-Host
    }
    else {
        Write-Host 'Aucune etape terminee.' -ForegroundColor Red
    }
    Stop-Transcript | Out-Null
}

$failed = @($results | Where-Object { $_.ExitCode -ne 0 })
Write-Host ("Log complet : {0}" -f $LogPath) -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host ("{0} etape(s) en echec." -f $failed.Count) -ForegroundColor Red
    exit 1
}

Write-Host 'Tout est OK.' -ForegroundColor Green
exit 0
