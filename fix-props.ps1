$srcDir = Get-Location | Select-Object -ExpandProperty Path
$srcDir = Join-Path $srcDir "src"
Write-Host "Scanning: $srcDir"

Get-ChildItem -Path $srcDir -Recurse -Include "*.tsx","*.ts" | ForEach-Object {
    $path = $_.FullName
    $content = [System.IO.File]::ReadAllText($path)
    $original = $content

    $content = $content.Replace(".is_locked", ".isLocked")
    $content = $content.Replace(".lock_started_at", ".lockStartedAt")
    $content = $content.Replace(".session_number", ".sessionNumber")
    $content = $content.Replace(".session_id", ".sessionId")

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($path, $content)
        Write-Host "  Fixed: $($_.Name)"
    }
}

Write-Host "All done."
