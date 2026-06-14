#Requires -Version 5.0
<#
.SYNOPSIS
    LogiRest - Pre-delivery workspace cleanup script.
    Removes all debug artifacts, temporary logs, and dev-only files from the
    project root so the repository is clean for client delivery.

.USAGE
    From the project root:
        powershell -ExecutionPolicy Bypass -File .\scripts\clean-for-delivery.ps1

    DRY RUN (shows what would be deleted, deletes nothing):
        powershell -ExecutionPolicy Bypass -File .\scripts\clean-for-delivery.ps1 -DryRun

.NOTE
    This script ONLY deletes files from the root directory.
    It does NOT touch: apps/, packages/, scripts/, grafana/, specs/, .agents/
#>

param(
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " LogiRest - Delivery Cleanup Script" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host " MODE: DRY RUN (nothing will be deleted)" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$deleted = 0

function Remove-Target {
    param([string]$Path, [string]$Reason)

    $rel = $Path.Replace($ProjectRoot, "").TrimStart("\").TrimStart("/")

    if ($DryRun) {
        Write-Host "  [DRY RUN] Would delete: $rel  ($Reason)" -ForegroundColor Yellow
        return
    }

    if (Test-Path $Path) {
        Remove-Item -Path $Path -Recurse -Force
        Write-Host "  DELETED: $rel" -ForegroundColor Green
        $script:deleted++
    }
}

# 1. All .txt files in the project root (debug/log output files)
Write-Host "[ 1/6 ] Removing root-level .txt debug logs..." -ForegroundColor White
Get-ChildItem -Path $ProjectRoot -Filter "*.txt" -File | ForEach-Object {
    Remove-Target -Path $_.FullName -Reason "debug log"
}

# 2. All .log files in the project root
Write-Host "[ 2/6 ] Removing root-level .log files..." -ForegroundColor White
Get-ChildItem -Path $ProjectRoot -Filter "*.log" -File | ForEach-Object {
    Remove-Target -Path $_.FullName -Reason "log file"
}

# 3. Root-level fix-*.js, fix_*.js, fix*.js scripts
Write-Host "[ 3/6 ] Removing one-off fix scripts..." -ForegroundColor White
Get-ChildItem -Path $ProjectRoot -File | Where-Object {
    $_.Name -match "^fix[-_].*\.(js|ts|ps1)$" -or $_.Name -match "^fix\d+\.(js|ts)$"
} | ForEach-Object {
    Remove-Target -Path $_.FullName -Reason "one-off fix script"
}

# 4. Root-level scratch/utility scripts
Write-Host "[ 4/6 ] Removing root-level scratch/utility scripts..." -ForegroundColor White
$utilScripts = @(
    "compare_i18n.py",
    "compare_keys.py",
    "find_eng_in_ar.py",
    "find_errors.py",
    "find_malformed.py",
    "find_missing_keys.js",
    "inspect_json.js",
    "test-api.js",
    "scratch-test-arabic.js",
    "scratch-test-arabic.ts",
    "debug-layout.js",
    "debug-render.js",
    "download-amiri.js",
    "download-amiri-bold.js"
)
foreach ($f in $utilScripts) {
    $fullPath = Join-Path $ProjectRoot $f
    Remove-Target -Path $fullPath -Reason "scratch/utility script"
}

# 5. Root-level lint result JSON files
Write-Host "[ 5/6 ] Removing root-level lint result JSON files..." -ForegroundColor White
$safeJsonFiles = @(
    "package.json", "package-lock.json", "turbo.json",
    "tsconfig.json", "tsconfig.base.json", "skills-lock.json", "grafana-dashboard.json"
)
Get-ChildItem -Path $ProjectRoot -Filter "*.json" -File | Where-Object {
    ($_.Name -match "lint" -or $_.Name -match "results") -and ($_.Name -notin $safeJsonFiles)
} | ForEach-Object {
    Remove-Target -Path $_.FullName -Reason "lint result JSON"
}

# 6. Large base64 font files in root (not needed in delivery)
Write-Host "[ 6/6 ] Removing root-level base64 font files..." -ForegroundColor White
Get-ChildItem -Path $ProjectRoot -Filter "*.base64" -File | ForEach-Object {
    Remove-Target -Path $_.FullName -Reason "base64 font blob"
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($DryRun) {
    Write-Host " DRY RUN complete. No files were deleted." -ForegroundColor Yellow
    Write-Host " Re-run without -DryRun to execute." -ForegroundColor Yellow
} else {
    Write-Host " Cleanup complete. Files deleted: $deleted" -ForegroundColor Green
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. git status" -ForegroundColor Gray
Write-Host "  2. git add -A" -ForegroundColor Gray
Write-Host "  3. git commit -m 'chore: clean workspace for client delivery'" -ForegroundColor Gray
Write-Host ""
