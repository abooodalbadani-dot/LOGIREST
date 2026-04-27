
$replacements = @{
    "neon-cyan" = "cyan-500";
    "neon-red" = "red-500";
    "neon-error" = "red-500";
    "neon-green" = "emerald-500";
    "neon-amber" = "amber-500"
}

$files = Get-ChildItem -Path "src" -Recurse -Include *.tsx, *.ts, *.css

foreach ($file in $files) {
    $filePath = $file.FullName
    $content = [System.IO.File]::ReadAllText($filePath)
    $modified = $false
    
    foreach ($entry in $replacements.GetEnumerator()) {
        $key = $entry.Key
        $val = $entry.Value
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $val)
            $modified = $true
        }
    }
    
    if ($modified) {
        [System.IO.File]::WriteAllText($filePath, $content)
        Write-Host "Updated $filePath"
    }
}
