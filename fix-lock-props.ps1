$base = 'e:\Kitchen-Store Inventory System\src'
$files = Get-ChildItem -Path $base -Recurse -Include '*.tsx','*.ts'

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $original = $content

    # Fix WarehouseLockState property naming (snake_case -> camelCase)
    $content = $content -replace '\.is_locked\b', '.isLocked'
    $content = $content -replace '\.lock_started_at\b', '.lockStartedAt'
    $content = $content -replace '\.session_number\b', '.sessionNumber'
    $content = $content -replace '\.session_id\b', '.sessionId'

    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8
        Write-Host "Fixed: $($file.FullName.Replace($base, ''))"
    }
}

Write-Host "Done."
